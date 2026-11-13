export const HITORI_SIZE = 6;

export interface HitoriLevel {
  readonly name: string;
  readonly numbers: readonly string[];
  readonly solution: readonly string[];
}

/**
 * Cinco tableros de 6×6 construidos a mano. Cada fila de `numbers` contiene un
 * dígito del 1 al 6; cada fila de `solution` marca con '#' las celdas sombreadas.
 * Todas las soluciones son únicas y respetan las tres reglas del Hitori.
 */
export const HITORI_LEVELS: readonly HitoriLevel[] = [
  {
    name: 'Trazo',
    numbers: ['651342', '242626', '436513', '362654', '131245', '255436'],
    solution: ['......', '#.#..#', '.#....', '...#..', '..#.#.', '.#....'],
  },
  {
    name: 'Nudo',
    numbers: ['451231', '352312', '263154', '134465', '551243', '614335'],
    solution: ['..#...', '.#.#.#', '......', '..#..#', '.#.#..', '....#.'],
  },
  {
    name: 'Trama',
    numbers: ['466162', '345361', '452413', '122526', '213146', '511324'],
    solution: ['.#..#.', '...#..', '#.....', '..#.#.', '...#.#', '.#....'],
  },
  {
    name: 'Bisagra',
    numbers: ['341313', '123446', '216623', '361456', '434661', '655133'],
    solution: ['#.#..#', '...#..', '#.#...', '.....#', '#..#..', '..#..#'],
  },
  {
    name: 'Cierre',
    numbers: ['636446', '464153', '214426', '353264', '323466', '246636'],
    solution: ['#..#.#', '..#...', '#..#.#', '..#...', '#...#.', '..#..#'],
  },
];

export interface HitoriAnalysis {
  /** Celdas claras que repiten número en su fila o columna. */
  readonly repeated: boolean[];
  /** Celdas sombreadas pegadas a otra sombra en horizontal o vertical. */
  readonly adjacent: boolean[];
  /** Las celdas claras forman una sola región ortogonal. */
  readonly connected: boolean;
  readonly shadedCount: number;
  readonly solved: boolean;
}

function assertGrid(rows: readonly string[], size: number, label: string): void {
  if (rows.length !== size) {
    throw new Error(`${label}: se esperaban ${size} filas y hay ${rows.length}.`);
  }
  for (const row of rows) {
    if (row.length !== size) {
      throw new Error(`${label}: cada fila debe tener ${size} caracteres.`);
    }
  }
}

export function parseNumbers(rows: readonly string[], size = HITORI_SIZE): number[] {
  assertGrid(rows, size, 'Números');
  const values: number[] = [];
  for (const row of rows) {
    for (const character of row) {
      const value = Number(character);
      if (!Number.isInteger(value) || value < 1 || value > size) {
        throw new Error(`Número fuera de rango: "${character}".`);
      }
      values.push(value);
    }
  }
  return values;
}

export function parseSolution(rows: readonly string[], size = HITORI_SIZE): boolean[] {
  assertGrid(rows, size, 'Solución');
  const shaded: boolean[] = [];
  for (const row of rows) {
    for (const character of row) {
      if (character !== '#' && character !== '.') {
        throw new Error(`Marca desconocida en la solución: "${character}".`);
      }
      shaded.push(character === '#');
    }
  }
  return shaded;
}

export function levelNumbers(level: HitoriLevel): number[] {
  return parseNumbers(level.numbers);
}

export function levelSolution(level: HitoriLevel): boolean[] {
  return parseSolution(level.solution);
}

/** Marca las celdas claras que comparten número con otra de su fila o columna. */
export function repeatedMask(
  numbers: readonly number[],
  shaded: readonly boolean[],
  size = HITORI_SIZE,
): boolean[] {
  const mask = Array<boolean>(size * size).fill(false);

  const markUnit = (indices: readonly number[]): void => {
    const groups = new Map<number, number[]>();
    for (const index of indices) {
      if (shaded[index]) continue;
      const value = numbers[index]!;
      const group = groups.get(value) ?? [];
      group.push(index);
      groups.set(value, group);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      for (const index of group) mask[index] = true;
    }
  };

  for (let row = 0; row < size; row += 1) {
    markUnit(Array.from({ length: size }, (_, column) => row * size + column));
  }
  for (let column = 0; column < size; column += 1) {
    markUnit(Array.from({ length: size }, (_, row) => row * size + column));
  }
  return mask;
}

/** Marca cada sombra que toca otra sombra en horizontal o vertical. */
export function adjacentMask(shaded: readonly boolean[], size = HITORI_SIZE): boolean[] {
  const mask = Array<boolean>(size * size).fill(false);

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const index = row * size + column;
      if (!shaded[index]) continue;
      const right = column + 1 < size ? index + 1 : -1;
      const below = row + 1 < size ? index + size : -1;
      if (right >= 0 && shaded[right]) {
        mask[index] = true;
        mask[right] = true;
      }
      if (below >= 0 && shaded[below]) {
        mask[index] = true;
        mask[below] = true;
      }
    }
  }
  return mask;
}

