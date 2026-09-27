import { DEFAULT_FETCH_INTERVAL, DEFAULT_FETCH_LIMIT } from "../config";
import { appLog } from "./log";

/**
 * 任务池（TaskPool）
 * 用于控制异步任务（如网络请求）的并发数、最小执行间隔和重试机制，防止请求过于密集被翻译服务封禁。
 */
class TaskPool {
  #pool = []; // 待执行的任务队列

  #maxRetry = 2; // 最大重试次数
  #retryInterval = 1000; // 发生错误时的重试间隔时间（毫秒）
  #limit; // 最大并发限制数
  #interval; // 任务最小启动时间间隔（毫秒），防止请求过于高频
  #retryTimers = new Map(); // 重试定时器，用于 clear() 时统一取消

  #currentConcurrent = 0; // 当前正在执行的任务数
  #lastExecutionTime = 0; // 上一个任务的启动时间戳，用于计算延迟
  #schedulerTimer = null; // 用于调度下一个任务的延迟定时器

  /**
   * 构造函数
   * @param {number} interval - 任务最小启动间隔
   * @param {number} limit - 最大并发数
   * @param {number} retryInterval - 失败重试间隔
   */
  constructor(
    interval = DEFAULT_FETCH_INTERVAL,
    limit = DEFAULT_FETCH_LIMIT,
    retryInterval = 1000
  ) {
    this.#interval = interval;
    this.#limit = limit;
    this.#retryInterval = retryInterval;
  }

  /**
   * 调度器
   * 负责从队列中取出任务，并在满足并发限制和时间间隔约束时执行它。
   */
  #scheduleNext() {
    // 如果已经有调度定时器正在等待，则不再重复调度
    if (this.#schedulerTimer) {
      return;
    }

    // 如果当前并发数已达上限，或者队列中已无任务，则无需调度
    if (this.#currentConcurrent >= this.#limit || this.#pool.length === 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLast = now - this.#lastExecutionTime;
    // 计算距离上一次任务启动是否已满足最小间隔，如果不满足则计算所需延迟
    const delay = Math.max(0, this.#interval - timeSinceLast);

    this.#schedulerTimer = setTimeout(() => {
      this.#schedulerTimer = null;
      // 在定时器触发后，重新检查并发限制和队列状态
      if (this.#currentConcurrent < this.#limit && this.#pool.length > 0) {
        const task = this.#pool.shift();
        if (task) {
          this.#lastExecutionTime = Date.now();
          this.#execute(task);
        }
      }

      // 如果队列中还有任务，继续调度下一个
      if (this.#pool.length > 0) {
        this.#scheduleNext();
      }
    }, delay);
  }

  /**
   * 执行单个任务
   * @param {object} task - 任务对象，包含执行函数、参数、Promise的回调和当前重试次数
   */
  async #execute(task) {
    this.#currentConcurrent++;
    const { fn, args, resolve, reject, retry } = task;

    try {
      // 执行传入的异步任务函数
      const res = await fn(args);
      resolve(res);
    } catch (err) {
      appLog("task pool", err);
      if (err?.name === "AbortError") {
        reject(err);
        return;
      }
      // 如果发生异常且重试次数未达到上限，则安排延迟重试
      if (retry < this.#maxRetry) {
        const retryTimer = setTimeout(() => {
          this.#retryTimers.delete(retryTimer);
          // 将重试的任务重新放入队列头部，以保证重试任务优先被执行
          this.#pool.unshift({ ...task, retry: retry + 1 });
          this.#scheduleNext();
        }, this.#retryInterval);
        this.#retryTimers.set(retryTimer, task);
      } else {
        // 达到最大重试次数后，抛出错误并拒绝 Promise
        reject(err);
      }
    } finally {
      // 任务结束，并发数递减，触发下一次调度
      this.#currentConcurrent--;
      this.#scheduleNext();
    }
  }

  /**
   * 向任务池中添加一个新任务
   * @param {Function} fn - 要执行的异步函数
   * @param {*} args - 函数的参数
   * @returns {Promise} 返回一个在任务完成后 resolve 的 Promise
   */
  push(fn, args) {
    return new Promise((resolve, reject) => {
      this.#pool.push({ fn, args, resolve, reject, retry: 0 });
      this.#scheduleNext();
    });
  }

  /**
   * 清空任务池
   */
  clear() {
    // 拒绝队列中所有等待执行的任务
    for (const task of this.#pool) {
      task.reject("the task pool was cleared");
    }
    for (const [timer, task] of this.#retryTimers) {
      clearTimeout(timer);
      task.reject("the task pool was cleared");
    }

    // 清空任务队列
    this.#pool.length = 0;
    this.#retryTimers.clear();
    // 取消挂起的调度定时器
    if (this.#schedulerTimer) {
      clearTimeout(this.#schedulerTimer);
      this.#schedulerTimer = null;
    }
  }
}

