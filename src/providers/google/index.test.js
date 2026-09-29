import { googleProvider } from "./index";

describe("Google provider", () => {
  test("uses the upstream Google2 batch request protocol", () => {
    const request = googleProvider.buildRequest({
      texts: ["Hello <a i=0>world</a>.", "Goodbye."],
      from: "auto",
      to: "zh-CN",
      url: "https://translate-pa.googleapis.com/v1/translateHtml",
      key: "test-key",
    });

    expect(request.method).toBe("POST");
    expect(request.headers).toEqual({
      "Content-Type": "application/json+protobuf",
      "X-Goog-API-Key": "test-key",
    });
    expect(request.body).toEqual([
      [["Hello <a i=0>world</a>.", "Goodbye."], "auto", "zh-CN"],
      "wt_lib",
    ]);
  });

  test("parses Google2 translated and detected-language arrays", () => {
    expect(
      googleProvider.parseTranslate([
        ["你好", "再见"],
        ["en", "en"],
      ])
    ).toEqual([
      ["你好", "en"],
      ["再见", "en"],
    ]);
  });

  test("accepts responses without detected-language metadata", () => {
    expect(googleProvider.parseTranslate([["你好"]])).toEqual([["你好", ""]]);
  });
});
