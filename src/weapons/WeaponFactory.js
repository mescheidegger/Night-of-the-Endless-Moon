import Phaser from 'phaser';
import { CONFIG } from '../config/gameConfig.js';
import { deepClone } from '../core/clone.js';
import { WeaponRegistry } from './WeaponRegistry.js';
import { ProjectileWeaponController } from './controllers/ProjectileWeaponController.js';
import { StrikeWeaponController } from './controllers/StrikeWeaponController.js';
import { ClusterBombWeaponController } from './controllers/ClusterBombWeaponController.js';
import { BazookaWeaponController } from './controllers/BazookaWeaponController.js';
import { ChainLightningController } from './controllers/ChainLightningController.js';
import { ChainThrowController } from './controllers/ChainThrowController.js';
import { SparkCrossController } from './controllers/SparkCrossController.js';
import { BallisticWeaponController } from './controllers/BallisticWeaponController.js';
import { SlashWeaponController } from './controllers/SlashWeaponController.js';
import { ProjectilePool } from './ProjectilePool.js';
import { BurstProjectileWeaponController } from './controllers/BurstProjectileWeaponController.js';

/**
 * Builds lightweight visual FX helpers for muzzle flash + impact spark effects.
 * These do not require pooling because they are short-lived and fade out quickly.
 */
function buildFxHandlers(scene, fxConfig) {
  if (!fxConfig) return {};

  return {
    /**
     * Show a muzzle flash effect at the firing position.
     */
    muzzle(origin, angle) {
      const key = fxConfig.muzzleKey ?? fxConfig.muzzle;
      if (!key) return;

      // Create a transient additive-blended flash sprite
      const spark = scene.add.image(origin.x, origin.y, key)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(7)
        .setRotation(angle)
        .setScale(1.1);

      // Fade it out over a fraction of a second, then clean up
      scene.tweens.add({
        targets: spark,
        alpha: 0,
        duration: 120,
        onComplete: () => spark.destroy()
      });
    },

    /**
     * Show a spark effect at projectile impact position.
     */
    impact(x, y) {
      const key = fxConfig.impactKey ?? fxConfig.impact;
      if (!key) return;

      const spark = scene.add.image(x, y, key)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(7)
        .setScale(1.1);

      scene.tweens.add({
        targets: spark,
        alpha: 0,
        duration: 120,
        onComplete: () => spark.destroy()
      });
    }
  };
}

/**
 * Factory for constructing weapon instances.
 * Handles config cloning, pooling setup, FX wiring, and controller selection.
 *
 * @param {Phaser.Scene} scene - Main game scene.
 * @param {Object} options
 * @param {Phaser.Physics.Arcade.Group} options.enemyGroup - Group of enemies weapon can target.
 * @param {Object} options.damagePipeline - Central damage handler.
 * @param {Phaser.Events.EventEmitter} options.events - Event emitter for game-wide events.
 */

