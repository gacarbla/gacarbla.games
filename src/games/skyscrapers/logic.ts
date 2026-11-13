export const SKYSCRAPER_SIZE = 6;
export const SKYSCRAPER_CELLS = SKYSCRAPER_SIZE * SKYSCRAPER_SIZE;

export interface SkyscraperClues {
  readonly top: readonly number[];
  readonly right: readonly number[];
  readonly bottom: readonly number[];
  readonly left: readonly number[];
}

export interface SkyscraperClueViolations {
  top: boolean[];
  right: boolean[];
  bottom: boolean[];
  left: boolean[];
}

export interface SkyscraperLevel {
  readonly id: string;
  readonly label: string;
  /** 36 celdas; 0 es una celda vacía. */
  readonly givens: readonly number[];
  /** Solución completa, usada para comprobar los niveles en los tests. */
  readonly solution: readonly number[];
  readonly clues: SkyscraperClues;
}

export const DEFAULT_SKYSCRAPER_LEVEL = 0;

export const SKYSCRAPER_LEVELS: readonly SkyscraperLevel[] = [
  {
    id: 'iniciacion',
    label: 'Iniciación',
    givens: [
      0, 2, 0, 4, 0, 6, 2, 0, 0, 6, 4, 1, 6, 0, 0, 5, 0, 4, 3, 6, 4, 1, 0, 2, 4, 0, 0, 2, 0, 3, 0,
      0, 0, 3, 0, 5,
    ],
    solution: [
      5, 2, 1, 4, 3, 6, 2, 5, 3, 6, 4, 1, 6, 3, 2, 5, 1, 4, 3, 6, 4, 1, 5, 2, 4, 1, 5, 2, 6, 3, 1,
      4, 6, 3, 2, 5,
    ],
    clues: {
      top: [2, 3, 5, 2, 4, 1],
      right: [1, 3, 3, 3, 2, 2],
      bottom: [3, 2, 1, 3, 2, 2],
      left: [2, 3, 1, 2, 3, 3],
    },
  },
  {
    id: 'paseo',
    label: 'Paseo',
    givens: [
      0, 0, 0, 5, 0, 1, 0, 0, 0, 3, 0, 0, 0, 0, 0, 6, 3, 4, 6, 5, 1, 2, 4, 3, 5, 6, 0, 0, 0, 2, 2,
      0, 0, 0, 0, 0,
    ],
    solution: [
      3, 4, 6, 5, 2, 1, 4, 1, 2, 3, 6, 5, 1, 2, 5, 6, 3, 4, 6, 5, 1, 2, 4, 3, 5, 6, 3, 4, 1, 2, 2,
      3, 4, 1, 5, 6,
    ],
    clues: {
      top: [3, 3, 1, 2, 2, 3],
      right: [4, 2, 2, 4, 3, 1],
      bottom: [3, 2, 3, 3, 2, 1],
      left: [3, 2, 4, 1, 2, 5],
    },
  },
  {
    id: 'mirador',
    label: 'Mirador',
    givens: [
      3, 6, 0, 0, 0, 0, 0, 4, 0, 0, 3, 5, 6, 1, 0, 0, 0, 0, 0, 3, 0, 0, 1, 0, 0, 0, 0, 3, 0, 1, 2,
      0, 3, 0, 0, 0,
    ],
    solution: [
      3, 6, 1, 4, 5, 2, 1, 4, 2, 6, 3, 5, 6, 1, 4, 5, 2, 3, 5, 3, 6, 2, 1, 4, 4, 2, 5, 3, 6, 1, 2,
      5, 3, 1, 4, 6,
    ],
    clues: {
      top: [2, 1, 4, 2, 2, 3],
      right: [3, 2, 3, 2, 2, 1],
      bottom: [4, 2, 3, 4, 2, 1],
      left: [2, 3, 1, 2, 3, 3],
    },
  },
  {
    id: 'azotea',
    label: 'Azotea',
    givens: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 3, 0, 0, 1, 5, 0, 4, 0, 5, 0, 1, 0, 0, 5, 0, 0, 0, 5,
      0, 1, 0, 0, 4,
    ],
    solution: [
      2, 5, 3, 1, 4, 6, 4, 1, 2, 6, 5, 3, 6, 3, 4, 2, 1, 5, 3, 4, 6, 5, 2, 1, 1, 6, 5, 4, 3, 2, 5,
      2, 1, 3, 6, 4,
    ],
    clues: {
      top: [3, 2, 3, 2, 3, 1],
      right: [1, 3, 2, 4, 5, 2],
      bottom: [2, 2, 3, 4, 1, 3],
      left: [3, 2, 1, 3, 2, 2],
    },
  },
  {
    id: 'cumbre',
    label: 'Cumbre',
    givens: [
      0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 6, 0, 0, 0, 0, 3, 5, 0, 1, 6, 0, 0,
      0, 0, 6, 0, 3,
    ],
    solution: [
      4, 1, 6, 5, 3, 2, 6, 4, 3, 2, 5, 1, 1, 3, 5, 4, 2, 6, 2, 6, 1, 3, 4, 5, 3, 5, 2, 1, 6, 4, 5,
      2, 4, 6, 1, 3,
    ],
    clues: {
      top: [2, 3, 1, 2, 3, 2],
      right: [4, 3, 1, 2, 2, 2],
      bottom: [2, 3, 3, 1, 2, 4],
      left: [2, 1, 4, 2, 3, 2],
    },
  },
];

