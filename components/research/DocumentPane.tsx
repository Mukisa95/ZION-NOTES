import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ResearchResource, QaConfig } from '../../types';
import { SmartSpaceMenu } from './SmartSpaceMenu';
import { SelectionBubble } from './SelectionBubble';
import { NoteConfigModal } from './NoteConfigModal';
import { QaConfigModal } from './QaConfigModal';
import { QuizSession } from './QuizSession';
import { simplifyText } from '../../services/researchAiService';
import { NoteEditor } from '../NoteEditor';
import { NoteEditorHandles } from '../../types';

interface DocumentPaneProps {
  content: string;
  resources: ResearchResource[];
  onChange: (html: string) => void;
  activeDocumentId?: string;
  onBackToMain?: () => void;
  editorRef?: React.RefObject<any>;
  zoomLevel?: number;
  onToggleFind?: (visible: boolean) => void;
  isFindVisible?: boolean;
  searchResults?: { total: number; current: number };
  onFind?: (query: string, options: { matchCase: boolean }) => void;
  onNavigate?: (direction: 'next' | 'prev') => void;
  onCloseFind?: () => void;
  setCounts?: (counts: { words: number; characters: number }) => void;
  isTocOpen?: boolean;
  onCloseToc?: () => void;
  isMobileOutline?: boolean;
  onMobileOutlineClose?: () => void;
}

interface MenuState {
  visible: boolean;
  x: number;
  y: number;
}

interface BubbleState {
  visible: boolean;
  x: number;
  y: number;
  html: string;
}

