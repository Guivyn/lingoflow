import { CURRENT_SETTINGS_VERSION } from "../../config/prompt";

export const SETTINGS_SCHEMA_VERSION = 3;
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
      return typeof value === "string";
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
  return transApis.filter(
    (api) =>
      api &&
      typeof api === "object" &&
      !Array.isArray(api) &&
      typeof api.apiSlug === "string" &&
      api.apiSlug.trim() !== ""
  );
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
