/** Lado del tablero de Suguru: 6 × 6 celdas. */
export const SUGURU_SIZE = 6;

/** Celdas del tablero. */
export const SUGURU_CELLS = SUGURU_SIZE * SUGURU_SIZE;

/**
 * Niveles hechos a mano.
 *
 * Cada fila del mapa de regiones usa una letra por celda: las celdas con la
 * misma letra forman una región ortogonalmente conectada de 2 a 6 celdas.
 * La solución está calculada sobre ese mapa y los givens son un subconjunto
 * fijo de la solución. Cada nivel tiene solución única.
 */
export interface SuguruLevel {
  readonly name: string;
  readonly rows: readonly string[];
  readonly givens: readonly number[];
  readonly solution: readonly number[];
}

export const SUGURU_LEVELS: readonly SuguruLevel[] = [
  {
    name: 'Esquinas',
    rows: ['AABBCC', 'ADBECF', 'ADEECF', 'GDHEIF', 'GGHIIF', 'JJHHII'],
    givens: [
      1, 3, 0, 0, 0, 2, 0, 0, 2, 0, 4, 0, 2, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 3, 2, 3, 0, 1, 2, 0, 0,
      0, 0, 4, 3, 5,
    ],
    solution: [
      1, 3, 1, 3, 1, 2, 4, 1, 2, 1, 4, 1, 2, 3, 4, 2, 3, 2, 1, 2, 1, 3, 4, 3, 2, 3, 2, 1, 2, 4, 1,
      2, 3, 4, 3, 5,
    ],
  },
  {
    name: 'Mosaico',
    rows: ['AAABBC', 'DABBCC', 'DDEBCF', 'DEEFFF', 'GEHHIF', 'GGHIII'],
    givens: [
      2, 0, 0, 0, 3, 2, 0, 3, 2, 0, 0, 0, 4, 0, 1, 0, 0, 0, 0, 4, 0, 2, 0, 4, 0, 0, 0, 0, 2, 5, 0,
      0, 0, 1, 3, 4,
    ],
    solution: [
      2, 1, 4, 1, 3, 2, 1, 3, 2, 4, 1, 3, 4, 2, 1, 5, 4, 1, 3, 4, 3, 2, 3, 4, 1, 2, 1, 3, 2, 5, 2,
      3, 2, 1, 3, 4,
    ],
  },
  {
    name: 'Cascada',
    rows: ['AABBBC', 'ADDBCC', 'ADEECF', 'ADEFFF', 'GDEHFI', 'GGHHII'],
    givens: [
      3, 0, 0, 0, 4, 0, 0, 0, 3, 0, 2, 0, 4, 0, 0, 0, 4, 0, 5, 0, 4, 3, 2, 4, 0, 5, 0, 0, 0, 0, 2,
      0, 1, 0, 1, 3,
    ],
    solution: [
      3, 1, 2, 3, 4, 1, 2, 4, 3, 1, 2, 3, 4, 2, 1, 2, 4, 1, 5, 1, 4, 3, 2, 4, 1, 5, 3, 2, 5, 2, 2,
      3, 1, 3, 1, 3,
    ],
  },
  {
    name: 'Encuentro',
    rows: ['ABBBCC', 'AABDCE', 'FADDCE', 'FDDGGE', 'FHGGEE', 'FHHHII'],
    givens: [
      0, 2, 0, 0, 0, 3, 0, 1, 0, 0, 4, 0, 0, 4, 1, 0, 0, 0, 3, 0, 5, 0, 3, 0, 0, 1, 0, 0, 0, 5, 2,
      0, 4, 0, 0, 0,
    ],
    solution: [
      3, 2, 3, 1, 2, 3, 2, 1, 4, 3, 4, 1, 1, 4, 1, 4, 1, 3, 3, 2, 5, 1, 3, 4, 4, 1, 2, 4, 2, 5, 2,
      3, 4, 2, 1, 2,
    ],
  },
  {
    name: 'Laberinto',
    rows: ['ABBCCD', 'ABBCDD', 'AAECDF', 'GEEEFF', 'GGHFFI', 'GHHHII'],
    givens: [
      0, 2, 0, 0, 2, 1, 0, 3, 0, 0, 4, 0, 3, 0, 0, 0, 2, 0, 0, 2, 0, 3, 4, 2, 0, 0, 1, 0, 0, 0, 4,
      0, 3, 0, 0, 0,
    ],
    solution: [
      1, 2, 1, 3, 2, 1, 2, 3, 4, 1, 4, 3, 3, 4, 1, 4, 2, 1, 1, 2, 4, 3, 4, 2, 2, 3, 1, 5, 3, 1, 4,
      2, 3, 4, 2, 3,
    ],
  },
];

/** Índice de región de cada celda (0..regiones-1). */
export function regionMap(level: SuguruLevel): number[] {
  const labels = new Map<string, number>();
  const map: number[] = [];
  for (const row of level.rows) {
    for (const label of row) {
      let region = labels.get(label);
      if (region === undefined) {
        region = labels.size;
        labels.set(label, region);
      }
      map.push(region);
    }
  }
  return map;
}

/** Celdas que pertenecen a cada región. */
export function regionCells(level: SuguruLevel): number[][] {
  const map = regionMap(level);
  const count = map.reduce((max, region) => Math.max(max, region + 1), 0);
  const cells: number[][] = Array.from({ length: count }, () => []);
  map.forEach((region, index) => cells[region]!.push(index));
  return cells;
}

