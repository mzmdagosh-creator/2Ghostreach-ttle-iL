/**
 * Local Sprite Loader (./sprites/*.png) with Chroma-Key Cleanup,
 * Hit-Flash Silhouette Caching, Procedural 2D Skeletal/Part-Driven Animation & Fallbacks
 */

export type SpriteKey =
  | 'ghost_hero'
  | 'wicked_witch'
  | 'wild_boar'
  | 'portrait_ghost'
  | 'portrait_witch'
  | 'human_hero'
  | 'villager_farmer'
  | 'villager_merchant'
  | 'villager_miner'
  | 'forest_imp'
  | 'armored_boar'
  | 'shadow_stalker'
  | 'wisp_phantom'
  | 'treant_golem'
  | 'rock_golem'
  | 'magma_slime'
  | 'obsidian_knight';

export interface SpriteRecord {
  key: SpriteKey;
  path: string;
  status: 'loading' | 'loaded' | 'fallback';
  canvas: HTMLCanvasElement;
  flashCanvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export const SPRITE_MANIFEST: Record<SpriteKey, string> = {
  // Core trio
  ghost_hero: './sprites/ghost_hero.png',
  wicked_witch: './sprites/wicked_witch.png',
  wild_boar: './sprites/wild_boar.png',
  // Portraits
  portrait_ghost: './sprites/portrait_ghost.png',
  portrait_witch: './sprites/portrait_witch.png',
  // Sheet 1
  human_hero: './sprites/human_hero.png',
  villager_farmer: './sprites/villager_farmer.png',
  villager_merchant: './sprites/villager_merchant.png',
  villager_miner: './sprites/villager_miner.png',
  forest_imp: './sprites/forest_imp.png',
  armored_boar: './sprites/armored_boar.png',
  // Sheet 2
  shadow_stalker: './sprites/shadow_stalker.png',
  wisp_phantom: './sprites/wisp_phantom.png',
  treant_golem: './sprites/treant_golem.png',
  rock_golem: './sprites/rock_golem.png',
  magma_slime: './sprites/magma_slime.png',
  obsidian_knight: './sprites/obsidian_knight.png',
};

const spriteStore: Partial<Record<SpriteKey, SpriteRecord>> = {};

/**
 * Removes residual near-white corner background pixels via border flood-fill
 * so any local PNG placed in ./sprites/*.png renders with clean alpha edges.
 */
function cleanSpriteAlpha(img: HTMLImageElement): HTMLCanvasElement {
  const w = img.naturalWidth || 256;
  const h = img.naturalHeight || 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const cornerIdx = 0;
    const isCornerOpaqueWhite =
      data[cornerIdx + 3] > 200 &&
      data[cornerIdx] > 235 &&
      data[cornerIdx + 1] > 235 &&
      data[cornerIdx + 2] > 235;

    if (isCornerOpaqueWhite) {
      const visited = new Uint8Array(w * h);
      const queue: number[] = [];

      const pushIfWhite = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const idx = y * w + x;
        if (visited[idx]) return;
        const p = idx * 4;
        if (data[p + 3] > 0 && data[p] > 232 && data[p + 1] > 232 && data[p + 2] > 232) {
          visited[idx] = 1;
          queue.push(idx);
        }
      };

      for (let x = 0; x < w; x++) {
        pushIfWhite(x, 0);
        pushIfWhite(x, h - 1);
      }
      for (let y = 0; y < h; y++) {
        pushIfWhite(0, y);
        pushIfWhite(w - 1, y);
      }

      while (queue.length > 0) {
        const curr = queue.pop()!;
        const p = curr * 4;
        data[p + 3] = 0;
        const cx = curr % w;
        const cy = (curr / w) | 0;
        pushIfWhite(cx + 1, cy);
        pushIfWhite(cx - 1, cy);
        pushIfWhite(cx, cy + 1);
        pushIfWhite(cx, cy - 1);
      }
      ctx.putImageData(imgData, 0, 0);
    }
  } catch {
    // Ignore CORS taint if any
  }

  return canvas;
}

