// localStorage persistence with a safe fallback to the seeded default (brief §4).
import { makeSeedState, SAVE_VERSION, SEED_UNLOCKS } from "../config";
import type { PowerKey, SaveState, TierLevel } from "../types";

const STORAGE_KEY = "fias-emerald/v1";
const POWER_KEYS = Object.keys(SEED_UNLOCKS) as PowerKey[];

/** Coerce arbitrary parsed JSON into a valid SaveState, filling gaps from the seed. */
export function sanitize(raw: unknown): SaveState {
  const seed = makeSeedState();
  if (!raw || typeof raw !== "object") return seed;
  const o = raw as Partial<SaveState>;

  const unlocked = { ...seed.unlocked };
  if (o.unlocked && typeof o.unlocked === "object") {
    for (const k of POWER_KEYS) {
      const v = (o.unlocked as Record<string, unknown>)[k];
      if (typeof v === "number" && v >= 0 && v <= 4) unlocked[k] = (v | 0) as TierLevel;
    }
  }

  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;

  return {
    version: SAVE_VERSION,
    characterLevel: Math.max(1, Math.min(20, Math.floor(num(o.characterLevel, seed.characterLevel)))),
    aurumPool: Math.max(0, Math.floor(num(o.aurumPool, seed.aurumPool))),
    unlocked,
    baseAurumCost: Math.max(0, Math.floor(num(o.baseAurumCost, seed.baseAurumCost))),
    aurumModel: o.aurumModel === "threshold" ? "threshold" : "spend",
    manualOverride: typeof o.manualOverride === "boolean" ? o.manualOverride : seed.manualOverride,
  };
}

export function loadState(): SaveState {
  try {
    const txt = localStorage.getItem(STORAGE_KEY);
    if (!txt) return makeSeedState();
    return sanitize(JSON.parse(txt));
  } catch {
    return makeSeedState(); // corrupt store → seed
  }
}

export function saveState(state: SaveState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota — ignore, app still works in-memory */
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Pretty JSON for backup / moving between phone and Surface (brief §4). */
export function exportJSON(state: SaveState): string {
  return JSON.stringify(state, null, 2);
}

/** Parse + sanitize imported JSON; throws on invalid JSON so the UI can report it. */
export function importJSON(text: string): SaveState {
  return sanitize(JSON.parse(text));
}
