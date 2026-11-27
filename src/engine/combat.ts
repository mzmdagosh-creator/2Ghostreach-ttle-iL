/**
 * Skill-Based Combat, Parry / Soul-Reflect, Walk-Stride Footfall Dust,
 * Telegraphed Windup Pullbacks, Leap/Slam Physics & Particle Feedback Engine
 */

import { soundEngine } from './audio';
import {
  EnemyEntity,
  FloatingText,
  GRAVITY,
  GROUND_Y,
  HazardZone,
  Particle,
  PlayerState,
  ProjectileEntity,
} from './physics';

export interface WeaponDef {
  id: number;
  name: string;
  range: number;
  damage: number;
  cooldown: number;
  description: string;
  color: string;
}

export const WEAPON_CATALOG: Record<number, WeaponDef> = {
  1: {
    id: 1,
    name: 'Astral Dagger',
    range: 92,
    damage: 18,
    cooldown: 0.27,
    description: 'Swift spectral blade with nimble parry window.',
    color: '#7dd3fc',
  },
  2: {
    id: 2,
    name: 'Spirit Pitchfork',
    range: 136,
    damage: 26,
    cooldown: 0.33,
    description: 'Long-reach heirloom trident of the Farmland Wing.',
    color: '#38bdf8',
  },
  3: {
    id: 3,
    name: 'Bramble-Thorn Whip',
    range: 164,
    damage: 30,
    cooldown: 0.35,
    description: 'Lashes across wide gaps with Sylvan venom.',
    color: '#34d399',
  },
  4: {
    id: 4,
    name: 'Runic Warhammer',
    range: 118,
    damage: 44,
    cooldown: 0.45,
    description: 'Crushes armored hides and shatters stone shields.',
    color: '#fb923c',
  },
  5: {
    id: 5,
    name: 'Soul-Lantern Flail',
    range: 142,
    damage: 38,
    cooldown: 0.34,
    description: 'Releases arcane wisps on every critical swing.',
    color: '#c084fc',
  },
};

export interface CombatCallbacks {
  onHitstop: (durationSec: number) => void;
  onScreenShake: (intensity: number) => void;
  onBossDefeated?: (enemy: EnemyEntity) => void;
}

export function spawnParticles(
  particles: Particle[],
  x: number,
  y: number,
  color: string,
  count: number,
  speed = 180
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const mag = (0.25 + Math.random() * 0.75) * speed;
    const life = 0.28 + Math.random() * 0.38;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * mag,
      vy: Math.sin(angle) * mag - 45,
      size: 2.5 + Math.random() * 4.5,
      color,
      alpha: 1,
      life,
      maxLife: life,
    });
  }
}

/**
 * Spawns subtle dust puffs kicking off the ground behind a walking/charging enemy's footfall.
 */
export function spawnFootfallDust(
  particles: Particle[],
  x: number,
  y: number,
  facing: 1 | -1,
  isCharge = false
): void {
  const count = isCharge ? 6 : 3;
  for (let i = 0; i < count; i++) {
    const life = 0.22 + Math.random() * 0.2;
    particles.push({
      x: x - facing * (8 + Math.random() * 14),
      y: y - 2 - Math.random() * 4,
      vx: -facing * (35 + Math.random() * (isCharge ? 95 : 45)),
      vy: -18 - Math.random() * 35,
      size: isCharge ? 3.5 + Math.random() * 3.5 : 2.2 + Math.random() * 2.5,
      color: isCharge ? '#d6c7b2' : '#94a3b8',
      alpha: 0.7,
      life,
      maxLife: life,
    });
  }
}

export function spawnFloatingText(
  texts: FloatingText[],
  x: number,
  y: number,
  text: string,
  color: string,
  isCrit = false
): void {
  texts.push({
    x,
    y,
    vy: isCrit ? -88 : -60,
    text,
    color,
    isCrit,
    life: isCrit ? 0.98 : 0.78,
    maxLife: isCrit ? 0.98 : 0.78,
  });
}

/**
 * Executes player attack lunge and checks for Parry / Soul-Reflect timing against enemy telegraphs and projectiles.
 */
