import Phaser from 'phaser';

export class MapQuery {
  constructor(scene) {
    this.scene = scene;
  }

  isWalkableWorldXY(x, y) {
    const runtime = this.scene?.mapRuntime;
    if (runtime?.isBounded?.() && !runtime.isInsideBounds({ x, y })) {
      return false;
    }

    const layers = this.scene?.mapCollisionLayers ?? [];
    for (const layer of layers) {
      if (!layer) continue;
      const tile = layer.getTileAtWorldXY?.(x, y, true);
      if (tile?.collides) return false;
    }

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
