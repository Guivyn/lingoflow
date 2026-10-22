import { CURRENT_SETTINGS_VERSION } from "../../config/prompt";
import {
  DEFAULT_SUBTITLE_SETTING,
  DEFAULT_SHORTCUTS,
} from "../../config/setting";
import { PROVIDER_CAPABILITIES } from "../../providers/capabilities";
import {
  API_LIMITS,
  CACHE_LIMITS,
  SUBTITLE_LIMITS,
  normalizeNumbers,
} from "./constraints";

export const SETTINGS_SCHEMA_VERSION = CURRENT_SETTINGS_VERSION;
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
  autoTransTarget: { type: "boolean" },
  logLevel: { type: "number" },
  version: { type: "number" },
};

const validateSettingField = (field, value) => {
  const spec = SETTINGS_SCHEMA[field];
  if (!spec) return true;
  if (value === undefined) return true;

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
      return (
        typeof value === "object" && value !== null && !Array.isArray(value)
      );
    default:
      return true;
  }
};

const sanitizeTransApis = (transApis) => {
  if (!Array.isArray(transApis)) return transApis;
  return transApis
    .filter(
      (api) =>
        api &&
        typeof api === "object" &&
        !Array.isArray(api) &&
        typeof api.apiSlug === "string" &&
        api.apiSlug.trim() !== "" &&
        Object.prototype.hasOwnProperty.call(PROVIDER_CAPABILITIES, api.apiType)
    )
    .map((api) => {
      const normalizedApi = { ...api, ...normalizeNumbers(api, API_LIMITS) };
      for (const field of [
        "url",
        "key",
        "model",
        "tone",
        "customHeader",
        "customBody",
        "reqHook",
        "resHook",
        "systemPrompt",
        "nobatchPrompt",
        "nobatchUserPrompt",
        "subtitlePrompt",
        "dictPrompt",
        "dictUserPrompt",
      ]) {
        if (field in api && typeof api[field] !== "string")
          normalizedApi[field] = "";
      }
      if (
        "thinkingMode" in api &&
        !["auto", "enabled", "disabled"].includes(api.thinkingMode)
      )
        normalizedApi.thinkingMode = "auto";
      for (const [field, capability] of [
        ["useStream", "stream"],
        ["useBatchFetch", "batch"],
        ["useContext", "context"],
      ]) {
        if (field in api)
          normalizedApi[field] =
            api[field] === true &&
            Boolean(PROVIDER_CAPABILITIES[api.apiType]?.[capability]);
      }
      if (
        "streamRenderMode" in api &&
        !["disabled", "realtime", "segment"].includes(api.streamRenderMode)
      )
        normalizedApi.streamRenderMode = "disabled";
      return normalizedApi;
    });
};

// 旧开关改名时保留用户偏好；新字段优先，写回时只保留一个配置来源。
export const migrateAutoTranslateSetting = (setting = {}) => {
  const normalized = { ...setting };
  if (
    typeof normalized.autoTransTarget !== "boolean" &&
    typeof normalized.autoTransEnglish === "boolean"
  ) {
    normalized.autoTransTarget = normalized.autoTransEnglish;
  }
  delete normalized.autoTransEnglish;
  return normalized;
};

export const normalizeSetting = (setting = {}, { issues } = {}) => {
  if (!setting || typeof setting !== "object" || Array.isArray(setting)) {
    issues?.push("setting: expected an object");
    return {};
  }
  const normalized = migrateAutoTranslateSetting(setting);
  Object.assign(normalized, normalizeNumbers(normalized, CACHE_LIMITS));
  for (const field of Object.keys(SETTINGS_SCHEMA)) {
    if (!validateSettingField(field, normalized[field])) {
      delete normalized[field];
    }
  }
  if (Array.isArray(normalized.transApis)) {
    normalized.transApis = sanitizeTransApis(normalized.transApis);
  }
  if (normalized.subtitleSetting) {
    const input = normalized.subtitleSetting;
    const subtitle = { ...input, ...normalizeNumbers(input, SUBTITLE_LIMITS) };
    for (const [field, fallback] of Object.entries(DEFAULT_SUBTITLE_SETTING)) {
      if (!(field in input)) continue;
      if (typeof fallback === "boolean" && typeof subtitle[field] !== "boolean")
        subtitle[field] = fallback;
      if (typeof fallback === "string" && typeof subtitle[field] !== "string")
        subtitle[field] = fallback;
    }
    for (const [field, choices] of Object.entries({
      useAlgorithmBreaker: ["rule", "statistical"],
      displayOrder: ["original-first", "translation-first"],
      hoverLookupMode: ["on", "off", "mobile_off"],
      showList: ["on", "off", "mobile_off"],
    })) {
      if (field in subtitle && !choices.includes(subtitle[field]))
        subtitle[field] = DEFAULT_SUBTITLE_SETTING[field];
    }
    normalized.subtitleSetting = subtitle;
  }
  if (normalized.shortcuts) {
    const validKeys = (keys) =>
      Array.isArray(keys) &&
      keys.length <= 4 &&
      new Set(keys).size === keys.length &&
      keys.every(
        (key) =>
          typeof key === "string" &&
          /^(?:(?:Alt|Control|Shift|Meta)(?:Left|Right)|Key[A-Z]|Digit[0-9]|F(?:[1-9]|1[0-9]|2[0-4])|Arrow(?:Up|Down|Left|Right)|Space|Enter|Escape|Tab|Backspace|Delete|Home|End|PageUp|PageDown|Insert|Comma|Period|Slash|Semicolon|Quote|BracketLeft|BracketRight|Backslash|Minus|Equal|Backquote|Numpad\w+)$/.test(
            key
          )
      );
    normalized.shortcuts = Object.fromEntries(
      Object.entries(DEFAULT_SHORTCUTS).map(([action, fallback]) => [
        action,
        validKeys(normalized.shortcuts[action])
          ? normalized.shortcuts[action]
          : [...fallback],
      ])
    );
  }
  if (issues) {
    for (const field of Object.keys(setting)) {
      if (
        field !== "autoTransEnglish" &&
        JSON.stringify(setting[field]) !== JSON.stringify(normalized[field])
      ) {
        issues.push(`${field}: invalid or unsupported values were normalized`);
      }
    }
  }
  return JSON.stringify(normalized) === JSON.stringify(setting)
    ? setting
    : normalized;
};
