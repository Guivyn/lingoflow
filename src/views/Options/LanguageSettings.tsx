import type { SelectChangeEvent } from "@mui/material/Select";
import { useI18n } from "../../hooks/I18n";
import { useSetting } from "../../hooks/Setting";
import {
  UI_LANGS,
  OPT_LANGS_TO_REVERSED as OPT_LANGS_TO,
} from "../../config";
import { Select, SettingRow, SettingSection } from "../../ui";

const SKIP_LANG_OPTIONS = OPT_LANGS_TO.map(([value, label]) => ({
  value,
  label,
}));

/**
 * 语言相关设置区：界面语言与整页翻译跳过语言。
 */
export default function LanguageSettings() {
  const { setting, updateSetting } = useSetting() as unknown as {
    setting: { uiLang?: string; skipLangs?: string[] };
    updateSetting: (patch: Record<string, unknown>) => void;
  };
  const i18n = useI18n() as (key: string, fallback?: string) => string;
  const uiLang = setting?.uiLang ?? "zh";
  const skipLangs = Array.isArray(setting?.skipLangs)
    ? setting.skipLangs
    : [];

  const uiLangOptions = UI_LANGS.map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <SettingSection
      title={i18n("lang_settings", "语言")}
      extra={i18n("lang_section_helper", "界面语言与整页翻译跳过语言")}
    >
      <SettingRow title={i18n("ui_lang")}>
        <Select
          value={uiLang}
          options={uiLangOptions}
          variant="standard"
          sx={{ width: "100%" }}
          onChange={(event) =>
            updateSetting({ uiLang: event.target.value })
          }
        />
      </SettingRow>
      <SettingRow
        title={i18n("skip_langs")}
        description={i18n("skip_langs_helper")}
      >
        <Select
          multiple
          value={skipLangs}
          options={SKIP_LANG_OPTIONS}
          variant="standard"
          sx={{ width: "100%" }}
          onChange={(event: SelectChangeEvent<string>) => {
            const value = event.target.value as string | string[];
            updateSetting({
              skipLangs: Array.isArray(value) ? value : [value],
            });
          }}
        />
      </SettingRow>
    </SettingSection>
  );
}
