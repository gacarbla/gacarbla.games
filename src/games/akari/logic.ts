/**
 * Reglas de Akari (Light Up) sobre un tablero de 7 × 7.
 *
 * Las celdas negras son muros y las blancas deben quedar iluminadas. Una
 * bombilla alumbra su fila y su columna hasta chocar con un muro, y dos
 * bombillas no pueden verse entre sí.
 */

export const AKARI_SIZE = 7;
export const AKARI_CELLS = AKARI_SIZE * AKARI_SIZE;

export interface AkariLevel {
  /** Nombre breve que se muestra sobre el tablero. */
  readonly name: string;
  /** Siete filas de siete caracteres: `#` es muro y `.` es celda blanca. */
  readonly rows: readonly string[];
  /** Solución conocida, con índices planos de las bombillas. */
  readonly solution: readonly number[];
}

export const AKARI_LEVELS: readonly AkariLevel[] = [
  {
    name: 'El marco',
    rows: ['.......', '.#####.', '.#...#.', '.#.#.#.', '.#...#.', '.#####.', '.......'],
    solution: [0, 16, 32, 48],
  },
  {
    name: 'Cámara interior',
    rows: ['.......', '.#####.', '.#...#.', '.#...#.', '.#...#.', '.#####.', '.......'],
    solution: [0, 16, 24, 32, 48],
  },
  {
    name: 'Diagonal',
    rows: ['#......', '.#.....', '..#....', '...#...', '....#..', '.....#.', '......#'],
    solution: [4, 12, 20, 28, 36, 44],
  },
  {
    name: 'Escalera',
    rows: ['.......', '#####..', '....#..', '.#..#..', '.#..#..', '.#.....', '....###'],
    solution: [6, 14, 24, 40, 44],
  },
  {
    name: 'Diamante',
    rows: ['..#....', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '....#..'],
    solution: [1, 6, 10, 22, 26, 38, 42, 47],
  },
  {
    name: 'Simetría',
    rows: ['#..#..#', '.......', '..#.#..', '#.....#', '..#.#..', '.......', '#..#..#'],
    solution: [2, 4, 14, 20, 24, 28, 33, 39, 43],
  },
];

export interface CellPosition {
  readonly row: number;
  readonly column: number;
}

export function positionOf(index: number): CellPosition {
  return {
    row: Math.floor(index / AKARI_SIZE),
    column: index % AKARI_SIZE,
  };
}

/** Devuelve el mapa de muros del nivel en un array plano de 49 celdas. */
export function wallsOf(level: AkariLevel): boolean[] {
  const walls = new Array<boolean>(AKARI_CELLS).fill(false);
  for (let row = 0; row < AKARI_SIZE; row += 1) {
    const line = level.rows[row] ?? '';
    for (let column = 0; column < AKARI_SIZE; column += 1) {
      walls[row * AKARI_SIZE + column] = line[column] === '#';
    }
  }
  return walls;
}

export function isWallAt(level: AkariLevel, index: number): boolean {
  if (index < 0 || index >= AKARI_CELLS) return false;
  return wallsOf(level)[index] === true;
}

export function whiteCells(level: AkariLevel): number[] {
  const walls = wallsOf(level);
  const result: number[] = [];
  for (let index = 0; index < AKARI_CELLS; index += 1) {
    if (!walls[index]) result.push(index);
  }
  return result;
}

