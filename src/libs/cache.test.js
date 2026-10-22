jest.mock("../config", () => ({
  CACHE_NAME: "test-cache",
  DEFAULT_CACHE_TIMEOUT: 604800,
}));
jest.mock("./storage", () => ({ getSetting: jest.fn() }));
jest.mock("./client", () => ({ isExt: false }));
jest.mock("./browser", () => ({ isBg: () => true }));
jest.mock("./msg", () => ({ sendBgMsg: jest.fn() }));
jest.mock("./utils", () => ({ sha256: jest.fn() }));
jest.mock("./log", () => ({ appLog: jest.fn() }));
jest.mock("./response", () => ({
  parseResponse: async (response) => JSON.parse(response.body),
}));

const { getSetting } = require("./storage");
const { getHttpCache, putHttpCache, tryClearCaches } = require("./cache");
let entries;
let now;
const input = "https://cache.example/a";

beforeAll(() => {
  global.Request = class {
    constructor(url, init = {}) {
      this.url = url;
      this.method = init.method || "GET";
    }
  };
  global.Response = class {
    constructor(body, init) {
      this.body = body;
      this.headers = { get: (key) => init.headers[key] ?? null };
    }
  };
});

beforeEach(async () => {
  entries = new Map();
  now = 1000000;
  jest.spyOn(Date, "now").mockImplementation(() => now);
  const cache = {
    keys: async () => [...entries.keys()].map((url) => new Request(url)),
    match: async (request) => entries.get(request.url),
    delete: async (request) => entries.delete(request.url),
    put: async (request, response) => entries.set(request.url, response),
  };
  global.caches = {
    open: async () => cache,
    delete: jest.fn(async () => {
      entries.clear();
      return true;
    }),
  };
  getSetting.mockResolvedValue({ cacheMaxAge: 10, cacheMaxEntries: 2 });
  await tryClearCaches();
});
afterEach(() => jest.restoreAllMocks());

test("reads before expiry and deletes at expiry, with persisted timestamps", async () => {
  await putHttpCache({ input, data: { text: "cached" } });
  expect(entries.get(input).headers.get("X-LingoFlow-Created-At")).toBe(
    String(now)
  );
  expect(entries.get(input).headers.get("X-LingoFlow-Expires-At")).toBe(
    String(now + 10000)
  );
  now += 9999;
  expect(await getHttpCache({ input })).toEqual({ text: "cached" });
  now += 1;
  expect(await getHttpCache({ input })).toBeNull();
  expect(entries.size).toBe(0);
});

test("permanent entries survive time but a shorter current policy immediately expires them", async () => {
  getSetting.mockResolvedValue({ cacheMaxAge: 0, cacheMaxEntries: 2 });
  await putHttpCache({ input, data: "permanent" });
  now += 100000000;
  expect(await getHttpCache({ input })).toBe("permanent");
  getSetting.mockResolvedValue({ cacheMaxAge: 1, cacheMaxEntries: 2 });
  expect(await getHttpCache({ input })).toBeNull();
});

test("legacy entries without metadata are invalidated, including unread entries during sweep", async () => {
  entries.set(input, new Response('"legacy"', { headers: {} }));
  expect(
    await getHttpCache({ input: "https://cache.example/other" })
  ).toBeNull();
  expect(entries.size).toBe(0);
});

test("concurrent writes obey FIFO capacity and policy reductions immediately prune", async () => {
  await Promise.all(
    ["a", "b", "c"].map((id) =>
      putHttpCache({ input: `https://cache.example/${id}`, data: id })
    )
  );
  expect([...entries.keys()]).toEqual([
    "https://cache.example/b",
    "https://cache.example/c",
  ]);
  getSetting.mockResolvedValue({ cacheMaxAge: 10, cacheMaxEntries: 1 });
  await getHttpCache({ input: "https://cache.example/c" });
  expect(entries.size).toBe(1);
});

test("clear waits for queued writes, clears storage and propagates deletion failure", async () => {
  await Promise.all([
    putHttpCache({ input, data: "pending" }),
    tryClearCaches(),
  ]);
  expect(entries.size).toBe(0);
  expect(await getHttpCache({ input })).toBeNull();
  global.caches.delete.mockRejectedValueOnce(new Error("storage failure"));
  await expect(tryClearCaches()).rejects.toThrow("storage failure");
});
