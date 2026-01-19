import Phaser from 'phaser';
import { evaluateWeight, weightedPick } from './utils.js';
import { SpawnerRegistry } from './spawners/index.js';

/**
 * SpawnDirector
 *
 * Central orchestrator that determines:
 *  • WHEN enemies spawn (via a repeating timer)
 *  • WHICH mob type spawns (via weighted probability & spawn caps)
 *  • HOW that mob is spawned (default ring pattern or a custom spawner)
 *
 * This class does NOT care about animation, AI behavior, or stats—
 * those are all resolved in MobRegistry and Enemy.reset().
 *
 * Spawn patterns are delegated to functions in SpawnerRegistry
 * (e.g., `ring`, `batWave`).
 */
export class SpawnDirector {
  /** Initialize SpawnDirector state so runtime dependencies are ready. */
  constructor(scene, enemyPools, spawnConfig) {
    this.scene = scene;
    this.enemyPools = enemyPools;
    this.spawnConfig = spawnConfig ?? { byMob: {} };

    this.timeline = Array.isArray(this.spawnConfig?.timeline)
    ? this.spawnConfig.timeline
        .slice()
        .sort((a, b) => (a.at ?? 0) - (b.at ?? 0))
        .map((evt, i) => ({
          ...evt,
          __eventId: evt?.id ?? `timeline-${i}`
        }))
    : [];

    this._timelineIndex = 0;
    this._activeEvent = null;
    this._activeEventEndAt = 0;
    this._firedEvents = new Set();
    this._weightedEnabled = true;

    // Base interval between spawn attempts (ms)
    this.delayMs = spawnConfig?.delayMs ?? 300;

    // Global attempts per tick (can be a number or function(t))
    this.spawnsPerTick = spawnConfig?.spawnsPerTick ?? 1;

    // Map of mobKey → weight (value or function(t)).
    this.weightOverrides = new Map();

    // Track per-mode cooldown and active counts for mode-aware spawns.
    this._modeCooldowns = new Map();
    this._modeActiveCounts = new Map();

    // Lookup table that maps customSpawner names to actual spawn functions.
    this.spawners = SpawnerRegistry;

    // Apply per-mob caps & weights from config
    this._applyInitialCaps();

    // Track when enemies are released so we can decrement per-mode counts.
    this._onEnemyReleased = ({ enemy }) => {
      if (!enemy) return;
      const mobKey = enemy.mobKey ?? enemy.type;
      if (!mobKey) return;
      const modeKey = enemy._spawnModeKey ?? null;
      this._incrementModeActive(mobKey, modeKey, -1);
    };
    scene.events.on('enemy:released', this._onEnemyReleased);

    // Start repeating timer loop
    this._startTimer();

    // Clean up when scene shuts down
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this._timer?.remove?.();
      this._timer = null;
      this._modeCooldowns.clear();
      this._modeActiveCounts.clear();
      this.scene?.events?.off('enemy:released', this._onEnemyReleased);
    });
  }

  /** Handle _peekNextTimelineEvent so this system stays coordinated. */
  _peekNextTimelineEvent(tSeconds) {
    if (!this.timeline || this._timelineIndex >= this.timeline.length) return null;
    return this.timeline[this._timelineIndex];
  }

  /** Handle _consumeTimelineEvent so this system stays coordinated. */
  _consumeTimelineEvent(evt) {
    if (!evt) return;
    const current = this.timeline[this._timelineIndex];
    if (current === evt) {
      this._timelineIndex += 1;
    }
  }

  /** Handle _runActiveScriptedEvent so this system stays coordinated. */
  _runActiveScriptedEvent(tSeconds) {
    const evt = this._activeEvent;
    if (!evt) return false;

    const evtId = this._getEventId(evt);
    if (evt.once && this._firedEvents.has(evtId)) return false;

    let didSpawn = false;

    if (evt.control) {
      this.scene?.events?.emit('spawn:control', { ...evt.control, _eventId: evtId });
      didSpawn = true;
      if (evt.once) this._firedEvents.add(evtId);
    }

    if (!Array.isArray(evt.spawns) || evt.spawns.length === 0) {
      return didSpawn;
    }

    const heroSprite = this.scene.hero?.sprite ?? this.scene.player;
    if (!heroSprite) return false;

    const ctx = { scene: this.scene, enemyPools: this.enemyPools, heroSprite, modeKey: null };

    for (const spawnDef of evt.spawns) {
      if (!spawnDef) continue;

      const spawnerKey = spawnDef.spawner ?? 'ring';
      const spawnerFn = this.spawners?.[spawnerKey] ?? this.spawners?.ring;
      const mobKey = spawnDef.mobKey;
      const entry = spawnDef.entry ?? {};

      if (!mobKey || typeof spawnerFn !== 'function') continue;
      if (!this.enemyPools?.canSpawn?.(mobKey)) continue;

      try {
        const handled = spawnerFn(ctx, mobKey, tSeconds, entry) || 0;
        if (handled > 0) didSpawn = true;
      } catch (err) {
        console.warn('[SpawnDirector] scripted spawner failed', spawnerKey, err);
      }
    }

    if (evt.once) this._firedEvents.add(evtId);

    return didSpawn;
  }

  /** Handle _modeKey so this system stays coordinated. */
  _modeKey(mobKey, modeKey) {
    return `${mobKey}:${modeKey || 'default'}`;
  }

  /** Handle _getModeActiveCount so this system stays coordinated. */
  _getModeActiveCount(mobKey, modeKey) {
    return this._modeActiveCounts.get(this._modeKey(mobKey, modeKey)) ?? 0;
  }

  /** Handle _incrementModeActive so this system stays coordinated. */
  _incrementModeActive(mobKey, modeKey, delta = 1) {
    const key = this._modeKey(mobKey, modeKey);
    const next = (this._modeActiveCounts.get(key) ?? 0) + delta;
    this._modeActiveCounts.set(key, Math.max(0, next));
  }

  /** Handle _setModeCooldownUntil so this system stays coordinated. */
  _setModeCooldownUntil(mobKey, modeKey, timestampMs) {
    this._modeCooldowns.set(this._modeKey(mobKey, modeKey), timestampMs);
  }

  /** Handle _isModeOnCooldown so this system stays coordinated. */
  _isModeOnCooldown(mobKey, modeKey, nowMs) {
    const next = this._modeCooldowns.get(this._modeKey(mobKey, modeKey)) ?? 0;
    return nowMs < next;
  }

  /**
   * Reads spawnConfig.byMob to:
   *  • Set per-mob max active counts
   *  • Register weight curves
   *  • Apply global enemy cap if provided
   */
  _applyInitialCaps() {
    if (!this.spawnConfig?.byMob) return;

    Object.entries(this.spawnConfig.byMob).forEach(([mobKey, entry]) => {
      if (entry?.max !== undefined) {
        this.enemyPools?.setMax?.(mobKey, entry.max);
      }
    });

    if (this.spawnConfig.totalMax !== undefined) {
      this.enemyPools?.setTotalMax?.(this.spawnConfig.totalMax);
    }
  }

  /**
   * Resolve and apply per-mob max caps each tick.
   * Supports static numbers or functions of t (seconds).
   */
  _updateDynamicCaps(tSeconds) {
    if (!this.spawnConfig?.byMob) return;

    Object.entries(this.spawnConfig.byMob).forEach(([mobKey, entry]) => {
      if (entry?.max === undefined) return;

      let resolvedMax = entry.max;
      if (typeof resolvedMax === 'function') {
        try {
          resolvedMax = resolvedMax(tSeconds);
        } catch (err) {
          console.warn('[SpawnDirector] max resolver failed', mobKey, err);
          resolvedMax = undefined;
        }
      }

      if (Number.isFinite(resolvedMax)) {
        this.enemyPools?.setMax?.(mobKey, resolvedMax);
      }
    });
  }

  /**
   * Creates or restarts the internal repeating spawn timer.
   */
  _startTimer() {
    this._timer?.remove?.();
    this._timer = this.scene.time.addEvent({
      delay: this.delayMs,
      loop: true,
      callback: () => this.spawnTick()
    });
  }

  /** Handle _getEventId so this system stays coordinated. */
  _getEventId(evt) {
    return evt?.__eventId ?? evt?.id;
  }

  /**
   * Fast-forward the timeline to the provided timestamp without replaying
   * already elapsed events. Used by debug/dev flows.
   */
  seekToTime(tSeconds) {
    const t = Math.max(0, Number(tSeconds) || 0);
    this._activeEvent = null;
    this._activeEventEndAt = 0;

    if (!Array.isArray(this.timeline) || this.timeline.length === 0) {
      this._timelineIndex = 0;
      return;
    }

    this._timelineIndex = 0;
    while (this._timelineIndex < this.timeline.length) {
      const evt = this.timeline[this._timelineIndex];
      const at = evt?.at ?? 0;
      if (t < at) break;

      if (evt?.once) {
        const evtId = this._getEventId(evt, this._timelineIndex);
        this._firedEvents.add(evtId);
      }

      this._timelineIndex += 1;
    }
  }

  /**
   * Update the delay between spawn checks at runtime.
   */
  setDelayMs(ms) {
    const value = Math.max(16, Number(ms) || this.delayMs);
    this.delayMs = value;
    this._startTimer();
  }

  /**
   * Update global spawn attempts per tick (can be number or fn(t)).
   */
  setSpawnsPerTick(value) {
    this.spawnsPerTick = value;
  }

  /**
   * Replace weight logic for a given mob key.
   */
  setWeight(mobKey, weight) {
    if (!mobKey) return;
    this.weightOverrides.set(mobKey, weight);
  }

  /**
   * Update the per-mob active cap at runtime.
   */
  setMax(mobKey, max) {
    this.enemyPools?.setMax?.(mobKey, max);
  }

  /** Handle setWeightedEnabled so this system stays coordinated. */
  setWeightedEnabled(enabled) {
    this._weightedEnabled = !!enabled;
  }

  /**
   * Main spawn loop.
   * Runs every `delayMs` and may spawn multiple mobs depending on spawnsPerTick.
   */
  spawnTick() {
    const heroSprite = this.scene.hero?.sprite ?? this.scene.player;
    if (!heroSprite) return;

    // Time survived (seconds) — main driver for difficulty scaling
    let t;

    if (typeof this.scene.getRunElapsedSeconds === 'function') {
      t = this.scene.getRunElapsedSeconds();
    } else {
      const now = this.scene.time?.now ?? 0;
      t = Math.max(0, (now - (this.scene._runStartedAt ?? now)) / 1000);
    }

    this._updateDynamicCaps(t);

    // --- Scripted timeline handling ---
    if (this.timeline && this.timeline.length > 0) {
      if (this._activeEvent && t >= this._activeEventEndAt) {
        this._activeEvent = null;
      }

      if (!this._activeEvent) {
        const nextEvt = this._peekNextTimelineEvent(t);
        if (nextEvt && t >= (nextEvt.at ?? 0)) {
          this._activeEvent = nextEvt;
          this._activeEventEndAt = t + (nextEvt.duration ?? 0);
          this._consumeTimelineEvent(nextEvt);
        }
      }

      if (this._activeEvent) {
        const didSpawn = this._runActiveScriptedEvent(t);

        if (this._activeEvent.behavior === 'suspendWeighted' && didSpawn) {
          return;
        }
      }
    }
    // --- end timeline handling ---

    if (!this._weightedEnabled) {
      return;
    }

    // Resolve global spawn attempts for this tick
    let attempts = this.spawnsPerTick;
    if (typeof attempts === 'function') {
      try {
        attempts = Number(attempts(t));
      } catch (e) {
        console.warn('[SpawnDirector] spawnsPerTick function error', e);
        attempts = 1;
      }
    }
    attempts = Math.max(1, Math.floor(Number.isFinite(attempts) ? attempts : 1));

    const nowMs = this.scene.time?.now ?? 0;

    // Build weighted candidate list of mob types/modes that are allowed to spawn
    const candidates = [];
    Object.entries(this.spawnConfig?.byMob ?? {}).forEach(([mobKey, mobEntry = {}]) => {
      const modes = Array.isArray(mobEntry.modes) ? mobEntry.modes : null;
      const weightOverride = this.weightOverrides.get(mobKey);

      if (modes && modes.length > 0) {
        modes.forEach((modeEntry) => {
          if (!modeEntry) return;
          const from = modeEntry.from ?? 0;
          const to = modeEntry.to ?? Infinity;
          if (t < from || t > to) return;

          const weightSource = weightOverride ?? modeEntry.weight ?? mobEntry.weight;
          const weight = Math.max(0, evaluateWeight(weightSource, t));
          if (weight <= 0) return;
          if (!this.enemyPools?.canSpawn?.(mobKey)) return;

          const maxConcurrent = modeEntry.maxConcurrent;
          if (Number.isFinite(maxConcurrent)) {
            const active = this._getModeActiveCount(mobKey, modeEntry.key);
            if (active >= maxConcurrent) return;
          }

          const cooldownMs = Number(modeEntry.cooldownMs) || 0;
          if (cooldownMs > 0 && this._isModeOnCooldown(mobKey, modeEntry.key, nowMs)) return;

          candidates.push({
            mobKey,
            modeKey: modeEntry.key ?? null,
            mobEntry,
            modeEntry,
            weight,
          });
        });
      } else {
        const weightSource = weightOverride ?? mobEntry.weight;
        const weight = Math.max(0, evaluateWeight(weightSource, t));
        if (weight <= 0) return;
        if (!this.enemyPools?.canSpawn?.(mobKey)) return;

        candidates.push({
          mobKey,
          modeKey: null,
          mobEntry,
          modeEntry: null,
          weight,
        });
      }
    });

    if (candidates.length === 0) return;

    // Shared spawn context passed to custom spawners
    const ctx = {
      scene: this.scene,
      enemyPools: this.enemyPools,
      heroSprite,
      modeKey: null,
    };

    // Perform spawn attempts (each may spawn multiple mobs depending on spawner)
    for (let i = 0; i < attempts; i++) {
      const candidate = weightedPick(candidates);
      if (!candidate) break;

      const { mobKey, modeKey, mobEntry, modeEntry } = candidate;

      if (!this.enemyPools?.canSpawn?.(mobKey)) {
        candidate.weight = 0;
        if (candidates.every((entry) => Math.max(0, entry.weight) <= 0)) break;
        continue;
      }

      if (modeEntry) {
        const maxConcurrent = modeEntry.maxConcurrent;
        if (Number.isFinite(maxConcurrent) && this._getModeActiveCount(mobKey, modeKey) >= maxConcurrent) {
          candidate.weight = 0;
          if (candidates.every((entry) => Math.max(0, entry.weight) <= 0)) break;
          continue;
        }

        const cooldownMs = Number(modeEntry.cooldownMs) || 0;
        const loopNow = this.scene.time?.now ?? 0;
        if (cooldownMs > 0 && this._isModeOnCooldown(mobKey, modeKey, loopNow)) {
          candidate.weight = 0;
          if (candidates.every((entry) => Math.max(0, entry.weight) <= 0)) break;
          continue;
        }
      }

      const spawnerKey = modeEntry?.spawner ?? mobEntry.customSpawner ?? 'ring';
      const spawnerFn = this.spawners?.[spawnerKey] ?? this.spawners?.ring;
      if (typeof spawnerFn !== 'function') {
        candidate.weight = 0;
        continue;
      }

      const effectiveEntry = { ...mobEntry, ...(modeEntry || {}) };
      ctx.modeKey = modeKey ?? null;

      let handled = 0;
      try {
        handled = spawnerFn(ctx, mobKey, t, effectiveEntry) || 0;
      } catch (err) {
        console.warn(`[SpawnDirector] spawner ${spawnerKey} failed`, err);
      }

      if (handled) {
        const loopNow = this.scene.time?.now ?? 0;
        if (modeEntry?.cooldownMs) {
          this._setModeCooldownUntil(mobKey, modeKey, loopNow + modeEntry.cooldownMs);
        }
        this._incrementModeActive(mobKey, modeKey, handled);
      } else {
        candidate.weight = 0;
      }

      if (candidates.every((entry) => Math.max(0, entry.weight) <= 0)) break;
    }
  }

  /** Handle update so this system stays coordinated. */
  update() {
    // SpawnDirector relies on internal timers; explicit update hook reserved for future use.
  }
}
