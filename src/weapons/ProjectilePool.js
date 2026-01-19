import Phaser from 'phaser';

/**
 * Single projectile entity managed by a ProjectilePool.
 * - Extends Arcade Sprite so it can move/collide via Arcade Physics.
 * - Designed to be RECYCLED (acquire → use → release) rather than created/destroyed per shot.
 */
class Projectile extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {string} textureKey - Initial texture; can be overridden by pool on acquire().
   */
  constructor(scene, textureKey) {
    // Start disabled/off-screen; the pool will position/activate on fire().
    super(scene, 0, 0, textureKey);

    // Register with the scene & physics system.
    scene.add.existing(this);
    scene.physics.add.existing(this);

    /**
     * Internal per-flight state for this projectile.
     * Keep everything in one object so we can reset/clear it easily on release().
     * NOTE: Values are (re)initialized in fire() for each launch.
     */
    this._weaponData = {
      controller: null,      // Weapon controller that spawned/owns this projectile.
      releaseTimer: null,    // Phaser time event that will auto-release at end of lifetime.
      pierceRemaining: 0,    // Remaining pierces after first impact (decremented per additional enemy).
      explosionCfg: null,    // Optional AoE to apply on expire/impact: { radius, damageMult? }.
      hitSet: null,          // Set of enemies already hit this flight (avoid double-hits).
      reservation: null,     // Targeting reservation (for overkill prevention) from coordinator.
      flight: null,          // Optional per-tick updater for special trajectories (e.g., circular orbits).
      rotateToVelocity: false,
      maxDistance: 0,
      spawnX: 0,
      spawnY: 0
    };
  }

  /**
   * Standard Phaser lifecycle tick for Sprites with runChildUpdate=true.
   * We pass delta to any custom flight behavior (e.g., circular/orbit logic).
   */
  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    // Scripted trajectories (e.g., circular/orbit)
    this._weaponData?.flight?.update?.(this, delta);

    // Optional: rotate sprite to current velocity
    if (this._weaponData.rotateToVelocity) {
      const vx = this.body?.velocity?.x ?? 0;
      const vy = this.body?.velocity?.y ?? 0;
      if (vx || vy) this.rotation = Math.atan2(vy, vx);
    }

    // Optional: auto-release after traveling max distance
    const maxD = this._weaponData.maxDistance | 0;
    if (maxD > 0) {
      const dx = this.x - this._weaponData.spawnX;
      const dy = this.y - this._weaponData.spawnY;
      if ((dx * dx + dy * dy) >= maxD * maxD) {
        this._weaponData.controller?.projectilePool?.release(this);
      }
    }
  }

  /**
   * Initialize and launch the projectile with the provided parameters.
   * The pool/controller calls this each time the projectile is (re)used.
   *
   * @param {Object} params
   * @param {number} params.x            - Spawn X position (world space).
   * @param {number} params.y            - Spawn Y position (world space).
   * @param {number} params.angle        - Firing angle in radians (0 = right; Math.PI = left).
   * @param {number} params.speed        - Pixels/second velocity (Arcade Physics).
   * @param {number} params.lifetimeMs   - Time before auto-release back to pool.
   * @param {Object} params.controller   - Weapon controller that manages impacts/logic.
   * @param {number} [params.pierce=0]   - How many extra enemies we can pass through.
   * @param {Object} [params.explosion]  - Optional AoE config applied on expire/impact.
   * @param {string} [params.animKey]    - Optional animation key to play while in-flight.
   */
  fire({
    x,
    y,
    angle,
    speed,
    lifetimeMs,
    controller,
    pierce = 0,
    explosion = null,
    animKey,
    gravity = 0,
    acceleration = 0,
    rotateToVelocity = false,
    maxDistance = 0
  }) {
    this.setActive(true);
    this.setVisible(true);
    this.body.setEnable(true);
    this.body.setAllowGravity(false);
    this.setPosition(x, y);

    // Reset scripted flight
    this._weaponData.flight = null;

    // Per-flight metadata
    this._weaponData.controller = controller;
    this._weaponData.pierceRemaining = Math.max(0, pierce | 0);
    this._weaponData.explosionCfg = explosion || null;
    this._weaponData.hitSet = new Set();
    this._weaponData.reservation = null;
    this._weaponData.rotateToVelocity = !!rotateToVelocity;
    this._weaponData.maxDistance = Math.max(0, maxDistance | 0);
    this._weaponData.spawnX = x;
    this._weaponData.spawnY = y;

    // Velocity/angle
    const hasAngle = Number.isFinite(angle);
    if (hasAngle && speed > 0) {
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.body.setVelocity(vx, vy);

      // Only orient sprite visually to velocity when requested
      if (rotateToVelocity) {
        this.rotation = angle;
      } else {
        // For "top-down" / orientation-agnostic assets like Ragnarok,
        // keep a fixed visual rotation (0 rad by default).
        this.rotation = 0;
      }
    } else {
      this.body.setVelocity(0, 0);

      // If we're not moving but we *do* care about facing, only apply when flagged.
      if (hasAngle && rotateToVelocity) {
        this.rotation = angle;
      } else {
        this.rotation = 0;
      }
    }

    // Acceleration along angle (if provided)
    if (acceleration && hasAngle) {
      const ax = Math.cos(angle) * acceleration;
      const ay = Math.sin(angle) * acceleration;
      this.body.setAcceleration(ax, ay);
    } else {
      this.body.setAcceleration(0, 0);
    }

    // Gravity (Arcade per-body)
    if (Number.isFinite(gravity) && gravity !== 0) {
      this.body.setAllowGravity(true);
      this.body.setGravityY(gravity);
    } else {
      this.body.setAllowGravity(false);
      this.body.setGravity(0, 0);
    }

    if (animKey) this.anims.play(animKey, true);

    if (this._weaponData.releaseTimer) this._weaponData.releaseTimer.remove(false);
    this._weaponData.releaseTimer = this.scene.time.delayedCall(lifetimeMs, () => {
      controller?.projectilePool?.release(this);
    });
  }

  /** Handle fireCircular so this system stays coordinated. */
  fireCircular({
    origin,
    radius = 140,
    angularVelocity = 1,
    clockwise = false,
    startAngle = 0,
    controller,
    damage,
    pierce = 0,
    explosion = null,
    animKey = null,
    lifetimeMs
  }) {
    const effective = controller?.effectiveConfig;
    const life = lifetimeMs ?? (effective?.projectile?.lifetimeMs ?? 800);

    const x0 = origin.x + radius * Math.cos(startAngle);
    const y0 = origin.y + radius * Math.sin(startAngle);

    this.fire({
      x: x0,
      y: y0,
      angle: 0,
      speed: 0,
      lifetimeMs: life,
      controller,
      pierce,
      explosion,
      animKey,
      gravity: 0,
      acceleration: 0,
      rotateToVelocity: false,
      maxDistance: 0
    });

    this.body?.setVelocity(0, 0);

    const sign = clockwise ? -1 : 1;
    const w = angularVelocity <= 6 ? angularVelocity * Math.PI * 2 : angularVelocity;
    let theta = startAngle;

    this._weaponData.flight = {
      update: (p, dt) => {
        theta += sign * w * (dt / 1000);
        const center = controller?.owner?.getPos?.() ?? origin;
        p.setPosition(center.x + radius * Math.cos(theta), center.y + radius * Math.sin(theta));
      },
      onRelease: () => {}
    };

    return this;
  }

  /**
   * Return this projectile to the pool:
   * - stop physics/animation
   * - clear timers/reservations
   * - reset/clear per-flight state
   * The pool will call group.killAndHide(this) after this method.
   */
  release() {
    // Stop movement & disable collisions/visibility.
    this.body.stop();
    this.body.setEnable(false);
    this.setActive(false);
    this.setVisible(false);
    this.anims?.stop?.();

    // Clear any visual state that might have been applied during flight
    this.clearTint();
    this.setAlpha(1);
    // (blendMode will be re-applied in acquire(); leaving it untouched here is fine,
    // but if you want belt-and-suspenders you could also setBlendMode(Phaser.BlendModes.NORMAL))

    if (this._weaponData.releaseTimer) {
      this._weaponData.releaseTimer.remove(false);
      this._weaponData.releaseTimer = null;
    }

    // If we held a targeting reservation, consume/release it now so future targeting is accurate.
    if (this._weaponData.reservation) {
      this._weaponData.controller?.targetingCoordinator?.consumeReservation(this._weaponData.reservation);
      this._weaponData.reservation = null;
    }

    // Allow trajectory behavior to clean up any state.
    if (this._weaponData.flight) {
      this._weaponData.flight?.onRelease?.(this);
      this._weaponData.flight = null;
    }

    // Detach controller and clear per-flight data structures.
    this._weaponData.controller = null;
    this._weaponData.hitSet?.clear?.();
    this._weaponData.hitSet = null;
    this._weaponData.explosionCfg = null;
    this._weaponData.pierceRemaining = 0;
    this._weaponData.rotateToVelocity = false;
    this._weaponData.maxDistance = 0;
    this._weaponData.spawnX = 0;
    this._weaponData.spawnY = 0;
  }
}

