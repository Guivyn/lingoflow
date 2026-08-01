import { apiMicrosoftDict } from "../apis/index.js";
import { logger } from "../libs/log.js";
import { trustedTypesHelper } from "../libs/trustedTypes.js";

/**
 * 动态向网页 document.head 中注入生词 hover 及详情气泡弹窗所需的 CSS 样式
 */
export const addWordHoverStyles = () => {
  // 如果已经注入过该样式表，直接返回，避免重复创建
  if (document.getElementById("lingoflow-word-hover-styles")) return;

  const style = document.createElement("style");
  style.id = "lingoflow-word-hover-styles";
  style.textContent = `
    /* 鼠标 hover 的单词样式：呈现下划线，指示可点击查词 */
    .lingoflow-word-hover {
      cursor: pointer;
      text-decoration: underline;
      text-decoration-color: #4fc3f7;
      text-decoration-thickness: 2px;
    }

    /* 查词气泡弹窗主体样式 */
    .lingoflow-word-tooltip {
      position: fixed;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      border-radius: 6px;
      padding: 12px;
      font-size: 14px;
      z-index: 2147483647;
      max-width: 300px;
      word-wrap: break-word;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-family: Arial, sans-serif;
    }

    /* 气泡弹窗头部（包含单词名和关闭按钮） */
    .lingoflow-word-tooltip-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-weight: bold;
      font-size: 16px;
      color: #4fc3f7;
    }

    /* 关闭气泡弹窗的 X 按钮 */
    .lingoflow-word-tooltip-close {
      background: none;
      border: none;
      color: #aaa;
      cursor: pointer;
      font-size: 18px;
      padding: 0;
      margin-left: 10px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .lingoflow-word-tooltip-close:hover {
      color: white;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
    }

    /* 释义加载中状态文案 */
    .lingoflow-word-loading {
      color: #bbb;
      font-style: italic;
    }

    /* 单词词性释义行 */
    .lingoflow-word-definition {
      margin: 4px 0;
    }

    /* 词性前缀标记（如 n. / v. 等） */
    .lingoflow-word-pos {
      color: #4fc3f7;
      font-weight: bold;
    }

    /* 音标字符样式 */
    .lingoflow-word-phonetic {
      color: #bbb;
      font-style: italic;
      margin-right: 10px;
    }

    /* 例句包裹区 */
    .lingoflow-word-example {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #444;
    }

    .lingoflow-word-example-title {
      font-weight: bold;
      margin-bottom: 5px;
    }

    /* 例句英文正文 */
    .lingoflow-word-example-sentence {
      margin-bottom: 3px;
    }

    /* 例句中文翻译 */
    .lingoflow-word-example-translation {
      color: #bbb;
      font-style: italic;
    }
  `;
  document.head.appendChild(style);
};

/**
 * 使用正则表达式，将英文字幕文本中的每一个独立英文单词（包括带单引号/撇号的如 it's）使用 span 标签包裹。
 *
 * @param {string} text - 原文字幕字符串
 * @returns {string} 替换为带 span 标签的 HTML 字符串
 */
