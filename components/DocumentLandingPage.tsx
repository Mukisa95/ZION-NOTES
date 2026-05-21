import React, { useState, useEffect, useRef } from 'react';
import { PlusIcon, DocumentIcon, TrashIcon, SearchIcon, CloudIcon, SettingsIcon, FolderIcon, CheckIcon, EditIcon, BeakerIcon } from './icons';
import { AiProvider, ResearchProject } from '../types';
import { getAllResearchProjectsFromFirestore, deleteResearchProjectFromFirestore } from '../services/researchFirestoreService';
import { SavedDocument, getAllDocuments, saveDocument, updateDocument } from '../services/documentStorage';
import { getAllDocumentsFromFirestore, deleteDocumentFromFirestore, saveDocumentToFirestore } from '../services/firestoreService';
import { UserProfile } from './UserProfile';
import { AuthModal } from './AuthModal';
import { SettingsModal } from './SettingsModal';
import { ProviderModal } from './ProviderModal';
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
    onCreateNewResearch: () => void;
    onOpenResearch?: (project: ResearchProject) => void;
    userId?: string | null;
    incognitoMode?: boolean;
    user?: any; // Firebase user object
}

export const DocumentLandingPage: React.FC<DocumentLandingPageProps> = ({
    onOpenDocument,
    onOpenDocuments,
    onCreateNew,
    onCreateNewResearch,
    onOpenResearch,
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
    const [isProviderOpen, setIsProviderOpen] = useState(false);
    const [settingsInitialProvider, setSettingsInitialProvider] = useState<AiProvider | undefined>(undefined);
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
    const [showNewMenu, setShowNewMenu] = useState(false);
    const [researchProjects, setResearchProjects] = useState<ResearchProject[]>([]);
    const [activeTab, setActiveTab] = useState<'documents' | 'projects'>('documents');
    const newMenuRef = useRef<HTMLDivElement>(null);
    const newBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        loadDocuments();
        loadWares();
        loadResearchProjects();
    }, [userId, incognitoMode]);

    useEffect(() => {
        if (!showNewMenu) return;
        const handle = (e: MouseEvent) => {
            if (
                newMenuRef.current && !newMenuRef.current.contains(e.target as Node) &&
                newBtnRef.current && !newBtnRef.current.contains(e.target as Node)
            ) {
                setShowNewMenu(false);
            }
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [showNewMenu]);

    const loadResearchProjects = async () => {
        if (!userId) return;
        try {
            const projects = await getAllResearchProjectsFromFirestore(userId);
            setResearchProjects(projects);
        } catch { /* non-critical */ }
    };

    const handleDeleteResearchProject = async (projectId: string) => {
        if (!userId) return;
        try {
            await deleteResearchProjectFromFirestore(userId, projectId);
            setResearchProjects(prev => prev.filter(p => p.id !== projectId));
        } catch (e: any) {
            alert('Error deleting research project: ' + e.message);
        }
    };

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
            
            if (userId && !incognitoMode) {
                const updatedDoc = { ...doc, name: newName };
                await saveDocumentToFirestore(userId, updatedDoc);
            } else {
                await updateDocument(doc.id, newName, doc.content);
            }
            await loadDocuments();
            setRenameDialogOpen(false);
            setRenameTarget(null);
        } catch (error) {
            console.error('Error renaming document:', error);
            alert('Failed to rename document');
        }
    };

    const removeDocumentIdsFromAllWares = async (documentIds: string[]) => {
        if (documentIds.length === 0) return;

        const idsToRemove = new Set(documentIds);
        const waresToUpdate = wares.filter(ware => ware.documentIds.some(id => idsToRemove.has(id)));

        await Promise.all(waresToUpdate.map(async (ware) => {
            const nextDocumentIds = ware.documentIds.filter(id => !idsToRemove.has(id));

            if (userId && !incognitoMode) {
                await updateWareInFirestore(userId, ware.id, {
                    documentIds: nextDocumentIds,
                    updatedAt: Date.now()
                });
            } else {
                await updateWare(ware.id, { documentIds: nextDocumentIds });
            }
        }));
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
            await removeDocumentIdsFromAllWares(selectedDocIds);

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
            await loadWares();
        } catch (error) {
            console.error('Error deleting documents:', error);
            alert('Failed to delete documents');
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this document?')) {
            try {
                await removeDocumentIdsFromAllWares([id]);

                if (userId && !incognitoMode) {
                    // Delete from Firestore
                    await deleteDocumentFromFirestore(userId, id);
                } else {
                    // Delete from local storage
                    const { deleteDocument } = await import('../services/documentStorage');
                    await deleteDocument(id);
                }
                loadDocuments();
                loadWares();
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
                <div className="max-w-6xl mx-auto px-6 pt-6 pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="shrink-0 order-1">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 transition-all">
                                {activeTab === 'projects' ? 'My Projects' : 'My Documents'}
                            </h1>
                            <div className="flex items-center gap-3">
                                <p className="text-sm text-gray-600 dark:text-gray-400 transition-all">
                                    {activeTab === 'projects' 
                                        ? `${researchProjects.length} project${researchProjects.length !== 1 ? 's' : ''}`
                                        : <>{filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} {documents.length > filteredDocuments.length ? `(${documents.length - filteredDocuments.length} in WARES)` : ''} {searchQuery ? `(filtered)` : ''}</>
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Middle Area: Search Bar or Selection Actions */}
                        {!selectionMode ? (
                            <div className="relative w-full lg:flex-1 lg:max-w-xl mx-0 lg:mx-4 order-3 lg:order-2">
                                <SearchIcon className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={activeTab === 'projects' ? 'Search projects...' : 'Search documents and folders...'}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-full bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200 text-sm shadow-inner"
                                />
                            </div>
                        ) : (
                            <div className="w-full lg:flex-1 flex items-center gap-2 flex-wrap min-w-0 lg:justify-center order-3 lg:order-2">
                                <button
                                    onClick={() => {
                                        setSelectionMode(false);
                                        setSelectedWareIds([]);
                                        setSelectedDocIds([]);
                                    }}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm font-semibold shrink-0"
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
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all text-sm font-semibold shrink-0"
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
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all text-sm font-semibold shrink-0"
                                        >
                                            Move {selectedDocIds.length} to WARE
                                        </button>
                                        <button
                                            onClick={handleBulkDeleteDocuments}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all text-sm font-semibold shrink-0"
                                        >
                                            Delete {selectedDocIds.length} Docs
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-2 sm:gap-3 shrink-0 order-2 lg:order-3">
                            {!selectionMode && (
                                <button
                                    onClick={() => setSelectionMode(true)}
                                    className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full transition-all duration-200 shrink-0"
                                    title="Select Items"
                                >
                                    <CheckIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                </button>
                            )}

                            {/* Authentication */}
                            {user ? (
                                <>
                                    <UserProfile onOpenProvider={() => setIsProviderOpen(true)} />
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setIsProviderOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-all shrink-0"
                                        title="Provider"
                                    >
                                        <SettingsIcon className="h-5 w-5" />
                                        <span className="hidden sm:inline text-sm font-semibold">Provider</span>
                                    </button>
                                    <button
                                        onClick={() => setIsAuthModalOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-semibold rounded-full shadow-md hover:shadow-lg transition-all duration-200 shrink-0"
                                        title="Sign in to sync documents"
                                    >
                                        <CloudIcon className="h-5 w-5" />
                                        <span className="hidden sm:inline">Sign In</span>
                                    </button>
                                </>
                            )}
                            
                            <div className="relative">
                                <button
                                    ref={newBtnRef}
                                    onClick={() => setShowNewMenu(v => !v)}
                                    className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shrink-0 icon-glossy"
                                    title="Create New"
                                >
                                    <PlusIcon className="h-5 w-5" />
                                </button>
                                {showNewMenu && (
                                    <div
                                        ref={newMenuRef}
                                        className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-fade-in-up origin-top-right"
                                    >
                                        <div className="p-1.5 space-y-0.5">
                                            <button
                                                onClick={() => { setShowNewMenu(false); onCreateNew(); }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left"
                                            >
                                                <DocumentIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Document</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Blank note editor</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => { setShowNewMenu(false); onCreateNewResearch(); }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all text-left"
                                            >
                                                <BeakerIcon className="h-4 w-4 text-violet-500 flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Project</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Research workspace</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => { setShowNewMenu(false); setIsCreateWareModalOpen(true); }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all text-left"
                                            >
                                                <FolderIcon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Folder</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Organize documents</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pill Tab Switcher */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-2 flex-shrink-0 flex justify-center">
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-0.5 gap-0.5 w-full max-w-[320px]">
                    <button
                        onClick={() => setActiveTab('documents')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full text-sm font-semibold transition-all duration-200 ${
                            activeTab === 'documents'
                                ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        <DocumentIcon className="w-4 h-4 shrink-0" />
                        <span>Documents</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('projects')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full text-sm font-semibold transition-all duration-200 ${
                            activeTab === 'projects'
                                ? 'bg-white dark:bg-gray-700 text-violet-700 dark:text-violet-300 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        <BeakerIcon className="w-4 h-4 shrink-0" />
                        <span>Projects</span>
                        {researchProjects.length > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 rounded-full leading-tight ${
                                activeTab === 'projects'
                                    ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                            }`}>
                                {researchProjects.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto max-w-6xl w-full mx-auto px-6 py-8">
                
                {/* -------------------- DOCUMENTS TAB -------------------- */}
                {activeTab === 'documents' && (
                    <div className="animate-fade-in-up">
                        {/* WARES Section */}
                        {filteredWares.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <FolderIcon className="h-5 w-5 text-emerald-500" />
                                WARES {searchQuery && `(${filteredWares.length} matching)`}
                            </h2>
                            <button
                                onClick={() => setIsCreateWareModalOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm font-semibold transition-all"
                            >
                                <PlusIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">New Folder</span>
                            </button>
                        </div>
                        <div className={searchQuery ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
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
                                                    handleOpenWare(ware);
                                                }
                                            }}
                                            className={`group relative flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500/50'
                                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                {selectionMode && (
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                        {isSelected && <CheckIcon className="h-3 w-3 text-white" />}
                                                    </div>
                                                )}
                                                <div 
                                                    className="p-2.5 rounded-lg flex-shrink-0 shadow-sm flex items-center justify-center"
                                                    style={{ backgroundColor: isDark ? colorStyle.iconColorDark : colorStyle.iconColor }}
                                                >
                                                    <FolderIcon className="h-4 w-4 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{ware.name}</h3>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                        <span>{ware.documentIds.length} doc{ware.documentIds.length !== 1 ? 's' : ''}</span>
                                                    </div>
                                                </div>
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
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <DocumentIcon className="h-5 w-5 text-blue-500" />
                            Documents
                        </h2>
                        <button
                            onClick={onCreateNew}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-semibold transition-all"
                        >
                            <PlusIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">New Document</span>
                        </button>
                    </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                    className={`group relative flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                        isSelected
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500/50'
                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
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
                                        <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0 shadow-sm flex items-center justify-center">
                                            <DocumentIcon className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                                                {doc.name}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                <span>{doc.wordCount} words</span>
                                                <span>•</span>
                                                <span>{formatDate(doc.lastModified || doc.updatedAt || 0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {!selectionMode && (
                                        <button
                                            onClick={(e) => handleDelete(doc.id, e)}
                                            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
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
                )}

                {/* -------------------- PROJECTS TAB -------------------- */}
                {activeTab === 'projects' && (
                    <div className="animate-fade-in-up">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <BeakerIcon className="h-5 w-5 text-violet-500" />
                                Projects
                            </h2>
                            <button
                                onClick={onCreateNewResearch}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 hover:bg-violet-200 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded-lg text-sm font-semibold transition-all"
                            >
                                <PlusIcon className="h-4 w-4" />
                                New Project
                            </button>
                        </div>
                        
                        {researchProjects.length === 0 ? (
                            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <div className="text-6xl mb-4 opacity-80">📖</div>
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    No projects yet
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                                    Create a research project to organize references, build a knowledge base, and write with AI assistance.
                                </p>
                                <button
                                    onClick={onCreateNewResearch}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-medium rounded-lg shadow-sm transition-all"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                    Start a Project
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {researchProjects.map(proj => (
                                    <div
                                        key={proj.id}
                                        onClick={() => onOpenResearch && onOpenResearch(proj)}
                                        className="group relative flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-md transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="p-2.5 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex-shrink-0 shadow-sm">
                                                <BeakerIcon className="h-4 w-4 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{proj.meta.projectName}</p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    <span className="truncate max-w-[100px] sm:max-w-[150px]">by {proj.meta.author}</span>
                                                    <span>•</span>
                                                    <span>{proj.resources.length} res</span>
                                                    <span className="hidden sm:inline">•</span>
                                                    <span className="hidden sm:inline">{new Date(proj.updatedAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDeleteResearchProject(proj.id); }}
                                            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 focus:opacity-100"
                                            title="Delete Project"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        
            {/* Auth and Settings Modals */}
            <AuthModal

                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
            />

            <ProviderModal
                isOpen={isProviderOpen}
                onClose={() => setIsProviderOpen(false)}
                onOpenSettings={(provider) => {
                    setIsProviderOpen(false);
                    setSettingsInitialProvider(provider);
                    setIsSettingsOpen(true);
                }}
            />
            
            <SettingsModal
                isOpen={isSettingsOpen}
                initialProvider={settingsInitialProvider}
                onClose={() => {
                    setIsSettingsOpen(false);
                    setSettingsInitialProvider(undefined);
                }}
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
                    onWareUpdated={(updatedWare) => {
                        setSelectedWare(updatedWare);
                        setWares(prev => prev.map(ware => ware.id === updatedWare.id ? updatedWare : ware));
                    }}
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
