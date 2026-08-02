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

  test("renders provider card with connection fields", async () => {
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
    expect(container.querySelector('input[type="checkbox"]')).not.toBeNull();
    expect(container.querySelectorAll("input").length).toBeGreaterThanOrEqual(
      3
    );

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
