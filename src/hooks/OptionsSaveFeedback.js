import { useSyncExternalStore } from "react";
import { STOKEY_SETTING, STOKEY_RULES, STOKEY_FAB } from "../config";
import { getSaveSnapshot, subscribeSaveFeedback } from "../libs/saveFeedback";
import { useI18n } from "./I18n";

export function useOptionsSaveFeedback(settingStatus) {
  const snapshot = useSyncExternalStore(
    subscribeSaveFeedback,
    getSaveSnapshot,
    getSaveSnapshot
  );
  const i18n = useI18n();
  const sources = [
    [STOKEY_SETTING, i18n("save_source_settings")],
    [STOKEY_RULES, i18n("save_source_rules")],
    [STOKEY_FAB, i18n("save_source_fab")],
  ];
  const errors = sources.filter(
    ([key]) =>
      snapshot[key]?.status === "error" ||
      (key === STOKEY_SETTING && settingStatus === "error")
  );
  const saving =
    settingStatus === "saving" ||
    sources.some(([key]) => snapshot[key]?.status === "saving");
  const saved =
    settingStatus === "saved" ||
    sources.some(([key]) => snapshot[key]?.status === "saved");
  return {
    error: errors.length
      ? i18n("save_failed_sources").replace(
          "{sources}",
          errors.map(([, label]) => label).join(" / ")
        )
      : "",
    statusText: errors.length
      ? ""
      : saving
        ? i18n("save_pending")
        : saved
          ? i18n("save_complete")
          : "",
  };
}
