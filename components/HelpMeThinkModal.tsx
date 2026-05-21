import React, { useState, FormEvent, useEffect, useRef } from 'react';
import { generateText } from '../services/aiService';
import { XIcon, SendIcon, BrainIcon, CheckIcon, UserIcon } from './icons';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useAuth } from '../contexts/AuthContext';

interface ConversationMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

interface HelpMeThinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertText: (text: string) => void;
  initialSession: { conversation: ConversationMessage[]; initialTopic: string } | null;
  onFinish: (session: { conversation: ConversationMessage[]; initialTopic: string }) => void;
}

type ConversationStep = 'initial' | 'analyzing' | 'specific_response' | 'vague_response' | 'clarifying' | 'follow_up' | 'selection';


export const HelpMeThinkModal: React.FC<HelpMeThinkModalProps> = ({ isOpen, onClose, onInsertText, initialSession, onFinish }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<ConversationStep>('initial');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [initialTopic, setInitialTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialSession) {
        setConversation(initialSession.conversation);
        setInitialTopic(initialSession.initialTopic);
        const lastMessage = initialSession.conversation[initialSession.conversation.length - 1];
        if (lastMessage?.role === 'model') {
          setGeneratedContent(lastMessage.content);
          setStep('specific_response');
        } else if (lastMessage?.role === 'system') {
          setStep('vague_response');
        } else {
          setStep('follow_up');
        }
      } else {
        setStep('initial');
        setConversation([]);
        setInputValue('');
        setInitialTopic('');
        setGeneratedContent('');
        setIsLoading(false);
        setSelectedMessages(new Set());
      }
    }
  }, [isOpen, initialSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, step]);

  if (!isOpen) return null;

  const handleInitialSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    const topic = inputValue;
    setInitialTopic(topic);
    setConversation([{ role: 'user', content: topic }]);
    setInputValue('');
    setIsLoading(true);
    setStep('analyzing');

    const metaPrompt = `You are an intelligent brainstorming assistant in a note-taking app. Your goal is to help a user flesh out their ideas. The user will provide an initial input. Your task is to analyze this input and respond in a specific JSON format.

First, classify the user's input into one of two categories:
1. 'SPECIFIC_REQUEST': The input is a clear question or a well-defined topic that you can directly write about.
2. 'VAGUE_CONCEPT': The input is a vague title, a broad subject, or an ambiguous phrase that needs more clarification.

Based on the classification, structure your response as a JSON object with NO markdown formatting inside the JSON values.

**If the classification is 'SPECIFIC_REQUEST':**
Generate a concise and informative response to the user's request, using rich Markdown.
Return a JSON object with this structure:
{
  "type": "SPECIFIC_REQUEST",
  "response": "<Your generated Markdown text here>"
}

**If the classification is 'VAGUE_CONCEPT':**
First, briefly describe your understanding of the user's topic.
Then, formulate a clarifying follow-up question to help the user narrow down their request.
Return a JSON object with this structure:
{
  "type": "VAGUE_CONCEPT",
  "understanding": "<Your interpretation of the user's vague topic>",
  "followUpQuestion": "<Your clarifying question>"
}

---
User Input:
"${topic}"
---
`;
    
    try {
        const responseText = await generateText(metaPrompt);
        const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
        const parsedResponse = JSON.parse(cleanedResponse);

        if (parsedResponse.type === 'SPECIFIC_REQUEST') {
            setGeneratedContent(parsedResponse.response);
            setConversation(prev => [...prev, { role: 'model', content: parsedResponse.response }]);
            setStep('specific_response');
        } else if (parsedResponse.type === 'VAGUE_CONCEPT') {
            const message = `${parsedResponse.understanding}\n\n${parsedResponse.followUpQuestion}`;
            setConversation(prev => [...prev, { role: 'system', content: message }]);
            setStep('vague_response');
        } else {
            throw new Error('Invalid response type from AI');
        }
    } catch (error) {
        console.error("Error processing initial request:", error);
        setConversation(prev => [...prev, { role: 'system', content: "Sorry, I had trouble understanding that. Could you please rephrase?" }]);
        setStep('initial');
    } finally {
        setIsLoading(false);
    }
  };

  const handleFollowUpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    setConversation(prev => [...prev, { role: 'user', content: inputValue }]);
    const userClarification = inputValue;
    setInputValue('');
    setIsLoading(true);
    setStep('clarifying');

    const prompt = `You are a helpful writing assistant. The user initially provided a topic ("${initialTopic}") and has now provided more direction. Based on their new instruction, please generate the content they requested. Structure your response using rich Markdown formatting (headings, bold, lists, etc.) to be clear and readable.

User's Clarification: "${userClarification}"

Generate the content now.`;

    try {
        const responseText = await generateText(prompt);
        setGeneratedContent(responseText);
        setConversation(prev => [...prev, { role: 'model', content: responseText }]);
        setStep('specific_response');
    } catch (error) {
        console.error("Error processing follow-up:", error);
        setConversation(prev => [...prev, { role: 'system', content: "Sorry, something went wrong. Let's try that again." }]);
        setStep('vague_response');
    } finally {
        setIsLoading(false);
    }
  };

  const handleYes = () => {
    setStep('follow_up');
  };

  const handleNo = () => {
    setStep('selection');
    const lastModelMessageIndex = conversation.findLastIndex(msg => msg.role === 'model');
    if (lastModelMessageIndex !== -1) {
        setSelectedMessages(new Set([lastModelMessageIndex]));
    }
  };
  
  const handleAddToNote = () => {
    const selectedContent = conversation
        .filter((_, index) => selectedMessages.has(index))
        .map(msg => msg.content)
        .join('\n\n---\n\n');

    if (selectedContent.trim()) {
        onInsertText(selectedContent);
    }
    onFinish({ conversation, initialTopic });
    onClose();
  };
  
  const toggleMessageSelection = (index: number) => {
    setSelectedMessages(prev => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        return newSet;
    });
  };

  const renderFooter = () => {
    const inputForm = (handler: (e: FormEvent) => void, placeholder: string) => (
      <form onSubmit={handler} className="relative flex items-center gap-2">
        {user && (
          <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden shadow-sm flex items-center justify-center border border-gray-200 dark:border-gray-700">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'User'} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        )}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-4 pr-12 py-3 bg-gray-100 dark:bg-gray-700 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-200 shadow-sm text-base"
          disabled={isLoading}
          autoFocus
        />
        <button
          type="submit"
          className="absolute right-2 p-2 text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:bg-gray-400"
          disabled={isLoading || !inputValue.trim()}
        >
          <SendIcon className="h-5 w-5" />
        </button>
      </form>
    );

    switch (step) {
      case 'initial':
        return inputForm(handleInitialSubmit, "What do you want to write about?");
      case 'vague_response':
        return inputForm(handleFollowUpSubmit, "Specify what you need...");
      case 'follow_up':
        return inputForm(handleFollowUpSubmit, "What should I break down deeper?");
      
      case 'specific_response':
        return (
          <div className="p-2 bg-gray-100 dark:bg-gray-900/50 rounded-lg text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Is there anything specific you wanted me to tell you about this or explain more?</p>
            <div className="flex justify-center gap-3">
              <button onClick={handleYes} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">Yes, please</button>
              <button onClick={handleNo} className="px-5 py-2 text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">No, I'm done</button>
            </div>
          </div>
        );
      
      case 'analyzing':
      case 'clarifying':
        return (
            <div className="flex items-center justify-center space-x-2 p-4">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></div>
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
            </div>
        );
      
      case 'selection':
        return (
            <div className="flex justify-end">
                <button 
                    onClick={handleAddToNote}
                    disabled={selectedMessages.size === 0}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                >
                    Add Selected to Note ({selectedMessages.size})
                </button>
            </div>
        );

      default:
        return null;
    }
  };

  return (
    <div data-modal="true" className="fixed inset-0 bg-black bg-opacity-60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in-fast backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-2xl flex flex-col transform transition-all duration-300 scale-95 animate-scale-in max-h-[90dvh]">
        <header className="relative flex justify-between items-center p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
           <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-0 -translate-y-1/2 px-4 bg-white dark:bg-gray-800">
             <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full shadow-lg">
                <BrainIcon className="h-6 w-6 text-white" />
            </div>
           </div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 w-full text-center mt-0 sm:mt-4">
            {step === 'selection' ? 'Select Thoughts to Add' : 'Let me help you think'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 absolute top-3 right-3">
            <XIcon className="h-6 w-6" />
          </button>
        </header>

        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 flex-1">
          {conversation.length === 0 && step === 'initial' && (
            <div className="text-center text-gray-500 dark:text-gray-400 p-8">
              <p>What do you want to write about? A topic, a title, a question, or just a single word - let's start from there.</p>
            </div>
          )}
          {conversation.map((msg, index) => {
            const isSelected = selectedMessages.has(index);
            const isSelectable = step === 'selection' && msg.role === 'model';
            return (
                <div key={index} className={`flex items-start gap-3 w-full animate-fade-in-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {isSelectable && (
                    <button onClick={() => toggleMessageSelection(index)} className="flex-shrink-0 mt-2 p-1 border rounded-full transition-colors">
                      <CheckIcon className={`h-4 w-4 ${isSelected ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`} />
                    </button>
                  )}
                  <div className={`group relative text-sm max-w-[90%] ${msg.role === 'user' ? 'order-1' : ''} ${isSelectable ? 'cursor-pointer' : ''}`} onClick={isSelectable ? () => toggleMessageSelection(index) : undefined}>
                    <div className={`px-4 py-2.5 shadow-sm transition-all duration-200 ${
                        isSelectable && isSelected ? 'ring-2 ring-blue-500' : ''} ${
                        msg.role === 'user' ? 'bg-blue-600 text-white rounded-t-2xl rounded-bl-2xl' 
                        : msg.role === 'system' ? 'bg-yellow-50 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 rounded-2xl text-center'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-t-2xl rounded-br-2xl'
                    }`}>
                      <MarkdownRenderer content={msg.content} className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-headings:my-2 prose-li:my-0.5" />
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden shadow-sm flex items-center justify-center">
                      {user && user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={user.displayName || 'User'} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <footer className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sm:bg-white/50 sm:dark:bg-gray-800/50">
          {renderFooter()}
        </footer>
      </div>
    </div>
  );
};