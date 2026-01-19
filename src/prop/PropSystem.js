// src/prop/PropSystem.js
import Phaser from 'phaser';
import { Pool } from '../core/Pool.js';
import { PropRegistry, weightedPick } from './PropRegistry.js';

const MIN_PROP_SPACING = 48; // world units (pixels)
const MAX_POSITION_ATTEMPTS = 8;
const BASE_PROP_RADIUS = 16;

export class PropSystem {
  /**
   * Creates a deterministic, chunk-based prop manager.
   *
   * @param {Phaser.Scene} scene - Scene that owns and updates this system.
   * @param {object} opts - Configuration bundle.
   * @param {number} [opts.chunkSize=256] - Width/height of each logical chunk in pixels.
   * @param {number} [opts.seed=1337] - Global RNG seed so props stay consistent between runs.
   * @param {number} [opts.density=6] - Approximate number of props per chunk.
   * @param {Record<string, object>} [opts.registry=PropRegistry] -
   *        Prop definitions to pick from when spawning.
   */
  constructor(scene, opts = {}) {
    const { chunkSize, seed, density, registry = PropRegistry } = opts;
    this.scene = scene;
    this.chunkSize = chunkSize ?? 256;
    this.seed = (seed ?? 1337) >>> 0;
    this.density = density ?? 6;
    this.registry = registry;

    // Pooled physics-enabled images so props participate in collision.
    // Using Arcade images keeps configuration lightweight while allowing us to
    // size bodies per registry entry.
    this.pool = new Pool(scene, Phaser.Physics.Arcade.Image, null, 1500, true);
    this.group = this.pool.group;

    // Track which chunks we have spawned and which props belong to each.
    /** @type {Map<string, Phaser.Physics.Arcade.Image[]>} */
    this.chunkToProps = new Map();

    // Reusable temp sets so we avoid allocating each frame when computing
    // visibility.
    this._visible = new Set();
    this._prevVisible = new Set();
  }

  /**
   * Penalize repeated picks of the same prop within a single chunk.
   * Keeps variety within the local area while remaining deterministic.
   */
  static _effectiveWeightForEntry(entry, localCounts) {
    const base = entry.weight || 0;
    const count = localCounts[entry.key] || 0;
    const penaltyFactor = 1 / (1 + count); // 1, 1/2, 1/3, ...
    return base * penaltyFactor;
  }

  /**
   * Pick a prop while penalizing repeats so each chunk feels varied.
   */
  _pickPropWithLocalDiversity(rand, localCounts) {
    const items = Object.values(this.registry);
    let total = 0;
    const weights = new Array(items.length);

    for (let i = 0; i < items.length; i++) {
      const w = PropSystem._effectiveWeightForEntry(items[i], localCounts);
      weights[i] = w;
      total += w;
    }

    if (total <= 0) {
      return weightedPick(this.registry, rand);
    }

    let r = rand() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }

