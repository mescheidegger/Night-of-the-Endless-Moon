import Phaser from 'phaser';

/**
 * Coordinates the post-death flow for the player character.  When the
 * attached `HealthSystem` broadcasts an `entity:died` event we disable the
 * player, play the appropriate directional death animation, and apply the
 * dramatic slow-motion effect.  Once the animation finishes we emit the
 * `player:death:finished` signal so UI systems can present the Game Over
 * screen.
 */
export class PlayerDeathController {
  /**
   * @param {Phaser.Scene} scene - Parent scene so we can listen for events and restart.
   * @param {Phaser.Physics.Arcade.Sprite} player - Player sprite to animate and disable.
   * @param {HealthSystem} healthSystem - The health system emitting death events.
   */
  constructor(scene, player, healthSystem, {
    animationPrefix = ''
  } = {}) {
    this.scene = scene;
    this.player = player;
    this.healthSystem = healthSystem;
    this.dead = false;
    this.timeScaleBeforeDeath = scene.time.timeScale ?? 1;
    // Optional namespacing so hero-specific animation keys (e.g., `knight:die-down`) resolve correctly.
    this.animationPrefix = animationPrefix;

    this._onEntityDied = (payload) => this.handleEntityDied(payload);
    scene.events.on('entity:died', this._onEntityDied);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /**
   * Reacts to the global `entity:died` event.  We filter to the tracked
   * player so other entities can reuse the same bus without triggering the
   * death routine.
   */
  handleEntityDied(payload) {
    const entity = payload?.entity ?? payload;
    if (entity !== this.player || this.dead) {
      return;
    }

    this.dead = true;
    this.scene.playerInputDisabled = true;
    this.scene.playerCombatDisabled = true;

    // Freeze the player completely so they stop sliding mid-animation and
    // can no longer collide with enemies or props.
    if (this.player.body) {
      this.player.setVelocity(0, 0);
      this.player.setAcceleration(0, 0);
      this.player.body.setEnable(false);
      this.player.body.checkCollision.none = true;
    }

    // Reuse the scene's last movement direction so we play the correct
    // directional death animation (matching idle/walk).
    const dir = this.scene.playerFacing || 'down';
    const animKeyBase = `die-${dir}`;
    // Prefix keeps compatibility with legacy keys (`die-down`) while supporting namespaced hero sets.
    const animKey = this.animationPrefix ? `${this.animationPrefix}:${animKeyBase}` : animKeyBase;
    if (this.player.anims.currentAnim?.key !== animKey) {
      this.player.play(animKey);
    }

    // Apply a subtle slow motion effect during the death animation to add
    // weight and let the player register what happened.
    this.timeScaleBeforeDeath = this.scene.time.timeScale ?? 1;
    this.scene.time.timeScale = 0.6;

    // When the death animation finishes we emit a more specific event that
    // other systems (e.g., UI overlays) can hook into.
    const onAnimationComplete = (animation) => {
      if (animation?.key !== animKey) {
        return;
      }
      this.player.off(Phaser.Animations.Events.ANIMATION_COMPLETE, onAnimationComplete);
      this.scene.events.emit('player:death:finished', { entity: this.player });
    };
    this.player.on(Phaser.Animations.Events.ANIMATION_COMPLETE, onAnimationComplete);
  }

  /** Returns `true` once the death sequence has begun. */
  isActive() {
    return this.dead;
  }

  /**
   * Clean up event listeners and ensure the time scale is restored if the
   * controller is torn down while a death is active (e.g., scene switch).
   */
  destroy() {
    this.scene?.events.off('entity:died', this._onEntityDied);

    if (this.dead) {
      this.scene?.time && (this.scene.time.timeScale = this.timeScaleBeforeDeath || 1);
    }

    this.scene = null;
    this.player = null;
    this.healthSystem = null;
  }
}
