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
      newlineLength: 100,
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
      newlineLength: 100,
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
      newlineLength: 100,
    });
    renderer.commitTranslation({ wrapper, nodes, isHide: false });
    renderer.setTranslationOnly(wrapper, "true");

    renderer.removeWrapper(wrapper);

    expect(host.querySelector("b")?.textContent).toBe("world");
    expect(document.querySelector("lingoflow")).toBeNull();
  });
});
