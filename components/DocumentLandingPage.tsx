import React, { useState, useEffect } from 'react';
import { PlusIcon, DocumentIcon, TrashIcon, SearchIcon, CloudIcon, SettingsIcon, FolderIcon } from './icons';
import { SavedDocument, getAllDocuments, saveDocument } from '../services/documentStorage';
import { getAllDocumentsFromFirestore, deleteDocumentFromFirestore, saveDocumentToFirestore } from '../services/firestoreService';
import { UserProfile } from './UserProfile';
import { AuthModal } from './AuthModal';
import { SettingsModal } from './SettingsModal';
import { CreateWareModal } from './CreateWareModal';
import { AddDocumentsToWareModal } from './AddDocumentsToWareModal';
import { WareViewModal } from './WareViewModal';
import { Ware, getAllWares, saveWare, updateWare, deleteWare } from '../services/wareStorage';
import { getAllWaresFromFirestore, saveWareToFirestore, updateWareInFirestore, deleteWareFromFirestore } from '../services/wareFirestoreService';
import { getCountsFromHtml } from '../utils/textUtils';
import { getWareColorClasses } from './wareColorUtils';
import { getWareColorStyle } from './wareColorStyles';

interface DocumentLandingPageProps {
    onOpenDocument: (doc: SavedDocument) => void;
    onOpenDocuments: (docs: SavedDocument[]) => void;
    onCreateNew: () => void;
    userId?: string | null;
    incognitoMode?: boolean;
    user?: any; // Firebase user object
}

