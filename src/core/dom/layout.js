export const BLOCK_LAYOUT_TAGS = new Set([
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
]);

export function getNodeLayout(node) {
  if (node?.nodeType === 11) return "contents";
  if (node?.nodeType !== 1) return "inline";

  const view = node.ownerDocument?.defaultView || globalThis.window;
  const display = view?.getComputedStyle?.(node)?.display;
  if (!display) {
    return BLOCK_LAYOUT_TAGS.has(node.tagName?.toUpperCase())
      ? "block"
      : "inline";
  }

  if (display === "none") return "hidden";
  if (display === "contents") return "contents";
  if (display === "inline" || display === "inline flow") return "inline";
  if (
    display.startsWith("inline") ||
    display.startsWith("ruby") ||
    display.startsWith("math")
  ) {
    return "atomic";
  }
  return "block";
}

export function createLayoutReader() {
  const layouts = new WeakMap();
  return (node) => {
    if (!node || (typeof node !== "object" && typeof node !== "function")) {
      return getNodeLayout(node);
    }
    if (!layouts.has(node)) layouts.set(node, getNodeLayout(node));
    return layouts.get(node);
  };
}

export function hasBlockLayout(
  node,
  {
    isForcedBlock = () => false,
    isPreservedInline = () => false,
    readLayout = getNodeLayout,
  } = {}
) {
  const pending = [node];
  const visited = new WeakSet();

  while (pending.length) {
    const current = pending.pop();
    if (
      !current ||
      (typeof current !== "object" && typeof current !== "function")
    ) {
      continue;
    }
    if (visited.has(current)) continue;
    visited.add(current);

    if (isForcedBlock(current)) return true;

    const layout = readLayout(current);
    if (layout === "block") return true;
    if (layout === "hidden" || layout === "atomic") continue;
    if (
      (layout === "inline" || layout === "contents") &&
      !isPreservedInline(current)
    ) {
      for (const child of current.childNodes || []) pending.push(child);
    }
  }

  return false;
}

export function hasBlockDescendantLayout(node, options) {
  if (!node?.childNodes) return false;
  for (const child of node.childNodes) {
    if (hasBlockLayout(child, options)) return true;
  }
  return false;
}
