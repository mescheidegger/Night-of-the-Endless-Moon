import { WeaponFactory } from './WeaponFactory.js';
import { WeaponRegistry } from './WeaponRegistry.js';
import { TargetingCoordinator } from './TargetingCoordinator.js';
import { CONFIG } from '../config/gameConfig.js';
import * as WeaponProgression from './WeaponProgression.js';

/**
 * Manages all weapons equipped by an entity (typically the player/hero).
 * Handles:
 *  - Adding / removing weapons
 *  - Updating weapon controllers each frame
 *  - Applying global and per-weapon modifiers
 *  - Managing loadout synchronization + event emission
 *
 * Audio/Event notes:
 *  - Controllers emit 'controller:fired' when they start their fire sequence.
 *  - We relay that into:
 *      - 'weapon:triggered' (HUD/UI)
 *      - 'weapon:fired'     (audio system legacy hook)
 *  - Some weapons need lifecycle-bound fire audio (e.g., chainThrow) so they can
 *    stop the fire SFX when the FX ends early. For those, we emit:
 *      - 'weapon:fire:start' + a unique scope id
 *    and the controller/FX should later emit:
 *      - 'weapon:fire:end' with the same scope
 *
 * This file is responsible for generating and emitting the scope id at the moment
 * the weapon begins firing (so controllers remain decoupled from SoundManager).
 */
