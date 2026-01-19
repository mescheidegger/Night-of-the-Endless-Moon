import Phaser from 'phaser';
import * as AnimSafe from './core/AnimSafe.js';
import * as AoeTiming from './core/AoeTiming.js';
import { runAoe } from './AoeUtils.js';

/**
 * Spawn an optional explosion sprite and trigger AoE damage based on configuration.
 *
 * The helper mirrors the timing/cleanup approach used by other controllers so
 * ballistic weapons can opt into richer visuals without duplicating logic.
 */
export function spawnExplosionFxAndAoe({
  scene,
  origin,
  payload,
  explosionCfg,
  enemyGroup,
  damagePipeline,
  sourceKey,
  onHit,
  aoeCfgOverride,
  // NEW: allow callers (e.g., bazooka pulse loops) to suppress repeated "exploded" audio/events
  emitExplodedEvent = true
}) {
  if (!scene || !explosionCfg) return { cleanup: () => {} };

  const radius = explosionCfg.radius ?? 0;
  const damageMult = explosionCfg.damageMult ?? 1;
  const maxTargets = Number.isFinite(explosionCfg.maxTargets) ? explosionCfg.maxTargets : Infinity;
  const falloff = explosionCfg.falloff ?? 0;
  const timing = explosionCfg.timing ?? 'impact';

  const derivedAoeConfig = {
    enabled: true,
    radius,
    damageMult,
    maxTargets,
    falloff,
    timing,
    animationFrameIndex: explosionCfg.animationFrameIndex,
    innerForgivenessPx: explosionCfg.innerForgivenessPx,
    arcDeg: explosionCfg.arcDeg,
    angleRad: explosionCfg.angleRad,
    arcSlack: explosionCfg.arcSlack
  };

  const aoeConfig = aoeCfgOverride ? { enabled: true, ...aoeCfgOverride } : derivedAoeConfig;

  const triggerAoe = () => {
    const hits = runAoe({
      scene,
      enemyGroup,
      origin,
      baseDamage: payload?.damage ?? 0,
      cfg: aoeConfig,
      damagePipeline,
      sourceKey
    });

    if (emitExplodedEvent) {
      scene?.events?.emit?.('weapons:exploded', {
        weaponKey: explosionCfg.texture,
        x: origin.x,
        y: origin.y,
        radius,
        hits
      });
    }

    if (hits > 0) {
      onHit?.(hits);
    }

    return hits;
  };

  const hasFx =
    explosionCfg.texture && explosionCfg.animKey && scene.textures?.exists?.(explosionCfg.texture);

  if (!hasFx) {
    triggerAoe();
    return { cleanup: () => {} };
  }

  const sprite = scene.add
    ?.sprite(origin.x, origin.y, explosionCfg.texture)
    ?.setDepth(explosionCfg.depth ?? 8)
    ?.setOrigin(explosionCfg.originX ?? 0.5, explosionCfg.originY ?? 0.5);

  if (!sprite) {
    triggerAoe();
    return { cleanup: () => {} };
  }

  if (explosionCfg.blendMode) {
    sprite.setBlendMode(explosionCfg.blendMode);
  } else {
    sprite.setBlendMode(Phaser.BlendModes.NORMAL);
  }

  const aoeState = AoeTiming.attach(sprite, aoeConfig, {
    trigger: triggerAoe,
    defaultFrameIndex: explosionCfg.defaultFrameIndex ?? 0
  });

  const handlers = aoeState.listeners || {};
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;

    aoeState.detach?.();
    AnimSafe.detach(sprite, handlers);

    if (!aoeState.triggered) {
      aoeState.trigger();
    }

    if (sprite.scene) {
      sprite.destroy();
    }
  };

  const originalComplete = handlers.onComplete;
  handlers.onComplete = (...args) => {
    originalComplete?.(...args);
    cleanup();
  };

  const { played } = AnimSafe.playIfExists(sprite, explosionCfg.animKey, handlers);

  if (!played) {
    if (aoeConfig.timing !== 'expire') {
      aoeState.trigger();
    }

    const timer = scene.time?.delayedCall?.(200, cleanup);
    if (!timer) {
      cleanup();
    }
  }

  return { cleanup };
}
