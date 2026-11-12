import { describe, expect, it } from "vitest";
import { triggerActivity } from "./coordinator";

// These only exercise the guard clauses that don't touch the DOM (no real
// avatar is registered in this environment), but they're exactly the
// branches a consumer hits by passing a stale ref, a null ref before mount,
// or the same element twice by mistake — all of which should fail quietly
// (return false) rather than throw.
describe("triggerActivity", () => {
  it("returns false when either element is missing", () => {
    const fake = {} as unknown as HTMLElement;
    expect(triggerActivity("hug", null, null)).toBe(false);
    expect(triggerActivity("hug", fake, null)).toBe(false);
    expect(triggerActivity("hug", null, fake)).toBe(false);
  });

  it("returns false when both elements are the same node", () => {
    const fake = {} as unknown as HTMLElement;
    expect(triggerActivity("hug", fake, fake)).toBe(false);
  });

  it("returns false for elements that aren't registered avatars", () => {
    const a = {} as unknown as HTMLElement;
    const b = {} as unknown as HTMLElement;
    expect(triggerActivity("hug", a, b)).toBe(false);
    expect(triggerActivity("not-a-real-scenario", a, b)).toBe(false);
  });
});
