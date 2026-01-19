import { getEnemyProjectileConfigFromWeaponKey } from '../../weapons/EnemyProjectilePresets.js';
import { EnemyProjectileWeaponController } from '../../weapons/controllers/enemy/EnemyProjectileWeaponController.js';
import { resolveMobConfig } from '../MobRegistry.js';

export class WerewolfBossController {
  /**
   * Initialize the boss state machine and tuning knobs for charge/patrol/barrage.
   */
  constructor(scene, enemy, opts = {}) {
    this.scene = scene;
    this.enemy = enemy;

    this.state = null;
    this.stateElapsedMs = 0;
    this._isDestroyed = false;

    // --- Charge tuning (telegraph + burst + recovery) ---
    this.chargeSpeed = opts.chargeSpeed ?? 700;
    this.chargeWindupMs = opts.chargeWindupMs ?? 450;

    // NOTE: chargeDurationMs is kept as a fallback, but we now prefer a
    // distance-based planned duration so the boss can cross the arena.
    this.chargeDurationMs = opts.chargeDurationMs ?? 650;

    // Planned dash duration clamps (prevents "tiny lunge" at long distances)
    this.chargeMinDurationMs = opts.chargeMinDurationMs ?? 450;
    this.chargeMaxDurationMs = opts.chargeMaxDurationMs ?? 1400;

    this.chargeStopDist = opts.chargeStopDist ?? 32;
    this.chargeRecoveryMs = opts.chargeRecoveryMs ?? 250;

    // Optional: make charge less "fair" by leading the hero slightly
    // leadFactor is in seconds of velocity prediction.
    this.chargeLeadFactor = opts.chargeLeadFactor ?? 0.25;

    // Optional: one-time hit during dash (set to 0 to disable)
    this.chargeHitRadius = opts.chargeHitRadius ?? 70;
    this.chargeHitDamage = opts.chargeHitDamage ?? 30;

    // --- Patrol tuning ---
    this.patrolSpeed = opts.patrolSpeed ?? 160;
    this.patrolDurationMs = opts.patrolDurationMs ?? 1200;
    this.arriveDist = opts.arriveDist ?? 28;
    this.patrolMargin = opts.patrolMargin ?? 64;

    // --- Barrage tuning ---
    this.shotIntervalMs = opts.shotIntervalMs ?? 90;
    this.barrageSpeed = opts.barrageSpeed ?? 320;
    this.barrageLifetimeMs = opts.barrageLifetimeMs ?? 3500;
    this.barrageDamage = opts.barrageDamage ?? 2;

    // Internal charge phase
    this._chargePhase = null; // 'windup' | 'dash' | 'recover'
    this._chargeTarget = null;
    this._chargeDir = null;
    this._chargeDidHit = false;
    this._chargeDashStartedAtMs = 0;
    this._chargeRecoverStartedAtMs = 0;
    this._chargePlannedDurationMs = 0;
    this._rangedWeapon = null;
    this._useLegacyBarrage = false;

    this._states = {
      charge: {
        enter: () => this._enterCharge(),
        update: () => this._updateCharge(),
        exit: () => this._exitCharge(),
      },
      patrol: {
        enter: () => this._enterPatrol(),
        update: () => this._updatePatrol(),
      },
      barrage: {
        enter: () => this._enterBarrage(),
        update: () => this._updateBarrage(),
      },
    };

    this.enter('charge');
  }

  /**
   * Transition the boss into a new state and run its enter/exit hooks.
   */
  enter(stateName) {
    if (this._isDestroyed) return;
    if (!stateName || this.state === stateName) return;

    const prev = this.state;
    const prevState = this._states[prev];
    prevState?.exit?.();

    this.state = stateName;
    this.stateElapsedMs = 0;

    // Helpful, but not too spammy (state transitions only)
    console.log(`[WerewolfBoss] ${prev ?? 'none'} -> ${stateName}`);

    const nextState = this._states[stateName];
    nextState?.enter?.();
  }

  /**
   * Advance the active state each frame while the boss is alive.
   */
  update(dt) {
    if (this._isDestroyed) return;
    if (!this.enemy?.active || this.enemy?._isDying) return;

    this.stateElapsedMs += dt || 0;

    const current = this._states[this.state];
    current?.update?.(dt);
  }

