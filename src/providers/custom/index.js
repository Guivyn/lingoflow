import { OPT_TRANS_CUSTOMIZE } from "../../config";

export const customProvider = {
  apiType: OPT_TRANS_CUSTOMIZE,
  name: "Custom",
  capabilities: {
    builtin: true,
    machine: false,
    ai: true,
    mulkeys: true,
    batch: true,
    context: true,
    stream: false,
    darkIcon: false,
    sponsor: false,
  },
  thinking: null,
  buildRequest({ texts, fromLang, toLang, url, key, useBatchFetch }) {
    const body = useBatchFetch
      ? { texts, from: fromLang, to: toLang }
      : { text: texts[0], from: fromLang, to: toLang };
    const headers = {
      "Content-type": "application/json",
      Authorization: `Bearer ${key}`,
    };

    return { url, body, headers };
  },
  parseTranslate(res, { useBatchFetch } = {}) {
    if (useBatchFetch) {
      return (res?.translations ?? res)?.map((item) => [item.text, item.src]);
    }
    return [[res.text, res.src || res.from]];
  },
  parseDict(res) {
    if (typeof res === "string") return res;
    return res?.text || res?.result || "";
  },
  parseSubtitle(res) {
    return res;
  },
  parseSummarize(res) {
    if (typeof res === "string") return res.trim();
    return res?.choices?.[0]?.message?.content?.trim() || "";
  },
};
