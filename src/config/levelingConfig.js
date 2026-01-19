export const LEVELING = {
  STRATEGY: 'polynomial', // 'table' | 'polynomial' | 'exponential'
  CAP: 99,
  TABLE: [
    0,   // L0 (unused)
    0,   // L1
    10,  // L2
    25,  // L3
    45,  // L4
    70,  // L5
  ],
  POLY: { BASE: 6, POWER: 2.0, GROWTH: 4 }, // cumulative XP to reach level N
  EXP:  { BASE: 5, R: 1.25 },               // cumulative XP to reach level N
};
