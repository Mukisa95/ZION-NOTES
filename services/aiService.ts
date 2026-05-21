/**
 * aiService.ts
 * Unified AI facade — delegates to OpenRouter or Google Gemini
 * based on the `ai_provider` stored in localStorage.
 *
 * Default provider: openrouter
 */

import type { Chat, Part } from '@google/genai';
import { AiProvider, GenericChatSession, TranscriptionOption, ChatMessage } from '../types';
import * as openRouter from './openRouterService';
import * as gemini from './geminiService';
import * as nvidia from './nvidiaService';

// ─── Provider helpers ─────────────────────────────────────────────────────────

export const getActiveProvider = (): AiProvider => {
  const stored = localStorage.getItem('ai_provider') as AiProvider | null;
  return stored ?? 'openrouter';
};

export const setActiveProvider = (provider: AiProvider): void => {
  localStorage.setItem('ai_provider', provider);
};

// ─── Unified API surface ──────────────────────────────────────────────────────

export const generateText = async (
  prompt: string,
  images?: { mimeType: string; data: string }[]
): Promise<string> => {
  const provider = getActiveProvider();
  if (provider === 'gemini') {
    return gemini.generateText(prompt, images);
  }
  if (provider === 'nvidia') {
    return nvidia.generateText(prompt, images);
  }
  return openRouter.generateText(prompt, images);
};

export const createChatSession = (history?: ChatMessage[]): GenericChatSession => {
  const provider = getActiveProvider();
  if (provider === 'gemini') {
    return new GeminiChatAdapter(history);
  }
  if (provider === 'nvidia') {
    return nvidia.createChatSession(history);
  }
  return openRouter.createChatSession(history);
};

export const transcribeFiles = async (
  files: File[],
  option: TranscriptionOption
): Promise<{ html: string; errors: { original: string; suggestion: string }[] }> => {
  const provider = getActiveProvider();
  if (provider === 'gemini') {
    return gemini.transcribeFiles(files, option);
  }
  if (provider === 'nvidia') {
    return nvidia.transcribeFiles(files, option);
  }
  return openRouter.transcribeFiles(files, option);
};

// ─── Gemini Chat Adapter ──────────────────────────────────────────────────────

/**
 * Wraps the Google GenAI Chat object so it conforms to GenericChatSession.
 * The Gemini SDK Chat.sendMessageStream returns an AsyncIterable of chunks,
 * each with a `.text` property — we adapt that to yield plain string deltas.
 */
class GeminiChatAdapter implements GenericChatSession {
  private session: Chat | null = null;
  private history: any[] | undefined;

  constructor(history?: ChatMessage[]) {
    if (history && history.length > 0) {
      this.history = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
    }
  }

  private getSession(): Chat {
    if (!this.session) {
      this.session = gemini.createGeminiChatSession(this.history);
    }
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
      const text = chunk.text;
      if (text) yield text;
    }
  }
}
