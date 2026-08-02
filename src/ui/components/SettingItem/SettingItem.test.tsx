import { act } from "react";
import { createRoot } from "react-dom/client";
import SettingItem from "./SettingItem";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("ui SettingItem", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("renders title, description and control children", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SettingItem title="Title" description="Description">
          <button type="button">Control</button>
        </SettingItem>
      );
    });

    expect(container.textContent).toContain("Title");
    expect(container.textContent).toContain("Description");
    expect(container.querySelector("button")).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
