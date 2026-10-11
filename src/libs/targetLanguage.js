// Script-based guard for Chinese text, including short comments and usernames
// that browser language detection often cannot identify reliably.
export function isChineseTargetText(text, toLang) {
  if (!toLang?.startsWith("zh")) return false;
  if (/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(text)) {
    return false;
  }
  const han = text.match(/\p{Script=Han}/gu)?.length || 0;
  const letters = text.match(/\p{L}/gu)?.length || 0;
  return han > 0 && han * 3 >= letters;
}
