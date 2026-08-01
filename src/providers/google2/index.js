import { OPT_TRANS_GOOGLE_2 } from "../../config";

export const google2Provider = {
  apiType: OPT_TRANS_GOOGLE_2,
  name: "Google2",
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
    const body = [[texts, from, to], "wt_lib"];
    const headers = {
      "Content-Type": "application/json+protobuf",
      "X-Goog-API-Key": key,
    };

    return { url, body, headers };
  },
  parseTranslate(res) {
    return res?.[0]?.map((_, i) => [res?.[0]?.[i], res?.[1]?.[i]]);
  },
};
