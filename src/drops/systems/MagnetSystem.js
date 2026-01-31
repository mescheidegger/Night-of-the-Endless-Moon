import { CONFIG } from '../../config/gameConfig.js';

export class MagnetSystem {
  /**
   * System that applies "magnet" attraction to drops (XP or items).
   * When the player enters range, the drop accelerates directly toward the player.
   *
   * @param {Phaser.Scene} scene
   * @param {{
   *   group?: Phaser.Physics.Arcade.Group,
   *   pool?: { group: Phaser.Physics.Arcade.Group },
   *   player?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
   * }} deps
   */
  constructor(scene, { group, pool, player, passiveManager, dropManager } = {}) {
    this.scene = scene;

    // The active group of drops; may come from dependency, pool, or be set later.
    this.group = group ?? pool?.group ?? null;

    // Player the drops should move toward.
    this.player = player ?? null;

    // Optional object pool reference (used to replace group if needed).
    this.pool = pool ?? null;

    this.passiveManager = passiveManager ?? scene.passiveManager ?? null;

    // Drop manager used for despawn/recycle events.
    this.dropManager = dropManager ?? scene.dropManager ?? null;
  }

  /**
   * Refresh the passive manager reference for magnet radius/speed bonuses.
   * This allows mid-run upgrades to affect attraction immediately.
   */
  setPassiveManager(pm) {
    this.passiveManager = pm;
  }

  /**
   * Allow the target player to be swapped (e.g., character change or respawn).
   */
  setPlayer(player) {
    this.player = player;
  }

  /**
   * Allow a new drop group to be assigned.
   */
  setGroup(group) {
    this.group = group;
  }

  /**
   * Allow callers to swap the drop manager used for cleanup.
   */
  setDropManager(dropManager) {
    this.dropManager = dropManager;
  }

  /**
   * Allow the pool reference to be swapped — automatically refreshes group.
   */
  setPool(pool) {
    this.pool = pool;
    this.group = pool?.group ?? this.group;
  }

  /**
   * Called every frame.
   * For each drop:
   *  - If magnet delay period has passed,
   *  - And player is within magnet radius,
   *  - Apply velocity toward player.
   *
   * @param {number} dt - delta time (not required here but useful for expansion)
   */
  update(dt) {
    const group = this.group ?? this.pool?.group;
    const player = this.player;
    if (!group || !player) return;

    const now = this.scene.time.now ?? 0;
    const dropManager = this.dropManager ?? this.scene.dropManager ?? null;
    const maxKeepDistance = Math.max(0, CONFIG.XP.MAX_KEEP_DISTANCE ?? 0);
    const maxKeepDistanceSq = maxKeepDistance > 0 ? maxKeepDistance * maxKeepDistance : 0;
    const mapRuntime = this.scene.mapRuntime;
    const bounds = mapRuntime?.isBounded?.() ? mapRuntime.getWorldBounds?.() : null;

    // NEW: pull buffs from passives
    const pm = this.passiveManager ?? this.scene.passiveManager ?? null;
    let radiusMult = 1;
    let speedMult = 1;
    if (pm?.getXpMagnetMultipliers) {
      const m = pm.getXpMagnetMultipliers();
      radiusMult = m.radiusMult ?? 1;
      speedMult = m.speedMult ?? 1;
    }

    const pCenterX = player.body?.center?.x ?? player.x ?? 0;
    const pCenterY = player.body?.center?.y ?? player.y ?? 0;

    group.children.iterate((drop) => {
      if (!drop || !drop.active || !drop.body) return;

      const expiredByTime = (drop.expiresAt ?? 0) > 0 && now >= drop.expiresAt;
      const dCenterX = drop.body?.center?.x ?? drop.x ?? 0;
      const dCenterY = drop.body?.center?.y ?? drop.y ?? 0;

      const dx = pCenterX - dCenterX;
      const dy = pCenterY - dCenterY;
      const distSq = dx * dx + dy * dy;

      const expiredByDistance = !bounds && maxKeepDistanceSq > 0 && distSq > maxKeepDistanceSq;
      const expiredByBounds = bounds
        ? (dCenterX < bounds.left || dCenterX > bounds.right || dCenterY < bounds.top || dCenterY > bounds.bottom)
        : false;

      if (expiredByTime || expiredByDistance || expiredByBounds) {
        dropManager?.release?.(drop);
        return;
      }

      if (now < (drop.magnetReadyAt ?? 0)) return;

      const baseRadiusSq = drop.magnetRadiusSq ?? 0;
      if (baseRadiusSq <= 0 || distSq === 0) return;

      // NEW: scale radius by passive ( (r * k)^2 = r^2 * k^2 )
      const effectiveRadiusSq = baseRadiusSq * (radiusMult * radiusMult);
      if (distSq > effectiveRadiusSq) return;

      const baseMaxSpeed = drop.maxSpeed ?? 0;
      const maxSpeed = baseMaxSpeed * speedMult;  // NEW: speed buff
      if (maxSpeed <= 0) return;

      const invDist = 1 / Math.sqrt(distSq);
      const dirX = dx * invDist;
      const dirY = dy * invDist;

      drop.body.setVelocity(dirX * maxSpeed, dirY * maxSpeed);
    });
  }
}
