/**
 * Castle Sanctuary Hub, Wing 1 (Farmland Doors 1-1, 1-2, 1-3),
 * Wings 2 & 3 Multi-Wave Gauntlets, In-Stage Lore Spirits & Multi-Phase Wicked Witch Finale
 */

import { WingTheme } from '../engine/lighting';
import {
  DoorPortal,
  EnemyEntity,
  GROUND_Y,
  HazardZone,
  NPCEntity,
  ShrineRelic,
} from '../engine/physics';
import { SpriteKey } from '../engine/spriteLoader';

export interface StageZoneBanner {
  x: number;
  title: string;
  subtitle: string;
}

export interface StageDefinition {
  id: string;
  title: string;
  subtitle: string;
  wing: 0 | 1 | 2 | 3 | 4;
  theme: WingTheme;
  width: number;
  spawnX: number;
  zones: StageZoneBanner[];
  doors: DoorPortal[];
  npcs: NPCEntity[];
  hazards: HazardZone[];
  enemies: EnemyEntity[];
  shrines: ShrineRelic[];
}

function makeEnemy(
  id: string,
  name: string,
  sprite: SpriteKey,
  role: EnemyEntity['role'],
  x: number,
  hp: number,
  speed: number,
  damage: number,
  zoneIndex: number,
  opts?: { isBoss?: boolean; width?: number; height?: number; renderHeight?: number; maxBossPhases?: number }
): EnemyEntity {
  const isFlier =
    role === 'flier' ||
    sprite === 'wisp_phantom' ||
    sprite === 'shadow_stalker' ||
    sprite === 'wicked_witch';
  return {
    id,
    name,
    sprite,
    role,
    isBoss: opts?.isBoss ?? false,
    bossPhase: opts?.isBoss ? 1 : undefined,
    maxBossPhases: opts?.maxBossPhases ?? (opts?.isBoss ? 2 : undefined),
    x,
    y: isFlier ? GROUND_Y - 28 : GROUND_Y,
    vx: 0,
    vy: 0,
    knockbackVx: 0,
    width: opts?.width ?? (opts?.isBoss ? 98 : 58),
    height: opts?.height ?? (opts?.isBoss ? 132 : 88),
    renderHeight: opts?.renderHeight ?? (opts?.isBoss ? 172 : 116),
    facing: -1,
    hp,
    maxHp: hp,
    speed,
    damage,
    zoneIndex,
    state: 'patrol',
    stateTimer: 1.5,
    telegraphType: role === 'ranged' || role === 'flier' ? 'projectile' : 'charge',
    attackTargetX: x,
    hitFlashTimer: 0,
    stunTimer: 0,
    scaleX: 1,
    scaleY: 1,
    enraged: false,
    hoverOffset: 0,
    walkCycle: (x * 0.05) % (Math.PI * 2),
    strideIntensity: 0.5,
    lastDustStep: 0,
  };
}

