/**
 * 各种 UI 动画和图标的 SVG 静态模板
 */
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
 * @returns {SVGElement}
 */
export function createLoadingSVG() {
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
      fill: "#209CEE",
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
    fill: "#F44336",
  });

  svg.appendChild(path);
  return svg;
}

/**
 * 动态创建 LingoFlow 主徽标 LOGO SVG 元素节点
 * @param {Object} [options]
 * @param {string} [options.width] - 宽度
 * @param {string} [options.height] - 高度
 * @param {string} [options.viewBox] - viewBox
 * @param {boolean} [options.isSelected] - 是否处于选中状态（反转前景与背景色）
 * @returns {SVGElement}
 */
export function createLogoSVG({
  width = "24",
  height = "24",
  viewBox = "-5 -5 40 40",
  isSelected = false,
} = {}) {
  const svg = createSVGElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width,
    height,
    viewBox,
    version: "1.1",
  });

  const primaryColor = "#209CEE";
  const secondaryColor = "#E9F5FD";

  const path1Fill = isSelected ? secondaryColor : primaryColor;
  const path2Fill = isSelected ? primaryColor : secondaryColor;

  const path1 = createSVGElement("path", {
    d: "M8 1h16a7 7 0 0 1 7 7v16a7 7 0 0 1-7 7H8a7 7 0 0 1-7-7V8a7 7 0 0 1 7-7z",
    fill: path1Fill,
  });

  const path2 = createSVGElement("path", {
    d: "M9 7h5v11h11v5H9z",
    fill: path2Fill,
  });

  const path3 = createSVGElement("path", {
    d: "M13 27c2.5-3 5-3 7.5 0s5 3 7.5 0",
    fill: "none",
    stroke: path2Fill,
    strokeWidth: "2.4",
    strokeLinecap: "round",
  });

  svg.appendChild(path1);
  svg.appendChild(path2);
  svg.appendChild(path3);

  return svg;
}
