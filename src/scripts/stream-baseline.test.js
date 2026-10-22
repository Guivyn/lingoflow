// Opt-in controlled scheduling benchmark; no network, credentials or page content is recorded.
jest.mock("@streamparser/json", () => ({
  JSONParser: class {
    write() {}
    end() {}
  },
}));
jest.mock("query-string", () => ({
  stringify: (obj) => new URLSearchParams(obj).toString(),
}));
jest.mock("../libs/requestStream", () => ({ requestStream: jest.fn() }));
jest.mock("../libs/cacheDigest", () => ({
  getCacheDigest: async (text) =>
    require("crypto").createHash("sha256").update(text).digest("hex"),
}));
jest.mock("../libs/cache", () => ({
  getHttpCachePolyfill: async () => null,
  putHttpCachePolyfill: jest.fn(),
}));
jest.mock("../libs/docInfo", () => ({ getDocInfo: () => ({}) }));

const { DomScanner } = require("../core/scanner/DomScanner");
const { DomKit } = require("../core/dom/DomKit");
const { apiTranslate } = require("../services");
const { DEFAULT_API_LIST, defaultSystemPromptLines } = require("../config");
const { requestStream } = require("../libs/requestStream");
const { clearAllBatchQueue } = require("../libs/batchQueue");
const { clearFetchPool } = require("../libs/pool");
const fs = require("fs");
const path = require("path");
const benchmark = process.env.LINGOFLOW_BENCH_PHASE ? test : test.skip;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

benchmark(
  "controlled scanner → service → batch → request pool → stream parser baseline",
  async () => {
    jest.useFakeTimers();
    jest.setSystemTime(100000);
    const runs = [];
    for (const concurrency of [1, 2, 4]) {
      const start = Date.now();
      const results = [];
      const submitted = [];
      const requests = [];
      const inflight = [];
      let active = 0;
      let observer;
      global.IntersectionObserver = class {
        constructor(callback) {
          observer = callback;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      };
      document.body.innerHTML =
        '<main id="root">' +
        Array.from(
          { length: 12 },
          (_, i) =>
            `<p data-id="${i}">English paragraph number ${i} with enough text.</p>`
        ).join("") +
        "</main>";
      const paragraphs = [...document.querySelectorAll("p")];
      paragraphs.forEach((paragraph, index) => {
        paragraph.getBoundingClientRect = () => ({
          top: index * 150 + 10,
          bottom: index * 150 + 110,
        });
      });
      const apiSetting = {
        ...DEFAULT_API_LIST.find((api) => api.apiType === "OpenAI"),
        apiSlug: `benchmark-${concurrency}`,
        key: "synthetic",
        model: "synthetic",
        systemPrompt: defaultSystemPromptLines,
        useStream: true,
        streamRenderMode: "realtime",
        useBatchFetch: true,
        useContext: false,
        batchSize: 20,
        batchLength: 10000,
        batchInterval: 150,
        batchConcurrency: concurrency,
        fetchInterval: 100,
        fetchLimit: concurrency,
      };
      requestStream.mockImplementation(async function* (url, init) {
        const body = JSON.parse(init.body);
        const segments = JSON.parse(
          body.messages[body.messages.length - 1].content
        ).segments;
        active++;
        const request = {
          startMs: Date.now() - start,
          paragraphs: segments.map((s) =>
            Number(s.text.match(/number (\d+)/)[1])
          ),
          active,
        };
        requests.push(request);
        try {
          await sleep(180);
          for (const segment of segments) {
            for (const content of [`${segment.id} | `, "译", "文\n"]) {
              await sleep(20);
              yield JSON.stringify({ choices: [{ delta: { content } }] });
            }
          }
        } finally {
          active--;
          request.endMs = Date.now() - start;
        }
      });
      const signal = new AbortController().signal;
      const scanner = new DomScanner({
        rule: {
          rootsSelector: "#root",
          autoScan: "true",
          scanAll: "false",
          hasShadowroot: "false",
        },
        setting: { transInterval: 100 },
        translationTagName: "lingoflow",
        getIgnoreSelector: () => ".notranslate",
        getState: () => ({
          enabled: true,
          transAllnow: false,
          rootMargin: 2000,
        }),
        isElementOrFragment: DomKit.isElementOrFragment,
        isBlockNode: DomKit.isBlockNode,
        hasBlockNode: DomKit.hasBlockNode,
        shouldBreak: () => false,
        onNode: (node) => {
          const id = Number(node.dataset.id);
          if (!Number.isFinite(id) || submitted.includes(id)) return;
          submitted.push(id);
          const pending = apiTranslate({
            text: node.textContent,
            fromLang: "en",
            toLang: "zh-CN",
            apiSetting,
            docInfo: {},
            useCache: false,
            signal,
            requestPriority: id,
            onStreamChunk: (chunk) => {
              if (
                /译/.test(String(chunk.text)) &&
                !results.some((r) => r.id === id)
              )
                results.push({ id, firstWordMs: Date.now() - start });
            },
          }).then(() => {
            results.find((r) => r.id === id).completeMs = Date.now() - start;
          });
          inflight.push(pending);
        },
      });
      scanner.init();
      // Deliberately unsorted observer delivery, followed by repeated callbacks.
      const order = [7, 6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8];
      order.forEach((id, index) =>
        setTimeout(
          () => observer([{ target: paragraphs[id], isIntersecting: true }]),
          index * 10
        )
      );
      for (let tick = 0; tick < 800; tick++) {
        jest.advanceTimersByTime(5);
        for (let micro = 0; micro < 35; micro++) await Promise.resolve();
        if (results.length === 12 && results.every((r) => r.completeMs != null))
          break;
      }
      await Promise.all(inflight);
      expect(results).toHaveLength(12);
      runs.push({
        concurrency,
        firstWordMs: Math.min(...results.map((r) => r.firstWordMs)),
        topParagraphFirstWordMs: results.find((r) => r.id === 0).firstWordMs,
        firstScreenCompleteMs: Math.max(
          ...results.filter((r) => r.id < 5).map((r) => r.completeMs)
        ),
        allCompleteMs: Math.max(...results.map((r) => r.completeMs)),
        requestCount: requests.length,
        maxActive: Math.max(...requests.map((r) => r.active)),
        submitted,
        outputOrder: results.map((r) => r.id),
        requests,
        paragraphs: results,
      });
      scanner.reset();
      clearAllBatchQueue();
      clearFetchPool();
      jest.clearAllTimers();
    }
    fs.mkdirSync(path.join(process.cwd(), "docs/performance"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(
        process.cwd(),
        `docs/performance/${process.env.LINGOFLOW_BENCH_PHASE}.json`
      ),
      JSON.stringify(
        {
          kind: "controlled virtual-clock benchmark; no live provider or browser paint measurements",
          node: process.version,
          fixture:
            "12 paragraphs; observer interval 10ms; scanner interval 100ms; batch wait 150ms; provider TTFB 180ms; token interval 20ms; cold cache",
          runs,
        },
        null,
        2
      ) + "\n"
    );
    jest.useRealTimers();
  },
  20000
);
