/**
 * Options 与 Storage 共享的配置契约类型。
 * 这些类型先作为目标模型落地，不改变现有扁平 setting 的存储结构；
 * 后续做“扁平 setting -> 嵌套 Config”大迁移时再接入实际读写。
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
  autoTransEnglish?: boolean;
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
 * 目标配置模型：`language`、`providers`、`renderer`、`rules` 分域管理。
 * 本轮仅作为类型契约，不参与存储读写。
 */
export type Config = {
  version: number;
  language: LanguageConfig;
  providers: ProviderConfig[];
  renderer: RendererConfig;
  rules: RulesConfig;
};