export function performPlayerAttack(
  player: PlayerState,
  enemies: EnemyEntity[],
  projectiles: ProjectileEntity[],
  particles: Particle[],
  floatingTexts: FloatingText[],
  callbacks: CombatCallbacks
): void {
  if (player.attackCooldown > 0) return;

  const weapon = WEAPON_CATALOG[player.activeWeapon] || WEAPON_CATALOG[1];
  player.attackDuration = weapon.cooldown;
  player.attackTimer = weapon.cooldown;
  player.attackCooldown = weapon.cooldown;
  player.parryWindowTimer = 0.22;

  // Active combat lunge forward on swing
  if (player.dashTimer <= 0) {
    player.vx = player.facing * 175;
  }

  let triggeredParry = false;

  // 1. Check Projectile Soul-Reflect Parry
  for (const proj of projectiles) {
    if (proj.fromPlayer) continue;
    const dx = proj.x - player.x;
    const dy = proj.y - (player.y - 45);
    const dist = Math.hypot(dx, dy);
    if (dist <= weapon.range + 34) {
      proj.fromPlayer = true;
      proj.reflected = true;
      proj.vx = -proj.vx * 1.9;
      proj.vy = -proj.vy * 1.4;
      proj.damage = weapon.damage * 2;
      proj.color = '#fbbf24';
      proj.life = 2.2;
      triggeredParry = true;
      spawnParticles(particles, proj.x, proj.y, '#fbbf24', 20, 260);
      spawnFloatingText(floatingTexts, proj.x, proj.y - 22, 'SOUL REFLECT!', '#fbbf24', true);
    }
  }

  // 2. Check Enemy Melee Telegraph Parry & Weapon Strike Hitbox
  const attackMinX = player.facing === 1 ? player.x - 18 : player.x - weapon.range;
  const attackMaxX = player.facing === 1 ? player.x + weapon.range : player.x + 18;

  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;

    const enemyLeft = enemy.x - enemy.width * 0.5;
    const enemyRight = enemy.x + enemy.width * 0.5;
    const inHorizontalRange = enemyRight >= attackMinX && enemyLeft <= attackMaxX;
    const inVerticalRange = Math.abs((player.y - 45) - (enemy.y - enemy.height * 0.5)) <= 102;

    if (!inHorizontalRange || !inVerticalRange) continue;

    // Check if enemy is in Parryable Telegraph or early Attack lunge window
    const isParryableWindow =
      (enemy.state === 'telegraph' && enemy.stateTimer <= 0.45) ||
      (enemy.state === 'attack' && enemy.stateTimer >= 0.14);

    const isCrit = isParryableWindow || player.parryEmpowerTimer > 0;
    if (isParryableWindow) {
      triggeredParry = true;
      enemy.state = 'stunned';
      enemy.stunTimer = 1.6;
      enemy.knockbackVx = -enemy.facing * 240;
      player.parryEmpowerTimer = 1.4;
      player.invulnTimer = Math.max(player.invulnTimer, 0.38);
      spawnFloatingText(
        floatingTexts,
        enemy.x,
        enemy.y - enemy.height - 28,
        'PARRY STUN! 2x',
        '#fbbf24',
        true
      );
      spawnParticles(particles, (player.x + enemy.x) * 0.5, player.y - 48, '#fbbf24', 26, 300);
    }

    const dmg = isCrit ? weapon.damage * 2 : weapon.damage;
    enemy.hp = Math.max(0, enemy.hp - dmg);
    enemy.hitFlashTimer = 0.16;
    // Strong squash-and-stretch impact deformation!
    enemy.scaleX = 0.74;
    enemy.scaleY = 1.26;

    // Physical knockback impulse sliding along the ground
    const kbForce = enemy.isBoss ? (isCrit ? 120 : 45) : isCrit ? 260 : 145;
    enemy.knockbackVx = player.facing * kbForce;
    spawnFootfallDust(particles, enemy.x, enemy.y, (player.facing * -1) as 1 | -1, true);

    spawnParticles(
      particles,
      enemy.x,
      enemy.y - enemy.height * 0.5,
      isCrit ? '#fbbf24' : weapon.color,
      isCrit ? 20 : 12,
      isCrit ? 245 : 165
    );

    spawnFloatingText(
      floatingTexts,
      enemy.x + (Math.random() - 0.5) * 20,
      enemy.y - enemy.height - 8,
      isCrit ? `${dmg} CRIT!` : `${dmg}`,
      isCrit ? '#fbbf24' : '#f8fafc',
      isCrit
    );

    if (enemy.hp <= 0) {
      soundEngine.playEnemyDefeat();
      // Shattered dark-ash + cyan spirit orbs on KO
      spawnParticles(particles, enemy.x, enemy.y - enemy.height * 0.5, '#38bdf8', 32, 270);
      spawnParticles(particles, enemy.x, enemy.y - enemy.height * 0.4, '#1e293b', 26, 210);
      spawnParticles(particles, enemy.x, enemy.y - enemy.height * 0.6, '#fbbf24', 14, 180);
      if (enemy.isBoss) {
        callbacks.onHitstop(0.085);
        callbacks.onScreenShake(15);
        callbacks.onBossDefeated?.(enemy);
      } else {
        callbacks.onHitstop(0.045);
        callbacks.onScreenShake(6);
      }
    } else {
      soundEngine.playHit(isCrit);
      if (isCrit || weapon.id === 4) {
        callbacks.onHitstop(0.045);
        callbacks.onScreenShake(8);
      } else {
        callbacks.onScreenShake(3.5);
      }
    }
  }

  if (triggeredParry) {
    soundEngine.playParry();
    callbacks.onHitstop(0.055);
    callbacks.onScreenShake(11);
  } else {
    soundEngine.playSlash(weapon.id);
  }

  // Weapon 5 (Soul-Lantern Flail) launches a spectral bolt on swing
  if (weapon.id === 5) {
    projectiles.push({
      id: `p_${Date.now()}_${Math.random()}`,
      x: player.x + player.facing * 36,
      y: player.y - 48,
      vx: player.facing * 480,
      vy: 0,
      radius: 9,
      color: '#c084fc',
      damage: 20,
      fromPlayer: true,
      life: 1.2,
    });
  }
}

