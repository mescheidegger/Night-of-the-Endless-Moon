import { resolveMobConfig } from '../mob/MobRegistry.js';

/**
 * DamagePipeline manages all combat damage logic against enemies:
 *  - Reducing HP and triggering hit feedback (flash + optional hit animation)
 *  - Emitting hit events for UI/log/sound systems
 *  - Detecting when an enemy dies and routing to FX + drop tables + pooling
 *
 * This class should remain **stateless** regarding combat logic — the enemy
 * retains its own HP and animation state. The pipeline simply interprets the
 * hit and triggers the correct responses.
 */
export class DamagePipeline {
  /**
   * Wire up shared combat dependencies so every hit flows through one pipeline.
   * This keeps damage side effects consistent across all weapons and enemies.
   */
  constructor(scene, options = {}) {
    this.scene = scene;

    // Enemy pools for releasing enemies back into their object pools upon death
    this.enemyPools = options.enemyPools ?? options.enemyPool; // Backwards compatibility alias

    // Drop spawner handles XP gems, loot, etc.
    this.dropSpawner = options.dropSpawner ?? null;

    // FX system handles hit pop, particles, bursts
    this.fxSystem = options.fxSystem;
  }

  /**
   * Allows hot-swapping or late binding the drop spawner.
   */
  setDropSpawner(dropSpawner) {
    this.dropSpawner = dropSpawner;
  }

  /**
   * Applies damage to a target enemy, plays hit feedback, and handles death if HP reaches zero.
   *
   * @param {Phaser.GameObjects.Sprite} target - The enemy being hit.
   * @param {Object} payload - Damage metadata. Expected: { damage: number }.
   */
  applyHit(target, payload = {}) {
    if (!target || !target.active) return; // Ignore missing or recycled objects

    const passiveManager = this.scene.passiveManager;
    if (passiveManager?.applyDamageModifiers) {
      payload = passiveManager.applyDamageModifiers(payload, { target, source: 'weapon' });
    }

    const enemyHpBefore = target?.hp ?? target?.health?.hp ?? null;

    const raw = payload?.damage ?? 0;
    // integer snap with epsilon (fast, predictable)
    const damage = raw > 0 ? (Math.round(raw + 1e-6) | 0) : 0;
    target.hp -= damage;

    this.scene.damageNumbers?.hitEntity(target, damage, {
      tint: payload?.crit ? 0xffd54a : 0xff4d4d,
      crit: !!payload?.crit
    });


    // Visual feedback: brief white flash
    target.setTintFill(0xffffff);
    this.scene.time.delayedCall(40, () => target.clearTint());

    const enemyHpAfter = target?.hp ?? target?.health?.hp ?? null;

    let effectiveDamage = null;
    if (Number.isFinite(enemyHpBefore) && Number.isFinite(enemyHpAfter)) {
      effectiveDamage = Math.max(0, enemyHpBefore - enemyHpAfter);
    } else {
      effectiveDamage = Math.max(0, damage);
    }

    // Broadcast hit event to game systems that may react (UI, sound, screenshake, etc.)
    if (effectiveDamage > 0) {
      const weaponKey = payload?.sourceKey ?? null;
      const mobKey = target?.mobKey ?? null;

      this.scene?.events?.emit?.('combat:hit', {
        weaponKey,
        mobKey,
        enemy: target,
        damage: effectiveDamage,
        wasCrit: !!payload?.crit
      });

    }

    // If enemy still has HP, optionally play a hit reaction animation
    if (target.hp > 0) {
      const config = resolveMobConfig(target.mobKey);
      const animSet = config?.animationKeys ?? {};
      const hitAnim = animSet.hit;

      // Only animate if not already playing a death animation
      if (hitAnim && !target._isDying && target.anims?.animationManager?.exists?.(hitAnim)) {
        target.play(hitAnim, true);

        // After hit animation finishes, resume movement/idle animation
        target.once(`animationcomplete-${hitAnim}`, () => {
          if (!target._isDying && target.hp > 0) {
            const resume = animSet.move ?? animSet.idle ?? config?.defaultAnim;
            if (resume && target.anims?.animationManager?.exists?.(resume)) {
              target.play(resume, true);
            }
          }
        });
      }
    }

    // If HP <= 0, handle full death flow
    if (target.hp <= 0) {
      this._handleDeath(target);
    }
  }

  /**
   * Handles full enemy death behavior:
   *  - Plays death animation (if available)
   *  - Spawns XP / loot based on DropRegistry
   *  - Triggers explosion FX pop
   *  - Returns enemy instance to pool for recycling
   *
   * NOTE: XP value and drop rules come from the mob’s registry entry — do not
   * manually override XP in here.
   *
   * @param {Phaser.GameObjects.Sprite} enemy
   */
  _handleDeath(enemy) {
    if (!enemy || enemy._deathHandled) return; // Prevent double-processing
    enemy._deathHandled = true;

    const config = resolveMobConfig(enemy.mobKey);
    const animSet = config?.animationKeys ?? {};
    const deathAnim = animSet.death;

    this.scene.events.emit('enemy:died', {
      mobKey: enemy.mobKey,
      x: enemy.x,
      y: enemy.y
    });

    // Mark dying state to prevent animation conflicts
    enemy._isDying = true;

    // Stop enemy motion + disable collisions
    enemy.body?.setVelocity(0, 0);
    enemy.body?.setEnable(false);

    // Ensures release logic only happens one time
    let finalized = false;
    const finalize = () => {
      if (finalized) return;
      finalized = true;

      const passiveManager = this.scene.passiveManager;
      if (passiveManager?.applyOnKillEffects) {
        passiveManager.applyOnKillEffects({
          enemy,
          mobConfig: config
        });
      }

      // Explosion-style visual effect at death location (optional)
      this.fxSystem?.explode?.(enemy.x, enemy.y, 14);

      // Determine drop table entry — may include different XP gem tiers
      const xpType = enemy.rewards?.xpType ?? null;
      if (xpType) {
        // Explicit XP type from mob entry
        this.dropSpawner?.spawnFromTable?.(enemy.mobKey, enemy.x, enemy.y, { type: xpType });
      } else {
        // Standard drop table behavior
        this.dropSpawner?.spawnFromTable?.(enemy.mobKey, enemy.x, enemy.y);
      }

      // Return enemy object to pool so it can be reused
      this.enemyPools?.release?.(enemy);
    };

    // If a death animation exists, wait for it to finish. Otherwise finalize immediately.
    if (deathAnim && enemy.anims?.animationManager?.exists?.(deathAnim)) {
      enemy.play(deathAnim, true);

      // Release after animation completes
      enemy.once(`animationcomplete-${deathAnim}`, finalize);

      // Safety timeout in case animation callbacks fail or are skipped
      this.scene.time.delayedCall(1600, finalize);
    } else {
      finalize();
    }
  }
}
