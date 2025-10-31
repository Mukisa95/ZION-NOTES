import React, { useState } from 'react';
import { XIcon, DocumentIcon } from './icons';

export interface DocumentTab {
    id: string;
    name: string;
    content: string;
    isDirty?: boolean;
}

interface DocumentTabsProps {
    tabs: DocumentTab[];
    activeTabId: string | null;
    onTabClick: (id: string) => void;
    onTabClose: (id: string) => void;
    onTabRename: (id: string, newName: string) => void;
    onNewTab: () => void;
}

export const DocumentTabs: React.FC<DocumentTabsProps> = ({
    tabs,
    activeTabId,
    onTabClick,
    onTabClose,
    onTabRename,
    onNewTab
}) => {
    const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
    const [renamingValue, setRenamingValue] = useState('');

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
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-t-2 border-blue-500 shadow-sm'
                            : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                    <DocumentIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    
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
            
            <button
                onClick={onNewTab}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-all flex-shrink-0"
                title="New document (Ctrl+T)"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>
    );
};

