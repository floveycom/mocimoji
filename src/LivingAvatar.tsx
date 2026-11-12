"use client";

import { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef, type ReactNode, type CSSProperties } from "react";
import { PALETTES, hashSeed } from "./palettes";
import { detectEmotion } from "./emotion";
import { registerActor, unregisterActor, pokeActor, type AvatarActor } from "./coordinator";
import { mochiPath } from "./mochiShape";
import type { Expression, FaceStyle, GazeState } from "./types";

export type { Expression, FaceStyle, GazeState };
export { detectEmotion };

const GAZE_PRESETS: Array<{ dx: number; dy: number }> = [
  { dx: 0, dy: 0 },
  { dx: 1.6, dy: -0.2 },
  { dx: 1.4, dy: 0.6 },
  { dx: -1.5, dy: -0.3 },
  { dx: 0, dy: -1.2 },
  { dx: -1.2, dy: 0.5 },
  { dx: 1.7, dy: -0.9 },
];

// Every non-transitional expression the avatar can idle-cycle through on its
// own. "blink" is excluded — it's a momentary transition the idle loop
// inserts between expressions, not a destination state.
const IDLE_EXPRESSIONS: Expression[] = [
  "happy",
  "laugh",
  "shy",
  "cute",
  "surprised",
  "starstruck",
  "loving",
  "playful",
  "sad",
  "crying",
  "angry",
  "sleepy",
  "confused",
  "bored",
  "smug",
  "worried",
  "disgusted",
  "dizzy",
  "angelic",
  "devilish",
  "moneyEyes",
  "zany",
  "cool",
  "nerdy",
  "thinking",
  "yawning",
  "wink",
  "excited",
  "scared",
  "embarrassed",
  "relieved",
  "touched",
  "proud",
  "skeptical",
  "tipsy",
  "cheeky",
];

/** Every expression the face can render, "blink" included — handy for a picker/showcase UI. */
export const ALL_EXPRESSIONS: Expression[] = ["blink", ...IDLE_EXPRESSIONS];

// How soft/strong the cheek blush reads per expression. Expressions not
// listed fall back to a neutral default below.
const BLUSH: Partial<Record<Expression, { opacity: number; scale: number }>> = {
  shy: { opacity: 0.78, scale: 1.22 },
  loving: { opacity: 0.78, scale: 1.22 },
  laugh: { opacity: 0.62, scale: 1.12 },
  playful: { opacity: 0.62, scale: 1.12 },
  starstruck: { opacity: 0.62, scale: 1 },
  cute: { opacity: 0.5, scale: 1 },
  excited: { opacity: 0.6, scale: 1.1 },
  angelic: { opacity: 0.4, scale: 1 },
  smug: { opacity: 0.4, scale: 1 },
  wink: { opacity: 0.4, scale: 1 },
  angry: { opacity: 0.2, scale: 1 },
  sad: { opacity: 0.15, scale: 1 },
  crying: { opacity: 0.2, scale: 1 },
  sleepy: { opacity: 0.2, scale: 1 },
  bored: { opacity: 0.15, scale: 1 },
  scared: { opacity: 0.12, scale: 1 },
  embarrassed: { opacity: 0.9, scale: 1.4 },
  relieved: { opacity: 0.28, scale: 1 },
  touched: { opacity: 0.66, scale: 1.14 },
  proud: { opacity: 0.4, scale: 1.05 },
  skeptical: { opacity: 0.18, scale: 1 },
  tipsy: { opacity: 0.85, scale: 1.3 },
  cheeky: { opacity: 0.55, scale: 1.08 },
};
const DEFAULT_BLUSH = { opacity: 0.32, scale: 1 };

/**
 * Where an expression should look, when its meaning depends on gaze
 * direction (a "thinking" face only reads as pondering if it's looking up
 * and away; a forced straight-ahead stare undercuts it). `altSign` flips
 * left/right so the same expression doesn't always glance the same way.
 * Expressions not listed here have no strong gaze association, so they keep
 * whatever gaze was already in play (an idle preset, or the previous gaze).
 */
