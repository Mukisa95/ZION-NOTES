import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { GenericChatSession, ChatMessage } from '../types';
import { createChatSession } from '../services/aiService';
import { XIcon, SendIcon, BotIcon, UserIcon, PaperClipIcon, SparklesIcon } from './icons';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useAuth } from '../contexts/AuthContext';

interface ChatWindowProps {
  addTextToNote: (text: string) => void;
}

type DraftAttachment = {
  dataUrl: string;
  mimeType: string;
  file?: File;
  data?: string;
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

const createMessageId = () => `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const actionButtonClass =
  'rounded-full border border-gray-200/80 bg-white/95 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-gray-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md dark:border-gray-600 dark:bg-gray-800/90 dark:text-gray-200 dark:hover:border-blue-500/60 dark:hover:text-blue-300';

export const ChatWindow: React.FC<ChatWindowProps> = ({ addTextToNote }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [attachedImages, setAttachedImages] = useState<DraftAttachment[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const chatRef = useRef<GenericChatSession | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!chatRef.current) {
      chatRef.current = createChatSession();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 128)}px`;
    }
  }, [input]);

  const focusComposer = () => {
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleImageChange = (files: FileList | null) => {
    if (!files) return;

    const newImages = Array.from(files).map((file) => ({
      file,
      mimeType: file.type,
      dataUrl: URL.createObjectURL(file),
    }));

    setAttachedImages((prev) => [...prev, ...newImages]);
  };

  const handleRemoveImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const prepareImagesForSend = async (images: DraftAttachment[]) =>
    Promise.all(
      images.map(async (image) => ({
        mimeType: image.mimeType,
        data: image.data ?? (image.file ? await fileToBase64(image.file) : ''),
        preview: image.dataUrl,
      }))
    );

  const sendPrompt = async (promptText: string, images: DraftAttachment[]) => {
    const trimmedPrompt = promptText.trim();
    if ((!trimmedPrompt && images.length === 0) || isLoading) return;

    const preparedImages = await prepareImagesForSend(images);
    const userMessageId = createMessageId();
    const modelMessageId = createMessageId();

    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      text: trimmedPrompt,
      imagePreviews: preparedImages.map((image) => image.preview),
      images: preparedImages,
    };

    const pendingModelMessage: ChatMessage = {
      id: modelMessageId,
      role: 'model',
      text: '',
      relatedUserMessageId: userMessageId,
    };

    setMessages((prev) => [...prev, userMessage, pendingModelMessage]);
    setInput('');
    setAttachedImages([]);
    setEditingMessageId(null);
    setIsLoading(true);

    try {
      if (!chatRef.current) {
        chatRef.current = createChatSession();
      }

      const stream = chatRef.current.sendMessageStream({
        message: trimmedPrompt,
        images: preparedImages.length > 0
          ? preparedImages.map(({ mimeType, data }) => ({ mimeType, data }))
          : undefined,
      });

      let modelResponse = '';

      for await (const delta of stream) {
        modelResponse += delta;
        setMessages((prev) =>
          prev.map((message) =>
            message.id === modelMessageId ? { ...message, text: modelResponse } : message
          )
        );
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === modelMessageId
            ? {
                ...message,
                text: "Sorry, I couldn't get a response. Please try again.",
              }
            : message
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await sendPrompt(input, attachedImages);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendPrompt(input, attachedImages);
    }
  };

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const handleRetry = async (relatedUserMessageId?: string) => {
    if (!relatedUserMessageId || isLoading) return;

    const sourceMessage = messages.find((message) => message.id === relatedUserMessageId);
    if (!sourceMessage) return;

    const retryImages = (sourceMessage.images ?? []).map((image) => ({
      dataUrl: image.preview,
      mimeType: image.mimeType,
      data: image.data,
    }));

    await sendPrompt(sourceMessage.text, retryImages);
  };

  const handleEditPrompt = (message: ChatMessage) => {
    setInput(message.text);
    setAttachedImages(
      (message.images ?? []).map((image) => ({
        dataUrl: image.preview,
        mimeType: image.mimeType,
        data: image.data,
      }))
    );
    setEditingMessageId(message.id);
    focusComposer();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all duration-200 ease-in-out hover:scale-110"
        title="Open AI Chat"
        aria-label="Open AI Chat"
      >
        <SparklesIcon className="h-7 w-7" />
      </button>
    );
  }

  return (
    <div className={`fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-40 w-full sm:max-w-md h-[100dvh] sm:h-[75vh] sm:max-h-[600px] flex flex-col bg-white dark:bg-gray-800 sm:bg-white/80 sm:dark:bg-gray-800/80 backdrop-blur-xl border-0 sm:border border-gray-200/50 dark:border-gray-700/50 shadow-2xl rounded-none sm:rounded-2xl transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
      <header className="flex items-center justify-between p-4 sm:p-4 border-b border-gray-200/80 dark:border-gray-700/80 flex-shrink-0 bg-white dark:bg-gray-800">
        <h2 className="text-lg sm:text-lg font-bold flex items-center gap-2">
          <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">AI Assistant</span>
        </h2>
        <button onClick={() => setIsOpen(false)} className="p-2 sm:p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <XIcon className="h-6 w-6 sm:h-5 sm:w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-3 w-full animate-fade-in-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-900 flex items-center justify-center text-blue-500 shadow-sm"><BotIcon className="w-5 h-5" /></div>}
            <div className={`group relative text-sm max-w-[88%] ${msg.role === 'user' ? 'order-1' : ''}`}>
              <div className={`px-4 py-2.5 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-t-2xl rounded-bl-2xl' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-t-2xl rounded-br-2xl'}`}>
                {msg.imagePreviews && msg.imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {msg.imagePreviews.map((src, i) => (
                      <img key={i} src={src} alt={`User attachment ${i + 1}`} className="rounded-lg max-h-40 w-full object-cover" />
                    ))}
                  </div>
                )}
                {msg.text && <MarkdownRenderer content={msg.text} className={msg.role === 'model' ? 'prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-headings:my-2 prose-li:my-0.5' : ''} />}
              </div>
              {msg.role === 'model' && msg.text && (
                <div className="mt-2 flex flex-wrap gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => addTextToNote(msg.text)} className={actionButtonClass} title="Add to note">
                    Add to note
                  </button>
                  <button onClick={() => handleRetry(msg.relatedUserMessageId)} className={actionButtonClass} title="Retry response" disabled={isLoading}>
                    Retry
                  </button>
                  <button onClick={() => handleCopyText(msg.text)} className={actionButtonClass} title="Copy response">
                    Copy
                  </button>
                </div>
              )}
              {msg.role === 'user' && (
                <div className="mt-2 flex justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEditPrompt(msg)} className={actionButtonClass} title="Edit prompt" disabled={isLoading}>
                    {editingMessageId === msg.id ? 'Editing' : 'Edit'}
                  </button>
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || user.email || 'User'}
                  className="flex-shrink-0 w-8 h-8 rounded-full border border-blue-200 object-cover shadow-sm"
                />
              ) : (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center shadow-sm">
                  <UserIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                </div>
              )
            )}
          </div>
        ))}
        {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'model' && !messages[messages.length - 1].text && (
          <div className="flex items-start gap-3 animate-fade-in-up">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <BotIcon className="w-5 h-5" />
            </div>
            <div className="rounded-2xl px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2.5 h-2.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-2.5 h-2.5 bg-purple-500 dark:bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 sm:p-3 border-t border-gray-200/80 dark:border-gray-700/80 flex-shrink-0 bg-white dark:bg-gray-800 sm:bg-white/50 sm:dark:bg-gray-900/50">
        {editingMessageId && (
          <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            <span>Editing prompt. Send to retake it.</span>
            <button
              type="button"
              onClick={() => {
                setEditingMessageId(null);
                setInput('');
                setAttachedImages([]);
              }}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:text-blue-200 dark:hover:bg-blue-800/40"
            >
              Cancel
            </button>
          </div>
        )}
        {attachedImages.length > 0 && (
          <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <div className="grid grid-cols-5 gap-2">
              {attachedImages.map((image, index) => (
                <div key={index} className="relative">
                  <img src={image.dataUrl} alt="preview" className="h-16 w-16 object-cover rounded" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full shadow"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors flex-shrink-0"
            title="Attach image(s)"
          >
            <PaperClipIcon className="h-5 w-5" />
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={(e) => handleImageChange(e.target.files)}
            />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={editingMessageId ? 'Edit your prompt and send again...' : 'Ask me anything...'}
            className="w-full pl-4 pr-10 py-2 bg-gray-100 dark:bg-gray-700 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-200 shadow-sm resize-none"
            rows={1}
          />
          <button
            type="submit"
            className="p-2 text-white rounded-full transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || (!input.trim() && attachedImages.length === 0)}
            style={{
              backgroundColor: (isLoading || (!input.trim() && attachedImages.length === 0)) ? '#9ca3af' : '#2563eb'
            }}
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
