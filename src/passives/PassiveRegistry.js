export const PassiveRegistry = {
  might: {
    key: 'might',
    maxStacks: 1,
    effects: {
      damagePct: 0.25
    },
    ui: {
      name: 'Moonfury',
      rarity: 'rare',
      description: 'Increase damage.',
      icon: {
        atlas: 'passives_atlas',
        frame: 'might.png'
      }
    }
  },

  vampiresKiss: {
    key: 'vampiresKiss',
    maxStacks: 3,
    effects: {
      lifeStealChance: 0.05,
      lifeStealAmount: 5
    },
    ui: {
      name: "Vampire's Kiss",
      rarity: 'rare',
      description: 'Life steal.',
      icon: {
        atlas: 'passives_atlas',
        frame: 'vampireskiss.png'
      }
    }
  },

  multiShot: {
    key: 'multiShot',
    maxStacks: 2,
    effects: {
      projectileSalvoFlat: 2
    },
    ui: {
      name: 'Multi-Shot',
      rarity: 'rare',
      description: 'All projectiles are a triple shot. Extremely powerful.',
      icon: {
        atlas: 'passives_atlas',
        frame: 'multishot.png'
      }
    }
  },

  bloodwindtreads: {
    key: 'bloodwindtreads',
    maxStacks: 3,           // tune as you like
    effects: {
      // e.g. 0.10 = +10% move speed per stack
      moveSpeedPct: 0.10
    },
    ui: {
      name: 'Blood Wind Treads',
      rarity: 'rare',
      description: 'Increase move speed.',
      icon: {
        atlas: 'passives_atlas',
        frame: 'bloodwindtreads.png'
      }
    }
  },

  bloodrush: {
    key: 'bloodrush',
    maxStacks: 3,
    effects: {
      // 0.10 = +10% attack speed per stack (i.e., -10% cooldown)
      attackSpeedPct: 0.10
    },
    ui: {
      name: 'Bloodrush',
      rarity: 'rare',
      description: 'Increase attack speed for all weapons.',
      icon: {
        atlas: 'passives_atlas',
        frame: 'bloodrush.png'
      }
    }
  },
  shield: {
    key: 'shield',
    maxStacks: 3,
    effects: {
      iframeMsBonus: 200
    },
    ui: {
      name: 'Aegis Shield',
      rarity: 'rare',
      description: 'Boosts invulnerability frames after taking damage.',
      icon: {
        atlas: 'passives_atlas',
        frame: 'shield.png'
      }
    }
  },
  reapersReach: {
    key: 'reapersReach',
    maxStacks: 3,
    effects: {
      // +25% radius / speed per stack (tune as you like)
      xpMagnetRadiusPct: 0.25,
      xpMagnetSpeedPct: 0.25,
      xpSnapRadiusPct: 0.15
    },
    ui: {
      name: "Reaper's Reach",
      rarity: 'rare',
      description: 'Greatly increases XP pickup range and pull speed.',
      icon: {
        atlas: 'passives_atlas',
        frame: 'reapersreach.png'
      }
    }
  }

};

/**
 * Guard helper to confirm a passive key exists in the registry.
 */
export function isValidPassive(key) {
  if (typeof key !== 'string') return false;
  return Object.prototype.hasOwnProperty.call(PassiveRegistry, key);
}
