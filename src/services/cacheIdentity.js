import { getCacheDigest } from "../libs/cacheDigest";

// Bump independently of the extension version when cache semantics change.
export const RESULT_CACHE_VERSION = 1;

// Explicit allowlist: never persist credentials or arbitrary settings in cache URLs.
const RESULT_FIELDS = [
  "apiSlug",
  "apiType",
  "url",
  "model",
  "tone",
  "temperature",
  "maxTokens",
  "thinkingMode",
  "thinkingEffort",
  "customHeader",
  "customBody",
  "reqHook",
  "resHook",
  "useBatchFetch",
  "useContext",
  "contextSize",
  "placeholder",
  "placetag",
  "placetagFormat",
  "cacheRevision",
];

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])])
    );
  }
  return value;
};

// In-memory only: credentials participate in batch compatibility, never cache URLs.
export const getBatchCompatibility = (args = {}) =>
  JSON.stringify(
    canonicalize({
      apiSetting: args.apiSetting,
      docInfo: args.docInfo,
      from: args.from,
      to: args.to,
      fromLang: args.fromLang,
      toLang: args.toLang,
      usePool: args.usePool,
    })
  );

export const getResultCacheIdentity = async (apiSetting, scope, input) => {
  const config = RESULT_FIELDS.map((field) => [
    field,
    apiSetting[field] ?? null,
  ]);
  return getCacheDigest(
    JSON.stringify(canonicalize([RESULT_CACHE_VERSION, scope, config, input])),
    "translation-result"
  );
};
