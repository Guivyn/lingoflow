import { TranslationRenderer } from "./TranslationRenderer";
import { DomKit } from "../dom/DomKit";

const placeholderConfig = {
  startDelimiter: "{{",
  endDelimiter: "}}",
  tagName: "i",
  format: "compact",
  safeTag: "span",
  openRegex: /<i(\d+)>/gi,
  closeRegex: /<\/i>/gi,
  placeholderRegex: /{{\d+}}/g,
};

function createRenderer(rule = {}, setting = {}) {
  return new TranslationRenderer({
    rule: {
      transOrder: "original-first",
      transOnly: "false",
      transOnlyRevertDelay: "0.1",
      ...rule,
    },
    setting: {
      customStyles: [],
      uiLang: "zh",
      darkMode: "light",
      ...setting,
    },
    tags: DomKit.TAGS,
    getPlaceholderConfig: () => placeholderConfig,
    getTerms: () => ({ values: [], regex: null }),
    isIgnoredElement: () => false,
    shouldBreak: () => false,
    translationTagName: "lingoflow",
  });
}

describe("TranslationRenderer", () => {
  let originalCSSStyleSheet;

  beforeEach(() => {
    document.documentElement.innerHTML = "<head></head><body></body>";
    originalCSSStyleSheet = global.CSSStyleSheet;
    global.CSSStyleSheet = class {
      replaceSync() {}
    };
  });

  afterEach(() => {
    global.CSSStyleSheet = originalCSSStyleSheet;
  });

  test("creates, commits and removes a translation wrapper", () => {
    document.body.innerHTML =
      '<main id="root"><p id="host">Hello <b>world</b></p></main>';
    const host = document.getElementById("host");
    const nodes = Array.from(host.childNodes);
    const renderer = createRenderer();

    const { wrapper, inner } = renderer.createWrapper({
      nodes,
      processedString: "Hello <b>world</b>",
      toLang: "zh-CN",
      transTag: "font",
      textStyle: "none",
      transOrder: "original-first",
      hideOrigin: false,
    });

    expect(wrapper.className).toContain("lingoflow-wrapper");
    expect(inner.lang).toBe("zh-CN");
    expect(host.contains(wrapper)).toBe(true);
  });

  test("moves original nodes into template backup in translation-only mode", () => {
    document.body.innerHTML =
      '<main id="root"><p id="host">Hello <b>world</b></p></main>';
    const host = document.getElementById("host");
    const nodes = Array.from(host.childNodes);
    const renderer = createRenderer();
    const { wrapper } = renderer.createWrapper({
      nodes,
      processedString: "Hello <b>world</b>",
      toLang: "zh-CN",
      transTag: "font",
      textStyle: "none",
      transOrder: "original-first",
      hideOrigin: false,
    });
    renderer.commitTranslation({ wrapper, nodes, isHide: false });

    renderer.setTranslationOnly(wrapper, "true");

    expect(host.querySelector("b")).toBeNull();
    expect(
      wrapper.querySelector(`template.${DomKit.LINGOFLOW_CLASS.backup}`)
    ).not.toBeNull();

    renderer.setTranslationOnly(wrapper, "false");

    expect(host.querySelector("b")?.textContent).toBe("world");
  });

  test("restores hidden original nodes when the wrapper is removed", () => {
    document.body.innerHTML =
      '<main id="root"><p id="host">Hello <b>world</b></p></main>';
    const host = document.getElementById("host");
    const nodes = Array.from(host.childNodes);
    const renderer = createRenderer();
    const { wrapper } = renderer.createWrapper({
      nodes,
      processedString: "Hello <b>world</b>",
      toLang: "zh-CN",
      transTag: "font",
      textStyle: "none",
      transOrder: "original-first",
      hideOrigin: false,
    });
    renderer.commitTranslation({ wrapper, nodes, isHide: false });
    renderer.setTranslationOnly(wrapper, "true");

    renderer.removeWrapper(wrapper);

    expect(host.querySelector("b")?.textContent).toBe("world");
    expect(document.querySelector("lingoflow")).toBeNull();
  });

  test("keeps translation inside a flex item instead of adding a flex sibling", () => {
    document.body.innerHTML =
      '<main id="root"><div id="host" style="display:flex"><span id="item">Hello</span></div></main>';
    const host = document.getElementById("host");
    const item = document.getElementById("item");
    const renderer = createRenderer();
    const { wrapper } = renderer.createWrapper({
      nodes: [item],
      processedString: "Hello",
      toLang: "zh-CN",
      transTag: "font",
      textStyle: "none",
      transOrder: "original-first",
      hideOrigin: false,
    });

    expect(item.contains(wrapper)).toBe(true);
    expect(host.children).toHaveLength(1);
  });

  test("wraps bare flex text so the translation stays inside one layout item", () => {
    document.body.innerHTML =
      '<main id="root"><div id="host" style="display:flex">Hello</div></main>';
    const host = document.getElementById("host");
    const nodes = Array.from(host.childNodes);
    const renderer = createRenderer();
    const { wrapper } = renderer.createWrapper({
      nodes,
      processedString: "Hello",
      toLang: "zh-CN",
      transTag: "font",
      textStyle: "none",
      transOrder: "original-first",
      hideOrigin: false,
    });

    const layoutHost = document.querySelector(".lingoflow-layout-host");
    expect(layoutHost).not.toBeNull();
    expect(host.children).toHaveLength(1);
    expect(layoutHost.contains(wrapper)).toBe(true);
    expect(layoutHost.textContent).toContain("Hello");

    renderer.commitTranslation({ wrapper, nodes, isHide: false });
    renderer.removeWrapper(wrapper);

    expect(document.querySelector(".lingoflow-layout-host")).toBeNull();
    expect(host.textContent).toBe("Hello");
  });

  test("puts long translations on their own line without inner breaks", () => {
    document.body.innerHTML =
      '<main id="root"><p id="host">Hello world</p></main>';
    const host = document.getElementById("host");
    const nodes = Array.from(host.childNodes);
    const renderer = createRenderer();
    const { wrapper } = renderer.createWrapper({
      nodes,
      processedString: "Hello world, this is a much longer paragraph.",
      toLang: "zh-CN",
      transTag: "font",
      textStyle: "none",
      transOrder: "original-first",
      hideOrigin: false,
      newlineLength: 20,
    });

    expect(wrapper.classList.contains("lingoflow-long")).toBe(true);
    expect(wrapper.querySelector("br")).toBeNull();
    expect(wrapper.querySelector(".lingoflow-space")).toBeNull();
  });

  test("forceNewLine keeps even short translations on their own line", () => {
    document.body.innerHTML =
      '<main id="root"><p id="host">Hello world</p></main>';
    const host = document.getElementById("host");
    const nodes = Array.from(host.childNodes);
    const renderer = createRenderer();
    const { wrapper } = renderer.createWrapper({
      nodes,
      processedString: "Hello",
      toLang: "zh-CN",
      transTag: "font",
      textStyle: "none",
      transOrder: "original-first",
      hideOrigin: false,
      forceNewLine: true,
    });

    expect(wrapper.classList.contains("lingoflow-long")).toBe(true);
    expect(wrapper.querySelector(".lingoflow-space")).toBeNull();
  });

  test("short translations stay inline with a space separator by default", () => {
    document.body.innerHTML =
      '<main id="root"><p id="host">Hello world</p></main>';
    const host = document.getElementById("host");
    const nodes = Array.from(host.childNodes);
    const renderer = createRenderer();
    const { wrapper } = renderer.createWrapper({
      nodes,
      processedString: "Hello",
      toLang: "zh-CN",
      transTag: "font",
      textStyle: "none",
      transOrder: "original-first",
      hideOrigin: false,
    });

    expect(wrapper.classList.contains("lingoflow-long")).toBe(false);
    expect(wrapper.querySelector(".lingoflow-space")).not.toBeNull();
  });

});
