import mammoth from 'mammoth';
import { ChatMessage, GenericChatSession, TranscriptionOption } from '../types';

// ─── Config helpers ───────────────────────────────────────────────────────────

const NVIDIA_BASE = '/api/nvidia/v1';
const DEFAULT_NVIDIA_KEY = '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';
const DEFAULT_NVIDIA_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

export const getNvidiaApiKey = (): string =>
  localStorage.getItem('nvidia_api_key') || DEFAULT_NVIDIA_KEY;

export const getNvidiaModel = (): string => {
  const model = localStorage.getItem('nvidia_model') || DEFAULT_NVIDIA_MODEL;
  return model.endsWith(':free') ? model.slice(0, -5) : model;
};

const buildHeaders = () => ({
  Authorization: `Bearer ${getNvidiaApiKey()}`,
  'Content-Type': 'application/json',
});

// ─── Retry helper ─────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wraps an async function with exponential backoff retries on 429 errors.
 * Retries up to `maxAttempts` times, doubling the delay each time.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 2000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('429')) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(`Nvidia API 429 — retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// ─── User-friendly error parser ───────────────────────────────────────────────

function friendlyError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('401')) {
      return '⚠️ Invalid Nvidia API key. Please update it in Settings.';
    }
    if (error.message.includes('429')) {
      return '⚠️ This model is rate-limited. Please wait a moment and try again, or switch to a different model in Settings.';
    }
    if (error.message.includes('404')) {
      return '⚠️ Model not found. Please go to Settings and choose a different model or enter a valid custom model ID.';
    }
  }
  return 'Error: Could not reach Nvidia API. Please check your API key and model in Settings.';
}

// ─── Image helpers ─────────────────────────────────────────────────────────────

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
  });

/**
 * Build an OpenAI-compatible "content" structure.
 * Standard text completions support a simple string content. If we have images,
 * we use the content array format.
 */
const buildUserContent = async (
  text: string,
  images?: { mimeType: string; data: string }[]
): Promise<string | Array<{ type: string; text?: string; image_url?: { url: string } }>> => {
  if (!images || images.length === 0) {
    return text;
  }
  const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: 'text', text },
  ];
  for (const img of images) {
    parts.push({
      type: 'image_url',
      image_url: { url: `data:${img.mimeType};base64,${img.data}` },
    });
  }
  return parts;
};

// ─── Text Generation ──────────────────────────────────────────────────────────

export const generateText = async (
  prompt: string,
  images?: { mimeType: string; data: string }[]
): Promise<string> => {
  try {
    const content = await buildUserContent(prompt, images);

    const result = await withRetry(async () => {
      const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          model: getNvidiaModel(),
          messages: [{ role: 'user', content }],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Nvidia API error ${res.status}: ${err}`);
      }

      const json = await res.json();
      return json.choices?.[0]?.message?.content ?? '';
    });

    return result;
  } catch (error) {
    console.error('Nvidia generateText error:', error);
    return friendlyError(error);
  }
};

// ─── Streaming Chat Session ───────────────────────────────────────────────────

const SYSTEM_PROMPT =
  'You are a helpful assistant for a note-taking app. Be concise and clear in your responses. Always use rich Markdown formatting (like **bold**, *italics*, and bulleted or numbered lists) to enhance readability and structure. Use indentation for nested lists to create clear hierarchies.';

type ConversationMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
};

class NvidiaChatSession implements GenericChatSession {
  private history: ConversationMessage[];

  constructor(history?: ChatMessage[]) {
    if (history && history.length > 0) {
      const mapped = history.map(msg => ({
        role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.text
      }));
      this.history = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...mapped
      ];
    } else {
      this.history = [
        { role: 'system', content: SYSTEM_PROMPT },
      ];
    }
  }

  async *sendMessageStream(params: {
    message: string;
    images?: { mimeType: string; data: string }[];
  }): AsyncIterable<string> {
    const userContent = await buildUserContent(params.message, params.images);
    this.history.push({ role: 'user', content: userContent });

    let res: Response | null = null;
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(`${NVIDIA_BASE}/chat/completions`, {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify({
            model: getNvidiaModel(),
            messages: this.history,
            stream: true,
          }),
        });
        if (!r.ok) {
          const err = await r.text();
          const error = new Error(`Nvidia stream error ${r.status}: ${err}`);
          if (r.status === 429) {
            lastErr = error;
            const delay = 2000 * Math.pow(2, attempt);
            console.warn(`Nvidia chat 429 — retrying in ${delay}ms`);
            await sleep(delay);
            continue;
          }
          throw error;
        }
        res = r;
        break;
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('429')) {
          const delay = 2000 * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
        throw err;
      }
    }

    if (!res || !res.body) {
      throw lastErr ?? new Error('Nvidia: failed to connect after retries.');
    }

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
            if (delta) {
              fullText += delta;
              yield delta;
            }
          } catch {
            // Ignore JSON parse errors for partial chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    this.history.push({ role: 'assistant', content: fullText });
  }
}

export const createChatSession = (history?: ChatMessage[]): GenericChatSession =>
  new NvidiaChatSession(history);

// ─── Transcription (Vision / Text) ───────────────────────────────────────────

const fileToGenerativePart = async (
  file: File
): Promise<{ type: string; text?: string; image_url?: { url: string } }> => {
  if (
    file.type ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return { type: 'text', text: `DOCX Content:\n${result.value}` };
  }

  const base64 = await fileToBase64(file);
  return {
    type: 'image_url',
    image_url: { url: `data:${file.type};base64,${base64}` },
  };
};

const getTranscriptionPrompt = (option: TranscriptionOption): string => {
  const base = `You are an expert document transcriber. Process the provided files (images, PDFs, or DOCX) and return a JSON object with two fields:
- "html": clean, semantic HTML representing the document content
- "errors": an array describing any spelling/grammar issues (objects with "original" and "suggestion")

Always return VALID JSON only—no markdown fences or extra commentary.`;

  switch (option) {
    case 'original':
      return `${base}
Transcribe the document exactly as it appears. Requirements:
- Preserve ALL numbering, bullet styles, indentation, capitalization, and punctuation.
- Keep question/answer labels, section headings, and blank lines exactly where they occur (use <p>&nbsp;</p> for intentional blanks).
- Do NOT merge or reorder paragraphs; keep the original sequence and spacing.
- Reproduce tables/list layouts faithfully using appropriate HTML tags.
- If a paragraph begins with a prefix such as "1.", "1)", "Question 1", "(a)", etc., reproduce the prefix verbatim at the start of the same paragraph.
- Do NOT renumber items or convert numbered text into bullets; keep the literal numbering characters present in the HTML.
List detected issues in "errors" but do not alter the main HTML.`;
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
  const jsonText = fenceMatch ? fenceMatch[1] : trimmed;
  return JSON.parse(jsonText);
};

export const transcribeFiles = async (
  files: File[],
  option: TranscriptionOption
): Promise<{ html: string; errors: { original: string; suggestion: string }[] }> => {
  const prompt = getTranscriptionPrompt(option);
  const fileParts = await Promise.all(files.map(fileToGenerativePart));

  const content = [
    { type: 'text', text: prompt },
    ...fileParts,
  ];

  const result = await withRetry(async () => {
    const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        model: getNvidiaModel(),
        messages: [{ role: 'user', content }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Nvidia transcription error ${res.status}: ${err}`);
    }

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? '';
    if (!text) {
      throw new Error('Transcription returned an empty response. Please try again.');
    }
    return parseJsonResponse(text);
  });

  return result;
};
