import { useCallback, useEffect, useState } from "react";
import { storage } from "../libs/storage";
import { appLog } from "../libs/log";

function isSameStorageValue(a, b) {
  if (Object.is(a, b)) return true;

  if (
    a &&
    b &&
    typeof a === "object" &&
    typeof b === "object" &&
    Array.isArray(a) === Array.isArray(b)
  ) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (err) {
      return false;
    }
  }

  return false;
}

/**
 * 在 React 组件生命周期中读写本地 Storage 状态的 Hook。
 *
 * @param {string} key 用于在 Storage 中存取值的键
 * @param {*} defaultVal 默认值。建议在组件外定义为常量。
 * @param {{persist?: boolean}} options 是否由该 Hook 自动写回存储。
 * @returns {{
 * data: *,
 * save: (valueOrFn: any | ((prevData: any) => any)) => void,
 * update: (partialDataOrFn: object | ((prevData: object) => object)) => void,
 * remove: () => Promise<void>,
 * reload: () => Promise<void>,
 * isLoading: boolean,
 * saveStatus: 'idle' | 'saving' | 'saved' | 'error'
 * }}
 */
export function useStorage(key, defaultVal = null, options = {}) {
  const { persist = true } = options;
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [data, setData] = useState(defaultVal);

  // 首次挂载时从本地存储异步加载初始数据
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const storedVal = await storage.getObj(key);
        if (storedVal === undefined || storedVal === null) {
          // 如果存储中没有该值，写入初始默认值
          if (persist) {
            await storage.setObj(key, defaultVal);
          }
        } else if (isMounted) {
          setData(storedVal);
        }
      } catch (err) {
        appLog(`storage load error for key: ${key}`, err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [key, defaultVal, persist]);

  // 选项页、弹窗和内容脚本可能同时运行；外部写入后立即刷新本地状态。
  useEffect(() => {
    const unsubscribe = storage.subscribe(key, (nextValue) => {
      let nextData = nextValue;
      if (typeof nextValue === "string") {
        try {
          nextData = JSON.parse(nextValue);
        } catch (err) {
          appLog(`storage change parse error for key: ${key}`, err);
          return;
        }
      }
      if (nextData === undefined || nextData === null) nextData = defaultVal;
      setData((prevData) =>
        isSameStorageValue(prevData, nextData) ? prevData : nextData
      );
    });
    return unsubscribe;
  }, [key, defaultVal]);

  // 数据发生改变时写入本地 Storage
  useEffect(() => {
    if (!persist || isLoading || data === null) {
      return;
    }

    let active = true;
    setSaveStatus("saving");
    storage
      .setObj(key, data)
      .then(() => {
        if (active) setSaveStatus("saved");
      })
      .catch((err) => {
        if (active) setSaveStatus("error");
        appLog(`storage save error for key: ${key}`, err);
      });
    return () => {
      active = false;
    };
  }, [key, isLoading, data, persist]);

  /**
   * 全量替换状态值并自动触发写盘副作用
   * @param {any | ((prevData: any) => any)} valueOrFn 新的值或一个返回新值的函数。
   */
  const save = useCallback((valueOrFn) => {
    setData((prevData) =>
      typeof valueOrFn === "function" ? valueOrFn(prevData) : valueOrFn
    );
  }, []);

  /**
   * 合并部分对象到当前状态（假设状态是一个对象）。
   * @param {object | ((prevData: object) => object)} partialDataOrFn 要合并的对象或一个返回该对象的函数。
   */
  const update = useCallback((partialDataOrFn) => {
    setData((prevData) => {
      const partialData =
        typeof partialDataOrFn === "function"
          ? partialDataOrFn(prevData)
          : partialDataOrFn;
      const baseObj =
        typeof prevData === "object" && prevData !== null ? prevData : {};
      return { ...baseObj, ...partialData };
    });
  }, []);

  /**
   * 从 Storage 中删除该值，并将状态重置为 null。
   */
  const remove = useCallback(async () => {
    try {
      await storage.del(key);
      setData(null);
    } catch (err) {
      appLog(`storage remove error for key: ${key}`, err);
    }
  }, [key]);

  /**
   * 从 Storage 重新加载数据以覆盖当前状态。
   */
  const reload = useCallback(async () => {
    try {
      const storedVal = await storage.getObj(key);
      const nextData = storedVal ?? defaultVal;
      setData((prevData) =>
        isSameStorageValue(prevData, nextData) ? prevData : nextData
      );
    } catch (err) {
      appLog(`storage reload error for key: ${key}`, err);
    }
  }, [key, defaultVal]);

  return { data, save, update, remove, reload, isLoading, saveStatus };
}
