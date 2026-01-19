import { CollectSystem } from '../systems/CollectSystem.js';
import { MagnetSystem } from '../systems/MagnetSystem.js';

/**
 * PickupController glues together the drop systems and XP bookkeeping.
 * GameScene used to host all of this, but moving it here keeps update() tidy
 * and lets us reuse the behaviour for future scenes or challenge modes.
 */
export class PickupController {
  /**
   * Bind drop collection systems to the scene, player, and progression flow.
   * This consolidates pickup behavior so GameScene stays focused on orchestration.
   */
  constructor(scene, { dropManager, player, levelFlow } = {}) {
    this.scene = scene;
    this.dropManager = dropManager;
    this.levelFlow = levelFlow;

    const group = dropManager?.getGroup?.();
    const passiveManager = scene.passiveManager ?? null;

    // CollectSystem handles overlap callbacks and instant collection when the
    // player touches a drop.
    this.collectSystem = new CollectSystem(scene, { group, player, passiveManager });
    // MagnetSystem pulls drops toward the player after their magnet delay.
    this.magnetSystem = new MagnetSystem(scene, { group, player, passiveManager, dropManager });

    // Expose collectXP for legacy code paths. The wrapper lets us detach it on
    // destroy() without mutating GameScene directly.
    this._collectHook = (orb) => this.collectXP(orb);
    this.scene.collectXP = this._collectHook;

    if (group && player) {
      this.overlap = scene.physics.add.overlap(player, group, this.collectSystem.onOverlap);
    }
  }

  /**
   * Advance magnet + collect systems every frame.
   */
  update(dt) {
    this.collectSystem?.update?.();
    this.magnetSystem?.update?.(dt);
  }

  /**
   * Handle XP reward and recycle the drop back into the pool.
   */
  collectXP(orb) {
    if (!orb || !orb.active) return;

    const raw = (typeof orb.value === 'object') ? orb.value?.amount : orb.value;
    const gained = Math.max(0, Number(raw) || 0);

    if (gained > 0) {
      this.levelFlow?.addXP?.(gained);
      this.scene.playerXP = Number(this.scene.playerXP ?? 0) + gained;
    }

    orb.body?.stop?.();
    orb.body?.setVelocity(0, 0);
    this.dropManager?.release?.(orb);
  }

  /**
   * Remove event hooks and references when GameScene shuts down.
   */
  destroy() {
    if (this.overlap) {
      this.scene.physics?.world?.removeCollider?.(this.overlap);
      this.overlap = null;
    }

    if (this.scene && this.scene.collectXP === this._collectHook) {
      delete this.scene.collectXP;
    }

    this.collectSystem = null;
    this.magnetSystem = null;
    this.dropManager = null;
    this.levelFlow = null;
    this.scene = null;
    this._collectHook = null;
  }
}
