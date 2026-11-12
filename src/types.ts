export type Expression =
  | "happy"
  | "blink"
  | "laugh"
  | "shy"
  | "cute"
  | "surprised"
  | "starstruck"
  | "loving"
  | "playful"
  | "sad"
  | "crying"
  | "angry"
  | "sleepy"
  | "confused"
  | "bored"
  | "smug"
  | "worried"
  | "disgusted"
  | "dizzy"
  | "angelic"
  | "devilish"
  | "moneyEyes"
  | "zany"
  | "cool"
  | "nerdy"
  | "thinking"
  | "yawning"
  | "wink"
  | "excited"
  | "scared"
  | "embarrassed"
  | "relieved"
  | "touched"
  | "proud"
  | "skeptical"
  | "tipsy"
  | "cheeky";

export interface GazeState {
  dx: number;
  dy: number;
  expression: Expression;
}

export type FaceStyle = "flat-pill" | "cartoon";
