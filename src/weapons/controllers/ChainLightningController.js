import Phaser from 'phaser';
import { WeaponControllerBase } from './WeaponControllerBase.js';
import * as Cooldown from '../core/Cooldown.js';
import * as AnimSafe from '../core/AnimSafe.js';
import * as TargetSelect from '../targeting/TargetSelect.js';

/**
 * ChainLightningController
 *
 * Fires a chain lightning effect:
 * - Selects a starting enemy within range
 * - Builds a hop chain of nearby enemies based on hop radius / max hops
 * - Sequentially damages enemies along that path (or tied to animation timing)
 * - Optionally plays a chain lightning sprite animation at the hop positions
 */
export class ChainLightningController extends WeaponControllerBase {
  /** Initialize ChainLightningController state so runtime dependencies are ready. */
  constructor(scene, owner, weaponConfig, options = {}) {
    super(scene, owner, weaponConfig, options);

    // Determine initial fire delay and schedule next fire time.
    const delay = this.getEffectiveDelayMs();
    const now = this.scene?.time?.now ?? Date.now();
    this.nextFireAtMs = this._scheduleInitial(now, delay);

    // Holds state for an in-progress chain animation (so we can cleanly cancel/replace).
    this._activeChain = null;
  }

  /**
   * Compute cadence delay, applying modifiers.
   * Minimum enforced to avoid "machinegun lightning".
   */
  getEffectiveDelayMs() {
    return Math.max(40, this._effectiveDelayMs(3200));
  }

  /**
   * Ensure any in-progress chain is cleaned up when weapon is destroyed.
   */
  destroy() {
    this._cleanupActiveChain(true);
    super.destroy?.();
  }

  /**
   * Main controller update
   * - Checks cooldown & owner firing conditions
   * - Selects first enemy within range
   * - Builds a chain of hop targets
   * - Triggers chain damage + optional visual effects
   */
  update(_dt) {
    const now = this.scene?.time?.now ?? Date.now();
    if (!Number.isFinite(this.nextFireAtMs)) {
      this.nextFireAtMs = this._scheduleInitial(now, this.getEffectiveDelayMs());
    }

    // Skip if not time to fire or player can't fire
    if (!Cooldown.shouldFire(now, this.nextFireAtMs)) return;
    if (typeof this.owner?.canFire === 'function' && !this.owner.canFire()) return;

    const origin = this.owner?.getPos?.();
    if (!origin) return;

    // Select first hop target
    const range = Math.max(0, this.effectiveConfig?.targeting?.range ?? 0);
    const start = TargetSelect.nearest(this.enemyGroup, origin, range);
    if (!start) return;

    // Compute follow-up hop path
    const path = this._buildChainPath(start);
    if (!path.length) return;

    // Trigger chain effect
    this._fireChain(path);

    // Reschedule next fire time
    const delayMs = this.getEffectiveDelayMs();
    this.nextFireAtMs = this._scheduleNext(now, delayMs);

    // Event hooks for UI / analytics
    this.events.emit('controller:fired', { delayMs, nextFireAt: this.nextFireAtMs });
    this.bus?.emit('weapons:fired', this.baseConfig?.key);
  }

  /**
   * Fully stop any active chain lightning (timers, listeners, and sprite).
   */
  _cleanupActiveChain() {
    const active = this._activeChain;
    if (!active) return;

    // Cancel per-hop timers
    active.timers?.forEach((timer) => timer?.remove?.());

    // Remove animation listeners and sprite
    const sprite = active.sprite;
    if (sprite) {
      AnimSafe.detach(sprite, active.animHandlers ?? {});
      if (sprite.scene) {
        sprite.destroy();
      }
    }

    this._activeChain = null;
  }

