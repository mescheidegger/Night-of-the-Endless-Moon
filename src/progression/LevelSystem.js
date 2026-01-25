import { LEVELING } from '../config/levelingConfig.js';

/**
 * Clamp a number into [0, 1].
 */
const clamp01 = (value) => {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
};

/**
 * Small helpers for safe numeric config reads.
 */
const numOr = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const intOr = (value, fallback) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? n : fallback;
};

export class LevelSystem {
  /**
   * Handles player leveling state: level, XP, thresholds, and events.
   * XP thresholds are computed from LEVELING config strategies, with optional
   * tuning knobs:
   *  - LEVELING.SCALE (global threshold multiplier; higher = slower leveling)
   *  - LEVELING.KINK { LEVEL, SLOPE, MAX } (extra ramp after a given level)
   *
   * @param {Phaser.Scene} scene - Scene used for event emissions.
   * @param {Object} [options]
   * @param {number} [options.startLevel=1]
   * @param {number} [options.startXP=0]
   */
  constructor(scene, { startLevel = 1, startXP = 0 } = {}) {
    this.scene = scene;
    this.events = scene?.events;

    // Max level allowed (from config or fallback 99).
    this.cap = Math.max(1, intOr(LEVELING?.CAP, 99));

    // Public state
    this.level = 1;
    this.xp = 0;
    this.progress = 0; // 0..1 between current and next threshold
    this.xpToNext = 0; // delta XP required to reach next level

    // Cached thresholds (cumulative XP floors)
    this._xpCur = 0;
    this._xpNext = 0;

    this.reset(startLevel, startXP);
  }

  /**
   * Reset to a known baseline and emit a full refresh.
   */
  reset(level = 1, xp = 0) {
    const targetLevel = this._clampLevel(level);
    const targetXP = Math.max(0, numOr(xp, 0));

    this.level = targetLevel;
    this.xp = targetXP;

    // Ensure XP is never below the level floor.
    this._recomputeThresholds();
    if (this.xp < this._xpCur) this.xp = this._xpCur;

    // Apply overflow (starting XP may imply multiple levels).
    this._applyOverflow();

    this._emitAll();
  }

  /**
   * Debug helper: set level directly without emitting "level:up" for every step.
   * Useful for dev fast-forward / test harness.
   */
  setLevel(level, { snapToFloor = false } = {}) {
    const targetLevel = this._clampLevel(level);

    const floor = this._xpForLevel(targetLevel);
    const nextThreshold = targetLevel >= this.cap ? Infinity : this._xpForLevel(targetLevel + 1);

    let nextXP = snapToFloor ? floor : this.xp;
    if (!Number.isFinite(nextXP)) nextXP = floor;

    // Clamp XP to [floor, nextThreshold].
    nextXP = Math.max(floor, Math.min(nextXP, nextThreshold));

    this.level = targetLevel;
    this.xp = nextXP;

    this._recomputeThresholds();
    this._emitAll();
  }

