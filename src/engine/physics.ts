/**
 * 2D Gothic Side-Scroller Physics, Float-Hover, Ghost Dash, Walk Cycle & Solid Hitbox Collision Engine
 */

import { SpriteKey } from './spriteLoader';

export interface DashAfterimage {
  x: number;
  y: number;
  facing: 1 | -1;
  alpha: number;
  leanAngle: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  activeWeapon: number; // 1..5
  unlockedWeapons: number[];
  relics: string[]; // 'wind_stride_charm', 'golden_heart_vessel', 'bramble_ward', 'ember_core'
  crystals: {
    amber: boolean;
    emerald: boolean;
    sapphire: boolean;
  };
  isGrounded: boolean;
  floatTimer: number;
  leanAngle: number;
  walkCycle: number;
  // Ghost Dash
  dashTimer: number; // > 0 means currently dashing & invulnerable
  dashCooldown: number; // 1.2s base, 0.72s with Wind-Stride Charm
  dashMaxCooldown: number;
  afterimages: DashAfterimage[];
  // Attack & Parry
  attackTimer: number;
  attackDuration: number;
  attackCooldown: number;
  parryWindowTimer: number;
  parryEmpowerTimer: number; // > 0 grants 2x CRIT on next attack
  invulnTimer: number;
  hitFlashTimer: number;
}

export type EnemyRole = 'bruiser' | 'ranged' | 'flier' | 'boss';

export interface EnemyEntity {
  id: string;
  name: string;
  sprite: SpriteKey;
  role: EnemyRole;
  isBoss?: boolean;
  bossPhase?: number;
  maxBossPhases?: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  knockbackVx: number;
  width: number;
  height: number;
  renderHeight: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  zoneIndex: number;
  state: 'patrol' | 'chase' | 'telegraph' | 'attack' | 'cooldown' | 'stunned';
  stateTimer: number;
  telegraphType: 'charge' | 'slam' | 'projectile' | 'leap';
  attackTargetX: number;
  hitFlashTimer: number;
  stunTimer: number;
  scaleX: number;
  scaleY: number;
  enraged: boolean;
  hoverOffset: number;
  walkCycle: number;
  strideIntensity: number;
  lastDustStep: number;
}

export interface ProjectileEntity {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  damage: number;
  fromPlayer: boolean;
  reflected?: boolean;
  life: number;
}

export interface HazardZone {
  id: string;
  type: 'thorns' | 'spikes' | 'lava';
  x: number;
  width: number;
  damage: number;
  label: string;
}

export interface DoorPortal {
  id: string;
  targetStageId: string;
  x: number;
  width: number;
  title: string;
  subtitle: string;
  wing: 0 | 1 | 2 | 3 | 4;
  crystalColor: string;
  requiresCrystals?: boolean;
  isCleared?: boolean;
}

export interface NPCEntity {
  id: string;
  name: string;
  role: string;
  sprite: SpriteKey;
  x: number;
  facing: 1 | -1;
  dialogue: string[];
}

export interface ShrineRelic {
  id: string;
  name: string;
  description: string;
  x: number;
  collected: boolean;
  rewardType: 'weapon' | 'relic' | 'crystal';
  weaponId?: number;
  relicId?: string;
  crystalKey?: 'amber' | 'emerald' | 'sapphire';
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  isCrit?: boolean;
  life: number;
  maxLife: number;
}

export const GROUND_Y = 540; // World ground baseline inside 1280x720 virtual coordinate space
export const GRAVITY = 1280;

export function createInitialPlayer(): PlayerState {
  return {
    x: 240,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    width: 48,
    height: 92,
    facing: 1,
    hp: 6,
    maxHp: 6,
    activeWeapon: 1,
    unlockedWeapons: [1],
    relics: [],
    crystals: {
      amber: false,
      emerald: false,
      sapphire: false,
    },
    isGrounded: true,
    floatTimer: 0,
    leanAngle: 0,
    walkCycle: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashMaxCooldown: 1.2,
    afterimages: [],
    attackTimer: 0,
    attackDuration: 0.28,
    attackCooldown: 0,
    parryWindowTimer: 0,
    parryEmpowerTimer: 0,
    invulnTimer: 0,
    hitFlashTimer: 0,
  };
}

/**
 * Updates player movement, float-jump/hover physics, pitch tilt based on vx & vy,
 * Ghost Dash cooldown, and fading cyan afterimages.
 */