  /**
   * Build a hop chain by repeatedly selecting the closest enemy
   * within hop radius that hasn't already been visited.
   */
  _buildChainPath(start) {
    const chainCfg = this.effectiveConfig?.archetype?.chain ?? {};
    const maxHops = Math.max(1, Math.floor(chainCfg.maxHops ?? 1));
    const hopRadius = Math.max(0, chainCfg.hopRadius ?? 0);
    const allowRepeat = !!chainCfg.allowRepeat;

    const path = [];
    const visited = allowRepeat ? null : new Set();
    let current = start;

    for (let i = 0; i < maxHops && current; i += 1) {
      path.push(current);
      if (!allowRepeat) visited.add(current);

      const r2 = hopRadius * hopRadius;
      const candidates = [];

      // 1) Snapshot all eligible enemies with their distance^2 to current
      this.enemyGroup?.children?.iterate?.((enemy) => {
        if (!enemy || !enemy.active) return;
        if (enemy === current) return;
        if (!allowRepeat && visited.has(enemy)) return;

        const dx = enemy.x - current.x;
        const dy = enemy.y - current.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) return; // outside hop radius

        candidates.push({ enemy, d2 });
      });

      // 2) Sort strictly by distance^2 (deterministic)
      if (candidates.length === 0) break;
      candidates.sort((a, b) => a.d2 - b.d2);

      // 3) Pick the closest; optional tiny epsilon tie-break is inherent in sort order
      const next = candidates[0].enemy;
      if (!next) break;

      current = next;
    }

