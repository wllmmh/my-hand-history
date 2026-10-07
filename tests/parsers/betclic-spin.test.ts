import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { registry } from '@/parsers/index';
import { validateHand } from '@/parsers/shared/validate';

const samplePath = fileURLToPath(new URL('../fixtures/betclic/spin.txt', import.meta.url));
const sample = readFileSync(samplePath, 'utf8');

describe('Betclic parser — Spin & Rush ("* SECTION *" markers)', () => {
  it('is detected as Betclic', () => {
    expect(registry.detect(sample)?.siteId).toBe('betclic-fr');
  });

  const parsed = registry.parseFile(sample, null, 'spin.txt');
  const [hand] = parsed.hands;

  it('parses cleanly as a sit-n-go', () => {
    expect(parsed.failures).toEqual([]);
    expect(parsed.hands).toHaveLength(1);
    expect(hand!.warnings).toEqual([]);
    expect(hand!.meta.gameMode).toBe('sit-n-go');
    expect(hand!.meta.tournament?.name).toBe('Spin & Rush 5€');
    expect(hand!.meta.tournament?.buyInCurrency).toBe('€');
    expect(hand!.money.bigBlind).toBe(40);
  });

  it('reads seats, hero, streets and the flop all-in', () => {
    expect(hand!.seats.map((s) => s.name)).toEqual(['jobiwin', 'SIMBAROI', 'totopat']);
    expect(hand!.heroSeat).toBe(2);
    expect(hand!.streets.map((s) => s.street)).toEqual(['preflop', 'flop']);
    expect(hand!.finalBoard).toHaveLength(3);
    const shove = hand!.actions.find((a) => a.kind === 'bet');
    expect(shove?.amount).toBe(79);
    expect(shove?.isAllIn).toBe(true);
  });

  it('awards the 159 pot and reconciles with the reported total', () => {
    expect(hand!.awards.map((a) => a.amount)).toEqual([159]);
    expect(hand!.pots.total).toBe(159);
    expect(validateHand(hand!)).toEqual([]);
  });

  it('splits several hands even without a dash separator', () => {
    const two = registry.parseFile(`${sample}\n\n${sample}`, 'betclic-fr');
    expect(two.hands).toHaveLength(2);
  });
});
