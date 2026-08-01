import {
  APP_LCNAME,
  APP_CONSTS,
  OPT_STYLE_FUZZY,
  GLOBLA_RULE,
  DEFAULT_SETTING,
  OPT_STYLE_NONE,
  DEFAULT_API_SETTING,
  DEFAULT_MOUSE_HOVER_BUBBLE_STYLE,
  OPT_MOUSE_HOVER_DISPLAY_BUBBLE,
  OPT_SPLIT_PARAGRAPH_PUNCTUATION,
  OPT_SPLIT_PARAGRAPH_DISABLE,
  OPT_SPLIT_PARAGRAPH_TEXTLENGTH,
  API_SPE_TYPES,
  MSG_INJECT_CSS,
  MSG_UPDATE_ICON,
} from "../config";
import { resolveApiPromptSettings } from "../config/prompt";
import {
  getPlainTextChunkLimit,
  readNextPlainTextChunk,
} from "../core/scanner/plainTextChunking";
import { parseTerms } from "../core/rules/TermParser";
import { RuleMatcher } from "../core/rules/RuleMatcher";
import { TranslationRenderer } from "../core/renderer/TranslationRenderer";
import { DomScanner } from "../core/scanner/DomScanner";
import { DomKit } from "../core/dom/DomKit";
import { interpreter } from "./interpreter";
import { clearFetchPool } from "./pool";
import { debounce, scheduleIdle, genEventName, parseAITerms } from "./utils";
import { apiTranslate } from "../apis";
import { appLog } from "./log";
import { clearAllBatchQueue } from "./batchQueue";
import { createLoadingSVG } from "./svg";
import { shortcutRegister } from "./shortcut";
import { tryDetectLang } from "./detect";
import { injectInternalCss } from "./injector";
import { isExt } from "./client";
import { sendBgMsg } from "./msg";
import { getDocInfo } from "./docInfo";

/**
 * @class Translator
 * @description 翻译核心逻辑封装
 */
export class Translator {
  // 块级判定缓存，避免对同一节点高频调用 window.getComputedStyle(el) 造成浏览器回流（Reflow）
  static displayCache = new WeakMap();

  // HTML 元素标签分类
  static TAGS = {
    // 强制换行标签
    BREAK_LINE: new Set(["BR", "WBR"]),
    // 块级标签
    BLOCK: new Set([
      "ADDRESS",
      "ARTICLE",
      "ASIDE",
      "BLOCKQUOTE",
      "CANVAS",
      "DD",
      "DIV",
      "DL",
      "DT",
      "FIELDSET",
      "FIGCAPTION",
      "FIGURE",
      "FOOTER",
      "FORM",
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "HEADER",
      "HR",
      "LI",
      "MAIN",
      "NAV",
      "NOSCRIPT",
      "OL",
      "P",
      "PRE",
      "SECTION",
      "TABLE",
      "TFOOT",
      "UL",
      "VIDEO",
    ]),
    // 行级标签
    INLINE: new Set([
      // "A",
      "ABBR",
      "ACRONYM",
      "B",
      "BDO",
      "BIG",
      "BR",
      "BUTTON",
      "CITE",
      "CODE",
      "DFN",
      "DEL",
      "FONT",
      "EM",
      "I",
      "IMG",
      "INPUT",
      "INS",
      "KBD",
      "LABEL",
      "MAP",
      "MARK",
      "OBJECT",
      "OUTPUT",
      "Q",
      "RUBY",
      "SAMP",
      "SCRIPT",
      "SELECT",
      "SMALL",
      // "SPAN",
      "STRONG",
      "SUB",
      "SUP",
      "TEXTAREA",
      "TIME",
      "TT",
      "U",
      "VAR",
    ]),
    // 需要被作为占位符替换以保持原文格式不被机器翻译破坏的复杂标签
    REPLACE: new Set([
      "ABBR",
      "CODE",
      "DFN",
      "IMG",
      "KBD",
      "OUTPUT",
      "RP",
      "RT",
      "SAMP",
      "SUB",
      "SUP",
      "SVG",
      "TIME",
      "VAR",
    ]),
    // 需要被包装翻译的行内样式或逻辑标签
    WARP: new Set([
      "A",
      "B",
      "BDO",
      "BDI",
      "BIG",
      "CITE",
      "DEL",
      "EM",
      "FONT",
      "I",
      "INS",
      "MARK",
      "Q",
      "RUBY",
      "S",
      "SMALL",
      "SPAN",
      "STRONG",
      "U",
    ]),
  };

  // 译文相关 CSS 类名配置
  static LINGOFLOW_CLASS = {
    warpper: `${APP_LCNAME}-wrapper`,
    inner: `${APP_LCNAME}-inner`,
    term: `${APP_LCNAME}-term`,
    br: `${APP_LCNAME}-br`,
    space: `${APP_LCNAME}-space`,
    retry: `${APP_LCNAME}-retry`,
    backup: `${APP_LCNAME}-backup`,
    hoverBubble: `${APP_LCNAME}-hover-bubble`,
  };

  // 内置过滤与跳过翻译的正则表达式规则（URL、邮箱、路径、数字、日期、模板等）
  static BUILTIN_SKIP_PATTERNS = [
    // 1. URL (覆盖 http, https, ftp, file 协议)
    /^(?:(?:https?|ftp|file):\/\/|www\.)[^\s/$.?#].[^\s]*$/i,

    // 2. 邮箱地址
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

    // 3. 文件路径 (为 Unix 和 Windows 做了简化)
    /^(?:[a-zA-Z]:\\|\/|\\)(?:[\w\-. ]+\/|[\w\-. ]+\\)*[\w\-. ]*\.?[\w\-. ]*$/,

    // 4. UUID (通用唯一标识符)
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,

    // 5. 纯数字字符串 (整数, 浮点数, 包含常见分隔符)
    // 同时也处理单位 (如 px, %, em, rem 等) 和货币符号。
    /^[$\u00A2-\u00A5\u20A0-\u20CF]?\s?-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?\s?(?:px|%|em|rem|pt|vw|vh|deg|s|ms)?$/,

    // 6. 版本号 (例如 v1.2.3, 10.0.1)
    /^v?\d+(\.\d+){1,3}$/,

    // 7. ISO 8601 日期/时间格式
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/,

    // 8. 模板占位符 (例如 {{var}}, ${var}, __VAR__)
    /^({{[^}]+}}|\${[^}]+}|__\w+__|%\w+)$/,

    // 9. CSS 选择器 (简单的 class/ID) 和十六进制颜色值
    /^(?:\.|#)[\w-]+$|^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,

    // 10. 用户名 (例如 @username, @user.name, @user-name)
    /^@[\w.-]+$/,

    // 11. HTML 实体
    /^&\w+;$/,

    // 12. 中括号包裹的序号 (例如 [1], [99])
    /^\[\d+\]$/,

    // 13. 简单时间格式 (例如 12:30, 9:45:30)
    /^\d{1,2}:\d{2}(:\d{2})?$/,

    // 14. 包含常见扩展名的文件名 (例如: document.pdf, image.jpeg)
    /^[^\s\\/:]+?\.[a-zA-Z0-9]{2,5}$/,
  ];

