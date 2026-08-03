/**
 * @file style.js
 * @description 译文展示样式生成模块。内置样式颜色统一取自设计令牌，并通过 CSS 变量支持明暗模式。
 */

import {
  OPT_STYLE_NONE,
  OPT_STYLE_LINE,
  OPT_STYLE_DOTLINE,
  OPT_STYLE_DASHLINE,
  OPT_STYLE_WAVYLINE,
  OPT_STYLE_DASHBOX,
  OPT_STYLE_PAPER,
  OPT_STYLE_HIGHLIGHT,
  OPT_STYLE_BLOCKQUOTE,
  OPT_STYLE_SIDE_RAIL,
  OPT_STYLE_GRADIENT,
  OPT_STYLE_COLORFUL,
  OPT_STYLE_BOLD,
  OPT_STYLE_DASHBOX_BOLD,
  OPT_STYLE_DASHLINE_BOLD,
  OPT_STYLE_WAVYLINE_BOLD,
} from "../config";
import { tokens } from "../ui/theme/tokens";

const ACCENT = tokens.translation.accent;
const QUOTE_BG = tokens.translation.quoteBg;
const HIGHLIGHT_TEXT = tokens.translation.highlightText;
const PAPER_BG = tokens.translation.accentSoft;

// 译文 wrapper 的基础排版规则：保持内联、保留译文换行、长词安全断行、双向文字隔离。
const translationBaseStyles = `
  .lingoflow-wrapper {
    display: inline;
    unicode-bidi: isolate;
    align-self: flex-start;
    justify-self: start;
  }
  .lingoflow-inner {
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: normal;
    unicode-bidi: isolate;
  }
  .lingoflow-wrapper.lingoflow-long {
    display: block;
    text-align: start;
  }
  .lingoflow-wrapper.lingoflow-long > .lingoflow-inner {
    display: block;
  }
  .lingoflow-wrapper.lingoflow-long > .lingoflow-tr-paper {
    border-radius: 0.3em;
    padding: 0.28em 0.4em;
  }
  .lingoflow-space {
    margin-inline-end: 0.22em;
  }
`;

const reducedMotion = `
  @media (prefers-reduced-motion: reduce) {
    .lingoflow-tr-gradient,
    .lingoflow-tr-colorful {
      animation: none !important;
    }
  }
`;

const gradientFlow = `
  @keyframes lf-gradient-flow {
    to {
      background-position: 200% center;
    }
  }
`;

const genLineStyle = (style, thickness = 1) => `
  text-decoration-line: underline;
  text-decoration-style: ${style};
  text-decoration-color: var(--lf-tr-color, ${ACCENT});
  text-decoration-thickness: ${thickness}px;
  text-underline-offset: 0.3em;
  -webkit-text-decoration-line: underline;
  -webkit-text-decoration-style: ${style};
  -webkit-text-decoration-color: var(--lf-tr-color, ${ACCENT});
  -webkit-text-decoration-thickness: ${thickness}px;
  -webkit-text-underline-offset: 0.3em;

  opacity: 0.82;
  transition: opacity ${tokens.motion.fast}ms ${tokens.motion.easing};
`;

