import type { GazeState } from "./types";
import { SCENARIOS, SCENARIO_NAMES, type ScenarioStep } from "./scenarios";

// --- Cross-avatar interaction & gravity-physics coordinator ---
//
// Any mounted <LivingAvatar> registers itself here. Avatars that end up
// stacked vertically in the same column (e.g. a comment list, a chat feed)
// occasionally bump into each other — one hops up and headbutts the one
// above it, or the one above topples down onto the one below — using a
// small manual physics simulation (gravity + squash/stretch + bounce
// restitution), not a physics library. This is intentionally host-agnostic:
// it only reads each avatar's DOM position, so it works the same whether
// the avatars sit in a React app, a web component, or anywhere else this
// module is loaded.

export interface AvatarActor {
  id: string;
  getWrapperEl: () => HTMLDivElement | null;
  getBodyEl: () => HTMLDivElement | null;
  setReaction: (gaze: GazeState, holdMs: number) => void;
  isBusy: () => boolean;
  setBusy: (busy: boolean) => void;
}

const activeAvatars = new Map<string, AvatarActor>();
let coordinatorTimer: ReturnType<typeof setTimeout> | null = null;

const GRAVITY = 1950; // px/s^2

function applyBodyTransform(
  el: HTMLDivElement | null,
  y: number,
  sx: number,
  sy: number,
  rot = 0,
  elevated = false,
  x = 0
) {
  if (!el) return;
  if (
    Math.abs(x) < 0.1 &&
    Math.abs(y) < 0.1 &&
    Math.abs(sx - 1) < 0.01 &&
    Math.abs(sy - 1) < 0.01 &&
    Math.abs(rot) < 0.1
  ) {
    el.style.transform = "";
    el.style.zIndex = "";
  } else {
    el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${sx.toFixed(3)}, ${sy.toFixed(3)}) rotate(${rot.toFixed(1)}deg)`;
    el.style.zIndex = elevated ? "30" : "";
  }
}

// Hard ceiling on any single gravity-driven animation. Physics parameters
// here are hand-tuned constants; if a particular DOM layout ever produces
// values that don't converge, this guarantees the avatar snaps back to
// rest instead of drifting off-screen forever.
const MAX_PHYSICS_DURATION_MS = 2500;

function runFloorBounce(
  actor: AvatarActor,
  initialY: number,
  initialV: number,
  restitution: number,
  initialSquashX = 1,
  initialSquashY = 1,
  onDone?: () => void
) {
  let y = initialY;
  let v = initialV;
  let sx = initialSquashX;
  let sy = initialSquashY;
  let bounces = 0;
  const startTime = performance.now();
  let lastTime = startTime;

  const step = (now: number) => {
    if (now - startTime > MAX_PHYSICS_DURATION_MS) {
      applyBodyTransform(actor.getBodyEl(), 0, 1, 1, 0, false);
      actor.setBusy(false);
      onDone?.();
      return;
    }

    const dt = Math.min(0.032, (now - lastTime) / 1000);
    lastTime = now;

    v += GRAVITY * dt;
    y += v * dt;

    sx += (1 - sx) * Math.min(1, dt * 18);
    sy += (1 - sy) * Math.min(1, dt * 18);

    if (y >= 0 && v > 0) {
      y = 0;
      bounces += 1;
      const impactSpeed = Math.abs(v);
      if (impactSpeed < 42 || bounces > 4) {
        applyBodyTransform(actor.getBodyEl(), 0, 1, 1, 0, false);
        actor.setBusy(false);
        onDone?.();
        return;
      }
      v = -impactSpeed * restitution;
      const squashAmt = Math.min(0.28, impactSpeed / 950);
      sx = 1 + squashAmt;
      sy = 1 - squashAmt * 0.85;
    }

    applyBodyTransform(actor.getBodyEl(), y, sx, sy, 0, true);
    requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

/** Scenario 1: the bottom avatar jumps up and headbutts the one above it. */
function triggerHeadbuttUp(bottomActor: AvatarActor, topActor: AvatarActor, contactDist: number) {
  bottomActor.setBusy(true);
  topActor.setBusy(true);

  const startTime = performance.now();
  let lastTime = startTime;
  let phase: "anticipation" | "ascending" = "anticipation";
  let y = 0;
  const impactUpSpeed = 150;
  let v = -Math.sqrt(2 * GRAVITY * contactDist + impactUpSpeed * impactUpSpeed);

  bottomActor.setReaction({ dx: 0, dy: -1.6, expression: "cute" }, 1200);

  const step = (now: number) => {
    if (now - startTime > MAX_PHYSICS_DURATION_MS) {
      applyBodyTransform(bottomActor.getBodyEl(), 0, 1, 1, 0, false);
      applyBodyTransform(topActor.getBodyEl(), 0, 1, 1, 0, false);
      bottomActor.setBusy(false);
      topActor.setBusy(false);
      return;
    }

    const dt = Math.min(0.032, (now - lastTime) / 1000);
    lastTime = now;
    const elapsed = (now - startTime) / 1000;

    if (phase === "anticipation") {
      const prepDuration = 0.24;
      if (elapsed < prepDuration) {
        const p = Math.sin((elapsed / prepDuration) * Math.PI);
        const crouchY = p * 5.5;
        const sx = 1 + p * 0.2;
        const sy = 1 - p * 0.18;
        applyBodyTransform(bottomActor.getBodyEl(), crouchY, sx, sy, 0, true);
        requestAnimationFrame(step);
        return;
      }
      phase = "ascending";
    }

    v += GRAVITY * dt;
    y += v * dt;

    const stretch = Math.min(0.16, Math.abs(v) / 2200);
    applyBodyTransform(bottomActor.getBodyEl(), y, 1 - stretch * 0.7, 1 + stretch, -4, true);

    if (y <= -contactDist) {
      y = -contactDist;

      topActor.setReaction({ dx: 0, dy: 1.5, expression: "surprised" }, 1400);
      runFloorBounce(topActor, -2, -255, 0.48, 1.24, 0.78, () => {
        topActor.setReaction({ dx: 0, dy: 0.4, expression: "shy" }, 1400);
      });

      bottomActor.setReaction({ dx: 0, dy: -0.8, expression: "laugh" }, 1500);
      runFloorBounce(bottomActor, -contactDist, 95, 0.46, 1.22, 0.8);
      return;
    }

    requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

/** Scenario 2: the top avatar falls onto the one below, then rebounds back up. */
function triggerFallDownOnto(topActor: AvatarActor, bottomActor: AvatarActor, contactDist: number) {
  topActor.setBusy(true);
  bottomActor.setBusy(true);

  const fallStartTime = performance.now();
  let lastTime = fallStartTime;
  let y = 0;
  let v = -105;
  let phase: "falling" | "reboundingUp" = "falling";

  topActor.setReaction({ dx: 0, dy: 1.6, expression: "surprised" }, 900);

  const step = (now: number) => {
    if (now - fallStartTime > MAX_PHYSICS_DURATION_MS) {
      applyBodyTransform(topActor.getBodyEl(), 0, 1, 1, 0, false);
      applyBodyTransform(bottomActor.getBodyEl(), 0, 1, 1, 0, false);
      topActor.setBusy(false);
      bottomActor.setBusy(false);
      return;
    }

    const dt = Math.min(0.032, (now - lastTime) / 1000);
    lastTime = now;

    v += GRAVITY * dt;
    y += v * dt;

    if (phase === "falling") {
      const stretch = v > 0 ? Math.min(0.18, v / 1900) : 0;
      applyBodyTransform(topActor.getBodyEl(), y, 1 - stretch * 0.65, 1 + stretch, 5, true);

      if (y >= contactDist && v > 0) {
        y = contactDist;
        phase = "reboundingUp";

        bottomActor.setReaction({ dx: 0, dy: -1.6, expression: "surprised" }, 1500);
        runFloorBounce(bottomActor, 6.5, 135, 0.52, 1.32, 0.68, () => {
          bottomActor.setReaction({ dx: 0, dy: -0.4, expression: "laugh" }, 1400);
        });

        const overshootHeight = 15;
        v = -Math.sqrt(2 * GRAVITY * (contactDist + overshootHeight));
        topActor.setReaction({ dx: 0, dy: 0, expression: "shy" }, 1600);
        applyBodyTransform(topActor.getBodyEl(), y, 1.26, 0.76, -6, true);
      }

      requestAnimationFrame(step);
      return;
    }

    const stretch = Math.min(0.14, Math.abs(v) / 2200);
    applyBodyTransform(topActor.getBodyEl(), y, 1 - stretch * 0.5, 1 + stretch, -3, true);

    if (y <= 0 && v >= 0) {
      runFloorBounce(topActor, y, v, 0.48, 1, 1, () => {
        topActor.setReaction({ dx: 0, dy: 0, expression: "laugh" }, 1200);
      });
      return;
    }

    requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

/** Scenario 3: an avatar rolls off to the side, peeks back in, then rolls back. */
function triggerRollOutAndPeek(actor: AvatarActor) {
  if (actor.isBusy()) return;
  actor.setBusy(true);

  const wrapperEl = actor.getWrapperEl();
  const width = wrapperEl?.offsetWidth || 40;
  const rollOutX = -Math.round(Math.max(54, width * 1.55));
  const peekX = -Math.round(width * 0.48);

  const startTime = performance.now();
  let phase: "anticipate" | "rollOut" | "peek" | "rollBack" | "settle" = "anticipate";
  let phaseStartTime = startTime;

  actor.setReaction({ dx: -1.8, dy: 0, expression: "cute" }, 2500);

  const step = (now: number) => {
    const elapsedPhase = now - phaseStartTime;

    if (phase === "anticipate") {
      const dur = 200;
      const p = Math.min(1, elapsedPhase / dur);
      const prepX = Math.sin(p * Math.PI) * 3.5;
      const sx = 1 + Math.sin(p * Math.PI) * 0.12;
      const sy = 1 - Math.sin(p * Math.PI) * 0.1;
      applyBodyTransform(actor.getBodyEl(), 0, sx, sy, prepX * 1.5, true, prepX);

      if (p >= 1) {
        phase = "rollOut";
        phaseStartTime = now;
        actor.setReaction({ dx: -2.0, dy: 0, expression: "surprised" }, 1500);
      }
      requestAnimationFrame(step);
      return;
    }

    if (phase === "rollOut") {
      const dur = 420;
      const p = Math.min(1, elapsedPhase / dur);
      const ease = p * p;
      const curX = 0 + (rollOutX - 0) * ease;
      const rot = -ease * 360;
      const bobY = Math.sin(p * Math.PI * 2) * 2.2;

      applyBodyTransform(actor.getBodyEl(), bobY, 1.08, 0.94, rot, true, curX);

      if (p >= 1) {
        phase = "peek";
        phaseStartTime = now;
        actor.setReaction({ dx: 2.2, dy: -0.2, expression: "starstruck" }, 1200);
      }
      requestAnimationFrame(step);
      return;
    }

    if (phase === "peek") {
      const dur = 820;
      const p = Math.min(1, elapsedPhase / dur);

      let curX = rollOutX;
      let rot = -8;
      if (p < 0.35) {
        const subP = p / 0.35;
        const easeOut = 1 - Math.pow(1 - subP, 3);
        curX = rollOutX + (peekX - rollOutX) * easeOut;
        rot = -360 * (1 - easeOut) - 8 * easeOut;
      } else if (p < 0.75) {
        const subP = (p - 0.35) / 0.4;
        const wiggle = Math.sin(subP * Math.PI * 2) * 1.5;
        curX = peekX + wiggle;
        rot = -8 + wiggle * 2;
        if (subP > 0.4 && subP < 0.6) {
          actor.setReaction({ dx: 2.2, dy: 0, expression: "playful" }, 400);
        }
      } else {
        const subP = (p - 0.75) / 0.25;
        curX = peekX - subP * 3;
        rot = -8;
      }

      applyBodyTransform(actor.getBodyEl(), 0, 1, 1, rot, true, curX);

      if (p >= 1) {
        phase = "rollBack";
        phaseStartTime = now;
        actor.setReaction({ dx: 1.8, dy: 0, expression: "laugh" }, 1400);
      }
      requestAnimationFrame(step);
      return;
    }

    if (phase === "rollBack") {
      const dur = 360;
      const p = Math.min(1, elapsedPhase / dur);
      const ease = 1 - Math.pow(1 - p, 2.5);
      const curX = peekX + (0 - peekX) * ease;
      const rot = (1 - ease) * -180;
      const bobY = Math.sin(p * Math.PI) * -3;

      applyBodyTransform(actor.getBodyEl(), bobY, 0.95, 1.05, rot, true, curX);

      if (p >= 1) {
        phase = "settle";
        phaseStartTime = now;
        actor.setReaction({ dx: 0, dy: 0, expression: "happy" }, 1500);
      }
      requestAnimationFrame(step);
      return;
    }

    if (phase === "settle") {
      const dur = 220;
      const p = Math.min(1, elapsedPhase / dur);
      const osc = Math.sin(p * Math.PI * 2) * Math.exp(-p * 3.5);
      const curX = osc * 4.5;
      const sx = 1 + osc * 0.15;
      const sy = 1 - osc * 0.12;
      applyBodyTransform(actor.getBodyEl(), 0, sx, sy, 0, true, curX);

      if (p >= 1) {
        applyBodyTransform(actor.getBodyEl(), 0, 1, 1, 0, false, 0);
        actor.setBusy(false);
        return;
      }
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
}

function createWhisperBubble(): HTMLDivElement {
  const el = document.createElement("div");
  el.textContent = "🤫";
  el.style.position = "fixed";
  el.style.zIndex = "9999";
  el.style.fontSize = "15px";
  el.style.lineHeight = "1";
  el.style.pointerEvents = "none";
  el.style.opacity = "0";
  el.style.transform = "translate(-50%, -50%) scale(0.5)";
  el.style.transition = "opacity 180ms ease, transform 180ms ease";
  document.body.appendChild(el);
  return el;
}

function positionWhisperBubble(el: HTMLDivElement, x: number, y: number) {
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}

/**
 * One avatar leans in close to a nearby one and "whispers" (a small 🤫
 * bubble appears between them); the listener reacts to the secret, then
 * both settle back. Unlike the headbutt/fall-onto scenarios this isn't a
 * gravity simulation — just an eased lean-in / hold / reveal / lean-back.
 */
function triggerWhisper(whisperer: AvatarActor, listener: AvatarActor, dx: number, dy: number, dist: number) {
  whisperer.setBusy(true);
  listener.setBusy(true);

  const ux = dist > 0 ? dx / dist : 1;
  const uy = dist > 0 ? dy / dist : 0;
  const leanDist = Math.min(dist * 0.4, 46);
  const tiltSign = ux >= 0 ? 1 : -1;

  const bubble = createWhisperBubble();
  const updateBubblePosition = () => {
    const a = whisperer.getWrapperEl()?.getBoundingClientRect();
    const b = listener.getWrapperEl()?.getBoundingClientRect();
    if (!a || !b) return;
    const midX = (a.left + a.width / 2 + b.left + b.width / 2) / 2;
    const midY = (a.top + a.height / 2 + b.top + b.height / 2) / 2 - Math.max(a.height, b.height) * 0.55;
    positionWhisperBubble(bubble, midX, midY);
  };
  updateBubblePosition();

  const cleanupBubble = () => {
    bubble.style.opacity = "0";
    bubble.style.transform = "translate(-50%, -50%) scale(0.5)";
    setTimeout(() => bubble.remove(), 200);
  };

  listener.setReaction({ dx: -ux * 1.6, dy: -uy * 1.2, expression: "cute" }, 2200);

  const startTime = performance.now();
  let phase: "leanIn" | "whisper" | "reveal" | "leanBack" = "leanIn";
  let phaseStartTime = startTime;
  let bubbleShown = false;

  const step = (now: number) => {
    const elapsedPhase = now - phaseStartTime;
    updateBubblePosition();

    if (phase === "leanIn") {
      const dur = 340;
      const p = Math.min(1, elapsedPhase / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      applyBodyTransform(whisperer.getBodyEl(), uy * leanDist * ease, 1, 1, tiltSign * 10 * ease, true, ux * leanDist * ease);

      if (!bubbleShown && p > 0.4) {
        bubbleShown = true;
        requestAnimationFrame(() => {
          bubble.style.opacity = "1";
          bubble.style.transform = "translate(-50%, -50%) scale(1)";
        });
      }

      if (p >= 1) {
        phase = "whisper";
        phaseStartTime = now;
      }
      requestAnimationFrame(step);
      return;
    }

    if (phase === "whisper") {
      const dur = 1100;
      const p = Math.min(1, elapsedPhase / dur);
      const wiggle = Math.sin(p * Math.PI * 5) * 1.1;
      applyBodyTransform(
        whisperer.getBodyEl(),
        uy * leanDist + wiggle * uy,
        1,
        1,
        tiltSign * 10 + wiggle,
        true,
        ux * leanDist + wiggle * ux
      );

      if (p >= 1) {
        phase = "reveal";
        phaseStartTime = now;
        cleanupBubble();
        const reactions: Array<{ expression: GazeState["expression"]; dx: number; dy: number }> = [
          { expression: "surprised", dx: -ux * 1.4, dy: -1.3 },
          { expression: "laugh", dx: 0, dy: 0 },
          { expression: "shy", dx: ux > 0 ? 1.4 : -1.4, dy: 0.6 },
        ];
        const reaction = reactions[Math.floor(Math.random() * reactions.length)];
        listener.setReaction(reaction, 1500);
        whisperer.setReaction({ dx: 0, dy: 0, expression: "playful" }, 1500);
      }
      requestAnimationFrame(step);
      return;
    }

    if (phase === "reveal") {
      const dur = 260;
      const p = Math.min(1, elapsedPhase / dur);
      const pulse = Math.sin(p * Math.PI) * 0.14;
      applyBodyTransform(listener.getBodyEl(), 0, 1 + pulse, 1 - pulse, 0, true);

      if (p >= 1) {
        applyBodyTransform(listener.getBodyEl(), 0, 1, 1, 0, false);
        phase = "leanBack";
        phaseStartTime = now;
      }
      requestAnimationFrame(step);
      return;
    }

    if (phase === "leanBack") {
      const dur = 320;
      const p = Math.min(1, elapsedPhase / dur);
      const ease = 1 - Math.pow(1 - p, 2.5);
      const remaining = 1 - ease;
      applyBodyTransform(
        whisperer.getBodyEl(),
        uy * leanDist * remaining,
        1,
        1,
        tiltSign * 10 * remaining,
        true,
        ux * leanDist * remaining
      );

      if (p >= 1) {
        applyBodyTransform(whisperer.getBodyEl(), 0, 1, 1, 0, false);
        whisperer.setBusy(false);
        listener.setBusy(false);
        return;
      }
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
}

/**
 * Runs a data-described, multi-step activity (see scenarios.ts) between two
 * actors. Unlike the gravity-driven scenarios above, every step has a fixed
 * duration, so the whole activity is bounded by construction — there's no
 * integration that could fail to converge.
 */
function runScenario(a: AvatarActor, b: AvatarActor, steps: ScenarioStep[]) {
  a.setBusy(true);
  b.setBusy(true);

  let stepIndex = 0;
  let stepStart = performance.now();

  const applyReactions = (step: ScenarioStep) => {
    if (step.reactionA) {
      a.setReaction(
        { dx: step.reactionA.dx, dy: step.reactionA.dy, expression: step.reactionA.expression },
        step.reactionA.holdMs ?? 1400
      );
    }
    if (step.reactionB) {
      b.setReaction(
        { dx: step.reactionB.dx, dy: step.reactionB.dy, expression: step.reactionB.expression },
        step.reactionB.holdMs ?? 1400
      );
    }
  };

  applyReactions(steps[0]);

  const tick = (now: number) => {
    const step = steps[stepIndex];
    const elapsed = now - stepStart;
    const rawP = Math.min(1, elapsed / step.durationMs);
    const p = step.easing ? step.easing(rawP) : rawP;

    if (step.a) {
      const f = step.a(p);
      applyBodyTransform(a.getBodyEl(), f.y ?? 0, f.sx ?? 1, f.sy ?? 1, f.rot ?? 0, true, f.x ?? 0);
    }
    if (step.b) {
      const f = step.b(p);
      applyBodyTransform(b.getBodyEl(), f.y ?? 0, f.sx ?? 1, f.sy ?? 1, f.rot ?? 0, true, f.x ?? 0);
    }

    if (rawP >= 1) {
      stepIndex += 1;
      if (stepIndex >= steps.length) {
        applyBodyTransform(a.getBodyEl(), 0, 1, 1, 0, false);
        applyBodyTransform(b.getBodyEl(), 0, 1, 1, 0, false);
        a.setBusy(false);
        b.setBusy(false);
        return;
      }
      stepStart = now;
      applyReactions(steps[stepIndex]);
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

function findAndTriggerNearbyActivity(preferredActorId?: string): boolean {
  const actors = Array.from(activeAvatars.values()).filter((a) => !a.isBusy());
  if (actors.length < 2) return false;

  const positioned = actors
    .map((actor) => {
      const el = actor.getWrapperEl();
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return { actor, rect, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, size: rect.width };
    })
    .filter((item): item is { actor: AvatarActor; rect: DOMRect; cx: number; cy: number; size: number } => item !== null);

  const pairs: Array<{ a: AvatarActor; b: AvatarActor; dx: number; dy: number; dist: number }> = [];

  for (let i = 0; i < positioned.length; i++) {
    for (let j = i + 1; j < positioned.length; j++) {
      const a = positioned[i];
      const b = positioned[j];
      const dx = b.cx - a.cx;
      const dy = b.cy - a.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxGap = Math.max(a.size, b.size) * 3.4;
      if (dist > 4 && dist < maxGap) {
        pairs.push({ a: a.actor, b: b.actor, dx, dy, dist });
      }
    }
  }

  if (pairs.length === 0) return false;

  let chosen = pairs[Math.floor(Math.random() * pairs.length)];
  if (preferredActorId) {
    const match = pairs.find((p) => p.a.id === preferredActorId || p.b.id === preferredActorId);
    if (match) chosen = match;
  }

  const aIsFirst = preferredActorId === chosen.b.id ? false : preferredActorId === chosen.a.id ? true : Math.random() < 0.5;
  const [first, second, ux, uy] = aIsFirst
    ? [chosen.a, chosen.b, chosen.dx, chosen.dy]
    : [chosen.b, chosen.a, -chosen.dx, -chosen.dy];
  const dist = chosen.dist;
  const nux = dist > 0 ? ux / dist : 1;
  const nuy = dist > 0 ? uy / dist : 0;

  // "whisper" keeps its own bespoke implementation (the 🤫 bubble); the rest
  // are picked from the data-described activity library in scenarios.ts.
  if (Math.random() < 0.2) {
    triggerWhisper(first, second, ux, uy, dist);
    return true;
  }

  const name = SCENARIO_NAMES[Math.floor(Math.random() * SCENARIO_NAMES.length)];
  runScenario(first, second, SCENARIOS[name](nux, nuy, dist));
  return true;
}

function findAndTriggerPairInteraction(preferredActorId?: string): boolean {
  const actors = Array.from(activeAvatars.values()).filter((a) => !a.isBusy());
  if (actors.length < 2) return false;

  const positioned = actors
    .map((actor) => {
      const el = actor.getWrapperEl();
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return { actor, rect };
    })
    .filter((item): item is { actor: AvatarActor; rect: DOMRect } => item !== null)
    .sort((a, b) => a.rect.top - b.rect.top);

  const pairs: Array<{
    top: { actor: AvatarActor; rect: DOMRect };
    bottom: { actor: AvatarActor; rect: DOMRect };
    contactDist: number;
  }> = [];

  for (let i = 0; i < positioned.length - 1; i++) {
    const top = positioned[i];
    const bottom = positioned[i + 1];
    const sameColumn = Math.abs(top.rect.left - bottom.rect.left) < 24;
    const verticalGap = bottom.rect.top - top.rect.top;
    if (sameColumn && verticalGap > top.rect.height && verticalGap < 180) {
      const contactDist = Math.max(10, verticalGap - top.rect.height * 0.88);
      pairs.push({ top, bottom, contactDist });
    }
  }

  if (pairs.length === 0) return false;

  let chosenPair = pairs[Math.floor(Math.random() * pairs.length)];
  if (preferredActorId) {
    const match = pairs.find(
      (p) => p.top.actor.id === preferredActorId || p.bottom.actor.id === preferredActorId
    );
    if (match) chosenPair = match;
  }

  const doHeadbutt =
    preferredActorId === chosenPair.bottom.actor.id
      ? true
      : preferredActorId === chosenPair.top.actor.id
        ? false
        : Math.random() < 0.5;

  if (doHeadbutt) {
    triggerHeadbuttUp(chosenPair.bottom.actor, chosenPair.top.actor, chosenPair.contactDist);
  } else {
    triggerFallDownOnto(chosenPair.top.actor, chosenPair.bottom.actor, chosenPair.contactDist);
  }
  return true;
}

function ensureCoordinatorLoop() {
  if (coordinatorTimer !== null) return;

  const loop = () => {
    if (activeAvatars.size === 0) {
      coordinatorTimer = null;
      return;
    }

    const fallback = () => {
      const available = Array.from(activeAvatars.values()).filter((a) => !a.isBusy());
      if (available.length > 0) {
        const chosen = available[Math.floor(Math.random() * available.length)];
        triggerRollOutAndPeek(chosen);
      }
    };

    const r = Math.random();
    if (r < 0.3) {
      fallback();
    } else if (r < 0.6) {
      if (!findAndTriggerPairInteraction()) fallback();
    } else {
      if (!findAndTriggerNearbyActivity()) fallback();
    }

    const nextDelay = 3500 + Math.floor(Math.random() * 2600);
    coordinatorTimer = setTimeout(loop, nextDelay);
  };

  coordinatorTimer = setTimeout(loop, 2200);
}

export function registerActor(actor: AvatarActor) {
  activeAvatars.set(actor.id, actor);
  ensureCoordinatorLoop();
}

export function unregisterActor(actorId: string) {
  activeAvatars.delete(actorId);
}

/** Called when a user clicks/taps an avatar directly. */
export function pokeActor(actorId: string) {
  const actor = activeAvatars.get(actorId);
  if (!actor || actor.isBusy()) return;

  const rand = Math.random();
  if (rand < 0.45 || activeAvatars.size < 2) {
    triggerRollOutAndPeek(actor);
    return;
  }

  if (rand < 0.7) {
    if (!findAndTriggerPairInteraction(actorId)) triggerRollOutAndPeek(actor);
    return;
  }

  if (!findAndTriggerNearbyActivity(actorId)) {
    if (!findAndTriggerPairInteraction(actorId)) triggerRollOutAndPeek(actor);
  }
}

/**
 * Directly plays a named two-avatar activity ("hug", "fight", "whisper",
 * any key from SCENARIO_NAMES) between two specific `LivingAvatar`
 * instances, identified by the DOM element each one forwards as its ref —
 * rather than letting proximity pick a random pair. Useful for an explicit
 * "react with a hug" button, or a showcase that demonstrates one activity
 * at a time. Returns false if either element isn't a registered avatar or
 * either one is mid-animation already.
 */
export function triggerActivity(name: string, elA: HTMLElement | null, elB: HTMLElement | null): boolean {
  if (!elA || !elB || elA === elB) return false;

  let actorA: AvatarActor | undefined;
  let actorB: AvatarActor | undefined;
  for (const actor of activeAvatars.values()) {
    const el = actor.getWrapperEl();
    if (el === elA) actorA = actor;
    else if (el === elB) actorB = actor;
  }
  if (!actorA || !actorB || actorA.isBusy() || actorB.isBusy()) return false;

  const rectA = elA.getBoundingClientRect();
  const rectB = elB.getBoundingClientRect();
  const dx = rectB.left + rectB.width / 2 - (rectA.left + rectA.width / 2);
  const dy = rectB.top + rectB.height / 2 - (rectA.top + rectA.height / 2);
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;

  if (name === "whisper") {
    triggerWhisper(actorA, actorB, dx, dy, dist);
    return true;
  }

  const builder = SCENARIOS[name];
  if (!builder) return false;
  runScenario(actorA, actorB, builder(dx / dist, dy / dist, dist));
  return true;
}
