import React from 'react';
import { ZoomInIcon, ZoomOutIcon } from './icons';

interface StatusToolbarProps {
  counts: {
    words: number;
    characters: number;
  };
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoom: (zoom: number) => void;
}

export const StatusToolbar: React.FC<StatusToolbarProps> = ({ counts, zoomLevel, onZoomIn, onZoomOut, onSetZoom }) => {
  return (
    <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700/50">
      <div className="flex items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-600 dark:text-gray-400">Words:</span>
            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full font-semibold">
              {counts.words}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-600 dark:text-gray-400">Chars:</span>
            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-full font-semibold">
              {counts.characters}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button 
            onClick={onZoomOut} 
            className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all" 
            title="Zoom Out"
          >
            <ZoomOutIcon className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={() => onSetZoom(100)} 
            className="min-w-[50px] px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-all" 
            title="Reset Zoom"
          >
            {zoomLevel}%
          </button>
          <button 
            onClick={onZoomIn} 
            className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all" 
            title="Zoom In"
          >
            <ZoomInIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

