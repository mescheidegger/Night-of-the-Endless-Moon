export const DEFAULT_MAP_KEY = 'endless_default';

/**
 * Format a registry key into a human-friendly label for UI fallbacks.
 */
function formatMapName(key) {
  if (!key || typeof key !== 'string') {
    return '';
  }
  const withSpaces = key.replace(/_/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

// Registry of map configs; bounded entries include tilemap/collision metadata.
export const MapRegistry = {
  endless_default: {
    type: 'infinite',
    order: 1,
    hidden: false,
    spawnTimelineKey: 'default',
    ground: {
      textureKey: 'ground',
    },
    ui: {
      name: 'Blood Mire',
      blurb: 'A familiar endless stretch of grass. Survive the night.',
      thumbnailKey: 'map.preview.endless_default',
      thumbnailPath: '/assets/tiles/largegrass.png',
      typeLabel: 'Endless',
    },
    props: {
      mode: 'procedural',
      chunkSize: 384,
      seed: 12345,
      density: 3,
      registryKey: 'all',
    },
  },
  endless_blood: {
    type: 'infinite',
    order: 2,
    hidden: true,
    spawnTimelineKey: 'default',
    ground: {
      textureKey: 'ground',
    },
    ui: {
      name: 'Blood Mire',
      blurb: 'A corrupted field stained crimson. Endless waves await.',
      thumbnailKey: 'map.preview.endless_blood',
      thumbnailPath: '/assets/tiles/darkgrass.png',
      typeLabel: 'Endless',
    },
    props: {
      mode: 'procedural',
      chunkSize: 384,
      seed: 12345,
      density: 3,
      registryKey: 'blood',
    },
  },
  endless_grave: {
    type: 'infinite',
    order: 3,
    hidden: true,
    spawnTimelineKey: 'default',
    ground: {
      textureKey: 'ground',
    },
    ui: {
      name: 'Graveyard Drift',
      blurb: 'An endless drift among the resting dead.',
      thumbnailKey: 'map.preview.endless_grave',
      thumbnailPath: '/assets/tiles/graveyard/TX_Tileset_Grass.png',
      typeLabel: 'Endless',
    },
    props: {
      mode: 'procedural',
      chunkSize: 384,
      seed: 12345,
      density: 3,
      registryKey: 'grave',
    },
  },
  // Bounded map example: loads a Tiled JSON and uses object layers as colliders.
  bounded_graveyard: {
    type: 'bounded',
    order: 4,
    hidden: false,
    spawnTimelineKey: 'bounded_graveyard',
    ui: {
      name: 'Graveyard',
      blurb: 'A fixed graveyard with winding paths and tight corners.',
      thumbnailKey: 'map.preview.bounded_graveyard',
      thumbnailPath: '/assets/tiles/graveyard/TX_Struct.png',
      typeLabel: 'Bounded',
    },
    // tilemap config drives preloading + map creation in BootScene/BoundedMapLoader.
    tilemap: {
      jsonKey: 'map.graveyard.scarywary',
      jsonPath: '/assets/tiles/graveyard/ScaryWary.json',
      tilesets: [
        { name: 'TX_Struct', key: 'tiles.graveyard.struct', path: '/assets/tiles/graveyard/TX_Struct.png' },
        { name: 'TX_Tileset_Wall', key: 'tiles.graveyard.wall', path: '/assets/tiles/graveyard/TX_Tileset_Wall.png' },
        { name: 'TX_Plant', key: 'tiles.graveyard.plant', path: '/assets/tiles/graveyard/TX_Plant.png' },
        { name: 'TX_Player', key: 'tiles.graveyard.player', path: '/assets/tiles/graveyard/TX_Player.png' },
        { name: 'TX_Props', key: 'tiles.graveyard.props', path: '/assets/tiles/graveyard/TX_Props.png' },
        { name: 'TX_Shadow_Plant', key: 'tiles.graveyard.shadow-plant', path: '/assets/tiles/graveyard/TX_Shadow_Plant.png' },
        { name: 'TX_Shadow', key: 'tiles.graveyard.shadow', path: '/assets/tiles/graveyard/TX_Shadow.png' },
        { name: 'TX_Tileset_Grass', key: 'tiles.graveyard.grass', path: '/assets/tiles/graveyard/TX_Tileset_Grass.png' },
        {
          name: 'TX_Tileset_Stone_Ground',
          key: 'tiles.graveyard.stone',
          path: '/assets/tiles/graveyard/TX_Tileset_Stone_Ground.png'
        },
        { name: 'TX_Plant_with_Shadow', key: 'tiles.graveyard.plant-shadow', path: '/assets/tiles/graveyard/TX_Plant_with_Shadow.png' }
      ],
    },
    collision: {
      tileLayerRules: {
        Grass: false,
        Stairs: false,
        Walls: false,
        Props: false,
        Plants: false,
        Collision: true,
      },
      objectLayerRules: {
        InvisibleWalls: true,
      }
    },
    render: {
      actorBaseDepth: 200,
      layerDepths: {
        Grass: 0,
        Collision: 5,
        Stairs: 190,
        Walls: 250,
        Props: 260,
        Plants: 320,
      },
      hideCollisionLayers: true,
    },
    spawns: {
      layer: 'Spawns',
      keys: {
        player: 'player_start',
      },
      // Group enemy spawns by prefix and reserve boss spawn for the werewolf encounter.
      groups: {
        enemy: { prefix: 'enemy_spawn' },
        boss: { key: 'boss_spawn' },
        timeline: { prefix: 'timeline_spawn' },
      },
      // Default to the enemy group when bounded spawns omit an explicit key.
      defaultEnemyKey: 'enemy',
    },
    props: {
      mode: 'tiled',
    },
  },
};

/**
 * Normalize map entries so UI consumers have a consistent shape.
 */
function applyMapDefaults(key, entry) {
  const order = entry?.order ?? 0;
  const ui = {
    name: entry?.ui?.name ?? formatMapName(key),
    blurb: entry?.ui?.blurb ?? 'Survive the night.',
    thumbnailKey: entry?.ui?.thumbnailKey ?? null,
    thumbnailPath: entry?.ui?.thumbnailPath ?? null,
    typeLabel: entry?.ui?.typeLabel ?? (entry?.type === 'bounded' ? 'Bounded' : 'Endless'),
  };

  return {
    key,
    ...entry,
    hidden: entry?.hidden ?? order < 0,
    order,
    ui,
  };
}

/**
 * Convenience helper used by selection UI to iterate map definitions.
 */
export function listMaps() {
  return Object.entries(MapRegistry)
    .map(([key, entry]) => applyMapDefaults(key, entry))
    .sort((a, b) => {
      const orderDiff = (a.order ?? 0) - (b.order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return (a.ui?.name ?? '').localeCompare(b.ui?.name ?? '');
    });
}
