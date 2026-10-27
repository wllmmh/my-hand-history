import { describe, expect, it } from 'vitest';
import { markerSpots } from '@/components/replay/felt';

const rect = (left: number, top: number, width: number, height: number): DOMRect => ({
  x: left, y: top, left, top, width, height, right: left + width, bottom: top + height, toJSON: () => ({}),
});

/** A card of the given size centred on (x, y). */
const cardAt = (x: number, y: number, w: number, h: number) => rect(x - w / 2, y - h / 2, w, h);

// The marker's box, as rendered: the w-9 badge over the h-5 action row.
const HALF_W = 18;
const HALF_H = 21;

/** How far inside a wide stadium `p` is. */
const inset = (oval: DOMRect, x: number, y: number) => {
  const r = oval.height / 2;
  const cx = Math.min(Math.max(x, oval.left + r), oval.right - r);
  return r - Math.hypot(x - cx, y - (oval.top + r));
};

const gapOf = (oval: DOMRect, x: number, y: number) =>
  Math.min(...[-1, 1].flatMap((sx) => [-1, 1].map((sy) => inset(oval, x + sx * HALF_W, y + sy * HALF_H))));

const OVAL = rect(0, 0, 800, 400);

// A 6-max ring through the oval: top and bottom on the straight edges, two
// seats per side out on the curves.
const ring = (seatW: number, seatH: number) => new Map([
  [1, cardAt(400, 0, seatW, seatH)],
  [2, cardAt(0, 110, seatW, seatH)],
  [3, cardAt(0, 290, seatW, seatH)],
  [4, cardAt(400, 400, seatW, seatH)],
  [5, cardAt(800, 290, seatW, seatH)],
  [6, cardAt(800, 110, seatW, seatH)],
]);

const placed = (cards: ReadonlyMap<number, DOMRect>) => {
  const spots = markerSpots(cards, OVAL);
  return [...cards].map(([seat, card]) => {
    const spot = spots.get(seat);
    if (!spot) throw new Error(`seat ${seat} has no spot`);
    const x = card.left + card.width / 2 + spot.x;
    const y = card.top + card.height / 2 + spot.y;
    return { card, x, y, gap: gapOf(OVAL, x, y) };
  });
};

describe('markerSpots', () => {
  it('puts every marker the same distance in from the oval edge', () => {
    for (const [seatW, seatH] of [[80, 112], [136, 112], [100, 140]] as const) {
      const markers = placed(ring(seatW, seatH));
      const gaps = markers.map((m) => m.gap);
      expect(Math.min(...gaps)).toBeGreaterThan(0);
      expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(1.5);
    }
  });

  it('keeps each marker clear of its own card', () => {
    for (const { card, x, y } of placed(ring(136, 112))) {
      const clear = x + HALF_W <= card.left || x - HALF_W >= card.right || y + HALF_H <= card.top || y - HALF_H >= card.bottom;
      expect(clear).toBe(true);
    }
  });

  it('moves every marker in together when the cards grow', () => {
    // Taller cards reach further in from the top and bottom edges.
    const small = placed(ring(80, 112))[0]?.gap ?? 0;
    const large = placed(ring(80, 160)).map((m) => m.gap);
    for (const gap of large) expect(gap).toBeGreaterThan(small);
  });

  it('places nothing when the felt is too small to hold a marker clear of the cards', () => {
    expect(markerSpots(new Map([[1, cardAt(40, 0, 80, 112)]]), rect(0, 0, 80, 40)).size).toBe(0);
  });
});
