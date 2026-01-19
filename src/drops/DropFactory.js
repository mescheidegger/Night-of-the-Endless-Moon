import { BaseDrop } from './entities/BaseDrop.js';
import { DropRegistry, DEFAULT_DROP_TYPE } from './DropRegistry.js';

/**
 * DropFactory
 *
 * Responsible for constructing new drops or reconfiguring existing ones
 * from the object pool. Combines:
 *   - A base registry entry (appearance + behavior defaults)
 *   - Optional per-instance overrides (e.g., different XP amount)
 *
 * Result: a single resolved "row" config is passed to BaseDrop.reset().
 */
export class DropFactory {
  /**
   * Hold a scene reference so new drops can be constructed on demand.
   * This keeps drop creation consistent with the active physics world.
   */
  constructor(scene) {
    this.scene = scene; // Needed so new BaseDrops can be created inside this scene context.
  }

  /**
   * Creates a new drop OR reuses an existing pooled drop instance.
   *
   * @param {BaseDrop|null} drop - An inactive drop from a pool, or null to create a new one.
   * @param {number} x - Spawn X position.
   * @param {number} y - Spawn Y position.
   * @param {string} type - Key used to lookup default config in DropRegistry.
   * @param {object} overrides - Optional per-drop config overrides.
   */
  createOrReset(drop, x, y, type = DEFAULT_DROP_TYPE, overrides = {}) {
    // Determine which registry entry to use: selected type or fallback.
    const key = type ?? DEFAULT_DROP_TYPE;
    const base = DropRegistry[key] ?? DropRegistry[DEFAULT_DROP_TYPE] ?? {};

    // These are nested configs, so they need to be merged carefully rather than overwritten.
    const bodyOverrides = overrides.body ?? {};
    const magnetOverrides = overrides.magnet ?? {};

    // Final resolved configuration for this drop instance.
    // Order of precedence:
    //   1. base registry entry defaults
    //   2. top-level overrides
    //   3. nested merges for body + magnet configs
    const row = {
      ...base,
      ...overrides,
      body: { ...(base.body ?? {}), ...bodyOverrides },
      magnet: { ...(base.magnet ?? {}), ...magnetOverrides },
      type: key, // ensure the resolved drop retains the correct type label
    };

    // If we weren't given a pooled drop, construct a new one.
    if (!drop) {
      drop = new BaseDrop(this.scene, x, y);
    }

    // Apply the resolved configuration to the instance.
    drop.reset(x, y, row);
    return drop;
  }
}
