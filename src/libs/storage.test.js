import {
  STOKEY_RULES,
  STOKEY_SETTING,
  STOKEY_SETTING_BACKUP_V1_BEFORE_V2,
  OPT_STYLE_NONE,
  DEFAULT_API_LIST,
} from "../config";
import { CURRENT_SETTINGS_VERSION } from "../core/storage/migrations";
import { normalizeSetting } from "../core/storage/schema";
import {
  getRulesWithDefault,
  getSettingWithDefault,
  runDataMigration,
} from "./storage";

describe("storage adapter migration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("migrates v1 setting and writes a backup", async () => {
    window.localStorage.setItem(
      STOKEY_SETTING,
      JSON.stringify({
        version: 1,
        uiLang: "zh-CN",
        transApis: [],
      })
    );

    await runDataMigration();

    const stored = JSON.parse(window.localStorage.getItem(STOKEY_SETTING));
    expect(stored.version).toBe(CURRENT_SETTINGS_VERSION);
    expect(stored.uiLang).toBe("zh-CN");

    const backup = JSON.parse(
      window.localStorage.getItem(STOKEY_SETTING_BACKUP_V1_BEFORE_V2)
    );
    expect(backup.version).toBe(1);
  });

  test("returns default setting when nothing is stored", async () => {
    const setting = await getSettingWithDefault();
    expect(setting.version).toBe(CURRENT_SETTINGS_VERSION);
  });

  test("maps removed text styles when reading rules", async () => {
    window.localStorage.setItem(
      STOKEY_RULES,
      JSON.stringify([
        { pattern: "example.com", textStyle: "fuzzy" },
        { pattern: "example.org", textStyle: "blink" },
        { pattern: "example.net", textStyle: "marker" },
        { pattern: "example.io", textStyle: "gradient_marker" },
      ])
    );

    const rules = await getRulesWithDefault();
    expect(rules.map((rule) => rule.textStyle)).toEqual([
      OPT_STYLE_NONE,
      OPT_STYLE_NONE,
      OPT_STYLE_NONE,
      OPT_STYLE_NONE,
    ]);
  });

  test("normalizes malformed transApis entries", () => {
    const setting = normalizeSetting({
      version: CURRENT_SETTINGS_VERSION,
      transApis: [
        { apiSlug: "openai", apiType: "OpenAI" },
        { apiType: "DeepSeek" },
        null,
        "bad",
      ],
    });
    expect(setting.transApis).toEqual([
      { apiSlug: "openai", apiType: "OpenAI" },
    ]);
  });

  test("fills missing built-in apis while respecting deleted slugs", async () => {
    window.localStorage.setItem(
      STOKEY_SETTING,
      JSON.stringify({
        version: CURRENT_SETTINGS_VERSION,
        transApis: [
          { apiSlug: "my-custom", apiType: "Custom", apiName: "Mine" },
        ],
        deletedTransApiSlugs: ["Google"],
      })
    );

    const setting = await getSettingWithDefault();
    const slugs = setting.transApis.map((api) => api.apiSlug);
    expect(slugs).toContain("my-custom");
    expect(slugs).not.toContain("Google");
    expect(
      DEFAULT_API_LIST.every(
        (api) => slugs.includes(api.apiSlug) || api.apiSlug === "Google"
      )
    ).toBe(true);
  });
});
