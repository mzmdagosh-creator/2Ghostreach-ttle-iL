/**
 * 4-Layer Hand-Painted Gothic Parallax, Offscreen 2D Nocturnal Lighting Engine
 * & Zone-Specific Particle Weather System:
 *   - Farmlands ('farmland'): Driving diagonal rain & ground impact splashes
 *   - Whispering Grove ('forest'): Rolling layered sylvan mist puffs & bioluminescent spores
 *   - Obsidian Foundry ('cavern'): Localized falling molten embers, thermal sparks & ash
 *   - Sanctuary / Spire ('sanctuary' | 'spire'): Drifting astral spirit motes
 */

import {
  DoorPortal,
  GROUND_Y,
  HazardZone,
  PlayerState,
  ProjectileEntity,
  ShrineRelic,
} from './physics';

export type WingTheme = 'sanctuary' | 'farmland' | 'forest' | 'cavern' | 'spire';

export interface LightSource {
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
  flicker?: boolean;
}

interface WeatherParticle {
  kind: 'rain' | 'splash' | 'mist' | 'spore' | 'ember' | 'ash' | 'mote';
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  length?: number;
  alpha: number;
  maxAlpha: number;
  color: string;
  phase: number;
  emitterIndex?: number;
  life: number;
  maxLife: number;
}

let offscreenLightCanvas: HTMLCanvasElement | null = null;
let offscreenLightCtx: CanvasRenderingContext2D | null = null;

// Persistent weather particle state keyed by active theme
let activeWeatherTheme: WingTheme | null = null;
let weatherPool: WeatherParticle[] = [];
let lastWeatherTime = 0;

// Localized ceiling/pillar ember vents in the Foundry (world-space X offsets)
const FOUNDRY_EMBER_VENTS = [320, 680, 1040, 1420, 1800, 2180, 2560, 2940];

function ensureLightCanvas(width: number, height: number): CanvasRenderingContext2D {
  if (!offscreenLightCanvas) {
    offscreenLightCanvas = document.createElement('canvas');
    offscreenLightCtx = offscreenLightCanvas.getContext('2d');
  }
  if (offscreenLightCanvas.width !== width || offscreenLightCanvas.height !== height) {
    offscreenLightCanvas.width = width;
    offscreenLightCanvas.height = height;
  }
  return offscreenLightCtx!;
}

/**
 * Initializes or resets the zone-specific weather particle pool when entering a wing.
 */
