/**
 * genericOpenAiService.ts
 * A single reusable service that covers every OpenAI-compatible provider
 * (Groq, Cerebras, SambaNova, Mistral, GitHub Models, HuggingFace, Cloudflare, Cohere, OpenRouter, Nvidia-proxy).
 * Gemini uses its own SDK service; everyone else flows through here.
 */

import mammoth from 'mammoth';
import { GenericChatSession, TranscriptionOption } from '../types';
import { ProviderMeta } from './providerRegistry';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const SYSTEM_PROMPT =
  'You are a helpful assistant for a note-taking app. Be concise and clear in your responses. Always use rich Markdown formatting (like **bold**, *italics*, and bulleted or numbered lists) to enhance readability and structure. Use indentation for nested lists to create clear hierarchies.';

/** Fetch with a configurable timeout; throws on abort */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 30_000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

/** Build the Authorization + Content-Type headers, plus any provider extras */
const buildHeaders = (
  apiKey: string,
  extra: Record<string, string> = {},
  stream = false
): Record<string, string> => ({
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  ...(stream ? { Accept: 'text/event-stream' } : {}),
  ...extra,
});

/** OpenAI-style user content: plain string for text-only, array for multimodal */
const buildUserContent = async (
  text: string,
  images?: { mimeType: string; data: string }[]
): Promise<string | Array<{ type: string; text?: string; image_url?: { url: string } }>> => {
  if (!images || images.length === 0) return text;
  return [
    { type: 'text', text },
    ...images.map(img => ({
      type: 'image_url',
      image_url: { url: `data:${img.mimeType};base64,${img.data}` },
    })),
  ];
};

// ─── Config resolution ────────────────────────────────────────────────────────

export interface ResolvedConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  extraHeaders: Record<string, string>;
}

/** Read API key, model, and base URL for a provider from localStorage */
export const resolveConfig = (meta: ProviderMeta, modelOverride?: string): ResolvedConfig => {
  const apiKey = (localStorage.getItem(meta.apiKeyStorageKey) ?? '').trim();
  const configuredModel = (
    meta.modelStorageKey
      ? (localStorage.getItem(meta.modelStorageKey) ?? meta.defaultModel)
      : meta.defaultModel
  ).trim();
  const model = (modelOverride?.trim() || configuredModel).trim();

  // Cloudflare requires account ID embedded in the URL
  let baseUrl = meta.baseUrl;
  if (meta.id === 'cloudflare') {
    const acctId = (localStorage.getItem('cloudflare_account_id') ?? '').trim();
    if (acctId) {
      baseUrl = `https://api.cloudflare.com/client/v4/accounts/${acctId}/ai/v1`;
    }
  }

  const extraHeaders: Record<string, string> = {};
  if (meta.id === 'openrouter') {
    extraHeaders['HTTP-Referer'] = window.location.origin;
    extraHeaders['X-Title'] = 'Zion Notes';
  }

  return { apiKey, model, baseUrl, extraHeaders };
};

/** Return true if the provider has everything needed to make a call */
export const isOpenAiProviderConfigured = (meta: ProviderMeta): boolean => {
  const { apiKey, baseUrl } = resolveConfig(meta);
  if (!apiKey) return false;
  if (meta.id === 'cloudflare' && !baseUrl.includes('/accounts/')) return false;
  return true;
};

// ─── Failure classification ───────────────────────────────────────────────────

/**
 * Returns true for any error that should cause the auto-router to skip
 * to the next provider instead of surfacing the error to the user.
 */
export const isSkippableError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const m = error.message;
    return (
      m.includes('429') ||
      m.includes('500') ||
      m.includes('502') ||
      m.includes('503') ||
      m.includes('401') ||
      m.includes('402') ||
      m.includes('403') ||
      m.includes('404') ||
      m.includes('timeout') ||
      m.includes('Timeout') ||
      m.includes('network') ||
      m.includes('Network') ||
      m.includes('Failed to fetch') ||
      m.includes('fetch') ||
      m.includes('ECONNREFUSED') ||
      m.includes('empty response')
    );
  }
  return true; // unknown errors → skip
};

// ─── Core API functions ───────────────────────────────────────────────────────

export const generateTextWith = async (
  meta: ProviderMeta,
  prompt: string,
  images?: { mimeType: string; data: string }[],
  modelOverride?: string
): Promise<string> => {
  const { apiKey, model, baseUrl, extraHeaders } = resolveConfig(meta, modelOverride);
  if (!apiKey) throw new Error(`${meta.label}: no API key`);

  const content = await buildUserContent(prompt, images);

  const res = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: buildHeaders(apiKey, extraHeaders),
    body: JSON.stringify({ model, messages: [{ role: 'user', content }] }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${meta.label} error ${res.status}: ${err}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error(`${meta.label}: empty response`);
  return text;
};

// ─── Streaming chat session ───────────────────────────────────────────────────

type ConversationMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
};

