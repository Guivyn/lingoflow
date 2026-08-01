import { OPT_TRANS_GOOGLE, OPT_TRANS_GOOGLE_2, OPT_TRANS_MICROSOFT, OPT_TRANS_DEEPL, OPT_TRANS_DEEPLX, OPT_TRANS_DEEPSEEK, OPT_TRANS_OPENAI, OPT_TRANS_CUSTOMIZE } from "../config";
import { googleProvider } from "./google";
import { google2Provider } from "./google2";
import { microsoftProvider } from "./microsoft";
import { deeplProvider } from "./deepl";
import { deeplxProvider } from "./deeplx";
import { openaiProvider } from "./openai";
import { deepseekProvider } from "./deepseek";
import { customProvider } from "./custom";

export const PROVIDER_MAP = {
  [OPT_TRANS_GOOGLE]: googleProvider,
  [OPT_TRANS_GOOGLE_2]: google2Provider,
  [OPT_TRANS_MICROSOFT]: microsoftProvider,
  [OPT_TRANS_DEEPL]: deeplProvider,
  [OPT_TRANS_DEEPLX]: deeplxProvider,
  [OPT_TRANS_DEEPSEEK]: deepseekProvider,
  [OPT_TRANS_OPENAI]: openaiProvider,
  [OPT_TRANS_CUSTOMIZE]: customProvider,
};

export const getProvider = (apiType) => PROVIDER_MAP[apiType] || null;

export const getProviderCapability = (apiType, key) =>
  Boolean(getProvider(apiType)?.capabilities?.[key]);

export const getProviderThinking = (apiType) =>
  getProvider(apiType)?.thinking || null;

export const getAllProviders = () => Object.values(PROVIDER_MAP);
