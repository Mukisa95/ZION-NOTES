import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { GenericChatSession } from '../types';
import { ChatMessage } from '../types';
import { createChatSession } from '../services/aiService';
import { useAuth } from '../contexts/AuthContext';
import { XIcon, SendIcon, PlusIcon, BotIcon, UserIcon, PaperClipIcon, SparklesIcon, EditIcon, RetakeIcon, CopyIcon, CheckIcon, UndoIcon } from './icons';
import { MarkdownRenderer } from './MarkdownRenderer';


interface ChatWindowProps {
  addTextToNote: (text: string) => void;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

export const ChatWindow: React.FC<ChatWindowProps> = ({ addTextToNote }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [attachedImages, setAttachedImages] = useState<{ file: File; dataUrl: string }[]>([]);
  const chatRef = useRef<GenericChatSession | null>(null);

  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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
      textareaRef.current.style.height = `${Math.min(scrollHeight, 128)}px`; // Max height of 128px (8rem)
    }
  }, [input]);

  const handleImageChange = (files: FileList | null) => {
    if (files) {
      const newImages = Array.from(files).map(file => ({
        file,
        dataUrl: URL.createObjectURL(file)
      }));
      setAttachedImages(prev => [...prev, ...newImages]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const runChatStream = async (messageText: string, messageImages?: { mimeType: string; data: string }[]) => {
    setIsLoading(true);
    try {
      if (chatRef.current) {
        const stream = chatRef.current.sendMessageStream({
          message: messageText,
          images: messageImages,
        });

        let modelResponse = '';
        setMessages(prev => [...prev, { role: 'model', text: '' }]);

        for await (const delta of stream) {
          modelResponse += delta;
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = modelResponse;
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error("Error sending chat message:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I couldn't get a response. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachedImages.length === 0) || isLoading) return;

    const userMessage: ChatMessage = { 
      role: 'user', 
      text: input, 
      imagePreviews: attachedImages.map(img => img.dataUrl),
    };
    
    let imagesToSend: { mimeType: string; data: string }[] | null = null;
    if (attachedImages.length > 0) {
        imagesToSend = await Promise.all(
            attachedImages.map(async img => {
                const base64Data = await fileToBase64(img.file);
                return { mimeType: img.file.type, data: base64Data };
            })
        );
        userMessage.images = imagesToSend;
        setAttachedImages([]);
    }

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    await runChatStream(input, imagesToSend ?? undefined);
  };

  const handleStartEdit = (index: number) => {
    setEditingMessageIndex(index);
    setEditingText(messages[index].text);
  };

  const handleCancelEdit = () => {
    setEditingMessageIndex(null);
    setEditingText('');
  };

  const handleSaveEdit = async (index: number) => {
    if (isLoading || !editingText.trim()) return;

    const currentMsg = messages[index];
    const updatedUserMsg: ChatMessage = {
      ...currentMsg,
      text: editingText.trim(),
    };

    const truncatedHistory = [...messages.slice(0, index), updatedUserMsg];
    setMessages(truncatedHistory);

    setEditingMessageIndex(null);
    setEditingText('');

    const historyBefore = messages.slice(0, index);
    chatRef.current = createChatSession(historyBefore);

    await runChatStream(updatedUserMsg.text, updatedUserMsg.images);
  };

  const handleRetry = async (index: number) => {
    if (isLoading) return;

    const userMsgIndex = index - 1;
    if (userMsgIndex < 0) return;
    const userMsg = messages[userMsgIndex];
    if (userMsg.role !== 'user') return;

    const truncatedHistory = messages.slice(0, userMsgIndex + 1);
    setMessages(truncatedHistory);

    const historyBefore = messages.slice(0, userMsgIndex);
    chatRef.current = createChatSession(historyBefore);

    await runChatStream(userMsg.text, userMsg.images);
  };

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => {
        setCopiedIndex(null);
      }, 2000);
    });
  };

  const handleToPrompt = (text: string) => {
    setInput(text);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
    }
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
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 w-full animate-fade-in-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-900 flex items-center justify-center text-blue-500 shadow-sm"><BotIcon className="w-5 h-5"/></div>}
            <div className={`group relative text-sm max-w-[85%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                <div className={`px-4 py-2.5 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-t-2xl rounded-bl-2xl' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-t-2xl rounded-br-2xl'}`}>
                    {msg.role === 'user' && editingMessageIndex === index ? (
                        <div className="w-full flex flex-col gap-2 min-w-[200px] sm:min-w-[300px]">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full p-2.5 bg-blue-700/50 text-white border border-blue-400/50 rounded-xl focus:outline-none focus:border-white text-sm resize-none shadow-inner"
                            rows={Math.min(5, Math.max(2, editingText.split('\n').length))}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveEdit(index);
                              }
                            }}
                          />
                          <div className="flex justify-end gap-2 text-xs">
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 bg-blue-700/30 hover:bg-blue-700/60 text-blue-100 rounded-lg transition-colors font-medium border border-blue-400/20"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEdit(index)}
                              className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 rounded-lg transition-colors font-medium shadow-sm"
                              disabled={!editingText.trim() || isLoading}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                    ) : (
                        <>
                            {msg.imagePreviews && msg.imagePreviews.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    {msg.imagePreviews.map((src, i) => (
                                        <img key={i} src={src} alt={`User attachment ${i+1}`} className="rounded-lg max-h-40 w-full object-cover" />
                                    ))}
                                </div>
                            )}
                            {msg.text && <MarkdownRenderer content={msg.text} className={msg.role === 'model' ? 'prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-headings:my-2 prose-li:my-0.5' : ''} />}
                        </>
                    )}
                </div>
                {!isLoading && editingMessageIndex === null && (
                  <>
                    {msg.role === 'model' && msg.text && (
                      <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-full shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-150 z-10">
                        <button 
                            onClick={() => addTextToNote(msg.text)} 
                            className="p-1 text-blue-500 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            title="Add to Note"
                        >
                          <PlusIcon className="h-3.5 w-3.5" />
                        </button>
                        
                        <button 
                            onClick={() => handleCopyText(msg.text, index)} 
                            className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Copy to Clipboard"
                        >
                          {copiedIndex === index ? (
                            <CheckIcon className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <CopyIcon className="h-3.5 w-3.5" />
                          )}
                        </button>

                        <button 
                            onClick={() => handleToPrompt(msg.text)} 
                            className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Use as Prompt"
                        >
                          <UndoIcon className="h-3.5 w-3.5" />
                        </button>

                        {index > 0 && messages[index - 1].role === 'user' && (
                          <button 
                              onClick={() => handleRetry(index)} 
                              className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="Retry Response"
                          >
                            <RetakeIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    {msg.role === 'user' && (
                      <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-full shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-150 z-10">
                        <button 
                            onClick={() => handleStartEdit(index)} 
                            className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Edit Prompt"
                        >
                          <EditIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
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
        ))}
        {isLoading && messages.length > 0 && messages[messages.length-1].role === 'user' && (
            <div className="flex items-start gap-3 animate-fade-in-up">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                    <BotIcon className="w-5 h-5"/>
                </div>
                <div className="rounded-2xl px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 shadow-md">
                    <div className="flex items-center gap-2.5">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce"></div>
                            <div className="w-2.5 h-2.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></div>
                            <div className="w-2.5 h-2.5 bg-purple-500 dark:bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
                        </div>
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">AI is thinking...</span>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 sm:p-3 border-t border-gray-200/80 dark:border-gray-700/80 flex-shrink-0 bg-white dark:bg-gray-800 sm:bg-white/50 sm:dark:bg-gray-900/50">
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
          {user && (
            <div className="flex-shrink-0 w-9 h-9 sm:w-8 sm:h-8 rounded-full overflow-hidden shadow-sm flex items-center justify-center mb-1 border border-gray-200 dark:border-gray-700">
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
            placeholder="Ask me anything..."
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