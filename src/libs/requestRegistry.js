import { normalizeProxyFetchArgs } from "./requestGuard";

// Include document/frame identity so another tab cannot cancel a request by ID.
const ownerKey = (sender) =>
  JSON.stringify([
    sender?.id,
    sender?.tab?.id,
    sender?.frameId,
    sender?.documentId,
    sender?.url,
  ]);
export const createRequestRegistry = (fetchHandle) => {
  const requests = new Map();
  const keyFor = (requestId, sender) => {
    if (typeof requestId !== "string" || !requestId || requestId.length > 200) {
      throw new Error("Invalid request ID");
    }
    return JSON.stringify([ownerKey(sender), requestId]);
  };
  return {
    async run(args, sender) {
      const normalized = normalizeProxyFetchArgs(args);
      // Compatibility with callers that do not supply a cancellation ID.
      if (!args.requestId) return fetchHandle(normalized);
      const key = keyFor(args.requestId, sender);
      if (requests.has(key)) throw new Error("Duplicate request ID");
      const controller = new AbortController();
      requests.set(key, controller);
      try {
        return await fetchHandle({
          ...normalized,
          opts: { ...normalized.opts, signal: controller.signal },
        });
      } finally {
        requests.delete(key);
      }
    },
    cancel({ requestId } = {}, sender) {
      const controller = requests.get(keyFor(requestId, sender));
      controller?.abort();
      return Boolean(controller);
    },
  };
};
