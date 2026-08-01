import { useEffect, useState, useCallback } from "react";

/**
 * 自定义异步操作封装 Hook，管理数据、加载态及错误状态
 */
const useAsync = () => {
  const [data, setData] = useState(null); // 执行成功返回的数据
  const [loading, setLoading] = useState(false); // 加载状态标识
  const [error, setError] = useState(null); // 错误消息

  // 触发异步执行的入口函数
  const execute = useCallback(async (fn, ...args) => {
    if (!fn) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fn(...args);
      setData(res);
      setLoading(false);
      return res;
    } catch (err) {
      setError(err?.message || "An unknown error occurred");
      setLoading(false);
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

  // REVIEW: 此处未对竞态条件(Race Condition)进行处理。
  // 若引用的 fn 或 arg 发生快速变化，前一次执行的 execute 回调在后一次执行之后才返回，
  // 依然会触发 setData 将旧的/过期的数据覆盖最新的结果。
  // 建议增加清理标识（如 let ignore = false），在依赖变化时执行清理以忽略过期请求。
  useEffect(() => {
    if (fn) {
      execute(fn, arg);
    }
  }, [execute, fn, arg]);

  return { ...asyncState };
};

