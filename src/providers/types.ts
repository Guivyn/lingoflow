/**
 * TranslationProvider 目标接口。
 * 先对齐现有 src/providers/shared.js 的真实契约（apiType / capabilities / 解析方法），
 * 后续 Registry 演进时由该接口约束实现，避免目标架构与实际实现脱节。
 */

export type ProviderCapabilityKey =
  | "builtin"
  | "machine"
  | "ai"
  | "mulkeys"
  | "batch"
  | "context"
  | "stream"
  | "darkIcon"
  | "sponsor";

export type ProviderCapabilities = Partial<
  Record<ProviderCapabilityKey, boolean>
>;

export type ThinkingEffort = {
  value: string;
  label: string;
};

export type ThinkingConfig = {
  type: string;
  efforts?: ThinkingEffort[];
  disableSupported?: boolean;
} | null;

export type BuildRequestOptions = {
  url?: string;
  key?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
  texts?: string[];
  fromLang?: string;
  toLang?: string;
  temperature?: number;
  maxTokens?: number;
  hisMsgs?: unknown[];
  useStream?: boolean;
  useBatchFetch?: boolean;
  thinkingMode?: string;
  thinkingEffort?: string;
  [key: string]: unknown;
};

export type TranslationProvider = {
  apiType: string;
  name: string;
  capabilities: ProviderCapabilities;
  thinking: ThinkingConfig;
  buildRequest?: (options: BuildRequestOptions) => unknown;
  parseTranslate?: (
    res: unknown,
    options?: Record<string, unknown>
  ) => unknown;
  parseDict?: (res: unknown) => unknown;
  parseSubtitle?: (res: unknown, options?: Record<string, unknown>) => unknown;
  parseSummarize?: (res: unknown) => unknown;
  parseStreamDelta?: (json: unknown) => string;
};
