import { GAME_WIDTH, FLOOR_TOP, FLOOR_BOTTOM } from '../config/constants.js';

// Range constants (in world pixels)
const TENNIS_RANGE = Math.round(GAME_WIDTH * (2 / 3)); // ~853px — long lob

const SOCCER_FRICTION    = 320; // px/s^2 — rolls to a stop in ~1.7s (~455px)
const SOCCER_RETURN_SPEED = 560; // px/s homing back to Miles after a hit
const PICKUP_RADIUS       = 42; // px — Miles touches a stopped ball to reclaim it

const DEPTH_SCALE_MIN = 0.6;
const DEPTH_SCALE_MAX = 1.3;

export class Projectile {
  constructor(scene, worldX, groundY, textureKey, dir, damage, kind, owner) {
    this.scene     = scene;
    this.worldX    = worldX;
    this.groundY   = groundY;
    this.dir       = dir;
    this.damage    = damage;
    this.kind      = kind;   // 'tennis' | 'soccer'
    this.owner     = owner;
    this.active    = true;
    this.returning = false;
    this.loose     = false;  // soccer: rolled to a stop, waiting to be picked up
    this.onReturn  = null;

    this.launchX  = worldX;
    this.maxRange = TENNIS_RANGE;

    const speed  = kind === 'soccer' ? 540 : 460;
    this.velX    = dir * speed;
    this.hitEnemies = new Set();

    const hasTexture = textureKey && scene.textures.exists(textureKey);
    if (hasTexture) {
      this.sprite = scene.add.image(worldX, groundY, textureKey);
      const src = scene.textures.get(textureKey).source[0];
      const srcW = src?.width  || this.sprite.width;
      const srcH = src?.height || this.sprite.height;
      const dispH = kind === 'soccer' ? 50 : 24;
      const dispW = srcH > 0 ? Math.round(srcW / srcH * dispH) : dispH;
      this._baseW = dispW;
      this._baseH = dispH;
      this.sprite.setDisplaySize(dispW, dispH);
    } else {
      this.sprite = scene.add.circle(
        worldX, groundY,
        kind === 'soccer' ? 10 : 8,
        kind === 'soccer' ? 0xffffff : 0xddff00
      );
    }
    this.sprite.setDepth(groundY + 5);

    const shadowW = kind === 'soccer' ? 28 : 18;
    this.shadow = scene.add.ellipse(worldX, groundY + 2, shadowW, shadowW * 0.35, 0x000000, 0.28);
    this.shadow.setDepth(groundY - 1);
  }

  update(dt, gameScene) {
    if (!this.active) return;

    if (this.kind === 'soccer') this._updateSoccer(dt, gameScene);
    else                        this._updateTennis(dt);

    if (this.active) this._syncSprite();
  }

  _updateTennis(dt) {
    if (this.returning) {
      const dx    = this.owner.worldX - this.worldX;
      this.velX   = Math.sign(dx) * 520;
      this.worldX += this.velX * dt;
      if (Math.abs(dx) < 30) { this._return(); return; }
    } else {
      this.worldX += this.velX * dt;

      // Turn around once max range is reached
      const traveled = Math.abs(this.worldX - this.launchX);
      if (traveled >= this.maxRange) {
        this.returning = true;
        this.velX      = -this.velX;
      }
    }
  }

  _updateSoccer(dt, gameScene) {
    if (this.returning) {
      // Home in on Miles' current position (both axes) until it reaches him
      const dx   = this.owner.worldX  - this.worldX;
      const dy   = this.owner.groundY - this.groundY;
      const dist = Math.hypot(dx, dy);
      if (dist < PICKUP_RADIUS) { this._return(); return; }
      this.worldX  += (dx / dist) * SOCCER_RETURN_SPEED * dt;
      this.groundY += (dy / dist) * SOCCER_RETURN_SPEED * dt;
      this.velX = Math.sign(dx) * SOCCER_RETURN_SPEED; // drives spin direction
      return;
    }

    if (this.loose) {
      // Ball sits on the ground until Miles touches it
      const dx = this.owner.worldX  - this.worldX;
      const dy = this.owner.groundY - this.groundY;
      if (Math.hypot(dx, dy) < PICKUP_RADIUS) this._return();
      return;
    }

    // Rolling: friction bleeds speed until the ball stops
    this.worldX += this.velX * dt;
    const speed = Math.max(0, Math.abs(this.velX) - SOCCER_FRICTION * dt);
    this.velX   = Math.sign(this.velX) * speed;

    // Don't roll out of the reachable world
    const maxX = (gameScene?.currentLevel?.worldWidth ?? Infinity) - 24;
    if (this.worldX < 24 || this.worldX > maxX) {
      this.worldX = Math.min(Math.max(this.worldX, 24), maxX);
      this.velX   = 0;
    }

    if (speed < 20 || this.velX === 0) {
      this.velX  = 0;
      this.loose = true;
    }
  }

  overlaps(entity) {
    if (!this.active) return false;
    const dx = Math.abs(this.worldX - entity.worldX);
    const dy = Math.abs(this.groundY - entity.groundY) * 0.5;
    return Math.sqrt(dx * dx + dy * dy) < 40;
  }

  onHitEnemy(enemy) {
    if (this.hitEnemies.has(enemy)) return;
    this.hitEnemies.add(enemy);
    // Both balls bounce back on first hit; soccer homes to Miles from there
    if (!this.returning) {
      this.returning = true;
      this.velX      = -this.velX * 0.75;
    }
  }

  _return() {
    this.active = false;
    this.sprite.destroy();
    this.shadow.destroy();
    if (this.onReturn) this.onReturn();
  }

  _syncSprite() {
    this.sprite.x = this.worldX;
    this.sprite.y = this.groundY;
    this.sprite.setDepth(this.groundY + 5);
    this.shadow.x = this.worldX;
    this.shadow.y = this.groundY + 4;

    if (this._baseW) {
      const t = Math.max(0, Math.min(1, (this.groundY - FLOOR_TOP) / (FLOOR_BOTTOM - FLOOR_TOP)));
      const scale = DEPTH_SCALE_MIN + t * (DEPTH_SCALE_MAX - DEPTH_SCALE_MIN);
      this.sprite.setDisplaySize(Math.round(this._baseW * scale), Math.round(this._baseH * scale));
      const shadowBase = this.kind === 'soccer' ? 28 : 18;
      this.shadow.setSize(shadowBase * scale, shadowBase * scale * 0.35);
    }

    if (this.kind === 'soccer' && this.velX !== 0) {
      // Fast spin the whole time it's moving (floor keeps it lively as it
      // slows); only a stopped ball stops spinning
      const rate = Math.max(0.16, 1.0 * Math.abs(this.velX) / 540);
      this.sprite.rotation += Math.sign(this.velX) * rate;
    }
  }
}
