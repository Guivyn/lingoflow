import Sval from "sval";

const createSval = () =>
  new Sval({
    // 支持的 ECMAScript 语法版本
    // 3 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 或 "latest"
    ecmaVer: "latest",
    // 代码源类型，"script" 表示普通脚本，"module" 表示 ES 模块
    sourceType: "script",
    // 是否开启沙盒模式以隔离运行环境，防止执行恶意代码或污染宿主环境的全局 Window 变量
    sandBox: true,
  });

/**
 * 每次 Hook 执行都创建独立实例，避免共享沙盒上下文导致跨请求状态污染。
 */
export const createInterpreter = () => createSval();

/**
 * 兼容旧调用方的共享实例；新代码请使用 createInterpreter。
 */
export const interpreter = createSval();
