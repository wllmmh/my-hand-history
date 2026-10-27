import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PositionBadge } from '@/components/replay/PositionBadge';

const badge = (position: string, isHero = false, folded = false) =>
  renderToStaticMarkup(createElement(PositionBadge, { position, isHero, folded }));

describe('PositionBadge', () => {
  it('draws the button white with black text, folded or not', () => {
    for (const html of [badge('BTN'), badge('BTN', true), badge('BTN', false, true)]) {
      expect(html).toContain('bg-white');
      expect(html).toContain('text-black');
    }
  });

  it('leaves every other position slate', () => {
    for (const position of ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'SB', 'BB']) {
      expect(badge(position)).toContain('bg-slate-700');
      expect(badge(position)).toContain('text-slate-300');
      expect(badge(position, true)).toContain('text-slate-100');
      expect(badge(position, false, true)).toContain('text-slate-500');
      expect(badge(position)).not.toContain('bg-white');
    }
  });
});
