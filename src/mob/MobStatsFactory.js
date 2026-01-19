/**
 * Centralises how mob stats (speed / hp / damage / maxSpeed, etc.) are merged +
 * globally modified so difficulty scaling can live in one place instead of
 * inside the Enemy entity or spawners.
 *
 * - Pulls base stats from the mob config (MobRegistry)
 * - Merges in any per-spawn overrides
 * - Optionally applies global multipliers from scene.combatTuning
 *
 * Example combatTuning shape:
 *   scene.combatTuning = {
 *     speedMult: 1.0,
 *     hpMult: 1.0,
 *     damageMult: 1.0,
 *     maxSpeedMult: 1.0,
 *   };
 */
export function resolveMobStats({ scene, mobKey, config, overrides = {} }) {
  // mobKey is reserved for future per-mob tuning hooks (elite/boss scaling, etc.).
  const baseStats = config?.stats ?? {};
  const overrideStats = overrides?.stats ?? {};

  // Start with config stats, then layer in overrides.
  const stats = {
    ...baseStats,
    ...overrideStats,
  };

  const tuning = scene?.combatTuning ?? {};

  /**
   * Apply a multiplier when both values are numeric so tuning stays predictable.
   */
  const applyMult = (value, mult = 1) => {
    if (value == null) return value;
    const m = Number(mult);
    return Number.isFinite(m) ? value * m : value;
  };

  // Optional global multipliers. If you never set them, they default to 1 (no change).
  const speedMult = tuning.speedMult ?? 1;
  const hpMult = tuning.hpMult ?? 1;
  const damageMult = tuning.damageMult ?? 1;
  const maxSpeedMult = tuning.maxSpeedMult ?? 1;

  if (stats.speed != null) {
    stats.speed = applyMult(stats.speed, speedMult);
  }

  if (stats.hp != null) {
    stats.hp = applyMult(stats.hp, hpMult);
  }

  if (stats.damage != null) {
    stats.damage = applyMult(stats.damage, damageMult);
  }

  if (stats.maxSpeed != null) {
    stats.maxSpeed = applyMult(stats.maxSpeed, maxSpeedMult);
  }

  return stats;
}
