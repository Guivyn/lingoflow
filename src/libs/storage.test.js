import {
  STOKEY_SETTING,
  STOKEY_SETTING_BACKUP_V1_BEFORE_V2,
} from "../config";
import { CURRENT_SETTINGS_VERSION } from "../core/storage/migrations";
import { getSettingWithDefault, runDataMigration } from "./storage";

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
});
