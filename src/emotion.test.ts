import { describe, expect, it } from "vitest";
import { detectEmotion } from "./emotion";

describe("detectEmotion", () => {
  it("returns null for empty or whitespace-only text", () => {
    expect(detectEmotion("")).toBeNull();
    expect(detectEmotion("   ")).toBeNull();
  });

  it("returns null when nothing in the lexicon matches", () => {
    expect(detectEmotion("the quick brown fox jumps")).toBeNull();
  });

  it("matches laughter keywords and emoji", () => {
    expect(detectEmotion("wkwkwk gila lucu banget")).toBe("laugh");
    expect(detectEmotion("lol that's hilarious 🤣")).toBe("laugh");
  });

  it("matches loving over a weaker secondary signal", () => {
    expect(detectEmotion("aku suka banget sama ini ❤️")).toBe("loving");
  });

  it("matches dizzy from Indonesian slang", () => {
    expect(detectEmotion("pusing banget hari ini 😵")).toBe("dizzy");
  });

  // Regression test: these aggression phrases were silently unmatched
  // (the avatar just kept its previous expression) until "angry" picked up
  // aggressive-action keywords alongside direct anger words.
  it("matches aggressive phrasing as angry, not just direct anger words", () => {
    expect(detectEmotion("mau mukul kamu .. ayo berantem")).toBe("angry");
    expect(detectEmotion("marah banget aku")).toBe("angry");
  });

  it("matches each of the 20 expanded expressions via at least one keyword", () => {
    const cases: Array<[string, string]> = [
      ["sad", "lagi sedih banget"],
      ["crying", "huhu nangis terus"],
      ["sleepy", "ngantuk banget nih"],
      ["confused", "aku bingung deh"],
      ["bored", "bosan banget hari ini"],
      ["smug", "told you so"],
      ["worried", "aku khawatir banget"],
      ["disgusted", "ih jijik banget"],
      ["angelic", "baik banget sih kamu"],
      ["devilish", "jahil banget deh"],
      ["moneyEyes", "banyak cuan nih"],
      ["zany", "gila banget wild abis"],
      ["cool", "santuy aja"],
      ["nerdy", "well actually begini"],
      ["thinking", "hmm coba pikir dulu"],
      ["yawning", "menguap terus aku"],
      ["wink", "just kidding ya"],
      ["excited", "woohoo semangat banget"],
      ["scared", "takut banget aku ngeri"],
      ["embarrassed", "duh malu banget aku"],
    ];

    for (const [expected, text] of cases) {
      expect(detectEmotion(text), `text "${text}"`).toBe(expected);
    }
  });

  it("prefers an emoji match over a plain keyword when both are present", () => {
    // "senang" (happy keyword) appears alongside a stronger starstruck emoji.
    expect(detectEmotion("senang banget ✨✨")).toBe("starstruck");
  });

  it("is case-insensitive for keywords", () => {
    expect(detectEmotion("WKWKWK LUCU BANGET")).toBe("laugh");
  });
});
