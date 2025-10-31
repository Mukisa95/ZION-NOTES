import React, { useState, useEffect } from 'react';
import { XIcon, SparklesIcon, ImageIcon } from './icons';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string, images?: { mimeType: string; data: string }[]) => void;
  contextText?: string;
  placeholder?: string;
  initialImageSrc?: string | null;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

const dataUrlToImageObject = (dataUrl: string): { mimeType: string; data: string } | null => {
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) return null;
    return { mimeType: match[1], data: match[2] };
}

export const PromptModal: React.FC<PromptModalProps> = ({ isOpen, onClose, onSubmit, contextText, placeholder, initialImageSrc }) => {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<{ file?: File; dataUrl: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      if (initialImageSrc) {
        setImages([{ dataUrl: initialImageSrc }]);
      } else {
        setImages([]);
      }
    }
  }, [isOpen, initialImageSrc]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() || images.length > 0) {
      let imagesData: { mimeType: string; data: string }[] | undefined = undefined;
      if (images.length > 0) {
        const processedImages = await Promise.all(
            images.map(async (image) => {
                if (image.file) { // Uploaded by user
                    const base64Data = await fileToBase64(image.file);
                    return { mimeType: image.file.type, data: base64Data };
                } else { // From initialImageSrc or paste
                    return dataUrlToImageObject(image.dataUrl);
                }
            })
        );
        imagesData = processedImages.filter(Boolean) as { mimeType: string; data: string }[];
      }
      onSubmit(prompt, imagesData);
      onClose();
    }
  };

  const handleImageChange = (files: FileList | null) => {
    if (files) {
        const newImages = Array.from(files).map(file => ({
            file,
            dataUrl: URL.createObjectURL(file)
        }));
        setImages(prev => [...prev, ...newImages]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleImageChange(e.dataTransfer.files);
  };

  return (
    <div data-modal="true" className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in-fast">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto transform transition-all duration-300 scale-95 animate-scale-in">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center">
              <SparklesIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-blue-500" />
              AI Prompt
            </h2>
            <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
              <XIcon className="h-6 w-6" />
            </button>
          </div>
          
          {contextText && (
            <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg max-h-24 overflow-y-auto">
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                <strong>Context:</strong> "{contextText}"
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!initialImageSrc && (
              <div 
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="mb-4 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                  <ImageIcon className="h-8 w-8 mx-auto text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">Drag & drop images or click to upload</p>
                  <input type="file" id="image-upload" className="hidden" accept="image/*" multiple onChange={(e) => handleImageChange(e.target.files)} />
              </div>
            )}
            
            {images.length > 0 && (
                <div className="mb-4 grid grid-cols-4 gap-2">
                    {images.map((image, index) => (
                        <div key={index} className="relative">
                            <img src={image.dataUrl} alt={`Preview ${index}`} className="rounded-lg h-20 w-full object-cover" />
                            <button type="button" onClick={() => handleRemoveImage(index)} className="absolute top-1 right-1 p-0.5 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75">
                                <XIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholder || (images.length > 0 ? 'Ask something about the image(s)...' : 'e.g., Explain this like I\'m five...')}
              className="w-full h-24 sm:h-24 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-200 text-base"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2">
              Use <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{'{text}'}</code> to reference context text.
            </p>
            <div className="mt-4 sm:mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 sm:px-6 py-2.5 sm:py-2 text-sm sm:text-base bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors sm:hidden"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!prompt.trim() && images.length === 0}
                className="px-6 sm:px-6 py-2.5 sm:py-2 text-sm sm:text-base bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex-1 sm:flex-none"
              >
                Generate
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};