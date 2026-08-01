import { OPT_TRANS_DEEPL } from "../../config";

export const deeplProvider = {
  apiType: OPT_TRANS_DEEPL,
  name: "DeepL",
  capabilities: {
    builtin: true,
    machine: true,
    ai: false,
    mulkeys: true,
    batch: true,
    context: false,
    stream: false,
    darkIcon: true,
    sponsor: false,
  },
  thinking: null,
  buildRequest({ texts, from, to, url, key }) {
    const body = {
      text: texts,
      target_lang: to,
      source_lang: from,
    };
    const headers = {
      "Content-type": "application/json",
      Authorization: `DeepL-Auth-Key ${key}`,
    };

    return { url, body, headers };
  },
  parseTranslate(res) {
    return res?.translations?.map((item) => [
      item.text,
      item.detected_source_language,
    ]);
  },
};
