import React, { useState, useEffect } from 'react';
import { XIcon, ChevronUpIcon, ChevronDownIcon, CaseSensitiveIcon } from './icons';

interface FindAndReplaceBarProps {
  onFind: (query: string, options: { matchCase: boolean }) => void;
  onNavigate: (direction: 'next' | 'prev') => void;
  onClose: () => void;
  results: {
    total: number;
    current: number;
  };
}

export const FindAndReplaceBar: React.FC<FindAndReplaceBarProps> = ({ onFind, onNavigate, onClose, results }) => {
  const [query, setQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);

  useEffect(() => {
    onFind(query, { matchCase });
  }, [query, matchCase]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
            onNavigate('prev');
        } else {
            onNavigate('next');
        }
    }
    if (e.key === 'Escape') {
        onClose();
    }
  };

  return (
    <div className="absolute top-4 right-4 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex items-center p-2 space-x-2 animate-fade-in-down">
      <input
        type="text"
        placeholder="Find..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-48 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoFocus
      />
      <span className="text-sm text-gray-500 dark:text-gray-400 w-16 text-center">
        {results.total > 0 ? `${results.current} / ${results.total}` : '0 / 0'}
      </span>
      <button 
        onClick={() => setMatchCase(!matchCase)} 
        className={`p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 ${matchCase ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
        title="Match Case"
      >
        <CaseSensitiveIcon className="h-5 w-5" />
      </button>
      <button 
        onClick={() => onNavigate('prev')} 
        disabled={results.total === 0}
        className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
        title="Previous match (Shift+Enter)"
      >
        <ChevronUpIcon className="h-5 w-5" />
      </button>
      <button 
        onClick={() => onNavigate('next')} 
        disabled={results.total === 0}
        className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
        title="Next match (Enter)"
      >
        <ChevronDownIcon className="h-5 w-5" />
      </button>
      <button 
        onClick={onClose} 
        className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
        title="Close (Esc)"
      >
        <XIcon className="h-5 w-5" />
      </button>
    </div>
  );
};
