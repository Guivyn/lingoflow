import { useEffect, useState, useCallback, useRef } from "react";

/**
 * 自定义异步操作封装 Hook，管理数据、加载态及错误状态
 */
const useAsync = () => {
  const [data, setData] = useState(null); // 执行成功返回的数据
  const [loading, setLoading] = useState(false); // 加载状态标识
  const [error, setError] = useState(null); // 错误消息
  // 请求序号：fn/arg 快速变化时丢弃过期请求的 setState，避免旧结果覆盖新结果。
  const requestIdRef = useRef(0);

  // 触发异步执行的入口函数
  const execute = useCallback(async (fn, ...args) => {
    if (!fn) {
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const res = await fn(...args);
      if (requestIdRef.current === requestId) {
        setData(res);
        setLoading(false);
      }
      return res;
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setError(err?.message || "An unknown error occurred");
        setLoading(false);
      }
      // throw err;
    }
  }, []);

  // 重置状态
  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, execute, reset };
};

/**
 * 立即执行异步任务的 Hook
 * @param {function} fn 异步函数
 * @param {*} arg 传入参数
 */
export const useAsyncNow = (fn, arg) => {
  const { execute, ...asyncState } = useAsync();

  useEffect(() => {
    if (fn) {
      execute(fn, arg);
    }
  }, [execute, fn, arg]);

  return { ...asyncState };
};