    return path;
  }


  /**
   * Applies chain lightning damage along the hop path and optionally
   * plays a chain lightning sprite animation to visually travel hop-to-hop.
   */
  _fireChain(path) {
    if (!Array.isArray(path) || !path.length) return;

    // Cancel any existing chain animation/effects before starting a new one.
    this._cleanupActiveChain(true);

    const projectileCfg = this.effectiveConfig?.projectile ?? {};
    const chainCfg = this.effectiveConfig?.archetype?.chain ?? {};
    const animKey = projectileCfg.animKey;
    const textureKey = projectileCfg.texture;
    const first = path[0];

    // Create chain lightning sprite visual anchor
    let sprite = null;
    if (this.scene?.add && textureKey) {
      const anchorX = first?.x ?? this.owner?.getPos?.()?.x ?? 0;
      const anchorY = first?.y ?? this.owner?.getPos?.()?.y ?? 0;
      sprite = this.scene.add.sprite(anchorX, anchorY, textureKey)
        .setDepth(7)
        .setOrigin(0.5, 0.5);
    }

    // Active chain state holder
    const active = {
      sprite,
      path,
      applied: new Set(),   // Track which hop indices already processed
      timers: [],           // Cleanup timers for delayed hops
      chainCfg,
      animHandlers: {}      // Hooks for AnimSafe
    };

    // Copy damage template once (reduce GC churn during apply)
    const payloadTemplate = this.buildDamagePayload();

    this._activeChain = active;

    // Apply damage and visual link for hop index
    const applyAt = (index) => {
      if (!this._activeChain || active.applied.has(index)) return;
      if (index < 0 || index >= active.path.length) return;

      const enemy = active.path[index];
      if (!enemy || !enemy.active) return;

      active.applied.add(index);

      // Move sprite to current target
      if (active.sprite) {
        active.sprite.setPosition(enemy.x, enemy.y);
      }

      // Draw link from previous hop
      const prev = index > 0 ? active.path[index - 1] : null;
      if (prev && prev.active) {
        this._drawChainLink(prev, enemy);
      }

      // Compute falloff per hop
      const falloffPerHop = Math.max(0, chainCfg.falloffPerHop ?? 0);
      const falloff = Math.max(0, 1 - falloffPerHop * index);
      const damage = Math.max(0, (payloadTemplate.damage ?? 0) * falloff);

      // Apply damage to this hop target
      this.damagePipeline?.applyHit(enemy, {
        ...payloadTemplate,
        damage,
        sourceKey: this.baseConfig?.key
      });

    };

    // Cleanup wrapper (shared across animation/timing modes)
    const cleanup = () => {
      if (this._activeChain !== active) return;
      this._cleanupActiveChain();
    };

    // If hop timing is driven by a delay instead of animation:
    const perHopDelay = Number.isFinite(chainCfg.perHopDelayMs)
      ? Math.max(0, chainCfg.perHopDelayMs)
      : null;

    if (perHopDelay !== null) {
      // Scheduled hop application over time
      active.perHopDelayMs = perHopDelay;

      for (let i = 0; i < active.path.length; i += 1) {
        const delay = perHopDelay * i;
        const timer = this.scene?.time?.delayedCall?.(delay, () => applyAt(i));
        if (timer) {
          active.timers.push(timer);
        } else {
          applyAt(i);
        }
      }

      // Play chain animation if available
      if (sprite && animKey) {
        active.animHandlers.onComplete = cleanup;
        const result = AnimSafe.playIfExists(sprite, animKey, active.animHandlers);

        // Fallback if animation was missing
        if (!result.played) {
          const cleanupDelay = perHopDelay * active.path.length + 120;
          const timer = this.scene?.time?.delayedCall?.(cleanupDelay, cleanup);
          if (timer) active.timers.push(timer); else cleanup();
        }
      } else {
        // No animation -> schedule cleanup based on total hop time
        const cleanupDelay = perHopDelay * active.path.length + 120;
        const timer = this.scene?.time?.delayedCall?.(cleanupDelay, cleanup);
        if (timer) active.timers.push(timer); else cleanup();
      }

      return;
    }

    // Animation-driven hop timing mode
    if (sprite && animKey) {
      const startFrame = Number.isFinite(chainCfg.startFrameIndex) ? chainCfg.startFrameIndex : 0;
      const stride = Math.max(1, Math.floor(chainCfg.frameStride ?? 1));

      // NEW: keep track of the last applied hop to fill gaps if frames are skipped
      let lastAppliedHop = -1;

      // Ensure first hop applies immediately
      applyAt(0);
      lastAppliedHop = 0;

      active.animHandlers.onUpdate = (_anim, frame) => {
        if (!frame) return;

        const hopIndex = Math.floor((frame.index - startFrame) / stride);
        if (hopIndex < 0) return;

        // NEW: backfill any skipped hops (e.g., 1 got skipped when anim jumped 0->2)
        for (let i = lastAppliedHop + 1; i <= hopIndex && i < active.path.length; i += 1) {
          applyAt(i);
          lastAppliedHop = i;
        }
      };

      active.animHandlers.onComplete = () => {
        // Safety: if animation ended before we reached the last hop, finish them
        for (let i = lastAppliedHop + 1; i < active.path.length; i += 1) {
          applyAt(i);
        }
        cleanup();
      };

      const result = AnimSafe.playIfExists(sprite, animKey, active.animHandlers);
      if (!result.played) {
        // Fallback: apply all immediately, then quick cleanup
        for (let i = 0; i < active.path.length; i += 1) applyAt(i);
        const fallbackTimer = this.scene?.time?.delayedCall?.(200, cleanup);
        if (fallbackTimer) active.timers.push(fallbackTimer); else cleanup();
      }
      return;
    }

    // No animation mode, no per-hop delay: apply chain instantly
    for (let i = 0; i < active.path.length; i += 1) {
      applyAt(i);
    }

    // Cleanup after slight delay for visual link fades
    const fallbackTimer = this.scene?.time?.delayedCall?.(200, cleanup);
    if (fallbackTimer) active.timers.push(fallbackTimer); else cleanup();
  }

  /**
   * Draws a brief fade-out line between two hop targets.
   * Purely visual effect, quickly destroyed.
   */
  _drawChainLink(from, to) {
    if (!this.scene?.add) return;

    const line = this.scene.add.line(0, 0, from.x, from.y, to.x, to.y, 0x9ad8ff, 1)
      .setDepth(6)
      .setOrigin(0, 0)
      .setBlendMode(Phaser.BlendModes.ADD);

    if (typeof line.setLineWidth === 'function') {
      line.setLineWidth(2, 2);
    }

    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 120,
      onComplete: () => line.destroy()
    });
  }
}
