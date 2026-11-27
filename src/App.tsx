/**
 * Little Ghostreach — 2D Hand-Painted Gothic Dark-Fantasy Action Side-Scroller RPG
 * Locked 16:9 Horizontal Landscape Viewport (1280x720 Virtual Coordinate Space)
 */

import React, { useEffect, useRef, useState } from 'react';
import { soundEngine } from './engine/audio';
import {
  performPlayerAttack,
  spawnFloatingText,
  spawnParticles,
  updateCombatSimulation,
} from './engine/combat';
import { renderLightingPass, renderParallaxBackdrop } from './engine/lighting';
import {
  createInitialPlayer,
  EnemyEntity,
  FloatingText,
  GROUND_Y,
  Particle,
  PlayerState,
  ProjectileEntity,
  resolveEntityCollisions,
  updatePlayerPhysics,
} from './engine/physics';
import {
  drawCutoutSprite,
  drawFloatingWeapon,
  preloadAllSprites,
} from './engine/spriteLoader';
import { INTRO_CUTSCENE_SHOTS, renderCutsceneCanvas } from './scenes/cutscene';
import { buildStage, StageDefinition } from './scenes/levels';
import { STORY_BEATS, StoryDialogueLine } from './scenes/storyArc';
import {
  ActiveDialogueState,
  GameScreenState,
  MedievalHUD,
} from './ui/medievalHUD';

const VIRTUAL_WIDTH = 1280;
const VIRTUAL_HEIGHT = 720;
const TARGET_ASPECT = VIRTUAL_WIDTH / VIRTUAL_HEIGHT; // 16:9 (1.777...)

