import {
  CURRENT_SETTINGS_VERSION,
  runSettingMigrations,
  SETTINGS_MIGRATIONS,
} from "./migrations";
import { SETTINGS_SCHEMA_VERSION } from "./schema";
import { SETTINGS_VERSION_V2 } from "../../config/prompt";

describe("settings migrations", () => {
  test("keeps version constants in sync", () => {
    expect(CURRENT_SETTINGS_VERSION).toBe(SETTINGS_SCHEMA_VERSION);
    expect(CURRENT_SETTINGS_VERSION).toBe(SETTINGS_VERSION_V2);
    expect(SETTINGS_MIGRATIONS[CURRENT_SETTINGS_VERSION]).toBeDefined();
  });

  test("returns current settings unchanged", () => {
    const setting = { version: CURRENT_SETTINGS_VERSION, uiLang: "en" };
    expect(runSettingMigrations(setting)).toBe(setting);
  });

  test("migrates v1 settings to the current version", () => {
    const migrated = runSettingMigrations({
      version: 1,
      uiLang: "zh-CN",
      transApis: [],
    });

    expect(migrated.version).toBe(CURRENT_SETTINGS_VERSION);
    expect(migrated.uiLang).toBe("zh-CN");
  });

  test("throws when a migration in the chain is missing", () => {
    const currentMigration = SETTINGS_MIGRATIONS[CURRENT_SETTINGS_VERSION];
    delete SETTINGS_MIGRATIONS[CURRENT_SETTINGS_VERSION];

    try {
      expect(() =>
        runSettingMigrations({ version: CURRENT_SETTINGS_VERSION - 1 })
      ).toThrow(/Missing settings migration/);
    } finally {
      SETTINGS_MIGRATIONS[CURRENT_SETTINGS_VERSION] = currentMigration;
    }
  });

  test("returns an empty object for invalid input", () => {
    expect(runSettingMigrations(null)).toEqual({});
    expect(runSettingMigrations(undefined)).toEqual({});
  });
});
