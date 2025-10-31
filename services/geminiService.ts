import { GoogleGenAI, Chat, Part } from "@google/genai";

// Default API key (fallback)
const DEFAULT_API_KEY = 'AIzaSyDVa1NyXAB1xAQTwSgGt8q5HP1kmCINuzE';

// Get API key from localStorage, environment variable, or use default
const getApiKey = (): string => {
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
  const apiKey = getApiKey();
  return new GoogleGenAI({ apiKey });
};

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
      model: 'gemini-2.5-flash',
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

export const createChatSession = (): Chat => {
  const ai = getAI();
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: 'You are a helpful assistant for a note-taking app. Be concise and clear in your responses. Always use rich Markdown formatting (like **bold**, *italics*, and bulleted or numbered lists) to enhance readability and structure. Use indentation for nested lists to create clear hierarchies.',
    },
  });
};
