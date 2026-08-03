import { APP_LCNAME, newI18n } from "../../config";
import { escapeHTML } from "../../libs/html";
import { trustedTypesHelper } from "../../libs/trustedTypes";
import { appLog } from "../../libs/log";
import { genTextClass } from "../../libs/style";
import { createRetrySVG } from "../../libs/svg";
import { DomKit } from "../dom/DomKit";
import { tokens } from "../../ui/theme/tokens";

export class TranslationRenderer {
  #rule;
  #setting;
  #tags;
  #getPlaceholderConfig;
  #getTerms;
  #isIgnoredElement;
  #shouldBreak;
  #translationTagName;

  #textClass = {};
  #textSheet = null;
  #textStylesRaw = "";
  #useSheetFallback = false;

  #translationNodes = new WeakMap();

  #transOnlyRevertTimer = null;
  #transOnlyRevertTarget = null;
  #transOnlyRevertEnabled = false;
  #boundTransOnlyMouseOver = null;
  #boundTransOnlyMouseOut = null;

  constructor({
    rule,
    setting,
    tags,
    getPlaceholderConfig,
    getTerms,
    isIgnoredElement,
    shouldBreak,
    translationTagName = APP_LCNAME,
  }) {
    this.#rule = rule;
    this.#setting = setting;
    this.#tags = tags;
    this.#getPlaceholderConfig = getPlaceholderConfig;
    this.#getTerms = getTerms;
    this.#isIgnoredElement = isIgnoredElement;
    this.#shouldBreak = shouldBreak;
    this.#translationTagName = translationTagName;
    this.#createTextStyles();
  }

  // 处理节点转为翻译字符串
  serializeForTranslation(nodes, termsStyle) {
    let replaceCounter = 0;
    let wrapCounter = 0;
    const placeholderMap = new Map();
    const { startDelimiter, endDelimiter } = this.#getPlaceholderConfig();
    const { values: termValues, regex: combinedTermsRegex } = this.#getTerms();

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

  createWrapper({
    nodes,
    processedString,
    toLang,
    transTag,
    textStyle,
    textExtStyle,
    transOrder = "original-first",
    hideOrigin = false,
    newlineLength = 20,
    forceNewLine = false,
  }) {
    const wrapper = document.createElement(this.#translationTagName);
    wrapper.className = `${DomKit.LINGOFLOW_CLASS.warpper} notranslate`;
    const isDark = this.#isDarkMode();
    wrapper.style.setProperty(
      "--lf-tr-color",
      isDark ? tokens.translation.darkAccent : tokens.translation.accent
    );
    wrapper.style.setProperty(
      "--lf-tr-soft",
      isDark ? tokens.translation.darkAccentSoft : tokens.translation.accentSoft
    );
    wrapper.style.setProperty(
      "--lf-tr-quote-bg",
      isDark ? tokens.translation.darkQuoteBg : tokens.translation.quoteBg
    );
    wrapper.style.setProperty(
      "--lf-tr-highlight-text",
      isDark
        ? tokens.translation.darkHighlightText
        : tokens.translation.highlightText
    );
    wrapper.style.setProperty(
      "--lf-tr-weak-text",
      isDark ? tokens.translation.darkWeakText : tokens.translation.weakText
    );

    const inner = document.createElement(transTag);
    inner.lang = toLang;
    inner.dir = "auto";
    inner.className = `${DomKit.LINGOFLOW_CLASS.inner} ${
      this.#textClass[textStyle] || ""
    }`;
    if (textExtStyle?.trim()) {
      inner.style.cssText = textExtStyle;
    }
    // 译文容器先透明占位，拿到译文后再淡入，避免加载图标造成的闪烁。
    inner.style.opacity = "0";
    inner.style.transition = `opacity ${tokens.motion.fast}ms ${tokens.motion.easing}`;

    if (forceNewLine || processedString.length > newlineLength) {
      wrapper.classList.add("lingoflow-long");
      wrapper.appendChild(inner);
    } else {
      const space = document.createElement("span");
      space.textContent = " ";
      space.className = DomKit.LINGOFLOW_CLASS.space;
      space.hidden = hideOrigin;
      if (transOrder === "translation-first") {
        wrapper.appendChild(inner);
        wrapper.appendChild(space);
      } else {
        wrapper.appendChild(space);
        wrapper.appendChild(inner);
      }
    }

    const layoutContext = this.#resolveLayoutContext(nodes);
    this.#withViewportAnchor(() => {
      if (layoutContext?.wrap) {
        const host = document.createElement("span");
        host.className = "lingoflow-layout-host";
        host.style.display = "inline-block";
        layoutContext.parent.insertBefore(host, nodes[0]);
        const fragment = document.createDocumentFragment();
        nodes.forEach((node) => fragment.appendChild(node));
        host.appendChild(fragment);
        if (transOrder === "translation-first") {
          host.prepend(wrapper);
        } else {
          host.appendChild(wrapper);
        }
        return;
      }

      if (layoutContext?.host) {
        if (transOrder === "translation-first") {
          layoutContext.host.prepend(wrapper);
        } else {
          layoutContext.host.appendChild(wrapper);
        }
        return;
      }

      if (transOrder === "translation-first") {
        nodes[0].before(wrapper);
      } else {
        nodes[nodes.length - 1].after(wrapper);
      }
    });

    return { wrapper, inner };
  }

