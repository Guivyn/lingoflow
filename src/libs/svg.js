/**
 * 各种 UI 动画和图标的 SVG 静态模板
 */
import { tokens } from "../ui/theme/tokens";

// 内部辅助函数：在特定的 XML 命名空间中创建 SVG 元素并设置属性
function createSVGElement(tag, attributes) {
  const svgNS = "http://www.w3.org/2000/svg";
  const el = document.createElementNS(svgNS, tag);
  for (const key in attributes) {
    el.setAttribute(key, attributes[key]);
  }
  return el;
}

/**
 * 动态创建 Loading 动画 SVG 元素节点
 * @param {string} [color] - 圆点填充色，默认取设计令牌主色
 * @returns {SVGElement}
 */
export function createLoadingSVG(color = tokens.color.primary) {
  const svg = createSVGElement("svg", {
    viewBox: "-20 0 100 100",
    style:
      "display: inline-block; width: 1em; height: 1em; vertical-align: middle;",
  });

  const circleData = [
    { cx: "6", begin: "0.1", values: "0 15 ; 0 -15; 0 15" },
    { cx: "30", begin: "0.2", values: "0 10 ; 0 -10; 0 10" },
    { cx: "54", begin: "0.3", values: "0 5 ; 0 -5; 0 5" },
  ];

  circleData.forEach((data) => {
    const circle = createSVGElement("circle", {
      fill: color,
      stroke: "none",
      cx: data.cx,
      cy: "50",
      r: "6",
    });
    const animation = createSVGElement("animateTransform", {
      attributeName: "transform",
      dur: "1s",
      type: "translate",
      values: data.values,
      repeatCount: "indefinite",
      begin: data.begin,
    });
    circle.appendChild(animation);
    svg.appendChild(circle);
  });

  return svg;
}

/**
 * 动态创建翻译失败重试图标 SVG 元素节点并绑定悬浮高亮事件
 * @returns {SVGElement}
 */
export function createRetrySVG() {
  const svg = createSVGElement("svg", {
    viewBox: "0 0 24 24",
    style:
      "display: inline-block; width: 1em; height: 1em; vertical-align: middle; cursor: pointer; opacity: 0.7;",
  });

  svg.addEventListener("mouseenter", () => {
    svg.style.opacity = "1";
  });
  svg.addEventListener("mouseleave", () => {
    svg.style.opacity = "0.7";
  });

  // 圆弧还原箭头路径 (↻)
  const path = createSVGElement("path", {
    d: "M17.65 6.35A7.958 7.958 0 0 0 12 4C7.58 4 4.01 7.58 4.01 12S7.58 20 12 20c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
    fill: tokens.color.danger,
  });

  svg.appendChild(path);
  return svg;
}

/**
 * 动态创建 LingoFlow 主徽标 SVG 元素节点。
 * 与 ProductSignature 使用同一套双色双栏 Logo：左侧源语蓝、右侧译语陶土红。
 *
 * @param {Object} [options]
 * @param {string} [options.width] - 宽度
 * @param {string} [options.height] - 高度
 * @param {string} [options.viewBox] - viewBox
 * @param {boolean} [options.isSelected] - 是否处于选中状态（加白色描边环）
 * @returns {SVGElement}
 */
export function createLogoSVG({
  width = "24",
  height = "24",
  viewBox = "0 0 48 48",
  isSelected = false,
} = {}) {
  const svg = createSVGElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width,
    height,
    viewBox,
    version: "1.1",
    "aria-hidden": "true",
  });

  if (isSelected) {
    const ring = createSVGElement("rect", {
      x: "1.5",
      y: "5.5",
      width: "45",
      height: "37",
      rx: "10",
      fill: "none",
      stroke: "rgba(255, 255, 255, 0.9)",
      strokeWidth: "2",
    });
    svg.appendChild(ring);
  }

  const left = createSVGElement("rect", {
    x: "6",
    y: "10",
    width: "15",
    height: "26",
    rx: "7.5",
    fill: tokens.color.blue,
  });
  const right = createSVGElement("rect", {
    x: "25",
    y: "16",
    width: "15",
    height: "16",
    rx: "7.5",
    fill: tokens.color.primary,
  });

  svg.appendChild(left);
  svg.appendChild(right);

  return svg;
}
