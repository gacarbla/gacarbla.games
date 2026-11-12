import { describe, expect, it } from 'vitest';
import {
  NONOGRAMA_LEVELS,
  NONOGRAMA_SIZE,
  cluesForLine,
  columnClues,
  matchesSolution,
  rowClues,
  solutionFromLevel,
} from '../src/games/nonograma/logic';

describe('nonograma', () => {
  it('mantiene los seis patrones en 8×8', () => {
    expect(NONOGRAMA_LEVELS).toHaveLength(6);
    for (const level of NONOGRAMA_LEVELS) {
      expect(level.rows).toHaveLength(NONOGRAMA_SIZE);
      for (const row of level.rows) expect(row).toHaveLength(NONOGRAMA_SIZE);
    }
  });

  it('calcula los tramos de una línea', () => {
    expect(cluesForLine('..#.##..')).toEqual([1, 2]);
    expect(cluesForLine('########')).toEqual([8]);
    expect(cluesForLine('........')).toEqual([0]);
    expect(cluesForLine('.#.#.#.#')).toEqual([1, 1, 1, 1]);
  });

  it('deriva las pistas de filas y columnas', () => {
    const level = NONOGRAMA_LEVELS[0]!;
    expect(rowClues(level)[3]).toEqual([8]);
    expect(columnClues(level)[0]).toEqual([3]);
  });

  it('solo valida el patrón completo', () => {
    const level = NONOGRAMA_LEVELS[0]!;
    const solution = solutionFromLevel(level);
    const marks = solution.map((filled) => (filled ? 1 : 0));
    expect(matchesSolution(level, marks)).toBe(true);
    marks[0] = 1;
    expect(matchesSolution(level, marks)).toBe(false);
    expect(
      matchesSolution(
        level,
        marks.map(() => 0),
      ),
    ).toBe(false);
  });
});
