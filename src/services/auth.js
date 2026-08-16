/**
 * @file auth.js
 * @description 微软 Edge 翻译授权 Token 获取。
 */

import { fetchData } from "../libs/fetch";


/**
 * 获取微软 Edge 翻译服务的授权凭证 Token。
 * @returns {Promise<string>} 微软接口所需的 Bearer Token 凭证字符串
 */
export const apiMsAuth = async () =>
  fetchData("https://edge.microsoft.com/translate/auth");
