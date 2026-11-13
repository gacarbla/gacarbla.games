import { describe, expect, it } from 'vitest';
import {
  HITORI_LEVELS,
  HITORI_SIZE,
  adjacentMask,
  analyzeHitori,
  connectedUnshaded,
  countHitoriSolutions,
  hasUniqueSolution,
  isSolved,
  levelNumbers,
  levelSolution,
  parseNumbers,
  repeatedMask,
} from '../src/games/hitori/logic';

function hasShadedNeighbour(shaded: readonly boolean[], index: number): boolean {
  const row = Math.floor(index / HITORI_SIZE);
  const column = index % HITORI_SIZE;
  if (column > 0 && shaded[index - 1]) return true;
  if (column < HITORI_SIZE - 1 && shaded[index + 1]) return true;
  if (row > 0 && shaded[index - HITORI_SIZE]) return true;
  if (row < HITORI_SIZE - 1 && shaded[index + HITORI_SIZE]) return true;
  return false;
}

describe('hitori', () => {
  it('define cinco tableros de 6×6 con números del 1 al 6', () => {
    expect(HITORI_LEVELS).toHaveLength(5);
    for (const level of HITORI_LEVELS) {
      expect(level.numbers).toHaveLength(HITORI_SIZE);
      expect(level.solution).toHaveLength(HITORI_SIZE);
      for (const row of level.numbers) expect(row).toHaveLength(HITORI_SIZE);
      for (const row of level.solution) expect(row).toHaveLength(HITORI_SIZE);
      expect(levelNumbers(level)).toHaveLength(HITORI_SIZE * HITORI_SIZE);
      expect(levelSolution(level)).toHaveLength(HITORI_SIZE * HITORI_SIZE);
    }
  });

  it('respeta las tres reglas en las cinco soluciones', () => {
    for (const level of HITORI_LEVELS) {
      const numbers = levelNumbers(level);
      const solution = levelSolution(level);
      const analysis = analyzeHitori(numbers, solution);

      expect(analysis.repeated.some(Boolean)).toBe(false);
      expect(analysis.adjacent.some(Boolean)).toBe(false);
      expect(analysis.connected).toBe(true);
      expect(analysis.solved).toBe(true);
      expect(analysis.shadedCount).toBeGreaterThanOrEqual(8);

      for (let row = 0; row < HITORI_SIZE; row += 1) {
        const values: number[] = [];
        for (let column = 0; column < HITORI_SIZE; column += 1) {
          const index = row * HITORI_SIZE + column;
          if (!solution[index]) values.push(numbers[index]!);
        }
        expect(new Set(values).size).toBe(values.length);
      }

      for (let column = 0; column < HITORI_SIZE; column += 1) {
        const values: number[] = [];
        for (let row = 0; row < HITORI_SIZE; row += 1) {
          const index = row * HITORI_SIZE + column;
          if (!solution[index]) values.push(numbers[index]!);
        }
        expect(new Set(values).size).toBe(values.length);
      }
    }
  });

  it('cada nivel tiene una única solución válida', () => {
    for (const level of HITORI_LEVELS) {
      const numbers = levelNumbers(level);
      expect(countHitoriSolutions(numbers, 2)).toBe(1);
      expect(hasUniqueSolution(numbers)).toBe(true);
    }
  });

  it('rechaza el tablero vacío y las modificaciones incorrectas', () => {
    for (const level of HITORI_LEVELS) {
      const numbers = levelNumbers(level);
      const solution = levelSolution(level);
      const empty = Array<boolean>(HITORI_SIZE * HITORI_SIZE).fill(false);
      expect(isSolved(numbers, empty)).toBe(false);

      const missingIndex = solution.findIndex(Boolean);
      expect(missingIndex).toBeGreaterThanOrEqual(0);
      const missing = [...solution];
      missing[missingIndex] = false;
      expect(isSolved(numbers, missing)).toBe(false);

      const extraIndex = solution.findIndex(
        (shaded, index) => !shaded && hasShadedNeighbour(solution, index),
      );
      expect(extraIndex).toBeGreaterThanOrEqual(0);
      const extra = [...solution];
      extra[extraIndex] = true;
      expect(adjacentMask(extra)[extraIndex]).toBe(true);
      expect(isSolved(numbers, extra)).toBe(false);
    }
  });

  it('detecta repeticiones solo entre celdas claras', () => {
    const numbers = [1, 1, 2, 3, 4, 5, 6, 2, 7];
    const empty = Array<boolean>(9).fill(false);
    expect(repeatedMask(numbers, empty, 3)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    const first = [...empty];
    first[0] = true;
    expect(repeatedMask(numbers, first, 3).some(Boolean)).toBe(false);
    const second = [...empty];
    second[1] = true;
    expect(repeatedMask(numbers, second, 3).some(Boolean)).toBe(false);
  });

  it('detecta sombras ortogonalmente adyacentes y no las diagonales', () => {
    expect(adjacentMask([true, true, false, false], 2)).toEqual([true, true, false, false]);
    expect(adjacentMask([true, false, false, true], 2)).toEqual([false, false, false, false]);
    expect(adjacentMask([true, false, true, false], 2)).toEqual([true, false, true, false]);
  });

  it('exige que todas las celdas claras estén conectadas', () => {
    expect(connectedUnshaded(Array<boolean>(9).fill(false), 3)).toBe(true);
    expect(
      connectedUnshaded([false, false, false, false, true, false, false, false, false], 3),
    ).toBe(true);
    expect(connectedUnshaded([false, false, false, true, true, true, false, false, false], 3)).toBe(
      false,
    );
    expect(connectedUnshaded(Array<boolean>(9).fill(true), 3)).toBe(false);
  });

  it('no acepta números ni marcas fuera de formato', () => {
    expect(() =>
      parseNumbers(['12345', '123456', '123456', '123456', '123456', '123456']),
    ).toThrow();
    expect(() =>
      parseNumbers(['123457', '123456', '123456', '123456', '123456', '123456']),
    ).toThrow();
  });
});
