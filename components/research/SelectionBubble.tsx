import React, { useEffect, useRef, useState } from 'react';
import { ResearchResource } from '../../types';
import { explainDeep, simplifyText, summariseText, rewriteText } from '../../services/researchAiService';

interface SelectionBubbleProps {
  x: number;
  y: number;
  selectedHtml: string;
  resources: ResearchResource[];
  onReplace: (html: string) => void;
  onClose: () => void;
}

type BubbleAction = 'explain' | 'simplify' | 'summarise' | 'rewrite';

export const SelectionBubble: React.FC<SelectionBubbleProps> = ({
  x,
  y,
  selectedHtml,
  resources,
  onReplace,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<BubbleAction | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handle), 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handle);
    };
  }, [onClose]);

  const run = async (action: BubbleAction) => {
    setLoading(action);
    setError('');
    try {
      let result = '';
      if (action === 'explain') result = await explainDeep(selectedHtml, resources);
      else if (action === 'simplify') result = await simplifyText(selectedHtml, resources);
      else if (action === 'summarise') result = await summariseText(selectedHtml);
      else if (action === 'rewrite') result = await rewriteText(selectedHtml);
      onReplace(result);
      onClose();
    } catch {
      setError('AI request failed. Check your API key in Settings.');
    } finally {
      setLoading(null);
    }
  };

  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.max(8, y - 60),
    left: Math.min(x, window.innerWidth - 340),
    zIndex: 1000,
  };

  const buttons: { action: BubbleAction; label: string; icon: string; color: string }[] = [
    { action: 'explain', label: 'Explain Deep', icon: '🔬', color: 'hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:text-violet-600 dark:hover:text-violet-300' },
    { action: 'simplify', label: 'Simplify', icon: '✨', color: 'hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-300' },
    { action: 'summarise', label: 'Summarise', icon: '📋', color: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-300' },
    { action: 'rewrite', label: 'Rewrite', icon: '🔄', color: 'hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-600 dark:hover:text-orange-300' },
  ];

  return (
    <div ref={ref} style={style} className="animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center">
          {buttons.map((btn, i) => (
            <React.Fragment key={btn.action}>
              <button
                onClick={() => run(btn.action)}
                disabled={loading !== null}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-all disabled:opacity-50 ${btn.color}`}
                title={btn.label}
              >
                {loading === btn.action ? (
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span>{btn.icon}</span>
                )}
                <span className="hidden sm:inline">{btn.label}</span>
              </button>
              {i < buttons.length - 1 && (
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
              )}
            </React.Fragment>
          ))}
        </div>
        {error && (
          <p className="text-xs text-red-500 px-3 py-1.5 border-t border-gray-100 dark:border-gray-800">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};
