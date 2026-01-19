/**
 * DropTables
 *
 * Defines which drop(s) a mob should spawn when defeated.
 * Each mob key maps to:
 *   - `entries`: possible drops the mob can produce (weighted)
 *   - `rolls`: how many times to attempt spawning entries (multi-drop)
 *
 * NOTE: Only `xp_small` and `xp_large` are used, matching the evileye example.
 * You can safely adjust weights/rolls for tuning without changing consumers.
 */

export const DropTables = {
  /**
   * Baseline example (unchanged): 95% small XP, 5% large XP
   */
  evileye: {
    rolls: 1,
    entries: [
      { type: 'xp_small', weight: 95 },
      { type: 'xp_large', weight: 5 }
    ]
  },

  littlescary: {
    rolls: 1,
    entries: [
      { type: 'xp_small', weight: 95 },
      { type: 'xp_large', weight: 5 }
    ]
  },

  /**
   * Fast but fragile → mostly small XP, tiny chance at large.
   */
  spookybat: {
    rolls: 1,
    entries: [
      { type: 'xp_small', weight: 97 },
      { type: 'xp_large', weight: 3 }
    ]
  },

  /**
   * Tankier than evileye → slightly higher chance at a large.
   */
  crawlybones: {
    rolls: 1,
    entries: [
      { type: 'xp_small', weight: 90 },
      { type: 'xp_large', weight: 10 }
    ]
  },

  /**
   * Elites: two rolls so they can drop multiple gems; higher large chance.
   */
  cocodemon_elite: {
    rolls: 2,
    entries: [
      { type: 'xp_small', weight: 75 },
      { type: 'xp_large', weight: 25 }
    ]
  },

  nightman_elite: {
    rolls: 2,
    entries: [
      { type: 'xp_small', weight: 70 },
      { type: 'xp_large', weight: 30 }
    ]
  },

  /**
   * Bosses: multiple rolls, strong bias toward large XP.
   * These values assume bosses are milestone rewards.
   */
  evilwizard_boss: {
    rolls: 5,
    entries: [
      { type: 'xp_small', weight: 40 },
      { type: 'xp_large', weight: 60 }
    ]
  },

  darkwizard_boss: {
    rolls: 5,
    entries: [
      { type: 'xp_small', weight: 40 },
      { type: 'xp_large', weight: 60 }
    ]
  },

  werewolf_boss: {
    rolls: 5,
    entries: [
      { type: 'xp_small', weight: 35 },
      { type: 'xp_large', weight: 65 }
    ]
  },

  bringerofdeath_boss: {
    rolls: 5,
    entries: [
      { type: 'xp_small', weight: 35 },
      { type: 'xp_large', weight: 65 }
    ]
  },

  demonknight_boss: {
    rolls: 6,
    entries: [
      { type: 'xp_small', weight: 30 },
      { type: 'xp_large', weight: 70 }
    ]
  },

  /**
   * Fallback for any unspecified key.
   */
  default: {
    rolls: 1,
    entries: [
      { type: 'xp_small', weight: 1 }
    ]
  }
};