export function wrapWordsWithSpans(text) {
  return String(text || "").replace(
    /\b([a-zA-Z]+(?:'[a-zA-Z]+)?)\b/g,
    '<span class="lingoflow-subtitle-word" data-word="$1">$1</span>'
  );
}

export class WordTooltipController {
  constructor({ getVideoContainer, getTimestamp }) {
    this.getVideoContainer = getVideoContainer;
    this.getTimestamp = getTimestamp;
    this.tooltipEl = null;
    this.hoverTimeout = null;
    this.activeWordEl = null;
  }

  attachSpanListeners(root, getTimestamp = this.getTimestamp) {
    if (!root) return;

    const spans = root.querySelectorAll(".lingoflow-subtitle-word");
    spans.forEach((span) => {
      if (span.dataset.lingoflowListenerAttached) return;
      const enterHandler = (event) =>
        this.#handleWordHover(event, getTimestamp);
      const leaveHandler = (event) => this.#handleWordHoverOut(event);
      span.addEventListener("pointerenter", enterHandler);
      span.addEventListener("pointerleave", leaveHandler);
      span.dataset.lingoflowListenerAttached = "1";
    });
  }

  destroy() {
    this.clearHoverState();
  }

  clearHoverState() {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    this.activeWordEl?.classList.remove("lingoflow-word-hover");
    this.activeWordEl = null;
    this.hideWordTooltip();
  }

  #handleWordHover(event, getTimestamp) {
    const target = event.target;
    if (!target.classList.contains("lingoflow-subtitle-word")) return;

    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }

    target.classList.add("lingoflow-word-hover");
    this.activeWordEl = target;

    this.hoverTimeout = setTimeout(() => {
      this.showWordTooltip(target.dataset.word, {
        timestamp: getTimestamp?.() ?? 0,
      });
    }, 300);
  }

  #handleWordHoverOut(event) {
    const target = event.target;
    if (!target.classList.contains("lingoflow-subtitle-word")) return;

    target.classList.remove("lingoflow-word-hover");
    if (this.activeWordEl === target) {
      this.activeWordEl = null;
    }

    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }

    this.hoverTimeout = setTimeout(() => {
      this.hideWordTooltip();
    }, 100);
  }

  async showWordTooltip(word, { timestamp = 0 } = {}) {
    if (this.tooltipEl) {
      this.tooltipEl.remove();
    }

    this.tooltipEl = document.createElement("div");
    this.tooltipEl.className = "lingoflow-word-tooltip";
    this.tooltipEl.innerHTML = trustedTypesHelper.createHTML(
      '<div class="lingoflow-word-loading">Looking up...</div>'
    );

    const videoContainer = this.getVideoContainer?.();
    if (videoContainer) {
      const containerRect = videoContainer.getBoundingClientRect();
      const tooltipWidth = 300;
      const tooltipHeight = 400;

      const left = containerRect.right - tooltipWidth - 45;
      const top = containerRect.top + 20;

      const maxLeft = window.innerWidth - tooltipWidth - 10;
      this.tooltipEl.style.left = Math.min(maxLeft, Math.max(10, left)) + "px";
      this.tooltipEl.style.top = Math.max(10, top) + "px";
      this.tooltipEl.style.maxWidth = tooltipWidth + "px";
      this.tooltipEl.style.maxHeight = tooltipHeight + "px";
      this.tooltipEl.style.overflow = "auto";
    }

    document.body.appendChild(this.tooltipEl);

    try {
      const dictResult = await apiMicrosoftDict(word);
      const { phonetic, definition, examples } =
        this.#extractDictionaryData(dictResult);

      this.#dispatchAddWord({
        word,
        phonetic,
        definition,
        examples,
        timestamp,
      });
      this.#renderDictionaryResult(word, dictResult);
    } catch (error) {
      logger.info("Dictionary lookup failed for word:", word, error);
      this.#dispatchAddWord({
        word,
        phonetic: "",
        definition: "",
        examples: [],
        timestamp,
      });

      if (this.tooltipEl) {
        this.tooltipEl.innerHTML =
          trustedTypesHelper.createHTML(`<div class="lingoflow-word-tooltip-header">
        <span>${word}</span>
        <button class="lingoflow-word-tooltip-close" onclick="this.closest('.lingoflow-word-tooltip').remove()">×</button>
      </div>
      <div class="lingoflow-word-definition">Failed to load definition</div>`);
      }
    }
  }

  hideWordTooltip() {
    if (this.tooltipEl) {
      this.tooltipEl.remove();
      this.tooltipEl = null;
    }
  }

  #extractDictionaryData(dictResult) {
    let phonetic = "";
    if (dictResult && dictResult.aus) {
      const usPhonetic = dictResult.aus.find((au) => au.key === "美");
      if (usPhonetic && usPhonetic.phonetic) {
        phonetic = usPhonetic.phonetic;
      } else if (dictResult.aus.length > 0 && dictResult.aus[0].phonetic) {
        phonetic = dictResult.aus[0].phonetic;
      }
    }

    let definition = "";
    if (dictResult && dictResult.trs) {
      definition = dictResult.trs
        .slice(0, 3)
        .map((tr) => `${tr.pos ? tr.pos + " " : ""}${tr.def}`)
        .join("; ");
    }

    let examples = [];
    if (dictResult && dictResult.sentences) {
      examples = dictResult.sentences.slice(0, 2).map((sentence) => ({
        eng: sentence.eng,
        chs: sentence.chs,
      }));
    }

    return { phonetic, definition, examples };
  }

  #dispatchAddWord(detail) {
    document.dispatchEvent(new CustomEvent("lingoflow-add-word", { detail }));
  }

  #renderDictionaryResult(word, dictResult) {
    if (
      dictResult &&
      (dictResult.trs || dictResult.aus || dictResult.sentences)
    ) {
      let content = `<div class="lingoflow-word-tooltip-header">
          <span>${word}</span>
          <button class="lingoflow-word-tooltip-close" onclick="this.closest('.lingoflow-word-tooltip').remove()">×</button>
        </div>`;

      if (dictResult.aus && dictResult.aus.length > 0) {
        content += "<div>";
        dictResult.aus.forEach((au) => {
          if (au.phonetic) {
            content += `<span class="lingoflow-word-phonetic">${au.phonetic}</span>`;
          }
        });
        content += "</div>";
      }

      if (dictResult.trs) {
        dictResult.trs.slice(0, 3).forEach((tr) => {
          content += `<div class="lingoflow-word-definition">${tr.pos ? '<span class="lingoflow-word-pos">' + tr.pos + "</span> " : ""}${tr.def}</div>`;
        });
      }

      if (dictResult.sentences && dictResult.sentences.length > 0) {
        content += `<div class="lingoflow-word-example">
            <div class="lingoflow-word-example-title">例句</div>`;
        dictResult.sentences.slice(0, 2).forEach((sentence) => {
          content += `<div class="lingoflow-word-example-sentence">${sentence.eng}</div>
              <div class="lingoflow-word-example-translation">${sentence.chs}</div>`;
        });
        content += "</div>";
      }

      if (this.tooltipEl) {
        this.tooltipEl.innerHTML = trustedTypesHelper.createHTML(content);
      }
      return;
    }

    if (this.tooltipEl) {
      this.tooltipEl.innerHTML =
        trustedTypesHelper.createHTML(`<div class="lingoflow-word-tooltip-header">
          <span>${word}</span>
          <button class="lingoflow-word-tooltip-close" onclick="this.closest('.lingoflow-word-tooltip').remove()">×</button>
        </div>
        <div class="lingoflow-word-definition">No definition found</div>`);
    }
  }
}