function preferredGaze(expression: Expression, altSign: 1 | -1, fallback: { dx: number; dy: number }): { dx: number; dy: number } {
  switch (expression) {
    case "shy":
      return { dx: altSign * 1.4, dy: 0.6 };
    case "thinking":
      return { dx: altSign * 1.3, dy: -1.3 };
    case "smug":
      return { dx: altSign * 1.5, dy: -0.3 };
    case "devilish":
      return { dx: altSign * 1.4, dy: -0.4 };
    case "confused":
      return { dx: altSign * 1.0, dy: -0.6 };
    case "disgusted":
      return { dx: altSign * -1.6, dy: 0.3 };
    case "bored":
      return { dx: altSign * 1.5, dy: 0.2 };
    case "worried":
      return { dx: altSign * 0.6, dy: -0.4 };
    case "sad":
    case "crying":
      return { dx: 0, dy: 0.9 };
    case "sleepy":
    case "yawning":
      return { dx: 0, dy: 0.4 };
    case "loving":
      return { dx: 0, dy: 0 };
    case "angelic":
      return { dx: 0, dy: 0.2 };
    case "excited":
      return { dx: 0, dy: -0.4 };
    case "scared":
      return { dx: altSign * 0.8, dy: -0.8 };
    case "embarrassed":
      return { dx: altSign * 1.6, dy: 0.3 };
    case "proud":
      return { dx: 0, dy: -0.9 };
    case "skeptical":
      return { dx: altSign * 1.8, dy: 0 };
    case "relieved":
    case "touched":
      return { dx: 0, dy: 0.3 };
    default:
      return fallback;
  }
}

let instanceCounter = 0;

export interface LivingAvatarProps {
  /** Deterministic identity — same seed always renders the same face/palette. */
  seed: string;
  /**
   * Latest comment/message text. When it changes, a small local keyword/emoji
   * lexicon picks a matching expression and the avatar reacts to it for a
   * couple of seconds before resuming its own idle behavior. No network
   * call, no API key.
   */
  text?: string;
  /**
   * Force a specific expression and suspend idle cycling/text reactions
   * while set. Useful for a showcase/picker UI; most apps should leave this
   * unset and let `text` or idle behavior drive the face.
   */
  expression?: Expression;
  /**
   * Override which generated colorway this avatar uses, independent of
   * `seed` (which still drives face shape/blob layout). Any integer works —
   * it's wrapped into range. Most apps should leave this unset and let the
   * seed pick a stable color; it's here for things like a live-cycling demo
   * avatar or matching a user's brand color.
   */
  paletteIndex?: number;
  /**
   * A point in viewport coordinates (e.g. `{ x: e.clientX, y: e.clientY }`
   * from a mousemove handler) this avatar should turn its eyes toward.
   * Expression and blinking keep going as normal — only gaze direction is
   * taken over. Pass `null`/leave unset to release control back to idle
   * drift. Has no effect while the avatar is mid physical-interaction or
   * holding a reaction from `text` or an interaction — those take priority.
   */
  lookAt?: { x: number; y: number } | null;
  className?: string;
  faceStyle?: FaceStyle;
}

