import React, { useState, useEffect } from 'react';
import { SavedDocument } from '../../services/documentStorage';
import { Ware } from '../../services/wareStorage';
import { getAllDocumentsFromFirestore } from '../../services/firestoreService';
import { getAllWaresFromFirestore } from '../../services/wareFirestoreService';
import { ChevronDownIcon, ChevronUpIcon, SearchIcon, DocumentIcon, FolderIcon } from '../icons';

interface NativeDocumentSelectorProps {
  userId: string | null | undefined;
  onSelectMultiple: (docs: SavedDocument[]) => void;
  disabled?: boolean;
}

export const NativeDocumentSelector: React.FC<NativeDocumentSelectorProps> = ({ userId, onSelectMultiple, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [docs, setDocs] = useState<SavedDocument[]>([]);
  const [wares, setWares] = useState<Ware[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortOpts, setSortOpts] = useState<'date-desc'|'date-asc'|'a-z'|'z-a'>('date-desc');
  const [expandedWares, setExpandedWares] = useState<Record<string, boolean>>({});
  
  // Track selected IDs
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && userId && docs.length === 0) {
      setLoading(true);
      Promise.all([
        getAllDocumentsFromFirestore(userId),
        getAllWaresFromFirestore(userId)
      ]).then(([loadedDocs, loadedWares]) => {
        setDocs(loadedDocs);
        setWares(loadedWares);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [isOpen, userId, docs.length]);

  if (!userId) return null;

  // Filter and sort
  const filteredDocs = docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
  
  filteredDocs.sort((a, b) => {
    if (sortOpts === 'date-desc') return (b.updatedAt || b.lastModified || 0) - (a.updatedAt || a.lastModified || 0);
    if (sortOpts === 'date-asc') return (a.updatedAt || a.lastModified || 0) - (b.updatedAt || b.lastModified || 0);
    if (sortOpts === 'a-z') return a.name.localeCompare(b.name);
    if (sortOpts === 'z-a') return b.name.localeCompare(a.name);
    return 0;
  });

  const toggleWare = (wId: string) => {
    setExpandedWares(prev => ({ ...prev, [wId]: !prev[wId] }));
  };

  const toggleDocSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedDocIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedDocIds(next);
  };

  const handleImportSelected = () => {
    const selectedNodes = docs.filter(d => selectedDocIds.has(d.id));
    if (selectedNodes.length > 0) {
      onSelectMultiple(selectedNodes);
    }
    setIsOpen(false);
    setSelectedDocIds(new Set());
  };

  return (
    <div className="mt-2 text-xs font-sans relative">
      <button
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors disabled:opacity-50 font-medium"
      >
        <div className="flex items-center gap-2">
          <DocumentIcon className="h-4 w-4" />
          <span>Import Saved Documents</span>
        </div>
        {isOpen ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
      </button>

      {isOpen && (
        <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 space-y-3 z-10 w-full mb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
              <input 
                 type="text" 
                 placeholder="Search..." 
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="w-full pl-8 pr-2 py-1.5 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            
            <select 
               value={sortOpts}
               onChange={e => setSortOpts(e.target.value as any)}
               className="w-28 shrink-0 px-2 py-1.5 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded text-gray-800 dark:text-gray-200 focus:outline-none text-xs"
            >
              <option value="date-desc">Newest</option>
              <option value="date-asc">Oldest</option>
              <option value="a-z">A-Z</option>
              <option value="z-a">Z-A</option>
            </select>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading your documents...</div>
            ) : filteredDocs.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No documents found.</div>
            ) : (
              <div className="space-y-3">
                {wares.map(w => {
                  const wareDocs = filteredDocs.filter(d => w.documentIds.includes(d.id));
                  if (wareDocs.length === 0) return null;
                  const isExpanded = expandedWares[w.id];
                  return (
                    <div key={w.id} className="border border-gray-100 dark:border-gray-800 rounded overflow-hidden">
                      <button 
                        onClick={() => toggleWare(w.id)}
                        className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                         <div className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300 truncate pr-2">
                           <FolderIcon className="h-3.5 w-3.5 shrink-0" color={w.color} />
                           <span className="truncate">{w.name}</span>
                         </div>
                         <div className="flex items-center gap-1.5 shrink-0">
                           <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 rounded-full text-[10px]">{wareDocs.length}</span>
                           {isExpanded ? <ChevronUpIcon className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />}
                         </div>
                      </button>
                      {isExpanded && (
                         <div className="divide-y divide-gray-100 dark:divide-gray-800">
                           {wareDocs.map(d => (
                              <button key={d.id} onClick={(e) => toggleDocSelection(d.id, e)} className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={selectedDocIds.has(d.id)} 
                                  readOnly 
                                  className="shrink-0 h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 bg-white cursor-pointer pointer-events-none"
                                />
                                <div className="flex w-full items-center justify-between text-gray-800 dark:text-gray-200">
                                  <span className="font-medium truncate max-w-[12rem]">{d.name}</span>
                                  <span className="text-[10px] text-gray-500 shrink-0">{new Date(d.updatedAt || d.lastModified || 0).toLocaleDateString()}</span>
                                </div>
                              </button>
                           ))}
                         </div>
                      )}
                    </div>
                  )
                })}

                {/* Ungrouped Docs */}
                {(() => {
                  const groupedIds = new Set(wares.flatMap(w => w.documentIds));
                  const ungrouped = filteredDocs.filter(d => !groupedIds.has(d.id));
                  if (ungrouped.length === 0) return null;
                  return (
                    <div className="space-y-1">
                      {ungrouped.map(d => (
                        <button key={d.id} onClick={(e) => toggleDocSelection(d.id, e)} className="w-full text-left flex items-center gap-2 px-2 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-colors cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={selectedDocIds.has(d.id)} 
                              readOnly 
                              className="shrink-0 h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 bg-white cursor-pointer pointer-events-none"
                            />
                            <div className="flex w-full items-center justify-between text-gray-800 dark:text-gray-200">
                              <span className="font-medium truncate max-w-[12rem]">{d.name}</span>
                              <span className="text-[10px] text-gray-500 shrink-0">{new Date(d.updatedAt || d.lastModified || 0).toLocaleDateString()}</span>
                            </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          
          {selectedDocIds.size > 0 && (
             <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
               <button
                  onClick={handleImportSelected}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded shadow-sm transition-colors text-xs flex justify-center items-center gap-2"
               >
                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                 </svg>
                 Load {selectedDocIds.size} Document{selectedDocIds.size > 1 ? 's' : ''}
               </button>
             </div>
          )}

        </div>
      )}
    </div>
  );
};
