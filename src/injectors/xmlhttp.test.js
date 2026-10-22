import { XMLHttpRequestInjector } from "./xmlhttp";

test("caption fetch capture clones the response, preserves it and installs once", async () => {
  const originalFetch = window.fetch;
  const originalOpen = XMLHttpRequest.prototype.open;
  const marker = Symbol.for("lingoflow.youtube-caption-capture");
  const post = jest.spyOn(window, "postMessage").mockImplementation(() => {});
  const response = {
    url: "https://www.youtube.com/api/timedtext?v=test",
    clone: () => ({ text: async () => '{"events":[]}' }),
  };
  const fetcher = jest.fn().mockResolvedValue(response);
  window.fetch = fetcher;
  try {
    XMLHttpRequestInjector();
    const wrapper = window.fetch;
    XMLHttpRequestInjector();
    expect(window.fetch).toBe(wrapper);
    expect(await window.fetch(response.url)).toBe(response);
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(post).toHaveBeenCalledWith(
      {
        type: "LINGOFLOW_XHR_DATA_YOUTUBE",
        url: response.url,
        response: '{"events":[]}',
      },
      window.location.origin
    );
    post.mockClear();
    fetcher.mockResolvedValueOnce({
      ...response,
      url: "https://example.com/api/timedtext",
    });
    await window.fetch("https://example.com/api/timedtext");
    expect(post).not.toHaveBeenCalled();
  } finally {
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalOpen;
    delete window[marker];
    post.mockRestore();
  }
});
