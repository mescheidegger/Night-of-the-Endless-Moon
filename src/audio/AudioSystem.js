import { WeaponRegistry } from '../weapons/WeaponRegistry.js';
import { MobRegistry } from '../mob/MobRegistry.js';
import { DropRegistry } from '../drops/DropRegistry.js';

/**
 * Audio System
 * ------------
 * Centralizes audio playback based on gameplay events.
 *
 * Added:
 *  - Scoped weapon fire audio via:
 *      'weapon:fire:start' -> starts a scoped fire sound (returns a sound instance)
 *      'weapon:fire:end'   -> stops that scoped fire sound (optionally fades)
 *
 * This enables weapons with abortable / variable-length FX (e.g., chainThrow)
 * to stop their "fire" sound when the FX ends early, without controllers
 * directly referencing SoundManager.
 *
 * Note:
 *  - To avoid double-playing fire SFX, we skip 'weapon:fired' for weapons that
 *    opt into scoped fire audio (weapon.audio.fire.scoped === true).
 */
export function setupAudioSystem(scene, soundManager) {
  // scopeId -> Phaser.Sound.BaseSound
  const scopedFire = new Map();

  const stopScoped = (scope, { fadeMs = 40 } = {}) => {
    const s = scopedFire.get(scope);
    if (!s) return;

    // Remove mapping immediately to avoid re-entrancy issues.
    scopedFire.delete(scope);

    if (fadeMs > 0 && scene?.tweens) {
      scene.tweens.add({
        targets: s,
        volume: 0,
        duration: fadeMs,
        onComplete: () => {
          if (s?.isPlaying) s.stop();
        }
      });
      return;
    }

    if (s?.isPlaying) s.stop();
  };

  // Scoped weapon fire start (for lifecycle-bound SFX)
  scene.events.on('weapon:fire:start', ({ weaponKey, scope }) => {
    if (!weaponKey || !scope) return;

    const weapon = WeaponRegistry[weaponKey];
    if (!weapon) return;

    const fireConfig = weapon.audio?.fire;
    if (!fireConfig?.key) return;

    // If something is already scoped to this id, stop/replace it.
    stopScoped(scope, { fadeMs: 0 });

    // IMPORTANT: playSfx() must return a Phaser sound instance for scoping to work.
    // (Your updated SoundManager.playSfx does this.)
    const s = soundManager.playSfx(fireConfig.key, fireConfig);
    if (s) scopedFire.set(scope, s);
  });

  // Scoped weapon fire end (stop early when FX cancels/completes)
  scene.events.on('weapon:fire:end', ({ scope }) => {
    if (!scope) return;
    stopScoped(scope, { fadeMs: 40 });
  });

  // Standard weapon fired (fire SFX for most weapons)
  scene.events.on('weapon:fired', ({ weaponKey }) => {
    if (!weaponKey) return;

    const weapon = WeaponRegistry[weaponKey];
    if (!weapon) return;

    const fireConfig = weapon.audio?.fire;
    if (!fireConfig?.key) return;

    // Avoid double-play for weapons using scoped fire.
    if (fireConfig.scoped === true) return;

    soundManager.playSfx(fireConfig.key, fireConfig);
  });

  scene.events.on('combat:hit', ({ weaponKey }) => {
    if (!weaponKey) return;

    const weapon = WeaponRegistry[weaponKey];
    if (!weapon) return;

    const hitConfig = weapon.audio?.hit;
    if (!hitConfig?.key) return;

    soundManager.playSfx(hitConfig.key, hitConfig);
  });

  scene.events.on('weapons:exploded', ({ weaponKey }) => {
    if (!weaponKey) return;

    const weapon = WeaponRegistry[weaponKey];
    if (!weapon) return;

    const fireConfig = weapon.audio?.fire;
    if (!fireConfig?.key) return;

    // Explode uses fire sound by convention; keep behavior consistent.
    soundManager.playSfx(fireConfig.key, fireConfig);
  });

  scene.events.on('enemy:died', ({ mobKey }) => {
    if (!mobKey) return;

    const mob = MobRegistry[mobKey];
    if (!mob) return;

    const deathConfig = mob.audio?.death;
    if (!deathConfig?.key) return;

    soundManager.playSfx(deathConfig.key, deathConfig);
  });

  scene.events.on('drop:collected', ({ type }) => {
    if (!type) return;

    const row = DropRegistry[type];
    if (!row) return;

    const pickupConfig = row.audio?.pickup;
    if (!pickupConfig?.key) return;

    soundManager.playSfx(pickupConfig.key, pickupConfig);
  });
}
