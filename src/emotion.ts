import type { Expression } from "./types";

interface EmotionRule {
  expression: Expression;
  keywords: string[];
  emoji: string[];
}

// Lightweight, local, zero-dependency emotion lexicon (English + Indonesian).
// Runs synchronously in the browser with no network call and no API key.
// This is a heuristic, not a real NLP model — good enough for picking a
// reaction expression, not for anything that needs real sentiment accuracy.
const RULES: EmotionRule[] = [
  {
    expression: "laugh",
    keywords: ["haha", "hehe", "hihi", "wkwk", "lol", "lmao", "rofl", "ngakak", "kocak", "lucu banget"],
    emoji: ["😂", "🤣", "😹", "😆"],
  },
  {
    expression: "loving",
    keywords: ["love", "cinta", "sayang", "suka banget", "i love", "mantul"],
    emoji: ["❤️", "😍", "🥰", "😘", "💕", "💖", "💗", "💘"],
  },
  {
    expression: "starstruck",
    keywords: ["amazing", "awesome", "keren", "gokil", "mantap", "wow banget", "gila keren"],
    emoji: ["✨", "🤩", "⭐", "🌟"],
  },
  {
    expression: "surprised",
    keywords: ["wow", "woah", "whoa", "omg", "wtf", "what", "gila", "astaga", "kaget", "serius"],
    emoji: ["😮", "😲", "😱", "🤯", "😳"],
  },
  {
    expression: "shy",
    keywords: ["blush", "malu", "tersipu", "uwu", "aw man"],
    emoji: ["☺️", "😊", "🙈"],
  },
  {
    expression: "playful",
    keywords: ["gemas", "annoying but cute", "ih gemes"],
    emoji: ["🥹", "😤", "😏"],
  },
  {
    expression: "cute",
    keywords: ["cute", "imut", "adorable", "lucu", "so cute"],
    emoji: ["🥹", "🐰"],
  },
  {
    expression: "sad",
    keywords: ["sad", "sedih", "kecewa", "disappointed", "down", "bummed"],
    emoji: ["😢", "☹️", "🙁"],
  },
  {
    expression: "crying",
    keywords: ["crying", "nangis", "menangis", "huhu", "sobbing", "in tears"],
    emoji: ["😭", "😿", "💔"],
  },
  {
    expression: "angry",
    keywords: [
      "angry", "marah", "kesal", "annoying", "ugh", "kesel", "mad",
      "mukul", "pukul", "berantem", "tonjok", "gelut", "ribut", "bertengkar",
      "punch you", "hit you", "fight you", "i'll fight",
    ],
    emoji: ["😠", "😡", "🤬", "👊"],
  },
  {
    expression: "sleepy",
    keywords: ["sleepy", "ngantuk", "tired", "capek", "yawn", "mengantuk"],
    emoji: ["😴", "🥱", "💤"],
  },
  {
    expression: "confused",
    keywords: ["confused", "bingung", "huh", "what do you mean", "gatau", "nggak ngerti"],
    emoji: ["😕", "🤨", "❓"],
  },
  {
    expression: "bored",
    keywords: ["bored", "bosan", "meh", "whatever", "biasa aja"],
    emoji: ["😑", "😐"],
  },
  {
    expression: "smug",
    keywords: ["smug", "told you", "i knew it", "gitu dong", "kan udah bilang"],
    emoji: ["😏"],
  },
  {
    expression: "worried",
    keywords: ["worried", "khawatir", "cemas", "nervous", "uh oh", "waduh"],
    emoji: ["😟", "😬"],
  },
  {
    expression: "disgusted",
    keywords: ["disgusting", "jijik", "eww", "gross", "ih amit"],
    emoji: ["🤢", "🤮"],
  },
  {
    expression: "dizzy",
    keywords: ["dizzy", "pusing", "mumet", "spinning"],
    emoji: ["😵", "💫"],
  },
  {
    expression: "angelic",
    keywords: ["angel", "malaikat", "so pure", "wholesome", "baik banget"],
    emoji: ["😇", "👼"],
  },
  {
    expression: "devilish",
    keywords: ["evil plan", "jahil", "nakal", "sneaky", "mischief"],
    emoji: ["😈", "👹"],
  },
  {
    expression: "moneyEyes",
    keywords: ["money", "duit", "cuan", "rich", "kaya raya", "profit"],
    emoji: ["💰", "🤑", "💸"],
  },
  {
    expression: "zany",
    keywords: ["crazy", "gila banget", "wild", "unhinged", "chaos"],
    emoji: ["🤪", "🥴"],
  },
  {
    expression: "cool",
    keywords: ["cool", "keren santai", "chill", "santuy"],
    emoji: ["😎"],
  },
  {
    expression: "nerdy",
    keywords: ["nerd", "geek", "actually,", "well actually", "kutu buku"],
    emoji: ["🤓"],
  },
  {
    expression: "thinking",
    keywords: ["hmm", "thinking", "mikir", "let me think", "coba pikir"],
    emoji: ["🤔"],
  },
  {
    expression: "yawning",
    keywords: ["yawning", "menguap", "zzz", "so tired"],
    emoji: ["🥱"],
  },
  {
    expression: "wink",
    keywords: ["wink", "kedip", ";)", "just kidding"],
    emoji: ["😉"],
  },
  {
    expression: "excited",
    keywords: ["excited", "semangat", "can't wait", "yes!!", "woohoo", "let's go"],
    emoji: ["🎉", "🙌", "🥳"],
  },
  {
    expression: "scared",
    keywords: ["scared", "takut", "serem", "ngeri", "afraid", "horror", "merinding"],
    emoji: ["😨", "😰", "🫣"],
  },
  {
    expression: "embarrassed",
    keywords: ["embarrassed", "malu banget", "ketahuan", "so embarrassing", "duh malu"],
    emoji: ["😳", "🙊"],
  },
  {
    expression: "relieved",
    keywords: ["relieved", "lega", "akhirnya", "untung", "phew", "fiuh", "syukurlah"],
    emoji: ["😮‍💨", "😌"],
  },
  {
    expression: "touched",
    keywords: ["touched", "terharu", "baper", "so sweet", "mewek bahagia", "bikin terharu"],
    emoji: ["🥹", "🥺"],
  },
  {
    expression: "proud",
    keywords: ["proud", "bangga", "keren banget kamu", "well done", "good job"],
    emoji: ["🫡", "🥹"],
  },
  {
    expression: "skeptical",
    keywords: ["skeptical", "curiga", "hmm beneran", "masa sih", "yakin?", "doubt it", "ragu"],
    emoji: ["🤨", "🙄"],
  },
  {
    expression: "tipsy",
    keywords: ["tipsy", "mabuk", "drunk", "teler", "nge-fly"],
    emoji: ["🥴", "🍻", "🍷"],
  },
  {
    expression: "cheeky",
    keywords: ["just kidding lol", "cheeky", "jahil", "becanda doang", "ngeledek"],
    emoji: ["😜", "😝"],
  },
  {
    expression: "happy",
    keywords: ["good", "bagus", "senang", "happy", "nice", "great", "makasih", "thanks", "mantap"],
    emoji: ["👍", "🙌", "🎉", "😄", "🙂", "😁"],
  },
];

/**
 * Scores `text` against a small local keyword/emoji lexicon and returns the
 * best-matching Expression, or `null` when nothing matches strongly enough
 * (callers should fall back to the avatar's own idle expression cycling).
 */
export function detectEmotion(text: string): Expression | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  let best: Expression | null = null;
  let bestScore = 0;

  for (const rule of RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) score += 1;
    }
    for (const em of rule.emoji) {
      if (trimmed.includes(em)) score += 2; // an explicit emoji is a stronger signal than a word
    }
    if (score > bestScore) {
      bestScore = score;
      best = rule.expression;
    }
  }

  return bestScore > 0 ? best : null;
}