/** Cuántos edificios se ven desde un extremo de la línea. */
export function visibleFrom(line: readonly number[]): number {
  let tallest = 0;
  let visible = 0;
  for (const value of line) {
    if (value > tallest) {
      tallest = value;
      visible += 1;
    }
  }
  return visible;
}

function rowValues(grid: readonly number[], row: number): number[] {
  return Array.from(
    { length: SKYSCRAPER_SIZE },
    (_, column) => grid[row * SKYSCRAPER_SIZE + column] ?? 0,
  );
}

function columnValues(grid: readonly number[], column: number): number[] {
  return Array.from(
    { length: SKYSCRAPER_SIZE },
    (_, row) => grid[row * SKYSCRAPER_SIZE + column] ?? 0,
  );
}

function reversed(line: readonly number[]): number[] {
  return [...line].reverse();
}

export function cluesFromSolution(grid: readonly number[]): SkyscraperClues {
  const top: number[] = [];
  const bottom: number[] = [];
  const left: number[] = [];
  const right: number[] = [];
  for (let row = 0; row < SKYSCRAPER_SIZE; row += 1) {
    const line = rowValues(grid, row);
    left.push(visibleFrom(line));
    right.push(visibleFrom(reversed(line)));
  }
  for (let column = 0; column < SKYSCRAPER_SIZE; column += 1) {
    const line = columnValues(grid, column);
    top.push(visibleFrom(line));
    bottom.push(visibleFrom(reversed(line)));
  }
  return { top, right, bottom, left };
}

export function isRowComplete(grid: readonly number[], row: number): boolean {
  for (let column = 0; column < SKYSCRAPER_SIZE; column += 1) {
    if ((grid[row * SKYSCRAPER_SIZE + column] ?? 0) === 0) return false;
  }
  return true;
}

export function isColumnComplete(grid: readonly number[], column: number): boolean {
  for (let row = 0; row < SKYSCRAPER_SIZE; row += 1) {
    if ((grid[row * SKYSCRAPER_SIZE + column] ?? 0) === 0) return false;
  }
  return true;
}

