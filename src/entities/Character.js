import Phaser from 'phaser';
import {
  FLOOR_TOP, FLOOR_BOTTOM,
  GRAVITY, JUMP_VELOCITY,
  WALK_SPEED, DEPTH_SPEED,
  ATTACK_REACH, HURT_FRAMES, KO_BLINK, INVULN_TIME,
} from '../config/constants.js';

export class Character {
  constructor(scene, worldX, groundY, config, playerIndex) {
    this.scene       = scene;
    this.config      = config;
    this.playerIndex = playerIndex;

    // World position
    this.worldX  = worldX;
    this.groundY = groundY;
    this.jumpZ   = 0;   // height above ground
    this.velX    = 0;
    this.velY    = 0;   // depth velocity
    this.velZ    = 0;   // jump velocity

    // Stats
    this.maxHP = config.maxHP;
    this.hp    = config.maxHP;
    this.lives = 3;

    // State
    this.state         = 'idle';
    this.facing        = 'right';
    this.stateTimer    = 0;
    this.invulnTimer   = 0;
    this.comboStep     = 0;
    this.comboTimer    = 0;
    this.active        = true;
    this.isKO          = false;
    this.koBlinkTimer  = 0;
    this.hitThisSwing  = false;

    this._createSprites();
    this._createKOStars();
  }

  _createSprites() {
    const { config, scene } = this;

    // Shadow (stays at groundY regardless of jump)
    this.shadow = scene.add.ellipse(this.worldX, this.groundY, 50, 16, 0x000000, 0.35);
    this.shadow.setDepth(this.groundY - 1);

    // Main body rectangle (placeholder)
    this.sprite = scene.add.rectangle(
      this.worldX,
      this.groundY - config.height / 2,
      config.width,
      config.height,
      config.color
    );
    this.sprite.setDepth(this.groundY);

    // Eye whites
    const eyeOffX = config.width * 0.25;
    this.eyeL = scene.add.rectangle(
      this.worldX - eyeOffX, this.groundY - config.height * 0.8,
      8, 8, 0xffffff
    );
    this.eyeR = scene.add.rectangle(
      this.worldX + eyeOffX, this.groundY - config.height * 0.8,
      8, 8, 0xffffff
    );

  }

  _createKOStars() {
    this.koStars = [];
    for (let i = 0; i < 3; i++) {
      const star = this.scene.add.text(0, 0, '★', {
        fontSize: '16px', fill: '#ffff00', stroke: '#aa6600', strokeThickness: 2,
      }).setOrigin(0.5).setVisible(false);
      this.koStars.push(star);
    }
  }

  // ── Subclass hooks ────────────────────────────────────────────────
  onAttack()  {} // override to fire projectile etc.
  onLand()    {} // called when jump lands
  onKO()      {}

  // ── Public API ───────────────────────────────────────────────────

  takeDamage(amount, knockbackX = 0) {
    if (!this.active || this.invulnTimer > 0 || this.isKO) return;
    this.hp = Math.max(0, this.hp - amount);

    if (this.hp <= 0) {
      this._triggerKO();
      return;
    }
    this.state       = 'hurt';
    this.stateTimer  = HURT_FRAMES;
    this.invulnTimer = INVULN_TIME;
    this.velX        = knockbackX * 220;
    this.scene.cameras.main.shake(80, 0.005);
    this._flashTint(0xff4444, 0.3);
  }

  heal(amount) {
    if (!this.active) return;
    this.hp = Math.min(this.maxHP, this.hp + amount);
    this._flashTint(0x44ff88, 0.3);
  }

  receiveHug() {
    this.heal(this.config.healFromHug || 20);
  }

  getHurtbox() {
    return {
      x: this.worldX,
      y: this.groundY - this.config.height / 2,
      w: this.config.width * 0.8,
      h: this.config.height * 0.9,
    };
  }

  getAttackHitbox() {
    if (this.state !== 'attack' || this.hitThisSwing) return null;
    const dir = this.facing === 'right' ? 1 : -1;
    return {
      x:  this.worldX + dir * (this.config.width * 0.5 + ATTACK_REACH / 2),
      y:  this.groundY - this.config.height * 0.45,
      w:  ATTACK_REACH,
      h:  this.config.height * 0.7,
      knockbackX: dir,
    };
  }

