import Phaser from 'phaser';

/**
 * HeroHealthBar
 * --------------
 * A lightweight, **world-space** health bar that visually follows a hero sprite.
 * - Lives in world coordinates (scrolls/zooms with the camera) rather than HUD space.
 * - Subscribes to HealthSystem events so it updates without tight coupling to the scene UI.
 * - Uses two simple rectangles (background + fill) for minimal GC and draw cost.
 *
 * Jitter fix notes:
 * - The common diagonal “left/right shimmy” comes from half-pixel alignment (e.g. centering with odd widths)
 *   and/or rounding in multiple places (camera rounding vs manual rounding).
 * - This implementation anchors rectangles with origin (0,0) and does ONE final integer snap (floor) for x/y.
 * - Prefer physics body center/bottom when available (more stable than displayHeight-derived feet).
 */
export class HeroHealthBar {
  /**
   * @param {Phaser.Scene} scene - Owning scene; used for timers, tweens, and event bus.
   * @param {Object} config
   * @param {Phaser.GameObjects.Sprite} config.sprite - The hero sprite the bar tracks.
   * @param {import('../combat/HealthSystem.js').HealthSystem} config.health - Emits `health:changed` and exposes normalized health.
   * @param {number} [config.width=28] - Total width when at full health (in world pixels; respects camera zoom).
   * @param {number} [config.height=4] - Bar thickness (world pixels).
   * @param {number} [config.offsetX=0] - Horizontal offset from centered position (world pixels).
   * @param {number} [config.offsetY=0] - Vertical gap below the hero “feet”. Applied on top of body bottom or sprite bottom.
   * @param {number} [config.depthOffset=2] - Draw order offset relative to the hero sprite’s depth.
   * @param {number} [config.fadeDelayMs=0] - If >0, delay before fading out once health is full.
   * @param {number} [config.fadeDurationMs=200] - Tween duration for show/hide transitions.
   * @param {number} [config.warningThreshold=0.3] - Health fraction at/below which the bar turns to warning color.
   */
  constructor(scene, {
    sprite,
    health,
    width = 28,
    height = 4,
    offsetX = 0,
    offsetY = 0,
    depthOffset = 2,
    fadeDelayMs = 0,
    fadeDurationMs = 200,
    warningThreshold = 0.3
  } = {}) {
    this.scene = scene;
    this.sprite = sprite;
    this.health = health;

    // Visual + behavior knobs (kept on `this` so they can be adjusted at runtime if needed).
    this.width = width;
    this.height = height;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.fadeDelayMs = fadeDelayMs;
    this.fadeDurationMs = fadeDurationMs;
    this.warningThreshold = warningThreshold;

    // Compute a base depth above the sprite so the bar renders on top of the hero/glow.
    // Note: if the hero's depth changes at runtime, you may want to mirror that in update().
    const baseDepth = (sprite?.depth ?? 2) + depthOffset;

    // --- Display Objects -----------------------------------------------------
    // IMPORTANT: origin (0,0) so x/y represent TOP-LEFT. This avoids half-pixel wobble with centered origins.
    this.background = scene.add.rectangle(sprite?.x ?? 0, sprite?.y ?? 0, width, height, 0x1a0e18)
      .setOrigin(0, 0)
      .setScrollFactor(1)     // world-space (moves with camera)
      .setDepth(baseDepth)    // ensure it’s above the hero
      .setAlpha(0);           // start hidden; shown by `show(true)` below

    this.fill = scene.add.rectangle(sprite?.x ?? 0, sprite?.y ?? 0, width, height, 0xff365e)
      .setOrigin(0, 0)
      .setScrollFactor(1)
      .setDepth(baseDepth + 1)
      .setAlpha(0);

    // --- Event Handlers (bound once so we can unregister cleanly in destroy) ---
    this._onHealthChanged = (payload) => this.handleHealthChanged(payload);
    this._onEntityDied   = (payload) => this.handleEntityDied(payload);
    this._onSceneShutdown = () => this.destroy();

    scene.events.on('health:changed', this._onHealthChanged);
    scene.events.on('entity:died', this._onEntityDied);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this._onSceneShutdown);

