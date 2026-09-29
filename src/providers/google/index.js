import { OPT_TRANS_GOOGLE } from "../../config";

export const googleProvider = {
  apiType: OPT_TRANS_GOOGLE,
  name: "Google",
  capabilities: {
    builtin: true,
    machine: true,
    ai: false,
    mulkeys: false,
    batch: true,
    context: false,
    stream: false,
    darkIcon: false,
    sponsor: false,
  },
  thinking: null,
  buildRequest({ texts, from, to, url, key }) {
    // Google2 的 translateHtml 接口使用 protobuf 风格的 JSON 数组，
    // 第一项是 [文本数组, 源语言, 目标语言]，第二项固定为 wt_lib。
    const body = [[texts, from || "auto", to], "wt_lib"];
    const headers = {
      "Content-Type": "application/json+protobuf",
    };
    if (key) {
      headers["X-Goog-API-Key"] = key;
    }

    return { url, body, headers, method: "POST" };
  },
  parseTranslate(res) {
    if (!Array.isArray(res?.[0])) return [];
    return res[0].map((text, index) => [text || "", res?.[1]?.[index] || ""]);
  },
};
