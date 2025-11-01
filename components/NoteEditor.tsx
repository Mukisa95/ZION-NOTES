import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { ContextMenuState, AiAction, AiPreviewState, FormatType, NoteEditorHandles } from '../types';
import { generateText } from '../services/geminiService';
import { PromptModal } from './PromptModal';
import { AiPreviewModal } from './AiPreviewModal';
import { markdownToHtml, markdownToPlainText } from '../utils/markdown';
import { parse as parseInline } from '../utils/markdownParser';
import { SummarizeIcon, ExpandIcon, StyleIcon, ContinueIcon, SparklesIcon, MessageIcon, PenIcon, QuestionIcon, ChevronRightIcon, CheckIcon, ListChecksIcon, LightBulbIcon, StarIcon, AcademicIcon, FormalIcon, CasualIcon, ToneIcon, ConfidentIcon, FriendlyIcon, ProfessionalIcon, ListNumberedIcon, AlternativesIcon, ListIcon, BrainIcon } from './icons';
import { ImageControls } from './ImageControls';
import { TableControls } from './TableControls';
import { CropModal } from './CropModal';

interface DocumentOption {
  id: string;
  name: string;
}

interface NoteEditorProps {
  content: string;
  setContent: (content: string) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  onOpenHelpMeThink: () => void;
  zoomLevel: number;
  onToggleFind: (visible: boolean) => void;
  availableDocuments?: DocumentOption[];
  currentDocumentId?: string;
  onSwitchDocument?: (documentId: string) => void;
  onInsertToDocument?: (documentId: string, content: string) => void;
}

const imageElementToDataUrl = (img: HTMLImageElement): Promise<string> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'Anonymous';

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      ctx.drawImage(image, 0, 0);
      try {
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(new Error(`Could not convert canvas to data URL: ${e}`));
      }
    };

    image.onerror = () => {
      reject(new Error(`Could not load image from src: ${img.src}`));
    };

    image.src = img.src;
  });
};

// Helper function to calculate menu position with viewport boundary detection
const calculateMenuPosition = (x: number, y: number, menuWidth: number = 240, menuHeight: number = 400) => {
  const padding = 10; // Padding from viewport edges
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let adjustedX = x;
  let adjustedY = y;
  
  // Check right boundary
  if (x + menuWidth > viewportWidth - padding) {
    adjustedX = viewportWidth - menuWidth - padding;
  }
  
  // Check left boundary
  if (adjustedX < padding) {
    adjustedX = padding;
  }
  
  // Check bottom boundary
  if (y + menuHeight > viewportHeight - padding) {
    adjustedY = viewportHeight - menuHeight - padding;
  }
  
  // Check top boundary
  if (adjustedY < padding) {
    adjustedY = padding;
  }
  
  return { x: adjustedX, y: adjustedY };
};