export class GenericOpenAiChatSession implements GenericChatSession {
  private history: ConversationMessage[];
  private meta: ProviderMeta;
  private modelOverride?: string;

  constructor(meta: ProviderMeta, modelOverride?: string) {
    this.meta = meta;
    this.modelOverride = modelOverride;
    this.history = [{ role: 'system', content: SYSTEM_PROMPT }];
  }

  async *sendMessageStream(params: {
    message: string;
    images?: { mimeType: string; data: string }[];
  }): AsyncIterable<string> {
    const { apiKey, model, baseUrl, extraHeaders } = resolveConfig(this.meta, this.modelOverride);
    if (!apiKey) throw new Error(`${this.meta.label}: no API key`);

    const userContent = await buildUserContent(params.message, params.images);
    this.history.push({ role: 'user', content: userContent });

    let res: Response | null = null;
    let lastErr: unknown;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: buildHeaders(apiKey, extraHeaders, true),
          body: JSON.stringify({ model, messages: this.history, stream: true }),
        });
        if (!r.ok) {
          const errText = await r.text();
          const error = new Error(`${this.meta.label} stream error ${r.status}: ${errText}`);
          if (r.status === 429) {
            lastErr = error;
            await sleep(2000 * Math.pow(2, attempt));
            continue;
          }
          throw error;
        }
        res = r;
        break;
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('429')) { await sleep(2000 * Math.pow(2, attempt)); continue; }
        throw err;
      }
    }

    if (!res?.body) throw lastErr ?? new Error(`${this.meta.label}: failed to connect`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content ?? '';
            if (delta) { fullText += delta; yield delta; }
          } catch { /* ignore partial SSE chunks */ }
        }
      }
    } finally {
      reader.releaseLock();
    }

    this.history.push({ role: 'assistant', content: fullText });
  }
}

export const createChatSessionWith = (meta: ProviderMeta, modelOverride?: string): GenericChatSession =>
  new GenericOpenAiChatSession(meta, modelOverride);

// ─── Transcription ────────────────────────────────────────────────────────────

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
  });

const fileToGenerativePart = async (
  file: File
): Promise<{ type: string; text?: string; image_url?: { url: string } }> => {
  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return { type: 'text', text: `DOCX Content:\n${result.value}` };
  }
  const base64 = await fileToBase64(file);
  return { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64}` } };
};

const getTranscriptionPrompt = (option: TranscriptionOption): string => {
  const base =
    `You are an expert document transcriber. Process the provided files (images, PDFs, or DOCX) and return a JSON object with two fields:\n` +
    `- "html": clean, semantic HTML representing the document content\n` +
    `- "errors": an array describing any spelling/grammar issues (objects with "original" and "suggestion")\n\n` +
    `Always return VALID JSON only—no markdown fences or extra commentary.`;
  switch (option) {
    case 'original':
      return `${base}\nTranscribe the document exactly as it appears. Preserve ALL numbering, bullet styles, indentation, capitalization, and punctuation. List detected issues in "errors" but do not alter the main HTML.`;
    case 'correct':
      return `${base}\nTranscribe and fix spelling/grammar issues directly in the HTML. For each fix, add an entry to "errors" describing the change.`;
    case 'organize':
      return `${base}\nTranscribe, then improve structure using headings, paragraphs, and lists. Correct issues and record them in "errors".`;
    case 'summarize':
      return `${base}\nRead the provided files and produce a concise summary in the "html" field. Return an empty "errors" array.`;
  }
};

const parseJsonResponse = (rawText: string) => {
  const trimmed = rawText.trim();
  const fenceMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  return JSON.parse(fenceMatch ? fenceMatch[1] : trimmed);
};

export const transcribeFilesWith = async (
  meta: ProviderMeta,
  files: File[],
  option: TranscriptionOption,
  modelOverride?: string
): Promise<{ html: string; errors: { original: string; suggestion: string }[] }> => {
  const { apiKey, model, baseUrl, extraHeaders } = resolveConfig(meta, modelOverride);
  if (!apiKey) throw new Error(`${meta.label}: no API key`);

  const prompt = getTranscriptionPrompt(option);
  const fileParts = await Promise.all(files.map(fileToGenerativePart));
  const content = [{ type: 'text', text: prompt }, ...fileParts];

  const res = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: buildHeaders(apiKey, extraHeaders),
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${meta.label} transcription error ${res.status}: ${err}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error(`${meta.label}: empty transcription response`);
  return parseJsonResponse(text);
};
