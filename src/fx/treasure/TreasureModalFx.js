import { getTreasureFxVariant } from './treasureFxVariants.js';
import { resolveTreasureTextureKey } from './textures.js';

/**
 * TreasureModalFx encapsulates the particle lifecycle used by TreasurePickupModal.
 *
 * UI code should treat this class as a tiny controller with three entry points:
 * - attach(...) to create/start the effect
 * - onResize() to keep the emitter aligned with the modal container
 * - destroy() to clean up timers + emitter resources
 */
export class TreasureModalFx {
  constructor({ debug = true } = {}) {
    // When true, texture resolution will warn if a variant references a missing key.
    this.debug = debug;

    // Runtime references supplied during attach().
    this.scene = null;
    this.anchorContainer = null;

    // Optional depth baseline used when deriving emitter depth.
    this.depthBase = 0;

    // Active variant id (treasure type), e.g. `treasure_3`.
    this.variant = 'default';

    // Cached resolved variant config object from treasureFxVariants.
    this._variantConfig = null;

    // Phaser particle emitter GameObject created in attach().
    this._emitterGO = null;

    // Local (container-relative) offset used to reposition emitter on resize.
    this._localPosition = null;

    // DelayedCall handles so we can cancel pending callbacks on destroy.
    this._timers = [];
  }

  /**
   * Create and start modal particle FX for the given variant.
   *
   * @param {object} options
   * @param {Phaser.Scene} options.scene - Scene owning the effect.
   * @param {Phaser.GameObjects.Container} options.anchorContainer - Modal container to follow.
   * @param {number} [options.depthBase=0] - Fallback depth if container depth is unavailable.
   * @param {string} [options.variant='default'] - Treasure variant key/type.
   */
  attach({ scene, anchorContainer, depthBase = 0, variant = 'default' } = {}) {
    // Ensure this instance never holds onto previous emitter/timer state.
    this.destroy();

    if (!scene || !anchorContainer) return;

    this.scene = scene;
    this.anchorContainer = anchorContainer;
    this.depthBase = Number.isFinite(depthBase) ? depthBase : 0;
    this.variant = variant;

    // Resolve the variant config, automatically falling back to `default`.
    this._variantConfig = getTreasureFxVariant(variant);

    // Resolve to a usable texture (prefer preloaded, fallback to procedural).
    const textureKey = resolveTreasureTextureKey(this.scene, this._variantConfig, { debug: this.debug });
    if (!textureKey) return;

    // Cache local offsets so onResize() can keep alignment stable.
    const localX = Number(this._variantConfig?.localX) || 0;
    const localY = Number(this._variantConfig?.localY) || 0;
    this._localPosition = { x: localX, y: localY };

    // Convert modal-local coordinates to world coordinates.
    const worldX = this.anchorContainer.x + localX;
    const worldY = this.anchorContainer.y + localY;

    // Render above the modal panel/container.
    const depth = (this.anchorContainer.depth ?? this.depthBase) + 3;

    // Create emitter GO with variant-provided config.
    this._emitterGO = this.scene.add.particles(
      worldX,
      worldY,
      textureKey,
      { ...(this._variantConfig?.emitter ?? {}) }
    );

    this._emitterGO
      .setScrollFactor(0)
      .setDepth(depth);

    // Short burst timing defaults; can be overridden per variant.
    const burstDurationMs = Number(this._variantConfig?.burstDurationMs) || 260;
    const popDelayMs = Number(this._variantConfig?.popDelayMs) || 140;
    const popFallbackDurationMs = Number(this._variantConfig?.popFallbackDurationMs) || 80;
    const popCount = Number(this._variantConfig?.popCount) || 10;

    // Stop regular emission shortly after appearing to preserve burst feel.
    this._timers.push(this.scene.time.delayedCall(burstDurationMs, () => {
      this._emitterGO?.stop?.();
    }));

    // Optional second pop burst to add impact.
    this._timers.push(this.scene.time.delayedCall(popDelayMs, () => {
      if (!this._emitterGO || !this.anchorContainer) return;

      // Phaser versions vary; prefer explode, fallback to brief start/stop.
      if (typeof this._emitterGO.explode === 'function') {
        this._emitterGO.explode(popCount);
      } else {
        this._emitterGO.start();
        this._timers.push(this.scene.time.delayedCall(popFallbackDurationMs, () => this._emitterGO?.stop?.()));
      }
    }));
  }

  /**
   * Re-anchor the emitter after modal layout changes (resize/reflow).
   */
  onResize() {
    if (!this._emitterGO || !this.anchorContainer || !this._localPosition) return;

    this._emitterGO.setPosition(
      this.anchorContainer.x + this._localPosition.x,
      this.anchorContainer.y + this._localPosition.y
    );
  }

  /**
   * Fully release resources owned by this helper.
   * Safe to call repeatedly.
   */
  destroy() {
    // Cancel pending delayed callbacks to avoid firing after teardown.
    this._timers.forEach((timer) => timer?.remove?.(false));
    this._timers.length = 0;

    // Destroying the emitter GO also cleans up particle internals.
    this._emitterGO?.destroy?.();
    this._emitterGO = null;

    // Drop references so GC can reclaim everything cleanly.
    this._localPosition = null;
    this._variantConfig = null;
    this.anchorContainer = null;
    this.scene = null;
  }
}
