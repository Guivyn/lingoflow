import { CURRENT_SETTINGS_VERSION } from "../../config/prompt";
import {
  DEFAULT_BATCH_CONCURRENCY,
  DEFAULT_BATCH_INTERVAL,
  DEFAULT_BATCH_LENGTH,
  DEFAULT_BATCH_SIZE,
  DEFAULT_FETCH_INTERVAL,
  DEFAULT_FETCH_LIMIT,
  DEFAULT_HTTP_TIMEOUT,
} from "../../config/api";

export const SETTINGS_SCHEMA_VERSION = 4;
export { CURRENT_SETTINGS_VERSION };

export const SETTINGS_SCHEMA = {
  uiLang: { type: "string" },
  darkMode: { type: "string", enum: ["dark", "light", "auto"] },
  shortcuts: { type: "object" },
  tranboxSetting: { type: "object" },
  subtitleSetting: { type: "object" },
  transApis: { type: "array" },
  customStyles: { type: "array" },
  prompts: { type: "array" },
  autoTransEnglish: { type: "boolean" },
  logLevel: { type: "string" },
  version: { type: "number" },
};

const validateSettingField = (field, value) => {
  const spec = SETTINGS_SCHEMA[field];
  if (!spec) return true;
  if (value === undefined || value === null) return true;

  switch (spec.type) {
    case "string":
      return (
        typeof value === "string" && (!spec.enum || spec.enum.includes(value))
      );
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    default:
      return true;
  }
};

const sanitizeTransApis = (transApis) => {
  if (!Array.isArray(transApis)) return transApis;
  const numericFields = {
    fetchLimit: { min: 1, max: 100, fallback: DEFAULT_FETCH_LIMIT },
    fetchInterval: { min: 0, max: 5000, fallback: DEFAULT_FETCH_INTERVAL },
    httpTimeout: { min: 1, max: 600, fallback: DEFAULT_HTTP_TIMEOUT },
    batchInterval: { min: 10, max: 10000, fallback: DEFAULT_BATCH_INTERVAL },
    batchSize: { min: 1, max: 100, fallback: DEFAULT_BATCH_SIZE },
    batchLength: { min: 1000, max: 100000, fallback: DEFAULT_BATCH_LENGTH },
    batchConcurrency: {
      min: 1,
      max: 100,
      fallback: DEFAULT_BATCH_CONCURRENCY,
    },
  };

  return transApis
    .filter(
      (api) =>
        api &&
        typeof api === "object" &&
        !Array.isArray(api) &&
        typeof api.apiSlug === "string" &&
        api.apiSlug.trim() !== "" &&
        api.apiType !== "Google2"
    )
    .map((api) => {
      const normalizedApi = { ...api };
      for (const [field, bounds] of Object.entries(numericFields)) {
        if (!Object.prototype.hasOwnProperty.call(normalizedApi, field)) {
          continue;
        }
        const value = normalizedApi[field];
        if (typeof value !== "number" || !Number.isFinite(value)) {
          normalizedApi[field] = bounds.fallback;
        } else {
          normalizedApi[field] = Math.min(
            bounds.max,
            Math.max(bounds.min, Math.floor(value))
          );
        }
      }
      return normalizedApi;
    });
};

export const normalizeSetting = (setting = {}) => {
  const normalized = { ...setting };
  for (const field of Object.keys(SETTINGS_SCHEMA)) {
    if (!validateSettingField(field, normalized[field])) {
      delete normalized[field];
    }
  }
  if (Array.isArray(normalized.transApis)) {
    normalized.transApis = sanitizeTransApis(normalized.transApis);
  }
  return normalized;
};
