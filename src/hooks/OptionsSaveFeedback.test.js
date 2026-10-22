import { act } from "react";
import { createRoot } from "react-dom/client";
import { useOptionsSaveFeedback } from "./OptionsSaveFeedback";
import { storage } from "../libs/storage";
import { beginSave, getSaveSnapshot } from "../libs/saveFeedback";
import {
  STOKEY_SETTING,
  STOKEY_RULES,
  STOKEY_FAB,
  DEFAULT_SETTING,
} from "../config";

jest.mock("./I18n", () => ({
  useI18n: () => (key) =>
    require("../config/locales/interface").INTERFACE_I18N[key]?.zh || key,
}));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function Harness() {
  const feedback = useOptionsSaveFeedback("idle");
  return (
    <>
      {feedback.error && <div role="alert">{feedback.error}</div>}
      <span role="status">{feedback.statusText}</span>
    </>
  );
}

describe("settings persistence feedback", () => {
  let host, root;
  beforeEach(() => {
    for (const key of [STOKEY_SETTING, STOKEY_RULES, STOKEY_FAB])
      beginSave(key)("saved");
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    jest.restoreAllMocks();
  });

  test.each([
    [STOKEY_SETTING, DEFAULT_SETTING, "常规设置"],
    [STOKEY_RULES, [], "网页规则"],
    [STOKEY_FAB, { isHide: true }, "悬浮按钮设置"],
  ])(
    "shows and recovers an actual storage failure for %s",
    async (key, data, label) => {
      act(() => root.render(<Harness />));
      const write = jest
        .spyOn(Storage.prototype, "setItem")
        .mockImplementationOnce(() => {
          throw new Error("quota exceeded");
        });
      await act(async () => {
        await expect(storage.setObj(key, data)).rejects.toThrow(
          "quota exceeded"
        );
      });
      expect(host.querySelector('[role="alert"]').textContent).toContain(label);
      expect(host.querySelector('[role="status"]').textContent).toBe("");
      write.mockRestore();
      await act(async () => {
        await storage.setObj(key, data);
      });
      expect(host.querySelector('[role="alert"]')).toBeNull();
      expect(host.querySelector('[role="status"]').textContent).toBe("已保存");
    }
  );

  test("a successful save in another source does not hide a rules failure", () => {
    act(() => root.render(<Harness />));
    act(() => beginSave(STOKEY_RULES)("error"));
    act(() => beginSave(STOKEY_FAB)("saved"));
    expect(host.querySelector('[role="alert"]').textContent).toContain(
      "网页规则"
    );
    expect(host.querySelector('[role="status"]').textContent).toBe("");
  });

  test("an older write cannot replace the status of the latest queued write", () => {
    act(() => root.render(<Harness />));
    let first, second;
    act(() => {
      first = beginSave(STOKEY_RULES);
      second = beginSave(STOKEY_RULES);
      first("error");
    });
    expect(getSaveSnapshot()[STOKEY_RULES].status).toBe("saving");
    expect(host.querySelector('[role="status"]').textContent).toBe("正在保存…");
    act(() => second("saved"));
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });
});
