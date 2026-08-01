import { OPT_TRANS_OPENAI } from "../../config";
import { injectThinking, parseAIRes, parseSTRes } from "../shared";

export const openaiProvider = {
  apiType: OPT_TRANS_OPENAI,
  name: "OpenAI",
  capabilities: {
    builtin: true,
    machine: false,
    ai: true,
    mulkeys: true,
    batch: true,
    context: true,
    stream: true,
    darkIcon: true,
    sponsor: false,
  },
  thinking: {
    type: "openai",
    efforts: [
      { value: "xhigh", label: "X-High" },
      { value: "high", label: "High" },
      { value: "medium", label: "Medium" },
      { value: "low", label: "Low" },
      { value: "minimal", label: "Minimal" },
    ],
  },
  buildRequest({
    url,
    key,
    systemPrompt,
    userPrompt,
    model,
    temperature,
    maxTokens,
    hisMsgs = [],
    useStream = false,
    thinkingMode,
    thinkingEffort,
  }) {
    const userMsg = {
      role: "user",
      content: userPrompt,
    };
    const body = {
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...hisMsgs,
        userMsg,
      ],
      temperature,
      max_completion_tokens: maxTokens,
      stream: useStream,
    };

    injectThinking(body, {
      thinking: this.thinking,
      thinkingMode,
      thinkingEffort,
    });

    const headers = {
      "Content-type": "application/json",
      Authorization: `Bearer ${key}`,
    };

    return { url, body, headers, userMsg };
  },
  parseTranslate(res, { history, userMsg, useBatchFetch } = {}) {
    const modelMsg = res?.choices?.[0]?.message;
    if (history && userMsg && modelMsg) {
      history.add(userMsg, {
        role: modelMsg.role,
        content: modelMsg.content,
      });
    }
    return parseAIRes(modelMsg?.content, useBatchFetch);
  },
  parseDict(res) {
    return res?.choices?.[0]?.message?.content || "";
  },
  parseSubtitle(res, { events, from } = {}) {
    return parseSTRes(res?.choices?.[0]?.message?.content ?? "", events, from);
  },
  parseSummarize(res) {
    return res?.choices?.[0]?.message?.content?.trim() || "";
  },
  parseStreamDelta(json) {
    return json.choices?.[0]?.delta?.content || "";
  },
};
