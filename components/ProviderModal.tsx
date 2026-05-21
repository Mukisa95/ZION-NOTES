import React, { useEffect, useMemo, useState } from 'react';
import { AiProvider } from '../types';
import { getActiveProvider, getConfiguredProviders, setActiveProvider } from '../services/aiService';
import { CheckIcon, SettingsIcon, XIcon } from './icons';

interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: (provider?: AiProvider) => void;
}

const PROVIDER_LABELS: Record<AiProvider, string> = {
  openrouter: 'OpenRouter',
  gemini: 'Google Gemini',
  nvidia: 'Nvidia',
};

const PROVIDER_DESCRIPTIONS: Record<AiProvider, string> = {
  openrouter: 'Use your saved OpenRouter key and selected model.',
  gemini: 'Use your saved Gemini key.',
  nvidia: 'Use your saved Nvidia key and selected Nvidia model.',
};

export const ProviderModal: React.FC<ProviderModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  const [activeProvider, setActiveProviderState] = useState<AiProvider>('openrouter');

  useEffect(() => {
    if (!isOpen) return;
    setActiveProviderState(getActiveProvider());
  }, [isOpen]);

  const configuredProviders = useMemo(() => getConfiguredProviders(), [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Provider</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Pick any provider that already has the needed key and model saved.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
            aria-label="Close provider modal"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {configuredProviders.length > 0 ? (
            configuredProviders.map(provider => {
              const isActive = provider === activeProvider;
              return (
                <button
                  key={provider}
                  onClick={() => {
                    setActiveProvider(provider);
                    setActiveProviderState(provider);
                    onClose();
                  }}
                  className={`w-full text-left rounded-2xl border px-4 py-4 transition-all duration-200 ${
                    isActive
                      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500'
                      : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {PROVIDER_LABELS[provider]}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {PROVIDER_DESCRIPTIONS[provider]}
                      </div>
                    </div>
                    {isActive && (
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-white shrink-0">
                        <CheckIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 px-4 py-8 text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">No providers are ready yet.</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Open settings to add API keys and choose models first.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-700/50">
          <button
            onClick={() => onOpenSettings(activeProvider)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200"
          >
            <SettingsIcon className="h-4 w-4" />
            <span>Settings</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
