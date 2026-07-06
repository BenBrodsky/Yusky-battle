import Phaser from 'phaser';
import { Enemy, ENEMY_STATES } from './Enemy.js';

// Three flavors of playground hooligan. Sizes are closer to the heroes now
// (heroes render 144-208px tall) so fights feel like fights, not stomping ants.
const VARIANTS = {
  meankid: {
    color: 0xcc2222, pantsColor: 0x2d3a4a, hairColor: 0x3a2414, skinColor: 0xe0a878,
    width: 46, height: 96,
    hp: 90, damage: 16, speed: 115,
    detectionRange: 360, attackRange: 74,
  },
  // Small, quick, weak — darts in, jabs, keeps you turning around
  speedy: {
    color: 0x22aacc, pantsColor: 0x223344, hairColor: 0x1a1a1a, skinColor: 0xd89868,
    cap: true, capColor: 0x115577,
    width: 40, height: 82,
    hp: 55, damage: 10, speed: 190,
    detectionRange: 420, attackRange: 66,
  },
  // Big, slow, hits like a truck — the crowd anchor you must respect
  bruiser: {
    color: 0x7744aa, pantsColor: 0x332244, hairColor: 0x222222, skinColor: 0xc98850,
    width: 60, height: 116,
    hp: 200, damage: 26, speed: 78,
    detectionRange: 340, attackRange: 88,
  },
};

export class MeanKid extends Enemy {
  constructor(scene, worldX, groundY, variant = 'meankid') {
    super(scene, worldX, groundY, { ...(VARIANTS[variant] ?? VARIANTS.meankid) });
    this.variant = variant;
    this.facing  = 'left'; // start facing player
  }
}

// ── Boss: The Bully King ──────────────────────────────────────────────
// A real end-of-stage fight:
//  - HP scales with player count (mob DPS scales linearly, so must he)
//  - Super armor: hits hurt him but never stun-lock him
//  - Every 8th hit he retaliates with a shove shockwave
//  - Phase 2 (<60%): faster, harder, gains a telegraphed charge attack
//  - Phase 3 (<25%): rage — faster still, and calls two speedy adds
export class BullyKing extends Enemy {
  constructor(scene, worldX, groundY, numPlayers = 1) {
    super(scene, worldX, groundY, {
      color: 0x991111, pantsColor: 0x331111, hairColor: 0x110a06, skinColor: 0xd89060,
      width: 84, height: 150,
      hp: 500 + 350 * Math.max(0, numPlayers - 1),
      damage: 24,
      speed: 85,
      detectionRange: 560,
      attackRange: 108,
      drawScale: 1.0,
    });
    this.facing  = 'left';
    this.isBoss  = true;
    this.phase   = 1;

    this._hitsTaken     = 0;
    this.chargeState    = null;  // null | 'windup' | 'dash'
    this.chargeTimer    = 0;
    this.chargeCooldown = 3.0;
    this.chargeDirX     = 0;
    this._addsSpawned   = false;

    // Crown lives inside the body container so it flips/scales/falls with him
    const headY = -this.config.height * 0.70 - Math.min(this.config.width * 0.42, this.config.height * 0.16) * 0.9;
    this.crown = scene.add.triangle(
      0, headY - 22, 0, 14, 14, -8, 28, 14, 0xffcc00
    ).setOrigin(0.5, 0.5);
    this.body.add(this.crown);
    this._parts.push({ obj: this.crown, color: 0xffcc00 });
  }

  // Super armor: damage lands, but he never enters HURT (no stun-lock) and
  // barely slides. Every 8th hit he answers with a shove shockwave.
  takeDamage(amount, knockbackX = 0) {
    if (!this.active || this.state === ENEMY_STATES.DEAD) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hitThisAttack = true;
    this._flashRed();

    if (this.hp <= 0) {
      this._triggerKO(knockbackX);
      return;
    }

    this.velX += knockbackX * 30; // token shove, decays in _runAI

    this._hitsTaken++;
    if (this._hitsTaken % 8 === 0 && !this.chargeState) {
      this._shockwave();
    }
  }