export function updatePlayerPhysics(
  player: PlayerState,
  input: { left: boolean; right: boolean; up: boolean; jumpJustPressed: boolean; dashJustPressed: boolean },
  dt: number,
  stageWidth: number,
  onDashStart: () => void
): void {
  const hasWindStride = player.relics.includes('wind_stride_charm');
  player.dashMaxCooldown = hasWindStride ? 0.72 : 1.2;

  // Cooldown timers
  if (player.dashCooldown > 0) player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  if (player.attackCooldown > 0) player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  if (player.parryWindowTimer > 0) player.parryWindowTimer = Math.max(0, player.parryWindowTimer - dt);
  if (player.parryEmpowerTimer > 0) player.parryEmpowerTimer = Math.max(0, player.parryEmpowerTimer - dt);
  if (player.invulnTimer > 0) player.invulnTimer = Math.max(0, player.invulnTimer - dt);
  if (player.hitFlashTimer > 0) player.hitFlashTimer = Math.max(0, player.hitFlashTimer - dt);

  if (player.attackTimer > 0) {
    player.attackTimer = Math.max(0, player.attackTimer - dt);
  }

  // Trigger Ghost Dash
  if (input.dashJustPressed && player.dashCooldown <= 0 && player.dashTimer <= 0) {
    player.dashTimer = 0.24;
    player.dashCooldown = player.dashMaxCooldown;
    player.invulnTimer = Math.max(player.invulnTimer, 0.28);
    player.vx = player.facing * (hasWindStride ? 780 : 690);
    player.vy = 0;
    onDashStart();
  }

  if (player.dashTimer > 0) {
    player.dashTimer = Math.max(0, player.dashTimer - dt);
    // Spawn spectral cyan afterimages while dashing
    if (Math.random() < 0.92) {
      player.afterimages.push({
        x: player.x,
        y: player.y,
        facing: player.facing,
        alpha: 0.72,
        leanAngle: player.facing * 0.25,
      });
    }
  } else {
    const moveSpeed = hasWindStride ? 345 : 300;
    let dir = 0;
    if (input.left) dir -= 1;
    if (input.right) dir += 1;

    if (dir !== 0) {
      player.facing = dir as 1 | -1;
      player.vx = dir * moveSpeed;
      player.walkCycle += dt * 11;
    } else {
      player.vx *= Math.pow(0.001, dt);
      if (Math.abs(player.vx) < 5) player.vx = 0;
      player.walkCycle += dt * 3.5;
    }

    // Float-Jump & Spectral Hover
    if (input.jumpJustPressed && player.isGrounded) {
      player.vy = -575;
      player.isGrounded = false;
      player.floatTimer = 0.75;
    }

    if (!player.isGrounded) {
      // Holding W / Up while descending softens gravity for ghostly hover
      const isHovering = input.up && player.vy > -45 && player.floatTimer > 0;
      if (isHovering) {
        player.floatTimer = Math.max(0, player.floatTimer - dt);
        player.vy += GRAVITY * 0.20 * dt;
        player.vy = Math.min(player.vy, 90);
      } else {
        player.vy += GRAVITY * dt;
      }
    }
  }

  // Integrate velocity
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // Ground collision
  if (player.y >= GROUND_Y) {
    player.y = GROUND_Y;
    player.vy = 0;
    player.isGrounded = true;
  }

  // Smooth pitch tilt driven by both horizontal velocity (vx) and vertical velocity (vy)
  const horizontalPitch = (player.vx / 340) * 0.14;
  const verticalPitch = player.facing * Math.max(-0.12, Math.min(0.12, (player.vy / 650) * 0.11));
  const targetLean =
    player.dashTimer > 0
      ? player.facing * 0.26
      : horizontalPitch + verticalPitch;
  player.leanAngle += (targetLean - player.leanAngle) * Math.min(1, dt * 15);

  // Clamp within stage boundaries
  const halfW = player.width * 0.5;
  player.x = Math.max(halfW + 24, Math.min(stageWidth - halfW - 24, player.x));

  // Update afterimages
  for (let i = player.afterimages.length - 1; i >= 0; i--) {
    player.afterimages[i].alpha -= dt * 2.6;
    if (player.afterimages[i].alpha <= 0) {
      player.afterimages.splice(i, 1);
    }
  }
}

/**
 * Enforces solid horizontal separation between Player and Enemies, and between Enemy pairs.
 * During Ghost Dash (player.dashTimer > 0), the player phases through enemies cleanly.
 */
export function resolveEntityCollisions(
  player: PlayerState,
  enemies: EnemyEntity[],
  stageWidth: number
): void {
  const activeEnemies = enemies.filter((e) => e.hp > 0);

  // 1. Enemy vs Enemy solid separation
  for (let i = 0; i < activeEnemies.length; i++) {
    for (let j = i + 1; j < activeEnemies.length; j++) {
      const a = activeEnemies[i];
      const b = activeEnemies[j];
      if (Math.abs(a.y - b.y) > 70) continue;

      const minDist = (a.width + b.width) * 0.44;
      const dx = b.x - a.x;
      const absDx = Math.abs(dx);
      if (absDx < minDist) {
        const push = (minDist - absDx) * 0.5;
        const sign = dx >= 0 ? 1 : -1;
        a.x = Math.max(40, Math.min(stageWidth - 40, a.x - sign * push));
        b.x = Math.max(40, Math.min(stageWidth - 40, b.x + sign * push));
      }
    }
  }

  // 2. Player vs Enemy solid separation (skipped when Ghost Dashing!)
  if (player.dashTimer > 0) return;

  for (const enemy of activeEnemies) {
    const verticalOverlap =
      player.y > enemy.y - enemy.height + 12 && player.y - player.height < enemy.y - 8;
    if (!verticalOverlap) continue;

    const minDist = (player.width + enemy.width) * 0.48;
    const dx = player.x - enemy.x;
    const absDx = Math.abs(dx);
    if (absDx < minDist) {
      const overlap = minDist - absDx;
      const sign = dx >= 0 ? 1 : -1;
      const playerPush = enemy.isBoss ? overlap * 0.9 : overlap * 0.65;
      const enemyPush = enemy.isBoss ? overlap * 0.1 : overlap * 0.35;
      player.x = Math.max(36, Math.min(stageWidth - 36, player.x + sign * playerPush));
      enemy.x = Math.max(48, Math.min(stageWidth - 48, enemy.x - sign * enemyPush));
    }
  }
}
