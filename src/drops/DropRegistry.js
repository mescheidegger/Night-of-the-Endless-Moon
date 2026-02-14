import { CONFIG } from '../config/gameConfig.js';

// Default drop type used when one is not explicitly specified.
export const DEFAULT_DROP_TYPE = 'xp_small';

const XP_PICKUP_AUDIO = {
  pickup: {
    key: 'sfx.drops.common.xppickup',
    bus: 'sfx',
    volume: 1.0,
    maxSimultaneous: 10,
    minIntervalMs: 10,
    pitchJitter: 0.03
  }
};

const TREASURE_DROP_BEHAVIOR = {
  spawnImpulse: false,
  magnet: {
    delayMs: 0,
    radius: 0,
    snapRadius: 0,
    maxSpeed: 0,
    accel: 0,
  },
};

const TREASURE_VALUE = { currency: 'treasure', amount: 0 };

const makeTreasureDrop = (type, closedFrame, openFrame) => ({
  texture: 'treasures_sheet',
  frame: closedFrame,
  type,
  isTreasure: true,
  idleAnim: null,
  openAnim: { key: `drop_${type}_open`, frames: [closedFrame, openFrame], frameRate: 3, repeat: 0 },

  scale: CONFIG.XP.SCALE,
  depth: CONFIG.XP.DEPTH,

  value: TREASURE_VALUE,
  body: { type: 'circle', r: CONFIG.XP.BODY_RADIUS },
  ...TREASURE_DROP_BEHAVIOR,
  audio: null,
  lifetimeMs: CONFIG.XP.DROP_TTL_MS,
});

/**
 * DropRegistry
 *
 * Centralized definitions for drop types.
 * Each entry describes:
 *  - Which sprite texture/frame to use
 *  - Visual scaling and render depth
 *  - Pickup value (XP amount, currency type, etc.)
 *  - Physics body shape for collisions / overlaps
 *  - Magnet behavior (when attraction starts, how fast it pulls, snap behavior, etc.)
 *
 * Keeping this data in one place makes it easy to define new drop types
 * without modifying systems like MagnetSystem, DropFactory, or CollectSystem.
 */
export const DropRegistry = {
  // A small XP gem (baseline drop).
  xp_small: {
    // Which texture / frame to render
    texture: 'xpgem',
    frame: 0,

    // Visual size and render layer
    scale: CONFIG.XP.SCALE,
    depth: CONFIG.XP.DEPTH,

    // What the drop is worth when collected
    value: { currency: 'xp', amount: CONFIG.XP.VALUE_DEFAULT },

    // Physics body definition (circle matches gem shape better than rectangle)
    body: { type: 'circle', r: CONFIG.XP.BODY_RADIUS },

    // Magnet attraction behavior
    magnet: {
      // Time before magnet effect activates (prevents instant attraction)
      delayMs: CONFIG.XP.MAGNET_DELAY_MS,

      // Distance where magnet begins pulling toward the player
      radius: CONFIG.XP.MAGNET_RADIUS,

      // Distance where the drop instantly snaps to player and collects
      snapRadius: CONFIG.XP.SNAP_RADIUS,

      // Maximum movement speed while being magnet-pulled
      maxSpeed: CONFIG.XP.MAX_SPEED,

      // Acceleration toward player (used in smoothed magnet implementations)
      accel: CONFIG.XP.ACCEL
    },

    audio: XP_PICKUP_AUDIO,

    // Time-to-live before the drop despawns (ms)
    lifetimeMs: CONFIG.XP.DROP_TTL_MS
  },
  // A minor health potion (small heal).
  health_minor: {
    texture: 'minorhealth',
    frame: 0,

    scale: CONFIG.XP.SCALE,
    depth: CONFIG.XP.DEPTH,

    value: { currency: 'health', amount: 10 },

    body: { type: 'circle', r: CONFIG.XP.BODY_RADIUS },

    magnet: {
      delayMs: CONFIG.XP.MAGNET_DELAY_MS,
      radius: CONFIG.XP.MAGNET_RADIUS,
      snapRadius: CONFIG.XP.SNAP_RADIUS,
      maxSpeed: CONFIG.XP.MAX_SPEED,
      accel: CONFIG.XP.ACCEL
    },

    audio: null,

    lifetimeMs: CONFIG.XP.DROP_TTL_MS
  },
  // A major health potion (big heal).
  health_major: {
    texture: 'majorhealth',
    frame: 0,

    scale: CONFIG.XP.SCALE,
    depth: CONFIG.XP.DEPTH,

    value: { currency: 'health', amount: 35 },

    body: { type: 'circle', r: CONFIG.XP.BODY_RADIUS },

    magnet: {
      delayMs: CONFIG.XP.MAGNET_DELAY_MS,
      radius: CONFIG.XP.MAGNET_RADIUS,
      snapRadius: CONFIG.XP.SNAP_RADIUS,
      maxSpeed: CONFIG.XP.MAX_SPEED,
      accel: CONFIG.XP.ACCEL
    },

    audio: null,

    lifetimeMs: CONFIG.XP.DROP_TTL_MS
  },
  xp_large: {
    // Which texture / frame to render
    texture: 'largexpgem',
    frame: 0,

    // Visual size and render layer
    scale: CONFIG.XP.SCALE,
    depth: CONFIG.XP.DEPTH,

    // What the drop is worth when collected
    value: { currency: 'xp', amount: 5 },

    // Physics body definition (circle matches gem shape better than rectangle)
    body: { type: 'circle', r: CONFIG.XP.BODY_RADIUS },

    // Magnet attraction behavior
    magnet: {
      // Time before magnet effect activates (prevents instant attraction)
      delayMs: CONFIG.XP.MAGNET_DELAY_MS,

      // Distance where magnet begins pulling toward the player
      radius: CONFIG.XP.MAGNET_RADIUS,

      // Distance where the drop instantly snaps to player and collects
      snapRadius: CONFIG.XP.SNAP_RADIUS,

      // Maximum movement speed while being magnet-pulled
      maxSpeed: CONFIG.XP.MAX_SPEED,

      // Acceleration toward player (used in smoothed magnet implementations)
      accel: CONFIG.XP.ACCEL
    },

    audio: XP_PICKUP_AUDIO,

    // Time-to-live before the drop despawns (ms)
    lifetimeMs: CONFIG.XP.DROP_TTL_MS
  },
  treasure_1: makeTreasureDrop('treasure_1', 0, 4),
  treasure_2: makeTreasureDrop('treasure_2', 1, 5),
  treasure_3: makeTreasureDrop('treasure_3', 2, 6),
  treasure_4: makeTreasureDrop('treasure_4', 3, 7),
  treasure_5: makeTreasureDrop('treasure_5', 8, 12)
};
