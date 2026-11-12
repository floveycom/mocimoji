import { describe, expect, it } from "vitest";
import { ALL_EXPRESSIONS } from "./LivingAvatar";

// Every rule name used in emotion.ts's lexicon, so this test fails loudly if
// a future expression gets added to one file but not the other (that's
// exactly how the "mukul"/"berantem" gap and the gaze-coupling gap went
// unnoticed earlier — a new expression existed but wasn't fully wired up).
const LEXICON_EXPRESSIONS = [
  "laugh", "loving", "starstruck", "surprised", "shy", "playful", "cute",
  "sad", "crying", "angry", "sleepy", "confused", "bored", "smug",
  "worried", "disgusted", "dizzy", "angelic", "devilish", "moneyEyes",
  "zany", "cool", "nerdy", "thinking", "yawning", "wink", "excited",
  "scared", "embarrassed", "relieved", "touched", "proud", "skeptical",
  "tipsy", "cheeky", "happy",
];

describe("ALL_EXPRESSIONS", () => {
  it("has no duplicate entries", () => {
    expect(new Set(ALL_EXPRESSIONS).size).toBe(ALL_EXPRESSIONS.length);
  });

  it("includes 'blink' plus every renderable expression (37 total)", () => {
    expect(ALL_EXPRESSIONS).toContain("blink");
    expect(ALL_EXPRESSIONS.length).toBe(37);
  });

  it("can render every expression the text-emotion lexicon can match", () => {
    for (const e of LEXICON_EXPRESSIONS) {
      expect(ALL_EXPRESSIONS, e).toContain(e);
    }
  });
});
