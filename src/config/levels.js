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
      { kind: 'meankid', x: 950,  y: 420 },
      { kind: 'meankid', x: 1050, y: 460 },
      { kind: 'meankid', x: 1150, y: 440 },
    ]},
    // ---- Pickups after gate 1 ----
    { type: 'pickup', triggerX: 1100, kind: 'chocolate',  x: 1300, y: 450 },
    { type: 'pickup', triggerX: 1100, kind: 'tvset',       x: 1380, y: 430 },
    { type: 'pickup', triggerX: 1100, kind: 'chicken',     x: 1460, y: 460 },
    { type: 'pickup', triggerX: 1100, kind: 'family_card', x: 1550, y: 445 },

    // ---- Gate 2 ----
    { type: 'gate', triggerX: 1700, gateX: 2200, enemies: [
      { kind: 'meankid', x: 1900, y: 410 },
      { kind: 'meankid', x: 2000, y: 460 },
      { kind: 'meankid', x: 2100, y: 430 },
      { kind: 'meankid', x: 2200, y: 480 },
    ]},
    { type: 'pickup', triggerX: 2200, kind: 'chocolate',  x: 2400, y: 450 },
    { type: 'pickup', triggerX: 2200, kind: 'chicken',     x: 2500, y: 430 },
    { type: 'pickup', triggerX: 2200, kind: 'family_card', x: 2600, y: 460 },

    // ---- Gate 3 ----
    { type: 'gate', triggerX: 2800, gateX: 3400, enemies: [
      { kind: 'meankid', x: 3000, y: 420 },
      { kind: 'meankid', x: 3100, y: 470 },
      { kind: 'meankid', x: 3200, y: 440 },
      { kind: 'meankid', x: 3050, y: 510 },
      { kind: 'meankid', x: 3300, y: 390 },
    ]},
    { type: 'pickup', triggerX: 3400, kind: 'tvset',       x: 3600, y: 450 },
    { type: 'pickup', triggerX: 3400, kind: 'chocolate',  x: 3700, y: 430 },
    { type: 'pickup', triggerX: 3400, kind: 'chicken',     x: 3800, y: 460 },
    { type: 'pickup', triggerX: 3400, kind: 'family_card', x: 3900, y: 445 },

    // ---- Gate 4 (pre-boss) ----
    { type: 'gate', triggerX: 4200, gateX: 4900, enemies: [
      { kind: 'meankid', x: 4400, y: 430 },
      { kind: 'meankid', x: 4500, y: 470 },
      { kind: 'meankid', x: 4600, y: 410 },
      { kind: 'meankid', x: 4700, y: 490 },
      { kind: 'meankid', x: 4800, y: 445 },
      { kind: 'meankid', x: 4400, y: 510 },
    ]},
    { type: 'pickup', triggerX: 4900, kind: 'chocolate',  x: 5100, y: 450 },
    { type: 'pickup', triggerX: 4900, kind: 'tvset',       x: 5200, y: 430 },
    { type: 'pickup', triggerX: 4900, kind: 'chicken',     x: 5300, y: 460 },
    { type: 'pickup', triggerX: 4900, kind: 'family_card', x: 5400, y: 445 },

    // ---- Boss ----
    { type: 'gate', triggerX: 5700, gateX: 6300, enemies: [
      { kind: 'bullykng', x: 6000, y: 450 },
    ]},
  ],
};