export const DocumentPane: React.FC<DocumentPaneProps> = ({
  content,
  resources,
  onChange,
  activeDocumentId = 'main',
  onBackToMain,
  editorRef,
  zoomLevel = 100,
  onToggleFind,
  isFindVisible,
  searchResults,
  onFind,
  onNavigate,
  onCloseFind,
  setCounts,
  isTocOpen = false,
  onCloseToc,
  isMobileOutline = false,
  onMobileOutlineClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const localEditorRef = useRef<NoteEditorHandles>(null);
  const actualEditorRef = editorRef || localEditorRef;
  const [tocHeadings, setTocHeadings] = useState<{ id: string; text: string; level: number }[]>([]);

  // Helper: format a timestamp for section headings
  const getTimestamp = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' · ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Helper: wrap HTML with a labelled heading section before inserting
  const wrapWithHeading = (html: string, heading: string): string => {
    const ts = getTimestamp();
    const headingId = `section-${Date.now()}`;
    return [
      `<h2 id="${headingId}" style="margin-top:2em;padding-top:1em;border-top:2px solid #e5e7eb;color:#4f46e5;font-size:1.25em;font-weight:700;">${heading}</h2>`,
      `<p style="margin-top:-0.5em;margin-bottom:1em;font-size:0.8em;color:#9ca3af;font-style:italic;">${ts}</p>`,
      html,
    ].join('');
  };

  const [menu, setMenu] = useState<MenuState>({ visible: false, x: 0, y: 0 });
  const [bubble, setBubble] = useState<BubbleState>({ visible: false, x: 0, y: 0, html: '' });
  const [showNoteConfig, setShowNoteConfig] = useState(false);
  const [showQaConfig, setShowQaConfig] = useState(false);
  const [quizConfig, setQuizConfig] = useState<QaConfig | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const pointerStart = useRef({ x: 0, y: 0 });

  // Sync content into counts whenever it changes (since App relies on it for the Status Toolbar)
  useEffect(() => {
    if (setCounts) {
      import('../../utils/textUtils').then(({ getCountsFromHtml }) => {
        setCounts(getCountsFromHtml(content));
      });
    }
  }, [content, setCounts]);

  const isMain = activeDocumentId === 'main';

  // Intercept Right-click for Smart Space (only for main doc)
  const handleContextMenuCapture = (e: React.MouseEvent) => {
    if (!isMain) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return; // let normal stuff happen if there's a selection
    
    e.preventDefault();
    e.stopPropagation(); // stop NoteEditor from showing general ContextMenu
    setMenu({ visible: true, x: e.clientX, y: e.clientY });
    setBubble(b => ({ ...b, visible: false }));
  };

  const handlePointerDownCapture = (e: React.PointerEvent) => {
    if (!isMain) return;
    if (e.pointerType !== 'touch') return;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = setTimeout(() => {
      setMenu({ visible: true, x: e.clientX, y: e.clientY });
      longPressTimer.current = null;
    }, 600);
  };
  
  const handlePointerMoveCapture = (e: React.PointerEvent) => {
    if (!longPressTimer.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerUpCapture = () => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    }
  };

  const handlePointerCancelCapture = () => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    }
  };

  // Selection → bubble (for main doc only, NoteEditor handles regular selection button)
  const handleMouseUpCapture = useCallback(() => {
    if (!isMain) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setBubble(b => ({ ...b, visible: false }));
      return;
    }
    const range = sel.getRangeAt(0);
    // don't show bubble if it's clicking on a button or menu
    const isControl = (sel.anchorNode?.parentElement?.closest('button') || sel.anchorNode?.parentElement?.closest('.context-menu'));
    if (isControl) return;

    const rect = range.getBoundingClientRect();
    const div = document.createElement('div');
    const fragment = range.cloneContents();
    div.appendChild(fragment);
    
    // Slight delay to ensure NoteEditor's selection logic also runs
    setTimeout(() => {
      setBubble({
        visible: true,
        x: rect.left + rect.width / 2 - 160,
        y: rect.top - 10,
        html: div.innerHTML,
      });
    }, 10);
  }, [isMain]);

  // Replace selection with AI result
  const handleReplace = (newHtml: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const template = document.createElement('div');
    template.innerHTML = newHtml;
    const frag = document.createDocumentFragment();
    while (template.firstChild) frag.appendChild(template.firstChild);
    range.insertNode(frag);
    sel.collapseToEnd();
    
    // Force set the html
    const el = document.querySelector('[data-note-editor-root] [contenteditable]') as HTMLElement;
    if (el) {
       onChange(el.innerHTML);
    }
    setBubble(b => ({ ...b, visible: false }));
  };

  // Insert AI output at end of document (with optional heading)
  const handleInsert = (html: string, heading?: string) => {
    const finalHtml = heading ? wrapWithHeading(html, heading) : html;
    if (actualEditorRef.current?.appendText) {
        actualEditorRef.current.appendText(finalHtml);
    } else {
        onChange(content + finalHtml);
    }
    // Refresh TOC after a short delay
    setTimeout(() => refreshToc(), 300);
  };

  // Refresh the headings list from the live DOM
  const refreshToc = useCallback(() => {
    const editorEl = containerRef.current?.querySelector('[contenteditable="true"]');
    if (!editorEl) return;
    const headings: { id: string; text: string; level: number }[] = [];
    editorEl.querySelectorAll('h1,h2,h3').forEach((el, idx) => {
      const tagLevel = parseInt(el.tagName[1]);
      if (!el.id) (el as HTMLElement).id = `toc-heading-${idx}-${Date.now()}`;
      headings.push({ id: el.id, text: el.textContent?.trim() || '', level: tagLevel });
    });
    setTocHeadings(headings);
  }, []);

  // Refresh TOC whenever content changes
  useEffect(() => {
    const timer = setTimeout(() => refreshToc(), 200);
    return () => clearTimeout(timer);
  }, [content, refreshToc]);

  // Also refresh when TOC panel opens
  useEffect(() => {
    if (isTocOpen) refreshToc();
  }, [isTocOpen, refreshToc]);

  // Simplify action from Smart Space
  const handleSimplify = async () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const div = document.createElement('div');
    div.appendChild(range.cloneContents());
    const result = await simplifyText(div.innerHTML, resources);
    handleReplace(result);
  };

  const handleQuizComplete = (reportHtml: string) => {
    handleInsert(reportHtml, 'Quiz Report');
    setQuizConfig(null);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 relative" ref={containerRef}>
      {/* Toolbar hint */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
        {!isMain && (
          <button onClick={onBackToMain} className="flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-700 rounded-md shadow-sm transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            <span>Back to Project Document</span>
          </button>
        )}
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
           {isMain ? 'Workspace Document' : `Resource: ${resources.find(r => r.id === activeDocumentId)?.name || activeDocumentId}`}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block ml-auto">
          {isMain ? 'Right-click for Smart Space · Select text for AI tools' : 'Using Document Editor'}
        </span>
      </div>

      {/* Layout: document + optional TOC panel */}
      <div className="flex flex-1 overflow-hidden">

        {/* Mobile Outline view – full-width TOC list shown instead of editor */}
        {isMobileOutline && (
          <div className="md:hidden flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Document Outline</span>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {tocHeadings.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 px-4 py-8 text-center">
                  No sections yet.<br/>Generate notes, Q&amp;A, or summaries to build an outline.
                </p>
              ) : (
                tocHeadings.map(h => (
                  <button
                    key={h.id}
                    onClick={() => {
                      // Switch to document tab then scroll
                      onMobileOutlineClose?.();
                      setTimeout(() => {
                        const el = containerRef.current?.querySelector(`#${CSS.escape(h.id)}`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors border-b border-gray-100 dark:border-gray-800 ${
                      h.level === 1 ? 'font-bold text-gray-800 dark:text-gray-100' :
                      h.level === 2 ? 'font-semibold text-gray-700 dark:text-gray-200 pl-6' :
                      'text-gray-500 dark:text-gray-400 pl-10'
                    }`}
                    title={h.text}
                  >
                    {h.level > 1 && <span className="text-indigo-300 dark:text-indigo-600 mr-2">{h.level === 2 ? '◆' : '›'}</span>}
                    {h.text}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* TOC side panel – desktop only */}
        {isTocOpen && (
          <div className="hidden md:flex w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Document Outline</span>
              <button
                onClick={onCloseToc}
                className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-sm"
              >✕</button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {tocHeadings.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 px-4 py-6 text-center">
                  No sections yet.<br/>Generate notes, Q&amp;A, or summaries to build an outline.
                </p>
              ) : (
                tocHeadings.map(h => (
                  <button
                    key={h.id}
                    onClick={() => {
                      const el = containerRef.current?.querySelector(`#${CSS.escape(h.id)}`);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`w-full text-left px-4 py-2 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors truncate ${
                      h.level === 1 ? 'font-bold text-gray-800 dark:text-gray-100' :
                      h.level === 2 ? 'font-semibold text-gray-700 dark:text-gray-200 pl-4' :
                      'text-gray-500 dark:text-gray-400 pl-6'
                    }`}
                    title={h.text}
                  >
                    {h.level > 1 && <span className="text-gray-300 dark:text-gray-600 mr-1">{h.level === 2 ? '◆' : '›'}</span>}
                    {h.text}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Editor area – hidden on mobile when outline tab is active */}
      <div 
        className={`flex-1 overflow-y-auto relative w-full h-full ${isMobileOutline ? 'hidden md:block' : ''}`}
        onContextMenuCapture={handleContextMenuCapture}
        onPointerDownCapture={handlePointerDownCapture}
        onPointerMoveCapture={handlePointerMoveCapture}
        onPointerUpCapture={handlePointerUpCapture}
        onPointerCancelCapture={handlePointerCancelCapture}
        onMouseUpCapture={handleMouseUpCapture}
      >
        <div className="w-full max-w-4xl mx-auto h-full flex flex-col pt-2 sm:pt-4 px-2 sm:px-4 md:px-6">
            <NoteEditor
                ref={actualEditorRef}
                content={content}
                setContent={onChange}
                scrollContainerRef={containerRef}
                zoomLevel={zoomLevel}
                onToggleFind={onToggleFind}
                currentDocumentId={activeDocumentId}
                flatMode={true}
            />
        </div>
      </div>
      </div>{/* end layout flex row */}

      {/* Smart Space Menu */}
      {menu.visible && isMain && (
        <SmartSpaceMenu
          x={menu.x}
          y={menu.y}
          onGenerateNotes={() => { setMenu(m => ({ ...m, visible: false })); setShowNoteConfig(true); }}
          onSimplify={() => { setMenu(m => ({ ...m, visible: false })); handleSimplify(); }}
          onQA={() => { setMenu(m => ({ ...m, visible: false })); setShowQaConfig(true); }}
          onClose={() => setMenu(m => ({ ...m, visible: false }))}
        />
      )}

      {/* Selection Bubble */}
      {bubble.visible && isMain && (
        <SelectionBubble
          x={bubble.x}
          y={bubble.y}
          selectedHtml={bubble.html}
          resources={resources}
          onReplace={handleReplace}
          onClose={() => setBubble(b => ({ ...b, visible: false }))}
        />
      )}

      {/* Note Config Modal */}
      {showNoteConfig && isMain && (
        <NoteConfigModal
          resources={resources}
          onInsert={(html, heading) => handleInsert(html, heading)}
          onClose={() => setShowNoteConfig(false)}
        />
      )}

      {/* Q&A Config Modal */}
      {showQaConfig && isMain && (
        <QaConfigModal
          resources={resources}
          onInsertTest={(html, heading) => { handleInsert(html, heading); setShowQaConfig(false); }}
          onStartQuiz={cfg => { setQuizConfig(cfg); setShowQaConfig(false); }}
          onClose={() => setShowQaConfig(false)}
        />
      )}

      {/* Quiz Session */}
      {quizConfig && isMain && (
        <QuizSession
          config={quizConfig}
          resources={resources}
          onComplete={handleQuizComplete}
          onClose={() => setQuizConfig(null)}
        />
      )}
    </div>
  );
};
