import { describe, expect, it } from "vitest";
import { SCENARIOS, SCENARIO_NAMES } from "./scenarios";

describe("SCENARIO_NAMES / SCENARIOS", () => {
  it("has exactly 20 named activities with no duplicates", () => {
    expect(SCENARIO_NAMES.length).toBe(20);
    expect(new Set(SCENARIO_NAMES).size).toBe(20);
  });

  it("every scenario produces a non-empty, finite, bounded step sequence", () => {
    // Bounded by construction: unlike the gravity-driven scenarios in
    // coordinator.ts (which once got stuck integrating forever — see the
    // MAX_PHYSICS_DURATION_MS safety cap), these use fixed step durations,
    // so total runtime should always be well under a few seconds.
    for (const name of SCENARIO_NAMES) {
      const steps = SCENARIOS[name](1, 0, 60);
      expect(steps.length, name).toBeGreaterThan(0);

      let total = 0;
      for (const step of steps) {
        expect(Number.isFinite(step.durationMs), `${name} step duration`).toBe(true);
        expect(step.durationMs, `${name} step duration`).toBeGreaterThan(0);
        total += step.durationMs;
      }
      expect(total, `${name} total duration`).toBeLessThan(5000);
    }
  });

  it("produces only finite transform values across a range of progress and geometry", () => {
    const geometries: Array<[number, number, number]> = [
      [1, 0, 60],
      [-1, 0, 60],
      [0.6, -0.8, 120],
      [0, 1, 20],
    ];

    for (const name of SCENARIO_NAMES) {
      for (const [ux, uy, dist] of geometries) {
        const steps = SCENARIOS[name](ux, uy, dist);
        for (const step of steps) {
          for (const p of [0, 0.25, 0.5, 0.75, 1]) {
            const eased = step.easing ? step.easing(p) : p;
            for (const frame of [step.a?.(eased), step.b?.(eased)]) {
              if (!frame) continue;
              for (const [key, value] of Object.entries(frame)) {
                expect(Number.isFinite(value), `${name} ${key}`).toBe(true);
              }
            }
          }
        }
      }
    }
  });

  it("does not throw on degenerate geometry (zero distance)", () => {
    for (const name of SCENARIO_NAMES) {
      expect(() => SCENARIOS[name](0, 0, 0)).not.toThrow();
    }
  });
});