  static DEFAULT_OPTIONS = DEFAULT_SETTING; // 默认配置选项
  static DEFAULT_RULE = GLOBLA_RULE; // 默认匹配规则

  // 判断是否为普通的 DOM 元素节点
  static isElement(el) {
    return el instanceof Element;
  }

  // 判断是否为 DOM 元素节点或文档片段
  static isElementOrFragment(el) {
    return el instanceof Element || el instanceof DocumentFragment;
  }

  /**
   * 判断目标元素是否为块级（Block）节点
   * // REVIEW: 缓存失效风险。使用 WeakMap 缓存了元素的 block 判定结果，如果在页面运行期间，
   * // 某个元素的 display 样式被动态修改（如从 none 变更为 block，或者从 inline 变更为 block），
   * // displayCache 中缓存的旧状态不会被失效或刷新，这可能导致后续的扫描和翻译无法准确处理该节点。
   * @param {Node} el - 待检测的 DOM 节点
   * @returns {boolean}
   */
  static isBlockNode(el) {
    if (!Translator.isElementOrFragment(el)) return false;

    // 若有显式的 inline 属性设置，直接判定非块级
    if (el.attributes?.display?.value?.includes("inline")) return false;
    // 若有显式的 block 属性设置，直接判定为块级
    if (el.attributes?.display?.value?.includes("block")) return true;

    // 若标签在内联标签集合中，直接判定非块级
    if (Translator.TAGS.INLINE.has(el.nodeName?.toUpperCase())) return false;
    // 若标签在块级标签集合中，直接判定为块级
    if (Translator.TAGS.BLOCK.has(el.nodeName?.toUpperCase())) return true;

    // 优先读取 WeakMap 缓存
    if (Translator.displayCache.has(el)) {
      return Translator.displayCache.get(el);
    }

    // 降级回滚：调用 getComputedStyle 进行高开销的布局样式计算
    const isBlock = !window.getComputedStyle(el).display.startsWith("inline");
    Translator.displayCache.set(el, isBlock);
    return isBlock;
  }

  // 判断是否包含块级子元素
  static hasBlockNode(el) {
    if (!Translator.isElementOrFragment(el)) return false;
    for (const child of el.childNodes) {
      if (Translator.isBlockNode(child)) {
        return true;
      }
    }
    return false;
  }

