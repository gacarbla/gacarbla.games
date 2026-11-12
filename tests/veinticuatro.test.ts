import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/games/engine/math';
import { apply, canReach24, formatValue, generatePuzzle } from '../src/games/veinticuatro/logic';

describe('veinticuatro', () => {
  it('encuentra soluciones conocidas y descarta las imposibles', () => {
    expect(canReach24([1, 2, 3, 4])).toBe(true);
    expect(canReach24([6, 6, 6, 6])).toBe(true);
    expect(canReach24([3, 3, 8, 8])).toBe(true);
    expect(canReach24([1, 1, 1, 1])).toBe(false);
    expect(canReach24([2, 2, 2, 2])).toBe(false);
  });

  it('genera retos solubles, únicos y con cifras 1–9', () => {
    const random = mulberry32(12345);
    const seen = new Set<string>();

    for (let round = 0; round < 120; round += 1) {
      const values = generatePuzzle(random, seen);
      expect(values).toHaveLength(4);
      for (const value of values) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(9);
      }

      const key = [...values].sort((a, b) => a - b).join(',');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      expect(canReach24(values)).toBe(true);
    }

    expect(seen.size).toBeGreaterThan(60);
  });

  it('formatea enteros y fracciones', () => {
    expect(formatValue(24)).toBe('24');
    expect(formatValue(0)).toBe('0');
    expect(formatValue(3 / 2)).toBe('1 1/2');
    expect(formatValue(-3 / 2)).toBe('−1 1/2');
    expect(formatValue(1 / 3)).toBe('1/3');
    expect(formatValue(2 / 15)).toBe('2/15');
    expect(formatValue(16 / 15)).toBe('1 1/15');
  });

  it('aplica las cuatro operaciones', () => {
    expect(apply(8, 3, 'div')).toBeCloseTo(8 / 3);
    expect(apply(6, 4, 'mul')).toBe(24);
    expect(apply(9, 4, 'sub')).toBe(5);
    expect(apply(9, 4, 'add')).toBe(13);
  });
});
