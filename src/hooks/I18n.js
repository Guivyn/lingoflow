import { useSetting } from "./Setting";
import { I18N } from "../config";

/**
 * 获取多语言文本的工具函数
 * @param {string} uiLang 当前界面语言 (如 'zh-CN', 'en')
 * @param {string} key 翻译键名
 * @param {string} defaultText 默认备用文本
 * @returns {string} 本地化后的文本
 */
const getI18n = (uiLang, key, defaultText = "") => {
  return I18N?.[key]?.[uiLang] ?? defaultText;
};

// 预柯里化语言参数，返回一个只需传入 key 的获取翻译函数
export const useLangMap = (uiLang) => {
  return (key, defaultText = "") => getI18n(uiLang, key, defaultText);
};

/**
 * 界面多语言本地化的自定义 Hook
 * @returns {function} i18n(key, defaultText) 翻译函数
 */
export const useI18n = () => {
  const {
    setting: { uiLang },
  } = useSetting();
  return useLangMap(uiLang);
};
