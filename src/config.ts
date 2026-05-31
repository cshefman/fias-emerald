// Fia's real values + the seeded default save state.
import type { PowerKey, SaveState, TierKey } from "./types";

export const config = {
  character: {
    name: "Fia",
    level: 10,
    class: "Cleric",
    subtitle: "Lvl 10 Cleric",
    hitDie: "d8", // Violet Aeonia self-heal = raw hit dice, NO modifier
    spellSaveDC: 17, // DEX/CON saves against Fia's powers
    proficiencyBonus: 4,
    maxHP: 73, // exists on the sheet; the % gates on Violet Aeonia are read off it, NOT tracked here
  },

  // Aurum unlock economy. Costs match the player's economy (same as the Sapphire build);
  // the rules doc does not specify per-tier costs — see RULES_CONFLICTS.
  aurumCostByTier: { base: 1, enhanced: 2, superior: 3, ultimate: 4 } as Record<TierKey, number>,
  defaultAurumPool: 22, // Fia's banked Aurum (player edits this to their current total)

  // Level gating — HARD BLOCK, straight from the rules doc (Enhanced 6 / Superior 8 / Ultimate 11).
  levelRequirement: { base: 1, enhanced: 6, superior: 8, ultimate: 11 } as Record<TierKey, number>,
} as const;

/** Seeded unlock levels: 0 locked · 1 Base · 2 Enhanced · 3 Superior · 4 Ultimate. */
export const SEED_UNLOCKS: Record<PowerKey, 0 | 1 | 2 | 3 | 4> = {
  aeonia: 0, // Violet Aeonia — locked
  thorn: 0, // Thorn Barriers — locked
  feyBlossom: 0, // Fey Blossom — locked
  venom: 0, // Venomous Blood — locked
  cats: 0, // Cat's Grace — locked
  owl: 0, // Owl's Wisdom — locked
};

export const SAVE_VERSION = 1;

export function makeSeedState(): SaveState {
  return {
    version: SAVE_VERSION,
    characterLevel: config.character.level,
    aurumPool: config.defaultAurumPool,
    unlocked: { ...SEED_UNLOCKS },
    baseAurumCost: config.aurumCostByTier.base,
    aurumModel: "spend",
    manualOverride: true,
  };
}

/**
 * Notes where the app diverges from, or adds to, the rules doc (`Fia's Emerald.docx`,
 * the source of truth). Surfaced here per the build rule to flag rather than silently resolve.
 */
export const RULES_CONFLICTS = [
  {
    power: "aeonia" as PowerKey,
    tier: "base" as TierKey,
    summary:
      "Currency naming: the rules doc labels the unlock currency “AP” (top of the sheet), but this " +
      "app calls it “Aurum” to stay consistent with the Mordewin's Sapphire build. Same resource, " +
      "different label — confirm with the table.",
  },
  {
    power: "aeonia" as PowerKey,
    tier: "base" as TierKey,
    summary:
      "Per-tier Aurum costs (1 / 2 / 3 / 4) are NOT specified in the rules doc; they carry over from " +
      "the player's economy (same as Sapphire). Editable in the Progression view.",
  },
];
