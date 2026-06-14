import Phaser from 'phaser';
import { CHAR_CONFIGS } from '../config/constants.js';

const PLAYER_COLORS = [0xffff00, 0x00ffff, 0xff44ff, 0x44ff44];
const CARD_COLOR = 0xffd700;

const PANEL_W = 300;
const PANEL_H = 98;
const GAP     = 12;
const FACE    = 64;
const BAR_W   = 196;

export class HUDScene extends Phaser.Scene {
  constructor() { super({ key: 'HUD', active: false }); }

  create() {
    this.cameras.main.setScroll(0, 0);
    const { width: W } = this.scale;

    const gameScene = this.scene.get('Game');
    const n = gameScene?.players?.length || gameScene?.playerConfigs?.length || 1;

    // ---- Per-player HUD panels laid out in a row along the top ----
    const totalW = n * PANEL_W + (n - 1) * GAP;
    const startX = Math.max(12, (W - totalW) / 2);
    const y      = 8;

    this.panels = [];
    for (let i = 0; i < n; i++) {
      const x = startX + i * (PANEL_W + GAP);
      this.panels.push(this._makePanel(x, y, i));
    }

    // ---- Family Card counter (below the panel row, centered) ----
    this.cardIcon = this.add.rectangle(W / 2 - 22, y + PANEL_H + 18, 16, 22, CARD_COLOR).setDepth(100);
    this.cardText = this.add.text(W / 2 - 4, y + PANEL_H + 8, 'x0', {
      fontSize: '20px', fontStyle: 'bold',
      fill: '#ffdd00', stroke: '#000', strokeThickness: 4,
    }).setDepth(100);
    this.uncleHint = this.add.text(W / 2, y + PANEL_H + 36, '', {
      fontSize: '13px', fill: '#aaaaaa',
    }).setOrigin(0.5).setDepth(100);

    // ---- Boss HP bar (hidden until boss spawns) ----
    this.bossGroup = this.add.container(W / 2, this.scale.height - 28);
    this.bossLabel = this.add.text(0, -16, '', {
      fontSize: '16px', fontStyle: 'bold',
      fill: '#ff2200', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    const bossBg   = this.add.rectangle(0, 0, W - 40, 16, 0x440000).setStrokeStyle(2, 0x880000);
    this.bossBar   = this.add.rectangle(-(W - 40) / 2, 0, W - 40, 14, 0xff2200).setOrigin(0, 0.5);
    this.bossGroup.add([this.bossLabel, bossBg, this.bossBar]);
    this.bossGroup.setVisible(false).setDepth(200);

    this.bossEnemy = null;
  }

  _makePanel(x, y, playerIndex) {
    const color = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];

    const bg = this.add.rectangle(x, y, PANEL_W, PANEL_H, 0x001028, 0.6)
      .setOrigin(0, 0).setStrokeStyle(2, color, 0.8).setDepth(100);

    // Face placeholder frame (the portrait image is created lazily in update)
    const faceFrame = this.add.rectangle(x + 10, y + 12, FACE, FACE)
      .setOrigin(0, 0).setStrokeStyle(2, 0xffffff, 0.5).setDepth(102);

    const textX = x + 10 + FACE + 14;

    const charLabel = this.add.text(textX, y + 8, '', {
      fontSize: '16px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0, 0).setDepth(101);

    // Lives counter: "× 3" next to the face
    const livesText = this.add.text(textX, y + 30, '× 3', {
      fontSize: '20px', fontStyle: 'bold', fill: '#ffdd33', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0, 0).setDepth(101);

    const hpBg = this.add.rectangle(textX, y + 60, BAR_W, 12, 0x440000)
      .setOrigin(0, 0).setDepth(101);
    const hpBar = this.add.rectangle(textX, y + 60, BAR_W, 12, 0xff2200)
      .setOrigin(0, 0).setDepth(101);

    const energyBg  = this.add.rectangle(textX, y + 76, BAR_W, 7, 0x442200)
      .setOrigin(0, 0).setVisible(false).setDepth(101);
    const energyBar = this.add.rectangle(textX, y + 76, BAR_W, 7, 0xff8800)
      .setOrigin(0, 0).setVisible(false).setDepth(101);

    const nuclearBg  = this.add.rectangle(textX, y + 86, BAR_W, 7, 0x004400)
      .setOrigin(0, 0).setVisible(false).setDepth(101);
    const nuclearBar = this.add.rectangle(textX, y + 86, 0, 7, 0x00ff44)
      .setOrigin(0, 0).setVisible(false).setDepth(101);

    const koText = this.add.text(x + 10 + FACE / 2, y + 12 + FACE / 2, 'KO', {
      fontSize: '24px', fontStyle: 'bold', fill: '#ff0000', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setVisible(false).setDepth(103);

    return {
      x, y, color, face: null, faceFrame, charLabel, livesText,
      hpBg, hpBar, energyBg, energyBar, nuclearBg, nuclearBar, koText, textX,
    };
  }

  _ensureFace(panel, player) {
    if (panel.face || !player) return;
    // Prefer the tight face crop; fall back to the full portrait if missing.
    const faceKey = `face_${player.config.key}`;
    const key = this.textures.exists(faceKey) ? faceKey : `portrait_${player.config.key}`;
    const fx = panel.x + 10, fy = panel.y + 12;
    if (this.textures.exists(key)) {
      const img = this.add.image(fx + FACE / 2, fy + FACE / 2, key).setOrigin(0.5, 0.5).setDepth(101);
      img.setScale(Math.min(FACE / img.width, FACE / img.height));
      const mg = this.add.graphics();
      mg.fillRect(fx, fy, FACE, FACE);
      img.setMask(mg.createGeometryMask());
      panel.face = img;
    } else {
      panel.face = this.add.rectangle(fx, fy, FACE, FACE, player.config.color)
        .setOrigin(0, 0).setDepth(101);
    }
  }

  update() {
    const gameScene = this.scene.get('Game');
    if (!gameScene || !gameScene.players) return;

    gameScene.players.forEach((player, i) => {
      const panel = this.panels[i];
      if (!panel) return;

      if (!player) {
        panel.hpBar.width = 0;
        panel.koText.setVisible(false);
        return;
      }

      this._ensureFace(panel, player);
      panel.charLabel.setText(player.config.name.toUpperCase());
      panel.livesText.setText(`× ${Math.max(0, player.lives)}`);

      if (player.isKO) {
        panel.koText.setVisible(true);
        panel.hpBar.setVisible(false);
        return;
      }
      panel.koText.setVisible(false);
      panel.hpBar.setVisible(true);

      const hpFrac = player.hp / player.maxHP;
      panel.hpBar.width     = BAR_W * hpFrac;
      panel.hpBar.fillColor = hpFrac > 0.5 ? 0x00cc44 : hpFrac > 0.25 ? 0xffaa00 : 0xff2200;

      if (player.config.key === 'ocean') {
        panel.energyBg.setVisible(true);
        panel.energyBar.setVisible(true);
        const ef = player.energy / player.config.maxEnergy;
        panel.energyBar.width = BAR_W * ef;
        panel.energyBar.fillColor = ef < 0.25 ? 0xff2200 : 0xff8800;
      }

      if (player.config.key === 'miles') {
        panel.nuclearBg.setVisible(true);
        panel.nuclearBar.setVisible(true);
        panel.nuclearBar.width = BAR_W * player.nuclear;
      }
    });

    const cards = gameScene.familyCards || 0;
    this.cardText.setText(`x${cards}`);
    this.uncleHint.setText(
      cards > 0
        ? `${cards} Family Card${cards > 1 ? 's' : ''} — Press Hug when all KO to call Uncle!`
        : ''
    );

    if (gameScene.bossEnemy && gameScene.bossEnemy.active) {
      this.bossGroup.setVisible(true);
      const boss   = gameScene.bossEnemy;
      const frac   = boss.hp / boss.maxHP;
      const totalW = this.scale.width - 40;
      this.bossBar.width = totalW * frac;
      this.bossBar.x     = -totalW / 2;
      this.bossLabel.setText(boss.isBoss ? 'THE BULLY KING' : 'BOSS');
    } else {
      this.bossGroup.setVisible(false);
    }
  }
}
