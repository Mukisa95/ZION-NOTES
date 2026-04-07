import React, { useState, useRef, useEffect } from 'react';
import { XIcon, DocumentIcon, BeakerIcon } from './icons';

export interface DocumentTab {
    id: string;
    name: string;
    content: string;
    isDirty?: boolean;
    type?: 'document' | 'research';
    researchProjectId?: string;
}

interface DocumentTabsProps {
    tabs: DocumentTab[];
    activeTabId: string | null;
    onTabClick: (id: string) => void;
    onTabClose: (id: string) => void;
    onTabRename: (id: string, newName: string) => void;
    onNewTab: () => void;
    onNewResearch: () => void;
}

export const DocumentTabs: React.FC<DocumentTabsProps> = ({
    tabs,
    activeTabId,
    onTabClick,
    onTabClose,
    onTabRename,
    onNewTab,
    onNewResearch,
}) => {
    const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
    const [renamingValue, setRenamingValue] = useState('');
    const [showNewMenu, setShowNewMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const plusRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!showNewMenu) return;
        const handle = (e: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(e.target as Node) &&
                plusRef.current && !plusRef.current.contains(e.target as Node)
            ) {
                setShowNewMenu(false);
            }
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [showNewMenu]);

    if (tabs.length === 0) return null;

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
        if (e.key === 'Enter') {
            handleRenameComplete(tabId);
        } else if (e.key === 'Escape') {
            setRenamingTabId(null);
            setRenamingValue('');
        }
    };

    return (
        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800/50 px-2 py-1 border-b border-gray-200 dark:border-gray-700/50 overflow-x-auto">
            {tabs.map(tab => (
                <div
                    key={tab.id}
                    onClick={() => !renamingTabId && onTabClick(tab.id)}
                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg cursor-pointer transition-all min-w-[120px] max-w-[200px] ${
                        tab.id === activeTabId
                            ? tab.type === 'research'
                                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-t-2 border-violet-500 shadow-sm'
                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-t-2 border-blue-500 shadow-sm'
                            : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                    {tab.type === 'research' ? (
                        <BeakerIcon className="h-3.5 w-3.5 flex-shrink-0 text-violet-500" />
                    ) : (
                        <DocumentIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    )}

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
                            title="Double-click to rename"
                        >
                            {tab.name}
                            {tab.isDirty && <span className="text-blue-500 ml-1">•</span>}
                        </span>
                    )}

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTabClose(tab.id);
                        }}
                        className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-all ${
                            tab.id === activeTabId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                        title="Close tab"
                    >
                        <XIcon className="h-3 w-3" />
                    </button>
                </div>
            ))}

            {/* Plus button with popup */}
            <div className="relative flex-shrink-0">
                <button
                    ref={plusRef}
                    onClick={() => setShowNewMenu(v => !v)}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-all"
                    title="New (Ctrl+T)"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>

                {showNewMenu && (
                    <div
                        ref={menuRef}
                        className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-100"
                    >
                        <div className="p-1">
                            <button
                                onClick={() => { setShowNewMenu(false); onNewTab(); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left"
                            >
                                <DocumentIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Document</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Blank note editor</p>
                                </div>
                            </button>
                            <button
                                onClick={() => { setShowNewMenu(false); onNewResearch(); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all text-left"
                            >
                                <BeakerIcon className="h-4 w-4 text-violet-500 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Research</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">AI-assisted workspace</p>
                                </div>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
