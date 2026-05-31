// Power dataset (from Fia's Emerald.docx — the source of truth) + roller behaviour.
// See RULES_CONFLICTS in config.ts for notes where the app adds to / re-labels the doc.
import { config } from "./config";
import { RollBuilder, type Rng } from "./dice";
import type { DamageType, PowerKey, PowerKind, RollOutput, TierLevel } from "./types";

/** Fia's hit-die size, used for the Violet Aeonia self-heal (raw HD, no modifier). */
const HIT_DIE = Number(config.character.hitDie.replace(/[^0-9]/g, "")) || 8;

// ----------------------------------------------------------------------------
// Static descriptors (layout, icon, identity)
// ----------------------------------------------------------------------------
export interface PowerMeta {
  key: PowerKey;
  name: string;
  kind: PowerKind;
  /** Icon name mapped to a Tabler component in icons.tsx. */
  icon: string;
  /** Fire-button verb for active powers. */
  fire?: string;
  /** Orbit-node position on the stage, % of stage box. Mirrors the hex tier-map. */
  node: { x: number; y: number };
}

// Node positions read off the hex diagram: actives on the top/right, passives on the left/bottom.
export const POWERS: Record<PowerKey, PowerMeta> = {
  aeonia: { key: "aeonia", name: "Violet Aeonia", kind: "active", icon: "flower", fire: "Bloom the petals", node: { x: 50, y: 7 } },
  thorn: { key: "thorn", name: "Thorn Barriers", kind: "active", icon: "fence", fire: "Raise the barriers", node: { x: 90, y: 35 } },
  feyBlossom: { key: "feyBlossom", name: "Fey Blossom", kind: "active", icon: "plant", fire: "Grow the blossom", node: { x: 86, y: 74 } },
  venom: { key: "venom", name: "Venomous Blood", kind: "passive", icon: "droplet", node: { x: 50, y: 88 } },
  cats: { key: "cats", name: "Cat's Grace", kind: "passive", icon: "cat", node: { x: 14, y: 74 } },
  owl: { key: "owl", name: "Owl's Wisdom", kind: "passive", icon: "feather", node: { x: 10, y: 35 } },
};

/** Short display name used on the orbit nodes. */
export const SHORT_NAME: Record<PowerKey, string> = {
  aeonia: "Violet Aeonia",
  thorn: "Thorn Barriers",
  feyBlossom: "Fey Blossom",
  venom: "Venomous Blood",
  cats: "Cat's Grace",
  owl: "Owl's Wisdom",
};

export const POWER_ORDER: PowerKey[] = ["aeonia", "thorn", "feyBlossom", "venom", "cats", "owl"];

// ----------------------------------------------------------------------------
// Per-tier numbers (index 0 = Base … 3 = Ultimate)
// ----------------------------------------------------------------------------
const aeoniaTiers = {
  selfHealHD: [2, 3, 4, 4], // × Fia's hit die, free, no modifier
  poisonN: [1, 2, 3, 4], // d6 per designated creature
  acidN: [1, 2, 3, 4], // d6 per designated creature
  hpGate: ["≤25%", "≤50%", "≤75%", "any"],
  blobs: [2, 4, 6, 8], // 10×10ft sludge blobs
  conditions: ["Poisoned", "Poisoned + Weakened", "Poisoned + Weakened", "Poisoned + Weakened + Dazed"],
};

const thornTiers = {
  units: [2, 3, 4, 6],
  ac: [10, 10, 12, 12],
  hp: [15, 15, 20, 20],
  resist: ["—", "—", "Piercing & Bludgeoning", "Piercing & Bludgeoning"],
};

const feyTiers = {
  blossoms: [1, 1, 2, 2],
  range: [15, 15, 20, 30], // feet
  summerRegenN: [1, 1, 2, 2],
  summerRegenSides: [4, 6, 4, 6], // 1d4 / 1d6 / 2d4 / 2d6 HP/turn
  winterColdN: [0, 1, 1, 2], // d8 Cold — Base Winter has no damage
  spring: [
    "+2 to attack rolls",
    "+2 to attack rolls & saves",
    "+3 to attack rolls & saves",
    "+4 to attack rolls / saves, and +1 die on a critical hit",
  ],
  fall: [
    "Weakened",
    "Weakened + Poisoned",
    "Weakened + Poisoned + Silenced",
    "Weakened + Poisoned + Silenced (save at disadvantage)",
  ],
  winterEffect: ["Chilled", "Chilled", "Slowed", "Slowed (save at disadvantage)"],
};

