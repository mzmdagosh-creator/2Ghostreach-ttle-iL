/**
 * Gothic Dark-Fantasy Medieval HUD, Fading Splash Screen, Medieval Title Screen,
 * Animated Cinematic Intro Cutscene, Resilient 2D Medieval UI Assets, Modals & Inspector
 */

import React, { useEffect, useRef, useState } from 'react';
import { WEAPON_CATALOG } from '../engine/combat';
import { EnemyEntity, PlayerState } from '../engine/physics';
import { getAllSpriteStatuses, SPRITE_MANIFEST, SpriteKey } from '../engine/spriteLoader';
import { CutsceneShot, INTRO_CUTSCENE_SHOTS } from '../scenes/cutscene';

export type GameScreenState =
  | 'SPLASH'
  | 'TITLE'
  | 'CUTSCENE'
  | 'PLAYING'
  | 'HOW_TO_PLAY'
  | 'STORY_MODAL'
  | 'FINALE_CHOICE'
  | 'VICTORY_MORTAL'
  | 'VICTORY_ASTRAL'
  | 'GAME_OVER';

export interface ActiveDialogueState {
  title: string;
  subtitle?: string;
  speaker: string;
  portrait: SpriteKey;
  text: string;
  stepIndex: number;
  totalSteps: number;
}

export interface MedievalHUDProps {
  screen: GameScreenState;
  splashOpacity: number;
  soundEnabled: boolean;
  showTouchControls: boolean;
  showDebugF2: boolean;
  player: PlayerState;
  stageTitle: string;
  stageSubtitle: string;
  stageId: string;
  questObjective: string;
  nearbyPrompt: string | null;
  activeBoss: EnemyEntity | null;
  cutsceneIndex: number;
  activeDialogue: ActiveDialogueState | null;
  bannerToast: { title: string; subtitle: string } | null;
  onSkipSplash: () => void;
  onStartQuest: () => void;
  onOpenHowToPlay: () => void;
  onCloseHowToPlay: () => void;
  onToggleSound: () => void;
  onAdvanceCutscene: () => void;
  onSkipCutscene: () => void;
  onAdvanceDialogue: () => void;
  onSelectWeapon: (id: number) => void;
  onWarpStage: (stageId: string) => void;
  onChooseReclaimBody: () => void;
  onChooseAbsorbCurse: () => void;
  onRestartGame: () => void;
  onTouchInput: (action: 'left' | 'right' | 'up' | 'attack' | 'dash' | 'interact', pressed: boolean) => void;
}

const UI_ASSETS = {
  hudPlate: './ui/hud_plate.png',
  questScroll: './ui/quest_scroll.png',
  weaponSlot: './ui/weapon_slot.png',
  heartFull: './ui/heart_full.png',
  heartEmpty: './ui/heart_empty.png',
  crystalAmber: './ui/crystal_amber.png',
  crystalEmerald: './ui/crystal_emerald.png',
  crystalSapphire: './ui/crystal_sapphire.png',
  iconOrb: './ui/icon_orb.png',
  iconPitchfork: './ui/icon_pitchfork.png',
  iconScythe: './ui/icon_scythe.png',
  iconWand: './ui/icon_wand.png',
  iconSunblade: './ui/icon_sunblade.png',
  // Optional custom title art slots (drop into public/ui/ to activate automatically)
  titleBg: './ui/title_bg.png',
  titleLogo: './ui/title_logo.png',
} as const;

const WEAPON_ICON_MAP: Record<number, string> = {
  1: UI_ASSETS.iconOrb,
  2: UI_ASSETS.iconPitchfork,
  3: UI_ASSETS.iconScythe,
  4: UI_ASSETS.iconWand,
  5: UI_ASSETS.iconSunblade,
};

const EMBERS = [
  { left: '8%', delay: '0s', dur: '5.5s', size: 3 },
  { left: '19%', delay: '1.2s', dur: '6.8s', size: 4 },
  { left: '31%', delay: '2.4s', dur: '5.2s', size: 3 },
  { left: '46%', delay: '0.7s', dur: '7.1s', size: 4 },
  { left: '62%', delay: '1.9s', dur: '5.9s', size: 3 },
  { left: '77%', delay: '0.3s', dur: '6.4s', size: 4 },
  { left: '89%', delay: '2.8s', dur: '5.6s', size: 3 },
];

