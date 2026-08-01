import { appLog } from "../../libs/log";

export const parseTerms = (termsString) => {
  const values = [];
  const patterns = [];

  if (!termsString || typeof termsString !== "string") {
    return { values, combinedRegex: null };
  }

  const lines = termsString.split(/\n|;/);
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    let lastCommaIndex = trimmedLine.lastIndexOf(",");
    if (lastCommaIndex === -1) {
      lastCommaIndex = trimmedLine.length;
    }
    const key = trimmedLine.substring(0, lastCommaIndex).trim();
    const value = trimmedLine.substring(lastCommaIndex + 1).trim();

    if (key) {
      try {
        new RegExp(key);
        patterns.push(`(${key})`);
        values.push(value);
      } catch (err) {
        appLog(`Invalid RegExp for term: "${key}"`, err);
      }
    }
  }

  return {
    values,
    combinedRegex:
      patterns.length > 0 ? new RegExp(patterns.join("|"), "g") : null,
  };
};
