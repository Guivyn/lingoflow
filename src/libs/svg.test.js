import { createLoadingSVG } from "./svg";
import { DomKit } from "../core/dom/DomKit";

test("upstream loading fix preserves theme color without SVG SMIL", () => {
  const svg = createLoadingSVG("#123456");
  expect(svg.querySelectorAll("animateTransform, animate")).toHaveLength(0);
  expect(svg.querySelectorAll("circle")).toHaveLength(3);
  expect(svg.querySelector("circle").getAttribute("fill")).toBe("#123456");
  expect(svg.querySelector("style").textContent).toContain(
    "prefers-reduced-motion"
  );
});

test("inline custom components containing blocks are structural, inline-only components stay inline", () => {
  const container = document.createElement("custom-article");
  const block = document.createElement("div");
  container.appendChild(block);
  const inline = document.createElement("custom-word");
  inline.appendChild(document.createElement("span"));
  const original = window.getComputedStyle;
  const computed = jest
    .spyOn(window, "getComputedStyle")
    .mockImplementation((node) =>
      node.nodeName.includes("-") || node.nodeName === "SPAN"
        ? { display: "inline" }
        : original(node)
    );
  DomKit.displayCache = new WeakMap();
  expect(DomKit.isBlockNode(container)).toBe(true);
  expect(DomKit.isBlockNode(inline)).toBe(false);
  computed.mockRestore();
});
