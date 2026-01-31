import Phaser from 'phaser';

export class MapRuntime {
  constructor(mapConfig = {}, { tilemap } = {}) {
    this.mapConfig = mapConfig ?? {};
    this.tilemap = tilemap ?? null;
    this.type = this.mapConfig.type ?? 'infinite';
    this.bounds = this._resolveBounds();
  }

  _resolveBounds() {
    if (this.type !== 'bounded') return null;
    const bounds = this.mapConfig.bounds;
    if (bounds && typeof bounds === 'object') {
      const x = bounds.x ?? 0;
      const y = bounds.y ?? 0;
      const width = bounds.width ?? 0;
      const height = bounds.height ?? 0;
      return new Phaser.Geom.Rectangle(x, y, width, height);
    }

    if (this.tilemap) {
      return new Phaser.Geom.Rectangle(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
    }

    return null;
  }

  getType() {
    return this.type;
  }

  getWorldBounds() {
    return this.bounds;
  }

  isBounded() {
    return this.type === 'bounded';
  }

  clampPoint(point) {
    if (!point) return point;
    if (!this.isBounded() || !this.bounds) return { x: point.x, y: point.y };
    return {
      x: Phaser.Math.Clamp(point.x, this.bounds.left, this.bounds.right),
      y: Phaser.Math.Clamp(point.y, this.bounds.top, this.bounds.bottom)
    };
  }

  isInsideBounds(point) {
    if (!point) return false;
    if (!this.isBounded() || !this.bounds) return true;
    return Phaser.Geom.Rectangle.Contains(this.bounds, point.x, point.y);
  }
}
