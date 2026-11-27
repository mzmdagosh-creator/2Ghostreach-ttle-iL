/**
 * 5-Shot Animated Intro Cutscene Engine
 * Renders live animated 2D Canvas vignette shots for the opening dark-fantasy narrative.
 */

import { drawCutoutSprite, SpriteKey } from '../engine/spriteLoader';

export interface CutsceneShot {
  id: number;
  title: string;
  speaker: string;
  portrait: SpriteKey;
  dialogue: string;
}

export const INTRO_CUTSCENE_SHOTS: CutsceneShot[] = [
  {
    id: 1,
    title: 'I. The Moonlit Causeway of Ghostreach',
    speaker: 'Royal Envoy (You)',
    portrait: 'human_hero',
    dialogue:
      'For three centuries, Castle Ghostreach stood protected by the Anchor Relics of Harvest, Grove, and Hearth. When the midnight distress bells tolled across the valley, I rode alone up the moonlit causeway.',
  },
  {
    id: 2,
    title: 'II. Ambush of the Former Arcanist',
    speaker: 'Seraphina, The Wicked Witch',
    portrait: 'portrait_witch',
    dialogue:
      '"Turn back, Royal Envoy—or be unmade! I have shattered the three Anchor Relics and bound the realm’s fallen guardians into monstrous vessels across the three outer Wings!"',
  },
  {
    id: 3,
    title: 'III. The Forbidden Rite of Severance',
    speaker: 'Seraphina, The Wicked Witch',
    portrait: 'portrait_witch',
    dialogue:
      'A sigil of violet eclipse fire erupted beneath my boots. In a blinding shockwave, Seraphina ripped my eternal spirit out of my mortal body—leaving my flesh suspended in a crystal stasis cage.',
  },
  {
    id: 4,
    title: 'IV. Awakening in the Astral Sanctuary',
    speaker: 'Little Ghost (You)',
    portrait: 'portrait_ghost',
    dialogue:
      'I drifted awake as a translucent phantom inside the ruined Castle Sanctuary. Around me stood the bound spirits of the Farmer, Merchant, and Miner—unable to pass on while the Wings remain corrupted.',
  },
  {
    id: 5,
    title: 'V. The Tri-Sealed Grand Final Gate',
    speaker: 'Little Ghost (You)',
    portrait: 'portrait_ghost',
    dialogue:
      'Behind the Grand Final Gate floats my captive physical vessel, locked by three empty crystal sockets: Amber, Emerald, and Sapphire. I must brave each Wing, parry the corrupted beasts, and break all three seals.',
  },
];

/**
 * Renders the animated 2D Canvas illustration for the active cutscene shot (1..5).
 */
