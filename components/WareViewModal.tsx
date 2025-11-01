import React, { useState, useEffect } from 'react';
import { XIcon, FolderIcon, DocumentIcon, TrashIcon, CheckIcon, PlusIcon } from './icons';
import { SavedDocument, getDocument, deleteDocument } from '../services/documentStorage';
import { getDocumentFromFirestore, deleteDocumentFromFirestore } from '../services/firestoreService';
import { Ware, updateWare } from '../services/wareStorage';
import { updateWareInFirestore } from '../services/wareFirestoreService';

interface WareViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    ware: Ware;
    onOpenDocument: (doc: SavedDocument) => void;
    onOpenDocuments: (docs: SavedDocument[]) => void;
    onDeleteWare: () => Promise<void>;
    userId?: string | null;
    incognitoMode?: boolean;
    onAddDocuments?: () => void;
}

export const WareViewModal: React.FC<WareViewModalProps> = ({
    isOpen,
    onClose,
    ware,
    onOpenDocument,
    onOpenDocuments,
    onDeleteWare,
    userId,
    incognitoMode = false,
    onAddDocuments
}) => {
    const [documents, setDocuments] = useState<SavedDocument[]>([]);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteOptions, setShowDeleteOptions] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadDocuments();
            setSelectedDocIds([]);
        }
    }, [isOpen, ware, userId, incognitoMode]);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const loadedDocs: SavedDocument[] = [];
            
            for (const docId of ware.documentIds) {
                let doc: SavedDocument | null = null;
                if (userId && !incognitoMode) {
                    doc = await getDocumentFromFirestore(userId, docId);
                } else {
                    doc = await getDocument(docId);
                }
                if (doc) {
                    loadedDocs.push(doc);
                }
            }
            
            setDocuments(loadedDocs);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleDocument = (docId: string) => {
        setSelectedDocIds(prev =>
            prev.includes(docId)
                ? prev.filter(id => id !== docId)
                : [...prev, docId]
        );
    };

    const handleOpenOne = (doc: SavedDocument) => {
        onOpenDocument(doc);
        onClose();
    };

    const handleOpenSelected = () => {
        const selectedDocs = documents.filter(doc => selectedDocIds.includes(doc.id));
        if (selectedDocs.length > 0) {
            onOpenDocuments(selectedDocs);
            onClose();
        }
    };

    const handleOpenAll = () => {
        if (documents.length > 0) {
            onOpenDocuments(documents);
            onClose();
        }
    };

    const handleDeleteSelectedDocuments = async () => {
        if (selectedDocIds.length === 0) return;
        
        if (!confirm(`Delete ${selectedDocIds.length} selected document(s)? The documents will be permanently removed.`)) {
            return;
        }

        try {
            // Delete each selected document
            for (const docId of selectedDocIds) {
                if (userId && !incognitoMode) {
                    await deleteDocumentFromFirestore(userId, docId);
                } else {
                    await deleteDocument(docId);
                }
            }

            // Update WARE to remove deleted document IDs
            const updatedDocumentIds = ware.documentIds.filter(id => !selectedDocIds.includes(id));
            if (userId && !incognitoMode) {
                await updateWareInFirestore(userId, ware.id, { documentIds: updatedDocumentIds });
            } else {
                await updateWare(ware.id, { documentIds: updatedDocumentIds });
            }

            // Reload documents
            setSelectedDocIds([]);
            await loadDocuments();
        } catch (error) {
            console.error('Error deleting documents:', error);
            alert('Failed to delete documents');
        }
    };

    const handleDeleteWareOnly = async () => {
        setShowDeleteOptions(false);
        if (!confirm(`Delete WARE "${ware.name}" and keep all documents?`)) {
            return;
        }

        try {
            await onDeleteWare();
            onClose();
        } catch (error) {
            console.error('Error deleting WARE:', error);
            alert('Failed to delete WARE');
        }
    };

    const handleDeleteWareAndDocuments = async () => {
        setShowDeleteOptions(false);
        if (!confirm(`Delete WARE "${ware.name}" AND all ${documents.length} documents inside? This action cannot be undone.`)) {
            return;
        }

        try {
            // Delete all documents
            for (const doc of documents) {
                if (userId && !incognitoMode) {
                    await deleteDocumentFromFirestore(userId, doc.id);
                } else {
                    await deleteDocument(doc.id);
                }
            }

            // Delete the WARE
            await onDeleteWare();
            onClose();
        } catch (error) {
            console.error('Error deleting WARE and documents:', error);
            alert('Failed to delete WARE and documents');
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" 
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
                            <FolderIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">{ware.name}</h2>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {onAddDocuments && (
                            <button
                                onClick={onAddDocuments}
                                className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
                                title="Add documents"
                            >
                                <PlusIcon className="h-5 w-5" />
                            </button>
                        )}
                        <div className="relative">
                            <button
                                onClick={() => setShowDeleteOptions(!showDeleteOptions)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete options"
                            >
                                <TrashIcon className="h-5 w-5" />
                            </button>
                            {showDeleteOptions && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowDeleteOptions(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                                        <button
                                            onClick={handleDeleteWareOnly}
                                            className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
                                        >
                                            <div className="font-semibold text-gray-900 dark:text-white">Delete WARE only</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Keep all documents</div>
                                        </button>
                                        <button
                                            onClick={handleDeleteWareAndDocuments}
                                            className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-b-lg border-t border-gray-200 dark:border-gray-700"
                                        >
                                            <div className="font-semibold text-red-600 dark:text-red-400">Delete WARE & Documents</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Remove everything permanently</div>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                        >
                            <XIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {documents.length > 0 && (
                    <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900/50">
                        <div className="flex items-center gap-2 flex-wrap">
                            {selectedDocIds.length > 0 ? (
                                <>
                                    <button
                                        onClick={handleOpenSelected}
                                        className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all text-xs sm:text-sm"
                                    >
                                        Open Selected ({selectedDocIds.length})
                                    </button>
                                    <button
                                        onClick={handleDeleteSelectedDocuments}
                                        className="px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all text-xs sm:text-sm flex items-center gap-2"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                        Delete Selected
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleOpenAll}
                                    className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all text-xs sm:text-sm"
                                >
                                    Open All ({documents.length})
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading documents...</p>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📂</div>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                No documents in this WARE
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                Add documents to this WARE to get started
                            </p>
                            {onAddDocuments && (
                                <button
                                    onClick={onAddDocuments}
                                    className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all inline-flex items-center justify-center"
                                    title="Add documents"
                                >
                                    <PlusIcon className="h-6 w-6" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {documents.map(doc => (
                                <div
                                    key={doc.id}
                                    className={`p-3 sm:p-4 rounded-lg border transition-all ${
                                        selectedDocIds.includes(doc.id)
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <button
                                            onClick={() => handleToggleDocument(doc.id)}
                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                                selectedDocIds.includes(doc.id)
                                                    ? 'border-blue-500 bg-blue-500'
                                                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                                            }`}
                                        >
                                            {selectedDocIds.includes(doc.id) && (
                                                <CheckIcon className="h-3 w-3 text-white" />
                                            )}
                                        </button>
                                        <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
                                            <DocumentIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm sm:text-base">{doc.name}</h3>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <span>{doc.wordCount}w</span>
                                                <span>•</span>
                                                <span className="hidden sm:inline">{new Date(doc.lastModified || doc.updatedAt).toLocaleDateString()}</span>
                                                <span className="sm:hidden">{new Date(doc.lastModified || doc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleOpenOne(doc)}
                                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all flex-shrink-0"
                                        >
                                            Open
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
