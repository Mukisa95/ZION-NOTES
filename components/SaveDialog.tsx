import React, { useState } from 'react';
import { XIcon } from './icons';

interface SaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (filename: string, useNativePicker: boolean) => void;
  defaultFilename: string;
  format: string;
}

export const SaveDialog: React.FC<SaveDialogProps> = ({ isOpen, onClose, onSave, defaultFilename, format }) => {
  const [filename, setFilename] = useState(defaultFilename);
  const hasFileSystemAPI = 'showSaveFilePicker' in window;

  if (!isOpen) return null;

  const handleSave = (useNativePicker: boolean) => {
    if (filename.trim()) {
      onSave(filename, useNativePicker);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6" data-modal>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700/50">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Save File</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Choose filename and location</p>
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
              Filename
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave(true);
                }
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200"
              placeholder={`my-document${format}`}
              autoFocus
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              File will be saved as: <span className="font-semibold text-gray-700 dark:text-gray-300">{filename || defaultFilename}</span>
            </p>
          </div>

          {hasFileSystemAPI ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">✅ Advanced save available!</span> Click "Save As..." to choose where to save the file.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">ℹ️ Note:</span> Your browser doesn't support folder selection. Files will be saved to your Downloads folder.
                <br />
                <span className="text-xs mt-1 block">Use Chrome or Edge for location picker feature.</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-100 dark:border-gray-700/50">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-3 sm:py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
          >
            Cancel
          </button>
          {hasFileSystemAPI ? (
            <>
              <button
                onClick={() => handleSave(false)}
                className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 text-sm font-semibold text-white bg-gray-500 rounded-xl hover:bg-gray-600 transition-all duration-200"
                title="Save to Downloads folder"
              >
                Downloads
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={!filename.trim()}
                className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 transition-all duration-200"
                title="Choose location and save"
              >
                📁 Save As...
              </button>
            </>
          ) : (
            <button
              onClick={() => handleSave(false)}
              disabled={!filename.trim()}
              className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 transition-all duration-200"
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

