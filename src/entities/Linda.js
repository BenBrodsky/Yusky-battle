import { Character } from './Character.js';
import { Projectile } from './Projectile.js';
import { MELEE_RANGE } from '../config/constants.js';

// Linda — tennis racket close combat, lob shot ranged.
export class Linda extends Character {
  constructor(scene, worldX, groundY, config, playerIndex) {
    super(scene, worldX, groundY, config, playerIndex);
    this.ballActive = false;
  }

  _createSprites() {
    super._createSprites();
    // Racket — a thin rectangle held to the side
    this.racket = this.scene.add.rectangle(0, 0, 8, 36, 0xdddddd);
    this.racketHead = this.scene.add.ellipse(0, 0, 22, 28, 0xaaddff, 0.7);
  }

  onAttack(gameScene) {
    if (!gameScene) return;
    const nearEnemy = this._findNearestEnemy(gameScene.enemies);
    const dist      = nearEnemy ? this._dist(nearEnemy) : Infinity;

    if (dist > MELEE_RANGE && !this.ballActive) {
      // Ranged: lob a tennis ball
      const dir = this.facing === 'right' ? 1 : -1;
      const ball = new Projectile(
        this.scene, this.worldX + dir * 30, this.groundY,
        'tennis_ball', dir, this.config.rangedDmg, 'tennis', this
      );
      gameScene.projectiles.push(ball);
      this.ballActive = true;
      ball.onReturn = () => { this.ballActive = false; };
    }
    // Close range: handled by getAttackHitbox()
  }

  getAttackDamage() {
    // Forehand → Backhand → Overhead
    return [16, 18, 24][this.comboStep] ?? 16;
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

  _syncSprites() {
    super._syncSprites();
    const dir  = this.facing === 'right' ? 1 : -1;
    const sy   = this.groundY - this.jumpZ;
    const rx   = this.worldX + dir * (this.config.width * 0.45 + 12);
    const ry   = sy - this.config.height * 0.5;

    this.racket.x     = rx;
    this.racket.y     = ry;
    this.racketHead.x = rx;
    this.racketHead.y = ry - 18;
    [this.racket, this.racketHead].forEach(r => r.setDepth(this.groundY + 3));

    if (this.state === 'attack') {
      const swing = Math.sin(this.stateTimer * 18) * 20;
      this.racket.rotation     = dir * swing * 0.05;
      this.racketHead.rotation = dir * swing * 0.05;
    } else {
      this.racket.rotation     = 0;
      this.racketHead.rotation = 0;
    }
  }

  destroy() {
    super.destroy();
    this.racket.destroy();
    this.racketHead.destroy();
  }
}
