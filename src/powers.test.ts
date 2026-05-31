import { describe, it, expect } from "vitest";
import { rollPower, inputsFor, passiveValue, SEASONS } from "./powers";
import type { Rng } from "./dice";

const max: Rng = () => 0.999; // every die rolls its maximum face

describe("Violet Aeonia @ Superior (level 3)", () => {
  it("self-heals 4d8 (separate), and Poison+Acid scale per designated creature", () => {
    const out = rollPower("aeonia", 3, { designated: 2 }, max);
    const [heal, poison, acid] = out.effects;
    expect(heal.heal).toBe(true);
    expect(heal.faces).toHaveLength(4); // 4 hit dice
    expect(poison.type).toBe("poison");
    expect(acid.type).toBe("acid");
    expect(poison.faces).toHaveLength(6); // 3d6 × 2 creatures
    expect(acid.faces).toHaveLength(6);
    expect(out.healTotal).toBe(32); // 4×8, excluded from damage
    expect(out.damageTotal).toBe(36 + 36); // (3d6 max ×2) Poison + (3d6 max ×2) Acid
  });

  it("designated input defaults to 1 and self-heal is raw hit dice (no modifier)", () => {
    const [designated] = inputsFor("aeonia", 1);
    expect(designated.id).toBe("designated");
    expect(designated.val).toBe(1);
    const heal = rollPower("aeonia", 1, { designated: 1 }, max).effects[0];
    expect(heal.faces).toHaveLength(2); // Base self-heal = 2 HD
    expect(heal.modifier).toBe(0);
    expect(heal.subtotal).toBe(16); // 2×8, no modifier
  });

  it("designated = 0 yields no Poison/Acid damage but still heals", () => {
    const out = rollPower("aeonia", 1, { designated: 0 }, max);
    expect(out.effects[1].faces).toHaveLength(0); // poison
    expect(out.effects[2].faces).toHaveLength(0); // acid
    expect(out.damageTotal).toBe(0);
    expect(out.healTotal).toBe(16);
  });

  it("adds non-rolling condition + sludge reminders", () => {
    const out = rollPower("aeonia", 4, { designated: 1 }, max);
    const reminders = out.effects.filter((e) => !e.rolling);
    expect(reminders).toHaveLength(2);
    expect(reminders.some((r) => /Dazed/.test(r.formula))).toBe(true); // Ultimate adds Dazed
    expect(reminders.some((r) => /8 blobs/.test(r.formula))).toBe(true);
  });
});

describe("Fey Blossom seasons", () => {
  it("exposes a season selector input", () => {
    const [season] = inputsFor("feyBlossom", 2);
    expect(season.id).toBe("season");
    expect(season.options).toEqual(SEASONS);
  });

  it("Summer rolls regen as heal (2d6 at Ultimate)", () => {
    const out = rollPower("feyBlossom", 4, { season: 1 }, max);
    const regen = out.effects[0];
    expect(regen.heal).toBe(true);
    expect(regen.faces).toHaveLength(2); // 2d6
    expect(out.healTotal).toBe(12);
    expect(out.damageTotal).toBe(0);
  });

  it("Winter rolls Cold damage (2d8 at Ultimate) plus an effect reminder", () => {
    const out = rollPower("feyBlossom", 4, { season: 3 }, max);
    const cold = out.effects[0];
    expect(cold.type).toBe("cold");
    expect(cold.faces).toHaveLength(2); // 2d8
    expect(out.damageTotal).toBe(16);
    expect(out.effects.some((e) => !e.rolling && /Slowed/.test(e.formula))).toBe(true);
  });

  it("Winter at Base has no Cold dice — only the Chilled reminder", () => {
    const out = rollPower("feyBlossom", 1, { season: 3 }, max);
    expect(out.effects).toHaveLength(1);
    expect(out.effects[0].rolling).toBe(false);
    expect(out.damageTotal).toBe(0);
  });

  it("Spring and Fall are non-rolling reminders", () => {
    expect(rollPower("feyBlossom", 2, { season: 0 }, max).damageTotal).toBe(0);
    expect(rollPower("feyBlossom", 2, { season: 2 }, max).effects[0].rolling).toBe(false);
  });
});

describe("Thorn Barriers", () => {
  it("has no inputs and rolls no dice — a stat-block of reminders", () => {
    expect(inputsFor("thorn", 1)).toEqual([]);
    const out = rollPower("thorn", 3, {}, max);
    expect(out.damageTotal).toBe(0);
    expect(out.healTotal).toBe(0);
    expect(out.effects.every((e) => !e.rolling)).toBe(true);
    expect(out.effects.some((e) => /AC 12/.test(e.formula))).toBe(true); // Superior AC
  });
});

describe("passive values (totals, not additive)", () => {
  it("Cat's Grace Enhanced = +2 DEX total", () => {
    expect(passiveValue("cats", 2)).toBe("+2 DEX");
  });
  it("Owl's Wisdom Ultimate = +4 WIS total", () => {
    expect(passiveValue("owl", 4)).toBe("+4 WIS");
  });
  it("Venomous Blood scales Resistance → Immunity → Absorb → reflect", () => {
    expect(passiveValue("venom", 1)).toBe("Resistance");
    expect(passiveValue("venom", 3)).toBe("Absorb");
    expect(passiveValue("venom", 4)).toBe("Absorb + reflect ½");
  });
  it("locked power shows —", () => {
    expect(passiveValue("venom", 0)).toBe("—");
  });
});
