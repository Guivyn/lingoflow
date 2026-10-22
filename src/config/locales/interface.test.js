import { UI_LANGS, I18N } from "../i18n";
import { INTERFACE_I18N } from "./interface";

test("all interface messages cover every selectable UI language", () => {
  const languages = UI_LANGS.map(([code]) => code).sort();
  for (const [key, translations] of Object.entries(INTERFACE_I18N)) {
    expect(Object.keys(translations).sort()).toEqual(languages);
    for (const language of languages) {
      expect(typeof I18N[key]?.[language]).toBe("string");
      expect(I18N[key][language].trim().length).toBeGreaterThan(0);
    }
  }
  expect(INTERFACE_I18N.general_settings.zh_TW).toBe("一般設定");
  expect(INTERFACE_I18N.general_settings.ja).toBe("一般設定");
  expect(INTERFACE_I18N.general_settings.ko).toBe("일반 설정");
  expect(INTERFACE_I18N.general_settings.tr).toBe("Genel ayarlar");
  for (const value of Object.values(INTERFACE_I18N.save_failed_sources)) {
    expect(value.match(/\{sources\}/g)).toHaveLength(1);
  }
});
