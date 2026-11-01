const REFLOW_CLASS = "lingoflow-reflow";
const COMPACT_HOST = "h1,h2,h3,h4,h5,h6,a,button,[role='button']";

function textLines(element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  if (typeof range.getClientRects !== "function") return [];
  const lines = [];
  for (const rect of Array.from(range.getClientRects())) {
    if (rect.width <= 0 || rect.height <= 0) continue;
    // Nested inline elements can contribute several rectangles on one line.
    const center = (rect.top + rect.bottom) / 2;
    if (
      !lines.some(
        (line) =>
          Math.abs(line.center - center) <
          Math.min(line.height, rect.height) / 2
      )
    ) {
      lines.push({ center, height: rect.height });
    }
  }
  return lines;
}

function constraints(wrapper) {
  const result = [];
  let parent = wrapper.parentElement;
  for (
    let depth = 0;
    parent && depth < 4;
    depth++, parent = parent.parentElement
  ) {
    const style = window.getComputedStyle(parent);
    result.push({
      element: parent,
      horizontal: Math.max(0, parent.scrollWidth - parent.clientWidth),
      vertical: /hidden|clip|auto|scroll/.test(style.overflowY)
        ? Math.max(0, parent.scrollHeight - parent.clientHeight)
        : null,
    });
  }
  return result;
}

/** Move a fragmented short Chinese label below its original when it fits there. */
export function repairTranslationLayout(wrapper, inner) {
  if (
    !wrapper?.isConnected ||
    !inner ||
    wrapper.classList.contains(REFLOW_CLASS)
  )
    return false;
  const text = inner.textContent.trim();
  if (!/[\u3400-\u9fff]/.test(text) || Array.from(text).length > 16)
    return false;
  if (!wrapper.parentElement?.closest(COMPACT_HOST)) return false;
  // A block cannot start a new row inside an unwrapped flex/grid parent.
  const display = window.getComputedStyle(wrapper.parentElement).display;
  if (/^(inline-)?(flex|grid)$/.test(display)) return false;
  const beforeLines = textLines(inner);
  if (beforeLines.length < 2) return false;
  const beforeConstraints = constraints(wrapper);
  wrapper.classList.add(REFLOW_CLASS);
  const afterLines = textLines(inner);
  const worsensOverflow = beforeConstraints.some(
    ({ element, horizontal, vertical }) =>
      element.scrollWidth - element.clientWidth > horizontal + 1 ||
      (vertical !== null &&
        element.scrollHeight - element.clientHeight > vertical + 1)
  );
  if (afterLines.length !== 1 || worsensOverflow) {
    wrapper.classList.remove(REFLOW_CLASS);
    return false;
  }
  return true;
}
