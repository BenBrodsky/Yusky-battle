import Phaser from 'phaser';
import { CHAR_CONFIGS, CHAR_ORDER } from '../config/constants.js';

const PLAYER_COLORS = [0xffff00, 0x00ffff, 0xff44ff, 0x44ff44];
const PLAYER_LABELS = ['1P', '2P', '3P', '4P'];

export class CharacterSelectScene extends Phaser.Scene {
  constructor() { super('CharacterSelect'); }

  preload() {
    this.load.image('select_bg', 'character-select-bg.png');
    this.load.audio('select_music', 'select-music.m4a');
    this.load.audio('cursor_move',  'cursor-move.wav');
    this.load.audio('game_start',   'game-start.wav');
    CHAR_ORDER.forEach(key => {
      this.load.image(`portrait_${key}`, `${key}-portrait.png`);
    });
  }

  create() {
    const { width: W, height: H } = this.scale;

    if (this.textures.exists('select_bg')) {
      this.add.image(W / 2, H / 2, 'select_bg').setDisplaySize(W, H);
      this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.45);
    } else {
      this.add.rectangle(W / 2, H / 2, W, H, 0x111133);
    }

    if (this.cache.audio.exists('select_music')) {
      this.music = this.sound.add('select_music', { loop: true, volume: 0.7 });
      this.music.play();
    }

