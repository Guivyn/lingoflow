jest.mock("./storage", () => ({
  getRulesWithDefault: jest.fn(),
  setRules: jest.fn(),
}));

const { getRulesWithDefault, setRules } = require("./storage");
const { checkRules, persistRule, saveRule } = require("./rules");
const { OPT_STYLE_NONE, BUILTIN_RULES } = require("../config");

describe("rules", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("clamps negative splitLength to zero", () => {
    const normalized = checkRules([
      { pattern: "example.com", splitLength: -5 },
    ]);

    expect(normalized[0].splitLength).toBe(0);
  });

  test("enableScripts defaults to false but preserves legacy script rules", () => {
    expect(checkRules([{ pattern: "example.com" }])[0].enableScripts).toBe(
      false
    );
    expect(
      checkRules([
        {
          pattern: "legacy.example.com",
          injectJs: "console.log('legacy')",
        },
      ])[0].enableScripts
    ).toBe(true);
    expect(
      checkRules([
        {
          pattern: "explicit.example.com",
          transStartHook: "() => ({})",
          enableScripts: false,
        },
      ])[0].enableScripts
    ).toBe(false);
  });

  test("maps removed legacy text styles to none", () => {
    const normalized = checkRules([
      { pattern: "example.com", textStyle: "fuzzy" },
      { pattern: "example.org", textStyle: "blink" },
      { pattern: "example.net", textStyle: "marker" },
      { pattern: "example.io", textStyle: "gradient_marker" },
    ]);

    expect(normalized[0].textStyle).toBe(OPT_STYLE_NONE);
    expect(normalized[1].textStyle).toBe(OPT_STYLE_NONE);
    expect(normalized[2].textStyle).toBe(OPT_STYLE_NONE);
    expect(normalized[3].textStyle).toBe(OPT_STYLE_NONE);
  });

  test("github rule unclamps truncated containers", () => {
    const githubRule = BUILTIN_RULES.find(
      (rule) => rule.pattern === "github.com"
    );

    expect(githubRule.selectStyle).toContain("-webkit-line-clamp: unset");
    expect(githubRule.parentStyle).toContain("max-height: none");
    expect(githubRule.grandStyle).toContain("height: auto");
  });

  test("github rule covers repo listing commit messages and about copy", () => {
    const githubRule = BUILTIN_RULES.find(
      (rule) => rule.pattern === "github.com"
    );

    expect(githubRule.autoScan).toBe("false");
    expect(githubRule.selector).toContain(".react-directory-row-commit-cell");
    expect(githubRule.selector).toContain(
      '[class*="react-directory"] [class*="commit-message"]'
    );
    expect(githubRule.selector).toContain(".BorderGrid-cell p");
    expect(githubRule.selector).toContain(".markdown-body td");
  });

  test("stackoverflow rule keeps tags and user cards untranslated", () => {
    const soRule = BUILTIN_RULES.find(
      (rule) => rule.pattern === "stackoverflow.com"
    );

    expect(soRule.autoScan).toBe("false");
    expect(soRule.keepSelector).toContain(".s-tag");
    expect(soRule.ignoreSelector).toContain(".post-tag");
    expect(soRule.selector).toContain(".s-prose p");
  });

  test("persistRule updates the global rule in place", async () => {
    getRulesWithDefault.mockResolvedValue([
      { pattern: "*", autoScan: "false", enabled: true },
    ]);

    await persistRule({
      pattern: "*",
      autoScan: "true",
      textStyle: "under_line",
    });

    const saved = setRules.mock.calls[0][0];
    expect(saved).toHaveLength(1);
    expect(saved[0].pattern).toBe("*");
    expect(saved[0].autoScan).toBe("true");
    expect(saved[0].textStyle).toBe("under_line");
  });

  test("persistRule inserts a new personal rule", async () => {
    getRulesWithDefault.mockResolvedValue([
      { pattern: "*", autoScan: "true" },
    ]);

    await persistRule({ pattern: "example.com", textStyle: "highlight" });

    const saved = setRules.mock.calls[0][0];
    expect(saved).toHaveLength(2);
    expect(saved[0].pattern).toBe("example.com");
    expect(saved[0].textStyle).toBe("highlight");
  });

  test("saveRule uses exact pattern matching instead of wildcard merging", async () => {
    getRulesWithDefault.mockResolvedValue([
      {
        pattern: "https://example.com/*",
        enabled: true,
        selector: "",
        keepSelector: "",
        blockSelector: "",
        rootsSelector: "",
        ignoreSelector: "",
        terms: "",
        aiTerms: "",
        termsStyle: "",
        textExtStyle: "",
        selectStyle: "",
        parentStyle: "",
        grandStyle: "",
        injectJs: "",
        injectCss: "",
        apiSlug: "*",
        fromLang: "*",
        toLang: "*",
        textStyle: "*",
        transOpen: "*",
        transOnly: "*",
        transOnlyRevert: "*",
        transOnlyRevertDelay: "*",
        transOrder: "*",
        autoScan: "*",
        hasRichText: "*",
        hasShadowroot: "*",
        scanAll: "*",
        isPlainText: "*",
        transTag: "*",
        transTitle: "*",
        transStartHook: "",
        transEndHook: "",
        splitParagraph: "*",
        splitLength: 0,
      },
    ]);

    await saveRule({ pattern: "https://example.com/foo" });

    const saved = setRules.mock.calls[0][0];
    expect(saved).toHaveLength(2);
    expect(saved.some((rule) => rule.pattern === "https://example.com/*")).toBe(
      true
    );
    expect(
      saved.some((rule) => rule.pattern === "https://example.com/foo")
    ).toBe(true);
  });
});
