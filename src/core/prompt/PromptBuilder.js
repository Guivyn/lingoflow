import {
  INPUT_PLACE_FROM,
  INPUT_PLACE_TO,
  INPUT_PLACE_TEXT,
  INPUT_PLACE_TONE,
  INPUT_PLACE_TITLE,
  INPUT_PLACE_DESCRIPTION,
  INPUT_PLACE_TO_LANG,
  INPUT_PLACE_FROM_LANG,
  INPUT_PLACE_SUMMARY,
  INPUT_PLACE_CONTEXT,
} from "../../config";
import { buildDocContext } from "../context/ContextBuilder";

/**
 * 依据配置参数和当前页面元数据生成大模型 Prompt 系统指示。
 */
export const buildSystemPrompt = ({
  systemPrompt,
  tone,
  from,
  to,
  fromLang,
  toLang,
  texts,
  docInfo,
}) => {
  const { title, description, summary, context } =
    buildDocContext(docInfo);
  return String(systemPrompt || "")
    .replaceAll(INPUT_PLACE_TITLE, title)
    .replaceAll(INPUT_PLACE_DESCRIPTION, description)
    .replaceAll(INPUT_PLACE_SUMMARY, summary)
    .replaceAll(INPUT_PLACE_CONTEXT, context)
    .replaceAll(INPUT_PLACE_TONE, tone)
    .replaceAll("{{glossary}}", "")
    .replaceAll(INPUT_PLACE_FROM, from)
    .replaceAll(INPUT_PLACE_TO, to)
    .replaceAll(INPUT_PLACE_FROM_LANG, fromLang)
    .replaceAll(INPUT_PLACE_TO_LANG, toLang)
    .replaceAll(INPUT_PLACE_TEXT, texts[0]);
};

export const buildUserPrompt = ({
  nobatchUserPrompt,
  useBatchFetch,
  tone,
  from,
  to,
  fromLang,
  toLang,
  texts,
  docInfo,
}) => {
  const { title, description, summary, context } =
    buildDocContext(docInfo);

  if (useBatchFetch) {
    const promptObj = {
      targetLanguage: toLang,
      segments: texts.map((text, i) => ({ id: i, text })),
    };

    title && (promptObj.title = title);
    description && (promptObj.description = description);

    tone && (promptObj.tone = tone);

    return JSON.stringify(promptObj);
  }

  return String(nobatchUserPrompt || "")
    .replaceAll(INPUT_PLACE_TITLE, title)
    .replaceAll(INPUT_PLACE_DESCRIPTION, description)
    .replaceAll(INPUT_PLACE_SUMMARY, summary)
    .replaceAll(INPUT_PLACE_CONTEXT, context)
    .replaceAll(INPUT_PLACE_TONE, tone)
    .replaceAll("{{glossary}}", "")
    .replaceAll(INPUT_PLACE_FROM, from)
    .replaceAll(INPUT_PLACE_TO, to)
    .replaceAll(INPUT_PLACE_FROM_LANG, fromLang)
    .replaceAll(INPUT_PLACE_TO_LANG, toLang)
    .replaceAll(INPUT_PLACE_TEXT, texts[0]);
};

// 统一生成最终字幕系统提示词；缓存签名与实际请求必须复用同一结果。
export const buildSubtitleSystemPrompt = ({
  subtitlePrompt,
  tone,
  from,
  to,
  fromLang,
  toLang,
  docInfo,
}) => {
  const { title, description, summary } = buildDocContext(docInfo);
  return String(subtitlePrompt || "")
    .replaceAll(INPUT_PLACE_TITLE, title)
    .replaceAll(INPUT_PLACE_DESCRIPTION, description)
    .replaceAll(INPUT_PLACE_SUMMARY, summary)
    .replaceAll(INPUT_PLACE_TONE, tone)
    .replaceAll("{{glossary}}", "")
    .replaceAll(INPUT_PLACE_FROM, from)
    .replaceAll(INPUT_PLACE_TO, to)
    .replaceAll(INPUT_PLACE_FROM_LANG, fromLang)
    .replaceAll(INPUT_PLACE_TO_LANG, toLang);
};

// 字幕用户消息保持为纯 JSON，避免只读上下文污染模型的边界编号。
export const buildSubtitleUserPrompt = ({ formattedEvents }) =>
  JSON.stringify(formattedEvents);

export class PromptBuilder {
  #system = [];

  #user = [];

  addSystem(text) {
    if (text) this.#system.push(text);
    return this;
  }

  addUser(text) {
    if (text) this.#user.push(text);
    return this;
  }

  build() {
    return {
      system: this.#system.join("\n\n"),
      user: this.#user.join("\n\n"),
    };
  }
}