  /**
   * Tear down the controller and release any active attack helpers.
   */
  destroy() {
    if (this._isDestroyed) return;
    this._isDestroyed = true;
    this._rangedWeapon?.destroy?.();
    this._rangedWeapon = null;
    this._stopMovement();
    this._states = {};
    this.scene = null;
    this.enemy = null;
  }

  /**
   * Resolve the current hero sprite so attacks always target the player.
   */
  _hero() {
    return this.scene?.hero?.sprite ?? null;
  }

  /**
   * Flip the boss sprite so it faces the movement direction.
   */
  _faceToward(dx) {
    const enemy = this.enemy;
    if (!enemy) return;
    enemy.setFlipX(dx < 0);
  }

  /**
   * Apply a velocity toward a target while honoring the desired top speed.
   */
  _setVelToward(x, y, speed) {
    const enemy = this.enemy;
    const body = enemy?.body;
    if (!enemy || !body) return;

    const dx = x - enemy.x;
    const dy = y - enemy.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 0) return;

    this._faceToward(dx);

    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;

    // Some mob configs clamp max speed; during boss dash we want to actually hit chargeSpeed.
    body.setMaxSpeed?.(speed);
    body.setMaxVelocity?.(speed, speed);

    body.setVelocity?.(vx, vy);
  }

  /**
   * Compute distance to a target point for range and arrival checks.
   */
  _distTo(x, y) {
    const enemy = this.enemy;
    if (!enemy) return Infinity;
    return Math.hypot(x - enemy.x, y - enemy.y);
  }

  /**
   * Stop the boss body so state transitions can begin from a standstill.
   */
  _stopMovement() {
    const body = this.enemy?.body;
    if (!body) return;
    body.stop?.();
    body.setVelocity?.(0, 0);
  }

  /**
   * Pick a random patrol point inside the camera view with a margin.
   */
  _pickPointInView(margin) {
    const cam = this.scene?.cameras?.main;
    const view = cam?.worldView;
    if (!view) {
      return { x: this.enemy?.x ?? 0, y: this.enemy?.y ?? 0 };
    }

    const minX = view.x + margin;
    const maxX = view.x + view.width - margin;
    const minY = view.y + margin;
    const maxY = view.y + view.height - margin;

    if (minX >= maxX || minY >= maxY) {
      return { x: this.enemy?.x ?? view.centerX, y: this.enemy?.y ?? view.centerY };
    }

    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    return { x, y };
  }

  /**
   * Clamp time values so state durations stay within intended limits.
   */
  _clampMs(value, min, max) {
    const v = Number.isFinite(value) ? value : 0;
    const lo = Number.isFinite(min) ? min : 0;
    const hi = Number.isFinite(max) ? max : lo;
    return Math.max(lo, Math.min(hi, v));
  }

  // ------------------------
  // CHARGE (windup -> dash -> recover)
  // ------------------------

  /**
   * Begin the charge state by telegraphing and capturing the hero position.
   */
  _enterCharge() {
    const hero = this._hero();
    const enemy = this.enemy;
    if (!enemy) return;

    this._stopMovement();
    this._chargeDidHit = false;
    this._chargeDir = null;
    this._chargePlannedDurationMs = 0;

    // Snapshot target at the start; we will optionally refine right before dash
    this._chargeTarget = {
      x: hero?.x ?? enemy.x,
      y: hero?.y ?? enemy.y,
    };

    const dx = this._chargeTarget.x - enemy.x;
    this._faceToward(dx);

    // Telegraph
    const attackKey = enemy.animationKeys?.attack ?? 'werewolf:attack';
    if (attackKey && enemy.anims?.animationManager?.exists?.(attackKey)) {
      enemy.play(attackKey, true);
    }

    this._chargePhase = 'windup';
    this._chargeDashStartedAtMs = 0;
    this._chargeRecoverStartedAtMs = 0;
  }

  /**
   * Run the charge windup/dash/recovery phases, applying damage on impact.
   */
  _updateCharge() {
    const enemy = this.enemy;
    const hero = this._hero();
    const target = this._chargeTarget;
    if (!enemy || !target) return;

    // WINDUP
    if (this._chargePhase === 'windup') {
      if (this.stateElapsedMs < this.chargeWindupMs) return;

      // Optional lead: predict a little using hero velocity
      if (hero?.body?.velocity) {
        const vx = hero.body.velocity.x ?? 0;
        const vy = hero.body.velocity.y ?? 0;
        // leadFactor is documented as seconds; velocity is px/s, so multiply directly.
        target.x = (hero.x ?? target.x) + vx * this.chargeLeadFactor;
        target.y = (hero.y ?? target.y) + vy * this.chargeLeadFactor;
      } else if (hero) {
        target.x = hero.x;
        target.y = hero.y;
      }

      // Start DASH
      const moveKey = enemy.animationKeys?.move ?? enemy.animationKeys?.idle ?? 'werewolf:walk';
      if (moveKey && enemy.anims?.animationManager?.exists?.(moveKey)) {
        enemy.play(moveKey, true);
      }

      // Plan dash duration based on distance so it can actually cross the arena.
      // This is the key fix for "short lunge then patrol" at long distances.
      const dist = this._distTo(target.x, target.y);
      const travelMs = Math.max(0, dist - this.chargeStopDist) / this.chargeSpeed * 1000;
      const overshootMs = 120; // commitment / punch-through
      this._chargePlannedDurationMs = this._clampMs(
        travelMs + overshootMs,
        this.chargeMinDurationMs,
        this.chargeMaxDurationMs
      );

      // Cache a fixed direction for the dash (no tracking/homing).
      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      const len = Math.hypot(dx, dy) || 1;
      this._chargeDir = { x: dx / len, y: dy / len };

      this._chargePhase = 'dash';
      this._chargeDashStartedAtMs = this.stateElapsedMs;

      // Set initial velocity.
      this._setVelToward(target.x, target.y, this.chargeSpeed);
      return;
    }

    // DASH
    if (this._chargePhase === 'dash') {
      const dashElapsed = this.stateElapsedMs - (this._chargeDashStartedAtMs ?? 0);

      // Reassert dash velocity so friction/collisions don't turn the charge into a weak slide.
      // Still not tracking: direction is fixed from dash start.
      if (enemy?.body && this._chargeDir) {
        enemy.body.setMaxSpeed?.(this.chargeSpeed);
        enemy.body.setMaxVelocity?.(this.chargeSpeed, this.chargeSpeed);
        enemy.body.setVelocity?.(this._chargeDir.x * this.chargeSpeed, this._chargeDir.y * this.chargeSpeed);
      }

      // One-time HIT check (optional)
      if (!this._chargeDidHit && hero && this.chargeHitDamage > 0 && this.chargeHitRadius > 0) {
        const dHero = this._distTo(hero.x, hero.y);
        if (dHero <= this.chargeHitRadius) {
          this._chargeDidHit = true;

          const tookDamage = this.scene?.hero?.health?.damage?.(this.chargeHitDamage);
          if (tookDamage) {
            this.scene?.cameras?.main?.shake?.(150, 0.004);
          }

          // Impact -> recover
          this._stopMovement();
          const impactKey = enemy.animationKeys?.attack ?? 'werewolf:attack';
          if (impactKey && enemy.anims?.animationManager?.exists?.(impactKey)) {
            enemy.play(impactKey, true);
          }
          this._chargePhase = 'recover';
          this._chargeRecoverStartedAtMs = this.stateElapsedMs;
          return;
        }
      }

      // End dash conditions
      const planned = this._chargePlannedDurationMs || this.chargeDurationMs;
      if (dashElapsed >= planned) {
        this._stopMovement();
        this._chargePhase = 'recover';
        this._chargeRecoverStartedAtMs = this.stateElapsedMs;
        return;
      }

      if (this._distTo(target.x, target.y) <= this.chargeStopDist) {
        this._stopMovement();
        this._chargePhase = 'recover';
        this._chargeRecoverStartedAtMs = this.stateElapsedMs;
        return;
      }

      // Keep facing correct while dashing (helps feel responsive)
      this._faceToward((this._chargeDir?.x ?? 0) >= 0 ? 1 : -1);

      return;
    }

    // RECOVER
    if (this._chargePhase === 'recover') {
      const recoverElapsed = this.stateElapsedMs - (this._chargeRecoverStartedAtMs ?? this.stateElapsedMs);
      if (recoverElapsed >= this.chargeRecoveryMs) {
        this.enter('patrol');
      }
    }
  }

  /**
   * Clean up charge-specific flags as the boss leaves the charge state.
   */
  _exitCharge() {
    this._stopMovement();
    this._chargePhase = null;
    this._chargeTarget = null;
    this._chargeDir = null;
    this._chargePlannedDurationMs = 0;
  }

  // ------------------------
  // PATROL
  // ------------------------

  /**
   * Initialize patrol timers and target points for roaming behavior.
   */
  _enterPatrol() {
    this._patrolTarget = this._pickPointInView(this.patrolMargin);
  }

  /**
   * Move between patrol points until it's time to switch states.
   */
  _updatePatrol() {
    if (this.stateElapsedMs >= this.patrolDurationMs) {
      this.enter('barrage');
      return;
    }

    const target = this._patrolTarget ?? this._pickPointInView(this.patrolMargin);
    this._patrolTarget = target;
    this._setVelToward(target.x, target.y, this.patrolSpeed);

    if (this._distTo(target.x, target.y) <= this.arriveDist) {
      this._patrolTarget = this._pickPointInView(this.patrolMargin);
    }
  }

  // ------------------------
  // BARRAGE
  // ------------------------

  /**
   * Prepare the ranged barrage attack and reset timers.
   */
  _enterBarrage() {
    this._shotsRemaining = 20;
    this._nextShotAtMs = 0;
    this._stopMovement();

    const enemy = this.enemy;
    const mobConfig = enemy?.mobKey ? resolveMobConfig(enemy.mobKey) : null;
    const params = mobConfig?.aiParams ?? null;
    const weaponKey = params?.projectileWeaponKey ?? null;
    const projectileOverrides = params?.projectileOverrides ?? null;
    const weaponConfig = weaponKey
      ? getEnemyProjectileConfigFromWeaponKey(weaponKey, projectileOverrides)
      : null;

    if (!this._rangedWeapon && weaponKey && weaponConfig) {
      this._rangedWeapon = new EnemyProjectileWeaponController(this.scene, enemy, {
        weaponKey,
        overrides: projectileOverrides,
        aimMode: 'atTarget',
        enemyProjectiles: this.scene?.enemyProjectiles,
        salvo: 1,
        spreadDeg: 0,
      });
    }

    this._useLegacyBarrage = !(weaponKey && weaponConfig);
    const attackKey = enemy?.animationKeys?.attack ?? 'werewolf:attack';
    if (attackKey && enemy?.anims?.animationManager?.exists?.(attackKey)) {
      enemy.play(attackKey, true);
    }
  }

  /**
   * Fire the barrage sequence and decide when to return to another state.
   */
  _updateBarrage() {
    const enemy = this.enemy;
    if (!enemy) return;

    const hero = this._hero();
    while (this._shotsRemaining > 0 && this.stateElapsedMs >= this._nextShotAtMs) {
      if (hero && this.scene?.enemyProjectiles?.fire) {
        const dx = hero.x - enemy.x;
        const dy = hero.y - enemy.y;
        this._faceToward(dx);

        if (!this._useLegacyBarrage && this._rangedWeapon) {
          this._rangedWeapon.forceFireAt(hero, this.scene?.time?.now ?? 0);
        } else {
          const angle = Math.atan2(dy, dx);
          this.scene.enemyProjectiles.fire({
            x: enemy.x,
            y: enemy.y,
            angle,
            speed: this.barrageSpeed,
            lifetimeMs: this.barrageLifetimeMs,
            damage: this.barrageDamage,
            rotateToVelocity: true,
          });
        }
      }

      this._shotsRemaining -= 1;
      this._nextShotAtMs += this.shotIntervalMs;
    }

    if (this._shotsRemaining <= 0) {
      this.enter('charge');
    }
  }
}
