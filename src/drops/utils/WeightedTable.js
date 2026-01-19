// src/drops/utils/WeightedTable.js

/**
 * Weighted random picker for drop table entries.
 * Each entry may include a `weight` (number). Missing or invalid weights are treated as 0.
 *
 * @param {Array<object>} entries - e.g., [{ type:'xp_small', weight:95 }, { type:'xp_large', weight:5 }]
 * @param {() => number} rng - Optional RNG function (default Math.random). Useful for seeding tests.
 * @returns {object|null} - The chosen entry (original object reference) or null if no valid weights.
 */
export function weightedPick(entries, rng = Math.random) {
  if (!Array.isArray(entries) || entries.length === 0) return null;

  // Sum positive weights
  let total = 0;
  for (const e of entries) {
    const w = Number(e?.weight ?? 0);
    if (w > 0) total += w;
  }
  if (total <= 0) return null; // nothing to choose from

  // Roll a number in [0, total)
  let roll = rng() * total;

  // Walk the list and return the hit
  for (const e of entries) {
    const w = Number(e?.weight ?? 0);
    if (w <= 0) continue;
    if ((roll -= w) < 0) {
      return e;
    }
  }

  // Fallback: should never happen, but return last positive entry if rounding weirdness occurs
  for (let i = entries.length - 1; i >= 0; i--) {
    if ((entries[i]?.weight ?? 0) > 0) return entries[i];
  }
  return null;
}
