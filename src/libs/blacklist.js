/**
 * @file blacklist.js
 * @description 黑名单检测模块。根据用户配置的黑名单网址列表，判定当前网页是否处于禁用整页翻译或划词翻译的范围内。
 */

import { isMatch } from "./utils";

/**
 * 检查当前网页 URL 是否处于配置的黑名单列表中
 * @param {string} href 当前页面的完整 URL (如 location.href)
 * @param {string} [blacklist=""] 逗号或换行分隔的黑名单网址/匹配模式列表
 * @returns {boolean} 如果处于黑名单中，返回 true；否则返回 false
 */
export const isInBlacklist = (href, blacklist = "") =>
  blacklist
    .split(/\n|,/)
    .map((url) => url.trim())
    .filter(Boolean)
    .some((url) => isMatch(href, url));
