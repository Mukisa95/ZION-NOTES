import React, { useState, useEffect } from 'react';
import { XIcon, TrashIcon, SearchIcon, FolderIcon, ChevronDownIcon, ChevronRightIcon, DocumentIcon } from './icons';
import { SavedDocument, getAllDocuments, deleteDocument, getDocument } from '../services/documentStorage';
import { getAllDocumentsFromFirestore, deleteDocumentFromFirestore } from '../services/firestoreService';
import { Ware, getAllWares } from '../services/wareStorage';
import { getAllWaresFromFirestore } from '../services/wareFirestoreService';
import { getWareColorStyle } from './wareColorStyles';

interface DocumentLibraryProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenDocument: (doc: SavedDocument) => void;
    currentDocumentId: string | null;
    userId?: string | null;
    incognitoMode?: boolean;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({ 
    isOpen, 
    onClose, 
    onOpenDocument,
    currentDocumentId,
    userId,
    incognitoMode = false
}) => {
    const [documents, setDocuments] = useState<SavedDocument[]>([]);
    const [filteredDocuments, setFilteredDocuments] = useState<SavedDocument[]>([]);
    const [wares, setWares] = useState<Ware[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedWares, setExpandedWares] = useState<Set<string>>(new Set());
    const [wareDocuments, setWareDocuments] = useState<Record<string, SavedDocument[]>>({});

    useEffect(() => {
        if (isOpen) {
            console.log('DocumentLibrary opened with:', { userId, incognitoMode, isOpen });
            loadDocuments();
            loadWares();
        }
    }, [isOpen, userId, incognitoMode]);

    const loadWares = async () => {
        try {
            let waresList: Ware[];
            if (userId && !incognitoMode) {
                waresList = await getAllWaresFromFirestore(userId);
            } else {
                waresList = await getAllWares();
            }
            setWares(waresList);
        } catch (error) {
            console.error('Error loading WARES:', error);
            if (userId && !incognitoMode) {
                try {
                    const localWares = await getAllWares();
                    setWares(localWares);
                } catch (localError) {
                    console.error('Error loading local WARES:', localError);
                }
            }
        }
    };

    const loadWareDocuments = async (ware: Ware) => {
        if (wareDocuments[ware.id]) {
            // Already loaded
            return;
        }

        try {
            const loadedDocs: SavedDocument[] = [];
            
            for (const docId of ware.documentIds) {
                let doc: SavedDocument | null = null;
                if (userId && !incognitoMode) {
                    const { getDocumentFromFirestore } = await import('../services/firestoreService');
                    doc = await getDocumentFromFirestore(userId, docId);
                } else {
                    doc = await getDocument(docId);
                }
                if (doc) {
                    loadedDocs.push(doc);
                }
            }
            
            setWareDocuments(prev => ({
                ...prev,
                [ware.id]: loadedDocs
            }));
        } catch (error) {
            console.error('Error loading WARE documents:', error);
        }
    };

    const handleToggleWare = async (ware: Ware) => {
        const isExpanded = expandedWares.has(ware.id);
        
        if (isExpanded) {
            // Collapse
            setExpandedWares(prev => {
                const next = new Set(prev);
                next.delete(ware.id);
                return next;
            });
        } else {
            // Expand - load documents if not already loaded
            await loadWareDocuments(ware);
            setExpandedWares(prev => new Set(prev).add(ware.id));
        }
    };

    // Filter documents based on search query
    useEffect(() => {
        // Get all document IDs that are in any WARE
        const wareDocumentIds = new Set<string>();
        wares.forEach(ware => {
            ware.documentIds.forEach(docId => wareDocumentIds.add(docId));
        });
        
        // Filter documents that are NOT in any WARE
        const documentsNotInWares = documents.filter(doc => 
            !wareDocumentIds.has(doc.id)
        );
        
        if (!searchQuery.trim()) {
            setFilteredDocuments(documentsNotInWares);
        } else {
            const filtered = documentsNotInWares.filter(doc =>
                doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.content.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredDocuments(filtered);
        }
    }, [searchQuery, documents, wares]);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            let docs: SavedDocument[];
            if (userId && !incognitoMode) {
                // Load from Firestore
                console.log('Loading documents from Firestore for user:', userId);
                docs = await getAllDocumentsFromFirestore(userId);
                console.log('Loaded documents from Firestore:', docs);
            } else {
                // Load from local storage
                console.log('Loading documents from local storage');
                docs = await getAllDocuments();
                console.log('Loaded documents from local storage:', docs);
            }
            setDocuments(docs);
            setFilteredDocuments(docs);
        } catch (error) {
            console.error('Error loading documents:', error);
            // Fallback to local storage if cloud fails
            if (userId && !incognitoMode) {
                console.log('Falling back to local storage due to cloud error');
                try {
                    const localDocs = await getAllDocuments();
                    setDocuments(localDocs);
                    setFilteredDocuments(localDocs);
                } catch (localError) {
                    console.error('Error loading local documents:', localError);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this document?')) {
            try {
                if (userId && !incognitoMode) {
                    // Delete from Firestore
                    await deleteDocumentFromFirestore(userId, id);
                } else {
                    // Delete from local storage
                    await deleteDocument(id);
                }
                loadDocuments();
            } catch (error) {
                console.error('Error deleting document:', error);
                alert('Failed to delete document');
            }
        }
    };

    const formatDate = (timestamp: number) => {
        // Handle invalid timestamps
        if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
            return 'Unknown';
        }
        
        const date = new Date(timestamp);
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Unknown';
        }
        
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6" data-modal>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700/50">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">My Documents</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                {filteredDocuments.length} of {documents.length} document{documents.length !== 1 ? 's' : ''}
                            </p>
                            {userId && !incognitoMode && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md text-xs font-medium">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                    <span>Cloud</span>
                                </div>
                            )}
                            {incognitoMode && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-md text-xs font-medium">
                                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                    <span>Local</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="px-4 sm:px-6 pb-3">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-sm"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading documents...</p>
                        </div>
                    ) : (
                        <>
                            {/* WARES Section */}
                            {wares.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-1">WARES</h3>
                                    <div className="space-y-1">
                                        {wares.filter(ware => 
                                            !searchQuery.trim() || 
                                            ware.name.toLowerCase().includes(searchQuery.toLowerCase())
                                        ).map(ware => {
                                            const colorStyle = getWareColorStyle(ware.color);
                                            const isDark = document.documentElement.classList.contains('dark');
                                            const isExpanded = expandedWares.has(ware.id);
                                            const wareDocs = wareDocuments[ware.id] || [];
                                            return (
                                                <div key={ware.id}>
                                                    <div
                                                        onClick={() => handleToggleWare(ware)}
                                                        className="p-3 rounded-lg border cursor-pointer transition-all duration-200 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                                        style={{
                                                            background: isDark ? colorStyle.backgroundDark : colorStyle.background,
                                                            borderColor: isDark ? colorStyle.borderColorDark : colorStyle.borderColor
                                                        }}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                <div className="flex items-center gap-1">
                                                                    <ChevronRightIcon 
                                                                        className={`h-3 w-3 text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform duration-300 ${
                                                                            isExpanded ? 'transform rotate-90' : ''
                                                                        }`}
                                                                    />
                                                                    <div 
                                                                        className="p-1.5 rounded flex-shrink-0"
                                                                        style={{
                                                                            backgroundColor: isDark ? colorStyle.iconBgDark : colorStyle.iconBg
                                                                        }}
                                                                    >
                                                                        <FolderIcon 
                                                                            className="h-4 w-4"
                                                                            style={{
                                                                                color: isDark ? colorStyle.iconColorDark : colorStyle.iconColor
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-0.5 truncate text-sm">
                                                                        {ware.name}
                                                                    </h3>
                                                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                                        <span>{ware.documentIds.length} document{ware.documentIds.length !== 1 ? 's' : ''}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Expanded documents list */}
                                                    {isExpanded && wareDocs.length > 0 && (
                                                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-2 animate-expand">
                                                            {wareDocs.map((doc, index) => (
                                                                <div
                                                                    key={doc.id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onOpenDocument(doc);
                                                                        onClose();
                                                                    }}
                                                                    className={`p-2 rounded-lg border cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                                                                        doc.id === currentDocumentId
                                                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                                    }`}
                                                                    style={{
                                                                        animation: `fadeInUpStagger 0.4s ease-out ${index * 60}ms both`
                                                                    }}
                                                                >
                                                                    <div className="flex items-start justify-between">
                                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                            <DocumentIcon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                                                            <div className="flex-1 min-w-0">
                                                                                <h4 className="font-medium text-gray-900 dark:text-white mb-0.5 truncate text-xs">
                                                                                    {doc.id === currentDocumentId && '📝 '}
                                                                                    {doc.name}
                                                                                </h4>
                                                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                                                    <span>{doc.wordCount}w</span>
                                                                                    <span>•</span>
                                                                                    <span>{formatDate(doc.lastModified || doc.updatedAt || 0)}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {isExpanded && (!wareDocuments[ware.id] || wareDocuments[ware.id].length === 0) && (
                                                        <div className="ml-4 mt-1 text-xs text-gray-500 dark:text-gray-400 pl-8">
                                                            Loading documents...
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Documents Section */}
                            {filteredDocuments.length === 0 && (!wares.length || searchQuery.trim()) ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📄</div>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                {searchQuery ? 'No documents found' : 'No saved documents yet'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {searchQuery ? 'Try a different search term' : 'Click the Save button to save your first document locally'}
                            </p>
                        </div>
                            ) : filteredDocuments.length > 0 ? (
                                <div>
                                    {wares.length > 0 && (
                                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-1">Documents</h3>
                                    )}
                        <div className="space-y-1">
                                        {filteredDocuments.map((doc, index) => (
                                <div
                                    key={doc.id}
                                    onClick={() => {
                                        onOpenDocument(doc);
                                        onClose();
                                    }}
                                                className={`p-3 rounded-lg border cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                                        doc.id === currentDocumentId
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                    }`}
                                                style={{
                                                    animation: `fadeInSlide 0.5s ease-out ${index * 80}ms both`
                                                }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 dark:text-white mb-0.5 truncate text-sm">
                                                {doc.id === currentDocumentId && '📝 '}
                                                {doc.name}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <span>{doc.wordCount}w</span>
                                                <span>•</span>
                                                <span>{formatDate(doc.lastModified)}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(doc.id, e)}
                                            className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all ml-2"
                                            title="Delete document"
                                        >
                                            <TrashIcon className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700/50">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

