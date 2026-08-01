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
  buildRequest({ texts, from, to, token }) {
    const params = stringifyParams({
      from,
      to,
      "api-version": "3.0",
    });
    const url = `https://api-edge.cognitive.microsofttranslator.com/translate?${params}`;
    const headers = {
      "Content-type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    const body = texts.map((text) => ({ Text: text }));

    return { url, body, headers };
  },
  parseTranslate(res) {
    return res?.map((item) => [
      item.translations.map((item) => item.text).join(" "),
      item.detectedLanguage?.language,
    ]);
  },
};
