'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Width : height of the felt oval (the stadium through the seat centres). A
 * real table is about twice as long as it is deep; a little under that keeps
 * the side seats within reach of the board on narrower panels.
 */
export const FELT_RATIO = 1.8;

/**
 * The widest the seat ring should get: the oval's measured height times
 * FELT_RATIO, plus the seat width the oval is inset by. The ring's height comes
 * from its content (seat cards plus the viewport-scaled board padding), so a
 * taller felt is also a wider one, up to whatever the panel has room for.
 *
 * Width never feeds back into height here — widening the centre track only
 * moves the side seats apart — so observing the grid cannot loop.
 */
export function useFeltMaxWidth(
  grid: RefObject<HTMLElement | null>,
  seat: RefObject<HTMLElement | null>,
  seatH: number,
): number | undefined {
  const [maxWidth, setMaxWidth] = useState<number>();
  useLayoutEffect(() => {
    const node = grid.current;
    if (!node || seatH <= 0) return;
    const update = () => {
      const h = node.getBoundingClientRect().height;
      const seatW = seat.current?.getBoundingClientRect().width ?? 0;
      if (h > 0) setMaxWidth(Math.round((h - seatH) * FELT_RATIO + seatW));
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [grid, seat, seatH]);
  return maxWidth;
}

export type Point = { readonly x: number; readonly y: number };

/** Gap between a seat's marker and its own card. */
const CARD_CLEARANCE = 6;
/** The least gap between a marker and the oval's edge. */
const MIN_RAIL_GAP = 6;
/**
 * Half the marker's box: the w-9 position badge over the h-5 action row
 * (badge 1.2rem-ish with padding and border, a 2px gap, then 20px). The chips
 * and a long action label spill inward from it, away from the rail, so only
 * this box decides how close the marker comes to the edge.
 */
const MARKER_HALF_W = 18;
const MARKER_HALF_H = 21;

/**
 * The stadium's spine — the segment its edge is a constant `r` from — and that
 * radius. The rounded ends are on the short axis: left/right for a wide oval,
 * top/bottom for a tall one.
 */
function spine(oval: DOMRect) {
  const r = Math.min(oval.width, oval.height) / 2;
  return oval.width >= oval.height
    ? { r, a: { x: oval.left + r, y: oval.top + r }, b: { x: oval.right - r, y: oval.top + r } }
    : { r, a: { x: oval.left + r, y: oval.top + r }, b: { x: oval.left + r, y: oval.bottom - r } };
}

type Spine = ReturnType<typeof spine>;

function nearestOnSpine(p: Point, { a, b }: Spine): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.min(Math.max(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0), 1);
  return { x: a.x + dx * t, y: a.y + dy * t };
}

/** How far inside the oval's edge `p` is (negative outside). */
function inset(p: Point, s: Spine): number {
  const q = nearestOnSpine(p, s);
  return s.r - Math.hypot(p.x - q.x, p.y - q.y);
}

/** The marker box's distance from the edge: that of its corner nearest the rail. */
function markerGap(c: Point, s: Spine): number {
  return Math.min(
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sy) => inset({ x: c.x + sx * MARKER_HALF_W, y: c.y + sy * MARKER_HALF_H }, s))),
  );
}

function clearOf(c: Point, card: DOMRect): boolean {
  return (
    c.x + MARKER_HALF_W <= card.left - CARD_CLEARANCE
    || c.x - MARKER_HALF_W >= card.right + CARD_CLEARANCE
    || c.y + MARKER_HALF_H <= card.top - CARD_CLEARANCE
    || c.y - MARKER_HALF_H >= card.bottom + CARD_CLEARANCE
  );
}

/**
 * Where each seat's marker — position badge, action label and bet chips —
 * sits, as an offset from the centre of its card, keyed by seat number.
 *
 * Every marker lies on the line from its card's centre straight in to the
 * oval's spine, i.e. along the edge's inward normal, so it faces its seat
 * whether the seat is on a straight side or round the curve of an end (the
 * outer seats of a 9–10 handed ring sit beyond the curve, not on it).
 *
 * All markers sit the SAME distance from the edge. Each seat first finds the
 * least gap that clears its own card — which differs by side, since a side
 * seat reaches in by half its width and a top/bottom seat by half its height,
 * and both scale with the viewport — and every marker then takes the largest
 * of those, re-measured whenever the ring resizes.
 *
 * Empty if any seat has no such spot (a felt too small to hold one), so the
 * caller falls back to the fixed slots for all seats rather than mixing them.
 */
export function markerSpots(cards: ReadonlyMap<number, DOMRect>, oval: DOMRect): ReadonlyMap<number, Point> {
  const s = spine(oval);

  /** The shallowest point on the ray that passes `ok`, or null if none does before the spine. */
  const walk = (at: (depth: number) => Point, ok: (c: Point) => boolean) => {
    for (let depth = 0; depth <= s.r; depth += 1) {
      const c = at(depth);
      if (ok(c)) return c;
    }
    return null;
  };

  const rays: { seat: number; from: Point; at: (depth: number) => Point }[] = [];
  let gap = MIN_RAIL_GAP;
  for (const [seat, card] of cards) {
    const from = { x: card.left + card.width / 2, y: card.top + card.height / 2 };
    const q = nearestOnSpine(from, s);
    const d = Math.hypot(from.x - q.x, from.y - q.y);
    // A card centred on the spine has no inward direction to walk.
    if (d < 1) return new Map();
    const n = { x: (from.x - q.x) / d, y: (from.y - q.y) / d };
    // `depth` px in from the edge, along the normal.
    const at = (depth: number) => ({ x: q.x + n.x * (s.r - depth), y: q.y + n.y * (s.r - depth) });
    const needed = walk(at, (c) => clearOf(c, card) && markerGap(c, s) >= MIN_RAIL_GAP);
    if (!needed) return new Map();
    gap = Math.max(gap, markerGap(needed, s));
    rays.push({ seat, from, at });
  }

  const spots = new Map<number, Point>();
  for (const { seat, from, at } of rays) {
    const c = walk(at, (p) => markerGap(p, s) >= gap);
    if (!c) return new Map();
    spots.set(seat, { x: c.x - from.x, y: c.y - from.y });
  }
  return spots;
}
