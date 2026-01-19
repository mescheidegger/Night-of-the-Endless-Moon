/**
 * Compute angular offset for projectiles fired in a salvo (multi-shot).
 *
 * Example:
 *  - If salvo = 3 and spreadRad = 0.2 radians,
 *    offsets will be: -0.2, 0, +0.2 (centered around 0).
 *
 * @param {number} index - Index of the projectile in the salvo (0-based).
 * @param {number} salvo - Total number of projectiles in the salvo.
 * @param {number} spreadRad - Total angular spread in radians.
 * @returns {number} - The angular offset to apply to this projectile.
 */
export function spreadOffset(index, salvo, spreadRad) {
  // If parameters are invalid or only one projectile is fired, no offset is needed.
  if (!Number.isFinite(index) || !Number.isFinite(salvo) || salvo <= 1) {
    return 0;
  }

  // Center the spread around the middle projectile:
  //   e.g., for salvo=3 => index 0:-1, 1:0, 2:+1
  return spreadRad * (index - (salvo - 1) / 2);
}

/**
 * Determine the delay between shots **within** a salvo.
 *
 * Some weapons fire multiple projectiles in quick succession (burst-shot).
 * This value controls the stagger time between each projectile.
 *
 * @param {Object} effective - The effective resolved weapon config.
 * @returns {number} - Stagger time in milliseconds between salvo projectiles.
 */
export function spacingMs(effective) {
  const value = effective?.cadence?.salvoSpacingMs;

  // If undefined or invalid, fall back to a default of 30 ms between shots.
  if (!Number.isFinite(value)) {
    return 30;
  }

  // Ensure spacing is never negative.
  return Math.max(0, value);
}
