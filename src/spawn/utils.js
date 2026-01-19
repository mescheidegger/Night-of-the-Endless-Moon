/**
 * Safely evaluate a mob spawn weight.
 *
 * Spawn weights can be:
 *   • A number (e.g., `1.2`)
 *   • A function of time `t => number`
 *
 * This helper normalizes both cases into a numeric value, and prevents
 * runtime errors inside user-defined weight functions from breaking
 * the spawn loop. Any failure yields `0`, effectively disabling the
 * mob until the next tick.
 */
export function evaluateWeight(weight, t) {
  if (typeof weight === 'function') {
    try {
      return Number(weight(t)) || 0;
    } catch (err) {
      console.warn('[SpawnDirector] weight function error', err);
      return 0;
    }
  }
  return Number(weight) || 0;
}

/**
 * Weighted random selection from an array of entries shaped like:
 *   { mobKey: string, weight: number }
 *
 * Only positive weights contribute to the selection pool.
 * Returns:
 *   • The chosen entry object if any weights > 0
 *   • `null` if no valid entries are selectable
 *
 * This is the standard "roulette wheel" selection pattern.
 */
export function weightedPick(entries) {
  // Compute total weight across all entries.
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  if (total <= 0) return null;

  // Random roll within the total weight range.
  let roll = Math.random() * total;

  // Subtract weights in sequence until selection threshold is passed.
  for (const entry of entries) {
    const w = Math.max(0, entry.weight);
    if (w <= 0) continue;
    roll -= w;
    if (roll <= 0) {
      return entry;
    }
  }

  // Fallback: return last entry if floating-point rounding causes no match.
  return entries[entries.length - 1] ?? null;
}

/**
 * Resolve how many "attempts" or "spawns" to issue.
 *
 * Accepts:
 *   • A number
 *   • A function (t) → number
 *
 * Ensures:
 *   • Result is an integer ≥ 1
 *   • Gracefully recovers from errors
 *
 * Commonly used for:
 *   - `spawnsPerTick`
 *   - `groupSize`
 *   - `groupsPerTick`
 */
export function resolveAttempt(value, t, fallback = 1) {
  let result = value ?? fallback;
  if (typeof result === 'function') {
    try {
      result = Number(result(t));
    } catch (err) {
      console.warn('[SpawnDirector] wave resolver error', err);
      result = fallback;
    }
  }
  if (!Number.isFinite(result)) return fallback;
  return Math.max(1, Math.floor(result));
}

/**
 * Resolve any data value that may be:
 *   • Static (number/string/object/etc.)
 *   • Function (t) → value
 *
 * Returns:
 *   • The function result (if valid & non-undefined)
 *   • Otherwise the static value
 *   • Otherwise the fallback
 *
 * This is used for non-count parameters like:
 *   - speed
 *   - direction lists
 *   - AI behavior selection
 *   - formation spacing
 */
export function resolveValue(value, t, fallback) {
  if (typeof value === 'function') {
    try {
      const resolved = value(t);
      if (resolved !== undefined) {
        return resolved;
      }
    } catch (err) {
      console.warn('[SpawnDirector] wave value error', err);
      return fallback;
    }
  }
  return value ?? fallback;
}

/**
 * Randomly pick one element from an array.
 * If array is empty or invalid, returns `undefined`.
 *
 * Used for selecting:
 *   - A random allowed direction (e.g., L2R / R2L / T2B / B2T)
 *   - Random movement style options
 */
export function pickOne(options) {
  if (!Array.isArray(options) || options.length === 0) return undefined;
  const index = Math.floor(Math.random() * options.length);
  return options[index];
}
