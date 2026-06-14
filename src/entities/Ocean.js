import Phaser from 'phaser';
import { Character } from './Character.js';
import { JUMP_VELOCITY, ATTACK_REACH, FLOOR_TOP, FLOOR_BOTTOM } from '../config/constants.js';

const ATTACK_DURATION    = 0.48; // 6 frames × 80ms
const CORD_LEN           = 26;

const WALK_FRAME_MS   = 130;
const BASE_SPRITE_H   = 128; // 20% smaller than Miles (160)
const DEPTH_SCALE_MIN = 0.6;
const DEPTH_SCALE_MAX = 1.3;

const WALK_SPRITE_KEYS = [
  'ocean_walk_r1', 'ocean_walk_r2', 'ocean_walk_r3',
  'ocean_walk_r4', 'ocean_walk_r5', 'ocean_walk_r6',
  'ocean_idle_r',  'ocean_jump_r',
  'ocean_walk_l1', 'ocean_walk_l2', 'ocean_walk_l3',
  'ocean_walk_l4', 'ocean_walk_l5', 'ocean_walk_l6',
  'ocean_idle_l',  'ocean_jump_l',
];
const FRAMES_PER_DIR = 8;
const IDLE_FRAME     = 6;
const JUMP_FRAME     = 7;
const WALK_SEQUENCE  = [0, 1, 2, 3, 4, 5];

const ATTACK_SPRITE_KEYS = [
  'ocean_attack_r1', 'ocean_attack_r2', 'ocean_attack_r3',
  'ocean_attack_r4', 'ocean_attack_r5', 'ocean_attack_r6',
  'ocean_attack_l1', 'ocean_attack_l2', 'ocean_attack_l3',
  'ocean_attack_l4', 'ocean_attack_l5', 'ocean_attack_l6',
];
const N_ATTACK_FRAMES = 6;

