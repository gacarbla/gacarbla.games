export interface SudokuLevel {
  id: 'facil' | 'normal' | 'dificil';
  label: string;
  size: number;
  boxRows: number;
  boxCols: number;
  minGivens: number;
}

export const SUDOKU_LEVELS: readonly SudokuLevel[] = [
  { id: 'facil', label: 'Fácil', size: 4, boxRows: 2, boxCols: 2, minGivens: 8 },
  { id: 'normal', label: 'Normal', size: 6, boxRows: 2, boxCols: 3, minGivens: 16 },
  { id: 'dificil', label: 'Difícil', size: 9, boxRows: 3, boxCols: 3, minGivens: 34 },
] as const;

export const DEFAULT_SUDOKU_LEVEL = 1;

export interface SudokuPuzzle {
  puzzle: number[];
  solution: number[];
}

export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const value = copy[index]!;
    copy[index] = copy[swap]!;
    copy[swap] = value;
  }
  return copy;
}

export function canPlace(
  level: SudokuLevel,
  grid: readonly number[],
  index: number,
  value: number,
): boolean {
  const { size, boxRows, boxCols } = level;
  const column = index % size;
  const row = Math.floor(index / size);

  for (let offset = 0; offset < size; offset += 1) {
    if (grid[row * size + offset] === value) return false;
    if (grid[offset * size + column] === value) return false;
  }

  const boxRow = Math.floor(row / boxRows) * boxRows;
  const boxColumn = Math.floor(column / boxCols) * boxCols;
  for (let dy = 0; dy < boxRows; dy += 1) {
    for (let dx = 0; dx < boxCols; dx += 1) {
      if (grid[(boxRow + dy) * size + boxColumn + dx] === value) return false;
    }
  }
  return true;
}

function fillGrid(level: SudokuLevel, grid: number[], random: () => number): boolean {
  const index = grid.indexOf(0);
  if (index < 0) return true;

  const values = Array.from({ length: level.size }, (_, value) => value + 1);
  for (const value of shuffled(values, random)) {
    if (!canPlace(level, grid, index, value)) continue;
    grid[index] = value;
    if (fillGrid(level, grid, random)) return true;
    grid[index] = 0;
  }
  return false;
}

export function generateSolution(
  level: SudokuLevel = SUDOKU_LEVELS[DEFAULT_SUDOKU_LEVEL]!,
  random: () => number = Math.random,
): number[] {
  const grid = Array<number>(level.size * level.size).fill(0);
  fillGrid(level, grid, random);
  return grid;
}

function countSolutions(level: SudokuLevel, grid: number[], limit: number): number {
  const index = grid.indexOf(0);
  if (index < 0) return 1;

  let total = 0;
  for (let value = 1; value <= level.size; value += 1) {
    if (!canPlace(level, grid, index, value)) continue;
    grid[index] = value;
    total += countSolutions(level, grid, limit - total);
    grid[index] = 0;
    if (total >= limit) break;
  }
  return total;
}

/**
 * Retira celdas una a una comprobando que la solución siga siendo única.
 * Así cada dificultad garantiza un puzzle resoluble y con una sola respuesta.
 */
export function createPuzzle(
  level: SudokuLevel = SUDOKU_LEVELS[DEFAULT_SUDOKU_LEVEL]!,
  random: () => number = Math.random,
): SudokuPuzzle {
  const solution = generateSolution(level, random);
  const puzzle = [...solution];
  const cells = level.size * level.size;
  const order = shuffled(
    Array.from({ length: cells }, (_, index) => index),
    random,
  );

  let givens = cells;
  for (const index of order) {
    if (givens <= level.minGivens) break;
    const backup = puzzle[index]!;
    puzzle[index] = 0;
    if (countSolutions(level, [...puzzle], 2) === 1) {
      givens -= 1;
    } else {
      puzzle[index] = backup;
    }
  }

  return { puzzle, solution };
}

/** Marca las celdas que repiten número en fila, columna o caja. */
export function conflictMask(level: SudokuLevel, grid: readonly number[]): boolean[] {
  const { size, boxRows, boxCols } = level;
  const mask = Array<boolean>(size * size).fill(false);

  const markUnit = (unit: readonly number[]): void => {
    const seen = new Map<number, number[]>();
    for (const index of unit) {
      const value = grid[index]!;
      if (value === 0) continue;
      const positions = seen.get(value) ?? [];
      positions.push(index);
      seen.set(value, positions);
    }
    for (const positions of seen.values()) {
      if (positions.length > 1) {
        for (const index of positions) mask[index] = true;
      }
    }
  };

  for (let row = 0; row < size; row += 1) {
    markUnit(Array.from({ length: size }, (_, column) => row * size + column));
  }
  for (let column = 0; column < size; column += 1) {
    markUnit(Array.from({ length: size }, (_, row) => row * size + column));
  }
  for (let boxRow = 0; boxRow < size; boxRow += boxRows) {
    for (let boxColumn = 0; boxColumn < size; boxColumn += boxCols) {
      const unit: number[] = [];
      for (let dy = 0; dy < boxRows; dy += 1) {
        for (let dx = 0; dx < boxCols; dx += 1) {
          unit.push((boxRow + dy) * size + boxColumn + dx);
        }
      }
      markUnit(unit);
    }
  }
  return mask;
}
