import React, { useState, useEffect } from 'react';
import { XIcon, ChevronRightIcon, SparklesIcon } from './icons';
import { TocItem, extractHeadingsFromHtml, scrollToHeading, hasHeadings } from '../utils/tocUtils';

interface TableOfContentsProps {
  isOpen: boolean;
  onClose: () => void;
  editorRef: React.RefObject<HTMLDivElement>;
  scrollContainerRef?: React.RefObject<HTMLElement>;
  onRefresh?: () => void;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  isOpen,
  onClose,
  editorRef,
  scrollContainerRef,
  onRefresh
}) => {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6]));
  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-detect headings when opened
  useEffect(() => {
    if (isOpen && editorRef.current) {
      refreshToc();
    }
  }, [isOpen]);

  const refreshToc = () => {
    if (!editorRef.current) return;
    
    const headings = extractHeadingsFromHtml(editorRef.current);
    setTocItems(headings);
  };

  const handleAutoGenerate = async () => {
    setIsGenerating(true);
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 500));
    refreshToc();
    setIsGenerating(false);
  };

  const handleHeadingClick = (item: TocItem) => {
    scrollToHeading(item.id, scrollContainerRef?.current);
  };

  const toggleLevel = (level: number) => {
    setExpandedLevels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(level)) {
        newSet.delete(level);
      } else {
        newSet.add(level);
      }
      return newSet;
    });
  };

  if (!isOpen) return null;

  const hasContent = tocItems.length > 0;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Table of Contents
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoGenerate}
            disabled={isGenerating}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50"
            title="Auto-detect headings"
          >
            {isGenerating ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <SparklesIcon className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Close"
          >
            <XIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!hasContent ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <svg className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No Headings Found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Add headings to your document or let AI detect them automatically.
            </p>
            <button
              onClick={handleAutoGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50"
            >
              <SparklesIcon className="h-4 w-4" />
              <span>Auto-Generate TOC</span>
            </button>
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Or select text and mark it as a heading from the AI menu
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {tocItems.length} {tocItems.length === 1 ? 'Heading' : 'Headings'}
              </span>
              <button
                onClick={refreshToc}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Refresh
              </button>
            </div>
            
            {tocItems.map((item, index) => {
              const indent = (item.level - 1) * 16; // 16px per level
              const isExpanded = expandedLevels.has(item.level);
              
              return (
                <div
                  key={item.id}
                  style={{ paddingLeft: `${indent}px` }}
                  className="group"
                >
                  <button
                    onClick={() => handleHeadingClick(item)}
                    className="w-full flex items-start gap-2 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left group"
                  >
                    <span className={`flex-shrink-0 w-1 h-5 rounded-full ${
                      item.level === 1 ? 'bg-blue-600' :
                      item.level === 2 ? 'bg-indigo-500' :
                      item.level === 3 ? 'bg-purple-500' :
                      item.level === 4 ? 'bg-pink-500' :
                      item.level === 5 ? 'bg-orange-500' :
                      'bg-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className={`truncate ${
                        item.level === 1 ? 'font-bold text-base text-gray-900 dark:text-white' :
                        item.level === 2 ? 'font-semibold text-sm text-gray-800 dark:text-gray-200' :
                        item.level === 3 ? 'font-medium text-sm text-gray-700 dark:text-gray-300' :
                        'text-sm text-gray-600 dark:text-gray-400'
                      }`}>
                        {item.text}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                        H{item.level}
                      </div>
                    </div>
                    <svg className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Help */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div className="flex items-start gap-2">
            <span className="font-semibold">💡 Tip:</span>
            <span>Select text in your document and use "Mark as Heading" to add it to TOC</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold">✨ AI:</span>
            <span>Click the sparkle button to auto-detect all headings</span>
          </div>
        </div>
      </div>
    </div>
  );
};

