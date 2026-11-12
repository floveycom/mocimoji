import type { Expression } from "./types";

// --- Generic data model for a 2-avatar "activity" ---
//
// Each activity is a short sequence of timed steps. Within a step, `a`/`b`
// compute a local transform offset (relative to resting position) for each
// participant as a function of progress `p` (0..1, pre-eased). `ux`/`uy` is
// always the unit vector from participant A toward participant B, so "move
// toward the other" is always `+ux * amount` for A and `-ux * amount` for B.
// Duration is fixed per step, so a whole activity is bounded by construction
// — no physics integration, so nothing can run away indefinitely.

export interface ActorFrame {
  x?: number;
  y?: number;
  sx?: number;
  sy?: number;
  rot?: number;
}

export interface ScenarioReaction {
  dx: number;
  dy: number;
  expression: Expression;
  holdMs?: number;
}

export interface ScenarioStep {
  durationMs: number;
  easing?: (t: number) => number;
  a?: (p: number) => ActorFrame;
  b?: (p: number) => ActorFrame;
  reactionA?: ScenarioReaction;
  reactionB?: ScenarioReaction;
}

export type ScenarioBuilder = (ux: number, uy: number, dist: number) => ScenarioStep[];

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const lean = (dist: number) => Math.min(dist * 0.4, 42);

