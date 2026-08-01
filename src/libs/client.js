/**
 * @file client.js
 * @description 根据编译时的环境变量 (REACT_APP_CLIENT) 判定当前运行环境，当前只支持 Chrome 扩展。
 */

import { CLIENT_EXTS, CLIENT_CHROME } from "../config";

export const client = process.env.REACT_APP_CLIENT; // 获取当前的客户端标识
export const isExt = CLIENT_EXTS.includes(client); // 是否为浏览器插件扩展环境 (Chrome, Edge, Firefox, Thunderbird)
export const isChrome = client === CLIENT_CHROME; // 是否为 Chrome 扩展环境
