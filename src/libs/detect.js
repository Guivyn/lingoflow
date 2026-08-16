/**
 * @file detect.js
 * @description 语言检测服务模块。整合了本地浏览器端检测与谷歌、微软的远程 API 检测服务，为划词和整页翻译提供基础语言代码匹配。
 */

import {
  OPT_TRANS_GOOGLE,
  OPT_TRANS_MICROSOFT,
  OPT_LANGS_TO_CODE,
  OPT_LANGS_MAP,
  OPT_LANGDETECTOR_MAP,
} from "../config";
import { browser } from "./browser";
import { apiGoogleLangdetect, apiMicrosoftLangdetect } from "../apis";
import { appLog } from "./log";

// 各个平台的语言检测函数映射表
const langdetectFns = {
  [OPT_TRANS_GOOGLE]: apiGoogleLangdetect,
  [OPT_TRANS_MICROSOFT]: apiMicrosoftLangdetect,
};

/**
 * 尝试检测给定文本的源语言代码
 * @param {string} text 待检测的文本内容
 * @param {string} [langDetector="-"] 选择的检测算法/接口类型 ("-" 表示仅使用本地检测)
 * @returns {Promise<string>} 语言代码（如 "en", "zh-CN", 若检测失败返回空字符串 ""）
 *
 * 说明：
 * 第 52 行调用的 `browser?.i18n?.detectLanguage` 接口仅在标准的 WebExtension 扩展环境中有效。
 */
export const tryDetectLang = async (text, langDetector = "-") => {
  let deLang = "";

  // 1. 如果配置了特定的远程/内置 AI 语言检测服务，则首选该服务进行识别
  if (OPT_LANGDETECTOR_MAP.has(langDetector)) {
    try {
      const lang = await langdetectFns[langDetector](text);
      if (lang) {
        // 转换成翻译器统一的语言代码格式
        deLang = OPT_LANGS_TO_CODE[langDetector].get(lang) || "";
      }
    } catch (err) {
      appLog("detect lang remote", err);
    }
  }

  // 2. 如果远程识别没有得出结果，采用浏览器的 i18n API 执行本地原生识别作为兜底
  if (!deLang) {
    try {
      const res = await browser?.i18n?.detectLanguage(text);
      const lang = res?.languages?.[0]?.language;
      // 仅当识别置信度高 (isReliable) 且被当前插件支持时采纳
      if (res?.isReliable && lang && OPT_LANGS_MAP.has(lang)) {
        deLang = lang;
      } else if (lang?.startsWith("zh")) {
        deLang = "zh-CN";
      }
    } catch (err) {
      appLog("detect lang local", err);
    }
  }

  return deLang;
};
