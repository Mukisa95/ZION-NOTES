// FIX: The Range type is a global DOM type and should not be imported from 'react'. It is available globally in browser environments.

// ─── AI Provider ───────────────────────────────────────────────────────────────
export type AiProvider = 'openrouter' | 'gemini' | 'nvidia';

/** Provider-agnostic streaming chat session returned by aiService.createChatSession() */
export interface GenericChatSession {
  sendMessageStream(params: {
    message: string;
    images?: { mimeType: string; data: string }[];
  }): AsyncIterable<string>;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  type: 'general' | 'selection' | 'image';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  imagePreviews?: string[]; // Data URLs for displaying the user's uploaded images
  images?: { mimeType: string; data: string }[]; // Raw base64 data for sending to the AI on retry/edit
}

export type FormatType = 
  | 'bold' 
  | 'italic' 
  | 'foreColor'
  | 'justifyLeft'
  | 'justifyCenter'
  | 'justifyRight'
  | 'justifyFull'
  | 'superscript'
  | 'subscript'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'indent'
  | 'outdent';

export enum AiAction {
  SUMMARIZE_BULLETS = 'Summarize as Bullets',
  SUMMARIZE_PARAGRAPH = 'Summarize as a Paragraph',
  SUMMARIZE_SENTENCES = 'Summarize in a Few Sentences',
  SUMMARIZE_ELI5 = 'Summarize as an ELI5',
  
  EXPLAIN_SIMPLY = 'Simply',
  EXPLAIN_ANALOGY = 'With an Analogy',
  EXPLAIN_STEP_BY_STEP = 'Step-by-Step',
  EXPLAIN_KEY_CONCEPTS = 'Key Concepts',

  EXPAND = 'Expand',
  STYLE_ACADEMIC = 'Academic',
  STYLE_FORMAL = 'Formal',
  STYLE_CASUAL = 'Casual',
  STYLE_CUSTOM = 'Custom Style...',
  TONE_CONFIDENT = 'Confident',
  TONE_FRIENDLY = 'Friendly',
  TONE_PROFESSIONAL = 'Professional',
  TONE_CUSTOM = 'Custom Tone...',
  CONTINUE_WRITING = 'Continue Writing',
  FIND_ALTERNATIVES = 'Find Alternatives',
  CUSTOM_PROMPT = 'Custom Prompt',
  ANSWER_DIRECT = 'Direct',
  ANSWER_OPTIONS = 'Options',
  ANSWER_EXPLANATION = 'Explanation',
  ANSWER_KEY_POINTS = 'Key Points',
  HELP_ME_THINK = 'Let me help you think',
  PROMPT_WITH_IMAGE = 'Ask AI about Image',
  DEEP_VOCABULARY = 'Deep Vocabulary',
}

export interface AiPreviewState {
  isOpen: boolean;
  isLoading: boolean;
  content: string;
  originalSelection: Range | null;
  originalAction: {
    action: AiAction;
    customPrompt?: string;
  } | null;
}

export interface NoteEditorHandles {
  format: (type: FormatType, value?: string) => void;
  clear: () => void;
  appendText: (html: string) => void;
  find: (query: string, options: { matchCase: boolean }) => { total: number; current: number; };
  findNavigate: (direction: 'next' | 'prev') => { total: number; current: number; };
  clearHighlights: () => void;
  focus: () => void;
  getSelectionHtml: () => string | null;
  openSelectionMenu: () => void;
}

export type TranscriptionOption =
  | 'original'
  | 'correct'
  | 'organize'
  | 'summarize';

export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  order: number;
  type: 'image' | 'pdf';
}

export interface TranscriptionError {
  id: string;
  original: string;
  suggestion: string;
}