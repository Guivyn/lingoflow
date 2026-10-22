import { getFetchPool, clearFetchPool } from "./pool";
import { RequestError } from "./requestError";

test("cancelling a retry wait removes its timer and prevents delayed replay", async () => {
  jest.useFakeTimers();
  const controller = new AbortController();
  const task = jest
    .fn()
    .mockRejectedValue(new RequestError("temporary", { retryable: true }));
  const pending = getFetchPool(0, 1, "cancel-retry").push(task, {
    opts: { signal: controller.signal },
  });
  const caught = pending.catch((error) => error);
  jest.advanceTimersByTime(1);
  for (let i = 0; i < 20; i++) await Promise.resolve();
  expect(task).toHaveBeenCalledTimes(1);
  controller.abort();
  expect((await caught).name).toBe("AbortError");
  jest.advanceTimersByTime(10000);
  for (let i = 0; i < 20; i++) await Promise.resolve();
  expect(task).toHaveBeenCalledTimes(1);
  clearFetchPool();
  jest.useRealTimers();
});

test("429 cools down fresh tasks in the same API pool and preserves its concurrency cap", async () => {
  jest.useFakeTimers();
  jest.setSystemTime(100000);
  const pool = getFetchPool(0, 1, "rate-limited");
  const starts = [];
  const first = jest
    .fn()
    .mockImplementationOnce(async () => {
      starts.push(Date.now());
      throw new RequestError("limited", {
        status: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter: 5000,
      });
    })
    .mockImplementation(async () => {
      starts.push(Date.now());
      return "recovered";
    });
  const pending = [
    pool.push(first, {}),
    pool.push(async () => {
      starts.push(Date.now());
      return "fresh";
    }, {}),
  ];
  const advance = async (ms) => {
    jest.advanceTimersByTime(ms);
    for (let i = 0; i < 20; i++) await Promise.resolve();
  };
  await advance(1);
  expect(starts).toHaveLength(1);
  await advance(4990);
  expect(starts).toHaveLength(1);
  for (let i = 0; i < 10; i++) await advance(10);
  expect(await Promise.all(pending)).toEqual(["recovered", "fresh"]);
  expect(starts.slice(1).every((time) => time >= 105000)).toBe(true);
  clearFetchPool();
  jest.useRealTimers();
});
