import React from 'react';
import { ZoomInIcon, ZoomOutIcon } from './icons';
import { AiProvider } from '../types';
import { getProviderMeta } from '../services/providerRegistry';
import { getActiveProvider } from '../services/aiService';
import { getLastRoutedVia } from '../services/autoRouterService';

interface StatusToolbarProps {
  counts: {
    words: number;
    characters: number;
  };
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoom: (zoom: number) => void;
  onClickProvider?: () => void;
}

const getBadgeColor = (id: AiProvider): string => {
  if (id === 'auto')       return 'bg-gradient-to-r from-indigo-500 to-purple-600';
  if (id === 'gemini')     return 'bg-blue-500';
  if (id === 'openrouter') return 'bg-violet-500';
  if (id === 'nvidia')     return 'bg-green-500';
  if (id === 'groq')       return 'bg-orange-500';
  if (id === 'cerebras')   return 'bg-red-500';
  if (id === 'sambanova')  return 'bg-teal-500';
  if (id === 'mistral')    return 'bg-sky-500';
  if (id === 'github')     return 'bg-gray-700';
  if (id === 'huggingface')return 'bg-yellow-500';
  if (id === 'cloudflare') return 'bg-orange-400';
  if (id === 'cohere')     return 'bg-pink-500';
  return 'bg-gray-400';
};

export const StatusToolbar: React.FC<StatusToolbarProps> = ({
  counts,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onClickProvider,
}) => {
  const activeProvider = getActiveProvider();
  const lastRouted = getLastRoutedVia();

  const getProviderLabel = () => {
    if (activeProvider === 'auto') {
      const routedMeta = lastRouted ? getProviderMeta(lastRouted as AiProvider) : null;
      const routedLabel = routedMeta ? routedMeta.label : lastRouted;
      return routedLabel ? `Auto (${routedLabel})` : 'Auto Router';
    }
    const meta = getProviderMeta(activeProvider);
    return meta ? meta.label : activeProvider;
  };

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

          {/* AI Provider Status Pill */}
          <div className="w-px h-3.5 bg-gray-200 dark:bg-gray-700"></div>

          <button
            onClick={onClickProvider}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all font-medium text-xs border border-transparent hover:border-gray-200 dark:hover:border-gray-700 shadow-sm hover:shadow active:scale-95"
            title="Click to change AI Provider"
          >
            <span className={`w-2 h-2 rounded-full ${getBadgeColor(activeProvider)}`} />
            <span>AI: {getProviderLabel()}</span>
          </button>
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