function tryLockLandscape(): void {
  try {
    const orient = (window.screen as unknown as { orientation?: { lock?: (mode: string) => Promise<void> } })
      ?.orientation;
    orient?.lock?.('landscape')?.catch?.(() => {});
  } catch {
    // Ignore on desktop browsers that disallow orientation lock without fullscreen
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Track exact 16:9 horizontal landscape stage dimensions in CSS pixels
  const [stageDims, setStageDims] = useState<{ width: number; height: number }>(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
    if (vw / vh > TARGET_ASPECT) {
      return { width: Math.floor(vh * TARGET_ASPECT), height: vh };
    }
    return { width: vw, height: Math.floor(vw / TARGET_ASPECT) };
  });

  // React UI state synced cleanly at low frequency or on transitions
  const [screen, setScreen] = useState<GameScreenState>('SPLASH');
  const [splashOpacity, setSplashOpacity] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(false);
  const [showDebugF2, setShowDebugF2] = useState<boolean>(false);
  const [cutsceneIndex, setCutsceneIndex] = useState<number>(0);
  const [activeDialogue, setActiveDialogue] = useState<ActiveDialogueState | null>(null);
  const [bannerToast, setBannerToast] = useState<{ title: string; subtitle: string } | null>(null);
  const [hudSnapshot, setHudSnapshot] = useState<{
    player: PlayerState;
    stageTitle: string;
    stageSubtitle: string;
    stageId: string;
    questObjective: string;
    nearbyPrompt: string | null;
    activeBoss: EnemyEntity | null;
  }>(() => {
    const initialPlayer = createInitialPlayer();
    const initialStage = buildStage('sanctuary', {}, initialPlayer.crystals);
    return {
      player: initialPlayer,
      stageTitle: initialStage.title,
      stageSubtitle: initialStage.subtitle,
      stageId: initialStage.id,
      questObjective: 'Enter Wing 1-1: The Boar Raid to reclaim the Spirit Pitchfork',
      nearbyPrompt: null,
      activeBoss: null,
    };
  });

  // Mutable 60fps simulation state stored in ref so React never re-renders the canvas loop
  const simRef = useRef<{
    screen: GameScreenState;
    previousScreen: GameScreenState;
    splashTimer: number;
    player: PlayerState;
    stage: StageDefinition;
    clearedStages: Record<string, boolean>;
    seenStoryBeats: Record<string, boolean>;
    projectiles: ProjectileEntity[];
    particles: Particle[];
    floatingTexts: FloatingText[];
    cameraX: number;
    hitstopTimer: number;
    shakeIntensity: number;
    cutsceneIndex: number;
    cutsceneShotTime: number;
    dialogueQueue: {
      title: string;
      subtitle?: string;
      lines: StoryDialogueLine[];
      index: number;
      onComplete?: () => void;
    } | null;
    visitedZones: Record<string, boolean>;
    isFourthPhaseSecretBoss: boolean;
    input: {
      left: boolean;
      right: boolean;
      up: boolean;
      jumpJustPressed: boolean;
      dashJustPressed: boolean;
      attackJustPressed: boolean;
      interactJustPressed: boolean;
    };
  }>({
    screen: 'SPLASH',
    previousScreen: 'TITLE',
    splashTimer: 0,
    player: createInitialPlayer(),
    stage: buildStage('sanctuary', {}, { amber: false, emerald: false, sapphire: false }),
    clearedStages: {},
    seenStoryBeats: {},
    projectiles: [],
    particles: [],
    floatingTexts: [],
    cameraX: 0,
    hitstopTimer: 0,
    shakeIntensity: 0,
    cutsceneIndex: 0,
    cutsceneShotTime: 0,
    dialogueQueue: null,
    visitedZones: {},
    isFourthPhaseSecretBoss: false,
    input: {
      left: false,
      right: false,
      up: false,
      jumpJustPressed: false,
      dashJustPressed: false,
      attackJustPressed: false,
      interactJustPressed: false,
    },
  });

  const showToast = (title: string, subtitle: string) => {
    setBannerToast({ title, subtitle });
    window.setTimeout(() => {
      setBannerToast((prev) => (prev?.title === title ? null : prev));
    }, 3200);
  };

  const computeQuestObjective = (): string => {
    const { player, clearedStages, stage } = simRef.current;
    if (stage.id !== 'sanctuary') {
      const aliveEnemies = stage.enemies.filter((e) => e.hp > 0).length;
      const uncollectedShrines = stage.shrines.filter((s) => !s.collected).length;
      if (aliveEnemies > 0) {
        return `Purge Corrupted Guardians (${aliveEnemies} left) · Tap Attack on Red-Gold Flash to Parry`;
      }
      if (uncollectedShrines > 0) {
        return 'Approach the Glowing Pedestal Shrine and press [E] to claim its Relic';
      }
      return 'Stage Purged! Enter the Sanctuary Portal [E] to return to the Castle Hub';
    }

    if (!clearedStages['stage_1_1']) {
      return 'Wing I: Enter Door 1-1 (The Boar Raid) to claim the Spirit Pitchfork';
    }
    if (!clearedStages['stage_1_2']) {
      return 'Wing I: Enter Door 1-2 (Orchard Ambush) to claim the Wind-Stride Charm';
    }
    if (!player.crystals.amber) {
      return 'Wing I: Enter Door 1-3 (Barn Alpha Boss) to claim the Amber Crystal Seal';
    }
    if (!player.crystals.emerald) {
      return 'Wing II: Enter Whispering Grove to recover the Emerald Crystal Seal';
    }
    if (!player.crystals.sapphire) {
      return 'Wing III: Enter Obsidian Foundry to recover the Sapphire Crystal Seal';
    }
    return 'All 3 Seals Restored! Enter The Grand Final Gate on the far right to confront Seraphina';
  };

  const openStoryDialogue = (
    title: string,
    lines: StoryDialogueLine[],
    subtitle?: string,
    onComplete?: () => void
  ) => {
    const sim = simRef.current;
    sim.dialogueQueue = {
      title,
      subtitle,
      lines,
      index: 0,
      onComplete,
    };
    sim.screen = 'STORY_MODAL';
    setScreen('STORY_MODAL');
    soundEngine.playDialogueBlip(460);
    setActiveDialogue({
      title,
      subtitle,
      speaker: lines[0].speaker,
      portrait: lines[0].portrait,
      text: lines[0].text,
      stepIndex: 0,
      totalSteps: lines.length,
    });
  };

  const advanceDialogue = () => {
    const sim = simRef.current;
    const q = sim.dialogueQueue;
    if (!q) {
      sim.screen = 'PLAYING';
      setScreen('PLAYING');
      setActiveDialogue(null);
      return;
    }
    if (q.index + 1 < q.lines.length) {
      q.index += 1;
      const line = q.lines[q.index];
      soundEngine.playDialogueBlip(440 + (q.index % 3) * 40);
      setActiveDialogue({
        title: q.title,
        subtitle: q.subtitle,
        speaker: line.speaker,
        portrait: line.portrait,
        text: line.text,
        stepIndex: q.index,
        totalSteps: q.lines.length,
      });
    } else {
      const doneCb = q.onComplete;
      sim.dialogueQueue = null;
      sim.screen = 'PLAYING';
      setScreen('PLAYING');
      setActiveDialogue(null);
      doneCb?.();
    }
  };

  const loadStage = (targetStageId: string) => {
    const sim = simRef.current;
    soundEngine.playDoorEnter();
    const nextStage = buildStage(targetStageId, sim.clearedStages, sim.player.crystals);
    sim.stage = nextStage;
    sim.player.x = nextStage.spawnX;
    sim.player.y = GROUND_Y;
    sim.player.vx = 0;
    sim.player.vy = 0;
    sim.projectiles = [];
    sim.particles = [];
    sim.floatingTexts = [];
    sim.visitedZones = {};
    sim.cameraX = Math.max(0, nextStage.spawnX - VIRTUAL_WIDTH * 0.3);
    soundEngine.startAmbientDrone(nextStage.theme);
    showToast(nextStage.title, nextStage.subtitle);

    // Check Between-Wing Story Progression Beats when returning to Sanctuary!
    if (targetStageId === 'sanctuary') {
      if (sim.player.crystals.amber && !sim.seenStoryBeats['after_wing_1']) {
        sim.seenStoryBeats['after_wing_1'] = true;
        const beat = STORY_BEATS.after_wing_1;
        openStoryDialogue(beat.title, beat.lines, beat.subtitle);
      } else if (sim.player.crystals.emerald && !sim.seenStoryBeats['after_wing_2']) {
        sim.seenStoryBeats['after_wing_2'] = true;
        const beat = STORY_BEATS.after_wing_2;
        openStoryDialogue(beat.title, beat.lines, beat.subtitle);
      } else if (sim.player.crystals.sapphire && !sim.seenStoryBeats['after_wing_3']) {
        sim.seenStoryBeats['after_wing_3'] = true;
        const beat = STORY_BEATS.after_wing_3;
        openStoryDialogue(beat.title, beat.lines, beat.subtitle);
      }
    }
  };

  // Handle Multi-Phase Wicked Witch Finale Boss Transitions
  const handleBossDefeated = (boss: EnemyEntity) => {
    const sim = simRef.current;
    if (boss.id === 'boss_wicked_witch') {
      const currentPhase = boss.bossPhase ?? 1;
      if (currentPhase < 3) {
        const nextPhase = currentPhase + 1;
        boss.bossPhase = nextPhase;
        boss.maxHp = nextPhase === 2 ? 400 : 460;
        boss.hp = boss.maxHp;
        boss.enraged = nextPhase === 3;
        boss.speed = nextPhase === 2 ? 235 : 275;
        boss.name =
          nextPhase === 2
            ? 'Seraphina, Royal Arcanist Unbound (Phase II)'
            : 'Seraphina, Vessel of the Eclipse (Phase III)';
        boss.state = 'telegraph';
        boss.stateTimer = 0.8;
        boss.telegraphType = 'projectile';
        spawnParticles(sim.particles, boss.x, boss.y - 80, '#c084fc', 40, 300);
        spawnFloatingText(
          sim.floatingTexts,
          boss.x,
          boss.y - 165,
          `PHASE ${nextPhase} AWAKENS!`,
          '#e879f9',
          true
        );
        showToast(boss.name, 'Watch for Triple Arcane Volleys — Reflect with Attack!');
        return;
      }

      // Phase III defeated! Present the Dual Ending Narrative & Choice Modal
      sim.clearedStages['stage_4_1'] = true;
      const beat = STORY_BEATS.witch_defeated_choice;
      openStoryDialogue(beat.title, beat.lines, beat.subtitle, () => {
        sim.screen = 'FINALE_CHOICE';
        setScreen('FINALE_CHOICE');
      });
    } else if (boss.id === 'boss_abyssal_sovereign') {
      sim.screen = 'VICTORY_ASTRAL';
      setScreen('VICTORY_ASTRAL');
    }
  };

  const handleSkipSplash = () => {
    const sim = simRef.current;
    if (sim.screen === 'SPLASH') {
      sim.screen = 'TITLE';
      setScreen('TITLE');
    }
  };

  // Maintain strict 16:9 horizontal landscape dimensions on window resize
  useEffect(() => {
    const updateSize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (vw / vh > TARGET_ASPECT) {
        setStageDims({ width: Math.floor(vh * TARGET_ASPECT), height: vh });
      } else {
        setStageDims({ width: vw, height: Math.floor(vw / TARGET_ASPECT) });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
    };
  }, []);

  // Preload all 17 ./sprites/*.png assets & set up keyboard / mouse / touch listeners
  useEffect(() => {
    preloadAllSprites();
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setShowTouchControls(true);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      tryLockLandscape();

      if (e.code === 'F2') {
        e.preventDefault();
        setShowDebugF2((prev) => !prev);
        return;
      }

      setShowTouchControls(false);

      const sim = simRef.current;
      if (sim.screen === 'SPLASH') {
        handleSkipSplash();
        return;
      }

      if (e.code === 'Escape') {
        if (sim.screen === 'HOW_TO_PLAY') {
          sim.screen = sim.previousScreen;
          setScreen(sim.previousScreen);
        } else if (sim.screen === 'PLAYING' || sim.screen === 'TITLE') {
          sim.previousScreen = sim.screen;
          sim.screen = 'HOW_TO_PLAY';
          setScreen('HOW_TO_PLAY');
        }
        return;
      }

      if (sim.screen === 'CUTSCENE') {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
          e.preventDefault();
          handleAdvanceCutscene();
        }
        return;
      }

      if (sim.screen === 'STORY_MODAL') {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
          e.preventDefault();
          advanceDialogue();
        }
        return;
      }

      if (sim.screen === 'TITLE') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartQuest();
        }
        return;
      }

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') sim.input.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') sim.input.right = true;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (!sim.input.up) sim.input.jumpJustPressed = true;
        sim.input.up = true;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        sim.input.dashJustPressed = true;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        sim.input.attackJustPressed = true;
      }
      if (e.code === 'KeyE') {
        sim.input.interactJustPressed = true;
      }

      // Weapon Hotbar 1-5
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code)) {
        const wId = parseInt(e.code.replace('Digit', ''), 10);
        if (sim.player.unlockedWeapons.includes(wId)) {
          sim.player.activeWeapon = wId;
          soundEngine.playDialogueBlip(580);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const sim = simRef.current;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') sim.input.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') sim.input.right = false;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') sim.input.up = false;
    };

    const onBlur = () => {
      const sim = simRef.current;
      sim.input.left = false;
      sim.input.right = false;
      sim.input.up = false;
    };

    const onTouchStartGlobal = () => {
      tryLockLandscape();
      setShowTouchControls(true);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('touchstart', onTouchStartGlobal, { passive: true });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('touchstart', onTouchStartGlobal);
    };
  }, []);

  // Main 60fps HTML5 2D Canvas Simulation & Rendering Loop
  // Canvas logical coordinate space is ALWAYS 1280x720 (wider than tall!)
  useEffect(() => {
    let animId = 0;
    let lastTime = performance.now();
    let hudSyncAccum = 0;

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Always keep canvas buffer at crisp 1280x720 * dpr (landscape widescreen!)
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetBufferW = Math.floor(VIRTUAL_WIDTH * dpr);
      const targetBufferH = Math.floor(VIRTUAL_HEIGHT * dpr);
      if (canvas.width !== targetBufferW || canvas.height !== targetBufferH) {
        canvas.width = targetBufferW;
        canvas.height = targetBufferH;
      }

      const sim = simRef.current;
      const timeSec = now * 0.001;

      // =====================================================================
      // 0. SPLASH SCREEN FADE-IN (0..1.1s) -> HOLD (1.1..2.3s) -> FADE-OUT (2.3..3.4s)
      // =====================================================================
      if (sim.screen === 'SPLASH') {
        sim.splashTimer += dt;
        const t = sim.splashTimer;
        let alpha = 0;
        if (t < 1.1) {
          alpha = t / 1.1;
        } else if (t < 2.3) {
          alpha = 1;
        } else if (t < 3.4) {
          alpha = 1 - (t - 2.3) / 1.1;
        } else {
          sim.screen = 'TITLE';
          setScreen('TITLE');
          alpha = 0;
        }
        setSplashOpacity(Math.max(0, Math.min(1, alpha)));
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // =====================================================================
      // A. CUTSCENE RENDERING MODE
      // =====================================================================
      if (sim.screen === 'CUTSCENE') {
        sim.cutsceneShotTime += dt;
        renderCutsceneCanvas(ctx, sim.cutsceneIndex, sim.cutsceneShotTime, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
        ctx.restore();
        return;
      }

      // =====================================================================
      // B. TITLE / SPLASH SCREEN LIVE ATMOSPHERIC CAMERA PAN
      // =====================================================================
      if (sim.screen === 'TITLE' || sim.screen === 'SPLASH') {
        sim.cameraX = 280 + Math.sin(timeSec * 0.35) * 240;
        sim.player.x = sim.cameraX + VIRTUAL_WIDTH * 0.64;
        sim.player.y = GROUND_Y - 12 + Math.sin(timeSec * 3.2) * 10;
        sim.player.vx = -95;
        sim.player.vy = Math.cos(timeSec * 3.2) * 35;
        sim.player.facing = -1;
      }

      // =====================================================================
      // C. ACTIVE GAMEPLAY SIMULATION
      // =====================================================================
      let nearbyPrompt: string | null = null;

      if (sim.screen === 'PLAYING') {
        if (sim.hitstopTimer > 0) {
          sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
        } else {
          // 1. Update Player Movement, Float-Hover & Ghost Dash
          updatePlayerPhysics(sim.player, sim.input, dt, sim.stage.width, () => {
            soundEngine.playDash();
            spawnParticles(sim.particles, sim.player.x, sim.player.y - 45, '#38bdf8', 16, 210);
          });

          // 2. Check Player Attack & Parry / Soul-Reflect Input
          if (sim.input.attackJustPressed) {
            performPlayerAttack(
              sim.player,
              sim.stage.enemies,
              sim.projectiles,
              sim.particles,
              sim.floatingTexts,
              {
                onHitstop: (dur) => {
                  sim.hitstopTimer = Math.max(sim.hitstopTimer, dur);
                },
                onScreenShake: (mag) => {
                  sim.shakeIntensity = Math.max(sim.shakeIntensity, mag);
                },
                onBossDefeated: handleBossDefeated,
              }
            );
          }

          // 3. Update Enemy AI, Walk-Stride Footfall Dust, Boss Enrage, Projectiles & Hazards
          updateCombatSimulation(
            sim.player,
            sim.stage.enemies,
            sim.projectiles,
            sim.stage.hazards,
            sim.particles,
            sim.floatingTexts,
            dt,
            sim.stage.width,
            {
              onHitstop: (dur) => {
                sim.hitstopTimer = Math.max(sim.hitstopTimer, dur);
              },
              onScreenShake: (mag) => {
                sim.shakeIntensity = Math.max(sim.shakeIntensity, mag);
              },
              onBossDefeated: handleBossDefeated,
            }
          );

          // 4. Solid Horizontal Hitbox Separation (Player vs Enemy & Enemy vs Enemy)
          resolveEntityCollisions(sim.player, sim.stage.enemies, sim.stage.width);

          // 5. Check Player Defeat
          if (sim.player.hp <= 0) {
            sim.screen = 'GAME_OVER';
            setScreen('GAME_OVER');
          }

          // 6. Check Multi-Zone Gauntlet Banner Triggers
          for (const z of sim.stage.zones) {
            if (Math.abs(sim.player.x - z.x) < 120 && !sim.visitedZones[z.title]) {
              sim.visitedZones[z.title] = true;
              showToast(z.title, z.subtitle);
            }
          }

          // 7. Check Nearby Shrines, Doors & NPC Spirits
          for (const shrine of sim.stage.shrines) {
            if (!shrine.collected && Math.abs(sim.player.x - shrine.x) < 88) {
              nearbyPrompt = `Press [E] to Claim ${shrine.name}`;
              if (sim.input.interactJustPressed) {
                shrine.collected = true;
                sim.clearedStages[sim.stage.id] = true;
                soundEngine.playRelicPickup();
                spawnParticles(sim.particles, shrine.x, GROUND_Y - 60, shrine.color, 36, 270);

                if (shrine.weaponId && !sim.player.unlockedWeapons.includes(shrine.weaponId)) {
                  sim.player.unlockedWeapons.push(shrine.weaponId);
                  sim.player.activeWeapon = shrine.weaponId;
                  if (shrine.weaponId === 4 && !sim.player.unlockedWeapons.includes(5)) {
                    sim.player.unlockedWeapons.push(5);
                  }
                }
                if (shrine.relicId && !sim.player.relics.includes(shrine.relicId)) {
                  sim.player.relics.push(shrine.relicId);
                  if (shrine.relicId === 'golden_heart_vessel') {
                    sim.player.maxHp += 2;
                    sim.player.hp = sim.player.maxHp;
                  }
                }
                if (shrine.crystalKey) {
                  sim.player.crystals[shrine.crystalKey] = true;
                  sim.player.hp = sim.player.maxHp;
                }
                showToast(shrine.name, shrine.description);
              }
            }
          }

          if (!nearbyPrompt) {
            for (const door of sim.stage.doors) {
              if (Math.abs(sim.player.x - door.x) < door.width * 0.65) {
                nearbyPrompt = `Press [E] to Enter ${door.title} (${door.subtitle})`;
                if (sim.input.interactJustPressed) {
                  loadStage(door.targetStageId);
                }
                break;
              }
            }
          }

          if (!nearbyPrompt) {
            for (const npc of sim.stage.npcs) {
              if (Math.abs(sim.player.x - npc.x) < 88) {
                nearbyPrompt = `Press [E] to Speak with ${npc.name}`;
                if (sim.input.interactJustPressed) {
                  openStoryDialogue(
                    npc.name,
                    npc.dialogue.map((text) => ({
                      speaker: npc.name,
                      portrait: npc.sprite,
                      text,
                    })),
                    npc.role
                  );
                }
                break;
              }
            }
          }
        }

        // Reset edge-triggered inputs
        sim.input.jumpJustPressed = false;
        sim.input.dashJustPressed = false;
        sim.input.attackJustPressed = false;
        sim.input.interactJustPressed = false;

        // Smooth camera follow
        const targetCamX = Math.max(
          0,
          Math.min(sim.stage.width - VIRTUAL_WIDTH, sim.player.x - VIRTUAL_WIDTH * 0.38)
        );
        sim.cameraX += (targetCamX - sim.cameraX) * Math.min(1, dt * 8);
      }

      // Decaying Screen Shake
      let shakeX = 0;
      let shakeY = 0;
      if (sim.shakeIntensity > 0.1) {
        shakeX = (Math.random() - 0.5) * sim.shakeIntensity * 2;
        shakeY = (Math.random() - 0.5) * sim.shakeIntensity * 2;
        sim.shakeIntensity *= Math.pow(0.001, dt);
      } else {
        sim.shakeIntensity = 0;
      }

      ctx.translate(shakeX, shakeY);

      // =====================================================================
      // D. 4-LAYER GOTHIC PARALLAX BACKDROP RENDER
      // =====================================================================
      const worldLights = renderParallaxBackdrop(
        ctx,
        sim.cameraX,
        VIRTUAL_WIDTH,
        VIRTUAL_HEIGHT,
        sim.stage.width,
        sim.stage.theme,
        timeSec,
        sim.stage.doors,
        sim.stage.hazards,
        sim.stage.shrines,
        sim.player.crystals
      );

      // =====================================================================
      // E. WORLD ENTITIES (NPCS, ENEMIES, TELEGRAPHS, GHOST HERO, PROJECTILES)
      // =====================================================================
      ctx.save();
      ctx.translate(-sim.cameraX, 0);

      // 1. Render NPCs with subtle breathing & articulated animation
      for (const npc of sim.stage.npcs) {
        const bob = Math.sin(timeSec * 2.5 + npc.x) * 4;
        drawCutoutSprite(ctx, npc.sprite, {
          x: npc.x,
          y: GROUND_Y + bob,
          targetHeight: 118,
          facing: npc.facing,
          alpha: 0.9,
          tintGlow: '#38bdf8',
          walkCycle: timeSec * 3 + npc.x,
          strideIntensity: 0.12,
        });

        // Overhead NPC Nameplate
        ctx.fillStyle = 'rgba(12, 16, 28, 0.85)';
        ctx.fillRect(npc.x - 82, GROUND_Y - 144, 164, 20);
        ctx.fillStyle = '#fde68a';
        ctx.font = 'bold 10px "Cinzel", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(npc.name.split(',')[0], npc.x, GROUND_Y - 130);
      }

      // 2. Render Enemies, Procedural Walk Cycles, Windup Telegraphs & Ground Danger Indicators
      for (const enemy of sim.stage.enemies) {
        if (enemy.hp <= 0) continue;

        if (enemy.state === 'telegraph') {
          ctx.save();
          const pulse = 0.55 + 0.4 * Math.sin(timeSec * 30);
          ctx.fillStyle = `rgba(244, 63, 94, ${pulse * 0.38})`;
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2.5;

          const dangerW = enemy.telegraphType === 'slam' ? 250 : 220;
          const dangerX =
            enemy.telegraphType === 'slam'
              ? enemy.x - dangerW * 0.5
              : enemy.facing === 1
              ? enemy.x
              : enemy.x - dangerW;

          ctx.fillRect(dangerX, GROUND_Y - 8, dangerW, 10);
          ctx.strokeRect(dangerX, GROUND_Y - 8, dangerW, 10);

          ctx.beginPath();
          ctx.arc(
            enemy.x,
            enemy.y - enemy.renderHeight * 0.45 - enemy.hoverOffset,
            enemy.width * (0.55 + pulse * 0.25),
            0,
            Math.PI * 2
          );
          ctx.strokeStyle = `rgba(251, 191, 36, ${pulse})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 12px "Cinzel", Georgia, serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚡ PARRY / DASH!', enemy.x, enemy.y - enemy.renderHeight - 28);
          ctx.restore();
        }

        if (enemy.state === 'stunned') {
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 13px "Cinzel", Georgia, serif';
          ctx.textAlign = 'center';
          ctx.fillText('★ STUNNED ★', enemy.x, enemy.y - enemy.renderHeight - 24);
        }

        const enemyAttackProg =
          enemy.state === 'attack' ? Math.max(0, Math.min(1, 1 - enemy.stateTimer / 0.38)) : 0;

        drawCutoutSprite(ctx, enemy.sprite, {
          x: enemy.x,
          y: enemy.y - enemy.hoverOffset,
          targetHeight: enemy.renderHeight,
          facing: enemy.facing,
          scaleX: enemy.scaleX,
          scaleY: enemy.scaleY,
          hitFlash: enemy.hitFlashTimer > 0,
          tintGlow: enemy.enraged
            ? '#f43f5e'
            : enemy.state === 'telegraph'
            ? '#fbbf24'
            : undefined,
          walkCycle: enemy.walkCycle,
          strideIntensity: enemy.strideIntensity,
          isTelegraphing: enemy.state === 'telegraph',
          attackProgress: enemyAttackProg,
        });

        if (!enemy.isBoss) {
          const barW = 58;
          const barH = 6;
          const bx = enemy.x - barW * 0.5;
          const by = enemy.y - enemy.renderHeight - 16 - enemy.hoverOffset;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(bx, by, barW, barH);
          ctx.fillStyle = '#f43f5e';
          ctx.fillRect(bx + 1, by + 1, Math.max(0, (barW - 2) * (enemy.hp / enemy.maxHp)), barH - 2);
        }
      }

      // 3. Render Player Ghost Hero Afterimages
      for (const aft of sim.player.afterimages) {
        drawCutoutSprite(ctx, 'ghost_hero', {
          x: aft.x,
          y: aft.y,
          targetHeight: 118,
          facing: aft.facing,
          leanAngle: aft.leanAngle,
          alpha: aft.alpha * 0.55,
          hitFlash: true,
          tintGlow: '#38bdf8',
          vx: sim.player.vx,
          vy: sim.player.vy,
        });
      }

      // 4. Render Player Ghost Hero with Sine-Wave Float, Segmented Rippling Tail & Attack Lunge
      const floatBob = sim.player.isGrounded ? Math.sin(timeSec * 4.5) * 7 : 0;
      const playerDrawY = sim.player.y - 6 + floatBob;
      const attackProgress =
        sim.player.attackTimer > 0
          ? 1 - sim.player.attackTimer / Math.max(0.01, sim.player.attackDuration)
          : 0;

      drawCutoutSprite(ctx, 'ghost_hero', {
        x: sim.player.x,
        y: playerDrawY,
        targetHeight: 118,
        facing: sim.player.facing,
        leanAngle: sim.player.leanAngle,
        alpha: sim.player.invulnTimer > 0 ? 0.65 + 0.35 * Math.sin(timeSec * 30) : 0.96,
        hitFlash: sim.player.hitFlashTimer > 0 || sim.player.dashTimer > 0,
        tintGlow: sim.player.parryEmpowerTimer > 0 ? '#fbbf24' : '#38bdf8',
        walkCycle: sim.player.walkCycle,
        strideIntensity: Math.min(1, Math.abs(sim.player.vx) / 280),
        attackProgress,
        vx: sim.player.vx,
        vy: sim.player.vy,
      });

      // Floating Spectral Weapon & Glowing Slash Arc
      drawFloatingWeapon(
        ctx,
        sim.player.x,
        playerDrawY,
        sim.player.facing,
        sim.player.activeWeapon,
        attackProgress,
        sim.player.parryEmpowerTimer > 0
      );

      if (sim.player.dashCooldown > 0) {
        const cdRatio = 1 - sim.player.dashCooldown / sim.player.dashMaxCooldown;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(sim.player.x - 22, sim.player.y + 8, 44, 4);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sim.player.x - 22, sim.player.y + 8, 44 * cdRatio, 4);
      }

      // 5. Render Projectiles
      for (const proj of sim.projectiles) {
        ctx.save();
        ctx.fillStyle = proj.color;
        ctx.shadowColor = proj.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 6. Render Ash / Spirit / Footfall Dust / Parry Spark Particles
      for (const pt of sim.particles) {
        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 7. Render Floating Damage & Parry Numbers
      for (const ft of sim.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
        ctx.font = ft.isCrit
          ? 'bold 17px "Cinzel", Georgia, serif'
          : 'bold 14px "Cinzel", Georgia, serif';
        ctx.fillStyle = '#090d16';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x + 1.5, ft.y + 1.5);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      ctx.restore();

      // =====================================================================
      // F. OFFSCREEN 2D NOCTURNAL LIGHTING & ZONE PARTICLE WEATHER SYSTEM
      // =====================================================================
      renderLightingPass(
        ctx,
        sim.cameraX,
        VIRTUAL_WIDTH,
        VIRTUAL_HEIGHT,
        sim.player,
        sim.projectiles,
        worldLights,
        timeSec,
        sim.stage.theme
      );

      ctx.restore();

      // Periodically sync HUD snapshot (~15 times/sec)
      hudSyncAccum += dt;
      if (hudSyncAccum >= 0.065) {
        hudSyncAccum = 0;
        const boss = sim.stage.enemies.find((e) => e.isBoss && e.hp > 0) || null;
        setHudSnapshot({
          player: {
            ...sim.player,
            crystals: { ...sim.player.crystals },
            unlockedWeapons: [...sim.player.unlockedWeapons],
            relics: [...sim.player.relics],
          },
          stageTitle: sim.stage.title,
          stageSubtitle: sim.stage.subtitle,
          stageId: sim.stage.id,
          questObjective: computeQuestObjective(),
          nearbyPrompt,
          activeBoss: boss ? { ...boss } : null,
        });
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // UI Handlers
  const handleStartQuest = () => {
    tryLockLandscape();
    const sim = simRef.current;
    soundEngine.startAmbientDrone('sanctuary');
    soundEngine.playRelicPickup();
    sim.cutsceneIndex = 0;
    sim.cutsceneShotTime = 0;
    sim.screen = 'CUTSCENE';
    setCutsceneIndex(0);
    setScreen('CUTSCENE');
  };

  const handleAdvanceCutscene = () => {
    const sim = simRef.current;
    soundEngine.playDialogueBlip(520);
    if (sim.cutsceneIndex + 1 < INTRO_CUTSCENE_SHOTS.length) {
      sim.cutsceneIndex += 1;
      sim.cutsceneShotTime = 0;
      setCutsceneIndex(sim.cutsceneIndex);
    } else {
      handleSkipCutscene();
    }
  };

  const handleSkipCutscene = () => {
    const sim = simRef.current;
    soundEngine.playDoorEnter();
    sim.screen = 'PLAYING';
    setScreen('PLAYING');
    loadStage('sanctuary');
  };

  const handleToggleSound = () => {
    const next = soundEngine.toggleSound();
    setSoundEnabled(next);
  };

  const handleChooseReclaimBody = () => {
    const sim = simRef.current;
    soundEngine.playRelicPickup();
    sim.screen = 'VICTORY_MORTAL';
    setScreen('VICTORY_MORTAL');
  };

  const handleChooseAbsorbCurse = () => {
    // Launch Secret 4th-Phase Shadow Sovereign Boss Duel!
    const sim = simRef.current;
    soundEngine.playEnemyTelegraph();
    sim.isFourthPhaseSecretBoss = true;
    sim.player.hp = sim.player.maxHp;
    sim.stage.enemies = [
      {
        id: 'boss_abyssal_sovereign',
        name: 'Phase IV · The Abyssal Shadow Sovereign',
        sprite: 'shadow_stalker',
        role: 'boss',
        isBoss: true,
        bossPhase: 4,
        maxBossPhases: 4,
        x: Math.min(sim.stage.width - 280, sim.player.x + 420),
        y: GROUND_Y - 28,
        vx: 0,
        vy: 0,
        knockbackVx: 0,
        width: 118,
        height: 158,
        renderHeight: 205,
        facing: -1,
        hp: 480,
        maxHp: 480,
        speed: 265,
        damage: 1,
        zoneIndex: 2,
        state: 'telegraph',
        stateTimer: 0.75,
        telegraphType: 'projectile',
        attackTargetX: sim.player.x,
        hitFlashTimer: 0,
        stunTimer: 0,
        scaleX: 1,
        scaleY: 1,
        enraged: true,
        hoverOffset: 0,
        walkCycle: 0,
        strideIntensity: 0.8,
        lastDustStep: 0,
      },
    ];
    sim.screen = 'PLAYING';
    setScreen('PLAYING');
    showToast(
      'Secret Phase IV · The Abyssal Shadow Sovereign',
      'Parry & Reflect the Sovereign’s Void Orbs to Purge the Curse Forever!'
    );
  };

  const handleRestartGame = () => {
    const sim = simRef.current;
    if (sim.screen === 'GAME_OVER') {
      sim.player.hp = sim.player.maxHp;
      sim.screen = 'PLAYING';
      setScreen('PLAYING');
      loadStage('sanctuary');
    } else {
      sim.player = createInitialPlayer();
      sim.clearedStages = {};
      sim.seenStoryBeats = {};
      sim.isFourthPhaseSecretBoss = false;
      sim.screen = 'PLAYING';
      setScreen('PLAYING');
      loadStage('sanctuary');
    }
  };

  const handleTouchInput = (
    action: 'left' | 'right' | 'up' | 'attack' | 'dash' | 'interact',
    pressed: boolean
  ) => {
    tryLockLandscape();
    const sim = simRef.current;
    if (action === 'left') sim.input.left = pressed;
    if (action === 'right') sim.input.right = pressed;
    if (action === 'up') {
      if (pressed && !sim.input.up) sim.input.jumpJustPressed = true;
      sim.input.up = pressed;
    }
    if (action === 'attack' && pressed) sim.input.attackJustPressed = true;
    if (action === 'dash' && pressed) sim.input.dashJustPressed = true;
    if (action === 'interact' && pressed) sim.input.interactJustPressed = true;
  };

  return (
    <main
      className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#09080f] flex items-center justify-center"
      onMouseDown={(e) => {
        tryLockLandscape();
        if (e.button === 0 && simRef.current.screen === 'PLAYING') {
          const target = e.target as HTMLElement;
          if (target.tagName === 'CANVAS') {
            simRef.current.input.attackJustPressed = true;
          }
        }
      }}
    >
      {/* Strictly Locked 16:9 Horizontal Widescreen Landscape Stage Container (Always Wider Than Tall) */}
      <div
        className="relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.95)] border-y border-amber-900/30 bg-[#07080d]"
        style={{
          width: `${stageDims.width}px`,
          height: `${stageDims.height}px`,
        }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-full cursor-crosshair touch-none"
        />

        <MedievalHUD
          screen={screen}
          splashOpacity={splashOpacity}
          soundEnabled={soundEnabled}
          showTouchControls={showTouchControls}
          showDebugF2={showDebugF2}
          player={hudSnapshot.player}
          stageTitle={hudSnapshot.stageTitle}
          stageSubtitle={hudSnapshot.stageSubtitle}
          stageId={hudSnapshot.stageId}
          questObjective={hudSnapshot.questObjective}
          nearbyPrompt={hudSnapshot.nearbyPrompt}
          activeBoss={hudSnapshot.activeBoss}
          cutsceneIndex={cutsceneIndex}
          activeDialogue={activeDialogue}
          bannerToast={bannerToast}
          onSkipSplash={handleSkipSplash}
          onStartQuest={handleStartQuest}
          onOpenHowToPlay={() => {
            simRef.current.previousScreen = simRef.current.screen;
            simRef.current.screen = 'HOW_TO_PLAY';
            setScreen('HOW_TO_PLAY');
          }}
          onCloseHowToPlay={() => {
            const prev =
              simRef.current.previousScreen === 'HOW_TO_PLAY'
                ? 'PLAYING'
                : simRef.current.previousScreen;
            simRef.current.screen = prev;
            setScreen(prev);
          }}
          onToggleSound={handleToggleSound}
          onAdvanceCutscene={handleAdvanceCutscene}
          onSkipCutscene={handleSkipCutscene}
          onAdvanceDialogue={advanceDialogue}
          onSelectWeapon={(id) => {
            if (simRef.current.player.unlockedWeapons.includes(id)) {
              simRef.current.player.activeWeapon = id;
              soundEngine.playDialogueBlip(580);
            }
          }}
          onWarpStage={(targetStageId) => {
            simRef.current.screen = 'PLAYING';
            setScreen('PLAYING');
            loadStage(targetStageId);
          }}
          onChooseReclaimBody={handleChooseReclaimBody}
          onChooseAbsorbCurse={handleChooseAbsorbCurse}
          onRestartGame={handleRestartGame}
          onTouchInput={handleTouchInput}
        />
      </div>
    </main>
  );
}
