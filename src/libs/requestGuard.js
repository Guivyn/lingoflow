/**
 * @file requestGuard.js
 * @description 后台代理请求的准入校验：限制消息来源、协议、方法、请求体大小与敏感请求头。
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
]);
// 禁止代理请求改写与身份/目标相关的敏感请求头，避免把后台变成任意请求伪造网关。
const BLOCKED_HEADERS = new Set(["host", "cookie", "set-cookie"]);
const MAX_BODY_LENGTH = 4 * 1024 * 1024; // 4MB，覆盖默认批量翻译与流式请求
const MAX_HASH_TEXT_LENGTH = 1024 * 1024; // 1MB
const ALLOWED_EXPECT = new Set([null, undefined, "json", "text", "blob", "audio"]);
const MAX_INJECT_TEXT_LENGTH = 512 * 1024; // 512KB，覆盖规则自定义 CSS/JS 的正常使用
const MAX_DNR_FILTERS = 100; // 每类 DNR 过滤规则的上限，避免配置写坏时刷出超量规则

export const isTrustedExtensionSender = (sender, runtimeId) =>
  Boolean(sender?.id && (!runtimeId || sender.id === runtimeId));

export const isExtensionPageSender = (
  sender,
  runtimeId,
  extensionOrigin
) =>
  isTrustedExtensionSender(sender, runtimeId) &&
  Boolean(sender?.url && extensionOrigin && sender.url.startsWith(extensionOrigin));

const normalizeOpts = (opts = {}) => {
  const next = { ...(opts || {}) };
  delete next.signal;
  if (next.httpTimeout !== undefined) {
    const timeout = Number(next.httpTimeout);
    next.httpTimeout =
      Number.isFinite(timeout) && timeout > 0 && timeout <= 600 ? timeout : 30;
  }
  return next;
};

const normalizeInit = (init = {}) => {
  if (!init || typeof init !== "object" || Array.isArray(init)) {
    return {};
  }

  const method = String(init.method || "GET").toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    throw new Error(`Proxy method not allowed: ${method}`);
  }

  const headers = {};
  const rawHeaders = init.headers || {};
  const headerEntries =
    typeof Headers !== "undefined" && rawHeaders instanceof Headers
      ? rawHeaders.entries()
      : Object.entries(rawHeaders);
  for (const [key, value] of headerEntries) {
    const name = String(key).toLowerCase();
    if (BLOCKED_HEADERS.has(name)) {
      throw new Error(`Proxy header not allowed: ${name}`);
    }
    if (typeof value === "string") {
      headers[key] = value;
    }
  }

  if (init.body !== undefined && init.body !== null) {
    if (typeof init.body !== "string") {
      throw new Error("Proxy body must be a string");
    }
    if (init.body.length > MAX_BODY_LENGTH) {
      throw new Error("Proxy body too large");
    }
  }

  return { ...init, method, headers };
};

const normalizeInput = (input) => {
  if (typeof input !== "string" || !input.trim()) {
    throw new Error("Proxy url is empty");
  }
  let parsed;
  try {
    parsed = new URL(input.trim());
  } catch (err) {
    throw new Error("Proxy url is invalid");
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(`Proxy protocol not allowed: ${parsed.protocol}`);
  }
  return input.trim();
};

export const normalizeProxyFetchArgs = ({ input, init, opts, expect } = {}) => {
  if (!ALLOWED_EXPECT.has(expect)) {
    throw new Error(`Proxy expect not allowed: ${String(expect)}`);
  }
  return {
    input: normalizeInput(input),
    init: normalizeInit(init),
    opts: normalizeOpts(opts),
    expect,
  };
};

export const normalizeProxyStreamArgs = ({ input, init, opts } = {}) => ({
  input: normalizeInput(input),
  init: normalizeInit(init),
  opts: normalizeOpts(opts),
});

export const validateHashInput = (text, salt) => {
  if (typeof text !== "string" || text.length > MAX_HASH_TEXT_LENGTH) {
    throw new Error("Hash input too large");
  }
  if (typeof salt !== "string" || salt.length > 1024) {
    throw new Error("Hash salt too large");
  }
};

export const normalizeInjectText = (value, label = "inject") => {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  const text = value.trim();
  if (!text) {
    throw new Error(`${label} is empty`);
  }
  if (text.length > MAX_INJECT_TEXT_LENGTH) {
    throw new Error(`${label} too large`);
  }
  return text;
};

const isLoopbackHost = (host) =>
  host === "localhost" ||
  host.endsWith(".localhost") ||
  host === "::1" ||
  /^127\./.test(host);

/**
 * DNR 列表输入收口：只接受可解析的 http(s) 域名/URL，
 * 拒绝通配符、超宽匹配、协议相对、纯 IP 与非法条目，并做去重和数量上限。
 */
export const sanitizeDnrList = (input, max = MAX_DNR_FILTERS) => {
  const raw = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(/\n|,/)
      : [];
  const seen = new Set();
  const out = [];

  for (const item of raw) {
    const text = String(item ?? "").trim();
    if (!text || out.length >= max) continue;
    if (
      text.includes("*") ||
      text.includes("<all_urls>") ||
      text.includes("||")
    ) {
      continue;
    }

    let parsed;
    try {
      parsed = new URL(/^[a-z]+:\/\//i.test(text) ? text : `https://${text}`);
    } catch (err) {
      continue;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      continue;
    }
    const host = parsed.hostname;
    if (
      !host ||
      (!isLoopbackHost(host) &&
        (!host.includes(".") || /^\d+\.\d+\.\d+\.\d+$/.test(host)))
    ) {
      continue;
    }
    if (seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }

  return out;
};
