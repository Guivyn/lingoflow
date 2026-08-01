import { OPT_TRANS_GOOGLE } from "../../config";
import { stringifyParams } from "../shared";

export const googleProvider = {
  apiType: OPT_TRANS_GOOGLE,
  name: "Google",
  capabilities: {
    builtin: true,
    machine: true,
    ai: false,
    mulkeys: false,
    batch: false,
    context: false,
    stream: false,
    darkIcon: false,
    sponsor: false,
  },
  thinking: null,
  buildRequest({ texts, from, to, url, key }) {
    const params = stringifyParams({
      client: "gtx",
      dt: "t",
      dj: 1,
      ie: "UTF-8",
      sl: from,
      tl: to,
      q: texts.join(" "),
    });
    url = `${url}?${params}`;
    const headers = {
      "Content-type": "application/json",
    };
    if (key) {
      headers.Authorization = `Bearer ${key}`;
    }

    return { url, headers, method: "GET" };
  },
  parseTranslate(res) {
    return [[res?.sentences?.map((item) => item.trans).join(" "), res?.src]];
  },
};
