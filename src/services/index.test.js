jest.mock("query-string", () => ({}));
jest.mock("../libs/fetch", () => ({}));
jest.mock("./langdetect", () => ({ apiGoogleLangdetect: jest.fn() }));
jest.mock("../libs/docInfo", () => ({ getDocInfo: jest.fn() }));
jest.mock("../providers/translation", () => ({
  handleTranslate: jest.fn(),
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

test("Chinese targeting Chinese bypasses cache, batch queue and provider with a fixed English source", async () => {
  const text = "醒来看见这一幕 感觉身体暖暖的...";
  const result = await apiTranslate({ text, fromLang: "en", toLang: "zh-CN" });
  expect(result).toMatchObject({ trText: text, isSame: true, srCode: "zh-CN" });
  expect(getHttpCachePolyfill).not.toHaveBeenCalled();
  expect(getBatchQueue).not.toHaveBeenCalled();
  expect(handleTranslate).not.toHaveBeenCalled();
});
