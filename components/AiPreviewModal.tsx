import React, { useEffect, useState } from 'react';
import { AiAction, AiPreviewState } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { XIcon, DocumentIcon } from './icons';

interface DocumentOption {
  id: string;
  name: string;
}

interface AiPreviewModalProps {
  state: AiPreviewState;
  onClose: () => void;
  onReplace: () => void;
  onInsertAfter: () => void;
  onInsert: () => void;
  onRetake: () => void;
  onCopy: () => void;
  onFollowUpPrompt: () => void;
  onAlternativeClick: (alternative: string) => void;
  availableDocuments?: DocumentOption[];
  currentDocumentId?: string;
  onSwitchDocument?: (documentId: string) => void;
  onInsertToDocument?: (documentId: string, content: string) => void;
}

const loadingMessages = [
  'Thinking about your question...',
  'Putting together the best response...',
  'Wait, I am almost done...',
  'Consulting the digital muses...',
  'Analyzing your text...',
  'Generating insights...',
  'Just a moment...',
  'Crafting the perfect answer...',
  'Brewing some ideas...',
  'Searching the knowledge archives...',
  'Running simulations...',
  'Warming up the circuits...'
];

export const AiPreviewModal: React.FC<AiPreviewModalProps> = ({
  state,
  onClose,
  onReplace,
  onInsertAfter,
  onInsert,
  onRetake,
  onCopy,
  onFollowUpPrompt,
  onAlternativeClick,
  availableDocuments = [],
  currentDocumentId,
  onSwitchDocument,
  onInsertToDocument,
}) => {
  const { isOpen, isLoading, content, originalAction } = state;
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(loadingMessages[0]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const intervalId = setInterval(() => {
        setCurrentMessage(prev => {
          const currentIndex = loadingMessages.indexOf(prev);
          const nextIndex = (currentIndex + 1) % loadingMessages.length;
          return loadingMessages[nextIndex];
        });
      }, 2500);
      return () => clearInterval(intervalId);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading && content && isOpen) {
      setIsTyping(true);
      setDisplayedContent('');
      let i = 0;
      const typingInterval = setInterval(() => {
        if (i < content.length) {
          const chunk = content.substring(i, i + 15);
          setDisplayedContent(prev => prev + chunk);
          i += 15;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
        }
      }, 1);
      return () => clearInterval(typingInterval);
    } else if (!isOpen) {
      setDisplayedContent('');
      setIsTyping(false);
    }
  }, [isLoading, content, isOpen]);

  if (!isOpen) return null;

  const hasSelection = !!state.originalSelection;
  const isAlternativesMode = originalAction?.action === AiAction.FIND_ALTERNATIVES;
  const buttonsDisabled = isLoading || isTyping;

  const handleSelectDocument = (docId: string) => {
    setSelectedDocumentId(docId);
    setShowDocumentSelector(false);
    setIsMinimized(true);
    if (onSwitchDocument) {
      onSwitchDocument(docId);
    }
  };

  const handleInsertAtCursor = () => {
    if (selectedDocumentId && onInsertToDocument && content) {
      onInsertToDocument(selectedDocumentId, content);
      setTimeout(() => {
        onClose();
      }, 100);
    }
  };

  const mainActions = hasSelection
    ? [
        { label: 'Replace', action: onReplace },
        { label: 'After', action: onInsertAfter },
        ...(availableDocuments.length > 0 && onInsertToDocument
          ? [{ label: 'Switch Doc', action: () => setShowDocumentSelector(true) }]
          : []),
      ]
    : [
        { label: 'Insert', action: onInsert },
        ...(availableDocuments.length > 0 && onInsertToDocument
          ? [{ label: 'Switch Doc', action: () => setShowDocumentSelector(true) }]
          : []),
      ];

  const secondaryActions = [
    { label: 'Retake', action: onRetake },
    { label: 'Copy', action: onCopy },
    { label: 'Prompt', action: onFollowUpPrompt },
  ];

  const allActions = [
    ...mainActions.map(action => ({ ...action, variant: 'primary' as const })),
    ...secondaryActions.map(action => ({ ...action, variant: 'secondary' as const })),
  ];

  const getActionClasses = (label: string, variant: 'primary' | 'secondary') => {
    const themes: Record<string, { primary: string; secondary: string }> = {
      Replace: {
        primary: 'border-transparent bg-gradient-to-r from-fuchsia-500 via-violet-500 to-purple-500 text-white shadow-[0_10px_24px_rgba(168,85,247,0.28)] hover:from-fuchsia-400 hover:via-violet-500 hover:to-purple-400',
        secondary: 'border-fuchsia-400 text-fuchsia-500 bg-white hover:bg-fuchsia-50 dark:bg-transparent dark:text-fuchsia-300 dark:border-fuchsia-400/80 dark:hover:bg-fuchsia-500/10',
      },
      After: {
        primary: 'border-transparent bg-gradient-to-r from-lime-400 via-lime-500 to-lime-600 text-white shadow-[0_10px_24px_rgba(132,204,22,0.28)] hover:from-lime-300 hover:via-lime-500 hover:to-lime-500',
        secondary: 'border-lime-400 text-lime-600 bg-white hover:bg-lime-50 dark:bg-transparent dark:text-lime-300 dark:border-lime-400/80 dark:hover:bg-lime-500/10',
      },
      'Switch Doc': {
        primary: 'border-transparent bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 text-white shadow-[0_10px_24px_rgba(251,191,36,0.3)] hover:from-amber-300 hover:via-yellow-400 hover:to-orange-300',
        secondary: 'border-amber-400 text-amber-600 bg-white hover:bg-amber-50 dark:bg-transparent dark:text-amber-300 dark:border-amber-400/80 dark:hover:bg-amber-500/10',
      },
      Insert: {
        primary: 'border-transparent bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 text-white shadow-[0_10px_24px_rgba(56,189,248,0.28)] hover:from-sky-300 hover:via-cyan-400 hover:to-blue-400',
        secondary: 'border-sky-400 text-sky-600 bg-white hover:bg-sky-50 dark:bg-transparent dark:text-sky-300 dark:border-sky-400/80 dark:hover:bg-sky-500/10',
      },
      Retake: {
        primary: 'border-transparent bg-gradient-to-r from-fuchsia-500 via-violet-500 to-purple-500 text-white shadow-[0_10px_24px_rgba(168,85,247,0.28)] hover:from-fuchsia-400 hover:via-violet-500 hover:to-purple-400',
        secondary: 'border-fuchsia-400 text-fuchsia-500 bg-white hover:bg-fuchsia-50 dark:bg-transparent dark:text-fuchsia-300 dark:border-fuchsia-400/80 dark:hover:bg-fuchsia-500/10',
      },
      Copy: {
        primary: 'border-transparent bg-gradient-to-r from-lime-400 via-lime-500 to-lime-600 text-white shadow-[0_10px_24px_rgba(132,204,22,0.28)] hover:from-lime-300 hover:via-lime-500 hover:to-lime-500',
        secondary: 'border-lime-400 text-lime-600 bg-white hover:bg-lime-50 dark:bg-transparent dark:text-lime-300 dark:border-lime-400/80 dark:hover:bg-lime-500/10',
      },
      Prompt: {
        primary: 'border-transparent bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 text-white shadow-[0_10px_24px_rgba(56,189,248,0.28)] hover:from-sky-300 hover:via-cyan-400 hover:to-blue-400',
        secondary: 'border-sky-400 text-sky-600 bg-white hover:bg-sky-50 dark:bg-transparent dark:text-sky-300 dark:border-sky-400/80 dark:hover:bg-sky-500/10',
      },
    };

    const theme = themes[label] ?? themes.Prompt;
    const surface = variant === 'primary' ? theme.primary : theme.secondary;
    return `group relative overflow-hidden whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold tracking-[0.01em] transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 ${surface}`;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[10rem] p-6">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-center">{currentMessage}</p>
        </div>
      );
    }

    if (isAlternativesMode) {
      return (
        <div className="p-6 flex flex-wrap gap-2">
          {content.split('\n').map((alt, index) => {
            const cleanAlt = alt.replace(/^\s*(\*|-)\s/, '').trim();
            if (!cleanAlt) return null;
            return (
              <button
                key={index}
                onClick={() => onAlternativeClick(cleanAlt)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm"
              >
                {cleanAlt}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <div className="p-6">
        {isTyping ? (
          <div className="prose prose-sm lg:prose-base dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:my-3 prose-li:my-1 whitespace-pre-wrap">
            {displayedContent}
          </div>
        ) : (
          <MarkdownRenderer
            content={content}
            className="prose prose-sm lg:prose-base dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:my-3 prose-li:my-1"
          />
        )}
      </div>
    );
  };

  if (isMinimized) {
    return (
      <div data-modal="true" className="fixed bottom-4 right-4 z-50 animate-fade-in-fast">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 min-w-[300px] max-w-[500px]">
          <header className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">AI Response</h2>
              {selectedDocumentId && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  to {availableDocuments.find(d => d.id === selectedDocumentId)?.name || 'Document'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(false)}
                className="p-1 rounded text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Restore"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4m12 0h-4v4m0 8v4h-4m-8 0H4v-4" />
                </svg>
              </button>
              <button onClick={onClose} className="p-1 rounded text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </header>
          <div className="p-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedDocumentId
                ? 'Click in the target document, then press Insert at Cursor.'
                : 'Select a document to insert the response.'}
            </p>
            {selectedDocumentId && (
              <button
                onClick={handleInsertAtCursor}
                className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Insert at Cursor
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-modal="true" className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in-fast backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl grid grid-rows-[auto_1fr_auto] transform transition-all duration-300 scale-95 animate-scale-in max-h-[90vh]">
        <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">AI Response</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Minimize"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
              <XIcon className="h-6 w-6" />
            </button>
          </div>
        </header>

        <div className="overflow-y-auto">
          {showDocumentSelector ? (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Select Document</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableDocuments
                  .filter(doc => doc.id !== currentDocumentId)
                  .map(doc => (
                    <button
                      key={doc.id}
                      onClick={() => handleSelectDocument(doc.id)}
                      className="w-full flex items-center gap-3 p-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <DocumentIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span className="flex-1 text-gray-800 dark:text-gray-200">{doc.name}</span>
                    </button>
                  ))}
              </div>
              <button
                onClick={() => setShowDocumentSelector(false)}
                className="mt-4 inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Back
              </button>
            </div>
          ) : (
            renderContent()
          )}
        </div>

        <footer className="p-4 border-t border-gray-200 dark:border-gray-700">
          {!isAlternativesMode && (
            <div className="flex flex-wrap gap-2">
              {allActions.map(btn => (
                <button
                  key={btn.label}
                  onClick={btn.action}
                  disabled={buttonsDisabled}
                  className={`${getActionClasses(btn.label, btn.variant)} ${buttonsDisabled ? 'opacity-50 cursor-not-allowed hover:translate-y-0' : ''}`}
                >
                  <span className="absolute inset-x-3 top-0 h-px bg-white/60"></span>
                  <span className="relative">{btn.label}</span>
                </button>
              ))}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};
