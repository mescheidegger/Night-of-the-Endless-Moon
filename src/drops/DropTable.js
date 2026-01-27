/**
 * DropTables
 *
 * Defines which drop(s) a mob should spawn when defeated.
 * Each mob key maps to:
 *   - `entries`: possible drops the mob can produce (weighted)
 *   - `rolls`: how many times to attempt spawning entries (multi-drop)
 *
 * NOTE: Tables now include small odds for health potions (`health_minor`,
 * `health_major`) in addition to XP gems. Consumers (DropSpawner/DropManager)
 * remain unchanged — this is purely data-driven tuning.
 */

export const DropTables = {
  /**
   * Baseline: mostly small XP, small chance at large XP, tiny chance at minor heal.
   */
  evileye: {
    rolls: 1,
    entries: [
      { type: 'xp_small', weight: 94 },
      { type: 'xp_large', weight: 5 },
      { type: 'health_minor', weight: 5 }
    ]
  },

  littlescary: {
    rolls: 1,
    entries: [
      { type: 'xp_small', weight: 94 },
      { type: 'xp_large', weight: 5 },
      { type: 'health_minor', weight: 5 }
    ]
  },

  /**
   * Fast but fragile → mostly small XP, tiny chance at large, tiny minor heal.
   */
  spookybat: {
    rolls: 1,
    entries: [
      { type: 'xp_small', weight: 96 },
      { type: 'xp_large', weight: 3 },
      { type: 'health_minor', weight: 5 }
    ]
  },

  /**
   * Tankier than evileye → slightly higher chance at a large, tiny minor heal.
   */
  crawlybones: {
    rolls: 1,
    entries: [
      { type: 'xp_small', weight: 89 },
      { type: 'xp_large', weight: 10 },
      { type: 'health_minor', weight: 5 }
    ]
  },

  /**
   * Elites: two rolls so they can drop multiple gems; higher large chance.
   * Small chance to include a minor heal.
   */
  cocodemon_elite: {
    rolls: 2,
    entries: [
      { type: 'xp_small', weight: 72 },
      { type: 'xp_large', weight: 25 },
      { type: 'health_minor', weight: 8 }
    ]
  },

  nightman_elite: {
    rolls: 2,
    entries: [
      { type: 'xp_small', weight: 68 },
      { type: 'xp_large', weight: 30 },
      { type: 'health_minor', weight: 8 }
    ]
  },

  /**
   * Bosses: multiple rolls, strong bias toward large XP.
   * Include minor heals, and reserve major heals for the toughest bosses.
   */
  evilwizard_boss: {
    rolls: 5,
    entries: [
      { type: 'xp_small', weight: 38 },
      { type: 'xp_large', weight: 60 },
      { type: 'health_minor', weight: 8 }
    ]
  },

  darkwizard_boss: {
    rolls: 5,
    entries: [
      { type: 'xp_small', weight: 38 },
      { type: 'xp_large', weight: 60 },
      { type: 'health_minor', weight: 8 }
    ]
  },

  werewolf_boss: {
    rolls: 5,
    entries: [
      { type: 'xp_small', weight: 33 },
      { type: 'xp_large', weight: 64 },
      { type: 'health_minor', weight: 2 },
      { type: 'health_major', weight: 8 }
    ]
  },

  bringerofdeath_boss: {
    rolls: 5,
    entries: [
      { type: 'xp_small', weight: 33 },
      { type: 'xp_large', weight: 64 },
      { type: 'health_minor', weight: 2 },
      { type: 'health_major', weight: 8 }
    ]
  },

  demonknight_boss: {
    rolls: 6,
    entries: [
      { type: 'xp_small', weight: 28 },
      { type: 'xp_large', weight: 69 },
      { type: 'health_minor', weight: 2 },
      { type: 'health_major', weight: 8 }
    ]
  },

  /**
   * Fallback for any unspecified key.
   * Keep this conservative so unknown mobs don't flood potions.
   */
  default: {
    rolls: 1,
    entries: [
      { type: 'xp_small', weight: 99 },
      { type: 'health_minor', weight: 10 }
    ]
  }
};
