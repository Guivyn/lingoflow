import {
  isTrustedExtensionSender,
  isExtensionPageSender,
  normalizeInjectText,
  sanitizeDnrList,
  normalizeProxyFetchArgs,
  normalizeProxyStreamArgs,
  validateHashInput,
} from "./requestGuard";

describe("requestGuard", () => {
  test("rejects untrusted senders", () => {
    expect(isTrustedExtensionSender(null, "ext-1")).toBe(false);
    expect(isTrustedExtensionSender({ id: "other" }, "ext-1")).toBe(false);
    expect(isTrustedExtensionSender({ id: "ext-1" }, "ext-1")).toBe(true);
  });

  test("limits page-only actions to extension pages", () => {
    expect(
      isExtensionPageSender(
        { id: "ext-1", url: "https://example.com" },
        "ext-1",
        "chrome-extension://ext-1/"
      )
    ).toBe(false);
    expect(
      isExtensionPageSender(
        { id: "ext-1", url: "chrome-extension://ext-1/options.html" },
        "ext-1",
        "chrome-extension://ext-1/"
      )
    ).toBe(true);
  });

  test("allows normal http proxy requests", () => {
    const args = normalizeProxyFetchArgs({
      input: "https://api.example.com/v1/translate",
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      },
      opts: { httpTimeout: 30 },
      expect: "json",
    });
    expect(args.input).toContain("https://");
    expect(args.init.method).toBe("POST");
    expect(args.init.headers["Content-Type"]).toBe("application/json");
  });

  test("rejects non-http urls and blocked headers", () => {
    expect(() =>
      normalizeProxyFetchArgs({ input: "file:///etc/passwd" })
    ).toThrow("Proxy protocol not allowed");
    expect(() =>
      normalizeProxyFetchArgs({
        input: "https://api.example.com",
        init: { headers: { Cookie: "a=b" } },
      })
    ).toThrow("Proxy header not allowed");
    expect(() =>
      normalizeProxyFetchArgs({
        input: "https://api.example.com",
        init: { method: "TRACE" },
      })
    ).toThrow("Proxy method not allowed");
  });

  test("caps stream args and hash inputs", () => {
    expect(() =>
      normalizeProxyStreamArgs({
        input: "https://api.example.com",
        init: { body: "x".repeat(4 * 1024 * 1024 + 1) },
      })
    ).toThrow("Proxy body too large");
    expect(() => validateHashInput("x".repeat(1024 * 1024 + 1), "")).toThrow(
      "Hash input too large"
    );
    expect(() => validateHashInput("ok", "x".repeat(1025))).toThrow(
      "Hash salt too large"
    );
  });

  test("normalizes controlled inject text", () => {
    expect(normalizeInjectText("  body { color: red }  ")).toBe(
      "body { color: red }"
    );
    expect(() => normalizeInjectText(123)).toThrow("must be a string");
    expect(() => normalizeInjectText("   ")).toThrow("is empty");
    expect(() =>
      normalizeInjectText("x".repeat(512 * 1024 + 1))
    ).toThrow("too large");
  });

  test("sanitizes DNR filter lists", () => {
    expect(
      sanitizeDnrList([
        "https://dict.youdao.com",
        "example.com",
        "https://sub.example.org/path",
        "localhost:8080",
      ])
    ).toEqual([
      "https://dict.youdao.com",
      "example.com",
      "https://sub.example.org/path",
      "localhost:8080",
    ]);
    expect(
      sanitizeDnrList([
        "*",
        "<all_urls>",
        "||example.com^",
        "file:///etc/passwd",
        "data:text/plain,hi",
        "192.168.1.1",
        "example",
        "https://dict.youdao.com",
        "https://dict.youdao.com",
      ])
    ).toEqual(["https://dict.youdao.com"]);
    expect(
      sanitizeDnrList(
        Array.from({ length: 120 }, (_, index) => `https://site-${index}.com`)
      )
    ).toHaveLength(100);
  });
});
