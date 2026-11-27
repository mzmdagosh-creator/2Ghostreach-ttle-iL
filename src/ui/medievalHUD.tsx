/**
 * Gothic Dark-Fantasy Medieval HUD, Fading Splash Screen, Asymmetrical Title Screen,
 * Parchment Story Modals, Dual Ending Choice, Mobile Touch Controls & F2 Debug Overlay
 */

import React, { useRef } from 'react';
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
          1. F2 SPRITE LOADER DEBUG OVERLAY
      =================================================================== */}
      {showDebugF2 && (
        <div className="pointer-events-auto absolute top-14 left-3 z-50 w-88 max-h-[75%] overflow-y-auto bg-[#0b0e17]/95 border border-amber-700/60 rounded p-2.5 shadow-2xl text-[11px] font-mono">
          <div className="flex items-center justify-between border-b border-amber-800/50 pb-1 mb-1.5">
            <span className="font-bold text-amber-300">SPRITE LOADER MANIFEST (F2)</span>
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
          {/* Top-Left Minimal Realm Inscription */}
          <div className="flex items-center justify-between gap-4">
            <div className="text-[11px] sm:text-xs tracking-widest uppercase text-amber-300/85 font-gothic">
              Chronicle of the Severed Envoy · Three Anchor Relics
            </div>
            <div className="text-[11px] text-slate-400">Press F2 for Sprite Asset Inspector</div>
          </div>

          {/* Left-Aligned Gothic Title Lockup & CTAs over calm negative space */}
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

            {/* Primary Action Buttons — Wired with reliable click + pointerup + touchend */}
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

            {/* Direct Zone / Weather Quick-Launch Bar */}
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

          {/* Flat Single-Line Control Hint Footer */}
          <div className="text-[11px] sm:text-xs text-slate-300/80 tracking-wide font-medieval-body truncate">
            A/D or Arrows Move · W/Up Float-Jump & Hover · Space/Click Attack & Parry · Shift Ghost Dash · E Enter Door · 1–5 Weapons
          </div>
        </div>
      )}

      {/* ===================================================================
          3. 5-SHOT INTRO CUTSCENE PARCHMENT SCROLL OVERLAY
      =================================================================== */}
      {screen === 'CUTSCENE' && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col justify-between p-4 sm:p-8">
          <div className="flex items-center justify-between gap-2">
            <div className="px-3 py-1 bg-[#0c101d]/90 border border-amber-700/50 rounded text-[11px] sm:text-xs font-gothic tracking-widest text-amber-300 truncate">
              PROLOGUE · SHOT {cutsceneIndex + 1} OF {INTRO_CUTSCENE_SHOTS.length} · {currentCutsceneShot.title}
            </div>

            <button
              type="button"
              {...makeReliablePress(onSkipCutscene)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-b from-red-800 to-red-950 hover:from-red-700 hover:to-red-900 text-amber-100 border border-amber-500/60 rounded-full shadow-lg text-[11px] font-gothic font-bold tracking-widest cursor-pointer transition-transform active:scale-95 whitespace-nowrap shrink-0"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              SKIP PROLOGUE
            </button>
          </div>

          {/* Bottom Aged-Parchment Scroll & Portrait Medallion */}
          <div
            {...makeReliablePress(onAdvanceCutscene)}
            className="mx-auto w-full max-w-3xl bg-gradient-to-b from-[#261e18]/95 to-[#17120e]/95 border-2 border-amber-600/75 rounded-lg p-3.5 sm:p-5 shadow-2xl cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#0e1320] border-2 border-amber-500/80 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                <img
                  src={SPRITE_MANIFEST[currentCutsceneShot.portrait]}
                  alt={currentCutsceneShot.speaker}
                  className="w-16 h-16 object-contain"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-gothic text-xs font-bold tracking-wider uppercase text-amber-400 truncate">
                    {currentCutsceneShot.speaker}
                  </span>
                  <span className="text-[11px] text-amber-200/70 font-gothic whitespace-nowrap shrink-0">
                    Click / Space / Tap →
                  </span>
                </div>
                <p className="mt-1.5 text-xs sm:text-base text-[#f5ebd6] font-medieval-body leading-relaxed">
                  {currentCutsceneShot.dialogue}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          4. ACTIVE GAMEPLAY HUD (INSIDE 16:9 STAGE)
      =================================================================== */}
      {(screen === 'PLAYING' || screen === 'STORY_MODAL' || screen === 'FINALE_CHOICE') && (
        <>
          {/* TOP-LEFT: Wrought-Iron Health Hearts, Ghost Dash Cooldown & Relic Slots */}
          <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
            <div className="pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 bg-[#0c101b]/90 border border-amber-700/60 rounded shadow-lg">
              {/* Health Hearts */}
              <div className="flex items-center gap-1">
                {Array.from({ length: player.maxHp }).map((_, idx) => {
                  const filled = idx < player.hp;
                  return (
                    <svg
                      key={idx}
                      className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${
                        filled ? 'text-rose-500 scale-100' : 'text-slate-700 scale-90'
                      }`}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  );
                })}
              </div>

              <span className="text-[11px] font-mono tabular-nums text-amber-200/90 border-l border-slate-700 pl-2">
                {player.hp}/{player.maxHp}
              </span>

              {/* Ghost Dash Cooldown Gauge */}
              <div className="flex items-center gap-1.5 border-l border-slate-700 pl-2">
                <span className="text-[10px] font-gothic uppercase tracking-wider text-sky-300">
                  Dash
                </span>
                <div className="w-12 sm:w-14 h-2 bg-slate-800 rounded-sm overflow-hidden border border-sky-500/40">
                  <div
                    className="h-full bg-sky-400 transition-none"
                    style={{ width: `${Math.round(dashReadyRatio * 100)}%` }}
                  />
                </div>
              </div>

              {/* Parry Empowered Indicator */}
              {player.parryEmpowerTimer > 0 && (
                <span className="text-[10px] font-gothic font-bold text-amber-300 animate-pulse">
                  ★ 2X CRIT
                </span>
              )}
            </div>

            {/* Active Relics Row */}
            {player.relics.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#0c101b]/80 border border-amber-800/40 rounded text-[11px] text-emerald-300">
                <span>Relics:</span>
                {player.relics.includes('wind_stride_charm') && (
                  <span>Wind-Stride Charm</span>
                )}
                {player.relics.includes('wind_stride_charm') &&
                  player.relics.includes('golden_heart_vessel') && <span>·</span>}
                {player.relics.includes('golden_heart_vessel') && (
                  <span>Golden Heart Vessel</span>
                )}
              </div>
            )}
          </div>

          {/* TOP-RIGHT: Parchment Quest Scroll, 3-Crystal Seal Tracker & Stage Warp */}
          <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
            <div className="pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 bg-[#191512]/90 border border-amber-700/65 rounded shadow-lg">
              {/* 3 Crystal Sockets (Amber, Emerald, Sapphire) */}
              <div className="flex items-center gap-2 pr-2 border-r border-amber-800/50">
                <span className="text-[10px] font-gothic uppercase tracking-wider text-amber-200/80 hidden sm:inline">
                  Seals:
                </span>
                <div
                  title="Amber Seal (Wing I - Farmland)"
                  className={`w-3.5 h-3.5 rotate-45 border ${
                    player.crystals.amber
                      ? 'bg-amber-400 border-white shadow-[0_0_8px_#f59e0b]'
                      : 'bg-slate-800 border-amber-600/50'
                  }`}
                />
                <div
                  title="Emerald Seal (Wing II - Whispering Grove)"
                  className={`w-3.5 h-3.5 rotate-45 border ${
                    player.crystals.emerald
                      ? 'bg-emerald-400 border-white shadow-[0_0_8px_#10b981]'
                      : 'bg-slate-800 border-emerald-600/50'
                  }`}
                />
                <div
                  title="Sapphire Seal (Wing III - Obsidian Foundry)"
                  className={`w-3.5 h-3.5 rotate-45 border ${
                    player.crystals.sapphire
                      ? 'bg-blue-400 border-white shadow-[0_0_8px_#3b82f6]'
                      : 'bg-slate-800 border-blue-600/50'
                  }`}
                />
              </div>

              {/* Quick Stage / Wing Travel Select */}
              <select
                aria-label="Realm Stage Travel"
                value={stageId}
                onChange={(e) => onWarpStage(e.target.value)}
                className="bg-[#0d111c] text-amber-200 text-[11px] font-gothic border border-amber-700/60 rounded px-1.5 py-0.5 cursor-pointer"
              >
                <option value="sanctuary">Castle Sanctuary Hub</option>
                <option value="stage_1_1">Wing 1-1: The Boar Raid (Rain)</option>
                <option value="stage_1_2">Wing 1-2: Orchard Ambush (Rain)</option>
                <option value="stage_1_3">Wing 1-3: Barn Alpha Boss (Rain)</option>
                <option value="stage_2_1">Wing II: Whispering Grove (Mist)</option>
                <option value="stage_3_1">Wing III: Obsidian Foundry (Embers)</option>
                <option value="stage_4_1">Grand Gate: Wicked Witch Finale</option>
              </select>

              <button
                type="button"
                {...makeReliablePress(onOpenHowToPlay)}
                className="px-2 py-0.5 bg-[#0d111c] hover:bg-slate-800 text-amber-200 text-[11px] font-gothic border border-amber-700/50 rounded cursor-pointer whitespace-nowrap shrink-0"
              >
                Help
              </button>

              <button
                type="button"
                {...makeReliablePress(onToggleSound)}
                className="px-2 py-0.5 bg-[#0d111c] hover:bg-slate-800 text-slate-300 text-[11px] font-gothic border border-slate-700 rounded cursor-pointer whitespace-nowrap shrink-0"
              >
                {soundEnabled ? 'SFX' : 'MUTE'}
              </button>
            </div>

            {/* Quest Objective Parchment Ribbon */}
            <div className="px-3 py-1 bg-[#1b1612]/85 border border-amber-700/45 rounded text-right max-w-md">
              <div className="text-[11px] font-gothic font-bold text-amber-300 truncate">{stageTitle}</div>
              <div className="text-[10px] text-amber-100/80 truncate">{questObjective}</div>
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
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 bg-[#1a1510]/95 border border-amber-500/80 rounded shadow-lg text-xs font-gothic text-amber-200 tracking-wider whitespace-nowrap">
              {nearbyPrompt}
            </div>
          )}

          {/* BOTTOM-CENTER: BRASS WEAPON HOTBAR (1-5) */}
          <div className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 bg-[#121521]/90 border border-amber-700/65 rounded-lg shadow-xl">
            {[1, 2, 3, 4, 5].map((id) => {
              const w = WEAPON_CATALOG[id];
              const unlocked = player.unlockedWeapons.includes(id);
              const active = player.activeWeapon === id;
              return (
                <button
                  type="button"
                  key={id}
                  {...makeReliablePress(() => unlocked && onSelectWeapon(id))}
                  disabled={!unlocked}
                  title={unlocked ? `${w.name}: ${w.description}` : 'Locked Relic Weapon'}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-gothic transition-all whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-amber-900/80 border-amber-400 text-amber-100 shadow-[0_0_10px_rgba(245,158,11,0.45)]'
                      : unlocked
                      ? 'bg-[#1a2030] border-slate-600 text-slate-200 hover:border-amber-500/60 cursor-pointer'
                      : 'bg-[#0b0e17] border-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <span className="font-mono font-bold text-amber-400">[{id}]</span>
                  <span className="hidden md:inline">{unlocked ? w.name : 'Locked'}</span>
                </button>
              );
            })}
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
              The Mortal Vessel & The Abyssal Remnant
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
                TOME OF COMBAT & REALM LORE
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
                  Movement & Ghost Dash
                </div>
                <ul className="space-y-1 text-slate-200">
                  <li>• <b>A / D or Left / Right:</b> Move across gauntlets</li>
                  <li>• <b>W / Up Arrow:</b> Float-Jump (hold while falling to Hover)</li>
                  <li>• <b>Shift:</b> Ghost Dash through enemies & hazards (1.2s cooldown)</li>
                  <li>• <b>E:</b> Enter Wing Doors, claim Shrines & talk to Spirits</li>
                </ul>
              </div>

              <div className="p-3 bg-[#120e0b]/80 border border-amber-800/40 rounded">
                <div className="font-gothic text-xs font-bold text-sky-400 uppercase mb-1.5">
                  Skill Parry / Soul-Reflect
                </div>
                <ul className="space-y-1 text-slate-200">
                  <li>• <b>Space or Left-Click:</b> Lunge & swing active weapon</li>
                  <li>• <b>Golden Parry:</b> Tap Attack right as an enemy rears back with a red-gold flash to stun for 1.6s & deal <b>2x CRIT</b>!</li>
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
