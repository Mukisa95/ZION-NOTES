import React, { useState, useEffect } from 'react';
import { XIcon, PlusIcon, CheckIcon, DocumentIcon } from './icons';
import { SavedDocument, getAllDocuments } from '../services/documentStorage';
import { getAllDocumentsFromFirestore } from '../services/firestoreService';

interface AddDocumentsToWareModalProps {
    isOpen: boolean;
    onClose: () => void;
    wareId: string;
    existingDocumentIds: string[];
    onAddDocuments: (documentIds: string[]) => Promise<void>;
    onCreateDocuments: (names: string[]) => Promise<string[]>; // Returns created document IDs
    userId?: string | null;
    incognitoMode?: boolean;
}

export const AddDocumentsToWareModal: React.FC<AddDocumentsToWareModalProps> = ({
    isOpen,
    onClose,
    wareId,
    existingDocumentIds,
    onAddDocuments,
    onCreateDocuments,
    userId,
    incognitoMode = false
}) => {
    const [mode, setMode] = useState<'select' | 'create'>('select');
    const [documents, setDocuments] = useState<SavedDocument[]>([]);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [newDocumentNames, setNewDocumentNames] = useState<string[]>(['']);
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (isOpen && mode === 'select') {
            loadDocuments();
        }
    }, [isOpen, mode, userId, incognitoMode]);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            let docs: SavedDocument[];
            if (userId && !incognitoMode) {
                docs = await getAllDocumentsFromFirestore(userId);
            } else {
                docs = await getAllDocuments();
            }
            // Filter out documents already in the WARE
            const availableDocs = docs.filter(doc => !existingDocumentIds.includes(doc.id));
            setDocuments(availableDocs);
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

    const handleAddNewDocumentField = () => {
        setNewDocumentNames([...newDocumentNames, '']);
    };

    const handleRemoveDocumentField = (index: number) => {
        setNewDocumentNames(newDocumentNames.filter((_, i) => i !== index));
    };

    const handleDocumentNameChange = (index: number, value: string) => {
        const updated = [...newDocumentNames];
        updated[index] = value;
        setNewDocumentNames(updated);
    };

    const handleSubmit = async () => {
        setIsAdding(true);
        try {
            if (mode === 'select') {
                if (selectedDocIds.length > 0) {
                    await onAddDocuments(selectedDocIds);
                }
            } else {
                const validNames = newDocumentNames.filter(name => name.trim());
                if (validNames.length > 0) {
                    const createdIds = await onCreateDocuments(validNames);
                    await onAddDocuments(createdIds);
                }
            }
            setSelectedDocIds([]);
            setNewDocumentNames(['']);
            setMode('select');
            onClose();
        } catch (error) {
            console.error('Error adding documents:', error);
            alert('Failed to add documents. Please try again.');
        } finally {
            setIsAdding(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" data-modal>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700/50">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Documents to WARE</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setMode('select')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
                            mode === 'select'
                                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                    >
                        Select Existing
                    </button>
                    <button
                        onClick={() => setMode('create')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
                            mode === 'create'
                                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                    >
                        Create New
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {mode === 'select' ? (
                        <div>
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <p className="mt-4 text-gray-500 dark:text-gray-400">Loading documents...</p>
                                </div>
                            ) : documents.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 dark:text-gray-400">No available documents to add</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {documents.map(doc => (
                                        <div
                                            key={doc.id}
                                            onClick={() => handleToggleDocument(doc.id)}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                                selectedDocIds.includes(doc.id)
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                                    selectedDocIds.includes(doc.id)
                                                        ? 'border-blue-500 bg-blue-500'
                                                        : 'border-gray-300 dark:border-gray-600'
                                                }`}>
                                                    {selectedDocIds.includes(doc.id) && (
                                                        <CheckIcon className="h-3 w-3 text-white" />
                                                    )}
                                                </div>
                                                <DocumentIcon className="h-5 w-5 text-gray-400" />
                                                <div className="flex-1">
                                                    <h3 className="font-medium text-gray-900 dark:text-white">{doc.name}</h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{doc.wordCount} words</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Create one or more new documents. Enter a name for each document.
                            </p>
                            {newDocumentNames.map((name, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => handleDocumentNameChange(index, e.target.value)}
                                        placeholder={`Document ${index + 1} name...`}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                                    />
                                    {newDocumentNames.length > 1 && (
                                        <button
                                            onClick={() => handleRemoveDocumentField(index)}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                                        >
                                            <XIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={handleAddNewDocumentField}
                                className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                            >
                                <PlusIcon className="h-5 w-5" />
                                <span>Add Another Document</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                        disabled={isAdding}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isAdding || (mode === 'select' && selectedDocIds.length === 0) || (mode === 'create' && newDocumentNames.filter(n => n.trim()).length === 0)}
                    >
                        {isAdding ? 'Adding...' : mode === 'select' ? `Add ${selectedDocIds.length} Document${selectedDocIds.length !== 1 ? 's' : ''}` : `Create & Add ${newDocumentNames.filter(n => n.trim()).length} Document${newDocumentNames.filter(n => n.trim()).length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

