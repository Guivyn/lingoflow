import { APP_LCNAME, APP_CONSTS } from "../../config";

const LINGOFLOW_CLASS = {
  warpper: `${APP_LCNAME}-wrapper`,
  inner: `${APP_LCNAME}-inner`,
  term: `${APP_LCNAME}-term`,
  br: `${APP_LCNAME}-br`,
  space: `${APP_LCNAME}-space`,
  retry: `${APP_LCNAME}-retry`,
  backup: `${APP_LCNAME}-backup`,
  hoverBubble: `${APP_LCNAME}-hover-bubble`,
};

export const DomKit = {
  displayCache: new WeakMap(),

  TAGS: {
    BREAK_LINE: new Set(["BR", "WBR"]),
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
    INLINE: new Set([
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
      "STRONG",
      "SUB",
      "SUP",
      "TEXTAREA",
      "TIME",
      "TT",
      "U",
      "VAR",
    ]),
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
  },

  LINGOFLOW_CLASS,

  BUILTIN_SKIP_PATTERNS: [
    /^(?:(?:https?|ftp|file):\/\/|www\.)[^\s/$.?#].[^\s]*$/i,
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    /^(?:[a-zA-Z]:\\|\/|\\)(?:[\w\-. ]+\/|[\w\-. ]+\\)*[\w\-. ]*\.?[\w\-. ]*$/,
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    /^[$\u00A2-\u00A5\u20A0-\u20CF]?\s?-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?\s?(?:px|%|em|rem|pt|vw|vh|deg|s|ms)?$/,
    /^v?\d+(\.\d+){1,3}$/,
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/,
    /^({{[^}]+}}|\${[^}]+}|__\w+__|%\w+)$/,
    /^(?:\.|#)[\w-]+$|^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    /^@[\w.-]+$/,
    /^&\w+;$/,
    /^\[\d+\]$/,
    /^\d{1,2}:\d{2}(:\d{2})?$/,
    /^[^\s\\/:]+?\.[a-zA-Z0-9]{2,5}$/,
  ],

  LINGOFLOW_IGNORE_SELECTOR: `.${LINGOFLOW_CLASS.warpper}, .${LINGOFLOW_CLASS.hoverBubble}, .lingoflow-caption-container, .lingoflow-subtitle-controls, #lingoflow-youtube-subtitle-list-container,
  #${APP_CONSTS.fabID}, .${APP_CONSTS.fabID}_warpper,
  #${APP_CONSTS.boxID}, .${APP_CONSTS.boxID}_warpper,
  #${APP_CONSTS.popupID}, .${APP_CONSTS.popupID}_warpper`,

  BUILTIN_IGNORE_SELECTOR: `address, area, audio, br, canvas,
  data, datalist, embed, head, iframe, input, noscript, map,
  object, option, param, picture, progress,
  select, script, style, svg, track, textarea, template,
  video, wbr, .notranslate, [contenteditable='true'], [translate='no']`,

  isElement(el) {
    return el instanceof Element;
  },

  isElementOrFragment(el) {
    return el instanceof Element || el instanceof DocumentFragment;
  },

  isBlockNode(el) {
    if (!DomKit.isElementOrFragment(el)) return false;
    if (el.attributes?.display?.value?.includes("inline")) return false;
    if (el.attributes?.display?.value?.includes("block")) return true;
    if (DomKit.TAGS.INLINE.has(el.nodeName?.toUpperCase())) return false;
    if (DomKit.TAGS.BLOCK.has(el.nodeName?.toUpperCase())) return true;
    if (DomKit.displayCache.has(el)) {
      return DomKit.displayCache.get(el);
    }
    const isBlock = !window.getComputedStyle(el).display.startsWith("inline");
    DomKit.displayCache.set(el, isBlock);
    return isBlock;
  },

  hasBlockNode(el) {
    if (!DomKit.isElementOrFragment(el)) return false;
    for (const child of el.childNodes) {
      if (DomKit.isBlockNode(child)) return true;
    }
    return false;
  },

  hasTextNode(el) {
    if (!DomKit.isElementOrFragment(el)) return false;
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && /\S/.test(child.nodeValue)) {
        return true;
      }
    }
    return false;
  },

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  },
};
