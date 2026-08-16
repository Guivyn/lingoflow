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

function createRenderer(
  rule = {},
  setting = {},
  placeholderConfigOverride = placeholderConfig,
  isVisibleElement = () => true
) {
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
    getPlaceholderConfig: () => placeholderConfigOverride,
    getTerms: () => ({ values: [], regex: null }),
    isIgnoredElement: () => false,
    isVisibleElement,
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

  test("serializes whitespace between adjacent inline elements", () => {
    document.body.innerHTML =
      '<main id="root"><p id="host"><span>Hello</span> <span>world</span></p></main>';
    const host = document.getElementById("host");
    const renderer = createRenderer({ hasRichText: "true" });

    const [processedString] = renderer.serializeForTranslation(
      Array.from(host.childNodes),
      ""
    );

    expect(processedString).toContain("</i1> <i2>");
  });

  test("skips hidden inline duplicates inside a visible group", () => {
    document.body.innerHTML =
      '<main id="root"><p id="host"><span>Visible</span><span style="display: none">Hidden copy</span></p></main>';
    const host = document.getElementById("host");
    const renderer = createRenderer(
      { hasRichText: "true" },
      {},
      placeholderConfig,
      (node) => node.style?.display !== "none"
    );

    const [processedString] = renderer.serializeForTranslation(
      Array.from(host.childNodes),
      ""
    );

    expect(processedString).toContain("Visible");
    expect(processedString).not.toContain("Hidden copy");
  });

  test("restores adjacent placeholders merged by a translation service", () => {
    const renderer = createRenderer();
    const placeholderMap = new Map([
      ["{{10}}", "A"],
      ["{{11}}", "B"],
    ]);

    expect(renderer.restoreFromTranslation("x{{1011}}y", placeholderMap)).toBe(
      "xABy"
    );
  });

  test("restores merged placeholders with single-brace delimiters", () => {
    const singleBraceConfig = {
      ...placeholderConfig,
      startDelimiter: "{",
      endDelimiter: "}",
      placeholderRegex: /\{\d+\}/g,
    };
    const renderer = createRenderer({}, {}, singleBraceConfig);
    const placeholderMap = new Map([
      ["{10}", "A"],
      ["{11}", "B"],
    ]);

    expect(renderer.restoreFromTranslation("x{1011}y", placeholderMap)).toBe(
      "xABy"
    );
  });

  test("keeps unknown merged placeholder digits intact", () => {
    const renderer = createRenderer();
    const placeholderMap = new Map([["{{1}}", "A"]]);

    expect(renderer.restoreFromTranslation("x{{12}}y", placeholderMap)).toBe(
      "x{{12}}y"
    );
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

  test("tag placeholders do not force short translations onto their own line", () => {
    document.body.innerHTML =
      '<main id="root"><p id="host">Hello <b>world</b></p></main>';
    const host = document.getElementById("host");
    const nodes = Array.from(host.childNodes);
    const renderer = createRenderer();
    const { wrapper } = renderer.createWrapper({
      nodes,
      processedString: "<i1>Hi</i1><i2>!</i2>",
      toLang: "zh-CN",
      transTag: "font",
      textStyle: "none",
      transOrder: "original-first",
      hideOrigin: false,
      newlineLength: 10,
    });

    expect(wrapper.classList.contains("lingoflow-long")).toBe(false);
    expect(wrapper.querySelector(".lingoflow-space")).not.toBeNull();
  });
});
