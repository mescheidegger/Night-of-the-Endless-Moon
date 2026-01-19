import Phaser from 'phaser';
import { deepClone } from '../../core/clone.js';

/**
 * computeEffective(baseConfig, modifiers)
 *
 * Produces a *runtime-effective* weapon configuration by cloning a base weapon config
 * and then applying a list of modifier objects to it.
 *
 * Each modifier has a `type` (string) and `value` (number). This function applies them
 * deterministically, updating fields like:
 *  - attack delay
 *  - number of projectiles
 *  - damage scaling
 *  - AoE properties
 *  - Cluster / chain weapon archetype behaviors
 *
 * This allows weapons to scale dynamically as the player levels up, picks buffs, etc.
 *
 * @param {Object} baseConfig - The weapon's original configuration object
 * @param {Array<Object>} modifiers - A list of modifier entries to apply
 * @returns {Object} - A cloned + modified effective configuration
 */
export function computeEffective(baseConfig = {}, modifiers = []) {
  // 🔒 IMPORTANT: Make a *deep* clone so no nested objects point back to the registry.
  const effective = deepClone(baseConfig);

  // If no modifiers, return clone as-is.
  if (!modifiers?.length) return effective;

  const applyPathModifier = (mod) => {
    const { op, path, value } = mod ?? {};
    if (!op || !path) return false;

    const segments = String(path).split('.').filter(Boolean);
    if (!segments.length) return false;

    let target = effective;
    for (let i = 0; i < segments.length - 1; i += 1) {
      target = target?.[segments[i]];
      if (target === undefined || target === null) {
        return true; // Path missing: intentionally no-op
      }
    }

    const leaf = segments[segments.length - 1];
    const current = target?.[leaf];
    if (!Number.isFinite(current)) return true;

    const val = Number(value);
    if (!Number.isFinite(val)) return true;

    if (op === 'mult') {
      target[leaf] = current * val;
    } else if (op === 'add') {
      target[leaf] = current + val;
    }

    return true;
  };

  modifiers.forEach((mod) => {
    if (!mod || typeof mod !== 'object') return;

    // Path-based modifiers (from progression, etc.)
    if (mod.op && mod.path) {
      applyPathModifier(mod);
      return;
    }

    const { type, value } = mod;

    switch (type) {
      /**
       * Cooldown modifier: Multiply delayMs by (1 + value)
       * value = -0.2 means 20% faster firing
       */
      case 'delayMs%': {
        const pct = 1 + (value ?? 0);
        effective.cadence = effective.cadence || {};
        effective.cadence.delayMs = Math.max(40, (effective.cadence.delayMs ?? 600) * pct);
        break;
      }

      /**
       * Additively increase projectile count in a salvo.
       * Ensures final value stays >= 1.
       */
      case 'projectileCount': {
        effective.cadence = effective.cadence || {};
        effective.cadence.salvo = Math.max(1, (effective.cadence.salvo ?? 1) + (value ?? 0));
        break;
      }

      /**
       * Range scaling, multiplicative.
       */
      case 'range%': {
        const pct = 1 + (value ?? 0);
        effective.targeting = effective.targeting || {};
        effective.targeting.range = Math.max(0, (effective.targeting.range ?? 0) * pct);
        break;
      }

      /**
       * Damage scaling, multiplicative on base damage.
       */
      case 'damage%': {
        const pct = 1 + (value ?? 0);
        effective.damage = effective.damage || {};
        effective.damage.base = (effective.damage.base ?? 0) * pct;
        break;
      }

      /**
       * AoE radius scaling.
       */
      case 'aoeRadius%': {
        const pct = 1 + (value ?? 0);
        effective.aoe = effective.aoe || {};
        effective.aoe.radius = Math.max(0, (effective.aoe.radius ?? 0) * pct);
        break;
      }

      /**
       * AoE damage multiplier scaling.
       */
      case 'aoeDamage%': {
        const pct = 1 + (value ?? 0);
        effective.aoe = effective.aoe || {};
        effective.aoe.damageMult = Math.max(0, (effective.aoe.damageMult ?? 0) * pct);
        break;
      }

      /**
       * Increase AoE target cap additively (only if maxTargets is numeric).
       */
      case 'aoeMaxTargets+': {
        effective.aoe = effective.aoe || {};
        if (Number.isFinite(effective.aoe.maxTargets)) {
          effective.aoe.maxTargets = Math.max(0, (effective.aoe.maxTargets ?? 0) + (value ?? 0));
        }
        break;
      }

      /**
       * AoE falloff scaling.
       */
      case 'aoeFalloff%': {
        const pct = 1 + (value ?? 0);
        effective.aoe = effective.aoe || {};
        effective.aoe.falloff = Math.max(0, (effective.aoe.falloff ?? 0) * pct);
        break;
      }

      /**
       * Cluster archetype: increase number of explosions in cluster bomb.
       */
      case 'clusterCount+': {
        const arch = (effective.archetype = effective.archetype || {});
        arch.cluster = arch.cluster || {};
        arch.cluster.count = Math.max(1, (arch.cluster.count ?? 3) + (value ?? 0));
        break;
      }

      /**
       * Cluster spread scaling.
       */
      case 'clusterSpread%': {
        const arch = (effective.archetype = effective.archetype || {});
        arch.cluster = arch.cluster || {};
        const pct = 1 + (value ?? 0);
        arch.cluster.spreadRadius = Math.max(0, (arch.cluster.spreadRadius ?? 72) * pct);
        break;
      }

      /**
       * Cluster stagger timing scaling.
       */
      case 'clusterStagger%': {
        const arch = (effective.archetype = effective.archetype || {});
        arch.cluster = arch.cluster || {};
        const pct = 1 + (value ?? 0);
        arch.cluster.staggerMs = Math.max(0, (arch.cluster.staggerMs ?? 60) * pct);
        break;
      }

      /**
       * Chain weapon hop distance scaling.
       */
      case 'hopRadius%': {
        const arch = (effective.archetype = effective.archetype || {});
        arch.chain = arch.chain || {};
        const pct = 1 + (value ?? 0);
        arch.chain.hopRadius = Math.max(0, (arch.chain.hopRadius ?? 260) * pct);
        break;
      }

      /**
       * Chain maximum number of hops.
       */
      case 'maxHops+': {
        const arch = (effective.archetype = effective.archetype || {});
        arch.chain = arch.chain || {};
        arch.chain.maxHops = Math.max(
          1,
          Math.floor((arch.chain.maxHops ?? 11) + (value ?? 0))
        );
        break;
      }

      /**
       * Chain damage falloff per hop scaling.
       */
      case 'falloffPerHop%': {
        const arch = (effective.archetype = effective.archetype || {});
        arch.chain = arch.chain || {};
        const pct = 1 + (value ?? 0);
        arch.chain.falloffPerHop = Math.max(
          0,
          (arch.chain.falloffPerHop ?? 0.1) * pct
        );
        break;
      }

      /**
       * Chain animation stride increase.
       */
      case 'frameStride+': {
        const arch = (effective.archetype = effective.archetype || {});
        arch.chain = arch.chain || {};
        arch.chain.frameStride = Math.max(
          1,
          Math.floor((arch.chain.frameStride ?? 1) + (value ?? 0))
        );
        break;
      }

      default:
        break;
    }
  });

  return effective;
}