export const SCENARIOS: Record<string, ScenarioBuilder> = {
  // 1. A scuffle: lean in, shake at each other, then a winner/loser emerge.
  fight: (ux, uy, dist) => {
    const d = lean(dist);
    const aWins = Math.random() < 0.5;
    return [
      {
        durationMs: 240,
        easing: easeOutCubic,
        a: (p) => ({ x: ux * d * p, rot: -6 * p }),
        b: (p) => ({ x: -ux * d * p, rot: 6 * p }),
        reactionA: { dx: 0, dy: 0, expression: "angry" },
        reactionB: { dx: 0, dy: 0, expression: "angry" },
      },
      {
        durationMs: 260,
        a: (p) => ({ x: ux * d + Math.sin(p * Math.PI * 6) * 3.5, rot: -6 + Math.sin(p * Math.PI * 6) * 8 }),
        b: (p) => ({ x: -ux * d + Math.sin(p * Math.PI * 6 + Math.PI) * 3.5, rot: 6 + Math.sin(p * Math.PI * 6 + Math.PI) * 8 }),
      },
      {
        durationMs: 320,
        easing: easeOutCubic,
        a: (p) => ({ x: ux * d * (1 - p), rot: -6 * (1 - p) }),
        b: (p) => ({ x: -ux * d * (1 - p), rot: 6 * (1 - p) }),
        reactionA: aWins ? { dx: 0, dy: 0, expression: "smug" } : { dx: 0, dy: 0, expression: "dizzy" },
        reactionB: aWins ? { dx: 0, dy: 0, expression: "dizzy" } : { dx: 0, dy: 0, expression: "smug" },
      },
    ];
  },

  // 2. A warm hug: lean together, hold with a gentle squeeze, release.
  hug: (ux, uy, dist) => {
    const d = lean(dist) * 0.9;
    return [
      {
        durationMs: 320,
        easing: easeOutCubic,
        a: (p) => ({ x: ux * d * p, y: uy * d * p }),
        b: (p) => ({ x: -ux * d * p, y: -uy * d * p }),
        reactionA: { dx: 0, dy: 0, expression: "loving" },
        reactionB: { dx: 0, dy: 0, expression: "loving" },
      },
      {
        durationMs: 700,
        a: (p) => ({ x: ux * d, y: uy * d, sx: 1 + Math.sin(p * Math.PI * 2) * 0.03, sy: 1 - Math.sin(p * Math.PI * 2) * 0.03 }),
        b: (p) => ({ x: -ux * d, y: -uy * d, sx: 1 + Math.sin(p * Math.PI * 2) * 0.03, sy: 1 - Math.sin(p * Math.PI * 2) * 0.03 }),
      },
      {
        durationMs: 320,
        easing: easeOutCubic,
        a: (p) => ({ x: ux * d * (1 - p), y: uy * d * (1 - p) }),
        b: (p) => ({ x: -ux * d * (1 - p), y: -uy * d * (1 - p) }),
        reactionA: { dx: 0, dy: 0, expression: "shy" },
        reactionB: { dx: 0, dy: 0, expression: "shy" },
      },
    ];
  },

  // 3. A quick high five: both reach up and toward each other, contact, laugh.
  highFive: (ux, uy) => {
    const reach = 22;
    return [
      {
        durationMs: 220,
        easing: easeOutBack,
        a: (p) => ({ x: ux * reach * 0.6 * p, y: -10 * p }),
        b: (p) => ({ x: -ux * reach * 0.6 * p, y: -10 * p }),
        reactionA: { dx: 0, dy: -1.2, expression: "excited" },
        reactionB: { dx: 0, dy: -1.2, expression: "excited" },
      },
      {
        durationMs: 110,
        a: () => ({ x: ux * reach * 0.6, y: -11, sx: 1.08, sy: 0.92 }),
        b: () => ({ x: -ux * reach * 0.6, y: -11, sx: 1.08, sy: 0.92 }),
      },
      {
        durationMs: 260,
        easing: easeOutCubic,
        a: (p) => ({ x: ux * reach * 0.6 * (1 - p), y: -10 * (1 - p) }),
        b: (p) => ({ x: -ux * reach * 0.6 * (1 - p), y: -10 * (1 - p) }),
        reactionA: { dx: 0, dy: 0, expression: "laugh" },
        reactionB: { dx: 0, dy: 0, expression: "laugh" },
      },
    ];
  },

  // 4. A handshake: lean in, bob up-down a couple of times, release.
  handshake: (ux, uy, dist) => {
    const d = lean(dist) * 0.7;
    return [
      {
        durationMs: 240,
        easing: easeOutCubic,
        a: (p) => ({ x: ux * d * p }),
        b: (p) => ({ x: -ux * d * p }),
        reactionA: { dx: 0, dy: 0, expression: "happy" },
        reactionB: { dx: 0, dy: 0, expression: "happy" },
      },
      {
        durationMs: 420,
        a: (p) => ({ x: ux * d, y: Math.sin(p * Math.PI * 4) * -2.4 }),
        b: (p) => ({ x: -ux * d, y: Math.sin(p * Math.PI * 4) * -2.4 }),
      },
      {
        durationMs: 260,
        easing: easeOutCubic,
        a: (p) => ({ x: ux * d * (1 - p) }),
        b: (p) => ({ x: -ux * d * (1 - p) }),
        reactionA: { dx: 0, dy: 0, expression: "smug" },
        reactionB: { dx: 0, dy: 0, expression: "happy" },
      },
    ];
  },

  // 5. Dancing in sync: sway side to side together, rotate playfully.
  danceTogether: () => [
    {
      durationMs: 1500,
      a: (p) => ({ x: Math.sin(p * Math.PI * 6) * 9, rot: Math.sin(p * Math.PI * 6) * 10, y: Math.abs(Math.sin(p * Math.PI * 6)) * -2 }),
      b: (p) => ({ x: Math.sin(p * Math.PI * 6 + Math.PI) * 9, rot: Math.sin(p * Math.PI * 6 + Math.PI) * 10, y: Math.abs(Math.sin(p * Math.PI * 6 + Math.PI)) * -2 }),
      reactionA: { dx: 0, dy: 0, expression: "excited" },
      reactionB: { dx: 0, dy: 0, expression: "excited" },
    },
    {
      durationMs: 260,
      easing: easeOutCubic,
      a: (p) => ({ x: 0, rot: 0, y: 0 }),
      b: (p) => ({ x: 0, rot: 0, y: 0 }),
      reactionA: { dx: 0, dy: 0, expression: "happy" },
      reactionB: { dx: 0, dy: 0, expression: "happy" },
    },
  ],

  // 6. A staring contest: both freeze, then one "blinks" and loses.
  staringContest: () => {
    const aLoses = Math.random() < 0.5;
    return [
      {
        durationMs: 1300,
        a: () => ({}),
        b: () => ({}),
        reactionA: { dx: 0, dy: 0, expression: "bored", holdMs: 1400 },
        reactionB: { dx: 0, dy: 0, expression: "bored", holdMs: 1400 },
      },
      {
        durationMs: 260,
        a: () => ({}),
        b: () => ({}),
        reactionA: aLoses ? { dx: 0, dy: 0, expression: "laugh" } : { dx: 0, dy: 0, expression: "smug" },
        reactionB: aLoses ? { dx: 0, dy: 0, expression: "smug" } : { dx: 0, dy: 0, expression: "laugh" },
      },
    ];
  },

  // 7. Mimicry: A wiggles, then B copies the same motion a beat later.
  mimic: () => [
    {
      durationMs: 420,
      a: (p) => ({ rot: Math.sin(p * Math.PI * 3) * 12 }),
      b: () => ({}),
      reactionA: { dx: 0, dy: 0, expression: "playful" },
      reactionB: { dx: 0, dy: 0, expression: "confused" },
    },
    {
      durationMs: 420,
      a: () => ({}),
      b: (p) => ({ rot: Math.sin(p * Math.PI * 3) * 12 }),
      reactionB: { dx: 0, dy: 0, expression: "playful" },
    },
    {
      durationMs: 220,
      a: () => ({}),
      b: () => ({}),
      reactionA: { dx: 0, dy: 0, expression: "laugh" },
      reactionB: { dx: 0, dy: 0, expression: "laugh" },
    },
  ],

  // 8. A playful chase: A darts in, B dodges away, both laugh it off.
  chase: (ux, uy, dist) => {
    const d = lean(dist);
    return [
      {
        durationMs: 220,
        easing: easeOutCubic,
        a: (p) => ({ x: ux * d * 1.2 * p, rot: ux >= 0 ? 10 * p : -10 * p }),
        reactionA: { dx: 0, dy: 0, expression: "laugh" },
        reactionB: { dx: 0, dy: 0, expression: "surprised" },
      },
      {
        durationMs: 220,
        easing: easeOutCubic,
        a: (p) => ({ x: ux * d * 1.2, rot: ux >= 0 ? 10 : -10 }),
        b: (p) => ({ x: -ux * Math.min(dist * 0.18, 16) * p }),
      },
      {
        durationMs: 300,
        easing: easeOutCubic,
        a: (p) => ({ x: ux * d * 1.2 * (1 - p), rot: 0 }),
        b: (p) => ({ x: -ux * Math.min(dist * 0.18, 16) * (1 - p) }),
        reactionA: { dx: 0, dy: 0, expression: "playful" },
        reactionB: { dx: 0, dy: 0, expression: "laugh" },
      },
    ];
  },

  // 9. Tug of war: both strain apart, then one slips and stumbles in.
  tugOfWar: (ux, uy, dist) => {
    const d = lean(dist);
    const aSlips = Math.random() < 0.5;
    return [
      {
        durationMs: 500,
        easing: easeOutCubic,
        a: (p) => ({ x: -ux * d * p, rot: -8 * p }),
        b: (p) => ({ x: ux * d * p, rot: 8 * p }),
        reactionA: { dx: 0, dy: 0, expression: "worried" },
        reactionB: { dx: 0, dy: 0, expression: "angry" },
      },
      {
        durationMs: 220,
        easing: easeOutBack,
        a: (p) => (aSlips ? { x: -ux * d + ux * d * 1.6 * p, rot: -8 + 8 * p } : { x: -ux * d, rot: -8 }),
        b: (p) => (aSlips ? { x: ux * d, rot: 8 } : { x: ux * d - ux * d * 1.6 * p, rot: 8 - 8 * p }),
        reactionA: aSlips ? { dx: 0, dy: 0, expression: "dizzy" } : { dx: 0, dy: 0, expression: "smug" },
        reactionB: aSlips ? { dx: 0, dy: 0, expression: "smug" } : { dx: 0, dy: 0, expression: "dizzy" },
      },
      {
        durationMs: 260,
        easing: easeOutCubic,
        a: (p) => ({ x: (aSlips ? ux * d * 0.6 : -ux * d) * (1 - p), rot: 0 }),
        b: (p) => ({ x: (aSlips ? ux * d : ux * d * -0.6) * (1 - p), rot: 0 }),
      },
    ];
  },

  // 10. A piggyback hop: B hops toward and slightly above A, both bounce.
  piggyback: (ux, uy, dist) => {
    const d = lean(dist) * 0.55;
    return [
      {
        durationMs: 300,
        easing: easeOutBack,
        b: (p) => ({ x: -ux * d * p, y: -7 * p }),
        reactionA: { dx: 0, dy: 0, expression: "happy" },
        reactionB: { dx: 0, dy: 0, expression: "excited" },
      },
      {
        durationMs: 420,
        a: (p) => ({ y: Math.abs(Math.sin(p * Math.PI * 2)) * -3 }),
        b: (p) => ({ x: -ux * d, y: -7 + Math.abs(Math.sin(p * Math.PI * 2)) * -3 }),
      },
      {
        durationMs: 300,
        easing: easeOutCubic,
        a: (p) => ({ y: 0 }),
        b: (p) => ({ x: -ux * d * (1 - p), y: -7 * (1 - p) }),
        reactionA: { dx: 0, dy: 0, expression: "laugh" },
        reactionB: { dx: 0, dy: 0, expression: "laugh" },
      },
    ];
  },

  // 11. A secret handshake: three quick taps, then a shared grin.
  secretHandshake: (ux, uy, dist) => {
    const d = lean(dist) * 0.6;
    const tap = (sign: number): ScenarioStep => ({
      durationMs: 150,
      easing: easeOutQuad,
      a: (p) => ({ x: ux * d * (0.5 + 0.5 * sign) * Math.sin(p * Math.PI) }),
      b: (p) => ({ x: -ux * d * (0.5 + 0.5 * sign) * Math.sin(p * Math.PI) }),
    });
    return [
      { ...tap(1), reactionA: { dx: 0, dy: 0, expression: "playful" }, reactionB: { dx: 0, dy: 0, expression: "playful" } },
      tap(0.6),
      tap(1.2),
      {
        durationMs: 220,
        a: () => ({}),
        b: () => ({}),
        reactionA: { dx: 0, dy: 0, expression: "starstruck" },
        reactionB: { dx: 0, dy: 0, expression: "starstruck" },
      },
    ];
  },

  // 12. Posing for a group photo: lean in, hold smiles, a camera-flash blip.
  photoPose: () => [
    {
      durationMs: 220,
      easing: easeOutCubic,
      a: (p) => ({ sx: 1 + 0.05 * p, sy: 1 + 0.05 * p }),
      b: (p) => ({ sx: 1 + 0.05 * p, sy: 1 + 0.05 * p }),
      reactionA: { dx: 0, dy: 0, expression: "happy", holdMs: 1200 },
      reactionB: { dx: 0, dy: 0, expression: "happy", holdMs: 1200 },
    },
    {
      durationMs: 650,
      a: () => ({ sx: 1.05, sy: 1.05 }),
      b: () => ({ sx: 1.05, sy: 1.05 }),
    },
    {
      durationMs: 220,
      easing: easeOutCubic,
      a: (p) => ({ sx: 1.05 - 0.05 * p, sy: 1.05 - 0.05 * p }),
      b: (p) => ({ sx: 1.05 - 0.05 * p, sy: 1.05 - 0.05 * p }),
      reactionA: { dx: 0, dy: 0, expression: "starstruck" },
      reactionB: { dx: 0, dy: 0, expression: "starstruck" },
    },
  ],

  // 13. Arm wrestling: both lean in and tilt harder, then one tips over.
  armWrestle: (ux, uy, dist) => {
    const d = lean(dist) * 0.7;
    const aWins = Math.random() < 0.5;
    return [
      {
        durationMs: 480,
        easing: easeOutCubic,
        a: (p) => ({ x: ux * d * p, rot: 10 * p }),
        b: (p) => ({ x: -ux * d * p, rot: -10 * p }),
        reactionA: { dx: 0, dy: 0, expression: "angry" },
        reactionB: { dx: 0, dy: 0, expression: "worried" },
      },
      {
        durationMs: 240,
        a: (p) => ({ x: ux * d, rot: aWins ? 10 + 14 * p : 10 - 10 * p }),
        b: (p) => ({ x: -ux * d, rot: aWins ? -10 + 10 * p : -10 - 14 * p }),
        reactionA: aWins ? { dx: 0, dy: 0, expression: "smug" } : { dx: 0, dy: 0, expression: "dizzy" },
        reactionB: aWins ? { dx: 0, dy: 0, expression: "dizzy" } : { dx: 0, dy: 0, expression: "smug" },
      },
      {
        durationMs: 260,
        easing: easeOutCubic,
        a: (p) => ({ x: ux * d * (1 - p), rot: (aWins ? 24 : 0) * (1 - p) }),
        b: (p) => ({ x: -ux * d * (1 - p), rot: (aWins ? 0 : -24) * (1 - p) }),
      },
    ];
  },

  // 14. Jumping together in sync, two hops.
  jumpTogether: () => [
    {
      durationMs: 700,
      a: (p) => ({ y: Math.abs(Math.sin(p * Math.PI * 2)) * -11, sx: 1 - Math.abs(Math.sin(p * Math.PI * 2)) * 0.06, sy: 1 + Math.abs(Math.sin(p * Math.PI * 2)) * 0.08 }),
      b: (p) => ({ y: Math.abs(Math.sin(p * Math.PI * 2)) * -11, sx: 1 - Math.abs(Math.sin(p * Math.PI * 2)) * 0.06, sy: 1 + Math.abs(Math.sin(p * Math.PI * 2)) * 0.08 }),
      reactionA: { dx: 0, dy: -1, expression: "excited" },
      reactionB: { dx: 0, dy: -1, expression: "excited" },
    },
    {
      durationMs: 200,
      easing: easeOutCubic,
      a: () => ({ y: 0 }),
      b: () => ({ y: 0 }),
      reactionA: { dx: 0, dy: 0, expression: "starstruck" },
      reactionB: { dx: 0, dy: 0, expression: "starstruck" },
    },
  ],

  // 15. A slow clap: rhythmic scale pulses, building approval.
  slowClap: () => [
    {
      durationMs: 900,
      a: (p) => ({ sx: 1 + Math.abs(Math.sin(p * Math.PI * 3)) * 0.07, sy: 1 - Math.abs(Math.sin(p * Math.PI * 3)) * 0.07 }),
      b: (p) => ({ sx: 1 + Math.abs(Math.sin(p * Math.PI * 3)) * 0.07, sy: 1 - Math.abs(Math.sin(p * Math.PI * 3)) * 0.07 }),
      reactionA: { dx: 0, dy: 0, expression: "smug" },
      reactionB: { dx: 0, dy: 0, expression: "smug" },
    },
    {
      durationMs: 220,
      a: () => ({}),
      b: () => ({}),
      reactionA: { dx: 0, dy: 0, expression: "happy" },
      reactionB: { dx: 0, dy: 0, expression: "happy" },
    },
  ],

  // 16. Comfort: A leans in to a sad B and pats gently; B cheers up.
  comfort: (ux, uy, dist) => {
    const d = lean(dist) * 0.55;
    return [
      {
        durationMs: 280,
        easing: easeOutCubic,
        a: (p) => ({ x: ux * d * p }),
        reactionA: { dx: 0, dy: 0, expression: "happy" },
        reactionB: { dx: 0, dy: 0, expression: "sad" },
      },
      {
        durationMs: 520,
        a: (p) => ({ x: ux * d, y: Math.abs(Math.sin(p * Math.PI * 3)) * -2 }),
        b: (p) => ({ y: Math.abs(Math.sin(p * Math.PI * 3)) * -1 }),
      },
      {
        durationMs: 300,
        easing: easeOutCubic,
        a: (p) => ({ x: ux * d * (1 - p), y: 0 }),
        b: () => ({ y: 0 }),
        reactionA: { dx: 0, dy: 0, expression: "happy" },
        reactionB: { dx: 0, dy: 0, expression: "shy" },
      },
    ];
  },

  // 17. A huddle: both lean in close together, conspiratorial giggling.
  huddle: (ux, uy, dist) => {
    const d = lean(dist) * 0.5;
    return [
      {
        durationMs: 280,
        easing: easeOutCubic,
        a: (p) => ({ x: ux * d * p, y: uy * d * p }),
        b: (p) => ({ x: -ux * d * p, y: -uy * d * p }),
        reactionA: { dx: 0, dy: 0, expression: "playful" },
        reactionB: { dx: 0, dy: 0, expression: "playful" },
      },
      {
        durationMs: 600,
        a: (p) => ({ x: ux * d + Math.sin(p * Math.PI * 5) * 1.4, y: uy * d }),
        b: (p) => ({ x: -ux * d - Math.sin(p * Math.PI * 5) * 1.4, y: -uy * d }),
      },
      {
        durationMs: 280,
        easing: easeOutCubic,
        a: (p) => ({ x: ux * d * (1 - p), y: uy * d * (1 - p) }),
        b: (p) => ({ x: -ux * d * (1 - p), y: -uy * d * (1 - p) }),
        reactionA: { dx: 0, dy: 0, expression: "smug" },
        reactionB: { dx: 0, dy: 0, expression: "laugh" },
      },
    ];
  },

  // 18. Mirror move: both sway the same direction, perfectly in sync.
  mirrorMove: () => [
    {
      durationMs: 1200,
      a: (p) => ({ x: Math.sin(p * Math.PI * 4) * 10, rot: Math.sin(p * Math.PI * 4) * 6 }),
      b: (p) => ({ x: Math.sin(p * Math.PI * 4) * 10, rot: Math.sin(p * Math.PI * 4) * 6 }),
      reactionA: { dx: 0, dy: 0, expression: "cute" },
      reactionB: { dx: 0, dy: 0, expression: "cute" },
    },
    {
      durationMs: 220,
      easing: easeOutCubic,
      a: () => ({ x: 0, rot: 0 }),
      b: () => ({ x: 0, rot: 0 }),
    },
  ],

  // 19. Point and laugh: A points and cracks up, B is caught off guard.
  pointAndLaugh: (ux, uy, dist) => {
    const d = lean(dist) * 0.45;
    const tilt = ux >= 0 ? 1 : -1;
    return [
      {
        durationMs: 260,
        easing: easeOutCubic,
        a: (p) => ({ x: ux * d * p, rot: tilt * 12 * p }),
        reactionA: { dx: 0, dy: 0, expression: "laugh" },
        reactionB: { dx: 0, dy: 0, expression: "surprised" },
      },
      {
        durationMs: 420,
        a: (p) => ({ x: ux * d, rot: tilt * 12 + Math.sin(p * Math.PI * 5) * 4 }),
      },
      {
        durationMs: 300,
        easing: easeOutCubic,
        a: (p) => ({ x: ux * d * (1 - p), rot: tilt * 12 * (1 - p) }),
        reactionA: { dx: 0, dy: 0, expression: "happy" },
        reactionB: { dx: 0, dy: 0, expression: "laugh" },
      },
    ];
  },

  // 20. Bonk: both rush together, bounce off, and shake it off laughing.
  bonk: (ux, uy, dist) => {
    const d = lean(dist);
    return [
      {
        durationMs: 180,
        easing: (t) => t * t,
        a: (p) => ({ x: ux * d * 1.1 * p }),
        b: (p) => ({ x: -ux * d * 1.1 * p }),
        reactionA: { dx: 0, dy: 0, expression: "surprised" },
        reactionB: { dx: 0, dy: 0, expression: "surprised" },
      },
      {
        durationMs: 260,
        easing: easeOutBack,
        a: (p) => ({ x: ux * d * 1.1 - ux * d * 1.1 * p, rot: -10 * (1 - p) }),
        b: (p) => ({ x: -ux * d * 1.1 + ux * d * 1.1 * p, rot: 10 * (1 - p) }),
        reactionA: { dx: 0, dy: 0, expression: "dizzy" },
        reactionB: { dx: 0, dy: 0, expression: "dizzy" },
      },
      {
        durationMs: 260,
        a: () => ({}),
        b: () => ({}),
        reactionA: { dx: 0, dy: 0, expression: "laugh" },
        reactionB: { dx: 0, dy: 0, expression: "laugh" },
      },
    ];
  },
};

export const SCENARIO_NAMES = Object.keys(SCENARIOS);
