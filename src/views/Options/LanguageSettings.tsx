import Stack from "@mui/material/Stack";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useI18n } from "../../hooks/I18n";
import { useSetting } from "../../hooks/Setting";
import {
  UI_LANGS,
  OPT_LANGS_TO_REVERSED as OPT_LANGS_TO,
} from "../../config";
import { Select, SettingItem } from "../../ui";

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
  const uiLang = setting?.uiLang ?? "en";
  const skipLangs = Array.isArray(setting?.skipLangs)
    ? setting.skipLangs
    : [];

  const uiLangOptions = UI_LANGS.map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <Stack spacing={2}>
      <SettingItem title={i18n("ui_lang")}>
        <Select
          label={i18n("ui_lang")}
          value={uiLang}
          options={uiLangOptions}
          onChange={(event) =>
            updateSetting({ uiLang: event.target.value })
          }
        />
      </SettingItem>
      <SettingItem
        title={i18n("skip_langs")}
        description={i18n("skip_langs_helper")}
      >
        <Select
          label={i18n("skip_langs")}
          multiple
          value={skipLangs}
          options={SKIP_LANG_OPTIONS}
          onChange={(event: SelectChangeEvent<string>) => {
            const value = event.target.value as string | string[];
            updateSetting({
              skipLangs: Array.isArray(value) ? value : [value],
            });
          }}
        />
      </SettingItem>
    </Stack>
  );
}
