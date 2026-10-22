jest.mock("./client", () => ({ isExt: true }));
jest.mock("../config", () => ({
  MSG_FETCH: "fetch",
  MSG_CANCEL_FETCH: "cancel",
  DEFAULT_HTTP_TIMEOUT: 30,
  DEFAULT_FETCH_INTERVAL: 0,
  DEFAULT_FETCH_LIMIT: 1,
}));
jest.mock("./browser", () => ({ isBg: () => false }));
jest.mock("./msg", () => ({ sendBgMsg: jest.fn() }));
jest.mock("./storage", () => ({ getSettingWithDefault: jest.fn() }));
jest.mock("./log", () => ({ appLog: jest.fn() }));
jest.mock("./response", () => ({ parseResponse: jest.fn() }));

const { fnPolyfill } = require("./request");
const { createRequestRegistry } = require("./requestRegistry");
const { sendBgMsg } = require("./msg");
const { MSG_FETCH, MSG_CANCEL_FETCH } = require("../config");
const { getFetchPool, clearFetchPool } = require("./pool");
const sender = {
  id: "extension",
  tab: { id: 1 },
  frameId: 0,
  documentId: "doc",
};
const input = "https://example.com/translate";
afterEach(() => {
  clearFetchPool();
  jest.clearAllMocks();
});

test("frontend abort reaches the background controller and removes the request", async () => {
  let backgroundSignal;
  let requestId;
  const registry = createRequestRegistry(
    ({ opts }) =>
      new Promise((resolve, reject) => {
        backgroundSignal = opts.signal;
        opts.signal.addEventListener(
          "abort",
          () => reject(new DOMException("cancelled", "AbortError")),
          { once: true }
        );
      })
  );
  sendBgMsg.mockImplementation((action, args) => {
    if (action === MSG_FETCH) {
      requestId = args.requestId;
      return registry.run(args, sender);
    }
    if (action === MSG_CANCEL_FETCH)
      return Promise.resolve(registry.cancel(args, sender));
    throw new Error("unexpected action");
  });
  const controller = new AbortController();
  const request = fnPolyfill({ input, opts: { signal: controller.signal } });
  const rejected = request.catch((error) => error);
  await Promise.resolve();
  controller.abort();
  expect(await rejected).toMatchObject({ name: "AbortError" });
  expect(backgroundSignal.aborted).toBe(true);
  await Promise.resolve();
  expect(registry.cancel({ requestId }, sender)).toBe(false);
});

test("already cancelled requests never send a fetch message", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    fnPolyfill({ input, opts: { signal: controller.signal } })
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(sendBgMsg).not.toHaveBeenCalled();
});

test("successful and failed requests clean up registry and frontend listener", async () => {
  const registry = createRequestRegistry(
    jest
      .fn()
      .mockResolvedValueOnce("ok")
      .mockRejectedValueOnce(new Error("failed"))
  );
  expect(await registry.run({ input, requestId: "one" }, sender)).toBe("ok");
  expect(registry.cancel({ requestId: "one" }, sender)).toBe(false);
  await expect(
    registry.run({ input, requestId: "two" }, sender)
  ).rejects.toThrow("failed");
  expect(registry.cancel({ requestId: "two" }, sender)).toBe(false);
  sendBgMsg.mockResolvedValue("ok");
  const controller = new AbortController();
  const remove = jest.spyOn(controller.signal, "removeEventListener");
  await fnPolyfill({ input, opts: { signal: controller.signal } });
  await Promise.resolve();
  expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  remove.mockRestore();
});

test("another document cannot cancel a request with the same ID", async () => {
  let resolve;
  let signal;
  const registry = createRequestRegistry(({ opts }) => {
    signal = opts.signal;
    return new Promise((done) => {
      resolve = done;
    });
  });
  const pending = registry.run({ input, requestId: "id" }, sender);
  expect(
    registry.cancel({ requestId: "id" }, { ...sender, documentId: "other" })
  ).toBe(false);
  expect(signal.aborted).toBe(false);
  resolve("ok");
  await pending;
});

test("cancelled queued task rejects immediately and never executes", async () => {
  const pool = getFetchPool(0, 1, "cancel-test");
  let release;
  const active = pool.push(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
    {}
  );
  await new Promise((resolve) => setTimeout(resolve, 10));
  const controller = new AbortController();
  const execute = jest.fn();
  const queued = pool.push(execute, { opts: { signal: controller.signal } });
  const rejected = queued.catch((error) => error);
  controller.abort();
  expect(await rejected).toMatchObject({ name: "AbortError" });
  release();
  await active;
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(execute).not.toHaveBeenCalled();
});