export const DocumentLandingPage: React.FC<DocumentLandingPageProps> = ({
    onOpenDocument,
    onOpenDocuments,
    onCreateNew,
    userId,
    incognitoMode = false,
    user
}) => {
    const [documents, setDocuments] = useState<SavedDocument[]>([]);
    const [filteredDocuments, setFilteredDocuments] = useState<SavedDocument[]>([]);
    const [wares, setWares] = useState<Ware[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCreateWareModalOpen, setIsCreateWareModalOpen] = useState(false);
    const [isAddDocumentsModalOpen, setIsAddDocumentsModalOpen] = useState(false);
    const [isWareViewModalOpen, setIsWareViewModalOpen] = useState(false);
    const [selectedWare, setSelectedWare] = useState<Ware | null>(null);

    useEffect(() => {
        loadDocuments();
        loadWares();
    }, [userId, incognitoMode]);

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
                docs = await getAllDocumentsFromFirestore(userId);
            } else {
                docs = await getAllDocuments();
            }
            setDocuments(docs);
            // Filtered documents will be updated by the useEffect that depends on documents and wares
        } catch (error) {
            console.error('Error loading documents:', error);
            if (userId && !incognitoMode) {
                try {
                    const localDocs = await getAllDocuments();
                    setDocuments(localDocs);
                    // Filtered documents will be updated by the useEffect that depends on documents and wares
                } catch (localError) {
                    console.error('Error loading local documents:', localError);
                }
            }
        } finally {
            setLoading(false);
        }
    };

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

    const handleCreateWare = async (name: string, color: string) => {
        try {
            let newWare: Ware;
            if (userId && !incognitoMode) {
                newWare = {
                    id: `ware_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name,
                    documentIds: [],
                    color,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                await saveWareToFirestore(userId, newWare);
                // Optimistically add to state
                setWares(prev => [newWare, ...prev]);
                // Reload after a delay to sync with Firestore, merging with existing
                setTimeout(async () => {
                    try {
                        const reloadedWares = await getAllWaresFromFirestore(userId);
                        // Merge: if new ware is already in reloaded list, use reloaded; otherwise keep both
                        setWares(prevWares => {
                            const existingIds = new Set(reloadedWares.map(w => w.id));
                            const missingFromReloaded = prevWares.filter(w => !existingIds.has(w.id));
                            // Combine reloaded wares with any optimistic updates that weren't in reloaded
                            return [...reloadedWares, ...missingFromReloaded].sort((a, b) => b.updatedAt - a.updatedAt);
                        });
                    } catch (err) {
                        // If reload fails, keep optimistic update
                        console.log('Reload deferred, keeping optimistic update');
                    }
                }, 1500);
            } else {
                newWare = await saveWare(name, [], color);
                // Optimistically add to state
                setWares(prev => [newWare, ...prev]);
                // For local storage, reload immediately since it's synchronous
                await loadWares();
            }
        } catch (error) {
            console.error('Error creating WARE:', error);
            // Reload on error to get accurate state
            await loadWares();
            throw error;
        }
    };

    const handleAddDocumentsToWare = async (documentIds: string[]) => {
        if (!selectedWare) return;
        
        try {
            const updatedWare = {
                ...selectedWare,
                documentIds: [...selectedWare.documentIds, ...documentIds],
                updatedAt: Date.now()
            };
            
            if (userId && !incognitoMode) {
                await updateWareInFirestore(userId, selectedWare.id, updatedWare);
            } else {
                await updateWare(selectedWare.id, selectedWare.name, updatedWare.documentIds, selectedWare.color);
            }
            
            // Wait a bit for Firestore to sync, then reload
            await new Promise(resolve => setTimeout(resolve, 500));
            await loadWares();
            
            // Update selectedWare to reflect changes
            const reloadedWares = userId && !incognitoMode 
                ? await getAllWaresFromFirestore(userId)
                : await getAllWares();
            const reloadedWare = reloadedWares.find(w => w.id === selectedWare.id);
            if (reloadedWare) {
                setSelectedWare(reloadedWare);
            } else {
                setSelectedWare(updatedWare);
            }
        } catch (error) {
            console.error('Error adding documents to WARE:', error);
            throw error;
        }
    };

    const handleCreateDocumentsForWare = async (names: string[]): Promise<string[]> => {
        const createdIds: string[] = [];
        
        for (const name of names) {
            try {
                const emptyContent = '<p><br></p>';
                let savedDoc: SavedDocument;
                
                if (userId && !incognitoMode) {
                    savedDoc = {
                        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        name,
                        content: emptyContent,
                        lastModified: Date.now(),
                        wordCount: 0
                    };
                    await saveDocumentToFirestore(userId, savedDoc);
                } else {
                    savedDoc = await saveDocument(name, emptyContent);
                }
                
                createdIds.push(savedDoc.id);
            } catch (error) {
                console.error('Error creating document:', error);
            }
        }
        
        await loadDocuments();
        return createdIds;
    };

    const handleDeleteWare = async () => {
        if (!selectedWare) return;
        
        try {
            if (userId && !incognitoMode) {
                await deleteWareFromFirestore(userId, selectedWare.id);
            } else {
                await deleteWare(selectedWare.id);
            }
            await loadWares();
        } catch (error) {
            console.error('Error deleting WARE:', error);
            throw error;
        }
    };

    const handleOpenWare = (ware: Ware) => {
        setSelectedWare(ware);
        setIsWareViewModalOpen(true);
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
                    const { deleteDocument } = await import('../services/documentStorage');
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
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                My Documents
                            </h1>
                            <div className="flex items-center gap-3">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} {documents.length > filteredDocuments.length ? `(${documents.length - filteredDocuments.length} in WARES)` : ''} {searchQuery ? `(filtered)` : ''}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Authentication */}
                            {user ? (
                                <>
                                    <UserProfile onOpenSettings={() => setIsSettingsOpen(true)} />
                                    {incognitoMode && (
                                        <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-md text-xs font-medium">
                                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                            <span className="hidden sm:inline">Incognito</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setIsSettingsOpen(true)}
                                        className="p-2 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-all"
                                        title="Settings"
                                    >
                                        <SettingsIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => setIsAuthModalOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                        title="Sign in to sync documents"
                                    >
                                        <CloudIcon className="h-5 w-5" />
                                        <span className="hidden sm:inline">Sign In</span>
                                    </button>
                                </>
                            )}
                            
                            <button
                                onClick={() => setIsCreateWareModalOpen(true)}
                                className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                title="New WARE"
                            >
                                <FolderIcon className="h-5 w-5" />
                            </button>
                            
                            <button
                                onClick={onCreateNew}
                                className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                title="New Document"
                            >
                                <PlusIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto max-w-6xl w-full mx-auto px-6 py-8">
                {/* WARES Section */}
                {wares.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">WARES</h2>
                        <div className="flex flex-wrap gap-4 sm:gap-6">
                            {wares.map((ware, index) => {
                                const colorStyle = getWareColorStyle(ware.color);
                                const isDark = document.documentElement.classList.contains('dark');
                                
                                return (
                                    <div
                                        key={ware.id}
                                        onClick={() => handleOpenWare(ware)}
                                        className="group flex flex-col items-center gap-2 cursor-pointer transition-transform duration-200 hover:scale-105"
                                        style={{
                                            width: '90px'
                                        }}
                                    >
                                        <div className="relative">
                                            <FolderIcon 
                                                className="h-12 w-12 transition-all duration-200"
                                                style={{
                                                    color: isDark ? colorStyle.iconColorDark : colorStyle.iconColor
                                                }}
                                            />
                                            {ware.documentIds.length > 0 && (
                                                <div 
                                                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                                    style={{
                                                        backgroundColor: isDark ? colorStyle.iconColorDark : colorStyle.iconColor
                                                    }}
                                                >
                                                    {ware.documentIds.length}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-center w-full">
                                            <h3 className="font-medium text-gray-900 dark:text-white text-xs truncate px-1">
                                                {ware.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {ware.documentIds.length} doc{ware.documentIds.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Documents Section */}
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Documents</h2>
                    {loading ? (
                        <div className="text-center py-16">
                            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading documents...</p>
                        </div>
                    ) : filteredDocuments.length === 0 ? (
                    <div className="text-center py-16">
                        {documents.length === 0 ? (
                            <>
                                <div className="text-7xl mb-6">📄</div>
                                <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    No documents yet
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-6">
                                    Get started by creating your first document
                                </p>
                                <button
                                    onClick={onCreateNew}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 mx-auto"
                                >
                                    <PlusIcon className="h-5 w-5" />
                                    <span>Create Your First Document</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    No documents found
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Try a different search term
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {filteredDocuments.map((doc) => (
                            <div
                                key={doc.id}
                                onClick={() => onOpenDocument(doc)}
                                className="group relative flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-all duration-200 cursor-pointer"
                            >
                                <DocumentIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-normal text-gray-900 dark:text-white truncate text-sm">
                                        {doc.name}
                                    </h3>
                                </div>
                                
                                <button
                                    onClick={(e) => handleDelete(doc.id, e)}
                                    className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
                                    title="Delete document"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                </div>
            </div>
            
            {/* Auth and Settings Modals */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
            />
            
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            {/* WARE Modals */}
            <CreateWareModal
                isOpen={isCreateWareModalOpen}
                onClose={() => setIsCreateWareModalOpen(false)}
                onCreate={handleCreateWare}
            />

            <AddDocumentsToWareModal
                isOpen={isAddDocumentsModalOpen}
                onClose={() => {
                    setIsAddDocumentsModalOpen(false);
                    setSelectedWare(null);
                }}
                wareId={selectedWare?.id || ''}
                existingDocumentIds={selectedWare?.documentIds || []}
                onAddDocuments={handleAddDocumentsToWare}
                onCreateDocuments={handleCreateDocumentsForWare}
                userId={userId}
                incognitoMode={incognitoMode}
            />

            {selectedWare && (
                <WareViewModal
                    isOpen={isWareViewModalOpen}
                    onClose={() => {
                        setIsWareViewModalOpen(false);
                        setSelectedWare(null);
                    }}
                    ware={selectedWare}
                    onOpenDocument={onOpenDocument}
                    onOpenDocuments={onOpenDocuments}
                    onDeleteWare={handleDeleteWare}
                    onAddDocuments={() => {
                        setIsAddDocumentsModalOpen(true);
                    }}
                    userId={userId}
                    incognitoMode={incognitoMode}
                />
            )}
        </div>
    );
};