export const MedievalHUD: React.FC<MedievalHUDProps> = ({
  screen,
  splashOpacity,
  soundEnabled,
  showTouchControls,
  showDebugF2,
  player,
  stageTitle,
  stageId,
  questObjective,
  nearbyPrompt,
  activeBoss,
  cutsceneIndex,
  activeDialogue,
  bannerToast,
  onSkipSplash,
  onStartQuest,
  onOpenHowToPlay,
  onCloseHowToPlay,
  onToggleSound,
  onAdvanceCutscene,
  onSkipCutscene,
  onAdvanceDialogue,
  onSelectWeapon,
  onWarpStage,
  onChooseReclaimBody,
  onChooseAbsorbCurse,
  onRestartGame,
  onTouchInput,
}) => {
  const lastActionTimeRef = useRef<number>(0);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [warpMenuOpen, setWarpMenuOpen] = useState(false);
  const [typedChars, setTypedChars] = useState(0);
  const [autoProgress, setAutoProgress] = useState(0);

  const [uiLoadStatus, setUiLoadStatus] = useState<Record<string, 'loading' | 'loaded' | 'failed'>>(() => {
    const initial: Record<string, 'loading' | 'loaded' | 'failed'> = {};
    Object.values(UI_ASSETS).forEach((path) => {
      initial[path] = 'loading';
    });
    return initial;
  });

  // Preload & verify all ./ui/*.png assets
  useEffect(() => {
    Object.values(UI_ASSETS).forEach((path) => {
      const img = new Image();
      img.onload = () => setUiLoadStatus((prev) => ({ ...prev, [path]: 'loaded' }));
      img.onerror = () => setUiLoadStatus((prev) => ({ ...prev, [path]: 'failed' }));
      img.src = path;
    });
  }, []);

  const isLoaded = (path: string) => uiLoadStatus[path] === 'loaded';

  const currentCutsceneShot: CutsceneShot =
    INTRO_CUTSCENE_SHOTS[cutsceneIndex] || INTRO_CUTSCENE_SHOTS[0];

  // Animated typewriter + auto-advance timer for cinematic cutscene
  useEffect(() => {
    if (screen !== 'CUTSCENE') return;
    const fullText = currentCutsceneShot.dialogue || '';
    setTypedChars(0);
    setAutoProgress(0);

    let charCount = 0;
    const typeInterval = window.setInterval(() => {
      charCount += 2;
      if (charCount >= fullText.length) {
        setTypedChars(fullText.length);
        window.clearInterval(typeInterval);
      } else {
        setTypedChars(charCount);
      }
    }, 26);

    const holdDurationMs = Math.max(4800, fullText.length * 42 + 2200);
    const startTime = performance.now();
    const progressInterval = window.setInterval(() => {
      const pct = Math.min(100, ((performance.now() - startTime) / holdDurationMs) * 100);
      setAutoProgress(pct);
      if (pct >= 100) {
        window.clearInterval(progressInterval);
        onAdvanceCutscene();
      }
    }, 60);

    return () => {
      window.clearInterval(typeInterval);
      window.clearInterval(progressInterval);
    };
  }, [screen, cutsceneIndex, currentCutsceneShot.dialogue, onAdvanceCutscene]);

  const makeReliablePress = (handler: () => void) => {
    const invoke = (e: React.SyntheticEvent) => {
      e.stopPropagation();
      const now = performance.now();
      if (now - lastActionTimeRef.current < 220) return;
      lastActionTimeRef.current = now;
      handler();
    };
    return {
      onClick: invoke,
      onPointerUp: invoke,
      onTouchEnd: invoke,
    };
  };

  const handleCutsceneTap = () => {
    const fullLen = (currentCutsceneShot.dialogue || '').length;
    if (typedChars < fullLen) {
      setTypedChars(fullLen);
    } else {
      onAdvanceCutscene();
    }
  };

  const dashReadyRatio =
    player.dashMaxCooldown > 0
      ? Math.max(0, Math.min(1, 1 - player.dashCooldown / player.dashMaxCooldown))
      : 1;

  const activeWeaponInfo = WEAPON_CATALOG[player.activeWeapon];
  const inspectorVisible = showDebugF2 || mobileInspectorOpen;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none select-none overflow-hidden text-[#e8dcc4]">
      {/* Scoped keyframes for embers, cinematic fades & shockwave */}
      <style>{`
        @keyframes lgrEmberRise {
          0% { transform: translateY(100%) scale(0.7); opacity: 0; }
          20% { opacity: 0.85; }
          80% { opacity: 0.5; }
          100% { transform: translateY(-20vh) translateX(18px) scale(1.2); opacity: 0; }
        }
        @keyframes lgrShotFade {
          0% { opacity: 0; transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes lgrPulseGlow {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.06); }
        }
      `}</style>

      {/* ===================================================================
          0. FADING SPLASH SCREEN
      =================================================================== */}
      {screen === 'SPLASH' && (
        <div
          {...makeReliablePress(onSkipSplash)}
          className="pointer-events-auto absolute inset-0 z-50 flex flex-col items-center justify-center bg-black cursor-pointer"
        >
          <div
            className="flex flex-col items-center justify-center transition-none"
            style={{
              opacity: Math.max(0, Math.min(1, splashOpacity)),
              transform: `scale(${0.94 + splashOpacity * 0.06})`,
            }}
          >
            <img
              src="./assets/aistudio/IMG-20260812-WA0013_3d1470cb.jpg"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.includes('splash_logo.jpg')) {
                  img.src = './sprites/splash_logo.jpg';
                }
              }}
              alt="Muzammil Salah Dagosh Splash Crest"
              referrerPolicy="no-referrer"
              className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 object-contain drop-shadow-[0_0_32px_rgba(255,255,255,0.22)]"
            />
          </div>
          <div
            className="absolute bottom-4 text-[10px] font-gothic tracking-widest uppercase text-slate-400/75"
            style={{ opacity: Math.max(0.25, splashOpacity * 0.8) }}
          >
            Tap Anywhere to Continue
          </div>
        </div>
      )}

      {/* ===================================================================
          1. SPRITE & UI ASSET INSPECTOR (F2 OR MOBILE HELP BUTTON)
      =================================================================== */}
      {inspectorVisible && (
        <div className="pointer-events-auto absolute top-10 left-3 z-50 w-80 sm:w-96 max-h-[80%] overflow-y-auto bg-[#0b0e17]/95 border border-amber-600/70 rounded p-2.5 shadow-2xl text-[10px] font-mono">
          <div className="flex items-center justify-between border-b border-amber-800/50 pb-1 mb-1.5">
            <span className="font-bold text-amber-300">ASSET INSPECTOR</span>
            <button
              type="button"
              {...makeReliablePress(() => setMobileInspectorOpen(false))}
              className="px-1.5 py-0.5 bg-amber-900/70 text-amber-100 rounded text-[10px] cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="text-slate-400 mb-1">./ui/*.png</div>
          <div className="space-y-0.5 mb-3">
            {Object.entries(uiLoadStatus).map(([path, status]) => (
              <div key={path} className="flex items-center justify-between py-0.5 border-b border-slate-800/70">
                <span className="text-slate-200 truncate max-w-[200px]">{path}</span>
                <span
                  className={
                    status === 'loaded'
                      ? 'text-emerald-400 font-semibold'
                      : status === 'failed'
                      ? 'text-rose-400 font-semibold'
                      : 'text-amber-400 font-semibold'
                  }
                >
                  {status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>

          <div className="text-slate-400 mb-1">./sprites/*.png</div>
          <div className="space-y-0.5">
            {getAllSpriteStatuses().map((item) => (
              <div key={item.key} className="flex items-center justify-between py-0.5 border-b border-slate-800/70">
                <span className="text-slate-200 truncate max-w-[140px]">{item.path}</span>
                <span className="text-slate-400 tabular-nums">{item.size}</span>
                <span
                  className={
                    item.status === 'loaded'
                      ? 'text-emerald-400 font-semibold'
                      : 'text-rose-400 font-semibold'
                  }
                >
                  {item.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================
          2. MEDIEVAL GOTHIC TITLE SCREEN (SUPPORTS OPTIONAL CUSTOM ART)
      =================================================================== */}
      {screen === 'TITLE' && (
        <div className="pointer-events-auto absolute inset-0 z-40 overflow-hidden bg-[#09070a]">
          {/* Optional custom title background (drop public/ui/title_bg.png to use) */}
          {isLoaded(UI_ASSETS.titleBg) ? (
            <img
              src={UI_ASSETS.titleBg}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-55 pointer-events-none"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_35%,rgba(88,28,135,0.28),transparent_55%),radial-gradient(ellipse_at_15%_85%,rgba(180,83,9,0.22),transparent_50%),linear-gradient(135deg,#0c090e_0%,#151019_50%,#0a080c_100%)]" />
          )}

          {/* Floating Torchlight Embers */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {EMBERS.map((e, i) => (
              <span
                key={i}
                className="absolute bottom-0 rounded-full bg-amber-400/80 shadow-[0_0_8px_#f59e0b]"
                style={{
                  left: e.left,
                  width: e.size,
                  height: e.size,
                  animation: `lgrEmberRise ${e.dur} linear ${e.delay} infinite`,
                }}
              />
            ))}
          </div>

          {/* Wrought-Iron & Gold Double Frame */}
          <div className="relative h-full w-full p-2.5 sm:p-4 flex flex-col">
            <div className="relative flex-1 flex flex-col justify-between border-2 border-[#7a5828]/80 bg-gradient-to-r from-[#0e0b0a]/92 via-[#130e0c]/78 to-[#0c0a12]/55 shadow-[inset_0_0_40px_rgba(0,0,0,0.85)] px-5 py-3.5 sm:px-8 sm:py-5 overflow-y-auto">
              {/* Inner Hairline Gold Border + Corner Rivets */}
              <div className="pointer-events-none absolute inset-1.5 border border-amber-500/25" />
              <span className="pointer-events-none absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-400/80" />
              <span className="pointer-events-none absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-400/80" />
              <span className="pointer-events-none absolute bottom-2 left-2 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-400/80" />
              <span className="pointer-events-none absolute bottom-2 right-2 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-400/80" />

              {/* Top Banner Ribbon */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-[#1c140e]/90 border border-amber-700/60 text-[10px] sm:text-xs tracking-[0.2em] uppercase text-amber-300/90 font-gothic">
                  <span>✦</span>
                  <span>Chronicle of the Severed Envoy</span>
                  <span>✦</span>
                </div>
                <button
                  type="button"
                  {...makeReliablePress(onToggleSound)}
                  className="px-2.5 py-1 bg-[#1b1410]/90 hover:bg-[#2a1f18] border border-amber-700/60 text-[10px] font-gothic tracking-wider text-amber-200 cursor-pointer"
                >
                  SOUND: {soundEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Center Crest, Title & Forged Medieval Buttons */}
              <div className="relative z-10 my-auto max-w-lg py-1">
                {isLoaded(UI_ASSETS.titleLogo) ? (
                  <img
                    src={UI_ASSETS.titleLogo}
                    alt="Little Ghostreach"
                    className="max-h-20 sm:max-h-28 object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.95)]"
                  />
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="h-[1px] w-10 bg-gradient-to-r from-transparent to-amber-500" />
                      <span className="text-sky-300 text-xs drop-shadow-[0_0_8px_#38bdf8]">◆</span>
                      <span className="h-[1px] w-24 bg-gradient-to-r from-amber-500 to-transparent" />
                    </div>
                    <h1 className="font-gothic text-2xl sm:text-4xl md:text-5xl font-bold tracking-[0.12em] text-transparent bg-clip-text bg-gradient-to-b from-[#fff3d4] via-[#e2c286] to-[#9b6e32] drop-shadow-[0_4px_14px_rgba(0,0,0,0.95)]">
                      LITTLE GHOSTREACH
                    </h1>
                  </>
                )}

                <p className="mt-1.5 text-[11px] sm:text-sm text-[#d9ccb4]/90 font-medieval-body leading-snug max-w-md">
                  Wield spectral steel, master the Soul-Reflect Parry, and shatter the three Crystal Seals of Castle Ghostreach.
                </p>

                <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    {...makeReliablePress(onStartQuest)}
                    className="px-6 py-2 sm:py-2.5 bg-gradient-to-b from-[#a85a19] via-[#7c3910] to-[#4b1f08] hover:from-[#be6a22] hover:to-[#63290a] text-[#fff6e3] font-gothic font-bold text-xs sm:text-sm tracking-[0.18em] border-2 border-[#e0a954] shadow-[0_4px_16px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,235,190,0.5)] active:scale-95 cursor-pointer"
                  >
                    ⚔ PLAY QUEST
                  </button>

                  <button
                    type="button"
                    {...makeReliablePress(onOpenHowToPlay)}
                    className="px-4 py-2 sm:py-2.5 bg-gradient-to-b from-[#251d17] to-[#14100d] hover:from-[#33271f] text-amber-200 font-gothic font-semibold text-xs sm:text-sm tracking-wider border border-amber-700/80 shadow-md active:scale-95 cursor-pointer"
                  >
                    TOME OF LORE
                  </button>
                </div>

                {/* Quick Wing Wax-Seal Buttons */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-gothic">
                  <span className="uppercase tracking-wider text-amber-400/70 mr-1">Realm Wings:</span>
                  <button
                    type="button"
                    {...makeReliablePress(() => onWarpStage('stage_1_1'))}
                    className="px-2 py-0.5 bg-[#1c1610]/90 hover:bg-amber-900/50 border border-amber-700/60 text-amber-200 cursor-pointer"
                  >
                    I. Farmlands
                  </button>
                  <button
                    type="button"
                    {...makeReliablePress(() => onWarpStage('stage_2_1'))}
                    className="px-2 py-0.5 bg-[#101e19]/90 hover:bg-emerald-900/50 border border-emerald-700/60 text-emerald-200 cursor-pointer"
                  >
                    II. Grove
                  </button>
                  <button
                    type="button"
                    {...makeReliablePress(() => onWarpStage('stage_3_1'))}
                    className="px-2 py-0.5 bg-[#231312]/90 hover:bg-orange-900/50 border border-orange-700/60 text-orange-200 cursor-pointer"
                  >
                    III. Foundry
                  </button>
                </div>
              </div>

              {/* Footer Control Hint (Adapts cleanly to Mobile vs Desktop) */}
              <div className="relative z-10 text-[10px] text-[#b4a48a]/75 font-medieval-body truncate">
                {showTouchControls
                  ? 'Touch Controls Active · Float, Dash, Parry & Enter Doors'
                  : 'A/D Move · W Float · Space Attack/Parry · Shift Dash · E Interact · 1–5 Weapons'}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ===================================================================
          3. ANIMATED CINEMATIC INTRO CUTSCENE (NOT STATIC SLIDES)
      =================================================================== */}
      {screen === 'CUTSCENE' && (
        <div
          key={cutsceneIndex}
          {...makeReliablePress(handleCutsceneTap)}
          className="pointer-events-auto absolute inset-0 z-40 flex flex-col justify-between cursor-pointer overflow-hidden"
          style={{ animation: 'lgrShotFade 0.65s ease-out forwards' }}
        >
          {/* Atmospheric Vignette & Eclipse Aura Pulse */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                cutsceneIndex === 2
                  ? 'radial-gradient(circle at 50% 42%, rgba(168,85,247,0.28), rgba(0,0,0,0.72) 72%)'
                  : 'radial-gradient(circle at 50% 42%, transparent 35%, rgba(0,0,0,0.75) 100%)',
              animation: 'lgrPulseGlow 4s ease-in-out infinite',
            }}
          />

          {/* Drifting Spirit Embers */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {EMBERS.slice(0, 5).map((e, i) => (
              <span
                key={i}
                className="absolute bottom-8 rounded-full bg-sky-300/70 shadow-[0_0_8px_#38bdf8]"
                style={{
                  left: e.left,
                  width: e.size,
                  height: e.size,
                  animation: `lgrEmberRise ${e.dur} linear ${e.delay} infinite`,
                }}
              />
            ))}
          </div>

          {/* Top Letterbox Bar with Progress Line & Skip */}
          <div className="relative z-10 w-full h-[11%] min-h-[34px] bg-black/95 border-b border-amber-900/40 flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-1.5">
              {INTRO_CUTSCENE_SHOTS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === cutsceneIndex
                      ? 'w-6 bg-amber-400'
                      : i < cutsceneIndex
                      ? 'w-2.5 bg-amber-700'
                      : 'w-2 bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              {...makeReliablePress(onSkipCutscene)}
              className="text-[11px] font-gothic tracking-widest uppercase text-amber-200/80 hover:text-amber-200 cursor-pointer px-2 py-0.5 border border-amber-800/50 bg-black/60"
            >
              Skip ▸
            </button>
          </div>

          {/* Bottom Chronicle Narration Panel */}
          <div className="relative z-10 w-full bg-gradient-to-t from-black via-[#0a080d]/95 to-transparent pt-6 pb-3 px-4 sm:px-10">
            <div className="mx-auto max-w-2xl bg-[#110d14]/88 border border-amber-700/60 px-4 py-2.5 sm:px-5 sm:py-3 shadow-2xl">
              {currentCutsceneShot.speaker && (
                <div className="text-[11px] sm:text-xs font-gothic font-bold tracking-widest uppercase text-amber-300 mb-1">
                  ✦ {currentCutsceneShot.speaker}
                </div>
              )}
              <p className="text-xs sm:text-base text-[#f7eedc] font-medieval-body leading-relaxed min-h-[2.6em]">
                {(currentCutsceneShot.dialogue || '').slice(0, typedChars)}
                {typedChars < (currentCutsceneShot.dialogue || '').length && (
                  <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-amber-300 animate-pulse align-middle" />
                )}
              </p>

              {/* Auto-Advance Cinematic Bar */}
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="flex-1 h-0.5 bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-300 transition-none"
                    style={{ width: `${autoProgress}%` }}
                  />
                </div>
                <span className="text-[9px] font-gothic tracking-widest uppercase text-amber-200/65 shrink-0">
                  {typedChars < (currentCutsceneShot.dialogue || '').length ? 'Tap to Reveal' : 'Tap to Continue ▸'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          4. COMPACT MOBILE-SAFE ACTIVE GAMEPLAY HUD
      =================================================================== */}
      {(screen === 'PLAYING' || screen === 'STORY_MODAL' || screen === 'FINALE_CHOICE') && (
        <>
          {/* TOP-LEFT: Compact Health Plate & Ghost Dash */}
          <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 z-20 flex flex-col gap-1">
            {isLoaded(UI_ASSETS.hudPlate) ? (
              <div className="relative w-[155px] md:w-[215px] lg:w-[260px] aspect-[2.35/1] drop-shadow-[0_3px_8px_rgba(0,0,0,0.85)]">
                <img
                  src={UI_ASSETS.hudPlate}
                  alt="Health & Dash Frame"
                  className="w-full h-full object-contain pointer-events-none"
                />
                <div className="absolute left-[13%] right-[13%] top-[34%] h-[30%] flex items-center justify-center gap-0.5">
                  {Array.from({ length: player.maxHp }).map((_, idx) => {
                    const filled = idx < player.hp;
                    const heartSrc = filled ? UI_ASSETS.heartFull : UI_ASSETS.heartEmpty;
                    return isLoaded(heartSrc) ? (
                      <img
                        key={idx}
                        src={heartSrc}
                        alt={filled ? 'Full Heart' : 'Empty Heart'}
                        className={`w-3.5 h-3.5 md:w-5 md:h-5 object-contain ${
                          filled ? 'drop-shadow-[0_0_5px_rgba(244,63,94,0.85)]' : 'opacity-75'
                        }`}
                      />
                    ) : (
                      <span
                        key={idx}
                        className={`text-xs md:text-sm ${filled ? 'text-rose-500' : 'text-slate-600'}`}
                      >
                        ♥
                      </span>
                    );
                  })}
                </div>
                <div className="absolute left-[11%] right-[11%] bottom-[8.5%] h-[10.5%] bg-[#070b14]/90 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-200 transition-none"
                    style={{ width: `${Math.round(dashReadyRatio * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              /* Fallback Gothic Iron Health Bar if hud_plate.png fails */
              <div className="bg-[#15110e]/90 border border-amber-700/80 rounded px-2.5 py-1.5 shadow-lg w-[160px] md:w-[210px]">
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: player.maxHp }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`text-sm leading-none ${
                        idx < player.hp ? 'text-rose-500 drop-shadow-[0_0_4px_#f43f5e]' : 'text-slate-600'
                      }`}
                    >
                      ♥
                    </span>
                  ))}
                </div>
                <div className="w-full h-1.5 bg-[#070b14] rounded-full overflow-hidden border border-sky-900/60">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-cyan-300"
                    style={{ width: `${Math.round(dashReadyRatio * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Parry Empower & Active Relics */}
            {(player.parryEmpowerTimer > 0 || player.relics.length > 0) && (
              <div className="flex flex-wrap items-center gap-1 pl-1">
                {player.parryEmpowerTimer > 0 && (
                  <span className="px-1.5 py-0.5 bg-amber-950/90 border border-amber-400/80 rounded text-[9px] font-gothic font-bold text-amber-300 animate-pulse">
                    ★ 2X CRIT
                  </span>
                )}
                {player.relics.length > 0 && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-[#0c101b]/85 border border-amber-800/50 rounded text-[9px] font-gothic text-emerald-300">
                    {player.relics.includes('wind_stride_charm') && <span>Wind-Stride</span>}
                    {player.relics.includes('wind_stride_charm') &&
                      player.relics.includes('golden_heart_vessel') && <span>·</span>}
                    {player.relics.includes('golden_heart_vessel') && <span>Golden Heart</span>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TOP-RIGHT: Compact Quest Banner (With Parchment Fallback) + Seals & Tools */}
          <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 z-20 flex flex-col items-end gap-1">
            {isLoaded(UI_ASSETS.questScroll) ? (
              <div className="relative w-[170px] md:w-[235px] lg:w-[275px] aspect-[2.25/1] drop-shadow-[0_3px_10px_rgba(0,0,0,0.85)]">
                <img
                  src={UI_ASSETS.questScroll}
                  alt="Quest Scroll"
                  className="w-full h-full object-contain pointer-events-none"
                />
                <div className="absolute inset-0 pl-[23%] pr-[12%] py-[12%] flex flex-col justify-center overflow-hidden">
                  <div className="text-[9px] md:text-[11px] font-gothic font-bold text-[#3b1c14] leading-tight truncate">
                    {stageTitle}
                  </div>
                  <div className="mt-0.5 text-[8px] md:text-[10px] font-medieval-body font-semibold text-[#2a1d12] leading-tight line-clamp-2">
                    {questObjective}
                  </div>
                </div>
              </div>
            ) : (
              /* Fallback Parchment Scroll if quest_scroll.png is missing/failed */
              <div className="w-[175px] md:w-[235px] bg-gradient-to-b from-[#d8c196] to-[#bfa272] border-2 border-[#6e4926] rounded-sm px-2.5 py-1.5 shadow-[0_3px_10px_rgba(0,0,0,0.85)]">
                <div className="text-[9px] md:text-[11px] font-gothic font-bold text-[#3b1c14] leading-tight truncate">
                  {stageTitle}
                </div>
                <div className="mt-0.5 text-[8px] md:text-[10px] font-medieval-body font-semibold text-[#2a1d12] leading-tight line-clamp-2">
                  {questObjective}
                </div>
              </div>
            )}

            {/* Compact Crystal Seals + Map/Help/SFX Strip */}
            <div className="pointer-events-auto flex items-center gap-1.5 px-2 py-0.5 bg-[#120f0d]/90 border border-amber-800/60 rounded shadow-lg">
              <div className="flex items-center gap-1 pr-1.5 border-r border-amber-800/50">
                {[
                  { key: 'amber', src: UI_ASSETS.crystalAmber, active: player.crystals.amber, color: 'text-amber-400' },
                  { key: 'emerald', src: UI_ASSETS.crystalEmerald, active: player.crystals.emerald, color: 'text-emerald-400' },
                  { key: 'sapphire', src: UI_ASSETS.crystalSapphire, active: player.crystals.sapphire, color: 'text-sky-400' },
                ].map((c) =>
                  isLoaded(c.src) ? (
                    <img
                      key={c.key}
                      src={c.src}
                      alt={c.key}
                      className={`w-4 h-4 md:w-5 md:h-5 object-contain ${
                        c.active ? 'opacity-100 scale-105' : 'opacity-30 grayscale'
                      }`}
                    />
                  ) : (
                    <span key={c.key} className={`text-xs ${c.active ? c.color : 'text-slate-600'}`}>
                      ◆
                    </span>
                  )
                )}
              </div>

              <button
                type="button"
                {...makeReliablePress(() => setWarpMenuOpen((v) => !v))}
                className="px-1.5 py-0.5 bg-[#1c1510] hover:bg-amber-900/50 text-amber-200 text-[9px] md:text-[10px] font-gothic border border-amber-700/60 rounded cursor-pointer"
              >
                Map ▾
              </button>
              <button
                type="button"
                {...makeReliablePress(onOpenHowToPlay)}
                className="px-1.5 py-0.5 bg-[#0d111c] hover:bg-slate-800 text-amber-200 text-[9px] md:text-[10px] font-gothic border border-amber-700/50 rounded cursor-pointer"
              >
                Help
              </button>
              <button
                type="button"
                {...makeReliablePress(onToggleSound)}
                className="px-1.5 py-0.5 bg-[#0d111c] hover:bg-slate-800 text-slate-300 text-[9px] md:text-[10px] font-gothic border border-slate-700 rounded cursor-pointer"
              >
                {soundEnabled ? 'SFX' : 'MUTE'}
              </button>
            </div>

            {warpMenuOpen && (
              <div className="pointer-events-auto bg-[#120f0d]/95 border border-amber-700/70 rounded p-1.5 shadow-2xl">
                <select
                  aria-label="Realm Stage Travel"
                  value={stageId}
                  onChange={(e) => {
                    onWarpStage(e.target.value);
                    setWarpMenuOpen(false);
                  }}
                  className="bg-[#0d111c] text-amber-200 text-[10px] font-gothic border border-amber-700/60 rounded px-1.5 py-1 cursor-pointer"
                >
                  <option value="sanctuary">Castle Sanctuary Hub</option>
                  <option value="stage_1_1">Wing 1-1: The Boar Raid</option>
                  <option value="stage_1_2">Wing 1-2: Orchard Ambush</option>
                  <option value="stage_1_3">Wing 1-3: Barn Alpha Boss</option>
                  <option value="stage_2_1">Wing II: Whispering Grove</option>
                  <option value="stage_3_1">Wing III: Obsidian Foundry</option>
                  <option value="stage_4_1">Grand Gate: Wicked Witch</option>
                </select>
              </div>
            )}
          </div>

          {/* TOP-CENTER: ACTIVE BOSS BAR */}
          {activeBoss && activeBoss.hp > 0 && (
            <div className="absolute top-12 md:top-16 left-1/2 -translate-x-1/2 z-20 w-[220px] sm:w-full sm:max-w-sm px-2">
              <div className="bg-[#110c16]/90 border border-amber-600/75 rounded px-2.5 py-1.5 shadow-2xl">
                <div className="flex items-center justify-between text-[10px] font-gothic mb-1">
                  <span className="font-bold text-amber-300 tracking-wider truncate">
                    {activeBoss.name}
                    {activeBoss.enraged ? ' · ENRAGED' : ''}
                  </span>
                  <span className="font-mono tabular-nums text-rose-300 shrink-0 ml-2">
                    {activeBoss.hp}/{activeBoss.maxHp}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-sm overflow-hidden border border-amber-700/50">
                  <div
                    className={`h-full transition-all duration-150 ${
                      activeBoss.enraged
                        ? 'bg-gradient-to-r from-rose-600 to-amber-500'
                        : 'bg-gradient-to-r from-red-800 to-rose-500'
                    }`}
                    style={{
                      width: `${Math.max(0, Math.min(100, (activeBoss.hp / activeBoss.maxHp) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ZONE / RELIC TOAST BANNER */}
          {bannerToast && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 bg-[#12101b]/90 border-y border-amber-500/70 text-center shadow-xl">
              <div className="font-gothic text-[11px] sm:text-xs font-bold tracking-widest text-amber-300 uppercase">
                {bannerToast.title}
              </div>
              <div className="text-[10px] text-slate-300 font-medieval-body">{bannerToast.subtitle}</div>
            </div>
          )}

          {/* INTERACTION PROMPT */}
          {nearbyPrompt && screen === 'PLAYING' && (
            <div className="absolute bottom-16 md:bottom-20 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-[#1a1510]/95 border border-amber-500/80 rounded shadow-lg text-[10px] sm:text-xs font-gothic text-amber-200 tracking-wider whitespace-nowrap">
              {nearbyPrompt}
            </div>
          )}

          {/* BOTTOM-CENTER: COMPACT WEAPON HOTBAR (1-5) */}
          <div className="pointer-events-auto absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-0.5">
            {activeWeaponInfo && (
              <div
                className="text-[9px] md:text-[10px] font-gothic tracking-widest uppercase text-amber-200/90"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.95)' }}
              >
                {activeWeaponInfo.name}
              </div>
            )}
            <div className="flex items-center gap-1 md:gap-1.5">
              {[1, 2, 3, 4, 5].map((id) => {
                const w = WEAPON_CATALOG[id];
                const unlocked = player.unlockedWeapons.includes(id);
                const active = player.activeWeapon === id;
                const iconSrc = WEAPON_ICON_MAP[id];
                return (
                  <button
                    type="button"
                    key={id}
                    {...makeReliablePress(() => unlocked && onSelectWeapon(id))}
                    disabled={!unlocked}
                    title={unlocked ? `${w.name}: ${w.description}` : 'Locked Relic Weapon'}
                    className={`relative w-9 h-9 md:w-12 md:h-12 flex items-center justify-center transition-transform ${
                      active
                        ? 'scale-110 drop-shadow-[0_0_10px_rgba(251,191,36,0.95)] z-10'
                        : unlocked
                        ? 'opacity-90 hover:opacity-100 cursor-pointer'
                        : 'opacity-40 grayscale cursor-not-allowed'
                    }`}
                  >
                    {isLoaded(UI_ASSETS.weaponSlot) ? (
                      <img
                        src={UI_ASSETS.weaponSlot}
                        alt=""
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                      />
                    ) : (
                      <span className="absolute inset-0 bg-[#1a1512]/90 border border-amber-700/70 rounded" />
                    )}
                    {isLoaded(iconSrc) && (
                      <img
                        src={iconSrc}
                        alt={w.name}
                        className="relative z-10 w-5 h-5 md:w-7 md:h-7 object-contain pointer-events-none"
                      />
                    )}
                    <span className="absolute bottom-0.5 right-1 z-20 text-[8px] font-mono font-bold text-amber-300">
                      {id}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MOBILE TOUCH CONTROLS (Compact Edge-Docked) */}
          {showTouchControls && screen === 'PLAYING' && (
            <>
              <div className="pointer-events-auto absolute bottom-2 left-2 z-30 flex items-center gap-2">
                <button
                  type="button"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onTouchInput('left', true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onTouchInput('left', false);
                  }}
                  className="w-11 h-11 rounded-full bg-[#1a1612]/75 border-2 border-amber-600/75 text-amber-200 font-bold text-sm flex items-center justify-center active:scale-90"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onTouchInput('right', true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onTouchInput('right', false);
                  }}
                  className="w-11 h-11 rounded-full bg-[#1a1612]/75 border-2 border-amber-600/75 text-amber-200 font-bold text-sm flex items-center justify-center active:scale-90"
                >
                  ▶
                </button>
              </div>

              <div className="pointer-events-auto absolute bottom-2 right-2 z-30 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onTouchInput('up', true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onTouchInput('up', false);
                  }}
                  className="w-11 h-11 rounded-full bg-[#141d2e]/80 border-2 border-sky-400/75 text-sky-200 font-gothic text-[9px] font-bold flex items-center justify-center active:scale-90"
                >
                  FLOAT
                </button>
                <button
                  type="button"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onTouchInput('dash', true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onTouchInput('dash', false);
                  }}
                  className="w-11 h-11 rounded-full bg-[#142924]/80 border-2 border-emerald-400/75 text-emerald-200 font-gothic text-[9px] font-bold flex items-center justify-center active:scale-90"
                >
                  DASH
                </button>
                <button
                  type="button"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onTouchInput('attack', true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onTouchInput('attack', false);
                  }}
                  className="w-11 h-11 rounded-full bg-[#2b161b]/80 border-2 border-amber-400 text-amber-200 font-gothic text-[9px] font-bold flex items-center justify-center active:scale-90"
                >
                  PARRY
                </button>
                <button
                  type="button"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onTouchInput('interact', true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onTouchInput('interact', false);
                  }}
                  className="w-11 h-11 rounded-full bg-[#241b12]/80 border-2 border-amber-600/75 text-amber-100 font-gothic text-[9px] font-bold flex items-center justify-center active:scale-90"
                >
                  DOOR
                </button>
              </div>
            </>
          )}
        </>
      )}
 
      {/* ===================================================================
          5. NPC & STORY DIALOGUE MODAL
      =================================================================== */}
      {screen === 'STORY_MODAL' && activeDialogue && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex items-end justify-center p-3 sm:p-6 bg-black/55">
          <div
            {...makeReliablePress(onAdvanceDialogue)}
            className="w-full max-w-2xl bg-gradient-to-b from-[#282019] to-[#17120e] border-2 border-amber-500/80 rounded-lg p-3.5 sm:p-5 shadow-2xl cursor-pointer"
          >
            <div className="flex items-center justify-between border-b border-amber-700/40 pb-1.5 mb-2.5">
              <div>
                <div className="font-gothic text-xs sm:text-sm font-bold text-amber-300 tracking-wider uppercase">
                  {activeDialogue.title}
                </div>
                {activeDialogue.subtitle && (
                  <div className="text-[10px] text-amber-200/70">{activeDialogue.subtitle}</div>
                )}
              </div>
              <span className="text-[11px] font-mono text-amber-300/80">
                {activeDialogue.stepIndex + 1} / {activeDialogue.totalSteps}
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-[#0d111a] border-2 border-amber-500/80 overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src={SPRITE_MANIFEST[activeDialogue.portrait]}
                  alt={activeDialogue.speaker}
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-gothic text-xs font-bold uppercase tracking-wider text-sky-300 mb-0.5">
                  {activeDialogue.speaker}
                </div>
                <p className="text-xs sm:text-base text-[#f7eedc] font-medieval-body leading-relaxed">
                  {activeDialogue.text}
                </p>
              </div>
            </div>

            <div className="mt-2.5 text-right text-[10px] font-gothic text-amber-300/80">
              Tap / Press Space to Continue →
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          6. DUAL ENDING CHOICE MODAL
      =================================================================== */}
      {screen === 'FINALE_CHOICE' && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center p-3 bg-black/75">
          <div className="w-full max-w-xl bg-gradient-to-b from-[#261d17] to-[#140f0c] border-2 border-amber-500 rounded-lg p-4 sm:p-6 shadow-2xl text-center max-h-[92%] overflow-y-auto">
            <div className="font-gothic text-[10px] uppercase tracking-widest text-amber-400">
              The Grand Sanctum Threshold · Final Decision
            </div>
            <h2 className="mt-1 font-gothic text-lg sm:text-2xl font-bold text-[#f7eedc]">
              The Mortal Vessel &amp; The Abyssal Remnant
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300 font-medieval-body leading-relaxed">
              Seraphina lies defeated, and the tri-crystal cage surrounding your physical body shatters. Choose your destiny:
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                {...makeReliablePress(onChooseReclaimBody)}
                className="p-3.5 bg-[#1b2234] hover:bg-[#232d45] border-2 border-amber-400/80 rounded-lg text-left active:scale-95 cursor-pointer"
              >
                <div className="font-gothic text-xs sm:text-sm font-bold text-amber-300">
                  I. RECLAIM YOUR BODY
                </div>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  Reunite spirit and flesh immediately. Return Castle Ghostreach to mortal daylight.
                </p>
              </button>
              <button
                type="button"
                {...makeReliablePress(onChooseAbsorbCurse)}
                className="p-3.5 bg-[#261538] hover:bg-[#331c4a] border-2 border-purple-400/80 rounded-lg text-left active:scale-95 cursor-pointer"
              >
                <div className="font-gothic text-xs sm:text-sm font-bold text-purple-300">
                  II. ABSORB THE CURSE (4TH PHASE)
                </div>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  Draw out the Secret 4th-Phase Abyssal Shadow Sovereign to purge the curse forever!
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          8. VICTORY & GAME OVER MODALS
      =================================================================== */}
      {(screen === 'VICTORY_MORTAL' || screen === 'VICTORY_ASTRAL' || screen === 'GAME_OVER') && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center p-3 bg-black/80">
          <div className="w-full max-w-lg bg-gradient-to-b from-[#251d17] to-[#130e0b] border-2 border-amber-500 rounded-lg p-5 text-center shadow-2xl max-h-[92%] overflow-y-auto">
            <div className="font-gothic text-[10px] uppercase tracking-widest text-amber-400">
              {screen === 'GAME_OVER'
                ? 'Your Spectral Essence Dispersed'
                : screen === 'VICTORY_ASTRAL'
                ? 'True Ending · The Eternal Astral Sovereign'
                : 'Ending I · Dawn of Mortal Restoration'}
            </div>
            <h2 className="mt-1 font-gothic text-xl sm:text-3xl font-bold text-[#f7eedc]">
              {screen === 'GAME_OVER'
                ? 'FADED INTO THE ASTRAL MIST'
                : screen === 'VICTORY_ASTRAL'
                ? 'THE CURSE PURGED FOREVER'
                : 'SOUL AND VESSEL REUNITED'}
            </h2>
            <div className="my-3 flex justify-center">
              <img
                src={SPRITE_MANIFEST[screen === 'VICTORY_MORTAL' ? 'human_hero' : 'ghost_hero']}
                alt="Hero"
                className="w-16 h-16 sm:w-24 sm:h-24 object-contain drop-shadow-[0_0_18px_rgba(56,189,248,0.5)]"
              />
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-medieval-body leading-relaxed">
              {screen === 'GAME_OVER'
                ? 'Though your phantom form wavered, the candles of the Castle Sanctuary still burn. Rise once more and time your Soul-Reflect Parry.'
                : screen === 'VICTORY_ASTRAL'
                ? 'By absorbing the curse and vanquishing the 4th-Phase Abyssal Shadow Sovereign, you freed Seraphina and all of Castle Ghostreach.'
                : 'Stepping through the shattered Grand Gate, your spirit fused back into your mortal body as warm sunlight broke over Castle Ghostreach.'}
            </p>
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                {...makeReliablePress(onRestartGame)}
                className="px-6 py-2 bg-gradient-to-b from-amber-700 to-amber-900 hover:from-amber-600 text-white font-gothic text-xs font-bold tracking-widest rounded border border-amber-400 cursor-pointer"
              >
                {screen === 'GAME_OVER' ? 'AWAKEN IN SANCTUARY' : 'PLAY AGAIN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};