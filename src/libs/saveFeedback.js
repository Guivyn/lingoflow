// Only operation status is retained; configuration values and errors stay private.
let snapshot = {};
let sequence = 0;
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());

export const getSaveSnapshot = () => snapshot;
export const subscribeSaveFeedback = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function beginSave(key) {
  const operation = ++sequence;
  snapshot = { ...snapshot, [key]: { operation, status: "saving" } };
  emit();
  return (status) => {
    // An earlier operation cannot overwrite the status of a later queued write.
    if (snapshot[key]?.operation !== operation) return;
    snapshot = { ...snapshot, [key]: { operation, status } };
    emit();
  };
}
