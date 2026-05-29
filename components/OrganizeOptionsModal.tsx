import React, { useEffect, useState } from 'react';
import { ListIcon, XIcon } from './icons';

export interface OrganizeOptionsPayload {
  additions: string;
  omissions: string;
  groundAdditions: boolean;
  groundOmissions: boolean;
}

interface OrganizeOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (options: OrganizeOptionsPayload) => void;
  contextText?: string;
}

export const OrganizeOptionsModal: React.FC<OrganizeOptionsModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  contextText,
}) => {
  const [additions, setAdditions] = useState('');
  const [omissions, setOmissions] = useState('');
  const [groundAdditions, setGroundAdditions] = useState(false);
  const [groundOmissions, setGroundOmissions] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAdditions('');
    setOmissions('');
    setGroundAdditions(false);
    setGroundOmissions(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      additions: additions.trim(),
      omissions: omissions.trim(),
      groundAdditions,
      groundOmissions,
    });
    onClose();
  };

  return (
    <div data-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 animate-fade-in-fast">
      <div className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <form onSubmit={handleSubmit} className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                <ListIcon className="h-5 w-5 text-blue-500" />
                Organize Selection
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Improve numbering, identify headings, and keep the text structurally cleaner without changing the meaning.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              aria-label="Close organize options"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          {contextText && (
            <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Selected text</p>
              <p className="mt-2 max-h-24 overflow-y-auto text-sm text-gray-700 dark:text-gray-300">
                {contextText}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <details className="group rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40">
              <summary className="cursor-pointer list-none select-none text-sm font-semibold text-gray-800 dark:text-gray-200">
                Additions
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                  Add content or ideas to include while organizing
                </span>
              </summary>
              <div className="mt-4 space-y-3">
                <textarea
                  value={additions}
                  onChange={(e) => setAdditions(e.target.value)}
                  placeholder="Enter anything you want the AI to add while organizing the selected text..."
                  className="min-h-28 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-950/40 dark:text-gray-100"
                />
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={groundAdditions}
                    onChange={(e) => setGroundAdditions(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Ground additions to only what I say here
                </label>
              </div>
            </details>

            <details className="group rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40">
              <summary className="cursor-pointer list-none select-none text-sm font-semibold text-gray-800 dark:text-gray-200">
                Omissions
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                  Leave out content, topics, or details while organizing
                </span>
              </summary>
              <div className="mt-4 space-y-3">
                <textarea
                  value={omissions}
                  onChange={(e) => setOmissions(e.target.value)}
                  placeholder="Enter anything you want the AI to leave out while organizing the selected text..."
                  className="min-h-28 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-950/40 dark:text-gray-100"
                />
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={groundOmissions}
                    onChange={(e) => setGroundOmissions(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Ground omissions to only what I say here
                </label>
              </div>
            </details>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-indigo-500"
            >
              Organize
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
