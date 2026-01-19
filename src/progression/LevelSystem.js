import { LEVELING } from '../config/levelingConfig.js';

// Clamp a value to range [0,1]. Used for progress ratio normalization.
const clamp01 = (value) => {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
};

export class LevelSystem {
  /**
   * Handles player leveling state: current level, XP, thresholds, and events.
   * @param {Phaser.Scene} scene - Scene used for event emissions.
   * @param {Object} options
   * @param {number} options.startLevel - Initial level.
   * @param {number} options.startXP - Initial XP.
   */
  constructor(scene, { startLevel = 1, startXP = 0 } = {}) {
    this.scene = scene;
    this.events = scene?.events; // Used to emit UI / game state updates.

    // Max level allowed (from config or fallback 99).
    this.cap = Math.max(1, Number(LEVELING?.CAP ?? 99));

    // Public state
    this.level = 1;
    this.xp = 0;
    this.progress = 0; // Progress ratio between current + next level
    this.xpToNext = 0; // XP needed to reach next level

    // Internal cached thresholds for speed
    this._xpCur = 0;   // XP required for current level
    this._xpNext = 0;  // XP required for next level

    this.reset(startLevel, startXP);
  }

  /**
   * Reset level + XP to a known baseline, clamping to valid ranges.
   */
  reset(level = 1, xp = 0) {
    // Clamp initial level and XP within allowed bounds
    const targetLevel = Math.max(1, Math.min(Number(level) || 1, this.cap));
    const targetXP = Math.max(0, Number(xp) || 0);

    this.level = targetLevel;
    this.xp = targetXP;

    // Ensure XP is never below the minimum XP required for this level.
    const floor = this._xpForLevel(this.level);
    if (this.xp < floor) {
      this.xp = floor;
    }

    // Handle overflow (e.g., starting XP that pushes into multiple levels).
    this._applyOverflow();

    // Emit new state
    this._emitAll();
  }

  /**
   * Debug helper for setting level directly without emitting level-up events
   * or reopening modals repeatedly.
   */
  setLevel(level, { snapToFloor = false } = {}) {
    const targetLevel = Math.max(1, Math.min(Number(level) || 1, this.cap));
    const floor = this._xpForLevel(targetLevel);
    const nextThreshold = targetLevel >= this.cap ? Infinity : this._xpForLevel(targetLevel + 1);

    let nextXP = snapToFloor ? floor : this.xp;
    if (!Number.isFinite(nextXP)) {
      nextXP = floor;
    }

    nextXP = Math.max(floor, Math.min(nextXP, nextThreshold));

    this.level = targetLevel;
    this.xp = nextXP;

    this._recomputeThresholds();
    this._emitAll();
  }

  /**
   * Add XP and handle leveling automatically.
   */
  addXP(amount) {
    const value = Number(amount);
    const delta = Number.isFinite(value) ? value : 0;

    // Prevent XP from ever dropping below the current level's minimum.
    this.xp = Math.max(this._xpCur, this.xp) + delta;
    if (this.xp < this._xpCur) {
      this.xp = this._xpCur;
    }

    // Determine if one or more level-ups occurred.
    const leveled = this._applyOverflow();

    // Emit events for each level gained
    leveled.forEach((lvl) => {
      this._emitLevelChanged(lvl);
      this.events?.emit?.('level:up', { level: lvl });
    });

    // Emit XP progress change
    this._emitXPChanged();
  }

  /**
   * Resolve XP overflow: if XP passes threshold, level up repeatedly.
   * @returns {number[]} levels gained (if multiple levels increased at once)
   */
  _applyOverflow() {
    const leveled = [];

    // Keep leveling while we have enough XP to surpass next threshold
    while (this.level < this.cap) {
      const nextThreshold = this._xpForLevel(this.level + 1);
      if (this.xp < nextThreshold) break;
      this.level += 1;
      leveled.push(this.level);
    }

    this._recomputeThresholds();
    return leveled;
  }

  /**
   * Compute the total XP required for a given level using configured strategy.
   */
  _xpForLevel(level) {
    const n = Math.max(1, Math.floor(level));
    if (n <= 1) return 0; // Level 1 always starts at 0 XP

    const strategy = (LEVELING?.STRATEGY ?? 'polynomial').toLowerCase();

    // TABLE STRATEGY — use direct lookup table if provided
    if (strategy === 'table') {
      const table = LEVELING?.TABLE ?? [];
      if (Array.isArray(table) && table.length > 0) {
        // Direct index hit
        if (table[n] !== undefined) {
          const value = Number(table[n]);
          if (Number.isFinite(value)) return Math.max(0, value);
        }
        // Fallback: find closest lower entry
        for (let i = table.length - 1; i >= 0; i -= 1) {
          if (table[i] !== undefined) {
            const value = Number(table[i]);
            if (Number.isFinite(value)) return Math.max(0, value);
          }
        }
      }
      // If no usable value found, fall through to polynomial
    }

    // EXPONENTIAL STRATEGY — increasing curve
    if (strategy === 'exponential') {
      const base = Number(LEVELING?.EXP?.BASE ?? 5);
      const r = Number(LEVELING?.EXP?.R ?? 1.25);
      const tier = n - 1;
      if (!Number.isFinite(r) || r <= 0 || Math.abs(r - 1) < 1e-6) {
        return Math.max(0, base * tier); // fallback linear
      }
      const cumulative = base * ((r ** tier) - 1) / (r - 1);
      return Math.max(0, Math.round(cumulative));
    }

    // POLYNOMIAL STRATEGY (default)
    const base = Number(LEVELING?.POLY?.BASE ?? 6);
    const power = Number(LEVELING?.POLY?.POWER ?? 2);
    const growth = Number(LEVELING?.POLY?.GROWTH ?? 0);
    const tier = n - 1;
    const poly = (base * (tier ** power)) + (growth * tier);
    return Math.max(0, Math.round(poly));
  }

  /**
   * Recompute cached XP threshold values + progress ratio.
   */
  _recomputeThresholds() {
    // XP required for current level
    this._xpCur = this._xpForLevel(this.level);

    // If at level cap, progress is always complete.
    if (this.level >= this.cap) {
      this._xpNext = this._xpCur;
      this.xp = Math.max(this._xpCur, this.xp);
      this.xpToNext = 0;
      this.progress = 1;
      return;
    }

    // XP required for next level
    this._xpNext = this._xpForLevel(this.level + 1);
    this.xp = Math.max(this._xpCur, this.xp);

    const diff = Math.max(0, this._xpNext - this._xpCur);
    this.xpToNext = diff;

    // Compute normalized progress from current-level floor to next threshold
    const rawProgress = diff === 0 ? 1 : (this.xp - this._xpCur) / diff;
    this.progress = clamp01(rawProgress);
  }

  /**
   * Emit both level and XP change events (full state refresh).
   */
  _emitAll() {
    this._emitLevelChanged(this.level);
    this._emitXPChanged();
  }

  /**
   * Emit level change event.
   */
  _emitLevelChanged(level) {
    this.events?.emit?.('level:changed', { level });
  }

  /**
   * Emit XP change event and ensure progress remains correct.
   */
  _emitXPChanged() {
    if (this.level >= this.cap) {
      // At cap: progress is always 1
      this.progress = 1;
      this.xpToNext = 0;
    } else {
      const diff = Math.max(0, this._xpNext - this._xpCur);
      this.xpToNext = diff;
      const raw = diff === 0 ? 1 : (this.xp - this._xpCur) / diff;
      this.progress = clamp01(raw);
    }

    this.events?.emit?.('xp:changed', { xp: this.xp, level: this.level });
  }
}
