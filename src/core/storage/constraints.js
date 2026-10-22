import {
  DEFAULT_BATCH_CONCURRENCY,
  DEFAULT_BATCH_INTERVAL,
  DEFAULT_BATCH_LENGTH,
  DEFAULT_BATCH_SIZE,
  DEFAULT_FETCH_INTERVAL,
  DEFAULT_FETCH_LIMIT,
  DEFAULT_HTTP_TIMEOUT,
  DEFAULT_CONTEXT_SIZE,
  DEFAULT_API_SETTING,
} from "../../config/api";
import { DEFAULT_CACHE_TIMEOUT } from "../../config/storage";

// Shared by storage validation, runtime schedulers and configuration controls.
export const API_LIMITS = {
  fetchLimit: { min: 1, max: 100, fallback: DEFAULT_FETCH_LIMIT },
  fetchInterval: { min: 0, max: 5000, fallback: DEFAULT_FETCH_INTERVAL },
  httpTimeout: { min: 1, max: 600, fallback: DEFAULT_HTTP_TIMEOUT },
  batchInterval: { min: 0, max: 10000, fallback: DEFAULT_BATCH_INTERVAL },
  batchSize: { min: 1, max: 100, fallback: DEFAULT_BATCH_SIZE },
  batchLength: { min: 1000, max: 100000, fallback: DEFAULT_BATCH_LENGTH },
  batchConcurrency: { min: 1, max: 100, fallback: DEFAULT_BATCH_CONCURRENCY },
  temperature: {
    min: 0,
    max: 2,
    fallback: DEFAULT_API_SETTING.temperature,
    decimal: true,
  },
  maxTokens: { min: 0, max: 1000000, fallback: DEFAULT_API_SETTING.maxTokens },
  contextSize: { min: 1, max: 20, fallback: DEFAULT_CONTEXT_SIZE },
};
export const CACHE_LIMITS = {
  cacheMaxAge: { min: 0, max: 31536000, fallback: DEFAULT_CACHE_TIMEOUT },
  cacheMaxEntries: { min: 1, max: 10000, fallback: 2000 },
};
export const SUBTITLE_LIMITS = {
  chunkLength: { min: 200, max: 20000, fallback: 1000 },
  longSentenceThreshold: { min: 20, max: 500, fallback: 100 },
  preTrans: { min: 10, max: 36000, fallback: 90 },
  throttleTrans: { min: 1, max: 3600, fallback: 30 },
};
export const normalizeNumber = (value, { min, max, fallback, decimal }) => {
  const number =
    typeof value === "number" || (typeof value === "string" && value.trim())
      ? Number(value)
      : NaN;
  return Number.isFinite(number)
    ? Math.min(max, Math.max(min, decimal ? number : Math.floor(number)))
    : fallback;
};
export const normalizeNumbers = (value, limits) =>
  Object.fromEntries(
    Object.entries(limits)
      .filter(([key]) => Object.prototype.hasOwnProperty.call(value, key))
      .map(([key, limit]) => [key, normalizeNumber(value[key], limit)])
  );
