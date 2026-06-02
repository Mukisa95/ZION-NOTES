/**
 * modelFetchingService.ts
 *
 * Dynamically fetches the list of available models for each AI provider
 * using their respective /models or search endpoints.
 * Includes curated fallback lists for offline, CORS-restricted, or config-missing scenarios.
 */

import { AiProvider } from '../types';
import { getProviderMeta } from './providerRegistry';

// Curated list of popular models per provider for instant fallback / offline use.
export const CURATED_MODELS: Record<Exclude<AiProvider, 'auto' | 'gemini'>, string[]> = {
  openrouter: [
    'qwen/qwen3.6-plus:free',
    'qwen/qwq-32b:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'meta-llama/llama-4-scout:free',
    'google/gemma-3-27b-it:free',
    'deepseek/deepseek-r1:free',
    'deepseek/deepseek-chat:free',
    'openai/gpt-4o',
    'anthropic/claude-sonnet-4-5',
  ],
  nvidia: [
    'nvidia/nemotron-4-340b-instruct',
    'nvidia/llama-3.1-nemotron-70b-instruct',
    'meta/llama-3.1-8b-instruct',
    'meta/llama-3.1-70b-instruct',
    'meta/llama-3.1-405b-instruct',
    'mistralai/mixtral-8x22b-instruct-v0.1',
  ],
  groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'llama-3.2-1b-preview',
    'llama-3.2-3b-preview',
    'llama-3.2-11b-vision-preview',
    'llama-3.2-90b-vision-preview',
    'llama3-70b-8192',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
  ],
  cerebras: [
    'llama3.1-8b',
    'llama3.1-70b',
  ],
  sambanova: [
    'Meta-Llama-3.3-70B-Instruct',
    'Meta-Llama-3.1-8B-Instruct',
    'Meta-Llama-3.1-70B-Instruct',
    'Meta-Llama-3.1-405B-Instruct',
    'Qwen2.5-72B-Instruct',
    'Qwen2.5-Coder-32B-Instruct',
  ],
  mistral: [
    'mistral-small-latest',
    'mistral-medium-latest',
    'mistral-large-latest',
    'codestral-latest',
    'pixtral-12b-2409',
    'open-mixtral-8x22b',
  ],
  github: [
    'gpt-4o',
    'gpt-4o-mini',
    'o1-mini',
    'o1-preview',
    'meta-llama-3.1-70b-instruct',
    'meta-llama-3.1-405b-instruct',
    'cohere-command-r-plus',
    'mistral-large-2407',
  ],
  huggingface: [
    'meta-llama/Llama-3.3-70B-Instruct',
    'meta-llama/Meta-Llama-3-8B-Instruct',
    'mistralai/Mistral-7B-Instruct-v0.3',
    'mistralai/Mixtral-8x7B-Instruct-v0.1',
    'google/gemma-2-27b-it',
    'microsoft/Phi-3-mini-4k-instruct',
  ],
  cloudflare: [
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    '@cf/meta/llama-3-8b-instruct',
    '@cf/meta/llama-3.1-8b-instruct',
    '@cf/mistral/mistral-7b-instruct-v0.1',
    '@cf/qwen/qwen1.5-14b-chat-or',
  ],
  cohere: [
    'command-r-plus',
    'command-r',
    'command-light',
    'command',
  ]
};

/**
 * Dynamically fetches model IDs from the provider's API.
 * Falls back to curated models on error (CORS, invalid key, network down, etc.)
 */
export async function fetchAvailableModels(
  providerId: Exclude<AiProvider, 'auto' | 'gemini'>,
  apiKey: string,
  extra: { cloudflareAccountId?: string } = {}
): Promise<string[]> {
  const meta = getProviderMeta(providerId);
  if (!meta || !apiKey.trim()) {
    return CURATED_MODELS[providerId];
  }

  // Cloudflare Account ID is needed for Cloudflare
  let baseUrl = meta.baseUrl;
  if (providerId === 'cloudflare') {
    const acctId = (extra.cloudflareAccountId ?? '').trim();
    if (!acctId) return CURATED_MODELS.cloudflare;
    baseUrl = `https://api.cloudflare.com/client/v4/accounts/${acctId}/ai/v1`;
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
    };

    if (providerId === 'openrouter') {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'Zion Notes';
    }

    let url = `${baseUrl}/models`;

    // Special handles
    if (providerId === 'cloudflare') {
      // Cloudflare models search endpoint
      url = `https://api.cloudflare.com/client/v4/accounts/${extra.cloudflareAccountId?.trim()}/ai/models/search`;
    } else if (providerId === 'github') {
      url = 'https://models.inference.ai.azure.com/models';
    }

    console.log(`[ModelFetch] Fetching models for ${providerId} from ${url}...`);
    
    // Timeout of 8 seconds to prevent hanging UI
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();

    let modelIds: string[] = [];

    if (providerId === 'cloudflare') {
      // Cloudflare response format
      if (Array.isArray(data.result)) {
        modelIds = data.result
          .filter((m: any) => m.task?.name?.toLowerCase().includes('text generation') || m.name?.includes('llama') || m.name?.includes('mistral'))
          .map((m: any) => m.name);
      }
    } else if (Array.isArray(data.data)) {
      // Standard OpenAI model list format
      modelIds = data.data.map((m: any) => m.id);
    } else if (Array.isArray(data)) {
      // Array structure (some endpoints)
      modelIds = data.map((m: any) => typeof m === 'string' ? m : m.id || m.name);
    }

    // Filter to valid non-empty strings and sort alphabetically
    modelIds = modelIds
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      .sort((a, b) => a.localeCompare(b));

    if (modelIds.length > 0) {
      console.log(`[ModelFetch] Successfully fetched ${modelIds.length} models for ${providerId}`);
      return modelIds;
    }

    throw new Error('No models parsed from response');
  } catch (error) {
    console.warn(
      `[ModelFetch] Failed to fetch models for ${providerId} (${error instanceof Error ? error.message : String(error)}). Using curated fallbacks.`
    );
    return CURATED_MODELS[providerId];
  }
}
