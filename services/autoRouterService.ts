/**
 * autoRouterService.ts
 *
 * Implements FreeLLMAPI-style automatic provider fallback routing — locally,
 * with no external routing server.
 *
 * Decision flow per request:
 *  1. Read the ordered fallback chain from localStorage
 *  2. Filter out unconfigured providers
 *  3. If images present → filter to vision-capable providers only
 *  4. Walk the chain in order; skip on 429 / 5xx / 401 / timeout / network error
 *  5. Return first success, or throw if all fail
 */

import type { Chat, Part } from '@google/genai';
import { AiProvider, AutoRouteModelEntry, GenericChatSession, ModelRouteInfo, TranscriptionOption } from '../types';
import {
  DEFAULT_FALLBACK_CHAIN,
  getProviderMeta,
} from './providerRegistry';
import {
  isOpenAiProviderConfigured,
  generateTextWith,
  createChatSessionWith,
  transcribeFilesWith,
} from './genericOpenAiService';
import * as gemini from './geminiService';
import { createModelRouteInfo, getFavoriteModelIds } from './modelPreferenceService';

// ─── Chain persistence ────────────────────────────────────────────────────────

const CHAIN_KEY = 'auto_fallback_chain';
type RouteProvider = Exclude<AiProvider, 'auto'>;

const DEFAULT_CHAIN_ENTRIES: AutoRouteModelEntry[] = DEFAULT_FALLBACK_CHAIN
  .filter((id): id is RouteProvider => id !== 'auto')
  .map((id) => {
    const meta = getProviderMeta(id);
    return {
      provider: id,
      model: meta?.defaultModel ?? '',
      enabled: true,
    };
  })
  .filter(entry => entry.model.trim().length > 0);

const isRouteProvider = (id: unknown): id is RouteProvider => {
  if (typeof id !== 'string') return false;
  return !!getProviderMeta(id as AiProvider) && id !== 'auto';
};

const parseStoredChain = (raw: unknown): AutoRouteModelEntry[] => {
  if (!Array.isArray(raw)) return [];

  const modelEntries = raw
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null;
      const provider = (item as { provider?: unknown }).provider;
      const model = (item as { model?: unknown }).model;
      const enabled = (item as { enabled?: unknown }).enabled;
      if (!isRouteProvider(provider) || typeof model !== 'string' || !model.trim()) return null;
      return {
        provider,
        model: model.trim(),
        enabled: enabled !== false,
      } satisfies AutoRouteModelEntry;
    })
    .filter((entry): entry is AutoRouteModelEntry => !!entry);

  if (modelEntries.length > 0) return modelEntries;

  // Backward compatibility: old format was AiProvider[]
  const legacyProviders = raw.filter(isRouteProvider);
  return legacyProviders.map((provider) => {
    const meta = getProviderMeta(provider)!;
    return { provider, model: meta.defaultModel, enabled: true };
  });
};

/** Read the ordered model fallback chain from localStorage */
export const getFallbackChain = (): AutoRouteModelEntry[] => {
  try {
    const stored = localStorage.getItem(CHAIN_KEY);
    if (stored) {
      const parsed = parseStoredChain(JSON.parse(stored));
      if (parsed.length > 0) return parsed;
    }
  } catch {
    // ignore malformed localStorage values
  }
  return [...DEFAULT_CHAIN_ENTRIES];
};

/** Persist the ordered fallback chain */
export const setFallbackChain = (chain: AutoRouteModelEntry[]): void => {
  localStorage.setItem(CHAIN_KEY, JSON.stringify(chain));
};

// ─── Routing state (in-memory, per session) ───────────────────────────────────

let _lastRoutedVia: string | null = null;
let _lastRoutedModel: ModelRouteInfo | null = null;
let _lastFallbackAttempts = 0;

export const getLastRoutedVia = (): string | null => _lastRoutedVia;
export const getLastRoutedModel = (): ModelRouteInfo | null => _lastRoutedModel;
export const getLastFallbackAttempts = (): number => _lastFallbackAttempts;

// ─── Provider configuration checks ───────────────────────────────────────────

/** Return true if a provider has all required keys/models saved */
const isConfigured = (provider: RouteProvider): boolean => {
  if (provider === 'gemini') {
    return !!(gemini.getGeminiApiKey()?.trim());
  }
  const meta = getProviderMeta(provider);
  return meta ? isOpenAiProviderConfigured(meta) : false;
};

