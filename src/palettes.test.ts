import { describe, expect, it } from "vitest";
import { PALETTES, hashSeed } from "./palettes";

describe("PALETTES", () => {
  it("has exactly 32 curated palettes", () => {
    expect(PALETTES.length).toBe(32);
  });

  it("every palette has all required colors as valid hex strings", () => {
    const hex = /^#[0-9A-Fa-f]{6}$/;
    for (const p of PALETTES) {
      expect(p.bgStart).toMatch(hex);
      expect(p.bgEnd).toMatch(hex);
      expect(p.blob1).toMatch(hex);
      expect(p.blob2).toMatch(hex);
      expect(p.blob3).toMatch(hex);
      expect(p.blush).toMatch(hex);
    }
  });
});

describe("hashSeed", () => {
  it("is deterministic for the same seed", () => {
    expect(hashSeed("nadia")).toBe(hashSeed("nadia"));
    expect(hashSeed("budi-123")).toBe(hashSeed("budi-123"));
  });

  it("produces distinct hashes for a sample of different seeds", () => {
    const seeds = ["nadia", "budi", "sari", "rafi", "tasya", "dimas", "guest", "user-1", "user-2"];
    expect(new Set(seeds.map(hashSeed)).size).toBe(seeds.length);
  });

  it("falls back to the same hash as 'guest' for an empty or whitespace seed", () => {
    expect(hashSeed("")).toBe(hashSeed("guest"));
    expect(hashSeed("   ")).toBe(hashSeed("guest"));
  });

  it("always returns a non-negative integer", () => {
    for (const s of ["a", "ab", "nadia", "", "💛", "a very long seed string indeed"]) {
      const h = hashSeed(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
    }
  });
});
