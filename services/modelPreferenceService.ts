import { AiProvider, ModelRouteInfo } from '../types';
import { getProviderMeta } from './providerRegistry';

const FAVORITE_MODELS_KEY = 'favorite_ai_models';

type RouteProvider = Exclude<AiProvider, 'auto'>;

export const createModelRouteInfo = (provider: RouteProvider, model: string): ModelRouteInfo => {
  const normalizedModel = model.trim();
  const providerLabel = getProviderMeta(provider)?.label ?? provider;
  return {
    provider,
    model: normalizedModel,
    id: `${provider}:${normalizedModel}`,
    displayName: `${providerLabel} - ${normalizedModel}`,
  };
};

export const getFavoriteModelIds = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITE_MODELS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const isFavoriteModel = (modelId?: string | null): boolean =>
  !!modelId && getFavoriteModelIds().includes(modelId);

export const setFavoriteModel = (model: ModelRouteInfo, favorite: boolean): void => {
  const current = getFavoriteModelIds();
  const next = favorite
    ? [model.id, ...current.filter(id => id !== model.id)]
    : current.filter(id => id !== model.id);
  localStorage.setItem(FAVORITE_MODELS_KEY, JSON.stringify(next));
};

export const toggleFavoriteModel = (model: ModelRouteInfo): boolean => {
  const nextFavorite = !isFavoriteModel(model.id);
  setFavoriteModel(model, nextFavorite);
  window.dispatchEvent(new CustomEvent('favorite-ai-models-change'));
  return nextFavorite;
};
