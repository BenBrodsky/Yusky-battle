import Phaser from 'phaser';
import { FLOOR_TOP, FLOOR_BOTTOM, GRAVITY } from '../config/constants.js';

export const ENEMY_STATES = {
  IDLE:    'idle',
  PATROL:  'patrol',
  CHASE:   'chase',
  ATTACK:  'attack',
  HURT:    'hurt',
  KO:      'ko',      // just got KO'd — lying on ground, can be stomped
  DOWNED:  'downed',  // same as ko but for ground stomp targeting
  DEAD:    'dead',
  FLY:     'fly',     // being thrown by Ben
};

export class Enemy {
  constructor(scene, worldX, groundY, config) {
    this.scene   = scene;
    this.config  = config;

    this.worldX  = worldX;
    this.groundY = groundY;
    this.jumpZ   = 0;
    this.velX    = 0;
    this.velY    = 0;
    this.velZ    = 0;
    this.isFlying = false;
    this.flyVelX  = 0;
    this.flyVelZ  = 0;

    this.maxHP     = config.hp;
    this.hp        = config.hp;
    this.damage    = config.damage;
    this.active    = true;
    this.state     = ENEMY_STATES.IDLE;
    this.stateTimer = 0;
    this.attackCooldown = 0;
    this.hitThisAttack  = false;
    this.koTimer        = 0;
    this.staggered      = false; // one-time half-health knockdown spent?

    // Detection / attack ranges
    this.detectionRange = config.detectionRange ?? 320;
    this.attackRange    = config.attackRange    ?? 70;

    this._createSprites();
  }

  _createSprites() {
    const { config, scene } = this;

    this.shadow = scene.add.ellipse(
      this.worldX, this.groundY, 44, 14, 0x000000, 0.3
    );
    this.sprite = scene.add.rectangle(
      this.worldX, this.groundY - config.height / 2,
      config.width, config.height, config.color
    );

    // Eyes
    this.eyeL = scene.add.rectangle(0, 0, 7, 7, 0xffffff);
    this.eyeR = scene.add.rectangle(0, 0, 7, 7, 0xffffff);
    this.pupL = scene.add.rectangle(0, 0, 4, 4, 0x000000);
    this.pupR = scene.add.rectangle(0, 0, 4, 4, 0x000000);

    this.hpBarBg = scene.add.rectangle(0, 0, config.width, 5, 0x440000);
    this.hpBar   = scene.add.rectangle(0, 0, config.width, 5, 0xff2200);
  }

  getHurtbox() {
    return {
      x: this.worldX,
      y: this.groundY - this.config.height / 2,
      w: this.config.width * 0.85,
      h: this.config.height * 0.9,
    };
  }

  getAttackHitbox() {
    if (this.state !== ENEMY_STATES.ATTACK || this.hitThisAttack) return null;
    const dir = this.facing === 'left' ? -1 : 1;
    return {
      x: this.worldX + dir * (this.config.width * 0.5 + 30),
      y: this.groundY - this.config.height * 0.4,
      w: 60,
      h: 50,
      knockbackX: dir,
    };
  }

  takeDamage(amount, knockbackX = 0) {
    if (!this.active || this.state === ENEMY_STATES.DEAD) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hitThisAttack = true;
    this._flashRed();

    if (this.hp <= 0) {
      this._triggerKO(knockbackX);
      return;
    }

    // Already down (stagger or being stomped): stay down, just nudge — don't pop up
    if (this.state === ENEMY_STATES.DOWNED) {
      this.velX = knockbackX * 120;
      return;
    }

    // One-time knockdown when damage first reaches 50% — down 2s, then gets back up
    if (!this.staggered && this.hp <= this.maxHP * 0.5) {
      this.staggered = true;
      this._triggerKnockdown(knockbackX);
      return;
    }

    this.state      = ENEMY_STATES.HURT;
    this.stateTimer = 0.28;
    this.velX       = knockbackX * 180;
  }

  _flashRed() {
    this.sprite.setFillStyle(0xff8888);
    this.scene.time.delayedCall(200, () => {
      if (this.active && this.sprite?.active &&
          this.state !== ENEMY_STATES.KO) this.sprite.setFillStyle(this.config.color);
    });
  }

  _triggerKnockdown(knockbackX = 0) {
    this.state      = ENEMY_STATES.DOWNED;
    this.stateTimer = 2.0; // lies down for 2s, then gets up
    this.velX       = knockbackX * 220;
    this.velY       = 0;
  }

  _getUp() {
    this.state      = ENEMY_STATES.CHASE;
    this.velX       = 0;
    this.attackCooldown = 0.4; // brief beat before swinging again
    if (this.sprite?.active) this.sprite.setFillStyle(this.config.color);
  }

  _triggerKO(knockbackX = 0) {
    this.hp          = 0;
    this.state       = ENEMY_STATES.KO;
    this.koTimer     = 2.2;  // lies on ground for 2.2s before dying
    this.velX        = knockbackX * 160;
    this.sprite.setAngle(90);
    this.hpBar.setVisible(false);
    this.hpBarBg.setVisible(false);
  }

