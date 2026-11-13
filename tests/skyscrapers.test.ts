import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/games/engine/math';
import {
  DEFAULT_SKYSCRAPER_LEVEL,
  SKYSCRAPER_CELLS,
  SKYSCRAPER_LEVELS,
  SKYSCRAPER_SIZE,
  clueViolations,
  cluesFromSolution,
  conflictMask,
  countSolutions,
  isSolved,
  solveSkyscrapers,
  visibleFrom,
} from '../src/games/skyscrapers/logic';

function isLatinSquare(grid: readonly number[]): boolean {
  if (grid.length !== SKYSCRAPER_CELLS) return false;
  const expected = Array.from({ length: SKYSCRAPER_SIZE }, (_, index) => index + 1);
  for (let row = 0; row < SKYSCRAPER_SIZE; row += 1) {
    const values = Array.from(
      { length: SKYSCRAPER_SIZE },
      (_, column) => grid[row * SKYSCRAPER_SIZE + column]!,
    ).sort((a, b) => a - b);
    if (values.join(',') !== expected.join(',')) return false;
  }
  for (let column = 0; column < SKYSCRAPER_SIZE; column += 1) {
    const values = Array.from(
      { length: SKYSCRAPER_SIZE },
      (_, row) => grid[row * SKYSCRAPER_SIZE + column]!,
    ).sort((a, b) => a - b);
    if (values.join(',') !== expected.join(',')) return false;
  }
  return true;
}

function swapRows(grid: readonly number[], first: number, second: number): number[] {
  const copy = [...grid];
  for (let column = 0; column < SKYSCRAPER_SIZE; column += 1) {
    const a = first * SKYSCRAPER_SIZE + column;
    const b = second * SKYSCRAPER_SIZE + column;
    const value = copy[a]!;
    copy[a] = copy[b]!;
    copy[b] = value;
  }
  return copy;
}

describe('rascacielos', () => {
  it('cuenta los edificios visibles desde un extremo', () => {
    expect(visibleFrom([1, 2, 3, 4, 5, 6])).toBe(6);
    expect(visibleFrom([6, 5, 4, 3, 2, 1])).toBe(1);
    expect(visibleFrom([2, 1, 4, 3, 5, 6])).toBe(4);
    expect(visibleFrom([2, 4, 1, 6, 3, 5])).toBe(3);
    expect(visibleFrom([5, 1, 2, 3, 4, 6])).toBe(2);
  });

  it('define cinco niveles coherentes y en dificultad creciente', () => {
    expect(SKYSCRAPER_LEVELS).toHaveLength(5);

    const givenCounts: number[] = [];
    for (const level of SKYSCRAPER_LEVELS) {
      expect(level.givens).toHaveLength(SKYSCRAPER_CELLS);
      expect(level.solution).toHaveLength(SKYSCRAPER_CELLS);
      expect(isLatinSquare(level.solution)).toBe(true);

      for (let index = 0; index < SKYSCRAPER_CELLS; index += 1) {
        const value = level.givens[index]!;
        if (value !== 0) expect(value).toBe(level.solution[index]);
      }

      expect(level.clues).toEqual(cluesFromSolution(level.solution));
      for (const side of [
        level.clues.top,
        level.clues.right,
        level.clues.bottom,
        level.clues.left,
      ]) {
        expect(side).toHaveLength(SKYSCRAPER_SIZE);
        for (const clue of side) {
          expect(clue).toBeGreaterThanOrEqual(1);
          expect(clue).toBeLessThanOrEqual(SKYSCRAPER_SIZE);
        }
      }

      expect(isSolved(level.solution, level.clues)).toBe(true);
      expect(isSolved(level.givens, level.clues)).toBe(false);
      expect(level.givens.some((value) => value === 0)).toBe(true);
      givenCounts.push(level.givens.filter((value) => value !== 0).length);
    }

    expect(givenCounts).toEqual([...givenCounts].sort((a, b) => b - a));
    expect(new Set(givenCounts).size).toBe(givenCounts.length);
  });

  it('garantiza solución única en los cinco niveles', () => {
    for (const level of SKYSCRAPER_LEVELS) {
      expect(countSolutions(level.givens, level.clues, 2)).toBe(1);
    }
  });

  it('encuentra la solución conocida con backtracking', () => {
    for (const [index, level] of SKYSCRAPER_LEVELS.entries()) {
      const solved = solveSkyscrapers(level.givens, level.clues, mulberry32(1000 + index));
      expect(solved).not.toBeNull();
      expect(solved).toEqual([...level.solution]);
      expect(isSolved(solved!, level.clues)).toBe(true);
    }
  });

  it('reproduce el solver con la misma semilla', () => {
    const level = SKYSCRAPER_LEVELS[SKYSCRAPER_LEVELS.length - 1]!;
    const first = solveSkyscrapers(level.givens, level.clues, mulberry32(77));
    const second = solveSkyscrapers(level.givens, level.clues, mulberry32(77));
    expect(first).toEqual(second);
    expect(first).toEqual([...level.solution]);
  });

  it('marca repeticiones en fila y columna y rechaza el tablero', () => {
    const level = SKYSCRAPER_LEVELS[DEFAULT_SKYSCRAPER_LEVEL]!;
    expect(conflictMask(level.solution).some(Boolean)).toBe(false);

    const broken = [...level.solution];
    broken[0] = broken[1]!;
    const mask = conflictMask(broken);
    expect(mask[0]).toBe(true);
    expect(mask[1]).toBe(true);
    expect(isSolved(broken, level.clues)).toBe(false);
  });

  it('detecta una variante latina que incumple las pistas', () => {
    const level = SKYSCRAPER_LEVELS[DEFAULT_SKYSCRAPER_LEVEL]!;
    const swapped = swapRows(level.solution, 0, 1);
    expect(isLatinSquare(swapped)).toBe(true);
    expect(conflictMask(swapped).some(Boolean)).toBe(false);

    const violations = clueViolations(swapped, level.clues);
    const anyViolation = [
      ...violations.top,
      ...violations.right,
      ...violations.bottom,
      ...violations.left,
    ].some(Boolean);
    expect(anyViolation).toBe(true);
    expect(isSolved(swapped, level.clues)).toBe(false);
  });
});
