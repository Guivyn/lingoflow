import { repairTranslationLayout } from "./repairTranslationLayout";

const rect = (top, width = 70) => ({
  top,
  bottom: top + 20,
  height: 20,
  width,
});

function label(text = "准备提交了吗？") {
  document.body.innerHTML = `<h2>Ready to submit?<lingoflow class="lingoflow-wrapper"><font>${text}</font></lingoflow></h2>`;
  const wrapper = document.querySelector("lingoflow");
  return { wrapper, inner: wrapper.firstElementChild };
}

afterEach(() => jest.restoreAllMocks());

test("moves a fragmented short label to one line and groups inline rectangles", () => {
  const { wrapper, inner } = label();
  jest.spyOn(document, "createRange").mockReturnValue({
    selectNodeContents() {},
    getClientRects: () =>
      wrapper.classList.contains("lingoflow-reflow")
        ? [rect(30), rect(30, 15)]
        : [rect(0), rect(22)],
  });
  expect(repairTranslationLayout(wrapper, inner)).toBe(true);
  expect(wrapper.classList.contains("lingoflow-reflow")).toBe(true);
  expect(repairTranslationLayout(wrapper, inner)).toBe(false);
});

test("leaves a label alone when it already fits and excludes body paragraphs", () => {
  const { wrapper, inner } = label();
  jest.spyOn(document, "createRange").mockReturnValue({
    selectNodeContents() {},
    getClientRects: () => [rect(0), rect(0, 15)],
  });
  expect(repairTranslationLayout(wrapper, inner)).toBe(false);
  const paragraph = document.createElement("p");
  document.body.appendChild(paragraph);
  paragraph.appendChild(wrapper);
  expect(repairTranslationLayout(wrapper, inner)).toBe(false);
  expect(wrapper.classList.contains("lingoflow-reflow")).toBe(false);
});

test("rolls back a repair that increases clipping in a fixed-height control", () => {
  const { wrapper, inner } = label();
  const host = wrapper.parentElement;
  host.style.overflowY = "hidden";
  Object.defineProperty(host, "clientHeight", { value: 20 });
  Object.defineProperty(host, "scrollHeight", {
    get: () => (wrapper.classList.contains("lingoflow-reflow") ? 40 : 20),
  });
  jest.spyOn(document, "createRange").mockReturnValue({
    selectNodeContents() {},
    getClientRects: () =>
      wrapper.classList.contains("lingoflow-reflow")
        ? [rect(22)]
        : [rect(0), rect(22)],
  });
  expect(repairTranslationLayout(wrapper, inner)).toBe(false);
  expect(wrapper.classList.contains("lingoflow-reflow")).toBe(false);
});
