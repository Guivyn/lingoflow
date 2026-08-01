import { trustedTypesHelper } from "./trustedTypes";

/**
 * Escape plain text for safe HTML rendering.
 * @param {string} str
 * @returns {string}
 */
export function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Decode HTML entities back to plain text.
 * @param {string} str
 * @returns {string}
 */
export function decodeHTMLEntities(str) {
  if (!str || typeof str !== "string") return str;

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    trustedTypesHelper.createHTML(str),
    "text/html"
  );

  return doc.documentElement.textContent || "";
}
