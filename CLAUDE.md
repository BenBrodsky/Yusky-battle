# Yusky Battle — Project Notes

Phaser 3 + Vite side-scrolling family beat-em-up (Streets of Rage style).
Characters: Ben (boxer), Linda (tennis racket), Miles (soccer ball), Ocean
(nunchuck rabbit). Miles is the reference implementation for real sprite art —
the lessons below were learned wiring him up and WILL recur for the others.

## Workflow

- Two clones push to `claude/family-game-design-TSJBQ`: the user's Mac
  (assets, Photoshop work) and the Claude cloud container (code). Always
  `git pull origin claude/family-game-design-TSJBQ --rebase` before pushing.
  "fetch first" rejections mean the other side pushed — never force push.
- The user adds art to `public/` on the Mac and pushes; Claude pulls, then
  normalizes/renames/wires it in. Asset files: lowercase kebab-case
  (`miles-walk-r1.png`); texture keys: snake_case (`miles_walk_r1`),
  loaded in `GameScene.preload()`.

## Sprite asset pipeline (applies to every character)

1. **BootScene placeholder collision**: `BootScene` generates placeholder
   textures (`_makeRect`). If a real PNG is loaded under a key that already
   exists, Phaser SILENTLY skips the load and renders the placeholder —
   this looked like a "white square" bug for the soccer ball. Remove the
   placeholder line from BootScene when real art arrives for a key.
2. **Dirty transparency**: Photoshop/AI exports often leave white RGB in
   fully-transparent pixels (`255,255,255,0`) or near-transparent edge
   fringes. These bleed white when WebGL downscales. Fix with PIL: zero the
   RGB of every pixel with alpha < 10. Do NOT set `premultipliedAlpha: false`
   in the Phaser render config — tried it, made things worse.
3. **Normalize frames to one shared canvas**: bbox-crop each frame, paste
   centered + bottom-aligned (lowest opaque pixel = ground) onto a single
   canvas (Miles uses 364x662). Otherwise per-frame padding differences make
   the character jitter in size/position. Crop standalone sprites (ball) to
   their bbox or they render tiny inside an invisible canvas and rotate
   around the wrong center.
4. **Frame pool, not setTexture**: create one `scene.add.image` per frame
   and toggle visibility. Swapping textures on one image causes a one-frame
   white flash.
5. **Audit AI-generated frame sets** before wiring: md5 + downscaled pixel
   diff finds exact dupes; mirror-and-diff matches left frames to right
   frames. Miles' set had 2 duplicate pairs and a missing left frame
   (regenerated via horizontal flip — left frames are plain mirrors).
6. **Walk cycle**: 4-beat stride → pass → opposite stride → pass at 130ms
   (`WALK_FRAME_MS`) reads most natural. Drop near-duplicate strides (cycle
   stalls) and outlier poses (knee-up "march" frames read as hopping). Idle
   = dedicated legs-together frame, never a mid-step frame. Jump = tuck
   frame shown whenever `!isGrounded()`.
7. **Placeholder effect inheritance**: real sprite frames must NOT inherit
   the placeholder rectangle's attack scale pulse (grow/shrink bob on
   attack) — Miles uses `baseScale * depthScale` only. Inheriting
   `sprite.alpha` is fine (invuln flicker, super glow still work).

## Pseudo-3D depth system

- Floor band: `FLOOR_TOP=470` → `FLOOR_BOTTOM=680`. Depth scale runs 0.6
  (top/far) → 1.3 (bottom/near); same formula in Miles.js and Projectile.js.
- Everything visual must scale with depth: sprite size, shadow size, AND
  projectile travel speed. Constant world-speed projectiles look sluggish
  when drawn large up close (few ball-widths/sec) — scale velocity by the
  depth factor too.
- Rotation: once translation scales with depth, a constant angular rate is
  roll-correct in every lane. Keep spin ≤ ~0.45 rad/frame — above that the
  pattern aliases (wagon-wheel strobe; 1.0 looked broken). Floor of 0.16
  while moving, zero when stopped.

## Mechanics decisions

- **Jump**: Space (P1), Q (P2), gamepad A. Jump physics bug fixed in
  `Character._handleJump`: the gravity block must run when
  `!isGrounded() || velZ > 0` — `jumpZ` is still 0 on the press frame, so
  airborne-only integration never lifts off.
- **Soccer ball**: on enemy hit → bounces and homes back to Miles' live
  position (both axes), auto-collects on contact. On miss → friction
  roll-out (`SOCCER_FRICTION=320`), then sits `loose` until Miles touches it
  (`PICKUP_RADIUS=42`); only then can he kick again (`ballActive` +
  `onReturn`). Loose balls deal no damage (GameScene skips `proj.loose`)
  and can't roll outside the world. Linda's tennis ball keeps the older
  max-range boomerang logic.
- No floating UI on characters: HP bars, name labels, and Miles' nuclear
  bar were all removed — the HUD covers it.
