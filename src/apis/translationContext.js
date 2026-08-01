import { DEFAULT_CONTEXT_SIZE } from "../config";

// 全局缓存各翻译平台实例的最近翻译上下文
const contextMap = new Map();

/**
 * 闭包封装的单通道最近翻译上下文环形队列。
 * 只保留最近几次（默认 3 次）翻译的原文、译文与语言对，供后续翻译参考。
 * @param {number} maxSize 上下文的最大消息条数，超出时自动剔除最早的历史
 */
const TranslationContext = (maxSize = DEFAULT_CONTEXT_SIZE) => {
  const messages = [];

  /**
   * 追加新的翻译上下文，并自动维护队列长度不超过 maxSize
   */
  const add = (...msgs) => {
    messages.push(...msgs.filter(Boolean));
    const extra = messages.length - maxSize;
    if (extra > 0) {
      // 头部截断移除多余的老数据
      messages.splice(0, extra);
    }
  };

  /**
   * 克隆并获取当前存留的所有历史消息数组
   */
  const getAll = () => {
    return [...messages];
  };

  /**
   * 彻底清空历史消息
   */
  const clear = () => {
    messages.length = 0;
  };

  return {
    add,
    getAll,
    clear,
  };
};

/**
 * 单例模式获取指定翻译服务的最近翻译上下文队列。
 * @param {string} apiSlug 翻译服务的唯一标识 (如 "gemini", "openai")
 * @param {number} maxSize 历史上下文的大小阈值
 * @returns {Object} 上下文控制器实例
 */
export const getMsgHistory = (apiSlug, maxSize) => {
  if (contextMap.has(apiSlug)) {
    return contextMap.get(apiSlug);
  }

  const context = TranslationContext(maxSize);
  contextMap.set(apiSlug, context);
  return context;
};

/**
 * 销毁并清除指定翻译服务的最近翻译上下文。
 * @param {string} apiSlug 翻译服务唯一标识
 */
export const clearMsgHistory = (apiSlug) => {
  contextMap.delete(apiSlug);
};