export class Ocean extends Character {
  constructor(scene, worldX, groundY, config, playerIndex) {
    super(scene, worldX, groundY, config, playerIndex);

    this.energy      = config.maxEnergy;
    this.napTimer    = 0;
    this.isNapping   = false;
    this.stompTarget = null;
    this.stompBounce = false;

    // Nunchuck state — 0: pre-first-hit, 1: between hits, 2: done
    this.nunchuckPhase = 0;

    // ── Energy bar ───────────────────────────────────────────────────
    this.energyBg  = scene.add.rectangle(0, 0, config.width, 5, 0x442200);
    this.energyBar = scene.add.rectangle(0, 0, config.width, 5, 0xff8800);

    // ── Zzz text ─────────────────────────────────────────────────────
    this.zzzText = scene.add.text(0, 0, 'zzz', {
      fontSize: '16px', fill: '#88aaff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setVisible(false).setDepth(2000);

    // ── Stuffed rabbit visual ────────────────────────────────────────
    // Body (red ellipse) + two ear nubs (rectangles)
    this.rabbitBody = scene.add.ellipse(0, 0, 14, 18, 0xdd2222).setDepth(this.groundY + 3); // red
    this.rabbitEarL = scene.add.rectangle(0, 0, 4, 7, 0xbb1111).setDepth(this.groundY + 3); // dark red ears
    this.rabbitEarR = scene.add.rectangle(0, 0, 4, 7, 0xbb1111).setDepth(this.groundY + 3);
    this.rabbitEye  = scene.add.circle(0, 0, 2, 0x000000).setDepth(this.groundY + 4);
    // Cord drawn with graphics each frame
    this.rabbitCord = scene.add.graphics().setDepth(this.groundY + 2);

    this._initWalkSprite();
  }

  _initWalkSprite() {
    this._hasSprites = WALK_SPRITE_KEYS.every(k => this.scene.textures.exists(k));
    if (!this._hasSprites) return;

    this.walkFrames = WALK_SPRITE_KEYS.map(key =>
      this.scene.add.image(this.worldX, this.groundY, key)
        .setOrigin(0.5, 1)
        .setVisible(false)
    );
    this.walkSprite      = this.walkFrames[0];
    this._activeFrameIdx = -1;

    this._hasAttackSprites = ATTACK_SPRITE_KEYS.every(k => this.scene.textures.exists(k));
    if (this._hasAttackSprites) {
      this.attackFrames = ATTACK_SPRITE_KEYS.map(key =>
        this.scene.add.image(this.worldX, this.groundY, key)
          .setOrigin(0.5, 1)
          .setVisible(false)
      );
      this._activeAttackIdx = -1;
    }

    if (this.scene.textures.exists('ocean_sleep')) {
      this.sleepSprite = this.scene.add.image(this.worldX, this.groundY, 'ocean_sleep')
        .setOrigin(0.5, 1)
        .setVisible(false);
    }

    this._hasDownSprite = this.scene.textures.exists('ocean_down_r') &&
                          this.scene.textures.exists('ocean_down_l');
    if (this._hasDownSprite) {
      this.downFrames = {
        right: this.scene.add.image(this.worldX, this.groundY, 'ocean_down_r').setOrigin(0.5, 1).setVisible(false),
        left:  this.scene.add.image(this.worldX, this.groundY, 'ocean_down_l').setOrigin(0.5, 1).setVisible(false),
      };
    }
  }

  // ── Attack overrides ──────────────────────────────────────────────

  onAttack() {
    this.stateTimer    = ATTACK_DURATION;   // faster than base
    this.nunchuckPhase = 0;
    this.hitThisSwing  = false;
    this.energy = Math.max(0, this.energy - this.config.attackDrain);
  }

  getAttackHitbox() {
    if (this.state !== 'attack' || this.hitThisSwing) return null;
    const progress = 1 - (this.stateTimer / ATTACK_DURATION);
    if (progress < 0.2 || progress > 0.85) return null;
    const dir    = this.facing === 'right' ? 1 : -1;
    const reach  = 50; // shorter than standard 85 — must get close
    return {
      x:          this.worldX + dir * (this.config.width * 0.5 + reach / 2),
      y:          this.groundY - this.config.height * 0.45,
      w:          reach,
      h:          this.config.height * 0.7,
      knockbackX: dir,
    };
  }

  hitConfirm() {
    this.hitThisSwing = true;
  }

  getAttackDamage() { return this.config.meleeDmg; }

  // ── Main update ───────────────────────────────────────────────────

  update(dt, input, gameScene) {
    if (this.isNapping) {
      this._updateNap(dt);
      this._syncSprites();
      return;
    }

    if ((input.left || input.right || input.up || input.down) && this.isGrounded()) {
      this.energy = Math.max(0, this.energy - this.config.energyDrain * dt);
    }

    if (this.energy <= 0 && !this.isNapping) {
      this._triggerNap();
      return;
    }

    // Stomp loop
    if (this.stompTarget && this.isGrounded() && !this.stompBounce) {
      this._doStomp();
    }

    if (input.attackJust && this.isGrounded() && gameScene) {
      const downed = this._findDownedEnemy(gameScene.enemies);
      if (downed) {
        this.stompTarget = downed;
        this.stompBounce = false;
        this.velZ  = JUMP_VELOCITY * 0.55;
        this.jumpZ = 1;
        this.state = 'jump';
        this.energy = Math.max(0, this.energy - this.config.attackDrain);
        return;
      }
    }

    super.update(dt, input, gameScene);
  }

  onLand() {
    if (this.stompTarget) this.stompBounce = false;
  }

  // ── Stomp ─────────────────────────────────────────────────────────

  _doStomp() {
    const t = this.stompTarget;
    if (!t || !t.active || t.state === 'dead') { this.stompTarget = null; return; }

    const dx = Math.abs(t.worldX - this.worldX);
    const dy = Math.abs(t.groundY - this.groundY);
    if (dx > 60 || dy > 50) { this.stompTarget = null; return; }

    t.takeDamage(this.config.stompDmg, 0);
    this._popup('STOMP!', 0xff4400);

    if (t.hp <= 0 || t.state === 'dead') { this.stompTarget = null; return; }

    this.stompBounce = true;
    this.velZ  = JUMP_VELOCITY * 0.5;
    this.jumpZ = 1;
    this.state = 'jump';
  }

  // ── Nap ───────────────────────────────────────────────────────────

  _triggerNap() {
    this.isNapping   = true;
    this.napTimer    = this.config.napDuration;
    this.state       = 'nap';
    this.stompTarget = null;
    this._popup('OOSE…', 0x88aaff);
  }

  _updateNap(dt) {
    this.napTimer -= dt;
    this.zzzText.setVisible(true);
    const t = Date.now() / 500;
    this.zzzText.x = this.worldX + Math.sin(t) * 10;
    this.zzzText.y = this.groundY - this.config.height - 20 - Math.abs(Math.sin(t)) * 10;
    this.sprite.setAngle(90);
    if (this.napTimer <= 0) this._wakeUp();
  }

  _wakeUp() {
    this.isNapping = false;
    this.energy    = this.config.maxEnergy * 0.4;
    this.state     = 'idle';
    this.sprite.setAngle(0);
    this.zzzText.setVisible(false);
    this._popup('OOSE!', 0xffcc00);
  }

  // ── Sprite sync ───────────────────────────────────────────────────

  _syncSprites() {
    super._syncSprites();

    const sy  = this.groundY - this.jumpZ;
    const dir = this.facing === 'right' ? 1 : -1;

    // ── Walk / attack sprites ─────────────────────────────────────────
    if (this._hasSprites) {
      this.sprite.setVisible(false);
      this.eyeL.setVisible(false);
      this.eyeR.setVisible(false);
      this.rabbitBody.setVisible(false);
      this.rabbitEarL.setVisible(false);
      this.rabbitEarR.setVisible(false);
      this.rabbitEye.setVisible(false);
      this.rabbitCord.setVisible(false);

      const depthT     = Math.max(0, Math.min(1, (this.groundY - FLOOR_TOP) / (FLOOR_BOTTOM - FLOOR_TOP)));
      const depthScale = DEPTH_SCALE_MIN + depthT * (DEPTH_SCALE_MAX - DEPTH_SCALE_MIN);
      const baseScale  = BASE_SPRITE_H / this.walkFrames[0].height;
      const sx         = baseScale * depthScale;
      const alpha      = this.sprite.alpha;

      // ── Knocked down: show the down pose while KO'd (stars from base) ──
      if (this.isKO && this._hasDownSprite) {
        if (this._activeFrameIdx >= 0)  { this.walkFrames[this._activeFrameIdx].setVisible(false);   this._activeFrameIdx = -1; }
        if (this._activeAttackIdx >= 0) { this.attackFrames?.[this._activeAttackIdx].setVisible(false); this._activeAttackIdx = -1; }
        if (this.sleepSprite) this.sleepSprite.setVisible(false);
        const down  = this.downFrames[this.facing];
        const other = this.downFrames[this.facing === 'right' ? 'left' : 'right'];
        other.setVisible(false);
        down.setVisible(true).setPosition(this.worldX, this.groundY)
          .setDepth(this.groundY).setScale(sx, sx).setAlpha(alpha);
        return;
      } else if (this._hasDownSprite) {
        this.downFrames.right.setVisible(false);
        this.downFrames.left.setVisible(false);
      }

      // ── Napping: show the sleeping sprite, hide everything else ────────
      if (this.isNapping && this.sleepSprite) {
        if (this._activeFrameIdx >= 0)  { this.walkFrames[this._activeFrameIdx].setVisible(false);   this._activeFrameIdx = -1; }
        if (this._activeAttackIdx >= 0) { this.attackFrames?.[this._activeAttackIdx].setVisible(false); this._activeAttackIdx = -1; }
        // Lying-down pose: scale by width so the lying length ≈ standing height
        const sleepScale = (BASE_SPRITE_H / this.sleepSprite.width) * depthScale;
        this.sleepSprite.setVisible(true)
          .setPosition(this.worldX, this.groundY)
          .setDepth(this.groundY)
          .setScale(dir * sleepScale, sleepScale)
          .setAlpha(alpha);
        return;
      } else if (this.sleepSprite) {
        this.sleepSprite.setVisible(false);
      }

      if (this.state === 'attack' && this._hasAttackSprites) {
        // Hide walk frame
        if (this._activeFrameIdx >= 0) this.walkFrames[this._activeFrameIdx].setVisible(false);
        this._activeFrameIdx = -1;

        const progress  = Math.max(0, Math.min(0.999, 1 - this.stateTimer / ATTACK_DURATION));
        const frameNum  = Math.floor(progress * N_ATTACK_FRAMES);
        const dirOff    = this.facing === 'right' ? 0 : N_ATTACK_FRAMES;
        const attackIdx = dirOff + frameNum;

        if (attackIdx !== this._activeAttackIdx) {
          if (this._activeAttackIdx >= 0) this.attackFrames[this._activeAttackIdx].setVisible(false);
          this._activeAttackIdx = attackIdx;
        }
        this.attackFrames[attackIdx].setVisible(true).setPosition(this.worldX, sy)
          .setDepth(this.groundY).setScale(sx, sx).setAlpha(alpha);
      } else {
        // Hide attack frame
        if (this._activeAttackIdx >= 0) this.attackFrames?.[this._activeAttackIdx].setVisible(false);
        this._activeAttackIdx = -1;

        const frameNum = !this.isGrounded()
          ? JUMP_FRAME
          : (this.state === 'walk')
            ? WALK_SEQUENCE[Math.floor(Date.now() / WALK_FRAME_MS) % WALK_SEQUENCE.length]
            : IDLE_FRAME;
        const dirOff   = this.facing === 'right' ? 0 : FRAMES_PER_DIR;
        const frameIdx = dirOff + frameNum;

        if (frameIdx !== this._activeFrameIdx) {
          if (this._activeFrameIdx >= 0) this.walkFrames[this._activeFrameIdx].setVisible(false);
          this._activeFrameIdx = frameIdx;
        }
        this.walkFrames[frameIdx].setVisible(true).setPosition(this.worldX, sy)
          .setDepth(this.groundY).setScale(sx, sx).setAlpha(alpha);
      }
    }

    // ── Energy bar (hidden when real sprites loaded) ──────────────────
    this.energyBg.setVisible(!this._hasSprites);
    this.energyBar.setVisible(!this._hasSprites);
    if (!this._hasSprites) {
      const bx = this.worldX;
      const by = sy - this.config.height - 10;
      this.energyBg.x = bx;
      this.energyBg.y = by;
      const frac = this.energy / this.config.maxEnergy;
      this.energyBar.width = this.config.width * frac;
      this.energyBar.x = bx - (this.config.width - this.config.width * frac) / 2;
      this.energyBar.y = by;
      this.energyBg.setDepth(this.groundY + 2);
      this.energyBar.setDepth(this.groundY + 2);
      if (frac < 0.25 && !this.isNapping) {
        const pulse = 0.6 + Math.abs(Math.sin(Date.now() / 150)) * 0.4;
        this.energyBar.fillColor = 0xff2200;
        this.energyBar.setAlpha(pulse);
      } else {
        this.energyBar.fillColor = 0xff8800;
        this.energyBar.setAlpha(1);
      }
    }

    // ── Stuffed rabbit ────────────────────────────────────────────────
    // Hand position: mid-height on the side Ocean is facing
    const handX = this.worldX + dir * (this.config.width * 0.45);
    const handY = sy - this.config.height * 0.48;

    let rabbitX, rabbitY;

    if (this.state === 'attack' && this.stateTimer > 0) {
      // Swing arc: 0 = start of swing, 1 = end
      const progress = 1 - (this.stateTimer / ATTACK_DURATION);
      // Outswing: arc from below-hand to out-front; backswing: returns
      const swingAngle = dir * (progress * Math.PI * 1.4 - 0.3);
      rabbitX = handX + Math.cos(swingAngle) * CORD_LEN * dir;
      rabbitY = handY + Math.sin(swingAngle) * CORD_LEN;
    } else {
      // Hanging at rest — slight bob
      const bob = Math.sin(Date.now() / 300) * 2;
      rabbitX = handX + dir * 6;
      rabbitY = handY + 20 + bob;
    }

    const depth = this.groundY + 3;
    this.rabbitCord.clear();
    this.rabbitCord.lineStyle(2, 0x999999, 0.8);
    this.rabbitCord.strokeLineShape(new Phaser.Geom.Line(handX, handY, rabbitX, rabbitY));
    this.rabbitCord.setDepth(depth - 1);

    this.rabbitBody.setPosition(rabbitX, rabbitY).setDepth(depth);
    this.rabbitEarL.setPosition(rabbitX - 3, rabbitY - 11).setDepth(depth);
    this.rabbitEarR.setPosition(rabbitX + 3, rabbitY - 11).setDepth(depth);
    this.rabbitEye.setPosition(rabbitX + dir * 3, rabbitY - 3).setDepth(depth + 1);
  }

  // ── Helpers ───────────────────────────────────────────────────────

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

  _setVisible(v) {
    super._setVisible(v);
    if (this.walkFrames) {
      this.walkFrames.forEach((f, i) => f.setVisible(v && i === this._activeFrameIdx));
    }
    if (this.attackFrames) {
      this.attackFrames.forEach((f, i) => f.setVisible(v && i === this._activeAttackIdx));
    }
    if (this.downFrames) {
      this.downFrames.right.setVisible(v && this.isKO && this.facing === 'right');
      this.downFrames.left.setVisible(v && this.isKO && this.facing === 'left');
    }
  }

  _flashTint(color, duration) {
    super._flashTint(color, duration);
    if (this._hasSprites) {
      const all = [...(this.walkFrames || []), ...(this.attackFrames || []), ...Object.values(this.downFrames || {})];
      all.forEach(f => f.setTint(color));
      this.scene.time.delayedCall(200, () => {
        if (this.active) all.forEach(f => f.clearTint());
      });
    }
  }

  destroy() {
    super.destroy();
    this.energyBg.destroy();
    this.energyBar.destroy();
    this.zzzText.destroy();
    this.rabbitBody.destroy();
    this.rabbitEarL.destroy();
    this.rabbitEarR.destroy();
    this.rabbitEye.destroy();
    this.rabbitCord.destroy();
    this.walkFrames?.forEach(f => f.destroy());
    this.attackFrames?.forEach(f => f.destroy());
    if (this.downFrames) Object.values(this.downFrames).forEach(f => f.destroy());
  }
}
