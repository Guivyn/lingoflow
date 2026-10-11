import { isChineseTargetText } from "./targetLanguage";

test("skips Chinese body text and mixed usernames for a Chinese target", () => {
  for (const text of [
    "醒来看见这一幕 感觉身体暖暖的...",
    "一起吧！",
    "是脆脆不是treetree",
    "用户1234510",
    "中文 #书桌日常 @家居薯",
  ]) {
    expect(isChineseTargetText(text, "zh-CN")).toBe(true);
    expect(isChineseTargetText(text, "en")).toBe(false);
  }
});

test("keeps English, Japanese and Korean eligible for translation", () => {
  for (const text of [
    "Open your Codespaces here",
    "Read the 中文 documentation",
    "今日は暖かいです",
    "한국 中文",
    "123 !!",
  ]) {
    expect(isChineseTargetText(text, "zh-CN")).toBe(false);
  }
});
