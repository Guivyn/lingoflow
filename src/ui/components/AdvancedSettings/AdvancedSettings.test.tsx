import { act } from "react";
import { createRoot } from "react-dom/client";
import AdvancedSettings from "./AdvancedSettings";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test("closing advanced settings retains drafts and excludes hidden controls from interaction", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() =>
    root.render(
      <AdvancedSettings title="Advanced">
        <input defaultValue="draft" />
      </AdvancedSettings>
    )
  );
  const button = host.querySelector("button")!;
  const input = host.querySelector("input")!;
  const region = host.querySelector('[role="region"]')!;
  expect(region.hasAttribute("inert")).toBe(true);
  act(() => button.click());
  input.value = "unsaved edit";
  expect(region.hasAttribute("inert")).toBe(false);
  act(() => button.click());
  expect(region.getAttribute("aria-hidden")).toBe("true");
  expect(region.hasAttribute("inert")).toBe(true);
  act(() => button.click());
  expect(host.querySelector("input")).toBe(input);
  expect(input.value).toBe("unsaved edit");
  act(() => root.unmount());
  host.remove();
});