/** Comprueba que todas las celdas sin sombrear se alcancen en ortogonal. */
export function connectedUnshaded(shaded: readonly boolean[], size = HITORI_SIZE): boolean {
  const total = size * size;
  const start = shaded.findIndex((value) => !value);
  if (start < 0) return false;

  const visited = Array<boolean>(total).fill(false);
  const queue: number[] = [start];
  visited[start] = true;
  let reached = 0;

  while (queue.length > 0) {
    const index = queue.pop()!;
    reached += 1;
    const row = Math.floor(index / size);
    const column = index % size;
    const neighbours: number[] = [];
    if (row > 0) neighbours.push(index - size);
    if (row < size - 1) neighbours.push(index + size);
    if (column > 0) neighbours.push(index - 1);
    if (column < size - 1) neighbours.push(index + 1);

    for (const neighbour of neighbours) {
      if (shaded[neighbour] || visited[neighbour]) continue;
      visited[neighbour] = true;
      queue.push(neighbour);
    }
  }

  let unshaded = 0;
  for (const value of shaded) if (!value) unshaded += 1;
  return reached === unshaded;
}

export function analyzeHitori(
  numbers: readonly number[],
  shaded: readonly boolean[],
  size = HITORI_SIZE,
): HitoriAnalysis {
  const repeated = repeatedMask(numbers, shaded, size);
  const adjacent = adjacentMask(shaded, size);
  const connected = connectedUnshaded(shaded, size);
  let shadedCount = 0;
  for (const value of shaded) if (value) shadedCount += 1;

  return {
    repeated,
    adjacent,
    connected,
    shadedCount,
    solved: !repeated.some(Boolean) && !adjacent.some(Boolean) && connected,
  };
}

export function isSolved(
  numbers: readonly number[],
  shaded: readonly boolean[],
  size = HITORI_SIZE,
): boolean {
  return analyzeHitori(numbers, shaded, size).solved;
}

interface Pair {
  readonly a: number;
  readonly b: number;
}

const UNKNOWN = 0;
const CLEAR = 1;
const SHADED = 2;

function duplicatePairs(numbers: readonly number[], size: number): Pair[] {
  const pairs: Pair[] = [];

  const collect = (indices: readonly number[]): void => {
    const groups = new Map<number, number[]>();
    for (const index of indices) {
      const value = numbers[index]!;
      const group = groups.get(value) ?? [];
      group.push(index);
      groups.set(value, group);
    }
    for (const group of groups.values()) {
      for (let first = 0; first < group.length; first += 1) {
        for (let second = first + 1; second < group.length; second += 1) {
          pairs.push({ a: group[first]!, b: group[second]! });
        }
      }
    }
  };

  for (let row = 0; row < size; row += 1) {
    collect(Array.from({ length: size }, (_, column) => row * size + column));
  }
  for (let column = 0; column < size; column += 1) {
    collect(Array.from({ length: size }, (_, row) => row * size + column));
  }
  return pairs;
}

function adjacentPairs(size: number): Pair[] {
  const pairs: Pair[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const index = row * size + column;
      if (column + 1 < size) pairs.push({ a: index, b: index + 1 });
      if (row + 1 < size) pairs.push({ a: index, b: index + size });
    }
  }
  return pairs;
}

/**
 * Cuenta soluciones válidas con búsqueda y propagación de restricciones.
 * Se detiene al alcanzar `limit`, suficiente para comprobar unicidad con 2.
 */
export function countHitoriSolutions(
  numbers: readonly number[],
  limit = 2,
  size = HITORI_SIZE,
): number {
  if (limit <= 0) return 0;
  const total = size * size;
  const duplicate = duplicatePairs(numbers, size);
  const adjacency = adjacentPairs(size);
  let solutions = 0;

  const propagate = (state: number[]): boolean => {
    let changed = true;
    while (changed) {
      changed = false;

      for (const pair of adjacency) {
        if (state[pair.a] === SHADED && state[pair.b] === SHADED) return false;
        if (state[pair.a] === SHADED && state[pair.b] === UNKNOWN) {
          state[pair.b] = CLEAR;
          changed = true;
        }
        if (state[pair.b] === SHADED && state[pair.a] === UNKNOWN) {
          state[pair.a] = CLEAR;
          changed = true;
        }
      }

      for (const pair of duplicate) {
        if (state[pair.a] === CLEAR && state[pair.b] === CLEAR) return false;
        if (state[pair.a] === CLEAR && state[pair.b] === UNKNOWN) {
          state[pair.b] = SHADED;
          changed = true;
        }
        if (state[pair.b] === CLEAR && state[pair.a] === UNKNOWN) {
          state[pair.a] = SHADED;
          changed = true;
        }
      }
    }
    return true;
  };

  const search = (state: number[]): void => {
    if (solutions >= limit) return;
    if (!propagate(state)) return;

    let unknown = -1;
    for (let index = 0; index < total; index += 1) {
      if (state[index] === UNKNOWN) {
        unknown = index;
        break;
      }
    }

    if (unknown < 0) {
      const shaded = state.map((value) => value === SHADED);
      if (connectedUnshaded(shaded, size)) solutions += 1;
      return;
    }

    for (const choice of [SHADED, CLEAR]) {
      const next = state.slice();
      next[unknown] = choice;
      search(next);
      if (solutions >= limit) return;
    }
  };

  search(Array<number>(total).fill(UNKNOWN));
  return solutions;
}

export function hasUniqueSolution(numbers: readonly number[], size = HITORI_SIZE): boolean {
  return countHitoriSolutions(numbers, 2, size) === 1;
}
