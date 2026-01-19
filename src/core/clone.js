// Cache this so we don't re-check every call
const HAS_STRUCTURED_CLONE = typeof structuredClone === 'function';

/**
 * Deep clone helper for plain data objects (weapon configs, registries, etc.).
 * Guarantees we don't keep references to the original registry objects.
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;

  if (HAS_STRUCTURED_CLONE) {
    return structuredClone(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item));
  }

  const out = {};
  for (const key of Object.keys(obj)) {
    out[key] = deepClone(obj[key]);
  }
  return out;
}
