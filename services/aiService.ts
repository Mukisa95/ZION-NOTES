/**
 * aiService.ts
 * Unified AI façade — delegates to the correct provider service based on
 * the `ai_provider` value stored in localStorage.
 *
 * Supported providers:
 *   gemini | openrouter | nvidia            — original providers
 *   groq | cerebras | sambanova | mistral   — new OpenAI-compat
 *   github | huggingface | cloudflare | cohere — new OpenAI-compat
 *   auto                                    — FreeLLMAPI-style fallback chain
 */

import type { Chat, Part } from '@google/genai';
import { AiProvider, GenericChatSession, ModelRouteInfo, TranscriptionOption } from '../types';
import * as gemini from './geminiService';
import * as nvidia from './nvidiaService';
import * as openRouter from './openRouterService';
import {
  resolveConfig,
  isOpenAiProviderConfigured,
  generateTextWith,
  createChatSessionWith,
  transcribeFilesWith,
} from './genericOpenAiService';
import {
  autoGenerateText,
  autoCreateChatSession,
  autoTranscribeFiles,
  getLastRoutedModel,
} from './autoRouterService';
import { ALL_PROVIDERS, getProviderMeta } from './providerRegistry';
import { createModelRouteInfo } from './modelPreferenceService';

// ─── Provider helpers ─────────────────────────────────────────────────────────

export const getActiveProvider = (): AiProvider => {
  const stored = localStorage.getItem('ai_provider') as AiProvider | null;
  return stored ?? 'openrouter';
};

export const setActiveProvider = (provider: AiProvider): void => {
  localStorage.setItem('ai_provider', provider);
};

export const getCurrentModelRouteInfo = (): ModelRouteInfo | null => {
  const provider = getActiveProvider();
  if (provider === 'auto') return getLastRoutedModel();

  if (provider === 'gemini') {
    const meta = getProviderMeta('gemini');
    return createModelRouteInfo('gemini', meta?.defaultModel ?? 'gemini-2.5-flash');
  }

  if (provider === 'nvidia') {
    const model = nvidia.getNvidiaModel()?.trim() || getProviderMeta('nvidia')?.defaultModel;
    return model ? createModelRouteInfo('nvidia', model) : null;
  }

  if (provider === 'openrouter') {
    const model = localStorage.getItem('openrouter_model')?.trim() || getProviderMeta('openrouter')?.defaultModel;
    return model ? createModelRouteInfo('openrouter', model) : null;
  }

  const meta = getProviderMeta(provider);
  if (!meta) return null;
  const model = meta.modelStorageKey
    ? localStorage.getItem(meta.modelStorageKey)?.trim() || meta.defaultModel
    : meta.defaultModel;
  return model ? createModelRouteInfo(provider, model) : null;
};

/** Returns every provider that has a valid key (and model where needed) saved */
export const getConfiguredProviders = (): AiProvider[] => {
  const providers: AiProvider[] = [];

  // Gemini
  if (gemini.getGeminiApiKey()?.trim()) providers.push('gemini');

  // OpenRouter (legacy full service)
  if (
    localStorage.getItem('openrouter_api_key')?.trim() &&
    localStorage.getItem('openrouter_model')?.trim()
  ) {
    providers.push('openrouter');
  }

  // Nvidia
  if (nvidia.getNvidiaApiKey()?.trim() && nvidia.getNvidiaModel()?.trim()) {
    providers.push('nvidia');
  }

  // All other OpenAI-compatible providers from the registry
  const genericIds: AiProvider[] = [
    'groq', 'cerebras', 'sambanova', 'mistral',
    'github', 'huggingface', 'cloudflare', 'cohere',
  ];
  for (const id of genericIds) {
    const meta = getProviderMeta(id);
    if (meta && isOpenAiProviderConfigured(meta)) providers.push(id);
  }

  // Auto is available if at least one of the above is configured
  if (providers.length > 0) providers.unshift('auto');

  return providers;
};

// ─── Unified API surface ──────────────────────────────────────────────────────

export const generateText = async (
  prompt: string,
  images?: { mimeType: string; data: string }[]
): Promise<string> => {
  const provider = getActiveProvider();

  if (provider === 'auto')       return autoGenerateText(prompt, images);
  if (provider === 'gemini')     return gemini.generateText(prompt, images);
  if (provider === 'nvidia')     return nvidia.generateText(prompt, images);
  if (provider === 'openrouter') return openRouter.generateText(prompt, images);

  // Generic OpenAI-compatible providers
  const meta = getProviderMeta(provider);
  if (meta) return generateTextWith(meta, prompt, images);

  // Fallback — should never reach here if types are correct
  return openRouter.generateText(prompt, images);
};

export const createChatSession = (): GenericChatSession => {
  const provider = getActiveProvider();

  if (provider === 'auto')       return autoCreateChatSession();
  if (provider === 'gemini')     return new GeminiChatAdapter();
  if (provider === 'nvidia')     return nvidia.createChatSession();
  if (provider === 'openrouter') return openRouter.createChatSession();

  const meta = getProviderMeta(provider);
  if (meta) return createChatSessionWith(meta);

  return openRouter.createChatSession();
};

export const transcribeFiles = async (
  files: File[],
  option: TranscriptionOption
): Promise<{ html: string; errors: { original: string; suggestion: string }[] }> => {
  const provider = getActiveProvider();

  if (provider === 'auto')       return autoTranscribeFiles(files, option);
  if (provider === 'gemini')     return gemini.transcribeFiles(files, option);
  if (provider === 'nvidia')     return nvidia.transcribeFiles(files, option);
  if (provider === 'openrouter') return openRouter.transcribeFiles(files, option);

  const meta = getProviderMeta(provider);
  if (meta) return transcribeFilesWith(meta, files, option);

  return openRouter.transcribeFiles(files, option);
};

// ─── Gemini Chat Adapter ──────────────────────────────────────────────────────

/**
 * Wraps the Google GenAI Chat object so it conforms to GenericChatSession.
 */
class GeminiChatAdapter implements GenericChatSession {
  private session: Chat | null = null;

  private getSession(): Chat {
    if (!this.session) this.session = gemini.createGeminiChatSession();
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