  update(dt, gameScene) {
    if (!this.active || this.state === ENEMY_STATES.DEAD) return;

    this.stateTimer     = Math.max(0, this.stateTimer - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    if (this.isFlying) {
      this._updateFly(dt, gameScene);
      this._syncSprites();
      return;
    }

    if (this.state === ENEMY_STATES.KO) {
      this.velX *= 0.85;
      this.worldX += this.velX * dt;
      this.koTimer -= dt;
      if (this.koTimer <= 0) this._die();
      this._syncSprites();
      return;
    }

    if (this.state === ENEMY_STATES.DOWNED) {
      this.velX *= 0.85;
      this.worldX += this.velX * dt;
      if (this.stateTimer <= 0) this._getUp();
      this._syncSprites();
      return;
    }

    if (this.state === ENEMY_STATES.HURT) {
      this.velX *= 0.85;
      this.worldX += this.velX * dt;
      if (this.stateTimer <= 0) this.state = ENEMY_STATES.CHASE;
      this._syncSprites();
      return;
    }

    this._runAI(dt, gameScene);
    this._applyPhysics(dt);
    this._syncSprites();
  }

  _runAI(dt, gameScene) {
    const target = this._nearestPlayer(gameScene.players);
    if (!target) { this.state = ENEMY_STATES.PATROL; return; }

    const dx   = target.worldX - this.worldX;
    const dy   = target.groundY - this.groundY;
    const dist = Math.sqrt(dx * dx + dy * dy * 0.25);

    this.facing = dx >= 0 ? 'right' : 'left';

    if (dist > this.detectionRange) {
      this.state = ENEMY_STATES.PATROL;
      this.velX  = 0;
      this.velY  = 0;
    } else if (dist < this.attackRange && this.attackCooldown <= 0) {
      this.state        = ENEMY_STATES.ATTACK;
      this.stateTimer   = 0.38;
      this.attackCooldown = 0.9;
      this.hitThisAttack = false;
      this.velX = 0;
      this.velY = 0;
    } else if (this.state !== ENEMY_STATES.ATTACK) {
      this.state = ENEMY_STATES.CHASE;
      const speed = this.config.speed ?? 110;
      const len   = Math.sqrt(dx * dx + dy * dy) || 1;
      this.velX   = (dx / len) * speed;
      this.velY   = (dy / len) * speed * 0.6;
    } else if (this.state === ENEMY_STATES.ATTACK && this.stateTimer <= 0) {
      this.state = ENEMY_STATES.CHASE;
    }
  }

  _updateFly(dt, gameScene) {
    this.flyVelZ -= GRAVITY * dt;
    this.jumpZ    = Math.max(0, this.jumpZ + this.flyVelZ * dt);
    this.worldX  += this.flyVelX * dt;
    this.flyVelX *= 0.98;

    if (this.jumpZ <= 0 && this.flyVelZ < 0) {
      // Landed — slam damage to nearby enemies
      this.isFlying = false;
      this.flyVelX  = 0;
      this.flyVelZ  = 0;
      // Check splash hits
      if (gameScene) {
        gameScene.enemies.forEach(e => {
          if (e === this || !e.active || e.state === ENEMY_STATES.DEAD) return;
          const d = Math.abs(e.worldX - this.worldX);
          if (d < 80) e.takeDamage(20, Math.sign(e.worldX - this.worldX));
        });
      }
      this._triggerKO(0);
    }
  }

  _applyPhysics(dt) {
    this.worldX  += this.velX * dt;
    this.groundY += this.velY * dt;
    this.groundY  = Phaser.Math.Clamp(this.groundY, FLOOR_TOP, FLOOR_BOTTOM);
  }

  _die() {
    this.active = false;
    this.state  = ENEMY_STATES.DEAD;
    this.sprite.destroy();
    this.shadow.destroy();
    this.eyeL.destroy(); this.eyeR.destroy();
    this.pupL.destroy(); this.pupR.destroy();
    this.hpBar.destroy(); this.hpBarBg.destroy();
    this.scene.events.emit('enemyDefeated', this);
  }

  _nearestPlayer(players) {
    let best = null, bestDist = Infinity;
    for (const p of players) {
      if (!p || !p.active || p.isKO) continue;
      const dx = p.worldX  - this.worldX;
      const dy = p.groundY - this.groundY;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    return best;
  }

  _syncSprites() {
    const sy = this.groundY - this.jumpZ;

    this.sprite.x = this.worldX;
    this.sprite.y = sy - this.config.height / 2;
    this.sprite.setDepth(this.groundY);

    this.shadow.x = this.worldX;
    this.shadow.y = this.groundY;
    this.shadow.setDepth(this.groundY - 1);

    const dir   = this.facing === 'right' ? 1 : -1;
    const eyeX  = this.worldX + dir * this.config.width * 0.2;
    const eyeY  = sy - this.config.height * 0.75;
    this.eyeL.x = eyeX - 5; this.eyeL.y = eyeY;
    this.eyeR.x = eyeX + 5; this.eyeR.y = eyeY;
    this.pupL.x = eyeX - 5 + dir; this.pupL.y = eyeY;
    this.pupR.x = eyeX + 5 + dir; this.pupR.y = eyeY;
    [this.eyeL, this.eyeR, this.pupL, this.pupR].forEach(e => e.setDepth(this.groundY + 1));

    // Floating HP bar over the head — normal enemies only. The boss uses the
    // dedicated bottom HUD bar instead, so hide his over-head bar.
    const showBar = !this.isBoss && this.state !== ENEMY_STATES.KO;
    this.hpBar.setVisible(showBar);
    this.hpBarBg.setVisible(showBar);
    if (showBar) {
      const hpFrac     = this.hp / this.maxHP;
      this.hpBar.width = this.config.width * hpFrac;
      this.hpBar.x     = this.worldX - (this.config.width - this.config.width * hpFrac) / 2;
      this.hpBar.y     = sy - this.config.height - 10;
      this.hpBarBg.x   = this.worldX;
      this.hpBarBg.y   = sy - this.config.height - 10;
      this.hpBar.setDepth(this.groundY + 2);
      this.hpBarBg.setDepth(this.groundY + 2);
    }

    // Lie down while KO'd or knocked down
    const lying = this.state === ENEMY_STATES.KO || this.state === ENEMY_STATES.DOWNED;
    this.sprite.setAngle(lying ? 90 : 0);
  }
}
