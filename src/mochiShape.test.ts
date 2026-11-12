import { describe, expect, it } from "vitest";
import { mochiPath } from "./mochiShape";

describe("mochiPath", () => {
  it("is deterministic for the same hash", () => {
    expect(mochiPath(12345)).toBe(mochiPath(12345));
  });

  it("returns a well-formed closed SVG path", () => {
    const d = mochiPath(98765);
    expect(d.startsWith("M ")).toBe(true);
    expect(d.trim().endsWith("Z")).toBe(true);
    expect(d).toContain("C ");
  });

  it("produces only finite coordinates across a range of hashes", () => {
    const hashes = [0, 1, 42, 12345, 2 ** 20, 2 ** 30, 0x7fffffff];
    for (const h of hashes) {
      const d = mochiPath(h);
      const numbers = d.match(/-?\d+(\.\d+)?/g) ?? [];
      expect(numbers.length).toBeGreaterThan(0);
      for (const n of numbers) {
        expect(Number.isFinite(Number(n)), `hash ${h}: "${n}" in "${d}"`).toBe(true);
      }
    }
  });

  it("stays close to the requested radius — v3 is meant to read as almost round", () => {
    const cx = 20;
    const cy = 20;
    const r = 19;
    const d = mochiPath(555111, cx, cy, r);
    const coordPairs = d.match(/-?\d+\.\d+ -?\d+\.\d+/g) ?? [];
    expect(coordPairs.length).toBeGreaterThan(0);
    for (const pair of coordPairs) {
      const [x, y] = pair.split(" ").map(Number);
      const dist = Math.hypot(x - cx, y - cy);
      // A much tighter band than a visibly lumpy blob would need — the
      // whole point of v3 is a barely-there wobble.
      expect(dist).toBeGreaterThan(r * 0.9);
      expect(dist).toBeLessThan(r * 1.1);
    }
  });
});