/** Marca las celdas que repiten número en su fila o en su columna. */
export function conflictMask(grid: readonly number[]): boolean[] {
  const mask = Array<boolean>(SKYSCRAPER_CELLS).fill(false);

  for (let index = 0; index < SKYSCRAPER_CELLS; index += 1) {
    const value = grid[index] ?? 0;
    if (value !== 0 && (value < 1 || value > SKYSCRAPER_SIZE)) mask[index] = true;
  }

  const markUnit = (indices: readonly number[]): void => {
    const seen = new Map<number, number[]>();
    for (const index of indices) {
      const value = grid[index] ?? 0;
      if (value < 1 || value > SKYSCRAPER_SIZE) continue;
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

  for (let row = 0; row < SKYSCRAPER_SIZE; row += 1) {
    markUnit(
      Array.from({ length: SKYSCRAPER_SIZE }, (_, column) => row * SKYSCRAPER_SIZE + column),
    );
  }
  for (let column = 0; column < SKYSCRAPER_SIZE; column += 1) {
    markUnit(Array.from({ length: SKYSCRAPER_SIZE }, (_, row) => row * SKYSCRAPER_SIZE + column));
  }

  return mask;
}

/** Pistas que ya no cuadran con una fila o columna completa. */
export function clueViolations(
  grid: readonly number[],
  clues: SkyscraperClues,
): SkyscraperClueViolations {
  const violations: SkyscraperClueViolations = {
    top: Array<boolean>(SKYSCRAPER_SIZE).fill(false),
    right: Array<boolean>(SKYSCRAPER_SIZE).fill(false),
    bottom: Array<boolean>(SKYSCRAPER_SIZE).fill(false),
    left: Array<boolean>(SKYSCRAPER_SIZE).fill(false),
  };

  for (let row = 0; row < SKYSCRAPER_SIZE; row += 1) {
    if (!isRowComplete(grid, row)) continue;
    const line = rowValues(grid, row);
    if (visibleFrom(line) !== clues.left[row]) violations.left[row] = true;
    if (visibleFrom(reversed(line)) !== clues.right[row]) violations.right[row] = true;
  }
  for (let column = 0; column < SKYSCRAPER_SIZE; column += 1) {
    if (!isColumnComplete(grid, column)) continue;
    const line = columnValues(grid, column);
    if (visibleFrom(line) !== clues.top[column]) violations.top[column] = true;
    if (visibleFrom(reversed(line)) !== clues.bottom[column]) violations.bottom[column] = true;
  }

  return violations;
}

function rowCluesMatch(grid: readonly number[], row: number, clues: SkyscraperClues): boolean {
  const line = rowValues(grid, row);
  return visibleFrom(line) === clues.left[row] && visibleFrom(reversed(line)) === clues.right[row];
}

function columnCluesMatch(
  grid: readonly number[],
  column: number,
  clues: SkyscraperClues,
): boolean {
  const line = columnValues(grid, column);
  return (
    visibleFrom(line) === clues.top[column] && visibleFrom(reversed(line)) === clues.bottom[column]
  );
}

export function cluesMatch(grid: readonly number[], clues: SkyscraperClues): boolean {
  if (grid.length !== SKYSCRAPER_CELLS) return false;
  for (const value of grid) {
    if (value < 1 || value > SKYSCRAPER_SIZE) return false;
  }
  for (let row = 0; row < SKYSCRAPER_SIZE; row += 1) {
    if (!rowCluesMatch(grid, row, clues)) return false;
  }
  for (let column = 0; column < SKYSCRAPER_SIZE; column += 1) {
    if (!columnCluesMatch(grid, column, clues)) return false;
  }
  return true;
}

/** Tablero completo, sin repeticiones y con todas las pistas correctas. */
export function isSolved(grid: readonly number[], clues: SkyscraperClues): boolean {
  if (grid.length !== SKYSCRAPER_CELLS) return false;
  if (grid.some((value) => value < 1 || value > SKYSCRAPER_SIZE)) return false;
  if (conflictMask(grid).some(Boolean)) return false;
  return cluesMatch(grid, clues);
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const value = copy[index]!;
    copy[index] = copy[swap]!;
    copy[swap] = value;
  }
  return copy;
}

function searchSolutions(
  givens: readonly number[],
  clues: SkyscraperClues,
  limit: number,
  random: (() => number) | null,
): number[][] {
  if (limit <= 0 || givens.length !== SKYSCRAPER_CELLS) return [];

  const grid = [...givens];
  const rowMask = Array<number>(SKYSCRAPER_SIZE).fill(0);
  const colMask = Array<number>(SKYSCRAPER_SIZE).fill(0);

  for (let index = 0; index < SKYSCRAPER_CELLS; index += 1) {
    const value = grid[index]!;
    if (value === 0) continue;
    if (value < 1 || value > SKYSCRAPER_SIZE) return [];
    const row = Math.floor(index / SKYSCRAPER_SIZE);
    const column = index % SKYSCRAPER_SIZE;
    const bit = 1 << value;
    if ((rowMask[row]! & bit) !== 0 || (colMask[column]! & bit) !== 0) return [];
    rowMask[row] = rowMask[row]! | bit;
    colMask[column] = colMask[column]! | bit;
  }

  const solutions: number[][] = [];
  const baseValues = Array.from({ length: SKYSCRAPER_SIZE }, (_, index) => index + 1);

  const search = (index: number): boolean => {
    if (solutions.length >= limit) return true;
    if (index === SKYSCRAPER_CELLS) {
      if (cluesMatch(grid, clues)) solutions.push([...grid]);
      return solutions.length >= limit;
    }
    if (grid[index] !== 0) return search(index + 1);

    const row = Math.floor(index / SKYSCRAPER_SIZE);
    const column = index % SKYSCRAPER_SIZE;
    const candidates = random ? shuffled(baseValues, random) : baseValues;

    for (const value of candidates) {
      const bit = 1 << value;
      if ((rowMask[row]! & bit) !== 0 || (colMask[column]! & bit) !== 0) continue;

      grid[index] = value;
      rowMask[row] = rowMask[row]! | bit;
      colMask[column] = colMask[column]! | bit;

      const rowOk = !isRowComplete(grid, row) || rowCluesMatch(grid, row, clues);
      const columnOk = !isColumnComplete(grid, column) || columnCluesMatch(grid, column, clues);
      const stop = rowOk && columnOk ? search(index + 1) : false;

      rowMask[row] = rowMask[row]! & ~bit;
      colMask[column] = colMask[column]! & ~bit;
      grid[index] = 0;

      if (stop) return true;
    }
    return false;
  };

  search(0);
  return solutions;
}

/** Cuenta soluciones hasta `limit` (2 basta para comprobar unicidad). */
export function countSolutions(
  givens: readonly number[],
  clues: SkyscraperClues,
  limit = 2,
): number {
  return searchSolutions(givens, clues, limit, null).length;
}

/** Devuelve la primera solución encontrada o `null` si no hay ninguna. */
export function solveSkyscrapers(
  givens: readonly number[],
  clues: SkyscraperClues,
  random: () => number = Math.random,
): number[] | null {
  return searchSolutions(givens, clues, 1, random)[0] ?? null;
}
