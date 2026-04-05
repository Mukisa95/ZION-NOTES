/**
 * aiService.ts
 * Unified AI facade — delegates to OpenRouter or Google Gemini
 * based on the `ai_provider` stored in localStorage.
 *
 * Default provider: openrouter
 */

import type { Chat, Part } from '@google/genai';
import { AiProvider, GenericChatSession, TranscriptionOption } from '../types';
import * as openRouter from './openRouterService';
import * as gemini from './geminiService';

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
  if (getActiveProvider() === 'gemini') {
    return gemini.generateText(prompt, images);
  }
  return openRouter.generateText(prompt, images);
};

export const createChatSession = (): GenericChatSession => {
  if (getActiveProvider() === 'gemini') {
    return new GeminiChatAdapter();
  }
  return openRouter.createChatSession();
};

export const transcribeFiles = async (
  files: File[],
  option: TranscriptionOption
): Promise<{ html: string; errors: { original: string; suggestion: string }[] }> => {
  if (getActiveProvider() === 'gemini') {
    return gemini.transcribeFiles(files, option);
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

  private getSession(): Chat {
    if (!this.session) {
      this.session = gemini.createGeminiChatSession();
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
