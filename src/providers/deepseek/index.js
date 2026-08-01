import { OPT_TRANS_DEEPSEEK } from "../../config";
import { openaiProvider } from "../openai";

export const deepseekProvider = {
  ...openaiProvider,
  apiType: OPT_TRANS_DEEPSEEK,
  name: "DeepSeek",
  capabilities: {
    ...openaiProvider.capabilities,
    darkIcon: false,
  },
  thinking: {
    type: "deepseek",
    efforts: [
      { value: "max", label: "Max" },
      { value: "high", label: "High" },
    ],
  },
};
