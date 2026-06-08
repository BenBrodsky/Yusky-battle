import { Character } from './Character.js';
import { Projectile } from './Projectile.js';
import { MELEE_RANGE } from '../config/constants.js';

// Miles — punch/kick close combat, soccer ball boomerang, nuclear super mode.
export class Miles extends Character {
  constructor(scene, worldX, groundY, config, playerIndex) {
    super(scene, worldX, groundY, config, playerIndex);

    this.ballActive  = false;
    this.nuclear     = 0;   // 0–1 charge
    this.superActive = false;
    this.superTimer  = 0;

    // Nuclear meter bar (shown above head)
    this.nuclearBg  = this.scene.add.rectangle(0, 0, config.width, 5, 0x004400);
    this.nuclearBar = this.scene.add.rectangle(0, 0, 0, 5, 0x00ff44);
  }

  onAttack(gameScene) {
    if (!gameScene) return;
    const nearEnemy = this._findNearestEnemy(gameScene.enemies);
    const dist      = nearEnemy ? this._dist(nearEnemy) : Infinity;

    if (dist > MELEE_RANGE && !this.ballActive) {
      const dir  = this.facing === 'right' ? 1 : -1;
      const dmg  = this.superActive ? this.config.ballDmg * this.config.superMult : this.config.ballDmg;
      const ball = new Projectile(
        this.scene, this.worldX + dir * 30, this.groundY,
        'soccer_ball', dir, dmg, 'soccer', this
      );
      gameScene.projectiles.push(ball);
      this.ballActive = true;
      ball.onReturn = () => { this.ballActive = false; };
    }
  }

  getAttackDamage() {
    const base = [14, 16, 20][this.comboStep] ?? 14;
    return this.superActive ? base * this.config.superMult : base;
  }

  hitConfirm() {
    super.hitConfirm();
    if (!this.superActive) {
      this.nuclear = Math.min(1, this.nuclear + this.config.superFill);
      if (this.nuclear >= 1) this._activateSuper();
    }
  }

  _activateSuper() {
    if (this.superActive) return;
    this.superActive = true;
    this.superTimer  = 8.0;
    this.nuclear     = 1;
    this._flashTint(0x00ff44, 0.4);
    this._popup('NUCLEAR!!!', 0x00ff44);
    // Glow tint
    this.scene.tweens.add({
      targets: this.sprite,
      fillColor: { from: 0x00ff44, to: this.config.color },
      duration: 400, ease: 'Sine.easeInOut',
    });
  }

  update(dt, input, gameScene) {
    if (this.superActive) {
      this.superTimer -= dt;
      if (this.superTimer <= 0) {
        this.superActive = false;
        this.nuclear     = 0;
      }
    }
    super.update(dt, input, gameScene);
  }

  _syncSprites() {
    super._syncSprites();
    const sy = this.groundY - this.jumpZ;
    const bx = this.worldX;
    const by = sy - this.config.height - 22;

    this.nuclearBg.x  = bx;
    this.nuclearBg.y  = by;
    this.nuclearBar.width = this.config.width * this.nuclear;
    this.nuclearBar.x = bx - (this.config.width - this.config.width * this.nuclear) / 2;
    this.nuclearBar.y = by;
    this.nuclearBg.setDepth(this.groundY + 2);
    this.nuclearBar.setDepth(this.groundY + 2);

    if (this.superActive) {
      const glow = 0.7 + Math.sin(Date.now() / 120) * 0.3;
      this.sprite.setAlpha(glow);
    }
  }

  _findNearestEnemy(enemies) {
    let best = null, bestDist = Infinity;
    for (const e of enemies) {
      if (!e.active || e.state === 'dead') continue;
      const d = this._dist(e);
      if (d < bestDist) { bestDist = d; best = e; }
    }
    return best;
  }

  _dist(e) {
    const dx = e.worldX - this.worldX;
    const dy = (e.groundY - this.groundY) * 0.5;
    return Math.sqrt(dx * dx + dy * dy);
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
    this.nuclearBg.destroy();
    this.nuclearBar.destroy();
  }
}
