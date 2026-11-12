// A smooth, barely-there "mochi" silhouette — a closed curve whose radius
// wobbles gently around a circle using two low-frequency sine harmonics,
// then gets traced through a Catmull-Rom-to-Bezier spline so every segment
// is a smooth curve.
//
// Versioned by "how far from a perfect circle", on a 0-10 scale where 10 is
// a perfect circle: v3 sat at ~6; this is v4, at ~8 — half of v3's wobble
// amplitude, so it reads as even closer to round while still not
// mathematically perfect.
//
// An earlier version used CSS `border-radius` with four independent
// per-corner percentages instead: border-radius interpolates between each
// corner's arc with a *straight* tangent line, so when two adjacent
// corners differed enough, the shape showed a visible flat "cut" edge
// instead of a continuous curve. Sampling a real curve and smoothing it
// with splines can't produce that artifact — every point on the boundary
// comes from the same continuous function.

function hashToUnit(h: number, shift: number, mod: number): number {
  return (h >>> shift) % mod;
}

/**
 * Builds a closed SVG path `d` string for a deterministic, barely-irregular
 * blob centered at (cx, cy) with base radius `r`, derived from `hash` so
 * the same seed always produces the same shape.
 */
export function mochiPath(hash: number, cx = 20, cy = 20, r = 19): string {
  // Two harmonics: a gentle primary lobe (2-3 bumps) plus a finer secondary
  // wobble (5-7 bumps). Combined amplitude stays small (~1.5-3% of the
  // radius — half of v3's) so the curve reads as "almost round", even more
  // so than before.
  const freq1 = 2 + hashToUnit(hash, 0, 2);
  const amp1 = 0.01 + hashToUnit(hash, 2, 6) / 480;
  const phase1 = (hashToUnit(hash, 5, 360) * Math.PI) / 180;
  const freq2 = 5 + hashToUnit(hash, 8, 3);
  const amp2 = 0.005 + hashToUnit(hash, 11, 5) / 800;
  const phase2 = (hashToUnit(hash, 14, 360) * Math.PI) / 180;

  const pointCount = 12;
  const points: Array<[number, number]> = [];
  for (let i = 0; i < pointCount; i++) {
    const theta = (i / pointCount) * Math.PI * 2;
    const wobble = amp1 * Math.sin(freq1 * theta + phase1) + amp2 * Math.sin(freq2 * theta + phase2);
    const radius = r * (1 + wobble);
    points.push([cx + radius * Math.cos(theta), cy + radius * Math.sin(theta)]);
  }

  const n = points.length;
  const segments: string[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    segments.push(`C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`);
  }

  return `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)} ${segments.join(" ")} Z`;
}
