import {
  buildSubtitleSystemPrompt,
  buildUserPrompt,
} from "./PromptBuilder";

const common = {
  from: "English",
  to: "Chinese",
  fromLang: "en",
  toLang: "zh-CN",
  tone: "formal",
  texts: ["Codespaces"],
  docInfo: { title: "Repository settings" },
  glossary: { Codespaces: "固定译名" },
  aiTerms: "Codespaces,固定译名",
};

test("batch translation sends the original segment without keyword instructions", () => {
  const payload = JSON.parse(buildUserPrompt({ ...common, useBatchFetch: true }));

  expect(payload.segments).toEqual([{ id: 0, text: "Codespaces" }]);
  expect(payload).not.toHaveProperty("glossary");
});

test("single-text and subtitle prompts do not inject legacy keyword values", () => {
  const userPrompt = buildUserPrompt({
    ...common,
    useBatchFetch: false,
    nobatchUserPrompt: "{{text}}|{{glossary}}",
  });
  const subtitlePrompt = buildSubtitleSystemPrompt({
    ...common,
    subtitlePrompt: "{{title}}|{{glossary}}",
  });

  expect(userPrompt).toContain("Codespaces");
  expect(userPrompt).not.toContain("固定译名");
  expect(userPrompt).not.toContain("{{glossary}}");
  expect(subtitlePrompt).not.toContain("固定译名");
  expect(subtitlePrompt).not.toContain("{{glossary}}");
});
