import { describe, expect, it } from 'vitest';
import {
  SUGURU_CELLS,
  SUGURU_LEVELS,
  SUGURU_SIZE,
  conflictMask,
  countSolutions,
  createBoard,
  givensRespected,
  hasUniqueSolution,
  isSolved,
  isValidSolution,
  neighbors,
  regionCells,
  regionMap,
  solvePuzzle,
  type SuguruLevel,
} from '../src/games/suguru/logic';

function isConnected(level: SuguruLevel, cells: readonly number[]): boolean {
  if (cells.length === 0) return false;
  const map = regionMap(level);
  const region = map[cells[0]!]!;
  const seen = new Set<number>([cells[0]!]);
  const queue = [cells[0]!];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of neighbors(current)) {
      if (map[neighbor] === region && !seen.has(neighbor)) {
        seen.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return seen.size === cells.length;
}

function findRegionPair(level: SuguruLevel): readonly [number, number] | null {
  for (const cells of regionCells(level)) {
    for (let first = 0; first < cells.length; first += 1) {
      for (let second = first + 1; second < cells.length; second += 1) {
        const a = cells[first]!;
        const b = cells[second]!;
        if (!neighbors(a).includes(b)) return [a, b] as const;
      }
    }
  }
  return null;
}

function findAdjacentPair(level: SuguruLevel): readonly [number, number] {
  const map = regionMap(level);
  for (let index = 0; index < SUGURU_CELLS; index += 1) {
    for (const neighbor of neighbors(index)) {
      if (neighbor > index && map[index] !== map[neighbor]) {
        return [index, neighbor] as const;
      }
    }
  }
  throw new Error('No hay vecinos de regiones distintas.');
}

describe('suguru', () => {
  it('usa regiones conectadas de 2 a 6 celdas en los cinco niveles', () => {
    expect(SUGURU_LEVELS).toHaveLength(5);
    for (const level of SUGURU_LEVELS) {
      expect(level.rows).toHaveLength(SUGURU_SIZE);
      for (const row of level.rows) expect(row).toHaveLength(SUGURU_SIZE);

      const map = regionMap(level);
      expect(map).toHaveLength(SUGURU_CELLS);

      const cells = regionCells(level);
      expect(cells.length).toBeGreaterThanOrEqual(SUGURU_CELLS / 6);
      expect(cells.length).toBeLessThanOrEqual(SUGURU_CELLS / 2);
      for (const list of cells) {
        expect(list.length).toBeGreaterThanOrEqual(2);
        expect(list.length).toBeLessThanOrEqual(6);
        expect(isConnected(level, list)).toBe(true);
      }
      expect(cells.reduce((total, list) => total + list.length, 0)).toBe(SUGURU_CELLS);
    }
  });

  it('tiene soluciones válidas y givens coherentes con ellas', () => {
    for (const level of SUGURU_LEVELS) {
      expect(level.solution).toHaveLength(SUGURU_CELLS);
      expect(isValidSolution(level, level.solution)).toBe(true);
      expect(conflictMask(level, level.solution).some(Boolean)).toBe(false);
      expect(givensRespected(level, level.solution)).toBe(true);
      expect(isSolved(level, level.solution)).toBe(true);

      const board = createBoard(level);
      expect(board).toEqual(level.givens);
      expect(board.filter((value) => value > 0).length).toBeGreaterThanOrEqual(10);
      expect(isSolved(level, board)).toBe(false);

      level.givens.forEach((value, index) => {
        if (value === 0) return;
        expect(value).toBe(level.solution[index]);
      });
    }
  });

  it('resuelve cada nivel con solución única', () => {
    for (const level of SUGURU_LEVELS) {
      expect(hasUniqueSolution(level)).toBe(true);
      expect(countSolutions(level, level.givens, 2)).toBe(1);
      const solution = solvePuzzle(level);
      expect(solution).not.toBeNull();
      expect(solution).toEqual(level.solution);
      expect(isSolved(level, solution!)).toBe(true);
    }
  });

  it('rechaza repeticiones dentro de una región', () => {
    const level = SUGURU_LEVELS[0]!;
    const pair = findRegionPair(level);
    expect(pair).not.toBeNull();
    const [first, second] = pair!;
    const broken = [...level.solution];
    broken[second] = broken[first]!;

    expect(isValidSolution(level, broken)).toBe(false);
    expect(isSolved(level, broken)).toBe(false);
    const mask = conflictMask(level, broken);
    expect(mask[first]).toBe(true);
    expect(mask[second]).toBe(true);
  });

  it('rechaza números iguales en celdas vecinas', () => {
    const level = SUGURU_LEVELS[0]!;
    const [first, second] = findAdjacentPair(level);
    const broken = [...level.solution];
    broken[second] = broken[first]!;

    expect(isValidSolution(level, broken)).toBe(false);
    const mask = conflictMask(level, broken);
    expect(mask[first]).toBe(true);
    expect(mask[second]).toBe(true);
  });

  it('rechaza valores fuera del rango de la región y givens alterados', () => {
    const level = SUGURU_LEVELS[0]!;
    const cells = regionCells(level);
    const small = cells.find((list) => list.length < 6)!;
    const outOfRange = [...level.solution];
    outOfRange[small[0]!] = small.length + 1;
    expect(isValidSolution(level, outOfRange)).toBe(false);
    expect(conflictMask(level, outOfRange)[small[0]!]).toBe(true);

    const changedGiven = [...level.solution];
    const givenIndex = level.givens.findIndex((value) => value > 0);
    expect(givenIndex).toBeGreaterThanOrEqual(0);
    changedGiven[givenIndex] = 0;
    expect(givensRespected(level, changedGiven)).toBe(false);
    expect(isSolved(level, changedGiven)).toBe(false);
  });
});
