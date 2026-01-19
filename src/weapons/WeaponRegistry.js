/**
 * WeaponRegistry holds the base configuration for each weapon type.
 * Entries here define the *default* stats and visuals for a weapon
 * before any modifiers, upgrades, or scaling are applied.
 *
 * The WeaponFactory clones these objects when creating weapon instances,
 * so modifying values here changes the default behavior globally.
 */
export const WeaponRegistry = {
  /**
   * "bolt" — A basic projectile weapon.
   * Fires a single straight shot toward the nearest target.
   */
  bolt: {
    key: 'bolt',
    type: 'projectile', // Weapon uses projectile-based firing logic

    audio: {
      fire: null,
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    // Timing and firing pattern configuration
    cadence: {
      delayMs: 600,   // Time between shots in milliseconds
      salvo: 1,       // Number of projectiles fired per trigger
      spreadDeg: 15,   // Spread angle for multi-shot (unused here)
      warmupMs: 0     // Optional spin-up time before firing begins
    },

    // Target acquisition behavior
    targeting: {
      mode: 'nearest', // Chooses nearest enemy in range
      range: 420       // Max distance to acquire a target
    },

    archetype: {
      aim: 'auto',
      trajectory: 'straight'
    },

    // Projectile configuration (passed to ProjectilePool and Projectile.fire)
    projectile: {
      texture: 'bolt',         // Texture key for projectile sprite
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'bolt.png',
      speed: 520,              // Movement speed in px/sec
      pierce: 5,               // Number of enemies the projectile can pass through before despawning
      lifetimeMs: 1000,        // Auto-despawn time
      body: { width: 12, height: 8 }, // Collision box size
      poolSize: 120,            // Max number of pooled projectile objects
      explosion: null               // or { radius: 64, damageMult: 0.75 } for AoE on final impact
    },

    // Damage model
    damage: {
      base: 10,                 // Flat damage per hit
      crit: { chance: 0, mult: 1.5 }, // Critical hit configuration
      status: []               // Status effect list (e.g., burn/poison) — none by default
    },

    // Visual and timing-based FX hooks
    fx: {
      muzzle: 'spark',         // Key used for muzzle flash effect sprite
      impact: 'spark'          // Key used for impact spark effect
    },

    // UI metadata (used in inventory/loadout screens)
    ui: {
      icon: { key: 'bolt' },   // Icon used in loadout and HUD
      name: 'Arc Bolt',        // Display name
      rarity: 'common'         // Used for loot tables, drop coloring, etc.
    },

    // Defines how damage / stats scale per level, if applicable
    levelCurve: 'linear_1_5',

    // Requirements for when player is allowed to equip or unlock the weapon
    requirements: { minLevel: 1 },

    // Default modifiers applied to all instances of this weapon (none here)
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.25 },
        cadence: { delayMsMult: 0.92 },
        projectile: { pierceAdd: 1 }
      },
      3: {
        damage: { baseMult: 1.5 },
        cadence: { delayMsMult: 0.9 },
        projectile: { speedMult: 1.1, pierceAdd: 2 }
      },
      4: {
        damage: { baseMult: 1.8 },
        cadence: { delayMsMult: 0.84 },
        projectile: { pierceAdd: 3 }
      },
      5: {
        damage: { baseMult: 2.1 },
        cadence: { delayMsMult: 0.8 },
        projectile: { speedMult: 1.25, pierceAdd: 4 }
      },
      6: {
        damage: { baseMult: 2.4 },
        cadence: { delayMsMult: 0.76 },
        projectile: { speedMult: 1.4, pierceAdd: 5 }
      },
      7: {
        damage: { baseMult: 2.7 },
        cadence: { delayMsMult: 0.72 },
        projectile: { speedMult: 1.55, pierceAdd: 6 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.68 },
        projectile: { speedMult: 1.7, pierceAdd: 7 }
      },
      9: {
        damage: { baseMult: 3.3 },
        cadence: { delayMsMult: 0.64 },
        projectile: { speedMult: 1.85, pierceAdd: 8 }
      },
      10: {
        damage: { baseMult: 3.6 },
        cadence: { delayMsMult: 0.6 },
        projectile: { speedMult: 2, pierceAdd: 9 }
      }
    }
  },

  daggerthrow: {
    key: 'daggerthrow',
    type: 'projectile',

    audio: {
      fire: {
        key: 'sfx.weapon.common.daggerthrow.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 820,
      salvo: 1,
      spreadDeg: 15,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 0
    },

    archetype: {
      aim: 'facing',
      trajectory: 'straight'
    },

    projectile: {
      texture: 'daggerthrow',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'daggerthrow.png',
      frameWidth: 39,
      frameHeight: 14,
      animKey: 'daggerthrow-spin',
      frameCount: 10,
      frameRate: 10,
      repeat: 0,
      speed: 600,
      pierce: 3,
      lifetimeMs: 820,
      rotateToVelocity: true,
      body: { width: 34, height: 10 },
      poolSize: 120
    },

    damage: {
      base: 12,
      crit: { chance: 0.1, mult: 1.5 },
      status: []
    },

    fx: {
      muzzle: 'spark',
      impact: 'spark'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'daggericon.png'
      },
      name: 'Death Pact',
      rarity: 'rare',
      description: 'Hurls a piercing dagger in the direction you\'re facing, slicing through multiple foes.'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.9 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.82 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.74 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.66 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.58 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.5 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.42 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.34 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.26 }
      }
    }
  },

  spearthrow: {
    key: 'spearthrow',
    type: 'projectile',

    audio: {
      fire: {
        key: 'sfx.weapon.common.daggerthrow.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 1350,
      salvo: 1,
      spreadDeg: 15,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 0
    },

    archetype: {
      aim: 'facing',
      trajectory: 'straight'
    },

    projectile: {
      texture: 'spearthrow',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'spearthrow.png',
      frameWidth: 64,
      frameHeight: 64,
      animKey: 'spearthrow-spin',
      frameCount: 4,
      frameRate: 12,
      repeat: -1,
      speed: 300,
      pierce: 20,
      lifetimeMs: 1200,
      rotateToVelocity: false,
      body: { width: 64, height: 64 },
      poolSize: 120
    },

    damage: {
      base: 12,
      crit: { chance: 0.1, mult: 1.5 },
      status: []
    },

    fx: {
      muzzle: 'spark',
      impact: 'spark'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'spearthrowicon.png'
      },
      name: 'Spear of Gaia',
      rarity: 'rare',
      description: 'Hurls a spinning spear in the direction you\'re facing, slicing through multiple foes.'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  ak47: {
    key: 'ak47',
    type: 'projectile',

    audio: {
      fire: {
        key: 'sfx.weapon.ak47.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 500,
      salvo: 1,
      spreadDeg: 15,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 0
    },

    archetype: {
      aim: 'facing',
      trajectory: 'straight'
    },

    projectile: {
      texture: 'bulletspray',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'bulletspray.png',
      frameWidth: 32,
      frameHeight: 32,
      animKey: 'bulletspray',
      speed: 1000,
      pierce: 1,
      lifetimeMs: 820,
      rotateToVelocity: true,
      body: { width: 34, height: 10 },
      poolSize: 120
    },

    damage: {
      base: 6,
      crit: { chance: 0.1, mult: 1.5 },
      status: []
    },

    fx: {
      muzzle: 'spark',
      impact: 'spark'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'ak47icon.png'
      },
      name: 'AK47',
      rarity: 'rare',
      description: 'Full auto destruction. Armor Piercing.'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  holyhammer: {
    key: 'holyhammer',
    type: 'chainThrow',

    audio: {
      fire: {
        key: 'sfx.weapon.holyhammer.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05,
        scoped: true
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 3000
    },

    targeting: {
      range: 420
    },

    archetype: {
      aim: 'auto',
      chainThrow: {
        maxHops: 5,
        hopRadius: 220,
        falloffPerHop: 0.15,
        perHopDurationMs: 300,
        rotationSpeed: 16 * Math.PI,
        allowRepeat: false
      }
    },

    projectile: {
      texture: 'holyhammerthrow',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'holyhammerthrow.png',
      frameWidth: 32,
      frameHeight: 32,
      speed: 520,
      lifetimeMs: 2000,
      rotateToVelocity: true
    },

    damage: {
      base: 25,
      crit: { chance: 0.1, mult: 2.0 }
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'holyhammericon.png'
      },
      name: 'Holy Hammer',
      description: 'Hurls a blessed hammer that ricochets among nearby foes.',
      rarity: 'legendary'
    },

    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  venusrevenge: {
    key: 'venusrevenge',
    type: 'burst',

    audio: {
      fire: {
        key: 'sfx.weapon.common.daggerthrow.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 2000,
      salvo: 1,
      spreadDeg: 0,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 0
    },

    archetype: {
      aim: 'facing',
      burst: {
        pattern: 'ring'
      }
    },

    burst: {
      count: 12,
      spreadDeg: 30,
      baseAngleDeg: 0,
      pattern: 'ring'
    },

    projectile: {
      texture: 'venusrevenge',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'venusrevenge.png',
      frameWidth: 32,
      frameHeight: 32,
      speed: 540,
      pierce: 6,
      lifetimeMs: 900,
      maxDistance: 560,
      rotateToVelocity: true,
      assetForwardDeg: 30,
      spinSpeedRadPerSec: 6 * Math.PI,
      resetRotationOnRelease: true,
      body: { width: 22, height: 22 },
      poolSize: 64
    },

    damage: {
      base: 15,
      crit: { chance: 0.2, mult: 2.1 },
      status: []
    },

    fx: {
      muzzle: 'spark',
      impact: 'spark'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'venusrevengeicon.png'
      },
      name: 'Venus\u2019s Revenge',
      description: 'Unleash a legendary burst of piercing daggers in all directions.',
      rarity: 'rare'
    },

    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.9 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.82 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.74 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.66 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.58 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.5 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.42 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.34 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.26 }
      }
    }
  },

  whirlwind: {
    key: 'whirlwind',
    type: 'burst',

    audio: {
      fire: {
        key: 'sfx.weapon.common.daggerthrow.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 2000,
      salvo: 1,
      spreadDeg: 0,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 0
    },

    archetype: {
      aim: 'facing',
      burst: {
        pattern: 'ring'
      }
    },

    burst: {
      count: 12,
      spreadDeg: 30,
      baseAngleDeg: 0,
      pattern: 'ring'
    },

    projectile: {
      texture: 'whirlwind',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'whirlwind.png',
      frameWidth: 32,
      frameHeight: 32,
      speed: 540,
      pierce: 6,
      lifetimeMs: 900,
      maxDistance: 560,
      rotateToVelocity: false,
      assetForwardDeg: 30,
      spinSpeedRadPerSec: 6 * Math.PI,
      resetRotationOnRelease: true,
      body: { width: 22, height: 22 },
      poolSize: 64
    },

    damage: {
      base: 15,
      crit: { chance: 0.2, mult: 2.1 },
      status: []
    },

    fx: {
      muzzle: 'spark',
      impact: 'spark'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'whirlwindicon.png'
      },
      name: 'Whirlwind',
      description: 'Unleash a legendary burst of axe\u2019s in all directions.',
      rarity: 'rare'
    },

    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  sword: {
    key: 'sword',
    type: 'slash',

    audio: {
      fire: {
        key: 'sfx.weapon.sword.slash',
        volume: 0.5,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 820,
      salvo: 1,
      spreadDeg: 0,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 0
    },

    archetype: {
      aim: 'facing',
      slash: {
        offsetPx: 28,
        lengthPx: 80,
        arcDeg: 180,
        followOwner: true,
        triggerFrameIndex: 4
      }
    },

    projectile: {
      texture: 'whiteslash',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'whiteslash.png',
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 5,
      animKey: 'sword-slash',
      frameRate: 12,
      repeat: 0,
      lifetimeMs: 180,
      body: { width: 0, height: 0 }
    },

    damage: {
      base: 10,
      crit: { chance: 0.05, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 80,
      damageMult: 1.0,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation',
      animationFrameIndex: 4,
      arcSlack: 0.06
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'swordicon.png',
        offsetX: 1.5
      },
      name: 'Sword',
      description: 'Cold, hard, steel.',
      rarity: 'common'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.3 },
        cadence: { delayMsMult: 0.92 },
        aoe: { radiusAdd: 12 }
      },
      3: {
        damage: { baseMult: 1.6 },
        cadence: { delayMsMult: 0.9 },
        aoe: { radiusAdd: 24 }
      },
      4: {
        damage: { baseMult: 1.9 },
        cadence: { delayMsMult: 0.84 },
        aoe: { damageMultMult: 1.1 }
      },
      5: {
        damage: { baseMult: 2.25 },
        cadence: { delayMsMult: 0.8 },
        aoe: { radiusAdd: 36, damageMultMult: 1.2 }
      },
      6: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.76 },
        aoe: { radiusAdd: 48, damageMultMult: 1.3 }
      },
      7: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.72 },
        aoe: { radiusAdd: 60, damageMultMult: 1.4 }
      },
      8: {
        damage: { baseMult: 3.45 },
        cadence: { delayMsMult: 0.68 },
        aoe: { radiusAdd: 72, damageMultMult: 1.5 }
      },
      9: {
        damage: { baseMult: 3.9 },
        cadence: { delayMsMult: 0.64 },
        aoe: { radiusAdd: 84, damageMultMult: 1.6 }
      },
      10: {
        damage: { baseMult: 4.35 },
        cadence: { delayMsMult: 0.6 },
        aoe: { radiusAdd: 96, damageMultMult: 1.7 }
      }
    }
  },

  spear: {
    key: 'spear',
    type: 'slash',

    audio: {
      fire: {
        key: 'sfx.weapon.sword.slash',
        volume: 0.5,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 820,
      salvo: 1,
      spreadDeg: 0,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 0
    },

    archetype: {
      aim: 'facing',
      slash: {
        offsetPx: 28,
        lengthPx: 80,
        arcDeg: 180,
        followOwner: true,
        triggerFrameIndex: 4
      }
    },

    projectile: {
      texture: 'greenslash',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'greenslash.png',
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 5,
      animKey: 'spear-slash',
      frameRate: 12,
      repeat: 0,
      lifetimeMs: 180,
      body: { width: 0, height: 0 }
    },

    damage: {
      base: 10,
      crit: { chance: 0.05, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 80,
      damageMult: 1.0,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation',
      animationFrameIndex: 4,
      arcSlack: 0.06
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'spearicon.png',
        offsetX: 1.5
      },
      name: 'Spear',
      description: 'Slash through foes.',
      rarity: 'common'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  girlsword: {
    key: 'girlsword',
    type: 'slash',

    audio: {
      fire: {
        key: 'sfx.weapon.sword.slash',
        volume: 0.5,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 820,
      salvo: 1,
      spreadDeg: 0,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 0
    },

    archetype: {
      aim: 'facing',
      slash: {
        offsetPx: 28,
        lengthPx: 80,
        arcDeg: 180,
        followOwner: true,
        triggerFrameIndex: 4
      }
    },

    projectile: {
      texture: 'redslash',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'redslash.png',
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 5,
      animKey: 'girlsword-slash',
      frameRate: 12,
      repeat: 0,
      lifetimeMs: 180,
      body: { width: 0, height: 0 }
    },

    damage: {
      base: 10,
      crit: { chance: 0.05, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 80,
      damageMult: 1.0,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation',
      animationFrameIndex: 4,
      arcSlack: 0.06
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'girlswordicon.png',
        offsetX: 1.5
      },
      name: 'Crimson Slash',
      description: 'Burning precision',
      rarity: 'common'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  hammer: {
    key: 'hammer',
    type: 'slash',

    audio: {
      fire: {
        key: 'sfx.weapon.sword.slash',
        volume: 0.5,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 820,
      salvo: 1,
      spreadDeg: 0,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 0
    },

    archetype: {
      aim: 'facing',
      slash: {
        offsetPx: 28,
        lengthPx: 80,
        arcDeg: 180,
        followOwner: true,
        triggerFrameIndex: 4
      }
    },

    projectile: {
      texture: 'orangeslash',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'orangeslash.png',
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 5,
      animKey: 'hammer-slash',
      frameRate: 12,
      repeat: 0,
      lifetimeMs: 180,
      body: { width: 0, height: 0 }
    },

    damage: {
      base: 10,
      crit: { chance: 0.05, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 80,
      damageMult: 1.0,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation',
      animationFrameIndex: 4,
      arcSlack: 0.06
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'hammericon.png',
        offsetX: 1.5
      },
      name: 'Hammer Swing',
      description: 'Bash things.',
      rarity: 'common'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  cleaver: {
    key: 'cleaver',
    type: 'slash',

    audio: {
      fire: {
        key: 'sfx.weapon.sword.slash',
        volume: 0.5,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 820,
      salvo: 1,
      spreadDeg: 0,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 0
    },

    archetype: {
      aim: 'facing',
      slash: {
        offsetPx: 28,
        lengthPx: 80,
        arcDeg: 180,
        followOwner: true,
        triggerFrameIndex: 4
      }
    },

    projectile: {
      texture: 'blueslash',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'blueslash.png',
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 5,
      animKey: 'cleaver-slash',
      frameRate: 12,
      repeat: 0,
      lifetimeMs: 180,
      body: { width: 0, height: 0 }
    },

    damage: {
      base: 10,
      crit: { chance: 0.05, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 80,
      damageMult: 1.0,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation',
      animationFrameIndex: 4,
      arcSlack: 0.06
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'cleavericon.png',
        offsetX: 1.5
      },
      name: 'Nordic Cleaver',
      description: 'Cleave through enemies.',
      rarity: 'common'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  staff: {
    key: 'staff',
    type: 'slash',

    audio: {
      fire: {
        key: 'sfx.weapon.sword.slash',
        volume: 0.5,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 820,
      salvo: 1,
      spreadDeg: 0,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 0
    },

    archetype: {
      aim: 'facing',
      slash: {
        offsetPx: 28,
        lengthPx: 80,
        arcDeg: 180,
        followOwner: true,
        triggerFrameIndex: 4
      }
    },

    audio: {
      fire: {
        key: 'sfx.weapon.sword.slash',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    projectile: {
      texture: 'purpleslash',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'purpleslash.png',
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 5,
      animKey: 'staff-slash',
      frameRate: 12,
      repeat: 0,
      lifetimeMs: 180,
      body: { width: 0, height: 0 }
    },

    damage: {
      base: 10,
      crit: { chance: 0.05, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 80,
      damageMult: 1.0,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation',
      animationFrameIndex: 4,
      arcSlack: 0.06
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'stafficon.png',
        offsetX: 1.5
      },
      name: 'Arcane Swipe',
      description: 'Old mans cane.',
      rarity: 'common'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },
  /**
   * "bow" — Rare bow variant of the bolt weapon.
   * Shares bolt behaviour but swaps to bespoke visuals.
   */
  bow: {
    key: 'bow',
    type: 'projectile',

    audio: {
      fire: {
        key: 'sfx.weapon.bow.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 500,
      salvo: 1,
      spreadDeg: 15,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 420
    },

    archetype: {
      aim: 'auto',
      trajectory: 'straight'
    },

    projectile: {
      texture: 'xbowarrow',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'xbowarrow.png',
      frameWidth: 48,
      frameHeight: 18,
      animKey: 'xbowarrow-fly',
      frameCount: 3,
      frameRate: 12,
      repeat: -1,
      speed: 520,
      pierce: 5,
      lifetimeMs: 1000,
      rotateToVelocity: true,
      body: { width: 40, height: 10 },
      poolSize: 120,
      explosion: null
    },

    damage: {
      base: 12,
      crit: { chance: 0, mult: 1.5 },
      status: []
    },

    fx: {
      muzzle: 'spark',
      impact: 'spark'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'bowicon.png'
      },
      name: 'Bow',
      description: 'Fires at closest enemy.',
      rarity: 'rare'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  /**
   * "xbow" — Rare crossbow variant of the bolt weapon.
   * Shares bolt behaviour but swaps to bespoke visuals.
   */
  xbow: {
    key: 'xbow',
    type: 'projectile',

    audio: {
      fire: {
        key: 'sfx.weapon.bow.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 500,
      salvo: 1,
      spreadDeg: 15,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 420
    },

    archetype: {
      aim: 'auto',
      trajectory: 'straight'
    },

    projectile: {
      texture: 'xbowarrow',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'xbowarrow.png',
      frameWidth: 48,
      frameHeight: 18,
      animKey: 'xbowarrow-fly',
      frameCount: 3,
      frameRate: 12,
      repeat: -1,
      speed: 520,
      pierce: 5,
      lifetimeMs: 1000,
      rotateToVelocity: true,
      body: { width: 40, height: 10 },
      poolSize: 120,
      explosion: null
    },

    damage: {
      base: 12,
      crit: { chance: 0, mult: 1.5 },
      status: []
    },

    fx: {
      muzzle: 'spark',
      impact: 'spark'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'xbowicon.png'
      },
      name: 'Xbow',
      description: 'Fires at closest enemy. Devastating piercing.',
      rarity: 'rare'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  deathray: {
    key: 'deathray',
    type: 'projectile',

    audio: {
      fire: {
        key: 'sfx.weapon.deathray.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 800,
      salvo: 1,
      spreadDeg: 15,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 420
    },

    archetype: {
      aim: 'auto',
      trajectory: 'straight'
    },

    projectile: {
      texture: 'laserbeam',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'laserbeam.png',
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 7,
      frameRate: 12,
      repeat: -1,
      animKey: 'deathray-fly',
      speed: 520,
      pierce: 999,
      lifetimeMs: 1000,
      rotateToVelocity: true,
      body: { width: 40, height: 32 },
      poolSize: 160,
      explosion: null
    },

    damage: {
      base: 20,
      crit: { chance: 0, mult: 1.5 },
      status: []
    },

    fx: {
      muzzle: 'spark',
      impact: 'spark'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'deathrayicon.png'
      },
      name: 'Death Ray',
      description: 'Auto target. Massive laser beam. Devasating.',
      rarity: 'legendary'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  ragnarok: {
    key: 'ragnarok',
    type: 'projectile',

    audio: {
      fire: {
        key: 'sfx.weapon.ragnarok.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 800,
      salvo: 1,
      spreadDeg: 15,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 420
    },

    archetype: {
      aim: 'auto',
      trajectory: 'straight'
    },

    projectile: {
      texture: 'ragnarokanimation',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'ragnarokanimation.png',
      frameWidth: 64,
      frameHeight: 64,
      animKey: 'ragnarok-fly',
      frameCount: 4,
      frameRate: 12,
      repeat: -1,
      speed: 200,
      pierce: 999,
      lifetimeMs: 5000,
      rotateToVelocity: false,   
      body: { width: 32, height: 64 },
      poolSize: 160,
      explosion: null
    },

    damage: {
      base: 20,
      crit: { chance: 0, mult: 1.5 },
      status: []
    },

    fx: {
      muzzle: 'spark',
      impact: 'spark'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'ragnarokicon.png'
      },
      name: 'Ragnarok',
      description: 'The storm of Ragnarok takes hold.',
      rarity: 'legendary'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  bazooka: {
    key: 'bazooka',
    type: 'bazooka',

    audio: {
      fire: {
        key: 'sfx.weapon.common.cluster',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 1900,
      salvo: 1,
      spreadDeg: 0,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 420
    },

    archetype: {
      aim: 'facing',
      trajectory: 'straight',
      bazooka: {
        detonateSeconds: 1.5,
        tickMs: 250
      }
    },

    projectile: {
      texture: 'rocket',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'rocket.png',
      frameWidth: 32,
      frameHeight: 16,
      frameCount: 1, 
      speed: 420,
      pierce: 0,
      lifetimeMs: 400,
      rotateToVelocity: true,
      body: { width: 32, height: 16 },
      poolSize: 80,
      explosion: {
        texture: 'clusterbomb',
        atlas: 'weaponanimations_atlas',
        atlasFrame: 'clusterbomb.png',
        animKey: 'clusterbomb-explode'
      }
    },

    damage: {
      base: 14,
      crit: { chance: 0.08, mult: 1.6 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 96,
      damageMult: 0.9,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'bazookaicon.png'
      },
      name: 'Bazooka',
      description: 'Fires directional rocket. Triggers clustered explosions.',
      rarity: 'rare'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  icebow: {
    key: 'icebow',
    type: 'bazooka',

    audio: {
      fire: {
        key: 'sfx.weapon.icebow.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 1900,
      salvo: 1,
      spreadDeg: 0,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 420
    },

    archetype: {
      aim: 'facing',
      trajectory: 'straight',
      bazooka: {
        detonateSeconds: 2.0,
        tickMs: 250
      }
    },

    projectile: {
      texture: 'icebowanimation',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'icebowanimation.png',
      frameWidth: 64,
      frameHeight: 64,
      animKey: 'icebow-fly',
      frameCount: 3,
      frameRate: 12,
      repeat: -1,
      speed: 420,
      pierce: 0,
      lifetimeMs: 500,
      rotateToVelocity: true,
      body: { width: 32, height: 32 },
      poolSize: 80,
      repeat: 20,
      explosion: {
        texture: 'icebowexplosion',
        atlas: 'weaponanimations_atlas',
        atlasFrame: 'icebowexplosion.png',
        animKey: 'icebowexplosion-explode'
      }
    },

    damage: {
      base: 12,
      crit: { chance: 0.08, mult: 1.6 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 96,
      damageMult: 0.9,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'icebowicon.png'
      },
      name: 'Ice Bow',
      description: 'Fires directional rocket. Triggers clustered explosions.',
      rarity: 'rare'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  icebowexplosion: {
    key: 'icebowexplosion',
    type: 'cluster',

    audio: {
      fire: {
        key: 'sfx.weapon.icebow.explode',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 3200,
      salvo: 1,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 120
    },

    archetype: {
      aim: 'auto',
      cluster: {
        count: 3,
        spreadRadius: 72,
        staggerMs: 60
      }
    },

    projectile: {
      texture: 'icebowexplosion',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'icebowexplosion.png',
      frameWidth: 64,
      frameHeight: 64,
      animKey: 'icebowexplosion-explode'
    },

    damage: {
      base: 15,
      crit: { chance: 0, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 96,
      damageMult: 0.9,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'clusterbombicon.png'
      },
      name: 'Cluster Bomb',
      rarity: 'epic'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 },
        cluster: { countAdd: 1, spreadRadiusAdd: 8 },
        aoe: { radiusAdd: 8 }
      },
      3: {
        damage: { baseMult: 1.4 },
        cadence: { delayMsMult: 0.9 },
        cluster: { countAdd: 1, spreadRadiusAdd: 16 },
        aoe: { radiusAdd: 16 }
      },
      4: {
        damage: { baseMult: 1.65 },
        cadence: { delayMsMult: 0.85 },
        cluster: { countAdd: 2, spreadRadiusAdd: 24 },
        aoe: { radiusAdd: 24 }
      },
      5: {
        damage: { baseMult: 1.95 },
        cadence: { delayMsMult: 0.8 },
        cluster: { countAdd: 3, spreadRadiusAdd: 32 },
        aoe: { radiusAdd: 32, damageMultMult: 1.2 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 },
        cluster: { countAdd: 4, spreadRadiusAdd: 40 },
        aoe: { radiusAdd: 40, damageMultMult: 1.3 }
      },
      7: {
        damage: { baseMult: 2.7 },
        cadence: { delayMsMult: 0.7 },
        cluster: { countAdd: 5, spreadRadiusAdd: 48 },
        aoe: { radiusAdd: 48, damageMultMult: 1.4 }
      },
      8: {
        damage: { baseMult: 3.15 },
        cadence: { delayMsMult: 0.65 },
        cluster: { countAdd: 6, spreadRadiusAdd: 56 },
        aoe: { radiusAdd: 56, damageMultMult: 1.5 }
      },
      9: {
        damage: { baseMult: 3.6 },
        cadence: { delayMsMult: 0.6 },
        cluster: { countAdd: 7, spreadRadiusAdd: 64 },
        aoe: { radiusAdd: 64, damageMultMult: 1.6 }
      },
      10: {
        damage: { baseMult: 4.05 },
        cadence: { delayMsMult: 0.55 },
        cluster: { countAdd: 8, spreadRadiusAdd: 72 },
        aoe: { radiusAdd: 72, damageMultMult: 1.7 }
      }
    }
  },

  fireblast: {
    key: 'fireblast',
    type: 'bazooka',

    audio: {
      fire: {
        key: 'sfx.weapon.fireblast.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 1900,
      salvo: 1,
      spreadDeg: 0,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 420
    },

    archetype: {
      aim: 'facing',
      trajectory: 'straight',
      bazooka: {
        detonateSeconds: 2.0,
        tickMs: 250
      }
    },

    projectile: {
      texture: 'fireblast',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'fireblast.png',
      frameWidth: 64,
      frameHeight: 64,
      animKey: 'fireblast-fly',
      frameCount: 3,
      frameRate: 10,
      repeat: -1,
      speed: 420,
      pierce: 0,
      lifetimeMs: 500,
      rotateToVelocity: true,
      body: { width: 32, height: 32 },
      poolSize: 80,
      repeat: 20,
      explosion: {
        texture: 'fireblastexplosion',
        atlas: 'weaponanimations_atlas',
        atlasFrame: 'fireblastexplosion.png',
        animKey: 'fireblastexplosion-explode'
      }
    },

    damage: {
      base: 15,
      crit: { chance: 0.08, mult: 1.6 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 96,
      damageMult: 0.9,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'fireblasticon.png'
      },
      name: 'Fire Blast',
      description: 'Massive fire blast. Triggers burning ember.',
      rarity: 'rare'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  fireblastexplosion: {
    key: 'fireblastexplosion',
    type: 'cluster',

    audio: {
      fire: {
        key: 'sfx.weapon.firebomb.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 2800,
      salvo: 1,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 120
    },

    archetype: {
      aim: 'auto',
      cluster: {
        count: 3,
        spreadRadius: 72,
        staggerMs: 60
      }
    },

    projectile: {
      texture: 'fireblastexplosion',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'fireblastexplosion.png',
      frameWidth: 64,
      frameHeight: 64,
      animKey: 'fireblastexplosion-explode'
    },

    damage: {
      base: 15,
      crit: { chance: 0, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 96,
      damageMult: 0.9,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'clusterbombicon.png'
      },
      name: 'Cluster Bomb',
      rarity: 'epic'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  purplenado: {
    key: 'purplenado',
    type: 'bazooka',

    audio: {
      fire: null,
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 1900,
      salvo: 1,
      spreadDeg: 0,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 420
    },

    archetype: {
      aim: 'facing',
      trajectory: 'straight',
      bazooka: {
        detonateSeconds: 2.0,
        tickMs: 250
      }
    },

    projectile: {
      texture: 'purplenado',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'purplenado.png',
      frameWidth: 64,
      frameHeight: 64,
      animKey: 'purplenado-fly',
      frameCount: 4,
      frameRate: 12,
      repeat: -1,
      speed: 420,
      pierce: 0,
      lifetimeMs: 500,
      rotateToVelocity: true,
      body: { width: 32, height: 32 },
      poolSize: 80,
      repeat: 20,
      explosion: {
        texture: 'purpleshock',
        atlas: 'weaponanimations_atlas',
        atlasFrame: 'purpleshock.png',
        animKey: 'purpleshock-explode'
      }
    },

    damage: {
      base: 15,
      crit: { chance: 0.08, mult: 1.6 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 96,
      damageMult: 0.9,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'fireblasticon.png'
      },
      name: 'Purple Nado',
      description: 'Purple Tornado with Shock Blast',
      rarity: 'epic'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  purpleshock: {
    key: 'purpleshock',
    type: 'cluster',

    audio: {
      fire: null,
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 3200,
      salvo: 1,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 120
    },

    archetype: {
      aim: 'auto',
      cluster: {
        count: 3,
        spreadRadius: 72,
        staggerMs: 60
      }
    },

    projectile: {
      texture: 'purpleshock',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'purpleshock.png',
      frameWidth: 64,
      frameHeight: 64,
      animKey: 'purpleshock-explode'
    },

    damage: {
      base: 15,
      crit: { chance: 0, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 96,
      damageMult: 0.9,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'clusterbombicon.png'
      },
      name: 'Cluster Bomb',
      rarity: 'epic'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  clusterpotion: {
    key: 'clusterpotion',
    type: 'bazooka',

    audio: {
      fire: {
        key: 'sfx.weapon.common.cluster',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 1900,
      salvo: 1,
      spreadDeg: 0,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 420
    },

    archetype: {
      aim: 'facing',
      trajectory: 'straight',
      bazooka: {
        detonateSeconds: 1.5,
        tickMs: 250
      }
    },

    projectile: {
      texture: 'clusterpotion',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'clusterpotion.png',
      frameWidth: 16,
      frameHeight: 16,
      frameCount: 1, 
      speed: 220,
      pierce: 0,
      lifetimeMs: 400,
      rotateToVelocity: true,
      body: { width: 28, height: 10 },
      poolSize: 80,
      explosion: {
        texture: 'clusterbomb',
        atlas: 'weaponanimations_atlas',
        atlasFrame: 'clusterbomb.png',
        animKey: 'clusterbomb-explode'
      }
    },

    damage: {
      base: 20,
      crit: { chance: 0.08, mult: 1.6 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 96,
      damageMult: 0.9,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'clusterpotionicon.png'
      },
      name: 'Fire Bomb',
      description: 'Throw a devastating fire bomb that causes a clustered explosion on impact.',
      rarity: 'legendary'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  magicpotion: {
    key: 'magicpotion',
    type: 'ballistic',

    audio: {
      fire: null,
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 2700,
      salvo: 1,
      spreadDeg: 0,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 0
    },

    archetype: {
      aim: 'facing',
      trajectory: 'ballistic',
      ballistic: {
        launchAngleDeg: -75,
        launchSpeed: 360,
        gravityY: 900,
        rotateToVelocity: false,
        facingBiasDeg: 6
      }
    },

    projectile: {
      texture: 'magicpotion',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'magicpotion.png',
      frameWidth: 16,
      frameHeight: 16,
      animKey: null,
      spinSpeedRadPerSec: 8 * Math.PI,
      pierce: 0,
      lifetimeMs: 2300,
      body: { width: 12, height: 12 },
      poolSize: 80,

      explosion: {
        radius: 120,
        damageMult: 1.0,
        maxTargets: Infinity,
        falloff: 0.1,
        texture: 'magicpotionexplosion',     
        atlas: 'weaponanimations_atlas',
        atlasFrame: 'magicpotionexplosion.png',
        frameWidth: 64,                    
        frameHeight: 78,
        frameCount: 11,                     
        animKey: 'magicpotion-explode',     
        timing: 'animation'
      }
    },

    damage: {
      base: 12,
      crit: { chance: 0.05, mult: 1.7 },
      status: []
    },

    fx: { muzzle: 'spark', impact: 'spark' },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'magicpotionicon.png'
      },
      name: 'Magic Potion',
      description: 'Lob a volatile potion that explodes on impact, splashing nearby foes.',
      rarity: 'rare'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 },
        aoe: { radiusAdd: 12 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 },
        aoe: { radiusAdd: 24 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 },
        aoe: { radiusAdd: 36, damageMultMult: 1.1 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 },
        aoe: { radiusAdd: 48, damageMultMult: 1.2 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 },
        aoe: { radiusAdd: 60, damageMultMult: 1.3 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 },
        aoe: { radiusAdd: 72, damageMultMult: 1.4 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 },
        aoe: { radiusAdd: 84, damageMultMult: 1.5 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 },
        aoe: { radiusAdd: 96, damageMultMult: 1.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 },
        aoe: { radiusAdd: 108, damageMultMult: 1.7 }
      }
    }
  },

  magicpotionexplosion: {
    key: 'magicpotionexplosion',
    type: 'cluster', 

    audio: {
      fire: {
        key: 'sfx.weapon.common.magicclusterexplosion',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 3200,
      salvo: 1,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 120
    },

    archetype: {
      aim: 'auto',
      cluster: {
        count: 3,
        spreadRadius: 72,
        staggerMs: 60
      }
    },

    projectile: {
      texture: 'magicpotionexplosion',      
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'magicpotionexplosion.png',
      frameWidth: 64,                        
      frameHeight: 78,
      frameCount: 11,
      animKey: 'magicpotion-explode'       
    },

    damage: {
      base: 15,
      crit: { chance: 0, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 96,
      damageMult: 0.9,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'magicpotionexplosion.png'
      },
      name: 'Magic Potion Explosion',
      rarity: 'epic'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  vikingaxe: {
    key: 'vikingaxe',
    type: 'ballistic',

    audio: {
      fire: null,
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 2500,
      salvo: 1,
      spreadDeg: 0,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 0
    },

    archetype: {
      aim: 'facing',
      trajectory: 'ballistic',
      ballistic: {
        launchAngleDeg: -75,
        launchSpeed: 350,
        gravityY: 900,
        rotateToVelocity: true,
        facingBiasDeg: 10
      }
    },

    projectile: {
      texture: 'vikingaxe',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'vikingaxe.png',
      frameWidth: 48,
      frameHeight: 48,
      animKey: 'vikingaxe-spin',
      speed: 0,
      gravity: 0,
      pierce: 15,
      lifetimeMs: 2500,
      body: { width: 36, height: 36 },
      poolSize: 80,
      explosion: null
    },

    damage: {
      base: 12,
      crit: { chance: 0.05, mult: 1.6 },
      status: []
    },

    fx: { muzzle: 'spark', impact: 'spark' },

    aoe: null,

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'vikingaxeicon.png'
      },
      name: 'Viking Axe',
      description: 'Lob devastating axe at foes. High radius and devasating piercing.',
      rarity: 'rare'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  vikinghammer: {
    key: 'vikinghammer',
    type: 'ballistic',

    audio: {
      fire: {
        key: 'sfx.weapon.vikinghammer.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 1200,
      salvo: 1,
      spreadDeg: 15,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 0
    },

    archetype: {
      aim: 'facing',
      trajectory: 'ballistic',
      ballistic: {
        launchAngleDeg: -75,
        launchSpeed: 350,
        gravityY: 900,
        rotateToVelocity: false,
        facingBiasDeg: 10
      }
    },

    projectile: {
      texture: 'vikinghammer',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'vikinghammer.png',
      frameWidth: 32,
      frameHeight: 32,
      speed: 540,
      pierce: 15,
      lifetimeMs: 1200,
      maxDistance: 700,
      rotateToVelocity: false,
      assetForwardDeg: 30,
      spinSpeedRadPerSec: 20 * Math.PI,
      resetRotationOnRelease: true,
      body: { width: 40, height: 40 },
      poolSize: 64
    },

    damage: {
      base: 12,
      crit: { chance: 0.05, mult: 1.6 },
      status: []
    },

    fx: { muzzle: 'spark', impact: 'spark' },

    aoe: null,

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'vikinghammericon.png'
      },
      name: 'Thor\u2019s Hammer',
      description: 'Lob devastating hammer at foes. High radius and devasating piercing.',
      rarity: 'rare'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  shuriken: {
    key: 'shuriken',
    type: 'projectile',

    audio: {
      fire: null,
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },
    cadence: {
      delayMs: 2000,
      salvo: 1,
      spreadDeg: 15,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 420
    },

    archetype: {
      aim: 'none',
      trajectory: 'circular',
      circular: {
        radius: 72,
        angularVel: 3.5,
        loops: 1.0,
        startPhase: 0,
        radiusInMs: 100
      }
    },

    projectile: {
      texture: 'shuriken',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'shuriken.png',
      frameWidth: 32,
      frameHeight: 32,
      animKey: 'shuriken-spin',
      speed: 420,
      pierce: 999,
      lifetimeMs: 2000,
      body: { width: 20, height: 20 },
      poolSize: 120,
      explosion: null
    },

    damage: {
      base: 12,
      crit: { chance: 0.05, mult: 1.5 },
      status: []
    },

    fx: {
      muzzle: 'spark',
      impact: 'spark'
    },

    ui: {
      icon: { key: 'shuriken', frame: 0 },
      name: 'Shuriken',
      description: 'Circular pattern around player. Max pierce.',
      rarity: 'rare'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  flamethrower: {
    key: 'flamethrower',
    type: 'projectile',

    audio: {
      fire: {
        key: 'sfx.weapon.common.wind',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },
    cadence: {
      delayMs: 2000,
      salvo: 1,
      spreadDeg: 15,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 420
    },

    archetype: {
      aim: 'none',
      trajectory: 'circular',
      circular: {
        radius: 72,
        angularVel: 3.5,
        loops: 1.0,
        startPhase: 0,
        radiusInMs: 100
      }
    },

    projectile: {
      texture: 'flamethrower',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'flamethrower.png',
      frameWidth: 32,
      frameHeight: 32,
      animKey: 'flamethrower-spin',
      frameCount: 6,
      frameRate: 12,
      repeat: -1,
      speed: 420,
      pierce: 999,
      lifetimeMs: 2000,
      body: { width: 32, height: 32 },
      poolSize: 120,
      explosion: null
    },

    damage: {
      base: 12,
      crit: { chance: 0.05, mult: 1.5 },
      status: []
    },

    fx: {
      muzzle: 'spark',
      impact: 'spark'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'flamethrowericon.png'
      },
      name: 'Flamethrower',
      description: 'Torch the earth around you.',
      rarity: 'rare'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  windsummon: {
    key: 'windsummon',
    type: 'projectile',

    audio: {
      fire: {
        key: 'sfx.weapon.common.wind',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },
    cadence: {
      delayMs: 2000,
      salvo: 1,
      spreadDeg: 15,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 420
    },

    archetype: {
      aim: 'none',
      trajectory: 'circular',
      circular: {
        radius: 72,
        angularVel: 3.5,
        loops: 1.0,
        startPhase: 0,
        radiusInMs: 100
      }
    },

    projectile: {
      texture: 'windsummon',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'windsummon.png',
      frameWidth: 32,
      frameHeight: 32,
      animKey: 'windsummon-spin',
      frameCount: 5,
      frameRate: 12,
      repeat: -1,
      speed: 200,
      pierce: 999,
      lifetimeMs: 2000,
      body: { width: 32, height: 32 },
      poolSize: 120,
      explosion: null,
    },

    damage: {
      base: 12,
      crit: { chance: 0.05, mult: 1.5 },
      status: []
    },

    fx: {
      muzzle: 'spark',
      impact: 'spark'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'windsummonicon.png'
      },
      name: 'Summon Wind',
      description: 'Goddess of Wind brings forth a protective tornado.',
      rarity: 'rare'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  piercingstar: {
    key: 'piercingstar',
    type: 'projectile',

    audio: {
      fire: {
        key: 'sfx.weapon.common.wind',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },
    cadence: {
      delayMs: 2000,
      salvo: 1,
      spreadDeg: 15,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 420
    },

    archetype: {
      aim: 'none',
      trajectory: 'circular',
      circular: {
        radius: 72,
        angularVel: 3.5,
        loops: 1.0,
        startPhase: 0,
        radiusInMs: 100
      }
    },

    projectile: {
      texture: 'piercingstar',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'piercingstar.png',
      frameWidth: 32,
      frameHeight: 32,
      speed: 420,
      pierce: 999,
      lifetimeMs: 2000,
      body: { width: 32, height: 32 },
      poolSize: 120,
      explosion: null,
      spinSpeedRadPerSec: 18 * Math.PI
    },

    damage: {
      base: 12,
      crit: { chance: 0.05, mult: 1.5 },
      status: []
    },

    fx: {
      muzzle: 'spark',
      impact: 'spark'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'piercingstaricon.png'
      },
      name: 'Piercing Star',
      rarity: 'rare',
      description: 'Hurls a spinning star that slices through rows of foes.'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  fireball: {
    key: 'fireball',
    type: 'projectile',

    audio: {
      fire: null,
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 720,
      salvo: 1,
      spreadDeg: 15,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 420
    },

    archetype: {
      aim: 'facing',
      trajectory: 'straight'
    },

    projectile: {
      texture: 'fireball',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'fireball.png',
      frameWidth: 32,
      frameHeight: 32,
      animKey: 'fireball-loop',
      speed: 360,
      pierce: 0,
      lifetimeMs: 1200,
      rotateToVelocity: true, 
      body: { width: 24, height: 24 },
      poolSize: 120,
      explosion: { radius: 96, damageMult: 0.85 }
    },

    damage: {
      base: 12,
      crit: { chance: 0.08, mult: 1.6 },
      status: []
    },

    fx: {
      muzzle: 'spark',
      impact: 'spark'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'fireballicon.png'
      },
      name: 'Fireball',
      description: 'Cast directional fireball with AOE explosion on impact.',
      rarity: 'rare'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  lightning: {
    key: 'lightning',
    type: 'strike',

    audio: {
      fire: {
        key: 'sfx.weapon.lightning.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 1400,
      salvo: 1,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 420
    },

    archetype: {
      aim: 'auto'
    },

    projectile: {
      texture: 'lightning',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'lightning.png',
      frameWidth: 64,
      frameHeight: 128,
      animKey: 'lightning-strike',
      frameCount: 10,
      frameRate: 12,
      repeat: 0,
    },

    damage: {
      base: 14,
      crit: { chance: 0.05, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 96,
      damageMult: 0.6,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'impact'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'lightningicon.png'
      },
      name: 'Thor\u2019s Lightning',
      description: 'Rain forth devastating lightning on closest enemy. Splash damage on impact.',
      rarity: 'epic'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  smite: {
    key: 'smite',
    type: 'strike',

    audio: {
      fire: {
        key: 'sfx.weapon.lightning.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 1700,
      salvo: 1,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 460
    },

    archetype: {
      aim: 'auto'
    },

    projectile: {
      texture: 'smiteanimation',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'smiteanimation.png',
      frameWidth: 64,
      frameHeight: 64,
      animKey: 'smite-strike',
      lifetimeMs: 1100,
      frameCount: 9,
      frameRate: 12,
      repeat: 0,
    },

    damage: {
      base: 15,
      crit: { chance: 0.05, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 150,
      damageMult: 1,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'impact',
      arcDeg: 360,
      innerForgivenessPx: 48
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'smiteicon.png'
      },
      name: 'Smite',
      description: 'Call down a holy strike that crushes a wide area.',
      rarity: 'epic'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  vanquish: {
    key: 'vanquish',
    type: 'strike',

    audio: {
      fire: {
        key: 'sfx.weapon.common.magicclusterexplosion',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 1700,
      salvo: 1,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 460
    },

    archetype: {
      aim: 'auto'
    },

    projectile: {
      texture: 'vanquishanimation',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'vanquishanimation.png',
      frameWidth: 64,
      frameHeight: 64,
      animKey: 'vanquish-strike',
      frameCount: 8,
      frameRate: 12,
      repeat: 0,
      lifetimeMs: 1100
    },

    damage: {
      base: 15,
      crit: { chance: 0.05, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 150,
      damageMult: 1,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'impact',
      arcDeg: 360,
      innerForgivenessPx: 48
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'vanquishicon.png'
      },
      name: 'Vanquish',
      description: 'Dark magic which pulls foes into the underworld.',
      rarity: 'rare'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  uavstrike: {
    key: 'uavstrike',
    type: 'strike',

    audio: {
      fire: {
        key: 'sfx.weapon.common.explosion',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 1700,
      salvo: 1,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 460
    },

    archetype: {
      aim: 'auto'
    },

    projectile: {
      texture: 'uavstrike',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'uavnuke.png',
      frameWidth: 128,
      frameHeight: 128,
      animKey: 'uav-strike',
      frameCount: 12,
      frameRate: 12,
      repeat: 0,
      lifetimeMs: 1100
    },

    damage: {
      base: 15,
      crit: { chance: 0.05, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 150,
      damageMult: 1,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'impact',
      arcDeg: 360,
      innerForgivenessPx: 48
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'auvicon.png'
      },
      name: 'UAV',
      description: 'Call in UAV to drop bomb.',
      rarity: 'epic'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  deathskiss: {
    key: 'deathskiss',
    type: 'strike',

    audio: {
      fire: {
        key: 'sfx.weapon.common.magicclusterexplosion',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 1700,
      salvo: 1,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 460
    },

    archetype: {
      aim: 'auto'
    },

    projectile: {
      texture: 'deathskiss',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'deathskiss.png',
      frameWidth: 64,
      frameHeight: 64,
      animKey: 'death-strike',
      frameCount: 9,
      frameRate: 12,
      repeat: 0,
      lifetimeMs: 1100
    },

    damage: {
      base: 15,
      crit: { chance: 0.05, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 150,
      damageMult: 1,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'impact',
      arcDeg: 360,
      innerForgivenessPx: 48
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'deathskissicon.png'
      },
      name: 'Deaths Kiss',
      description: 'Devasating strike with AOE.',
      rarity: 'epic'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  chainlightning: {
    key: 'chainlightning',
    type: 'chain',

    audio: {
      fire: {
        key: 'sfx.weapon.chainlightning.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 3200,
      salvo: 1,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 520
    },

    archetype: {
      aim: 'auto',
      chain: {
        maxHops: 11,
        hopRadius: 260,
        falloffPerHop: 0.1,
        startFrameIndex: 0,
        frameStride: 1,
        allowRepeat: false
      }
    },

    projectile: {
      texture: 'chainlightning',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'chainlightning.png',
      frameWidth: Math.floor(708 / 11),
      frameHeight: 88,
      animKey: 'chainlightning-play',
      frameCount: 11,
      frameRate: 11,
      repeat: 0,
    },

    damage: {
      base: 25,
      crit: { chance: 0.05, mult: 1.5 },
      status: []
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'chainlightningicon.png'
      },
      name: 'Chain Lightning',
      description: 'Devastating lightning which chains to multiple foes.',
      rarity: 'epic'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.25 },
        cadence: { delayMsMult: 0.95 },
        chain: { maxHopsAdd: 1, hopRadiusAdd: 20, falloffPerHopAdd: -0.01 }
      },
      3: {
        damage: { baseMult: 1.5 },
        cadence: { delayMsMult: 0.9 },
        chain: { maxHopsAdd: 2, hopRadiusAdd: 40, falloffPerHopAdd: -0.02 }
      },
      4: {
        damage: { baseMult: 1.75 },
        cadence: { delayMsMult: 0.85 },
        chain: { maxHopsAdd: 3, hopRadiusAdd: 60, falloffPerHopAdd: -0.03 }
      },
      5: {
        damage: { baseMult: 2.05 },
        cadence: { delayMsMult: 0.8 },
        chain: { maxHopsAdd: 4, hopRadiusAdd: 80, falloffPerHopAdd: -0.04 }
      },
      6: {
        damage: { baseMult: 2.4 },
        cadence: { delayMsMult: 0.75 },
        chain: { maxHopsAdd: 5, hopRadiusAdd: 100, falloffPerHopAdd: -0.05 }
      },
      7: {
        damage: { baseMult: 2.8 },
        cadence: { delayMsMult: 0.7 },
        chain: { maxHopsAdd: 6, hopRadiusAdd: 120, falloffPerHopAdd: -0.06 }
      },
      8: {
        damage: { baseMult: 3.25 },
        cadence: { delayMsMult: 0.65 },
        chain: { maxHopsAdd: 7, hopRadiusAdd: 140, falloffPerHopAdd: -0.07 }
      },
      9: {
        damage: { baseMult: 3.7 },
        cadence: { delayMsMult: 0.6 },
        chain: { maxHopsAdd: 8, hopRadiusAdd: 160, falloffPerHopAdd: -0.08 }
      },
      10: {
        damage: { baseMult: 4.15 },
        cadence: { delayMsMult: 0.55 },
        chain: { maxHopsAdd: 9, hopRadiusAdd: 180, falloffPerHopAdd: -0.09 }
      }
    }
  },

  clusterbomb: {
    key: 'clusterbomb',
    type: 'cluster',

    audio: {
      fire: null,
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 3200,
      salvo: 1,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 120
    },

    archetype: {
      aim: 'auto',
      cluster: {
        count: 3,
        spreadRadius: 72,
        staggerMs: 60
      }
    },

    projectile: {
      texture: 'clusterbomb',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'clusterbomb.png',
      frameWidth: 64,
      frameHeight: 64,
      animKey: 'clusterbomb-explode'
    },

    damage: {
      base: 15,
      crit: { chance: 0, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 96,
      damageMult: 0.9,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'clusterbombicon.png'
      },
      name: 'Cluster Bomb',
      rarity: 'epic'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  greenfire: {
    key: 'greenfire',
    type: 'cluster',

    audio: {
      fire: {
        key: 'sfx.weapon.common.magicclusterexplosion',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 3200,
      salvo: 1,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 120
    },

    archetype: {
      aim: 'auto',
      cluster: {
        count: 6,
        spreadRadius: 72,
        staggerMs: 60
      }
    },

    projectile: {
      texture: 'greenfire',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'greenfire.png',
      frameWidth: 64,
      frameHeight: 64,
      animKey: 'greenfire-explode',
      frameCount: 6,
      frameRate: 12,
      repeat: 0,
    },

    damage: {
      base: 20,
      crit: { chance: 0, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 96,
      damageMult: 0.9,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'greenfireicon.png'
      },
      name: 'Sekhmet\u2019s Revenge',
      rarity: 'legendary'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  sparkcross: {
    key: 'sparkcross',
    type: 'cross',

    audio: {
      fire: {
        key: 'sfx.weapon.sparkcross.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 1600,
      salvo: 1,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 0
    },

    archetype: {
      aim: 'self',
      cross: {
        stepPxPerFrame: 18,
        startAxis: 'h',
        frameStride: 1
      }
    },

    projectile: {
      texture: 'sparkcross',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'sparkcross.png',
      frameWidth: 32,
      frameHeight: 32,
      animKey: 'sparkcross-play',
      frameCount: 7,
      frameRate: 12,
      repeat: 0,
    },

    damage: {
      base: 15,
      crit: { chance: 0.05, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 64,
      damageMult: 1.0,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'sparkcrossicon.png'
      },
      name: 'Spark Cross',
      description: 'Cast a criss cross of magical explosions.',
      rarity: 'rare'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 },
        cross: { stepPxPerFrameAdd: 4 }
      },
      3: {
        damage: { baseMult: 1.4 },
        cadence: { delayMsMult: 0.9 },
        cross: { stepPxPerFrameAdd: 5 },
        aoe: { radiusAdd: 8 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 },
        cross: { stepPxPerFrameAdd: 6 },
        aoe: { radiusAdd: 14 }
      },
      5: {
        damage: { baseMult: 1.95 },
        cadence: { delayMsMult: 0.8 },
        cross: { stepPxPerFrameAdd: 7 },
        aoe: { radiusAdd: 20, damageMultMult: 1.15 }
      },
      6: {
        damage: { baseMult: 2.25 },
        cadence: { delayMsMult: 0.75 },
        cross: { stepPxPerFrameAdd: 8 },
        aoe: { radiusAdd: 26, damageMultMult: 1.25 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 },
        cross: { stepPxPerFrameAdd: 9 },
        aoe: { radiusAdd: 32, damageMultMult: 1.35 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 },
        cross: { stepPxPerFrameAdd: 10 },
        aoe: { radiusAdd: 38, damageMultMult: 1.45 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 },
        cross: { stepPxPerFrameAdd: 11 },
        aoe: { radiusAdd: 44, damageMultMult: 1.55 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 },
        cross: { stepPxPerFrameAdd: 12 },
        aoe: { radiusAdd: 50, damageMultMult: 1.65 }
      }
    }
  },

  spearcross: {
    key: 'spearcross',
    type: 'cross',

    audio: {
      fire: {
        key: 'sfx.weapon.sparkcross.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 1600,
      salvo: 1,
      warmupMs: 0
    },

    targeting: {
      mode: 'self',
      range: 0
    },

    archetype: {
      aim: 'self',
      cross: {
        stepPxPerFrame: 32,
        startAxis: 'h',
        frameStride: 1
      }
    },

    projectile: {
      texture: 'spearcross',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'orbofset.png',
      frameWidth: 32,
      frameHeight: 32,
      animKey: 'spearcross-play',
      frameCount: 6,
      frameRate: 10,
      repeat: 0,
    },

    damage: {
      base: 15,
      crit: { chance: 0.05, mult: 1.5 },
      status: []
    },

    aoe: {
      enabled: true,
      radius: 64,
      damageMult: 1.0,
      maxTargets: Infinity,
      falloff: 0,
      timing: 'animation'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'spearcrossicon.png'
      },
      name: 'Orb of Set',
      description: 'Close quarter annhilation.',
      rarity: 'epic'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },

  lifeeraser: {
    key: 'lifeeraser',
    type: 'projectile',

    audio: {
      fire: {
        key: 'sfx.weapon.lifeeraser.fire',
        volume: 0.9,
        maxSimultaneous: 4,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.05
      },
      hit: {
        key: 'sfx.weapon.common.hit',
        volume: 0.3,
        maxSimultaneous: 3,
        minIntervalMs: 0,
        bus: 'sfx',
        pitchJitter: 0.03
      }
    },

    cadence: {
      delayMs: 650,
      salvo: 1,
      spreadDeg: 15,
      warmupMs: 0
    },

    targeting: {
      mode: 'nearest',
      range: 420
    },

    archetype: {
      aim: 'auto',
      trajectory: 'straight'
    },

    projectile: {
      texture: 'lifeeraser',
      atlas: 'weaponanimations_atlas',
      atlasFrame: 'lifeeraser.png',
      frameWidth: 64,
      frameHeight: 64,
      animKey: 'lifeeraser-fly',
      frameCount: 18,
      frameRate: 20,
      repeat: -1,
      speed: 520,
      pierce: 999,
      lifetimeMs: 1000,
      rotateToVelocity: true,
      body: { width: 40, height: 16 },
      poolSize: 160,
      explosion: null
    },

    damage: {
      base: 25,
      crit: { chance: 0, mult: 1.5 },
      status: []
    },

    fx: {
      muzzle: 'spark',
      impact: 'spark'
    },

    ui: {
      icon: {
        atlas: 'weaponicons_atlas',
        frame: 'lifeerasericon.png'
      },
      name: 'Life Eraser',
      description: 'Auto target. Erases all in its path.',
      rarity: 'legendary'
    },

    levelCurve: 'linear_1_5',
    requirements: { minLevel: 1 },
    modifiers: [],

    progression: {
      2: {
        damage: { baseMult: 1.2 },
        cadence: { delayMsMult: 0.95 }
      },
      3: {
        damage: { baseMult: 1.45 },
        cadence: { delayMsMult: 0.9 }
      },
      4: {
        damage: { baseMult: 1.7 },
        cadence: { delayMsMult: 0.85 }
      },
      5: {
        damage: { baseMult: 2.0 },
        cadence: { delayMsMult: 0.8 }
      },
      6: {
        damage: { baseMult: 2.3 },
        cadence: { delayMsMult: 0.75 }
      },
      7: {
        damage: { baseMult: 2.6 },
        cadence: { delayMsMult: 0.7 }
      },
      8: {
        damage: { baseMult: 3.0 },
        cadence: { delayMsMult: 0.65 }
      },
      9: {
        damage: { baseMult: 3.4 },
        cadence: { delayMsMult: 0.6 }
      },
      10: {
        damage: { baseMult: 3.8 },
        cadence: { delayMsMult: 0.55 }
      }
    }
  },
};