  // 判断是否直接包含非空文本节点
  static hasTextNode(el) {
    if (!Translator.isElementOrFragment(el)) return false;
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && /\S/.test(child.nodeValue)) {
        return true;
      }
    }
    return false;
  }

  // 特殊字符转义
  static escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // 内置忽略元素
  static LINGOFLOW_IGNORE_SELECTOR = `.${Translator.LINGOFLOW_CLASS.warpper}, .${Translator.LINGOFLOW_CLASS.hoverBubble}, .lingoflow-caption-container, .lingoflow-subtitle-controls, #lingoflow-youtube-subtitle-list-container,
  #${APP_CONSTS.fabID}, .${APP_CONSTS.fabID}_warpper,
  #${APP_CONSTS.boxID}, .${APP_CONSTS.boxID}_warpper,
  #${APP_CONSTS.popupID}, .${APP_CONSTS.popupID}_warpper`;

  static BUILTIN_IGNORE_SELECTOR = `address, area, audio, br, canvas,
  data, datalist, embed, head, iframe, input, noscript, map,
  object, option, param, picture, progress,
  select, script, style, svg, track, textarea, template,
  video, wbr, .notranslate, [contenteditable='true'], [translate='no']`;

  #setting; // 设置选项
  #rule; // 规则
  #isInitialized = false; // 初始化状态
  #isJsInjected = false; // 注入用户JS
  #isShadowRootJsInjected = false; //
  #mouseHoverEnabled = false; // 鼠标悬停翻译
  #enabled = false; // 全局默认状态
  #runId = 0; // 用于中止过期的异步请求

  #termValues = []; // 按顺序存储术语的替换值
  #combinedTermsRegex; // 专业术语正则表达式
  #combinedSkipsRegex; // 跳过文本正则表达式

  #placeholderCache = null; // 缓存正则对象
  #translationTagName = APP_LCNAME; // 翻译容器的标签名
  #eventName = ""; // 通信事件名称
  #docInfo = {}; // 网页信息
  #glossary = {}; // AI词典
  #ruleMatcher = null; // 规则匹配器
  #renderer = null; // DOM 渲染器
  #scanner = null; // DOM 扫描器
  #apisMap = new Map(); // 用于接口快速查找

  #processedNodes = new WeakMap(); // 已处理（已执行翻译DOM操作）的单元

  #removeKeydownHandler; // 快捷键清理函数
  #removeKeydownHandler2; // 备用快捷键清理函数
  #hoveredNode = null; // 存储当前悬停的可翻译节点
  #hoverPointer = { x: 0, y: 0 }; // 最近一次鼠标位置，用于定位气泡
  #hoverBubbleNode = null; // 鼠标悬停气泡容器
  #hoverBubbleTarget = null; // 当前气泡绑定的原文节点
  #hoverBubbleRunId = 0; // 用于丢弃过期的气泡翻译请求
  #boundMouseMoveHandler; // 鼠标事件
  #boundKeyDownHandler; // 键盘事件
  #dmm; // DebounceMouseMover

  // 忽略元素
  get #ignoreSelector() {
    if (this.#rule.scanAll === "true" || this.#rule.isPlainText) {
      return Translator.LINGOFLOW_IGNORE_SELECTOR;
    }

    const selectors = [Translator.LINGOFLOW_IGNORE_SELECTOR];
    if (this.#rule.autoScan !== "false") {
      selectors.push(Translator.BUILTIN_IGNORE_SELECTOR);
    }

    const userSelector = this.#rule.ignoreSelector?.trim();
    if (userSelector) {
      selectors.push(userSelector);
    }

    return selectors.join(", ");
  }

  #createPlainTextChunkNode(chunk) {
    if (chunk.type !== "text" || !chunk.value) return null;

    const span = document.createElement("span");
    span.style.cssText = "display: block; white-space: pre-wrap;";
    span.textContent = chunk.value;

    return span;
  }

  #appendPlainTextPreBatch(pre, state, isInitialBatch = false) {
    if (
      state.runId !== this.#runId ||
      !pre.isConnected ||
      !this.#rule.isPlainText
    ) {
      this.#scanner.unmarkPreprocessing(pre);
      return;
    }

    const limit = getPlainTextChunkLimit(this.#setting);
    const maxNodes = isInitialBatch ? 20 : 100;
    const maxDuration = isInitialBatch ? Infinity : 10;
    const startedAt = performance.now?.() || Date.now();
    const fragment = document.createDocumentFragment();
    const textNodes = [];
    let nodeCount = 0;

    while (
      (state.offset < state.source.length || state.pendingBreaks > 0) &&
      nodeCount < maxNodes
    ) {
      if (state.pendingBreaks > 0) {
        fragment.appendChild(document.createElement("br"));
        state.pendingBreaks--;
        nodeCount++;
        continue;
      }

      const chunk = readNextPlainTextChunk(
        state.source,
        state.offset,
        limit
      );
      if (!chunk) break;

      state.offset = chunk.nextOffset;

      if (chunk.type === "break") {
        // 一个换行只结束当前 span；连续换行额外生成 br 来保留空白行。
        state.pendingBreaks += chunk.count;
      } else {
        const node = this.#createPlainTextChunkNode(chunk);
        if (node) {
          fragment.appendChild(node);
          textNodes.push(node);
          nodeCount++;
        }
      }

      if (
        !isInitialBatch &&
        nodeCount > 0 &&
        (performance.now?.() || Date.now()) - startedAt >= maxDuration
      ) {
        break;
      }
    }

    if (fragment.childNodes.length) {
      pre.appendChild(fragment);
      textNodes.forEach((node) => this.#scanner.observeNode(node));
    }

    if (state.offset < state.source.length || state.pendingBreaks > 0) {
      scheduleIdle(() => this.#appendPlainTextPreBatch(pre, state), 100);
    } else {
      this.#scanner.unmarkPreprocessing(pre);
    }
  }

  #initPlainTextPre(pre) {
    if (pre.dataset.lingoflowPreprocessed === "true") {
      return;
    }

    // 使用 textContent 读取纯文本，避免把 <tag> 这类内容重新解析成 HTML。
    const state = {
      source: pre.textContent || "",
      offset: 0,
      runId: this.#runId,
      pendingBreaks: 0,
    };

    pre.dataset.lingoflowPreprocessed = "true";
    this.#scanner.markPreprocessing(pre);
    pre.replaceChildren();
    this.#appendPlainTextPreBatch(pre, state, true);
  }

  // 接口参数
  // todo: 不用频繁查找计算
  get #apiSetting() {
    // return (
    //   this.#setting.transApis.find(
    //     (api) => api.apiSlug === this.#rule.apiSlug
    //   ) || DEFAULT_API_SETTING
    // );
    return this.#apisMap.get(this.#rule.apiSlug) || DEFAULT_API_SETTING;
  }

  get #transAllnow() {
    const apiValue = this.#apisMap.get(this.#rule.apiSlug)?.transAllnow;
    if (apiValue !== undefined) {
      return apiValue === true || apiValue === "true";
    }

    return (
      this.#setting.transAllnow === true || this.#setting.transAllnow === "true"
    );
  }

  get #rootMargin() {
    const apiValue = this.#apisMap.get(this.#rule.apiSlug)?.rootMargin;
    const legacyValue = this.#setting.rootMargin;
    const value =
      apiValue !== undefined && apiValue !== ""
        ? apiValue
        : legacyValue !== undefined && legacyValue !== ""
          ? legacyValue
          : 500;
    const rootMargin = Number(value);

    return Number.isFinite(rootMargin) ? rootMargin : 500;
  }

  // 占位符配置（包含正则）
  get #placeholderConfig() {
    if (this.#placeholderCache) {
      return this.#placeholderCache;
    }

    const [startDelimiter, endDelimiter] =
      this.#apiSetting.placeholder.split(" ");

    // 确保 placetag 始终是字符串（兼容旧配置可能是数组）
    let tagName = this.#apiSetting.placetag;
    if (Array.isArray(tagName)) {
      tagName = tagName[0] || "i";
    }
    if (typeof tagName !== "string") {
      tagName = "i"; // 默认值
    }

    const format = this.#apiSetting.placetagFormat || "compact"; // 占位符格式
    const safeTag = "span";

    // 1. 缓存常用还原正则
    let openRegex, closeRegex;
    if (format === "attribute") {
      openRegex = new RegExp(`<${tagName}\\s+i=(\\d+)>`, "gi");
      closeRegex = new RegExp(`<\\/${tagName}>`, "gi");
    } else {
      openRegex = new RegExp(`<${tagName}(\\d+)>`, "gi");
      closeRegex = new RegExp(`<\\/${tagName}(\\d+)>`, "gi");
    }

    // 2. 创建普通占位符正则（标签占位符在restoreFromTranslation中单独处理）
    // 只匹配普通占位符 {{1}}, {{2}} 等
    const escapedStart = Translator.escapeRegex(startDelimiter);
    const escapedEnd = Translator.escapeRegex(endDelimiter);
    const placeholderPattern = `${escapedStart}\\d+${escapedEnd}`;
    const placeholderRegex = new RegExp(placeholderPattern, "g");

    const result = {
      startDelimiter,
      endDelimiter,
      tagName,
      format,
      safeTag,
      openRegex,
      closeRegex,
      placeholderRegex,
    };

    this.#placeholderCache = result;
    return result;
  }

  constructor({ rule = {}, setting = {} }) {
    this.#setting = { ...Translator.DEFAULT_OPTIONS, ...setting };
    this.#rule = {
      ...Translator.DEFAULT_RULE,
      ...rule,
      isPlainText: rule.isPlainText === true || rule.isPlainText === "true",
    };
    this.#apisMap = new Map(
      this.#setting.transApis.map((api) => [api.apiSlug, api])
    );

    this.#eventName = genEventName();
    this.#combinedSkipsRegex = new RegExp(
      Translator.BUILTIN_SKIP_PATTERNS.map((r) => `(${r.source})`).join("|")
    );
    this.#ruleMatcher = new RuleMatcher({
      rule: this.#rule,
      setting: this.#setting,
      ignoreSelector: this.#ignoreSelector,
      translationTagName: this.#translationTagName,
      tags: Translator.TAGS,
      isBlockNode: Translator.isBlockNode.bind(Translator),
    });
    this.#ruleMatcher.setSkipsRegex(this.#combinedSkipsRegex);
    this.#renderer = new TranslationRenderer({
      rule: this.#rule,
      setting: this.#setting,
      tags: Translator.TAGS,
      getPlaceholderConfig: () => this.#placeholderConfig,
      getTerms: () => ({
        values: this.#termValues,
        regex: this.#combinedTermsRegex,
      }),
      isIgnoredElement: this.#ruleMatcher.isIgnoredElement.bind(
        this.#ruleMatcher
      ),
      shouldBreak: this.#ruleMatcher.shouldBreak.bind(this.#ruleMatcher),
      translationTagName: this.#translationTagName,
    });
    this.#scanner = new DomScanner({
      rule: this.#rule,
      setting: this.#setting,
      getIgnoreSelector: () => this.#ignoreSelector,
      translationTagName: this.#translationTagName,
      combinedSkipsRegex: this.#combinedSkipsRegex,
      onNode: (node) => this.#performSyncNode(node),
      onRescan: (container) => {
        this.#processedNodes.delete(container);
        this.#cleanupAllTranslations(container);
      },
      onShadowRoot: (shadowRoot) => this.#renderer.injectStyle(shadowRoot),
      tryAdoptHost: (hostNode) =>
        this.#tryAdoptExistingTranslationHost(hostNode),
      isProcessed: (node) => this.#processedNodes.has(node),
      getState: () => ({
        enabled: this.#enabled,
        transAllnow: this.#transAllnow,
        rootMargin: this.#rootMargin,
      }),
      isIgnoredElement: this.#ruleMatcher.isIgnoredElement.bind(
        this.#ruleMatcher
      ),
      isBlockNode: this.#ruleMatcher.isBlockNode.bind(this.#ruleMatcher),
      hasBlockNode: this.#ruleMatcher.hasBlockNode.bind(this.#ruleMatcher),
      shouldBreak: this.#ruleMatcher.shouldBreak.bind(this.#ruleMatcher),
    });

    const parsedTerms = parseTerms(this.#rule.terms);
    this.#termValues = parsedTerms.values;
    this.#combinedTermsRegex = parsedTerms.combinedRegex;
    // this.#parseAITerms(this.#rule.aiTerms);
    this.#glossary = parseAITerms(this.#rule.aiTerms);

    this.#boundMouseMoveHandler = this.#handleMouseMove.bind(this);
    this.#boundKeyDownHandler = this.#handleKeyDown.bind(this);

    this.#dmm = this.#createDebounceMouseMover();

    // 鼠标悬停翻译
    if (this.#setting.mouseHoverSetting.useMouseHover) {
      this.#enableMouseHover();
    }

    // 仅显示译文模式下悬浮恢复原文
    if (
      this.#rule.transOnly === "true" &&
      this.#rule.transOnlyRevert === "true"
    ) {
      this.#renderer.enableTransOnlyRevert();
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.#run());
    } else {
      this.#run();
    }
  }

  // 启动
  #run() {
    if (this.#rule.transOpen === "true") {
      this.enable();
    } else if (this.#setting.preInit) {
      this.#init();
    }
  }

  // 初始化
  #init() {
    this.#isInitialized = true;

    // 注入JS/CSS
    this.#initInjector();

    // 纯文本预处理
    if (this.#rule.isPlainText) {
      document.querySelectorAll("pre").forEach((pre) => {
        this.#initPlainTextPre(pre);
      });
    }

    this.#scanner.init();
  }

  // #parseAITerms(termsString) {
  //   if (!termsString || typeof termsString !== "string") return;

  //   try {
  //     this.#glossary = Object.fromEntries(
  //       termsString
  //         .split(/\n|;/)
  //         .map((line) => {
  //           const [k = "", v = ""] = line.split(",").map((s) => s.trim());
  //           return [k, v];
  //         })
  //         .filter(([k]) => k)
  //     );
  //   } catch (err) {
  //     appLog("parse aiterms", err);
  //   }
  // }

  // // todo: 利用AI总结
  // #getDocDescription() {
  //   try {
  //     const meta = document.querySelector('meta[name="description"]');
  //     const description = meta?.getAttribute("content") || "";
  //     return truncateWords(description);
  //   } catch (err) {
  //     appLog("get description", err);
  //   }
  //   return "";
  // }

  // 节流的鼠标悬停事件
  #createDebounceMouseMover() {
    return debounce((targetNode) => {
      const startNode = targetNode;
      const foundNode = this.#scanner.findObservedAncestor(targetNode);
      this.#hoveredNode = foundNode || startNode;

      const { mouseHoverKey = [], mouseHoverKey2 = [] } =
        this.#setting.mouseHoverSetting;
      const hasMouseHoverShortcut =
        mouseHoverKey.length > 0 || mouseHoverKey2.length > 0;
      if (!hasMouseHoverShortcut && !this.#isInitialized) {
        this.#init();
      }
      if (!hasMouseHoverShortcut && foundNode) {
        this.#toggleTargetNode(foundNode);
      } else if (!foundNode && this.#isMouseHoverBubbleMode()) {
        this.#hideHoverBubble();
      }
    }, 100);
  }

  // 跟踪鼠标下的可翻译节点
  #handleMouseMove(event) {
    this.#hoverPointer = { x: event.clientX, y: event.clientY };
    if (
      this.#isMouseHoverBubbleMode() &&
      this.#hoverBubbleNode &&
      !this.#hoverBubbleNode.hidden
    ) {
      this.#positionHoverBubble();
    }
    let targetNode = event.composedPath()[0];
    this.#dmm(targetNode);
  }

  // 快捷键按下时的处理器
  #handleKeyDown() {
    if (!this.#isInitialized) {
      this.#init();
    }
    let targetNode = this.#hoveredNode;
    if (!targetNode || !this.#scanner.hasObserved(targetNode)) return;

    this.#toggleTargetNode(targetNode);
  }

  // 触发段落翻译
  toggleHoverNode() {
    this.#handleKeyDown();
  }

  translateNodes(nodes) {
    const targets = Array.isArray(nodes) ? nodes : [nodes];
    return Promise.all(
      targets
        .filter((node) => DomKit.isElementOrFragment(node))
        .map((node) => this.#processNode(node))
    );
  }

  // 切换节点翻译状态
  #toggleTargetNode(targetNode) {
    if (this.#isMouseHoverBubbleMode()) {
      this.#translateHoverBubbleNode(targetNode);
      return;
    }

    if (this.#processedNodes.has(targetNode)) {
      const hasPendingTranslation = Array.from(
        this.#findTranslationWrappers(targetNode)
      ).some((wrapper) => !this.#renderer.getTranslationState(wrapper));
      if (hasPendingTranslation) return;
      this.#cleanupDirectTranslations(targetNode);
    } else {
      this.#processNode(targetNode);
    }
  }

  // 判断当前鼠标悬停翻译是否处于气泡展示模式
  #isMouseHoverBubbleMode() {
    return (
      this.#setting.mouseHoverSetting?.displayMode ===
      OPT_MOUSE_HOVER_DISPLAY_BUBBLE
    );
  }

  // 处理一个待翻译的节点
  async #processNode(node) {
    if (
      this.#processedNodes.has(node) ||
      !Translator.isElementOrFragment(node)
    ) {
      return;
    }

    this.#processedNodes.set(node, { ...this.#rule });

    // 提前检测文本
    if (this.#ruleMatcher.isInvalidText(node.textContent)) {
      return;
    }

    // 提前进行语言检测
    let deLang = "";
    const {
      fromLang = "auto",
      toLang,
      splitParagraph = OPT_SPLIT_PARAGRAPH_DISABLE,
      splitLength = 100,
    } = this.#rule;
    const { langDetector, skipLangs = [] } = this.#setting;
    if (fromLang === "auto") {
      // revert 529
      deLang = await tryDetectLang(node.textContent, langDetector);
      if (
        deLang &&
        (toLang.slice(0, 2) === deLang.slice(0, 2) ||
          skipLangs.includes(deLang))
      ) {
        // 保留处理状态，不做删除
        // this.#processedNodes.delete(node);
        return;
      }
    }

    // 切分长段落
    if (splitParagraph !== OPT_SPLIT_PARAGRAPH_DISABLE) {
      this.#splitTextNodesBySentence(node, splitParagraph, splitLength);
    }

    let nodeGroup = [];
    [...node.childNodes].forEach((child) => {
      const shouldBreak = this.#ruleMatcher.shouldBreak(child);
      const shouldGroup =
        child.nodeType === Node.ELEMENT_NODE ||
        child.nodeType === Node.TEXT_NODE;
      if (!shouldBreak && shouldGroup) {
        nodeGroup.push(child);
      } else if (shouldBreak && nodeGroup.length) {
        this.#translateNodeGroup(nodeGroup, node, deLang);
        nodeGroup = [];
      }
    });

    if (nodeGroup.length) {
      this.#translateNodeGroup(nodeGroup, node, deLang);
    }
  }

  // 切分文本段落
  #splitTextNodesBySentence(parentNode, splitParagraph, splitLength) {
    const sentenceEndRegexForSplit = /[。！？]+|[.?!]+(?=\s+|$)/g;

    [...parentNode.childNodes].forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE || node.textContent.trim() === "") {
        return;
      }

      const text = node.textContent;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = sentenceEndRegexForSplit.exec(text)) !== null) {
        let realEndIndex = match.index + match[0].length;
        while (realEndIndex < text.length && /\s/.test(text[realEndIndex])) {
          realEndIndex++;
        }
        parts.push(text.substring(lastIndex, realEndIndex));
        lastIndex = realEndIndex;
        sentenceEndRegexForSplit.lastIndex = realEndIndex;
      }
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }

      const validParts = parts.filter((part) => part.trim().length > 0);
      if (validParts.length <= 1) {
        return;
      }

      const newNodes = validParts.map((part) => {
        const newNode = document.createTextNode(part);
        this.#scanner.markSkipped(newNode);
        return newNode;
      });

      node.replaceWith(...newNodes);
    });

    const sentenceEndRegexForTest = /(?:[。！？?!]+|(?<!\d)\.)\s*$/;
    let textLength = 0;

    [...parentNode.childNodes].forEach((node) => {
      textLength += node.textContent.length;

      const isSentenceEnd = sentenceEndRegexForTest.test(node.textContent);
      if (
        !isSentenceEnd ||
        node.nextSibling?.nodeName?.toUpperCase() === "BR"
      ) {
        return;
      }

      if (
        splitParagraph === OPT_SPLIT_PARAGRAPH_PUNCTUATION ||
        (splitParagraph === OPT_SPLIT_PARAGRAPH_TEXTLENGTH &&
          textLength >= splitLength)
      ) {
        textLength = 0;

        const br = document.createElement("br");
        br.className = Translator.LINGOFLOW_CLASS.br;
        this.#scanner.markSkipped(br);

        node.after(br);
      }
    });
  }

  // 判断是否需要换行
  #formatTranslateError(error) {
    if (error instanceof Error) {
      const tag = error.name ? `[${error.name}]` : "[UnknownError]";
      const msg = error.message ? ` ${error.message}` : "";
      return `${tag}${msg}\n${error.stack || ""}`;
    }

    if (typeof error === "string") {
      return error;
    }

    try {
      const jsonText = JSON.stringify(error);
      return jsonText || String(error);
    } catch (_) {
      return String(error);
    }
  }

  // 翻译内联节点
  async #translateNodeGroup(nodes, hostNode, deLang) {
    const {
      transTag,
      textStyle,
      transEndHook,
      transOnly,
      termsStyle,
      textExtStyle,
      selectStyle,
      parentStyle,
      grandStyle,
      toLang,
      transOrder = "original-first",
    } = this.#rule;
    const {
      newlineLength,
    } = this.#setting;
    const parentNode = hostNode.parentElement;
    const hideOrigin = transOnly === "true";

    try {
      const [processedString, placeholderMap] =
        this.#renderer.serializeForTranslation(nodes, termsStyle);
      if (this.#ruleMatcher.isInvalidText(processedString)) return;

      const { wrapper, inner } = this.#renderer.createWrapper({
        nodes,
        processedString,
        toLang,
        transTag,
        textStyle,
        textExtStyle,
        transOrder,
        hideOrigin,
        newlineLength,
      });

      const currentRunId = this.#runId;

      // 1. 确定流式渲染模式状态
      const streamRenderMode = this.#apiSetting.streamRenderMode || "disabled";
      const isStreamRender =
        streamRenderMode !== "disabled" &&
        this.#apiSetting.useStream &&
        API_SPE_TYPES.stream.has(this.#apiSetting.apiType);

      // REVIEW: 极佳的性能优化设计 (RequestAnimationFrame 缓冲刷新)！
      // 大模型流式输出（onStreamChunk）返回速率极快（每秒可达几十次）。
      // 若每次收到数据都直接操作 DOM 修改 innerText 刷新页面，极易导致浏览器主线程阻塞和严重的 Layout Thrashing (布局抖动)。
      // 此处引入了 RAF (requestAnimationFrame) 刷新缓冲区，限制每秒最多渲染 60 次（FPS 锁帧），
      // 并只在空闲时间执行 flushPendingText() 修改 textNode 节点，大幅度节约了 DOM 回流重绘的开销，用户体验丝滑。
      let rafId = null;
      let pendingText = "";
      let hasFirstChunk = false;
      const innerRef = inner;

      // 异步刷新临时文本缓冲区到 DOM 中
      const flushPendingText = () => {
        if (!hasFirstChunk) {
          innerRef.textContent = "";
          innerRef.appendChild(document.createTextNode(pendingText));
          hasFirstChunk = true;
        } else {
          const textNode = innerRef.firstChild;
          if (textNode) {
            textNode.nodeValue = pendingText; // 直接修改 TextNode 的 nodeValue 避免触发表单级 Reflow
          }
        }
        rafId = null;
      };

      // 流式 Chunk 回调函数
      const onStreamChunk = isStreamRender
        ? (chunk) => {
            // 防过期控制，若本轮翻译请求已因用户点击关闭或被新请求覆盖，则立刻抛弃
            if (this.#runId !== currentRunId) return;
            const { text, isComplete } = chunk;
            if (!text) return;

            if (isComplete) {
              pendingText = Array.isArray(text) ? text[0] : text;
              if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
              }
              flushPendingText();
            } else {
              pendingText = text;
              if (!rafId) {
                // 开启 RAF 排队渲染
                rafId = requestAnimationFrame(flushPendingText);
              }
            }
          }
        : null;

      // 2. 发起真实的翻译网络请求
      const { trText: translatedText, isSame: isSameLang } =
        await this.#translateFetch(processedString, deLang, onStreamChunk);

      // 请求完成后，立刻注销多余的 RAF 定时监听器，防止内存泄漏
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      if (this.#runId !== currentRunId) {
        throw new Error("Request terminated");
      }

      // 如果翻译文本为空，或者识别出来的源语言与目标语言一致，则移除临时的翻译 Loading 容器
      if (!translatedText || isSameLang) {
        this.#renderer.removeWrapper(wrapper);
        return;
      }

      // 3. 将翻译后文本里的 {{1}}、<tag1> 等占位符还原为对应的 DOM 节点和 HTML 结构
      const htmlString = this.#renderer.restoreFromTranslation(
        translatedText,
        placeholderMap
      );

      this.#renderer.renderTranslation({ wrapper, htmlString });

      if (hideOrigin) {
        this.#renderer.commitTranslation({
          wrapper,
          nodes,
          isHide: true,
        });
        this.#renderer.setTranslationOnly(wrapper, "true");
      } else {
        this.#renderer.commitTranslation({ wrapper, nodes, isHide: false });
      }

      this.#renderer.appendHostStyle(
        hostNode,
        selectStyle,
        parentStyle,
        grandStyle
      );

      // 翻译完成钩子函数（在隔离沙盒内安全执行用户自定义的译后处理脚本）
      // REVIEW: 共享 Sval 实例导致 Hook 竞态条件 (Race Condition) 隐患。
      // 由于 interpreter 是全局单例，当页面中同时有多个并发的 translateNodeGroup 任务异步执行时，
      // 同步运行的 `interpreter.run('exports.transEndHook = ...')` 会直接覆盖上一个任务尚未执行完毕的 exports.transEndHook 引用。
      // 这可能导致后一个任务的 Hook 函数被错误地执行多次，或者前一个任务执行了不匹配的、新覆盖的 Hook 函数，出现非预期的运行时状态混乱。
      if (transEndHook?.trim()) {
        try {
          interpreter.run(`exports.transEndHook = ${transEndHook}`);
          interpreter.exports.transEndHook(
            {
              hostNode,
              parentNode,
              nodes,
              wrapperNode: wrapper,
              innerNode: inner,
            },
            {
              text: processedString,
              fromLang: deLang || this.#rule.fromLang,
              toLang,
            }
          );
        } catch (err) {
          appLog("transEndHook", err);
        }
      }
    } catch (err) {
      const errorText = this.#formatTranslateError(err);
      appLog("translate group error: ", errorText);
      if (err?.message === "Request terminated") {
        this.#cleanupDirectTranslations(hostNode);
        return;
      }

      // 失败重试按钮
      try {
        const wrapper = hostNode.querySelector(
          `:scope > .${Translator.LINGOFLOW_CLASS.warpper}:last-of-type`
        );
        if (wrapper) {
          this.#renderer.setError(wrapper, errorText, () => {
            this.#processedNodes.delete(hostNode);
            this.#translateNodeGroup(nodes, hostNode, deLang);
          });
        }
      } catch (retryErr) {
        appLog("retry icon error: ", retryErr.message);
        this.#cleanupDirectTranslations(hostNode);
      }
    }
  }

  // 获取悬停气泡的样式，如果用户未设置则使用默认样式
  #getHoverBubbleStyle() {
    const userStyle =
      this.#setting.mouseHoverSetting?.bubbleStyle ||
      DEFAULT_MOUSE_HOVER_BUBBLE_STYLE;
    const normalizedUserStyle = userStyle.trim().replace(/;+$/, "");
    return `${normalizedUserStyle};
position: fixed !important;
z-index: 2147483647 !important;
box-sizing: border-box !important;
pointer-events: none !important;
white-space: pre-wrap !important;
overflow-wrap: anywhere !important;`;
  }

  // 确保悬停气泡的 DOM 元素存在并已挂载到 body
  #ensureHoverBubble() {
    if (this.#hoverBubbleNode?.isConnected) {
      return this.#hoverBubbleNode;
    }

    const bubble = document.createElement("div");
    bubble.className = `${Translator.LINGOFLOW_CLASS.hoverBubble} notranslate`;
    bubble.setAttribute("role", "tooltip");
    document.body.appendChild(bubble);
    this.#hoverBubbleNode = bubble;

    return bubble;
  }

  // 计算并更新悬停气泡的位置，使其跟随鼠标且不溢出视口
  #positionHoverBubble() {
    const bubble = this.#hoverBubbleNode;
    if (!bubble) return;

    const gap = 12;
    const viewportGap = 8;
    let left = this.#hoverPointer.x + gap;
    let top = this.#hoverPointer.y + gap;

    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;

    const rect = bubble.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width - viewportGap;
    const maxTop = window.innerHeight - rect.height - viewportGap;

    left = Math.max(viewportGap, Math.min(left, maxLeft));
    top = Math.max(viewportGap, Math.min(top, maxTop));

    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
  }

  // 显示悬停气泡内容并更新其状态与位置
  #showHoverBubble(content, state = "ready") {
    const bubble = this.#ensureHoverBubble();
    bubble.style.cssText = this.#getHoverBubbleStyle();
    bubble.dataset.state = state;
    bubble.replaceChildren(
      content instanceof Node ? content : document.createTextNode(content)
    );
    bubble.hidden = false;
    this.#positionHoverBubble();
  }

  // 隐藏并移除悬停气泡，同时通过递增 RunId 废弃正在进行的翻译请求
  #hideHoverBubble() {
    this.#hoverBubbleRunId++;
    this.#hoverBubbleTarget = null;
    if (this.#hoverBubbleNode) {
      this.#hoverBubbleNode.remove();
      this.#hoverBubbleNode = null;
    }
  }

  // 气泡模式下翻译目标节点，处理请求竞态与错误边界
  async #translateHoverBubbleNode(node) {
    if (!Translator.isElementOrFragment(node)) return;
    if (this.#hoverBubbleTarget === node && this.#hoverBubbleNode) return;

    const text = node.textContent || "";
    if (this.#ruleMatcher.isInvalidText(text)) {
      this.#hideHoverBubble();
      return;
    }

    const currentRunId = ++this.#hoverBubbleRunId;
    this.#hoverBubbleTarget = node;
    this.#showHoverBubble(createLoadingSVG(), "loading");

    try {
      let deLang = "";
      const { fromLang = "auto", toLang } = this.#rule;
      const { langDetector, skipLangs = [] } = this.#setting;
      if (fromLang === "auto") {
        deLang = await tryDetectLang(text, langDetector);
        if (
          deLang &&
          (toLang.slice(0, 2) === deLang.slice(0, 2) ||
            skipLangs.includes(deLang))
        ) {
          if (this.#hoverBubbleRunId === currentRunId) {
            this.#hideHoverBubble();
          }
          return;
        }
      }

      const { trText, isSame } = await this.#translateFetch(text, deLang);
      if (
        this.#hoverBubbleRunId !== currentRunId ||
        this.#hoverBubbleTarget !== node
      ) {
        return;
      }

      if (!trText || isSame) {
        this.#hideHoverBubble();
        return;
      }

      this.#showHoverBubble(Array.isArray(trText) ? trText[0] : trText);
    } catch (err) {
      if (
        this.#hoverBubbleRunId !== currentRunId ||
        this.#hoverBubbleTarget !== node
      ) {
        return;
      }
      this.#showHoverBubble(this.#formatTranslateError(err), "error");
    }
  }

  // 处理节点转为翻译字符串
  // 发起翻译请求
  #translateFetch(text, deLang = "", onStreamChunk = null) {
    const { toLang, transStartHook } = this.#rule;
    const fromLang = deLang || this.#rule.fromLang;
    const rawApiSetting = { ...this.#apiSetting };

    const apiSetting = resolveApiPromptSettings(
      rawApiSetting,
      this.#setting.prompts,
      this.#setting.subtitleSetting
    );

    const glossary = { ...this.#glossary };
    const apisMap = this.#apisMap;

    const args = {
      text,
      fromLang,
      toLang,
      apiSetting,
      glossary,
      onStreamChunk,
    };

    // 翻译开始钩子函数（允许用户在翻译请求发送前修改文本、语言或词典配置）
    // REVIEW: 共享 Sval 实例导致 Hook 竞态条件 (Race Condition) 隐患。
    // 由于 interpreter 是全局单例，当短时间内有多个并发的 translateFetch 触发时，
    // 同步执行的 `interpreter.run('exports.transStartHook = ...')` 会直接覆盖上一个翻译请求的 exports.transStartHook。
    // 这可能导致先前发起的、仍在执行准备阶段的请求，在调用 transStartHook 时执行成了后一个翻译源的钩子逻辑。
    if (transStartHook?.trim()) {
      try {
        interpreter.run(`exports.transStartHook = ${transStartHook}`);
        const hookResult = interpreter.exports.transStartHook({
          ...args,
          apisMap,
        });
        if (hookResult) {
          Object.assign(args, hookResult);
        }
      } catch (err) {
        appLog("transStartHook", err);
      }
    }

    return apiTranslate(args);
  }

  // 查找指定节点下所有译文节点
  #findTranslationWrappers(parentNode) {
    return this.#renderer.findWrappers(parentNode);
  }

  // 清理所有插入的译文dom
  #cleanupAllNodes() {
    this.#scanner.getRoots().forEach((root) => this.#cleanupAllTranslations(root));
  }

  // 清理节点下面所有译文dom
  #cleanupAllTranslations(root) {
    this.#renderer.removeAllWrappers(root).forEach((parent) => {
      this.#processedNodes.delete(parent);
    });
  }

  // 清理子节点译文dom
  #cleanupDirectTranslations(node) {
    this.#findTranslationWrappers(node).forEach((el) => {
      const parent = this.#renderer.removeWrapper(el);
      this.#processedNodes.delete(parent);
    });
  }

  #tryAdoptExistingTranslationHost(hostNode) {
    if (!DomKit.isElementOrFragment(hostNode)) return false;

    const wrappers = this.#renderer.adoptExistingWrappers(hostNode);
    if (!wrappers.length) return false;

    wrappers.forEach((wrapper) => {
      const { nodes } = this.#renderer.getTranslationState(wrapper) || {};
      (nodes || []).forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          this.#processedNodes.set(node, { ...this.#rule });
        }
      });
    });

    this.#processedNodes.set(hostNode, { ...this.#rule });
    return true;
  }

  // 刷新节点翻译
  #refreshNode(node) {
    this.#cleanupDirectTranslations(node);
    this.#processNode(node);
  }

  // 使指定节点的状态与当前的全局同步
  #performSyncNode(node) {
    const appliedRule = this.#processedNodes.get(node);
    if (!appliedRule) {
      this.#enabled && this.#processNode(node);
      return;
    }

    const {
      apiSlug,
      fromLang,
      toLang,
      hasRichText,
      textStyle,
      transOnly,
      transOrder = "original-first",
    } = this.#rule;

    const needsRefresh =
      appliedRule.apiSlug !== apiSlug ||
      appliedRule.fromLang !== fromLang ||
      appliedRule.toLang !== toLang ||
      appliedRule.hasRichText !== hasRichText;

    // 需要重新翻译
    if (needsRefresh) {
      Object.assign(appliedRule, {
        apiSlug,
        fromLang,
        toLang,
        hasRichText,
        textStyle,
        transOnly,
        transOrder,
      });
      this.#refreshNode(node); // 会自动应用新样式
      return;
    }

    // 样式规则过时
    if (appliedRule.textStyle !== textStyle) {
      const oldStyle = appliedRule.textStyle;
      appliedRule.textStyle = textStyle;
      this.#renderer.updateTextStyles(node, oldStyle, textStyle);
    }

    // 文本顺序规则过时
    if (appliedRule.transOrder !== transOrder) {
      appliedRule.transOrder = transOrder;
      this.#renderer.updateTransOrder(node, transOrder);
    }

    // 切换原文显示
    if (appliedRule.transOnly !== transOnly) {
      appliedRule.transOnly = transOnly;
      this.#renderer.updateTranslationOnly(node, transOnly);
    }
  }

  // 停止监听，重置参数
  #resetOptions() {
    this.#scanner.reset();
    this.#processedNodes = new WeakMap();
  }

  // 开启鼠标悬停翻译
  #enableMouseHover() {
    if (this.#mouseHoverEnabled) return;
    this.#mouseHoverEnabled = true;
    this.#setting.mouseHoverSetting.useMouseHover = true;

    document.addEventListener("mousemove", this.#boundMouseMoveHandler);
    const { mouseHoverKey = [], mouseHoverKey2 = [] } =
      this.#setting.mouseHoverSetting;
    if (mouseHoverKey.length === 0 && mouseHoverKey2.length === 0) {
      // mouseHoverKey = DEFAULT_MOUSEHOVER_KEY;
      return;
    }
    const hasPrimaryShortcut = mouseHoverKey.length > 0;
    const hasAltShortcut = mouseHoverKey2.length > 0;
    this.#removeKeydownHandler = hasPrimaryShortcut
      ? shortcutRegister(mouseHoverKey, this.#boundKeyDownHandler)
      : undefined;
    const isSameShortcut =
      hasPrimaryShortcut &&
      hasAltShortcut &&
      mouseHoverKey.length === mouseHoverKey2.length &&
      mouseHoverKey.every((key, idx) => key === mouseHoverKey2[idx]);
    this.#removeKeydownHandler2 =
      hasAltShortcut && !isSameShortcut
        ? shortcutRegister(mouseHoverKey2, this.#boundKeyDownHandler)
        : undefined;
  }

  // 禁用鼠标悬停翻译
  #disableMouseHover() {
    if (!this.#mouseHoverEnabled) return;
    this.#mouseHoverEnabled = false;
    this.#setting.mouseHoverSetting.useMouseHover = false;
    this.#hideHoverBubble();

    document.removeEventListener("mousemove", this.#boundMouseMoveHandler);
    this.#removeKeydownHandler?.();
    this.#removeKeydownHandler2?.();
  }

  // 注入JS/CSS
  #initInjector() {
    if (this.#isJsInjected) {
      return;
    }
    this.#isJsInjected = true;

    try {
      // const { injectJs, injectCss } = this.#rule;
      // if (isExt) {
      //   injectJs && sendBgMsg(MSG_INJECT_JS, injectJs);
      //   injectCss && sendBgMsg(MSG_INJECT_CSS, injectCss);
      // } else {
      //   injectJs &&
      //     injectInlineJs(injectJs, "lingoflow-userinit-injector");
      //   injectCss && injectInternalCss(injectCss);
      // }

      const { injectJs, injectCss, toLang } = this.#rule;

      if (isExt) {
        injectCss && sendBgMsg(MSG_INJECT_CSS, injectCss);
      } else {
        injectCss && injectInternalCss(injectCss);
      }

      if (injectJs?.trim()) {
        const apiSetting = { ...this.#apiSetting };
        const glossary = { ...this.#glossary };
        const apisMap = this.#apisMap;
        const apiDectect = tryDetectLang;
        interpreter.import({
          KT: {
            apiTranslate,
            apiDectect,
            apiSetting,
            apisMap,
            toLang,
            glossary,
          },
        });
        interpreter.run(injectJs);
      }
    } catch (err) {
      appLog("inject js", err);
    }
  }

  // 移除JS/CSS
  #removeInjector() {
    document
      .querySelectorAll(`[data-source^="lingoflow-inject"]`)
      ?.forEach((el) => el.remove());
  }

  // 切换鼠标悬停翻译
  toggleMouseHover() {
    this.#mouseHoverEnabled
      ? this.#disableMouseHover()
      : this.#enableMouseHover();
  }

  // 开启翻译
  enable() {
    if (this.#enabled) return;
    this.#enabled = true;
    this.#rule.transOpen = "true";
    this.#runId++;

    if (this.#isInitialized) {
      if (this.#transAllnow) {
        this.rescan();
      } else {
        this.#scanner.reobserveVisibleNodes();
      }
    } else {
      this.#init();
    }

    if (this.#rule.transTitle === "true") {
      this.#translateTitle();
    }

    isExt && sendBgMsg(MSG_UPDATE_ICON, true);
  }

  // 翻译页面标题
  async #translateTitle() {
    const docInfo = getDocInfo();
    if (!docInfo?.title) return;

    try {
      const deLang = await tryDetectLang(docInfo.title);
      const { trText } = await this.#translateFetch(docInfo.title, deLang);
      this.#docInfo.title = document.title; // 缓存原标题
      document.title = trText || docInfo.title;
    } catch (err) {
      appLog("tanslate title", err);
    }
  }

  // 关闭翻译
  disable() {
    if (!this.#enabled) return;
    this.#enabled = false;
    this.#rule.transOpen = "false";
    this.#runId++;

    this.#cleanupAllNodes();
    clearFetchPool();
    clearAllBatchQueue();

    // 恢复页面标题
    if (this.#rule.transTitle === "true" && this.#docInfo.title) {
      document.title = this.#docInfo.title;
    }

    isExt && sendBgMsg(MSG_UPDATE_ICON, false);
  }

  // 重新扫描页面
  rescan() {
    if (!this.#isInitialized) return;
    this.#runId++;

    this.#cleanupAllNodes();
    this.#resetOptions();
    clearFetchPool();
    clearAllBatchQueue();

    // 重新初始化
    this.#init();
  }

  // 切换是否翻译
  toggle() {
    this.#enabled ? this.disable() : this.enable();
  }

  toggleTransOnly() {
    if (!this.#enabled) {
      this.#rule.transOnly = "true";
      this.enable();
    } else {
      const newValue = this.#rule.transOnly === "true" ? "false" : "true";
      this.updateRule({ transOnly: newValue });
    }
  }

  // 快速切换模糊样式
  toggleStyle() {
    const textStyle =
      this.#rule.textStyle === OPT_STYLE_FUZZY
        ? OPT_STYLE_NONE
        : OPT_STYLE_FUZZY;
    this.updateRule({ textStyle });
  }

  // 切换划词翻译
  toggleTransbox() {
    this.#setting.tranboxSetting.transOpen =
      !this.#setting.tranboxSetting.transOpen;
  }

  // 停止运行
  stop() {
    this.disable();
    this.#resetOptions();
    this.#disableMouseHover();
    this.#renderer.disableTransOnlyRevert();
    this.#removeInjector();
    this.#isInitialized = false;
  }

  // 更新规则
  updateRule(newRule) {
    let hasChanged = false;
    let needsRescan = false;
    const oldTransAllnow = this.#transAllnow;
    const oldRootMargin = this.#rootMargin;
    for (const key in newRule) {
      if (
        Object.prototype.hasOwnProperty.call(this.#rule, key) &&
        this.#rule[key] !== newRule[key]
      ) {
        this.#rule[key] = newRule[key];
        if (
          key === "autoScan" ||
          key === "blockSelector" ||
          key === "hasShadowroot" ||
          key === "scanAll" ||
          key === "isPlainText"
        ) {
          needsRescan = true;
        } else {
          hasChanged = true;
        }
      }
    }

    // 配置变更时清空正则缓存
    this.#placeholderCache = null;
    this.#ruleMatcher.resetBlockSelectorInvalid();

    const needsTriggerRescan =
      this.#enabled &&
      (oldTransAllnow !== this.#transAllnow ||
        String(oldRootMargin) !== String(this.#rootMargin));

    if (
      needsRescan ||
      needsTriggerRescan ||
      (this.#enabled && this.#transAllnow)
    ) {
      this.rescan();
      this.#syncTransOnlyRevert();
      return;
    }

    if (hasChanged) {
      this.#scanner.reobserveVisibleNodes();
      this.#syncTransOnlyRevert();
    }
  }

  #syncTransOnlyRevert() {
    const shouldEnable =
      this.#rule.transOnly === "true" && this.#rule.transOnlyRevert === "true";
    if (shouldEnable) {
      this.#renderer.enableTransOnlyRevert();
    } else {
      this.#renderer.disableTransOnlyRevert();
    }
  }

  get setting() {
    return { ...this.#setting };
  }

  get rule() {
    return { ...this.#rule };
  }

  get eventName() {
    return this.#eventName;
  }
}
