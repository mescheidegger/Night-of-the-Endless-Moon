export class PauseButton {
  /** Initialize PauseButton state so runtime dependencies are ready. */
  constructor(scene, { size = 44, depth = 70, onPause } = {}) {
    this.scene = scene;
    this.size = size;
    this.onPause = onPause;

    const hitSize = Math.max(size, 56);
    const radius = size * 0.5;

    this.container = scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(depth)
      .setSize(hitSize, hitSize)
      .setInteractive({ useHandCursor: true });

    const bg = scene.add.circle(0, 0, radius, 0x000000, 0.3);
    const ring = scene.add.circle(0, 0, radius, 0xffffff, 0.18).setStrokeStyle(2, 0xffffff, 0.65);

    const barWidth = size * 0.18;
    const barHeight = size * 0.52;
    const gap = size * 0.12;
    const leftBar = scene.add.rectangle(-gap, 0, barWidth, barHeight, 0xffffff, 0.92);
    const rightBar = scene.add.rectangle(gap, 0, barWidth, barHeight, 0xffffff, 0.92);

    this.container.add([bg, ring, leftBar, rightBar]);

    this._pressed = false;

    this._onPointerDown = () => {
      this._pressed = true;
      this.container.setScale(0.94);
    };

    this._onPointerUp = () => {
      if (!this._pressed) return;
      this._pressed = false;
      this.container.setScale(1);
      if (typeof this.onPause === 'function') {
        this.onPause();
      }
    };

    this._onPointerCancel = () => {
      if (!this._pressed) return;
      this._pressed = false;
      this.container.setScale(1);
    };

    this.container.on('pointerdown', this._onPointerDown);
    this.container.on('pointerup', this._onPointerUp);
    this.container.on('pointerupoutside', this._onPointerCancel);
    this.container.on('pointerout', this._onPointerCancel);
  }

  /** Handle setPosition so this system stays coordinated. */
  setPosition(x, y) {
    this.container?.setPosition(x, y);
  }

  /** Handle setVisible so this system stays coordinated. */
  setVisible(visible) {
    this.container?.setVisible(visible);
  }

  /** Handle destroy so this system stays coordinated. */
  destroy() {
    if (this.container) {
      this.container.off('pointerdown', this._onPointerDown);
      this.container.off('pointerup', this._onPointerUp);
      this.container.off('pointerupoutside', this._onPointerCancel);
      this.container.off('pointerout', this._onPointerCancel);
    }

    this.container?.destroy();
    this.container = null;
    this.scene = null;
  }
}