/** Build the effective list of model entries to try for a given request */
const buildChain = (hasImages: boolean): AutoRouteModelEntry[] => {
  const chain = getFallbackChain();
  const favoriteIds = getFavoriteModelIds();
  const favoriteRank = new Map(favoriteIds.map((id, index) => [id, index]));
  return chain.filter(entry => {
    if (!entry.enabled || !entry.model.trim()) return false;
    if (!isConfigured(entry.provider)) return false;
    if (hasImages) {
      const meta = getProviderMeta(entry.provider);
      if (!meta?.supportsVision) return false;
    }
    return true;
  }).sort((a, b) => {
    const aRank = favoriteRank.get(`${a.provider}:${a.model}`);
    const bRank = favoriteRank.get(`${b.provider}:${b.model}`);
    if (aRank === undefined && bRank === undefined) return 0;
    if (aRank === undefined) return 1;
    if (bRank === undefined) return -1;
    return aRank - bRank;
  });
};

// ─── Per-provider call dispatchers ────────────────────────────────────────────

const callGenerateText = (
  entry: AutoRouteModelEntry,
  prompt: string,
  images?: { mimeType: string; data: string }[]
): Promise<string> => {
  if (entry.provider === 'gemini') return gemini.generateText(prompt, images, entry.model);
  const meta = getProviderMeta(entry.provider)!;
  return generateTextWith(meta, prompt, images, entry.model);
};

const callCreateChatSession = (entry: AutoRouteModelEntry): GenericChatSession => {
  if (entry.provider === 'gemini') {
    // Wrap the Gemini Chat in a GenericChatSession-compatible adapter
    return new GeminiChatAdapter(entry.model);
  }
  const meta = getProviderMeta(entry.provider)!;
  return createChatSessionWith(meta, entry.model);
};

const callTranscribeFiles = (
  entry: AutoRouteModelEntry,
  files: File[],
  option: TranscriptionOption
): Promise<{ html: string; errors: { original: string; suggestion: string }[] }> => {
  if (entry.provider === 'gemini') return gemini.transcribeFiles(files, option, entry.model);
  const meta = getProviderMeta(entry.provider)!;
  return transcribeFilesWith(meta, files, option, entry.model);
};

// ─── Chain walker ─────────────────────────────────────────────────────────────

