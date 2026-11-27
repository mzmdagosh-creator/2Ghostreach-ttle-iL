/**
 * Gothic Dark-Fantasy Medieval HUD, Fading Splash Screen, Asymmetrical Title Screen,
 * Cinematic Subtitles Intro, Imported 2D Medieval UI Assets, Modals & F2 Debug Overlay
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
} as const;

const WEAPON_ICON_MAP: Record<number, string> = {
  1: UI_ASSETS.iconOrb,
  2: UI_ASSETS.iconPitchfork,
  3: UI_ASSETS.iconScythe,
  4: UI_ASSETS.iconWand,
  5: UI_ASSETS.iconSunblade,
};

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
  const [uiLoadStatus, setUiLoadStatus] = useState<Record<string, 'loading' | 'loaded' | 'failed'>>(() => {
    const initial: Record<string, 'loading' | 'loaded' | 'failed'> = {};
    Object.values(UI_ASSETS).forEach((path) => {
      initial[path] = 'loading';
    });
    return initial;
  });

  // Preload & verify all 13 ./ui/*.png assets for instant HUD rendering and F2 inspection
  useEffect(() => {
    Object.values(UI_ASSETS).forEach((path) => {
      const img = new Image();
      img.onload = () => {
        setUiLoadStatus((prev) => ({ ...prev, [path]: 'loaded' }));
      };
      img.onerror = () => {
        console.error(`[MedievalHUD] Failed to load UI asset: ${path}`);
        setUiLoadStatus((prev) => ({ ...prev, [path]: 'failed' }));
      };
      img.src = path;
    });
  }, []);

  /**
   * Ensures buttons respond reliably across Desktop Mouse, Trackpad, Mobile Touch, and WebView
   * without double-firing when both pointerup/touchend and click trigger.
   */
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

  const dashReadyRatio =
    player.dashMaxCooldown > 0
      ? Math.max(0, Math.min(1, 1 - player.dashCooldown / player.dashMaxCooldown))
      : 1;

  const currentCutsceneShot: CutsceneShot =
    INTRO_CUTSCENE_SHOTS[cutsceneIndex] || INTRO_CUTSCENE_SHOTS[0];

  const activeWeaponInfo = WEAPON_CATALOG[player.activeWeapon];

  return (
    <div className="absolute inset-0 z-30 pointer-events-none select-none overflow-hidden text-[#e8dcc4]">
      {/* ===================================================================
          0. FADING IN AND OUT BEGINNING SPLASH SCREEN
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
              className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 object-contain drop-shadow-[0_0_32px_rgba(255,255,255,0.22)]"
            />
          </div>
          <div
            className="absolute bottom-5 text-[11px] font-gothic tracking-widest uppercase text-slate-400/75"
            style={{ opacity: Math.max(0.25, splashOpacity * 0.8) }}
          >
            Click or Tap Anywhere to Continue
          </div>
        </div>
      )}

      {/* ===================================================================
          1. F2 SPRITE & UI ASSET LOADER DEBUG OVERLAY
      =================================================================== */}
      {showDebugF2 && (
        <div className="pointer-events-auto absolute top-14 left-3 z-50 w-96 max-h-[78%] overflow-y-auto bg-[#0b0e17]/95 border border-amber-700/60 rounded p-2.5 shadow-2xl text-[11px] font-mono">
          <div className="flex items-center justify-between border-b border-amber-800/50 pb-1 mb-1.5">
            <span className="font-bold text-amber-300">HUD UI ASSETS (F2)</span>
            <span className="text-slate-400">./ui/*.png</span>
          </div>
          <div className="space-y-0.5 mb-3">
            {Object.entries(uiLoadStatus).map(([path, status]) => (
              <div key={path} className="flex items-center justify-between py-0.5 border-b border-slate-800/70">
                <span className="text-slate-200 truncate max-w-[230px]">{path}</span>
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

          <div className="flex items-center justify-between border-b border-amber-800/50 pb-1 mb-1.5">
            <span className="font-bold text-amber-300">SPRITE LOADER MANIFEST</span>
            <span className="text-slate-400">./sprites/*.png</span>
          </div>
          <div className="space-y-0.5">
            {getAllSpriteStatuses().map((item) => (
              <div key={item.key} className="flex items-center justify-between py-0.5 border-b border-slate-800/70">
                <span className="text-slate-200 truncate max-w-[165px]">{item.path}</span>
                <span className="text-slate-400 tabular-nums">{item.size}</span>
                <span
                  className={
                    item.status === 'loaded'
                      ? 'text-emerald-400 font-semibold'
                      : 'text-amber-400 font-semibold'
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
          2. ASYMMETRICAL GOTHIC TITLE SCREEN (INSIDE 16:9 LANDSCAPE FRAME)
      =================================================================== */}
      {screen === 'TITLE' && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col justify-between p-5 sm:p-10 bg-gradient-to-r from-[#060811]/92 via-[#060811]/65 to-transparent overflow-y-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="text-[11px] sm:text-xs tracking-widest uppercase text-amber-300/85 font-gothic">
              Chronicle of the Severed Envoy · Three Anchor Relics
            </div>
            <div className="text-[11px] text-slate-400">Press F2 for Sprite &amp; UI Inspector</div>
          </div>

          <div className="max-w-lg my-auto py-2">
            <svg className="w-48 h-7 mb-2 text-amber-400/85" viewBox="0 0 260 40" fill="none">
              <path d="M4 20H95L110 8L130 32L150 8L165 20H256" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="130" cy="20" r="5" fill="#38bdf8" />
            </svg>

            <h1 className="font-gothic text-3xl sm:text-5xl font-bold tracking-wider text-[#f5ebd6] drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)]">
              LITTLE GHOSTREACH
            </h1>
            <p className="mt-2 text-xs sm:text-base text-slate-300/90 font-medieval-body leading-relaxed">
              Bound outside your mortal vessel by the Royal Arcanist’s curse, wield spectral steel, master the Soul-Reflect Parry, and break the three Crystal Seals of Castle Ghostreach.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                {...makeReliablePress(onStartQuest)}
                className="pointer-events-auto px-6 py-2.5 sm:py-3 bg-gradient-to-b from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-[#fff8eb] font-gothic font-bold text-xs sm:text-sm tracking-widest border border-amber-400/80 rounded shadow-lg transition-transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              >
                PLAY QUEST
              </button>

              <button
                type="button"
                {...makeReliablePress(onOpenHowToPlay)}
                className="pointer-events-auto px-4 py-2.5 sm:py-3 bg-[#121726]/95 hover:bg-[#1c243a] text-amber-200 font-gothic font-semibold text-xs sm:text-sm tracking-wider border border-amber-700/70 rounded transition-colors active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              >
                HOW TO PLAY
              </button>

              <button
                type="button"
                {...makeReliablePress(onToggleSound)}
                className="pointer-events-auto px-4 py-2.5 sm:py-3 bg-[#121726]/95 hover:bg-[#1c243a] text-slate-200 font-gothic font-semibold text-xs sm:text-sm tracking-wider border border-slate-600/70 rounded transition-colors active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              >
                SOUND: {soundEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-gothic text-amber-200/80">
              <span className="uppercase tracking-wider text-slate-400">Quick Enter Wing:</span>
              <button
                type="button"
                {...makeReliablePress(() => onWarpStage('stage_1_1'))}
                className="pointer-events-auto px-2.5 py-1 bg-[#161b29]/90 hover:bg-amber-900/50 border border-amber-700/50 rounded text-amber-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                Farmlands (Rain)
              </button>
              <button
                type="button"
                {...makeReliablePress(() => onWarpStage('stage_2_1'))}
                className="pointer-events-auto px-2.5 py-1 bg-[#122220]/90 hover:bg-emerald-900/50 border border-emerald-700/50 rounded text-emerald-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                Grove (Mist)
              </button>
              <button
                type="button"
                {...makeReliablePress(() => onWarpStage('stage_3_1'))}
                className="pointer-events-auto px-2.5 py-1 bg-[#261616]/90 hover:bg-orange-900/50 border border-orange-700/50 rounded text-orange-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                Foundry (Embers)
              </button>
            </div>
          </div>

          <div className="text-[11px] sm:text-xs text-slate-300/80 tracking-wide font-medieval-body truncate">
            A/D or Arrows Move · W/Up Float-Jump &amp; Hover · Space/Click Attack &amp; Parry · Shift Ghost Dash · E Enter Door · 1–5 Weapons
          </div>
        </div>
      )}

      {/* ===================================================================
          3. 5-SHOT INTRO CUTSCENE — CINEMATIC LETTERBOX SUBTITLES ONLY
      =================================================================== */}
      {screen === 'CUTSCENE' && (
        <div
          {...makeReliablePress(onAdvanceCutscene)}
          className="pointer-events-auto absolute inset-0 z-40 flex flex-col justify-between cursor-pointer"
        >
          {/* Top Cinematic Letterbox Bar */}
          <div className="w-full h-[10%] min-h-[38px] bg-black/95 flex items-center justify-end px-4 sm:px-6">
            <button
              type="button"
              {...makeReliablePress(onSkipCutscene)}
              className="text-xs font-gothic tracking-widest uppercase text-amber-200/75 hover:text-amber-200 transition-colors cursor-pointer px-2 py-1"
            >
              Skip ▸
            </button>
          </div>

          {/* Bottom Cinematic Letterbox Bar + Clean Centered Subtitles */}
          <div className="w-full pt-10 pb-4 sm:pb-6 px-6 sm:px-14 bg-gradient-to-t from-black via-black/90 to-transparent text-center">
            <p
              className="mx-auto max-w-3xl text-sm sm:text-lg md:text-xl text-[#f7eedc] font-medieval-body leading-relaxed"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.98), 0 0 2px rgba(0,0,0,1)' }}
            >
              {currentCutsceneShot.speaker && (
                <span className="italic text-amber-300 mr-2 font-semibold">
                  {currentCutsceneShot.speaker}:
                </span>
              )}
              {currentCutsceneShot.dialogue}
            </p>
            <div className="mt-1.5 text-[10px] font-gothic tracking-widest uppercase text-slate-400/70">
              {cutsceneIndex + 1} / {INTRO_CUTSCENE_SHOTS.length} · Tap or Press Space
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          4. ACTIVE GAMEPLAY HUD (IMPORTED 2D MEDIEVAL PNG ASSETS)
      =================================================================== */}
      {(screen === 'PLAYING' || screen === 'STORY_MODAL' || screen === 'FINALE_CHOICE') && (
        <>
          {/* TOP-LEFT: Wrought-Iron Crest Plate, Ruby Hearts & Ghost Dash Groove */}
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-20 flex flex-col gap-1">
            <div className="relative w-[245px] sm:w-[300px] aspect-[2.35/1] drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)]">
              <img
                src={UI_ASSETS.hudPlate}
                alt="Health & Dash Frame"
                className="w-full h-full object-contain pointer-events-none"
              />

              {/* Ruby Hearts Row inside upper crest plate */}
              <div className="absolute left-[13%] right-[13%] top-[34%] h-[30%] flex items-center justify-center gap-1">
                {Array.from({ length: player.maxHp }).map((_, idx) => {
                  const filled = idx < player.hp;
                  return (
                    <img
                      key={idx}
                      src={filled ? UI_ASSETS.heartFull : UI_ASSETS.heartEmpty}
                      alt={filled ? 'Full Heart' : 'Empty Heart'}
                      className={`w-5 h-5 sm:w-6 sm:h-6 object-contain transition-transform ${
                        filled
                          ? 'scale-100 drop-shadow-[0_0_6px_rgba(244,63,94,0.85)]'
                          : 'scale-90 opacity-85'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Animated Cyan Ghost Dash Bar inside lower plate groove */}
              <div className="absolute left-[11%] right-[11%] bottom-[8.5%] h-[10.5%] bg-[#070b14]/90 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-200 transition-none shadow-[0_0_8px_#38bdf8]"
                  style={{ width: `${Math.round(dashReadyRatio * 100)}%` }}
                />
              </div>
            </div>

            {/* Parry Empower & Active Relics Row */}
            <div className="flex flex-wrap items-center gap-1.5 pl-2">
              {player.parryEmpowerTimer > 0 && (
                <span className="px-2 py-0.5 bg-amber-950/90 border border-amber-400/80 rounded text-[10px] font-gothic font-bold text-amber-300 animate-pulse shadow">
                  ★ 2X CRIT READY
                </span>
              )}
              {player.relics.length > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#0c101b]/85 border border-amber-800/50 rounded text-[10px] font-gothic text-emerald-300">
                  {player.relics.includes('wind_stride_charm') && <span>Wind-Stride Charm</span>}
                  {player.relics.includes('wind_stride_charm') &&
                    player.relics.includes('golden_heart_vessel') && <span>·</span>}
                  {player.relics.includes('golden_heart_vessel') && <span>Golden Heart Vessel</span>}
                </div>
              )}
            </div>
          </div>

          {/* TOP-RIGHT: Parchment Quest Scroll Banner, 3 Crystal Seals & Utility Bar */}
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 flex flex-col items-end gap-1">
            {/* Torn-Edge Parchment Scroll with Dark-Ink Objective Text */}
            <div className="relative w-[250px] sm:w-[310px] aspect-[2.25/1] drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]">
              <img
                src={UI_ASSETS.questScroll}
                alt="Quest Scroll"
                className="w-full h-full object-contain pointer-events-none"
              />
              <div className="absolute inset-0 pl-[23%] pr-[12%] py-[13%] flex flex-col justify-center overflow-hidden">
                <div className="text-[10px] sm:text-[11px] font-gothic font-bold text-[#3b1c14] leading-tight truncate">
                  {stageTitle}
                </div>
                <div className="mt-0.5 text-[9px] sm:text-[10px] font-medieval-body font-semibold text-[#2a1d12] leading-snug line-clamp-2">
                  {questObjective}
                </div>
              </div>
            </div>

            {/* 3 Crystal Seals + Quick Stage Select + Help/SFX */}
            <div className="pointer-events-auto flex items-center gap-2 px-2.5 py-1 bg-[#120f0d]/90 border border-amber-800/60 rounded shadow-lg">
              <div className="flex items-center gap-1.5 pr-2 border-r border-amber-800/50">
                <img
                  src={UI_ASSETS.crystalAmber}
                  alt="Amber Seal"
                  title="Amber Seal (Wing I - Farmland)"
                  className={`w-5 h-5 sm:w-6 sm:h-6 object-contain transition-all ${
                    player.crystals.amber
                      ? 'opacity-100 drop-shadow-[0_0_8px_rgba(245,158,11,0.95)] scale-105'
                      : 'opacity-30 grayscale'
                  }`}
                />
                <img
                  src={UI_ASSETS.crystalEmerald}
                  alt="Emerald Seal"
                  title="Emerald Seal (Wing II - Whispering Grove)"
                  className={`w-5 h-5 sm:w-6 sm:h-6 object-contain transition-all ${
                    player.crystals.emerald
                      ? 'opacity-100 drop-shadow-[0_0_8px_rgba(16,185,129,0.95)] scale-105'
                      : 'opacity-30 grayscale'
                  }`}
                />
                <img
                  src={UI_ASSETS.crystalSapphire}
                  alt="Sapphire Seal"
                  title="Sapphire Seal (Wing III - Obsidian Foundry)"
                  className={`w-5 h-5 sm:w-6 sm:h-6 object-contain transition-all ${
                    player.crystals.sapphire
                      ? 'opacity-100 drop-shadow-[0_0_8px_rgba(59,130,246,0.95)] scale-105'
                      : 'opacity-30 grayscale'
                  }`}
                />
              </div>

              <select
                aria-label="Realm Stage Travel"
                value={stageId}
                onChange={(e) => onWarpStage(e.target.value)}
                className="bg-[#0d111c] text-amber-200 text-[10px] sm:text-[11px] font-gothic border border-amber-700/60 rounded px-1.5 py-0.5 cursor-pointer max-w-[130px] sm:max-w-none"
              >
                <option value="sanctuary">Castle Sanctuary Hub</option>
                <option value="stage_1_1">Wing 1-1: The Boar Raid</option>
                <option value="stage_1_2">Wing 1-2: Orchard Ambush</option>
                <option value="stage_1_3">Wing 1-3: Barn Alpha Boss</option>
                <option value="stage_2_1">Wing II: Whispering Grove</option>
                <option value="stage_3_1">Wing III: Obsidian Foundry</option>
                <option value="stage_4_1">Grand Gate: Wicked Witch</option>
              </select>

              <button
                type="button"
                {...makeReliablePress(onOpenHowToPlay)}
                className="px-2 py-0.5 bg-[#0d111c] hover:bg-slate-800 text-amber-200 text-[10px] sm:text-[11px] font-gothic border border-amber-700/50 rounded cursor-pointer whitespace-nowrap shrink-0"
              >
                Help
              </button>

              <button
                type="button"
                {...makeReliablePress(onToggleSound)}
                className="px-2 py-0.5 bg-[#0d111c] hover:bg-slate-800 text-slate-300 text-[10px] sm:text-[11px] font-gothic border border-slate-700 rounded cursor-pointer whitespace-nowrap shrink-0"
              >
                {soundEnabled ? 'SFX' : 'MUTE'}
              </button>
            </div>
          </div>

          {/* TOP-CENTER: ACTIVE WING BOSS HEALTH BAR & PHASE INDICATOR */}
          {activeBoss && activeBoss.hp > 0 && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-4">
              <div className="bg-[#110c16]/90 border-2 border-amber-600/75 rounded p-2.5 shadow-2xl">
                <div className="flex items-center justify-between text-[11px] font-gothic mb-1">
                  <span className="font-bold text-amber-300 tracking-wider truncate">
                    {activeBoss.name}
                    {activeBoss.enraged ? ' · ENRAGED' : ''}
                  </span>
                  <span className="font-mono tabular-nums text-rose-300 shrink-0 ml-2">
                    {activeBoss.hp} / {activeBoss.maxHp}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-900 rounded-sm overflow-hidden border border-amber-700/50">
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
            <div className="absolute top-28 left-1/2 -translate-x-1/2 z-20 px-5 py-2 bg-[#12101b]/90 border-y border-amber-500/70 text-center shadow-xl">
              <div className="font-gothic text-xs sm:text-sm font-bold tracking-widest text-amber-300 uppercase">
                {bannerToast.title}
              </div>
              <div className="text-[11px] text-slate-300 font-medieval-body">{bannerToast.subtitle}</div>
            </div>
          )}

          {/* INTERACTION PROMPT ABOVE DOOR / NPC */}
          {nearbyPrompt && screen === 'PLAYING' && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 bg-[#1a1510]/95 border border-amber-500/80 rounded shadow-lg text-xs font-gothic text-amber-200 tracking-wider whitespace-nowrap">
              {nearbyPrompt}
            </div>
          )}

          {/* BOTTOM-CENTER: IMPORTED GOTHIC WEAPON HOTBAR (1-5) */}
          <div className="pointer-events-auto absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1">
            {activeWeaponInfo && (
              <div
                className="text-[10px] sm:text-[11px] font-gothic tracking-widest uppercase text-amber-200/90"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.95)' }}
              >
                {activeWeaponInfo.name}
              </div>
            )}
            <div className="flex items-center gap-1.5 sm:gap-2">
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
                    className={`relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center transition-transform ${
                      active
                        ? 'scale-110 drop-shadow-[0_0_12px_rgba(251,191,36,0.95)] z-10'
                        : unlocked
                        ? 'opacity-90 hover:opacity-100 hover:scale-105 cursor-pointer drop-shadow-[0_3px_6px_rgba(0,0,0,0.85)]'
                        : 'opacity-40 grayscale cursor-not-allowed'
                    }`}
                  >
                    <img
                      src={UI_ASSETS.weaponSlot}
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    />
                    <img
                      src={iconSrc}
                      alt={w.name}
                      className={`relative z-10 w-7 h-7 sm:w-9 sm:h-9 object-contain pointer-events-none ${
                        active ? 'drop-shadow-[0_0_6px_rgba(255,244,214,0.8)]' : ''
                      }`}
                    />
                    <span className="absolute bottom-1 right-1.5 z-20 text-[9px] font-mono font-bold text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                      {id}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* =================================================================
              MOBILE TOUCH CONTROLS (Engraved Bronze D-Pad & Action Medallions)
          ================================================================= */}
          {showTouchControls && screen === 'PLAYING' && (
            <>
              <div className="pointer-events-auto absolute bottom-3 left-3 z-30 flex items-center gap-2.5">
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
                  className="w-12 h-12 rounded-full bg-[#1a1612]/80 border-2 border-amber-600/75 text-amber-200 font-bold text-base flex items-center justify-center active:scale-90"
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
                  className="w-12 h-12 rounded-full bg-[#1a1612]/80 border-2 border-amber-600/75 text-amber-200 font-bold text-base flex items-center justify-center active:scale-90"
                >
                  ▶
                </button>
              </div>

              <div className="pointer-events-auto absolute bottom-3 right-3 z-30 grid grid-cols-2 gap-2">
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
                  className="w-12 h-12 rounded-full bg-[#141d2e]/85 border-2 border-sky-400/75 text-sky-200 font-gothic text-[10px] font-bold flex items-center justify-center active:scale-90"
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
                  className="w-12 h-12 rounded-full bg-[#142924]/85 border-2 border-emerald-400/75 text-emerald-200 font-gothic text-[10px] font-bold flex items-center justify-center active:scale-90"
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
                  className="w-12 h-12 rounded-full bg-[#2b161b]/85 border-2 border-amber-400 text-amber-200 font-gothic text-[10px] font-bold flex items-center justify-center active:scale-90"
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
                  className="w-12 h-12 rounded-full bg-[#241b12]/85 border-2 border-amber-600/75 text-amber-100 font-gothic text-[10px] font-bold flex items-center justify-center active:scale-90"
                >
                  DOOR
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* ===================================================================
          5. NPC & BETWEEN-WING STORY PARCHMENT DIALOGUE MODAL
      =================================================================== */}
      {screen === 'STORY_MODAL' && activeDialogue && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex items-end justify-center p-4 sm:p-8 bg-black/55">
          <div
            {...makeReliablePress(onAdvanceDialogue)}
            className="w-full max-w-2xl bg-gradient-to-b from-[#282019] to-[#17120e] border-2 border-amber-500/80 rounded-lg p-4 sm:p-5 shadow-2xl cursor-pointer"
          >
            <div className="flex items-center justify-between border-b border-amber-700/40 pb-2 mb-3">
              <div>
                <div className="font-gothic text-xs sm:text-sm font-bold text-amber-300 tracking-wider uppercase">
                  {activeDialogue.title}
                </div>
                {activeDialogue.subtitle && (
                  <div className="text-[11px] text-amber-200/70">{activeDialogue.subtitle}</div>
                )}
              </div>
              <span className="text-xs font-mono text-amber-300/80">
                {activeDialogue.stepIndex + 1} / {activeDialogue.totalSteps}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#0d111a] border-2 border-amber-500/80 overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src={SPRITE_MANIFEST[activeDialogue.portrait]}
                  alt={activeDialogue.speaker}
                  className="w-16 h-16 object-contain"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-gothic text-xs font-bold uppercase tracking-wider text-sky-300 mb-1">
                  {activeDialogue.speaker}
                </div>
                <p className="text-xs sm:text-base text-[#f7eedc] font-medieval-body leading-relaxed">
                  {activeDialogue.text}
                </p>
              </div>
            </div>

            <div className="mt-3 text-right text-[11px] font-gothic text-amber-300/80">
              Click / Press Space or E to Continue →
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          6. DUAL ENDING CHOICE MODAL (AFTER WICKED WITCH 3-PHASE BOSS)
      =================================================================== */}
      {screen === 'FINALE_CHOICE' && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/75">
          <div className="w-full max-w-xl bg-gradient-to-b from-[#261d17] to-[#140f0c] border-2 border-amber-500 rounded-lg p-5 sm:p-6 shadow-2xl text-center">
            <div className="font-gothic text-xs uppercase tracking-widest text-amber-400">
              The Grand Sanctum Threshold · Final Decision
            </div>
            <h2 className="mt-1.5 font-gothic text-xl sm:text-2xl font-bold text-[#f7eedc]">
              The Mortal Vessel &amp; The Abyssal Remnant
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 font-medieval-body leading-relaxed">
              Seraphina lies defeated, and the tri-crystal cage surrounding your physical body shatters. Yet beneath the throne, the ancient Abyssal Shadow stirs. Choose your destiny:
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                {...makeReliablePress(onChooseReclaimBody)}
                className="p-4 bg-[#1b2234] hover:bg-[#232d45] border-2 border-amber-400/80 rounded-lg text-left transition-transform active:scale-95 cursor-pointer"
              >
                <div className="font-gothic text-xs sm:text-sm font-bold text-amber-300">
                  I. RECLAIM YOUR BODY
                </div>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  Reunite spirit and flesh immediately. Return Castle Ghostreach and its villagers to mortal daylight.
                </p>
              </button>

              <button
                type="button"
                {...makeReliablePress(onChooseAbsorbCurse)}
                className="p-4 bg-[#261538] hover:bg-[#331c4a] border-2 border-purple-400/80 rounded-lg text-left transition-transform active:scale-95 cursor-pointer"
              >
                <div className="font-gothic text-xs sm:text-sm font-bold text-purple-300">
                  II. ABSORB THE CURSE (4TH PHASE)
                </div>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  Remain an astral spirit and draw out the Secret 4th-Phase Abyssal Shadow Sovereign to purge the curse forever!
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          7. HOW TO PLAY / CONTROLS PARCHMENT MODAL
      =================================================================== */}
      {screen === 'HOW_TO_PLAY' && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/75">
          <div className="w-full max-w-xl bg-gradient-to-b from-[#261e18] to-[#14100d] border-2 border-amber-600/80 rounded-lg p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-amber-700/50 pb-2 mb-3">
              <h2 className="font-gothic text-base sm:text-lg font-bold text-amber-300">
                TOME OF COMBAT &amp; REALM LORE
              </h2>
              <button
                type="button"
                {...makeReliablePress(onCloseHowToPlay)}
                className="px-2.5 py-1 bg-amber-900/70 hover:bg-amber-800 text-amber-100 text-xs font-gothic rounded border border-amber-500/50 cursor-pointer"
              >
                Close [Esc]
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medieval-body">
              <div className="p-3 bg-[#120e0b]/80 border border-amber-800/40 rounded">
                <div className="font-gothic text-xs font-bold text-amber-400 uppercase mb-1.5">
                  Movement &amp; Ghost Dash
                </div>
                <ul className="space-y-1 text-slate-200">
                  <li>• <b>A / D or Left / Right:</b> Move across gauntlets</li>
                  <li>• <b>W / Up Arrow:</b> Float-Jump (hold while falling to Hover)</li>
                  <li>• <b>Shift:</b> Ghost Dash through enemies &amp; hazards (1.2s cooldown)</li>
                  <li>• <b>E:</b> Enter Wing Doors, claim Shrines &amp; talk to Spirits</li>
                </ul>
              </div>

              <div className="p-3 bg-[#120e0b]/80 border border-amber-800/40 rounded">
                <div className="font-gothic text-xs font-bold text-sky-400 uppercase mb-1.5">
                  Skill Parry / Soul-Reflect
                </div>
                <ul className="space-y-1 text-slate-200">
                  <li>• <b>Space or Left-Click:</b> Lunge &amp; swing active weapon</li>
                  <li>• <b>Golden Parry:</b> Tap Attack right as an enemy rears back with a red-gold flash to stun for 1.6s &amp; deal <b>2x CRIT</b>!</li>
                  <li>• <b>Soul-Reflect:</b> Strike incoming enemy orbs to reflect them back!</li>
                  <li>• <b>Keys 1–5:</b> Switch unlocked spectral weapons</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                {...makeReliablePress(onCloseHowToPlay)}
                className="px-5 py-2 bg-gradient-to-b from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-white font-gothic text-xs font-bold tracking-widest rounded border border-amber-400/70 cursor-pointer"
              >
                RETURN TO REALM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          8. VICTORY & GAME OVER MODALS
      =================================================================== */}
      {(screen === 'VICTORY_MORTAL' || screen === 'VICTORY_ASTRAL' || screen === 'GAME_OVER') && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-lg bg-gradient-to-b from-[#251d17] to-[#130e0b] border-2 border-amber-500 rounded-lg p-6 text-center shadow-2xl">
            <div className="font-gothic text-xs uppercase tracking-widest text-amber-400">
              {screen === 'GAME_OVER'
                ? 'Your Spectral Essence Dispersed'
                : screen === 'VICTORY_ASTRAL'
                ? 'True Ending · The Eternal Astral Sovereign'
                : 'Ending I · Dawn of Mortal Restoration'}
            </div>

            <h2 className="mt-1.5 font-gothic text-2xl sm:text-3xl font-bold text-[#f7eedc]">
              {screen === 'GAME_OVER'
                ? 'FADED INTO THE ASTRAL MIST'
                : screen === 'VICTORY_ASTRAL'
                ? 'THE CURSE PURGED FOREVER'
                : 'SOUL AND VESSEL REUNITED'}
            </h2>

            <div className="my-3.5 flex justify-center">
              <img
                src={
                  SPRITE_MANIFEST[
                    screen === 'VICTORY_MORTAL' ? 'human_hero' : 'ghost_hero'
                  ]
                }
                alt="Hero"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-[0_0_18px_rgba(56,189,248,0.5)]"
              />
            </div>

            <p className="text-xs sm:text-sm text-slate-300 font-medieval-body leading-relaxed">
              {screen === 'GAME_OVER'
                ? 'Though your phantom form wavered, the candles of the Castle Sanctuary still burn. Rise once more and time your Soul-Reflect Parry against the corrupted guardians.'
                : screen === 'VICTORY_ASTRAL'
                ? 'By absorbing the curse and vanquishing the 4th-Phase Abyssal Shadow Sovereign, you freed Seraphina and all of Castle Ghostreach—standing watch as its immortal spectral guardian.'
                : 'Stepping through the shattered Grand Gate, your spirit fused back into your mortal body. Warm sunlight broke over the Farmland, Grove, and Foundry as the villagers awoke.'}
            </p>

            <div className="mt-5 flex justify-center gap-4">
              <button
                type="button"
                {...makeReliablePress(onRestartGame)}
                className="px-6 py-2.5 bg-gradient-to-b from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-white font-gothic text-xs font-bold tracking-widest rounded border border-amber-400 cursor-pointer"
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