/**
 * Generates a bright cyan-white hit-flash silhouette canvas for instant impact feedback.
 */
function createFlashCanvas(source: HTMLCanvasElement, tint = '#e0f2fe'): HTMLCanvasElement {
  const flash = document.createElement('canvas');
  flash.width = source.width;
  flash.height = source.height;
  const ctx = flash.getContext('2d')!;
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, flash.width, flash.height);
  return flash;
}

/**
 * Hand-drawn 2D dark-fantasy chibi fallback renderer in case any ./sprites/*.png file 404s.
 */
function buildFallbackCanvas(key: SpriteKey): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 180;
  const ctx = canvas.getContext('2d')!;

  ctx.save();
  ctx.translate(80, 95);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#14121d';
  ctx.lineJoin = 'round';

  const palettes: Record<SpriteKey, { primary: string; secondary: string; eye: string; kind: string }> = {
    ghost_hero: { primary: '#bae6fd', secondary: '#1e3a8a', eye: '#38bdf8', kind: 'ghost' },
    portrait_ghost: { primary: '#bae6fd', secondary: '#1e3a8a', eye: '#38bdf8', kind: 'ghost' },
    human_hero: { primary: '#fed7aa', secondary: '#1e3a8a', eye: '#78350f', kind: 'human' },
    wicked_witch: { primary: '#581c87', secondary: '#1f2937', eye: '#c084fc', kind: 'witch' },
    portrait_witch: { primary: '#581c87', secondary: '#1f2937', eye: '#c084fc', kind: 'witch' },
    wild_boar: { primary: '#5c3a21', secondary: '#3b2313', eye: '#f97316', kind: 'boar' },
    armored_boar: { primary: '#4b5563', secondary: '#5c3a21', eye: '#ef4444', kind: 'boar' },
    villager_farmer: { primary: '#fcd34d', secondary: '#78350f', eye: '#451a03', kind: 'human' },
    villager_merchant: { primary: '#166534', secondary: '#7f1d1d', eye: '#1e293b', kind: 'human' },
    villager_miner: { primary: '#475569', secondary: '#78350f', eye: '#f59e0b', kind: 'human' },
    forest_imp: { primary: '#65a30d', secondary: '#422006', eye: '#f59e0b', kind: 'imp' },
    shadow_stalker: { primary: '#312e81', secondary: '#1e1b4b', eye: '#c084fc', kind: 'ghost' },
    wisp_phantom: { primary: '#e2e8f0', secondary: '#1e293b', eye: '#38bdf8', kind: 'ghost' },
    treant_golem: { primary: '#713f12', secondary: '#15803d', eye: '#f97316', kind: 'golem' },
    rock_golem: { primary: '#64748b', secondary: '#334155', eye: '#f59e0b', kind: 'golem' },
    magma_slime: { primary: '#dc2626', secondary: '#f97316', eye: '#fef08a', kind: 'slime' },
    obsidian_knight: { primary: '#1e293b', secondary: '#7f1d1d', eye: '#ef4444', kind: 'knight' },
  };

  const p = palettes[key] || palettes.ghost_hero;

  if (p.kind === 'boar') {
    ctx.fillStyle = p.primary;
    ctx.beginPath();
    ctx.ellipse(0, 15, 48, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.moveTo(35, 25);
    ctx.quadraticCurveTo(55, 10, 44, -2);
    ctx.lineTo(30, 15);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = p.eye;
    ctx.beginPath();
    ctx.arc(26, 5, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.kind === 'slime') {
    ctx.fillStyle = p.primary;
    ctx.beginPath();
    ctx.moveTo(-45, 45);
    ctx.quadraticCurveTo(-40, -25, 0, -30);
    ctx.quadraticCurveTo(40, -25, 45, 45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = p.eye;
    ctx.beginPath();
    ctx.arc(14, 8, 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = p.secondary;
    ctx.beginPath();
    if (p.kind === 'ghost') {
      ctx.moveTo(-24, -10);
      ctx.quadraticCurveTo(28, -10, 26, 45);
      ctx.quadraticCurveTo(0, 68, -36, 52);
      ctx.quadraticCurveTo(-18, 30, -24, -10);
    } else {
      ctx.roundRect(-24, -8, 48, 56, 12);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = p.primary;
    ctx.beginPath();
    ctx.arc(0, -32, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (p.kind === 'witch') {
      ctx.fillStyle = p.primary;
      ctx.beginPath();
      ctx.moveTo(-46, -48);
      ctx.lineTo(46, -48);
      ctx.lineTo(0, -88);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = p.eye;
    ctx.beginPath();
    ctx.ellipse(14, -30, 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  return canvas;
}

export function preloadAllSprites(onProgress?: (loaded: number, total: number) => void): Promise<void> {
  const keys = Object.keys(SPRITE_MANIFEST) as SpriteKey[];
  let finished = 0;

  for (const key of keys) {
    const fallback = buildFallbackCanvas(key);
    spriteStore[key] = {
      key,
      path: SPRITE_MANIFEST[key],
      status: 'loading',
      canvas: fallback,
      flashCanvas: createFlashCanvas(fallback),
      width: fallback.width,
      height: fallback.height,
    };
  }

  return new Promise((resolve) => {
    keys.forEach((key) => {
      const img = new Image();
      img.onload = () => {
        const cleaned = cleanSpriteAlpha(img);
        spriteStore[key] = {
          key,
          path: SPRITE_MANIFEST[key],
          status: 'loaded',
          canvas: cleaned,
          flashCanvas: createFlashCanvas(cleaned),
          width: cleaned.width,
          height: cleaned.height,
        };
        finished++;
        onProgress?.(finished, keys.length);
        if (finished === keys.length) resolve();
      };
      img.onerror = () => {
        if (spriteStore[key]) {
          spriteStore[key]!.status = 'fallback';
        }
        finished++;
        onProgress?.(finished, keys.length);
        if (finished === keys.length) resolve();
      };
      img.src = SPRITE_MANIFEST[key];
    });
  });
}

export function getSprite(key: SpriteKey): SpriteRecord {
  return spriteStore[key]!;
}

export function getAllSpriteStatuses(): Array<{ key: SpriteKey; path: string; status: string; size: string }> {
  return (Object.keys(SPRITE_MANIFEST) as SpriteKey[]).map((key) => {
    const rec = spriteStore[key];
    return {
      key,
      path: SPRITE_MANIFEST[key],
      status: rec ? rec.status : 'fallback',
      size: rec ? `${rec.width}x${rec.height}` : '160x180',
    };
  });
}

export interface CutoutDrawOptions {
  x: number;
  y: number;
  targetHeight: number;
  facing: 1 | -1;
  leanAngle?: number;
  scaleX?: number;
  scaleY?: number;
  alpha?: number;
  hitFlash?: boolean;
  tintGlow?: string;
  // Procedural skeletal & locomotion parameters
  walkCycle?: number; // Radians of stride cycle
  strideIntensity?: number; // 0 when idle, 0..1 when walking/running
  attackProgress?: number; // 0..1 during active melee lunge/swing
  isTelegraphing?: boolean; // Wind-up crouch/rearing tremor
  vx?: number;
  vy?: number;
}

/**
 * Draws a procedural multi-segment animated ectoplasm tail & mantle ribbon behind the Ghost Hero
 * so the ghost tail ripples organically with movement, jumping, and dashing.
 */
function drawSegmentedGhostTail(
  ctx: CanvasRenderingContext2D,
  drawH: number,
  time: number,
  vx = 0,
  vy = 0,
  hitFlash = false
): void {
  const speedFactor = Math.min(1.6, Math.hypot(vx, vy) / 220);
  const segments = 9;
  const tailLen = 36 + speedFactor * 22;
  const baseY = -drawH * 0.22;
  const baseX = -6;

  // 1. Trailing Spectral Ectoplasm Wisp Tail
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(baseX, baseY - 12);

  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const wave =
      Math.sin(time * 9 - t * 4.5) * (7 + speedFactor * 6) * t -
      (vy * 0.04) * t;
    const px = baseX - t * tailLen;
    const py = baseY + wave + (1 - t) * 10;
    ctx.lineTo(px, py - (1 - t) * 12);
  }

  for (let i = segments; i >= 1; i--) {
    const t = i / segments;
    const wave =
      Math.sin(time * 9 - t * 4.5 + 0.5) * (7 + speedFactor * 6) * t -
      (vy * 0.04) * t;
    const px = baseX - t * tailLen;
    const py = baseY + wave + (1 - t) * 10;
    ctx.lineTo(px, py + (1 - t) * 11);
  }
  ctx.closePath();

  const tailGrad = ctx.createLinearGradient(baseX, baseY, baseX - tailLen, baseY);
  if (hitFlash) {
    tailGrad.addColorStop(0, 'rgba(224, 242, 254, 0.95)');
    tailGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  } else {
    tailGrad.addColorStop(0, 'rgba(186, 230, 253, 0.82)');
    tailGrad.addColorStop(0.55, 'rgba(56, 189, 248, 0.48)');
    tailGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
  }
  ctx.fillStyle = tailGrad;
  ctx.fill();

  // 2. Fluttering Navy & Gold Tunic Sash / Mantle Ribbon
  ctx.beginPath();
  ctx.moveTo(-8, -drawH * 0.45);
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    const flutter = Math.cos(time * 12 - t * 3.8) * (5 + speedFactor * 7) * t;
    ctx.lineTo(-8 - t * (24 + speedFactor * 16), -drawH * 0.45 + flutter + t * 8);
  }
  ctx.strokeStyle = hitFlash ? '#e0f2fe' : '#1e3a8a';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws an animated 2D character anchored at bottom-center (x, y) using
 * multi-part horizontal strip articulation (Head, Torso, Legs/Tail), stride shearing,
 * step hopping, breathing scale, and attack/telegraph deformation so sprites never slide like frozen images.
 */
export function drawCutoutSprite(ctx: CanvasRenderingContext2D, key: SpriteKey, opts: CutoutDrawOptions): void {
  const rec = spriteStore[key];
  if (!rec) return;

  const time = performance.now() * 0.001;
  const aspect = rec.width / rec.height;
  const drawH = opts.targetHeight;
  const drawW = drawH * aspect;

  const walkCycle = opts.walkCycle ?? time * 6;
  const stride = opts.strideIntensity ?? 0;
  const attackProg = opts.attackProgress ?? 0;
  const isGhost = key === 'ghost_hero' || key === 'shadow_stalker' || key === 'wisp_phantom';

  // Calculate dynamic step-hop Y offset and pitch rock for grounded walkers
  const stepHopY = !isGhost && stride > 0.05 ? -Math.abs(Math.sin(walkCycle)) * 11 * stride : 0;
  const walkPitch = !isGhost && stride > 0.05 ? Math.cos(walkCycle) * 0.095 * stride : 0;

  // Calculate active attack lunge forward & pitch
  const attackLungeCurve = attackProg > 0 ? Math.sin(attackProg * Math.PI) : 0;
  const attackLungeX = attackLungeCurve * 16;
  const attackPitch = attackLungeCurve * 0.22;

  // Telegraph wind-up rear-back crouch & tremor
  const telegraphTremorX = opts.isTelegraphing ? Math.sin(time * 55) * 3.2 : 0;
  const telegraphPitch = opts.isTelegraphing ? -0.19 : 0;

  // Subtle idle breathing expansion
  const breath = Math.sin(time * 3.4 + opts.x * 0.02) * 0.028;

  ctx.save();
  ctx.translate(opts.x + telegraphTremorX, opts.y + stepHopY);

  // Ground Contact Shadow underneath entity
  ctx.save();
  const shadowScale = Math.max(0.55, 1 - Math.abs(stepHopY) * 0.025);
  ctx.fillStyle = 'rgba(4, 6, 14, 0.52)';
  ctx.beginPath();
  ctx.ellipse(0, -stepHopY + 2, drawW * 0.36 * shadowScale, 7 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.scale(opts.facing * ((opts.scaleX ?? 1) - breath * 0.5), (opts.scaleY ?? 1) + breath);
  ctx.translate(attackLungeX, 0);
  ctx.rotate((opts.leanAngle ?? 0) + walkPitch + attackPitch + telegraphPitch);

  if (opts.alpha !== undefined) {
    ctx.globalAlpha = opts.alpha;
  }

  if (opts.tintGlow) {
    ctx.shadowColor = opts.tintGlow;
    ctx.shadowBlur = 15;
  }

  // Render procedural rippling ectoplasm tail & sash for the Ghost Hero
  if (key === 'ghost_hero') {
    drawSegmentedGhostTail(ctx, drawH, time, opts.vx ?? 0, opts.vy ?? 0, Boolean(opts.hitFlash));
  }

  const source = opts.hitFlash ? rec.flashCanvas : rec.canvas;
  const srcW = rec.width;
  const srcH = rec.height;

  // =========================================================================
  // MULTI-PART ARTICULATED SLICED RENDERING (HEAD / TORSO / LOWER BODY)
  // Splits the sprite into 3 overlapping anatomical bands with independent
  // shear, stride swing, and pitch so characters visibly walk, breathe, and lunge!
  // =========================================================================
  const headRatio = 0.42;
  const torsoRatio = 0.30;
  const lowerRatio = 0.28;

  // 1. LOWER BODY / LEGS / TAIL BAND (Bottom 28%)
  const lowerSrcY = srcH * (headRatio + torsoRatio);
  const lowerSrcH = srcH * lowerRatio;
  const lowerDestY = -drawH * lowerRatio;
  const lowerDestH = drawH * lowerRatio;

  ctx.save();
  if (isGhost) {
    // Wavy spectral tail sway on lower portion of ghost sprite
    const tailSway = Math.sin(time * 7.5) * 0.18;
    ctx.transform(1, 0, tailSway, 1, 0, 0);
  } else if (stride > 0.05) {
    // Scissoring leg stride shear & knee compress for walking creatures/knights
    const legShear = Math.sin(walkCycle) * 0.28 * stride;
    ctx.transform(1, 0, legShear, 1, 0, 0);
  }
  ctx.drawImage(
    source,
    0,
    lowerSrcY - 2,
    srcW,
    lowerSrcH + 2,
    -drawW / 2,
    lowerDestY - 1,
    drawW,
    lowerDestH + 1
  );
  ctx.restore();

  // 2. TORSO / MANTLE / ARMOR BAND (Middle 30%)
  const torsoSrcY = srcH * headRatio;
  const torsoSrcH = srcH * torsoRatio;
  const torsoDestY = -drawH * (torsoRatio + lowerRatio);
  const torsoDestH = drawH * torsoRatio;

  ctx.save();
  const torsoShiftX = attackLungeCurve * 5 + Math.sin(walkCycle) * 2.2 * stride;
  const torsoBobY = Math.sin(time * 4.2) * 1.5;
  ctx.translate(torsoShiftX, torsoBobY);
  ctx.drawImage(
    source,
    0,
    torsoSrcY - 2,
    srcW,
    torsoSrcH + 4,
    -drawW / 2,
    torsoDestY - 2,
    drawW,
    torsoDestH + 4
  );
  ctx.restore();

  // 3. HEAD / HELM / CREST BAND (Top 42%)
  const headSrcH = srcH * headRatio;
  const headDestY = -drawH;
  const headDestH = drawH * headRatio;

  ctx.save();
  const headShiftX = attackLungeCurve * 8 + (opts.isTelegraphing ? -4 : 0);
  const headNodAngle =
    attackLungeCurve * 0.14 +
    Math.sin(walkCycle - 0.6) * 0.06 * stride +
    Math.sin(time * 3.2) * 0.035;
  ctx.translate(headShiftX, torsoDestY);
  ctx.rotate(headNodAngle);
  ctx.translate(0, -torsoDestY);
  ctx.drawImage(
    source,
    0,
    0,
    srcW,
    headSrcH + 2,
    -drawW / 2,
    headDestY,
    drawW,
    headDestH + 2
  );
  ctx.restore();

  ctx.restore();
}

/**
 * Draws an animated floating spectral weapon with multi-layered sweeping slash arcs,
 * weapon spin/thrust motion, and golden parry shockwaves during Ghost Hero attacks.
 */
export function drawFloatingWeapon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: 1 | -1,
  weaponId: number,
  attackProgress: number, // 0 when idle, 0..1 during swing
  isParryCrit: boolean
): void {
  const time = performance.now() * 0.001;
  const lungeOffset = attackProgress > 0 ? Math.sin(attackProgress * Math.PI) * 22 : 0;

  ctx.save();
  ctx.translate(x + facing * (24 + lungeOffset), y - 48 + Math.sin(time * 5.5) * 4);
  ctx.scale(facing, 1);

  const swingAngle =
    attackProgress > 0
      ? -1.35 + Math.sin(Math.min(1, attackProgress * 1.25) * Math.PI) * 2.55
      : Math.sin(time * 4.2) * 0.15 - 0.28;

  // Draw multi-layered glowing slash crescents when actively swinging
  if (attackProgress > 0 && attackProgress < 0.92) {
    const arcRadius = weaponId === 2 ? 86 : weaponId === 3 ? 108 : weaponId === 4 ? 80 : 68;
    const primaryColor = isParryCrit
      ? 'rgba(251, 191, 36, 0.95)'
      : weaponId === 2
      ? 'rgba(56, 189, 248, 0.9)'
      : weaponId === 3
      ? 'rgba(52, 211, 153, 0.9)'
      : weaponId === 4
      ? 'rgba(249, 115, 22, 0.92)'
      : weaponId === 5
      ? 'rgba(192, 132, 252, 0.92)'
      : 'rgba(165, 243, 252, 0.9)';

    // Outer wide slash aura
    ctx.save();
    const startA = -1.3 + attackProgress * 0.4;
    const endA = -0.5 + attackProgress * 2.1;
    ctx.beginPath();
    ctx.arc(12, 0, arcRadius, startA, endA);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = isParryCrit ? 18 : 13;
    ctx.lineCap = 'round';
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 22;
    ctx.stroke();

    // Inner white-hot blade core arc
    ctx.beginPath();
    ctx.arc(12, 0, arcRadius - 3, startA + 0.08, endA - 0.05);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4.5;
    ctx.stroke();

    // Golden Parry Runic Shockwave Ring
    if (isParryCrit) {
      ctx.beginPath();
      ctx.arc(28, 0, arcRadius * (0.45 + attackProgress * 0.65), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(251, 191, 36, ${1 - attackProgress})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.rotate(swingAngle);

  // Render hand-painted weapon sprite silhouette
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#0f172a';
  if (weaponId === 1) {
    // 1: Astral Dagger
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(-10, -2.5, 10, 5);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(44, 0);
    ctx.lineTo(0, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (weaponId === 2) {
    // 2: Spirit Pitchfork (Wing 1-1 reward)
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(44, 0);
    ctx.stroke();
    // Three glowing spectral tines
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    for (const ty of [-10, 0, 10]) {
      ctx.beginPath();
      ctx.moveTo(42, ty);
      ctx.lineTo(68, ty);
      ctx.stroke();
    }
  } else if (weaponId === 3) {
    // 3: Bramble-Thorn Whip (Wing 2 reward)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const whipWave = Math.sin(time * 20) * 14;
    ctx.quadraticCurveTo(36, -20 + whipWave, 68, 8 - whipWave);
    ctx.quadraticCurveTo(84, 18, 98, -6);
    ctx.stroke();
  } else if (weaponId === 4) {
    // 4: Runic Warhammer (Wing 3 reward)
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(44, 0);
    ctx.stroke();
    ctx.fillStyle = '#f97316';
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2.5;
    ctx.fillRect(36, -18, 22, 36);
    ctx.strokeRect(36, -18, 22, 36);
  } else {
    // 5: Soul-Lantern Flail
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(42, 0);
    ctx.stroke();
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(52, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}
