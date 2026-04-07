import React, { useEffect, useRef } from 'react';
import { SparklesIcon, XIcon } from '../icons';

interface SmartSpaceMenuProps {
  x: number;
  y: number;
  onGenerateNotes: () => void;
  onSimplify: () => void;
  onQA: () => void;
  onClose: () => void;
}

export const SmartSpaceMenu: React.FC<SmartSpaceMenuProps> = ({
  x,
  y,
  onGenerateNotes,
  onSimplify,
  onQA,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Small delay to avoid immediate close from the triggering click
    const t = setTimeout(() => document.addEventListener('mousedown', handle), 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handle);
    };
  }, [onClose]);

  // Keep menu on screen
  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(y, window.innerHeight - 200),
    left: Math.min(x, window.innerWidth - 220),
    zIndex: 1000,
  };

  const menuItems = [
    {
      icon: '📝',
      label: 'Generate Notes',
      desc: 'AI creates structured notes from resources',
      action: () => { onClose(); onGenerateNotes(); },
      color: 'from-violet-500 to-purple-600',
    },
    {
      icon: '✨',
      label: 'Simplify',
      desc: 'Rewrite in simpler language',
      action: () => { onClose(); onSimplify(); },
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: '🎯',
      label: 'Q&A',
      desc: 'Generate questions or run a quiz',
      action: () => { onClose(); onQA(); },
      color: 'from-emerald-500 to-teal-500',
    },
  ];

  return (
    <div ref={menuRef} style={style} className="w-52 animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/50 dark:to-indigo-950/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5">
            <SparklesIcon className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            <span className="text-xs font-bold text-violet-700 dark:text-violet-300">Smart Space</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>

        {/* Menu items */}
        <div className="p-1.5 space-y-0.5">
          {menuItems.map(item => (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left group"
            >
              <span className="text-base leading-none mt-0.5">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