const ContextMenu: React.FC<{
  state: ContextMenuState;
  onAction: (action: AiAction, customPrompt?: string) => void;
  onClose: () => void;
}> = ({ state, onAction, onClose }) => {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: state.x, y: state.y });

  useEffect(() => {
    if (!state.visible) {
      setActiveSubMenu(null);
    } else {
      // Calculate adjusted position when menu becomes visible
      const menuWidth = 240; // w-56 sm:w-60 approximate width
      const menuHeight = menuRef.current?.offsetHeight || 400;
      const adjusted = calculateMenuPosition(state.x, state.y, menuWidth, menuHeight);
      setPosition(adjusted);
    }
  }, [state.visible, state.x, state.y]);

  if (!state.visible) return null;

  const menuItems = {
    general: [
      { label: 'Prompt AI', icon: <PenIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.CUSTOM_PROMPT) },
      { label: AiAction.HELP_ME_THINK, icon: <BrainIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.HELP_ME_THINK) },
    ],
    selection: [
      {
        label: 'Answer Question(s)',
        icon: <QuestionIcon className="h-5 w-5 mr-3" />,
        subMenu: [
          { label: AiAction.ANSWER_DIRECT, icon: <CheckIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.ANSWER_DIRECT) },
          { label: AiAction.ANSWER_OPTIONS, icon: <ListChecksIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.ANSWER_OPTIONS) },
          { label: AiAction.ANSWER_EXPLANATION, icon: <LightBulbIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.ANSWER_EXPLANATION) },
          { label: AiAction.ANSWER_KEY_POINTS, icon: <StarIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.ANSWER_KEY_POINTS) },
        ]
      },
      {
        label: 'Summarize',
        icon: <SummarizeIcon className="h-5 w-5 mr-3" />,
        subMenu: [
          { label: 'As Bullets', icon: <ListIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.SUMMARIZE_BULLETS) },
          { label: 'As a Paragraph', icon: <SummarizeIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.SUMMARIZE_PARAGRAPH) },
          { label: 'A Few Sentences', icon: <PenIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.SUMMARIZE_SENTENCES) },
          { label: 'As an ELI5', icon: <LightBulbIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.SUMMARIZE_ELI5) },
        ]
      },
      {
        label: 'Explain',
        icon: <LightBulbIcon className="h-5 w-5 mr-3" />,
        subMenu: [
          { label: AiAction.EXPLAIN_SIMPLY, icon: <PenIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.EXPLAIN_SIMPLY) },
          { label: AiAction.EXPLAIN_ANALOGY, icon: <LightBulbIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.EXPLAIN_ANALOGY) },
          { label: AiAction.EXPLAIN_STEP_BY_STEP, icon: <ListNumberedIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.EXPLAIN_STEP_BY_STEP) },
          { label: AiAction.EXPLAIN_KEY_CONCEPTS, icon: <StarIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.EXPLAIN_KEY_CONCEPTS) },
        ]
      },
      {
        label: 'Style Changes',
        icon: <StyleIcon className="h-5 w-5 mr-3" />,
        subMenu: [
          { label: AiAction.STYLE_ACADEMIC, icon: <AcademicIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.STYLE_ACADEMIC) },
          { label: AiAction.STYLE_FORMAL, icon: <FormalIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.STYLE_FORMAL) },
          { label: AiAction.STYLE_CASUAL, icon: <CasualIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.STYLE_CASUAL) },
          { label: AiAction.STYLE_CUSTOM, icon: <SparklesIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.STYLE_CUSTOM) },
        ]
      },
      {
        label: 'Tone Adjustments',
        icon: <ToneIcon className="h-5 w-5 mr-3" />,
        subMenu: [
          { label: AiAction.TONE_CONFIDENT, icon: <ConfidentIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.TONE_CONFIDENT) },
          { label: AiAction.TONE_FRIENDLY, icon: <FriendlyIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.TONE_FRIENDLY) },
          { label: AiAction.TONE_PROFESSIONAL, icon: <ProfessionalIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.TONE_PROFESSIONAL) },
          { label: AiAction.TONE_CUSTOM, icon: <SparklesIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.TONE_CUSTOM) },
        ]
      },
      { label: AiAction.EXPAND, icon: <ExpandIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.EXPAND) },
      { label: AiAction.FIND_ALTERNATIVES, icon: <AlternativesIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.FIND_ALTERNATIVES) },
      { label: AiAction.CONTINUE_WRITING, icon: <ContinueIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.CONTINUE_WRITING) },
      { label: 'Custom Prompt...', icon: <SparklesIcon className="h-5 w-5 mr-3" />, action: () => onAction(AiAction.CUSTOM_PROMPT) },
    ],
    image: [
        { label: AiAction.PROMPT_WITH_IMAGE, icon: <SparklesIcon className="h-5 w-5 mr-3 text-blue-500" />, action: () => onAction(AiAction.PROMPT_WITH_IMAGE) },
    ],
  };


  const itemsToShow = state.type === 'image' ? menuItems.image : (state.type === 'selection' ? menuItems.selection : menuItems.general);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}></div>
      <div
        ref={menuRef}
        style={{ top: position.y, left: position.x }}
        className="fixed z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-56 sm:w-60 animate-fade-in-fast max-h-[80vh] overflow-y-auto"
        data-context-menu="true"
      >
        <ul className="p-1.5 sm:p-2">
          {itemsToShow.map(item => (
            <li 
              key={item.label}
              className="relative"
            >
              <button
                onClick={(e) => { 
                  e.stopPropagation();
                  if (item.subMenu) {
                    // Toggle submenu
                    setActiveSubMenu(activeSubMenu === item.label ? null : item.label);
                  } else if (item.action) {
                    // Execute action and close menu
                    item.action(); 
                    onClose(); 
                  }
                }}
                className="w-full flex items-center px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-md transition-colors"
              >
                <div className="flex-shrink-0 mr-2 sm:mr-3">
                  {React.cloneElement(item.icon, { className: "h-4 w-4 sm:h-5 sm:w-5" })}
                </div>
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.subMenu && (
                  <ChevronRightIcon className={`h-3 w-3 sm:h-4 sm:w-4 text-gray-400 transition-transform ${activeSubMenu === item.label ? 'rotate-90' : ''}`} />
                )}
              </button>
              {item.subMenu && activeSubMenu === item.label && (
                <div className="mt-1 ml-4 sm:ml-6 bg-gray-50/90 dark:bg-gray-700/90 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 animate-fade-in-fast">
                  <ul className="p-1.5 sm:p-2">
                    {item.subMenu.map(subItem => (
                      <li key={subItem.label}>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation();
                            subItem.action(); 
                            onClose(); 
                          }}
                          className="w-full flex items-center px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 rounded-md transition-colors"
                        >
                          <div className="flex-shrink-0 mr-2 sm:mr-3">
                            {React.cloneElement(subItem.icon, { className: "h-3.5 w-3.5 sm:h-4 sm:w-4" })}
                          </div>
                          <span className="flex-1 text-left truncate">{subItem.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};


export const NoteEditor = forwardRef<NoteEditorHandles, NoteEditorProps>(({ content, setContent, scrollContainerRef, onOpenHelpMeThink, zoomLevel, onToggleFind, availableDocuments = [], currentDocumentId, onSwitchDocument, onInsertToDocument }, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, type: 'general' });
  const [selectionButton, setSelectionButton] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });
  const [isPromptModalOpen, setIsPromptModalOpen] = useState<boolean>(false);
  const [promptContext, setPromptContext] = useState<{ text: string, prefix: string }>({ text: '', prefix: '' });
  const [promptInitiator, setPromptInitiator] = useState<AiAction | null>(null);
  const [previewState, setPreviewState] = useState<AiPreviewState>({ isOpen: false, isLoading: false, content: '', originalAction: null, originalSelection: null });
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [cropState, setCropState] = useState<{isOpen: boolean; imageEl: HTMLImageElement | null}>({ isOpen: false, imageEl: null });
  const [promptImageContext, setPromptImageContext] = useState<string | null>(null);
  const [contextSelectionImages, setContextSelectionImages] = useState<string[]>([]);

  // Refs for Find & Replace
  const searchResultsRef = useRef<{ ranges: Range[], currentIndex: number }>({ ranges: [], currentIndex: -1 });
  // @ts-ignore: CSS.highlights is a new API and might not be in all TS lib versions.
  const highlightsRef = useRef<{ all: Highlight, current: Highlight } | null>(null);


  const triggerUpdate = () => {
    if (!editorRef.current) return;
    const event = new Event('input', { bubbles: true, cancelable: true });
    editorRef.current.dispatchEvent(event);
  };

  const restoreSelection = (range: Range | null) => {
    if (range) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  const handleTextUpdate = useCallback((htmlToInsert: string, range?: Range | null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    if (range) {
        restoreSelection(range);
    }
    
    document.execCommand('insertHTML', false, htmlToInsert);
  }, []);
  
  const handleAiAction = useCallback(async (action: AiAction, customPrompt?: string, images?: { mimeType: string; data: string }[]) => {
    if (action === AiAction.HELP_ME_THINK) {
        onOpenHelpMeThink();
        return;
    }
    
    if (action === AiAction.PROMPT_WITH_IMAGE) {
        if (selectedElement && selectedElement.tagName === 'IMG') {
            const imageSrc = (selectedElement as HTMLImageElement).src;
            setPromptImageContext(imageSrc);
            setPromptInitiator(action);
            setIsPromptModalOpen(true);
        }
        return;
    }

    const dataUrlToImageObject = (dataUrl: string): { mimeType: string; data: string } | null => {
        const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
        if (!match) return null;
        return { mimeType: match[1], data: match[2] };
    };

    let imagesToSend = images;
    if (contextSelectionImages.length > 0) {
        imagesToSend = contextSelectionImages
            .map(dataUrlToImageObject)
            .filter((img): img is { mimeType: string; data: string } => img !== null);
    }

    let prompt = '';
    const selectedText = selectionRef.current ? selectionRef.current.toString().trim() : '';

    const contentBeforeSelection = () => {
        if (!editorRef.current || !selectionRef.current) return '';
        const range = document.createRange();
        range.setStart(editorRef.current, 0);
        range.setEnd(selectionRef.current.startContainer, selectionRef.current.startOffset);
        return range.toString();
    }

    switch (action) {
      case AiAction.ANSWER_DIRECT:
        prompt = `Your task is to analyze the ENTIRE text and any images provided below and answer every question the text contains. The text may be divided into sections with their own headings (e.g., "Questions 1-5", "Part B"). Your response MUST preserve this structure.

**Output Format:**
- Create a main heading: "### Answered Questions".
- For EACH section found in the original text:
    - Repeat the original section heading exactly as it appears (e.g., using Markdown for emphasis if present).
    - Then, for EACH question within that section:
        - Restate the question in **bold**.
        - Provide the direct, concise answer on the next line, considering information from both the text and images.
        - Add a blank line before the next question.
- Ensure you process ALL sections and ALL questions from the provided text from start to finish.

**Text to Process:**
---
${selectedText}
---`;
        break;
      case AiAction.ANSWER_OPTIONS:
        prompt = `Your task is to analyze the ENTIRE text and any images provided below and provide several possible answer options for every question the text contains. The text may be divided into sections with their own headings (e.g., "Questions 1-5", "Part B"). Your response MUST preserve this structure.

**Output Format:**
- Create a main heading: "### Answer Options".
- For EACH section found in the original text:
    - Repeat the original section heading exactly as it appears.
    - Then, for EACH question within that section:
        - Restate the question in **bold**.
        - Provide a bulleted list of all possible answer options based on the text and images. Use indented, nested bullet points for any sub-details if necessary.
        - Add a blank line before the next question.
- Ensure you process ALL sections and ALL questions from the provided text from start to finish.

**Text to Process:**
---
${selectedText}
---`;
        break;
      case AiAction.ANSWER_EXPLANATION:
        prompt = `Your task is to analyze the ENTIRE text and any images provided below and answer every question with a detailed explanation. The text may be divided into sections with their own headings (e.g., "Questions 1-5", "Part B"). Your response MUST preserve this structure.

**Output Format:**
- Create a main heading: "### Answers with Explanations".
- For EACH section found in the original text:
    - Repeat the original section heading exactly as it appears.
    - Then, for EACH question within that section:
        - Restate the question in **bold**.
        - Provide the direct answer on the next line, considering both text and images.
        - Provide a detailed explanation formatted as an indented blockquote (start each line with '> ').
        - Add a blank line before the next question.
- Ensure you process ALL sections and ALL questions from the provided text from start to finish.

**Text to Process:**
---
${selectedText}
---`;
        break;
      case AiAction.ANSWER_KEY_POINTS:
        prompt = `Your task is to analyze the ENTIRE text and any images provided below and answer every question with key points. The text may be divided into sections with their own headings (e.g., "Questions 1-5", "Part B"). Your response MUST preserve this structure.

**Output Format:**
- Create a main heading: "### Answers with Key Points".
- For EACH section found in the original text:
    - Repeat the original section heading exactly as it appears.
    - Then, for EACH question within that section:
        - Restate the question in **bold**.
        - Provide the direct answer on the next line based on the text and images.
        - Add the subheading "#### Key Points".
        - Provide the key points formatted as an indented blockquote (start each line with '> ').
        - Add a blank line before the next question.
- Ensure you process ALL sections and ALL questions from the provided text from start to finish.

**Text to Process:**
---
${selectedText}
---`;
        break;
      case AiAction.SUMMARIZE_BULLETS:
        prompt = `Summarize the following text and image(s) into a concise set of bullet points. Use rich Markdown formatting. Use nested bullet points for sub-topics where appropriate.\n\n"${selectedText}"`;
        break;
      case AiAction.SUMMARIZE_PARAGRAPH:
        prompt = `Summarize the following text and image(s) into a single, well-structured paragraph. The summary should be concise and capture the main points.\n\n"${selectedText}"`;
        break;
      case AiAction.SUMMARIZE_SENTENCES:
        prompt = `Summarize the following text and image(s) in just a few sentences (2-3 sentences max). Be as concise as possible while retaining the core message.\n\n"${selectedText}"`;
        break;
      case AiAction.SUMMARIZE_ELI5:
        prompt = `Explain the following text and image(s) like I'm five years old (ELI5). Use simple language and analogies to make it easy to understand. Format the response with rich Markdown.\n\n"${selectedText}"`;
        break;
      case AiAction.EXPLAIN_SIMPLY:
        prompt = `Explain the following text and image(s) in simple, clear, and easy-to-understand terms. Avoid jargon where possible. Structure your response using rich Markdown for clarity (e.g., using bold for key terms and bullet points for lists).\n\n"${selectedText}"`;
        break;
      case AiAction.EXPLAIN_ANALOGY:
        prompt = `Explain the core concept of the following text and image(s) using a simple and effective analogy. The goal is to make it highly relatable and easy to grasp. Use rich Markdown to format the explanation.\n\n"${selectedText}"`;
        break;
      case AiAction.EXPLAIN_STEP_BY_STEP:
        prompt = `Break down the following process, concept, text, or image(s) into a step-by-step explanation. Use a numbered list (\`1.\`, \`2.\`, etc.) and provide clear, concise language for each step. Ensure the output uses rich Markdown formatting.\n\n"${selectedText}"`;
        break;
      case AiAction.EXPLAIN_KEY_CONCEPTS:
        prompt = `Identify and explain the key concepts or terms within the following text and image(s). Present them as a bulleted list. For each item, make the key concept **bold** followed by its explanation. Use rich Markdown formatting.\n\n"${selectedText}"`;
        break;
      case AiAction.EXPAND:
        prompt = `Expand on the following topic, using the provided text and image(s) as a starting point. Please structure your response using rich Markdown, with headings (\`###\`) for sub-topics, **bold** for important terms, *italics* for emphasis, and bulleted or numbered lists. Use indentation for nested lists to structure information clearly.\n\n"${selectedText}"`;
        break;
      case AiAction.CONTINUE_WRITING:
        prompt = `Continue writing from this point, maintaining the original tone and style. Consider any images that might be part of the context. Where appropriate, use rich Markdown for formatting (like lists, *italics*, or **bold**) to enhance the text.\n\n"${contentBeforeSelection()}"`;
        break;
      case AiAction.FIND_ALTERNATIVES:
        const isSingleWord = selectedText.split(/\s+/).length === 1;
        if (isSingleWord) {
          prompt = `Provide a list of synonyms for the word: '${selectedText}'. Format the response as a simple bulleted list in Markdown.`;
        } else {
          prompt = `Provide several alternative phrasings for the following sentence: '${selectedText}'. Each alternative should be a complete sentence. Format the response as a bulleted list in Markdown.`;
        }
        break;
      case AiAction.STYLE_ACADEMIC:
        prompt = `Rewrite the following text in a formal, academic style. Use precise terminology, objective language, and a well-structured format. Ensure the output uses rich Markdown for clarity.\n\n"${selectedText}"`;
        break;
      case AiAction.STYLE_FORMAL:
        prompt = `Rewrite the following text in a more formal tone. Ensure the output is well-structured. Use rich Markdown for formatting if necessary to maintain structure and clarity.\n\n"${selectedText}"`;
        break;
      case AiAction.STYLE_CASUAL:
        prompt = `Rewrite the following text in a more casual, conversational tone. Feel free to use Markdown formatting like *italics* or **bold** to add emphasis where it fits the casual style.\n\n"${selectedText}"`;
        break;
      case AiAction.STYLE_CUSTOM:
        setPromptInitiator(AiAction.STYLE_CUSTOM);
        setPromptContext({
          text: selectedText,
          prefix: 'Describe the style to apply (e.g., "like a pirate", "simple and direct")...'
        });
        setIsPromptModalOpen(true);
        return;
      case AiAction.TONE_CONFIDENT:
        prompt = `Rewrite the following text in a confident and assertive tone. Use clear, direct language. Use Markdown for emphasis where needed.\n\n"${selectedText}"`;
        break;
      case AiAction.TONE_FRIENDLY:
        prompt = `Rewrite the following text in a friendly and approachable tone. Make it sound warm and conversational. Use Markdown for emphasis where needed.\n\n"${selectedText}"`;
        break;
      case AiAction.TONE_PROFESSIONAL:
        prompt = `Rewrite the following text in a professional, clear, and courteous tone suitable for a business context. Use Markdown for formatting if necessary.\n\n"${selectedText}"`;
        break;
      case AiAction.TONE_CUSTOM:
        setPromptInitiator(AiAction.TONE_CUSTOM);
        setPromptContext({
          text: selectedText,
          prefix: 'Describe the tone to apply (e.g., "urgent but reassuring", "enthusiastic")...'
        });
        setIsPromptModalOpen(true);
        return;
      case AiAction.CUSTOM_PROMPT:
        if (customPrompt) {
          prompt = customPrompt.includes('{text}') ? customPrompt.replace('{text}', `"${selectedText}"`) : `${customPrompt}\n\n"${selectedText}"`;
        } else {
          setPromptInitiator(AiAction.CUSTOM_PROMPT);
          setPromptContext({
            text: selectedText,
            prefix: selectedText ? 'Prompt for selected text...' : 'Generate content...'
          });
          setIsPromptModalOpen(true);
          return;
        }
        break;
    }

    setPreviewState({
      isOpen: true,
      isLoading: true,
      content: '',
      originalAction: { action, customPrompt },
      originalSelection: selectionRef.current ? selectionRef.current.cloneRange() : null,
    });

    try {
      const aiResponseMarkdown = await generateText(prompt, imagesToSend);
      setPreviewState(prevState => ({
        ...prevState,
        isLoading: false,
        content: aiResponseMarkdown,
      }));
    } catch (error) {
      console.error("AI action failed:", error);
      setPreviewState(prevState => ({
        ...prevState,
        isLoading: false,
        content: "Sorry, I couldn't get a response. Please try again or check the console for errors.",
      }));
    }
  }, [promptInitiator, promptContext.text, onOpenHelpMeThink, selectedElement, contextSelectionImages]);

  const handleContextMenu = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const selection = window.getSelection();
    const target = e.target as HTMLElement;

    setContextSelectionImages([]); // Reset images on each context menu open

    if (target.tagName === 'IMG' && (!selection || selection.isCollapsed)) {
        setSelectedElement(target);
        const adjusted = calculateMenuPosition(e.clientX, e.clientY);
        setContextMenu({
            visible: true,
            x: adjusted.x,
            y: adjusted.y,
            type: 'image',
        });
        return;
    }
    
    if (selection && selection.rangeCount > 0) {
      selectionRef.current = selection.getRangeAt(0).cloneRange();
    } else {
      selectionRef.current = null;
    }

    // For text selection, don't show menu automatically - button will do it
    // Only show general menu on right-click in empty space
    if (!selection || selection.isCollapsed) {
      if (selection && selection.rangeCount > 0) {
        selectionRef.current = selection.getRangeAt(0).cloneRange();
      }
      const adjusted = calculateMenuPosition(e.clientX, e.clientY);
      setContextMenu({
        visible: true,
        x: adjusted.x,
        y: adjusted.y,
        type: 'general',
      });
    }
  };

  // Handle selection button click to show menu
  const handleSelectionButtonClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Selection button clicked');
    const selection = window.getSelection();
    
    if (selection && !selection.isCollapsed && selectionRef.current) {
      const fragment = selectionRef.current.cloneContents();
      const imagesInSelection = Array.from(fragment.querySelectorAll('img'));
      
      if (imagesInSelection.length > 0) {
        try {
          const imagePromises = imagesInSelection.map(imageElementToDataUrl);
          const imgSrcs = await Promise.all(imagePromises);
          setContextSelectionImages(imgSrcs);
        } catch (error) {
          console.error("Error processing selected images for AI context:", error);
          setContextSelectionImages([]);
        }
      }

      const adjusted = calculateMenuPosition(selectionButton.x, selectionButton.y);
      setContextMenu({
        visible: true,
        x: adjusted.x,
        y: adjusted.y,
        type: 'selection',
      });
      setSelectionButton({ visible: false, x: 0, y: 0 });
    }
  };

  // Detect text selection and show floating button
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      
      if (!editorRef.current || !selection || selection.rangeCount === 0) {
        setSelectionButton({ visible: false, x: 0, y: 0 });
        return;
      }

      // Check if selection is within our editor
      const range = selection.getRangeAt(0);
      if (!editorRef.current.contains(range.commonAncestorContainer)) {
        setSelectionButton({ visible: false, x: 0, y: 0 });
        return;
      }

      if (!selection.isCollapsed && selection.toString().trim().length > 0) {
        // Save selection
        selectionRef.current = range.cloneRange();
        
        // Calculate button position at end of selection
        const rect = range.getBoundingClientRect();
        const buttonX = rect.right + 5;
        const buttonY = rect.bottom + 5;
        
        setSelectionButton({ visible: true, x: buttonX, y: buttonY });
      } else {
        setSelectionButton({ visible: false, x: 0, y: 0 });
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handleFormat = (command: FormatType, value?: string) => {
    if (!editorRef.current) return;
    
    // Save the selection before any operations
    const selection = window.getSelection();
    const savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
    
    // Handle list commands specially
    if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
      console.log('Creating list:', command);
      const success = document.execCommand(command, false, value);
      console.log('execCommand result:', success);
      
      // If command succeeded, style the list
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          let element = range.commonAncestorContainer as Node;
          
          if (element.nodeType === Node.TEXT_NODE) {
            element = element.parentNode as Node;
          }
          
          const list = (element as HTMLElement).closest('ul, ol');
          console.log('Found list after command:', list?.tagName);
          
          if (list) {
            const htmlList = list as HTMLElement;
            const existingStyle = htmlList.getAttribute('style') || '';
            
            // Don't override existing styles, just add missing ones
            if (!existingStyle.includes('margin')) {
              htmlList.style.margin = '0.5em 0';
            }
            if (!existingStyle.includes('padding-left')) {
              htmlList.style.paddingLeft = '2em';
            }
            
            htmlList.style.listStyleType = command === 'insertUnorderedList' ? 'disc' : 'decimal';
            htmlList.style.listStylePosition = 'outside';
            
            // Style list items
            const items = htmlList.querySelectorAll('li');
            console.log('Styling', items.length, 'list items');
            items.forEach(li => {
              const htmlLi = li as HTMLElement;
              const existingLiStyle = htmlLi.getAttribute('style') || '';
              
              if (!existingLiStyle.includes('margin-bottom')) {
                htmlLi.style.marginBottom = '0.3em';
              }
              if (!existingLiStyle.includes('line-height')) {
                htmlLi.style.lineHeight = '1.5';
              }
              htmlLi.style.display = 'list-item';
            });
          }
        }
    triggerUpdate();
      }, 50);
    } else {
      // For non-list commands, preserve selection
      document.execCommand(command, false, value);
      
      // Update content but restore selection immediately after
      if (editorRef.current) {
        setContent(editorRef.current.innerHTML);
      }
      
      // Restore selection after state update
      requestAnimationFrame(() => {
        if (savedRange && selection) {
          try {
            selection.removeAllRanges();
            selection.addRange(savedRange);
          } catch (e) {
            console.debug('Could not restore selection:', e);
          }
        }
      });
    }
  };
  
  const handleClear = () => {
    setContent('<p><br></p>');
  };
  
  const appendText = (htmlToInsert: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const selection = window.getSelection();
    if (selection) {
        const range = document.createRange();
        // Move cursor to the end of the editor's content
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        handleTextUpdate(htmlToInsert, range);
    }
  };

  useImperativeHandle(ref, () => ({
    format: handleFormat,
    clear: handleClear,
    appendText: appendText,
    getSelectionHtml: () => {
        const selection = window.getSelection();
        // Ensure the selection exists, is not collapsed, and is within the editor
        if (!selection || selection.isCollapsed || !editorRef.current || !editorRef.current.contains(selection.anchorNode)) {
            return null;
        }
        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();
        const div = document.createElement('div');
        div.appendChild(fragment);
        return div.innerHTML;
    },
    focus: () => editorRef.current?.focus(),
    find: (query, options) => {
      if (!highlightsRef.current) return { total: 0, current: 0 };
      highlightsRef.current.all.clear();
      highlightsRef.current.current.clear();
      searchResultsRef.current = { ranges: [], currentIndex: -1 };

      if (!query || !editorRef.current) return { total: 0, current: 0 };
      
      const ranges = [];
      const treeWalker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
      let node;
      while (node = treeWalker.nextNode()) {
          const text = node.nodeValue || '';
          const searchFlags = options.matchCase ? 'g' : 'gi';
          const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), searchFlags);
          let match;
          while (match = regex.exec(text)) {
              const range = document.createRange();
              range.setStart(node, match.index);
              range.setEnd(node, match.index + query.length);
              ranges.push(range);
          }
      }
      
      searchResultsRef.current.ranges = ranges;
      highlightsRef.current.all.add(...ranges);

      if (ranges.length > 0) {
          searchResultsRef.current.currentIndex = 0;
          highlightsRef.current.current.add(ranges[0]);
          const rect = ranges[0].getBoundingClientRect();
          const containerRect = scrollContainerRef.current?.getBoundingClientRect();
          if (containerRect) {
            scrollContainerRef.current?.scrollTo({ 
              top: scrollContainerRef.current.scrollTop + rect.top - containerRect.top - 100, 
              behavior: 'smooth' 
            });
          }
      }
      
      return { total: ranges.length, current: ranges.length > 0 ? 1 : 0 };
    },
    findNavigate: (direction) => {
      const { ranges, currentIndex } = searchResultsRef.current;
      if (ranges.length === 0) return { total: 0, current: 0 };
      
      let nextIndex = currentIndex;
      if (direction === 'next') {
          nextIndex = (currentIndex + 1) % ranges.length;
      } else {
          nextIndex = (currentIndex - 1 + ranges.length) % ranges.length;
      }
      
      searchResultsRef.current.currentIndex = nextIndex;
      
      if(highlightsRef.current) highlightsRef.current.current.clear();
      if(highlightsRef.current) highlightsRef.current.current.add(ranges[nextIndex]);
      
      const rect = ranges[nextIndex].getBoundingClientRect();
      const containerRect = scrollContainerRef.current?.getBoundingClientRect();
      if (containerRect) {
        scrollContainerRef.current?.scrollTo({ 
          top: scrollContainerRef.current.scrollTop + rect.top - containerRect.top - 100, 
          behavior: 'smooth' 
        });
      }

      return { total: ranges.length, current: nextIndex + 1 };
    },
    clearHighlights: () => {
      if (highlightsRef.current) {
        highlightsRef.current.all.clear();
        highlightsRef.current.current.clear();
      }
      searchResultsRef.current = { ranges: [], currentIndex: -1 };
    },
    openSelectionMenu: () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setContextMenu({
          visible: true,
          x: rect.right,
          y: rect.bottom + 10,
          type: 'selection'
        });
      }
    },
    insertAtCursor: (html: string) => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && editorRef.current) {
        const range = selection.getRangeAt(0);
        handleTextUpdate(html, range);
      } else if (editorRef.current) {
        // No selection, insert at end
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        handleTextUpdate(html, range);
      }
    },
  }));

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML;
    if (content !== newContent) {
      setContent(newContent);
    }
  };
  
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const clipboardData = e.clipboardData;
    const items = clipboardData.items;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
            e.preventDefault(); // We will handle the paste ourselves
            const file = item.getAsFile();
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const dataUrl = event.target?.result;
                    if (dataUrl) {
                        const imgHtml = `<img src="${dataUrl}" style="max-width: 100%; height: auto; width: 500px;" alt="Pasted image" />`;
                        document.execCommand('insertHTML', false, imgHtml);
                        triggerUpdate();
                    }
                };
                reader.readAsDataURL(file);
            }
            return; // Stop after handling the first image
        }
    }
  };

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
    setContextSelectionImages([]);
    setSelectionButton({ visible: false, x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (contextMenu.visible) {
      window.addEventListener('click', closeContextMenu);
      return () => window.removeEventListener('click', closeContextMenu);
    }
  }, [contextMenu.visible, closeContextMenu]);

  useEffect(() => {
      if (editorRef.current && content !== editorRef.current.innerHTML) {
          editorRef.current.innerHTML = content;
      }
  }, [content]);

  // ContentEditable element selection logic
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
        setSelectedElement(target);
    } else if (target.closest('table')) {
        setSelectedElement(target.closest('table'));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't close if clicking on control elements, context menu, or modal
      if (target.closest('[data-control-element]') || target.closest('[data-context-menu]') || target.closest('[data-modal]')) {
        return;
      }
      
      // Don't close selection button if clicking inside editor
      if (editorRef.current && editorRef.current.contains(target)) {
        // Only clear selectedElement if clicking somewhere else in the editor
        if (selectedElement && target !== selectedElement && !selectedElement.contains(target)) {
          setSelectedElement(null);
        }
        return;
      }
      
      // Clicking outside editor - clear everything
      if (editorRef.current && !editorRef.current.contains(target)) {
        setSelectedElement(null);
        setSelectionButton({ visible: false, x: 0, y: 0 });
        return;
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedElement]);

  const handleContentUpdate = () => {
      if(editorRef.current) {
          setContent(editorRef.current.innerHTML);
          setSelectedElement(prev => prev ? prev.cloneNode(true) as HTMLElement : null);
      }
  };

  const handleCropRequest = (imageEl: HTMLImageElement) => {
    setCropState({ isOpen: true, imageEl });
  };

  const handleApplyCrop = (newSrc: string) => {
    if (cropState.imageEl) {
        cropState.imageEl.src = newSrc;
        handleContentUpdate();
    }
    setCropState({ isOpen: false, imageEl: null });
  };
  
  const handleReplace = () => {
    handleTextUpdate(markdownToHtml(previewState.content), previewState.originalSelection);
    setPreviewState({ ...previewState, isOpen: false });
  };
  const handleInsertAfter = () => {
    if (previewState.originalSelection) {
      const range = previewState.originalSelection.cloneRange();
      range.collapse(false);
      handleTextUpdate(markdownToHtml(previewState.content), range);
    }
    setPreviewState({ ...previewState, isOpen: false });
  };
  const handleInsert = () => {
    handleTextUpdate(markdownToHtml(previewState.content), previewState.originalSelection);
    setPreviewState({ ...previewState, isOpen: false });
  };
  const handleRetake = () => {
    if (previewState.originalAction) {
      setPreviewState({ ...previewState, isOpen: false });
      handleAiAction(previewState.originalAction.action, previewState.originalAction.customPrompt);
    }
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(markdownToPlainText(previewState.content));
  };
  const handleFollowUpPrompt = () => {
    setPromptInitiator(AiAction.CUSTOM_PROMPT);
    setPromptContext({
        text: previewState.content,
        prefix: 'Refine the AI response...'
    });
    setIsPromptModalOpen(true);
    setPreviewState({ ...previewState, isOpen: false });
  };
  
  const handleAlternativeClick = (alternative: string) => {
    const htmlToInsert = parseInline(alternative);
    handleTextUpdate(htmlToInsert, previewState.originalSelection);
    setPreviewState({ ...previewState, isOpen: false });
  };

  // Keyboard shortcuts and list handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Find & Replace shortcut
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        onToggleFind(true);
        return;
      }
      
      // Handle Tab in lists (indent) or in indented paragraphs (convert to list)
      if (e.key === 'Tab' && !e.shiftKey) {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) {
          node = node.parentNode as Node;
        }
        
        const li = (node as HTMLElement).closest('li');
        const p = (node as HTMLElement).closest('p.list-indent');
        
        if (li) {
          e.preventDefault();
          document.execCommand('indent', false);
          triggerUpdate();
        } else if (p) {
          // Convert indented paragraph to list item
          e.preventDefault();
          
          const pElement = p as HTMLElement;
          
          // Find the nearest list before this paragraph
          let nearestList: HTMLElement | null = null;
          let sibling = pElement.previousElementSibling;
          
          while (sibling) {
            if (sibling.tagName === 'OL' || sibling.tagName === 'UL') {
              nearestList = sibling as HTMLElement;
              break;
            }
            sibling = sibling.previousElementSibling;
          }
          
          if (nearestList) {
            // Create new list item
            const li = document.createElement('li');
            li.innerHTML = pElement.innerHTML;
            li.style.display = 'list-item';
            li.style.marginBottom = '0.3em';
            li.style.lineHeight = '1.5';
            
            // Copy alignment
            if (pElement.style.textAlign) {
              li.style.textAlign = pElement.style.textAlign;
            }
            
            // Add to the list
            nearestList.appendChild(li);
            
            // Remove the paragraph
            pElement.remove();
            
            // Focus the new list item
            const newRange = document.createRange();
            newRange.selectNodeContents(li);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            triggerUpdate();
          }
        }
      }
      
      // Handle Shift+Tab in lists (outdent)
      if (e.key === 'Tab' && e.shiftKey) {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) {
          node = node.parentNode as Node;
        }
        
        const li = (node as HTMLElement).closest('li');
        
        if (li) {
          e.preventDefault();
          document.execCommand('outdent', false);
          triggerUpdate();
        }
      }
      
      // Handle Enter in empty list items (exit list)
      if (e.key === 'Enter') {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) {
          node = node.parentNode as Node;
        }
        
        const li = (node as HTMLElement).closest('li');
        
        if (li) {
          const liElement = li as HTMLElement;
          const isEmpty = !liElement.textContent?.trim();
          
          if (isEmpty) {
            e.preventDefault();
            
            // Create new paragraph after the list
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            
            const parentList = liElement.parentElement;
            if (parentList) {
              parentList.parentNode?.insertBefore(p, parentList.nextSibling);
            }
            
            // Remove the empty list item
            liElement.remove();
            
            // Focus the new paragraph
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            triggerUpdate();
            
            // Clean up empty lists
            if (parentList && parentList.querySelectorAll('li').length === 0) {
              parentList.remove();
            }
          }
        }
      }
      
      // Handle backspace in lists (Word-like behavior)
      if (e.key === 'Backspace') {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        
        // Check if cursor is at the start of a list item
        if (range.collapsed && range.startOffset === 0) {
          let node = range.startContainer;
          if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentNode as Node;
          }
          
          const li = (node as HTMLElement).closest('li');
          
          if (li) {
            const liElement = li as HTMLElement;
            
            // Check if this is the first position in the list item
            const isAtStart = range.startContainer === li || 
                             (range.startContainer.parentNode === li && range.startOffset === 0);
            
            if (isAtStart) {
              e.preventDefault();
              
              // Check if this is an empty list item
              const isEmpty = !liElement.textContent?.trim();
              
              if (isEmpty) {
                // Empty item - remove numbering and exit list
                e.preventDefault();
                
                const parentList = liElement.parentElement;
                
                // Create normal paragraph after the list
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                
                if (parentList) {
                  parentList.parentNode?.insertBefore(p, parentList.nextSibling);
                }
                
                liElement.remove();
                
                // Focus the new paragraph
                const newRange = document.createRange();
                newRange.setStart(p, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
                
                triggerUpdate();
                
                // Clean up empty lists
                if (parentList && parentList.querySelectorAll('li').length === 0) {
                  parentList.remove();
                }
              } else {
                // Has content - convert to indented paragraph (keeps indent, removes number)
                e.preventDefault();
                
                const p = document.createElement('p');
                p.innerHTML = liElement.innerHTML;
                p.className = 'list-indent';
                p.style.marginLeft = '2em';
                p.style.marginBottom = '0.3em';
                p.style.lineHeight = '1.5';
                
                // Copy alignment
                if (liElement.style.textAlign) {
                  p.style.textAlign = liElement.style.textAlign;
                }
                
                // Insert before the list item
                const parentList = liElement.parentElement;
                if (parentList) {
                  parentList.parentNode?.insertBefore(p, parentList);
                }
                
                // Remove the list item
                liElement.remove();
                
                // Focus the new paragraph at the start
                const newRange = document.createRange();
                newRange.selectNodeContents(p);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
                
                triggerUpdate();
                
                // Clean up empty lists
                if (parentList && parentList.querySelectorAll('li').length === 0) {
                  parentList.remove();
                }
              }
            }
          }
        }
      }
      
      // Handle backspace in indented paragraphs (remove indent)
      if (e.key === 'Backspace') {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        
        if (range.collapsed && range.startOffset === 0) {
          let node = range.startContainer;
          if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentNode as Node;
          }
          
          const p = (node as HTMLElement).closest('p.list-indent');
          
          if (p) {
            const pElement = p as HTMLElement;
            
            // Check if cursor is at the very start
            const isAtStart = range.startContainer === p || 
                             (range.startContainer.parentNode === p && range.startOffset === 0);
            
            if (isAtStart) {
              e.preventDefault();
              
              // Remove indent (back to normal paragraph)
              pElement.classList.remove('list-indent');
              pElement.style.marginLeft = '0';
              
              triggerUpdate();
            }
          }
        }
      }
    };
    
    const editor = editorRef.current;
    editor?.addEventListener('keydown', handleKeyDown);
    return () => editor?.removeEventListener('keydown', handleKeyDown);
  }, [onToggleFind]);

  // Initialize Highlight API
  useEffect(() => {
    // @ts-ignore
    if (window.CSS && CSS.highlights) {
        // @ts-ignore
        const all = new Highlight();
        // @ts-ignore
        const current = new Highlight();
        // @ts-ignore
        CSS.highlights.set('search-results', all);
        // @ts-ignore
        CSS.highlights.set('current-search-result', current);
        highlightsRef.current = { all, current };
    }
  }, []);

  return (
    <>
       <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-gray-200/80 dark:border-gray-700/80" style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}>
        {/* Placeholder Text - Shows when editor is empty */}
        {(!content || content.trim() === '' || content === '<p><br></p>' || content === '<p></p>') && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none animate-fade-in-up px-4 py-8 sm:px-6 sm:py-12 md:px-8 md:py-16 lg:px-12 lg:py-24"
          >
            <div className="text-center animate-float-gentle w-full max-w-4xl">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 dark:from-blue-800 dark:via-indigo-800 dark:to-purple-800 bg-clip-text text-transparent opacity-30 mb-2 sm:mb-3 md:mb-4 lg:mb-6 tracking-wider animate-pulse-glow leading-tight">
                IMAGINE WITH ME
              </h2>
              <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-300 dark:text-gray-600 italic opacity-60 animate-pulse">
                Just start typing...
              </p>
            </div>
          </div>
        )}
        
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onClick={handleEditorClick}
          onContextMenu={handleContextMenu}
          onPaste={handlePaste}
            className="w-full leading-relaxed focus:outline-none p-8 sm:p-12 md:p-16 relative z-10"
          style={{ 
            minHeight: '80vh',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
              fontSize: '11pt',
              fontFamily: 'Calibri, Arial, sans-serif',
          }}
        />
        {selectedElement?.tagName === 'IMG' && (
            <ImageControls 
                imageEl={selectedElement as HTMLImageElement}
                editorRef={editorRef}
                onUpdate={handleContentUpdate}
                onCropRequest={handleCropRequest}
            />
        )}
        {selectedElement?.tagName === 'TABLE' && (
            <TableControls
                tableEl={selectedElement as HTMLTableElement}
                editorRef={editorRef}
                onUpdate={handleContentUpdate}
            />
        )}
      </div>
      
      
      {/* Floating Selection Button */}
      {selectionButton.visible && (
        <button
          onMouseDown={handleSelectionButtonClick}
          className="fixed z-50 p-2 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full shadow-2xl transition-all duration-200 transform hover:scale-110 active:scale-95 icon-glossy animate-fade-in-fast cursor-pointer"
          style={{
            top: selectionButton.y,
            left: selectionButton.x,
          }}
          title="AI Actions"
          data-control-element="true"
          data-selection-button="true"
        >
          <SparklesIcon className="h-5 w-5" />
        </button>
      )}
      
      <ContextMenu state={contextMenu} onAction={handleAiAction} onClose={closeContextMenu} />
      <PromptModal
        isOpen={isPromptModalOpen}
        onClose={() => {
          setIsPromptModalOpen(false);
          setPromptInitiator(null);
          setPromptImageContext(null);
        }}
        onSubmit={(prompt, images) => {
          if (promptInitiator === AiAction.STYLE_CUSTOM) {
            const fullPrompt = `Rewrite the following text in this style: "${prompt}". Please use rich Markdown formatting where appropriate.\n\n"${promptContext.text}"`;
            handleAiAction(AiAction.CUSTOM_PROMPT, fullPrompt, images);
          } else if (promptInitiator === AiAction.TONE_CUSTOM) {
            const fullPrompt = `Rewrite the following text in this tone: "${prompt}". Please use rich Markdown formatting where appropriate.\n\n"${promptContext.text}"`;
            handleAiAction(AiAction.CUSTOM_PROMPT, fullPrompt, images);
          } else {
            if (promptContext.text && prompt.includes('{text}')) {
               const refinedPrompt = prompt.replace('{text}', `"${promptContext.text}"`);
               handleAiAction(AiAction.CUSTOM_PROMPT, refinedPrompt, images);
            } else {
               handleAiAction(AiAction.CUSTOM_PROMPT, prompt, images);
            }
          }
          setPromptInitiator(null);
        }}
        contextText={promptContext.text}
        placeholder={promptContext.prefix}
        initialImageSrc={promptImageContext}
      />
      <AiPreviewModal
        state={previewState}
        onClose={() => setPreviewState({ ...previewState, isOpen: false })}
        onReplace={handleReplace}
        onInsertAfter={handleInsertAfter}
        onInsert={handleInsert}
        onRetake={handleRetake}
        onCopy={handleCopy}
        onFollowUpPrompt={handleFollowUpPrompt}
        onAlternativeClick={handleAlternativeClick}
        availableDocuments={availableDocuments}
        currentDocumentId={currentDocumentId}
        onSwitchDocument={onSwitchDocument || undefined}
        onInsertToDocument={(docId: string, contentToInsert: string) => {
          // This is called when user clicks "Insert at Cursor"
          if (onInsertToDocument) {
            onInsertToDocument(docId, contentToInsert);
          }
        }}
      />
      <CropModal 
        isOpen={cropState.isOpen}
        imageSrc={cropState.imageEl?.src || ''}
        onClose={() => setCropState({ isOpen: false, imageEl: null })}
        onApply={handleApplyCrop}
      />
    </>
  );
});