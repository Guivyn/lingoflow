import { appLog } from "../../libs/log";

const isElementOrFragment = (el) =>
  el instanceof Element || el instanceof DocumentFragment;

export class RuleMatcher {
  #rule;

  #setting;

  #ignoreSelector;

  #translationTagName;

  #tags;

  #isBlockNodeStatic;

  #combinedSkipsRegex = null;

  #blockSelectorInvalid = false;

  constructor({
    rule,
    setting,
    ignoreSelector,
    translationTagName,
    tags,
    isBlockNode,
  }) {
    this.#rule = rule;
    this.#setting = setting;
    this.#ignoreSelector = ignoreSelector;
    this.#translationTagName = translationTagName;
    this.#tags = tags;
    this.#isBlockNodeStatic = isBlockNode;
  }

  setSkipsRegex(regex) {
    this.#combinedSkipsRegex = regex;
  }

  resetBlockSelectorInvalid() {
    this.#blockSelectorInvalid = false;
  }

  isIgnoredElement(node) {
    return (
      node?.nodeType === Node.ELEMENT_NODE &&
      node.matches?.(this.#ignoreSelector)
    );
  }

  matchesBlockSelector(node) {
    const selector = this.#rule.blockSelector?.trim();
    if (
      !selector ||
      this.#blockSelectorInvalid ||
      !isElementOrFragment(node)
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

  isBlockNode(node) {
    if (this.matchesBlockSelector(node)) return true;
    return this.#isBlockNodeStatic(node);
  }

  hasBlockNode(node) {
    if (!isElementOrFragment(node)) return false;
    for (const child of node.childNodes) {
      if (this.isBlockNode(child)) {
        return true;
      }
    }
    return false;
  }

  shouldBreak(node) {
    if (!isElementOrFragment(node)) return false;

    let matchesKeepSelector = false;
    try {
      matchesKeepSelector = node.matches(this.#rule.keepSelector);
    } catch (err) {
      appLog(
        "keepSelector match error in shouldBreak",
        this.#rule.keepSelector,
        err
      );
    }
    if (matchesKeepSelector) return false;

    if (
      this.#tags.BREAK_LINE.has(node.nodeName?.toUpperCase()) ||
      node.matches?.(this.#ignoreSelector) ||
      node.nodeName?.toLowerCase() === this.#translationTagName
    ) {
      return true;
    }

    if (this.#rule.autoScan === "true" && this.isBlockNode(node)) {
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
