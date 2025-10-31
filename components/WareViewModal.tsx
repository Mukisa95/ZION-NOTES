import React, { useState, useEffect } from 'react';
import { XIcon, FolderIcon, DocumentIcon, TrashIcon, CheckIcon } from './icons';
import { SavedDocument, getAllDocuments, getDocument } from '../services/documentStorage';
import { getAllDocumentsFromFirestore, getDocumentFromFirestore, deleteDocumentFromFirestore } from '../services/firestoreService';
import { Ware } from '../services/wareStorage';

interface WareViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    ware: Ware;
    onOpenDocument: (doc: SavedDocument) => void;
    onOpenDocuments: (docs: SavedDocument[]) => void;
    onDeleteWare: () => Promise<void>;
    userId?: string | null;
    incognitoMode?: boolean;
}

export const WareViewModal: React.FC<WareViewModalProps> = ({
    isOpen,
    onClose,
    ware,
    onOpenDocument,
    onOpenDocuments,
    onDeleteWare,
    userId,
    incognitoMode = false
}) => {
    const [documents, setDocuments] = useState<SavedDocument[]>([]);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadDocuments();
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

    const handleDelete = async () => {
        if (confirm(`Are you sure you want to delete the WARE "${ware.name}"? This will not delete the documents, only remove them from the WARE.`)) {
            try {
                await onDeleteWare();
                onClose();
            } catch (error) {
                console.error('Error deleting WARE:', error);
                alert('Failed to delete WARE');
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" data-modal>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                            <FolderIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{ware.name}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDelete}
                            className="p-2 rounded-xl text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                            title="Delete WARE"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                        >
                            <XIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="p-4 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-2">
                        {selectedDocIds.length > 0 && (
                            <button
                                onClick={handleOpenSelected}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all"
                            >
                                Open Selected ({selectedDocIds.length})
                            </button>
                        )}
                        {documents.length > 0 && (
                            <button
                                onClick={handleOpenAll}
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all"
                            >
                                Open All ({documents.length})
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
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
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Add documents to this WARE to get started
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {documents.map(doc => (
                                <div
                                    key={doc.id}
                                    className={`p-4 rounded-lg border transition-all ${
                                        selectedDocIds.includes(doc.id)
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleToggleDocument(doc.id)}
                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                                selectedDocIds.includes(doc.id)
                                                    ? 'border-blue-500 bg-blue-500'
                                                    : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                        >
                                            {selectedDocIds.includes(doc.id) && (
                                                <CheckIcon className="h-3 w-3 text-white" />
                                            )}
                                        </button>
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
                                            <DocumentIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{doc.name}</h3>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <span>{doc.wordCount} words</span>
                                                <span>•</span>
                                                <span>{new Date(doc.lastModified || doc.updatedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleOpenOne(doc)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all"
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

