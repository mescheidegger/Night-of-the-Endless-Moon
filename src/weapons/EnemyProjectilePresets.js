import { WeaponRegistry } from './WeaponRegistry.js';

/** Provide getEnemyProjectileConfigFromWeaponKey so callers can reuse shared logic safely. */
export function getEnemyProjectileConfigFromWeaponKey(key, overrides = null) {
  const entry = WeaponRegistry[key];
  if (!entry) return null;

  const proj = entry.projectile ?? {};
  const aoe = entry.aoe ?? null;

  const base = {
    texture: proj.texture ?? null,
    animKey: proj.animKey ?? null,
    atlas: proj.atlas ?? null,
    atlasFrame: proj.atlasFrame ?? null,
    body: proj.body ?? (proj.frameWidth && proj.frameHeight
      ? { width: proj.frameWidth, height: proj.frameHeight }
      : null),
    speed: proj.speed ?? 200,
    lifetimeMs: proj.lifetimeMs ?? 3000,
    damage: entry.damage?.base ?? 1,
    explosion: proj.explosion ?? null,
    aoe: aoe && aoe.enabled ? aoe : null,
    repeat: Number.isFinite(proj.repeat) ? proj.repeat : undefined,
    rotateToVelocity: proj.rotateToVelocity ?? true, 
  };

  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    body: overrides.body ?? base.body,
    aoe: overrides.aoe ?? base.aoe,
    explosion: overrides.explosion ?? base.explosion,
    rotateToVelocity:
      overrides.rotateToVelocity ?? base.rotateToVelocity,
  };
}

