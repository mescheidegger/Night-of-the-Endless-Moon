import Phaser from 'phaser';
import { WeaponControllerBase } from './WeaponControllerBase.js';
import * as Cooldown from '../core/Cooldown.js';
import * as Facing from '../core/Facing.js';
import * as Salvo from '../core/Salvo.js';
import { spawnExplosionFxAndAoe } from '../ExplosionFx.js';
import { attachSpinWhileFlying } from '../core/SpinWhileFlying.js';

export class BallisticWeaponController extends WeaponControllerBase {
  /** Initialize BallisticWeaponController state so runtime dependencies are ready. */
  constructor(scene, owner, weaponConfig, options = {}) {
    super(scene, owner, weaponConfig, options);

    this.projectilePool = options.projectilePool ?? null;
    this.fxPool = options.fxPool ?? null;

    const delay = this.getEffectiveDelayMs();
    const now = this.scene?.time?.now ?? Date.now();
    this.nextFireAtMs = this._scheduleInitial(now, delay);

    this._readyAnnounced = false;
  }

  /** Handle getEffectiveDelayMs so this system stays coordinated. */
  getEffectiveDelayMs() {
    return this._effectiveDelayMs(600);
  }

  /** Handle _resolveFacingAngle so this system stays coordinated. */
  _resolveFacingAngle() {
    return Facing.resolve(this.owner);
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

    this.targetingCoordinator?.prune(now);

    const arch = this.effectiveConfig?.archetype || {};
    const aimMode = arch.aim || 'self';
    const ballistic = arch.ballistic || {};

    const baseAngle = this._computeLaunchAngle(ballistic, aimMode);

    const baseSalvo = Math.max(1, this.effectiveConfig?.cadence?.salvo ?? 1);
    const passiveManager = this.scene?.passiveManager;
    const passiveBonus = passiveManager?.getProjectileSalvoBonus?.() ?? 0;
    const salvo = Math.max(1, baseSalvo + passiveBonus);
    const spread = (this.effectiveConfig?.cadence?.spreadDeg ?? 0) * Phaser.Math.DEG_TO_RAD;

    for (let i = 0; i < salvo; i += 1) {
      const angle = baseAngle + Salvo.spreadOffset(i, salvo, spread);
      this._fireBallisticProjectile(origin, angle, ballistic);
    }

    const delayMs = this.getEffectiveDelayMs();
    this.nextFireAtMs = this._scheduleNext(now, delayMs);

    this.events.emit('controller:fired', { delayMs, nextFireAt: this.nextFireAtMs });
    this.bus?.emit('weapons:fired', this.baseConfig?.key);
  }

  /** Handle _computeLaunchAngle so this system stays coordinated. */
  _computeLaunchAngle(ballistic, aimMode) {
    const launchDeg = Number.isFinite(ballistic?.launchAngleDeg) ? ballistic.launchAngleDeg : -75;
    let angle = Phaser.Math.DEG_TO_RAD * launchDeg;

    if (aimMode === 'facing') {
      const facingVal = this.owner?.getFacing?.();

      const isFacingLeft =
        (typeof facingVal === 'string' && facingVal.toLowerCase().includes('left')) ||
        (Number.isFinite(facingVal) && Math.cos(facingVal) < 0);

      if (isFacingLeft) {
        angle = Math.PI - angle;
      }

      const biasDeg = Number.isFinite(ballistic?.facingBiasDeg) ? ballistic.facingBiasDeg : 0;
      if (biasDeg) {
        const bias = Phaser.Math.DEG_TO_RAD * biasDeg;
        angle += isFacingLeft ? -bias : +bias;
      }
    }

    return Phaser.Math.Angle.Normalize(angle);
  }

