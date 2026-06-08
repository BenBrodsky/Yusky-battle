import Phaser from 'phaser';
import { CHAR_CONFIGS, CHAR_ORDER, COLORS } from '../config/constants.js';

const PLAYER_COLORS = [0xffff00, 0x00ffff, 0xff44ff, 0x44ff44];
const PLAYER_LABELS = ['P1', 'P2', 'P3', 'P4'];

export class CharacterSelectScene extends Phaser.Scene {
  constructor() { super('CharacterSelect'); }

  preload() {
    this.load.image('select_bg', 'character-select-bg.png');
    CHAR_ORDER.forEach(key => {
      this.load.image(`portrait_${key}`, `${key}-portrait.png`);
    });
  }

  create() {
    const { width: W, height: H } = this.scale;

    if (this.textures.exists('select_bg')) {
      this.add.image(W / 2, H / 2, 'select_bg').setDisplaySize(W, H);
      // Dark overlay so cards and text stay readable
      this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.45);
    } else {
      this.add.rectangle(W / 2, H / 2, W, H, 0x111133);
    }

    this.add.text(W / 2, 40, 'CHOOSE YOUR FIGHTER', {
      fontSize: '36px', fontStyle: 'bold',
      fill: '#ffdd00', stroke: '#664400', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(W / 2, 82, 'Up to 4 players — unselected slots run CPU', {
      fontSize: '16px', fill: '#888888',
    }).setOrigin(0.5);

    // ---- Portrait grid ----
    this.portraits   = [];
    this.selectedBy  = new Array(4).fill(-1); // selectedBy[charIdx] = playerIdx or -1

    const charW = 220, charH = 320;
    const startX = W / 2 - (CHAR_ORDER.length - 1) * (charW + 20) / 2;

    CHAR_ORDER.forEach((key, ci) => {
      const cfg = CHAR_CONFIGS[key];
      const x   = startX + ci * (charW + 20);
      const y   = H * 0.46;

      // Card background
      const card = this.add.rectangle(x, y, charW, charH, 0x222244)
        .setStrokeStyle(3, 0x4444aa);

      // Portrait image or colored block fallback
      const portraitKey = `portrait_${key}`;
      if (this.textures.exists(portraitKey)) {
        const portraitAreaW = charW - 20;
        const portraitAreaH = charH * 0.62;
        const img = this.add.image(x, y - 44, portraitKey).setOrigin(0.5);
        // Scale to fill the card area while preserving aspect ratio (cover-style)
        const scale = Math.max(portraitAreaW / img.width, portraitAreaH / img.height);
        img.setScale(scale);
        // Mask to card bounds so overflow is hidden
        const mask = this.add.graphics();
        mask.fillRect(x - portraitAreaW / 2, y - 44 - portraitAreaH / 2, portraitAreaW, portraitAreaH);
        img.setMask(mask.createGeometryMask());
      } else {
        // Fallback: colored rectangle with eyes
        this.add.rectangle(x, y - 50, charW - 20, charH * 0.55, cfg.color);
        this.add.rectangle(x - 14, y - 80, 16, 16, 0xffffff);
        this.add.rectangle(x + 14, y - 80, 16, 16, 0xffffff);
        this.add.rectangle(x - 11, y - 80,  8,  8, 0x000000);
        this.add.rectangle(x + 17, y - 80,  8,  8, 0x000000);
      }

      // Name
      this.add.text(x, y + 72, cfg.name, {
        fontSize: '22px', fontStyle: 'bold',
        fill: '#ffffff', stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5);

      // Description
      this.add.text(x, y + 96, cfg.description, {
        fontSize: '12px', fill: '#aaaaaa', align: 'center',
        wordWrap: { width: charW - 16 },
      }).setOrigin(0.5, 0);

      // Selection indicator overlay (starts hidden)
      const overlay = this.add.rectangle(x, y, charW, charH, 0xffffff, 0)
        .setStrokeStyle(5, 0xffffff, 0);
      const badge = this.add.text(x, y - charH / 2 + 16, '', {
        fontSize: '18px', fontStyle: 'bold',
        fill: '#000000', backgroundColor: '#ffffff',
        padding: { x: 6, y: 2 },
      }).setOrigin(0.5).setVisible(false);

      this.portraits.push({ x, y, card, overlay, badge, key });
    });

    // ---- Player cursors ----
    // Each cursor is a colored ring that moves between portraits.
    this.cursors = [];
    for (let pi = 0; pi < 4; pi++) {
      const cursor = this.add.rectangle(
        this.portraits[0].x, this.portraits[0].y,
        240, 340, 0, 0
      ).setStrokeStyle(4, PLAYER_COLORS[pi], 0);
      cursor.cursorPos    = 0;
      cursor.locked       = false;
      cursor.inputType    = pi < 2 ? 'keyboard' : 'gamepad';
      cursor.gamepadIndex = pi;
      cursor.joined       = pi === 0; // P1 always joined
      this.cursors.push(cursor);
    }

    // ---- Input ----
    // P1 keyboard
    this.keys1 = this.input.keyboard.addKeys({
      left:   Phaser.Input.Keyboard.KeyCodes.LEFT,
      right:  Phaser.Input.Keyboard.KeyCodes.RIGHT,
      attack: Phaser.Input.Keyboard.KeyCodes.X,
      start:  Phaser.Input.Keyboard.KeyCodes.ENTER,
    });
    // P2 keyboard
    this.keys2 = this.input.keyboard.addKeys({
      left:   Phaser.Input.Keyboard.KeyCodes.A,
      right:  Phaser.Input.Keyboard.KeyCodes.D,
      attack: Phaser.Input.Keyboard.KeyCodes.E,
      start:  Phaser.Input.Keyboard.KeyCodes.T,
    });

    this.prevKeys1 = {};
    this.prevKeys2 = {};

    // Start button text
    this.startHint = this.add.text(W / 2, H - 38, 'P1: Press ENTER / Start to begin', {
      fontSize: '20px', fill: '#ffffff', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this.startHint, alpha: 0.2, duration: 500, yoyo: true, repeat: -1,
    });

    // Gamepad join detection
    if (this.input.gamepad) {
      this.input.gamepad.on('down', (pad, button) => {
        const pi = pad.index + 2; // pad 0 = P3, pad 1 = P4, etc.
        if (pi < 4 && !this.cursors[pi].joined && button.index === 0) {
          this.cursors[pi].joined = true;
          this.cursors[pi].setStrokeStyle(4, PLAYER_COLORS[pi], 1);
        }
      });
    }

    // Direct keyboard listeners — immune to JustDown frame-timing issues
    this.input.keyboard.on('keydown-ENTER', () => this._startGame());
    this.input.keyboard.on('keydown-T',     () => this._startGame());

    // Show P1 cursor immediately
    this.cursors[0].setStrokeStyle(4, PLAYER_COLORS[0], 1);
    this._refreshPortraits();
  }

  update() {
    const pads = this.input.gamepad ? this.input.gamepad.gamepads : [];

    this.cursors.forEach((cursor, pi) => {
      if (!cursor.joined) return;

      let moveLeft = false, moveRight = false, select = false;

      if (pi === 0) {
        moveLeft  = !cursor.locked && Phaser.Input.Keyboard.JustDown(this.keys1.left);
        moveRight = !cursor.locked && Phaser.Input.Keyboard.JustDown(this.keys1.right);
        select    = !cursor.locked && Phaser.Input.Keyboard.JustDown(this.keys1.attack);
      } else if (pi === 1) {
        moveLeft  = !cursor.locked && Phaser.Input.Keyboard.JustDown(this.keys2.left);
        moveRight = !cursor.locked && Phaser.Input.Keyboard.JustDown(this.keys2.right);
        select    = !cursor.locked && Phaser.Input.Keyboard.JustDown(this.keys2.attack);
      } else {
        const pad = pads[pi - 2];
        if (pad) {
          const ax = pad.axes[0] ? pad.axes[0].getValue() : 0;
          moveLeft  = !cursor.locked && (ax < -0.5 || pad.buttons[14]?.pressed);
          moveRight = !cursor.locked && (ax >  0.5 || pad.buttons[15]?.pressed);
          select    = !cursor.locked && pad.buttons[2]?.pressed;
        }
      }

      if (moveLeft)  cursor.cursorPos = (cursor.cursorPos - 1 + CHAR_ORDER.length) % CHAR_ORDER.length;
      if (moveRight) cursor.cursorPos = (cursor.cursorPos + 1) % CHAR_ORDER.length;

      if (select) {
        const ci = cursor.cursorPos;
        if (this.selectedBy[ci] === -1 || this.selectedBy[ci] === pi) {
          this.selectedBy[ci] = pi;
          cursor.locked = true;
        }
      }

    });

    this._refreshPortraits();
  }

  _refreshPortraits() {
    this.portraits.forEach((p, ci) => {
      const ownerPi = this.selectedBy[ci];
      if (ownerPi !== -1) {
        p.overlay.setStrokeStyle(5, PLAYER_COLORS[ownerPi], 1);
        p.badge.setText(PLAYER_LABELS[ownerPi]).setVisible(true);
        p.badge.setBackgroundColor('#' + PLAYER_COLORS[ownerPi].toString(16).padStart(6, '0'));
      } else {
        p.overlay.setStrokeStyle(0, 0, 0);
        p.badge.setVisible(false);
      }
    });

    this.cursors.forEach((cursor, pi) => {
      if (!cursor.joined) return;
      const p = this.portraits[cursor.cursorPos];
      cursor.x = p.x;
      cursor.y = p.y;
    });
  }

  _startGame() {
    // Build player config array
    const playerConfigs = [];

    // Human players: any cursor that is joined
    const takenChars = new Set();
    this.cursors.forEach((cursor, pi) => {
      if (!cursor.joined) return;
      // Find which character they selected (locked) or last hovered
      const charKey = CHAR_ORDER[cursor.cursorPos];
      if (!takenChars.has(charKey)) {
        takenChars.add(charKey);
        playerConfigs.push({
          characterKey: charKey,
          inputType:    pi < 2 ? 'keyboard' : 'gamepad',
          gamepadIndex: pi < 2 ? 0 : pi - 2,
          kbSlot:       pi,
          isCPU:        false,
        });
      }
    });

    // Fill remaining slots as CPU with unchosen characters
    CHAR_ORDER.forEach(key => {
      if (!takenChars.has(key) && playerConfigs.length < 4) {
        takenChars.add(key);
        playerConfigs.push({
          characterKey: key,
          inputType:    'cpu',
          isCPU:        true,
        });
      }
    });

    this.scene.start('Game', { playerConfigs, levelIndex: 0 });
  }
}
