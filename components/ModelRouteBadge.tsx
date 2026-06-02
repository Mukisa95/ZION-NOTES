import React, { useEffect, useState } from 'react';
import { ModelRouteInfo } from '../types';
import { isFavoriteModel, toggleFavoriteModel } from '../services/modelPreferenceService';
import { StarIcon } from './icons';

interface ModelRouteBadgeProps {
  modelInfo?: ModelRouteInfo | null;
  compact?: boolean;
}

export const ModelRouteBadge: React.FC<ModelRouteBadgeProps> = ({ modelInfo, compact = false }) => {
  const [isFavorite, setIsFavorite] = useState(() => isFavoriteModel(modelInfo?.id));

  useEffect(() => {
    const syncFavorite = () => setIsFavorite(isFavoriteModel(modelInfo?.id));
    syncFavorite();
    window.addEventListener('favorite-ai-models-change', syncFavorite);
    return () => window.removeEventListener('favorite-ai-models-change', syncFavorite);
  }, [modelInfo?.id]);

  if (!modelInfo) return null;

  const handleToggleFavorite = () => {
    setIsFavorite(toggleFavoriteModel(modelInfo));
  };

  return (
    <div
      className={`inline-flex max-w-full min-w-0 items-start gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700 shadow-sm dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200 ${compact ? 'text-[11px]' : 'text-xs'}`}
      title={`Model used: ${modelInfo.displayName}`}
    >
      <span className="min-w-0 whitespace-normal break-all text-left font-semibold leading-snug">
        {modelInfo.displayName}
      </span>
      <button
        type="button"
        onClick={handleToggleFavorite}
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-blue-100 dark:hover:bg-blue-800/50 ${isFavorite ? 'text-amber-500' : 'text-blue-400 dark:text-blue-300'}`}
        title={isFavorite ? 'Remove favorite model' : 'Favorite this model for Auto Router'}
        aria-label={isFavorite ? 'Remove favorite model' : 'Favorite this model for Auto Router'}
      >
        <StarIcon className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
};
