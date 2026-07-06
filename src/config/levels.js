// Level spawn data.
// Each entry is either a 'gate' (locks camera, spawns enemies) or a 'pickup'.
// triggerX: camera right-edge world-X that triggers this entry.
//
// Level 1 pacing (classic arcade curve):
//   warm-up → mix in speedies → first bruiser shock → swarm pressure →
//   bruiser wall (mini-boss beat) → breather with heals → final rush → king.

export const LEVEL_1 = {
  name:       'The Playground',
  worldWidth: 9600,
  bgColor:    0x87ceeb,
  groundColor:0x6a9a4a,
  // Background variants laid side by side — scenery changes as you advance
  bgImages: ['level1_bg', 'level1_bg_a', 'level1_bg_b', 'level1_bg_c', 'level1_bg_d', 'level1_bg_e'],

  entries: [
    // ---- Gate 1: warm-up, learn the controls ----
    { type: 'gate', triggerX: 500, gateX: 850, enemies: [
      { kind: 'meankid', x: 700,  y: 540 },
      { kind: 'meankid', x: 820,  y: 598 },
      { kind: 'meankid', x: 920,  y: 565 },
    ]},
    { type: 'pickup', triggerX: 850, kind: 'chocolate',   x: 1020, y: 583 },
    { type: 'pickup', triggerX: 850, kind: 'tvset',       x: 1100, y: 556 },

    // ---- Gate 2: speedies introduced — they dart and flank ----
    { type: 'gate', triggerX: 1450, gateX: 1800, enemies: [
      { kind: 'meankid', x: 1560, y: 530 },
      { kind: 'meankid', x: 1680, y: 610 },
      { kind: 'speedy',  x: 1780, y: 560 },
      { kind: 'speedy',  x: 1640, y: 655 },
    ]},
    { type: 'pickup', triggerX: 1800, kind: 'chicken',     x: 1950, y: 590 },
    { type: 'pickup', triggerX: 1800, kind: 'family_card', x: 2040, y: 570 },

    // ---- Gate 3: bigger mixed pack ----
    { type: 'gate', triggerX: 2500, gateX: 2850, enemies: [
      { kind: 'meankid', x: 2600, y: 520 },
      { kind: 'meankid', x: 2720, y: 600 },
      { kind: 'meankid', x: 2840, y: 545 },
      { kind: 'speedy',  x: 2660, y: 655 },
      { kind: 'speedy',  x: 2900, y: 585 },
    ]},
    { type: 'pickup', triggerX: 2850, kind: 'chocolate',  x: 3000, y: 583 },

    // ---- Gate 4: speedy swarm — pure pressure, keep your head on a swivel ----
    { type: 'gate', triggerX: 3600, gateX: 3950, enemies: [
      { kind: 'speedy', x: 3700, y: 520 },
      { kind: 'speedy', x: 3800, y: 600 },
      { kind: 'speedy', x: 3900, y: 550 },
      { kind: 'speedy', x: 3760, y: 660 },
      { kind: 'speedy', x: 3990, y: 585 },
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
      { kind: 'speedy',  x: 5960, y: 660 },
      { kind: 'bruiser', x: 6180, y: 580 },
    ]},

    // ---- Gate 7: bruiser wall — the mini-boss beat ----
    { type: 'gate', triggerX: 6900, gateX: 7250, enemies: [
      { kind: 'bruiser', x: 7020, y: 545 },
      { kind: 'bruiser', x: 7160, y: 625 },
      { kind: 'speedy',  x: 7080, y: 580 },
    ]},
    { type: 'pickup', triggerX: 7250, kind: 'chicken',     x: 7400, y: 585 },
    { type: 'pickup', triggerX: 7250, kind: 'tvset',       x: 7480, y: 555 },
    { type: 'pickup', triggerX: 7250, kind: 'family_card', x: 7560, y: 600 },

    // ---- Gate 8: the final rush before the king ----
    { type: 'gate', triggerX: 8100, gateX: 8450, enemies: [
      { kind: 'meankid', x: 8200, y: 520 },
      { kind: 'meankid', x: 8320, y: 600 },
      { kind: 'speedy',  x: 8400, y: 545 },
      { kind: 'speedy',  x: 8260, y: 660 },
      { kind: 'speedy',  x: 8480, y: 585 },
      { kind: 'bruiser', x: 8440, y: 620 },
    ]},
    // Heal up before the throne room
    { type: 'pickup', triggerX: 8450, kind: 'chicken',   x: 8650, y: 585 },
    { type: 'pickup', triggerX: 8450, kind: 'chocolate', x: 8730, y: 560 },

    // ---- Boss: THE BULLY KING ----
    { type: 'gate', triggerX: 9000, gateX: 9350, enemies: [
      { kind: 'bullykng', x: 9200, y: 583 },
    ]},
  ],
};
