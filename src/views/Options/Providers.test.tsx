import { act } from "react";
import { createRoot } from "react-dom/client";
import Providers from "./Providers";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../../hooks/I18n", () => ({
  useI18n: () => (key: string, fallback?: string) => fallback || key,
}));

jest.mock("../../hooks/Setting", () => ({
  useSetting: jest.fn(),
}));

jest.mock("../../providers", () => ({
  getAllProviders: () => [
    {
      apiType: "OpenAI",
      name: "OpenAI",
      capabilities: {
        ai: true,
        machine: false,
        stream: true,
      },
      thinking: { type: "openai" },
    },
  ],
}));

jest.mock("../../config", () => ({
  DEFAULT_API_LIST: [],
}));

const { useSetting } = require("../../hooks/Setting");

describe("Providers", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("renders each provider instance with connection fields", async () => {
    useSetting.mockReturnValue({
      setting: {
        transApis: [
          {
            apiSlug: "OpenAI_1",
            apiType: "OpenAI",
            apiName: "OpenAI",
            url: "https://api.openai.com/v1/chat/completions",
            key: "sk-test",
            model: "gpt-4",
          },
          {
            apiSlug: "OpenAI_2",
            apiType: "OpenAI",
            apiName: "OpenAI 2",
            url: "https://api.openai.com/v1/chat/completions",
            key: "sk-test-2",
            model: "gpt-4o",
          },
        ],
      },
      updateSetting: jest.fn(),
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<Providers />);
    });

    expect(container.textContent).toContain("OpenAI");
    expect(container.textContent).toContain("OpenAI 2");
    expect(container.querySelectorAll('input[type="checkbox"]').length).toBe(2);
    expect(container.querySelectorAll("input").length).toBeGreaterThanOrEqual(
      6
    );

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  test("updates only the targeted provider instance", async () => {
    const updateSetting = jest.fn();
    useSetting.mockReturnValue({
      setting: {
        transApis: [
          {
            apiSlug: "OpenAI_1",
            apiType: "OpenAI",
            apiName: "OpenAI",
            isDisabled: false,
          },
          {
            apiSlug: "OpenAI_2",
            apiType: "OpenAI",
            apiName: "OpenAI 2",
            isDisabled: false,
          },
        ],
      },
      updateSetting,
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<Providers />);
    });

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    await act(async () => {
      checkboxes[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const updater = updateSetting.mock.calls.at(-1)[0];
    const next = updater({
      transApis: [
        { apiSlug: "OpenAI_1", apiType: "OpenAI", isDisabled: false },
        { apiSlug: "OpenAI_2", apiType: "OpenAI", isDisabled: false },
      ],
    });
    expect(next.transApis[0].isDisabled).toBe(false);
    expect(next.transApis[1].isDisabled).toBe(true);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
