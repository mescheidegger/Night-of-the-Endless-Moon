/**
 * DamageNumberSystem
 *
 * Displays floating damage/heal numbers using a BitmapFont. Uses a small pool
 * so we avoid constantly creating/destroying BitmapText objects during combat.
 * 
 * Important: This system is designed to be *shutdown-safe*. It will gracefully
 * no-op if the scene is already shutting down, avoiding Phaser tween crashes.
 */
export class DamageNumberSystem {
  /**
   * @param {Phaser.Scene} scene - The scene that owns this system.
   * @param {object} [config]
   * @param {string} [config.fontKey='damage'] - BitmapFont key loaded in BootScene.
   * @param {number} [config.size=16] - Base font size.
   * @param {number} [config.depth=1000] - Render depth above sprites.
   */
  constructor(scene, { fontKey = 'damage', size = 16, depth = 1000 } = {}) {
    this.scene = scene;
    this.fontKey = fontKey;
    this.size = size;
    this.depth = depth;
    this._destroyed = false;    // Used to prevent new spawns after teardown.

    // Object pool of BitmapText objects (no classType → we control creation).
    this.pool = scene.add.group({ maxSize: 128, runChildUpdate: false });

    // Warn in dev if the font isn't present (helps catch BootScene load issues).
    if (!scene.cache.bitmapFont.exists(this.fontKey)) {
      console.warn(`[DamageNumberSystem] BitmapFont not loaded: ${this.fontKey}`);
    }
  }

  /**
   * Internal helper to fetch or create a BitmapText object.
   * Automatically handles scene-shutdown safety conditions.
   */
  _acquire() {
    // If the scene is shutting down or we've been destroyed, don't create text.
    if (this._destroyed || !this.scene?.sys || this.scene.sys.isDestroyed) return null;

    // Attempt to reuse an inactive pooled text instance.
    let txt = this.pool?.getFirstDead?.(false);

    // If none are available, create one and register it in the pool.
    if (!txt) {
      txt = this.scene.add.bitmapText(0, 0, this.fontKey, '', this.size).setDepth(this.depth);
      this.pool?.add?.(txt);
    }

    // Reset display properties so reused text looks fresh.
    txt.setActive(true)
       .setVisible(true)
       .setAlpha(1)
       .setScale(1)
       .setAngle(Phaser.Math.Between(-8, 8)); // slight random tilt → organic feel

    return txt;
  }

  /**
   * Spawn a floating damage/heal number at the given position.
   * Handles tinting, crit scaling, upward float animation, and fade-out.
   */
  pop(x, y, value, { tint = null, crit = false, vy = -22, duration = 600 } = {}) {
    const txt = this._acquire();
    if (!txt) return; // Scene may be shutting down → safe exit.

    // Apply text and small jitter to avoid perfectly aligned spam.
    txt.setText(String(value))
       .setPosition(
         x + Phaser.Math.Between(-4, 4),
         y + Phaser.Math.Between(-6, 2)
       );

    // Color (damage = red-ish, heal = green-ish, crit = gold-ish).
    if (tint != null && txt.setTint) txt.setTint(tint);
    else txt.clearTint();

    // Crit hits get a slightly larger starting scale.
    if (crit) txt.setScale(1.25);

    // If tweens are already gone (scene shutting down), just recycle immediately.
    if (!this.scene?.tweens) {
      txt.setActive(false).setVisible(false).setText('');
      return;
    }

    // Tween upward + fade-out.
    this.scene.tweens.add({
      targets: txt,
      y: txt.y + vy,
      alpha: 0,
      ease: 'cubic.out',
      duration,
      onComplete: () => {
        // Defensive cleanup: scene may be mid-destroy.
        if (txt?.setActive) txt.setActive(false).setVisible(false).setText('');
      }
    });
  }

  /**
   * Convenience helper for attaching a damage/heal number to an entity.
   * This adjusts the Y-position to appear above the sprite.
   */
  hitEntity(entity, amount, opts = {}) {
    if (!entity || this._destroyed) return;
    this.pop(
      entity.x,
      entity.y - (entity.height ? entity.height * 0.6 : 12),
      amount,
      opts
    );
  }

  /**
   * Mark the system as destroyed and release references.
   * 
   * **Important:** We intentionally do NOT:
   *  - kill tweens manually,
   *  - empty or destroy the group,
   *  - destroy BitmapText objects.
   * 
   * The Scene shutdown pipeline handles display object cleanup safely. Touching
   * tween/group internals during shutdown can throw "reading 'entries'" errors.
   */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.pool = null;
    this.scene = null;
  }
}
