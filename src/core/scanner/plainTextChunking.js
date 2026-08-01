export const getPlainTextChunkLimit = (setting = {}) => {
  const maxLength = Number(setting.maxLength);
  const hardLimit = Number.isFinite(maxLength)
    ? Math.max(1, maxLength - 1)
    : 3000;

  return Math.min(3000, hardLimit);
};

export const findPlainTextBreakIndex = (text, limit) => {
  const slice = text.slice(0, limit + 1);
  let breakIndex = -1;
  const naturalBreakRegex = /(?:[。！？]+|[.?!]+(?=\s+|$)|\n+)/g;
  let match;

  while ((match = naturalBreakRegex.exec(slice)) !== null) {
    const candidate = match.index + match[0].length;
    if (candidate > 0 && candidate <= limit) {
      breakIndex = candidate;
    }
  }

  if (breakIndex > Math.floor(limit * 0.4)) {
    return breakIndex;
  }

  for (let i = limit; i > Math.floor(limit * 0.4); i--) {
    if (/\s/.test(text[i - 1])) {
      return i;
    }
  }

  return limit;
};

export const readPlainTextNewline = (source, offset) => {
  let count = 0;
  let nextOffset = offset;

  while (nextOffset < source.length) {
    const char = source[nextOffset];
    if (char === "\r") {
      count++;
      nextOffset += source[nextOffset + 1] === "\n" ? 2 : 1;
    } else if (char === "\n") {
      count++;
      nextOffset++;
    } else {
      break;
    }
  }

  return count ? { count, nextOffset } : null;
};

export const findPlainTextLineEnd = (source, offset) => {
  let cursor = offset;

  while (cursor < source.length) {
    const char = source[cursor];
    if (char === "\r" || char === "\n") break;
    cursor++;
  }

  return cursor;
};

export const readNextPlainTextChunk = (source, offset, limit) => {
  if (offset >= source.length) return null;

  const newline = readPlainTextNewline(source, offset);
  if (newline) {
    return {
      type: "break",
      count: Math.max(0, newline.count - 1),
      nextOffset: newline.nextOffset,
    };
  }

  const lineEnd = findPlainTextLineEnd(source, offset);
  const lineLength = lineEnd - offset;

  if (lineLength <= limit) {
    return {
      type: "text",
      value: source.slice(offset, lineEnd),
      nextOffset: lineEnd,
    };
  }

  const splitIndex = findPlainTextBreakIndex(
    source.slice(offset, lineEnd),
    limit
  );

  return {
    type: "text",
    value: source.slice(offset, offset + splitIndex),
    nextOffset: offset + splitIndex,
  };
};
