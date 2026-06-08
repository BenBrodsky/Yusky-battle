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

    this.add.text(W / 2, 40, 'CHOOSE YOUR FIGHTERS', {
      fontSize: '36px', fontStyle: 'bold',
      fill: '#ffdd00', stroke: '#664400', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(W / 2, 82, '← → Browse  ·  X = Human ➜ CPU ➜ Off  ·  ENTER = Start', {
      fontSize: '14px', fill: '#aaaaaa',
    }).setOrigin(0.5);

    // ── Card state: null | 'human' | 'cpu' ───────────────────────────
    this.cardStates    = CHAR_ORDER.map(() => null);
    this.selectionOrder = []; // ci values in the order they were picked as human
    this.cursorPos     = 0;

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

      const flash  = this.add.rectangle(x, y, charW, charH, 0xffffff, 0).setDepth(8);
      const border = this.add.rectangle(x, y, charW, charH, 0, 0).setStrokeStyle(0, 0, 0).setDepth(9);
      const badge  = this.add.text(x, y - charH / 2 + 22, '', {
        fontSize: '22px', fontStyle: 'bold',
        fill: '#000000', backgroundColor: '#ffff00',
        padding: { x: 10, y: 4 },
      }).setOrigin(0.5).setVisible(false).setDepth(10);

      return { x, y, flash, border, badge };
    });

    // ── Single cursor ─────────────────────────────────────────────────
    this.cursor = this.add.rectangle(0, 0, charW + 24, charH + 24, 0, 0)
      .setStrokeStyle(5, 0xffffff, 1).setDepth(7);

    // ── Input ─────────────────────────────────────────────────────────
    this.keys = this.input.keyboard.addKeys({
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      x:     Phaser.Input.Keyboard.KeyCodes.X,
    });

    this.startHint = this.add.text(W / 2, H - 38, 'ENTER to start', {
      fontSize: '20px', fill: '#ffffff', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.tweens.add({ targets: this.startHint, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    this.input.keyboard.on('keydown-ENTER', () => this._startGame());

    this._refreshCards();
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.left)) {
      this.cursorPos = (this.cursorPos - 1 + CHAR_ORDER.length) % CHAR_ORDER.length;
      this._playMove();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.right)) {
      this.cursorPos = (this.cursorPos + 1) % CHAR_ORDER.length;
      this._playMove();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.x)) {
      this._cycleCard(this.cursorPos);
    }

    this._refreshCards();
  }

  _cycleCard(ci) {
    const prev = this.cardStates[ci];
    if (prev === null) {
      this.cardStates[ci] = 'human';
      this.selectionOrder.push(ci);
      const playerNum = this.selectionOrder.length - 1;
      this._flashCard(ci, PLAYER_COLORS[Math.min(playerNum, 3)]);
    } else if (prev === 'human') {
      this.cardStates[ci] = 'cpu';
      this.selectionOrder = this.selectionOrder.filter(x => x !== ci);
      this._flashCard(ci, 0x888888);
    } else {
      this.cardStates[ci] = null;
    }
  }

  _flashCard(ci, color) {
    const { flash } = this.cards[ci];
    flash.setFillStyle(color, 0.85).setAlpha(1);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 80, yoyo: true, repeat: 1,
      onComplete: () => flash.setAlpha(0),
    });
  }

  _refreshCards() {
    this.cards.forEach(({ border, badge }, ci) => {
      const state = this.cardStates[ci];
      if (state === 'human') {
        const playerNum = this.selectionOrder.indexOf(ci);
        const color = PLAYER_COLORS[Math.min(playerNum, 3)];
        border.setStrokeStyle(6, color, 1);
        badge.setText(PLAYER_LABELS[Math.min(playerNum, 3)])
          .setBackgroundColor('#' + color.toString(16).padStart(6, '0'))
          .setColor('#000000').setVisible(true);
      } else if (state === 'cpu') {
        border.setStrokeStyle(4, 0x888888, 1);
        badge.setText('CPU').setBackgroundColor('#555555').setColor('#ffffff').setVisible(true);
      } else {
        border.setStrokeStyle(0, 0, 0);
        badge.setVisible(false);
      }
    });

    const card = this.cards[this.cursorPos];
    this.cursor.setPosition(card.x, card.y);
  }

  _playMove() {
    if (this.cache.audio.exists('cursor_move')) {
      this.sound.play('cursor_move', { volume: 0.5 });
    }
  }

  _startGame() {
    const hasHuman = this.cardStates.some(s => s === 'human');
    if (!hasHuman) return;

    const playerConfigs = [];
    let humanIndex = 0;

    // Add humans in selection order so P1 = first picked, P2 = second, etc.
    this.selectionOrder.forEach((ci, pi) => {
      playerConfigs.push({
        characterKey: CHAR_ORDER[ci],
        inputType:    pi === 0 ? 'keyboard' : 'gamepad',
        gamepadIndex: Math.max(0, pi - 1),
        kbSlot:       pi,
        isCPU:        false,
      });
    });

    // Add CPU players
    this.cardStates.forEach((state, ci) => {
      if (state === 'cpu') {
        playerConfigs.push({
          characterKey: CHAR_ORDER[ci],
          inputType:    'cpu',
          isCPU:        true,
        });
      }
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
