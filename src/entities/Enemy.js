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

// Same depth-scale band the player characters use — enemies grow toward the
// camera and shrink into the distance so everyone lives in the same world.
const DEPTH_SCALE_MIN = 0.6;
const DEPTH_SCALE_MAX = 1.3;

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
    this.hitThisAttack  = false;
    this.koTimer        = 0;
    this.staggerCount   = 0;    // how many knockdowns triggered (max 2: at 75%, at 25%)
    this.facing         = 'left';

    // Personality jitter so a crowd doesn't move/attack in lockstep
    this.speedMult      = 0.88 + Math.random() * 0.24;
    this.attackCooldown = Math.random() * 0.6;

    // Walk-cycle phase accumulated from actual movement (no foot-sliding)
    this._stride = Math.random() * Math.PI * 2;
    this._jitter = 0;   // horizontal shake used by boss wind-up telegraphs

    // Detection / attack ranges
    this.detectionRange = config.detectionRange ?? 320;
    this.attackRange    = (config.attackRange ?? 70) + Math.random() * 12;

    this._createSprites();
  }

  // ── Drawn body ─────────────────────────────────────────────────────
  // A little articulated hooligan built from shapes inside one container:
  // swinging arms and legs, a mop of hair, angry brows. The container is
  // positioned at the feet, flipped by facing, scaled by floor depth, and
  // rotated 90° when lying down.

  _createSprites() {
    const { config: c, scene } = this;
    const W = c.width, H = c.height;
    const skin  = c.skinColor ?? 0xe0a878;
    const shirt = c.color;
    const pants = c.pantsColor ?? 0x2d3a4a;
    const hair  = c.hairColor ?? 0x3a2414;

    this.shadow = scene.add.ellipse(this.worldX, this.groundY, W * 1.25, 14, 0x000000, 0.3);

    this._parts = [];
    const mk = (obj, color) => { this._parts.push({ obj, color }); return obj; };

    const headR = Math.min(W * 0.42, H * 0.16);
    const hipY  = -H * 0.45;
    const shoY  = -H * 0.70;
    const legW  = W * 0.22, legH = H * 0.46;
    const armW  = W * 0.17, armH = H * 0.36;
    const headY = shoY - headR * 0.9;

    // Built facing RIGHT; container scaleX flips for left.
    // Draw order: back limbs, torso, head, face, front limbs on top.
    this.armB = mk(scene.add.rectangle(-W * 0.36, shoY, armW, armH, shirt).setOrigin(0.5, 0), shirt);
    this.legB = mk(scene.add.rectangle(-W * 0.15, hipY, legW, legH, pants).setOrigin(0.5, 0), pants);
    this.legF = mk(scene.add.rectangle( W * 0.15, hipY, legW, legH, pants).setOrigin(0.5, 0), pants);
    this.torso = mk(scene.add.rectangle(0, hipY + 2, W * 0.80, H * 0.29, shirt).setOrigin(0.5, 1), shirt);
    this.head  = mk(scene.add.circle(0, headY, headR, skin), skin);
    this.hair  = mk(scene.add.ellipse(0, headY - headR * 0.55, headR * 2.15, headR * 1.15, hair), hair);
    this.eyeA  = mk(scene.add.circle(headR * 0.22, headY - headR * 0.05, headR * 0.15, 0x181818), 0x181818);
    this.eyeB  = mk(scene.add.circle(headR * 0.65, headY - headR * 0.05, headR * 0.15, 0x181818), 0x181818);
    this.brow  = mk(scene.add.rectangle(headR * 0.42, headY - headR * 0.40, headR * 1.05, headR * 0.16, hair)
      .setRotation(0.28), hair);
    this.mouth = mk(scene.add.rectangle(headR * 0.45, headY + headR * 0.50, headR * 0.65, headR * 0.14, 0x5a2020), 0x5a2020);

    const parts = [this.armB, this.legB, this.legF, this.torso, this.head, this.hair,
                   this.eyeA, this.eyeB, this.brow, this.mouth];

    // Optional backwards cap (variant flavor)
    if (c.cap) {
      const capCol = c.capColor ?? 0x2266cc;
      this.capDome = mk(scene.add.ellipse(0, headY - headR * 0.60, headR * 2.0, headR * 1.0, capCol), capCol);
      this.capBrim = mk(scene.add.rectangle(-headR * 1.15, headY - headR * 0.45, headR * 1.0, headR * 0.24, capCol), capCol);
      parts.push(this.capDome, this.capBrim);
    }

    this.armF = mk(scene.add.rectangle(W * 0.36, shoY, armW, armH, shirt).setOrigin(0.5, 0), shirt);
    this.fist = mk(scene.add.circle(W * 0.36, shoY + armH, armW * 0.62, skin), skin);
    parts.push(this.armF, this.fist);

    this.body = scene.add.container(this.worldX, this.groundY, parts);
    this.body.setDepth(this.groundY);
    this._armH = armH;

    this.hpBarBg = scene.add.rectangle(0, 0, c.width, 5, 0x440000);
    this.hpBar   = scene.add.rectangle(0, 0, c.width, 5, 0xff2200);
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
    // Only connect during the punch extension (back half of the swing)
    const progress = 1 - this.stateTimer / 0.38;
    if (progress < 0.45) return null;
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

    // First knockdown at 75% HP, second at 25% HP — each time stompable by
    // Ocean. Bosses are exempt: a knocked-down boss is a helpless punching bag
    // and gets bursted from 75% to 0 in the 2s window. The king fights normally.
    if (!this.isBoss) {
      if (this.staggerCount < 1 && this.hp <= this.maxHP * 0.75) {
        this.staggerCount++;
        this._triggerKnockdown(knockbackX);
        return;
      }
      if (this.staggerCount < 2 && this.hp <= this.maxHP * 0.25) {
        this.staggerCount++;
        this._triggerKnockdown(knockbackX);
        return;
      }
    }

    this.state      = ENEMY_STATES.HURT;
    this.stateTimer = 0.28;
    this.velX       = knockbackX * 180;
  }

  _flashRed() {
    this._parts.forEach(p => { if (p.obj.active) p.obj.setFillStyle(0xffffff); });
    this.scene.time.delayedCall(90, () => {
      if (!this.active) return;
      this._parts.forEach(p => { if (p.obj.active) p.obj.setFillStyle(p.color); });
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
  }

  _triggerKO(knockbackX = 0) {
    this.hp          = 0;
    this.state       = ENEMY_STATES.KO;
    this.koTimer     = 2.2;  // lies on ground for 2.2s before dying
    this.velX        = knockbackX * 160;
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
    this._stride += (Math.abs(this.velX) + Math.abs(this.velY)) * dt * 0.055;
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
      this.attackCooldown = 0.9 + Math.random() * 0.4;
      this.hitThisAttack = false;
      this.velX = 0;
      this.velY = 0;
    } else if (this.state !== ENEMY_STATES.ATTACK) {
      this.state = ENEMY_STATES.CHASE;
      const speed = (this.config.speed ?? 110) * this.speedMult;
      const len   = Math.sqrt(dx * dx + dy * dy) || 1;
      this.velX   = (dx / len) * speed;
      this.velY   = (dy / len) * speed * 0.6;
      this._separate(gameScene);
    } else if (this.state === ENEMY_STATES.ATTACK && this.stateTimer <= 0) {
      this.state = ENEMY_STATES.CHASE;
    }
  }

  // Soft crowd separation: nearby enemies push each other apart so a pack
  // fans out and surrounds the player instead of stacking into one blob.
  _separate(gameScene) {
    for (const o of gameScene.enemies) {
      if (o === this || !o.active || o.state === ENEMY_STATES.DEAD) continue;
      const dx = this.worldX - o.worldX;
      const dy = this.groundY - o.groundY;
      const d  = Math.hypot(dx, dy);
      if (d > 0.01 && d < 52) {
        this.velX += (dx / d) * 70;
        this.velY += (dy / d) * 45;
      }
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
        gameScene.spawnDust?.(this.worldX, this.groundY, 6);
        gameScene.cameras.main.shake(90, 0.006);
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
    this.body.destroy();   // destroys all child parts
    this.shadow.destroy();
    this.hpBar.destroy();
    this.hpBarBg.destroy();
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
    const sy  = this.groundY - this.jumpZ;
    const dir = this.facing === 'left' ? -1 : 1;

    const depthT = Math.max(0, Math.min(1, (this.groundY - FLOOR_TOP) / (FLOOR_BOTTOM - FLOOR_TOP)));
    const ds     = (DEPTH_SCALE_MIN + depthT * (DEPTH_SCALE_MAX - DEPTH_SCALE_MIN)) * (this.config.drawScale ?? 1);

    const lying = this.state === ENEMY_STATES.KO || this.state === ENEMY_STATES.DOWNED;

    this.body.setPosition(this.worldX + this._jitter, sy);
    this.body.setScale(dir * ds, ds);
    this.body.setAngle(lying ? 90 : (this.state === ENEMY_STATES.HURT ? -7 : (this._lean ?? 0)));
    this.body.setDepth(this.groundY);

    this.shadow.x = this.worldX;
    this.shadow.y = this.groundY;
    this.shadow.setScale(ds, ds);
    this.shadow.setDepth(this.groundY - 1);

    // ── Limb animation ────────────────────────────────────────────────
    if (lying) {
      // Sprawled: limbs relaxed outward
      this.legB.rotation = -0.35;
      this.legF.rotation =  0.30;
      this.armB.rotation = -0.9;
      this.armF.rotation =  0.8;
      this._placeFist();
    } else if (this.state === ENEMY_STATES.ATTACK) {
      // Wind-up (first 45%), then punch extension: front arm snaps forward
      const p = 1 - this.stateTimer / 0.38;
      if (p < 0.45) {
        const t = p / 0.45;
        this.armF.rotation = 0.75 * t;            // pull the fist back
        this.armB.rotation = -0.3 * t;
      } else {
        const t = (p - 0.45) / 0.55;
        this.armF.rotation = Phaser.Math.Linear(0.75, -1.62, Math.min(1, t * 1.4)); // snap forward
        this.armB.rotation = Phaser.Math.Linear(-0.3, 0.4, t);
      }
      this.legB.rotation = -0.18;
      this.legF.rotation =  0.22;
      this._placeFist();
    } else {
      const moving = Math.abs(this.velX) + Math.abs(this.velY) > 8;
      const swing  = moving ? Math.sin(this._stride) * 0.55 : 0;
      this.legB.rotation = swing;
      this.legF.rotation = -swing;
      this.armB.rotation = -swing * 0.7;
      this.armF.rotation = swing * 0.7;
      // Idle breathing bob on the torso
      if (!moving) {
        const breathe = Math.sin(Date.now() / 420) * 0.8;
        this.torso.y = -this.config.height * 0.45 + 2 + breathe * 0.4;
      }
      this._placeFist();
    }

    // Floating HP bar over the head — normal enemies only. The boss uses the
    // dedicated bottom HUD bar instead, so hide his over-head bar.
    const showBar = !this.isBoss && this.state !== ENEMY_STATES.KO;
    this.hpBar.setVisible(showBar);
    this.hpBarBg.setVisible(showBar);
    if (showBar) {
      const hpFrac     = this.hp / this.maxHP;
      const barY       = sy - this.config.height * ds - 12;
      this.hpBar.width = this.config.width * hpFrac;
      this.hpBar.x     = this.worldX - (this.config.width - this.config.width * hpFrac) / 2;
      this.hpBar.y     = barY;
      this.hpBarBg.x   = this.worldX;
      this.hpBarBg.y   = barY;
      this.hpBar.setDepth(this.groundY + 2);
      this.hpBarBg.setDepth(this.groundY + 2);
    }
  }

  // Keep the fist glued to the end of the front arm as it rotates
  _placeFist() {
    const a  = this.armF;
    this.fist.x = a.x + Math.sin(-a.rotation) * this._armH;
    this.fist.y = a.y + Math.cos(a.rotation) * this._armH;
  }
}