    // Follow each frame.
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);

    // --- Fade bookkeeping ----------------------------------------------------
    this._fadeTimer = null;
    this._fadeTween = null;
    this._visible = false;
    this._lastRatio = Phaser.Math.Clamp(health?.normalized ?? 1, 0, 1);

    // Initialize visuals to the current ratio and become visible immediately.
    this._applyRatio(this._lastRatio);
    this.show(true);

    if (this._lastRatio >= 1) {
      this._scheduleFade();
    }
  }

  /**
   * Align the bar under the sprite each frame.
   * Strategy:
   * - Anchor from physics body center/bottom when available (most stable).
   * - Compute TOP-LEFT world x from centerX - width/2.
   * - Snap ONCE (floor) to keep pixel-art stable across diagonal movement.
   */
  update() {
    if (!this.scene || !this.sprite) return;

    const width = this.width ?? 0;

    const body = this.sprite.body;

    // Center X: body center is more stable than sprite.x when camera smoothing / physics integration are involved.
    const centerX = body
      ? (body.x + body.halfWidth)
      : (this.sprite.x ?? 0);

    // Feet/bottom Y: prefer physics body bottom; fall back to sprite bottom.
    const bottomY = body
      ? (body.y + body.height)
      : ((this.sprite.y ?? 0) + (this.sprite.displayHeight ?? 0) / 2);

    // Compute top-left in world space.
    const wx = (centerX - width * 0.5) + (this.offsetX ?? 0);
    const wy = bottomY + (this.offsetY ?? 0);

    // Single snap pass. (Avoid Math.round; floor tends to be more stable frame-to-frame for pixel art.)
    const x = Math.floor(wx);
    const y = Math.floor(wy);

    this.background?.setPosition(x, y);
    this.fill?.setPosition(x, y);
  }

  /**
   * React to HealthSystem updates.
   */
  handleHealthChanged(payload) {
    if (!payload || (payload.entity && payload.entity !== this.sprite)) return;

    const current = payload.current ?? payload.health ?? 0;
    const max = payload.max ?? payload.maxHealth ?? this.health?.maxHealth ?? 1;

    const ratio = Phaser.Math.Clamp(max > 0 ? current / max : 0, 0, 1);
    this._lastRatio = ratio;

    this._applyRatio(ratio);

    this.show(ratio < 1 ? true : false);

    if (ratio >= 1) {
      this._scheduleFade();
    } else {
      this._cancelFade();
    }
  }

  /**
   * On death, hide immediately (no tween) so the UI doesn't linger during game-over transitions.
   */
  handleEntityDied(payload) {
    if (!payload || payload.entity !== this.sprite) return;
    this.hide(true);
  }

  /**
   * Update the fill width and color for a given health ratio.
   */
  _applyRatio(ratio) {
    const width = this.width;
    if (!this.fill) return;

    // Snap fill edge to whole pixels.
    this.fill.displayWidth = Math.max(0, Math.round(width * ratio));

    const color = ratio <= this.warningThreshold ? 0xff7846 : 0xff365e;
    this.fill.setFillStyle(color);
  }

  /**
   * Show the bar.
   */
  show(immediate = false) {
    if (this._visible && !immediate) {
      this._cancelFadeTween();
      this._setAlpha(1);
      return;
    }

    this._visible = true;
    this._cancelFadeTween();

    if (immediate || !this.scene) {
      this._setAlpha(1);
      return;
    }

    this._tweenAlpha(1);
  }

  /**
   * Hide the bar.
   */
  hide(immediate = false) {
    this._visible = false;
    this._cancelFade();

    if (immediate || !this.scene) {
      this._setAlpha(0);
      return;
    }

    this._tweenAlpha(0);
  }

  /**
   * Tween alpha of both rectangles.
   */
  _tweenAlpha(targetAlpha) {
    if (!this.scene) return;

    this._cancelFadeTween();

    const targets = [this.background, this.fill].filter(Boolean);
    if (targets.length === 0) return;

    this._fadeTween = this.scene.tweens.add({
      targets,
      alpha: targetAlpha,
      duration: this.fadeDurationMs,
      ease: 'Quad.Out',
      onComplete: () => {
        this._fadeTween = null;
        this._setAlpha(targetAlpha);
      }
    });
  }

  /**
   * Helper to set alpha on both rectangles without tweening.
   */
  _setAlpha(alpha) {
    if (this.background) this.background.setAlpha(alpha);
    if (this.fill) this.fill.setAlpha(alpha);
  }

  /**
   * Schedule a one-shot delayed fade-out when full HP.
   */
  _scheduleFade() {
    if (!this.scene || this.fadeDelayMs <= 0) return;

    this._cancelFade();

    this._fadeTimer = this.scene.time.delayedCall(this.fadeDelayMs, () => {
      this._fadeTimer = null;
      if (!this._visible) return;
      this._tweenAlpha(0);
    });
  }

  /**
   * Cancel any pending delayed fade and any active fade tween.
   */
  _cancelFade() {
    if (this._fadeTimer) {
      this._fadeTimer.remove(false);
      this._fadeTimer = null;
    }
    this._cancelFadeTween();
  }

  /**
   * Cancel and clear the active alpha tween (if any).
   */
  _cancelFadeTween() {
    if (this._fadeTween) {
      this._fadeTween.stop();
      this._fadeTween.remove();
      this._fadeTween = null;
    }
  }

  /**
   * Clean up.
   */
  destroy() {
    if (!this.scene) return;

    this.scene.events.off('health:changed', this._onHealthChanged);
    this.scene.events.off('entity:died', this._onEntityDied);
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this._onSceneShutdown);

    this._cancelFade();

    this.background?.destroy();
    this.fill?.destroy();

    this.background = null;
    this.fill = null;
    this.sprite = null;
    this.health = null;
    this.scene = null;
  }
}
