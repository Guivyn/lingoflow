import {
  getSettingVersion,
  migrateSettingPromptsToV2,
  SETTINGS_VERSION_V2,
  SETTINGS_VERSION_V3,
  SETTINGS_VERSION_V4,
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

export type SettingRecord = Record<string, unknown>;
export type SettingMigration = (setting: SettingRecord) => SettingRecord;

/**
 * 版本化 migration 表：`migrations[v]` 负责把版本 `v - 1` 升级到 `v`。
 * 新版本只需追加条目，调用方统一走 `runSettingMigrations` 链式执行。
 */
export const SETTINGS_MIGRATIONS: Partial<Record<number, SettingMigration>> = {
  [SETTINGS_VERSION_V2]: migrateSettingPromptsToV2 as unknown as SettingMigration,
  [SETTINGS_VERSION_V3]: migrateSubtitleStyleToV3,
  [SETTINGS_VERSION_V4]: migrateBatchDefaultsToV4,
};

export { CURRENT_SETTINGS_VERSION, SETTINGS_SCHEMA_VERSION };

// v1.2.x 之前的批处理出厂默认值；只替换与出厂默认完全一致的值，保留用户自定义参数。
const LEGACY_BATCH_INTERVAL = 400;
const BATCH_INTERVAL_V4 = 150;
const LEGACY_BATCH_CONCURRENCY = 1;
const BATCH_CONCURRENCY_V4 = 2;

/**
 * 把仍使用旧出厂默认值的批处理参数升级到 v4 的更快速默认值：
 * batchInterval 400ms -> 150ms，batchConcurrency 1 -> 2。
 * 仅当字段与旧出厂默认完全相等时才覆盖，用户显式配置的自定义值保持不变。
 */
function migrateBatchDefaultsToV4(setting: SettingRecord): SettingRecord {
  const transApis = Array.isArray(setting.transApis) ? setting.transApis : [];
  const nextApis = transApis.map((api) => {
    if (!api || typeof api !== "object" || Array.isArray(api)) {
      return api;
    }

    const next = { ...(api as Record<string, unknown>) };
    let changed = false;
    if (next.batchInterval === LEGACY_BATCH_INTERVAL) {
      next.batchInterval = BATCH_INTERVAL_V4;
      changed = true;
    }
    if (next.batchConcurrency === LEGACY_BATCH_CONCURRENCY) {
      next.batchConcurrency = BATCH_CONCURRENCY_V4;
      changed = true;
    }
    return changed ? next : api;
  });

  const hasChanges = nextApis.some((next, index) => next !== transApis[index]);
  return {
    ...setting,
    ...(hasChanges ? { transApis: nextApis } : {}),
    version: SETTINGS_VERSION_V4,
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