const catsDex = ["+1", "+2", "+3", "+4"];
const owlWis = ["+1", "+2", "+3", "+4"];
const venomFx = ["Resistance", "Immunity", "Absorb", "Absorb + reflect ½"];

// ----------------------------------------------------------------------------
// Roller inputs (only what changes the math)
// ----------------------------------------------------------------------------
export interface InputDef {
  id: string;
  label: string;
  val: number;
  min: number;
  max: number;
  /** When present, render as a select; `val` is the chosen index into options. */
  options?: string[];
}

export const SEASONS = ["Spring", "Summer", "Fall", "Winter"];

export function inputsFor(key: PowerKey, _level: TierLevel): InputDef[] {
  if (key === "aeonia")
    return [{ id: "designated", label: "Creatures designated", val: 1, min: 0, max: 12 }];
  if (key === "feyBlossom")
    return [{ id: "season", label: "Season", val: 0, min: 0, max: 3, options: SEASONS }];
  return []; // thorn: no inputs; passives never roll
}

// ----------------------------------------------------------------------------
// Rollers — damage and healing are tallied separately by RollBuilder
// ----------------------------------------------------------------------------
export function rollPower(key: PowerKey, level: TierLevel, inputs: Record<string, number>, rng?: Rng): RollOutput {
  const t = level - 1;
  const b = new RollBuilder(rng);

  if (key === "aeonia") {
    b.add({
      label: "Self-heal (on cast)",
      n: aeoniaTiers.selfHealHD[t],
      sides: HIT_DIE,
      type: "heal",
      heal: true,
      note: `raw ${aeoniaTiers.selfHealHD[t]}${config.character.hitDie} · no modifier`,
    });
    const designated = inputs.designated ?? 0;
    b.add({ label: "Poison", n: aeoniaTiers.poisonN[t], sides: 6, type: "poison", targets: designated, note: "DEX ½ · per designated creature" });
    b.add({ label: "Acid", n: aeoniaTiers.acidN[t], sides: 6, type: "acid", targets: designated, note: "DEX ½ · per designated creature" });
    b.reminder("On a failed CON save", `${aeoniaTiers.conditions[t]} for 1 minute`, "poison");
    b.reminder("Sludge", `${aeoniaTiers.blobs[t]} blobs (10×10ft)${t >= 1 ? ", difficult terrain" : ""}, lasts 1 minute`, "acid");
    return b.build();
  }

  if (key === "thorn") {
    const resist = thornTiers.resist[t];
    b.reminder("Barrier units", `Up to ${thornTiers.units[t]} contiguous units (5ft×10ft) within 30ft`, "generic");
    b.reminder("Each unit", `AC ${thornTiers.ac[t]} · ${thornTiers.hp[t]} HP · Weak to Fire${resist !== "—" ? ` · Resist ${resist}` : ""}`, "generic");
    b.reminder("Upkeep", "Healing one unit heals all connected · lasts 1 hr or dismiss (bonus action)", "generic");
    return b.build();
  }

  if (key === "feyBlossom") {
    const season = inputs.season ?? 0;
    if (season === 1) {
      // Summer — regeneration
      b.add({ label: "Summer · regen", n: feyTiers.summerRegenN[t], sides: feyTiers.summerRegenSides[t], type: "heal", heal: true, note: "per subject, each turn in the field" });
      if (level === 4) b.reminder("Summer (Ultimate)", "Allies are also immune to Poison & Disease", "heal");
    } else if (season === 3) {
      // Winter — chill / cold
      if (feyTiers.winterColdN[t] > 0)
        b.add({ label: "Winter · Cold", n: feyTiers.winterColdN[t], sides: 8, type: "cold", note: `per creature${level === 4 ? " · dealt regardless of save" : ""}` });
      b.reminder("Winter · effect", `${feyTiers.winterEffect[t]} on a failed CON save`, "cold");
    } else if (season === 0) {
      // Spring — buff
      b.reminder("Spring · buff", `You and allies: ${feyTiers.spring[t]}`, "heal");
    } else {
      // Fall — debuff
      b.reminder("Fall · debuff", `Enemies: ${feyTiers.fall[t]} on a failed CON save`, "poison");
    }
    return b.build();
  }

  // passives never roll
  return b.build();
}

