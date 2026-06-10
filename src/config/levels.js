// Level spawn data.
// Each entry is either a 'gate' (locks camera, spawns enemies) or a 'pickup'.
// triggerX: camera right-edge world-X that triggers this entry.

export const LEVEL_1 = {
  name:       'The Playground',
  worldWidth: 6400,
  bgColor:    0x87ceeb,
  groundColor:0x6a9a4a,
  bgImage:    'level1_bg',

  entries: [
    // ---- Gate 1 ----
    { type: 'gate', triggerX: 700, gateX: 1100, enemies: [
      { kind: 'meankid', x: 950,  y: 540 },
      { kind: 'meankid', x: 1050, y: 598 },
      { kind: 'meankid', x: 1150, y: 570 },
    ]},
    // ---- Pickups after gate 1 ----
    { type: 'pickup', triggerX: 1100, kind: 'chocolate',  x: 1300, y: 583 },
    { type: 'pickup', triggerX: 1100, kind: 'tvset',       x: 1380, y: 556 },
    { type: 'pickup', triggerX: 1100, kind: 'chicken',     x: 1460, y: 598 },
    { type: 'pickup', triggerX: 1100, kind: 'family_card', x: 1550, y: 577 },

    // ---- Gate 2 ----
    { type: 'gate', triggerX: 1700, gateX: 2200, enemies: [
      { kind: 'meankid', x: 1900, y: 529 },
      { kind: 'meankid', x: 2000, y: 598 },
      { kind: 'meankid', x: 2100, y: 556 },
      { kind: 'meankid', x: 2200, y: 625 },
    ]},
    { type: 'pickup', triggerX: 2200, kind: 'chocolate',  x: 2400, y: 583 },
    { type: 'pickup', triggerX: 2200, kind: 'chicken',     x: 2500, y: 556 },
    { type: 'pickup', triggerX: 2200, kind: 'family_card', x: 2600, y: 598 },

    // ---- Gate 3 ----
    { type: 'gate', triggerX: 2800, gateX: 3400, enemies: [
      { kind: 'meankid', x: 3000, y: 540 },
      { kind: 'meankid', x: 3100, y: 611 },
      { kind: 'meankid', x: 3200, y: 570 },
      { kind: 'meankid', x: 3050, y: 666 },
      { kind: 'meankid', x: 3300, y: 500 },
    ]},
    { type: 'pickup', triggerX: 3400, kind: 'tvset',       x: 3600, y: 583 },
    { type: 'pickup', triggerX: 3400, kind: 'chocolate',  x: 3700, y: 556 },
    { type: 'pickup', triggerX: 3400, kind: 'chicken',     x: 3800, y: 598 },
    { type: 'pickup', triggerX: 3400, kind: 'family_card', x: 3900, y: 577 },

    // ---- Gate 4 (pre-boss) ----
    { type: 'gate', triggerX: 4200, gateX: 4900, enemies: [
      { kind: 'meankid', x: 4400, y: 556 },
      { kind: 'meankid', x: 4500, y: 611 },
      { kind: 'meankid', x: 4600, y: 529 },
      { kind: 'meankid', x: 4700, y: 638 },
      { kind: 'meankid', x: 4800, y: 577 },
      { kind: 'meankid', x: 4400, y: 666 },
    ]},
    { type: 'pickup', triggerX: 4900, kind: 'chocolate',  x: 5100, y: 583 },
    { type: 'pickup', triggerX: 4900, kind: 'tvset',       x: 5200, y: 556 },
    { type: 'pickup', triggerX: 4900, kind: 'chicken',     x: 5300, y: 598 },
    { type: 'pickup', triggerX: 4900, kind: 'family_card', x: 5400, y: 577 },

    // ---- Boss ----
    { type: 'gate', triggerX: 5700, gateX: 6300, enemies: [
      { kind: 'bullykng', x: 6000, y: 583 },
    ]},
  ],
};