    return items[items.length - 1];
  }

  /**
   * Estimate a spacing radius so props do not overlap visually.
   */
  _estimatePropRadius(config) {
    if (typeof config.size === 'number' && config.size > 0) {
      return config.size / 2;
    }
    return BASE_PROP_RADIUS;
  }

  /**
   * Expose the underlying physics group so scenes can wire up colliders.
   */
  getColliderGroup() {
    return this.group;
  }

  /**
   * Configure a padded Arcade body so collisions match the visual footprint.
   */
  _applyPhysicsConfig(img, config) {
    if (config?.colliders?.length) return;     // composite colliders path handles itself
    if (!img?.body) return;

    // On-screen size (already includes scale)
    const dispW = img.displayWidth;
    const dispH = img.displayHeight;

    // Optional square override in display pixels
    const targetSize = (typeof config.size === 'number') ? config.size : null;
    const desiredW = targetSize ?? dispW;
    const desiredH = targetSize ?? dispH;

    // Fixed X padding in display pixels (per side)
    const PAD_X_DISPLAY = 12;

    // Adaptive Y padding in display pixels (20% capped to 6)
    const padY = 12; //Math.min(6, desiredH * 0.20);

    // Final body size in display pixels
    const bodyDispW = Math.max(1, desiredW - PAD_X_DISPLAY * 2);
    const bodyDispH = Math.max(1, desiredH - padY * 2);

    // Convert display → frame pixels for Arcade, use abs(scale) to handle flips
    const sx = Math.abs(img.scaleX || 1);
    const sy = Math.abs(img.scaleY || 1);
    const bodyW = Math.max(1, Math.round(bodyDispW / sx));
    const bodyH = Math.max(1, Math.round(bodyDispH / sy));

    // Center the body inside the frame (offsets are in FRAME pixels)
    const offX = Math.round((img.width  - bodyW) / 2) + 2;
    const offY = Math.round((img.height - bodyH) / 2);

    img.setImmovable(true);
    img.body.setAllowGravity(false);
    img.body.setSize(bodyW, bodyH);
    img.body.setOffset(offX, offY);
    img.body.reset(img.x, img.y);
    img.body.setVelocity(0, 0);

    if (!img.onRelease) {
      img.onRelease = () => img.body?.setVelocity(0, 0);
    }
  }

  /**
   * Mixes chunk coordinates with the global seed to produce a stable unsigned
   * integer. The hash feeds the PRNG so the same chunk always yields the same
   * layout irrespective of load order.
   */
  _hash(cx, cy) {
    let x = (cx * 73856093) ^ (cy * 19349663) ^ this.seed;
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;
    return x >>> 0;
  }

  /**
   * Lightweight Mulberry32 PRNG, seeded per chunk so placements are
   * deterministic but still feel random.
   */
  _rng(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6D2B79F5; t >>>= 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Determines which chunk coordinates should currently be active based on the
   * camera's world view. Adds a small margin so trees spawn slightly off-screen,
   * preventing visible pop-in.
   */
  _computeVisibleChunks() {
    this._prevVisible = this._visible;
    this._visible = new Set();

    const cam = this.scene.cameras.main;
    const cs = this.chunkSize;

    // Expand by a small margin to avoid pop-in at edges
    const margin = 0; // chunks
    const left   = Math.floor(cam.worldView.x / cs) - margin;
    const right  = Math.floor((cam.worldView.x + cam.worldView.width) / cs) + margin;
    const top    = Math.floor(cam.worldView.y / cs) - margin;
    const bottom = Math.floor((cam.worldView.y + cam.worldView.height) / cs) + margin;

    for (let cy = top; cy <= bottom; cy++) {
      for (let cx = left; cx <= right; cx++) {
        this._visible.add(`${cx},${cy}`);
      }
    }
  }

  /**
   * Spawns props for the provided chunk if it hasn't been populated already.
   * The method pulls objects from the pool, positions them, and configures
   * transforms according to the randomly selected registry entry.
   */
  _ensureChunk(cx, cy) {
    const key = `${cx},${cy}`;
    if (this.chunkToProps.has(key)) return;

    const props = [];
    const seed = this._hash(cx, cy);
    const rand = this._rng(seed);
    const localCounts = Object.create(null);
    const placedMeta = []; // { x, y, radius }

    // Decide how many props: Poisson-ish around density
    const base = this.density;
    const count = Math.max(0, base + Math.floor((rand() - 0.5) * (base * 0.75)));

    const cs = this.chunkSize;
    const originX = cx * cs;
    const originY = cy * cs;

    for (let i = 0; i < count; i++) {
      const p = this._pickPropWithLocalDiversity(rand, localCounts);
      const radius = this._estimatePropRadius(p);

      let x;
      let y;
      let attempts = 0;
      let found = false;

      while (attempts < MAX_POSITION_ATTEMPTS && !found) {
        attempts++;
        // Position randomly within chunk (avoid tile seams slightly)
        x = originX + 8 + Math.floor(rand() * (cs - 16));
        y = originY + 8 + Math.floor(rand() * (cs - 16));

        let tooClose = false;
        for (const existing of placedMeta) {
          const dx = x - existing.x;
          const dy = y - existing.y;
          const minDist = radius + existing.radius + MIN_PROP_SPACING;
          if (dx * dx + dy * dy < minDist * minDist) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          found = true;
        }
      }

      if (!found) continue;

      const img = this.pool.get(x, y);
      if (!img) break;

      const textureKey = p.atlas ?? p.key;
      img.setTexture(textureKey, p.frame)
         .setPosition(x, y)
         .setDepth(p.depth ?? 1)
         .setRotation(
           Phaser.Math.DEG_TO_RAD *
           Phaser.Math.Linear(p.rotate?.[0] ?? 0, p.rotate?.[1] ?? 0, rand())
         )
         .setScale(Phaser.Math.Linear(p.scale?.[0] ?? 1, p.scale?.[1] ?? 1, rand()))
         .setAlpha(1)
         .setScrollFactor(1);
      if (p.tint != null) img.setTint(p.tint); else img.clearTint();

      this._applyPhysicsConfig(img, p);

      props.push(img);
      placedMeta.push({ x, y, radius });
      localCounts[p.key] = (localCounts[p.key] || 0) + 1;
    }

    this.chunkToProps.set(key, props);
  }

  /**
   * Releases all pooled objects belonging to the specified chunk and forgets
   * the mapping so it can be repopulated when it comes back on screen.
   */
  _releaseChunk(key) {
    const arr = this.chunkToProps.get(key);
    if (!arr) return;
    for (const obj of arr) this.pool.release(obj);
    this.chunkToProps.delete(key);
  }

  /** Call each frame (or on camera move) to maintain chunk visibility. */
  update() {
    this._computeVisibleChunks();

    // Spawn new visible chunks
    for (const key of this._visible) {
      if (!this._prevVisible.has(key)) {
        const [cx, cy] = key.split(',').map(Number);
        this._ensureChunk(cx, cy);
      }
    }

    // Release chunks that are no longer visible
    for (const key of this._prevVisible) {
      if (!this._visible.has(key)) {
        this._releaseChunk(key);
      }
    }
  }
}