// ----------------------------------------------------------------------------
// Informational meta (prereqs + key effects), derived from the active tier
// ----------------------------------------------------------------------------
export function metaFor(key: PowerKey, level: TierLevel): string {
  const t = level - 1;
  if (key === "aeonia")
    return `A spell of desperation — usable at <b>${aeoniaTiers.hpGate[t]} max HP</b>. Recover <b>${aeoniaTiers.selfHealHD[t]}${config.character.hitDie}</b> for free on cast. Designated creatures within <b>30ft</b> take Poison + Acid (DEX save halves). CON save or <b>${aeoniaTiers.conditions[t]}</b>. Leaves <b>${aeoniaTiers.blobs[t]}</b> sludge blobs${t >= 1 ? " (difficult terrain)" : ""}. 1/Day.`;
  if (key === "thorn") {
    const resist = thornTiers.resist[t];
    return `Spends a <b>1st-level slot</b> · Conjure up to <b>${thornTiers.units[t]}</b> thorn units (5ft×10ft) within 30ft. Each: AC <b>${thornTiers.ac[t]}</b>, <b>${thornTiers.hp[t]} HP</b>, Weak to Fire${resist !== "—" ? `, Resist ${resist}` : ""}. Blocks movement & line of sight. 2/short rest.`;
  }
  if (key === "feyBlossom")
    return `Spends a <b>2nd-level slot</b> · Grow <b>${feyTiers.blossoms[t]}</b> Fey Blossom${feyTiers.blossoms[t] > 1 ? "s" : ""} within <b>${feyTiers.range[t]}ft</b> (1 min, 15ft aura). Choose a <b>season</b> below. 2/short rest.`;
  return "";
}

/** Current effect string for a passive at a tier; "—" when locked. */
export function passiveValue(key: PowerKey, level: TierLevel): string {
  if (level === 0) return "—";
  const t = level - 1;
  if (key === "cats") return `${catsDex[t]} DEX`;
  if (key === "owl") return `${owlWis[t]} WIS`;
  if (key === "venom") return venomFx[t];
  return "";
}

// ----------------------------------------------------------------------------
// Tier reference for the progression view (doc § tables)
// ----------------------------------------------------------------------------
export interface TierRefRow {
  field: string;
  values: [string, string, string, string]; // Base, Enhanced, Superior, Ultimate
}

export const TIER_REFERENCE: Record<PowerKey, TierRefRow[]> = {
  aeonia: [
    { field: "HP gate", values: ["≤25%", "≤50%", "≤75%", "any"] },
    { field: "Self-heal", values: ["2d8", "3d8", "4d8", "4d8"] },
    { field: "Poison", values: ["1d6", "2d6", "3d6", "4d6"] },
    { field: "Acid", values: ["1d6", "2d6", "3d6", "4d6"] },
    { field: "Sludge blobs", values: ["2", "4", "6", "8"] },
    { field: "Conditions (CON)", values: ["Poisoned", "+Weakened", "+Weakened", "+Dazed"] },
  ],
  thorn: [
    { field: "Units", values: ["2", "3", "4", "6"] },
    { field: "AC", values: ["10", "10", "12", "12"] },
    { field: "HP", values: ["15", "15", "20", "20"] },
    { field: "Resistances", values: ["—", "—", "Pierce/Bludgeon", "Pierce/Bludgeon"] },
    { field: "Weakness", values: ["Fire", "Fire", "Fire", "Fire"] },
  ],
  feyBlossom: [
    { field: "Blossoms", values: ["1", "1", "2", "2"] },
    { field: "Range", values: ["15ft", "15ft", "20ft", "30ft"] },
    { field: "Summer regen", values: ["1d4", "1d6", "2d4", "2d6"] },
    { field: "Winter Cold", values: ["—", "1d8", "1d8", "2d8"] },
    { field: "Spring buff", values: ["+2 atk", "+2 atk/save", "+3 atk/save", "+4 +crit"] },
    { field: "Fall / Winter CC", values: ["Weak / Chill", "+Pois / +Cold", "+Silence / Slow", "Disadv saves"] },
  ],
  cats: [{ field: "DEX bonus (total)", values: ["+1", "+2", "+3", "+4"] }],
  owl: [{ field: "WIS bonus (total)", values: ["+1", "+2", "+3", "+4"] }],
  venom: [{ field: "Poison affinity", values: ["Resistance", "Immunity", "Absorb", "Absorb + reflect ½"] }],
};

/** Chip colour mapping for damage types (CSS classes in components.css). */
export const TYPE_CLASS: Record<DamageType, string> = {
  poison: "poison",
  acid: "acid",
  cold: "cold",
  heal: "heal",
  generic: "",
};
