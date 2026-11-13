/**
 * Futoshiki 5×5: lógica pura del juego.
 *
 * Un tablero es válido cuando cada fila y cada columna contienen los números
 * del 1 al 5 sin repetición y se cumplen todas las desigualdades. Los cinco
 * niveles están construidos sobre una solución conocida y se comprueban con
 * el solver de backtracking (`countSolutions`).
 */

export const FUTOSHIKI_SIZE = 5;
export const FUTOSHIKI_CELLS = FUTOSHIKI_SIZE * FUTOSHIKI_SIZE;

export type FutoshikiOperator = '<' | '>';

export interface FutoshikiConstraint {
  /** Celda situada arriba o a la izquierda. */
  a: number;
  /** Celda vecina situada abajo o a la derecha. */
  b: number;
  /** Indica si el valor de `a` es menor (`<`) o mayor (`>`) que el de `b`. */
  operator: FutoshikiOperator;
}

export interface FutoshikiLevel {
  readonly id: string;
  readonly label: string;
  /** Pistas iniciales; 0 representa una celda vacía. */
  readonly givens: readonly number[];
  /** Desigualdades entre celdas ortogonalmente adyacentes. */
  readonly constraints: readonly FutoshikiConstraint[];
  /** Solución única del nivel. */
  readonly solution: readonly number[];
}

function constraint(a: number, b: number, operator: FutoshikiOperator): FutoshikiConstraint {
  return { a, b, operator };
}

export const FUTOSHIKI_LEVELS: readonly FutoshikiLevel[] = [
  {
    id: 'calma',
    label: 'Calma',
    givens: [2, 0, 0, 1, 0, 4, 1, 0, 3, 0, 5, 3, 1, 0, 4, 0, 2, 0, 0, 5, 3, 4, 2, 5, 0],
    constraints: [
      constraint(3, 4, '<'),
      constraint(15, 20, '<'),
      constraint(6, 11, '<'),
      constraint(14, 19, '<'),
      constraint(0, 5, '<'),
    ],
    solution: [2, 5, 4, 1, 3, 4, 1, 5, 3, 2, 5, 3, 1, 2, 4, 1, 2, 3, 4, 5, 3, 4, 2, 5, 1],
  },
  {
    id: 'cruce',
    label: 'Cruce',
    givens: [3, 0, 0, 5, 2, 0, 0, 2, 3, 1, 0, 0, 1, 0, 5, 0, 2, 0, 0, 4, 0, 4, 0, 2, 3],
    constraints: [
      constraint(15, 20, '>'),
      constraint(10, 15, '<'),
      constraint(13, 14, '<'),
      constraint(5, 10, '>'),
      constraint(8, 13, '<'),
      constraint(0, 5, '<'),
      constraint(17, 18, '>'),
    ],
    solution: [3, 1, 4, 5, 2, 4, 5, 2, 3, 1, 2, 3, 1, 4, 5, 5, 2, 3, 1, 4, 1, 4, 5, 2, 3],
  },
  {
    id: 'cadena',
    label: 'Cadena',
    givens: [3, 0, 1, 2, 0, 0, 0, 4, 0, 3, 0, 0, 2, 0, 0, 0, 3, 0, 1, 4, 5, 0, 0, 4, 0],
    constraints: [
      constraint(8, 9, '>'),
      constraint(6, 11, '<'),
      constraint(9, 14, '>'),
      constraint(14, 19, '<'),
      constraint(0, 5, '>'),
      constraint(22, 23, '<'),
      constraint(0, 1, '<'),
      constraint(19, 24, '>'),
      constraint(12, 13, '<'),
    ],
    solution: [3, 4, 1, 2, 5, 1, 2, 4, 5, 3, 4, 5, 2, 3, 1, 2, 3, 5, 1, 4, 5, 1, 3, 4, 2],
  },
  {
    id: 'rincon',
    label: 'Rincón',
    givens: [2, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 5, 0, 0, 1, 0, 0, 5, 3, 0, 0, 0, 2, 0, 0],
    constraints: [
      constraint(15, 16, '>'),
      constraint(9, 14, '>'),
      constraint(6, 11, '<'),
      constraint(11, 12, '>'),
      constraint(10, 11, '<'),
      constraint(18, 19, '>'),
      constraint(2, 3, '>'),
      constraint(1, 6, '>'),
      constraint(19, 24, '<'),
      constraint(13, 18, '<'),
      constraint(10, 15, '<'),
    ],
    solution: [2, 4, 3, 1, 5, 5, 2, 1, 4, 3, 3, 5, 4, 2, 1, 4, 1, 5, 3, 2, 1, 3, 2, 5, 4],
  },
  {
    id: 'cuspide',
    label: 'Cúspide',
    givens: [0, 0, 3, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 4, 5, 3, 0, 2, 0, 0, 0, 1, 4, 0],
    constraints: [
      constraint(18, 23, '<'),
      constraint(5, 10, '<'),
      constraint(17, 18, '>'),
      constraint(21, 22, '>'),
      constraint(1, 2, '<'),
      constraint(15, 20, '>'),
      constraint(10, 15, '<'),
      constraint(13, 14, '>'),
      constraint(2, 7, '<'),
      constraint(0, 5, '>'),
      constraint(16, 21, '<'),
      constraint(14, 19, '>'),
      constraint(1, 6, '<'),
    ],
    solution: [4, 2, 3, 1, 5, 1, 4, 5, 3, 2, 3, 1, 2, 5, 4, 5, 3, 4, 2, 1, 2, 5, 1, 4, 3],
  },
];

