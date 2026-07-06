// Level spawn data.
// Each entry is either a 'gate' (locks camera, spawns enemies) or a 'pickup'.
// triggerX: camera right-edge world-X that triggers this entry.
//
// Level 1 pacing (classic arcade curve):
//   warm-up → speedies (hit-and-run) → throwers (ranged pest) → swarm →
//   first bruiser → full brawl → bruiser wall → final rush → the throne.
//
// Background: 8 segments of 1280px, each overlapping the previous by 140px
// with a baked-in crossfade (see GameScene._buildBackground). The sequence
// reuses the middle scenes and saves the Bully King's throne for the end.
// worldWidth = 8 * 1280 - 7 * 140 = 9260.

export const LEVEL_1 = {
  name:       'The Playground',
  worldWidth: 9260,
  bgColor:    0x87ceeb,
  groundColor:0x6a9a4a,
  bgSequence: [
    'level1_bg_a',  // playground entrance
    'level1_bg_b',  // swings & slide
    'level1_bg_d',  // seesaw & sandbox
    'level1_bg_c',  // ball courts
    'level1_bg_b',
    'level1_bg_d',
    'level1_bg_c',
    'level1_bg_e',  // KING BULLY's throne
  ],

  entries: [
    // ---- Gate 1: warm-up, learn the controls ----
    { type: 'gate', triggerX: 500, gateX: 850, enemies: [
      { kind: 'meankid', x: 700,  y: 540 },
      { kind: 'meankid', x: 820,  y: 598 },
      { kind: 'meankid', x: 920,  y: 565 },
    ]},
    { type: 'pickup', triggerX: 850, kind: 'chocolate',   x: 1020, y: 583 },
    { type: 'pickup', triggerX: 850, kind: 'tvset',       x: 1100, y: 556 },

    // ---- Gate 2: speedies introduced — they dart in, jab, and bolt ----
    { type: 'gate', triggerX: 1450, gateX: 1800, enemies: [
      { kind: 'meankid', x: 1560, y: 530 },
      { kind: 'meankid', x: 1680, y: 610 },
      { kind: 'speedy',  x: 1780, y: 560 },
      { kind: 'speedy',  x: 1640, y: 655 },
    ]},
    { type: 'pickup', triggerX: 1800, kind: 'chicken',     x: 1950, y: 590 },
    { type: 'pickup', triggerX: 1800, kind: 'family_card', x: 2040, y: 570 },

    // ---- Gate 3: first thrower — someone's lobbing dodgeballs ----
    { type: 'gate', triggerX: 2500, gateX: 2850, enemies: [
      { kind: 'meankid', x: 2600, y: 520 },
      { kind: 'meankid', x: 2720, y: 600 },
      { kind: 'speedy',  x: 2660, y: 655 },
      { kind: 'thrower', x: 2940, y: 585 },
    ]},
    { type: 'pickup', triggerX: 2850, kind: 'chocolate',  x: 3000, y: 583 },

    // ---- Gate 4: speedy swarm + thrower — pure pressure ----
    { type: 'gate', triggerX: 3600, gateX: 3950, enemies: [
      { kind: 'speedy',  x: 3700, y: 520 },
      { kind: 'speedy',  x: 3800, y: 600 },
      { kind: 'speedy',  x: 3900, y: 550 },
      { kind: 'speedy',  x: 3760, y: 660 },
      { kind: 'thrower', x: 4020, y: 585 },
    ]},
    { type: 'pickup', triggerX: 3950, kind: 'tvset',   x: 4100, y: 560 },
    { type: 'pickup', triggerX: 3950, kind: 'chicken', x: 4180, y: 600 },

    // ---- Gate 5: first BRUISER — the big purple kid demands respect ----
    { type: 'gate', triggerX: 4700, gateX: 5050, enemies: [
      { kind: 'bruiser', x: 4850, y: 575 },
      { kind: 'meankid', x: 4960, y: 530 },
      { kind: 'meankid', x: 4780, y: 645 },
    ]},
    { type: 'pickup', triggerX: 5050, kind: 'chocolate',   x: 5200, y: 583 },
    { type: 'pickup', triggerX: 5050, kind: 'family_card', x: 5280, y: 565 },

    // ---- Gate 6: full playground brawl ----
    { type: 'gate', triggerX: 5800, gateX: 6150, enemies: [
      { kind: 'meankid', x: 5900, y: 525 },
      { kind: 'meankid', x: 6020, y: 605 },
      { kind: 'speedy',  x: 6100, y: 550 },
      { kind: 'thrower', x: 6220, y: 660 },
      { kind: 'bruiser', x: 6180, y: 580 },
    ]},

    // ---- Gate 7: bruiser wall — the mini-boss beat ----
    { type: 'gate', triggerX: 6800, gateX: 7150, enemies: [
      { kind: 'bruiser', x: 6920, y: 545 },
      { kind: 'bruiser', x: 7060, y: 625 },
      { kind: 'speedy',  x: 6980, y: 580 },
    ]},
    { type: 'pickup', triggerX: 7150, kind: 'chicken',     x: 7300, y: 585 },
    { type: 'pickup', triggerX: 7150, kind: 'tvset',       x: 7380, y: 555 },
    { type: 'pickup', triggerX: 7150, kind: 'family_card', x: 7460, y: 600 },

    // ---- Gate 8: the final rush before the king ----
    { type: 'gate', triggerX: 7900, gateX: 8250, enemies: [
      { kind: 'meankid', x: 8000, y: 520 },
      { kind: 'meankid', x: 8120, y: 600 },
      { kind: 'speedy',  x: 8200, y: 545 },
      { kind: 'speedy',  x: 8060, y: 660 },
      { kind: 'thrower', x: 8300, y: 585 },
      { kind: 'bruiser', x: 8240, y: 620 },
    ]},
    // Heal up before the throne
    { type: 'pickup', triggerX: 8250, kind: 'chicken',   x: 8450, y: 585 },
    { type: 'pickup', triggerX: 8250, kind: 'chocolate', x: 8530, y: 560 },

    // ---- Boss: THE BULLY KING, on his throne ----
    { type: 'gate', triggerX: 8900, gateX: 9200, enemies: [
      { kind: 'bullykng', x: 9050, y: 583 },
    ]},
  ],
};
