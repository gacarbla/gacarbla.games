import { describe, expect, it } from 'vitest';
import {
  SUDOKU_BOX_COLS,
  SUDOKU_BOX_ROWS,
  SUDOKU_SIZE,
  canPlace,
  conflictMask,
  createPuzzle,
} from '../src/games/sudoku/logic';

function validSolution(grid: readonly number[]): boolean {
  const units: number[][] = [];
  for (let row = 0; row < SUDOKU_SIZE; row += 1) {
    units.push(Array.from({ length: SUDOKU_SIZE }, (_, column) => row * SUDOKU_SIZE + column));
  }
  for (let column = 0; column < SUDOKU_SIZE; column += 1) {
    units.push(Array.from({ length: SUDOKU_SIZE }, (_, row) => row * SUDOKU_SIZE + column));
  }
  for (let row = 0; row < SUDOKU_SIZE; row += SUDOKU_BOX_ROWS) {
    for (let column = 0; column < SUDOKU_SIZE; column += SUDOKU_BOX_COLS) {
      const unit: number[] = [];
      for (let dy = 0; dy < SUDOKU_BOX_ROWS; dy += 1) {
        for (let dx = 0; dx < SUDOKU_BOX_COLS; dx += 1) {
          unit.push((row + dy) * SUDOKU_SIZE + column + dx);
        }
      }
      units.push(unit);
    }
  }
  return units.every((unit) => new Set(unit.map((index) => grid[index])).size === SUDOKU_SIZE);
}

describe('sudoku', () => {
  it('genera soluciones válidas y puzzles coherentes', () => {
    for (let round = 0; round < 8; round += 1) {
      const { puzzle, solution } = createPuzzle();
      expect(validSolution(solution)).toBe(true);
      const given = puzzle.filter((value) => value !== 0).length;
      expect(given).toBeGreaterThanOrEqual(16);
      expect(given).toBeLessThanOrEqual(18);
      for (let index = 0; index < puzzle.length; index += 1) {
        if (puzzle[index] !== 0) expect(puzzle[index]).toBe(solution[index]);
      }
    }
  });

  it('detecta conflictos en fila, columna y caja', () => {
    const { solution } = createPuzzle();
    expect(conflictMask(solution).some(Boolean)).toBe(false);
    const broken = [...solution];
    broken[0] = broken[1]!;
    expect(conflictMask(broken)[0]).toBe(true);
    expect(conflictMask(broken)[1]).toBe(true);
    expect(canPlace(solution, 0, solution[0]!)).toBe(false);
  });
});
