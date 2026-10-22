jest.mock("query-string", () => ({
  stringify: (value) => new URLSearchParams(value).toString(),
}));
jest.mock("../libs/cacheDigest", () => ({
  getCacheDigest: async (text) =>
    require("crypto").createHash("sha256").update(text).digest("hex"),
}));
jest.mock("../libs/fetch", () => ({}));
jest.mock("./langdetect", () => ({ apiGoogleLangdetect: jest.fn() }));
jest.mock("../libs/docInfo", () => ({ getDocInfo: jest.fn() }));
jest.mock("../providers/translation", () => ({
  handleTranslate: jest.fn(),
  handleDict: jest.fn(),
  handleSummarize: jest.fn(),
  handleSubtitle: jest.fn(),
  formatIndexSubtitleEvents: (events) =>
    events.map((event, id) => ({ id, text: event.text })),
  buildSubtitleSystemPrompt: (args) => JSON.stringify(args),
  summarizeSystemPrompt: "summary system prompt",
}));
jest.mock("../libs/cache", () => ({
  getHttpCachePolyfill: jest.fn(),
  putHttpCachePolyfill: jest.fn(),
}));
jest.mock("../libs/batchQueue", () => ({
  getBatchQueue: jest.fn(),
  normalizeBatchOptions: jest.fn(),
}));

const { apiTranslate } = require("./index");
const { handleTranslate } = require("../providers/translation");
const { getHttpCachePolyfill } = require("../libs/cache");
const { getBatchQueue } = require("../libs/batchQueue");

beforeEach(() => jest.clearAllMocks());

test("Chinese targeting Chinese bypasses cache, batch queue and provider with a fixed English source", async () => {
  const text = "醒来看见这一幕 感觉身体暖暖的...";
  const result = await apiTranslate({ text, fromLang: "en", toLang: "zh-CN" });
  expect(result).toMatchObject({ trText: text, isSame: true, srCode: "zh-CN" });
  expect(getHttpCachePolyfill).not.toHaveBeenCalled();
  expect(getBatchQueue).not.toHaveBeenCalled();
  expect(handleTranslate).not.toHaveBeenCalled();
});

test("translation cache hits identical settings and separates output configuration and full context", async () => {
  const { putHttpCachePolyfill } = require("../libs/cache");
  const cache = new Map();
  getHttpCachePolyfill.mockImplementation(async (key) => cache.get(key));
  putHttpCachePolyfill.mockImplementation((key, init, data) =>
    cache.set(key, data)
  );
  handleTranslate.mockImplementation(async function* () {
    yield { id: 0, result: "译文" };
  });
  const args = {
    text: "Hello world",
    toLang: "zh-CN",
    apiSetting: {
      apiType: "OpenAI",
      apiSlug: "same",
      model: "model-a",
      url: "https://example.com",
      key: "SECRET_KEY",
      useBatchFetch: false,
    },
    docInfo: { summary: "x".repeat(50) + "first" },
  };
  await apiTranslate(args);
  await apiTranslate(args);
  expect(handleTranslate).toHaveBeenCalledTimes(1);
  for (const patch of [
    { model: "model-b" },
    { url: "https://other.example.com" },
    { nobatchPrompt: "new prompt" },
  ]) {
    await apiTranslate({
      ...args,
      apiSetting: { ...args.apiSetting, ...patch },
    });
  }
  await apiTranslate({
    ...args,
    docInfo: { summary: "x".repeat(50) + "second" },
  });
  expect(handleTranslate).toHaveBeenCalledTimes(5);
  expect([...cache.keys()].join(" ")).not.toContain("SECRET_KEY");
});

test("dictionary, subtitles and summary use configuration-aware versioned identities", async () => {
  const { apiDict, apiSubtitle, apiSummarizeContext } = require("./index");
  const {
    handleDict,
    handleSubtitle,
    handleSummarize,
  } = require("../providers/translation");
  const { putHttpCachePolyfill } = require("../libs/cache");
  const cache = new Map();
  getHttpCachePolyfill.mockImplementation(async (key) => cache.get(key));
  putHttpCachePolyfill.mockImplementation((key, init, data) =>
    cache.set(key, data)
  );
  handleDict.mockResolvedValue("definition");
  handleSubtitle.mockResolvedValue([{ text: "译文" }]);
  handleSummarize.mockResolvedValue("summary");
  const apiSetting = {
    apiType: "OpenAI",
    apiSlug: "same",
    model: "a",
    url: "https://example.com",
    dictPrompt: "dictionary",
  };
  const cases = [
    [
      apiDict,
      handleDict,
      { text: "hello", toLang: "zh-CN", context: "first" },
      { context: "second" },
    ],
    [
      apiSubtitle,
      handleSubtitle,
      {
        videoId: "v",
        events: [{ text: "hello", start: 0, end: 1 }],
        toLang: "zh-CN",
      },
      { docInfo: { summary: "changed" } },
    ],
    [
      apiSummarizeContext,
      handleSummarize,
      { videoId: "v", transcript: "first" },
      { transcript: "second" },
    ],
  ];
  for (const [call, provider, input, changed] of cases) {
    await call({ ...input, apiSetting });
    await call({ ...input, apiSetting });
    expect(provider).toHaveBeenCalledTimes(1);
    await call({ ...input, apiSetting: { ...apiSetting, model: "b" } });
    await call({
      ...input,
      apiSetting: { ...apiSetting, url: "https://other.example.com" },
    });
    await call({ ...input, ...changed, apiSetting });
    expect(provider).toHaveBeenCalledTimes(4);
  }
  for (const key of cache.keys()) expect(key).toContain("cacheVer=1");
});