export const DEFAULT_FUTOSHIKI_LEVEL = 0;

export function rowOf(index: number): number {
  return Math.floor(index / FUTOSHIKI_SIZE);
}

export function columnOf(index: number): number {
  return index % FUTOSHIKI_SIZE;
}

/** Comprueba si las dos celdas de una restricción cumplen la desigualdad. */
export function constraintHolds(
  grid: readonly number[],
  restriction: FutoshikiConstraint,
): boolean {
  const left = grid[restriction.a] ?? 0;
  const right = grid[restriction.b] ?? 0;
  if (left === 0 || right === 0) return true;
  return restriction.operator === '<' ? left < right : left > right;
}

export function satisfiesConstraints(level: FutoshikiLevel, grid: readonly number[]): boolean {
  return level.constraints.every((restriction) => constraintHolds(grid, restriction));
}

/**
 * Valores que pueden escribirse en una celda sin repetir en su fila o columna
 * y sin romper las desigualdades que ya tienen el otro extremo resuelto.
 */
export function candidateValues(
  level: FutoshikiLevel,
  grid: readonly number[],
  index: number,
): number[] {
  const row = rowOf(index);
  const column = columnOf(index);
  const values: number[] = [];

  for (let value = 1; value <= FUTOSHIKI_SIZE; value += 1) {
    let valid = true;

    for (let offset = 0; offset < FUTOSHIKI_SIZE; offset += 1) {
      if (grid[row * FUTOSHIKI_SIZE + offset] === value) {
        valid = false;
        break;
      }
      if (grid[offset * FUTOSHIKI_SIZE + column] === value) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;

    for (const restriction of level.constraints) {
      if (restriction.a !== index && restriction.b !== index) continue;
      const other = restriction.a === index ? restriction.b : restriction.a;
      const otherValue = grid[other] ?? 0;
      if (otherValue === 0) continue;
      const left = restriction.a === index ? value : otherValue;
      const right = restriction.b === index ? value : otherValue;
      if (restriction.operator === '<' ? left >= right : left <= right) {
        valid = false;
        break;
      }
    }

    if (valid) values.push(value);
  }

  return values;
}

interface SearchOptions {
  limit: number;
  onSolution?: (grid: readonly number[]) => void;
}

/**
 * Backtracking con heurística de mínimos candidatos. Devuelve cuántas
 * soluciones encuentra, como máximo `limit`, para poder cortar en 2 y
 * comprobar unicidad sin recorrer todo el árbol.
 */
function search(level: FutoshikiLevel, grid: number[], options: SearchOptions): number {
  let bestIndex = -1;
  let bestValues: number[] | null = null;

  for (let index = 0; index < grid.length; index += 1) {
    if (grid[index] !== 0) continue;
    const values = candidateValues(level, grid, index);
    if (values.length === 0) return 0;
    if (bestValues === null || values.length < bestValues.length) {
      bestIndex = index;
      bestValues = values;
      if (values.length === 1) break;
    }
  }

  if (bestValues === null) {
    if (!satisfiesConstraints(level, grid)) return 0;
    options.onSolution?.(grid);
    return 1;
  }

  let total = 0;
  for (const value of bestValues) {
    grid[bestIndex] = value;
    total += search(level, grid, {
      limit: options.limit - total,
      onSolution: options.onSolution,
    });
    grid[bestIndex] = 0;
    if (total >= options.limit) break;
  }
  return total;
}

/** Detecta pistas imposibles: fuera de rango, repetidas o con desigualdades rotas. */
function hasInvalidGivens(level: FutoshikiLevel): boolean {
  if (level.givens.length !== FUTOSHIKI_CELLS) return true;
  const inRange = level.givens.every(
    (value) => Number.isInteger(value) && value >= 0 && value <= FUTOSHIKI_SIZE,
  );
  if (!inRange) return true;
  return conflictMask(level, level.givens).some(Boolean);
}

/** Cuenta soluciones hasta `limit` (2 por defecto, suficiente para unicidad). */
export function countSolutions(level: FutoshikiLevel, limit = 2): number {
  if (hasInvalidGivens(level)) return 0;
  return search(level, [...level.givens], { limit: Math.max(1, limit) });
}

/** Devuelve la primera solución encontrada o `null` si no existe. */
export function solve(level: FutoshikiLevel): number[] | null {
  if (hasInvalidGivens(level)) return null;
  const result: { grid: number[] | null } = { grid: null };
  search(level, [...level.givens], {
    limit: 1,
    onSolution: (grid) => {
      result.grid = [...grid];
    },
  });
  return result.grid;
}

/** Valida un tablero completo: rango, filas, columnas, pistas y desigualdades. */
export function isSolved(level: FutoshikiLevel, grid: readonly number[]): boolean {
  if (grid.length !== FUTOSHIKI_CELLS) return false;

  for (let index = 0; index < FUTOSHIKI_CELLS; index += 1) {
    const value = grid[index];
    if (value === undefined || !Number.isInteger(value)) return false;
    if (value < 1 || value > FUTOSHIKI_SIZE) return false;
    const given = level.givens[index] ?? 0;
    if (given !== 0 && given !== value) return false;
  }

  for (let row = 0; row < FUTOSHIKI_SIZE; row += 1) {
    const values = new Set<number>();
    for (let column = 0; column < FUTOSHIKI_SIZE; column += 1) {
      values.add(grid[row * FUTOSHIKI_SIZE + column]!);
    }
    if (values.size !== FUTOSHIKI_SIZE) return false;
  }

  for (let column = 0; column < FUTOSHIKI_SIZE; column += 1) {
    const values = new Set<number>();
    for (let row = 0; row < FUTOSHIKI_SIZE; row += 1) {
      values.add(grid[row * FUTOSHIKI_SIZE + column]!);
    }
    if (values.size !== FUTOSHIKI_SIZE) return false;
  }

  return satisfiesConstraints(level, grid);
}

/**
 * Marca las celdas que repiten número en fila o columna y las que forman
 * una desigualdad incumplida. Con el tablero vacío no hay conflictos.
 */
export function conflictMask(level: FutoshikiLevel, grid: readonly number[]): boolean[] {
  const mask = Array<boolean>(FUTOSHIKI_CELLS).fill(false);

  const markDuplicates = (indices: readonly number[]): void => {
    const positions = new Map<number, number[]>();
    for (const index of indices) {
      const value = grid[index] ?? 0;
      if (value === 0) continue;
      const list = positions.get(value) ?? [];
      list.push(index);
      positions.set(value, list);
    }
    for (const list of positions.values()) {
      if (list.length > 1) {
        for (const index of list) mask[index] = true;
      }
    }
  };

  for (let row = 0; row < FUTOSHIKI_SIZE; row += 1) {
    markDuplicates(
      Array.from({ length: FUTOSHIKI_SIZE }, (_, column) => row * FUTOSHIKI_SIZE + column),
    );
  }

  for (let column = 0; column < FUTOSHIKI_SIZE; column += 1) {
    markDuplicates(
      Array.from({ length: FUTOSHIKI_SIZE }, (_, row) => row * FUTOSHIKI_SIZE + column),
    );
  }

  for (const restriction of level.constraints) {
    if (!constraintHolds(grid, restriction)) {
      mask[restriction.a] = true;
      mask[restriction.b] = true;
    }
  }

  return mask;
}

/** Puntos del nivel: 1000 sin fallos, con un suelo de 120. */
export function scoreForMistakes(mistakes: number): number {
  const safe = Math.max(0, Math.floor(mistakes));
  return Math.max(120, 1000 - safe * 60);
}
