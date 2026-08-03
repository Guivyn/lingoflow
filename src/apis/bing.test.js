jest.mock("../libs/fetch", () => ({
  fetchData: jest.fn(),
}));

const PAGE_HTML = `
<html>
  <script>
    IG:"1A2B3C4D5E6F7890";
    data-iid="translator.5023";
    params_AbusePreventionHelper = [1785778244327, "test-token", 3600000]
  </script>
</html>
${"<!-- padding to satisfy the min page length check -->".repeat(30)}
`;

describe("apiBingTranslate", () => {
  let apiBingTranslate;
  let fetchData;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    ({ apiBingTranslate } = await import("./bing"));
    ({ fetchData } = await import("../libs/fetch"));
  });

  test("parses page config and returns translations", async () => {
    fetchData
      .mockResolvedValueOnce(PAGE_HTML)
      .mockResolvedValueOnce([
        {
          translations: [{ text: "你好，世界", to: "zh-Hans" }],
          detectedLanguage: { language: "en" },
        },
      ]);

    const result = await apiBingTranslate(["hello world"], "en", "zh-Hans");

    expect(result).toEqual([["你好，世界", "en"]]);
    const [pageUrl, pageInit] = fetchData.mock.calls[0];
    expect(pageUrl).toContain("cn.bing.com/translator");
    expect(pageInit.headers["User-Agent"]).toContain("Edg/");
    const [postUrl, postInit] = fetchData.mock.calls[1];
    expect(postUrl).toContain("ttranslatev3?isVertical=1&&IG=1A2B3C4D5E6F7890");
    expect(postInit.body).toContain("text=hello+world");
    expect(postInit.body).toContain("token=test-token");
  });

  test("throws when page config is missing", async () => {
    fetchData.mockResolvedValueOnce(
      `<html>no token here</html>${"<!-- padding -->".repeat(70)}`
    );

    await expect(
      apiBingTranslate(["hello"], "en", "zh-Hans")
    ).rejects.toThrow("Failed to parse Bing translator config");
  });
});
