import { escapeHTML } from "../../libs/html";
import { trustedTypesHelper } from "../../libs/trustedTypes";
import { appLog } from "../../libs/log";

export class TranslationRenderer {
  #rule;

  #tags;

  #getPlaceholderConfig;

  #getTerms;

  #isIgnoredElement;

  constructor({
    rule,
    tags,
    getPlaceholderConfig,
    getTerms,
    isIgnoredElement,
  }) {
    this.#rule = rule;
    this.#tags = tags;
    this.#getPlaceholderConfig = getPlaceholderConfig;
    this.#getTerms = getTerms;
    this.#isIgnoredElement = isIgnoredElement;
  }

  // 处理节点转为翻译字符串
  serializeForTranslation(nodes, termsStyle) {
    let replaceCounter = 0;
    let wrapCounter = 0;
    const placeholderMap = new Map();
    const { startDelimiter, endDelimiter } = this.#getPlaceholderConfig();
    const { values: termValues, regex: combinedTermsRegex } =
      this.#getTerms();

    const pushReplace = (html) => {
      replaceCounter++;
      const placeholder = `${startDelimiter}${replaceCounter}${endDelimiter}`;
      placeholderMap.set(placeholder, html);
      return placeholder;
    };

    const traverse = (node) => {
      if (
        node.nodeType !== Node.ELEMENT_NODE &&
        node.nodeType !== Node.TEXT_NODE
      ) {
        return "";
      }

      if (node.nodeType === Node.TEXT_NODE) {
        let text = node.textContent;
        if (!text.trim()) return "";

        if (combinedTermsRegex) {
          combinedTermsRegex.lastIndex = 0;
          text = text.replace(combinedTermsRegex, (...args) => {
            const groups = args.slice(1, -2);
            const matchedIndex = groups.findIndex(
              (group) => group !== undefined
            );
            const fullMatch = args[0];
            const termValue = termValues[matchedIndex];

            return pushReplace(
              `<i class="lingoflow-term" style="${termsStyle}">${
                termValue || fullMatch
              }</i>`
            );
          });
        }

        text = text.replace(/\r?\n/g, () => pushReplace(`&#10;`));

        return escapeHTML(text);
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        if (this.#isIgnoredElement(node)) {
          return "";
        }

        let matchesKeepSelector = false;
        try {
          matchesKeepSelector = node.matches(this.#rule.keepSelector);
        } catch (err) {
          appLog("keepSelector match error", this.#rule.keepSelector, err);
        }

        if (
          (this.#rule.hasRichText === "true" &&
            this.#tags.REPLACE.has(node.tagName)) ||
          matchesKeepSelector ||
          !node.textContent.trim()
        ) {
          if (
            node.tagName?.toUpperCase() === "IMG" ||
            node.tagName?.toUpperCase() === "SVG"
          ) {
            node.style.width = `${node.offsetWidth}px`;
            node.style.height = `${node.offsetHeight}px`;
          }
          return pushReplace(node.outerHTML);
        }

        let innerContent = "";
        node.childNodes.forEach((child) => {
          try {
            innerContent += traverse(child);
          } catch (err) {
            appLog("traverse child error", child.nodeName, err);
          }
        });

        if (
          this.#rule.hasRichText === "true" &&
          this.#tags.WARP.has(node.tagName?.toUpperCase())
        ) {
          wrapCounter++;
          const { tagName, format } = this.#getPlaceholderConfig();

          placeholderMap.set(`TAG_${wrapCounter}`, {
            openTag: buildOpeningTag(node),
            closeTag: `</${node.localName}>`,
          });

          let startPlaceholder, endPlaceholder;
          if (format === "attribute") {
            startPlaceholder = `<${tagName} i=${wrapCounter}>`;
            endPlaceholder = `</${tagName}>`;
          } else {
            startPlaceholder = `<${tagName}${wrapCounter}>`;
            endPlaceholder = `</${tagName}${wrapCounter}>`;
          }

          return `${startPlaceholder}${innerContent}${endPlaceholder}`;
        }

        return innerContent;
      }

      return "";
    };

    function buildOpeningTag(node) {
      const escapeAttr = (str) => str.replace(/"/g, "&quot;");
      let tag = `<${node.tagName.toLowerCase()}`;
      for (const attr of node.attributes) {
        tag += ` ${attr.name}="${escapeAttr(attr.value)}"`;
      }
      tag += ">";
      return tag;
    }

    const processedString = nodes.map(traverse).join("").trim();

    return [processedString, placeholderMap];
  }

  // 将翻译后的文本与序列化时抽离的占位符合并还原
  restoreFromTranslation(translatedText, placeholderMap) {
    if (!placeholderMap.size) {
      return translatedText;
    }

    if (!translatedText) return "";

    const { safeTag, openRegex, closeRegex, placeholderRegex } =
      this.#getPlaceholderConfig();
    const restoreAttr = "data-lingoflow-restore";
    let textToParse = translatedText;
    let result = translatedText;

    try {
      textToParse = textToParse.replace(
        openRegex,
        `<${safeTag} ${restoreAttr}="$1">`
      );
      textToParse = textToParse.replace(closeRegex, `</${safeTag}>`);

      const parser = new DOMParser();
      const doc = parser.parseFromString(
        trustedTypesHelper.createHTML(textToParse),
        "text/html"
      );

      const selector = `${safeTag}[${restoreAttr}]`;
      const placeholders = Array.from(doc.querySelectorAll(selector));

      placeholders.reverse().forEach((node) => {
        const index = node.getAttribute(restoreAttr);
        if (index) {
          const tagPair = placeholderMap.get(`TAG_${index}`);
          if (tagPair) {
            node.outerHTML = trustedTypesHelper.createHTML(
              `${tagPair.openTag}${node.innerHTML}${tagPair.closeTag}`
            );
          }
        }
      });

      result = doc.body.innerHTML;
    } catch (e) {
      appLog("DOMParser restore failed, fallback to raw", e);
    }

    result = result.replace(
      placeholderRegex,
      (match) => placeholderMap.get(match) || match
    );

    return result;
  }
}
