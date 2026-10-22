/**
 * Options 与 Storage 共享的配置契约类型。
 * ProviderConfig 描述 transApis 条目；Config 是未参与运行期存储读写的分域类型。
 */

export type DarkMode = "dark" | "light" | "auto";

/**
 * 单个翻译 Provider 的持久化配置，与现有 `transApis` 条目保持一致。
 */
export type ProviderConfig = {
  apiSlug: string;
  apiName?: string;
  apiType: string;
  url?: string;
  key?: string;
  model?: string;
  modelListUrl?: string;
  isDisabled?: boolean;
  sortOrder?: number;
  useBatchFetch?: boolean;
  useStream?: boolean;
  streamRenderMode?: string;
  httpTimeout?: number;
  [key: string]: unknown;
};

/**
 * 当前扁平结构的全局设置类型（存储契约的子集）。
 */
export type Setting = {
  version?: number;
  darkMode?: DarkMode;
  uiLang?: string;
  transApis?: ProviderConfig[];
  prompts?: unknown[];
  shortcuts?: Record<string, unknown>;
  tranboxSetting?: Record<string, unknown>;
  subtitleSetting?: Record<string, unknown>;
  customStyles?: unknown[];
  autoTransTarget?: boolean;
  skipLangs?: string[];
  blacklist?: string;
  csplist?: string;
  orilist?: string;
  logLevel?: number;
  [key: string]: unknown;
};

export type LanguageConfig = {
  primary: string;
  secondary?: string;
  skip?: string[];
};

export type RendererConfig = {
  style?: string;
  maxLength?: number;
  newlineLength?: number;
};

export type RulesConfig = {
  blacklist?: string;
  csplist?: string;
  orilist?: string;
};

/**
 * 分域配置类型：`language`、`providers`、`renderer`、`rules` 分域管理。
 * 此类型不参与存储读写。
 */
export type Config = {
  version: number;
  language: LanguageConfig;
  providers: ProviderConfig[];
  renderer: RendererConfig;
  rules: RulesConfig;
};
