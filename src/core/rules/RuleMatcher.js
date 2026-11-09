import { appLog } from "../../libs/log";
import {
  hasBlockDescendantLayout,
  hasBlockLayout,
} from "../dom/layout";

const isElementOrFragment = (el) =>
  el instanceof Element || el instanceof DocumentFragment;

export class RuleMatcher {
  #rule;

  #setting;

  #ignoreSelector;

  #translationTagName;

  #tags;

  #combinedSkipsRegex = null;

  #blockSelectorInvalid = false;

  constructor({
    rule,
    setting,
    ignoreSelector,
    translationTagName,
    tags,
  }) {
    this.#rule = rule;
    this.#setting = setting;
    this.#ignoreSelector = ignoreSelector;
    this.#translationTagName = translationTagName;
    this.#tags = tags;
  }

  setSkipsRegex(regex) {
    this.#combinedSkipsRegex = regex;
  }

  resetBlockSelectorInvalid() {
    this.#blockSelectorInvalid = false;
  }

  isIgnoredElement(node) {
    const selector = this.#ignoreSelector?.trim();
    return Boolean(
      selector &&
        node?.nodeType === Node.ELEMENT_NODE &&
        node.closest?.(selector)
    );
  }

  isVisibleElement(node) {
    if (!isElementOrFragment(node) || node.nodeType !== Node.ELEMENT_NODE) {
      return true;
    }

    if (
      node.matches?.(
        '[hidden], [aria-hidden="true"], .sr-only, .visually-hidden, [class*="visually-hidden"]'
      )
    ) {
      return false;
    }

    if (typeof node.checkVisibility === "function") {
      try {
        return node.checkVisibility();
      } catch (err) {
        appLog("checkVisibility failed", err);
      }
    }

    let current = node;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      if (
        current.matches?.(
          '[hidden], [aria-hidden="true"], .sr-only, .visually-hidden, [class*="visually-hidden"]'
        )
      ) {
        return false;
      }

      const style = window.getComputedStyle?.(current);
      if (
        style &&
        (style.display === "none" ||
          style.visibility === "hidden" ||
          style.visibility === "collapse")
      ) {
        return false;
      }

      current = current.parentElement;
    }

    return true;
  }

  matchesBlockSelector(node) {
    const selector = this.#rule.blockSelector?.trim();
    if (
      !selector ||
      this.#blockSelectorInvalid ||
      node?.nodeType !== Node.ELEMENT_NODE
    ) {
      return false;
    }

    try {
      return node.matches(selector);
    } catch (err) {
      this.#blockSelectorInvalid = true;
      appLog("invalid blockSelector", err);
      return false;
    }
  }

  #matchesKeepSelector(node) {
    const selector = this.#rule.keepSelector?.trim();
    if (!selector || node?.nodeType !== Node.ELEMENT_NODE) return false;

    try {
      return node.matches(selector);
    } catch (err) {
      appLog("keepSelector match error", selector, err);
      return false;
    }
  }

  #layoutOptions(readLayout) {
    return {
      readLayout,
      isForcedBlock: (node) => this.matchesBlockSelector(node),
      isPreservedInline: (node) =>
        this.#matchesKeepSelector(node) || this.isIgnoredElement(node),
    };
  }

  isBlockNode(node, readLayout) {
    if (!isElementOrFragment(node)) return false;
    return hasBlockLayout(node, this.#layoutOptions(readLayout));
  }

  hasBlockNode(node, readLayout) {
    if (!isElementOrFragment(node)) return false;
    return hasBlockDescendantLayout(node, this.#layoutOptions(readLayout));
  }

  shouldBreak(node, readLayout) {
    if (!isElementOrFragment(node)) return false;

    if (this.#matchesKeepSelector(node)) return false;

    if (
      this.#tags.BREAK_LINE.has(node.nodeName?.toUpperCase()) ||
      (this.#ignoreSelector && node.matches?.(this.#ignoreSelector)) ||
      node.nodeName?.toLowerCase() === this.#translationTagName
    ) {
      return true;
    }

    if (
      this.#rule.autoScan === "true" &&
      this.isBlockNode(node, readLayout)
    ) {
      return true;
    }

    if (
      this.#rule.autoScan === "false" &&
      (node.matches(this.#rule.selector) ||
        node.querySelector(this.#rule.selector))
    ) {
      return true;
    }

    return false;
  }

  isInvalidText(text) {
    if (typeof text !== "string") {
      return true;
    }

    const trimmedText = text.trim();

    if (!trimmedText) {
      return true;
    }

    if (
      trimmedText.length < this.#setting.minLength ||
      trimmedText.length > this.#setting.maxLength
    ) {
      return true;
    }

    if (trimmedText.length === 1 && !trimmedText.match(/[a-zA-Z]/)) {
      return true;
    }

    if (!isNaN(parseFloat(trimmedText)) && isFinite(trimmedText)) {
      return true;
    }

    if (this.#combinedSkipsRegex?.test(trimmedText)) {
      return true;
    }

    return false;
  }
}
