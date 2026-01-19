/**
 * Enqueues every prop atlas referenced by the registry.
 * Centralising the loader calls ensures BootScene stays in sync with whichever
 * props are available without having to touch scene code whenever a new asset
 * is added.
 */
import { PROP_ATLASES } from './PropRegistry.js';

/**
 * Queue prop atlas assets so registries and scenes stay synchronized.
 */
export function loadPropAssets(scene) {
  if (!scene) return;

  PROP_ATLASES.forEach(({ key, imageURL, dataURL }) => {
    if (key && imageURL && dataURL && !scene.textures.exists(key)) {
      scene.load.atlas(key, imageURL, dataURL);
    }
  });
}
