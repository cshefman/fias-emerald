// Small internal dice engine (brief §9). No external dice library.
import type { DamageType, DieRoll, Effect } from "./types";

/** Injectable RNG so tests are deterministic; defaults to Math.random. */
export type Rng = () => number;
export const defaultRng: Rng = Math.random;

/** Roll n dice of `sides` → faces + sum. n=0 yields an empty roll. */
export function roll(n: number, sides: number, rng: Rng = defaultRng): DieRoll {
  if (n < 0 || sides < 1) throw new Error(`bad dice: ${n}d${sides}`);
  const faces: number[] = [];
  for (let i = 0; i < n; i++) faces.push(1 + Math.floor(rng() * sides));
  return { faces, sum: faces.reduce((a, b) => a + b, 0) };
}

/**
 * Per-target multiplier: roll the same NdM separately for each of K targets.
 * Returns flattened faces and the grand total. K=0 → empty (brief §9).
 */
export function rollPerTarget(n: number, sides: number, targets: number, rng: Rng = defaultRng): DieRoll {
  const faces: number[] = [];
  for (let t = 0; t < Math.max(0, targets); t++) faces.push(...roll(n, sides, rng).faces);
  return { faces, sum: faces.reduce((a, b) => a + b, 0) };
}

/** Parse "NdM" (e.g. "4d8", "1d6") → [n, sides]. */
export function parseDice(formula: string): [number, number] {
  const m = /^(\d+)d(\d+)$/i.exec(formula.trim());
  if (!m) throw new Error(`cannot parse dice formula: ${formula}`);
  return [Number(m[1]), Number(m[2])];
}

/** Builder that assembles a power's effects and tallies damage vs heal separately. */
export class RollBuilder {
  readonly effects: Effect[] = [];
  constructor(private readonly rng: Rng = defaultRng) {}

  /** A rolled effect line. `faces` may be supplied (manual-override entry) instead of rolled. */
  add(opts: {
    label: string;
    n: number;
    sides: number;
    type: DamageType;
    /** number of targets for the per-target multiplier; omit/1 for a single roll. */
    targets?: number;
    modifier?: number;
    heal?: boolean;
    note?: string;
    /** Pre-supplied faces (e.g. physical dice). Bypasses the RNG. */
    faces?: number[];
  }): this {
    const targets = opts.targets ?? 1;
    const modifier = opts.modifier ?? 0;
    const formula =
      targets === 1 ? `${opts.n}d${opts.sides}` : `${opts.n}d${opts.sides} × ${targets}`;
    const r =
      opts.faces !== undefined
        ? { faces: opts.faces, sum: opts.faces.reduce((a, b) => a + b, 0) }
        : opts.targets !== undefined
          ? rollPerTarget(opts.n, opts.sides, targets, this.rng)
          : roll(opts.n, opts.sides, this.rng);
    this.effects.push({
      label: opts.label,
      formula: modifier ? `${formula}${modifier >= 0 ? "+" : ""}${modifier}` : formula,
      faces: r.faces,
      modifier,
      subtotal: r.sum + modifier,
      type: opts.type,
      heal: opts.heal ?? false,
      rolling: true,
      note: opts.note,
    });
    return this;
  }

  /** A non-rolling reminder row (e.g. a field bonus). Never contributes to totals. */
  reminder(label: string, note: string, type: DamageType = "generic"): this {
    this.effects.push({
      label,
      formula: note,
      faces: [],
      modifier: 0,
      subtotal: null,
      type,
      heal: false,
      rolling: false,
      note: undefined,
    });
    return this;
  }

  build() {
    let damageTotal = 0;
    let healTotal = 0;
    for (const e of this.effects) {
      if (e.subtotal === null) continue;
      if (e.heal) healTotal += e.subtotal;
      else damageTotal += e.subtotal;
    }
    return { effects: this.effects, damageTotal, healTotal };
  }
}
