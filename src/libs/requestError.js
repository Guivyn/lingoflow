export const MAX_RETRY_DELAY = 30000;

export class RequestError extends Error {
  constructor(
    message,
    {
      status = 0,
      code = "REQUEST_FAILED",
      retryable = false,
      retryAfter = 0,
    } = {}
  ) {
    super(message);
    this.name = "RequestError";
    Object.assign(this, { status, code, retryable, retryAfter });
  }
}

export const parseRetryAfter = (value, now = Date.now()) => {
  if (!value) return 0;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(value) - now;
  return Number.isFinite(delay) ? Math.max(0, delay) : 0;
};

export const httpRequestError = (response) => {
  const status = response.status;
  const retryAfter = parseRetryAfter(response.headers?.get("Retry-After"));
  let code = "HTTP_ERROR";
  let message = `翻译服务返回 HTTP ${status}，请检查接口配置。`;
  let retryable = false;
  if (status === 401 || status === 403) {
    code = "AUTH_ERROR";
    message = `认证或权限失败（HTTP ${status}），请检查 API Key 和账户权限。`;
  } else if (status === 429) {
    code = "RATE_LIMITED";
    message = "请求受到限流（HTTP 429），请稍后重试或降低并发。";
    retryable = true;
  } else if ([408, 500, 502, 503, 504].includes(status)) {
    code = "SERVICE_UNAVAILABLE";
    message = `翻译服务暂时不可用（HTTP ${status}），请稍后重试。`;
    retryable = true;
  } else if ([400, 404, 405, 413, 415, 422].includes(status)) {
    code = "INVALID_REQUEST";
    message = `请求参数或接口地址有误（HTTP ${status}），请检查地址、模型与请求配置。`;
  }
  // Do not retry earlier than the server requests when its delay exceeds our budget.
  return new RequestError(message, {
    status,
    code,
    retryable: retryable && retryAfter <= MAX_RETRY_DELAY,
    retryAfter,
  });
};

export const normalizeRequestError = (error) => {
  if (error instanceof RequestError || error?.name === "AbortError")
    return error;
  if (error?.name === "TimeoutError")
    return new RequestError("翻译请求超时，请稍后重试或调整超时设置。", {
      code: "TIMEOUT",
      retryable: true,
    });
  if (
    error instanceof TypeError &&
    /fetch|network|load failed/i.test(error.message)
  ) {
    return new RequestError("网络连接失败，请检查网络后重试。", {
      code: "NETWORK_ERROR",
      retryable: true,
    });
  }
  return new RequestError(error?.message || "请求失败，请检查接口配置。 ");
};

export const serializeRequestError = (error) => {
  const normalized = normalizeRequestError(error);
  return {
    name: normalized.name,
    message: normalized.message,
    status: normalized.status || 0,
    code: normalized.code || "ABORTED",
    retryable: Boolean(normalized.retryable),
    retryAfter: normalized.retryAfter || 0,
  };
};

export const restoreRequestError = (error) =>
  error?.name === "AbortError"
    ? new DOMException(error.message, "AbortError")
    : new RequestError(error?.message || "请求失败", error);

export const retryDelay = (error, attempt) =>
  Math.min(
    MAX_RETRY_DELAY,
    Math.max(
      error.retryAfter || 0,
      1000 * 2 ** attempt + Math.floor(Math.random() * 250)
    )
  );
