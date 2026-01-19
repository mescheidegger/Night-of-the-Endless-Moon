/** Provide getWeaponLevelMultipliers so callers can reuse shared logic safely. */
export function getWeaponLevelMultipliers() {
  return { damageMult: 1, cooldownMult: 1 };
}
