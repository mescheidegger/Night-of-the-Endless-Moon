import { WeaponControllerBase } from './WeaponControllerBase.js';
import * as Cooldown from '../core/Cooldown.js';
import * as TargetSelect from '../targeting/TargetSelect.js';
import { playChainThrowFx } from '../core/ChainThrowFx.js';

export class ChainThrowController extends WeaponControllerBase {
  /** Initialize ChainThrowController state so runtime dependencies are ready. */
  constructor(scene, owner, weaponConfig, options = {}) {
    super(scene, owner, weaponConfig, options);

    const delay = this.getEffectiveDelayMs();
    const now = this.scene?.time?.now ?? Date.now();
    this.nextFireAtMs = this._scheduleInitial(now, delay);

    this._activeThrow = null;

    // Monotonic counter for generating scoped fire ids for this controller.
    // Keeps controllers decoupled from SoundManager while still supporting "stop on early end".
    this._fireScopeSeq = 0;
    this._activeFireScope = null;
  }

  /** Handle getEffectiveDelayMs so this system stays coordinated. */
  getEffectiveDelayMs() {
    return Math.max(40, this._effectiveDelayMs(3200));
  }

  /** Handle destroy so this system stays coordinated. */
  destroy() {
    // If we are being destroyed mid-throw, end scoped audio.
    this._endScopedFire(true);

    if (this._activeThrow?.cancel) {
      this._activeThrow.cancel();
      this._activeThrow = null;
    }
    super.destroy?.();
  }

  /** Handle update so this system stays coordinated. */
  update(_dt) {
    const now = this.scene?.time?.now ?? Date.now();
    if (!Number.isFinite(this.nextFireAtMs)) {
      this.nextFireAtMs = this._scheduleInitial(now, this.getEffectiveDelayMs());
    }

    if (!Cooldown.shouldFire(now, this.nextFireAtMs)) return;
    if (typeof this.owner?.canFire === 'function' && !this.owner.canFire()) return;

    const origin = this.owner?.getPos?.();
    if (!origin) return;

    const range = Math.max(0, this.effectiveConfig?.targeting?.range ?? 0);
    const start = TargetSelect.nearest(this.enemyGroup, origin, range);
    if (!start) return;

    const path = this._buildChainPath(start);
    if (!path.length) return;

    this._fireChain(path);

    const delayMs = this.getEffectiveDelayMs();
    this.nextFireAtMs = this._scheduleNext(now, delayMs);

    // Keep your existing fired events (HUD hooks, etc.)
    this.events.emit('controller:fired', { delayMs, nextFireAt: this.nextFireAtMs });
    this.bus?.emit('weapons:fired', this.baseConfig?.key);
  }

  /** Handle _buildChainPath so this system stays coordinated. */
  _buildChainPath(start) {
    const cfg = this.effectiveConfig?.archetype?.chainThrow ?? {};
    const maxHops = Math.max(1, Math.floor(cfg.maxHops ?? 1));
    const hopRadius = Math.max(0, cfg.hopRadius ?? 0);
    const allowRepeat = !!cfg.allowRepeat;

    const path = [];
    const visited = allowRepeat ? null : new Set();
    let current = start;

    for (let i = 0; i < maxHops && current; i += 1) {
      path.push(current);
      if (!allowRepeat) visited.add(current);

      const hopRadiusSq = hopRadius * hopRadius;
      const candidates = [];

      this.enemyGroup?.children?.iterate?.((enemy) => {
        if (!enemy || !enemy.active) return;
        if (enemy === current) return;
        if (!allowRepeat && visited.has(enemy)) return;

        const dx = enemy.x - current.x;
        const dy = enemy.y - current.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > hopRadiusSq) return;

        candidates.push({ enemy, d2 });
      });

      if (!candidates.length) break;
      candidates.sort((a, b) => a.d2 - b.d2);
      current = candidates[0].enemy;
    }

    return path;
  }

  /** Handle _nextFireScope so this system stays coordinated. */
  _nextFireScope() {
    this._fireScopeSeq += 1;
    const weaponKey = this.baseConfig?.key ?? 'weapon';
    const ownerId = this.owner?.id ?? this.owner?.name ?? 'owner';
    return `${weaponKey}:${ownerId}:${this._fireScopeSeq}`;
  }

  /** Handle _beginScopedFire so this system stays coordinated. */
  _beginScopedFire() {
    const fireCfg = this.effectiveConfig?.audio?.fire;
    if (!fireCfg?.scoped) return;

    // End any previous scope (in case something went weird).
    this._endScopedFire(true);

    const scope = this._nextFireScope();
    this._activeFireScope = scope;

    // Audio system will start the fire sound and associate it with this scope.
    this.scene?.events?.emit('weapon:fire:start', {
      weaponKey: this.baseConfig?.key,
      scope
    });
  }

  /** Handle _endScopedFire so this system stays coordinated. */
  _endScopedFire(_immediate = false) {
    if (!this._activeFireScope) return;

    const scope = this._activeFireScope;
    this._activeFireScope = null;

    // Audio system will stop/fade the fire sound associated with this scope.
    this.scene?.events?.emit('weapon:fire:end', { scope });
  }

  /** Handle _fireChain so this system stays coordinated. */
  _fireChain(path) {
    if (!Array.isArray(path) || !path.length) return;

    // Cancel any previous throw and end any prior scoped sound.
    this._endScopedFire(true);

    if (this._activeThrow?.cancel) {
      this._activeThrow.cancel();
      this._activeThrow = null;
    }

    // Begin scoped fire audio for weapons that opt in (audio.fire.scoped === true)
    this._beginScopedFire();

    const chainCfg = this.effectiveConfig?.archetype?.chainThrow ?? {};
    const perHopDurationMs = Math.max(16, chainCfg.perHopDurationMs ?? 120);
    const falloffPerHop = Math.max(0, chainCfg.falloffPerHop ?? 0);
    const rotationSpeed = chainCfg.rotationSpeed ?? 18 * Math.PI;

    const projectileCfg = this.effectiveConfig?.projectile ?? {};
    const textureKey = projectileCfg.texture ?? 'holyhammerthrow';

    const basePayload = this.buildDamagePayload();
    const heroPos = this.owner?.getPos?.();

    this._activeThrow = playChainThrowFx(this.scene, textureKey, path, {
      originPos: heroPos,
      rotationSpeed,
      perHopDurationMs,
      onHopHit: (enemy, index) => {
        if (!enemy || !enemy.active) return;

        const falloff = Math.max(0, 1 - falloffPerHop * index);
        const damage = Math.max(0, (basePayload.damage ?? 0) * falloff);

        this.damagePipeline?.applyHit(enemy, {
          ...basePayload,
          damage,
          sourceKey: this.baseConfig?.key
        });
      },
      onComplete: () => {
        // FX ended (naturally or early) -> stop scoped audio.
        this._endScopedFire(false);

        if (this._activeThrow) {
          this._activeThrow = null;
        }
      }
    });
  }
}
