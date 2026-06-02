import React, { useEffect, useState } from 'react';
import { XIcon, CheckIcon } from './icons';
import { AiProvider, AutoRouteModelEntry } from '../types';
import { getActiveProvider, setActiveProvider } from '../services/aiService';
import { ALL_PROVIDERS, DEFAULT_FALLBACK_CHAIN, ProviderMeta } from '../services/providerRegistry';
import { getFallbackChain, setFallbackChain } from '../services/autoRouterService';
import { DEFAULT_NVIDIA_API_KEY, DEFAULT_NVIDIA_MODEL } from '../services/nvidiaService';
import { fetchAvailableModels, CURATED_MODELS } from '../services/modelFetchingService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProvider?: AiProvider;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Collect every localStorage key we manage */
const ALL_STORAGE_KEYS = (): string[] => {
  const keys: string[] = [];
  for (const p of ALL_PROVIDERS) {
    if (p.id === 'auto') continue;
    keys.push(p.apiKeyStorageKey);
    if (p.modelStorageKey) keys.push(p.modelStorageKey);
  }
  keys.push('cloudflare_account_id');
  keys.push('auto_fallback_chain');
  keys.push(AUTO_SORT_KEY);
  return keys;
};

const loadAllConfigs = (): Record<string, string> => {
  const configs: Record<string, string> = {};
  for (const key of ALL_STORAGE_KEYS()) {
    configs[key] = localStorage.getItem(key) ?? '';
  }
  // Inject defaults for nvidia if empty
  if (!configs['nvidia_api_key']) configs['nvidia_api_key'] = DEFAULT_NVIDIA_API_KEY;
  if (!configs['nvidia_model'])   configs['nvidia_model']   = DEFAULT_NVIDIA_MODEL;
  return configs;
};

const isProviderReady = (id: AiProvider, configs: Record<string, string>): boolean => {
  if (id === 'auto') return false;
  if (id === 'gemini') return !!(configs['gemini_api_key'] ?? '').trim();

  const meta = ALL_PROVIDERS.find(p => p.id === id);
  if (!meta) return false;

  const key = (configs[meta.apiKeyStorageKey] ?? '').trim();
  if (!key) return false;

  if (meta.id === 'cloudflare' && !(configs['cloudflare_account_id'] ?? '').trim()) return false;

  if (meta.modelStorageKey) {
    const model = (configs[meta.modelStorageKey] ?? meta.defaultModel).trim();
    if (!model) return false;
  }

  return true;
};

const GEMINI_AUTO_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'];
type AutoSortMode = 'intelligence' | 'speed' | 'budget';
const AUTO_SORT_KEY = 'auto_fallback_sort';

const getModelOptionsForProvider = (
  provider: Exclude<AiProvider, 'auto' | 'gemini'>,
  modelsMap: Record<string, string[]>
): string[] => {
  const dynamic = modelsMap[provider] ?? [];
  const curated = CURATED_MODELS[provider] ?? [];
  return Array.from(new Set([...dynamic, ...curated]));
};

const modelEntryKey = (entry: Pick<AutoRouteModelEntry, 'provider' | 'model'>) =>
  `${entry.provider}::${entry.model}`.toLowerCase();

const scoreModel = (model: string, mode: AutoSortMode): number => {
  const m = model.toLowerCase();
  const has = (token: string) => m.includes(token);
  const billionMatch = m.match(/(\d+)\s*b/);
  const billions = billionMatch ? Number(billionMatch[1]) : 0;

  if (mode === 'intelligence') {
    let score = billions;
    if (has('pro')) score += 40;
    if (has('reason') || has('thinking') || has('r1')) score += 35;
    if (has('480b') || has('405b') || has('120b')) score += 50;
    if (has('coder')) score += 20;
    if (has('flash-lite') || has('mini')) score -= 20;
    return score;
  }

  if (mode === 'speed') {
    let score = 0;
    if (has('flash') || has('instant') || has('turbo') || has('fast')) score += 60;
    if (has('mini') || has('small') || has('lite') || has('8b') || has('7b')) score += 30;
    if (has('pro') || has('thinking') || has('reason') || has('120b') || has('405b') || has('480b')) score -= 25;
    score -= Math.floor(billions / 10);
    return score;
  }

  // budget
  let score = 0;
  if (has(':free') || has('(free)') || has('free')) score += 80;
  if (has('mini') || has('small') || has('lite') || has('8b') || has('7b')) score += 25;
  if (has('pro') || has('120b') || has('405b') || has('480b')) score -= 35;
  score -= Math.floor(billions / 8);
  return score;
};

