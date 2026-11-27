/**
 * Deeper Story Arc, Between-Wing Narrative Beats & Dual Ending Choice Definitions
 */

import { SpriteKey } from '../engine/spriteLoader';

export interface StoryDialogueLine {
  speaker: string;
  portrait: SpriteKey;
  text: string;
}

export interface StoryBeat {
  id: 'after_wing_1' | 'after_wing_2' | 'after_wing_3' | 'witch_defeated_choice';
  title: string;
  subtitle: string;
  lines: StoryDialogueLine[];
}

export const STORY_BEATS: Record<StoryBeat['id'], StoryBeat> = {
  after_wing_1: {
    id: 'after_wing_1',
    title: 'Echo in the Sanctuary: The Living Lock',
    subtitle: 'Amber Seal of the Harvest Restored (1/3)',
    lines: [
      {
        speaker: 'Seraphina, The Wicked Witch (Astral Projection)',
        portrait: 'portrait_witch',
        text: '"So, little phantom... you freed the Barn Alpha and claimed the Amber Seal of the Harvest. Do not celebrate yet."',
      },
      {
        speaker: 'Seraphina, The Wicked Witch (Astral Projection)',
        portrait: 'portrait_witch',
        text: '"Your mortal body hangs behind the Grand Gate as its living anchor. Every seal you break draws the deeper shadow closer to waking!"',
      },
      {
        speaker: 'Little Ghost (You)',
        portrait: 'portrait_ghost',
        text: 'The Amber Crystal hums warmly in the Grand Gate socket. Whatever she hides behind those doors, the Whispering Grove of Wing II awaits next.',
      },
    ],
  },

  after_wing_2: {
    id: 'after_wing_2',
    title: 'Memory Fragment: The Royal Arcanist',
    subtitle: 'Emerald Seal of the Grove Restored (2/3)',
    lines: [
      {
        speaker: 'Shattered Memory Crystal',
        portrait: 'portrait_witch',
        text: 'An echo from decades past flickers across the Sanctuary flagstones—showing Seraphina not as a witch, but wearing the white mantle of Castle Ghostreach’s Royal Arcanist.',
      },
      {
        speaker: 'Arch-Arcanist Seraphina (Memory Echo)',
        portrait: 'portrait_witch',
        text: '"The Abyssal Blight beneath the throne cannot be slain by mortal steel. If I fracture the three Anchor Relics and sever our souls from flesh, the Blight will starve..."',
      },
      {
        speaker: 'Little Ghost (You)',
        portrait: 'portrait_ghost',
        text: 'She enacted the curse to cage an ancient shadow—yet the spell twisted her mind into tyranny. Only the Sapphire Seal in the Obsidian Foundry remains.',
      },
    ],
  },

  after_wing_3: {
    id: 'after_wing_3',
    title: 'Oath of the Fallen Captain',
    subtitle: 'Sapphire Seal of the Hearth Restored (3/3)',
    lines: [
      {
        speaker: 'Captain Vaelen, The Obsidian Knight',
        portrait: 'obsidian_knight',
        text: '"Halt, spectral envoy. For thirty winters I stood guard over the Sapphire Seal of the Hearth, bound in cursed black iron by Seraphina’s decree."',
      },
      {
        speaker: 'Captain Vaelen, The Obsidian Knight',
        portrait: 'obsidian_knight',
        text: '"Your blade carries the light of the old kingdom, and your parry broke my molten fury. Take the final Sapphire Seal—and grant our former Arcanist peace."',
      },
      {
        speaker: 'Little Ghost (You)',
        portrait: 'portrait_ghost',
        text: 'All three crystals—Amber, Emerald, and Sapphire—blaze within the Grand Final Gate! The Inner Sanctum of the Wicked Witch now stands open.',
      },
    ],
  },

  witch_defeated_choice: {
    id: 'witch_defeated_choice',
    title: 'The Shattered Vessel at the Threshold',
    subtitle: 'Seraphina Falls — Two Destinies Await',
    lines: [
      {
        speaker: 'Seraphina, Royal Arcanist (Unbound)',
        portrait: 'portrait_witch',
        text: '"The violet fog lifts from my eyes... Thank you, brave envoy. Your mortal vessel lies before you, ready to receive your soul once more."',
      },
      {
        speaker: 'Seraphina, Royal Arcanist (Unbound)',
        portrait: 'portrait_witch',
        text: '"Yet know this: if you reclaim your mortal body now, the remnant of the Abyssal Curse will fade slowly over generations. Or you may remain a spirit and ABSORB THE CURSE to destroy its core forever!"',
      },
    ],
  },
};