/**
 * Simple object pool for Projectile instances.
 * - Reuses a fixed number of sprites to avoid GC thrash/allocations during heavy fire.
 * - Centralizes sprite/body setup and enemy overlap wiring.
 */
export class ProjectilePool {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} config
   * @param {string} config.texture         - Texture key for projectiles (e.g., 'bolt').
   * @param {number} [config.poolSize=20]   - Max pool capacity.
   * @param {Object} [config.body]          - Optional custom body size.
   * @param {number} [config.body.width]    - Hitbox width (defaults to frame width).
   * @param {number} [config.body.height]   - Hitbox height (defaults to frame height).
   * @param {Phaser.Physics.Arcade.Group} enemyGroup - Enemies to test overlaps against.
   * @param {Object} controller - Weapon controller that handles onProjectileImpact().
   */
  constructor(scene, config, enemyGroup, controller) {
    this.scene = scene;
    this.config = config;
    this.enemyGroup = enemyGroup;
    this.controller = controller;

    const maxSize = Math.max(1, config?.poolSize ?? 20);

    // Arcade Physics group manages active/inactive children.
    this.group = scene.physics.add.group({
      classType: Projectile,   // Phaser will instantiate this class when creating children.
      maxSize,                 // Hard cap on pooled instances.
      runChildUpdate: false,   // Projectiles don't need automatic preUpdate via the group.
      createCallback: (projectile) => {
        // One-time construction defaults for visuals & physics.
        projectile.setBlendMode(this.config?.blendMode ?? Phaser.BlendModes.NORMAL);
        projectile.clearTint();
        projectile.setAlpha(1);

        projectile.setDepth(6);
        projectile.body?.setAllowGravity(false);

        // Apply a custom hitbox if configured (e.g., thinner than the sprite for fairness).
        const width = config?.body?.width ?? projectile.width;
        const height = config?.body?.height ?? projectile.height;
        projectile.body?.setSize(width, height);

        // Center the hitbox inside the sprite frame to avoid offset collisions.
        const ox = (projectile.width  - width)  * 0.5;
        const oy = (projectile.height - height) * 0.5;
        projectile.body?.setOffset(ox, oy);
      }
    });

    // Set up collision/overlap between projectiles and enemies.
    // Delegate the actual damage/effects to the controller.
    this.overlap = scene.physics.add.overlap(
      this.group,
      enemyGroup,
      (projectile, enemy) => {
        projectile?._weaponData?.controller?.onProjectileImpact?.(projectile, enemy);
      }
    );
  }

  /**
   * Acquire an available projectile from the pool.
   * @returns {Projectile|null} - Returns a projectile or null if group cannot supply one.
   */
  acquire() {
    // Ask the group for a free child; Phaser will revive an inactive one if available.
    let projectile = this.group.get();

    // If none available (pool exhausted), we choose to return null (caller can skip fire).
    if (!projectile) return null;

    // Safety: ensure instance type is correct (in unusual custom group setups).
    if (!(projectile instanceof Projectile)) {
      projectile = new Projectile(this.scene, this.config?.texture ?? 'bolt');
      this.group.add(projectile);
    }

    // Ensure correct texture; body may need to be re-sized when reused.
    projectile.setTexture(this.config?.texture ?? 'bolt');

    // Reset any reused visual state so previous shots don't leak into this one
    projectile.setBlendMode(this.config?.blendMode ?? Phaser.BlendModes.NORMAL);
    projectile.clearTint();
    projectile.setAlpha(1);

    const width = this.config?.body?.width ?? projectile.width;
    const height = this.config?.body?.height ?? projectile.height;
    projectile.body?.setSize(width, height);

    // Center the hitbox on each reuse (sprite frame can differ across animations/atlases).
    const ox = (projectile.width  - width)  * 0.5;
    const oy = (projectile.height - height) * 0.5;
    projectile.body?.setOffset(ox, oy);

    return projectile;
  }

  /**
   * Return a projectile back to the pool for reuse.
   * - Calls projectile.release() to clear internal state.
   * - Then hides/disables via group.killAndHide().
   */
  release(projectile) {
    if (!projectile) return;
    projectile.release();
    this.group.killAndHide(projectile);
  }

  /**
   * Cleanup the pool and all managed resources.
   * - Removes the overlap collider.
   * - Destroys any existing projectile children.
   * - Destroys the group itself.
   */
  destroy() {
    this.overlap?.destroy?.();

    const group = this.group;
    if (group) {
      const children = group.children;
      if (children && typeof children.each === 'function') {
        // Destroy child sprites explicitly to free textures/timers.
        children.each((child) => child?.destroy?.());

        // Clear internal list if supported.
        if (typeof children.clear === 'function') {
          children.clear();
        }
      }
      group.destroy?.();
    }

    this.group = null;
  }
}
