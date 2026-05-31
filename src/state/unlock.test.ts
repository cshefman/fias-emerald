import { describe, it, expect } from "vitest";
import { makeSeedState } from "../config";
import { unlockInfo, costForTier } from "./unlock";
import { reducer } from "./store";
import { sanitize } from "./persistence";

describe("unlock gates (brief §8)", () => {
  it("hard level block: Ultimate is locked at level 10 (requires 11)", () => {
    const s = makeSeedState();
    s.unlocked.aeonia = 3; // at Superior, next is Ultimate
    s.aurumPool = 99;
    const info = unlockInfo(s, "aeonia");
    expect(info.nextTier).toBe("ultimate");
    expect(info.ok).toBe(false);
    expect(info.reasons).toContain("Requires level 11");
  });

  it("aurum gate: blocks when pool < cost and reports the shortfall", () => {
    const s = makeSeedState();
    s.unlocked.cats = 1; // next is Enhanced (cost 2)
    s.aurumPool = 1;
    const info = unlockInfo(s, "cats");
    expect(info.cost).toBe(2);
    expect(info.reasons).toContain("Need 2 Aurum");
    expect(info.ok).toBe(false);
  });

  it("passes when level and aurum are sufficient", () => {
    const s = makeSeedState();
    s.unlocked.cats = 1;
    s.aurumPool = 5;
    expect(unlockInfo(s, "cats").ok).toBe(true);
  });

  it("base-tier cost is the editable baseAurumCost", () => {
    const s = makeSeedState();
    s.baseAurumCost = 1;
    expect(costForTier(s, "base")).toBe(1);
    s.baseAurumCost = 0;
    expect(costForTier(s, "base")).toBe(0);
  });
});

describe("reducer: unlock / relock with spend model", () => {
  it("unlock deducts aurum and raises the tier", () => {
    let s = makeSeedState();
    s.unlocked.owl = 0;
    s.aurumPool = 5; // base cost 1
    s = reducer(s, { type: "unlock", power: "owl" });
    expect(s.unlocked.owl).toBe(1);
    expect(s.aurumPool).toBe(4);
  });

  it("unlock is a no-op when gates fail (no aurum change)", () => {
    let s = makeSeedState();
    s.unlocked.aeonia = 3;
    s.aurumPool = 99; // blocked only by level 11
    const before = s.aurumPool;
    s = reducer(s, { type: "unlock", power: "aeonia" });
    expect(s.unlocked.aeonia).toBe(3);
    expect(s.aurumPool).toBe(before);
  });

  it("relock undoes a tier and refunds its cost", () => {
    let s = makeSeedState();
    s.unlocked.cats = 2; // Enhanced (cost 2)
    s.aurumPool = 0;
    s = reducer(s, { type: "relock", power: "cats" });
    expect(s.unlocked.cats).toBe(1);
    expect(s.aurumPool).toBe(2); // refunded
  });

  it("threshold model does not deduct or refund", () => {
    let s = makeSeedState();
    s.aurumModel = "threshold";
    s.unlocked.owl = 0;
    s.aurumPool = 5;
    s = reducer(s, { type: "unlock", power: "owl" });
    expect(s.aurumPool).toBe(5);
  });
});

describe("persistence sanitize", () => {
  it("falls back to seed for garbage", () => {
    const seed = makeSeedState();
    expect(sanitize(null)).toEqual(seed);
    expect(sanitize("nope")).toEqual(seed);
  });

  it("keeps valid unlocked levels and clamps aurum to ≥0", () => {
    const s = sanitize({ aurumPool: -5, unlocked: { aeonia: 4, bogus: 9 } });
    expect(s.aurumPool).toBe(0);
    expect(s.unlocked.aeonia).toBe(4);
    expect(s.unlocked.owl).toBe(0); // filled from seed
  });
});
