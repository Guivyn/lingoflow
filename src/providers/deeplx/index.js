import { PROVIDER_CAPABILITIES } from "../capabilities";
import { OPT_TRANS_DEEPLX } from "../../config";

export const deeplxProvider = {
  apiType: OPT_TRANS_DEEPLX,
  name: "DeepLX",
  capabilities: PROVIDER_CAPABILITIES.DeepLX,
  thinking: null,
  buildRequest({ texts, from, to, url, key }) {
    const body = {
      text: texts.join(" "),
      target_lang: to,
      source_lang: from,
    };
    const headers = {
      "Content-type": "application/json",
    };
    if (key) {
      headers.Authorization = `Bearer ${key}`;
    }

    return { url, body, headers };
  },
  parseTranslate(res) {
    return [[res?.data, res?.source_lang]];
  },
};
