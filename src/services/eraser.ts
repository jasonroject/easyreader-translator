import type { Point, Stroke } from './annotations';

function distance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function cross(a: Point, b: Point, c: Point) { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); }
function separation(a: Point, b: Point, c: Point, d: Point) {
  // Strict intersection handles fast drags whose sampled endpoints miss a line.
  if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return 0;
  return Math.min(distance(a, c, d), distance(b, c, d), distance(c, a, b), distance(d, a, b));
}

/** Coordinates are normalized; the eraser's 10px radius stays usable at any zoom. */
export function remainingStrokes(strokes: Stroke[], from: Point, to: Point, size: { width: number; height: number }) {
  const pixel = (p: Point) => ({ x: p.x * size.width / 1000, y: p.y * size.height / 1000 });
  const a = pixel(from), b = pixel(to);
  return strokes.filter(stroke => !stroke.points.some((p, i) => separation(a, b, pixel(p), pixel(stroke.points[Math.max(0, i - 1)])) <= 10 + stroke.width / 2));
}
