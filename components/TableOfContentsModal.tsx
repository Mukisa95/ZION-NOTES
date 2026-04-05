import React, { useEffect, useRef, useState } from 'react';
import { generateText } from '../services/aiService';
import { CheckIcon, ListIcon, SparklesIcon, XIcon } from './icons';

export interface Heading {
  id: string;
  text: string;
  level: number;
  element: HTMLElement;
}

interface TableOfContentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  editorContent: string;
  onNavigateToHeading: (headingId: string) => void;
  onMarkHeading: (text: string) => void;
  documentId?: string;
}

interface PendingHeadingCache {
  id: string;
  text: string;
  level: number;
}

export const TableOfContentsModal: React.FC<TableOfContentsModalProps> = ({
  isOpen,
  onClose,
  editorContent,
  onNavigateToHeading,
  onMarkHeading,
  documentId,
}) => {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [pendingAutodetectHeadings, setPendingAutodetectHeadings] = useState<Heading[]>([]);
  const [showKeepDiscard, setShowKeepDiscard] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [processedTexts, setProcessedTexts] = useState<Set<string>>(new Set());

  const editorRef = useRef<HTMLDivElement | null>(null);

  const getPendingStorageKey = () =>
    documentId ? `toc_pending_${documentId}` : null;
  const getProcessedStorageKey = () =>
    documentId ? `toc_processed_${documentId}` : null;

  useEffect(() => {
    if (!isOpen) return;
    editorRef.current = document.querySelector('[contenteditable="true"]');
    scanForHeadings();
    loadSavedHeadings();
    loadProcessedHeadings();
    loadPendingHeadings();
  }, [isOpen, editorContent, documentId]);

  useEffect(() => {
    if (!documentId) return;
    persistPendingHeadings(pendingAutodetectHeadings);
  }, [pendingAutodetectHeadings, documentId]);

  const loadSavedHeadings = () => {
    if (!documentId || !editorRef.current) return;
    try {
      const savedToc = localStorage.getItem(`toc_${documentId}`);
      if (!savedToc) return;
      const toc = JSON.parse(savedToc) as { id: string; level: number }[];
      toc.forEach(item => {
        const element = editorRef.current?.querySelector(
          `[data-heading-id="${item.id}"]`
        ) as HTMLElement | null;
        if (element) {
          element.setAttribute('data-heading', 'true');
          element.setAttribute('data-heading-level', item.level.toString());
          element.id = item.id;
        }
      });
      scanForHeadings();
    } catch (error) {
      console.error('Error loading saved headings:', error);
    }
  };

  const loadProcessedHeadings = () => {
    const key = getProcessedStorageKey();
    if (!key) return;
    try {
      const savedProcessed = localStorage.getItem(key);
      if (!savedProcessed) return;
      const processed = JSON.parse(savedProcessed) as string[];
      setProcessedTexts(new Set(processed));
    } catch (error) {
      console.error('Error loading processed headings:', error);
    }
  };

  const persistPendingHeadings = (list: Heading[]) => {
    const key = getPendingStorageKey();
    if (!key) return;
    if (list.length === 0) {
      localStorage.removeItem(key);
      return;
    }
    const cache: PendingHeadingCache[] = list.map(({ id, text, level }) => ({
      id,
      text,
      level,
    }));
    localStorage.setItem(key, JSON.stringify(cache));
  };

  const findElementForPending = (
    id: string,
    text: string,
    used: Set<HTMLElement>
  ): HTMLElement | null => {
    if (!editorRef.current) return null;
    let element = editorRef.current.querySelector(
      `[data-autodetect-source="${id}"]`
    ) as HTMLElement | null;
    if (element && !used.has(element)) {
      used.add(element);
      return element;
    }

    const normalized = text.trim().toLowerCase();
    const candidates = editorRef.current.querySelectorAll('p, div');
    for (const candidate of Array.from(candidates)) {
      const candidateText = (candidate.textContent || '').trim().toLowerCase();
      if (candidateText === normalized && !used.has(candidate as HTMLElement)) {
        used.add(candidate as HTMLElement);
        return candidate as HTMLElement;
      }
    }

    return null;
  };

  const loadPendingHeadings = () => {
    if (!editorRef.current) return;
    const key = getPendingStorageKey();
    if (!key) return;
    try {
      const savedPending = localStorage.getItem(key);
      if (!savedPending) return;
      const data = JSON.parse(savedPending) as PendingHeadingCache[];
      const used = new Set<HTMLElement>();
      const reconstructed: Heading[] = [];

      data.forEach(item => {
        const element = findElementForPending(item.id, item.text, used);
        if (element) {
          element.setAttribute('data-autodetect-source', item.id);
          reconstructed.push({
            id: item.id,
            text: item.text,
            level: item.level,
            element,
          });
        }
      });

      if (reconstructed.length > 0) {
        setPendingAutodetectHeadings(reconstructed);
        setShowKeepDiscard(false);
      }
    } catch (error) {
      console.error('Error loading pending headings:', error);
    }
  };

  const saveHeadings = (headingsToSave: Heading[]) => {
    if (!documentId) return;
    if (headingsToSave.length === 0) {
      localStorage.removeItem(`toc_${documentId}`);
      return;
    }
    const simplified = headingsToSave.map(({ id, level }) => ({
      id,
      level,
    }));
    localStorage.setItem(`toc_${documentId}`, JSON.stringify(simplified));
  };

  const saveProcessedHeading = (headingId: string, action: 'keep' | 'discard') => {
    const heading = pendingAutodetectHeadings.find(h => h.id === headingId);
    if (!heading) return;

    const textHash = heading.text.trim().toLowerCase();
    const updatedProcessed = new Set(processedTexts);
    updatedProcessed.add(textHash);
    setProcessedTexts(updatedProcessed);

    const processedKey = getProcessedStorageKey();
    if (processedKey) {
      localStorage.setItem(processedKey, JSON.stringify(Array.from(updatedProcessed)));
    }

    if (action === 'keep') {
      const htmlElement = heading.element;
      htmlElement.setAttribute('data-heading', 'true');
      htmlElement.setAttribute('data-heading-level', heading.level.toString());
      htmlElement.setAttribute('data-autodetect-heading', 'true');
      htmlElement.setAttribute('data-heading-id', heading.id);
      htmlElement.id = heading.id;
      scanForHeadings();
    }

    setPendingAutodetectHeadings(prev => {
      const updated = prev.filter(h => h.id !== headingId);
      if (updated.length === 0) {
        setShowKeepDiscard(false);
      }
      return updated;
    });

    if (editorRef.current) {
      const event = new Event('input', { bubbles: true });
      editorRef.current.dispatchEvent(event);
    }
  };

  const scanForHeadings = () => {
    if (!editorRef.current) return;

    const foundHeadings: Heading[] = [];
    const headingElements = editorRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6, [data-heading="true"]');

    headingElements.forEach((element, index) => {
      const htmlElement = element as HTMLElement;
      const tagName = htmlElement.tagName;
      let level = 1;

      if (tagName.match(/^H[1-6]$/)) {
        level = parseInt(tagName.charAt(1), 10);
      } else if (htmlElement.hasAttribute('data-heading')) {
        const levelAttr = htmlElement.getAttribute('data-heading-level');
        level = levelAttr ? parseInt(levelAttr, 10) : 1;
      }

      const id = htmlElement.id || `heading-${Date.now()}-${index}`;
      htmlElement.id = id;
      htmlElement.setAttribute('data-heading-id', id);

      foundHeadings.push({
        id,
        text: htmlElement.textContent?.trim() || '',
        level,
        element: htmlElement,
      });
    });

    foundHeadings.sort((a, b) => {
      const position = a.element.compareDocumentPosition(b.element);
      if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1;
      }
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1;
      }
      return 0;
    });

    setHeadings(foundHeadings);
  };

  const autoDetectHeadings = () => {
    if (!editorRef.current) return;

    setIsDetecting(true);
    const detectedHeadings: Heading[] = [];
    const paragraphs = editorRef.current.querySelectorAll('p, div');

    const existingPendingTexts = new Set(
      pendingAutodetectHeadings.map(h => h.text.trim().toLowerCase())
    );

    paragraphs.forEach((element, index) => {
      const htmlElement = element as HTMLElement;
      const text = htmlElement.textContent?.trim();

      if (!text) return;

      const textHash = text.trim().toLowerCase();
      if (processedTexts.has(textHash) || existingPendingTexts.has(textHash)) return;

      const isFullyBold = isElementFullyBold(htmlElement);
      const isFullyCapitalized = isTextFullyCapitalized(text);

      if (isFullyBold || isFullyCapitalized) {
        const id = `autodetect-${Date.now()}-${index}`;
        htmlElement.setAttribute('data-autodetect-source', id);
        detectedHeadings.push({
          id,
          text,
          level: 1,
          element: htmlElement,
        });
      }
    });

    if (detectedHeadings.length > 0) {
      setPendingAutodetectHeadings(detectedHeadings);
      setShowKeepDiscard(true);
    } else if (pendingAutodetectHeadings.length > 0) {
      setShowKeepDiscard(true);
    } else {
      alert('No new headings detected, or all have been processed.');
    }

    setIsDetecting(false);
  };

  const detectHeadingsWithAI = async () => {
    if (!editorRef.current) return;

    setIsDetecting(true);

    try {
      const textContent = editorRef.current.innerText || editorRef.current.textContent || '';

      const prompt = `Analyze the following document and identify ONLY clear headings and subheadings. Return ONLY a JSON array with this exact structure (no markdown, no explanations):

[
  {"level": 1, "text": "Heading text here"},
  {"level": 2, "text": "Subheading text here"}
]

Guidelines:
- Use level 1 for main headings
- Use level 2 for subheadings
- Use level 3 for sub-subheadings, etc.
- Be VERY selective - only include clear headings, not regular text
- DO NOT include list items, questions, or numbered items unless they are clearly headings
- Return ONLY the JSON array, nothing else

Document:
${textContent.substring(0, 6000)}`;

      const responseText = await generateText(prompt);
      const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const aiHeadings = JSON.parse(cleanedResponse) as Array<{ level: number; text: string }>;

      if (editorRef.current) {
        const oldAIGenerated = editorRef.current.querySelectorAll('[data-ai-heading="true"]');
        oldAIGenerated.forEach(el => {
          el.removeAttribute('data-heading');
          el.removeAttribute('data-heading-level');
          el.removeAttribute('data-ai-heading');
          el.removeAttribute('data-heading-id');
          el.removeAttribute('id');
        });
      }

      aiHeadings.forEach((aiHeading, index) => {
        const searchText = aiHeading.text.trim();
        if (!searchText) return;

        const walker = document.createTreeWalker(
          editorRef.current!,
          NodeFilter.SHOW_TEXT,
          null
        );

        let node: Node | null;
        while ((node = walker.nextNode())) {
          const text = node.textContent || '';
          if (text.trim() === searchText || text.includes(searchText)) {
            let parent = node.parentElement;
            while (parent && parent !== editorRef.current) {
              if (parent.tagName.match(/^H[1-6]$/) || parent.tagName === 'P' || parent.tagName === 'DIV') {
                const id = `ai-heading-${Date.now()}-${index}`;
                parent.setAttribute('data-heading', 'true');
                parent.setAttribute('data-heading-level', aiHeading.level.toString());
                parent.setAttribute('data-ai-heading', 'true');
                parent.setAttribute('data-heading-id', id);
                parent.id = id;
                break;
              }
              parent = parent.parentElement;
            }
            break;
          }
        }
      });

      scanForHeadings();

      if (editorRef.current) {
        const event = new Event('input', { bubbles: true });
        editorRef.current.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Error detecting headings with AI:', error);
      alert('Failed to detect headings with AI. Please try again.');
    } finally {
      setIsDetecting(false);
    }
  };

  const isElementFullyBold = (element: HTMLElement): boolean => {
    const clone = element.cloneNode(true) as HTMLElement;
    const textNodes: Node[] = [];

    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    if (textNodes.length === 0) return false;

    let allBold = true;
    textNodes.forEach(textNode => {
      let parent = textNode.parentNode as HTMLElement;
      let foundBold = false;

      while (parent && parent !== clone) {
        const style = window.getComputedStyle(parent);
        if (
          style.fontWeight === 'bold' ||
          parseInt(style.fontWeight, 10) >= 700 ||
          parent.tagName === 'B' ||
          parent.tagName === 'STRONG' ||
          parent.style.fontWeight === 'bold' ||
          parent.style.fontWeight === '700'
        ) {
          foundBold = true;
          break;
        }
        parent = parent.parentNode as HTMLElement;
      }

      if (!foundBold) {
        allBold = false;
      }
    });

    return allBold;
  };

  const isTextFullyCapitalized = (text: string): boolean => {
    if (!text || text.length < 3) return false;
    const letters = text.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) return false;
    return letters === letters.toUpperCase();
  };

  const handleKeepHeading = (headingId: string) => {
    saveProcessedHeading(headingId, 'keep');
  };

  const handleDiscardHeading = (headingId: string) => {
    saveProcessedHeading(headingId, 'discard');
  };

  const handleNavigate = (headingId: string) => {
    onNavigateToHeading(headingId);
    onClose();
  };

  const handleMarkSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      alert('Please select some text to mark as a heading.');
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    if (!selectedText) {
      alert('Please select some text to mark as a heading.');
      return;
    }

    let parent = range.commonAncestorContainer;
    if (parent.nodeType === Node.TEXT_NODE) {
      parent = parent.parentNode as Node;
    }

    const element = parent as HTMLElement;
    const id = `manual-heading-${Date.now()}`;
    element.setAttribute('data-heading', 'true');
    element.setAttribute('data-heading-level', selectedLevel.toString());
    element.setAttribute('data-manual-heading', 'true');
    element.setAttribute('data-heading-id', id);
    element.id = id;

    scanForHeadings();

    if (editorRef.current) {
      const event = new Event('input', { bubbles: true });
      editorRef.current.dispatchEvent(event);
    }
  };

  useEffect(() => {
    if (!documentId) return;
    saveHeadings(headings);
  }, [headings, documentId]);

  if (!isOpen) return null;

  return (
    <div
      data-modal="true"
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in-fast backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col transform transition-all duration-300 animate-scale-in">
        <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
              <ListIcon className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Table of Contents
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {showKeepDiscard ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Auto-detected {pendingAutodetectHeadings.length} potential heading
                  {pendingAutodetectHeadings.length !== 1 ? 's' : ''}. Choose per item:
                </p>
                <button
                  onClick={() => setShowKeepDiscard(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  Back
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {pendingAutodetectHeadings.map(heading => (
                  <div
                    key={heading.id}
                    className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-xs flex-shrink-0 w-8 text-center text-gray-500 dark:text-gray-400">
                      L{heading.level}
                    </span>
                    <span className="text-sm flex-1 overflow-hidden text-ellipsis">
                      {heading.text}
                    </span>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleKeepHeading(heading.id)}
                        className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-all"
                        title="Keep this heading"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDiscardHeading(heading.id)}
                        className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-all"
                        title="Discard this heading"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-4 flex-wrap">
                <button
                  onClick={autoDetectHeadings}
                  disabled={isDetecting}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 transition-all text-xs font-medium shadow-sm min-w-[120px]"
                >
                  <SparklesIcon className="h-4 w-4" />
                  {isDetecting ? 'Detecting...' : 'Auto-detect'}
                </button>

                <button
                  onClick={detectHeadingsWithAI}
                  disabled={isDetecting}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 transition-all text-xs font-medium shadow-sm min-w-[120px]"
                >
                  <SparklesIcon className="h-4 w-4" />
                  {isDetecting ? 'Detecting...' : 'AI Detect'}
                </button>
              </div>

              {pendingAutodetectHeadings.length > 0 && (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700">
                  <div className="text-xs text-yellow-900 dark:text-yellow-200">
                    {pendingAutodetectHeadings.length} auto-detected heading
                    {pendingAutodetectHeadings.length !== 1 ? 's' : ''} awaiting review.
                  </div>
                  <button
                    onClick={() => setShowKeepDiscard(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-all"
                  >
                    Resume
                  </button>
                </div>
              )}

              <div className="flex gap-2 items-center mb-4">
                <label className="text-xs text-gray-600 dark:text-gray-400">
                  Level:
                </label>
                <select
                  value={selectedLevel}
                  onChange={e => setSelectedLevel(parseInt(e.target.value, 10))}
                  className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                >
                  <option value="1">Heading 1</option>
                  <option value="2">Subheading 2</option>
                  <option value="3">Subheading 3</option>
                </select>
                <button
                  onClick={handleMarkSelection}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all text-xs font-medium shadow-sm"
                >
                  <CheckIcon className="h-4 w-4" />
                  Mark Selection
                </button>
              </div>

              {headings.length === 0 && !isDetecting && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <p className="text-sm">
                    No headings found. Use Auto-detect, AI Detect, or mark text manually.
                  </p>
                </div>
              )}

              {isDetecting && (
                <div className="flex items-center justify-center space-x-2 py-8">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></div>
                  <div
                    className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: '0.15s' }}
                  ></div>
                  <div
                    className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: '0.3s' }}
                  ></div>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    Analyzing...
                  </span>
                </div>
              )}

              {headings.length > 0 && !isDetecting && (
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {headings.map(heading => (
                    <button
                      key={heading.id}
                      onClick={() => handleNavigate(heading.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${
                        heading.level === 1
                          ? 'text-base font-semibold text-gray-900 dark:text-gray-100'
                          : heading.level === 2
                          ? 'text-sm font-medium text-gray-700 dark:text-gray-300 ml-4'
                          : 'text-xs text-gray-600 dark:text-gray-400 ml-8'
                      }`}
                    >
                      {heading.text || 'Untitled Heading'}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {headings.length > 0 && !showKeepDiscard && (
          <footer className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              {headings.length}{' '}
              {headings.length === 1 ? 'heading' : 'headings'} • Click to navigate
            </p>
          </footer>
        )}
      </div>
    </div>
  );
};
