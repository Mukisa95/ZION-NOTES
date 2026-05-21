import { GoogleGenAI, Chat, Part, Type } from "@google/genai";
import mammoth from "mammoth";
import { TranscriptionError, TranscriptionOption } from "../types";

// Default API key (fallback)
const DEFAULT_API_KEY = 'AIzaSyDVa1NyXAB1xAQTwSgGt8q5HP1kmCINuzE';

// Get API key from localStorage, environment variable, or use default
export const getGeminiApiKey = (): string => {
  const storedKey = localStorage.getItem('gemini_api_key');
  if (storedKey) {
    return storedKey;
  }
  
  const envKey = process.env.API_KEY;
  if (envKey) {
    return envKey;
  }
  
  // Use default API key as fallback
  return DEFAULT_API_KEY;
};

const getAI = () => {
  const apiKey = getGeminiApiKey();
  return new GoogleGenAI({ apiKey });
};

const TEXT_MODEL = 'gemini-2.5-flash';
const VISION_MODEL = 'gemini-2.5-pro';

export const generateText = async (prompt: string, images?: { mimeType: string; data: string }[]): Promise<string> => {
  try {
    const ai = getAI();
    const parts: Part[] = [{ text: prompt }];
    if (images) {
      for (const image of images) {
        parts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data,
          },
        });
      }
    }

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: { parts },
    });
    return response.text;
  } catch (error) {
    console.error("Error generating text:", error);
    if (error instanceof Error && error.message.includes('API key not configured')) {
      return "⚠️ API key not configured. Please add your Gemini API key in Settings (click the gear icon).";
    }
    return "Error: Could not generate text. Please check your API key in Settings.";
  }
};

export const createGeminiChatSession = (): Chat => {
  const ai = getAI();
  return ai.chats.create({
    model: TEXT_MODEL,
    config: {
      systemInstruction:
        'You are a helpful assistant for a note-taking app. Be concise and clear in your responses. Always use rich Markdown formatting (like **bold**, *italics*, and bulleted or numbered lists) to enhance readability and structure. Use indentation for nested lists to create clear hierarchies.',
    },
  });
};

// Keep old export name for backward compat
export const createChatSession = createGeminiChatSession;


const fileToGenerativePart = async (file: File): Promise<Part> => {
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return { text: `DOCX Content:\n${result.value}` };
  }

  const base64EncodedData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

const getBaseTranscriptionPrompt = () => `
You are an expert document transcriber. Process the provided files (images, PDFs, or DOCX) and return a JSON object with two fields:
- "html": clean, semantic HTML representing the document content
- "errors": an array describing any spelling/grammar issues (objects with "original" and "suggestion")

Always return VALID JSON only—no markdown fences or extra commentary.
`;

const getTranscriptionPrompt = (option: TranscriptionOption) => {
  const base = getBaseTranscriptionPrompt();
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

const transcriptionSchema = {
  type: Type.OBJECT,
  properties: {
    html: { type: Type.STRING },
    errors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          suggestion: { type: Type.STRING },
        },
        required: ['original', 'suggestion'],
      },
    },
  },
  required: ['html', 'errors'],
};

const parseJsonResponse = (rawText: string) => {
  const trimmed = rawText.trim();
  const fenceMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  const jsonText = fenceMatch ? fenceMatch[1] : trimmed;
  return JSON.parse(jsonText);
};

const withRetries = async <T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 1500): Promise<T> => {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : '';
      if (message.includes('model is overloaded') || message.includes('UNAVAILABLE')) {
        const delay = baseDelayMs * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      break;
    }
  }
  throw lastError;
};

export const transcribeFiles = async (
  files: File[],
  option: TranscriptionOption
): Promise<{ html: string; errors: Omit<TranscriptionError, 'id'>[] }> => {
  return withRetries(async () => {
    const ai = getAI();
    const fileParts = await Promise.all(files.map(fileToGenerativePart));
    const prompt = getTranscriptionPrompt(option);

    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: { parts: [{ text: prompt }, ...fileParts] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: transcriptionSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Transcription returned an empty response. Please try again.');
    }

    return parseJsonResponse(text);
  });
};
