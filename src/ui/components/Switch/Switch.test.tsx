import { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import Switch from "./Switch";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("ui Switch", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("renders a checkbox switch input", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<Switch checked={false} onChange={() => {}} />);
    });

    const input = container.querySelector<HTMLInputElement>(
      'input[type="checkbox"]'
    );
    expect(input).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  test("reports checked state changes", async () => {
    const onChange = jest.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<Switch checked={false} onChange={onChange} />);
    });

    const input = container.querySelector<HTMLInputElement>(
      'input[type="checkbox"]'
    );
    expect(input).not.toBeNull();

    await act(async () => {
      Simulate.change(input!, {
        target: { checked: true },
      } as unknown as Parameters<typeof Simulate.change>[1]);
    });
    expect(onChange).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
