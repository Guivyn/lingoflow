import { APP_CONSTS } from "../../config";
import { injectJs, INJECTOR } from "../../injectors";
import { appLog } from "../../libs/log";
import { debounce, scheduleIdle } from "../../libs/utils";
import { DomKit } from "../dom/DomKit";

/**
 * DOM 扫描与监听器。
 *
 * 负责节点遍历、MutationObserver、IntersectionObserver、ShadowRoot 发现以及
 * SPA 容器替换检测。扫描到的候选节点通过 onNode 回调交给上层处理。
 */
export class DomScanner {
  #rule;
  #setting;
  #getIgnoreSelector;
  #translationTagName;
  #tags;
  #combinedSkipsRegex;
  #onNode;
  #onRescan;
  #onShadowRoot;
  #tryAdoptHost;
  #isProcessed;
  #getState;
  #isElementOrFragment;
  #isIgnoredElement;
  #isBlockNode;
  #hasBlockNode;
  #shouldBreak;

  #mo = null;
  #io = null;
  #observedNodes = new WeakSet();
  #viewNodes = new Set();
  #rootNodes = new Set();
  #rescanQueue = new Set();
  #isQueueProcessing = false;
  #skipMoNodes = new WeakSet();
  #plainTextPreprocessingNodes = new WeakSet();

  #isShadowRootJsInjected = false;
  #windowMessageHandler = null;
  #debouncedFindShadowRoot = null;
  #shadowScanScheduled = false;

  #containerObserver = null;
  #documentElementObserver = null;
  #knownDocumentElement = null;
  #knownBody = null;
  #onContainerRestart = null;
  #onContainerRescan = null;
  #boundPageRestoreHandler = null;
  #boundSpaNavigationHandler = null;