const sortAutoChain = (entries: AutoRouteModelEntry[], mode: AutoSortMode): AutoRouteModelEntry[] =>
  [...entries].sort((a, b) => {
    const diff = scoreModel(b.model, mode) - scoreModel(a.model, mode);
    if (diff !== 0) return diff;
    const providerDiff = a.provider.localeCompare(b.provider);
    if (providerDiff !== 0) return providerDiff;
    return a.model.localeCompare(b.model);
  });

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusDot: React.FC<{ ready: boolean }> = ({ ready }) => (
  <span
    className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
      ready ? 'bg-emerald-400' : 'bg-gray-300 dark:bg-gray-600'
    }`}
  />
);

const Badge: React.FC<{ tier: 'free' | 'paid' | 'free+paid' }> = ({ tier }) => {
  const cls =
    tier === 'free'
      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      : tier === 'paid'
      ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
  const label = tier === 'free' ? 'Free' : tier === 'paid' ? 'Paid' : 'Free + Paid';
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialProvider }) => {
  const [selectedPanel, setSelectedPanel] = useState<AiProvider | 'auto'>('auto');
  const [configs, setConfigs]             = useState<Record<string, string>>({});
  const [showKeys, setShowKeys]           = useState<Record<string, boolean>>({});
  const [autoChain, setAutoChainState]    = useState<AutoRouteModelEntry[]>([]);
  const [saved, setSaved]                 = useState(false);
  const [modelsMap, setModelsMap]         = useState<Record<string, string[]>>({});
  const [loadingMap, setLoadingMap]       = useState<Record<string, boolean>>({});
  const [autoSortMode, setAutoSortMode]   = useState<AutoSortMode>('intelligence');

  // ── Load on open ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const loaded = loadAllConfigs();
    setConfigs(loaded);
    setShowKeys({});
    setSaved(false);

    // Restore auto chain and sort mode
    setAutoChainState(getFallbackChain());
    const storedSort = (localStorage.getItem(AUTO_SORT_KEY) ?? 'intelligence') as AutoSortMode;
    setAutoSortMode(['intelligence', 'speed', 'budget'].includes(storedSort) ? storedSort : 'intelligence');

    // Initial panel
    const active = initialProvider ?? getActiveProvider();
    setSelectedPanel(active === 'auto' ? 'auto' : active);
  }, [isOpen, initialProvider]);

  // ── Dynamic Model fetching effect ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (selectedPanel === 'auto' || selectedPanel === 'gemini') return;

    const meta = ALL_PROVIDERS.find(p => p.id === selectedPanel);
    if (!meta || !meta.modelStorageKey) return;

    const apiKey = (configs[meta.apiKeyStorageKey] ?? '').trim();
    const cloudflareAccountId = selectedPanel === 'cloudflare' ? (configs['cloudflare_account_id'] ?? '').trim() : undefined;

    if (!apiKey) {
      setModelsMap(prev => {
        const next = { ...prev };
        delete next[selectedPanel];
        return next;
      });
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingMap(prev => ({ ...prev, [selectedPanel]: true }));
      try {
        const fetched = await fetchAvailableModels(
          selectedPanel as Exclude<AiProvider, 'auto' | 'gemini'>,
          apiKey,
          { cloudflareAccountId }
        );
        setModelsMap(prev => ({ ...prev, [selectedPanel]: fetched }));

        const currentModel = (configs[meta.modelStorageKey!] ?? '').trim();
        if (!currentModel && fetched.length > 0) {
          setConfig(meta.modelStorageKey!, fetched[0]);
        }
      } catch (err) {
        console.error(`Failed fetching models for ${selectedPanel}:`, err);
      } finally {
        setLoadingMap(prev => ({ ...prev, [selectedPanel]: false }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedPanel, configs[ALL_PROVIDERS.find(p => p.id === selectedPanel)?.apiKeyStorageKey ?? ''], configs['cloudflare_account_id'], isOpen]);

  // ── Config helpers ──────────────────────────────────────────────────────────
  const setConfig = (key: string, value: string) =>
    setConfigs(prev => ({ ...prev, [key]: value }));

  const toggleShow = (key: string) =>
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));

  const configuredAutoProviders = ALL_PROVIDERS
    .filter((p): p is ProviderMeta & { id: Exclude<AiProvider, 'auto'> } => p.id !== 'auto')
    .filter((p) => isProviderReady(p.id, configs));

  // ── Auto model catalog for auto panel ───────────────────────────────────────
  useEffect(() => {
    if (!isOpen || selectedPanel !== 'auto') return;
    const fetchForProviders = async () => {
      const toFetch = configuredAutoProviders.filter(p => p.id !== 'gemini');
      if (toFetch.length === 0) {
        setAutoChainState([]);
        return;
      }

      setLoadingMap(prev => {
        const next = { ...prev };
        for (const p of toFetch) next[p.id] = true;
        return next;
      });

      const updates: Record<string, string[]> = {};
      await Promise.all(
        toFetch.map(async (p) => {
          try {
            const models = await fetchAvailableModels(
              p.id as Exclude<AiProvider, 'auto' | 'gemini'>,
              (configs[p.apiKeyStorageKey] ?? '').trim(),
              { cloudflareAccountId: (configs['cloudflare_account_id'] ?? '').trim() || undefined }
            );
            updates[p.id] = models;
          } catch {
            updates[p.id] = CURATED_MODELS[p.id as Exclude<AiProvider, 'auto' | 'gemini'>] ?? [];
          }
        })
      );

      setModelsMap(prev => {
        const merged = { ...prev, ...updates };
        setAutoChainState(current => {
          const previousEnabled = new Map(
            current.map(entry => [modelEntryKey(entry), entry.enabled])
          );
          const entries: AutoRouteModelEntry[] = [];
          for (const provider of configuredAutoProviders) {
            const models =
              provider.id === 'gemini'
                ? GEMINI_AUTO_MODELS
                : getModelOptionsForProvider(provider.id as Exclude<AiProvider, 'auto' | 'gemini'>, merged);
            for (const model of models) {
              const normalizedModel = model.trim();
              if (!normalizedModel) continue;
              const key = modelEntryKey({ provider: provider.id, model: normalizedModel });
              entries.push({
                provider: provider.id,
                model: normalizedModel,
                enabled: previousEnabled.get(key) ?? true,
              });
            }
          }
          return sortAutoChain(entries, autoSortMode);
        });
        return merged;
      });

      setLoadingMap(prev => {
        const next = { ...prev };
        for (const p of toFetch) next[p.id] = false;
        return next;
      });
    };

    fetchForProviders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedPanel, autoSortMode, configs['gemini_api_key'], configs['openrouter_api_key'], configs['nvidia_api_key'], configs['groq_api_key'], configs['cerebras_api_key'], configs['sambanova_api_key'], configs['mistral_api_key'], configs['github_api_key'], configs['huggingface_api_key'], configs['cloudflare_api_key'], configs['cohere_api_key'], configs['cloudflare_account_id']]);

  if (!isOpen) return null;

  const handleSortAutoChain = (mode: AutoSortMode) => {
    setAutoSortMode(mode);
    localStorage.setItem(AUTO_SORT_KEY, mode);
    setAutoChainState(prev => sortAutoChain(prev, mode));
  };

  // ── Chain reorder ───────────────────────────────────────────────────────────
  const moveChainItem = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= autoChain.length) return;
    const next = [...autoChain];
    [next[index], next[target]] = [next[target], next[index]];
    setAutoChainState(next);
  };

  const updateChainItem = (index: number, patch: Partial<AutoRouteModelEntry>) => {
    setAutoChainState(prev =>
      prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
    );
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = () => {
    // Inject default models for active configurations if model key is blank
    const nextConfigs = { ...configs };
    for (const p of ALL_PROVIDERS) {
      if (p.id === 'auto') continue;
      const key = (nextConfigs[p.apiKeyStorageKey] ?? '').trim();
      if (key && p.modelStorageKey) {
        const currentModel = (nextConfigs[p.modelStorageKey] ?? '').trim();
        if (!currentModel) {
          nextConfigs[p.modelStorageKey] = p.defaultModel;
        }
      }
    }

    // Persist all configurations
    for (const [key, value] of Object.entries(nextConfigs)) {
      const trimmed = value.trim();
      if (trimmed) {
        localStorage.setItem(key, trimmed);
      } else {
        localStorage.removeItem(key);
      }
    }

    // Auto chain
    setFallbackChain(autoChain);

    // Active provider
    setActiveProvider(selectedPanel as AiProvider);

    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1400);
  };

  // ── Clear all ───────────────────────────────────────────────────────────────
  const handleClearAll = () => {
    for (const key of ALL_STORAGE_KEYS()) localStorage.removeItem(key);
    setConfigs(loadAllConfigs());
    setModelsMap({});
    setAutoChainState(
      DEFAULT_FALLBACK_CHAIN
        .filter((id): id is Exclude<AiProvider, 'auto'> => id !== 'auto')
        .map(id => {
          const meta = ALL_PROVIDERS.find(p => p.id === id)!;
          return { provider: id, model: meta.defaultModel, enabled: true };
        })
    );
    setSaved(false);
  };

  // ── Sidebar providers list (all except 'auto') ──────────────────────────────
  const sidebarProviders = ALL_PROVIDERS.filter(p => p.id !== 'auto');

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" data-modal>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700/50 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Configure AI providers · Select one to set as active
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all" aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body: sidebar + panel */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left Sidebar */}
          <div className="w-48 flex-shrink-0 border-r border-gray-100 dark:border-gray-700/50 overflow-y-auto">
            {/* Auto entry */}
            <button
              onClick={() => setSelectedPanel('auto')}
              className={`w-full text-left px-3 py-3 flex items-center gap-2.5 transition-all border-l-2 ${
                selectedPanel === 'auto'
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/40'
              }`}
            >
              <span className="text-base">⚡</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Auto Router</span>
            </button>

            <div className="px-3 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Providers
              </p>
            </div>

            {sidebarProviders.map(meta => {
              const ready = isProviderReady(meta.id, configs);
              const active = selectedPanel === meta.id;
              return (
                <button
                  key={meta.id}
                  onClick={() => setSelectedPanel(meta.id)}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-all border-l-2 ${
                    active
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/40'
                  }`}
                >
                  <StatusDot ready={ready} />
                  <span className={`text-sm truncate ${active ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Panel */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* ── AUTO PANEL ── */}
            {selectedPanel === 'auto' && (
              <AutoPanel
                configs={configs}
                autoChain={autoChain}
                autoSortMode={autoSortMode}
                onMoveChain={moveChainItem}
                onSort={handleSortAutoChain}
                onUpdateChainItem={updateChainItem}
              />
            )}

            {/* ── GEMINI PANEL (Special case: no model key in registry) ── */}
            {selectedPanel === 'gemini' && (
              <ProviderPanel
                meta={ALL_PROVIDERS.find(p => p.id === 'gemini')!}
                configs={configs}
                showKeys={showKeys}
                onConfig={setConfig}
                onToggleShow={toggleShow}
                noModel
              />
            )}

            {/* ── ALL OTHER PROVIDERS (Unified with dynamic model fetching!) ── */}
            {!['auto', 'gemini'].includes(selectedPanel as string) && (() => {
              const meta = ALL_PROVIDERS.find(p => p.id === selectedPanel);
              if (!meta) return null;
              return (
                <ProviderPanel
                  meta={meta}
                  configs={configs}
                  showKeys={showKeys}
                  onConfig={setConfig}
                  onToggleShow={toggleShow}
                  noModel={false}
                  models={modelsMap[selectedPanel]}
                  loading={loadingMap[selectedPanel]}
                  extraFields={
                    meta.id === 'cloudflare' ? (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Cloudflare Account ID
                        </label>
                        <input
                          type="text"
                          value={configs['cloudflare_account_id'] ?? ''}
                          onChange={e => setConfig('cloudflare_account_id', e.target.value)}
                          placeholder="e.g. a1b2c3d4e5f6..."
                          className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition-all"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Found in your Cloudflare dashboard under Workers &amp; AI.
                        </p>
                      </div>
                    ) : undefined
                  }
                />
              );
            })()}

            {/* Saved confirmation */}
            {saved && (
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 rounded-xl">
                <CheckIcon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-semibold">Settings saved! Provider set to <strong>{selectedPanel}</strong>.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700/50 flex-shrink-0">
          <button
            onClick={handleClearAll}
            className="sm:flex-none px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
          >
            Clear All Keys
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 transition-all"
          >
            Save &amp; Apply
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Provider Badge Helper ───────────────────────────────────────────────────

const getProviderBadge = (id: AiProvider): { label: string; cls: string } => {
  if (id === 'gemini')     return { label: 'GEM', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' };
  if (id === 'openrouter') return { label: 'OPN', cls: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800' };
  if (id === 'nvidia')     return { label: 'NVI', cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' };
  if (id === 'groq')       return { label: 'GRQ', cls: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800' };
  if (id === 'cerebras')   return { label: 'CER', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' };
  if (id === 'sambanova')  return { label: 'SAM', cls: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800' };
  if (id === 'mistral')    return { label: 'MIS', cls: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800' };
  if (id === 'github')     return { label: 'GTH', cls: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-800' };
  if (id === 'huggingface')return { label: 'HUG', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800' };
  if (id === 'cloudflare') return { label: 'CLD', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' };
  if (id === 'cohere')     return { label: 'COH', cls: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800' };
  return { label: 'UNK', cls: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800' };
};

// ─── Auto Panel ────────────────────────────────────────────────────────────────

const AutoPanel: React.FC<{
  configs: Record<string, string>;
  autoChain: AutoRouteModelEntry[];
  autoSortMode: AutoSortMode;
  onMoveChain: (index: number, dir: -1 | 1) => void;
  onSort: (mode: AutoSortMode) => void;
  onUpdateChainItem: (index: number, patch: Partial<AutoRouteModelEntry>) => void;
}> = ({ configs, autoChain, autoSortMode, onMoveChain, onSort, onUpdateChainItem }) => {
  const enabledCount = autoChain.filter(entry => entry.enabled).length;
  const readyCount = autoChain.filter(entry => isProviderReady(entry.provider, configs)).length;
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          ⚡ Auto Router
        </h3>
      </div>

      {/* Chain configurator */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => onSort('intelligence')}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
              autoSortMode === 'intelligence'
                ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            Sort by intelligence
          </button>
          <button
            onClick={() => onSort('speed')}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
              autoSortMode === 'speed'
                ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            Sort by speed
          </button>
          <button
            onClick={() => onSort('budget')}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
              autoSortMode === 'budget'
                ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            Sort by budget
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Fallback Model Order
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {enabledCount} enabled · {readyCount}/{autoChain.length} provider-ready
          </span>
        </div>

        <div className="space-y-2">
          {autoChain.map((entry, index) => {
            const meta = ALL_PROVIDERS.find(p => p.id === entry.provider);
            if (!meta) return null;
            const ready = isProviderReady(entry.provider, configs);
            const badge = getProviderBadge(entry.provider);
            return (
              <div
                key={`${entry.provider}:${entry.model}:${index}`}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all ${
                  ready && entry.enabled
                    ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm'
                    : 'border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/20 opacity-50'
                }`}
              >
                {/* Position */}
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {index + 1}
                </span>

                {/* Provider Code Badge */}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.cls} flex-shrink-0`}>
                  {badge.label}
                </span>

                {/* Model Info (Model is Main part) */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={entry.model}>
                    {entry.model}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {meta.supportsVision && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40">
                      vision
                    </span>
                  )}
                  {!ready && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                      no key
                    </span>
                  )}
                </div>

                {/* Switch Toggle */}
                <label className="inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={entry.enabled}
                    onChange={e => onUpdateChainItem(index, { enabled: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>

                {/* Move buttons */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => onMoveChain(index, -1)}
                    disabled={index === 0}
                    className="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    title="Move up"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onMoveChain(index, 1)}
                    disabled={index === autoChain.length - 1}
                    className="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    title="Move down"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          This list auto-populates from all models returned by providers with active API keys.
          Use sort presets and optional manual reordering with ↑ ↓. Toggle models on/off as needed.
        </p>
      </div>
    </div>
  );
};

// ─── Generic/Unified Provider Panel ─────────────────────────────────────────────

const ProviderPanel: React.FC<{
  meta: ProviderMeta;
  configs: Record<string, string>;
  showKeys: Record<string, boolean>;
  onConfig: (key: string, value: string) => void;
  onToggleShow: (key: string) => void;
  noModel?: boolean;
  extraFields?: React.ReactNode;
  models?: string[];
  loading?: boolean;
}> = ({ meta, configs, showKeys, onConfig, onToggleShow, noModel, extraFields, models, loading }) => {
  const modelOptions = models || CURATED_MODELS[meta.id as Exclude<AiProvider, 'auto' | 'gemini'>] || [];
  const currentVal = (configs[meta.modelStorageKey!] ?? meta.defaultModel).trim();

  // If currentVal is not empty and is not in modelOptions, treat as custom
  const isCustom = currentVal && !modelOptions.includes(currentVal);
  const selectValue = isCustom ? 'custom' : currentVal || meta.defaultModel;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      onConfig(meta.modelStorageKey!, currentVal || meta.defaultModel);
    } else {
      onConfig(meta.modelStorageKey!, val);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{meta.label}</h3>
          <Badge tier={meta.pricingBadge} />
          {meta.supportsVision && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              vision
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{meta.description}</p>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          API Key
        </label>
        <div className="relative">
          <input
            type={showKeys[meta.apiKeyStorageKey] ? 'text' : 'password'}
            value={configs[meta.apiKeyStorageKey] ?? ''}
            onChange={e => onConfig(meta.apiKeyStorageKey, e.target.value)}
            placeholder={meta.keyPlaceholder}
            className="w-full px-4 py-3 pr-20 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-all"
          />
          <button
            type="button"
            onClick={() => onToggleShow(meta.apiKeyStorageKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded-lg transition-colors"
          >
            {showKeys[meta.apiKeyStorageKey] ? 'Hide' : 'Show'}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          Get your key at{' '}
          <a href={meta.keyUrl} target="_blank" rel="noopener noreferrer"
            className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
            {meta.keyUrl.replace('https://', '')}
          </a>
        </p>
      </div>

      {/* Extra fields */}
      {extraFields}

      {/* Model Selector */}
      {!noModel && meta.modelStorageKey && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Model
            </label>
            {loading && (
              <span className="text-xs text-indigo-600 dark:text-indigo-400 animate-pulse flex items-center gap-1 font-medium animate-fade-in-fast">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Fetching models...
              </span>
            )}
          </div>
          <div className="relative">
            <select
              value={selectValue}
              onChange={handleSelectChange}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-all appearance-none cursor-pointer"
            >
              {modelOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              <option value="custom">Custom model ID...</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>

          {/* Custom text input */}
          {selectValue === 'custom' && (
            <div className="mt-2.5 animate-fade-in-fast">
              <input
                type="text"
                value={currentVal}
                onChange={e => onConfig(meta.modelStorageKey!, e.target.value)}
                placeholder={`e.g. ${meta.defaultModel}`}
                className="w-full px-4 py-3 border-2 border-indigo-300 dark:border-indigo-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-all"
              />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Enter any custom model ID supported by this provider.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
