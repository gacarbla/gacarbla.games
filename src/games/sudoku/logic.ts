export const SUDOKU_SIZE = 6;
export const SUDOKU_BOX_ROWS = 2;
export const SUDOKU_BOX_COLS = 3;
export const SUDOKU_CELLS = SUDOKU_SIZE * SUDOKU_SIZE;

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

export function canPlace(grid: readonly number[], index: number, value: number): boolean {
  const column = index % SUDOKU_SIZE;
  const row = Math.floor(index / SUDOKU_SIZE);

  for (let offset = 0; offset < SUDOKU_SIZE; offset += 1) {
    if (grid[row * SUDOKU_SIZE + offset] === value) return false;
    if (grid[offset * SUDOKU_SIZE + column] === value) return false;
  }

  const boxRow = Math.floor(row / SUDOKU_BOX_ROWS) * SUDOKU_BOX_ROWS;
  const boxColumn = Math.floor(column / SUDOKU_BOX_COLS) * SUDOKU_BOX_COLS;
  for (let dy = 0; dy < SUDOKU_BOX_ROWS; dy += 1) {
    for (let dx = 0; dx < SUDOKU_BOX_COLS; dx += 1) {
      if (grid[(boxRow + dy) * SUDOKU_SIZE + boxColumn + dx] === value) return false;
    }
  }
  return true;
}

function fillGrid(grid: number[], random: () => number): boolean {
  const index = grid.indexOf(0);
  if (index < 0) return true;

  for (const value of shuffled([1, 2, 3, 4, 5, 6], random)) {
    if (!canPlace(grid, index, value)) continue;
    grid[index] = value;
    if (fillGrid(grid, random)) return true;
    grid[index] = 0;
  }
  return false;
}

export function generateSolution(random: () => number = Math.random): number[] {
  const grid = Array<number>(SUDOKU_CELLS).fill(0);
  fillGrid(grid, random);
  return grid;
}

function countSolutions(grid: number[], limit: number): number {
  const index = grid.indexOf(0);
  if (index < 0) return 1;

  let total = 0;
  for (let value = 1; value <= SUDOKU_SIZE; value += 1) {
    if (!canPlace(grid, index, value)) continue;
    grid[index] = value;
    total += countSolutions(grid, limit - total);
    grid[index] = 0;
    if (total >= limit) break;
  }
  return total;
}

/**
 * Retira 18–20 celdas y comprueba que la solución siga siendo única.
 * Si una extracción deja varias soluciones se genera otro tablero.
 */
export function createPuzzle(random: () => number = Math.random): SudokuPuzzle {
  let last: SudokuPuzzle | null = null;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const solution = generateSolution(random);
    const puzzle = [...solution];
    const order = shuffled(
      Array.from({ length: SUDOKU_CELLS }, (_, index) => index),
      random,
    );
    const removals = 18 + Math.floor(random() * 3);
    for (let index = 0; index < removals; index += 1) {
      puzzle[order[index]!] = 0;
    }

    last = { puzzle: [...puzzle], solution: [...solution] };
    const copy = [...puzzle];
    if (countSolutions(copy, 2) === 1) return { puzzle, solution };
  }

  if (last) return last;
  const solution = generateSolution(random);
  return { puzzle: [...solution], solution };
}

/** Marca las celdas que repiten número en fila, columna o caja. */
export function conflictMask(grid: readonly number[]): boolean[] {
  const mask = Array<boolean>(SUDOKU_CELLS).fill(false);

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

  for (let row = 0; row < SUDOKU_SIZE; row += 1) {
    markUnit(Array.from({ length: SUDOKU_SIZE }, (_, column) => row * SUDOKU_SIZE + column));
  }
  for (let column = 0; column < SUDOKU_SIZE; column += 1) {
    markUnit(Array.from({ length: SUDOKU_SIZE }, (_, row) => row * SUDOKU_SIZE + column));
  }
  for (let boxRow = 0; boxRow < SUDOKU_SIZE; boxRow += SUDOKU_BOX_ROWS) {
    for (let boxColumn = 0; boxColumn < SUDOKU_SIZE; boxColumn += SUDOKU_BOX_COLS) {
      const unit: number[] = [];
      for (let dy = 0; dy < SUDOKU_BOX_ROWS; dy += 1) {
        for (let dx = 0; dx < SUDOKU_BOX_COLS; dx += 1) {
          unit.push((boxRow + dy) * SUDOKU_SIZE + boxColumn + dx);
        }
      }
      markUnit(unit);
    }
  }
  return mask;
}
