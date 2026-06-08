import Phaser from 'phaser';
import { Character } from './Character.js';
import { JUMP_VELOCITY, ATTACK_REACH } from '../config/constants.js';

const ATTACK_DURATION = 0.18; // faster swing than base 0.32s
const CORD_LEN        = 26;   // pixels from hand to rabbit centre

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
    // Body (pink ellipse) + two ear nubs (rectangles)
    this.rabbitBody = scene.add.ellipse(0, 0, 14, 18, 0xf9e0e8).setDepth(this.groundY + 3); // cream-pink
    this.rabbitEarL = scene.add.rectangle(0, 0, 4, 7, 0xe8a0b8).setDepth(this.groundY + 3); // medium pink
    this.rabbitEarR = scene.add.rectangle(0, 0, 4, 7, 0xe8a0b8).setDepth(this.groundY + 3);
    this.rabbitEye  = scene.add.circle(0, 0, 2, 0x000000).setDepth(this.groundY + 4);
    // Cord drawn with graphics each frame
    this.rabbitCord = scene.add.graphics().setDepth(this.groundY + 2);
  }

  // ── Attack overrides ──────────────────────────────────────────────

  onAttack() {
    this.stateTimer    = ATTACK_DURATION;   // faster than base
    this.nunchuckPhase = 0;
    this.hitThisSwing  = false;
    this.energy = Math.max(0, this.energy - this.config.attackDrain);
  }

  // Allow two hit windows per swing; hitConfirm advances the phase
  getAttackHitbox() {
    if (this.state !== 'attack') return null;

    const elapsed = ATTACK_DURATION - this.stateTimer;
    const dir = this.facing === 'right' ? 1 : -1;
    const hitbox = {
      x:          this.worldX + dir * (this.config.width * 0.5 + ATTACK_REACH * 0.55 / 2),
      y:          this.groundY - this.config.height * 0.45,
      w:          ATTACK_REACH * 0.55,   // shorter reach — stay close
      h:          this.config.height * 0.7,
      knockbackX: dir,
    };

    // Outswing hit (first ~40% of swing)
    if (elapsed >= 0.02 && elapsed < 0.09 && this.nunchuckPhase === 0) return hitbox;
    // Backswing hit (second ~40%)
    if (elapsed >= 0.10 && this.nunchuckPhase === 1) return hitbox;
    return null;
  }

  hitConfirm() {
    this.nunchuckPhase++; // advance phase; don't set hitThisSwing so second hit can land
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

    // ── Energy bar ───────────────────────────────────────────────────
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
  }
}
