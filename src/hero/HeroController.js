import Phaser from 'phaser';

/**
 * HeroController
 * ---------------
 * Owns input → velocity, facing resolution, animation switching, and cosmetic syncing
 * for a single hero sprite. Designed for top-down games using Arcade Physics.
 *
 * Key design choices:
 * - Normalize input before applying speed (diagonals are not faster).
 * - Prefer INPUT to determine facing (noise-free), fall back to velocity when sliding.
 * - Dead-zone tiny velocity components to prevent jitter (e.g., vx=±0.5 toggling).
 * - Tie animation playback speed to actual velocity (gait matches travel speed).
 * - Avoid Arcade damping for crisp top-down controls; use linear drag (often 0).
 */
export class HeroController {
  /**
   * @param {Phaser.Scene} scene
   * @param {{
   *   heroKey: string,
   *   sprite: Phaser.Physics.Arcade.Sprite,
   *   glow?: Phaser.GameObjects.Image,
   *   health?: any,                     // any system exposing isDead()
   *   stats?: {
   *     speed?: number,                 // target move speed in px/s
   *     maxVelocity?: number,           // clamp for Arcade velocity
   *     drag?: number,                  // 0..1 (interpreted) or px/s² (linear)
   *     damping?: boolean,              // ignored (we force no damping for crispness)
   *     iframeMs?: number,              // used elsewhere by HealthSystem
   *     maxHealth?: number
   *   },
   *   defaultFacing?: 'up'|'down'|'left'|'right'|'leftup'|'leftdown'|'rightup'|'rightdown',
   *   onFacingChange?: (dir:string)=>void,
   *   animationPrefix?: string,         // namespace for anim keys (defaults to heroKey)
   *   singleDirection?: boolean         // true if hero uses a single facing row
   * }} config
   */
  constructor(scene, {
    heroKey,
    sprite,
    glow,
    health,
    stats = {},
    defaultFacing = 'down',
    onFacingChange,
    animationPrefix,
    singleDirection = false
  }) {
    this.scene = scene;
    this.heroKey = heroKey;
    this.sprite = sprite;
    this.glow = glow;
    this.health = health;
    this.stats = stats;
    this.animationPrefix = animationPrefix ?? heroKey;
    this.singleDirection = singleDirection;

    this.defaultFacing = defaultFacing;
    this.facing = defaultFacing;        // cached last facing to stabilize idle animations
    this.onFacingChange = onFacingChange;

    this.enabled = true;
    this.inputSources = { cursors: null, wasd: null };
    this.deathController = null;
    this._moveVectorProvider = null;

    this._bodyInit = false;             // lazily configure Arcade body once
    this._onShutdown = () => this.destroy();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this._onShutdown);
  }

  /**
   * Connect Phaser input sources. Call once in your Scene after creating cursors/WASD.
   * @param {{cursors?: Phaser.Types.Input.Keyboard.CursorKeys, wasd?: Record<string, Phaser.Input.Keyboard.Key>}} param0
   */
  setInputSources({ cursors = null, wasd = null } = {}) {
    this.inputSources.cursors = cursors;
    this.inputSources.wasd = wasd;
    return this;
  }

  /** Provide an external analog/vector input source (e.g., virtual joystick). */
  setMoveVectorProvider(fn) {
    this._moveVectorProvider = (typeof fn === 'function') ? fn : null;
  }

  /** Disable or enable player control (e.g., during menus/cutscenes). */
  disableInput() { this.enabled = false; }
  enableInput()  { this.enabled = true;  }

  /** Attach an external controller that manages death sequences / blocking states. */
  attachDeathController(controller) { this.deathController = controller; }

  /**
   * Initialize physics body properties from stats once.
   * We intentionally avoid damping (exponential decay) because it causes sticky micro-motion
   * at low speeds; linear drag is easier to reason about and usually 0 for top-down.
   */
  _initBodyFromStats() {
    const body = this.sprite?.body;
    if (!body || this._bodyInit) return;

    // Top-down: no gravity, no damping for crisp controls.
    body.setAllowGravity(false);
    body.setDamping(false);

    // If stats.drag provided:
    // - If 0..1, interpret as a fraction and convert to a reasonable px/s² scale.
    // - If >1, assume caller passed px/s² directly.
    const linearDrag = (typeof this.stats.drag === 'number')
      ? ((this.stats.drag <= 1) ? this.stats.drag * 600 : this.stats.drag)
      : 0;
    body.setDrag(linearDrag, linearDrag);

    // Max velocity: if none provided, allow some headroom above speed to avoid hard clipping.
    const mv = (typeof this.stats.maxVelocity === 'number')
      ? this.stats.maxVelocity
      : Math.ceil((this.stats.speed || 120) * 1.5);
    body.setMaxVelocity(mv, mv);

    this._bodyInit = true;
  }

  /**
   * Per-frame update.
   * @param {number} dt - delta time in ms (reserved for future use; Arcade already time-steps)
   */
  update(dt) {
    if (!this.sprite?.body) return;

    this._initBodyFromStats();

    const deathSequenceActive = this.deathController?.isActive?.() ?? false;
    const dead = this.health?.isDead?.() ?? false;
    const sceneDisabled = this.scene?.playerInputDisabled ?? false;

    // If control is disabled (dead/menu/etc.), stop the hero and keep cosmetics in sync.
    if (!this.enabled || sceneDisabled || dead) {
      if (!deathSequenceActive) {
        this.sprite.setVelocity(0, 0);
        this.sprite.anims.timeScale = 1; // normalize anim tempo while frozen
      }
      this._syncGlow();
      return;
    }

    // --- INPUT SAMPLING ------------------------------------------------------
    // Base speed from hero registry stats
    const baseSpeed = this.stats.speed ?? 0;

    // Passive overlay from scene.passiveManager
    const passiveManager = this.scene?.passiveManager;
    const moveSpeedMult = passiveManager?.getMoveSpeedMultiplier?.() ?? 1;

    // Final effective speed
    const speed = baseSpeed * moveSpeedMult;

    const { cursors, wasd } = this.inputSources;
    const joystickVec = this._moveVectorProvider ? this._moveVectorProvider() : null;
    const jx = joystickVec?.x ?? 0;
    const jy = joystickVec?.y ?? 0;
    const joystickActive = Math.hypot(jx, jy) > 0.01;

    let xAxis = 0;
    let yAxis = 0;

    if (joystickActive) {
      xAxis = Phaser.Math.Clamp(jx, -1, 1);
      yAxis = Phaser.Math.Clamp(jy, -1, 1);
    } else {
      // Convert keys to a simple axis representation: -1, 0, +1 per axis.
      const left  = (cursors?.left?.isDown  || wasd?.A?.isDown) ? 1 : 0;
      const right = (cursors?.right?.isDown || wasd?.D?.isDown) ? 1 : 0;
      const up    = (cursors?.up?.isDown    || wasd?.W?.isDown) ? 1 : 0;
      const down  = (cursors?.down?.isDown  || wasd?.S?.isDown) ? 1 : 0;

      xAxis = -left + right; // left=−1, right=+1, neutral=0
      yAxis = -up + down;    // up=−1,  down=+1, neutral=0
    }

    const axisMagnitude = Phaser.Math.Clamp(Math.hypot(xAxis, yAxis), 0, 1);
    const dirXAxis = (Math.abs(xAxis) > 0.01) ? Math.sign(xAxis) : 0;
    const dirYAxis = (Math.abs(yAxis) > 0.01) ? Math.sign(yAxis) : 0;

    // --- VELOCITY CONTROL ----------------------------------------------------
    // Normalize input so diagonals don't move faster (length=1).
    // This also makes acceleration consistent across axes.
    if (!deathSequenceActive) {
      if (axisMagnitude > 0) {
        const v = new Phaser.Math.Vector2(xAxis, yAxis)
          .normalize()
          .scale(speed * axisMagnitude);
        this.sprite.setVelocity(v.x, v.y);
      } else {
        this.sprite.setVelocity(0, 0);
      }
    }

    // --- MOTION STATE --------------------------------------------------------
    const body = this.sprite.body;
    const speedNow = body.velocity.length();   // current magnitude (px/s)
    const moving = speedNow > 4;               // epsilon avoids idle/walk thrash at near-zero

    // --- FACING SELECTION ----------------------------------------------------
    // Prefer INPUT to get a stable facing (no tiny ±vy jitter).
    // Fall back to velocity when sliding (no input).
    let dir;
    if (dirXAxis !== 0 || dirYAxis !== 0) {
      dir = this._resolveDirectionFromAxes(dirXAxis, dirYAxis);     // clean, discrete
      this._setFacing(dir);
    } else if (moving) {
      dir = this._resolveDirection(body.velocity.x, body.velocity.y); // includes dead-zone
      this._setFacing(dir);
    } else {
      dir = this.facing || this.defaultFacing; // stable idle direction
    }

    if (this.singleDirection) {
      this._applyFacingVisuals(dir);
    }

    // --- ANIMATION SWITCHING -------------------------------------------------
    // Tie playback tempo to how fast the hero is actually moving so the gait matches
    // the distance traveled. The range below (0.65..1.25x) is a good starting point.
    if (!deathSequenceActive) {
      const norm = Phaser.Math.Clamp(
        speedNow / Math.max(this.stats.speed || 1, 1),  // normalized 0..1
        0, 1
      );
      this.sprite.anims.timeScale = 0.65 + 0.60 * norm;

      // Choose best animation key for state/direction, with graceful fallbacks.
      const animKey = this._pickAnimKey(moving, dir, dirXAxis, dirYAxis);
      if (animKey && this.sprite.anims.currentAnim?.key !== animKey) {
        this.sprite.play(animKey, true);
      }
    }

    // --- COSMETICS -----------------------------------------------------------
    this._syncGlow();
  }

  /**
   * Resolve direction from PHYSICS velocity.
   * Introduces a small dead-zone so minuscule ±0.5 px/s noise doesn't flip between
   * leftup/leftdown (a common source of horizontal "chop").
   */
  _resolveDirection(vx, vy) {
    const DZ = 2; // px/s; tune 1..6 depending on your drag/step
    const ax = Math.abs(vx) < DZ ? 0 : vx;
    const ay = Math.abs(vy) < DZ ? 0 : vy;

    // If effectively on one axis, prefer pure cardinals.
    if (ay === 0 && ax !== 0) return ax > 0 ? 'right' : 'left';
    if (ax === 0 && ay !== 0) return ay > 0 ? 'down' : 'up';

    // Otherwise, choose among diagonals.
    if (ax >= 0 && ay < 0)  return 'rightup';
    if (ax >= 0 && ay >= 0) return 'rightdown';
    if (ax < 0 && ay < 0)   return 'leftup';
    return 'leftdown';
  }

  /**
   * Resolve direction from INPUT axes (discrete −1/0/+1),
   * so it is inherently stable and noise-free.
   */
  _resolveDirectionFromAxes(xAxis, yAxis) {
    if (yAxis === 0 && xAxis !== 0) return xAxis > 0 ? 'right' : 'left';
    if (xAxis === 0 && yAxis !== 0) return yAxis > 0 ? 'down' : 'up';
    if (xAxis >= 0 && yAxis < 0)  return 'rightup';
    if (xAxis >= 0 && yAxis >= 0) return 'rightdown';
    if (xAxis < 0 && yAxis < 0)   return 'leftup';
    return 'leftdown';
  }

  /**
   * Choose an animation key given current state/direction.
   * Strategy:
   *  - If moving purely horizontally/vertically, prefer cardinal rows.
   *  - If those rows don't exist, gracefully fall back to diagonal rows.
   *  - In idle, prefer last facing; fall back to 'down' if missing.
  */
  _pickAnimKey(moving, dir, xAxis, yAxis) {
    const prefix = this.animationPrefix;
    if (this.singleDirection) {
      const state = moving ? 'walk' : 'idle';
      const primary = `${prefix}:${state}-right`;
      if (this.scene?.anims.exists(primary)) {
        return primary;
      }
      // Graceful fallback: prefer facing-specific keys if the registrar generated them.
      const facingKey = `${prefix}:${state}-${this.facing}`;
      if (this.scene?.anims.exists(facingKey)) {
        return facingKey;
      }
      return null;
    }
    const state = moving ? 'walk' : 'idle';

    const pureH = (xAxis !== 0 && yAxis === 0);
    const pureV = (yAxis !== 0 && xAxis === 0);

    const tryKeys = [];

    if (moving) {
      if (pureH) {
        // True left/right first; fall back to diagonals if sheet lacks cardinals.
        const lr = xAxis > 0 ? 'right' : 'left';
        tryKeys.push(`${prefix}:walk-${lr}`);
        tryKeys.push(`${prefix}:walk-${lr}down`);
        tryKeys.push(`${prefix}:walk-${lr}up`);
      } else if (pureV) {
        const ud = yAxis > 0 ? 'down' : 'up';
        tryKeys.push(`${prefix}:walk-${ud}`);
      } else {
        tryKeys.push(`${prefix}:walk-${dir}`);
      }
    } else {
      // Idle prefers the cached facing; if missing, gracefully degrade to 'down'.
      tryKeys.push(`${prefix}:idle-${this.facing}`);
      tryKeys.push(`${prefix}:idle-down`);
    }

    // Return the first key that actually exists in the animation manager.
    for (const key of tryKeys) {
      if (this.scene?.anims.exists(key)) return key;
    }

    // Last resort: attempt state-down; otherwise return null (no play).
    const fallback = `${prefix}:${state}-down`;
    return this.scene?.anims.exists(fallback) ? fallback : null;
  }

  /** Apply flip state based on direction for single-direction heroes. */
  _applyFacingVisuals(dir) {
    if (!this.sprite) return;
    const facing = dir || this.facing || this.defaultFacing;
    const flip = facing === 'left' || facing === 'leftup' || facing === 'leftdown';
    this.sprite.setFlipX(!!flip);
  }

  /** Update cached facing and notify listeners once per change. */
  _setFacing(dir) {
    if (this.facing === dir) return;
    this.facing = dir;
    this.onFacingChange?.(dir);
  }

  /** Keep additive glow sprite visually glued to hero sprite. */
  _syncGlow() {
    if (!this.glow) return;
    this.glow.x = this.sprite.x;
    this.glow.y = this.sprite.y;
  }

  /** Tear down references and listeners. */
  destroy() {
    this.scene?.events.off(Phaser.Scenes.Events.SHUTDOWN, this._onShutdown);
    this.scene = null;
    this.sprite = null;
    this.glow = null;
    this.health = null;
    this.inputSources = null;
    this.deathController = null;
  }
}
