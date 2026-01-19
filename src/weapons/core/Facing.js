/**
 * resolve(owner)
 *
 * Resolves the *facing angle* of an entity in radians.
 * Used for weapons that fire based on player direction rather than target lock.
 *
 * Priority of resolution:
 *  1. If owner provides a numeric facing (e.g., precomputed aim angle), use it directly.
 *  2. If facing is a string like "left", "up-left", etc., map it to a standard 8-direction angle.
 *  3. Otherwise, infer facing from body velocity (movement direction).
 *  4. Default to facing right (0 radians).
 *
 * @param {Object} owner - Weapon owner providing directional context.
 * @returns {number} - The resolved facing angle in radians.
 */
export function resolve(owner) {
  // First, check if owner exposes a numeric angle (ideal for analog movement / smooth rotations).
  const facing = owner?.getFacing?.();
  if (Number.isFinite(facing)) return facing;

  // Handle string-based directional labels (e.g., "left-up", "down-left", etc.)
  if (typeof facing === 'string') {
    const s = facing.toLowerCase();

    // Diagonals (45° increments)
    if (s.includes('left') && s.includes('up')) return -(3 * Math.PI) / 4;   // up-left
    if (s.includes('right') && s.includes('up')) return -Math.PI / 4;       // up-right
    if (s.includes('left') && s.includes('down')) return (3 * Math.PI) / 4; // down-left
    if (s.includes('right') && s.includes('down')) return Math.PI / 4;      // down-right

    // Cardinal directions (90° increments)
    if (s.includes('left')) return Math.PI;         // left
    if (s.includes('right')) return 0;              // right
    if (s.includes('up')) return -Math.PI / 2;      // up
    if (s.includes('down')) return Math.PI / 2;     // down
  }

  // If no explicit facing, attempt to infer direction from physics velocity.
  const body = owner?.getBody?.();
  const vx = body?.velocity?.x ?? 0;
  const vy = body?.velocity?.y ?? 0;

  // If there is movement, derive angle from velocity vector.
  if (vx || vy) return Math.atan2(vy, vx);

  // Default fallback → facing right (0 radians)
  return 0;
}
