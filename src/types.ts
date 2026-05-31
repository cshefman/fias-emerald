// Core domain types for Fia's Emerald.

export type TierKey = "base" | "enhanced" | "superior" | "ultimate";
export const TIER_ORDER: TierKey[] = ["base", "enhanced", "superior", "ultimate"];
/** Roman numerals shown in the UI. */
export const TIER_ROMAN: Record<TierKey, string> = {
  base: "I",
  enhanced: "II",
  superior: "III",
  ultimate: "IV",
};
export const TIER_LABEL: Record<TierKey, string> = {
  base: "Base",
  enhanced: "Enhanced",
  superior: "Superior",
  ultimate: "Ultimate",
};

/** 0 = locked (no tier unlocked), 1 = Base … 4 = Ultimate. Matches the 4 tier pips. */
export type TierLevel = 0 | 1 | 2 | 3 | 4;

/** Convert an unlocked tier level (1–4) to its key, or null when locked. */
export function tierKeyFromLevel(level: TierLevel): TierKey | null {
  return level === 0 ? null : TIER_ORDER[level - 1];
}
export function levelFromTierKey(key: TierKey): TierLevel {
  return (TIER_ORDER.indexOf(key) + 1) as TierLevel;
}

export type DamageType = "poison" | "acid" | "cold" | "heal" | "generic";

export type PowerKey = "aeonia" | "thorn" | "feyBlossom" | "venom" | "cats" | "owl";
export type PowerKind = "active" | "passive";

/** A single dice roll result. */
export interface DieRoll {
  faces: number[];
  sum: number;
}

/**
 * One line in a power's fire result. `rolling: false` marks a non-rolling reminder row
 * (e.g. Static Coral's "+1 die to your Shock spells").
 */
export interface Effect {
  label: string;
  formula: string;
  faces: number[];
  modifier: number;
  subtotal: number | null;
  type: DamageType;
  heal: boolean;
  rolling: boolean;
  /** Extra hint shown under the label, e.g. "CON ½ — halve yourself". */
  note?: string;
}

/** Output contract for any power's fire action (brief §9). */
export interface RollOutput {
  effects: Effect[];
  damageTotal: number;
  healTotal: number;
}

/** Persisted, user-mutable state. */
export interface SaveState {
  version: number;
  /** Character level (player edits this; gates tier unlocks — e.g. Ultimate needs 11). */
  characterLevel: number;
  /** Current Aurum total (player edits this; awarded by the DM). */
  aurumPool: number;
  /** Unlocked tier level per power. */
  unlocked: Record<PowerKey, TierLevel>;
  /** Base-tier Aurum cost (brief Q1 — assumed 1, editable). */
  baseAurumCost: number;
  /** Aurum economy (brief Q2). "spend" deducts on unlock; "threshold" only checks ≥. */
  aurumModel: "spend" | "threshold";
  /** Allow typing physical-dice results instead of rolling (brief §9, default on). */
  manualOverride: boolean;
}
