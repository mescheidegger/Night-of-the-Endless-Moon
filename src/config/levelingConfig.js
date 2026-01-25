export const LEVELING = {
  STRATEGY: 'polynomial',
  CAP: 99,

  // (TABLE/EXP can stay, but unused while STRATEGY === 'polynomial')
  TABLE: [0, 0, 10, 25, 45, 70],
  POLY: { BASE: 6, POWER: 2.0, GROWTH: 4 },
  EXP:  { BASE: 5, R: 1.25 },

  // --- Tuning knobs ---
  SCALE: 1.0, // start at 1.0 so L1–12 stays basically identical
  KINK: {
    LEVEL: 12,   // start slowing after L12
    SLOPE: 0.25, // +10% threshold per level after 12
    MAX: 2.0,    // cap the slowdown so it doesn’t get silly
  },
};