/** Tamaño de cada región; el número máximo permitido en ella. */
export function regionSizes(level: SuguruLevel): number[] {
  return regionCells(level).map((cells) => cells.length);
}

/** Vecinos ortogonales de una celda. */
export function neighbors(index: number): number[] {
  const row = Math.floor(index / SUGURU_SIZE);
  const column = index % SUGURU_SIZE;
  const result: number[] = [];
  if (row > 0) result.push(index - SUGURU_SIZE);
  if (row < SUGURU_SIZE - 1) result.push(index + SUGURU_SIZE);
  if (column > 0) result.push(index - 1);
  if (column < SUGURU_SIZE - 1) result.push(index + 1);
  return result;
}

/** Tablero inicial: solo los givens; el resto queda a cero. */
export function createBoard(level: SuguruLevel): number[] {
  return [...level.givens];
}

/**
 * Marca las celdas en conflicto: números repetidos dentro de una región o
 * iguales a un vecino ortogonal. También marca valores fuera del rango de su
 * región.
 */
export function conflictMask(level: SuguruLevel, grid: readonly number[]): boolean[] {
  const cells = regionCells(level);
  const mask: boolean[] = Array<boolean>(SUGURU_CELLS).fill(false);

  cells.forEach((list) => {
    const positions = new Map<number, number[]>();
    for (const index of list) {
      const value = grid[index] ?? 0;
      if (value <= 0) continue;
      if (value > list.length) {
        mask[index] = true;
        continue;
      }
      const found = positions.get(value) ?? [];
      found.push(index);
      positions.set(value, found);
    }
    for (const found of positions.values()) {
      if (found.length > 1) {
        for (const index of found) mask[index] = true;
      }
    }
  });

  for (let index = 0; index < SUGURU_CELLS; index += 1) {
    const value = grid[index] ?? 0;
    if (value <= 0) continue;
    for (const neighbor of neighbors(index)) {
      if (neighbor > index && grid[neighbor] === value) {
        mask[index] = true;
        mask[neighbor] = true;
      }
    }
  }

  return mask;
}

/** Comprueba que cada región contiene exactamente 1..n y que no hay vecinos iguales. */
export function isValidSolution(level: SuguruLevel, grid: readonly number[]): boolean {
  if (grid.length !== SUGURU_CELLS) return false;
  if (grid.some((value) => !Number.isInteger(value) || value <= 0)) return false;

  for (const list of regionCells(level)) {
    const values = new Set<number>();
    for (const index of list) {
      const value = grid[index]!;
      if (value < 1 || value > list.length) return false;
      values.add(value);
    }
    if (values.size !== list.length) return false;
  }

  for (let index = 0; index < SUGURU_CELLS; index += 1) {
    const value = grid[index]!;
    for (const neighbor of neighbors(index)) {
      if (neighbor > index && grid[neighbor] === value) return false;
    }
  }

  return true;
}

/** Los givens del nivel siguen intactos en el tablero. */
export function givensRespected(level: SuguruLevel, grid: readonly number[]): boolean {
  return level.givens.every((value, index) => value === 0 || grid[index] === value);
}

/** Partida resuelta: solución válida y givens respetados. */
export function isSolved(level: SuguruLevel, grid: readonly number[]): boolean {
  return givensRespected(level, grid) && isValidSolution(level, grid);
}

function searchSolutions(
  level: SuguruLevel,
  initial: readonly number[],
  limit: number,
): number[][] {
  const cells = regionCells(level);
  const map = regionMap(level);
  const grid = [...initial];
  const found: number[][] = [];

  const candidates = (index: number): number[] => {
    const region = map[index]!;
    const list = cells[region]!;
    const options: number[] = [];
    for (let value = 1; value <= list.length; value += 1) {
      let valid = true;
      for (const cell of list) {
        if (cell !== index && grid[cell] === value) {
          valid = false;
          break;
        }
      }
      if (valid) {
        for (const neighbor of neighbors(index)) {
          if (grid[neighbor] === value) {
            valid = false;
            break;
          }
        }
      }
      if (valid) options.push(value);
    }
    return options;
  };

  const search = (): void => {
    if (found.length >= limit) return;

    let target = -1;
    let options: number[] | null = null;
    for (let index = 0; index < SUGURU_CELLS; index += 1) {
      if (grid[index] !== 0) continue;
      const current = candidates(index);
      if (current.length === 0) return;
      if (options === null || current.length < options.length) {
        target = index;
        options = current;
        if (current.length === 1) break;
      }
    }

    if (target === -1) {
      if (isValidSolution(level, grid)) found.push([...grid]);
      return;
    }

    for (const value of options!) {
      grid[target] = value;
      search();
      grid[target] = 0;
      if (found.length >= limit) return;
    }
  };

  search();
  return found;
}

/** Cuenta soluciones hasta `limit` (2 basta para comprobar unicidad). */
export function countSolutions(
  level: SuguruLevel,
  grid: readonly number[] = level.givens,
  limit = 2,
): number {
  if (limit <= 0) return 0;
  return searchSolutions(level, grid, limit).length;
}

/** Primera solución encontrada desde el tablero dado, o null. */
export function solvePuzzle(
  level: SuguruLevel,
  grid: readonly number[] = level.givens,
): number[] | null {
  return searchSolutions(level, grid, 1)[0] ?? null;
}

/** El nivel tiene exactamente una solución desde sus givens. */
export function hasUniqueSolution(level: SuguruLevel): boolean {
  return countSolutions(level, level.givens, 2) === 1;
}
