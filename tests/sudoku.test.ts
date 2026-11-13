import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SUDOKU_LEVEL,
  SUDOKU_LEVELS,
  canPlace,
  conflictMask,
  createPuzzle,
  type SudokuLevel,
} from '../src/games/sudoku/logic';

function validSolution(level: SudokuLevel, grid: readonly number[]): boolean {
  const { size, boxRows, boxCols } = level;
  const units: number[][] = [];
  for (let row = 0; row < size; row += 1) {
    units.push(Array.from({ length: size }, (_, column) => row * size + column));
  }
  for (let column = 0; column < size; column += 1) {
    units.push(Array.from({ length: size }, (_, row) => row * size + column));
  }
  for (let row = 0; row < size; row += boxRows) {
    for (let column = 0; column < size; column += boxCols) {
      const unit: number[] = [];
      for (let dy = 0; dy < boxRows; dy += 1) {
        for (let dx = 0; dx < boxCols; dx += 1) {
          unit.push((row + dy) * size + column + dx);
        }
      }
      units.push(unit);
    }
  }
  return units.every((unit) => new Set(unit.map((index) => grid[index])).size === size);
}

describe('sudoku', () => {
  it('genera puzzles coherentes en las tres dificultades', () => {
    for (const level of SUDOKU_LEVELS) {
      const { puzzle, solution } = createPuzzle(level);
      expect(puzzle).toHaveLength(level.size * level.size);
      expect(validSolution(level, solution)).toBe(true);
      const given = puzzle.filter((value) => value !== 0).length;
      expect(given).toBeGreaterThanOrEqual(level.minGivens);
      for (let index = 0; index < puzzle.length; index += 1) {
        if (puzzle[index] !== 0) expect(puzzle[index]).toBe(solution[index]);
      }
    }
  });

  it('detecta conflictos en fila, columna y caja', () => {
    const level = SUDOKU_LEVELS[DEFAULT_SUDOKU_LEVEL]!;
    const { solution } = createPuzzle(level);
    expect(conflictMask(level, solution).some(Boolean)).toBe(false);
    const broken = [...solution];
    broken[0] = broken[1]!;
    expect(conflictMask(level, broken)[0]).toBe(true);
    expect(conflictMask(level, broken)[1]).toBe(true);
    expect(canPlace(level, solution, 0, solution[0]!)).toBe(false);
  });
});
