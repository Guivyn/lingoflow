import { DomScanner } from "./DomScanner";
import { DomKit } from "../dom/DomKit";

const flushMutationObservers = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

describe("DomScanner", () => {
  let originalIntersectionObserver;

  beforeEach(() => {
    document.documentElement.innerHTML = "<head></head><body></body>";
    originalIntersectionObserver = global.IntersectionObserver;
    global.IntersectionObserver = class {
      constructor(callback) {
        this.callback = callback;
      }

      observe(target) {
        this.callback([{ target, isIntersecting: true }]);
      }

      unobserve() {}

      disconnect() {}
    };
  });

  afterEach(() => {
    global.IntersectionObserver = originalIntersectionObserver;
    jest.useRealTimers();
  });

  test("scans roots and reports candidate nodes through onNode", () => {
    document.body.innerHTML = '<main id="root"><p>Hello world</p></main>';
    const onNode = jest.fn();
    const scanner = new DomScanner({
      rule: {
        rootsSelector: "#root",
        autoScan: "true",
        scanAll: "false",
        hasShadowroot: "false",
      },
      setting: { transInterval: 0 },
      translationTagName: "lingoflow",
      getIgnoreSelector: () => ".notranslate",
      onNode,
      getState: () => ({ enabled: true, transAllnow: true, rootMargin: 0 }),
      isElementOrFragment: DomKit.isElementOrFragment,
      isBlockNode: DomKit.isBlockNode,
      hasBlockNode: DomKit.hasBlockNode,
      shouldBreak: () => false,
    });

    scanner.init();

    const paragraph = document.querySelector("#root p");
    expect(scanner.getRoots()).toEqual(
      expect.arrayContaining([document.getElementById("root")])
    );
    expect(scanner.hasObserved(paragraph)).toBe(true);
    expect(onNode).toHaveBeenCalledWith(paragraph);
  });

  test("github-style selector observes commit cells and about copy", () => {
    document.body.innerHTML = `
      <nav><a>Code</a></nav>
      <div class="react-directory-row">
        <div class="react-directory-row-commit-cell">
          <a href="#"><span>feat: harden message channels</span></a>
        </div>
      </div>
      <div class="BorderGrid-cell">
        <p class="f4">A lightweight bilingual translation Chrome extension.</p>
      </div>
    `;
    const onNode = jest.fn();
    const scanner = new DomScanner({
      rule: {
        autoScan: "false",
        rootsSelector: "body",
        selector:
          ".react-directory-row-commit-cell, .BorderGrid-cell p, .f4, .markdown-body td, .markdown-body th",
        ignoreSelector: "",
      },
      setting: { transInterval: 0 },
      translationTagName: "lingoflow",
      getIgnoreSelector: () => "",
      onNode,
      getState: () => ({ enabled: true, transAllnow: true, rootMargin: 0 }),
      isElementOrFragment: DomKit.isElementOrFragment,
      isBlockNode: DomKit.isBlockNode,
      hasBlockNode: DomKit.hasBlockNode,
      shouldBreak: () => false,
    });

    scanner.init();

    expect(onNode).toHaveBeenCalledWith(
      document.querySelector(".react-directory-row-commit-cell")
    );
    expect(onNode).toHaveBeenCalledWith(document.querySelector(".f4"));
    expect(
      onNode.mock.calls.some(([node]) => node.textContent?.trim() === "Code")
    ).toBe(false);
  });

  test("notifies onRescan before scanning a changed container", async () => {
    jest.useFakeTimers();
    const onRescan = jest.fn();
    const onNode = jest.fn();
    const scanner = new DomScanner({
      rule: {
        rootsSelector: "#root",
        autoScan: "true",
        scanAll: "false",
        hasShadowroot: "false",
      },
      setting: { transInterval: 0 },
      translationTagName: "lingoflow",
      getIgnoreSelector: () => ".notranslate",
      onNode,
      onRescan,
      getState: () => ({ enabled: true, transAllnow: true, rootMargin: 0 }),
      isElementOrFragment: DomKit.isElementOrFragment,
      isBlockNode: DomKit.isBlockNode,
      hasBlockNode: DomKit.hasBlockNode,
      shouldBreak: () => false,
    });
    document.body.innerHTML = '<main id="root"><p>Hello</p></main>';
    scanner.init();
    onNode.mockClear();

    try {
      document.querySelector("#root").appendChild(
        document.createElement("p")
      ).textContent = "Added later";

      await Promise.resolve();
      jest.advanceTimersByTime(150);
      await Promise.resolve();

      expect(onRescan).toHaveBeenCalled();
      expect(onNode).toHaveBeenCalledWith(
        expect.objectContaining({ textContent: "Added later" })
      );
    } finally {
      jest.useRealTimers();
    }
  });

  test("watches document containers and reports body replacement", async () => {
    const onRestart = jest.fn();
    const onRescan = jest.fn();
    const scanner = new DomScanner({});

    scanner.startContainerWatch({ onRestart, onRescan });
    const oldBody = document.body;
    const newBody = document.createElement("body");
    document.documentElement.replaceChild(newBody, oldBody);

    await flushMutationObservers();

    expect(onRestart).toHaveBeenCalledWith("documentElement");
    scanner.stopContainerWatch();
  });
});
