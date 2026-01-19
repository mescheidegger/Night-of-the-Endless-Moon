import Phaser from 'phaser';

/**
 * orientSingleFrameThrow
 * ----------------------
 * Utility for single-frame projectile sprites (daggers, axes, stars) that have no
 * baked rotation frames. Ensures the sprite:
 *   - Faces its travel direction
 *   - Applies a static asset offset (if the source art points in a non-zero direction)
 *   - Optionally resets rotation upon returning to the pool
 *
 * This is designed to be layered on top of your projectilePool, attaching lightweight
 * per-projectile hooks via weaponData.flight.update and weaponData.flight.onRelease.
 *
 * @param {Phaser.Physics.Arcade.Sprite} projectile - The projectile instance.
 * @param {Object} options
 * @param {number} [options.assetForwardDeg=0]
 *        Clockwise art offset in degrees. Example: if the dagger graphic points 30°
 *        upward in the PNG, set this to -30 or +30 depending on desired alignment.
 *
 * @param {number} [options.travelAngleRad=0]
 *        Initial travel direction in radians. Used to orient the sprite on the
 *        first frame if velocity is not yet applied or rotateToVelocity is disabled.
 *
 * @param {boolean} [options.resetOnRelease=false]
 *        If true, restores the projectile's base rotation when released back
 *        into the pool (prevents rotation carryover).
 */
export function orientSingleFrameThrow(
  projectile,
  {
    assetForwardDeg = 0,
    travelAngleRad = 0,
    resetOnRelease = false
  } = {}
) {
  // Must have weaponData to attach flight hooks.
  if (!projectile || !projectile._weaponData) return;

  const weaponData = projectile._weaponData;

  // Convert forward-asset offset from degrees → radians.
  const offsetRad = Phaser.Math.DEG_TO_RAD * (assetForwardDeg || 0);

  // Only use travelAngleRad if valid; otherwise default to zero.
  const travelAngle = Number.isFinite(travelAngleRad) ? travelAngleRad : 0;

  // Base rotation = direction of travel + asset-art offset.
  const baseRotation = travelAngle + offsetRad;

  // Retrieve any existing per-flight hooks so they can be extended rather than overwritten.
  const prevFlight = weaponData.flight ?? {};
  const nextFlight = { ...prevFlight };

  // Whether this projectile normally auto-rotates using velocity.
  const hadRotateToVelocity = weaponData.rotateToVelocity;

  /**
   * Case 1: Projectile originally relied on rotateToVelocity.
   *
   * We disable the built-in behavior and apply our own version that:
   *   - Computes rotation from velocity each frame
   *   - Applies the asset offset
   *   - Falls back to baseRotation if velocity is zero (e.g., first frame)
   */
  if (hadRotateToVelocity) {
    const prevUpdate = prevFlight.update;

    // Disable built-in rotateToVelocity so Phaser does not override our rotation logic.
    weaponData.rotateToVelocity = false;

    nextFlight.update = (p, dt) => {
      // Preserve any pre-existing per-frame update behavior.
      prevUpdate?.(p, dt);

      // Extract velocity; if vector has magnitude, use it to orient the sprite.
      const vx = p.body?.velocity?.x ?? 0;
      const vy = p.body?.velocity?.y ?? 0;

      if (vx || vy) {
        // Rotate in direction of flight, and apply art forward-offset.
        p.rotation = Math.atan2(vy, vx) + offsetRad;
      } else if (Number.isFinite(baseRotation)) {
        // No velocity yet → fallback to predetermined travel direction.
        p.rotation = baseRotation;
      }
    };

    // Ensure the sprite appears correctly oriented on the very first frame.
    if (Number.isFinite(baseRotation)) {
      projectile.rotation = baseRotation;
    }

  /**
   * Case 2: No rotateToVelocity — just snap to baseRotation once.
   */
  } else if (Number.isFinite(baseRotation)) {
    projectile.rotation = baseRotation;
  }

  /**
   * Add an onRelease hook if the caller wants rotation restored when the sprite
   * returns to the pool (avoids visually carrying rotation into the next use).
   */
  if (resetOnRelease) {
    const prevOnRelease = prevFlight.onRelease;

    nextFlight.onRelease = (p) => {
      prevOnRelease?.(p);
      if (p && Number.isFinite(baseRotation)) {
        p.rotation = baseRotation;
      }
    };
  }

  // Only assign flight hooks if there is new behavior to attach.
  if (nextFlight.update || nextFlight.onRelease) {
    weaponData.flight = nextFlight;
  }
}
