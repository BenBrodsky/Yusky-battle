export const GAME_WIDTH  = 1280;
export const GAME_HEIGHT = 720;

// The walkable floor band (Y in screen/world space)
export const FLOOR_TOP    = 360;
export const FLOOR_BOTTOM = 520;

// Physics
export const GRAVITY       = 1800;   // px/s^2 downward for jump arc
export const JUMP_VELOCITY = 680;    // px/s upward on jump
export const WALK_SPEED    = 200;    // px/s horizontal
export const DEPTH_SPEED   = 150;    // px/s vertical (depth movement)

// Combat
export const MELEE_RANGE  = 90;   // px - if enemy closer than this, melee instead of ranged
export const ATTACK_REACH = 85;   // px - how far a melee attack hitbox extends
export const HURT_FRAMES  = 0.35; // seconds of hurt stun
export const KO_BLINK     = 3.0;  // seconds of blinking before disappear
export const INVULN_TIME  = 0.6;  // seconds of invulnerability after being hit

// Colors (ARGB hex for Phaser tints / fill)
export const COLORS = {
  BEN:           0x2255cc,
  LINDA:         0xdd6622,
  MILES:         0x22aa44,
  OCEAN:         0xffcc00,
  ENEMY_MEANKID: 0xcc2222,
  SHADOW:        0x000000,
};

// Per-character design configs
export const CHAR_CONFIGS = {
  ben: {
    key:         'ben',
    name:        'Ben',
    color:       COLORS.BEN,
    width:       56,
    height:      88,
    maxHP:       160,
    speed:       175,
    depthSpeed:  145,
    healFromHug: 30,
    description: 'Tank grappler. Close range only.\nHeals from family hugs.',
  },
  linda: {
    key:         'linda',
    name:        'Linda',
    color:       COLORS.LINDA,
    width:       44,
    height:      76,
    maxHP:       115,
    speed:       200,
    depthSpeed:  165,
    meleeDmg:    18,
    rangedDmg:   13,  // long range (2/3 screen), lower damage
    description: 'Tennis racket & long lob (2/3 screen).\nHeals from chicken legs.',
  },
  miles: {
    key:         'miles',
    name:        'Miles',
    color:       COLORS.MILES,
    width:       44,
    height:      70,
    maxHP:       110,
    speed:       210,
    depthSpeed:  170,
    meleeDmg:    16,
    ballDmg:     26,  // short range (1/3 screen), higher damage
    superMult:   2.0,
    superFill:   0.18,  // fraction of nuclear bar per hit landed
    description: 'Soccer ball (1/3 screen, hard).\nNuclear super when bar fills.',
  },
  ocean: {
    key:         'ocean',
    name:        'Ocean',
    color:       COLORS.OCEAN,
    width:       38,
    height:      62,
    maxHP:       95,
    speed:       245,
    depthSpeed:  190,
    meleeDmg:    20,
    stompDmg:    30,
    maxEnergy:   100,
    energyDrain: 2.0,   // per second while moving
    attackDrain: 7,     // per attack
    napDuration: 10.0,  // seconds
    description: 'Burst energy. Naps when drained.\nStomp downed enemies.',
  },
};

export const CHAR_ORDER = ['ben', 'linda', 'miles', 'ocean'];

// Input button indices (abstract)
export const BTN_JUMP   = 0;  // A / Cross / Z key
export const BTN_ATTACK = 1;  // X / Square / X key
export const BTN_HUG    = 2;  // Y / Triangle / C key
export const BTN_START  = 9;  // Start button

// Gamepad axis / button indices (Standard Gamepad API)
export const PAD_A      = 0;
export const PAD_B      = 1;
export const PAD_X      = 2;
export const PAD_Y      = 3;
export const PAD_START  = 9;
export const PAD_DPAD_U = 12;
export const PAD_DPAD_D = 13;
export const PAD_DPAD_L = 14;
export const PAD_DPAD_R = 15;

// Password save word list (32 family-themed words → 5 bits each)
export const WORD_LIST = [
  'OOSE','HUG','KICK','VAN','BALL','NAP','SMASH','SERVE',
  'STOMP','ROAR','GLOW','SPIN','DASH','BLOCK','JUMP','THROW',
  'MILES','OCEAN','LINDA','BEN','MIKE','MAX','BOARD','HAMMER',
  'CHOCO','TV','CHICKEN','CARD','BOSS','LEVEL','SUPER','STAR',
];
