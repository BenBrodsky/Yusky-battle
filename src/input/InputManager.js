import Phaser from 'phaser';

// Keyboard bindings per player slot
const KB_BINDINGS = [
  // Player 1: Arrow keys + Space/X/C/Enter
  {
    left:   Phaser.Input.Keyboard.KeyCodes.LEFT,
    right:  Phaser.Input.Keyboard.KeyCodes.RIGHT,
    up:     Phaser.Input.Keyboard.KeyCodes.UP,
    down:   Phaser.Input.Keyboard.KeyCodes.DOWN,
    jump:   Phaser.Input.Keyboard.KeyCodes.SPACE,
    attack: Phaser.Input.Keyboard.KeyCodes.X,
    hug:    Phaser.Input.Keyboard.KeyCodes.C,
    start:  Phaser.Input.Keyboard.KeyCodes.ENTER,
  },
  // Player 2: WASD + Q/E/R/T
  {
    left:   Phaser.Input.Keyboard.KeyCodes.A,
    right:  Phaser.Input.Keyboard.KeyCodes.D,
    up:     Phaser.Input.Keyboard.KeyCodes.W,
    down:   Phaser.Input.Keyboard.KeyCodes.S,
    jump:   Phaser.Input.Keyboard.KeyCodes.Q,
    attack: Phaser.Input.Keyboard.KeyCodes.E,
    hug:    Phaser.Input.Keyboard.KeyCodes.R,
    start:  Phaser.Input.Keyboard.KeyCodes.T,
  },
];

// Gamepad button mappings (Standard Layout)
const PAD_MAP = {
  jump:   0,  // A / Cross
  attack: 2,  // X / Square
  hug:    3,  // Y / Triangle
  start:  9,  // Start
  dpad_l: 14,
  dpad_r: 15,
  dpad_u: 12,
  dpad_d: 13,
};

export class InputManager {
  constructor(scene, playerConfigs) {
    this.scene   = scene;
    this.configs = playerConfigs; // [{inputType:'keyboard'|'gamepad', gamepadIndex:n}, ...]
    this.states  = playerConfigs.map(() => this._emptyState());
    this.prev    = playerConfigs.map(() => this._emptyState());

    this._keys = [];
    for (let i = 0; i < Math.min(playerConfigs.length, KB_BINDINGS.length); i++) {
      if (playerConfigs[i].inputType === 'keyboard') {
        this._keys[i] = scene.input.keyboard.addKeys(KB_BINDINGS[i]);
      }
    }
  }

  _emptyState() {
    return { left:false, right:false, up:false, down:false,
             jump:false, attack:false, hug:false, start:false,
             jumpJust:false, attackJust:false, hugJust:false, startJust:false,
             axisX:0, axisY:0 };
  }

  update() {
    const pads = this.scene.input.gamepad ? this.scene.input.gamepad.gamepads : [];

    this.configs.forEach((cfg, i) => {
      const prev  = this.states[i];
      const state = this._emptyState();

      if (cfg.inputType === 'keyboard' && this._keys[i]) {
        const k = this._keys[i];
        state.left   = k.left.isDown;
        state.right  = k.right.isDown;
        state.up     = k.up.isDown;
        state.down   = k.down.isDown;
        state.jump   = k.jump.isDown;
        state.attack = k.attack.isDown;
        state.hug    = k.hug.isDown;
        state.start  = k.start.isDown;
      } else if (cfg.inputType === 'gamepad') {
        const pad = pads[cfg.gamepadIndex];
        if (pad) {
          const ax = pad.axes[0] ? pad.axes[0].getValue() : 0;
          const ay = pad.axes[1] ? pad.axes[1].getValue() : 0;
          state.axisX = ax;
          state.axisY = ay;
          state.left   = ax < -0.3 || pad.buttons[PAD_MAP.dpad_l]?.pressed;
          state.right  = ax >  0.3 || pad.buttons[PAD_MAP.dpad_r]?.pressed;
          state.up     = ay < -0.3 || pad.buttons[PAD_MAP.dpad_u]?.pressed;
          state.down   = ay >  0.3 || pad.buttons[PAD_MAP.dpad_d]?.pressed;
          state.jump   = pad.buttons[PAD_MAP.jump]?.pressed   ?? false;
          state.attack = pad.buttons[PAD_MAP.attack]?.pressed ?? false;
          state.hug    = pad.buttons[PAD_MAP.hug]?.pressed    ?? false;
          state.start  = pad.buttons[PAD_MAP.start]?.pressed  ?? false;
        }
      }

      // Compute "just pressed" (edge detect)
      state.jumpJust   = state.jump   && !prev.jump;
      state.attackJust = state.attack && !prev.attack;
      state.hugJust    = state.hug    && !prev.hug;
      state.startJust  = state.start  && !prev.start;

      this.prev[i]   = prev;
      this.states[i] = state;
    });
  }

  getInput(playerIndex) {
    return this.states[playerIndex] || this._emptyState();
  }
}
