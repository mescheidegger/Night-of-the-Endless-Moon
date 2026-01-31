export class MapDebugOverlay {
  constructor(scene, { depth = 40, showCollisionTiles = true, showObjectColliders = true } = {}) {
    this.scene = scene;
    this.showCollisionTiles = showCollisionTiles;
    this.showObjectColliders = showObjectColliders;
    this.visible = false;

    this.graphics = scene.add.graphics().setDepth(depth);
    this.graphics.setVisible(false);
  }

  setVisible(isVisible) {
    this.visible = !!isVisible;
    this.graphics.setVisible(this.visible);
    if (this.visible) {
      this.refresh();
    } else {
      this.graphics.clear();
    }
  }

  toggle() {
    this.setVisible(!this.visible);
  }

  refresh() {
    this.graphics.clear();
    if (!this.visible) return;

    const runtime = this.scene?.mapRuntime;
    const bounds = runtime?.getWorldBounds?.();
    if (bounds) {
      this.graphics.lineStyle(2, 0x44ff77, 1);
      this.graphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    if (this.showObjectColliders) {
      const objectGroup = this.scene?.mapObjectColliders;
      const children = objectGroup?.getChildren?.() ?? [];
      this.graphics.lineStyle(1, 0xff5555, 0.9);
      children.forEach((obj) => {
        const rect = obj?.getBounds?.();
        if (!rect) return;
        this.graphics.strokeRect(rect.x, rect.y, rect.width, rect.height);
      });
    }

    if (this.showCollisionTiles) {
      const layers = this.scene?.mapCollisionLayers ?? [];
      this.graphics.lineStyle(1, 0xffd24d, 0.6);
      layers.forEach((layer) => {
        const data = layer?.layer?.data;
        if (!data) return;
        data.forEach((row) => {
          row.forEach((tile) => {
            if (!tile?.collides) return;
            const rect = tile.getBounds?.();
            if (!rect) return;
            this.graphics.strokeRect(rect.x, rect.y, rect.width, rect.height);
          });
        });
      });
    }
  }

  destroy() {
    this.graphics?.destroy();
    this.graphics = null;
    this.scene = null;
  }
}
