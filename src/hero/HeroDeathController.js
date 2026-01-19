import { PlayerDeathController } from '../combat/PlayerDeathController.js';

/**
 * Thin adapter that reuses the existing PlayerDeathController while keeping the
 * hero domain layer API consistent (controller/deathController pairing).
 */
export class HeroDeathController {
  constructor(scene, sprite, health, { animationPrefix = '' } = {}) {
    this.scene = scene;
    this.sprite = sprite;
    this.health = health;
    this.controller = new PlayerDeathController(scene, sprite, health, { animationPrefix });
  }

  /** Expose whether the wrapped death sequence is currently playing. */
  isActive() {
    return this.controller?.isActive?.() ?? false;
  }

  /** Release references so pooled heroes can be garbage collected cleanly. */
  destroy() {
    this.controller?.destroy?.();
    this.controller = null;
    this.scene = null;
    this.sprite = null;
    this.health = null;
  }
}