export function WeaponFactory(scene, options = {}) {
  const { enemyGroup, damagePipeline, events, targetingCoordinator } = options;

  return {
    /**
     * Creates an instance of a weapon using its registry definition.
     * @param {string} weaponKey - Registry key of weapon to create.
     * @param {Object} instanceOptions - Per-instance overrides: owner, modifiers, level, etc.
     */
    create(weaponKey, instanceOptions = {}) {
      const rawConfig = WeaponRegistry[weaponKey];
      if (!rawConfig) {
        console.warn('[WeaponFactory] Missing weapon config', weaponKey);
        return null;
      }

      // Deep clone so this instance cannot mutate the registry entry
      const config = deepClone(rawConfig);

      config.key = weaponKey;

      // Instance-level modifiers (e.g., "add +1 projectile")
      const modifiers = instanceOptions.modifiers || config.modifiers || [];
      const level = instanceOptions.level ?? CONFIG.WEAPONS.DEFAULT_LEVEL;

      let controller = null;
      let projectilePool = null;

      // Small FX helper functions for muzzle + impact visuals
      const fxPool = buildFxHandlers(scene, config.fx);

      const ControllerOverride = config.controller ? CUSTOM_CONTROLLER_MAP[config.controller] : null;

        // Instantiate correct controller type based on weapon type
      switch (config.type) {
        case 'projectile': {
          // Create controller without pool first (circular reference)
          controller = new ProjectileWeaponController(scene, instanceOptions.owner, config, {
            enemyGroup,
            damagePipeline,
            events,
            projectilePool: null, // Set after pool is built
            fxPool,
            // Pass the shared coordinator through so every projectile weapon participates in
            // the same reservation pool and therefore shares awareness of in-flight shots.
            targetingCoordinator,
            level
          });

          // Construct projectile pool and feed controller pointer to it
          projectilePool = new ProjectilePool(scene, config.projectile, enemyGroup, controller);
          controller.projectilePool = projectilePool;
          break;
        }

        case 'burst': {
          controller = new BurstProjectileWeaponController(scene, instanceOptions.owner, config, {
            enemyGroup,
            damagePipeline,
            events,
            projectilePool: null,
            fxPool,
            targetingCoordinator,
            level
          });

          projectilePool = new ProjectilePool(scene, config.projectile, enemyGroup, controller);
          controller.projectilePool = projectilePool;
          break;
        }

        case 'ballistic': {
          controller = new BallisticWeaponController(scene, instanceOptions.owner, config, {
            enemyGroup,
            damagePipeline,
            events,
            projectilePool: null,
            fxPool,
            targetingCoordinator,
            level
          });

          projectilePool = new ProjectilePool(scene, config.projectile, enemyGroup, controller);
          controller.projectilePool = projectilePool;
          break;
        }

        case 'bazooka': {
          controller = new BazookaWeaponController(scene, instanceOptions.owner, config, {
            enemyGroup,
            damagePipeline,
            events,
            projectilePool: null,
            fxPool,
            targetingCoordinator,
            level
          });

          projectilePool = new ProjectilePool(scene, config.projectile, enemyGroup, controller);
          controller.projectilePool = projectilePool;
          break;
        }

        case 'strike': {
          controller = new StrikeWeaponController(scene, instanceOptions.owner, config, {
            enemyGroup,
            damagePipeline,
            events,
            targetingCoordinator,
            level
          });
          break;
        }

        case 'slash': {
          controller = new SlashWeaponController(scene, instanceOptions.owner, config, {
            enemyGroup,
            damagePipeline,
            events,
            targetingCoordinator,
            level
          });
          break;
        }

        case 'cluster': {
          controller = new ClusterBombWeaponController(scene, instanceOptions.owner, config, {
            enemyGroup,
            damagePipeline,
            events,
            targetingCoordinator,
            level
          });
          break;
        }

        case 'chain': {
          controller = new ChainLightningController(scene, instanceOptions.owner, config, {
            enemyGroup,
            damagePipeline,
            events,
            targetingCoordinator,
            level
          });
          break;
        }

        case 'cross': {
          controller = new SparkCrossController(scene, instanceOptions.owner, config, {
            enemyGroup,
            damagePipeline,
            events,
            targetingCoordinator,
            level
          });
          break;
        }

        case 'chainThrow': {
          controller = new ChainThrowController(scene, instanceOptions.owner, config, {
            enemyGroup,
            damagePipeline,
            events,
            targetingCoordinator,
            fxPool,
            level
          });
          break;
        }
          default: {
            console.warn('[WeaponFactory] Unsupported weapon type', config.type);
            return null;
          }
      }

      // Apply modifiers (scales stats like damage, range, fire rate)
      controller.setModifiers(modifiers);

      // Final weapon instance wrapper
      const instance = {
        key: weaponKey,
        config,
        level,
        modifiers: modifiers.slice(),  // Copy to avoid accidental external mutation
        controller,
        animator: null,                // Reserved for future character animation hooks
        pools: { projectile: projectilePool },
        destroy() {
          projectilePool?.destroy?.();
          controller?.destroy?.();
        }
      };

      return instance;
    }
  };
}