  getAttackDamage() {
    return this.config.meleeDmg || 15;
  }

  hitConfirm() {
    this.hitThisSwing = true;
  }

  isGrounded() { return this.jumpZ <= 0; }

  // ── Update ────────────────────────────────────────────────────────

  update(dt, input, gameScene) {
    if (!this.active) return;

    this.stateTimer  = Math.max(0, this.stateTimer - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.comboTimer  = Math.max(0, this.comboTimer  - dt);

    if (this.comboTimer <= 0) this.comboStep = 0;

    // Release attack state once its timer expires so the next attack and jump work
    if (this.state === 'attack' && this.stateTimer <= 0) {
      this.state = 'idle';
      this.hitThisSwing = false;
    }

    if (this.isKO) {
      this._updateKO(dt);
      this._syncSprites();
      return;
    }

    if (this.state === 'hurt') {
      this._applyPhysics(dt);
      this.velX *= 0.8;
      this._syncSprites();
      if (this.stateTimer <= 0) this.state = 'idle';
      return;
    }

    if (this.state === 'attack' && this.stateTimer > 0) {
      this._applyPhysics(dt);
      this._syncSprites();
      return;
    }

    this._handleMovement(dt, input);
    this._handleJump(dt, input);
    this._handleAttack(dt, input, gameScene);
    this._handleHug(dt, input, gameScene);
    this._applyPhysics(dt);
    this._syncSprites();
  }

  _handleMovement(dt, input) {
    const speed = this.config.speed;
    const dspeed = this.config.depthSpeed;

    if (input.left)  { this.velX = -speed; this.facing = 'left';  }
    else if (input.right) { this.velX = speed;  this.facing = 'right'; }
    else this.velX = 0;

    if (input.up)        this.velY = -dspeed;
    else if (input.down) this.velY =  dspeed;
    else                 this.velY = 0;

    // Clamp depth
    const nextY = this.groundY + this.velY * dt;
    if (nextY < FLOOR_TOP)    this.velY = 0;
    if (nextY > FLOOR_BOTTOM) this.velY = 0;

    if (this.velX !== 0 || this.velY !== 0) {
      if (this.state === 'idle') this.state = 'walk';
    } else {
      if (this.state === 'walk') this.state = 'idle';
    }
  }

  _handleJump(dt, input) {
    if (input.jumpJust && this.isGrounded() && this.state !== 'attack') {
      this.velZ  = JUMP_VELOCITY;
      this.state = 'jump';
    }

    // Run while airborne OR at launch (jumpZ is still 0 on the press frame)
    if (!this.isGrounded() || this.velZ > 0) {
      this.velZ -= GRAVITY * dt;
      this.jumpZ += this.velZ * dt;
      if (this.jumpZ <= 0) {
        this.jumpZ = 0;
        this.velZ  = 0;
        this.onLand();
        this.state = this.velX !== 0 || this.velY !== 0 ? 'walk' : 'idle';
      }
    }
  }

  _handleAttack(dt, input, gameScene) {
    if (input.attackJust && this.state !== 'attack') {
      this.state        = 'attack';
      this.stateTimer   = 0.32;
      this.hitThisSwing = false;
      this.comboStep    = (this.comboStep + 1) % 3;
      this.comboTimer   = 0.55;
      this.onAttack(gameScene);
    }
  }

  _handleHug(dt, input, gameScene) {
    if (!input.hugJust) return;
    // Let GameScene handle the mutual logic; just signal willingness
  }

  _applyPhysics(dt) {
    this.worldX  += this.velX * dt;
    this.groundY += this.velY * dt;

    // Clamp depth
    this.groundY = Phaser.Math.Clamp(this.groundY, FLOOR_TOP, FLOOR_BOTTOM);

    // Basic world X clamp (no scrolling past x=0)
    this.worldX = Math.max(30, this.worldX);
  }

  _updateKO(dt) {
    this.koBlinkTimer -= dt;

    const blinkRate = 0.15;
    const visible   = Math.floor(this.koBlinkTimer / blinkRate) % 2 === 0;
    this.sprite.setAlpha(visible ? 1 : 0);

    // Animate KO stars in a circle above head
    const t = Date.now() / 400;
    this.koStars.forEach((star, i) => {
      const angle = t + (i / 3) * Math.PI * 2;
      star.x = this.worldX + Math.cos(angle) * 24;
      star.y = this.groundY - this.config.height - 20 + Math.sin(angle) * 10;
      star.setDepth(this.groundY + 10);
      star.setVisible(true);
    });

    if (this.koBlinkTimer <= 0) {
      this._despawnKO();
    }
  }

  _triggerKO() {
    this.hp          = 0;
    this.isKO        = true;
    this.koBlinkTimer = KO_BLINK;
    this.state       = 'ko';
    this.velX        = 0;
    this.velY        = 0;
    this.onKO();
    this.scene.events.emit('playerKO', this.playerIndex);
    this._flashTint(0x888888, 0.5);
  }

  _despawnKO() {
    this.koStars.forEach(s => s.setVisible(false));
    if (this.lives > 0) {
      this.lives--;
      this._respawn();
    } else {
      this.active = false;
      this._setVisible(false);
      this.scene.events.emit('playerDespawned', this.playerIndex);
    }
  }

  _respawn() {
    this.hp           = this.maxHP;
    this.isKO         = false;
    this.state        = 'idle';
    this.velX         = 0;
    this.velY         = 0;
    this.velZ         = 0;
    this.jumpZ        = 0;
    this.invulnTimer  = 3.0;
    this.hitThisSwing = false;
    this._setVisible(true);
    this._flashTint(0x44aaff, 0.5);
    this.scene.events.emit('playerRespawned', this.playerIndex, this.lives);
  }

  _flashTint(color, _duration) {
    this.sprite.setFillStyle(color);
    this.scene.time.delayedCall(200, () => {
      if (this.active && this.sprite?.active) this.sprite.setFillStyle(this.config.color);
    });
  }

  _syncSprites() {
    const sy = this.groundY - this.jumpZ;

    this.sprite.x = this.worldX;
    this.sprite.y = sy - this.config.height / 2;
    this.sprite.setDepth(this.groundY);

    this.shadow.x = this.worldX;
    this.shadow.y = this.groundY;
    const ss = Math.max(0.3, 1 - this.jumpZ / 250);
    this.shadow.setScale(ss, ss * 0.5);
    this.shadow.setDepth(this.groundY - 1);

    const eyeOffX = (this.facing === 'right' ? 1 : -1) * this.config.width * 0.2;
    const eyeY    = sy - this.config.height * 0.75;
    this.eyeL.x   = this.worldX + eyeOffX - 5;
    this.eyeL.y   = eyeY;
    this.eyeR.x   = this.worldX + eyeOffX + 5;
    this.eyeR.y   = eyeY;
    this.eyeL.setDepth(this.groundY + 1);
    this.eyeR.setDepth(this.groundY + 1);

    // Walking bob
    if (this.state === 'walk') {
      const bob = Math.sin(Date.now() / 100) * 2;
      this.sprite.y += bob;
    }

    // Attack scale pulse
    if (this.state === 'attack') {
      const pulse = 1 + Math.sin(this.stateTimer * 30) * 0.07;
      this.sprite.setScale(pulse);
    } else {
      this.sprite.setScale(1);
    }

    // Invuln flicker
    if (this.invulnTimer > 0) {
      const flicker = Math.floor(this.invulnTimer / 0.08) % 2 === 0;
      this.sprite.setAlpha(flicker ? 0.4 : 1.0);
    } else if (!this.isKO) {
      this.sprite.setAlpha(1.0);
    }
  }

  _setVisible(v) {
    this.sprite.setVisible(v);
    this.eyeL.setVisible(v);
    this.eyeR.setVisible(v);
    this.shadow.setVisible(v);
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    this.eyeL.destroy();
    this.eyeR.destroy();
    this.koStars.forEach(s => s.destroy());
  }
}
