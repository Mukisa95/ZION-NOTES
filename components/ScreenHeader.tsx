import React from 'react';

interface ScreenHeaderProps {
  onBack?: () => void;
  onHome?: () => void;
  children: React.ReactNode;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({ onBack, onHome, children }) => {
  return (
    <div className="flex items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-gray-100">
        {children}
      </div>
      <div className="flex gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Back
          </button>
        )}
        {onHome && (
          <button
            onClick={onHome}
            className="px-4 py-2 text-sm font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Home
          </button>
        )}
      </div>
    </div>
  );
};

export default ScreenHeader;

