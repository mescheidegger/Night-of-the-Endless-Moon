import { DEFAULT_DROP_TYPE } from '../DropRegistry.js';
import { weightedPick } from '../utils/WeightedTable.js';

/**
 * DropSpawner
 *
 * Uses a drop table to spawn loot for a mob. This version prioritizes
 * weighted selection per roll. If weighted selection fails (e.g., all weights
 * are zero), it falls back to index-based entry for the current roll, then to
 * the first entry.
 */
export class DropSpawner {
  /**
   * @param {Phaser.Scene} scene
   * @param {DropManager} dropManager - Responsible for pooled spawn.
   * @param {Record<string, { rolls: number, entries: Array<object> }>} tables
   */
  constructor(scene, dropManager, tables) {
    this.scene = scene;
    this.dropManager = dropManager;
    this.tables = tables;

    // Optional: let callers inject a seeded RNG for deterministic tests
    // this.rng = Math.random;
  }

  /**
   * Spawns drop(s) for a given mob.
   *
   * Resolution per roll:
   *  1) Try weightedPick(entries)  ← ensures weights are actually used
   *  2) Fallback to entries[i]     ← supports fixed/sequential scripting if desired
   *  3) Fallback to entries[0]     ← last resort
   */
  spawnFromTable(mobKey, x, y, overrides = {}) {
    const table = this.tables?.[mobKey] ?? this.tables?.default;
    const rolls = Number(table?.rolls ?? 1) | 0;
    const entries = table?.entries ?? [];
    if (!entries.length || rolls <= 0) return;

    for (let i = 0; i < rolls; i++) {
      // Prefer weighted selection FIRST so weights are honored.
      let entry = weightedPick(entries /*, this.rng */) || entries[i] || entries[0];
      if (!entry) continue;

      // Resolve final drop type: entry > caller overrides > default
      const type = entry.type ?? overrides.type ?? DEFAULT_DROP_TYPE;

      // Avoid passing `type` down inside overrides after we resolved it
      const { type: _ignore, ...restOverrides } = overrides;

      // Merge per-entry overrides (lowest precedence) then caller overrides (highest)
      const mergedOverrides = {
        ...(entry.overrides ?? {}),
        ...restOverrides,
      };

      this.dropManager?.spawn(x, y, type, mergedOverrides);
    }
  }
}
