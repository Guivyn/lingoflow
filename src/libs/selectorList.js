/**
 * Split a CSS selector list on commas outside strings, brackets, functions,
 * and comments.
 */
export function splitSelectorList(value = "") {
  const selectors = [];
  let start = 0;
  let parentheses = 0;
  let brackets = 0;
  let quote = "";
  let escaped = false;
  let inComment = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const next = value[index + 1];

    if (inComment) {
      if (char === "*" && next === "/") {
        inComment = false;
        index += 1;
      }
      continue;
    }

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) quote = "";
      continue;
    }

    if (char === "/" && next === "*") {
      inComment = true;
      index += 1;
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }

    if (char === "(") {
      parentheses += 1;
      continue;
    }
    if (char === ")") {
      parentheses = Math.max(0, parentheses - 1);
      continue;
    }
    if (char === "[") {
      brackets += 1;
      continue;
    }
    if (char === "]") {
      brackets = Math.max(0, brackets - 1);
      continue;
    }

    if (char === "," && parentheses === 0 && brackets === 0) {
      const selector = value.slice(start, index).trim();
      if (selector) selectors.push(selector);
      start = index + 1;
    }
  }

  const selector = value.slice(start).trim();
  if (selector) selectors.push(selector);
  return selectors;
}
