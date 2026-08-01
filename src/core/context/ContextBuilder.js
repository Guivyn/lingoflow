export const buildDocContext = ({
  title = "",
  description = "",
  summary = "",
  context = "",
} = {}) => ({ title, description, summary, context });

export const buildContextPrompt = ({
  title = "",
  description = "",
  summary = "",
  context = "",
} = {}) =>
  [title, description, summary, context].filter(Boolean).join("\n");