const genBuiltinStyles = () => ({
  // 无样式
  [OPT_STYLE_NONE]: ``,
  // 下划线
  [OPT_STYLE_LINE]: genLineStyle("solid"),
  // 点状线
  [OPT_STYLE_DOTLINE]: genLineStyle("dotted"),
  // 虚线
  [OPT_STYLE_DASHLINE]: genLineStyle("dashed"),
  // 虚线加粗
  [OPT_STYLE_DASHLINE_BOLD]: genLineStyle("dashed", 2),
  // 波浪线
  [OPT_STYLE_WAVYLINE]: genLineStyle("wavy"),
  // 波浪线加粗
  [OPT_STYLE_WAVYLINE_BOLD]: genLineStyle("wavy", 2),
  // 虚线框
  [OPT_STYLE_DASHBOX]: `
    border: 1px dashed var(--lf-tr-color, ${ACCENT});
    display: block;
    padding: 0.15em 0.25em;
    box-sizing: border-box;
  `,
  // 虚线框加粗
  [OPT_STYLE_DASHBOX_BOLD]: `
    border: 2px dashed var(--lf-tr-color, ${ACCENT});
    display: block;
    padding: 0.15em 0.25em;
    box-sizing: border-box;
  `,
  // 纸感高亮
  [OPT_STYLE_PAPER]: `
    background: var(--lf-tr-soft, ${PAPER_BG});
    border-radius: 0.22em;
    box-shadow: 0 1px 0 rgba(42, 39, 35, 0.06),
      0 3px 10px rgba(42, 39, 35, 0.07);
    padding: 0.04em 0.12em;
  `,
  // 高亮
  [OPT_STYLE_HIGHLIGHT]: `
    color: var(--lf-tr-highlight-text, ${HIGHLIGHT_TEXT});
    background-color: var(--lf-tr-color, ${ACCENT});
  `,
  // 引用
  [OPT_STYLE_BLOCKQUOTE]: `
    opacity: 0.82;
    display: block;
    padding: 0.2em 0.4em;
    border-left: 0.25em solid var(--lf-tr-color, ${ACCENT});
    background: var(--lf-tr-quote-bg, ${QUOTE_BG});
    transition: opacity ${tokens.motion.fast}ms ${tokens.motion.easing};
  `,
  // 侧栏
  [OPT_STYLE_SIDE_RAIL]: `
    display: block;
    border-inline-start: 0.18em solid var(--lf-tr-color, ${ACCENT});
    padding-inline-start: 0.35em;
  `,
  // 渐变
  [OPT_STYLE_GRADIENT]: `
    background-image: linear-gradient(
      90deg,
      #c96a4a,
      #d9a05b,
      #b4586b,
      #c96a4a
    );
    background-size: 200% auto;
    color: transparent;
    -webkit-background-clip: text;
    background-clip: text;
    animation: lf-gradient-flow 4s linear infinite;
  `,
  // 多彩
  [OPT_STYLE_COLORFUL]: `
    background-image: linear-gradient(
      100deg,
      #e05252 0%,
      #f0a03d 18%,
      #d9b83c 36%,
      #4f9d69 54%,
      #4d8fcc 72%,
      #9a6fd0 90%,
      #e05252 100%
    );
    background-size: 200% auto;
    color: transparent;
    -webkit-background-clip: text;
    background-clip: text;
    animation: lf-gradient-flow 6s linear infinite;
  `,
  // 加粗
  [OPT_STYLE_BOLD]: `
    font-weight: 700;
  `,
});

// 各样式在 hover 时的增强规则，避免在样式字符串里散写嵌套选择器。
const HOVER_RULES = {
  [OPT_STYLE_LINE]: "opacity: 1;",
  [OPT_STYLE_DOTLINE]: "opacity: 1;",
  [OPT_STYLE_DASHLINE]: "opacity: 1;",
  [OPT_STYLE_DASHLINE_BOLD]: "opacity: 1;",
  [OPT_STYLE_WAVYLINE]: "opacity: 1;",
  [OPT_STYLE_WAVYLINE_BOLD]: "opacity: 1;",
  [OPT_STYLE_BLOCKQUOTE]: "opacity: 1;",
  [OPT_STYLE_COLORFUL]: "filter: saturate(1.2) brightness(1.05);",
};

const DESCENDANT_RULES = {
  [OPT_STYLE_GRADIENT]: "background-color: transparent !important;",
};

/**
 * 根据内置样式和用户自定义样式，生成确定性的 Class 映射与单份样式表字符串。
 *
 * 旧的实现会先调用 @emotion/css 把样式注入全局 document，再生成一份文本交给
 * Shadow DOM 的 adoptedStyleSheets，导致同一页面存在两份样式。现在改为确定性类名，
 * 只产出文本样式表，由 Renderer 统一注入 Shadow DOM。
 *
 * @param {Array} customStyles - 用户自定义样式表
 * @returns {Array} [textClass, textStyles] 返回 Class 映射字典及完整样式表字符串
 */
export const genTextClass = (customStyles = []) => {
  const styles = genBuiltinStyles();
  customStyles.forEach((style) => {
    if (style?.styleSlug && typeof style.styleCode === "string") {
      styles[style.styleSlug] = style.styleCode;
    }
  });

  const textClass = {};
  let textStyles = `${translationBaseStyles}${reducedMotion}${gradientFlow}`;
  Object.entries(styles).forEach(([k, v]) => {
    const cls = `lingoflow-tr-${String(k).replace(/_/g, "-")}`;
    textClass[k] = cls;
    const cssText = String(v || "").trim();
    if (cssText) {
      textStyles += `\n.${cls} { ${cssText} }`;
    }
    const hover = HOVER_RULES[k];
    if (hover) {
      textStyles += `\n.${cls}:hover { ${hover} }`;
    }
    const descendant = DESCENDANT_RULES[k];
    if (descendant) {
      textStyles += `\n.${cls} * { ${descendant} }`;
    }
  });
  return [textClass, textStyles];
};

export const translationKeyframes = `${reducedMotion}${gradientFlow}`;

export const builtinStylesMap = genBuiltinStyles();
