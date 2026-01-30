export const DEFAULT_MAP_KEY = 'endless_default';

export const MapRegistry = {
  endless_default: {
    ground: {
      textureKey: 'ground',
    },
    props: {
      enabled: true,
      chunkSize: 384,
      seed: 12345,
      density: 3,
      registryKey: 'all',
    },
  },
  endless_blood: {
    ground: {
      textureKey: 'ground',
    },
    props: {
      enabled: true,
      chunkSize: 384,
      seed: 12345,
      density: 3,
      registryKey: 'blood',
    },
  },
  endless_grave: {
    ground: {
      textureKey: 'ground',
    },
    props: {
      enabled: true,
      chunkSize: 384,
      seed: 12345,
      density: 3,
      registryKey: 'grave',
    },
  },
};
