import React, { useEffect, useState } from 'react';
import { XIcon, CheckIcon } from './icons';
import { AiProvider } from '../types';
import { getActiveProvider, setActiveProvider } from '../services/aiService';
import { DEFAULT_NVIDIA_API_KEY, DEFAULT_NVIDIA_MODEL } from '../services/nvidiaService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProvider?: AiProvider;
}

const OPENROUTER_POPULAR_MODELS = [
  { id: 'qwen/qwen3.6-plus:free', label: 'Qwen 3.6 Plus (Free) *' },
  { id: 'qwen/qwq-32b:free', label: 'Qwen QwQ 32B (Free)' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (Free)' },
  { id: 'meta-llama/llama-4-scout:free', label: 'Llama 4 Scout (Free)' },
  { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B (Free)' },
  { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (Free)' },
  { id: 'deepseek/deepseek-chat:free', label: 'DeepSeek V3 (Free)' },
  { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B (Free)' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
  { id: 'anthropic/claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
  { id: 'custom', label: 'Custom model ID...' },
];

const DEFAULT_OPENROUTER_MODEL = 'qwen/qwen3.6-plus:free';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialProvider }) => {
  const [provider, setProvider] = useState<AiProvider>(initialProvider ?? 'openrouter');
  const [saved, setSaved] = useState(false);

  const [orKey, setOrKey] = useState('');
  const [orModelSelection, setOrModelSelection] = useState(DEFAULT_OPENROUTER_MODEL);
  const [orCustomModel, setOrCustomModel] = useState('');
  const [showOrKey, setShowOrKey] = useState(false);

  const [geminiKey, setGeminiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  const [nvidiaKey, setNvidiaKey] = useState(DEFAULT_NVIDIA_API_KEY);
  const [nvidiaModel, setNvidiaModel] = useState(DEFAULT_NVIDIA_MODEL);
  const [showNvidiaKey, setShowNvidiaKey] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setProvider(initialProvider ?? getActiveProvider());
    setSaved(false);

    setOrKey(localStorage.getItem('openrouter_api_key') ?? '');
    const storedModel = localStorage.getItem('openrouter_model') ?? DEFAULT_OPENROUTER_MODEL;
    const isKnown = OPENROUTER_POPULAR_MODELS.some(m => m.id !== 'custom' && m.id === storedModel);
    if (isKnown) {
      setOrModelSelection(storedModel);
      setOrCustomModel('');
    } else {
      setOrModelSelection('custom');
      setOrCustomModel(storedModel);
    }

    setGeminiKey(localStorage.getItem('gemini_api_key') ?? '');
    setNvidiaKey(localStorage.getItem('nvidia_api_key') ?? DEFAULT_NVIDIA_API_KEY);
    setNvidiaModel(localStorage.getItem('nvidia_model') ?? DEFAULT_NVIDIA_MODEL);
  }, [isOpen, initialProvider]);

  const getEffectiveOpenRouterModel = () =>
    orModelSelection === 'custom' ? orCustomModel.trim() : orModelSelection;

  const handleSave = () => {
    if (provider === 'openrouter') {
      const modelToSave = getEffectiveOpenRouterModel() || DEFAULT_OPENROUTER_MODEL;
      localStorage.setItem('openrouter_api_key', orKey.trim());
      localStorage.setItem('openrouter_model', modelToSave);
    } else if (provider === 'nvidia') {
      localStorage.setItem('nvidia_api_key', nvidiaKey.trim() || DEFAULT_NVIDIA_API_KEY);
      localStorage.setItem('nvidia_model', (nvidiaModel.trim() || DEFAULT_NVIDIA_MODEL).replace(/:free$/i, ''));
    } else if (geminiKey.trim()) {
      localStorage.setItem('gemini_api_key', geminiKey.trim());
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1500);
  };

  const handleClearAll = () => {
    localStorage.removeItem('openrouter_api_key');
    localStorage.removeItem('openrouter_model');
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('nvidia_api_key');
    localStorage.removeItem('nvidia_model');

    setOrKey('');
    setOrModelSelection(DEFAULT_OPENROUTER_MODEL);
    setOrCustomModel('');
    setGeminiKey('');
    setNvidiaKey(DEFAULT_NVIDIA_API_KEY);
    setNvidiaModel(DEFAULT_NVIDIA_MODEL);
    setSaved(false);
  };

  if (!isOpen) return null;

  const isOpenRouter = provider === 'openrouter';
  const isGemini = provider === 'gemini';
  const isNvidia = provider === 'nvidia';

  const canSave = isOpenRouter
    ? !!orKey.trim()
    : isGemini
      ? !!geminiKey.trim()
      : !!nvidiaKey.trim() && !!nvidiaModel.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6" data-modal>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700/50">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Configure your AI provider</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">This screen manages API keys and models. Active provider selection now lives in the Provider popup.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
            aria-label="Close settings"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              AI Provider
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
              {(['openrouter', 'gemini', 'nvidia'] as AiProvider[]).map(p => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    provider === p
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {p === 'openrouter' ? 'OpenRouter' : p === 'gemini' ? 'Gemini' : 'Nvidia'}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {isOpenRouter
                ? 'Access hundreds of models through OpenRouter, including many free tiers.'
                : isGemini
                  ? "Use Google's Gemini models directly via Google AI Studio."
                  : "Use Nvidia's inference API through its OpenAI-compatible chat completions endpoint."}
            </p>
          </div>

          {isOpenRouter && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  OpenRouter API Key
                </label>
                <div className="relative">
                  <input
                    id="or-api-key"
                    type={showOrKey ? 'text' : 'password'}
                    value={orKey}
                    onChange={e => setOrKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full px-4 py-3 pr-20 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOrKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded-lg transition-colors"
                  >
                    {showOrKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Get your free key at{' '}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    openrouter.ai/keys
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Model
                </label>
                <select
                  id="or-model-select"
                  value={orModelSelection}
                  onChange={e => setOrModelSelection(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 appearance-none cursor-pointer"
                >
                  {OPENROUTER_POPULAR_MODELS.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>

                {orModelSelection === 'custom' && (
                  <input
                    id="or-model-custom"
                    type="text"
                    value={orCustomModel}
                    onChange={e => setOrCustomModel(e.target.value)}
                    placeholder="e.g. anthropic/claude-3-haiku"
                    className="mt-2 w-full px-4 py-3 border-2 border-indigo-300 dark:border-indigo-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition-all duration-200"
                  />
                )}

                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Browse all models at{' '}
                  <a
                    href="https://openrouter.ai/models"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    openrouter.ai/models
                  </a>
                </p>
              </div>
            </div>
          )}

          {isGemini && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Google Gemini API Key
              </label>
              <div className="relative">
                <input
                  id="gemini-api-key"
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="Enter your Gemini API key"
                  className="w-full px-4 py-3 pr-20 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded-lg transition-colors"
                >
                  {showGeminiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Get your key at{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Google AI Studio
                </a>
              </p>
            </div>
          )}

          {isNvidia && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nvidia API Key
                </label>
                <div className="relative">
                  <input
                    id="nvidia-api-key"
                    type={showNvidiaKey ? 'text' : 'password'}
                    value={nvidiaKey}
                    onChange={e => setNvidiaKey(e.target.value)}
                    placeholder="nvapi-..."
                    className="w-full px-4 py-3 pr-20 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-green-500 dark:focus:border-green-400 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNvidiaKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded-lg transition-colors"
                  >
                    {showNvidiaKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Prefilled with the default Nvidia key you requested. You can replace it here any time.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nvidia Model
                </label>
                <input
                  id="nvidia-model"
                  type="text"
                  value={nvidiaModel}
                  onChange={e => setNvidiaModel(e.target.value)}
                  placeholder={DEFAULT_NVIDIA_MODEL}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-green-500 dark:focus:border-green-400 transition-all duration-200"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Endpoint: https://integrate.api.nvidia.com/v1. Nvidia expects the raw model ID, so any trailing `:free` is removed automatically.
                </p>
              </div>
            </div>
          )}

          {saved && (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 rounded-xl">
              <CheckIcon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-semibold">Settings saved!</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-5 sm:p-6 border-t border-gray-100 dark:border-gray-700/50">
          <button
            onClick={handleClearAll}
            className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 transition-all duration-200"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