function initWeatherPool(theme: WingTheme, viewW: number, viewH: number, cameraX: number): void {
  activeWeatherTheme = theme;
  weatherPool = [];

  if (theme === 'farmland') {
    // Driving Rain: 130 high-speed diagonal rain streaks
    for (let i = 0; i < 130; i++) {
      weatherPool.push({
        kind: 'rain',
        x: Math.random() * (viewW + 260) - 60,
        y: Math.random() * viewH,
        vx: -175 - Math.random() * 65,
        vy: 680 + Math.random() * 220,
        size: 1.3 + Math.random() * 0.9,
        length: 22 + Math.random() * 16,
        alpha: 0.28 + Math.random() * 0.35,
        maxAlpha: 0.6,
        color: '#bae6fd',
        phase: Math.random() * Math.PI * 2,
        life: 1,
        maxLife: 1,
      });
    }
  } else if (theme === 'forest') {
    // Whispering Grove: 28 layered rolling mist clouds + 45 bioluminescent spores
    for (let i = 0; i < 28; i++) {
      const isLowMist = i < 18;
      weatherPool.push({
        kind: 'mist',
        x: Math.random() * (viewW + 400) - 200,
        y: isLowMist
          ? GROUND_Y - 120 + Math.random() * 145
          : 120 + Math.random() * (GROUND_Y - 220),
        vx: (16 + Math.random() * 26) * (i % 2 === 0 ? 1 : -1),
        vy: 0,
        size: isLowMist ? 130 + Math.random() * 110 : 160 + Math.random() * 130,
        alpha: 0.08 + Math.random() * 0.12,
        maxAlpha: 0.2,
        color: i % 3 === 0 ? '#6ee7b7' : '#cbd5e1',
        phase: Math.random() * Math.PI * 2,
        life: 1,
        maxLife: 1,
      });
    }
    for (let i = 0; i < 45; i++) {
      weatherPool.push({
        kind: 'spore',
        x: Math.random() * viewW,
        y: 80 + Math.random() * (GROUND_Y - 70),
        vx: (Math.random() - 0.5) * 24,
        vy: -10 - Math.random() * 18,
        size: 1.8 + Math.random() * 2.4,
        alpha: 0.35 + Math.random() * 0.45,
        maxAlpha: 0.8,
        color: i % 3 === 0 ? '#a7f3d0' : '#34d399',
        phase: Math.random() * Math.PI * 2,
        life: 1,
        maxLife: 1,
      });
    }
  } else if (theme === 'cavern') {
    // Obsidian Foundry: Localized falling embers clustered around ceiling forge vents + dark ash
    for (let i = 0; i < 85; i++) {
      const ventIdx = i % FOUNDRY_EMBER_VENTS.length;
      const ventWorldX = FOUNDRY_EMBER_VENTS[ventIdx];
      const isHotEmber = i % 3 !== 0;
      weatherPool.push({
        kind: isHotEmber ? 'ember' : 'ash',
        x: ventWorldX - cameraX + (Math.random() - 0.5) * 160,
        y: Math.random() * GROUND_Y,
        vx: (Math.random() - 0.5) * 42,
        vy: isHotEmber ? 75 + Math.random() * 95 : 42 + Math.random() * 55,
        size: isHotEmber ? 2.0 + Math.random() * 3.0 : 2.2 + Math.random() * 2.5,
        alpha: isHotEmber ? 0.65 + Math.random() * 0.35 : 0.35 + Math.random() * 0.3,
        maxAlpha: 1,
        color:
          i % 4 === 0
            ? '#fde047'
            : i % 4 === 1
            ? '#fb923c'
            : i % 4 === 2
            ? '#f97316'
            : '#ef4444',
        phase: Math.random() * Math.PI * 2,
        emitterIndex: ventIdx,
        life: Math.random() * 2.5 + 0.5,
        maxLife: 3.0,
      });
    }
  } else {
    // Sanctuary / Spire: 36 drifting astral spirit motes
    for (let i = 0; i < 36; i++) {
      weatherPool.push({
        kind: 'mote',
        x: Math.random() * viewW,
        y: 70 + Math.random() * (viewH - 120),
        vx: 10 + Math.random() * 18,
        vy: (Math.random() - 0.5) * 14,
        size: 1.6 + Math.random() * 2.2,
        alpha: 0.25 + Math.random() * 0.4,
        maxAlpha: 0.65,
        color: theme === 'spire' ? '#d8b4fe' : i % 3 === 0 ? '#fbbf24' : '#7dd3fc',
        phase: Math.random() * Math.PI * 2,
        life: 1,
        maxLife: 1,
      });
    }
  }
}

/**
 * Updates and renders the particle-based weather system for the active zone
 * and injects localized ember/spore glow sources into the nocturnal lightmap.
 */
