// Level spawn data.
// Each entry is either a 'gate' (locks camera, spawns enemies) or a 'pickup'.
// triggerX: camera right-edge world-X that triggers this entry.

export const LEVEL_1 = {
  name:       'The Playground',
  worldWidth: 2400,
  bgColor:    0x87ceeb,
  groundColor:0x6a9a4a,
  bgImage:    'level1_bg',

  entries: [
    // ---- Gate 1 ----
    { type: 'gate', triggerX: 500, gateX: 850, enemies: [
      { kind: 'meankid', x: 700,  y: 540 },
      { kind: 'meankid', x: 800,  y: 598 },
      { kind: 'meankid', x: 900,  y: 570 },
    ]},
    // ---- Pickups after gate 1 ----
    { type: 'pickup', triggerX: 850, kind: 'chocolate',  x: 1000, y: 583 },
    { type: 'pickup', triggerX: 850, kind: 'tvset',       x: 1080, y: 556 },
    { type: 'pickup', triggerX: 850, kind: 'chicken',     x: 1160, y: 598 },
    { type: 'pickup', triggerX: 850, kind: 'family_card', x: 1240, y: 577 },

    // ---- Gate 2 ----
    { type: 'gate', triggerX: 1400, gateX: 1750, enemies: [
      { kind: 'meankid', x: 1500, y: 529 },
      { kind: 'meankid', x: 1600, y: 598 },
      { kind: 'meankid', x: 1700, y: 556 },
      { kind: 'meankid', x: 1550, y: 640 },
    ]},
    { type: 'pickup', triggerX: 1750, kind: 'chocolate',  x: 1850, y: 583 },
    { type: 'pickup', triggerX: 1750, kind: 'tvset',       x: 1930, y: 556 },
    { type: 'pickup', triggerX: 1750, kind: 'chicken',     x: 2010, y: 598 },
    { type: 'pickup', triggerX: 1750, kind: 'family_card', x: 2090, y: 577 },

    // ---- Boss ----
    { type: 'gate', triggerX: 2150, gateX: 2350, enemies: [
      { kind: 'bullykng', x: 2250, y: 583 },
    ]},
  ],
};
