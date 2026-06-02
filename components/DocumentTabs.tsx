import React, { useState, useRef, useEffect } from 'react';
import { XIcon, DocumentIcon } from './icons';

export interface DocumentTab {
    id: string;
    name: string;
    content: string;
    isDirty?: boolean;
    type?: string;
    researchProjectId?: string;
}

interface DocumentTabsProps {
    tabs: DocumentTab[];
    activeTabId: string | null;
    onTabClick: (id: string) => void;
    onTabClose: (id: string) => void;
    onTabRename: (id: string, newName: string) => void;
    onNewTab: () => void;
    onNewResearch?: () => void;
    /** Max tabs to show before showing overflow button. Default = unlimited */
    maxVisible?: number;
    /** If provided, renders a Tools toggle button at the start of the bar */
    toolsButton?: React.ReactNode;
    className?: string;
}

const useClickOutside = (ref: React.RefObject<HTMLElement>, callback: () => void) => {
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) callback();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [ref, callback]);
};

export const DocumentTabs: React.FC<DocumentTabsProps> = ({
    tabs,
    activeTabId,
    onTabClick,
    onTabClose,
    onTabRename,
    onNewTab,
    onNewResearch,
    maxVisible,
    toolsButton,
    className = '',
}) => {
    const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
    const [renamingValue, setRenamingValue] = useState('');
    const [overflowOpen, setOverflowOpen] = useState(false);
    const overflowRef = useRef<HTMLDivElement>(null!);
    useClickOutside(overflowRef, () => setOverflowOpen(false));

    if (tabs.length === 0) return null;

    const limit = maxVisible ?? tabs.length;
    const visibleTabs = tabs.slice(0, limit);
    const hiddenTabs = tabs.slice(limit);
    const hasOverflow = hiddenTabs.length > 0;

    const handleDoubleClick = (tab: DocumentTab, e: React.MouseEvent) => {
        e.stopPropagation();
        setRenamingTabId(tab.id);
        setRenamingValue(tab.name);
    };

    const handleRenameComplete = (tabId: string) => {
        if (renamingValue.trim() && renamingValue !== tabs.find(t => t.id === tabId)?.name) {
            onTabRename(tabId, renamingValue.trim());
        }
        setRenamingTabId(null);
        setRenamingValue('');
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent, tabId: string) => {
        if (e.key === 'Enter') handleRenameComplete(tabId);
        else if (e.key === 'Escape') { setRenamingTabId(null); setRenamingValue(''); }
    };

    const activeIsHidden = hiddenTabs.some(t => t.id === activeTabId);

    return (
        <div className={`flex min-w-0 items-center gap-0.5 bg-gray-100 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700/50 px-1.5 py-1 ${className}`}>

            {/* Tools button slot (small screens) */}
            {toolsButton && (
                <div className="shrink-0 mr-0.5">
                    {toolsButton}
                </div>
            )}

            {/* Visible tabs */}
            {visibleTabs.map(tab => (
                <div
                    key={tab.id}
                    onClick={() => !renamingTabId && onTabClick(tab.id)}
                    className={`group flex min-w-0 flex-1 items-center gap-1.5 rounded-t-lg px-2 py-1.5 transition-all cursor-pointer shrink basis-0 min-w-[80px] max-w-[200px] ${
                        tab.id === activeTabId
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-t-2 border-blue-500 shadow-sm'
                            : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                    <DocumentIcon className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />

                    {renamingTabId === tab.id ? (
                        <input
                            type="text"
                            value={renamingValue}
                            onChange={(e) => setRenamingValue(e.target.value)}
                            onBlur={() => handleRenameComplete(tab.id)}
                            onKeyDown={(e) => handleRenameKeyDown(e, tab.id)}
                            className="text-xs font-medium bg-white dark:bg-gray-700 border border-blue-500 rounded px-1 py-0.5 flex-1 min-w-0 focus:outline-none"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span
                            className="text-xs font-medium truncate flex-1"
                            onDoubleClick={(e) => handleDoubleClick(tab, e)}
                            title={`${tab.name}${tab.isDirty ? ' (unsaved)' : ''} — double-click to rename`}
                        >
                            {tab.name}
                            {tab.isDirty && <span className="text-blue-500 ml-1">•</span>}
                        </span>
                    )}

                    <button
                        onClick={(e) => { e.stopPropagation(); onTabClose(tab.id); }}
                        className={`flex-shrink-0 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 transition-all ${
                            tab.id === activeTabId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                        title="Close tab"
                    >
                        <XIcon className="h-3 w-3" />
                    </button>
                </div>
            ))}

            {/* Overflow button */}
            {hasOverflow && (
                <div className="relative shrink-0" ref={overflowRef}>
                    <button
                        onClick={() => setOverflowOpen(prev => !prev)}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 duration-150 ${
                            activeIsHidden
                                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                                : overflowOpen
                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                                    : 'bg-gray-200/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400'
                        }`}
                        title={`${hiddenTabs.length} more open document${hiddenTabs.length > 1 ? 's' : ''}`}
                    >
                        <span>+{hiddenTabs.length}</span>
                    </button>

                    {overflowOpen && (
                        <div className="absolute right-0 top-full mt-2 z-50 w-72 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl shadow-2xl shadow-black/15 dark:shadow-black/40">
                            {/* Header */}
                            <div className="px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Other Open Documents</p>
                            </div>
                            <div className="py-1.5 max-h-64 overflow-y-auto">
                                {hiddenTabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => { onTabClick(tab.id); setOverflowOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all hover:bg-blue-50 dark:hover:bg-blue-950/40 ${
                                            tab.id === activeTabId
                                                ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                                                : 'text-gray-700 dark:text-gray-200'
                                        }`}
                                    >
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                            <DocumentIcon className="h-3.5 w-3.5" />
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-xs font-semibold truncate">
                                                {tab.name}
                                                {tab.isDirty && <span className="text-blue-500 ml-1">•</span>}
                                            </span>
                                            <span className="block text-[10px] text-gray-400 dark:text-gray-500">
                                                {tab.type === 'research' ? 'Research project' : 'Document'}
                                            </span>
                                        </span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onTabClose(tab.id); setOverflowOpen(false); }}
                                            className="flex-shrink-0 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 text-gray-400 transition-all"
                                            title="Close"
                                        >
                                            <XIcon className="h-3 w-3" />
                                        </button>
                                    </button>
                                ))}
                            </div>
                            {/* New Document button */}
                            <div className="border-t border-gray-100 dark:border-gray-800 p-2">
                                <button
                                    onClick={() => { onNewTab(); setOverflowOpen(false); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-semibold shadow transition-all hover:shadow-md active:scale-95"
                                >
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                        </svg>
                                    </span>
                                    New Document
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* + button (when no overflow or always visible) */}
            {!hasOverflow && (
                <button
                    onClick={onNewTab}
                    className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:scale-110 active:scale-95 duration-150"
                    title="New document (Ctrl+T)"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            )}
        </div>
    );
};
