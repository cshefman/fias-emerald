// Unlock-gate logic (brief §8). Pure functions so the three gates are unit-testable.
import { config } from "../config";
import { TIER_ORDER, type PowerKey, type SaveState, type TierKey } from "../types";

export function costForTier(state: SaveState, tier: TierKey): number {
  return tier === "base" ? state.baseAurumCost : config.aurumCostByTier[tier];
}

export interface UnlockInfo {
  /** Tier that would be unlocked next, or null if already at Ultimate. */
  nextTier: TierKey | null;
  cost: number;
  levelReq: number;
  /** Blocking reasons (empty ⇒ can unlock). */
  reasons: string[];
  ok: boolean;
}

/**
 * Evaluate the next-tier unlock for a power against all three gates:
 *  1. sequence — implicit: we only ever offer the tier directly above the current one.
 *  2. level    — hard block: character level ≥ required level.
 *  3. aurum    — pool ≥ cost (deducted on unlock when aurumModel = "spend").
 */
export function unlockInfo(state: SaveState, power: PowerKey): UnlockInfo {
  const level = state.unlocked[power];
  if (level >= 4) return { nextTier: null, cost: 0, levelReq: 0, reasons: ["Fully unlocked"], ok: false };

  const nextTier = TIER_ORDER[level]; // level 0 → "base", 1 → "enhanced", …
  const cost = costForTier(state, nextTier);
  const levelReq = config.levelRequirement[nextTier];

  const reasons: string[] = [];
  if (state.characterLevel < levelReq) reasons.push(`Requires level ${levelReq}`);
  if (state.aurumPool < cost) reasons.push(`Need ${cost} Aurum`);

  return { nextTier, cost, levelReq, reasons, ok: reasons.length === 0 };
}

/** The Aurum refunded when undoing (re-locking) the current top tier, under the spend model. */
export function refundForRelock(state: SaveState, power: PowerKey): number {
  const level = state.unlocked[power];
  if (level <= 0) return 0;
  return state.aurumModel === "spend" ? costForTier(state, TIER_ORDER[level - 1]) : 0;
}
