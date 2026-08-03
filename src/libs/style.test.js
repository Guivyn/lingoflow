import { builtinStylesMap, genTextClass, translationKeyframes } from "./style";
import {
  OPT_STYLE_COLORFUL,
  OPT_STYLE_GRADIENT,
  OPT_STYLE_LINE,
  OPT_STYLE_PAPER,
  OPT_STYLE_SIDE_RAIL,
} from "../config";

describe("style", () => {
  test("generates deterministic translation classes", () => {
    const [textClass, textStyles] = genTextClass();

    expect(textClass[OPT_STYLE_LINE]).toBe("lingoflow-tr-under-line");
    expect(textStyles).toContain(".lingoflow-tr-under-line {");
    expect(textStyles).toContain("var(--lf-tr-color");
    expect(textStyles).toContain(".lingoflow-inner {");
    expect(textStyles).toContain("white-space: normal");
    expect(textStyles).not.toContain("lf-blink");
    expect(textStyles).not.toContain("blur(0.2em)");
    expect(textStyles).not.toContain("-webkit-opacity");
  });

  test("preserves custom style slugs", () => {
    const [textClass, textStyles] = genTextClass([
      { styleSlug: "custom_abc-123", styleCode: "color: red;" },
    ]);

    expect(textClass["custom_abc-123"]).toBe("lingoflow-tr-custom-abc-123");
    expect(textStyles).toContain(
      ".lingoflow-tr-custom-abc-123 { color: red; }"
    );
  });

  test("exposes keyframes for preview contexts", () => {
    expect(translationKeyframes).toContain("@keyframes lf-gradient-flow");
    expect(translationKeyframes).not.toContain("@keyframes lf-blink");
    expect(translationKeyframes).toContain(
      "@media (prefers-reduced-motion: reduce)"
    );
  });

  test("builtin line style uses design token with fallback", () => {
    expect(builtinStylesMap[OPT_STYLE_LINE]).toContain("#c96a4a");
  });

  test("paper and colorful styles use design-safe rendering", () => {
    expect(builtinStylesMap[OPT_STYLE_PAPER]).toContain("--lf-tr-soft");
    expect(builtinStylesMap[OPT_STYLE_COLORFUL]).toContain(
      "background-clip: text"
    );
    expect(builtinStylesMap[OPT_STYLE_COLORFUL]).toContain("#e05252");
  });

  test("side rail keeps a quiet quote-like marker", () => {
    const [textClass] = genTextClass();
    expect(textClass[OPT_STYLE_SIDE_RAIL]).toBe("lingoflow-tr-side-rail");
    expect(builtinStylesMap[OPT_STYLE_SIDE_RAIL]).toContain(
      "border-inline-start"
    );
  });

  test("gradient uses the warm brand palette", () => {
    expect(builtinStylesMap[OPT_STYLE_GRADIENT]).toContain("#c96a4a");
    expect(builtinStylesMap[OPT_STYLE_GRADIENT]).not.toContain("#3b82f6");
    expect(builtinStylesMap[OPT_STYLE_GRADIENT]).not.toContain("#9333ea");
  });
});