  /** Handle _fireBallisticProjectile so this system stays coordinated. */
  _fireBallisticProjectile(origin, angle, ballistic) {
    if (!this.projectilePool) return;

    const projectile = this.projectilePool.acquire();
    if (!projectile) return;

    const projectileCfg = this.effectiveConfig?.projectile || {};
    const lifetime = projectileCfg.lifetimeMs ?? 1200;
    const pierce = projectileCfg.pierce ?? 0;
    const explosion = projectileCfg.explosion ?? null;
    const animKey = projectileCfg.animKey ?? null;
    const rotateToVelocity = !!ballistic?.rotateToVelocity;
    const spinSpeed = Number.isFinite(projectileCfg.spinSpeedRadPerSec)
      ? projectileCfg.spinSpeedRadPerSec
      : Number.isFinite(ballistic?.spinSpeedRadPerSec)
        ? ballistic.spinSpeedRadPerSec
        : 0;

    projectile.fire({
      x: origin.x,
      y: origin.y,
      angle,
      speed: 0, // ballistic uses gravity
      lifetimeMs: lifetime,
      controller: this,
      pierce,
      explosion,
      animKey,
      rotateToVelocity
    });

    // --- NEW: initialize pierce / explosion state on the projectile ---
    const data = projectile._weaponData || (projectile._weaponData = {});
    data.maxPierce = Number.isFinite(pierce) ? pierce : 0;
    // total allowed hits = 1 (first hit) + pierce
    data.remainingHits = 1 + data.maxPierce;
    data.hitCount = 0;
    data.hitSet = new Set();
    if (explosion) {
      data.explosionCfg = explosion;
    }
    // ---------------------------------------------------------------

    const launchSpeed = Number.isFinite(ballistic?.launchSpeed) ? ballistic.launchSpeed : 420;
    const gravityY = Number.isFinite(ballistic?.gravityY) ? ballistic.gravityY : 800;

    const vx = launchSpeed * Math.cos(angle);
    const vy = launchSpeed * Math.sin(angle);

    projectile.body?.setAllowGravity(true);
    projectile.body?.setGravityY(gravityY);
    projectile.body?.setVelocity(vx, vy);
    projectile.body?.setAcceleration(0, 0);

    if (rotateToVelocity) {
      projectile.rotation = Math.atan2(vy, vx);
      projectile._weaponData.rotateToVelocity = true;
    }

    // === timed explosion / timeout fallback ===
    data.exploded = false;
    if (data.explodeTimer) {
      data.explodeTimer.remove(false);
      data.explodeTimer = null;
    }

    if (this.scene?.time && explosion) {
      const detonateMs = Number.isFinite(explosion.detonateMs)
        ? explosion.detonateMs
        : lifetime; // default: explode at end of flight

      data.explodeTimer = this.scene.time.delayedCall(
        detonateMs,
        () => this._explodeProjectile(projectile),
        null,
        this
      );
    }

    const startY = origin.y;
    const camera = this.scene?.cameras?.main;
    const mapRuntime = this.scene?.mapRuntime;
    // Bounded maps prefer world bounds for projectile cleanup.
    const bounds = mapRuntime?.isBounded?.() ? mapRuntime.getWorldBounds?.() : null;
    let descentTimer = null;

    data.flight = {
      update: (p, _dt) => {
        const body = p.body;
        if (!body) return;

        const view = bounds ? null : camera?.worldView;
        const outOfBounds = bounds
          ? (p.x < bounds.left - 128 || p.x > bounds.right + 128 || p.y < bounds.top - 128 || p.y > bounds.bottom + 128)
          : (view && (p.x < view.x - 128 || p.x > view.right + 128 || p.y > view.bottom + 128));
        if (outOfBounds) {
          this._explodeProjectile(p); // explode / cleanup when flying off-screen
          return;
        }

        if (body.velocity?.y > 0 && p.y > startY + 16) {
          if (!descentTimer) {
            descentTimer = this.scene.time.delayedCall(200, () => {
              descentTimer = null;
              this._explodeProjectile(p);
            });
          }
        }
      },
      onRelease: () => {
        if (descentTimer) {
          descentTimer.remove(false);
          descentTimer = null;
        }
        if (data.explodeTimer) {
          data.explodeTimer.remove(false);
          data.explodeTimer = null;
        }
      }
    };

    if (spinSpeed) {
      attachSpinWhileFlying(projectile, { spinSpeedRadPerSec: spinSpeed });
    }

    if (this.fxPool?.muzzle) {
      this.fxPool.muzzle(origin, angle, this._resolveFacingAngle());
    }
  }

  /**
   * Shared explosion / finalization logic used by both impact and timeout.
   * Ensures we only explode once per projectile.
   */
  _explodeProjectile(projectile) {
    const data = projectile?._weaponData;
    if (!projectile || data?.exploded) return;

    if (data) {
      data.exploded = true;

      if (data.explodeTimer) {
        data.explodeTimer.remove(false);
        data.explodeTimer = null;
      }
    }

    const explosionCfg = data?.explosionCfg;
    if (explosionCfg && this.enemyGroup) {
      const payload = this.buildDamagePayload();
      spawnExplosionFxAndAoe({
        scene: this.scene,
        origin: { x: projectile.x, y: projectile.y },
        payload,
        explosionCfg,
        enemyGroup: this.enemyGroup,
        damagePipeline: this.damagePipeline,
        sourceKey: this.baseConfig?.key
      });
    }

    this.fxPool?.impact?.(projectile.x, projectile.y);
    this.projectilePool?.release(projectile);
  }

  /** Handle onProjectileImpact so this system stays coordinated. */
  onProjectileImpact(projectile, enemy) {
    if (!projectile || !enemy) return;

    const data = projectile._weaponData || (projectile._weaponData = {});

    // Avoid multiple hits on the same enemy
    data.hitSet ??= new Set();
    if (data.hitSet.has(enemy)) return;
    data.hitSet.add(enemy);

    const payload = this.buildDamagePayload();
    this.damagePipeline?.applyHit(enemy, payload);

    // --- NEW: pierce-aware impact logic ---
    if (!Number.isFinite(data.remainingHits)) {
      // Fallback: derive from config if somehow missing
      const cfgPierce = this.effectiveConfig?.projectile?.pierce ?? 0;
      data.maxPierce = Number.isFinite(cfgPierce) ? cfgPierce : 0;
      data.remainingHits = 1 + data.maxPierce;
    }

    data.hitCount = (data.hitCount ?? 0) + 1;
    data.remainingHits = Math.max(0, data.remainingHits - 1);

    // If we still have hits left, keep flying (no explosion yet)
    if (data.remainingHits > 0) {
      return;
    }

    // No hits left: finalize
    this._explodeProjectile(projectile);
    // ---------------------------------------------------
  }
}