function updateAndRenderWeather(
  ctx: CanvasRenderingContext2D,
  theme: WingTheme,
  cameraX: number,
  viewW: number,
  viewH: number,
  time: number,
  worldLights: LightSource[]
): void {
  if (activeWeatherTheme !== theme || weatherPool.length === 0) {
    initWeatherPool(theme, viewW, viewH, cameraX);
    lastWeatherTime = time;
  }

  const dt = Math.min(0.05, Math.max(0.005, time - lastWeatherTime));
  lastWeatherTime = time;

  ctx.save();

  // =========================================================================
  // 1. FARMLANDS: DRIVING DIAGONAL RAIN & GROUND SPLASHES
  // =========================================================================
  if (theme === 'farmland') {
    // Subtle wet storm haze overlay
    const stormGrad = ctx.createLinearGradient(0, 0, 0, viewH);
    stormGrad.addColorStop(0, 'rgba(148, 163, 184, 0.04)');
    stormGrad.addColorStop(0.75, 'rgba(56, 189, 248, 0.05)');
    stormGrad.addColorStop(1, 'rgba(15, 23, 42, 0.08)');
    ctx.fillStyle = stormGrad;
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.lineCap = 'round';
    for (let i = weatherPool.length - 1; i >= 0; i--) {
      const p = weatherPool[i];
      if (p.kind === 'rain') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Draw driving rain streak
        const len = p.length ?? 26;
        const dx = (p.vx / p.vy) * len;
        ctx.strokeStyle = `rgba(186, 230, 253, ${p.alpha})`;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + dx, p.y + len);
        ctx.stroke();

        // Check ground impact -> spawn rain splash crown on GROUND_Y
        if (p.y + len >= GROUND_Y) {
          if (weatherPool.length < 185 && Math.random() < 0.45) {
            weatherPool.push({
              kind: 'splash',
              x: p.x + dx,
              y: GROUND_Y - 1 + (Math.random() - 0.5) * 8,
              vx: (Math.random() - 0.5) * 40,
              vy: -35 - Math.random() * 35,
              size: 2.5 + Math.random() * 3.5,
              alpha: 0.55,
              maxAlpha: 0.55,
              color: '#e0f2fe',
              phase: 0,
              life: 0.16,
              maxLife: 0.16,
            });
          }
          // Recycle raindrop at top of viewport
          p.y = -20 - Math.random() * 40;
          p.x = Math.random() * (viewW + 260) - 20;
        } else if (p.x < -80) {
          p.x = viewW + Math.random() * 140;
        }
      } else if (p.kind === 'splash') {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.life <= 0) {
          weatherPool.splice(i, 1);
          continue;
        }
        const ratio = p.life / p.maxLife;
        ctx.strokeStyle = `rgba(224, 242, 254, ${ratio * 0.55})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(p.x, GROUND_Y, p.size * (1.8 - ratio), 1.8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // =========================================================================
  // 2. WHISPERING GROVE: LAYERED ROLLING MIST & BIOLUMINESCENT SPORES
  // =========================================================================
  else if (theme === 'forest') {
    for (let i = 0; i < weatherPool.length; i++) {
      const p = weatherPool[i];
      if (p.kind === 'mist') {
        p.x += p.vx * dt;
        if (p.x > viewW + p.size * 1.5) p.x = -p.size * 1.5;
        if (p.x < -p.size * 1.5) p.x = viewW + p.size * 1.5;

        const pulseAlpha = p.alpha * (0.75 + 0.25 * Math.sin(time * 0.9 + p.phase));
        const mistGrad = ctx.createRadialGradient(p.x, p.y, p.size * 0.1, p.x, p.y, p.size);
        mistGrad.addColorStop(0, hexToRgba(p.color, pulseAlpha));
        mistGrad.addColorStop(0.55, hexToRgba(p.color, pulseAlpha * 0.5));
        mistGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

        ctx.save();
        ctx.scale(1.8, 0.55); // Stretch horizontally into rolling fog bank
        ctx.fillStyle = mistGrad;
        ctx.beginPath();
        ctx.arc(p.x / 1.8, p.y / 0.55, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.kind === 'spore') {
        p.x += (p.vx + Math.sin(time * 1.8 + p.phase) * 18) * dt;
        p.y += p.vy * dt;
        if (p.y < 50) {
          p.y = GROUND_Y - 10;
          p.x = Math.random() * viewW;
        }
        if (p.x < -20) p.x = viewW + 20;
        if (p.x > viewW + 20) p.x = -20;

        const glow = 0.45 + 0.5 * Math.sin(time * 3.2 + p.phase);
        ctx.fillStyle = hexToRgba(p.color, glow);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Continuous ground-hugging sylvan mist ribbon
    const groundMist = ctx.createLinearGradient(0, GROUND_Y - 85, 0, GROUND_Y + 40);
    groundMist.addColorStop(0, 'rgba(16, 185, 129, 0)');
    groundMist.addColorStop(0.65, 'rgba(52, 211, 153, 0.11)');
    groundMist.addColorStop(1, 'rgba(6, 78, 59, 0.18)');
    ctx.fillStyle = groundMist;
    ctx.fillRect(0, GROUND_Y - 85, viewW, 125);
  }

  // =========================================================================
  // 3. OBSIDIAN FOUNDRY: LOCALIZED FALLING EMBERS, ASH & THERMAL GLOW
  // =========================================================================
  else if (theme === 'cavern') {
    // Add overhead localized ember vent glow pockets in the lightmap
    for (const ventWorldX of FOUNDRY_EMBER_VENTS) {
      const screenVentX = ventWorldX - cameraX;
      if (screenVentX > -180 && screenVentX < viewW + 180) {
        worldLights.push({
          x: screenVentX,
          y: 75,
          radius: 155 + Math.sin(time * 8 + ventWorldX) * 15,
          color: '#f97316',
          intensity: 0.52,
        });
      }
    }

    for (let i = 0; i < weatherPool.length; i++) {
      const p = weatherPool[i];
      const sway = Math.sin(time * 4.2 + p.phase) * 38;
      p.x += (p.vx + sway) * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.y >= GROUND_Y - 2 || p.life <= 0) {
        // Respawn localized around one of the visible Foundry ceiling ember vents!
        const ventIdx = p.emitterIndex ?? i % FOUNDRY_EMBER_VENTS.length;
        const ventWorldX = FOUNDRY_EMBER_VENTS[ventIdx];
        let spawnScreenX = ventWorldX - cameraX + (Math.random() - 0.5) * 145;
        // If that vent is currently offscreen, pick the nearest on-screen vent
        if (spawnScreenX < -60 || spawnScreenX > viewW + 60) {
          const nearestVent =
            Math.round((cameraX + Math.random() * viewW) / 360) * 360 + 320;
          spawnScreenX = nearestVent - cameraX + (Math.random() - 0.5) * 145;
        }
        p.x = spawnScreenX;
        p.y = -10 + Math.random() * 55;
        p.life = 2.0 + Math.random() * 1.8;
      }

      if (p.kind === 'ember') {
        const flicker = 0.65 + 0.35 * Math.sin(time * 16 + p.phase);
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 10;
        ctx.globalAlpha = p.alpha * flicker;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Bright white-yellow ember core
        ctx.fillStyle = '#fef9c3';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Falling char-ash fleck
        ctx.fillStyle = `rgba(148, 163, 184, ${p.alpha * 0.55})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // =========================================================================
  // 4. SANCTUARY / SPIRE: DRIFTING ASTRAL MOTES
  // =========================================================================
  else {
    for (let i = 0; i < weatherPool.length; i++) {
      const p = weatherPool[i];
      p.x += p.vx * dt;
      p.y += (p.vy + Math.sin(time * 1.6 + p.phase) * 10) * dt;
      if (p.x > viewW + 30) p.x = -30;
      if (p.x < -30) p.x = viewW + 30;

      const alpha = p.alpha * (0.55 + 0.45 * Math.sin(time * 2.5 + p.phase));
      ctx.fillStyle = hexToRgba(p.color, alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Renders the 4-layer gothic parallax world backdrop before entities are drawn.
 */
export function renderParallaxBackdrop(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  viewW: number,
  viewH: number,
  stageWidth: number,
  theme: WingTheme,
  time: number,
  doors: DoorPortal[],
  hazards: HazardZone[],
  shrines: ShrineRelic[],
  crystals: { amber: boolean; emerald: boolean; sapphire: boolean }
): LightSource[] {
  const lights: LightSource[] = [];

  // =========================================================================
  // LAYER 0 (0.12x Parallax): Nocturnal Sky, Moon & Distant Gothic Spires
  // =========================================================================
  const skyGrad = ctx.createLinearGradient(0, 0, 0, viewH);
  if (theme === 'sanctuary') {
    skyGrad.addColorStop(0, '#060812');
    skyGrad.addColorStop(0.55, '#0f1628');
    skyGrad.addColorStop(1, '#151a28');
  } else if (theme === 'farmland') {
    skyGrad.addColorStop(0, '#0a0b14');
    skyGrad.addColorStop(0.6, '#1c1824');
    skyGrad.addColorStop(1, '#261d1a');
  } else if (theme === 'forest') {
    skyGrad.addColorStop(0, '#050e10');
    skyGrad.addColorStop(0.6, '#0b1e22');
    skyGrad.addColorStop(1, '#0f2926');
  } else if (theme === 'cavern') {
    skyGrad.addColorStop(0, '#0c070a');
    skyGrad.addColorStop(0.6, '#1e1014');
    skyGrad.addColorStop(1, '#2d1412');
  } else {
    skyGrad.addColorStop(0, '#080510');
    skyGrad.addColorStop(0.6, '#1d1030');
    skyGrad.addColorStop(1, '#2e1444');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, viewW, viewH);

  // Full Gothic Moon with Halo
  const moonX = viewW * 0.74 - cameraX * 0.06;
  const moonY = 128;
  const moonRadius = theme === 'spire' ? 62 : 48;
  const moonGlow = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.2, moonX, moonY, moonRadius * 3.2);
  moonGlow.addColorStop(0, theme === 'spire' ? 'rgba(192, 132, 252, 0.35)' : 'rgba(186, 230, 253, 0.28)');
  moonGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonRadius * 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = theme === 'spire' ? '#e9d5ff' : '#e0f2fe';
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
  ctx.fill();

  // Distant Cathedral Spires & Jagged Mountain Silhouette (0.15x Parallax)
  ctx.fillStyle = '#090c15';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (let i = -1; i < 16; i++) {
    const sx = i * 220 - ((cameraX * 0.15) % 220);
    ctx.lineTo(sx, 320);
    ctx.lineTo(sx + 45, 250);
    ctx.lineTo(sx + 65, 165);
    ctx.lineTo(sx + 85, 250);
    ctx.lineTo(sx + 140, 310);
    ctx.lineTo(sx + 180, 225);
    ctx.lineTo(sx + 220, 320);
  }
  ctx.lineTo(viewW, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  // =========================================================================
  // LAYER 1 (0.35x Parallax): Pointed Gothic Arches, Tattered Banners & Trees
  // =========================================================================
  const archSpacing = 280;
  const startArch = Math.floor((cameraX * 0.35) / archSpacing) - 1;
  for (let i = startArch; i < startArch + 8; i++) {
    const ax = i * archSpacing - cameraX * 0.35;

    if (theme === 'sanctuary' || theme === 'spire') {
      ctx.fillStyle = '#111625';
      ctx.fillRect(ax - 18, 80, 36, GROUND_Y - 80);

      ctx.strokeStyle = '#1e263b';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(ax + 18, 220);
      ctx.quadraticCurveTo(ax + archSpacing * 0.5, 95, ax + archSpacing - 18, 220);
      ctx.stroke();

      ctx.fillStyle = theme === 'spire' ? '#4c1d95' : '#451a23';
      ctx.beginPath();
      ctx.moveTo(ax - 14, 155);
      ctx.lineTo(ax + 14, 155);
      ctx.lineTo(ax + 14, 290);
      ctx.lineTo(ax, 270);
      ctx.lineTo(ax - 14, 290);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (theme === 'farmland') {
      ctx.fillStyle = '#191414';
      ctx.fillRect(ax - 14, 190, 28, GROUND_Y - 190);
      ctx.strokeStyle = '#29201e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ax, 230);
      ctx.lineTo(ax + 90, 160);
      ctx.lineTo(ax + 180, 230);
      ctx.stroke();
    } else if (theme === 'forest') {
      ctx.fillStyle = '#0a1919';
      ctx.beginPath();
      ctx.moveTo(ax - 35, GROUND_Y);
      ctx.quadraticCurveTo(ax - 15, 280, ax - 45, 70);
      ctx.lineTo(ax + 25, 70);
      ctx.quadraticCurveTo(ax + 10, 280, ax + 40, GROUND_Y);
      ctx.fill();
    } else if (theme === 'cavern') {
      ctx.fillStyle = '#1b1113';
      ctx.beginPath();
      ctx.moveTo(ax - 40, 0);
      ctx.lineTo(ax, 240);
      ctx.lineTo(ax + 40, 0);
      ctx.fill();
      ctx.fillRect(ax + 95, 140, 42, GROUND_Y - 140);
    }
  }

  // =========================================================================
  // LAYER 2 (1.0x World Space): Wall Sconces/Torches, Wing Doors & Shrines
  // =========================================================================
  ctx.save();
  ctx.translate(-cameraX, 0);

  // Wall Torches every 360px
  for (let tx = 180; tx < stageWidth - 120; tx += 360) {
    const ty = GROUND_Y - 148;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(tx - 4, ty, 8, 28);
    ctx.fillRect(tx - 10, ty + 22, 20, 5);

    const flicker = Math.sin(time * 11 + tx) * 3;
    const flameColor =
      theme === 'forest'
        ? '#34d399'
        : theme === 'spire'
        ? '#c084fc'
        : '#f59e0b';

    ctx.fillStyle = flameColor;
    ctx.beginPath();
    ctx.moveTo(tx - 7, ty);
    ctx.quadraticCurveTo(tx + flicker, ty - 24, tx, ty - 30);
    ctx.quadraticCurveTo(tx - flicker, ty - 20, tx + 7, ty);
    ctx.closePath();
    ctx.fill();

    lights.push({
      x: tx - cameraX,
      y: ty - 12,
      radius: 175 + flicker * 4,
      color: flameColor,
      intensity: 0.65,
      flicker: true,
    });
  }

  // Render Wing Doors & The Tri-Sealed Grand Final Gate
  for (const door of doors) {
    const dx = door.x;
    const dy = GROUND_Y;
    const isGrandGate = door.wing === 4;
    const doorW = isGrandGate ? 156 : 96;
    const doorH = isGrandGate ? 220 : 155;

    ctx.fillStyle = '#1e2436';
    ctx.strokeStyle = isGrandGate ? '#d97706' : '#475569';
    ctx.lineWidth = isGrandGate ? 4 : 3;

    ctx.beginPath();
    ctx.moveTo(dx - doorW / 2 - 12, dy);
    ctx.lineTo(dx - doorW / 2 - 12, dy - doorH * 0.65);
    ctx.quadraticCurveTo(dx, dy - doorH - 28, dx + doorW / 2 + 12, dy - doorH * 0.65);
    ctx.lineTo(dx + doorW / 2 + 12, dy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const portalGrad = ctx.createLinearGradient(dx, dy - doorH, dx, dy);
    portalGrad.addColorStop(0, '#090b12');
    portalGrad.addColorStop(1, door.isCleared ? '#0f291e' : '#131829');
    ctx.fillStyle = portalGrad;
    ctx.beginPath();
    ctx.moveTo(dx - doorW / 2, dy);
    ctx.lineTo(dx - doorW / 2, dy - doorH * 0.62);
    ctx.quadraticCurveTo(dx, dy - doorH - 10, dx + doorW / 2, dy - doorH * 0.62);
    ctx.lineTo(dx + doorW / 2, dy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = door.crystalColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(dx, dy - doorH * 0.48, isGrandGate ? 42 : 26, 0, Math.PI * 2);
    ctx.stroke();

    if (isGrandGate) {
      const sockets: Array<{ key: 'amber' | 'emerald' | 'sapphire'; ox: number; oy: number; color: string }> = [
        { key: 'amber', ox: -34, oy: -doorH * 0.72, color: '#f59e0b' },
        { key: 'emerald', ox: 0, oy: -doorH * 0.86, color: '#10b981' },
        { key: 'sapphire', ox: 34, oy: -doorH * 0.72, color: '#3b82f6' },
      ];

      for (const s of sockets) {
        const active = crystals[s.key];
        ctx.fillStyle = active ? s.color : '#1e293b';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(dx + s.ox, dy + s.oy - 12);
        ctx.lineTo(dx + s.ox + 10, dy + s.oy);
        ctx.lineTo(dx + s.ox, dy + s.oy + 12);
        ctx.lineTo(dx + s.ox - 10, dy + s.oy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (active) {
          lights.push({
            x: dx + s.ox - cameraX,
            y: dy + s.oy,
            radius: 95,
            color: s.color,
            intensity: 0.75,
          });
        }
      }
    }

    ctx.fillStyle = 'rgba(10, 12, 20, 0.85)';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.fillRect(dx - 82, dy - doorH - 46, 164, 24);
    ctx.strokeRect(dx - 82, dy - doorH - 46, 164, 24);

    ctx.fillStyle = '#f3e8d2';
    ctx.font = 'bold 11px "Cinzel", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(door.title, dx, dy - doorH - 30);

    lights.push({
      x: dx - cameraX,
      y: dy - doorH * 0.5,
      radius: isGrandGate ? 210 : 145,
      color: door.crystalColor,
      intensity: 0.55,
    });
  }

  // Render Relic & Crystal Pedestal Shrines
  for (const shrine of shrines) {
    const sx = shrine.x;
    const sy = GROUND_Y;
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.fillRect(sx - 28, sy - 42, 56, 42);
    ctx.strokeRect(sx - 28, sy - 42, 56, 42);
    ctx.fillRect(sx - 36, sy - 48, 72, 10);

    if (!shrine.collected) {
      const bob = Math.sin(time * 3.5) * 7;
      ctx.fillStyle = shrine.color;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 92 + bob);
      ctx.lineTo(sx + 16, sy - 74 + bob);
      ctx.lineTo(sx, sy - 56 + bob);
      ctx.lineTo(sx - 16, sy - 74 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      lights.push({
        x: sx - cameraX,
        y: sy - 74 + bob,
        radius: 165,
        color: shrine.color,
        intensity: 0.85,
      });
    }
  }

  // =========================================================================
  // LAYER 3 (1.0x Ground Flagstones & Environmental Hazards)
  // =========================================================================
  const floorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, viewH);
  if (theme === 'farmland') {
    floorGrad.addColorStop(0, '#292018');
    floorGrad.addColorStop(0.2, '#1c1510');
    floorGrad.addColorStop(1, '#0c0907');
  } else if (theme === 'forest') {
    floorGrad.addColorStop(0, '#132a23');
    floorGrad.addColorStop(0.2, '#0c1c18');
    floorGrad.addColorStop(1, '#050c0a');
  } else if (theme === 'cavern') {
    floorGrad.addColorStop(0, '#2a181a');
    floorGrad.addColorStop(0.2, '#190e10');
    floorGrad.addColorStop(1, '#090506');
  } else {
    floorGrad.addColorStop(0, '#1e2536');
    floorGrad.addColorStop(0.2, '#121622');
    floorGrad.addColorStop(1, '#07090f');
  }

  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, GROUND_Y, stageWidth, viewH - GROUND_Y);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(stageWidth, GROUND_Y);
  ctx.stroke();

  for (let fx = 0; fx < stageWidth; fx += 96) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.moveTo(fx, GROUND_Y);
    ctx.lineTo(fx - 18, GROUND_Y + 36);
    ctx.stroke();
  }

  // Render Environmental Hazards (Thorn Brambles, Crumbling Spikes, Lava Pools)
  for (const haz of hazards) {
    if (haz.type === 'thorns') {
      ctx.fillStyle = '#14532d';
      ctx.fillRect(haz.x, GROUND_Y - 10, haz.width, 16);
      ctx.fillStyle = '#4ade80';
      for (let tx = haz.x + 8; tx < haz.x + haz.width - 6; tx += 16) {
        ctx.beginPath();
        ctx.moveTo(tx - 6, GROUND_Y + 2);
        ctx.lineTo(tx, GROUND_Y - 22);
        ctx.lineTo(tx + 6, GROUND_Y + 2);
        ctx.closePath();
        ctx.fill();
      }
    } else if (haz.type === 'spikes') {
      ctx.fillStyle = '#94a3b8';
      for (let tx = haz.x + 8; tx < haz.x + haz.width - 6; tx += 18) {
        ctx.beginPath();
        ctx.moveTo(tx - 7, GROUND_Y + 2);
        ctx.lineTo(tx, GROUND_Y - 26);
        ctx.lineTo(tx + 7, GROUND_Y + 2);
        ctx.closePath();
        ctx.fill();
      }
    } else if (haz.type === 'lava') {
      const pulse = Math.sin(time * 6) * 3;
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(haz.x, GROUND_Y - 6, haz.width, 16);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(haz.x + 6, GROUND_Y - 3, haz.width - 12, 6 + pulse * 0.4);
      lights.push({
        x: haz.x + haz.width * 0.5 - cameraX,
        y: GROUND_Y - 4,
        radius: 130,
        color: '#f97316',
        intensity: 0.7,
      });
    }
  }

  ctx.restore();
  return lights;
}

/**
 * Composites the offscreen 2D nocturnal lightmap ('multiply' shadow + 'lighter' spectral bloom)
 * and renders the zone-specific Particle Weather System (Farmland Rain, Grove Mist, Foundry Embers).
 */
export function renderLightingPass(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  viewW: number,
  viewH: number,
  player: PlayerState,
  projectiles: ProjectileEntity[],
  worldLights: LightSource[],
  time: number,
  theme: WingTheme = 'sanctuary'
): void {
  const lCtx = ensureLightCanvas(viewW, viewH);

  // 1. Render & update the Zone-Specific Particle Weather System (and collect ember light sources)
  updateAndRenderWeather(ctx, theme, cameraX, viewW, viewH, time, worldLights);

  // 2. Fill offscreen lightmap with deep nocturnal gothic darkness
  lCtx.globalCompositeOperation = 'source-over';
  lCtx.fillStyle = 'rgba(6, 9, 18, 0.62)';
  lCtx.fillRect(0, 0, viewW, viewH);

  // Add Player Ghost Hero spectral cyan aura
  const allLights: LightSource[] = [
    ...worldLights,
    {
      x: player.x - cameraX,
      y: player.y - 48,
      radius: player.dashTimer > 0 ? 255 : 210,
      color: player.parryEmpowerTimer > 0 ? '#fbbf24' : '#38bdf8',
      intensity: 0.92,
    },
  ];

  // Add active projectile lights
  for (const p of projectiles) {
    allLights.push({
      x: p.x - cameraX,
      y: p.y,
      radius: 85,
      color: p.color,
      intensity: 0.7,
    });
  }

  // 3. Cut out soft radial illumination holes using 'destination-out'
  lCtx.globalCompositeOperation = 'destination-out';
  for (const light of allLights) {
    if (light.x < -light.radius || light.x > viewW + light.radius) continue;
    const grad = lCtx.createRadialGradient(light.x, light.y, 6, light.x, light.y, light.radius);
    grad.addColorStop(0, `rgba(0, 0, 0, ${light.intensity})`);
    grad.addColorStop(0.55, `rgba(0, 0, 0, ${light.intensity * 0.45})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    lCtx.fillStyle = grad;
    lCtx.beginPath();
    lCtx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Draw shadow mask over main canvas
  ctx.save();
  ctx.drawImage(offscreenLightCanvas!, 0, 0);

  // 5. Additive 'lighter' colored glow pass for spectral aura, embers & torch bloom
  ctx.globalCompositeOperation = 'lighter';
  for (const light of allLights) {
    if (light.x < -light.radius || light.x > viewW + light.radius) continue;
    const bloom = ctx.createRadialGradient(light.x, light.y, 4, light.x, light.y, light.radius * 0.75);
    bloom.addColorStop(0, hexToRgba(light.color, 0.16 * light.intensity));
    bloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(light.x, light.y, light.radius * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(56, 189, 248, ${alpha})`;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
