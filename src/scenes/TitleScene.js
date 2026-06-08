import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  preload() {
    this.load.image('title_bg', 'title-bg.png');
  }

  create() {
    const { width: W, height: H } = this.scale;

    // Full-screen background image
    this.add.image(W / 2, H / 2, 'title_bg').setDisplaySize(W, H);

    // Dark strip at the very bottom for the controls hint
    this.add.rectangle(W / 2, H - 14, W, 28, 0x000000, 0.6);
    this.add.text(W / 2, H - 14,
      'Gamepad: A=Jump  X=Attack  Y=Hug  |  Keyboard: Z=Jump  X=Attack  C=Hug',
      { fontSize: '13px', fill: '#cccccc' }
    ).setOrigin(0.5);

    // Blinking overlay on the PRESS START area — pulses over the image text
    const blink = this.add.text(W / 2, H * 0.895, '❯ PRESS START ❮', {
      fontSize: '30px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: blink,
      alpha: 0,
      duration: 550,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Input listeners
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
