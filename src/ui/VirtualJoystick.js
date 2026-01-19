import Phaser from 'phaser';

export class VirtualJoystick {
  /** Initialize VirtualJoystick state so runtime dependencies are ready. */
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.radius = opts.radius ?? 48;
    this.deadzone = opts.deadzone ?? 0.12;

    const x = opts.x ?? 100;
    const y = opts.y ?? (scene.scale.height - 60);

    this.container = scene.add.container(x, y)
      .setScrollFactor(0)
      .setDepth(opts.depth ?? 50);

    this.base = scene.add.circle(0, 0, this.radius, 0x000000, 0.25);
    this.thumb = scene.add.circle(0, 0, this.radius * 0.45, 0xffffff, 0.25);

    this.container.add([this.base, this.thumb]);

    this._pointerId = null;
    this._vec = { x: 0, y: 0 };

    this._onPointerDown = (pointer) => {
      if (this._pointerId !== null) return;

      const { localX, localY, dist } = this._getLocal(pointer);
      if (dist > this.radius * 1.15) return;

      this._pointerId = pointer.id;
      this._updateFromPointer(localX, localY);
    };

    this._onPointerMove = (pointer) => {
      if (pointer.id !== this._pointerId) return;
      const { localX, localY } = this._getLocal(pointer);
      this._updateFromPointer(localX, localY);
    };

    this._onPointerUp = (pointer) => {
      if (pointer.id !== this._pointerId) return;
      this._pointerId = null;
      this.thumb.setPosition(0, 0);
      this._vec = { x: 0, y: 0 };
    };

    scene.input.on('pointerdown', this._onPointerDown);
    scene.input.on('pointermove', this._onPointerMove);
    scene.input.on('pointerup', this._onPointerUp);
    scene.input.on('pointerupoutside', this._onPointerUp);
  }

  /** Handle _getLocal so this system stays coordinated. */
  _getLocal(pointer) {
    const localX = pointer.x - this.container.x;
    const localY = pointer.y - this.container.y;
    const dist = Math.hypot(localX, localY);
    return { localX, localY, dist };
  }

  /** Handle _updateFromPointer so this system stays coordinated. */
  _updateFromPointer(localX, localY) {
    const dist = Math.hypot(localX, localY);
    const clampedDist = Math.min(dist, this.radius);

    const nx = dist > 0 ? localX / dist : 0;
    const ny = dist > 0 ? localY / dist : 0;

    const strength = Phaser.Math.Clamp(dist / this.radius, 0, 1);
    if (strength < this.deadzone) {
      this._vec = { x: 0, y: 0 };
    } else {
      const scaled = (strength - this.deadzone) / (1 - this.deadzone);
      this._vec = { x: nx * scaled, y: ny * scaled };
    }

    this.thumb.setPosition(nx * clampedDist, ny * clampedDist);
  }

  /** Handle getVector so this system stays coordinated. */
  getVector() { return this._vec; }
  /** Handle setVisible so this system stays coordinated. */
  setVisible(v) { this.container.setVisible(v); }
  /** Handle setPosition so this system stays coordinated. */
  setPosition(x, y) { this.container.setPosition(x, y); }

  /** Handle destroy so this system stays coordinated. */
  destroy() {
    this.scene?.input.off('pointerdown', this._onPointerDown);
    this.scene?.input.off('pointermove', this._onPointerMove);
    this.scene?.input.off('pointerup', this._onPointerUp);
    this.scene?.input.off('pointerupoutside', this._onPointerUp);

    this.container?.destroy();
    this.base?.destroy();
    this.thumb?.destroy();

    this.scene = null;
    this.container = null;
    this.base = null;
    this.thumb = null;
  }
}
