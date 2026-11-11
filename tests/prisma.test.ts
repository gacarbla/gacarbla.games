import { describe, expect, it } from 'vitest';
import {
  parseLevel,
  reflectBackslash,
  reflectSlash,
  solveLevel,
  traceBeams,
} from '../src/games/prisma/logic';
import { levels } from '../src/games/prisma/levels';

describe('reflejos', () => {
  it('el espejo / gira los haces correctamente', () => {
    expect(reflectSlash(0)).toBe(3);
    expect(reflectSlash(1)).toBe(2);
    expect(reflectSlash(2)).toBe(1);
    expect(reflectSlash(3)).toBe(0);
  });

  it('el espejo \\ gira los haces correctamente', () => {
    expect(reflectBackslash(0)).toBe(1);
    expect(reflectBackslash(1)).toBe(0);
    expect(reflectBackslash(2)).toBe(3);
    expect(reflectBackslash(3)).toBe(2);
  });
});

describe('niveles de Prisma', () => {
  it('hay una colección inicial de niveles', () => {
    expect(levels.length).toBeGreaterThanOrEqual(8);
  });

  for (const [index, level] of levels.entries()) {
    it(`nivel ${index + 1} (${level.name}) es válido y tiene solución`, () => {
      const parsed = parseLevel(level);
      expect(parsed.cols).toBe(7);
      expect(parsed.rows).toBe(7);
      expect(parsed.crystals.length).toBeGreaterThan(0);
      expect(parsed.emitters.length).toBeGreaterThan(0);

      const initial = traceBeams(parsed);
      expect(initial.solved).toBe(false);

      const solution = solveLevel(level);
      expect(solution, `sin solución para ${level.name}`).not.toBeNull();

      for (const [cellIndex, turns] of solution!) {
        parsed.cells[cellIndex]!.turns = turns;
      }
      const solved = traceBeams(parsed);
      expect(solved.solved).toBe(true);
      expect(solved.lit.size).toBe(parsed.crystals.length);
    });
  }
});