/**
 * 跨接口共享的并发闸门，防止多个独立请求池的并发上限叠加失控。
 */
class ConcurrencyGate {
  #limit;
  #active = 0;
  #queue = [];

  constructor(limit) {
    this.#limit = limit;
  }

  run(fn, args) {
    return new Promise((resolve, reject) => {
      this.#queue.push({ fn, args, resolve, reject });
      this.#drain();
    });
  }

  #drain() {
    while (this.#active < this.#limit && this.#queue.length > 0) {
      const task = this.#queue.shift();
      this.#active++;
      Promise.resolve()
        .then(() => task.fn(task.args))
        .then(task.resolve, task.reject)
        .finally(() => {
          this.#active--;
          this.#drain();
        });
    }
  }

  clear() {
    const error = new DOMException(
      "The global request queue was cleared.",
      "AbortError"
    );
    for (const task of this.#queue) {
      task.reject(error);
    }
    this.#queue.length = 0;
  }
}

const MAX_GLOBAL_FETCH_CONCURRENCY = 100;
const globalFetchGate = new ConcurrencyGate(MAX_GLOBAL_FETCH_CONCURRENCY);

export const runWithGlobalFetchLimit = (fn, args) =>
  globalFetchGate.run(fn, args);

/**
 * 请求池按接口标识和限流设置复用，避免不同接口互相覆盖并发参数。
 */
const fetchPools = new Map();

const normalizePoolSettings = (interval, limit) => {
  const parsedInterval = Number(interval ?? DEFAULT_FETCH_INTERVAL);
  const parsedLimit = Number(limit ?? DEFAULT_FETCH_LIMIT);

  return {
    interval:
      Number.isFinite(parsedInterval) && parsedInterval >= 0
        ? Math.min(5000, Math.floor(parsedInterval))
        : DEFAULT_FETCH_INTERVAL,
    limit:
      Number.isFinite(parsedLimit) && parsedLimit >= 1
        ? Math.min(100, Math.floor(parsedLimit))
        : DEFAULT_FETCH_LIMIT,
  };
};

/**
 * 获取当前接口配置对应的请求池实例
 * @param {number} [interval] - 任务最小启动间隔
 * @param {number} [limit] - 最大并发数
 * @param {string} [poolKey] - 请求池隔离键，通常为翻译接口 slug
 * @returns {TaskPool}
 */
export const getFetchPool = (interval, limit, poolKey = "default") => {
  const settings = normalizePoolSettings(interval, limit);
  const key = JSON.stringify([
    String(poolKey || "default"),
    settings.interval,
    settings.limit,
  ]);
  if (!fetchPools.has(key)) {
    fetchPools.set(key, new TaskPool(settings.interval, settings.limit));
  }
  return fetchPools.get(key);
};

/**
 * 清空全局请求池中的所有任务
 */
export const clearFetchPool = () => {
  globalFetchGate.clear();
  for (const pool of fetchPools.values()) {
    pool.clear();
  }
  fetchPools.clear();
};
