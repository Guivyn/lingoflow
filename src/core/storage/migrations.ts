import {
  getSettingVersion,
  migrateSettingPromptsToV2,
  SETTINGS_VERSION_V2,
  SETTINGS_VERSION_V3,
  SETTINGS_VERSION_V4,
  SETTINGS_VERSION_V5,
} from "../../config/prompt";
import { CURRENT_SETTINGS_VERSION, SETTINGS_SCHEMA_VERSION } from "./schema";
import {
  LEGACY_SUBTITLE_ORIGIN_STYLE,
  LEGACY_SUBTITLE_TRANSLATION_STYLE,
  LEGACY_SUBTITLE_WINDOW_STYLE,
  SUBTITLE_ORIGIN_STYLE,
  SUBTITLE_TRANSLATION_STYLE,
  SUBTITLE_WINDOW_STYLE,
} from "../../config/setting";
import { DEFAULT_API_LIST, OPT_TRANS_GOOGLE } from "../../config/api";

export type SettingRecord = Record<string, unknown>;
export type SettingMigration = (setting: SettingRecord) => SettingRecord;

/**
 * 版本化 migration 表：`migrations[v]` 负责把版本 `v - 1` 升级到 `v`。
 * 新版本只需追加条目，调用方统一走 `runSettingMigrations` 链式执行。
 */
export const SETTINGS_MIGRATIONS: Partial<Record<number, SettingMigration>> = {
  [SETTINGS_VERSION_V2]:
    migrateSettingPromptsToV2 as unknown as SettingMigration,
  [SETTINGS_VERSION_V3]: migrateSubtitleStyleToV3,
  [SETTINGS_VERSION_V4]: migrateBatchDefaultsToV4,
  [SETTINGS_VERSION_V5]: migrateGoogleToGoogle2,
};

export { CURRENT_SETTINGS_VERSION, SETTINGS_SCHEMA_VERSION };

/**
 * 旧存储没有记录批处理参数是默认值还是用户主动选择的值，因此无法
 * 安全地区分旧默认与用户偏好。升级配置版本时保留现有参数，避免覆盖
 * 用户选择的串行处理或较长等待时间。
 */
function migrateBatchDefaultsToV4(setting: SettingRecord): SettingRecord {
  return {
    ...setting,
    version: SETTINGS_VERSION_V4,
  };
}

/**
 * v5 将原先名为 Google 的 gtx 单条接口升级为上游 Google2 批量接口。
 * 保留 apiSlug/apiName 和用户自定义 Key，但统一替换已失效的协议字段。
 */
function migrateGoogleToGoogle2(setting: SettingRecord): SettingRecord {
  const googleDefault = DEFAULT_API_LIST.find(
    (api) => api.apiType === OPT_TRANS_GOOGLE
  );
  const transApis = Array.isArray(setting.transApis)
    ? setting.transApis.map((api) => {
        if (api?.apiType !== OPT_TRANS_GOOGLE || !googleDefault) return api;
        return {
          ...api,
          url: googleDefault.url,
          key: api.key || googleDefault.key,
          useBatchFetch: true,
          placetag: "a",
          placetagFormat: "attribute",
        };
      })
    : setting.transApis;

  return {
    ...setting,
    transApis,
    version: SETTINGS_VERSION_V5,
  };
}

/**
 * 把仍是旧版默认值的字幕样式升级到新版阅读伴侣样式。
 * 只替换与出厂默认完全一致的字符串，保留用户的自定义样式。
 */
function migrateSubtitleStyleToV3(setting: SettingRecord): SettingRecord {
  const subtitle = setting.subtitleSetting as
    | Record<string, unknown>
    | undefined;
  if (!subtitle) {
    return { ...setting, version: SETTINGS_VERSION_V3 };
  }

  const nextSubtitle = { ...subtitle };
  if (nextSubtitle.windowStyle === LEGACY_SUBTITLE_WINDOW_STYLE) {
    nextSubtitle.windowStyle = SUBTITLE_WINDOW_STYLE;
  }
  if (nextSubtitle.originStyle === LEGACY_SUBTITLE_ORIGIN_STYLE) {
    nextSubtitle.originStyle = SUBTITLE_ORIGIN_STYLE;
  }
  if (nextSubtitle.translationStyle === LEGACY_SUBTITLE_TRANSLATION_STYLE) {
    nextSubtitle.translationStyle = SUBTITLE_TRANSLATION_STYLE;
  }

  return {
    ...setting,
    subtitleSetting: nextSubtitle,
    version: SETTINGS_VERSION_V3,
  };
}

/**
 * 按版本链依次执行 migration，直到当前存储版本。
 * 已经是当前版本时原样返回，不发生任何变更。
 */
export function runSettingMigrations(
  setting: SettingRecord | null | undefined
): SettingRecord {
  if (!setting || typeof setting !== "object") {
    return {};
  }

  let current = setting;
  let version = getSettingVersion(current);

  while (version < CURRENT_SETTINGS_VERSION) {
    const targetVersion = version + 1;
    const migration = SETTINGS_MIGRATIONS[targetVersion];
    if (!migration) {
      throw new Error(
        `Missing settings migration for version ${version} -> ${targetVersion}`
      );
    }

    const next = migration(current);
    const nextVersion = getSettingVersion(next);
    if (nextVersion <= version) {
      throw new Error(
        `Settings migration ${version} -> ${targetVersion} did not advance version`
      );
    }

    current = next;
    version = nextVersion;
  }

  return current;
}
