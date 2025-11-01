import React, { useState, useEffect } from 'react';
import { XIcon } from './icons';
import { 
  CompressionMethod, 
  getSizeBreakdown, 
  formatBytes, 
  getContentSize,
  applyCompression,
  SizeBreakdown,
  splitDocument,
  SplitResult
} from '../utils/compressionUtils';

interface CompressionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (compressedContent: string, method: CompressionMethod, splitData?: SplitResult) => void;
  content: string;
  documentName: string;
  maxSize: number; // Maximum allowed size in bytes
}

export const CompressionDialog: React.FC<CompressionDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  content,
  documentName,
  maxSize
}) => {
  const [selectedMethod, setSelectedMethod] = useState<CompressionMethod>(CompressionMethod.REDUCE_QUALITY);
  const [quality, setQuality] = useState(0.7);
  const [sizeBreakdown, setSizeBreakdown] = useState<SizeBreakdown | null>(null);
  const [estimatedSize, setEstimatedSize] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitPreview, setSplitPreview] = useState<SplitResult | null>(null);

  useEffect(() => {
    if (isOpen && content) {
      const breakdown = getSizeBreakdown(content);
      setSizeBreakdown(breakdown);
      setEstimatedSize(breakdown.total);
      
      // Calculate split preview
      const split = splitDocument(content, maxSize);
      setSplitPreview(split);
    }
  }, [isOpen, content, maxSize]);

  useEffect(() => {
    const estimateSize = async () => {
      if (!sizeBreakdown) return;
      
      let estimated = sizeBreakdown.total;
      
      switch (selectedMethod) {
        case CompressionMethod.REMOVE_IMAGES:
          estimated = sizeBreakdown.text;
          break;
          
        case CompressionMethod.REDUCE_QUALITY:
          // Estimate ~60-80% reduction on images
          estimated = sizeBreakdown.text + (sizeBreakdown.images * (1 - quality));
          break;
          
        case CompressionMethod.GZIP:
          // Text compresses ~70%, images don't compress much
          estimated = (sizeBreakdown.text * 0.3) + sizeBreakdown.images;
          break;
          
        case CompressionMethod.GZIP_AND_REDUCE:
          // Combined effect
          const reducedImages = sizeBreakdown.images * (1 - quality);
          estimated = (sizeBreakdown.text * 0.3) + (reducedImages * 0.9);
          break;
          
        case CompressionMethod.SPLIT_DOCUMENT:
          // Split will create documents that fit
          if (splitPreview) {
            estimated = getContentSize(splitPreview.part1);
          }
          break;
          
        case CompressionMethod.NONE:
        default:
          estimated = sizeBreakdown.total;
      }
      
      setEstimatedSize(Math.round(estimated));
    };
    
    estimateSize();
  }, [selectedMethod, quality, sizeBreakdown, splitPreview]);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      if (selectedMethod === CompressionMethod.SPLIT_DOCUMENT) {
        // For split, pass the split data
        if (splitPreview) {
          onConfirm(splitPreview.part1, selectedMethod, splitPreview);
        }
      } else {
        const compressed = await applyCompression(content, selectedMethod, quality);
        onConfirm(compressed, selectedMethod);
      }
    } catch (error) {
      console.error('Compression failed:', error);
      alert('Compression failed. Please try a different method.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !sizeBreakdown) return null;

  const originalSize = sizeBreakdown.total;
  const willFit = estimatedSize <= maxSize;
  const savingsPercent = Math.round(((originalSize - estimatedSize) / originalSize) * 100);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Document Too Large
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {documentName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <XIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Size Information */}
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100">
                Current Size: {formatBytes(originalSize)}
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Maximum allowed: {formatBytes(maxSize)} • You're {formatBytes(originalSize - maxSize)} over the limit
              </p>
              <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-red-600 dark:text-red-400 font-medium">Text:</span>
                  <span className="ml-2 text-red-900 dark:text-red-100">{formatBytes(sizeBreakdown.text)}</span>
                </div>
                <div>
                  <span className="text-red-600 dark:text-red-400 font-medium">Images:</span>
                  <span className="ml-2 text-red-900 dark:text-red-100">
                    {formatBytes(sizeBreakdown.images)} ({sizeBreakdown.imageCount})
                  </span>
                </div>
                <div>
                  <span className="text-red-600 dark:text-red-400 font-medium">Largest:</span>
                  <span className="ml-2 text-red-900 dark:text-red-100">{formatBytes(sizeBreakdown.largestImage)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compression Options */}
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Choose Compression Method
          </h3>

          <div className="space-y-3">
            {/* Remove All Images */}
            <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedMethod === CompressionMethod.REMOVE_IMAGES
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
            }`}>
              <input
                type="radio"
                name="compression"
                value={CompressionMethod.REMOVE_IMAGES}
                checked={selectedMethod === CompressionMethod.REMOVE_IMAGES}
                onChange={(e) => setSelectedMethod(e.target.value as CompressionMethod)}
                className="sr-only"
              />
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  selectedMethod === CompressionMethod.REMOVE_IMAGES
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedMethod === CompressionMethod.REMOVE_IMAGES && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Remove All Images
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Strip all {sizeBreakdown.imageCount} images from the document. Text and formatting preserved.
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-2">
                    Fastest • ~{formatBytes(sizeBreakdown.text)} final size
                  </div>
                </div>
              </div>
            </label>

            {/* Reduce Image Quality */}
            <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedMethod === CompressionMethod.REDUCE_QUALITY
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
            }`}>
              <input
                type="radio"
                name="compression"
                value={CompressionMethod.REDUCE_QUALITY}
                checked={selectedMethod === CompressionMethod.REDUCE_QUALITY}
                onChange={(e) => setSelectedMethod(e.target.value as CompressionMethod)}
                className="sr-only"
              />
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  selectedMethod === CompressionMethod.REDUCE_QUALITY
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedMethod === CompressionMethod.REDUCE_QUALITY && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Reduce Image Quality
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Keep images but resize and reduce quality. Visual content preserved with some quality loss.
                  </div>
                  {selectedMethod === CompressionMethod.REDUCE_QUALITY && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-700 dark:text-gray-300">Quality: {Math.round(quality * 100)}%</span>
                        <span className="text-gray-500 dark:text-gray-400">{100 - Math.round(quality * 100)}% compression</span>
                      </div>
                      <input
                        type="range"
                        min="0.3"
                        max="0.9"
                        step="0.1"
                        value={quality}
                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-2">
                    Recommended • Est. {formatBytes(estimatedSize)} final size
                  </div>
                </div>
              </div>
            </label>

            {/* GZIP Compression */}
            <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedMethod === CompressionMethod.GZIP
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
            }`}>
              <input
                type="radio"
                name="compression"
                value={CompressionMethod.GZIP}
                checked={selectedMethod === CompressionMethod.GZIP}
                onChange={(e) => setSelectedMethod(e.target.value as CompressionMethod)}
                className="sr-only"
              />
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  selectedMethod === CompressionMethod.GZIP
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedMethod === CompressionMethod.GZIP && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    GZIP Compression
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Compress text content using GZIP algorithm. Best for text-heavy documents.
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-2">
                    Best for text • Est. {formatBytes(estimatedSize)} final size
                  </div>
                </div>
              </div>
            </label>

            {/* Combined: GZIP + Reduce Quality */}
            <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedMethod === CompressionMethod.GZIP_AND_REDUCE
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
            }`}>
              <input
                type="radio"
                name="compression"
                value={CompressionMethod.GZIP_AND_REDUCE}
                checked={selectedMethod === CompressionMethod.GZIP_AND_REDUCE}
                onChange={(e) => setSelectedMethod(e.target.value as CompressionMethod)}
                className="sr-only"
              />
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  selectedMethod === CompressionMethod.GZIP_AND_REDUCE
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedMethod === CompressionMethod.GZIP_AND_REDUCE && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Maximum Compression
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Combine GZIP compression with reduced image quality for maximum size reduction.
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-2">
                    Most aggressive • Est. {formatBytes(estimatedSize)} final size
                  </div>
                </div>
              </div>
            </label>

            {/* Split Document */}
            <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedMethod === CompressionMethod.SPLIT_DOCUMENT
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
            }`}>
              <input
                type="radio"
                name="compression"
                value={CompressionMethod.SPLIT_DOCUMENT}
                checked={selectedMethod === CompressionMethod.SPLIT_DOCUMENT}
                onChange={(e) => setSelectedMethod(e.target.value as CompressionMethod)}
                className="sr-only"
              />
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  selectedMethod === CompressionMethod.SPLIT_DOCUMENT
                    ? 'border-purple-500 bg-purple-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedMethod === CompressionMethod.SPLIT_DOCUMENT && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Split Into Multiple Documents
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Keep all content! Split document at a logical point. Creates "{documentName} (Part 1)" and "{documentName} (Part 2)".
                  </div>
                  {selectedMethod === CompressionMethod.SPLIT_DOCUMENT && splitPreview && (
                    <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
                      <div className="text-xs font-medium text-purple-900 dark:text-purple-100 mb-2">
                        Split Preview:
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-purple-700 dark:text-purple-300">Part 1:</span>
                          <span className="font-medium text-purple-900 dark:text-purple-100">
                            {formatBytes(getContentSize(splitPreview.part1))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-purple-700 dark:text-purple-300">Part 2:</span>
                          <span className="font-medium text-purple-900 dark:text-purple-100">
                            {formatBytes(getContentSize(splitPreview.part2))}
                          </span>
                        </div>
                        <div className="pt-2 mt-2 border-t border-purple-200 dark:border-purple-700">
                          <div className="text-purple-700 dark:text-purple-300 mb-1">Split at:</div>
                          <div className="text-purple-900 dark:text-purple-100 italic break-all">
                            {splitPreview.splitPoint}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-2">
                    Keep everything • Two manageable documents
                  </div>
                </div>
              </div>
            </label>
          </div>

          {/* Results Preview */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Estimated Result:
              </span>
              {willFit ? (
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                  ✓ Will fit!
                </span>
              ) : (
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Still too large
                </span>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Original:</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatBytes(originalSize)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">After compression:</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatBytes(estimatedSize)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Savings:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {formatBytes(originalSize - estimatedSize)} ({savingsPercent}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {!willFit && (
              <span className="text-sm text-red-600 dark:text-red-400">
                Try a more aggressive method
              </span>
            )}
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                willFit
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isProcessing ? 'Processing...' : willFit ? 'Compress & Save' : 'Compress Anyway'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

