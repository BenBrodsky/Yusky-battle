import Phaser from 'phaser';
import { CHAR_CONFIGS } from '../config/constants.js';

const PLAYER_COLORS_HEX = ['#ffff00', '#00ffff', '#ff44ff', '#44ff44'];
const CARD_COLOR = 0xffd700;

export class HUDScene extends Phaser.Scene {
  constructor() { super({ key: 'HUD', active: false }); }

  create() {
    this.cameras.main.setScroll(0, 0);

    const { width: W } = this.scale;

    // ---- Per-player HUD panels (corners) ----
    const positions = [
      { x: 10,     y: 10,  anchor: 0 },  // P1 top-left
      { x: W - 10, y: 10,  anchor: 1 },  // P2 top-right
      { x: 10,     y: 110, anchor: 0 },  // P3 second row left
      { x: W - 10, y: 110, anchor: 1 },  // P4 second row right
    ];

    this.panels = positions.map((pos, i) => this._makePanel(pos, i));

    // ---- Family Card counter (top center) ----
    this.cardIcon = this.add.rectangle(W / 2 - 20, 20, 16, 22, CARD_COLOR);
    this.cardText = this.add.text(W / 2 + 2, 12, 'x0', {
      fontSize: '20px', fontStyle: 'bold',
      fill: '#ffdd00', stroke: '#000', strokeThickness: 4,
    });

    // ---- Uncle hint ----
    this.uncleHint = this.add.text(W / 2, 42, '', {
      fontSize: '13px', fill: '#aaaaaa',
    }).setOrigin(0.5);

    // ---- Boss HP bar (hidden until boss spawns) ----
    this.bossGroup = this.add.container(W / 2, this.scale.height - 28);
    this.bossLabel = this.add.text(0, -16, '', {
      fontSize: '16px', fontStyle: 'bold',
      fill: '#ff2200', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    const bossBg   = this.add.rectangle(0, 0, W - 40, 16, 0x440000)
      .setStrokeStyle(2, 0x880000);
    this.bossBar   = this.add.rectangle(-(W - 40) / 2, 0, W - 40, 14, 0xff2200)
      .setOrigin(0, 0.5);
    this.bossGroup.add([this.bossLabel, bossBg, this.bossBar]);
    this.bossGroup.setVisible(false);
    this.bossGroup.setDepth(200);

    this.bossEnemy = null;
  }

  _makePanel(pos, playerIndex) {
    const barW = 140;
    const { x, y, anchor } = pos;

    const bg = this.add.rectangle(
      x + (anchor === 0 ? barW / 2 + 5 : -(barW / 2 + 5)), y + 32,
      barW + 16, 62, 0x000000, 0.55
    );

    const label = this.add.text(
      x + (anchor === 0 ? 4 : -4), y + 4,
      `P${playerIndex + 1}`,
      { fontSize: '14px', fill: PLAYER_COLORS_HEX[playerIndex], stroke: '#000', strokeThickness: 3 }
    ).setOrigin(anchor === 0 ? 0 : 1, 0);

    const charLabel = this.add.text(
      x + (anchor === 0 ? 28 : -28), y + 4, '', {
        fontSize: '14px', fill: '#ffffff', stroke: '#000', strokeThickness: 3,
      }
    ).setOrigin(0.5, 0);

    const hpBg = this.add.rectangle(
      x + (anchor === 0 ? barW / 2 + 4 : -(barW / 2 + 4)), y + 26,
      barW, 12, 0x440000
    );
    const hpBar = this.add.rectangle(
      x + (anchor === 0 ? 4 : -barW - 4), y + 26,
      barW, 12, 0xff2200
    ).setOrigin(0, 0.5);

    const energyBg  = this.add.rectangle(
      x + (anchor === 0 ? barW / 2 + 4 : -(barW / 2 + 4)), y + 42,
      barW, 8, 0x442200
    ).setVisible(false);
    const energyBar = this.add.rectangle(
      x + (anchor === 0 ? 4 : -barW - 4), y + 42,
      barW, 8, 0xff8800
    ).setOrigin(0, 0.5).setVisible(false);

    const nuclearBg  = this.add.rectangle(
      x + (anchor === 0 ? barW / 2 + 4 : -(barW / 2 + 4)), y + 54,
      barW, 8, 0x004400
    ).setVisible(false);
    const nuclearBar = this.add.rectangle(
      x + (anchor === 0 ? 4 : -barW - 4), y + 54,
      0, 8, 0x00ff44
    ).setOrigin(0, 0.5).setVisible(false);

    const koText = this.add.text(
      x + (anchor === 0 ? barW / 2 + 4 : -(barW / 2 + 4)), y + 24,
      'KO', {
        fontSize: '22px', fontStyle: 'bold',
        fill: '#ff0000', stroke: '#000', strokeThickness: 5,
      }
    ).setOrigin(0.5).setVisible(false);

    [bg, label, charLabel, hpBg, hpBar, energyBg, energyBar, nuclearBg, nuclearBar, koText].forEach(o => {
      if (o) o.setDepth(100);
    });

    return { bg, label, charLabel, hpBg, hpBar, barW, anchor, x, y,
             energyBg, energyBar, nuclearBg, nuclearBar, koText };
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

      // Name
      panel.charLabel.setText(player.config.name.toUpperCase());

      if (player.isKO) {
        panel.koText.setVisible(true);
        panel.hpBar.setVisible(false);
        return;
      }
      panel.koText.setVisible(false);
      panel.hpBar.setVisible(true);

      const hpFrac = player.hp / player.maxHP;
      panel.hpBar.width    = panel.barW * hpFrac;
      panel.hpBar.fillColor = hpFrac > 0.5 ? 0x00cc44 : hpFrac > 0.25 ? 0xffaa00 : 0xff2200;

      // Ocean energy bar
      if (player.config.key === 'ocean') {
        panel.energyBg.setVisible(true);
        panel.energyBar.setVisible(true);
        const ef = player.energy / player.config.maxEnergy;
        panel.energyBar.width = panel.barW * ef;
        panel.energyBar.fillColor = ef < 0.25 ? 0xff2200 : 0xff8800;
      }

      // Miles nuclear bar
      if (player.config.key === 'miles') {
        panel.nuclearBg.setVisible(true);
        panel.nuclearBar.setVisible(true);
        panel.nuclearBar.width = panel.barW * player.nuclear;
      }
    });

    // Family cards
    const cards = gameScene.familyCards || 0;
    this.cardText.setText(`x${cards}`);
    this.uncleHint.setText(
      cards > 0
        ? `${cards} Family Card${cards > 1 ? 's' : ''} — Press Hug when all KO to call Uncle!`
        : ''
    );

    // Boss bar
    if (gameScene.bossEnemy && gameScene.bossEnemy.active) {
      this.bossGroup.setVisible(true);
      const boss    = gameScene.bossEnemy;
      const frac    = boss.hp / boss.maxHP;
      const totalW  = this.scale.width - 40;
      this.bossBar.width    = totalW * frac;
      this.bossBar.x        = -totalW / 2;
      this.bossLabel.setText(boss.isBoss ? 'THE BULLY KING' : 'BOSS');
    } else {
      this.bossGroup.setVisible(false);
    }
  }
}
