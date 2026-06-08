import { Character } from './Character.js';
import { JUMP_VELOCITY } from '../config/constants.js';

// Ocean — energy burst + nap mechanic.
// Pressing attack while standing over a downed enemy triggers a rapid
// Nightcrawler-style stomp loop: Ocean bounces up and down until the enemy dies.
export class Ocean extends Character {
  constructor(scene, worldX, groundY, config, playerIndex) {
    super(scene, worldX, groundY, config, playerIndex);

    this.energy      = config.maxEnergy;
    this.napTimer    = 0;
    this.isNapping   = false;
    this.stompTarget = null; // enemy currently being stomped
    this.stompBounce = false;

    // Energy bar
    this.energyBg  = this.scene.add.rectangle(0, 0, config.width, 5, 0x442200);
    this.energyBar = this.scene.add.rectangle(0, 0, config.width, 5, 0xff8800);

    // Zzz text for nap
    this.zzzText = this.scene.add.text(0, 0, 'zzz', {
      fontSize: '16px', fill: '#88aaff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setVisible(false).setDepth(2000);
  }

  update(dt, input, gameScene) {
    if (this.isNapping) {
      this._updateNap(dt);
      this._syncSprites();
      return;
    }

    // Drain energy while moving or attacking
    if ((input.left || input.right || input.up || input.down) && this.isGrounded()) {
      this.energy = Math.max(0, this.energy - this.config.energyDrain * dt);
    }

    // Check for nap trigger
    if (this.energy <= 0 && !this.isNapping) {
      this._triggerNap();
      return;
    }

    // Stomp loop: if we have a stomp target and just landed
    if (this.stompTarget && this.isGrounded() && !this.stompBounce) {
      this._doStomp();
    }

    // Check for new stomp target on attack press while grounded
    if (input.attackJust && this.isGrounded() && gameScene) {
      const downed = this._findDownedEnemy(gameScene.enemies);
      if (downed) {
        this.stompTarget  = downed;
        this.stompBounce  = false;
        this.velZ         = JUMP_VELOCITY * 0.55;
        this.jumpZ        = 1;
        this.state        = 'jump';
        this.energy       = Math.max(0, this.energy - this.config.attackDrain);
        return; // skip normal attack logic
      }
    }

    super.update(dt, input, gameScene);
  }

  // Override attack to drain energy
  onAttack(gameScene) {
    this.energy = Math.max(0, this.energy - this.config.attackDrain);
  }

  onLand() {
    if (this.stompTarget) {
      this.stompBounce = false; // allow stomp to fire in next update
    }
  }

  _doStomp() {
    const t = this.stompTarget;
    if (!t || !t.active || t.state === 'dead') {
      this.stompTarget = null;
      return;
    }

    const dx = Math.abs(t.worldX - this.worldX);
    const dy = Math.abs(t.groundY - this.groundY);
    if (dx > 60 || dy > 50) {
      this.stompTarget = null;
      return;
    }

    t.takeDamage(this.config.stompDmg, 0);
    this._popup('STOMP!', 0xff4400);

    if (t.hp <= 0 || t.state === 'dead') {
      this.stompTarget = null;
      return;
    }

    // Bounce up for another stomp
    this.stompBounce = true;
    this.velZ        = JUMP_VELOCITY * 0.5;
    this.jumpZ       = 1;
    this.state       = 'jump';
  }

  _triggerNap() {
    this.isNapping  = true;
    this.napTimer   = this.config.napDuration;
    this.state      = 'nap';
    this.stompTarget = null;
    this._popup('OOSE…', 0x88aaff);
  }

  _updateNap(dt) {
    this.napTimer -= dt;
    this.zzzText.setVisible(true);
    const t = Date.now() / 500;
    this.zzzText.x = this.worldX + Math.sin(t) * 10;
    this.zzzText.y = this.groundY - this.config.height - 20 - Math.abs(Math.sin(t)) * 10;

    // Show lying-flat effect
    this.sprite.setAngle(90);

    if (this.napTimer <= 0) {
      this._wakeUp();
    }
  }

  _wakeUp() {
    this.isNapping = false;
    this.energy    = this.config.maxEnergy * 0.4;
    this.state     = 'idle';
    this.sprite.setAngle(0);
    this.zzzText.setVisible(false);
    this._popup('OOSE!', 0xffcc00);
  }

  getAttackDamage() { return this.config.meleeDmg; }

  _findDownedEnemy(enemies) {
    for (const e of enemies) {
      if (!e.active) continue;
      if (e.state !== 'ko' && e.state !== 'downed') continue;
      const dx = Math.abs(e.worldX - this.worldX);
      const dy = Math.abs(e.groundY - this.groundY);
      if (Math.sqrt(dx * dx + dy * dy * 0.25) < 70) return e;
    }
    return null;
  }

  _syncSprites() {
    super._syncSprites();
    const sy = this.groundY - this.jumpZ;
    const bx = this.worldX;
    const by = sy - this.config.height - 10;

    this.energyBg.x  = bx;
    this.energyBg.y  = by;
    const frac       = this.energy / this.config.maxEnergy;
    this.energyBar.width = this.config.width * frac;
    this.energyBar.x = bx - (this.config.width - this.config.width * frac) / 2;
    this.energyBar.y = by;
    this.energyBg.setDepth(this.groundY + 2);
    this.energyBar.setDepth(this.groundY + 2);

    // Low energy warning pulse
    if (frac < 0.25 && !this.isNapping) {
      const pulse = 0.6 + Math.abs(Math.sin(Date.now() / 150)) * 0.4;
      this.energyBar.fillColor = 0xff2200;
      this.energyBar.setAlpha(pulse);
    } else {
      this.energyBar.fillColor = 0xff8800;
      this.energyBar.setAlpha(1);
    }
  }

  _popup(text, color) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const txt = this.scene.add.text(
      this.worldX, this.groundY - this.config.height - 30, text,
      { fontSize: '18px', fill: hex, stroke: '#000', strokeThickness: 4 }
    ).setOrigin(0.5).setDepth(1000);
    this.scene.tweens.add({
      targets: txt, y: txt.y - 40, alpha: 0, duration: 900,
      onComplete: () => txt.destroy(),
    });
  }

  destroy() {
    super.destroy();
    this.energyBg.destroy();
    this.energyBar.destroy();
    this.zzzText.destroy();
  }
}
