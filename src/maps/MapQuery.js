import Phaser from 'phaser';

// Shared query helper for checking walkable world positions against bounded maps.
export class MapQuery {
  constructor(scene) {
    this.scene = scene;
  }

  isWalkableWorldXY(x, y) {
    const runtime = this.scene?.mapRuntime;
    // Bounded maps reject any point outside the configured world rectangle.
    if (runtime?.isBounded?.() && !runtime.isInsideBounds({ x, y })) {
      return false;
    }

    // Tile collision layers are only populated for bounded maps.
    const layers = this.scene?.mapCollisionLayers ?? [];
    for (const layer of layers) {
      if (!layer) continue;
      const tile = layer.getTileAtWorldXY?.(x, y, true);
      if (tile?.collides) return false;
    }

    // Object collider rectangles are derived from Tiled object layers.
    const objectGroup = this.scene?.mapObjectColliders;
    const children = objectGroup?.getChildren?.() ?? [];
    for (const obj of children) {
      const bounds = obj?.getBounds?.();
      if (bounds && Phaser.Geom.Rectangle.Contains(bounds, x, y)) {
        return false;
      }
    }

    return true;
  }
}
