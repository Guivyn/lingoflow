import {
  APP_NAME,
  STOKEY_RULES,
  STOKEY_RULES_MATHJAX_MIGRATED,
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
  updateStoredSetting,
} from "./storage";

describe("storage adapter migration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("release version preserves existing settings and rules namespaces", () => {
    expect(STOKEY_SETTING).toBe(APP_NAME + "_setting_v1");
    expect(STOKEY_RULES).toBe(APP_NAME + "_rules_v1");
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

  test("adds MathJax defaults once without changing site rules or exclusions", async () => {
    const siteRule = {
      pattern: "example.com",
      ignoreSelector: ".site-ignore",
      keepSelector: ".site-keep",
    };
    window.localStorage.setItem(
      STOKEY_RULES,
      JSON.stringify([
        siteRule,
        { pattern: "*", ignoreSelector: "button", keepSelector: "code" },
      ])
    );

    await runDataMigration();

    const migratedRules = JSON.parse(window.localStorage.getItem(STOKEY_RULES));
    expect(migratedRules[0]).toEqual(siteRule);
    expect(migratedRules[1].ignoreSelector).toBe("button, .MathJax_Display");
    expect(migratedRules[1].keepSelector).toBe("code, .MathJax");
    expect(
      JSON.parse(window.localStorage.getItem(STOKEY_RULES_MATHJAX_MIGRATED))
    ).toBe(true);

    await runDataMigration();
    expect(JSON.parse(window.localStorage.getItem(STOKEY_RULES))).toEqual(
      migratedRules
    );

    window.localStorage.clear();
    window.localStorage.setItem(
      STOKEY_RULES,
      JSON.stringify([
        {
          pattern: "*",
          ignoreSelector: "button, -.MathJax_Display",
          keepSelector: "code, -.MathJax",
        },
      ])
    );

    await runDataMigration();

    const excludedRules = JSON.parse(window.localStorage.getItem(STOKEY_RULES));
    expect(excludedRules[0].ignoreSelector).toBe("button, -.MathJax_Display");
    expect(excludedRules[0].keepSelector).toBe("code, -.MathJax");
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
        { apiSlug: "Google2", apiType: "Google2" },
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

  test("updates the latest setting snapshot without dropping unrelated fields", async () => {
    window.localStorage.setItem(
      STOKEY_SETTING,
      JSON.stringify({
        version: CURRENT_SETTINGS_VERSION,
        uiLang: "zh-CN",
        autoTransEnglish: false,
        tranboxSetting: { transOpen: false, toLang: "en" },
      })
    );

    const updated = await updateStoredSetting((current) => ({
      ...current,
      tranboxSetting: { ...current.tranboxSetting, transOpen: true },
    }));

    expect(updated.uiLang).toBe("zh-CN");
    expect(updated.autoTransTarget).toBe(false);
    expect(updated).not.toHaveProperty("autoTransEnglish");
    expect(updated.tranboxSetting).toEqual({ transOpen: true, toLang: "en" });
    expect(JSON.parse(window.localStorage.getItem(STOKEY_SETTING))).toEqual(
      expect.objectContaining({
        uiLang: "zh-CN",
        autoTransTarget: false,
        tranboxSetting: { transOpen: true, toLang: "en" },
      })
    );
  });

  test.each([true, false])(
    "preserves the legacy auto-translation preference %s",
    async (enabled) => {
      window.localStorage.setItem(
        STOKEY_SETTING,
        JSON.stringify({
          version: CURRENT_SETTINGS_VERSION,
          autoTransEnglish: enabled,
        })
      );
      expect(await getSettingWithDefault()).toEqual(
        expect.objectContaining({
          autoTransTarget: enabled,
        })
      );
      await runDataMigration();
      const stored = JSON.parse(window.localStorage.getItem(STOKEY_SETTING));
      expect(stored.autoTransTarget).toBe(enabled);
      expect(stored).not.toHaveProperty("autoTransEnglish");
    }
  );

  test("prefers the new setting when both names are present", () => {
    expect(
      normalizeSetting({ autoTransTarget: false, autoTransEnglish: true })
    ).toEqual({ autoTransTarget: false });
  });
});
