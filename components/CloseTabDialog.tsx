import React from 'react';
import { XIcon, SaveIcon } from './icons';

interface CloseTabDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    onDontSave: () => void;
    documentName: string;
}

export const CloseTabDialog: React.FC<CloseTabDialogProps> = ({
    isOpen,
    onClose,
    onSave,
    onDontSave,
    documentName
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6" data-modal>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700/50">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Unsaved Changes</h2>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Do you want to save changes?</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6">
                    <p className="text-gray-700 dark:text-gray-300">
                        The document "<span className="font-semibold">{documentName}</span>" has unsaved changes.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Would you like to save before closing?
                    </p>
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
                        onClick={onDontSave}
                        className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200"
                    >
                        Don't Save
                    </button>
                    <button
                        onClick={onSave}
                        className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all duration-200 flex items-center justify-center gap-1.5"
                    >
                        <SaveIcon className="h-4 w-4" />
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

