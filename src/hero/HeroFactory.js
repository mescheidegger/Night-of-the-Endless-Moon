import Phaser from 'phaser';
import { HealthSystem } from '../combat/HealthSystem.js';
import { getHeroEntry } from './HeroRegistry.js';
import { HeroController } from './HeroController.js';
import { HeroDeathController } from './HeroDeathController.js';
import { HeroHealthBar } from './HeroHealthBar.js';

/**
 * Apply physics body sizing/offsets as defined in the registry entry.
 */
function applyBodyConfig(sprite, bodyConfig = {}) {
  if (!sprite?.body) return;
  const { circle } = bodyConfig;
  if (circle) {
    const { radius = 10, offsetX = 0, offsetY = 0 } = circle;
    sprite.setCircle(radius, offsetX, offsetY);
  }
  sprite.body.setAllowGravity(false);
}

/**
 * Copy damping/drag/max velocity tuning onto the sprite so movement mirrors the
 * pre-refactor behaviour.
 */
function applyPhysicsTuning(sprite, stats = {}) {
  if (!sprite) return;
  if (stats.damping) {
    sprite.setDamping(true);
  }
  if (typeof stats.drag === 'number') {
    sprite.setDrag(stats.drag);
  }
  if (typeof stats.maxVelocity === 'number') {
    sprite.setMaxVelocity(stats.maxVelocity);
  }
}

/**
 * Factory helper used by GameScene to spawn the selected hero and wire up all
 * supporting systems (health, controllers, cosmetics) in a single call.
 */
export function createHero(scene, heroKey, {
  x = 0,
  y = 0,
  onFacingChange
} = {}) {
  const entry = getHeroEntry(heroKey);
  const { sheets, depth = {}, stats = {}, cosmetics = {}, defaultFacing = 'down' } = entry;
  const singleDirection = Boolean(entry.animations?.singleDirection);

  const idleSheet = sheets?.idle;
  const animations = entry.animations ?? {};
  const rowIndex = animations.rowByDirection?.[defaultFacing] ?? 0;
  const idleFramesPerRow = animations.framesPerRowBySheet?.idle
    ?? animations.framesPerRow
    ?? idleSheet?.frameCount
    ?? 1;
  const idleFrameCount = idleSheet?.frameCount ?? idleFramesPerRow ?? 1;
  const startFrame = Math.min(Math.max(0, idleFrameCount - 1), rowIndex * idleFramesPerRow);

  // Build the Arcade sprite using the idle frame that matches the hero's default facing.
  const sprite = scene.physics.add.sprite(x, y, idleSheet?.key, startFrame).setDepth(depth.sprite ?? 2);
  applyPhysicsTuning(sprite, stats);
  applyBodyConfig(sprite, entry.body);

  // Optional additive glow (names + blend pulled from the registry).
  const glowKey = cosmetics.glowKey;
  const glow = glowKey
    ? scene.add.image(sprite.x, sprite.y, glowKey)
        .setDepth(cosmetics.glowDepth ?? (depth.sprite ?? 2) - 1)
        .setBlendMode(cosmetics.glowBlend ?? Phaser.BlendModes.ADD)
    : null;

  const health = new HealthSystem(scene, sprite, {
    maxHealth: stats.maxHealth,
    iFrameDuration: stats.iframeMs
  });

  const healthBar = new HeroHealthBar(scene, {
    sprite,
    health,
    width: cosmetics.healthBarWidth ?? 28,
    offsetY: cosmetics.healthBarOffsetY //?? 6
  });

  const controller = new HeroController(scene, {
    heroKey: entry.key,
    sprite,
    glow,
    health,
    stats,
    defaultFacing,
    onFacingChange,
    animationPrefix: entry.key,
    singleDirection
  });

  const deathController = new HeroDeathController(scene, sprite, health, {
    animationPrefix: entry.key
  });
  controller.attachDeathController(deathController);

  // Structured hero interface consumed by GameScene and HUD layers.
  return {
    key: entry.key,
    sprite,
    glow,
    health,
    healthBar,
    controller,
    deathController,
    /** Dispose all hero subsystems so pooled scenes don't leak references. */
    destroy() {
      controller?.destroy?.();
      deathController?.destroy?.();
      health?.destroy?.();
      healthBar?.destroy?.();
      glow?.destroy?.();
      sprite?.destroy?.();
    }
  };
}

export const HeroFactory = { create: createHero };
