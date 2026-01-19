import Phaser from 'phaser';
import { getEnemyProjectileConfigFromWeaponKey } from '../../EnemyProjectilePresets.js';

export class EnemyProjectileWeaponController {
  /** Initialize EnemyProjectileWeaponController state so runtime dependencies are ready. */
  constructor(scene, enemy, options = {}) {
    this.scene = scene;
    this.enemy = enemy;

    this.weaponKey = options.weaponKey ?? null;
    this.overrides = options.overrides ?? null;

    this.cooldownMs = Number.isFinite(options.cooldownMs) ? options.cooldownMs : 3000;
    this.initialDelayMs = Number.isFinite(options.initialDelayMs) ? options.initialDelayMs : undefined;
    this.range = Number.isFinite(options.range) ? options.range : Infinity;

    this.salvo = Number.isFinite(options.salvo) ? Math.max(1, options.salvo) : 1;
    this.spreadDeg = Number.isFinite(options.spreadDeg) ? options.spreadDeg : 0;

    this.aimMode = options.aimMode || 'atTarget';
    this.enemyProjectiles = options.enemyProjectiles ?? scene?.enemyProjectiles ?? null;

    this._config = null;
    this._nextFireAt = null;
    this._isDestroyed = false;
  }

  /** Handle _ensureConfig so this system stays coordinated. */
  _ensureConfig() {
    if (this._config !== null) return this._config;

    const key = this.weaponKey;
    const overrides = this.overrides ?? null;

    const fromWeapon = key ? getEnemyProjectileConfigFromWeaponKey(key, overrides) : null;

    // If no registry mapping exists, fall back to direct overrides (if provided)
    this._config = fromWeapon ?? overrides ?? null;
    return this._config;
  }

  /** Handle _ensureInit so this system stays coordinated. */
  _ensureInit(nowMs = 0) {
    if (Number.isFinite(this._nextFireAt)) return;

    const delay = Number.isFinite(this.initialDelayMs)
      ? this.initialDelayMs
      : this.cooldownMs;

    this._nextFireAt = nowMs + delay;
  }

  /** Handle resetCooldown so this system stays coordinated. */
  resetCooldown(nowMs = 0) {
    this._nextFireAt = null;
    this._ensureInit(nowMs);
  }

  /** Handle canFire so this system stays coordinated. */
  canFire(nowMs = 0) {
    if (this._isDestroyed || !this.enemy || !this.enemy.active) return false;
    if (!this.enemyProjectiles) return false;

    const config = this._ensureConfig();
    if (!config) return false;

    this._ensureInit(nowMs);
    return Number.isFinite(this._nextFireAt) && nowMs >= this._nextFireAt;
  }

  /** Handle _getAimAngle so this system stays coordinated. */
  _getAimAngle(target) {
    if (this.aimMode === 'forward') {
      const vel = this.enemy?.body?.velocity;
      if (vel && (Number.isFinite(vel.x) || Number.isFinite(vel.y))) {
        return Math.atan2(vel.y || 0, vel.x || 0);
      }
      return this.enemy?.rotation ?? 0;
    }

    if (!target) return null;

    const enemyX = this.enemy?.x ?? 0;
    const enemyY = this.enemy?.y ?? 0;
    const targetX = target.x;
    const targetY = target.y;

    if (Number.isFinite(this.range)) {
      const dist = Phaser.Math.Distance.Between(enemyX, enemyY, targetX, targetY);
      if (dist > this.range) return null;
    }

    return Phaser.Math.Angle.Between(enemyX, enemyY, targetX, targetY);
  }

  /** Handle _fireSalvo so this system stays coordinated. */
  _fireSalvo(angle, cfg) {
    const salvoCount = Math.max(1, this.salvo);
    const spreadRad = (this.spreadDeg ?? 0) * Phaser.Math.DEG_TO_RAD;
    let fired = false;

    for (let i = 0; i < salvoCount; i += 1) {
      let offset = 0;
      if (spreadRad !== 0 && salvoCount > 1) {
        const t = salvoCount > 1 ? (i / (salvoCount - 1)) : 0.5;
        offset = (t - 0.5) * spreadRad;
      }

      const shot = this.enemyProjectiles.fire({
        x: this.enemy?.x ?? 0,
        y: this.enemy?.y ?? 0,
        angle: angle + offset,
        speed: cfg.speed,
        lifetimeMs: cfg.lifetimeMs,
        damage: cfg.damage,
        animKey: cfg.animKey,
        texture: cfg.texture,
        atlas: cfg.atlas,
        atlasFrame: cfg.atlasFrame,
        body: cfg.body,
        explosion: cfg.explosion,
        aoe: cfg.aoe,
        repeat: cfg.repeat,
        rotateToVelocity: cfg.rotateToVelocity ?? true,
      });

      if (shot) fired = true;
    }

    return fired;
  }

  /** Handle tryFireAt so this system stays coordinated. */
  tryFireAt(target, nowMs = 0) {
    if (!this.canFire(nowMs)) return false;

    const cfg = this._ensureConfig();
    if (!cfg) return false;

    const angle = this._getAimAngle(target);
    if (!Number.isFinite(angle)) return false;

    const fired = this._fireSalvo(angle, cfg);
    if (fired) {
      this.scene?.events?.emit('weapon:fired', { weaponKey: this.weaponKey });
      this._nextFireAt = nowMs + this.cooldownMs;
    }

    return fired;
  }

  /** Handle forceFireAt so this system stays coordinated. */
  forceFireAt(target, nowMs = 0) {
    if (this._isDestroyed || !this.enemy || !this.enemy.active) return false;
    if (!this.enemyProjectiles) return false;

    const cfg = this._ensureConfig();
    if (!cfg) return false;

    const angle = this._getAimAngle(target);
    if (!Number.isFinite(angle)) return false;

    return this._fireSalvo(angle, cfg);
  }

  /** Handle destroy so this system stays coordinated. */
  destroy() {
    this._isDestroyed = true;
    this.enemyProjectiles = null;
    this.enemy = null;
    this._config = null;
  }
}
