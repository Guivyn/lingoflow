import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import PopupCont from "./PopupCont";
import { persistRule } from "../../libs/rules";
import { sendBgMsg, sendTabMsg } from "../../libs/msg";
import { MSG_TRANS_PUTRULE } from "../../config";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../../libs/rules", () => ({ persistRule: jest.fn() }));
jest.mock("../../libs/msg", () => ({
  sendTabMsg: jest.fn(),
  sendBgMsg: jest.fn().mockResolvedValue([]),
}));
jest.mock("../../hooks/I18n", () => ({
  useI18n: () => (key, fallback) => fallback || key,
}));
jest.mock("../../hooks/CustomStyles", () => ({
  useAllTextStyles: () => ({ allTextStyles: [] }),
}));

describe("Popup language swap button", () => {
  let container;
  let root;

  beforeEach(() => {
    jest.clearAllMocks();
    sendBgMsg.mockResolvedValue([]);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function renderLanguages(fromLang, toLang, toLang2, processActions) {
    function Harness() {
      const [rule, setRule] = useState({
        pattern: "*",
        fromLang,
        toLang,
        apiSlug: "google",
        textStyle: "",
        transOpen: "false",
      });
      return (
        <PopupCont
          rule={rule}
          setRule={setRule}
          setting={{
            transApis: [{ apiSlug: "google" }],
            tranboxSetting: { transOpen: false, toLang2 },
          }}
          setSetting={() => {}}
          handleOpenSetting={() => {}}
          processActions={processActions}
        />
      );
    }
    act(() => root.render(<Harness />));
  }

  async function clickSwap() {
    await act(async () => {
      container
        .querySelector('button[aria-label="交换语言"]')
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }

  test("clicking swaps both fields, persists and applies once, and swaps back", async () => {
    renderLanguages("en", "zh-CN");
    await clickSwap();
    expect(persistRule).toHaveBeenLastCalledWith(
      expect.objectContaining({ fromLang: "zh-CN", toLang: "en" })
    );
    expect(sendTabMsg).toHaveBeenCalledTimes(1);
    expect(sendTabMsg).toHaveBeenLastCalledWith(MSG_TRANS_PUTRULE, {
      fromLang: "zh-CN",
      toLang: "en",
    });
    const capsules = container.querySelectorAll(
      'button[aria-haspopup="listbox"]'
    );
    expect(capsules[0].textContent).toBe("简体中文");
    expect(capsules[1].textContent).toBe("English");
    await clickSwap();
    expect(sendTabMsg).toHaveBeenLastCalledWith(MSG_TRANS_PUTRULE, {
      fromLang: "en",
      toLang: "zh-CN",
    });
  });

  test("Auto reverses to the configured backup using the in-page action handler", async () => {
    const processActions = jest.fn();
    renderLanguages("auto", "zh-CN", "ja", processActions);
    await clickSwap();
    expect(processActions).toHaveBeenCalledWith({
      action: MSG_TRANS_PUTRULE,
      args: { fromLang: "zh-CN", toLang: "ja" },
    });
    expect(sendTabMsg).not.toHaveBeenCalled();
  });

  test.each([
    ["zh-CN", "-", "en"],
    ["en", "en", "zh-CN"],
  ])("Auto with target %s and backup %s uses a valid reverse target", async (toLang, backup, expected) => {
    renderLanguages("auto", toLang, backup);
    await clickSwap();
    expect(sendTabMsg).toHaveBeenLastCalledWith(MSG_TRANS_PUTRULE, {
      fromLang: toLang,
      toLang: expected,
    });
  });
});
