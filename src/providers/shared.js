import { stripMarkdownCodeBlock } from "../libs/utils";
import { decodeHTMLEntities } from "../libs/html";
import { parseCompleteTranslationSegments } from "../libs/aiResponseParser";
import { createSubtitleIndexAligner } from "../libs/subtitleIndexAlign";
import { parseBilingualVtt } from "../subtitle/vtt";
import {
  isLegacyIndexSubtitleItem,
  mapBoundaryItemToCue,
} from "../subtitle/subtitleBoundaryProtocol";
import { appLog } from "../libs/log";

export const stringifyParams = (params) =>
  new URLSearchParams(params).toString();

/**
 * 解析大模型返回的翻译内容。
 * @param {string} raw 大模型返回的原始字符串内容
 * @param {boolean} useBatchFetch 是否为批量翻译模式
 * @returns {Array<[string, string]>} 解析后的双元组列表 [译文, 源语言检测结果]
 */
export const parseAIRes = (raw, useBatchFetch = true) => {
  if (!raw) {
    return [];
  }

  if (!useBatchFetch) {
    return [[raw]];
  }

  let content = stripMarkdownCodeBlock(raw).trim();
  const structuredSegments = parseCompleteTranslationSegments(content, {
    decodeText: decodeHTMLEntities,
  });
  if (structuredSegments.length > 0) {
    return structuredSegments.map((segment) => segment.translation);
  }

  return content.split("\n").map((line) => {
    const text = decodeHTMLEntities(line.replace(/<br\s*\/?>/gi, "\n").trim());
    return [text, ""];
  });
};

/** 依据时间差计算旧版字幕输入使用的停顿等级。 */
export const getPauseLevel = (gapMs) => {
  if (!Number.isFinite(gapMs) || gapMs <= 300) return 0;
  if (gapMs <= 600) return 1;
  if (gapMs <= 1200) return 2;
  return 3;
};

const parseIndexSubtitleRes = (raw, events, fromLang = "auto") => {
  const aligner = createSubtitleIndexAligner(events);
  const buildResult = (data) => {
    if (!Array.isArray(data) || !data.length) return null;
    const legacyItems = data.map(isLegacyIndexSubtitleItem);
    if (legacyItems.some(Boolean) && !legacyItems.every(Boolean)) return null;

    if (!legacyItems[0]) {
      const result = [];
      let nextIndex = 0;
      for (const item of data) {
        const cue = mapBoundaryItemToCue(item, events, nextIndex, fromLang);
        if (!cue) break;
        result.push(cue);
        nextIndex = cue._ei + 1;
      }
      return result.length ? result : null;
    }

    const result = [];
    for (const seg of data) {
      const s = Number(seg.s ?? seg.start_id);
      const e = Number(seg.e ?? seg.end_id);
      if (!Number.isInteger(s) || !Number.isInteger(e)) continue;
      const startIdx = Math.max(0, Math.min(s, events.length - 1));
      const endIdx = Math.max(startIdx, Math.min(e, events.length - 1));
      const text = String(seg.o ?? seg.original ?? "");
      const fixed = aligner.realign(s, e, text);
      result.push({
        start: events[fixed?.startIdx ?? startIdx].start,
        end: events[fixed?.endIdx ?? endIdx].end,
        text,
        translation: String(seg.t ?? seg.translation ?? ""),
        _si: s,
        _ei: e,
        ...(fixed && {
          _alignedSi: fixed.startIdx,
          _alignedEi: fixed.endIdx,
        }),
      });
    }
    return result.length ? result : null;
  };

  const stripped = stripMarkdownCodeBlock(String(raw ?? "")).trim();
  const repaired = stripped.replace(/"([a-z_]+)">>/g, '"$1":">>');

  try {
    return buildResult(JSON.parse(repaired));
  } catch {
    try {
      const arrayStart = repaired.indexOf("[");
      const lastObjectEnd = repaired.lastIndexOf("}");
      if (arrayStart < 0 || lastObjectEnd < arrayStart) return null;
      return buildResult(
        JSON.parse(repaired.slice(arrayStart, lastObjectEnd + 1) + "]")
      );
    } catch {
      return null;
    }
  }
};

/** 解析字幕断句/翻译接口返回内容。 */
export const parseSTRes = (raw, events = null, fromLang = "auto") => {
  if (!raw) {
    return [];
  }

  if (events?.length) {
    const indexed = parseIndexSubtitleRes(raw, events, fromLang);
    if (indexed) return indexed;
  }

  try {
    const data = parseBilingualVtt(raw);
    if (Array.isArray(data)) {
      return data;
    }
  } catch (err) {
    appLog("parse AI Res: subtitle", err);
  }

  return [];
};

/**
 * 注入推理模式（Thinking）的专用控制参数。
 * @param {Object} body 请求体
 * @param {Object} options.thinking provider 的思考模式配置
 */
export const injectThinking = (
  body,
  { thinking, thinkingMode, thinkingEffort }
) => {
  if (thinkingMode === "auto" || !thinking) return;

  const hasEffort = thinkingEffort && thinkingEffort !== "_default";

  switch (thinking.type) {
    case "deepseek":
      body.thinking = {
        type: thinkingMode === "enabled" ? "enabled" : "disabled",
      };
      if (thinkingMode === "enabled" && hasEffort) {
        body.reasoning_effort = thinkingEffort;
      }
      break;
    case "openai":
      if (thinkingMode === "disabled") {
        body.reasoning_effort = "none";
      } else if (thinkingMode === "enabled" && hasEffort) {
        body.reasoning_effort = thinkingEffort;
      }
      break;
    default:
      break;
  }
};
