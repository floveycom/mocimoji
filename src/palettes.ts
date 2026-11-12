export interface Palette {
  bgStart: string;
  bgEnd: string;
  blob1: string;
  blob2: string;
  blob3: string;
  blush: string;
}

// 32 bright, cheerful palettes spanning the full hue wheel (yellow, mint,
// blue, pink, orange, purple, lime, teal, red, green, periwinkle, fuchsia,
// turquoise, cherry, honey gold, ...). Every background stays light/vivid
// enough for the avatar's near-black facial features to read clearly — no
// dark or muted/desaturated tones, so a sequential list always feels lively.
export const PALETTES: Palette[] = [
  { bgStart: "#FFF05A", bgEnd: "#FFC72C", blob1: "#FFF89A", blob2: "#FFD60A", blob3: "#FFAA00", blush: "#FF3B6B" },
  { bgStart: "#7BF1A8", bgEnd: "#2EC4B6", blob1: "#B7F7D8", blob2: "#57E2A5", blob3: "#9BF6FF", blush: "#FF4D88" },
  { bgStart: "#64DFDF", bgEnd: "#4EA8DE", blob1: "#A8F9FF", blob2: "#48CAE4", blob3: "#90E0EF", blush: "#FF477E" },
  { bgStart: "#FF85B3", bgEnd: "#FF5C93", blob1: "#FFB3D1", blob2: "#FF6FA5", blob3: "#FFC6FF", blush: "#C9004B" },
  { bgStart: "#D9ED92", bgEnd: "#80ED99", blob1: "#F9F871", blob2: "#9EF01A", blob3: "#B5E48C", blush: "#FF477E" },
  { bgStart: "#D8BBFF", bgEnd: "#9D4EDD", blob1: "#E0AAFF", blob2: "#C77DFF", blob3: "#B8C0FF", blush: "#FF2A7A" },
  { bgStart: "#FFCA3A", bgEnd: "#FF7849", blob1: "#FFE066", blob2: "#FF924C", blob3: "#FFAD60", blush: "#D90452" },
  { bgStart: "#80FFDB", bgEnd: "#00BBF9", blob1: "#A9DEF9", blob2: "#64DFDF", blob3: "#72EFDD", blush: "#FF477E" },
  { bgStart: "#FF99C8", bgEnd: "#A9DEF9", blob1: "#FCF6BD", blob2: "#D0F4DE", blob3: "#E4C1F9", blush: "#E6195E" },
  { bgStart: "#FFEE55", bgEnd: "#FFB703", blob1: "#FFF799", blob2: "#FFD166", blob3: "#CBF3F0", blush: "#FF3B6B" },
  { bgStart: "#A0C4FF", bgEnd: "#748FFC", blob1: "#BDB2FF", blob2: "#9BF6FF", blob3: "#CAFFBF", blush: "#FF477E" },
  { bgStart: "#FF8FA3", bgEnd: "#FF9E6D", blob1: "#FFB3C1", blob2: "#FFD166", blob3: "#FF758F", blush: "#C9004B" },
  { bgStart: "#C7F9CC", bgEnd: "#57CC99", blob1: "#E9F5DB", blob2: "#80ED99", blob3: "#FFF3B0", blush: "#FF477E" },
  { bgStart: "#FF70A6", bgEnd: "#70D6FF", blob1: "#FFD670", blob2: "#FF9770", blob3: "#E9FF70", blush: "#C9004B" },
  { bgStart: "#FFD166", bgEnd: "#FF8C61", blob1: "#FFEE93", blob2: "#FFA69E", blob3: "#FAF0CA", blush: "#D90452" },
  { bgStart: "#9BF6FF", bgEnd: "#AACC00", blob1: "#CAFFBF", blob2: "#FDFFB6", blob3: "#A0C4FF", blush: "#FF3B6B" },
  // 16: Crimson Red
  { bgStart: "#FF6B6B", bgEnd: "#FF4D6D", blob1: "#FFADAD", blob2: "#FF8787", blob3: "#FFD6A5", blush: "#E0144C" },
  // 17: Spring Green
  { bgStart: "#6BCB77", bgEnd: "#45D483", blob1: "#B4E6B8", blob2: "#7EE8A8", blob3: "#D8F3DC", blush: "#FF477E" },
  // 18: Periwinkle Pop
  { bgStart: "#8E9AFF", bgEnd: "#6C7AFF", blob1: "#C2C9FF", blob2: "#A3ACFF", blob3: "#E0E4FF", blush: "#FF6B9D" },
  // 19: Magenta Fuchsia
  { bgStart: "#F15BB5", bgEnd: "#E94BA8", blob1: "#FFC2E2", blob2: "#FF8FC7", blob3: "#FBD1E8", blush: "#D6006E" },
  // 20: Amber Gold
  { bgStart: "#FFD60A", bgEnd: "#FFC300", blob1: "#FFF3B0", blob2: "#FFDD55", blob3: "#FFEA70", blush: "#FF5252" },
  // 21: Bubblegum Turquoise
  { bgStart: "#7FDBFF", bgEnd: "#39CCCC", blob1: "#C3F5FF", blob2: "#A0ECF0", blob3: "#E0FBFC", blush: "#FF6B9D" },
  // 22: Coral Reef
  { bgStart: "#FF9B71", bgEnd: "#FF6F59", blob1: "#FFD3B6", blob2: "#FFAAA7", blob3: "#FFE4D6", blush: "#FF4365" },
  // 23: Chartreuse Lime
  { bgStart: "#CDE990", bgEnd: "#B5D94C", blob1: "#F0F7D4", blob2: "#DCEB9E", blob3: "#B5E48C", blush: "#FF4D8D" },
  // 24: Tropical Teal
  { bgStart: "#4ECDC4", bgEnd: "#26C6DA", blob1: "#B2F2E8", blob2: "#7FE8D8", blob3: "#CFFAFE", blush: "#FF477E" },
  // 25: Grape Pop
  { bgStart: "#C77DFF", bgEnd: "#A64DFF", blob1: "#E8C7FF", blob2: "#D9A8FF", blob3: "#F3DFFF", blush: "#FF2A7A" },
  // 26: Rose Gold
  { bgStart: "#F6AD9B", bgEnd: "#E8927C", blob1: "#FFD9C7", blob2: "#FBC4AB", blob3: "#FFE5D9", blush: "#E0144C" },
  // 27: Sky Pale Blue
  { bgStart: "#CAF0F8", bgEnd: "#90E0EF", blob1: "#E0FBFC", blob2: "#ADE8F4", blob3: "#BDE0FE", blush: "#FF8FA3" },
  // 28: Cherry Pop
  { bgStart: "#FF5C77", bgEnd: "#FF2D55", blob1: "#FFB3C1", blob2: "#FF8098", blob3: "#FFD1DA", blush: "#FFCAD4" },
  // 29: Spearmint
  { bgStart: "#2EE6A8", bgEnd: "#06D6A0", blob1: "#A8F5DD", blob2: "#6FEFC4", blob3: "#D4FAEC", blush: "#EF476F" },
  // 30: Sunset Blush
  { bgStart: "#FFADC6", bgEnd: "#FF6B9D", blob1: "#FFD6E8", blob2: "#FF9FC4", blob3: "#FFC2D9", blush: "#C9184A" },
  // 31: Honey Gold
  { bgStart: "#FFCB77", bgEnd: "#FFA62B", blob1: "#FFE8B8", blob2: "#FFD58A", blob3: "#FFF0D1", blush: "#FF5C58" },
];

export function hashSeed(seed: string): number {
  const s = seed.trim() || "guest";
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 43 + s.charCodeAt(i) * (i + 1)) & 0x7fffffff;
  }
  return Math.abs(hash);
}
