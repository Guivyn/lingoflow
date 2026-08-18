import { OPT_TRANS_MICROSOFT } from "../../config";
import { stringifyParams } from "../shared";

export const microsoftProvider = {
  apiType: OPT_TRANS_MICROSOFT,
  name: "Microsoft",
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
  buildRequest({ texts, from, to }) {
    // Edge 前端内部公开端点：免鉴权，Body 为纯字符串数组；from 留空表示自动检测。
    const params = stringifyParams({
      from: from || "",
      to,
      isEnterpriseClient: false,
    });
    const url = `https://edge.microsoft.com/translate/translatetext?${params}`;
    const headers = {
      "Content-type": "application/json",
    };
    const body = texts;

    return { url, body, headers };
  },
  parseTranslate(res) {
    return res?.map((item) => [
      item.translations.map((item) => item.text).join(" "),
      item.detectedLanguage?.language,
    ]);
  },
};
