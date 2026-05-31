import { describe, it, expect } from "vitest";
import { roll, rollPerTarget, parseDice, RollBuilder, type Rng } from "./dice";

/** Deterministic RNG cycling through given 0..1 values. */
const seq = (...vals: number[]): Rng => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe("roll(n, sides)", () => {
  it("returns n faces, each within [1, sides], summing correctly", () => {
    for (let trial = 0; trial < 200; trial++) {
      const r = roll(4, 8);
      expect(r.faces).toHaveLength(4);
      for (const f of r.faces) {
        expect(f).toBeGreaterThanOrEqual(1);
        expect(f).toBeLessThanOrEqual(8);
      }
      expect(r.sum).toBe(r.faces.reduce((a, b) => a + b, 0));
    }
  });

  it("n=0 yields an empty roll summing to 0", () => {
    expect(roll(0, 6)).toEqual({ faces: [], sum: 0 });
  });

  it("maps rng 0→min face and ~1→max face", () => {
    expect(roll(1, 6, seq(0)).faces[0]).toBe(1);
    expect(roll(1, 6, seq(0.999)).faces[0]).toBe(6);
  });

  it("rejects invalid dice", () => {
    expect(() => roll(1, 0)).toThrow();
    expect(() => roll(-1, 6)).toThrow();
  });
});

describe("rollPerTarget (per-target multiplier)", () => {
  it("rolls NdM once per target and grand-totals", () => {
    // 1d6 × 3 targets, rng forces all 4s
    const r = rollPerTarget(1, 6, 3, seq(0.5));
    expect(r.faces).toHaveLength(3);
    expect(r.faces.every((f) => f === 4)).toBe(true);
    expect(r.sum).toBe(12);
  });

  it("K=0 targets yields an empty roll", () => {
    expect(rollPerTarget(1, 4, 0)).toEqual({ faces: [], sum: 0 });
  });

  it("2d6 × 2 targets produces 4 faces", () => {
    expect(rollPerTarget(2, 6, 2).faces).toHaveLength(4);
  });
});

describe("parseDice", () => {
  it("parses NdM", () => {
    expect(parseDice("4d8")).toEqual([4, 8]);
    expect(parseDice(" 1d6 ")).toEqual([1, 6]);
  });
  it("throws on garbage", () => {
    expect(() => parseDice("d20")).toThrow();
    expect(() => parseDice("4x8")).toThrow();
  });
});

describe("RollBuilder totals", () => {
  it("excludes heal from the damage total and tallies heal separately", () => {
    const b = new RollBuilder(seq(0.999)); // all max faces
    b.add({ label: "Self-heal", n: 4, sides: 8, type: "heal", heal: true }); // 32
    b.add({ label: "Contact", n: 4, sides: 6, type: "poison" }); // 24
    const out = b.build();
    expect(out.healTotal).toBe(32);
    expect(out.damageTotal).toBe(24);
  });

  it("applies flat modifiers to the subtotal and formula", () => {
    const b = new RollBuilder(seq(0.999));
    b.add({ label: "Weapon", n: 1, sides: 8, type: "poison", modifier: 4 }); // 8 + 4
    const e = b.build().effects[0];
    expect(e.subtotal).toBe(12);
    expect(e.formula).toBe("1d8+4");
  });

  it("per-target multiplier in the builder flattens faces and labels the formula", () => {
    const b = new RollBuilder(seq(0.999));
    b.add({ label: "Funnel tick", n: 1, sides: 6, type: "acid", targets: 2 });
    const e = b.build().effects[0];
    expect(e.faces).toHaveLength(2);
    expect(e.formula).toBe("1d6 × 2");
  });

  it("targets=0 contributes 0 and an empty dice row", () => {
    const b = new RollBuilder(seq(0.999));
    b.add({ label: "Empowered melee", n: 1, sides: 4, type: "poison", targets: 0 });
    const out = b.build();
    expect(out.effects[0].faces).toHaveLength(0);
    expect(out.damageTotal).toBe(0);
  });

  it("reminder rows never contribute to totals", () => {
    const b = new RollBuilder();
    b.reminder("Field bonus", "+1 die to your Shock spells");
    const out = b.build();
    expect(out.effects[0].subtotal).toBeNull();
    expect(out.damageTotal).toBe(0);
    expect(out.healTotal).toBe(0);
  });

  it("accepts manual-override faces instead of rolling", () => {
    const b = new RollBuilder(seq(0)); // rng would give 1s, but faces override
    b.add({ label: "Contact", n: 4, sides: 6, type: "poison", faces: [6, 5, 4, 3] });
    expect(b.build().effects[0].subtotal).toBe(18);
  });
});
