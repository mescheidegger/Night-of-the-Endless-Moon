// Handles loading/rendering of tiled maps and object colliders for bounded map layouts.
export class BoundedMapLoader {
  constructor(scene, mapConfig) {
    this.scene = scene;
    this.mapConfig = mapConfig ?? {};
  }

  build() {
    // Bounded maps rely on a tilemap JSON config that defines layers + tilesets.
    const tilemapConfig = this.mapConfig.tilemap ?? {};
    if (!tilemapConfig.jsonKey) {
      console.warn('[BoundedMapLoader] Missing tilemap config');
      return {
        map: null,
        layersByName: {},
        objectLayersByName: {},
        collisionLayers: [],
        objectColliderGroup: null,
      };
    }

    // Build the Phaser tilemap so the runtime can derive world bounds and colliders.
    const map = this.scene.make.tilemap({ key: tilemapConfig.jsonKey });
    const tilesets = (tilemapConfig.tilesets ?? [])
      .map((tileset) => {
        const name = tileset?.name ?? tileset?.key;
        if (!name || !tileset?.key) return null;
        return map.addTilesetImage(name, tileset.key);
      })
      .filter(Boolean);

    const layersByName = {};
    const objectLayersByName = {};
    const collisionLayers = [];
    const collisionConfig = this.mapConfig.collision ?? {};
    const tileLayerRules = collisionConfig.tileLayerRules ?? {};
    const objectLayerRules = collisionConfig.objectLayerRules ?? {};

    // Create render layers and opt-in collision based on map config rules.
    (map.layers ?? []).forEach((layerData, index) => {
      if (!layerData) return;
      if (layerData.type && layerData.type !== 'tilelayer') return;
      const layer = map.createLayer(layerData.name, tilesets, 0, 0);
      if (!layer) return;
      layer.setDepth(index);
      layersByName[layerData.name] = layer;

      if (tileLayerRules[layerData.name]) {
        layer.setCollisionByExclusion([-1]);
        collisionLayers.push(layer);
      } else {
        layer.setCollisionByExclusion([-1], false);
      }
    });

    // Cache object layers for optional static collider construction.
    (map.objects ?? []).forEach((layerData) => {
      if (!layerData?.name) return;
      objectLayersByName[layerData.name] = layerData;
    });

    console.log('[BoundedMapLoader] object layer names found:', Object.keys(objectLayersByName));
    console.log('[BoundedMapLoader] objectLayerRules keys:', Object.keys(objectLayerRules ?? {}));

    // Build static physics bodies from object layers for bounded maps.
    const objectColliderGroup = this._buildObjectColliders(objectLayersByName, objectLayerRules);
    const colliderCount = objectColliderGroup?.getChildren?.()?.length ?? 0;
    console.log('[BoundedMapLoader] object collider group count:', colliderCount);

    return {
      map,
      layersByName,
      objectLayersByName,
      collisionLayers,
      objectColliderGroup,
    };
  }

  _buildObjectColliders(objectLayersByName, objectLayerRules) {
    // Only layers opted-in by rules are converted into physics rectangles.
    const eligibleLayerNames = Object.keys(objectLayersByName).filter(
      (name) => objectLayerRules?.[name]
    );
    console.log('[BoundedMapLoader] eligible object layers:', eligibleLayerNames);
    if (!eligibleLayerNames.length) return null;

    // Static group keeps object colliders fixed to the tiled map geometry.
    const group = this.scene.physics.add.staticGroup();
    eligibleLayerNames.forEach((layerName) => {
      const layerData = objectLayersByName[layerName];
      console.log('[BoundedMapLoader] building object colliders for', layerName, 'count=', layerData?.objects?.length);
      if (!layerData?.objects?.length) return;
      layerData.objects.forEach((obj) => {
        if (!obj || typeof obj.x !== 'number' || typeof obj.y !== 'number') return;
        if (typeof obj.width !== 'number' || typeof obj.height !== 'number') return;
        const rect = this.scene.add.rectangle(
          obj.x + obj.width / 2,
          obj.y + obj.height / 2,
          obj.width,
          obj.height,
          0xff0000,
          0
        );
        this.scene.physics.add.existing(rect, true);
        group.add(rect);
      });
    });

    return group;
  }
}