  /**
   * Add XP and resolve level-ups automatically.
   */
  addXP(amount) {
    const delta = numOr(amount, 0);

    // Prevent XP from ever dropping below the current level floor.
    this.xp = Math.max(this._xpCur, this.xp) + delta;
    if (this.xp < this._xpCur) this.xp = this._xpCur;

    const leveled = this._applyOverflow();

    // Emit "level:up" once per level gained.
    leveled.forEach((lvl) => {
      this._emitLevelChanged(lvl);
      this.events?.emit?.('level:up', { level: lvl });
    });

    // Emit XP refresh.
    this._emitXPChanged();
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  _clampLevel(level) {
    const n = intOr(level, 1);
    return Math.max(1, Math.min(n, this.cap));
  }

  /**
   * Resolve XP overflow: if XP passes threshold, level up repeatedly.
   * @returns {number[]} levels gained (one entry per level reached)
   */
  _applyOverflow() {
    const leveled = [];

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
   * Compute threshold scaling for a given level.
   * - SCALE is a global multiplier (higher = slower leveling)
   * - KINK adds a linear ramp after KINK.LEVEL: (1 + over * SLOPE)
   * - KINK.MAX optionally caps the final multiplier
   */
  _thresholdScaleForLevel(level) {
    const baseScale = numOr(LEVELING?.SCALE, 1);
    const safeBase = baseScale > 0 ? baseScale : 1;

    const kinkLevel = Math.max(1, intOr(LEVELING?.KINK?.LEVEL, 12));
    const slope = numOr(LEVELING?.KINK?.SLOPE, 0);
    const maxScale = numOr(LEVELING?.KINK?.MAX, Infinity);

    if (!(slope > 0)) return safeBase;

    const over = Math.max(0, Math.floor(level) - kinkLevel);
    const kinkScale = 1 + (over * slope);

    const scaled = safeBase * kinkScale;
    return Math.min(scaled, Number.isFinite(maxScale) ? maxScale : scaled);
  }

  /**
   * Compute cumulative XP required to reach level N using configured strategy.
   */
  _xpForLevel(level) {
    const n = Math.max(1, Math.floor(level));
    if (n <= 1) return 0;

    const strategy = String(LEVELING?.STRATEGY ?? 'polynomial').toLowerCase();
    let raw = 0;

    // TABLE
    if (strategy === 'table') {
      const table = LEVELING?.TABLE ?? [];
      if (Array.isArray(table) && table.length > 0) {
        if (table[n] !== undefined) {
          const v = numOr(table[n], NaN);
          if (Number.isFinite(v)) raw = Math.max(0, v);
        } else {
          // closest lower entry
          for (let i = table.length - 1; i >= 0; i -= 1) {
            if (table[i] === undefined) continue;
            const v = numOr(table[i], NaN);
            if (Number.isFinite(v)) { raw = Math.max(0, v); break; }
          }
        }
      }
      // If we got a usable raw threshold, return it (scaled).
      if (raw > 0) {
        const scale = this._thresholdScaleForLevel(n);
        return Math.max(0, Math.round(raw * scale));
      }
      // otherwise fall through to polynomial
    }

    // EXPONENTIAL
    if (strategy === 'exponential') {
      const base = numOr(LEVELING?.EXP?.BASE, 5);
      const r = numOr(LEVELING?.EXP?.R, 1.25);
      const tier = n - 1;

      if (!Number.isFinite(r) || r <= 0 || Math.abs(r - 1) < 1e-6) {
        raw = Math.max(0, base * tier); // fallback linear
      } else {
        raw = Math.max(0, base * ((r ** tier) - 1) / (r - 1));
      }

      const scale = this._thresholdScaleForLevel(n);
      return Math.max(0, Math.round(raw * scale));
    }

    // POLYNOMIAL (default)
    const base = numOr(LEVELING?.POLY?.BASE, 6);
    const power = numOr(LEVELING?.POLY?.POWER, 2);
    const growth = numOr(LEVELING?.POLY?.GROWTH, 0);
    const tier = n - 1;

    raw = (base * (tier ** power)) + (growth * tier);

    const scale = this._thresholdScaleForLevel(n);
    return Math.max(0, Math.round(raw * scale));
  }

  /**
   * Recompute cached XP threshold values + progress ratio.
   */
  _recomputeThresholds() {
    this._xpCur = this._xpForLevel(this.level);

    // At cap: progress is always complete.
    if (this.level >= this.cap) {
      this._xpNext = this._xpCur;
      this.xp = Math.max(this._xpCur, this.xp);
      this.xpToNext = 0;
      this.progress = 1;
      return;
    }

    this._xpNext = this._xpForLevel(this.level + 1);
    this.xp = Math.max(this._xpCur, this.xp);

    const diff = Math.max(0, this._xpNext - this._xpCur);
    this.xpToNext = diff;

    const rawProgress = diff === 0 ? 1 : (this.xp - this._xpCur) / diff;
    this.progress = clamp01(rawProgress);
  }

  _emitAll() {
    this._emitLevelChanged(this.level);
    this._emitXPChanged();
  }

  _emitLevelChanged(level) {
    this.events?.emit?.('level:changed', { level });
  }

  _emitXPChanged() {
    if (this.level >= this.cap) {
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
