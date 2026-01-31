/**
 * GroundLayer renders the infinite scrolling ground texture that sits beneath
 * gameplay. The logic was extracted out of GameScene so camera resize and zoom
 * handling are kept in one place.
 */
export class GroundLayer {
  constructor(scene, config = {}) {
    this.scene = scene;
    this.mode = config.mode ?? 'infinite';
    const cam = scene.cameras.main;
    const textureKey = config.textureKey ?? 'ground';

    if (this.mode === 'disabled' || this.mode === 'tilemap') {
      this.sprite = null;
      return;
    }

    if (this.mode === 'static') {
      this.sprite = scene.add
        .image(cam.width / 2, cam.height / 2, textureKey)
        .setOrigin(0.5)
        .setDepth(0)
        .setScrollFactor(0);
      this._onResize = (size) => {
        if (!size || !this.sprite) return;
        const { width, height } = size;
        this.sprite.setPosition(width / 2, height / 2);
      };
      scene.scale.on('resize', this._onResize);
      return;
    }

    // Create a screen-space tile sprite that ignores scroll but honours zoom.
    this.sprite = scene.add
      .tileSprite(cam.width / 2, cam.height / 2, cam.width, cam.height, textureKey)
      .setOrigin(0.5)
      .setDepth(0)
      .setScrollFactor(0);

    // Resize handler keeps the ground perfectly covering the viewport even when
    // the browser window changes.
    this._onResize = (size) => {
      if (!size || !this.sprite) return;
      const { width, height } = size;
      this.sprite.setSize(width, height);
      this.sprite.setPosition(width / 2, height / 2);

      const zoom = this.scene.cameras.main.zoom;
      this.sprite.tileScaleX = zoom;
      this.sprite.tileScaleY = zoom;
    };

    scene.scale.on('resize', this._onResize);

    // Initialise the texture scale so it matches the current camera zoom on
    // first render.
    this.sprite.tileScaleX = cam.zoom;
    this.sprite.tileScaleY = cam.zoom;
  }

  /**
   * Update the tile sprite UV to match camera scroll and zoom.
   */
  update() {
    if (!this.sprite || this.mode !== 'infinite') return;
    const cam = this.scene.cameras.main;
    const zoom = cam.zoom;

    // Multiplying by zoom keeps the texel movement consistent when the camera
    // scale changes (e.g., dev hotkeys or future zoom effects).
    this.sprite.tilePositionX = Math.floor(cam.scrollX * zoom);
    this.sprite.tilePositionY = Math.floor(cam.scrollY * zoom);
    this.sprite.tileScaleX = zoom;
    this.sprite.tileScaleY = zoom;
  }

  /**
   * Remove listeners and destroy the sprite. Called from GameScene shutdown.
   */
  destroy() {
    if (this._onResize) {
      this.scene.scale.off('resize', this._onResize);
    }
    this.sprite?.destroy();
    this.sprite = null;
    this.scene = null;
  }
}
