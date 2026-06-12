import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  preload() {
    this.load.image('title_bg', 'title-bg.png');
    this.load.audio('title_music',   'title-music.m4a');
    this.load.audio('title_advance', 'title-advance.wav');
  }

  create() {
    const { width: W, height: H } = this.scale;

    // Full-screen background image
    this.add.image(W / 2, H / 2, 'title_bg').setDisplaySize(W, H);

    // Play title music on loop; stop it when transitioning to character select
    if (this.cache.audio.exists('title_music')) {
      this.music = this.sound.add('title_music', { loop: true, volume: 0.7 });
      this.music.play();
    }

    // Dark strip at the very bottom for the controls hint
    this.add.rectangle(W / 2, H - 14, W, 28, 0x000000, 0.6);
    this.add.text(W / 2, H - 14,
      'Gamepad: A=Jump  X=Attack  Y=Hug  |  Keyboard: Space=Jump  X=Attack  C=Hug',
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

    // Input listeners — stop music before transitioning
    const goNext = () => {
      this.music?.stop();
      if (this.cache.audio.exists('title_advance')) {
        this.sound.play('title_advance', { volume: 0.8 });
      }
      this.scene.start('CharacterSelect');
    };
    this.input.keyboard.once('keydown-ENTER', goNext);
    this.input.keyboard.once('keydown-SPACE',  goNext);

    if (this.input.gamepad) {
      this.input.gamepad.once('down', (pad, button) => {
        if (button.index === 9 || button.index === 0) goNext();
      });
    }
  }
}
