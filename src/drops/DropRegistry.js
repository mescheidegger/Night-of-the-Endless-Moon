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
  }
};
