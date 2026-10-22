import { normalizeSetting } from "./schema";
import { API_LIMITS } from "./constraints";
import { DEFAULT_SHORTCUTS } from "../../config/setting";
import {
  normalizeBatchOptions,
  getBatchQueue,
  clearAllBatchQueue,
} from "../../libs/batchQueue";

test("settings and batch runtime share numeric rules and normalization is idempotent", () => {
  const setting = {
    transApis: [
      { apiSlug: "a", apiType: "OpenAI", batchInterval: "0", batchSize: 999 },
    ],
  };
  const normalized = normalizeSetting(setting);
  expect(normalized.transApis[0].batchInterval).toBe(0);
  expect(normalized.transApis[0].batchSize).toBe(API_LIMITS.batchSize.max);
  expect(normalizeBatchOptions(normalized.transApis[0]).batchInterval).toBe(0);
  expect(normalizeSetting(normalized)).toBe(normalized);
});

test("nested settings and provider capabilities normalize with field diagnostics", () => {
  const issues = [];
  const normalized = normalizeSetting(
    {
      subtitleSetting: {
        enabled: "false",
        chunkLength: -1,
        useAlgorithmBreaker: "bad",
        windowStyle: "color: red",
      },
      shortcuts: { toggleTranslate: ["not-a-key"] },
      transApis: [
        { apiSlug: "g", apiType: "Google", useStream: true, useContext: true },
      ],
    },
    { issues }
  );
  expect(normalized.subtitleSetting).toMatchObject({
    enabled: true,
    chunkLength: 200,
    useAlgorithmBreaker: "rule",
    windowStyle: "color: red",
  });
  expect(normalized.shortcuts.toggleTranslate).toEqual(
    DEFAULT_SHORTCUTS.toggleTranslate
  );
  expect(normalized.transApis[0]).toMatchObject({
    useStream: false,
    useContext: false,
  });
  expect(issues.some((issue) => issue.startsWith("subtitleSetting:"))).toBe(
    true
  );
});

test("batch checks compatibility even when callers reuse the same queue key", async () => {
  const batches = [];
  const queue = getBatchQueue(
    "compatibility-check",
    async (texts, args) => {
      batches.push({ texts, args });
      return texts;
    },
    { batchInterval: 0, batchSize: 20 }
  );
  const signal = new AbortController().signal;
  const base = {
    signal,
    apiSetting: { model: "a", url: "https://a", key: "key-a" },
    docInfo: { summary: "a" },
  };
  const tasks = [
    base,
    { ...base },
    { ...base, apiSetting: { ...base.apiSetting, model: "b" } },
    { ...base, apiSetting: { ...base.apiSetting, key: "key-b" } },
    { ...base, docInfo: { summary: "b" } },
  ];
  await Promise.all(
    tasks.map((args, index) => queue.addTask(String(index), args))
  );
  expect(batches.map((batch) => batch.texts)).toEqual([
    ["0", "1"],
    ["2"],
    ["3"],
    ["4"],
  ]);
  clearAllBatchQueue();
});
