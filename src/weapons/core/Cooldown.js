import Phaser from 'phaser';

/**
 * scheduleInitial(now, delayMs)
 *
 * Schedules the *first* firing timestamp for a weapon.
 * Adds a small random jitter up to (delayMs - 1) so multiple weapons of the same type
 * don't all fire in sync the moment the run starts.
 *
 * @param {number} now - Current timestamp (ms), usually scene.time.now.
 * @param {number} delayMs - Desired cooldown length in ms.
 * @returns {number} - Timestamp when the first fire should occur.
 */
export function scheduleInitial(now, delayMs) {
  // If delay is invalid or effectively zero, fire immediately.
  if (!Number.isFinite(delayMs) || delayMs <= 1) {
    return now;
  }

  // Add a random 0..(delayMs-1) jitter to desynchronize weapons.
  const jitter = Phaser.Math.Between(0, Math.max(0, Math.floor(delayMs) - 1));
  return now + jitter;
}

/**
 * shouldFire(now, nextFireAtMs)
 *
 * Determines whether the current time has reached the scheduled firing time.
 *
 * @param {number} now - Current time (ms).
 * @param {number} nextFireAtMs - Time (ms) when weapon is next allowed to fire.
 * @returns {boolean} - True if weapon should fire this frame.
 */
export function shouldFire(now, nextFireAtMs) {
  return now >= (nextFireAtMs ?? 0);
}

/**
 * scheduleNext(now, delayMs)
 *
 * Schedules the NEXT firing timestamp after a weapon has just fired.
 *
 * @param {number} now - Current timestamp (ms).
 * @param {number} delayMs - Cooldown length.
 * @returns {number} - Timestamp when the weapon will next be ready.
 */
export function scheduleNext(now, delayMs) {
  const delay = Number.isFinite(delayMs) ? delayMs : 0;
  return now + Math.max(0, delay);
}
