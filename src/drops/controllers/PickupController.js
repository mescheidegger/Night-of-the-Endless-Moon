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

    // Expose collectDrop/collectXP for legacy code paths. The wrapper lets us
    // detach it on destroy() without mutating GameScene directly.
    this._collectHook = (drop) => this.collectDrop(drop);
    this.scene.collectDrop = this._collectHook;
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
   * Handle drop rewards (XP, health, etc.) and recycle the drop back into the pool.
   */
  collectDrop(drop) {
    if (!drop || !drop.active) return;

    const value = (typeof drop.value === 'object' && drop.value !== null)
      ? drop.value
      : { currency: 'xp', amount: drop.value };
    const amount = Math.max(0, Number(value?.amount) || 0);

    if (amount > 0) {
      if (value?.currency === 'health') {
        const health = this.scene.playerHealth ?? this.scene.hero?.health;
        const healed = health?.heal?.(amount);
        if (healed) {
          this.scene.events?.emit('player:healed', { amount, source: drop.type });
        }
      } else {
        this.levelFlow?.addXP?.(amount);
        this.scene.playerXP = Number(this.scene.playerXP ?? 0) + amount;
      }
    }

    // collectDrop tail
    drop.body?.stop?.();
    drop.body?.setVelocity?.(0, 0);
    this.dropManager?.release?.(drop);
  }

  /**
   * Backward-compatible XP entry point.
   */
  collectXP(orb) {
    this.collectDrop(orb);
  }

  /**
   * Remove event hooks and references when GameScene shuts down.
   */
  destroy() {
    if (this.overlap) {
      this.scene.physics?.world?.removeCollider?.(this.overlap);
      this.overlap = null;
    }

    if (this.scene && this.scene.collectDrop === this._collectHook) {
      delete this.scene.collectDrop;
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
