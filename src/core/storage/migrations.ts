import {
  getSettingVersion,
  migrateSettingPromptsToV2,
  SETTINGS_VERSION_V2,
} from "../../config/prompt";
import { CURRENT_SETTINGS_VERSION, SETTINGS_SCHEMA_VERSION } from "./schema";

export type SettingRecord = Record<string, unknown>;
export type SettingMigration = (setting: SettingRecord) => SettingRecord;

/**
 * 版本化 migration 表：`migrations[v]` 负责把版本 `v - 1` 升级到 `v`。
 * 新版本只需追加条目，调用方统一走 `runSettingMigrations` 链式执行。
 */
export const SETTINGS_MIGRATIONS: Partial<Record<number, SettingMigration>> = {
  [SETTINGS_VERSION_V2]: migrateSettingPromptsToV2 as unknown as SettingMigration,
};

export { CURRENT_SETTINGS_VERSION, SETTINGS_SCHEMA_VERSION };

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
