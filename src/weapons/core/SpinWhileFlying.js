/**
 * Attach a simple spin animation to a projectile while it is in-flight.
 *
 * The helper wraps any existing flight update so it plays nicely with
 * ballistic arcs or scripted motion, and optionally restores the original
 * rotation when the projectile is released back into the pool.
 *
 * @param {object} projectile
 * @param {Object} options
 * @param {number} options.spinSpeedRadPerSec - Angular speed to apply (radians/sec).
 * @param {boolean} [options.resetOnRelease=true] - Reset rotation when released.
 */
export function attachSpinWhileFlying(projectile, { spinSpeedRadPerSec, resetOnRelease = true } = {}) {
  if (!projectile || !projectile._weaponData) return;

  const speed = Number.isFinite(spinSpeedRadPerSec) ? spinSpeedRadPerSec : 0;
  if (speed === 0) return;

  const weaponData = projectile._weaponData;
  const prevFlight = weaponData.flight ?? {};
  const prevUpdate = prevFlight.update;
  const prevOnRelease = prevFlight.onRelease;
  const baseRotation = projectile.rotation;

  const update = (p, dt = 0) => {
    prevUpdate?.(p, dt);

    const delta = Number.isFinite(dt) ? dt : 0;
    if (delta <= 0) return;

    p.rotation += speed * (delta / 1000);
  };

  const onRelease = (p) => {
    prevOnRelease?.(p);
    if (resetOnRelease && p) {
      p.rotation = baseRotation;
    }
  };

  weaponData.flight = {
    ...prevFlight,
    update,
    onRelease
  };
}

