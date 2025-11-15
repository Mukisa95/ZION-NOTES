import React from 'react';

interface ImageViewerModalProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ imageUrl, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl max-w-4xl w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-end p-3">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </div>
        <div className="px-6 pb-6">
          <img src={imageUrl} alt="Uploaded" className="w-full rounded-xl object-contain" />
        </div>
      </div>
    </div>
  );
};

export default ImageViewerModal;