async function walkChain<T>(
  chain: AutoRouteModelEntry[],
  label: string,
  fn: (entry: AutoRouteModelEntry) => Promise<T>
): Promise<T> {
  if (chain.length === 0) {
    throw new Error(
      '[AutoRouter] No enabled models available. Configure and enable at least one model in Auto Router settings.'
    );
  }

  let attempts = 0;
  for (const entry of chain) {
    const id = `${entry.provider}:${entry.model}`;
    try {
      console.log(`[AutoRouter] ${label} → trying ${id}…`);
      const result = await fn(entry);
      _lastRoutedVia = id;
      _lastRoutedModel = createModelRouteInfo(entry.provider, entry.model);
      _lastFallbackAttempts = attempts;
      console.log(`[AutoRouter] ${label} → ${id} succeeded ✓ (after ${attempts} failure(s))`);
      return result;
    } catch (err) {
      attempts++;
      console.warn(
        `[AutoRouter] ${label} → ${id} failed (${err instanceof Error ? err.message : String(err)}), skipping`
      );
      // All errors are skippable in auto mode — we always try the next provider
    }
  }

  _lastFallbackAttempts = attempts;
  throw new Error(
    `[AutoRouter] All models failed (tried: ${chain.map(c => `${c.provider}:${c.model}`).join(', ')}). Check model toggles/keys in Settings.`
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const autoGenerateText = async (
  prompt: string,
  images?: { mimeType: string; data: string }[]
): Promise<string> => {
  const chain = buildChain(!!(images && images.length > 0));
  return walkChain(chain, 'generateText', id => callGenerateText(id, prompt, images));
};

export const autoTranscribeFiles = async (
  files: File[],
  option: TranscriptionOption
): Promise<{ html: string; errors: { original: string; suggestion: string }[] }> => {
  // Transcription always involves files (may include images) → require vision
  const chain = buildChain(true);
  return walkChain(chain, 'transcribeFiles', id => callTranscribeFiles(id, files, option));
};

// ─── Auto Chat Session ────────────────────────────────────────────────────────

/**
 * AutoChatSession tries providers in order for the first message to establish
 * which one is alive, then sticks with it for the rest of the conversation.
 * If the established provider fails on a later message, it falls through to
 * the next provider in the chain and continues from there (starting a fresh
 * session on that provider).
 */
export class AutoChatSession implements GenericChatSession {
  private chain: AutoRouteModelEntry[];
  private currentIndex = 0;
  private currentSession: GenericChatSession | null = null;

  constructor(hasImages = false) {
    this.chain = buildChain(hasImages);
  }

  async *sendMessageStream(params: {
    message: string;
    images?: { mimeType: string; data: string }[];
    onModelSelected?: (model: ModelRouteInfo) => void;
  }): AsyncIterable<string> {
    if (this.chain.length === 0) {
      throw new Error(
        '[AutoRouter] No configured chat providers available. Please add at least one API key in Settings.'
      );
    }

    while (this.currentIndex < this.chain.length) {
      // Lazy-initialise the session for the current provider
      if (!this.currentSession) {
        const entry = this.chain[this.currentIndex];
        const id = `${entry.provider}:${entry.model}`;
        console.log(`[AutoRouter] chat → establishing session on ${id}…`);
        this.currentSession = callCreateChatSession(entry);
      }

      const entry = this.chain[this.currentIndex];
      const id = `${entry.provider}:${entry.model}`;
      const modelInfo = createModelRouteInfo(entry.provider, entry.model);
      let yieldedAny = false;

      try {
        for await (const chunk of this.currentSession.sendMessageStream(params)) {
          if (!yieldedAny) {
            params.onModelSelected?.(modelInfo);
            _lastRoutedVia = id;
            _lastRoutedModel = modelInfo;
          }
          yieldedAny = true;
          yield chunk;
        }
        // Success — record routing info and return
        _lastRoutedVia = id;
        _lastRoutedModel = modelInfo;
        return;
      } catch (err) {
        if (yieldedAny) {
          // Already sent partial content to the UI — don't silently switch providers
          throw err;
        }
        console.warn(
          `[AutoRouter] chat → ${id} failed before streaming (${err instanceof Error ? err.message : String(err)}), trying next…`
        );
        this.currentSession = null;
        this.currentIndex++;
      }
    }

    throw new Error(
      `[AutoRouter] All chat models failed (tried: ${this.chain.map(c => `${c.provider}:${c.model}`).join(', ')}). Check model toggles/keys in Settings.`
    );
  }
}

export const autoCreateChatSession = (): GenericChatSession => new AutoChatSession();

// ─── Gemini Chat Adapter (internal) ──────────────────────────────────────────

class GeminiChatAdapter implements GenericChatSession {
  private model: string;
  private session: Chat | null = null;

  constructor(model: string) {
    this.model = model;
  }

  private getSession(): Chat {
    if (!this.session) this.session = gemini.createGeminiChatSession(this.model);
    return this.session;
  }

  async *sendMessageStream(params: {
    message: string;
    images?: { mimeType: string; data: string }[];
  }): AsyncIterable<string> {
    const session = this.getSession();
    const parts: Part[] = [{ text: params.message }];
    if (params.images) {
      for (const img of params.images) {
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
      }
    }
    const stream = await session.sendMessageStream({ message: parts });
    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
    }
  }
}

// ─── Configured providers helper (for ProviderModal / StatusBar) ──────────────

/** Returns true if Auto mode has at least one configured provider to work with */
export const isAutoModeAvailable = (): boolean => buildChain(false).length > 0;

/** Returns a human-readable chain preview, e.g. "Gemini → Groq → OpenRouter" */
export const getChainPreview = (): string => {
  const chain = buildChain(false);
  if (chain.length === 0) return 'No enabled models configured';
  return chain
    .slice(0, 4)
    .map(entry => `${getProviderMeta(entry.provider)?.label ?? entry.provider} (${entry.model})`)
    .join(' → ') + (chain.length > 4 ? ` +${chain.length - 4} more` : '');
};
