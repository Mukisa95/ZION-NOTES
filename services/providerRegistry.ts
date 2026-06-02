/**
 * providerRegistry.ts
 * Central source-of-truth for every supported AI provider.
 * Used by autoRouterService, SettingsModal, and ProviderModal.
 */

import { AiProvider } from '../types';

export interface ProviderMeta {
  id: AiProvider;
  label: string;
  description: string;
  /** Short hint shown in chain configurator */
  hint: string;
  /** Whether this provider can handle image inputs */
  supportsVision: boolean;
  /** localStorage key for the API key */
  apiKeyStorageKey: string;
  /** localStorage key for the model (null = provider uses a fixed model) */
  modelStorageKey: string | null;
  /** Where to get the API key */
  keyUrl: string;
  /** Default model ID to prefill */
  defaultModel: string;
  /** Placeholder text for the API key input */
  keyPlaceholder: string;
  /** Whether this provider is "OpenAI-compatible" (pass-through format) */
  openAiCompat: boolean;
  /** Base URL for API calls (used by generic OpenAI-compat service) */
  baseUrl: string;
  /** Pricing tier label */
  pricingBadge: 'free' | 'paid' | 'free+paid';
}

/** All providers available in the application */
export const ALL_PROVIDERS: ProviderMeta[] = [
  // ── Existing providers ────────────────────────────────────────────────────
  {
    id: 'gemini',
    label: 'Google Gemini',
    description: "Google's flagship models — 2.5 Flash, 2.5 Pro, 3.x series.",
    hint: 'Fast, free, vision-capable',
    supportsVision: true,
    apiKeyStorageKey: 'gemini_api_key',
    modelStorageKey: null, // fixed models inside geminiService
    keyUrl: 'https://aistudio.google.com/app/apikey',
    defaultModel: 'gemini-2.5-flash',
    keyPlaceholder: 'AIza...',
    openAiCompat: false,
    baseUrl: '',
    pricingBadge: 'free',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    description: 'Meta-router. Access 100+ models from one key.',
    hint: 'Wide model selection',
    supportsVision: true,
    apiKeyStorageKey: 'openrouter_api_key',
    modelStorageKey: 'openrouter_model',
    keyUrl: 'https://openrouter.ai/keys',
    defaultModel: 'qwen/qwen3.6-plus:free',
    keyPlaceholder: 'sk-or-v1-...',
    openAiCompat: true,
    baseUrl: 'https://openrouter.ai/api/v1',
    pricingBadge: 'free+paid',
  },
  {
    id: 'nvidia',
    label: 'Nvidia NIM',
    description: "Nvidia's GPU-accelerated inference endpoint.",
    hint: 'GPU-accelerated',
    supportsVision: true,
    apiKeyStorageKey: 'nvidia_api_key',
    modelStorageKey: 'nvidia_model',
    keyUrl: 'https://build.nvidia.com/',
    defaultModel: 'nvidia/nemotron-3-super-120b-a12b',
    keyPlaceholder: 'nvapi-...',
    openAiCompat: true,
    baseUrl: '/api/nvidia', // proxied
    pricingBadge: 'free+paid',
  },

  // ── New OpenAI-compatible providers ───────────────────────────────────────
  {
    id: 'groq',
    label: 'Groq',
    description: 'Ultra-fast inference. Llama, Mixtral, Gemma models.',
    hint: 'Ultra-fast free tier',
    supportsVision: true,
    apiKeyStorageKey: 'groq_api_key',
    modelStorageKey: 'groq_model',
    keyUrl: 'https://console.groq.com/keys',
    defaultModel: 'llama-3.3-70b-versatile',
    keyPlaceholder: 'gsk_...',
    openAiCompat: true,
    baseUrl: 'https://api.groq.com/openai/v1',
    pricingBadge: 'free',
  },
  {
    id: 'cerebras',
    label: 'Cerebras',
    description: 'Hardware-accelerated inference on wafer-scale chips.',
    hint: 'Wafer-scale speed',
    supportsVision: false,
    apiKeyStorageKey: 'cerebras_api_key',
    modelStorageKey: 'cerebras_model',
    keyUrl: 'https://cloud.cerebras.ai/',
    defaultModel: 'llama3.1-70b',
    keyPlaceholder: 'csk-...',
    openAiCompat: true,
    baseUrl: 'https://api.cerebras.ai/v1',
    pricingBadge: 'free',
  },
  {
    id: 'sambanova',
    label: 'SambaNova',
    description: 'High-throughput inference with Llama models.',
    hint: 'High-throughput, free',
    supportsVision: true,
    apiKeyStorageKey: 'sambanova_api_key',
    modelStorageKey: 'sambanova_model',
    keyUrl: 'https://cloud.sambanova.ai/',
    defaultModel: 'Meta-Llama-3.3-70B-Instruct',
    keyPlaceholder: 'snova-...',
    openAiCompat: true,
    baseUrl: 'https://api.sambanova.ai/v1',
    pricingBadge: 'free',
  },
  {
    id: 'mistral',
    label: 'Mistral AI',
    description: 'European AI — Mistral, Codestral, Pixtral models.',
    hint: 'European AI, free tier',
    supportsVision: false,
    apiKeyStorageKey: 'mistral_api_key',
    modelStorageKey: 'mistral_model',
    keyUrl: 'https://console.mistral.ai/api-keys',
    defaultModel: 'mistral-small-latest',
    keyPlaceholder: 'Enter Mistral API key...',
    openAiCompat: true,
    baseUrl: 'https://api.mistral.ai/v1',
    pricingBadge: 'free+paid',
  },
  {
    id: 'github',
    label: 'GitHub Models',
    description: 'GPT-4o and GPT-4.1 via GitHub marketplace.',
    hint: 'GPT-4o free via GitHub',
    supportsVision: true,
    apiKeyStorageKey: 'github_api_key',
    modelStorageKey: 'github_model',
    keyUrl: 'https://github.com/settings/tokens',
    defaultModel: 'gpt-4o',
    keyPlaceholder: 'ghp_... or github_pat_...',
    openAiCompat: true,
    baseUrl: 'https://models.inference.ai.azure.com',
    pricingBadge: 'free',
  },
  {
    id: 'huggingface',
    label: 'HuggingFace',
    description: 'Serverless inference on open-source models.',
    hint: 'Open-source models',
    supportsVision: false,
    apiKeyStorageKey: 'huggingface_api_key',
    modelStorageKey: 'huggingface_model',
    keyUrl: 'https://huggingface.co/settings/tokens',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
    keyPlaceholder: 'hf_...',
    openAiCompat: true,
    baseUrl: 'https://api-inference.huggingface.co/v1',
    pricingBadge: 'free+paid',
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare AI',
    description: "Edge-deployed inference on Cloudflare's network.",
    hint: 'Edge inference, free',
    supportsVision: false,
    apiKeyStorageKey: 'cloudflare_api_key',
    modelStorageKey: 'cloudflare_model',
    keyUrl: 'https://dash.cloudflare.com/profile/api-tokens',
    defaultModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    keyPlaceholder: 'Enter Cloudflare API token...',
    openAiCompat: true,
    baseUrl: '', // needs account ID: built dynamically
    pricingBadge: 'free',
  },
  {
    id: 'cohere',
    label: 'Cohere',
    description: 'Command R models. Strong at RAG and tool use.',
    hint: 'Great for RAG tasks',
    supportsVision: false,
    apiKeyStorageKey: 'cohere_api_key',
    modelStorageKey: 'cohere_model',
    keyUrl: 'https://dashboard.cohere.com/api-keys',
    defaultModel: 'command-r-plus',
    keyPlaceholder: 'Enter Cohere API key...',
    openAiCompat: true,
    baseUrl: 'https://api.cohere.com/compatibility/v1',
    pricingBadge: 'free+paid',
  },
];

/** Providers that use the generic OpenAI-compatible service (all except gemini/nvidia) */
export const OPENAI_COMPAT_PROVIDERS = ALL_PROVIDERS.filter(
  p => p.openAiCompat && p.id !== 'nvidia'
);

/** Get metadata for a specific provider */
export const getProviderMeta = (id: AiProvider): ProviderMeta | undefined =>
  ALL_PROVIDERS.find(p => p.id === id);

/** Default fallback chain order */
export const DEFAULT_FALLBACK_CHAIN: AiProvider[] = [
  'gemini',
  'groq',
  'openrouter',
  'sambanova',
  'cerebras',
  'nvidia',
  'mistral',
  'github',
  'huggingface',
  'cloudflare',
  'cohere',
];