export const LivingAvatar = forwardRef<HTMLDivElement, LivingAvatarProps>(function LivingAvatar(
  { seed, text, expression, paletteIndex: paletteIndexProp, lookAt, className = "", faceStyle = "flat-pill" },
  forwardedRef
) {
  const trimmedSeed = seed.trim() || "guest";
  const idxMatch = /^(\d+)-/.exec(trimmedSeed);
  const listIdx = idxMatch ? parseInt(idxMatch[1], 10) : null;

  const hash = hashSeed(trimmedSeed);
  const id = hash.toString(36);
  const mochiPathD = useMemo(() => mochiPath(hash), [hash]);
  const seedPaletteIndex = listIdx !== null ? listIdx % PALETTES.length : hash % PALETTES.length;
  const paletteIndex =
    paletteIndexProp !== undefined ? ((paletteIndexProp % PALETTES.length) + PALETTES.length) % PALETTES.length : seedPaletteIndex;
  const palette = PALETTES[paletteIndex];

  const cx1 = 12 + (hash % 16);
  const cy1 = 10 + ((hash >> 2) % 14);
  const cx2 = 10 + ((hash >> 5) % 22);
  const cy2 = 16 + ((hash >> 8) % 18);
  const cx3 = 16 + ((hash >> 11) % 18);
  const cy3 = 24 + ((hash >> 14) % 12);

  const initialPreset = GAZE_PRESETS[(listIdx ?? hash) % GAZE_PRESETS.length];
  const initialExpression = expression ?? IDLE_EXPRESSIONS[(listIdx ?? hash) % IDLE_EXPRESSIONS.length];

  const [gaze, setGaze] = useState<GazeState>({
    dx: initialPreset.dx,
    dy: initialPreset.dy,
    expression: initialExpression,
  });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const reactionLockUntilRef = useRef(0);
  const lastTextRef = useRef<string | undefined>(undefined);
  const actorIdRef = useRef<string | null>(null);

  useImperativeHandle(forwardedRef, () => wrapperRef.current as HTMLDivElement, []);

  // Register with the cross-avatar interaction coordinator. A forced
  // `expression` means this avatar is a static reference (a showcase/picker
  // cell) — it must not register, or the ambient/click interaction system
  // would still reach in via setReaction and silently override the
  // expression the caller asked to pin.
  useEffect(() => {
    if (expression !== undefined) return;

    instanceCounter += 1;
    const actorId = `${id}-${instanceCounter}`;
    actorIdRef.current = actorId;

    const actor: AvatarActor = {
      id: actorId,
      getWrapperEl: () => wrapperRef.current,
      getBodyEl: () => bodyRef.current,
      setReaction: (nextGaze: GazeState, holdMs: number) => {
        reactionLockUntilRef.current = performance.now() + holdMs;
        setGaze(nextGaze);
      },
      isBusy: () => busyRef.current,
      setBusy: (b: boolean) => {
        busyRef.current = b;
      },
    };

    registerActor(actor);
    return () => {
      unregisterActor(actorId);
      actorIdRef.current = null;
    };
  }, [id, expression]);

  // A forced `expression` prop takes priority over everything else.
  useEffect(() => {
    if (expression === undefined) return;
    setGaze((prev) => ({ ...prev, expression }));
  }, [expression]);

  // React to new comment/message text with a matching expression.
  useEffect(() => {
    if (expression !== undefined) return;
    if (text === undefined || text === lastTextRef.current) return;
    lastTextRef.current = text;

    const matched = detectEmotion(text);
    if (!matched) return;

    reactionLockUntilRef.current = performance.now() + 2600;
    setGaze((prev) => {
      const altSign: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      const target = preferredGaze(matched, altSign, { dx: 0, dy: prev.dy });
      return { dx: target.dx, dy: target.dy, expression: matched };
    });
  }, [text]);

  // Track the cursor when `lookAt` is provided — expression and blinking
  // keep going (the idle-cycling effect below only pauses gaze drift, not
  // the whole animation), but gaze direction points at the given point
  // instead. A physical interaction or a held text/interaction reaction
  // still wins, same priority as idle gaze.
  useEffect(() => {
    if (!lookAt) return;
    if (busyRef.current || performance.now() < reactionLockUntilRef.current) return;
    const el = wrapperRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = lookAt.x - cx;
    const dy = lookAt.y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const maxGaze = 1.8;

    setGaze((prev) => ({ ...prev, dx: (dx / dist) * maxGaze, dy: (dy / dist) * maxGaze }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookAt?.x, lookAt?.y]);

  const isLookingAt = lookAt != null;

  // Independent idle animation (blink + gaze + expression drift) while not
  // reacting to a physical interaction, to fresh text, or to a tracked cursor.
  useEffect(() => {
    if (expression !== undefined) return;
    if (isLookingAt) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let blinkTimeoutId: ReturnType<typeof setTimeout>;
    let step = hash % 7;

    const scheduleNext = () => {
      step += 1;

      if (!busyRef.current && performance.now() >= reactionLockUntilRef.current) {
        const rand = Math.random();
        const preset = GAZE_PRESETS[(step + Math.floor(rand * GAZE_PRESETS.length)) % GAZE_PRESETS.length];
        const nextExpression = IDLE_EXPRESSIONS[Math.floor(Math.random() * IDLE_EXPRESSIONS.length)];
        const altSign: 1 | -1 = step % 2 === 0 ? 1 : -1;
        const target = preferredGaze(nextExpression, altSign, preset);

        setGaze((prev) => ({ ...prev, expression: "blink" }));

        blinkTimeoutId = setTimeout(() => {
          if (!busyRef.current && performance.now() >= reactionLockUntilRef.current) {
            setGaze({ dx: target.dx, dy: target.dy, expression: nextExpression });
          }
        }, 120);
      }

      const nextDelay = 1500 + ((hash % 7) * 180) + Math.floor(Math.random() * 1500);
      timeoutId = setTimeout(scheduleNext, nextDelay);
    };

    const initialDelay = 700 + (hash % 1100);
    timeoutId = setTimeout(scheduleNext, initialDelay);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(blinkTimeoutId);
    };
  }, [hash, expression, isLookingAt]);

  const isFlatPill = faceStyle === "flat-pill";
  const expr = gaze.expression;
  const faceOffsetX = isFlatPill ? gaze.dx * 2.2 : gaze.dx * 0.85;
  const faceOffsetY = isFlatPill ? gaze.dy * 1.8 : gaze.dy * 0.65;
  const faceTiltDeg = isFlatPill ? gaze.dx * -6.5 : 0;

  const blush = BLUSH[expr] ?? DEFAULT_BLUSH;
  const wearsGlasses = expr === "cool" || expr === "nerdy";

  const renderEye = (eyeX: number, eyeY: number, isRightEye: boolean) => {
    const wrap = (children: ReactNode, extraStyle?: CSSProperties) => (
      <g
        style={{
          transform: `translate(${eyeX}px, ${eyeY}px)`,
          transition: "transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          ...extraStyle,
        }}
      >
        {children}
      </g>
    );

    switch (expr) {
      case "starstruck":
        return wrap(<path d="M 0 -5.4 Q 0.4 -0.4 4.4 0 Q 0.4 0.4 0 5.4 Q -0.4 0.4 -4.4 0 Q -0.4 -0.4 0 -5.4 Z" fill="#18181b" />);

      case "loving":
        return wrap(
          <path
            d="M 0 4.2 C -0.5 3.8 -4.4 1.2 -4.4 -1.8 C -4.4 -3.8 -2.8 -4.8 -1.3 -4.8 C -0.4 -4.8 0 -4.1 0 -3.4 C 0 -4.1 0.4 -4.8 1.3 -4.8 C 2.8 -4.8 4.4 -3.8 4.4 -1.8 C 4.4 1.2 0.5 3.8 0 4.2 Z"
            fill="#e01e5a"
          />
        );

      case "moneyEyes":
        return wrap(
          <text x="0" y="3.6" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#1d7a3a">
            $
          </text>
        );

      case "playful": {
        const d = isRightEye
          ? `M ${3.0} ${-3.6} L ${-2.6} 0 L ${3.0} ${3.6}`
          : `M ${-3.0} ${-3.6} L ${2.6} 0 L ${-3.0} ${3.6}`;
        return wrap(<path d={d} fill="none" stroke="#18181b" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />);
      }

      case "angry": {
        const tilt = isRightEye ? 18 : -18;
        return wrap(
          <rect x="-2.2" y="-5.3" width="4.4" height="10.6" rx="2.2" fill="#18181b" />,
          { transform: `translate(${eyeX}px, ${eyeY - 1}px) rotate(${tilt}deg)` }
        );
      }

      case "devilish": {
        const tilt = isRightEye ? -14 : 14;
        return wrap(
          <rect x="-2.1" y="-5" width="4.2" height="10" rx="2.1" fill="#18181b" />,
          { transform: `translate(${eyeX}px, ${eyeY}px) rotate(${tilt}deg)` }
        );
      }

      case "dizzy":
        return wrap(
          <path
            d="M 0 0 C 2.6 0 2.6 -3.2 0 -3.2 C -1.8 -3.2 -1.8 -0.9 0.3 -0.9 C 1.6 -0.9 1.6 1.4 -0.6 1.4"
            fill="none"
            stroke="#18181b"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        );

      case "zany":
        return isRightEye
          ? wrap(<circle cx="0" cy="0" r="1.4" fill="#18181b" />)
          : wrap(
              <path
                d="M 0 0 C 2.6 0 2.6 -3.2 0 -3.2 C -1.8 -3.2 -1.8 -0.9 0.3 -0.9 C 1.6 -0.9 1.6 1.4 -0.6 1.4"
                fill="none"
                stroke="#18181b"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            );

      case "cool":
        return wrap(<rect x="-4.6" y="-3.6" width="9.2" height="6.6" rx="2" fill="#18181b" opacity="0.88" />);

      case "nerdy":
        return wrap(
          <>
            <circle cx="0" cy="0" r="4.6" fill="none" stroke="#18181b" strokeWidth="1.4" />
            <circle cx="0" cy="0.4" r="1.6" fill="#18181b" />
          </>
        );

      case "confused": {
        if (isRightEye) {
          return wrap(<ellipse cx="0" cy="0" rx="3.3" ry="4.4" fill="#18181b" />);
        }
        return wrap(<rect x="-2.2" y="-5.3" width="4.4" height="10.6" rx="2.2" fill="#18181b" />);
      }

      case "smug":
        return isRightEye
          ? wrap(<rect x="-2.2" y="-5.3" width="4.4" height="10.6" rx="2.2" fill="#18181b" />)
          : wrap(
              <path d="M -3.4 0.6 Q 0 -2.6 3.4 0.6" fill="none" stroke="#18181b" strokeWidth="2.3" strokeLinecap="round" />
            );

      case "wink":
      case "cheeky":
        return isRightEye
          ? wrap(<rect x="-2.2" y="-5.3" width="4.4" height="10.6" rx="2.2" fill="#18181b" />)
          : wrap(<path d="M -3.2 0 Q 0 2.4 3.2 0" fill="none" stroke="#18181b" strokeWidth="2.3" strokeLinecap="round" />);

      case "sleepy":
      case "yawning":
      case "angelic":
      case "relieved":
      case "proud":
        return wrap(
          <path d="M -3.4 0.4 Q 0 2.4 3.4 0.4" fill="none" stroke="#18181b" strokeWidth="2.2" strokeLinecap="round" />
        );

      case "skeptical":
        return isRightEye
          ? wrap(<rect x="-2.2" y="-5.3" width="4.4" height="10.6" rx="2.2" fill="#18181b" />)
          : wrap(
              <rect x="-2.6" y="-1.5" width="5.2" height="3" rx="1.3" fill="#18181b" />,
              { transform: `translate(${eyeX}px, ${eyeY + 1}px) rotate(-8deg)` }
            );

      case "tipsy":
        return wrap(
          <rect x="-2.3" y="-4.4" width="4.6" height="8.8" rx="2.2" fill="#18181b" />,
          { transform: `translate(${eyeX}px, ${eyeY + (isRightEye ? 1.4 : -0.6)}px) rotate(${isRightEye ? 8 : -5}deg) scale(1, 0.55)` }
        );

      case "laugh":
        return wrap(
          <path d={`M -3.5 1.2 Q 0 -4.4 3.5 1.2`} fill="none" stroke="#18181b" strokeWidth="3.1" strokeLinecap="round" />
        );

      case "cute":
        if (isRightEye) {
          return wrap(
            <path d="M -3.5 1.2 Q 0 -4.4 3.5 1.2" fill="none" stroke="#18181b" strokeWidth="3.1" strokeLinecap="round" />
          );
        }
        break;

      default:
        break;
    }

    // Shared "pill" eye used by the remaining expressions, with small
    // per-expression tweaks to squash/stretch/perspective.
    const perspectiveX = (isRightEye && gaze.dx > 0.5) || (!isRightEye && gaze.dx < -0.5) ? 0.88 : 1;
    let scaleY = 1;
    let scaleX = perspectiveX;
    let offsetY = 0;

    if (expr === "blink") scaleY = 0.1;
    else if (expr === "shy") scaleY = 0.76;
    else if (expr === "surprised") {
      scaleY = 1.2;
      scaleX = 1.14 * perspectiveX;
    } else if (expr === "excited") {
      scaleY = 1.3;
      scaleX = 1.2 * perspectiveX;
    } else if (expr === "sad" || expr === "crying") {
      scaleY = 0.85;
      offsetY = 0.6;
    } else if (expr === "worried") {
      scaleY = 1.1;
    } else if (expr === "bored") {
      scaleY = 0.35;
    } else if (expr === "disgusted") {
      scaleY = 0.22;
    } else if (expr === "thinking") {
      scaleY = 0.9;
    } else if (expr === "scared") {
      scaleY = 1.35;
      scaleX = 0.72 * perspectiveX;
    } else if (expr === "embarrassed") {
      scaleY = 1.15;
    } else if (expr === "touched") {
      scaleY = 0.95;
    }

    return (
      <g
        style={{
          transform: `translate(${eyeX}px, ${eyeY + offsetY}px) scale(${scaleX}, ${scaleY})`,
          transformOrigin: "0px 0px",
          transition: expr === "blink" ? "transform 80ms ease-in" : "transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <rect x="-2.2" y="-5.3" width="4.4" height="10.6" rx="2.2" fill="#18181b" />
        {expr === "crying" && isRightEye && (
          <path d="M 2.8 6 C 2.8 9 6.4 9 6.4 6 C 6.4 4.2 4.6 2.6 2.8 6 Z" fill="#5ec8f0" opacity="0.85" />
        )}
        {expr === "worried" && isRightEye && (
          <path d="M 5.4 -6.8 C 5.4 -4.4 8.2 -4.2 8.2 -6.4 C 8.2 -7.7 6.8 -8.9 5.4 -6.8 Z" fill="#7cc8ea" opacity="0.8" />
        )}
        {expr === "touched" && isRightEye && (
          <path d="M 2.6 5.6 C 2.6 7.6 5 7.6 5 5.6 C 5 4.4 3.8 3.3 2.6 5.6 Z" fill="#7cc8ea" opacity="0.75" />
        )}
      </g>
    );
  };

  const renderMouth = () => {
    const mx = 20 + gaze.dx * 0.35;
    const my = 26.8 + gaze.dy * 0.3;
    const wrap = (children: ReactNode) => (
      <g style={{ transform: `translate(${mx}px, ${my}px)`, transition: "transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
        {children}
      </g>
    );

    switch (expr) {
      case "laugh":
      case "playful":
      case "starstruck":
      case "moneyEyes":
      case "excited":
        return wrap(
          <>
            <path d="M -4.6 -1.4 Q 0 -0.8 4.6 -1.4 C 4.8 4.6 -4.8 4.6 -4.6 -1.4 Z" fill="#18181b" />
            <path d="M -2.7 1.3 Q 0 -0.2 2.7 1.3 C 2.1 3.3 -2.1 3.3 -2.7 1.3 Z" fill="#ff6b9d" />
          </>
        );

      case "zany":
        return wrap(
          <path d="M -5 -1 Q 1 2.4 5.4 -2.2 C 5.6 4.8 -5.4 5.4 -5 -1 Z" fill="#18181b" />
        );

      case "shy":
      case "angelic":
      case "wink":
      case "cool":
      case "nerdy":
        return wrap(
          <path d="M -3.2 -0.4 Q -1.6 1.7 0 -0.3 Q 1.6 1.7 3.2 -0.4" fill="none" stroke="#18181b" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round" />
        );

      case "cute":
        return wrap(
          <>
            <path d="M 0.2 0.2 C 0.2 3.6 3.5 3.6 3.5 0.2 Z" fill="#ff5c8a" stroke="#18181b" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M -3.6 -0.8 Q 0 2.2 3.6 -0.8" fill="none" stroke="#18181b" strokeWidth="2.1" strokeLinecap="round" />
          </>
        );

      case "surprised":
        return wrap(
          <>
            <ellipse cx="0" cy="0.3" rx="2.5" ry="2.9" fill="#18181b" />
            <ellipse cx="0" cy="1.4" rx="1.4" ry="1.05" fill="#ff6b9d" />
          </>
        );

      case "yawning":
        return wrap(<ellipse cx="0" cy="1" rx="3.2" ry="4.2" fill="#18181b" />);

      case "sad":
      case "crying":
        return wrap(<path d="M -3.4 1.2 Q 0 -2.2 3.4 1.2" fill="none" stroke="#18181b" strokeWidth="2.1" strokeLinecap="round" />);

      case "angry":
        return wrap(<path d="M -3.2 0.6 Q 0 1.6 3.2 0.6" fill="none" stroke="#18181b" strokeWidth="2.4" strokeLinecap="round" />);

      case "worried":
        return wrap(
          <path d="M -3.6 -0.6 Q -2 1.8 -0.8 -0.6 Q 0.5 1.8 1.8 -0.6 Q 3.2 1.8 3.6 -0.6" fill="none" stroke="#18181b" strokeWidth="1.9" strokeLinecap="round" />
        );

      case "disgusted":
        return wrap(
          <path d="M -3.2 1 L -1 -0.4 L 1 1.2 L 3.2 -0.4" fill="none" stroke="#18181b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        );

      case "confused":
        return wrap(<path d="M -3 0 Q -1 1.8 0 0 Q 1 1.8 3 0" fill="none" stroke="#18181b" strokeWidth="1.8" strokeLinecap="round" />);

      case "bored":
        return wrap(<path d="M -2.6 0 L 2.6 0" fill="none" stroke="#18181b" strokeWidth="2.1" strokeLinecap="round" />);

      case "smug":
        return wrap(<path d="M -3 0.6 Q 1.5 -2 4 -1.4" fill="none" stroke="#18181b" strokeWidth="2.1" strokeLinecap="round" />);

      case "devilish":
        return wrap(
          <>
            <path d="M -3 0.4 Q 1 -2.2 3.6 -1.2" fill="none" stroke="#18181b" strokeWidth="2.1" strokeLinecap="round" />
            <path d="M 3.6 -1.2 L 5 0.4 L 3 0.6 Z" fill="#18181b" />
          </>
        );

      case "sleepy":
        return wrap(<ellipse cx="0" cy="1.4" rx="1.4" ry="1" fill="#18181b" />);

      case "dizzy":
        return wrap(<path d="M -3 0.4 Q -1.5 -1 0 0.4 Q 1.5 1.8 3 0.4" fill="none" stroke="#18181b" strokeWidth="1.7" strokeLinecap="round" />);

      case "thinking":
        return wrap(<path d="M -2.4 0.4 Q 0.5 -0.6 3 0.2" fill="none" stroke="#18181b" strokeWidth="1.9" strokeLinecap="round" />);

      case "scared":
        return wrap(<ellipse cx="0" cy="0.6" rx="1.6" ry="2.6" fill="#18181b" />);

      case "embarrassed":
        return wrap(<ellipse cx="0" cy="0.8" rx="1.3" ry="1.6" fill="#18181b" />);

      case "relieved":
        return wrap(<path d="M -2.6 0 Q 0 3.4 2.6 0 Q 0 1.6 -2.6 0 Z" fill="#18181b" opacity="0.85" />);

      case "proud":
        return wrap(<path d="M -4 -0.6 Q 0 3.4 4 -0.6" fill="none" stroke="#18181b" strokeWidth="2.3" strokeLinecap="round" />);

      case "skeptical":
        return wrap(<path d="M -3.2 0.4 Q 0 -0.3 3.2 1.2" fill="none" stroke="#18181b" strokeWidth="1.9" strokeLinecap="round" />);

      case "tipsy":
        return wrap(
          <path d="M -3.8 -0.6 Q 0.5 2.2 4.4 -1.4 C 5 4.4 -4.6 4.8 -3.8 -0.6 Z" fill="#18181b" opacity="0.88" />
        );

      case "cheeky":
        return wrap(
          <>
            <path d="M -4.2 -1.2 Q 0 -0.6 4.2 -1.2 C 4.4 3.4 -4.4 3.4 -4.2 -1.2 Z" fill="#18181b" />
            <path d="M -1.6 1.8 Q 0 5.2 1.8 1.8 Q 0.4 3 -1.6 1.8 Z" fill="#ff5c8a" />
          </>
        );

      default:
        return wrap(<path d="M -3.5 -0.8 Q 0 2.6 3.5 -0.8" fill="none" stroke="#18181b" strokeWidth="2.1" strokeLinecap="round" />);
    }
  };

  return (
    <div
      ref={wrapperRef}
      onClick={() => {
        if (actorIdRef.current) pokeActor(actorIdRef.current);
      }}
      className={className}
      style={{ position: "relative", cursor: "pointer", userSelect: "none", display: "inline-block" }}
      title="Click to interact"
    >
      <div
        ref={bodyRef}
        style={{
          width: "100%",
          height: "100%",
          overflow: "visible",
          willChange: "transform",
        }}
      >
        <svg
          viewBox="0 0 40 40"
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            // A drop-shadow (not box-shadow) so it traces the mochi
            // silhouette's actual alpha shape instead of a rectangular or
            // perfectly circular box.
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.08))",
          }}
        >
          <defs>
            <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={palette.bgStart} />
              <stop offset="100%" stopColor={palette.bgEnd} />
            </linearGradient>
            <filter id={`blur-${id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
            {/* Glassy sheen: a soft upper-left radial highlight, blended with
                "screen" so it brightens the colors underneath rather than
                flattening them to white. */}
            <radialGradient id={`sheen-${id}`} cx="32%" cy="24%" r="78%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="35%" stopColor="#ffffff" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            {/* The mochi silhouette (v3): a smooth closed spline, not CSS
                border-radius — border-radius interpolates between corners
                with a straight tangent, which showed a visible flat "cut"
                edge when two corners diverged. This stays close to round
                on purpose; see mochiShape.ts. */}
            <clipPath id={`mochi-${id}`}>
              <path d={mochiPathD} />
            </clipPath>
          </defs>
          <g clipPath={`url(#mochi-${id})`}>
            <rect width="40" height="40" fill={`url(#bg-${id})`} />
            <g filter={`url(#blur-${id})`}>
              <circle cx={cx1} cy={cy1} r="13" fill={palette.blob1} opacity="0.88" />
              <circle cx={cx2} cy={cy2} r="10" fill={palette.blob2} opacity="0.78" />
              <circle cx={cx3} cy={cy3} r="8" fill={palette.blob3} opacity="0.7" />
            </g>

            {/* The gloss tracks gaze direction too, like a separate glass
                surface in front of the face — but at a fraction of the
                face's own movement (parallax), so it reads as sitting on
                the curved surface rather than rigidly glued to the eyes. */}
            <g
              style={{
                transform: `translate(${faceOffsetX * 0.6}px, ${faceOffsetY * 0.6}px) rotate(${faceTiltDeg * 0.6}deg)`,
                transformOrigin: "20px 20px",
                transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <circle cx="20" cy="20" r="20" fill={`url(#sheen-${id})`} style={{ mixBlendMode: "screen" }} />
              {/* Two overlapping specular streaks, set high on the
                  "forehead" so they never cross the eyes/mouth below. */}
              <g opacity="0.85" style={{ mixBlendMode: "screen" }}>
                <ellipse cx="13" cy="9.5" rx="1.3" ry="3.6" fill="#ffffff" opacity="0.85" transform="rotate(-16 13 9.5)" />
                <ellipse cx="17.3" cy="11" rx="1" ry="2.8" fill="#ffffff" opacity="0.65" transform="rotate(-12 17.3 11)" />
              </g>
            </g>

            <g
              style={{
                transform: `translate(${faceOffsetX}px, ${faceOffsetY}px) rotate(${faceTiltDeg}deg)`,
                transformOrigin: "20px 20px",
                transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <ellipse cx="9.2" cy="22.8" rx={3.2 * blush.scale} ry={1.8 * blush.scale} fill={palette.blush} opacity={blush.opacity} style={{ transition: "all 220ms ease" }} />
              <ellipse cx="30.8" cy="22.8" rx={3.2 * blush.scale} ry={1.8 * blush.scale} fill={palette.blush} opacity={blush.opacity} style={{ transition: "all 220ms ease" }} />

              {renderEye(14.3, 17.5, false)}
              {renderEye(25.7, 17.5, true)}
              {wearsGlasses && (
                <path d="M 18.4 17.8 L 21.6 17.8" stroke="#18181b" strokeWidth="1.3" opacity="0.88" />
              )}

              {renderMouth()}
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
});
