import React, { useState, useEffect } from 'react';
import { PlusIcon, DocumentIcon, TrashIcon, SearchIcon, CloudIcon, SettingsIcon, FolderIcon, CheckIcon, EditIcon } from './icons';
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
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedWareIds, setSelectedWareIds] = useState<string[]>([]);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [renameTarget, setRenameTarget] = useState<{ type: 'ware' | 'document', id: string, currentName: string } | null>(null);
    const [moveToWareDialogOpen, setMoveToWareDialogOpen] = useState(false);
    const [filteredWares, setFilteredWares] = useState<Ware[]>([]);
    const [wareMatchedDocs, setWareMatchedDocs] = useState<Record<string, SavedDocument[]>>({});

    useEffect(() => {
        loadDocuments();
        loadWares();
    }, [userId, incognitoMode]);

    // Filter documents and WARES based on search query
    useEffect(() => {
        const query = searchQuery.toLowerCase().trim();
        
        // Get all document IDs that are in any WARE
        const wareDocumentIds = new Set<string>();
        wares.forEach(ware => {
            ware.documentIds.forEach(docId => wareDocumentIds.add(docId));
        });
        
        // Filter documents that are NOT in any WARE
        const documentsNotInWares = documents.filter(doc => 
            !wareDocumentIds.has(doc.id)
        );
        
        if (!query) {
            // No search - show all
            setFilteredDocuments(documentsNotInWares);
            setFilteredWares(wares);
            setWareMatchedDocs({});
        } else {
            // Search independent documents (character-based search)
            const matchedIndependentDocs = documentsNotInWares.filter(doc =>
                doc.name.toLowerCase().includes(query)
            );
            setFilteredDocuments(matchedIndependentDocs);
            
            // Search WARES and documents within WARES
            const matchedWares: Ware[] = [];
            const wareDocsMap: Record<string, SavedDocument[]> = {};
            
            wares.forEach(ware => {
                // Check if WARE name matches
                const wareNameMatches = ware.name.toLowerCase().includes(query);
                
                // Check if any documents in this WARE match
                const matchingDocsInWare = documents.filter(doc => 
                    ware.documentIds.includes(doc.id) && 
                    doc.name.toLowerCase().includes(query)
                );
                
                // Include WARE if either the WARE name matches or it contains matching documents
                if (wareNameMatches || matchingDocsInWare.length > 0) {
                    matchedWares.push(ware);
                    
                    // If WARE name matches, show all documents; otherwise show only matched documents
                    if (wareNameMatches) {
                        wareDocsMap[ware.id] = documents.filter(doc => ware.documentIds.includes(doc.id));
                    } else {
                        wareDocsMap[ware.id] = matchingDocsInWare;
                    }
                }
            });
            
            setFilteredWares(matchedWares);
            setWareMatchedDocs(wareDocsMap);
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

    const handleToggleWareSelection = (wareId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedWareIds(prev => 
            prev.includes(wareId) ? prev.filter(id => id !== wareId) : [...prev, wareId]
        );
    };

    const handleToggleDocSelection = (docId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedDocIds(prev => 
            prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
        );
    };

    const handleRenameWare = async (newName: string) => {
        if (!renameTarget || renameTarget.type !== 'ware') return;
        
        try {
            if (userId && !incognitoMode) {
                await updateWareInFirestore(userId, renameTarget.id, { name: newName });
            } else {
                await updateWare(renameTarget.id, { name: newName });
            }
            await loadWares();
            setRenameDialogOpen(false);
            setRenameTarget(null);
        } catch (error) {
            console.error('Error renaming WARE:', error);
            alert('Failed to rename WARE');
        }
    };

    const handleRenameDocument = async (newName: string) => {
        if (!renameTarget || renameTarget.type !== 'document') return;
        
        try {
            const doc = documents.find(d => d.id === renameTarget.id);
            if (!doc) return;
            
            const updatedDoc = { ...doc, name: newName };
            if (userId && !incognitoMode) {
                await saveDocumentToFirestore(userId, updatedDoc);
            } else {
                await saveDocument(updatedDoc);
            }
            await loadDocuments();
            setRenameDialogOpen(false);
            setRenameTarget(null);
        } catch (error) {
            console.error('Error renaming document:', error);
            alert('Failed to rename document');
        }
    };

    const handleMoveDocumentsToWare = async (targetWareId: string) => {
        try {
            const targetWare = wares.find(w => w.id === targetWareId);
            if (!targetWare) return;
            
            const updatedDocIds = [...new Set([...targetWare.documentIds, ...selectedDocIds])];
            
            if (userId && !incognitoMode) {
                await updateWareInFirestore(userId, targetWareId, { documentIds: updatedDocIds });
            } else {
                await updateWare(targetWareId, { documentIds: updatedDocIds });
            }
            
            setSelectedDocIds([]);
            setMoveToWareDialogOpen(false);
            await loadWares();
            await loadDocuments();
        } catch (error) {
            console.error('Error moving documents:', error);
            alert('Failed to move documents');
        }
    };

    const handleBulkDeleteWares = async () => {
        if (selectedWareIds.length === 0) return;
        if (!confirm(`Delete ${selectedWareIds.length} WARE(s)? This will keep all documents.`)) return;
        
        try {
            for (const wareId of selectedWareIds) {
                if (userId && !incognitoMode) {
                    await deleteWareFromFirestore(userId, wareId);
                } else {
                    await deleteWare(wareId);
                }
            }
            setSelectedWareIds([]);
            await loadWares();
        } catch (error) {
            console.error('Error deleting WARES:', error);
            alert('Failed to delete WARES');
        }
    };

    const handleBulkDeleteDocuments = async () => {
        if (selectedDocIds.length === 0) return;
        if (!confirm(`Delete ${selectedDocIds.length} document(s)? This action cannot be undone.`)) return;
        
        try {
            for (const docId of selectedDocIds) {
                if (userId && !incognitoMode) {
                    await deleteDocumentFromFirestore(userId, docId);
                } else {
                    const { deleteDocument } = await import('../services/documentStorage');
                    await deleteDocument(docId);
                }
            }
            setSelectedDocIds([]);
            await loadDocuments();
        } catch (error) {
            console.error('Error deleting documents:', error);
            alert('Failed to delete documents');
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
                            
                            {!selectionMode ? (
                                <>
                                    <button
                                        onClick={() => setSelectionMode(true)}
                                        className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                        title="Select Items"
                                    >
                                        <CheckIcon className="h-5 w-5" />
                                    </button>
                                    
                            <button
                                onClick={() => setIsCreateWareModalOpen(true)}
                                className="p-3 bg-gradient-to-br from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 icon-glossy"
                                title="New WARE"
                            >
                                <FolderIcon className="h-5 w-5" />
                            </button>
                            
                            <button
                                onClick={onCreateNew}
                                className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 icon-glossy"
                                title="New Document"
                            >
                                <PlusIcon className="h-5 w-5" />
                            </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            setSelectionMode(false);
                                            setSelectedWareIds([]);
                                            setSelectedDocIds([]);
                                        }}
                                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm font-semibold"
                                    >
                                        Cancel
                                    </button>
                                    
                                    {/* WARE Selection Actions */}
                                    {selectedWareIds.length === 1 && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    const ware = wares.find(w => w.id === selectedWareIds[0]);
                                                    if (ware) {
                                                        setRenameTarget({ type: 'ware', id: ware.id, currentName: ware.name });
                                                        setRenameDialogOpen(true);
                                                    }
                                                }}
                                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                                                title="Rename WARE"
                                            >
                                                <EditIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={handleBulkDeleteWares}
                                                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                                                title="Delete WARE"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </>
                                    )}
                                    
                                    {selectedWareIds.length > 1 && (
                                        <button
                                            onClick={handleBulkDeleteWares}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all text-sm font-semibold"
                                        >
                                            Delete {selectedWareIds.length} WARES
                                        </button>
                                    )}
                                    
                                    {/* Document Selection Actions */}
                                    {selectedDocIds.length === 1 && selectedWareIds.length === 0 && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    const doc = documents.find(d => d.id === selectedDocIds[0]);
                                                    if (doc) {
                                                        setRenameTarget({ type: 'document', id: doc.id, currentName: doc.name });
                                                        setRenameDialogOpen(true);
                                                    }
                                                }}
                                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                                                title="Rename Document"
                                            >
                                                <EditIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => setMoveToWareDialogOpen(true)}
                                                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all"
                                                title="Move to WARE"
                                            >
                                                <FolderIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={handleBulkDeleteDocuments}
                                                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                                                title="Delete Document"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </>
                                    )}
                                    
                                    {selectedDocIds.length > 1 && selectedWareIds.length === 0 && (
                                        <>
                                            <button
                                                onClick={() => setMoveToWareDialogOpen(true)}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all text-sm font-semibold"
                                            >
                                                Move {selectedDocIds.length} to WARE
                                            </button>
                                            <button
                                                onClick={handleBulkDeleteDocuments}
                                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all text-sm font-semibold"
                                            >
                                                Delete {selectedDocIds.length} Docs
                                            </button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Search Bar with Selection Controls */}
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search documents and WARES..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                            />
                        </div>
                        
                        {/* Selection Mode Controls */}
                        {!selectionMode ? (
                            <button
                                onClick={() => setSelectionMode(true)}
                                className="p-3 bg-gradient-to-br from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 flex-shrink-0 icon-glossy"
                                title="Select Items"
                            >
                                <CheckIcon className="h-5 w-5" />
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                                <button
                                    onClick={() => {
                                        setSelectionMode(false);
                                        setSelectedWareIds([]);
                                        setSelectedDocIds([]);
                                    }}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm font-semibold"
                                >
                                    Cancel
                                </button>
                                
                                {/* WARE Selection Actions */}
                                {selectedWareIds.length === 1 && (
                                    <>
                                        <button
                                            onClick={() => {
                                                const ware = wares.find(w => w.id === selectedWareIds[0]);
                                                if (ware) {
                                                    setRenameTarget({ type: 'ware', id: ware.id, currentName: ware.name });
                                                    setRenameDialogOpen(true);
                                                }
                                            }}
                                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                                            title="Rename WARE"
                                        >
                                            <EditIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={handleBulkDeleteWares}
                                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                                            title="Delete WARE"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </>
                                )}
                                
                                {selectedWareIds.length > 1 && (
                                    <button
                                        onClick={handleBulkDeleteWares}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all text-sm font-semibold"
                                    >
                                        Delete {selectedWareIds.length} WARES
                                    </button>
                                )}
                                
                                {/* Document Selection Actions */}
                                {selectedDocIds.length === 1 && selectedWareIds.length === 0 && (
                                    <>
                                        <button
                                            onClick={() => {
                                                const doc = documents.find(d => d.id === selectedDocIds[0]);
                                                if (doc) {
                                                    setRenameTarget({ type: 'document', id: doc.id, currentName: doc.name });
                                                    setRenameDialogOpen(true);
                                                }
                                            }}
                                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                                            title="Rename Document"
                                        >
                                            <EditIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => setMoveToWareDialogOpen(true)}
                                            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all"
                                            title="Move to WARE"
                                        >
                                            <FolderIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={handleBulkDeleteDocuments}
                                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                                            title="Delete Document"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </>
                                )}
                                
                                {selectedDocIds.length > 1 && selectedWareIds.length === 0 && (
                                    <>
                                        <button
                                            onClick={() => setMoveToWareDialogOpen(true)}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all text-sm font-semibold"
                                        >
                                            Move {selectedDocIds.length} to WARE
                                        </button>
                                        <button
                                            onClick={handleBulkDeleteDocuments}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all text-sm font-semibold"
                                        >
                                            Delete {selectedDocIds.length} Docs
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto max-w-6xl w-full mx-auto px-6 py-8">
                {/* WARES Section */}
                {filteredWares.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            WARES {searchQuery && `(${filteredWares.length} matching)`}
                        </h2>
                        <div className={searchQuery ? 'space-y-4' : 'flex flex-wrap gap-4 sm:gap-6'}>
                            {filteredWares.map((ware, index) => {
                                const colorStyle = getWareColorStyle(ware.color);
                                const isDark = document.documentElement.classList.contains('dark');
                                const isSelected = selectedWareIds.includes(ware.id);
                                const matchedDocs = wareMatchedDocs[ware.id] || [];
                                const hasSearchResults = searchQuery && matchedDocs.length > 0;
                                
                                if (hasSearchResults) {
                                    // Hierarchical view for search results
                                    return (
                                        <div key={ware.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                            {/* WARE Header */}
                                            <div 
                                                onClick={(e) => {
                                                    if (selectionMode) {
                                                        handleToggleWareSelection(ware.id, e);
                                                    } else {
                                                        handleOpenWare(ware);
                                                    }
                                                }}
                                                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                {selectionMode && (
                                                    <div 
                                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                                            isSelected 
                                                                ? 'border-blue-500 bg-blue-500' 
                                                                : 'border-gray-300 dark:border-gray-600'
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <CheckIcon className="h-3 w-3 text-white" />
                                                        )}
                                                    </div>
                                                )}
                                                <FolderIcon 
                                                    className="h-6 w-6 flex-shrink-0"
                                                    style={{
                                                        color: isDark ? colorStyle.iconColorDark : colorStyle.iconColor
                                                    }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                                                        {ware.name}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {matchedDocs.length} matching document{matchedDocs.length !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* Matched Documents in WARE */}
                                            <div className="bg-white dark:bg-gray-900 pl-6">
                                                {matchedDocs.map(doc => (
                                                    <div
                                                        key={doc.id}
                                                        onClick={(e) => {
                                                            e.currentTarget.classList.add('icon-press');
                                                            setTimeout(() => onOpenDocument(doc), 100);
                                                        }}
                                                        className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors border-l-2 border-gray-300 dark:border-gray-600"
                                                    >
                                                        <DocumentIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-normal text-gray-900 dark:text-white truncate text-sm">
                                                                {doc.name}
                                                            </h4>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                                <span>{doc.wordCount} words</span>
                                                                <span>•</span>
                                                                <span>{formatDate(doc.lastModified || doc.updatedAt || 0)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                } else {
                                    // No search or WARE name match only - show as icon
                                    return (
                                        <div
                                            key={ware.id}
                                        onClick={(e) => {
                                            if (selectionMode) {
                                                handleToggleWareSelection(ware.id, e);
                                            } else {
                                                e.currentTarget.classList.add('icon-press');
                                                setTimeout(() => handleOpenWare(ware), 100);
                                            }
                                        }}
                                        className={`group flex flex-col items-center gap-2 cursor-pointer transition-transform duration-200 hover:scale-110 ${
                                            isSelected ? 'ring-2 ring-blue-500 rounded-lg p-1' : ''
                                        }`}
                                            style={{
                                                width: '90px'
                                            }}
                                        >
                                            <div className="relative">
                                                {selectionMode && (
                                                    <div 
                                                        className={`absolute -top-2 -left-2 w-5 h-5 rounded border-2 flex items-center justify-center z-10 ${
                                                            isSelected 
                                                                ? 'border-blue-500 bg-blue-500' 
                                                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <CheckIcon className="h-3 w-3 text-white" />
                                                        )}
                                                    </div>
                                                )}
                                                <FolderIcon 
                                                    className="h-12 w-12 transition-all duration-200"
                                                    style={{
                                                        color: isDark ? colorStyle.iconColorDark : colorStyle.iconColor
                                                    }}
                                                />
                                                {ware.documentIds.length > 0 && !selectionMode && (
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
                                }
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
                        {filteredDocuments.map((doc) => {
                            const isSelected = selectedDocIds.includes(doc.id);
                            return (
                                <div
                                    key={doc.id}
                                    onClick={(e) => {
                                        if (selectionMode) {
                                            handleToggleDocSelection(doc.id, e);
                                        } else {
                                            onOpenDocument(doc);
                                        }
                                    }}
                                    className={`group relative flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-all duration-200 cursor-pointer ${
                                        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                    }`}
                                >
                                    {selectionMode && (
                                        <div 
                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                                isSelected 
                                                    ? 'border-blue-500 bg-blue-500' 
                                                    : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                        >
                                            {isSelected && (
                                                <CheckIcon className="h-3 w-3 text-white" />
                                            )}
                                        </div>
                                    )}
                                    <DocumentIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-normal text-gray-900 dark:text-white truncate text-sm">
                                            {doc.name}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            <span>{doc.wordCount} words</span>
                                            <span>•</span>
                                            <span>{formatDate(doc.lastModified || doc.updatedAt || 0)}</span>
                                        </div>
                                    </div>
                                    
                                    {!selectionMode && (
                                        <button
                                            onClick={(e) => handleDelete(doc.id, e)}
                                            className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
                                            title="Delete document"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
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

            {/* Rename Dialog */}
            {renameDialogOpen && renameTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            Rename {renameTarget.type === 'ware' ? 'WARE' : 'Document'}
                        </h2>
                        <input
                            type="text"
                            defaultValue={renameTarget.currentName}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                            id="rename-input"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const newName = (e.target as HTMLInputElement).value.trim();
                                    if (newName) {
                                        if (renameTarget.type === 'ware') {
                                            handleRenameWare(newName);
                                        } else {
                                            handleRenameDocument(newName);
                                        }
                                    }
                                }
                            }}
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => {
                                    setRenameDialogOpen(false);
                                    setRenameTarget(null);
                                }}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const input = document.getElementById('rename-input') as HTMLInputElement;
                                    const newName = input?.value.trim();
                                    if (newName) {
                                        if (renameTarget.type === 'ware') {
                                            handleRenameWare(newName);
                                        } else {
                                            handleRenameDocument(newName);
                                        }
                                    }
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                Rename
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Move to WARE Dialog */}
            {moveToWareDialogOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            Move to WARE
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Select a WARE to move {selectedDocIds.length} document{selectedDocIds.length > 1 ? 's' : ''} to:
                        </p>
                        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                            {wares.map(ware => (
                                <button
                                    key={ware.id}
                                    onClick={() => handleMoveDocumentsToWare(ware.id)}
                                    className="w-full p-3 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                >
                                    <div className="flex items-center gap-2">
                                        <FolderIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                                        <span className="font-medium text-gray-900 dark:text-white">{ware.name}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">({ware.documentIds.length} docs)</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setMoveToWareDialogOpen(false)}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                    // Don't set selectedWare to null - keep WARE modal open
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

