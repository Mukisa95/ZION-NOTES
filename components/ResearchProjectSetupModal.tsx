import React, { useState } from 'react';
import { XIcon } from './icons';
import { ResearchProjectMeta } from '../types';

interface ResearchProjectSetupModalProps {
  onConfirm: (meta: ResearchProjectMeta) => void;
  onCancel: () => void;
}

export const ResearchProjectSetupModal: React.FC<ResearchProjectSetupModalProps> = ({
  onConfirm,
  onCancel,
}) => {
  const [projectName, setProjectName] = useState('');
  const [author, setAuthor] = useState('');
  const [errors, setErrors] = useState<{ projectName?: string; author?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!projectName.trim()) e.projectName = 'Project name is required';
    if (!author.trim()) e.author = 'Author name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onConfirm({ projectName: projectName.trim(), author: author.trim() });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient top bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md">
              {/* Beaker SVG inline */}
              <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 0 1 .45 1.318 2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 16.318a2.25 2.25 0 0 1 .45-1.318L9 8.5M14.25 3h-4.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Research Project</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Set up your research workspace</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Project Name <span className="text-violet-500">*</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="e.g. Photosynthesis in C4 Plants"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                errors.projectName
                  ? 'border-red-400'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              autoFocus
            />
            {errors.projectName && (
              <p className="text-xs text-red-500 mt-1">{errors.projectName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Author <span className="text-violet-500">*</span>
            </label>
            <input
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="Your name"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                errors.author
                  ? 'border-red-400'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.author && (
              <p className="text-xs text-red-500 mt-1">{errors.author}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
