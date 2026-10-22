jest.mock("./log", () => ({
  appLog: jest.fn(),
  LogLevel: { INFO: { value: 1 } },
}));
jest.mock("./requestError", () => ({
  ...jest.requireActual("./requestError"),
  retryDelay: () => 0,
}));
jest.mock("./requestStream", () => ({ requestStream: jest.fn() }));
jest.mock("@streamparser/json", () => ({ JSONParser: jest.fn() }));
const {
  httpRequestError,
  parseRetryAfter,
  serializeRequestError,
  restoreRequestError,
  normalizeRequestError,
} = require("./requestError");
const { getFetchPool, clearFetchPool } = require("./pool");
const { fetchStream } = require("./fetch");
const { requestStream } = require("./requestStream");
const http = (status, delay = null) =>
  httpRequestError({ status, headers: { get: () => delay } });
afterEach(() => {
  clearFetchPool();
  jest.clearAllMocks();
});

test("authentication and invalid parameters execute once; classification survives serialization", async () => {
  for (const status of [400, 401, 403, 404, 422]) {
    const error = restoreRequestError(serializeRequestError(http(status)));
    const task = jest.fn().mockRejectedValue(error);
    await expect(
      getFetchPool(0, 1, String(status)).push(task, {})
    ).rejects.toMatchObject({ status, retryable: false });
    expect(task).toHaveBeenCalledTimes(1);
  }
});

test("temporary failures recover and permanent failure has at most three attempts", async () => {
  const task = jest
    .fn()
    .mockRejectedValueOnce(http(503))
    .mockResolvedValue("ok");
  expect(await getFetchPool(0, 1, "recover").push(task, {})).toBe("ok");
  expect(task).toHaveBeenCalledTimes(2);
  const failing = jest.fn().mockRejectedValue(http(429));
  await expect(
    getFetchPool(0, 1, "fail").push(failing, {})
  ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  expect(failing).toHaveBeenCalledTimes(3);
});

test("Retry-After seconds and dates are respected within budget; longer waits do not retry early", () => {
  const now = Date.now();
  expect(parseRetryAfter("5", now)).toBe(5000);
  expect(
    parseRetryAfter(new Date(now + 10000).toUTCString(), now)
  ).toBeGreaterThanOrEqual(9000);
  const { retryDelay } = jest.requireActual("./requestError");
  expect(retryDelay(http(429, "5"), 0)).toBe(5000);
  expect(retryDelay(http(503), 1)).toBeGreaterThanOrEqual(2000);
  expect(http(429, "60")).toMatchObject({
    retryAfter: 60000,
    retryable: false,
  });
});

test("abort never retries, network and timeout failures are retryable, unknown errors are not", async () => {
  const task = jest
    .fn()
    .mockRejectedValue(new DOMException("stop", "AbortError"));
  await expect(
    getFetchPool(0, 1, "abort").push(task, {})
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(task).toHaveBeenCalledTimes(1);
  expect(
    normalizeRequestError(new TypeError("Failed to fetch")).retryable
  ).toBe(true);
  expect(normalizeRequestError({ name: "TimeoutError" }).retryable).toBe(true);
  expect(normalizeRequestError(new Error("parser failed")).retryable).toBe(
    false
  );
});

test("stream retries only before any content and refuses replay after partial output", async () => {
  requestStream
    .mockImplementationOnce(async function* () {
      throw http(503);
    })
    .mockImplementationOnce(async function* () {
      yield "hello";
    });
  const chunks = [];
  for await (const chunk of fetchStream(
    "https://example.com",
    {},
    { usePool: true, fetchInterval: 0, fetchLimit: 1 }
  ))
    chunks.push(chunk);
  expect(chunks).toEqual(["hello"]);
  expect(requestStream).toHaveBeenCalledTimes(2);
  requestStream.mockClear();
  requestStream.mockImplementation(async function* () {
    yield "partial";
    throw http(503);
  });
  const consume = async () => {
    for await (const chunk of fetchStream(
      "https://example.com",
      {},
      { usePool: true, fetchInterval: 0, fetchLimit: 1 }
    )) {
      chunks.push(chunk);
    }
  };
  await expect(consume()).rejects.toMatchObject({
    code: "STREAM_INTERRUPTED",
    retryable: false,
  });
  expect(requestStream).toHaveBeenCalledTimes(1);
});