    this.add.text(W / 2, 40, 'CHOOSE YOUR FIGHTER', {
      fontSize: '36px', fontStyle: 'bold',
      fill: '#ffdd00', stroke: '#664400', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(W / 2, 82, 'X = Pick  ·  C = Add/Remove CPU  ·  ENTER = Start', {
      fontSize: '14px', fill: '#888888',
    }).setOrigin(0.5);

    // ── Player state ─────────────────────────────────────────────────
    // joined: human is present   cursorPos: nav cursor   lockedChar: confirmed pick (-1 = none)
    this.players = Array.from({ length: 4 }, () => ({
      joined: false, cursorPos: 0, lockedChar: -1,
    }));
    this.players[0].joined = true; // P1 always present

    // CPU assignments: a Set of character indices P1 has opted in
    this.cpuChars = new Set();

    // ── Portrait cards ────────────────────────────────────────────────
    const charW = 220, charH = 320;
    const startX = W / 2 - (CHAR_ORDER.length - 1) * (charW + 20) / 2;

    this.cards = CHAR_ORDER.map((key, ci) => {
      const cfg = CHAR_CONFIGS[key];
      const x   = startX + ci * (charW + 20);
      const y   = H * 0.46;

      this.add.rectangle(x, y, charW, charH, 0x222244).setStrokeStyle(3, 0x4444aa);

      const portraitKey = `portrait_${key}`;
      if (this.textures.exists(portraitKey)) {
        const pw = charW - 20, ph = charH * 0.62;
        const img = this.add.image(x, y - 44, portraitKey).setOrigin(0.5);
        img.setScale(Math.max(pw / img.width, ph / img.height));
        const mg = this.add.graphics();
        mg.fillRect(x - pw / 2, y - 44 - ph / 2, pw, ph);
        img.setMask(mg.createGeometryMask());
      } else {
        this.add.rectangle(x, y - 50, charW - 20, charH * 0.55, cfg.color);
      }

      this.add.text(x, y + 72, cfg.name, {
        fontSize: '22px', fontStyle: 'bold', fill: '#ffffff',
        stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5);

      this.add.text(x, y + 96, cfg.description, {
        fontSize: '12px', fill: '#aaaaaa', align: 'center',
        wordWrap: { width: charW - 16 },
      }).setOrigin(0.5, 0);

      // Flash overlay (triggered on selection)
      const flash  = this.add.rectangle(x, y, charW, charH, 0xffffff, 0).setDepth(8);
      // Colored border (shown when locked)
      const border = this.add.rectangle(x, y, charW, charH, 0, 0).setStrokeStyle(0, 0, 0).setDepth(9);
      // Player/CPU badge on top of portrait
      const badge  = this.add.text(x, y - charH / 2 + 22, '', {
        fontSize: '22px', fontStyle: 'bold',
        fill: '#000000', backgroundColor: '#ffff00',
        padding: { x: 10, y: 4 },
      }).setOrigin(0.5).setVisible(false).setDepth(10);

      return { x, y, flash, border, badge, ci };
    });

    // ── Player cursors ────────────────────────────────────────────────
    this.cursors = Array.from({ length: 4 }, (_, pi) =>
      this.add.rectangle(0, 0, charW + 24, charH + 24, 0, 0)
        .setStrokeStyle(5, PLAYER_COLORS[pi], 0).setDepth(7)
    );
    this.cursors[0].setStrokeStyle(5, PLAYER_COLORS[0], 1);

    // ── Keyboard input ────────────────────────────────────────────────
    this.keys1 = this.input.keyboard.addKeys({
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      pick:  Phaser.Input.Keyboard.KeyCodes.X,
      cpu:   Phaser.Input.Keyboard.KeyCodes.C,
    });
    this.keys2 = this.input.keyboard.addKeys({
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      pick:  Phaser.Input.Keyboard.KeyCodes.E,
    });

    // ── Bottom hints ──────────────────────────────────────────────────
    this.startHint = this.add.text(W / 2, H - 38,
      'ENTER to begin  ·  P2 keyboard: A/D + E to join', {
      fontSize: '18px', fill: '#ffffff', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.tweens.add({ targets: this.startHint, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    this.input.keyboard.on('keydown-ENTER', () => this._startGame());
    this.input.keyboard.on('keydown-T',     () => this._startGame());

    if (this.input.gamepad) {
      this.input.gamepad.on('down', (pad, button) => {
        const pi = pad.index + 2;
        if (pi < 4 && !this.players[pi].joined && button.index === 0) {
          this.players[pi].joined = true;
          this.cursors[pi].setStrokeStyle(5, PLAYER_COLORS[pi], 1);
        }
      });
    }

    this._refreshCards();
  }

  update() {
    const pads = this.input.gamepad ? this.input.gamepad.gamepads : [];

    this.players.forEach((player, pi) => {
      if (!player.joined) return;

      let moveLeft = false, moveRight = false, pick = false, toggleCPU = false;

      if (pi === 0) {
        // P1 can always navigate (even after locking) so they can add CPUs
        moveLeft  = Phaser.Input.Keyboard.JustDown(this.keys1.left);
        moveRight = Phaser.Input.Keyboard.JustDown(this.keys1.right);
        pick      = player.lockedChar === -1 && Phaser.Input.Keyboard.JustDown(this.keys1.pick);
        toggleCPU = Phaser.Input.Keyboard.JustDown(this.keys1.cpu);
      } else if (pi === 1) {
        const locked = player.lockedChar !== -1;
        moveLeft  = !locked && Phaser.Input.Keyboard.JustDown(this.keys2.left);
        moveRight = !locked && Phaser.Input.Keyboard.JustDown(this.keys2.right);
        pick      = !locked && Phaser.Input.Keyboard.JustDown(this.keys2.pick);
      } else {
        const pad = pads[pi - 2];
        if (pad) {
          const ax     = pad.axes[0]?.getValue() ?? 0;
          const locked = player.lockedChar !== -1;
          moveLeft  = !locked && (ax < -0.5 || pad.buttons[14]?.pressed);
          moveRight = !locked && (ax >  0.5 || pad.buttons[15]?.pressed);
          pick      = !locked && pad.buttons[2]?.pressed;
        }
      }

      if (moveLeft) {
        player.cursorPos = (player.cursorPos - 1 + CHAR_ORDER.length) % CHAR_ORDER.length;
        this._playMove();
      }
      if (moveRight) {
        player.cursorPos = (player.cursorPos + 1) % CHAR_ORDER.length;
        this._playMove();
      }

      if (pick) {
        const takenByHuman = this.players.some((p, i) => i !== pi && p.lockedChar === player.cursorPos);
        if (!takenByHuman) {
          player.lockedChar = player.cursorPos;
          this.cpuChars.delete(player.cursorPos); // humans override CPU
          this._flashCard(player.cursorPos, PLAYER_COLORS[pi]);
        }
      }

      // P1 only: press C to toggle CPU on the currently hovered card
      if (toggleCPU) {
        const ci = player.cursorPos;
        const takenByHuman = this.players.some(p => p.lockedChar === ci);
        if (!takenByHuman) {
          if (this.cpuChars.has(ci)) {
            this.cpuChars.delete(ci);
          } else {
            this.cpuChars.add(ci);
            this._flashCard(ci, 0xaaaaaa);
          }
        }
      }
    });

    this._refreshCards();
  }

  _flashCard(ci, color) {
    const { flash } = this.cards[ci];
    flash.setFillStyle(color, 0.85).setAlpha(1);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 100,
      yoyo: true,
      repeat: 3,
      onComplete: () => flash.setAlpha(0),
    });
  }

  _refreshCards() {
    // Reset borders and badges
    this.cards.forEach(card => {
      card.border.setStrokeStyle(0, 0, 0);
      card.badge.setVisible(false);
    });

    // CPU badges (drawn first; human badges will overdraw if same card)
    this.cpuChars.forEach(ci => {
      const card = this.cards[ci];
      card.border.setStrokeStyle(4, 0x888888, 1);
      card.badge.setText('CPU')
        .setBackgroundColor('#555555')
        .setColor('#ffffff')
        .setVisible(true);
    });

    // Human player badges and cursors
    this.players.forEach((player, pi) => {
      if (!player.joined) return;

      // Cursor: always visible for P1 (for CPU nav), hidden for others when locked
      const showCursor = pi === 0 || player.lockedChar === -1;
      const cursorCard = this.cards[player.cursorPos];
      this.cursors[pi]
        .setPosition(cursorCard.x, cursorCard.y)
        .setAlpha(showCursor ? 1 : 0);

      if (player.lockedChar !== -1) {
        const card = this.cards[player.lockedChar];
        const hexColor = '#' + PLAYER_COLORS[pi].toString(16).padStart(6, '0');
        card.border.setStrokeStyle(6, PLAYER_COLORS[pi], 1);
        card.badge.setText(PLAYER_LABELS[pi])
          .setBackgroundColor(hexColor)
          .setColor('#000000')
          .setVisible(true);
      }
    });
  }

  _playMove() {
    if (this.cache.audio.exists('cursor_move')) {
      this.sound.play('cursor_move', { volume: 0.5 });
    }
  }

  _startGame() {
    if (this.players[0].lockedChar === -1) return; // P1 must pick first

    const playerConfigs = [];

    this.players.forEach((player, pi) => {
      if (!player.joined || player.lockedChar === -1) return;
      playerConfigs.push({
        characterKey: CHAR_ORDER[player.lockedChar],
        inputType:    pi < 2 ? 'keyboard' : 'gamepad',
        gamepadIndex: pi < 2 ? 0 : pi - 2,
        kbSlot:       pi,
        isCPU:        false,
      });
    });

    this.cpuChars.forEach(ci => {
      playerConfigs.push({
        characterKey: CHAR_ORDER[ci],
        inputType:    'cpu',
        isCPU:        true,
      });
    });

    this.music?.stop();
    if (this.cache.audio.exists('game_start')) {
      this.sound.play('game_start', { volume: 0.8 });
      this.time.delayedCall(1200, () => this.scene.start('Game', { playerConfigs, levelIndex: 0 }));
    } else {
      this.scene.start('Game', { playerConfigs, levelIndex: 0 });
    }
  }
}
