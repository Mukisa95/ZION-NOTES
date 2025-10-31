import React, { useState, useEffect } from 'react';
import { XIcon, CheckIcon } from './icons';

interface SaveDocumentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    currentDocumentName?: string;
    userId?: string | null;
    incognitoMode?: boolean;
}

export const SaveDocumentDialog: React.FC<SaveDocumentDialogProps> = ({ 
    isOpen, 
    onClose, 
    onSave,
    currentDocumentName,
    userId,
    incognitoMode = false
}) => {
    const [documentName, setDocumentName] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (currentDocumentName) {
                setDocumentName(currentDocumentName);
            } else {
                const now = new Date();
                const defaultName = `Note ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                setDocumentName(defaultName);
            }
        }
    }, [isOpen, currentDocumentName]);

    const handleSave = () => {
        if (documentName.trim()) {
            onSave(documentName.trim());
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6" data-modal>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700/50">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                            {currentDocumentName ? 'Save Changes' : 'Save Document'}
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {userId && !incognitoMode ? 'Save your work to the cloud' : 'Save your work locally in the app'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Document Name
                        </label>
                        <input
                            type="text"
                            value={documentName}
                            onChange={(e) => setDocumentName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSave();
                                }
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200"
                            placeholder="e.g., My Essay, Meeting Notes..."
                            autoFocus
                        />
                    </div>

                    {userId && !incognitoMode ? (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-semibold">☁️ Cloud Storage:</span> Your document will be saved to the cloud and synced across all your devices. You can access it anytime from the Documents library.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-semibold">💾 Local Storage:</span> Your document will be saved in your browser's local storage. You can access it anytime from the Documents library.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-100 dark:border-gray-700/50">
                    <button
                        onClick={onClose}
                        className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!documentName.trim()}
                        className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 transition-all duration-200"
                    >
                        💾 Save
                    </button>
                </div>
            </div>
        </div>
    );
};

