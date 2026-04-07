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
  setCounts
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const localEditorRef = useRef<NoteEditorHandles>(null);
  const actualEditorRef = editorRef || localEditorRef;

  const [menu, setMenu] = useState<MenuState>({ visible: false, x: 0, y: 0 });
  const [bubble, setBubble] = useState<BubbleState>({ visible: false, x: 0, y: 0, html: '' });
  const [showNoteConfig, setShowNoteConfig] = useState(false);
  const [showQaConfig, setShowQaConfig] = useState(false);
  const [quizConfig, setQuizConfig] = useState<QaConfig | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

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
    longPressTimer.current = setTimeout(() => {
      setMenu({ visible: true, x: e.clientX, y: e.clientY });
    }, 600);
  };
  
  const handlePointerUpCapture = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
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

  // Insert AI output at end of document
  const handleInsert = (html: string) => {
    if (actualEditorRef.current?.appendText) {
        actualEditorRef.current.appendText(html);
    } else {
        onChange(content + html);
    }
  };

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
    handleInsert(reportHtml);
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

      {/* Editor area - Wraps NoteEditor to capture events */}
      <div 
        className="flex-1 overflow-y-auto relative w-full h-full"
        onContextMenuCapture={handleContextMenuCapture}
        onPointerDownCapture={handlePointerDownCapture}
        onPointerUpCapture={handlePointerUpCapture}
        onMouseUpCapture={handleMouseUpCapture}
      >
        <div className="w-full max-w-4xl mx-auto h-full flex flex-col p-4">
            <NoteEditor
                ref={actualEditorRef}
                content={content}
                setContent={onChange}
                scrollContainerRef={containerRef}
                zoomLevel={zoomLevel}
                onToggleFind={onToggleFind}
                currentDocumentId={activeDocumentId}
            />
        </div>
      </div>

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
          onInsert={handleInsert}
          onClose={() => setShowNoteConfig(false)}
        />
      )}

      {/* Q&A Config Modal */}
      {showQaConfig && isMain && (
        <QaConfigModal
          resources={resources}
          onInsertTest={html => { handleInsert(html); setShowQaConfig(false); }}
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
