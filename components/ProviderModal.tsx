import React, { useEffect, useMemo, useState } from 'react';
import { AiProvider } from '../types';
import {
  getActiveProvider,
  getConfiguredProviders,
  setActiveProvider,
} from '../services/aiService';
import { getChainPreview, getLastRoutedVia } from '../services/autoRouterService';
import { ALL_PROVIDERS } from '../services/providerRegistry';
import { CheckIcon, SettingsIcon, XIcon } from './icons';

interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: (provider?: AiProvider) => void;
}

// ─── Provider display metadata ─────────────────────────────────────────────────

const getLabel = (id: AiProvider): string => {
  if (id === 'auto') return '⚡ Auto Router';
  return ALL_PROVIDERS.find(p => p.id === id)?.label ?? id;
};

const getDescription = (id: AiProvider, chainPreview: string, lastRouted: string | null): string => {
  if (id === 'auto') {
    const routed = lastRouted ? ` Last: ${lastRouted}.` : '';
    return `Automatic fallback chain.${routed} Chain: ${chainPreview}`;
  }
  return ALL_PROVIDERS.find(p => p.id === id)?.description ?? '';
};

const getBadgeColor = (id: AiProvider): string => {
  if (id === 'auto')       return 'bg-gradient-to-r from-indigo-500 to-purple-600';
  if (id === 'gemini')     return 'bg-blue-500';
  if (id === 'openrouter') return 'bg-violet-500';
  if (id === 'nvidia')     return 'bg-green-500';
  if (id === 'groq')       return 'bg-orange-500';
  if (id === 'cerebras')   return 'bg-red-500';
  if (id === 'sambanova')  return 'bg-teal-500';
  if (id === 'mistral')    return 'bg-sky-500';
  if (id === 'github')     return 'bg-gray-700';
  if (id === 'huggingface')return 'bg-yellow-500';
  if (id === 'cloudflare') return 'bg-orange-400';
  if (id === 'cohere')     return 'bg-pink-500';
  return 'bg-gray-400';
};

// ─── Component ─────────────────────────────────────────────────────────────────

export const ProviderModal: React.FC<ProviderModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  const [activeProvider, setActiveProviderState] = useState<AiProvider>('openrouter');
  const [chainPreview, setChainPreview] = useState('');
  const [lastRouted, setLastRouted] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setActiveProviderState(getActiveProvider());
    setChainPreview(getChainPreview());
    setLastRouted(getLastRoutedVia());
  }, [isOpen]);

  const configuredProviders = useMemo(() => getConfiguredProviders(), [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (provider: AiProvider) => {
    setActiveProvider(provider);
    setActiveProviderState(provider);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Provider</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Choose which provider handles your requests
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            aria-label="Close provider modal"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Provider list */}
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {configuredProviders.length > 0 ? (
            configuredProviders.map(provider => {
              const isActive = provider === activeProvider;
              const description = getDescription(provider, chainPreview, lastRouted);
              return (
                <button
                  key={provider}
                  onClick={() => handleSelect(provider)}
                  className={`w-full text-left rounded-2xl border px-4 py-3.5 transition-all duration-200 ${
                    isActive
                      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500'
                      : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Color dot */}
                      <span className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${getBadgeColor(provider)}`} />
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {getLabel(provider)}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          {description}
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-white flex-shrink-0 mt-0.5">
                        <CheckIcon className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 px-4 py-10 text-center">
              <p className="text-2xl mb-2">🔑</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">No providers configured yet</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Open Settings to add an API key for any provider.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-700/50">
          <button
            onClick={() => onOpenSettings(activeProvider)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
          >
            <SettingsIcon className="h-4 w-4" />
            <span>Configure Providers</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