/**
 * Updates enemy AI state machines, walk-stride cycles, footfall dust, telegraphed windup pullbacks,
 * enraged boss phases, hazards, and projectiles.
 */
export function updateCombatSimulation(
  player: PlayerState,
  enemies: EnemyEntity[],
  projectiles: ProjectileEntity[],
  hazards: HazardZone[],
  particles: Particle[],
  floatingTexts: FloatingText[],
  dt: number,
  stageWidth: number,
  callbacks: CombatCallbacks
): void {
  // 1. Environmental Hazards (Thorn Brambles, Crumbling Spikes, Bubbling Magma Pools)
  if (player.isGrounded && player.invulnTimer <= 0 && player.dashTimer <= 0) {
    for (const haz of hazards) {
      if (player.x >= haz.x && player.x <= haz.x + haz.width) {
        damagePlayer(player, haz.damage, particles, floatingTexts, callbacks);
        player.vy = -360;
        player.isGrounded = false;
        break;
      }
    }
  }

  // 2. Enemy AI & Procedural Locomotion State Machine
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;

    // Smoothly relax squash-and-stretch back toward (1, 1)
    enemy.scaleX += (1 - enemy.scaleX) * Math.min(1, dt * 11);
    enemy.scaleY += (1 - enemy.scaleY) * Math.min(1, dt * 11);

    if (enemy.hitFlashTimer > 0) {
      enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);
    }

    // Apply physical knockback impulse with ground friction
    if (Math.abs(enemy.knockbackVx) > 4) {
      enemy.x += enemy.knockbackVx * dt;
      enemy.knockbackVx *= Math.pow(0.0008, dt);
    } else {
      enemy.knockbackVx = 0;
    }

    const isFlier =
      enemy.role === 'flier' ||
      enemy.sprite === 'wicked_witch' ||
      enemy.sprite === 'wisp_phantom' ||
      enemy.sprite === 'shadow_stalker';

    // Vertical leap/gravity physics for non-flying enemies
    if (!isFlier) {
      if (enemy.y < GROUND_Y || enemy.vy !== 0) {
        enemy.vy += GRAVITY * dt;
        enemy.y += enemy.vy * dt;
        if (enemy.y >= GROUND_Y) {
          enemy.y = GROUND_Y;
          enemy.vy = 0;
          // Heavy landing squash & dust burst!
          enemy.scaleX = 1.25;
          enemy.scaleY = 0.78;
          spawnFootfallDust(particles, enemy.x, GROUND_Y, enemy.facing, true);
        }
      }
    }

    // Check Enraged Boss Phase below 50% HP
    if (enemy.isBoss && !enemy.enraged && enemy.hp <= enemy.maxHp * 0.5) {
      enemy.enraged = true;
      enemy.speed *= 1.3;
      spawnFloatingText(
        floatingTexts,
        enemy.x,
        enemy.y - enemy.height - 34,
        'ENRAGED PHASE!',
        '#f43f5e',
        true
      );
      spawnParticles(particles, enemy.x, enemy.y - enemy.height * 0.5, '#f43f5e', 34, 280);
      callbacks.onScreenShake(11);
    }

    // Floating enemies hover organically
    if (isFlier) {
      enemy.hoverOffset = Math.sin(performance.now() * 0.0045 + enemy.x * 0.05) * 16;
      enemy.walkCycle += dt * 6;
      enemy.strideIntensity = 0.4;
    } else {
      enemy.hoverOffset = 0;
    }

    // Stunned state from Parry
    if (enemy.state === 'stunned') {
      enemy.stunTimer -= dt;
      enemy.strideIntensity = 0;
      if (enemy.stunTimer <= 0) {
        enemy.state = 'chase';
        enemy.stateTimer = 0.35;
      }
      enemy.x = Math.max(48, Math.min(stageWidth - 48, enemy.x));
      continue;
    }

    const dx = player.x - enemy.x;
    const absDx = Math.abs(dx);
    const dirToPlayer: 1 | -1 = dx >= 0 ? 1 : -1;

    switch (enemy.state) {
      case 'patrol': {
        enemy.stateTimer -= dt;
        const moveStep = enemy.facing * enemy.speed * 0.52 * dt;
        enemy.x += moveStep;
        if (!isFlier) {
          enemy.walkCycle += dt * 7.5;
          enemy.strideIntensity = 0.65;
          const stepIndex = Math.floor(enemy.walkCycle / Math.PI);
          if (stepIndex !== enemy.lastDustStep) {
            enemy.lastDustStep = stepIndex;
            spawnFootfallDust(particles, enemy.x, enemy.y, enemy.facing, false);
          }
        }
        if (enemy.stateTimer <= 0) {
          enemy.facing = (enemy.facing * -1) as 1 | -1;
          enemy.stateTimer = 2.0;
        }
        if (absDx < 580) {
          enemy.state = 'chase';
        }
        break;
      }

      case 'chase': {
        enemy.facing = dirToPlayer;
        const engageRange =
          enemy.role === 'ranged' || enemy.role === 'flier'
            ? 360
            : enemy.isBoss
            ? 250
            : 165;

        if (absDx > engageRange) {
          enemy.x += enemy.facing * enemy.speed * dt;
          if (!isFlier) {
            enemy.walkCycle += dt * 11.5;
            enemy.strideIntensity = 1.0;
            const stepIndex = Math.floor(enemy.walkCycle / Math.PI);
            if (stepIndex !== enemy.lastDustStep) {
              enemy.lastDustStep = stepIndex;
              spawnFootfallDust(particles, enemy.x, enemy.y, enemy.facing, false);
            }
          }
        } else {
          // Enter visible windup Telegraph state with physical pullback crouch!
          enemy.state = 'telegraph';
          const baseWindup = enemy.enraged ? 0.45 : 0.60;
          enemy.stateTimer = baseWindup;
          enemy.attackTargetX = player.x;
          enemy.scaleX = 1.24;
          enemy.scaleY = 0.78;
          enemy.strideIntensity = 0.25;

          if (enemy.role === 'ranged' || enemy.role === 'flier') {
            enemy.telegraphType = 'projectile';
          } else if (enemy.isBoss && Math.random() < 0.48) {
            enemy.telegraphType = enemy.sprite === 'wicked_witch' ? 'projectile' : 'slam';
          } else if (!isFlier && Math.random() < 0.35) {
            enemy.telegraphType = 'leap';
          } else {
            enemy.telegraphType = 'charge';
          }
          soundEngine.playEnemyTelegraph();
        }
        break;
      }

      case 'telegraph': {
        enemy.stateTimer -= dt;
        // Visible wind-up pullback before lunging!
        enemy.x -= enemy.facing * 42 * dt;
        enemy.scaleX = 1.22;
        enemy.scaleY = 0.80;

        if (enemy.stateTimer <= 0) {
          enemy.state = 'attack';
          enemy.scaleX = 0.82;
          enemy.scaleY = 1.22;

          if (enemy.telegraphType === 'projectile') {
            enemy.stateTimer = 0.26;
            const projCount = enemy.enraged ? 3 : enemy.isBoss ? 2 : 1;
            for (let i = 0; i < projCount; i++) {
              const spreadY = projCount === 1 ? 0 : (i - (projCount - 1) * 0.5) * 58;
              const speed = enemy.enraged ? 410 : 335;
              projectiles.push({
                id: `ep_${Date.now()}_${i}_${Math.random()}`,
                x: enemy.x + enemy.facing * 34,
                y: enemy.y - enemy.height * 0.55 - enemy.hoverOffset,
                vx: enemy.facing * speed,
                vy: spreadY,
                radius: enemy.isBoss ? 12 : 9,
                color:
                  enemy.sprite === 'wicked_witch'
                    ? '#c084fc'
                    : enemy.sprite === 'forest_imp'
                    ? '#84cc16'
                    : '#38bdf8',
                damage: enemy.damage,
                fromPlayer: false,
                life: 2.5,
              });
            }
          } else if (enemy.telegraphType === 'slam') {
            enemy.stateTimer = 0.38;
            enemy.vx = enemy.facing * 280;
            enemy.vy = -380; // Boss leaps into a crushing ground slam!
            [-1, 1].forEach((sDir) => {
              projectiles.push({
                id: `slam_${Date.now()}_${sDir}`,
                x: enemy.x + sDir * 38,
                y: GROUND_Y - 18,
                vx: sDir * 380,
                vy: 0,
                radius: 14,
                color: '#f97316',
                damage: enemy.damage,
                fromPlayer: false,
                life: 1.4,
              });
            });
            callbacks.onScreenShake(10);
          } else if (enemy.telegraphType === 'leap') {
            // Leaping Pounce Attack!
            enemy.stateTimer = 0.42;
            enemy.vx = enemy.facing * 450;
            enemy.vy = -420;
            spawnFootfallDust(particles, enemy.x, GROUND_Y, enemy.facing, true);
          } else {
            // High-speed Ground Charge Lunge with heavy dust trail
            enemy.stateTimer = 0.38;
            const chargeSpeed = enemy.isBoss
              ? enemy.enraged
                ? 640
                : 540
              : 465;
            enemy.vx = enemy.facing * chargeSpeed;
            spawnFootfallDust(particles, enemy.x, GROUND_Y, enemy.facing, true);
          }
        }
        break;
      }

      case 'attack': {
        enemy.stateTimer -= dt;
        if (
          enemy.telegraphType === 'charge' ||
          enemy.telegraphType === 'slam' ||
          enemy.telegraphType === 'leap'
        ) {
          enemy.x += enemy.vx * dt;
          enemy.walkCycle += dt * 18;
          enemy.strideIntensity = 1.25;
          if (!isFlier && enemy.y >= GROUND_Y - 4 && Math.random() < 0.45) {
            spawnFootfallDust(particles, enemy.x, GROUND_Y, enemy.facing, true);
          }
        }

        // Check active strike collision with player
        const hitDist = (player.width + enemy.width) * 0.52;
        const vertHit = Math.abs((player.y - 45) - (enemy.y - enemy.height * 0.5)) < 78;
        if (Math.abs(player.x - enemy.x) <= hitDist && vertHit) {
          if (player.dashTimer <= 0 && player.invulnTimer <= 0) {
            damagePlayer(player, enemy.damage, particles, floatingTexts, callbacks);
          }
        }

        if (enemy.stateTimer <= 0) {
          enemy.vx = 0;
          enemy.strideIntensity = 0.2;
          enemy.state = 'cooldown';
          enemy.stateTimer = enemy.enraged ? 0.48 : 0.72;
        }
        break;
      }

      case 'cooldown': {
        enemy.stateTimer -= dt;
        enemy.strideIntensity *= 0.9;
        if (enemy.stateTimer <= 0) {
          enemy.state = 'chase';
        }
        break;
      }
    }

    enemy.x = Math.max(48, Math.min(stageWidth - 48, enemy.x));
  }

  // 3. Update Projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    if (p.life <= 0 || p.x < 0 || p.x > stageWidth) {
      projectiles.splice(i, 1);
      continue;
    }

    if (p.fromPlayer) {
      let hit = false;
      for (const enemy of enemies) {
        if (enemy.hp <= 0) continue;
        if (
          Math.abs(p.x - enemy.x) < enemy.width * 0.55 + p.radius &&
          Math.abs(p.y - (enemy.y - enemy.height * 0.5)) < enemy.height * 0.6
        ) {
          enemy.hp = Math.max(0, enemy.hp - p.damage);
          enemy.hitFlashTimer = 0.16;
          enemy.scaleX = 0.76;
          enemy.scaleY = 1.24;
          enemy.knockbackVx = (p.vx >= 0 ? 1 : -1) * (enemy.isBoss ? 70 : 180);
          spawnParticles(particles, p.x, p.y, p.color, 16, 200);
          spawnFloatingText(
            floatingTexts,
            enemy.x,
            enemy.y - enemy.height - 10,
            p.reflected ? `${p.damage} REFLECT!` : `${p.damage}`,
            p.reflected ? '#fbbf24' : '#c084fc',
            Boolean(p.reflected)
          );
          if (enemy.hp <= 0) {
            soundEngine.playEnemyDefeat();
            spawnParticles(particles, enemy.x, enemy.y - enemy.height * 0.5, '#38bdf8', 30, 260);
            if (enemy.isBoss) callbacks.onBossDefeated?.(enemy);
          } else {
            soundEngine.playHit(Boolean(p.reflected));
          }
          hit = true;
          break;
        }
      }
      if (hit) {
        projectiles.splice(i, 1);
      }
    } else {
      if (
        player.dashTimer <= 0 &&
        player.invulnTimer <= 0 &&
        Math.abs(p.x - player.x) < player.width * 0.5 + p.radius &&
        Math.abs(p.y - (player.y - 46)) < player.height * 0.5
      ) {
        damagePlayer(player, p.damage, particles, floatingTexts, callbacks);
        projectiles.splice(i, 1);
      }
    }
  }

  // 4. Update Particles & Floating Damage Numbers
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    pt.alpha = Math.max(0, pt.life / pt.maxLife);
    if (pt.life <= 0) particles.splice(i, 1);
  }

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy * dt;
    ft.life -= dt;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
}

function damagePlayer(
  player: PlayerState,
  amount: number,
  particles: Particle[],
  floatingTexts: FloatingText[],
  callbacks: CombatCallbacks
): void {
  player.hp = Math.max(0, player.hp - amount);
  player.invulnTimer = 0.85;
  player.hitFlashTimer = 0.22;
  soundEngine.playPlayerHurt();
  spawnParticles(particles, player.x, player.y - 45, '#f43f5e', 18, 220);
  spawnFloatingText(floatingTexts, player.x, player.y - 98, `-${amount} HP`, '#f43f5e', true);
  callbacks.onHitstop(0.045);
  callbacks.onScreenShake(9);
}