  renderTranslation({ wrapper, htmlString }) {
    const trustedHTML = trustedTypesHelper.createHTML(htmlString);
    this.#withViewportAnchor(() => {
      const inner = wrapper.querySelector(
        `:scope > .${DomKit.LINGOFLOW_CLASS.inner}`
      );
      if (inner) {
        inner.innerHTML = trustedHTML;
        inner.style.opacity = "1";
      }
    });
  }

  commitTranslation({ wrapper, nodes, isHide = false }) {
    this.#translationNodes.set(wrapper, { nodes, isHide });
  }

  setTranslationOnly(wrapper, transOnly) {
    const state = this.#translationNodes.get(wrapper) || {
      nodes: [],
      isHide: false,
    };
    const { transOrder = "original-first" } = this.#rule;
    const br = wrapper.querySelector(":scope > br");
    const space = wrapper.querySelector(
      `:scope > span.${DomKit.LINGOFLOW_CLASS.space}`
    );
    const nodes = state.nodes || [];

    this.#withViewportAnchor(() => {
      if (transOnly === "true") {
        if (br) br.hidden = true;
        if (space) space.hidden = true;
        this.#removeNodes(nodes, wrapper);
      } else {
        if (br) br.hidden = false;
        if (space) space.hidden = false;
        if (nodes.length) {
          const frag = document.createDocumentFragment();
          nodes.forEach((node) => frag.appendChild(node));
          const parent = wrapper.parentElement;
          if (parent) {
            if (transOrder === "translation-first") {
              wrapper.after(frag);
            } else {
              wrapper.before(frag);
            }
          }
        }
      }
    });

    state.isHide = transOnly === "true";
    this.#translationNodes.set(wrapper, state);
    return state;
  }

  updateTranslationOnly(node, transOnly) {
    this.findWrappers(node).forEach((wrapper) => {
      this.setTranslationOnly(wrapper, transOnly);
    });
  }

  updateTextStyles(node, oldStyle, newStyle) {
    this.findWrappers(node).forEach((el) => {
      const inner = el.querySelector(
        `:scope > .${DomKit.LINGOFLOW_CLASS.inner}`
      );
      if (!inner) return;
      inner.classList.remove(this.#textClass[oldStyle]);
      inner.classList.add(this.#textClass[newStyle]);
    });
  }

  updateTransOrder(node, transOrder) {
    this.findWrappers(node).forEach((el) => {
      const state = this.#translationNodes.get(el);
      if (state?.nodes?.length) {
        this.#withViewportAnchor(() => {
          this.#adjustWrapperPosition(el, state.nodes, transOrder);
        });
      }
    });
  }

  findWrappers(parentNode) {
    return parentNode.querySelectorAll(
      `:scope > .${DomKit.LINGOFLOW_CLASS.warpper}`
    );
  }

  removeWrapper(wrapper) {
    const parent = wrapper.parentElement;
    this.#withViewportAnchor(() => {
      const state = this.#translationNodes.get(wrapper);
      if (state?.isHide) {
        this.#restoreOriginal(wrapper, state.nodes);
      }
      this.#translationNodes.delete(wrapper);
      wrapper.remove();
      this.#removeBrTags(parent);
      this.#unwrapLayoutHost(parent);
    });
    return parent;
  }

  removeAllWrappers(root) {
    const wrappers = Array.from(
      root.querySelectorAll(`.${DomKit.LINGOFLOW_CLASS.warpper}`)
    );
    return wrappers.map((wrapper) => this.removeWrapper(wrapper));
  }

  adoptExistingWrappers(hostNode) {
    if (!DomKit.isElementOrFragment(hostNode)) return [];

    const wrappers = Array.from(hostNode.children || []).filter((child) =>
      child.classList?.contains(DomKit.LINGOFLOW_CLASS.warpper)
    );
    wrappers.forEach((wrapper) => {
      const backup = this.#getTranslationBackup(wrapper);
      const backupNodes = backup ? Array.from(backup.content.childNodes) : [];
      const hasBackupNodes = backupNodes.length > 0;
      const nodes = hasBackupNodes
        ? backupNodes
        : this.#collectExistingTranslationNodes(wrapper);
      this.#translationNodes.set(wrapper, {
        nodes,
        isHide: hasBackupNodes,
      });
    });
    return wrappers;
  }

  getTranslationState(wrapper) {
    return this.#translationNodes.get(wrapper);
  }

  appendHostStyle(hostNode, selectStyle, parentStyle, grandStyle) {
    this.#appendCssText(hostNode, selectStyle, "selectStyle");
    this.#appendCssText(hostNode.parentElement, parentStyle, "parentStyle");
    this.#appendCssText(
      hostNode.parentElement?.parentElement,
      grandStyle,
      "grandStyle"
    );
  }

  injectStyle(shadowRoot) {
    if (this.#useSheetFallback || !this.#textSheet) {
      this.#injectSheetFallback(shadowRoot);
      return;
    }

    try {
      if (!shadowRoot.adoptedStyleSheets.includes(this.#textSheet)) {
        shadowRoot.adoptedStyleSheets = [
          ...shadowRoot.adoptedStyleSheets,
          this.#textSheet,
        ];
      }
    } catch {
      this.#useSheetFallback = true;
      this.#injectSheetFallback(shadowRoot);
    }
  }

  setError(wrapper, errorText, onRetry) {
    const inner = wrapper.querySelector(
      `:scope > .${DomKit.LINGOFLOW_CLASS.inner}`
    );
    if (!inner) return;
    inner.textContent = "";
    const retryNode = this.#createRetryErrorNode(errorText, () => {
      this.removeWrapper(wrapper);
      onRetry?.();
    });
    inner.appendChild(retryNode);
  }

  enableTransOnlyRevert() {
    if (this.#transOnlyRevertEnabled) return;
    this.#transOnlyRevertEnabled = true;

    this.#boundTransOnlyMouseOver = (e) => {
      const wrapper = e.target.closest?.(`.${DomKit.LINGOFLOW_CLASS.warpper}`);
      if (wrapper) {
        const data = this.#translationNodes.get(wrapper);
        if (!data || !data.isHide) return;
        if (this.#transOnlyRevertTarget === wrapper) return;

        this.#clearTransOnlyRevertTimer();
        const delay = parseFloat(this.#rule.transOnlyRevertDelay) || 0.5;
        this.#transOnlyRevertTimer = setTimeout(() => {
          this.#showOriginalTemporarily(wrapper, data);
        }, delay * 1000);
        return;
      }

      if (this.#transOnlyRevertTarget) {
        const data = this.#translationNodes.get(this.#transOnlyRevertTarget);
        if (data) {
          const origNodes = data.nodes || [];
          for (const node of origNodes) {
            if (node === e.target || node.contains?.(e.target)) return;
          }
        }
      }
    };

    this.#boundTransOnlyMouseOut = (e) => {
      if (!this.#transOnlyRevertTarget) {
        const wrapper = e.target.closest?.(
          `.${DomKit.LINGOFLOW_CLASS.warpper}`
        );
        if (wrapper) this.#clearTransOnlyRevertTimer();
        return;
      }

      const wrapper = this.#transOnlyRevertTarget;
      const related = e.relatedTarget;

      if (related && (wrapper.contains(related) || related === wrapper)) return;

      const data = this.#translationNodes.get(wrapper);
      if (data && related) {
        const origNodes = data.nodes || [];
        for (const node of origNodes) {
          if (node === related || node.contains?.(related)) return;
        }
      }

      this.#clearTransOnlyRevertTimer();
      this.#hideOriginalTemporarily(wrapper);
    };

    document.addEventListener("mouseover", this.#boundTransOnlyMouseOver);
    document.addEventListener("mouseout", this.#boundTransOnlyMouseOut);
  }

  disableTransOnlyRevert() {
    if (!this.#transOnlyRevertEnabled) return;
    this.#transOnlyRevertEnabled = false;

    this.#clearTransOnlyRevertTimer();
    if (this.#transOnlyRevertTarget) {
      this.#hideOriginalTemporarily(this.#transOnlyRevertTarget);
    }

    document.removeEventListener("mouseover", this.#boundTransOnlyMouseOver);
    document.removeEventListener("mouseout", this.#boundTransOnlyMouseOut);
    this.#boundTransOnlyMouseOver = null;
    this.#boundTransOnlyMouseOut = null;
  }

  #clearTransOnlyRevertTimer() {
    if (this.#transOnlyRevertTimer) {
      clearTimeout(this.#transOnlyRevertTimer);
      this.#transOnlyRevertTimer = null;
    }
  }

  #showOriginalTemporarily(wrapper, data) {
    const { nodes } = data;
    this.#withViewportAnchor(() => {
      this.#restoreOriginal(wrapper, nodes);
      const inner = wrapper.querySelector(
        `:scope > .${DomKit.LINGOFLOW_CLASS.inner}`
      );
      if (inner) inner.style.display = "none";
      const br = wrapper.querySelector(":scope > br");
      if (br) br.hidden = true;
    });
    this.#transOnlyRevertTarget = wrapper;
  }

  #hideOriginalTemporarily(wrapper) {
    const data = this.#translationNodes.get(wrapper);
    if (!data) return;
    const { nodes } = data;
    this.#withViewportAnchor(() => {
      this.#removeNodes(nodes, wrapper);
      const inner = wrapper.querySelector(
        `:scope > .${DomKit.LINGOFLOW_CLASS.inner}`
      );
      if (inner) inner.style.display = "";
    });
    this.#transOnlyRevertTarget = null;
  }

  #restoreOriginal(wrapper, nodes) {
    if (!nodes) return;
    const frag = document.createDocumentFragment();
    nodes.forEach((node) => frag.appendChild(node));
    wrapper.parentElement?.insertBefore(frag, wrapper);
  }

  #removeNodes(nodes, wrapper) {
    if (nodes && wrapper) {
      const backup = this.#getOrCreateTranslationBackup(wrapper);
      nodes.forEach((node) => backup.content.appendChild(node));
    } else if (nodes) {
      const frag = document.createDocumentFragment();
      nodes.forEach((node) => frag.appendChild(node));
    }
  }

  #getTranslationBackup(wrapper) {
    return wrapper.querySelector(
      `:scope > template.${DomKit.LINGOFLOW_CLASS.backup}`
    );
  }

  #getOrCreateTranslationBackup(wrapper) {
    let backup = this.#getTranslationBackup(wrapper);
    if (!backup) {
      backup = document.createElement("template");
      backup.className = DomKit.LINGOFLOW_CLASS.backup;
      wrapper.appendChild(backup);
    }
    return backup;
  }

  #collectExistingTranslationNodes(wrapper) {
    const { transOrder = "original-first" } = this.#rule;
    const nodes = [];
    const isOriginalBefore = transOrder !== "translation-first";
    let current = isOriginalBefore
      ? wrapper.previousSibling
      : wrapper.nextSibling;

    while (current) {
      if (
        this.#shouldBreak?.(current) &&
        !this.#tags.WARP.has(current.nodeName?.toUpperCase())
      ) {
        break;
      }

      if (
        current.nodeType === Node.ELEMENT_NODE ||
        current.nodeType === Node.TEXT_NODE
      ) {
        if (isOriginalBefore) {
          nodes.unshift(current);
        } else {
          nodes.push(current);
        }
      }

      current = isOriginalBefore
        ? current.previousSibling
        : current.nextSibling;
    }

    return nodes;
  }

  #adjustWrapperPosition(wrapper, nodes, transOrder) {
    if (!nodes || !nodes.length) return;

    const firstNode = nodes[0];
    const lastNode = nodes[nodes.length - 1];
    const wrapperParent = wrapper.parentElement;
    const firstNodeParent = firstNode?.parentElement;
    const lastNodeParent = lastNode?.parentElement;

    if (wrapperParent !== firstNodeParent || wrapperParent !== lastNodeParent) {
      return;
    }

    if (transOrder === "translation-first") {
      if (firstNode.previousElementSibling !== wrapper) {
        firstNode.before(wrapper);
      }
    } else {
      if (lastNode.nextElementSibling !== wrapper) {
        lastNode.after(wrapper);
      }
    }
  }

  #removeBrTags(parentNode) {
    if (!parentNode) return;
    parentNode
      .querySelectorAll(`.${DomKit.LINGOFLOW_CLASS.br}`)
      .forEach((br) => br.remove());
    parentNode.normalize();
  }

  #withViewportAnchor(callback) {
    const anchor = this.#captureViewportAnchor();
    try {
      return callback();
    } finally {
      this.#restoreViewportAnchor(anchor);
    }
  }

  #resolveLayoutContext(nodes) {
    if (!nodes?.length) return null;

    const parents = new Set();
    nodes.forEach((node) => parents.add(node.parentElement));
    if (parents.size !== 1) return null;

    const parent = nodes[0].parentElement;
    if (!parent) return null;

    const display = window.getComputedStyle?.(parent).display || "";
    if (!/^(?:inline-)?(?:flex|grid)$/.test(display.trim())) return null;

    const significantNodes = nodes.filter(
      (node) =>
        node.nodeType !== Node.TEXT_NODE || /\S/.test(node.textContent || "")
    );
    if (!significantNodes.length) return null;

    const elementNodes = significantNodes.filter(
      (node) => node.nodeType === Node.ELEMENT_NODE
    );
    if (
      elementNodes.length === significantNodes.length &&
      elementNodes.length === 1
    ) {
      return { parent, host: elementNodes[0], wrap: false };
    }

    return { parent, host: null, wrap: true };
  }

  #unwrapLayoutHost(parent) {
    if (!parent?.classList?.contains("lingoflow-layout-host")) return;

    const grandParent = parent.parentElement;
    if (!grandParent) return;

    const fragment = document.createDocumentFragment();
    Array.from(parent.childNodes).forEach((node) => fragment.appendChild(node));
    parent.replaceWith(fragment);
  }

  #captureViewportAnchor() {
    if (!document.elementFromPoint || !window.scrollBy) return null;

    const points = [0.5, 0.33, 0.66];
    for (const ratio of points) {
      const x = Math.max(0, Math.floor(window.innerWidth / 2));
      const y = Math.max(
        0,
        Math.min(window.innerHeight - 1, Math.floor(window.innerHeight * ratio))
      );
      const element = document.elementFromPoint(x, y);
      const anchor = this.#normalizeViewportAnchor(element);
      if (!anchor?.isConnected) continue;

      const rect = anchor.getBoundingClientRect();
      if (rect.width || rect.height) {
        return { element: anchor, top: rect.top };
      }
    }

    return null;
  }

  #normalizeViewportAnchor(element) {
    if (!element) return null;

    const wrapper = element.closest?.(`.${DomKit.LINGOFLOW_CLASS.warpper}`);
    if (!wrapper) return element;

    const { nodes } = this.#translationNodes.get(wrapper) || {};
    const originalNode = nodes?.find((node) => node.isConnected);
    if (originalNode?.nodeType === Node.ELEMENT_NODE) return originalNode;
    if (originalNode?.parentElement?.isConnected)
      return originalNode.parentElement;

    return wrapper.previousElementSibling || wrapper.parentElement;
  }

  #restoreViewportAnchor(anchor) {
    if (!anchor?.element?.isConnected) return;

    const scrollingElement =
      document.scrollingElement || document.documentElement;
    if (!scrollingElement) return;

    const overflowY = window.getComputedStyle(scrollingElement).overflowY;
    const canScrollDocument =
      scrollingElement.scrollHeight > scrollingElement.clientHeight &&
      overflowY !== "hidden" &&
      overflowY !== "clip";
    if (!canScrollDocument) return;

    const currentTop = anchor.element.getBoundingClientRect().top;
    const offset = currentTop - anchor.top;
    if (Math.abs(offset) > 0.5) {
      window.scrollBy(0, offset);
    }
  }

  #appendCssText(node, cssText, label) {
    if (typeof cssText !== "string" || !cssText.trim()) return;

    try {
      const style = node?.style;
      if (
        !style ||
        typeof style !== "object" ||
        typeof style.cssText !== "string"
      ) {
        return;
      }
      style.cssText = `${style.cssText || ""}${cssText}`;
    } catch (err) {
      appLog("append rule style error", label, err);
    }
  }

  #createTextStyles() {
    const [textClass, textStyles] = genTextClass(this.#setting.customStyles);
    this.#textClass = textClass;
    this.#textStylesRaw = textStyles;

    try {
      const textSheet = new CSSStyleSheet();
      textSheet.replaceSync(textStyles);
      this.#textSheet = textSheet;
    } catch (err) {
      appLog("createTextStyles: CSSStyleSheet not available", err);
      this.#useSheetFallback = true;
    }

    this.#injectGlobalStyle();
  }

  #injectGlobalStyle() {
    if (typeof document === "undefined" || !document.head) return;

    const styleId = `${APP_LCNAME}-translation-styles`;
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent += `\n${this.#textStylesRaw || ""}`;
  }

  #isDarkMode() {
    return (
      this.#setting.darkMode === "dark" ||
      (this.#setting.darkMode === "auto" &&
        window.matchMedia?.("(prefers-color-scheme: dark)")?.matches)
    );
  }

  #injectSheetFallback(shadowRoot) {
    const fallbackStyleId = `${APP_LCNAME}-fallback-style`;
    if (shadowRoot.getElementById(fallbackStyleId)) return;

    const style = document.createElement("style");
    style.id = fallbackStyleId;
    style.textContent = this.#textStylesRaw || "";
    shadowRoot.append(style);
  }

  #createRetryErrorNode(errorText, onRetry) {
    const i18n = newI18n(this.#setting.uiLang || "zh");
    const copyText = i18n("copy") || "Copy";
    const isDarkMode = this.#isDarkMode();
    const accent = isDarkMode ? tokens.dark.blue : tokens.color.blue;
    const panelBg = isDarkMode ? tokens.dark.surface : tokens.color.surface;
    const panelText = isDarkMode ? tokens.dark.text : tokens.color.text;
    const panelBorder = isDarkMode
      ? tokens.dark.borderStrong
      : tokens.color.borderStrong;
    const panelShadow = isDarkMode
      ? "0 8px 24px rgba(0, 0, 0, 0.42)"
      : tokens.shadow.md;
    const errorColor = isDarkMode ? "#f2b8b0" : tokens.color.danger;
    const buttonBg = isDarkMode
      ? "rgba(124, 150, 232, 0.16)"
      : tokens.color.blueSoft;
    const buttonHoverBg = isDarkMode
      ? "rgba(124, 150, 232, 0.28)"
      : "rgba(47, 91, 217, 0.16)";

    const container = document.createElement("span");
    container.style.cssText =
      "position: relative; display: inline-flex; align-items: center; vertical-align: middle;";

    const retryIcon = createRetrySVG();
    retryIcon.classList.add(DomKit.LINGOFLOW_CLASS.retry);
    retryIcon.setAttribute("role", "button");
    retryIcon.setAttribute("tabindex", "0");

    const panel = document.createElement("span");
    panel.className = "notranslate";
    panel.setAttribute("translate", "no");
    panel.style.cssText = [
      "position: fixed",
      "left: 0",
      "top: 0",
      "z-index: 2147483647",
      "display: none",
      "box-sizing: border-box",
      "width: max-content",
      "max-width: min(420px, calc(100vw - 16px))",
      "max-height: 240px",
      "overflow: auto",
      "padding: 10px 10px 8px 12px",
      `border: 1px solid ${panelBorder}`,
      `border-left: 3px solid ${accent}`,
      "border-radius: 6px",
      `background: ${panelBg}`,
      `color: ${panelText}`,
      `box-shadow: ${panelShadow}`,
      "font-size: 12px",
      "line-height: 1.5",
      "font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      "white-space: pre-wrap",
      "overflow-wrap: anywhere",
      "user-select: text",
      "visibility: hidden",
    ].join("; ");

    const message = document.createElement("span");
    message.textContent = errorText;
    message.style.cssText = `color: ${errorColor};`;

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = copyText;
    copyButton.style.cssText = [
      "display: flex",
      "align-items: center",
      "justify-content: center",
      "width: fit-content",
      "margin-top: 8px",
      "padding: 3px 8px",
      `border: 1px solid ${accent}`,
      "border-radius: 4px",
      `background: ${buttonBg}`,
      `color: ${accent}`,
      "font-size: 12px",
      "line-height: 1.4",
      "font-weight: 500",
      "cursor: pointer",
      "transition: background 0.2s ease, border-color 0.2s ease",
    ].join("; ");
    copyButton.addEventListener("mouseenter", () => {
      copyButton.style.background = buttonHoverBg;
      copyButton.style.borderColor = accent;
    });
    copyButton.addEventListener("mouseleave", () => {
      copyButton.style.background = buttonBg;
      copyButton.style.borderColor = accent;
    });
    copyButton.addEventListener("click", async (e) => {
      e.stopPropagation();
      e.preventDefault();

      try {
        await this.#copyText(errorText);
        copyButton.textContent = "OK";
        setTimeout(() => {
          copyButton.textContent = copyText;
        }, 800);
      } catch (copyErr) {
        appLog("copy translate error: ", copyErr);
      }
    });

    let hideTimer = null;

    const clearHideTimer = () => {
      if (!hideTimer) return;
      clearTimeout(hideTimer);
      hideTimer = null;
    };

    const updatePanelPosition = () => {
      if (!container.isConnected) {
        hidePanel();
        return;
      }

      const anchorRect = container.getBoundingClientRect();
      const viewportGap = 8;
      const panelGap = 6;
      const panelRect = panel.getBoundingClientRect();
      const panelWidth = panelRect.width;
      const panelHeight = panelRect.height;
      const maxLeft = window.innerWidth - panelWidth - viewportGap;
      const maxTop = window.innerHeight - panelHeight - viewportGap;

      let left = anchorRect.left;
      let top = anchorRect.bottom + panelGap;

      if (top > maxTop) {
        top = anchorRect.top - panelHeight - panelGap;
      }

      panel.style.left = `${Math.max(viewportGap, Math.min(left, maxLeft))}px`;
      panel.style.top = `${Math.max(viewportGap, Math.min(top, maxTop))}px`;
      panel.style.visibility = "visible";
    };

    const showPanel = () => {
      clearHideTimer();
      if (!panel.isConnected) {
        document.body.appendChild(panel);
      }
      panel.style.display = "block";
      panel.style.visibility = "hidden";
      updatePanelPosition();
      window.addEventListener("scroll", updatePanelPosition, true);
      window.addEventListener("resize", updatePanelPosition);
    };

    const hidePanel = () => {
      clearHideTimer();
      window.removeEventListener("scroll", updatePanelPosition, true);
      window.removeEventListener("resize", updatePanelPosition);
      panel.style.display = "none";
      panel.style.visibility = "hidden";
      panel.remove();
    };

    const hidePanelSoon = () => {
      clearHideTimer();
      hideTimer = setTimeout(() => {
        const activeElement = document.activeElement;
        if (
          container.matches(":hover") ||
          panel.matches(":hover") ||
          container.contains(activeElement) ||
          panel.contains(activeElement)
        ) {
          return;
        }

        hidePanel();
      }, 80);
    };

    container.addEventListener("mouseenter", showPanel);
    container.addEventListener("mouseleave", hidePanelSoon);
    container.addEventListener("focusin", showPanel);
    container.addEventListener("focusout", (e) => {
      if (panel.contains(e.relatedTarget)) return;
      if (container.contains(e.relatedTarget)) return;
      hidePanelSoon();
    });
    panel.addEventListener("mouseenter", showPanel);
    panel.addEventListener("mouseleave", hidePanelSoon);
    panel.addEventListener("focusin", showPanel);
    panel.addEventListener("focusout", (e) => {
      if (container.contains(e.relatedTarget)) return;
      if (panel.contains(e.relatedTarget)) return;
      hidePanelSoon();
    });
    retryIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      hidePanel();
      onRetry();
    });
    retryIcon.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.stopPropagation();
      e.preventDefault();
      hidePanel();
      onRetry();
    });

    panel.appendChild(message);
    panel.appendChild(copyButton);
    container.appendChild(retryIcon);

    return container;
  }

  async #copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.cssText =
      "position: fixed; left: -9999px; top: 0; opacity: 0;";

    document.body.appendChild(textarea);
    try {
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
    } finally {
      textarea.remove();
    }
  }
}
