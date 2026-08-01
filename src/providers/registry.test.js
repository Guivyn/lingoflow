import { OPT_ALL_TRANS_TYPES, API_SPE_TYPES } from "../config";
import {
  PROVIDER_MAP,
  getProvider,
  getProviderCapability,
  getAllProviders,
} from "./index";

describe("ProviderRegistry", () => {
  test("registers every built-in provider", () => {
    expect(getAllProviders()).toHaveLength(OPT_ALL_TRANS_TYPES.length);
    for (const apiType of OPT_ALL_TRANS_TYPES) {
      expect(PROVIDER_MAP[apiType]).toBeDefined();
      expect(getProvider(apiType)).toBe(PROVIDER_MAP[apiType]);
    }
  });

  test("mirrors API_SPE_TYPES capability groups", () => {
    for (const apiType of OPT_ALL_TRANS_TYPES) {
      expect(getProviderCapability(apiType, "machine")).toBe(
        API_SPE_TYPES.machine.has(apiType)
      );
      expect(getProviderCapability(apiType, "ai")).toBe(
        API_SPE_TYPES.ai.has(apiType)
      );
      expect(getProviderCapability(apiType, "stream")).toBe(
        API_SPE_TYPES.stream.has(apiType)
      );
      expect(getProviderCapability(apiType, "context")).toBe(
        API_SPE_TYPES.context.has(apiType)
      );
    }
  });

  test("exposes thinking config only for AI reasoning providers", () => {
    expect(getProvider("OpenAI").thinking?.type).toBe("openai");
    expect(getProvider("DeepSeek").thinking?.type).toBe("deepseek");
    expect(getProvider("Google").thinking).toBeNull();
  });
});
