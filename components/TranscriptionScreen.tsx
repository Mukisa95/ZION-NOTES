import React, { ChangeEvent, useMemo, useState } from 'react';
import { UploadedFile, TranscriptionError, TranscriptionOption } from '../types';
import { transcribeFiles } from '../services/geminiService';
import ImageViewerModal from './ImageViewerModal';
import ScreenHeader from './ScreenHeader';

interface TranscriptionScreenProps {
  onTranscriptionComplete: (result: { html: string; errors: Omit<TranscriptionError, 'id'>[] }) => void;
  onBack: () => void;
  onHome: () => void;
}

const UploadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-10 w-10 text-gray-400 group-hover:text-blue-500 transition-colors"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const PdfFileIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-8 w-8 text-red-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const transcriptionOptions: { id: TranscriptionOption; title: string; desc: string }[] = [
  { id: 'original', title: 'Keep Original', desc: 'Transcribe exactly as-is; highlight issues separately.' },
  { id: 'correct', title: 'Correct Errors', desc: 'Fix spelling/grammar issues in the output.' },
  { id: 'organize', title: 'Organize', desc: 'Improve structure using headings and lists.' },
  { id: 'summarize', title: 'Summarize', desc: 'Return a concise summary of the files.' },
];

const TranscriptionScreen: React.FC<TranscriptionScreenProps> = ({ onTranscriptionComplete, onBack, onHome }) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [option, setOption] = useState<TranscriptionOption>('original');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const remainingSlots = Math.max(0, 10 - files.length);
    const newFiles = Array.from(event.target.files)
      .slice(0, remainingSlots)
      .map((file, index) => ({
        id: `${file.name}-${Date.now()}-${index}`,
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
        order: files.length + index + 1,
        type: file.type === 'application/pdf' ? 'pdf' : 'image',
      }));

    setFiles(prev => [...prev, ...newFiles]);
    event.target.value = '';
  };

  const handleOrderChange = (id: string, newOrder: number) => {
    setFiles(prev =>
      prev.map(file => (file.id === id ? { ...file, order: Math.max(1, newOrder) } : file))
    );
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(file => file.id !== id);
    });
  };

  const handleTranscribe = async () => {
    if (files.length === 0 || isLoading) return;
    setIsLoading(true);
    setApiError(null);

    try {
      const sortedFiles = [...files].sort((a, b) => a.order - b.order);
      setActiveIndex(0);
      const result = await transcribeFiles(sortedFiles.map(f => f.file), option);
      onTranscriptionComplete(result);
      setFiles([]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setApiError(`Transcription failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const totalFilesText = useMemo(() => `${files.length}/10 files`, [files.length]);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <ScreenHeader onBack={onBack} onHome={onHome}>
        <span className="bg-gradient-to-r from-sky-400 to-emerald-400 text-transparent bg-clip-text">
          Transcribe a Document
        </span>
      </ScreenHeader>

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <label
            htmlFor="file-upload"
            className="relative cursor-pointer flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 group transition-colors"
          >
            <div className="text-center">
              <UploadIcon />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Images (PNG, JPG) or PDF — {totalFilesText}</p>
            </div>
            <input
              id="file-upload"
              type="file"
              multiple
              accept="image/png, image/jpeg, image/webp, application/pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={files.length >= 10}
            />
          </label>

          {files.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {files.map(file => (
                <div key={file.id} className="relative group aspect-square">
                  {file.type === 'image' ? (
                    <img
                      src={file.preview}
                      alt="preview"
                      className="w-full h-full object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                      onClick={() => setSelectedImage(file.preview)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-50 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center p-2 text-center border border-gray-200 dark:border-gray-700">
                      <PdfFileIcon />
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1 w-full">{file.file.name}</p>
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                  {files.length > 1 && (
                    <input
                      type="number"
                      min={1}
                      value={file.order}
                      onChange={e => handleOrderChange(file.id, parseInt(e.target.value, 10) || 1)}
                      className="absolute bottom-0 left-0 w-full bg-black/70 text-white text-center text-xs py-0.5 border-none outline-none rounded-b-lg"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {files.length > 0 && (
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-base font-semibold mb-3 text-center text-gray-800 dark:text-gray-100">
              Transcription Option
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {transcriptionOptions.map(opt => (
                <label
                  key={opt.id}
                  className={`p-3 rounded-xl border text-center text-sm transition-all cursor-pointer ${
                    option === opt.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400 shadow'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                  }`}
                >
                  <input
                    type="radio"
                    className="hidden"
                    name="transcription-option"
                    value={opt.id}
                    checked={option === opt.id}
                    onChange={() => setOption(opt.id)}
                  />
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{opt.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{opt.desc}</p>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center pt-2">
          <button
            onClick={handleTranscribe}
            disabled={files.length === 0 || isLoading}
            className="group relative w-full md:w-auto px-10 py-3 text-base font-semibold rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1/2 bg-white/20 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
            {isLoading ? (
              <>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-1 bg-white/40 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-white animate-pulse" />
                  </div>
                  <p className="text-sm">Transcribing...</p>
                </div>
              </>
            ) : (
              'Transcribe Document'
            )}
          </button>
        </div>

        {isLoading && files.length > 0 && (
          <div className="mt-4 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-3">Processing files…</p>
            <div className="space-y-3">
              {files
                .sort((a, b) => a.order - b.order)
                .map((file, index) => (
                  <div
                    key={file.id}
                    className={`flex items-center gap-3 p-2 rounded-xl border ${
                      index === activeIndex
                        ? 'border-blue-500 bg-white/70 dark:bg-white/10 shadow-md'
                        : 'border-transparent bg-white/40 dark:bg-white/5'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-lg overflow-hidden border ${
                        index === activeIndex ? 'border-blue-400' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {file.type === 'image' ? (
                        <img src={file.preview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                          <PdfFileIcon />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                        {file.file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Page {file.order}</p>
                    </div>
                    {index === activeIndex && (
                      <div className="flex-1 h-1 bg-blue-100 dark:bg-blue-900/40 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 animate-pulse" />
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {apiError && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 px-4 py-2 rounded-lg text-center text-sm">
            {apiError}
          </div>
        )}
      </div>

      {selectedImage && (
        <ImageViewerModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </div>
  );
};

export default TranscriptionScreen;

