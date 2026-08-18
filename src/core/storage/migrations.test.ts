import {
  CURRENT_SETTINGS_VERSION,
  runSettingMigrations,
  SETTINGS_MIGRATIONS,
} from "./migrations";
import { SETTINGS_SCHEMA_VERSION } from "./schema";
import {
  SETTINGS_VERSION_V2,
  SETTINGS_VERSION_V3,
  SETTINGS_VERSION_V4,
} from "../../config/prompt";

describe("settings migrations", () => {
  test("keeps version constants in sync", () => {
    expect(CURRENT_SETTINGS_VERSION).toBe(SETTINGS_SCHEMA_VERSION);
    expect(CURRENT_SETTINGS_VERSION).toBe(SETTINGS_VERSION_V4);
    expect(SETTINGS_MIGRATIONS[CURRENT_SETTINGS_VERSION]).toBeDefined();
  });

  test("upgrades legacy batch defaults while preserving custom values", () => {
    const migrated = runSettingMigrations({
      version: SETTINGS_VERSION_V3,
      transApis: [
        {
          apiSlug: "openai",
          apiType: "OpenAI",
          batchInterval: 400,
          batchConcurrency: 1,
        },
        {
          apiSlug: "my-custom",
          apiType: "Custom",
          batchInterval: 500,
          batchConcurrency: 3,
        },
      ],
    });

    expect(migrated.version).toBe(CURRENT_SETTINGS_VERSION);
    const transApis = migrated.transApis as Array<Record<string, unknown>>;
    expect(transApis[0]).toMatchObject({
      batchInterval: 150,
      batchConcurrency: 2,
    });
    expect(transApis[1]).toMatchObject({
      batchInterval: 500,
      batchConcurrency: 3,
    });
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

  test("upgrades legacy subtitle styles to reading companion defaults", () => {
    const migrated = runSettingMigrations({
      version: SETTINGS_VERSION_V2,
      subtitleSetting: {
        windowStyle: `padding: 0.5em 1em;
background-color: rgba(0, 0, 0, 0.5);
color: white;
line-height: 1.3;
text-shadow: 1px 1px 2px black;
display: inline-block`,
        originStyle: "font-size: clamp(1rem, 2cqw, 3rem);",
        translationStyle: "font-size: clamp(1rem, 2cqw, 3rem);",
      },
    });

    expect(migrated.version).toBe(CURRENT_SETTINGS_VERSION);
    const subtitle = migrated.subtitleSetting as Record<string, unknown>;
    expect(subtitle.windowStyle).toContain(
      "background: rgba(27, 25, 21, 0.72)"
    );
    expect(subtitle.originStyle).toContain(
      "color: rgba(255, 255, 255, 0.72)"
    );
    expect(subtitle.translationStyle).toContain("font-weight: 500");
  });

  test("keeps custom subtitle styles during migration", () => {
    const migrated = runSettingMigrations({
      version: SETTINGS_VERSION_V2,
      subtitleSetting: {
        windowStyle: "background: pink;",
        originStyle: "font-size: 20px;",
        translationStyle: "color: lime;",
      },
    });

    expect(migrated.version).toBe(CURRENT_SETTINGS_VERSION);
    expect(migrated.subtitleSetting as Record<string, unknown>).toEqual({
      windowStyle: "background: pink;",
      originStyle: "font-size: 20px;",
      translationStyle: "color: lime;",
    });
  });

  test("returns an empty object for invalid input", () => {
    expect(runSettingMigrations(null)).toEqual({});
    expect(runSettingMigrations(undefined)).toEqual({});
  });
});
