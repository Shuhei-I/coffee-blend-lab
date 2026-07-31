export function serializeMaster(value) {
  return JSON.stringify(value);
}

export function parseSnapshot(snapshot, fallback) {
  try {
    return JSON.parse(snapshot);
  } catch {
    return fallback;
  }
}
