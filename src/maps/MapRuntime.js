import Phaser from 'phaser';

// Runtime helpers for bounded maps (world bounds, clamping, inside tests).
export class MapRuntime {
  constructor(mapConfig = {}, { tilemap } = {}) {
    this.mapConfig = mapConfig ?? {};
    this.tilemap = tilemap ?? null;
    this.type = this.mapConfig.type ?? 'infinite';
    // Cache world bounds for bounded maps (null for infinite maps).
    this.bounds = this._resolveBounds();
  }

  _resolveBounds() {
    // Only bounded maps expose a finite rectangle.
    if (this.type !== 'bounded') return null;
    const bounds = this.mapConfig.bounds;
    if (bounds && typeof bounds === 'object') {
      const x = bounds.x ?? 0;
      const y = bounds.y ?? 0;
      const width = bounds.width ?? 0;
      const height = bounds.height ?? 0;
      return new Phaser.Geom.Rectangle(x, y, width, height);
    }

    // Default to full tilemap size when no explicit bounds are configured.
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
    // Gate helper checks so other systems can opt into bounded-only logic.
    return this.type === 'bounded';
  }

  clampPoint(point) {
    if (!point) return point;
    // Clamp points only when bounded bounds are available.
    if (!this.isBounded() || !this.bounds) return { x: point.x, y: point.y };
    return {
      x: Phaser.Math.Clamp(point.x, this.bounds.left, this.bounds.right),
      y: Phaser.Math.Clamp(point.y, this.bounds.top, this.bounds.bottom)
    };
  }

  isInsideBounds(point) {
    if (!point) return false;
    // Unbounded maps always return true for inside checks.
    if (!this.isBounded() || !this.bounds) return true;
    return Phaser.Geom.Rectangle.Contains(this.bounds, point.x, point.y);
  }
}
