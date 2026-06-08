import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    const { width: W, height: H } = this.scale;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a2e, 0x0a0a2e, 0x1a0533, 0x1a0533, 1);
    bg.fillRect(0, 0, W, H);

    // Ground strip
    this.add.rectangle(W / 2, H * 0.72, W, H * 0.56, 0x2d4a1e);

    // Decorative stars
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H * 0.5);
      const s = Phaser.Math.FloatBetween(1, 3);
      this.add.circle(x, y, s, 0xffffff, Phaser.Math.FloatBetween(0.3, 1));
    }

    // Title
    this.add.text(W / 2, H * 0.22, 'YUSKY', {
      fontSize: '96px',
      fontStyle: 'bold',
      fill: '#ffdd00',
      stroke: '#aa6600',
      strokeThickness: 10,
      shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 0, fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.36, 'BATTLE', {
      fontSize: '64px',
      fontStyle: 'bold',
      fill: '#ff4444',
      stroke: '#880000',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.5, '★ FAMILY BEAT-EM-UP ★', {
      fontSize: '22px',
      fill: '#88ccff',
      stroke: '#002244',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Character color blobs as silhouettes
    const chars = [
      { x: W * 0.18, color: 0x2255cc, label: 'BEN' },
      { x: W * 0.36, color: 0xdd6622, label: 'LINDA' },
      { x: W * 0.64, color: 0x22aa44, label: 'MILES' },
      { x: W * 0.82, color: 0xffcc00, label: 'OCEAN' },
    ];
    chars.forEach(c => {
      this.add.rectangle(c.x, H * 0.62, 60, 90, c.color).setAlpha(0.7);
      this.add.text(c.x, H * 0.72, c.label, {
        fontSize: '14px', fill: '#ffffff', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5);
    });

    // Press start
    const pressStart = this.add.text(W / 2, H * 0.86, 'PRESS  START  /  ENTER', {
      fontSize: '28px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: pressStart,
      alpha: 0.1,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(W / 2, H * 0.92, 'Gamepad: A=Jump  X=Attack  Y=Hug  |  Keyboard: Z=Jump  X=Attack  C=Hug', {
      fontSize: '13px', fill: '#888888',
    }).setOrigin(0.5);

    // Accept any start input
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('CharacterSelect'));
    this.input.keyboard.once('keydown-SPACE',  () => this.scene.start('CharacterSelect'));

    if (this.input.gamepad) {
      this.input.gamepad.once('down', (pad, button) => {
        if (button.index === 9 || button.index === 0) {
          this.scene.start('CharacterSelect');
        }
      });
    }
  }
}
