/**
 * Build a standardized damage payload object from an effective weapon config.
 *
 * The effective config contains nested damage settings (base damage, crit chance,
 * crit multiplier, and optional status effects). This helper flattens and normalizes
 * those values into a single lightweight object that can be passed to damage systems.
 *
 * @param {Object} effective - The resolved (modified) weapon config.
 * @returns {Object} payload - The structured damage payload.
 */
export function fromConfig(effective = {}) {
  // Pull the `damage` sub-config safely (may not exist depending on weapon type).
  const damage = effective?.damage ?? {};

  return {
    // Base damage per hit (required for all weapons).
    damage: damage.base ?? 0,

    // Chance to apply critical hit (0–1). Defaults to 0 if not specified.
    critChance: damage.crit?.chance ?? 0,

    // Crit multiplier to apply to base damage when crit occurs.
    // Defaults to 1.5 if not defined.
    critMult: damage.crit?.mult ?? 1.5,

    // Optional status effects (e.g., burn, freeze), defaults to empty array.
    status: damage.status ?? []
  };
}