export function buildStage(
  stageId: string,
  clearedStages: Record<string, boolean>,
  crystals: { amber: boolean; emerald: boolean; sapphire: boolean }
): StageDefinition {
  switch (stageId) {
    // =========================================================================
    // CASTLE SANCTUARY HUB
    // =========================================================================
    case 'sanctuary': {
      const stage11Done = Boolean(clearedStages['stage_1_1']);
      const stage12Done = Boolean(clearedStages['stage_1_2']);
      const stage13Done = Boolean(clearedStages['stage_1_3']);
      const stage21Done = Boolean(clearedStages['stage_2_1']);
      const stage31Done = Boolean(clearedStages['stage_3_1']);
      const allCrystals = crystals.amber && crystals.emerald && crystals.sapphire;

      return {
        id: 'sanctuary',
        title: 'Castle Sanctuary Hub',
        subtitle: 'Astral Hall of the Three Anchor Wings',
        wing: 0,
        theme: 'sanctuary',
        width: 2680,
        spawnX: 220,
        zones: [
          { x: 220, title: 'Astral Vestibule', subtitle: 'Consult the Bound Realm Spirits' },
          { x: 950, title: 'Wing I: Farmland Portals', subtitle: 'Doors 1-1, 1-2 & 1-3 (Amber Seal)' },
          { x: 1850, title: 'Outer Wings & The Grand Final Gate', subtitle: 'Socket All 3 Crystals to Enter' },
        ],
        npcs: [
          {
            id: 'npc_farmer',
            name: 'Barnaby, Homestead Elder',
            role: 'Custodian of the Harvest Anchor Relic',
            sprite: 'villager_farmer',
            x: 370,
            facing: 1,
            dialogue: [
              '"Look at us, Royal Envoy... Seraphina’s Rite of Severance stripped our souls from our bodies when she shattered the Anchor Relic of the Harvest."',
              '"In Wing I, our farm beasts have swollen with dark mire. Enter Door 1-1 to reclaim my heirloom Spirit Pitchfork—its extended reach will keep charging boars at bay."',
              '"Then brave Door 1-2 for the Wind-Stride Charm, and confront Ghorg, the Armored Barn Alpha in Door 1-3 to win back the Amber Crystal Seal!"',
            ],
          },
          {
            id: 'npc_merchant',
            name: 'Elira, Royal Chronicler & Merchant',
            role: 'Keeper of the Grove & Parry Secrets',
            sprite: 'villager_merchant',
            x: 1380,
            facing: -1,
            dialogue: [
              '"Do not trade blows recklessly! Watch closely when a boar rears back or an imp draws a hex orb—a red-gold danger line flashes on the ground."',
              '"Press Attack [Space / Click] at that exact moment to unleash a GOLDEN PARRY: it stuns the attacker for 1.6 seconds, reflects enemy orbs back at double speed, and grants 2x Critical Damage!"',
              '"They say Seraphina was once our devoted Royal Arcanist... Why would she lock your mortal body inside the Grand Gate unless she feared something deeper beneath the castle?"',
            ],
          },
          {
            id: 'npc_miner',
            name: 'Torvin, Deep-Hearth Master Miner',
            role: 'Warden of the Obsidian Foundry',
            sprite: 'villager_miner',
            x: 2010,
            facing: -1,
            dialogue: [
              '"Behold the Grand Final Gate to my right. Through its iron lattice you can see your own mortal body suspended in a tri-crystal stasis seal."',
              '"Socket the Amber Seal from Wing I, the Emerald Seal from Wing II, and the Sapphire Seal from Captain Vaelen in Wing III to shatter the lock and face Seraphina!"',
            ],
          },
        ],
        doors: [
          {
            id: 'door_1_1',
            targetStageId: 'stage_1_1',
            x: 680,
            width: 96,
            title: 'DOOR 1-1: BOAR RAID',
            subtitle: 'Reward: Spirit Pitchfork (Weapon 2)',
            wing: 1,
            crystalColor: '#f59e0b',
            isCleared: stage11Done,
          },
          {
            id: 'door_1_2',
            targetStageId: 'stage_1_2',
            x: 920,
            width: 96,
            title: 'DOOR 1-2: ORCHARD AMBUSH',
            subtitle: 'Reward: Wind-Stride Charm (Fast Dash)',
            wing: 1,
            crystalColor: '#f59e0b',
            isCleared: stage12Done,
          },
          {
            id: 'door_1_3',
            targetStageId: 'stage_1_3',
            x: 1160,
            width: 96,
            title: 'DOOR 1-3: BARN ALPHA BOSS',
            subtitle: 'Reward: Heart Vessel & Amber Seal',
            wing: 1,
            crystalColor: '#f59e0b',
            isCleared: stage13Done,
          },
          {
            id: 'door_2_1',
            targetStageId: 'stage_2_1',
            x: 1620,
            width: 96,
            title: 'WING II: WHISPERING GROVE',
            subtitle: 'Reward: Thorn Whip & Emerald Seal',
            wing: 2,
            crystalColor: '#10b981',
            isCleared: stage21Done,
          },
          {
            id: 'door_3_1',
            targetStageId: 'stage_3_1',
            x: 1840,
            width: 96,
            title: 'WING III: OBSIDIAN FOUNDRY',
            subtitle: 'Reward: Warhammer & Sapphire Seal',
            wing: 3,
            crystalColor: '#3b82f6',
            isCleared: stage31Done,
          },
          {
            id: 'door_grand_gate',
            targetStageId: 'stage_4_1',
            x: 2340,
            width: 156,
            title: 'THE GRAND FINAL GATE',
            subtitle: allCrystals
              ? 'UNSEALED: Enter Inner Sanctum (Witch Finale)'
              : 'Requires Amber, Emerald & Sapphire Seals (or Stage Select)',
            wing: 4,
            crystalColor: '#c084fc',
            requiresCrystals: true,
            isCleared: Boolean(clearedStages['stage_4_1']),
          },
        ],
        hazards: [],
        enemies: [],
        shrines: [],
      };
    }

    // =========================================================================
    // WING 1 - DOOR 1-1: THE BOAR RAID (Spirit Pitchfork)
    // =========================================================================
    case 'stage_1_1':
      return {
        id: 'stage_1_1',
        title: 'Wing 1-1 · The Boar Raid',
        subtitle: 'Multi-Wave Farmland Gauntlet · Reclaim the Spirit Pitchfork',
        wing: 1,
        theme: 'farmland',
        width: 3150,
        spawnX: 160,
        zones: [
          { x: 160, title: 'Zone I: Trampled Wheat Furrows', subtitle: 'Time Your Attack on Red-Gold Telegraphs to Parry!' },
          { x: 1220, title: 'Zone II: Bramble Fence Crossfire', subtitle: 'Dash Through Bruisers to Strike Ranged Imps' },
          { x: 2320, title: 'Zone III: Shrine of the Harvest', subtitle: 'Defeat the Iron-Tusk Alpha Pack & Claim Pitchfork' },
        ],
        npcs: [
          {
            id: 'npc_1_1_echo',
            name: 'Barnaby’s Astral Echo',
            role: 'Memory of the Night the Relic Shattered',
            sprite: 'villager_farmer',
            x: 310,
            facing: 1,
            dialogue: [
              '"When Seraphina shattered the Harvest Anchor Relic, golden embers rained upon these fields and drove the boar herds into a blood frenzy."',
              '"Watch their hooves! When a boar crouches back and flashes gold-red, tap Attack [Space / Click] to stun it with a Golden Parry, or press [Shift] to Ghost Dash behind it!"',
            ],
          },
        ],
        doors: [
          {
            id: 'return_hub_1_1',
            targetStageId: 'sanctuary',
            x: 110,
            width: 90,
            title: 'SANCTUARY PORTAL',
            subtitle: 'Return to Castle Hub',
            wing: 0,
            crystalColor: '#38bdf8',
          },
          {
            id: 'exit_hub_1_1',
            targetStageId: 'sanctuary',
            x: 2980,
            width: 96,
            title: 'SANCTUARY GATE',
            subtitle: 'Return with Spirit Pitchfork',
            wing: 0,
            crystalColor: '#f59e0b',
          },
        ],
        hazards: [
          { id: 'haz_1_1_a', type: 'thorns', x: 960, width: 135, damage: 1, label: 'Thorn Brambles' },
          { id: 'haz_1_1_b', type: 'thorns', x: 1840, width: 150, damage: 1, label: 'Thorn Brambles' },
        ],
        enemies: [
          // Wave 1 (Zone I)
          makeEnemy('e_11_1', 'Feral Furrow Boar', 'wild_boar', 'bruiser', 680, 72, 175, 1, 1),
          makeEnemy('e_11_2', 'Orchard Imp Scout', 'forest_imp', 'ranged', 840, 56, 138, 1, 1),
          makeEnemy('e_11_2b', 'Mire Bristle Boar', 'wild_boar', 'bruiser', 1140, 78, 180, 1, 1),
          // Wave 2 (Zone II)
          makeEnemy('e_11_3', 'Rabid Tusk Boar', 'wild_boar', 'bruiser', 1460, 88, 185, 1, 2),
          makeEnemy('e_11_4', 'Bramble Hex Imp', 'forest_imp', 'ranged', 1640, 64, 142, 1, 2),
          makeEnemy('e_11_5', 'Haystack Wisp Phantom', 'wisp_phantom', 'flier', 1760, 62, 155, 1, 2),
          // Wave 3 (Zone III Shrine Guards)
          makeEnemy('e_11_6', 'Iron-Tusk Pack Leader', 'armored_boar', 'bruiser', 2360, 145, 195, 1, 3, {
            renderHeight: 142,
          }),
          makeEnemy('e_11_7', 'Harvest Hex Imp', 'forest_imp', 'ranged', 2520, 68, 148, 1, 3),
          makeEnemy('e_11_8', 'Reaper Wisp', 'wisp_phantom', 'flier', 2620, 66, 160, 1, 3),
        ],
        shrines: [
          {
            id: 'shrine_pitchfork',
            name: 'Spirit Pitchfork (Weapon 2)',
            description: 'Unlocked Weapon [2]: Long-reach spectral trident of the Harvest!',
            x: 2790,
            collected: false,
            rewardType: 'weapon',
            weaponId: 2,
            color: '#38bdf8',
          },
        ],
      };

    // =========================================================================
    // WING 1 - DOOR 1-2: THE ORCHARD AMBUSH (Wind-Stride Charm)
    // =========================================================================
    case 'stage_1_2':
      return {
        id: 'stage_1_2',
        title: 'Wing 1-2 · The Orchard Ambush',
        subtitle: 'Withered Apple Boughs · Claim the Wind-Stride Charm',
        wing: 1,
        theme: 'farmland',
        width: 3250,
        spawnX: 160,
        zones: [
          { x: 160, title: 'Zone I: Withered Cider Boughs', subtitle: 'Reflect Imp Orbs Back with Soul-Reflect Parry!' },
          { x: 1280, title: 'Zone II: Hollow Windmill Gauntlet', subtitle: 'Shadow Stalkers & Armored Boar Chargers' },
          { x: 2420, title: 'Zone III: Altar of the Gale', subtitle: 'Purge the Vanguard & Claim Wind-Stride Charm' },
        ],
        npcs: [
          {
            id: 'npc_1_2_echo',
            name: 'Elira’s Caravan Echo',
            role: 'Memory of the Orchard Evacuation',
            sprite: 'villager_merchant',
            x: 300,
            facing: 1,
            dialogue: [
              '"Beyond these dead apple trees lies the Wind-Stride Charm, forged by the old Windmill Guild."',
              '"Once claimed, your Ghost Dash cooldown drops by 40%—letting you phase through armored charges and thorn trenches with ease!"',
            ],
          },
        ],
        doors: [
          {
            id: 'return_hub_1_2',
            targetStageId: 'sanctuary',
            x: 110,
            width: 90,
            title: 'SANCTUARY PORTAL',
            subtitle: 'Return to Castle Hub',
            wing: 0,
            crystalColor: '#38bdf8',
          },
          {
            id: 'exit_hub_1_2',
            targetStageId: 'sanctuary',
            x: 3080,
            width: 96,
            title: 'SANCTUARY GATE',
            subtitle: 'Return with Wind-Stride Charm',
            wing: 0,
            crystalColor: '#f59e0b',
          },
        ],
        hazards: [
          { id: 'haz_1_2_a', type: 'thorns', x: 840, width: 145, damage: 1, label: 'Orchard Brambles' },
          { id: 'haz_1_2_b', type: 'thorns', x: 1620, width: 160, damage: 1, label: 'Orchard Brambles' },
          { id: 'haz_1_2_c', type: 'thorns', x: 2240, width: 140, damage: 1, label: 'Orchard Brambles' },
        ],
        enemies: [
          // Wave 1
          makeEnemy('e_12_1', 'Orchard Shadow Stalker', 'shadow_stalker', 'flier', 620, 82, 175, 1, 1),
          makeEnemy('e_12_2', 'Venom Cider Imp', 'forest_imp', 'ranged', 770, 68, 145, 1, 1),
          makeEnemy('e_12_2b', 'Root-Tusk Boar', 'wild_boar', 'bruiser', 1080, 92, 185, 1, 1),
          // Wave 2
          makeEnemy('e_12_3', 'Windmill Bruiser Boar', 'wild_boar', 'bruiser', 1420, 98, 190, 1, 2),
          makeEnemy('e_12_4', 'Lantern Wisp Phantom', 'wisp_phantom', 'flier', 1560, 74, 165, 1, 2),
          makeEnemy('e_12_5', 'Bough Sniper Imp', 'forest_imp', 'ranged', 1920, 72, 150, 1, 2),
          // Wave 3
          makeEnemy('e_12_6', 'Armored Orchard Vanguard', 'armored_boar', 'bruiser', 2480, 165, 198, 1, 3, {
            renderHeight: 146,
          }),
          makeEnemy('e_12_7', 'Dusk Wing Stalker', 'shadow_stalker', 'flier', 2640, 88, 180, 1, 3),
        ],
        shrines: [
          {
            id: 'shrine_wind_stride',
            name: 'Wind-Stride Charm',
            description: 'Relic Acquired: Ghost Dash cooldown reduced by 40% & movement speed increased!',
            x: 2880,
            collected: false,
            rewardType: 'relic',
            relicId: 'wind_stride_charm',
            color: '#34d399',
          },
        ],
      };

    // =========================================================================
    // WING 1 - DOOR 1-3: THE BARN ALPHA BOSS (Golden Heart Vessel & Amber Seal)
    // =========================================================================
    case 'stage_1_3':
      return {
        id: 'stage_1_3',
        title: 'Wing 1-3 · The Barn Alpha Boss',
        subtitle: 'Blood-Moon Barn Arena · Defeat Ghorg, The Armored Barn Alpha',
        wing: 1,
        theme: 'farmland',
        width: 2850,
        spawnX: 160,
        zones: [
          { x: 160, title: 'Zone I: Blood-Stained Homestead', subtitle: 'Breach the Barn Outer Guard' },
          { x: 1080, title: 'Zone II: Shattered Barn Threshold', subtitle: 'Prepare for the Wing I Boss' },
          { x: 1820, title: 'Zone III: Ghorg, The Armored Barn Alpha', subtitle: 'Parry His Charge & Jump Over Ground Slams!' },
        ],
        npcs: [
          {
            id: 'npc_1_3_echo',
            name: 'Barnaby’s Warning Spirit',
            role: 'Last Stand at the Great Barn',
            sprite: 'villager_farmer',
            x: 310,
            facing: 1,
            dialogue: [
              '"Ahead lies Ghorg, our prized Great Boar—now encased in cursed black iron with the Amber Crystal Seal embedded in his brow!"',
              '"Below 50% health he enters an ENRAGED frenzy, leaping into ground-shaking shockwave slams. Float-jump over the orange shockwaves and Parry his tusk charge!"',
            ],
          },
        ],
        doors: [
          {
            id: 'return_hub_1_3',
            targetStageId: 'sanctuary',
            x: 110,
            width: 90,
            title: 'SANCTUARY PORTAL',
            subtitle: 'Return to Castle Hub',
            wing: 0,
            crystalColor: '#38bdf8',
          },
          {
            id: 'exit_hub_1_3',
            targetStageId: 'sanctuary',
            x: 2680,
            width: 96,
            title: 'SANCTUARY GATE',
            subtitle: 'Socket the Amber Crystal in the Grand Gate',
            wing: 0,
            crystalColor: '#f59e0b',
          },
        ],
        hazards: [
          { id: 'haz_1_3_a', type: 'spikes', x: 960, width: 130, damage: 1, label: 'Broken Harrow Spikes' },
        ],
        enemies: [
          makeEnemy('e_13_1', 'Barn Guard Boar', 'wild_boar', 'bruiser', 640, 92, 185, 1, 1),
          makeEnemy('e_13_2', 'Rafter Hex Imp', 'forest_imp', 'ranged', 810, 74, 148, 1, 1),
          makeEnemy('e_13_3', 'Cursed Barn Wisp', 'wisp_phantom', 'flier', 1240, 80, 168, 1, 2),
          makeEnemy('e_13_4', 'Iron-Hide Boar', 'armored_boar', 'bruiser', 1390, 130, 185, 1, 2, {
            renderHeight: 138,
          }),
          // WING 1 BOSS: Armored Barn Alpha
          makeEnemy('boss_barn_alpha', 'Ghorg, The Armored Barn Alpha', 'armored_boar', 'boss', 2080, 380, 205, 1, 3, {
            isBoss: true,
            width: 122,
            height: 136,
            renderHeight: 182,
          }),
        ],
        shrines: [
          {
            id: 'shrine_amber_crystal',
            name: 'Amber Crystal Seal & Golden Heart Vessel',
            description: 'Wing I Cleared! +2 Max HP & Amber Seal of the Harvest Recovered!',
            x: 2450,
            collected: false,
            rewardType: 'crystal',
            crystalKey: 'amber',
            relicId: 'golden_heart_vessel',
            color: '#f59e0b',
          },
        ],
      };

    // =========================================================================
    // WING 2: WHISPERING GROVE GAUNTLET & ELDER TREANT BOSS (Emerald Seal)
    // =========================================================================
    case 'stage_2_1':
      return {
        id: 'stage_2_1',
        title: 'Wing II · The Whispering Grove',
        subtitle: 'Multi-Zone Sylvan Gauntlet & Elder Treant Boss (Emerald Seal)',
        wing: 2,
        theme: 'forest',
        width: 3250,
        spawnX: 160,
        zones: [
          { x: 160, title: 'Zone I: Moon-Moss Hollow', subtitle: 'Shadow Stalkers & Bramble Trenches' },
          { x: 1250, title: 'Zone II: Root-Bound Shrine', subtitle: 'Claim the Bramble-Thorn Whip [3]' },
          { x: 2250, title: 'Zone III: Sylvanazar, Elder Treant Golem', subtitle: 'Warden of the Emerald Seal' },
        ],
        npcs: [
          {
            id: 'npc_2_1_echo',
            name: 'Elira’s Grove Chronicle',
            role: 'Secret of the Royal Arcanist',
            sprite: 'villager_merchant',
            x: 310,
            facing: 1,
            dialogue: [
              '"In these ancient woods, Seraphina once studied alongside the druids of the Grove Anchor Relic."',
              '"When an Abyssal Rift cracked open beneath Castle Ghostreach’s throne room, she begged the King to evacuate—but the court refused. Desperate, she seized the Relics herself..."',
            ],
          },
        ],
        doors: [
          {
            id: 'return_hub_2_1',
            targetStageId: 'sanctuary',
            x: 110,
            width: 90,
            title: 'SANCTUARY PORTAL',
            subtitle: 'Return to Castle Hub',
            wing: 0,
            crystalColor: '#10b981',
          },
          {
            id: 'exit_hub_2_1',
            targetStageId: 'sanctuary',
            x: 3060,
            width: 96,
            title: 'SANCTUARY GATE',
            subtitle: 'Socket the Emerald Crystal in the Grand Gate',
            wing: 0,
            crystalColor: '#10b981',
          },
        ],
        hazards: [
          { id: 'haz_2_1_a', type: 'thorns', x: 820, width: 155, damage: 1, label: 'Sylvan Thorn Pit' },
          { id: 'haz_2_1_b', type: 'thorns', x: 1740, width: 170, damage: 1, label: 'Sylvan Thorn Pit' },
        ],
        enemies: [
          makeEnemy('e_21_1', 'Grove Shadow Stalker', 'shadow_stalker', 'flier', 620, 95, 185, 1, 1),
          makeEnemy('e_21_2', 'Thorn Bough Imp', 'forest_imp', 'ranged', 770, 78, 155, 1, 1),
          makeEnemy('e_21_3', 'Hollow Skull Wisp', 'wisp_phantom', 'flier', 1180, 88, 175, 1, 2),
          makeEnemy('e_21_4', 'Ancient Root Golem', 'treant_golem', 'bruiser', 1420, 165, 165, 1, 2, {
            renderHeight: 152,
          }),
          makeEnemy('e_21_5', 'Canopy Stalker', 'shadow_stalker', 'flier', 1980, 98, 185, 1, 3),
          // WING 2 BOSS: Elder Treant Golem
          makeEnemy('boss_treant', 'Sylvanazar, Elder Treant Golem', 'treant_golem', 'boss', 2420, 440, 185, 1, 3, {
            isBoss: true,
            width: 118,
            height: 152,
            renderHeight: 196,
          }),
        ],
        shrines: [
          {
            id: 'shrine_whip',
            name: 'Bramble-Thorn Whip (Weapon 3)',
            description: 'Unlocked Weapon [3]: Long-range Sylvan lash!',
            x: 1580,
            collected: false,
            rewardType: 'weapon',
            weaponId: 3,
            color: '#34d399',
          },
          {
            id: 'shrine_emerald_crystal',
            name: 'Emerald Crystal Seal of the Grove',
            description: 'Wing II Cleared! Emerald Seal Recovered (2/3)!',
            x: 2820,
            collected: false,
            rewardType: 'crystal',
            crystalKey: 'emerald',
            color: '#10b981',
          },
        ],
      };

    // =========================================================================
    // WING 3: OBSIDIAN FOUNDRY & FALLEN CAPTAIN BOSS (Sapphire Seal)
    // =========================================================================
    case 'stage_3_1':
      return {
        id: 'stage_3_1',
        title: 'Wing III · The Obsidian Foundry',
        subtitle: 'Magma Forge Gauntlet & Captain Vaelen, The Obsidian Knight',
        wing: 3,
        theme: 'cavern',
        width: 3300,
        spawnX: 160,
        zones: [
          { x: 160, title: 'Zone I: Molten Sluiceway', subtitle: 'Float-Hover Over Magma Pools & Slimes' },
          { x: 1260, title: 'Zone II: Anvil of the Titans', subtitle: 'Claim the Runic Warhammer [4] & Flail [5]' },
          { x: 2280, title: 'Zone III: Captain Vaelen, Obsidian Knight', subtitle: 'Sworn Defender of the Sapphire Seal' },
        ],
        npcs: [
          {
            id: 'npc_3_1_echo',
            name: 'Torvin’s Forge Spirit',
            role: 'Oath of Captain Vaelen',
            sprite: 'villager_miner',
            x: 310,
            facing: 1,
            dialogue: [
              '"Captain Vaelen willingly let Seraphina bind his soul into that suit of runic obsidian armor so no creature could breach the third seal."',
              '"Claim the Runic Warhammer at the mid-forge anvil—its crushing weight shatters stone golems and matches Vaelen’s greatsword!"',
            ],
          },
        ],
        doors: [
          {
            id: 'return_hub_3_1',
            targetStageId: 'sanctuary',
            x: 110,
            width: 90,
            title: 'SANCTUARY PORTAL',
            subtitle: 'Return to Castle Hub',
            wing: 0,
            crystalColor: '#3b82f6',
          },
          {
            id: 'exit_hub_3_1',
            targetStageId: 'sanctuary',
            x: 3120,
            width: 96,
            title: 'SANCTUARY GATE',
            subtitle: 'Socket the Sapphire Crystal in the Grand Gate',
            wing: 0,
            crystalColor: '#3b82f6',
          },
        ],
        hazards: [
          { id: 'haz_3_1_a', type: 'lava', x: 820, width: 155, damage: 1, label: 'Molten Magma Pool' },
          { id: 'haz_3_1_b', type: 'spikes', x: 1420, width: 140, damage: 1, label: 'Obsidian Floor Spikes' },
          { id: 'haz_3_1_c', type: 'lava', x: 1880, width: 160, damage: 1, label: 'Molten Magma Pool' },
        ],
        enemies: [
          makeEnemy('e_31_1', 'Cinder Magma Slime', 'magma_slime', 'bruiser', 610, 105, 160, 1, 1, {
            renderHeight: 98,
          }),
          makeEnemy('e_31_2', 'Basalt Rock Golem', 'rock_golem', 'bruiser', 1060, 165, 165, 1, 1, {
            renderHeight: 146,
          }),
          makeEnemy('e_31_3', 'Forge Wisp Phantom', 'wisp_phantom', 'flier', 1320, 95, 180, 1, 2),
          makeEnemy('e_31_4', 'Ironclad Rock Golem', 'rock_golem', 'bruiser', 1740, 185, 170, 1, 2, {
            renderHeight: 152,
          }),
          makeEnemy('e_31_5', 'Molten Core Slime', 'magma_slime', 'bruiser', 2080, 115, 170, 1, 3, {
            renderHeight: 102,
          }),
          // WING 3 BOSS: Captain Vaelen, The Obsidian Knight
          makeEnemy(
            'boss_obsidian_knight',
            'Captain Vaelen, The Obsidian Knight',
            'obsidian_knight',
            'boss',
            2480,
            500,
            220,
            1,
            3,
            {
              isBoss: true,
              width: 108,
              height: 148,
              renderHeight: 192,
            }
          ),
        ],
        shrines: [
          {
            id: 'shrine_warhammer',
            name: 'Runic Warhammer (Weapon 4) & Soul-Lantern Flail (Weapon 5)',
            description: 'Unlocked Heavy Weapons [4] & [5]!',
            x: 1610,
            collected: false,
            rewardType: 'weapon',
            weaponId: 4,
            color: '#fb923c',
          },
          {
            id: 'shrine_sapphire_crystal',
            name: 'Sapphire Crystal Seal of the Hearth',
            description: 'Wing III Cleared! Sapphire Seal Recovered (3/3)!',
            x: 2860,
            collected: false,
            rewardType: 'crystal',
            crystalKey: 'sapphire',
            color: '#3b82f6',
          },
        ],
      };

    // =========================================================================
    // GRAND FINAL GATE: WICKED WITCH 3-PHASE FINALE (& SECRET 4TH PHASE)
    // =========================================================================
    case 'stage_4_1':
      return {
        id: 'stage_4_1',
        title: 'The Grand Sanctum · Wicked Witch Finale',
        subtitle: 'Multi-Phase Confrontation for Your Mortal Vessel',
        wing: 4,
        theme: 'spire',
        width: 2400,
        spawnX: 200,
        zones: [
          { x: 200, title: 'The Astral Threshold', subtitle: 'Your Captive Mortal Vessel Floats Ahead' },
          { x: 1150, title: 'Seraphina, The Wicked Witch', subtitle: '3-Phase Arcane Finale — Reflect Her Orbs!' },
        ],
        npcs: [],
        doors: [
          {
            id: 'return_hub_4_1',
            targetStageId: 'sanctuary',
            x: 110,
            width: 90,
            title: 'SANCTUARY PORTAL',
            subtitle: 'Return to Castle Hub',
            wing: 0,
            crystalColor: '#c084fc',
          },
        ],
        hazards: [],
        enemies: [
          makeEnemy('boss_wicked_witch', 'Seraphina, The Wicked Witch (Phase I)', 'wicked_witch', 'boss', 1450, 360, 215, 1, 2, {
            isBoss: true,
            width: 94,
            height: 144,
            renderHeight: 180,
            maxBossPhases: 3,
          }),
        ],
        shrines: [],
      };

    default:
      return buildStage('sanctuary', clearedStages, crystals);
  }
}