  constructor({
    rule = {},
    setting = {},
    getIgnoreSelector,
    translationTagName,
    tags = DomKit.TAGS,
    combinedSkipsRegex,
    onNode,
    onRescan,
    onShadowRoot,
    tryAdoptHost,
    isProcessed,
    getState,
    isElementOrFragment = DomKit.isElementOrFragment,
    isIgnoredElement,
    isBlockNode,
    hasBlockNode,
    shouldBreak,
  }) {
    this.#rule = rule;
    this.#setting = setting;
    this.#getIgnoreSelector = getIgnoreSelector;
    this.#translationTagName = translationTagName;
    this.#tags = tags;
    this.#combinedSkipsRegex = combinedSkipsRegex;
    this.#onNode = onNode;
    this.#onRescan = onRescan;
    this.#onShadowRoot = onShadowRoot;
    this.#tryAdoptHost = tryAdoptHost;
    this.#isProcessed = isProcessed;
    this.#getState = getState;
    this.#isElementOrFragment = isElementOrFragment;
    this.#isIgnoredElement = isIgnoredElement;
    this.#isBlockNode = isBlockNode;
    this.#hasBlockNode = hasBlockNode;
    this.#shouldBreak = shouldBreak;

    this.#windowMessageHandler = this.#handleWindowMessage.bind(this);
    this.#debouncedFindShadowRoot = debounce(
      this.#findAndObserveShadowRoot.bind(this),
      300
    );
  }

  markSkipped(node) {
    this.#skipMoNodes.add(node);
  }

  markPreprocessing(node) {
    this.#plainTextPreprocessingNodes.add(node);
  }

  unmarkPreprocessing(node) {
    this.#plainTextPreprocessingNodes.delete(node);
  }

  hasPreprocessing(node) {
    return this.#plainTextPreprocessingNodes.has(node);
  }

  hasObserved(node) {
    return this.#observedNodes.has(node);
  }

  findObservedAncestor(startNode) {
    let targetNode = startNode;
    while (targetNode && targetNode !== document.body) {
      if (this.#observedNodes.has(targetNode)) {
        return targetNode;
      }
      targetNode = targetNode.parentElement;
    }
    return null;
  }

  getRoots() {
    return Array.from(this.#rootNodes);
  }

  reobserveVisibleNodes() {
    this.#viewNodes.forEach((node) => this.#reIO(node));
  }

  init() {
    this.#ensureContentObservers();

    document
      .querySelectorAll(this.#rule.rootsSelector || "body")
      .forEach((root) => {
        this.#startObserveRoot(root);
      });

    if (this.#rule.scanAll === "true" || this.#rule.hasShadowroot === "true") {
      this.#attachShadowRootListener();
      this.#findAndObserveShadowRoot();
    }
  }

  observeNode(node) {
    this.#ensureContentObservers();
    if (!DomKit.isElement(node)) return;

    if (this.#tryAdoptHost?.(node)) {
      if (!this.#observedNodes.has(node)) {
        this.#observedNodes.add(node);
        this.#io.observe(node);
      }
      this.#viewNodes.add(node);
      return;
    }

    const state = this.#getState?.() || {};
    if (!this.#observedNodes.has(node) && state.enabled && state.transAllnow) {
      this.#observedNodes.add(node);
      this.#onNode?.(node);
      return;
    }

    if (!this.#observedNodes.has(node)) {
      this.#observedNodes.add(node);
      this.#io.observe(node);
      return;
    }

    if (!this.#isProcessed?.(node) && this.#viewNodes.has(node)) {
      this.#reIO(node);
    }
  }

  reset() {
    this.#removeShadowRootListener();
    this.#io?.disconnect();
    this.#mo?.disconnect();
    this.#io = null;
    this.#mo = null;
    this.#viewNodes.clear();
    this.#rootNodes.clear();
    this.#observedNodes = new WeakSet();
    this.#plainTextPreprocessingNodes = new WeakSet();
    this.#shadowScanScheduled = false;
  }

  #ensureContentObservers() {
    if (!this.#io) this.#io = this.#createIntersectionObserver();
    if (!this.#mo) this.#mo = this.#createMutationObserver();
  }

  #createIntersectionObserver() {
    const { transInterval } = this.#setting;
    const state = this.#getState?.() || {};
    const rootMargin = state.rootMargin;

    const pending = new Set();
    const flush = debounce(() => {
      pending.forEach((node) => {
        if (this.#getState?.()?.enabled) {
          this.#onNode?.(node);
        }
      });
      pending.clear();
    }, transInterval);

    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.#viewNodes.add(entry.target);
            pending.add(entry.target);
            flush();
          } else {
            this.#viewNodes.delete(entry.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: `${rootMargin}px 0px ${rootMargin}px 0px` }
    );
  }

  #createMutationObserver() {
    return new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          this.#skipMoNodes.has(mutation.target) ||
          this.#plainTextPreprocessingNodes.has(mutation.target) ||
          (this.#translationTagName &&
            mutation.nextSibling?.tagName?.toLowerCase() ===
              this.#translationTagName)
        ) {
          continue;
        }

        if (mutation.type === "characterData") {
          if (
            mutation.oldValue !== mutation.target.nodeValue &&
            !this.#combinedSkipsRegex.test(mutation.target.nodeValue)
          ) {
            this.#queueForRescan(mutation.target.parentElement);
          }
        } else if (mutation.type === "childList") {
          let nodes = new Set();
          let hasText = false;
          mutation.addedNodes.forEach((node) => {
            if (
              this.#skipMoNodes.has(node) ||
              (this.#translationTagName &&
                node.nodeName?.toLowerCase() === this.#translationTagName)
            ) {
              return;
            }

            if (node.nodeType === Node.TEXT_NODE) {
              hasText = true;
            } else if (this.#isElementOrFragment(node)) {
              nodes.add(node);
            }
          });
          if (hasText) {
            this.#queueForRescan(mutation.target);
          } else {
            nodes.forEach((node) => this.#queueForRescan(node));
          }
        }
      }
    });
  }

  #handleWindowMessage(event) {
    if (event.data?.type === "LINGOFLOW_SHADOW_ROOT_CREATED") {
      this.#debouncedFindShadowRoot();
    }
  }

  #attachShadowRootListener() {
    if (!this.#isShadowRootJsInjected) {
      const id = "lingoflow-inject-shadowroot-js";
      injectJs(INJECTOR.shadowroot, id);
      this.#isShadowRootJsInjected = true;
    }

    window.addEventListener("message", this.#windowMessageHandler);
  }

  #removeShadowRootListener() {
    window.removeEventListener("message", this.#windowMessageHandler);
  }

  #findAndObserveShadowRoot() {
    if (this.#shadowScanScheduled) return;
    this.#shadowScanScheduled = true;
    scheduleIdle(() => {
      this.#shadowScanScheduled = false;
      try {
        this.#findAllShadowRoots().forEach((shadowRoot) => {
          this.#startObserveShadowRoot(shadowRoot);
        });
      } catch (err) {
        appLog("findAllShadowRoots", err);
      }
    }, 120);
  }

  #getShadowRoot(element) {
    if (element.openOrClosedShadowRoot) {
      return element.openOrClosedShadowRoot;
    }
    if (
      typeof globalThis !== "undefined" &&
      globalThis.chrome?.dom?.openOrClosedShadowRoot &&
      element instanceof HTMLElement
    ) {
      return globalThis.chrome.dom.openOrClosedShadowRoot(element);
    }
    return element.shadowRoot;
  }

  #isLingoFlowIgnoredNode(node) {
    return (
      node?.nodeType === Node.ELEMENT_NODE &&
      (node.matches?.(DomKit.LINGOFLOW_IGNORE_SELECTOR) ||
        node.closest?.(DomKit.LINGOFLOW_IGNORE_SELECTOR))
    );
  }

  #findAllShadowRoots(root = document.body, results = new Set()) {
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (this.#isLingoFlowIgnoredNode(node)) {
          continue;
        }

        const shadowRoot = this.#getShadowRoot(node);
        if (shadowRoot) {
          results.add(shadowRoot);
          this.#findAllShadowRoots(shadowRoot, results);
        }
      }
    } catch (err) {
      appLog("无法访问某个 shadowRoot", err);
    }
    return results;
  }

  #findChangeContainer(startNode) {
    const ignoreSelector = this.#getIgnoreSelector?.();
    if (
      !this.#isElementOrFragment(startNode) ||
      (ignoreSelector && startNode.closest?.(ignoreSelector))
    ) {
      return null;
    }

    let current = startNode;
    while (current && current !== document.body) {
      if (this.#isBlockNode?.(current) || this.#observedNodes.has(current)) {
        for (const root of this.#rootNodes) {
          if (root.contains(current)) {
            return current;
          }
        }
      }
      current = current.parentElement;
    }

    return null;
  }

  #queueForRescan(target) {
    this.#rescanQueue.add(target);
    if (!this.#isQueueProcessing) {
      this.#isQueueProcessing = true;
      scheduleIdle(() => {
        this.#rescanQueue.forEach((t) => this.#rescanContainer(t));
        this.#rescanQueue.clear();
        this.#isQueueProcessing = false;
      }, 100);
    }
  }

  #rescanContainer(changedNode) {
    const container = this.#findChangeContainer(changedNode);
    if (!container) return;

    this.#onRescan?.(container);
    this.#scanNode(container);
  }

  #reIO(node) {
    this.#io.unobserve(node);
    this.#io.observe(node);
  }

  #startObserveShadowRoot(shadowRoot) {
    try {
      if (
        shadowRoot.host.matches(`#${APP_CONSTS.fabID}, #${APP_CONSTS.boxID}`)
      ) {
        return;
      }
      this.#startObserveRoot(shadowRoot);
      this.#onShadowRoot?.(shadowRoot);
    } catch (err) {
      appLog("startObserveShadowRoot", err);
    }
  }

  #startObserveRoot(root) {
    if (this.#rootNodes.has(root)) return;
    this.#rootNodes.add(root);
    this.#mo.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: true,
    });
    this.#scanNode(root);
  }

  #queryNode(rootNode) {
    if (rootNode.matches?.(this.#rule.selector)) {
      this.observeNode(rootNode);
    }

    rootNode.querySelectorAll(this.#rule.selector).forEach((node) => {
      const ignoreSelector = this.#getIgnoreSelector?.();
      if (!ignoreSelector || !node.closest?.(ignoreSelector)) {
        this.observeNode(node);
      }
    });
  }

  #scanNode(rootNode) {
    const ignoreSelector = this.#getIgnoreSelector?.();
    if (
      !this.#isElementOrFragment(rootNode) ||
      (ignoreSelector && rootNode.matches?.(ignoreSelector))
    ) {
      return;
    }

    if (this.#rule.autoScan === "false") {
      this.#queryNode(rootNode);
      return;
    }

    const hasText = DomKit.hasTextNode(rootNode);

    if (!hasText && rootNode.children.length === 1) {
      const child = rootNode.children[0];
      if (!child.classList?.contains(DomKit.LINGOFLOW_CLASS.warpper)) {
        this.#scanNode(child);
        return;
      }
    }

    const hasBlock = this.#hasBlockNode?.(rootNode);

    if (hasText || !hasBlock) {
      this.observeNode(rootNode);
    }

    if (hasBlock) {
      for (const child of rootNode.children) {
        const isBlock = this.#isBlockNode?.(child);
        if (!hasText || isBlock) {
          this.#scanNode(child);
        }
      }
    }
  }

  startContainerWatch({ onRestart, onRescan }) {
    this.#onContainerRestart = onRestart;
    this.#onContainerRescan = onRescan;
    this.#boundPageRestoreHandler = this.#handlePageRestore.bind(this);
    this.#boundSpaNavigationHandler = this.#handleSpaNavigation.bind(this);

    this.#containerObserver = new MutationObserver(() => {
      this.#handleContainerMutation("document");
    });
    this.#containerObserver.observe(document, { childList: true });

    this.refreshContainerWatch();
    window.addEventListener("pageshow", this.#boundPageRestoreHandler);
    document.addEventListener(
      "turbo:frame-load",
      this.#boundSpaNavigationHandler,
      true
    );
  }

  refreshContainerWatch() {
    this.#documentElementObserver?.disconnect();
    this.#documentElementObserver = null;

    this.#knownDocumentElement?.removeEventListener(
      "turbo:load",
      this.#boundSpaNavigationHandler
    );

    this.#knownDocumentElement = document.documentElement;
    this.#knownBody = document.body;

    if (!this.#knownDocumentElement) return;

    this.#knownDocumentElement.addEventListener(
      "turbo:load",
      this.#boundSpaNavigationHandler
    );
    this.#documentElementObserver = new MutationObserver(() => {
      this.#handleContainerMutation("documentElement");
    });
    this.#documentElementObserver.observe(this.#knownDocumentElement, {
      childList: true,
    });
  }

  stopContainerWatch() {
    this.#containerObserver?.disconnect();
    this.#containerObserver = null;

    this.#documentElementObserver?.disconnect();
    this.#documentElementObserver = null;

    this.#knownDocumentElement?.removeEventListener(
      "turbo:load",
      this.#boundSpaNavigationHandler
    );
    this.#knownDocumentElement = null;
    this.#knownBody = null;

    window.removeEventListener("pageshow", this.#boundPageRestoreHandler);
    document.removeEventListener(
      "turbo:frame-load",
      this.#boundSpaNavigationHandler,
      true
    );
    this.#boundPageRestoreHandler = null;
    this.#boundSpaNavigationHandler = null;
  }

  hasContainerChanged() {
    return this.#hasDocumentContainerChanged();
  }

  #handleContainerMutation(reason) {
    if (this.#hasDocumentContainerChanged()) {
      this.#onContainerRestart?.(reason);
    }
  }

  #handlePageRestore(event) {
    if (event.type === "pageshow" && event.persisted !== true) return;
    this.#onContainerRescan?.(event.type);
  }

  #handleSpaNavigation(event) {
    this.#onContainerRescan?.(event.type);
  }

  #hasDocumentContainerChanged() {
    return (
      document.documentElement !== this.#knownDocumentElement ||
      document.body !== this.#knownBody
    );
  }
}
