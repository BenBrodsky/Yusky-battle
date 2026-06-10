// Level spawn data.
// Each entry is either a 'gate' (locks camera, spawns enemies) or a 'pickup'.
// triggerX: camera right-edge world-X that triggers this entry.

export const LEVEL_1 = {
  name:       'The Playground',
  worldWidth: 6400,
  bgColor:    0x87ceeb,
  groundColor:0x6a9a4a,
  bgPanels:   ['level1_bg_a', 'level1_bg_b', 'level1_bg_c', 'level1_bg_d', 'level1_bg_e'],

  entries: [
    // ---- Gate 1 ----
    { type: 'gate', triggerX: 700, gateX: 1100, enemies: [
      { kind: 'meankid', x: 950,  y: 525 },
      { kind: 'meankid', x: 1050, y: 590 },
      { kind: 'meankid', x: 1150, y: 558 },
    ]},
    // ---- Pickups after gate 1 ----
    { type: 'pickup', triggerX: 1100, kind: 'chocolate',  x: 1300, y: 575 },
    { type: 'pickup', triggerX: 1100, kind: 'tvset',       x: 1380, y: 540 },
    { type: 'pickup', triggerX: 1100, kind: 'chicken',     x: 1460, y: 590 },
    { type: 'pickup', triggerX: 1100, kind: 'family_card', x: 1550, y: 565 },

    // ---- Gate 2 ----
    { type: 'gate', triggerX: 1700, gateX: 2200, enemies: [
      { kind: 'meankid', x: 1900, y: 510 },
      { kind: 'meankid', x: 2000, y: 590 },
      { kind: 'meankid', x: 2100, y: 540 },
      { kind: 'meankid', x: 2200, y: 620 },
    ]},
    { type: 'pickup', triggerX: 2200, kind: 'chocolate',  x: 2400, y: 575 },
    { type: 'pickup', triggerX: 2200, kind: 'chicken',     x: 2500, y: 540 },
    { type: 'pickup', triggerX: 2200, kind: 'family_card', x: 2600, y: 590 },

    // ---- Gate 3 ----
    { type: 'gate', triggerX: 2800, gateX: 3400, enemies: [
      { kind: 'meankid', x: 3000, y: 525 },
      { kind: 'meankid', x: 3100, y: 605 },
      { kind: 'meankid', x: 3200, y: 558 },
      { kind: 'meankid', x: 3050, y: 665 },
      { kind: 'meankid', x: 3300, y: 480 },
    ]},
    { type: 'pickup', triggerX: 3400, kind: 'tvset',       x: 3600, y: 575 },
    { type: 'pickup', triggerX: 3400, kind: 'chocolate',  x: 3700, y: 540 },
    { type: 'pickup', triggerX: 3400, kind: 'chicken',     x: 3800, y: 590 },
    { type: 'pickup', triggerX: 3400, kind: 'family_card', x: 3900, y: 565 },

    // ---- Gate 4 (pre-boss) ----
    { type: 'gate', triggerX: 4200, gateX: 4900, enemies: [
      { kind: 'meankid', x: 4400, y: 540 },
      { kind: 'meankid', x: 4500, y: 605 },
      { kind: 'meankid', x: 4600, y: 510 },
      { kind: 'meankid', x: 4700, y: 635 },
      { kind: 'meankid', x: 4800, y: 565 },
      { kind: 'meankid', x: 4400, y: 665 },
    ]},
    { type: 'pickup', triggerX: 4900, kind: 'chocolate',  x: 5100, y: 575 },
    { type: 'pickup', triggerX: 4900, kind: 'tvset',       x: 5200, y: 540 },
    { type: 'pickup', triggerX: 4900, kind: 'chicken',     x: 5300, y: 590 },
    { type: 'pickup', triggerX: 4900, kind: 'family_card', x: 5400, y: 565 },

    // ---- Boss ----
    { type: 'gate', triggerX: 5700, gateX: 6300, enemies: [
      { kind: 'bullykng', x: 6000, y: 575 },
    ]},
  ],
};
