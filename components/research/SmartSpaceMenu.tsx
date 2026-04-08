import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

  // Keep menu on screen (Menu is roughly 160px wide and 150px tall)
  const MENU_WIDTH = 160;
  const MENU_HEIGHT = 150;
  
  // Ensure it doesn't go off the right/bottom, nor the top/left
  const safeX = Math.max(10, Math.min(x, window.innerWidth - MENU_WIDTH - 10));
  const safeY = Math.max(10, Math.min(y, window.innerHeight - MENU_HEIGHT - 10));

  const style: React.CSSProperties = {
    position: 'fixed',
    top: safeY,
    left: safeX,
    zIndex: 1000,
  };

  const menuItems = [
    {
      icon: '📝',
      label: 'Notes',
      action: () => { onClose(); onGenerateNotes(); },
    },
    {
      icon: '🎯',
      label: 'QnA',
      action: () => { onClose(); onQA(); },
    },
    {
      icon: '✨',
      label: 'Summary',
      action: () => { onClose(); onSimplify(); },
    },
  ];

  const menuContent = (
    <div ref={menuRef} style={style} className="w-40 animate-in fade-in slide-in-from-top-2 duration-150">
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
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left group"
            >
              <span className="text-base leading-none">{item.icon}</span>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                {item.label}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(menuContent, document.body);
};