export function renderCutsceneCanvas(
  ctx: CanvasRenderingContext2D,
  shotIndex: number,
  shotTime: number,
  viewW: number,
  viewH: number
): void {
  const shot = INTRO_CUTSCENE_SHOTS[shotIndex] || INTRO_CUTSCENE_SHOTS[0];
  const cx = viewW * 0.5;
  const groundY = viewH * 0.68;

  // Nocturnal Gradient Backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, viewH);
  if (shot.id === 2 || shot.id === 3) {
    bg.addColorStop(0, '#090414');
    bg.addColorStop(0.6, '#261042');
    bg.addColorStop(1, '#12081c');
  } else {
    bg.addColorStop(0, '#050814');
    bg.addColorStop(0.6, '#101b33');
    bg.addColorStop(1, '#0b101d');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, viewW, viewH);

  // Full Moon & Drifting Fog
  const moonX = cx + (shot.id === 1 ? 180 : 0);
  const moonY = viewH * 0.24;
  const moonGrad = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 160);
  moonGrad.addColorStop(0, shot.id === 3 ? 'rgba(216, 180, 254, 0.45)' : 'rgba(186, 230, 253, 0.35)');
  moonGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 160, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = shot.id === 3 ? '#f3e8ff' : '#e0f2fe';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 46, 0, Math.PI * 2);
  ctx.fill();

  // Castle Spires Silhouette in background
  ctx.fillStyle = '#090c16';
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(cx - 260, groundY - 90);
  ctx.lineTo(cx - 180, groundY - 210);
  ctx.lineTo(cx - 140, groundY - 120);
  ctx.lineTo(cx, groundY - 260);
  ctx.lineTo(cx + 140, groundY - 120);
  ctx.lineTo(cx + 190, groundY - 220);
  ctx.lineTo(cx + 270, groundY - 90);
  ctx.lineTo(viewW, groundY);
  ctx.closePath();
  ctx.fill();

  // Stone Causeway Floor
  ctx.fillStyle = '#141926';
  ctx.fillRect(0, groundY, viewW, viewH - groundY);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(viewW, groundY);
  ctx.stroke();

  // Shot-specific animated staging
  if (shot.id === 1) {
    // Shot 1: Human hero walking with full procedural stride along the moonlit road
    const walkX = cx - 120 + Math.min(180, shotTime * 42);
    const isWalking = shotTime * 42 < 180;
    drawCutoutSprite(ctx, 'human_hero', {
      x: walkX,
      y: groundY,
      targetHeight: 138,
      facing: 1,
      leanAngle: isWalking ? 0.07 : 0,
      walkCycle: shotTime * 11,
      strideIntensity: isWalking ? 1 : 0,
    });
  } else if (shot.id === 2) {
    // Shot 2: Witch's ambush
    drawCutoutSprite(ctx, 'human_hero', {
      x: cx - 145,
      y: groundY,
      targetHeight: 138,
      facing: 1,
      walkCycle: shotTime * 4,
      strideIntensity: 0.15,
    });

    const witchHover = Math.sin(shotTime * 3.5) * 14;
    ctx.save();
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + 135, groundY - 95 + witchHover, 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    drawCutoutSprite(ctx, 'wicked_witch', {
      x: cx + 135,
      y: groundY - 22 + witchHover,
      targetHeight: 150,
      facing: -1,
      tintGlow: '#c084fc',
      walkCycle: shotTime * 5,
    });
  } else if (shot.id === 3) {
    // Shot 3: Arcane Rune Curse & Spirit Separation!
    const sep = Math.min(82, shotTime * 30);

    // Glowing Violet/Crimson Curse Rune Circle on ground
    ctx.save();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.ellipse(cx - 40, groundY - 4, 145, 26, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Collapsing Mortal Human Vessel
    drawCutoutSprite(ctx, 'human_hero', {
      x: cx - 40 - sep * 0.45,
      y: groundY,
      targetHeight: 132,
      facing: 1,
      leanAngle: -0.38,
      alpha: 0.65,
    });

    // Rising Spectral Ghost Soul with rippling ectoplasm tail
    drawCutoutSprite(ctx, 'ghost_hero', {
      x: cx - 40 + sep * 0.55,
      y: groundY - 25 - sep * 0.72,
      targetHeight: 132,
      facing: 1,
      tintGlow: '#38bdf8',
      vx: 140,
      vy: -90,
    });

    // Witch casting on right
    drawCutoutSprite(ctx, 'wicked_witch', {
      x: cx + 185,
      y: groundY - 30 + Math.sin(shotTime * 4) * 10,
      targetHeight: 148,
      facing: -1,
      tintGlow: '#a855f7',
    });
  } else if (shot.id === 4) {
    // Shot 4: Awakening in the Astral Sanctuary with trapped villager spirits
    const floatY = Math.sin(shotTime * 3.4) * 11;
    drawCutoutSprite(ctx, 'villager_farmer', {
      x: cx - 230,
      y: groundY,
      targetHeight: 124,
      facing: 1,
      alpha: 0.78,
    });
    drawCutoutSprite(ctx, 'villager_merchant', {
      x: cx + 230,
      y: groundY,
      targetHeight: 126,
      facing: -1,
      alpha: 0.78,
    });
    drawCutoutSprite(ctx, 'ghost_hero', {
      x: cx,
      y: groundY - 18 + floatY,
      targetHeight: 140,
      facing: 1,
      tintGlow: '#38bdf8',
      vx: 60,
      vy: Math.cos(shotTime * 3.4) * 40,
    });
  } else {
    // Shot 5: The Sealed Grand Final Gate with 3 Crystal Sockets (Amber, Emerald, Sapphire)
    const gateW = 196;
    const gateH = 254;
    ctx.fillStyle = '#171d2e';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - gateW / 2, groundY);
    ctx.lineTo(cx - gateW / 2, groundY - gateH * 0.65);
    ctx.quadraticCurveTo(cx, groundY - gateH - 30, cx + gateW / 2, groundY - gateH * 0.65);
    ctx.lineTo(cx + gateW / 2, groundY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Captive Mortal Vessel silhouette inside the Gate lock
    drawCutoutSprite(ctx, 'human_hero', {
      x: cx,
      y: groundY - 24,
      targetHeight: 114,
      facing: -1,
      alpha: 0.45,
      tintGlow: '#a855f7',
    });

    // 3 Glowing Crystal Socket Outlines (Amber, Emerald, Sapphire)
    const sockets = [
      { ox: -48, oy: -165, color: '#f59e0b' },
      { ox: 0, oy: -195, color: '#10b981' },
      { ox: 48, oy: -165, color: '#3b82f6' },
    ];
    for (const s of sockets) {
      ctx.save();
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(cx + s.ox, groundY + s.oy - 14);
      ctx.lineTo(cx + s.ox + 12, groundY + s.oy);
      ctx.lineTo(cx + s.ox, groundY + s.oy + 14);
      ctx.lineTo(cx + s.ox - 12, groundY + s.oy);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Little Ghost Hero looking up at the Grand Gate
    drawCutoutSprite(ctx, 'ghost_hero', {
      x: cx - 180,
      y: groundY - 14 + Math.sin(shotTime * 3.2) * 9,
      targetHeight: 132,
      facing: 1,
      tintGlow: '#38bdf8',
      vx: 85,
    });
  }
}
