import Phaser from 'phaser';
import { CONFIG } from '../../config/gameConfig.js';
import { DEFAULT_DROP_TYPE } from '../DropRegistry.js';

/**
 * Base class for any collectible drop (XP, currency, powerups, etc).
 * Designed to be pooled and reused to avoid GC churn.
 *
 * Extends Phaser.Physics.Arcade.Image so it supports collision, overlap,
 * and velocity-based movement (e.g., magnet attraction).
 */
export class BaseDrop extends Phaser.Physics.Arcade.Image {
  /**
   * Build a pooled drop sprite with baseline physics settings.
   * This ensures every pickup starts from a consistent, recyclable state.
   */
  constructor(scene, x, y) {
    // Initialize as an Arcade Image using the default texture key.
    super(scene, x, y, 'xpgem');

    // Add to the display & physics worlds.
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Default to inactive and invisible until explicitly reset() from the Pool.
    this.setActive(false).setVisible(false);

    // Drops typically do not fall; magnet force controls motion.
    this.body?.setAllowGravity(false);

    // Ensure the body does not move until configured during reset().
    this.body?.setMaxSpeed(0);

    // Pre-allocated hot-path properties (avoids object reallocations in update loops).
    this.type = DEFAULT_DROP_TYPE;              // logical drop type-category (xp/gold/etc)
    this.value = { currency: 'xp', amount: 0 }; // economic value payload
    this.magnetReadyAt = 0;                     // timestamp when magnet attraction is allowed
    this.magnetRadiusSq = 0;                    // squared distance for magnet pull start
    this.snapRadiusSq = 0;                      // squared distance for auto-collect snap
    this.maxSpeed = 0;                          // max velocity while being magnet-pulled
    this.accel = 0;                             // acceleration toward the player

    // Lifetime tracking
    this.spawnedAt = 0;
    this.expiresAt = 0;
  }

  /**
   * Reset and reconfigure this drop instance from the object pool.
   * @param {number} x
   * @param {number} y
   * @param {object} row - Registry entry describing appearance + magnet behavior.
   */
  reset(x, y, row = {}) {
    // Set correct texture + frame if a specific drop variant defines them.
    const texture = row.texture ?? 'xpgem';
    const frame = row.frame ?? 0;
    this.setTexture(texture, frame);

    // Optional scale override for visual sizing.
    if (row.scale !== undefined) {
      this.setScale(row.scale);
    }

    // Optional render-depth override (Z-index sorting).
    if (row.depth !== undefined) {
      this.setDepth(row.depth);
    }

    // Make the drop visible and reset visual state.
    this.setActive(true).setVisible(true);
    this.setAngle(0);
    this.clearTint();

    // Physics reset phase.
    const body = this.body;
    if (body) {
      // Drops don't fall; magnet controls motion.
      body.setAllowGravity(false);

      // Stop prior velocities if reused from pool.
      body.stop?.();
      body.setVelocity(0, 0);

      // Optional body shape override (commonly circle for orb pickups).
      const bodyConfig = row.body ?? {};
      if (bodyConfig.type === 'circle') {
        const radius = bodyConfig.r ?? bodyConfig.radius ?? 0;
        const offset = 8 - radius; // centers circle relative to sprite
        body.setCircle(radius, offset, offset);
      }

      // Set default maximum speed for magnet movement.
      const magnetMaxSpeed = row.magnet?.maxSpeed ?? body.maxSpeed ?? 0;
      body.setMaxSpeed(magnetMaxSpeed);
    }

    // Place the drop where it is spawned.
    this.setPosition(x, y);

    // Magnet timing: optional delay before the drop can home toward player.
    const now = this.scene.time.now ?? 0;
    const magnet = row.magnet ?? {};
    const delay = Math.max(0, magnet.delayMs ?? 0);
    this.magnetReadyAt = now + delay;

    // Lifetime bookkeeping (0 = infinite)
    const lifetimeMs = Math.max(0, row.lifetimeMs ?? CONFIG.XP.DROP_TTL_MS ?? 0);
    this.spawnedAt = now;
    this.expiresAt = lifetimeMs > 0 ? now + lifetimeMs : 0;

    // Square distances used for performance (avoids sqrt in your CollectSystem).
    const magnetRadius = Math.max(0, magnet.radius ?? 0);
    const snapRadius = Math.max(0, magnet.snapRadius ?? 0);
    this.magnetRadiusSq = magnetRadius * magnetRadius;
    this.snapRadiusSq = snapRadius * snapRadius;

    // Magnet movement tuning (acceleration + speed cap).
    this.maxSpeed = Math.max(0, magnet.maxSpeed ?? 0);
    this.accel = Math.max(0, magnet.accel ?? 0);

    // Store the drop logical type & value payload (XP amount, etc).
    this.type = row.type ?? DEFAULT_DROP_TYPE;
    const value = row.value ?? { currency: 'xp', amount: 0 };

    if (typeof value === 'object' && value !== null) {
      this.value = {
        ...value,
        amount: Number(value.amount ?? 0) || 0
      };
    } else {
      this.value = Number(value) || 0;
    }
  }

  /**
   * Called when the item is returned to the pool.
   * Clears state to avoid cross-instance value leakage.
   */
  onRelease() {
    this.body?.stop?.();
    this.body?.setVelocity(0, 0);

    // Reset magnet behavior.
    this.magnetReadyAt = 0;
    this.magnetRadiusSq = 0;
    this.snapRadiusSq = 0;
    this.maxSpeed = 0;
    this.accel = 0;

    // Reset lifetime.
    this.spawnedAt = 0;
    this.expiresAt = 0;

    // Reset economic & logical identity.
    this.value = { currency: 'xp', amount: 0 };
    this.type = DEFAULT_DROP_TYPE;
  }
}