  _shockwave() {
    const { scene } = this;
    // Expanding ring telegraphs the shove
    const ring = scene.add.circle(this.worldX, this.groundY - this.config.height * 0.4, 20)
      .setStrokeStyle(5, 0xffdd44, 0.9).setDepth(this.groundY + 5);
    scene.tweens.add({
      targets: ring, radius: 160, alpha: 0, duration: 320,
      onUpdate: () => ring.setStrokeStyle(5, 0xffdd44, ring.alpha),
      onComplete: () => ring.destroy(),
    });
    scene.cameras.main.shake(100, 0.005);

    scene.players?.forEach(p => {
      if (!p?.active || p.isKO) return;
      const dx = p.worldX - this.worldX;
      const dy = (p.groundY - this.groundY) * 0.5;
      if (Math.hypot(dx, dy) < 170) {
        p.takeDamage(8, Math.sign(dx) || 1);
      }
    });
  }

  update(dt, gameScene) {
    if (!this.active || this.state === ENEMY_STATES.DEAD) return;
    if (this.state === ENEMY_STATES.KO) this.chargeState = null;

    // Phase transitions
    if (this.phase === 1 && this.hp < this.maxHP * 0.6) {
      this.phase = 2;
      this.config.speed  = 115;
      this.config.damage = 30;
      this.damage        = 30;
      this._roar(gameScene, 'GRRRAAAH!');
    }
    if (this.phase === 2 && this.hp < this.maxHP * 0.25) {
      this.phase = 3;
      this.config.speed  = 150;
      this.config.damage = 36;
      this.damage        = 36;
      this.chargeCooldown = Math.min(this.chargeCooldown, 1.5);
      this._roar(gameScene, 'MY PLAYGROUND!!');
      if (!this._addsSpawned && gameScene) {
        this._addsSpawned = true;
        gameScene._spawnEnemy({ kind: 'speedy', x: this.worldX - 160, y: Math.max(475, this.groundY - 60) });
        gameScene._spawnEnemy({ kind: 'speedy', x: this.worldX + 160, y: Math.min(675, this.groundY + 60) });
      }
    }

    // ── Charge attack (phase 2+) ─────────────────────────────────────
    if (this.chargeState) {
      this._updateCharge(dt, gameScene);
      this._syncSprites();
      return;
    }
    this.chargeCooldown = Math.max(0, this.chargeCooldown - dt);
    if (this.phase >= 2 && this.chargeCooldown <= 0 &&
        this.state !== ENEMY_STATES.KO && !this.isFlying) {
      const target = this._nearestPlayer(gameScene.players);
      if (target && Math.abs(target.worldX - this.worldX) > 200) {
        this.chargeState = 'windup';
        this.chargeTimer = 0.6;
        this.facing      = target.worldX >= this.worldX ? 'right' : 'left';
        this.velX = 0; this.velY = 0;
      }
    }

    super.update(dt, gameScene);
  }

  _updateCharge(dt, gameScene) {
    this.chargeTimer -= dt;

    if (this.chargeState === 'windup') {
      // Telegraph: shake in place so players see it coming
      this._jitter = Math.sin(Date.now() / 18) * 4;
      this._lean   = -6;
      if (this.chargeTimer <= 0) {
        this.chargeState = 'dash';
        this.chargeTimer = 0.85;
        this.chargeDirX  = this.facing === 'right' ? 1 : -1;
        this._jitter     = 0;
      }
      return;
    }

    // Dash: barrel forward, flatten anyone in the way
    this._lean  = this.chargeDirX * 10;
    this.worldX += this.chargeDirX * 430 * dt;
    this._stride += 430 * dt * 0.055;

    gameScene.players?.forEach(p => {
      if (!p?.active || p.isKO || p.invulnTimer > 0) return;
      const dx = Math.abs(p.worldX - this.worldX);
      const dy = Math.abs(p.groundY - this.groundY);
      if (dx < 70 && dy < 46) {
        p.takeDamage(this.damage, this.chargeDirX);
        gameScene.hitStop?.(0.06);
      }
    });

    if (this.chargeTimer <= 0 || this.worldX < 60) {
      this.chargeState    = null;
      this.chargeCooldown = this.phase === 3 ? 3.0 : 4.5;
      this._lean          = 0;
      this.attackCooldown = 0.5;
    }
  }

  _die() {
    super._die();
    this.scene.events.emit('bossDefeated');
  }

  _roar(gameScene, text) {
    this._flashRed();
    const txt = this.scene.add.text(this.worldX, this.groundY - this.config.height - 40, text, {
      fontSize: '24px', fontStyle: 'bold', fill: '#ff3322', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(1000);
    this.scene.tweens.add({
      targets: txt, y: txt.y - 50, alpha: 0, duration: 1400,
      onComplete: () => txt.destroy(),
    });
    this.scene.cameras.main.shake(200, 0.006);
  }
}