export class WeaponManager {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} owner - The entity that holds and fires the weapons
   * @param {Object} options
   */
  constructor(scene, owner, options = {}) {
    this.scene = scene;
    this.owner = owner;

    // Event emitter used for UI updates, SFX hooks, etc.
    this.events = options.events ?? scene.events;

    // Shared resources for all weapons managed here
    this.enemyGroup = options.enemyGroup;
    this.damagePipeline = options.damagePipeline;
    // All weapons share a single coordinator so they can reason about the same reservation data.
    this.targetingCoordinator = options.targetingCoordinator ?? new TargetingCoordinator();

    // Factory used to create actual weapon controller + pools
    this.factory = WeaponFactory(scene, {
      enemyGroup: this.enemyGroup,
      damagePipeline: this.damagePipeline,
      events: this.events,
      targetingCoordinator: this.targetingCoordinator
    });

    // Map<weaponKey, weaponInstance>
    this.weapons = new Map();

    // Modifiers applied to *all* weapons (e.g., global buffs)
    this.globalModifiers = [];

    // Optional allowlist for which weapons can be equipped.
    this._whitelist = null;

    // Monotonic counter for scoped fire ids (stable, no randomness needed)
    this._fireScopeSeq = 0;
  }

  /** Handle _buildControllerModifiers so this system stays coordinated. */
  _buildControllerModifiers(weapon) {
    if (!weapon) return this.globalModifiers.slice();
    return [
      ...(weapon.baseModifiers ?? []),
      ...(weapon.modifiers ?? []),
      ...(weapon.levelModifiers ?? []),
      ...this.globalModifiers
    ];
  }

  /**
   * Create a unique scope id for a single "fire instance" of a weapon.
   * Used to correlate weapon:fire:start and weapon:fire:end.
   */
  _nextFireScopeId(weaponKey) {
    this._fireScopeSeq += 1;
    const ownerId = this.owner?.id ?? this.owner?.name ?? 'owner';
    return `${weaponKey}:${ownerId}:${this._fireScopeSeq}`;
  }

  /**
   * Update all weapon controllers each frame.
   */
  update(dt) {
    this.weapons.forEach((weapon) => {
      weapon.controller?.update(dt);
    });
  }

  /**
   * Restrict future equips to the provided list of weapon keys. Passing a
   * falsy value clears the whitelist (all weapons allowed).
   */
  setWhitelist(allowedKeys) {
    if (allowedKeys instanceof Set) {
      this._whitelist = new Set(allowedKeys);
    } else if (Array.isArray(allowedKeys)) {
      this._whitelist = new Set(allowedKeys);
    } else {
      this._whitelist = null;
    }

    // Re-sanitize the active loadout in case new restrictions were applied.
    const current = this.getLoadout();
    if (current.length) {
      this.setLoadout(current);
    }
  }

  /**
   * Determine whether the manager is allowed to equip the given weapon key.
   */
  canEquip(key) {
    if (!WeaponRegistry[key]) {
      return false;
    }
    if (this._whitelist instanceof Set) {
      return this._whitelist.has(key);
    }
    return true;
  }

  /**
   * Add a weapon by key (if not already added) and return its instance.
   * Merges registry modifiers + specified modifiers.
   */
  addWeapon(key, opts = {}) {
    if (!WeaponRegistry[key]) {
      this.events?.emit?.('weapons:blocked', { key, reason: 'missing-registry' });
      return false;
    }

    // If already equipped, return the existing instance
    if (this.weapons.has(key)) {
      this.events?.emit?.('weapons:blocked', { key, reason: 'already-equipped' });
      return false;
    }

    if (!this.canEquip(key)) {
      this.events?.emit('weapons:blocked', { key, reason: 'not-allowed' });
      return false;
    }

    const level = opts.level ?? CONFIG.WEAPONS.DEFAULT_LEVEL;
    const entry = WeaponRegistry[key];

    const baseModifiers = [...(entry?.modifiers ?? [])];
    const customModifiers = [...(opts.modifiers ?? [])];
    const levelModifiers = WeaponProgression.getLevelModifiers(entry, level);
    const combinedModifiers = [
      ...baseModifiers,
      ...customModifiers,
      ...levelModifiers,
      ...this.globalModifiers
    ];

    // Create actual weapon instance (controller + pools, etc.)
    const instance = this.factory.create(key, {
      owner: this.owner,
      level,
      modifiers: combinedModifiers
    });
    if (!instance) return false;

    // Apply both weapon-specific and global modifiers
    instance.controller?.setModifiers(combinedModifiers);

    // Relay controller fire events to higher-level listeners (e.g., HUD, Audio)
    const ctrl = instance.controller;
    if (ctrl?.events?.on) {
      const fireHandler = ({ delayMs, nextFireAt }) => {
        this.events?.emit('weapon:triggered', { key, delayMs, nextFireAt });

        // Legacy "fire happened" event used by audio system (most weapons)
        this.scene?.events?.emit('weapon:fired', { weaponKey: key });

        // If this weapon opts into lifecycle-bound fire audio, emit a scoped start.
        // Audio system will start the SFX on this event and expect a later 'weapon:fire:end'
        // with the same scope.
        const fireCfg = entry?.audio?.fire;
        if (fireCfg?.scoped === true) {
          const scope = this._nextFireScopeId(key);

          // Store scope on the instance so the controller (or any other system)
          // can look it up if it needs to emit 'weapon:fire:end'.
          instance.__fireScope = scope;

          this.scene?.events?.emit('weapon:fire:start', {
            weaponKey: key,
            scope
          });
        }
      };

      ctrl.events.on('controller:fired', fireHandler);
      instance.__wm_off = () => ctrl.events.off('controller:fired', fireHandler);
    }

    // Track modifier layers for future upgrades / global buffs
    instance.baseModifiers = baseModifiers.slice();
    instance.modifiers = customModifiers.slice();
    instance.levelModifiers = levelModifiers.slice ? levelModifiers.slice() : levelModifiers;

    // Store weapon
    this.weapons.set(key, instance);

    // Notify UI / HUD / gameplay listeners
    this.events?.emit('weapons:added', { key, instance });
    this.events?.emit('weapons:changed', this.getLoadout());

    return true;
  }

  /**
   * Remove a weapon and clean up its resources.
   */
  removeWeapon(key) {
    const instance = this.weapons.get(key);
    if (!instance) return false;

    // If the weapon had an active scoped fire sound, end it before destroying.
    if (instance.__fireScope) {
      this.scene?.events?.emit('weapon:fire:end', { scope: instance.__fireScope });
      instance.__fireScope = null;
    }

    instance.__wm_off?.();
    instance.destroy?.(); // Clean pools + controller
    this.weapons.delete(key);

    this.targetingCoordinator?.releaseByWeapon(key);

    this.events?.emit('weapons:removed', { key });
    this.events?.emit('weapons:changed', this.getLoadout());
    return true;
  }

  /**
   * Check if a weapon is currently equipped.
   */
  hasWeapon(key) {
    return this.weapons.has(key);
  }

  /** Handle getWeaponLevel so this system stays coordinated. */
  getWeaponLevel(key) {
    const inst = this.weapons.get(key);
    return inst?.level ?? 0;
  }

  /** Handle upgradeWeapon so this system stays coordinated. */
  upgradeWeapon(key) {
    const inst = this.weapons.get(key);
    if (!inst) return false;

    const maxLevel = CONFIG.WEAPONS.MAX_LEVEL ?? 5;
    const current = inst.level ?? CONFIG.WEAPONS.DEFAULT_LEVEL;
    if (current >= maxLevel) return false;

    const next = current + 1;
    inst.level = next;
    inst.controller?.setLevel?.(next);

    const entry = WeaponRegistry[key];
    inst.levelModifiers = WeaponProgression.getLevelModifiers(entry, next);
    inst.controller?.setModifiers(this._buildControllerModifiers(inst));

    this.events?.emit('weapons:upgraded', { key, level: next });
    this.events?.emit('weapons:changed', this.getLoadout());
    return true;
  }

  /**
   * Replace current weapons to match the given loadout array.
   * Used when loading saved data or switching preset builds.
   */
  setLoadout(keys = []) {
    const sanitized = [];
    const seen = new Set();
    (keys ?? []).forEach((key) => {
      if (seen.has(key)) return;
      if (!this.canEquip(key)) return;
      seen.add(key);
      sanitized.push(key);
    });

    const desired = new Set(sanitized);

    // Remove weapons not in new loadout
    this.weapons.forEach((_instance, key) => {
      if (!desired.has(key)) {
        this.removeWeapon(key);
      }
    });

    // Add missing weapons from new loadout
    sanitized.forEach((key) => {
      if (!this.weapons.has(key)) {
        this.addWeapon(key);
      }
    });

    this.events?.emit('weapons:loadout:set', this.getLoadout());
  }

  /**
   * Returns an array of weapon keys currently equipped.
   */
  getLoadout() {
    return Array.from(this.weapons.keys());
  }

  /**
   * Convenience helper for granting a weapon while respecting whitelists.
   */
  grantWeapon(key, opts = {}) {
    const added = this.addWeapon(key, opts);
    if (!added) return false;
    this.events?.emit('weapons:loadout:set', this.getLoadout());
    return true;
  }

  /**
   * Remove a weapon if present and emit loadout events.
   */
  revokeWeapon(key) {
    const removed = this.removeWeapon(key);
    if (!removed) return false;
    this.events?.emit('weapons:loadout:set', this.getLoadout());
    return true;
  }

  /**
   * Swap a weapon in-place (useful for upgrade flows) while enforcing rules.
   */
  replaceWeapon(oldKey, newKey, opts = {}) {
    if (oldKey === newKey) {
      if (this.hasWeapon(newKey)) return true;
      return this.grantWeapon(newKey, opts);
    }

    if (!this.canEquip(newKey)) {
      const reason = WeaponRegistry[newKey] ? 'not-allowed' : 'missing-registry';
      this.events?.emit?.('weapons:blocked', { key: newKey, reason });
      return false;
    }

    this.removeWeapon(oldKey);
    const added = this.addWeapon(newKey, opts);
    if (!added) return false;
    this.events?.emit('weapons:loadout:set', this.getLoadout());
    return true;
  }

  /**
   * Apply a global modifier to ALL weapons (e.g., player leveled up, power rune).
   */
  applyGlobalModifier(modifier) {
    this.globalModifiers.push(modifier);

    this.weapons.forEach((weapon) => {
      weapon.controller?.setModifiers(this._buildControllerModifiers(weapon));
    });

    this.events?.emit('weapons:changed', this.getLoadout());
  }

  /**
   * Replace modifiers for a specific weapon only.
   */
  setModifiersForWeapon(key, modifiers) {
    const weapon = this.weapons.get(key);
    if (!weapon) return;

    weapon.modifiers = modifiers.slice(); // Copy to avoid accidental mutation
    weapon.controller?.setModifiers(this._buildControllerModifiers(weapon));

    this.events?.emit('weapons:changed', this.getLoadout());
  }

  /**
   * Properly tear down all weapons + pools.
   */
  destroy() {
    this.weapons.forEach((weapon, key) => {
      // End scoped audio if any is active for this weapon.
      if (weapon.__fireScope) {
        this.scene?.events?.emit('weapon:fire:end', { scope: weapon.__fireScope });
        weapon.__fireScope = null;
      }

      weapon.__wm_off?.();
      weapon.destroy?.();
      this.targetingCoordinator?.releaseByWeapon(key);
    });
    this.weapons.clear();
  }
}