/** Celdas que quedarían iluminadas por una bombilla situada en `index`. */
export function lightFrom(level: AkariLevel, index: number): number[] {
  const walls = wallsOf(level);
  if (index < 0 || index >= AKARI_CELLS || walls[index]) return [];

  const { row, column } = positionOf(index);
  const cells = [index];

  for (let next = column - 1; next >= 0; next -= 1) {
    const target = row * AKARI_SIZE + next;
    if (walls[target]) break;
    cells.push(target);
  }
  for (let next = column + 1; next < AKARI_SIZE; next += 1) {
    const target = row * AKARI_SIZE + next;
    if (walls[target]) break;
    cells.push(target);
  }
  for (let next = row - 1; next >= 0; next -= 1) {
    const target = next * AKARI_SIZE + column;
    if (walls[target]) break;
    cells.push(target);
  }
  for (let next = row + 1; next < AKARI_SIZE; next += 1) {
    const target = next * AKARI_SIZE + column;
    if (walls[target]) break;
    cells.push(target);
  }

  return cells;
}

/** Máscara de celdas iluminadas por el conjunto actual de bombillas. */
export function litMask(level: AkariLevel, bulbs: readonly boolean[]): boolean[] {
  const lit = new Array<boolean>(AKARI_CELLS).fill(false);
  for (let index = 0; index < AKARI_CELLS; index += 1) {
    if (!bulbs[index]) continue;
    for (const cell of lightFrom(level, index)) lit[cell] = true;
  }
  return lit;
}

/** Marca las bombillas que se ven entre sí en horizontal o vertical. */
export function conflictMask(level: AkariLevel, bulbs: readonly boolean[]): boolean[] {
  const walls = wallsOf(level);
  const conflicts = new Array<boolean>(AKARI_CELLS).fill(false);
  const directions: readonly (readonly [number, number])[] = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];

  for (let index = 0; index < AKARI_CELLS; index += 1) {
    if (!bulbs[index] || walls[index]) continue;
    const { row, column } = positionOf(index);

    for (const [deltaRow, deltaColumn] of directions) {
      let nextRow = row + deltaRow;
      let nextColumn = column + deltaColumn;

      while (nextRow >= 0 && nextRow < AKARI_SIZE && nextColumn >= 0 && nextColumn < AKARI_SIZE) {
        const target = nextRow * AKARI_SIZE + nextColumn;
        if (walls[target]) break;
        if (bulbs[target]) {
          conflicts[index] = true;
          conflicts[target] = true;
          break;
        }
        nextRow += deltaRow;
        nextColumn += deltaColumn;
      }
    }
  }

  return conflicts;
}

export function countBulbs(bulbs: readonly boolean[]): number {
  return bulbs.reduce((total, bulb) => total + (bulb ? 1 : 0), 0);
}

/** Coloca o retira una bombilla. Los muros y los índices fuera del tablero se ignoran. */
export function toggleBulb(level: AkariLevel, bulbs: readonly boolean[], index: number): boolean[] {
  const next = [...bulbs];
  if (index < 0 || index >= AKARI_CELLS) return next;
  if (wallsOf(level)[index]) return next;
  next[index] = !next[index];
  return next;
}

/** Construye una máscara a partir de una lista de índices (útil en tests). */
export function bulbsFromIndices(level: AkariLevel, indices: readonly number[]): boolean[] {
  const walls = wallsOf(level);
  const bulbs = new Array<boolean>(AKARI_CELLS).fill(false);
  for (const index of indices) {
    if (index < 0 || index >= AKARI_CELLS) continue;
    if (walls[index]) continue;
    bulbs[index] = true;
  }
  return bulbs;
}

/**
 * Un tablero está resuelto cuando no hay bombillas sobre muros, ninguna pareja
 * se ve y todas las celdas blancas reciben luz.
 */
export function isSolved(level: AkariLevel, bulbs: readonly boolean[]): boolean {
  if (bulbs.length !== AKARI_CELLS) return false;

  const walls = wallsOf(level);
  for (let index = 0; index < AKARI_CELLS; index += 1) {
    if (bulbs[index] && walls[index]) return false;
  }

  if (conflictMask(level, bulbs).some(Boolean)) return false;

  const lit = litMask(level, bulbs);
  for (let index = 0; index < AKARI_CELLS; index += 1) {
    if (!walls[index] && !lit[index]) return false;
  }

  return true;
}
