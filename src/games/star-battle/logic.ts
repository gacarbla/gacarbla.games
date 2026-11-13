export const STAR_BATTLE_SIZE = 6;
export const STAR_BATTLE_REGION_COUNT = 6;

export const CELL_EMPTY = 0;
export const CELL_STAR = 1;
export const CELL_DISCARD = 2;

export type StarMark = 0 | 1 | 2;

export interface StarBattleLevel {
  readonly name: string;
  /** Seis filas de seis etiquetas de región (1–6). */
  readonly regions: readonly string[];
  /** Columna de la estrella en cada fila. */
  readonly solution: readonly number[];
}

/**
 * Mapas dibujados a mano. Cada región tiene exactamente seis celdas y la
 * solución coloca una estrella por fila, columna y región sin contacto
 * ortogonal ni diagonal.
 */
export const STAR_BATTLE_LEVELS: readonly StarBattleLevel[] = [
  {
    name: 'Cúmulo',
    regions: ['222111', '222111', '444333', '444633', '555663', '555666'],
    solution: [4, 1, 5, 2, 0, 3],
  },
  {
    name: 'Cometa',
    regions: ['111122', '113322', '333322', '554446', '554446', '556666'],
    solution: [2, 5, 1, 3, 0, 4],
  },
  {
    name: 'Órbita',
    regions: ['111226', '113226', '133226', '533346', '555446', '554446'],
    solution: [0, 3, 1, 4, 2, 5],
  },
  {
    name: 'Eclipse',
    regions: ['221113', '221113', '224333', '444435', '664555', '666655'],
    solution: [3, 0, 4, 1, 5, 2],
  },
  {
    name: 'Nebulosa',
    regions: ['111223', '114223', '144223', '445553', '455563', '666663'],
    solution: [1, 3, 5, 0, 2, 4],
  },
];

export interface StarProgress {
  readonly stars: number;
  readonly rows: number;
  readonly columns: number;
  readonly regions: number;
}

interface StarPoint {
  readonly row: number;
  readonly column: number;
  readonly index: number;
}

/** Etiqueta 1–6 de la región de una celda, o 0 si la celda no es válida. */
export function regionLabel(level: StarBattleLevel, row: number, column: number): number {
  if (row < 0 || row >= STAR_BATTLE_SIZE || column < 0 || column >= STAR_BATTLE_SIZE) return 0;
  const line = level.regions[row];
  if (!line) return 0;
  const label = Number.parseInt(line.charAt(column), 10);
  return Number.isFinite(label) ? label : 0;
}

/** Índices de las celdas que pertenecen a una región. */
export function regionCells(level: StarBattleLevel, label: number): number[] {
  const cells: number[] = [];
  for (let row = 0; row < STAR_BATTLE_SIZE; row += 1) {
    for (let column = 0; column < STAR_BATTLE_SIZE; column += 1) {
      if (regionLabel(level, row, column) === label) {
        cells.push(row * STAR_BATTLE_SIZE + column);
      }
    }
  }
  return cells;
}

/** Convierte las marcas de la interfaz en un mapa de estrellas booleanas. */
export function starsFromMarks(marks: readonly number[]): boolean[] {
  const stars = new Array<boolean>(STAR_BATTLE_SIZE * STAR_BATTLE_SIZE).fill(false);
  for (let index = 0; index < stars.length; index += 1) {
    stars[index] = marks[index] === CELL_STAR;
  }
  return stars;
}

/** Estrellas de la solución guardada del nivel. */
export function solutionStars(level: StarBattleLevel): boolean[] {
  const stars = new Array<boolean>(STAR_BATTLE_SIZE * STAR_BATTLE_SIZE).fill(false);
  for (let row = 0; row < STAR_BATTLE_SIZE; row += 1) {
    const column = level.solution[row];
    if (column === undefined || column < 0 || column >= STAR_BATTLE_SIZE) continue;
    stars[row * STAR_BATTLE_SIZE + column] = true;
  }
  return stars;
}

/** Ciclo de la interfaz: vacío → estrella → descarte → vacío. */
export function nextMark(mark: number): StarMark {
  if (mark === CELL_EMPTY) return CELL_STAR;
  if (mark === CELL_STAR) return CELL_DISCARD;
  return CELL_EMPTY;
}

function collectStars(stars: readonly boolean[]): StarPoint[] {
  const points: StarPoint[] = [];
  for (let row = 0; row < STAR_BATTLE_SIZE; row += 1) {
    for (let column = 0; column < STAR_BATTLE_SIZE; column += 1) {
      const index = row * STAR_BATTLE_SIZE + column;
      if (stars[index]) points.push({ row, column, index });
    }
  }
  return points;
}

/** Dos estrellas no pueden tocarse, ni siquiera en diagonal. */
export function hasAdjacentStars(stars: readonly boolean[]): boolean {
  const points = collectStars(stars);
  for (let first = 0; first < points.length; first += 1) {
    for (let second = first + 1; second < points.length; second += 1) {
      const a = points[first]!;
      const b = points[second]!;
      if (Math.abs(a.row - b.row) <= 1 && Math.abs(a.column - b.column) <= 1) return true;
    }
  }
  return false;
}

/** Cuántas filas, columnas y regiones tienen exactamente una estrella. */
export function starProgress(level: StarBattleLevel, stars: readonly boolean[]): StarProgress {
  const rowCounts = new Array<number>(STAR_BATTLE_SIZE).fill(0);
  const columnCounts = new Array<number>(STAR_BATTLE_SIZE).fill(0);
  const regionCounts = new Array<number>(STAR_BATTLE_REGION_COUNT).fill(0);
  const points = collectStars(stars);

  for (const point of points) {
    rowCounts[point.row] = (rowCounts[point.row] ?? 0) + 1;
    columnCounts[point.column] = (columnCounts[point.column] ?? 0) + 1;
    const label = regionLabel(level, point.row, point.column);
    if (label >= 1 && label <= STAR_BATTLE_REGION_COUNT) {
      regionCounts[label - 1] = (regionCounts[label - 1] ?? 0) + 1;
    }
  }

  return {
    stars: points.length,
    rows: rowCounts.filter((count) => count === 1).length,
    columns: columnCounts.filter((count) => count === 1).length,
    regions: regionCounts.filter((count) => count === 1).length,
  };
}

/**
 * Una disposición es válida cuando hay una sola estrella por fila, columna y
 * región, y ninguna pareja de estrellas se toca en ortogonal o diagonal.
 */
export function isValidArrangement(level: StarBattleLevel, stars: readonly boolean[]): boolean {
  if (stars.length !== STAR_BATTLE_SIZE * STAR_BATTLE_SIZE) return false;
  const progress = starProgress(level, stars);
  if (progress.stars !== STAR_BATTLE_SIZE) return false;
  if (progress.rows !== STAR_BATTLE_SIZE) return false;
  if (progress.columns !== STAR_BATTLE_SIZE) return false;
  if (progress.regions !== STAR_BATTLE_REGION_COUNT) return false;
  return !hasAdjacentStars(stars);
}

/** Celdas con estrellas que incumplen alguna regla, para avisar en la interfaz. */
export function conflictMask(level: StarBattleLevel, stars: readonly boolean[]): boolean[] {
  const mask = new Array<boolean>(STAR_BATTLE_SIZE * STAR_BATTLE_SIZE).fill(false);
  const points = collectStars(stars);
  const rowCounts = new Array<number>(STAR_BATTLE_SIZE).fill(0);
  const columnCounts = new Array<number>(STAR_BATTLE_SIZE).fill(0);
  const regionCounts = new Array<number>(STAR_BATTLE_REGION_COUNT).fill(0);

  for (const point of points) {
    rowCounts[point.row] = (rowCounts[point.row] ?? 0) + 1;
    columnCounts[point.column] = (columnCounts[point.column] ?? 0) + 1;
    const label = regionLabel(level, point.row, point.column);
    if (label >= 1 && label <= STAR_BATTLE_REGION_COUNT) {
      regionCounts[label - 1] = (regionCounts[label - 1] ?? 0) + 1;
    }
  }

  for (const point of points) {
    const label = regionLabel(level, point.row, point.column);
    const repeatedRow = (rowCounts[point.row] ?? 0) > 1;
    const repeatedColumn = (columnCounts[point.column] ?? 0) > 1;
    const repeatedRegion =
      label >= 1 && label <= STAR_BATTLE_REGION_COUNT && (regionCounts[label - 1] ?? 0) > 1;
    if (repeatedRow || repeatedColumn || repeatedRegion) mask[point.index] = true;
  }

  for (let first = 0; first < points.length; first += 1) {
    for (let second = first + 1; second < points.length; second += 1) {
      const a = points[first]!;
      const b = points[second]!;
      if (Math.abs(a.row - b.row) <= 1 && Math.abs(a.column - b.column) <= 1) {
        mask[a.index] = true;
        mask[b.index] = true;
      }
    }
  }

  return mask;
}

/** Valida las marcas del jugador: los descartes no cuentan como estrellas. */
export function isSolved(level: StarBattleLevel, marks: readonly number[]): boolean {
  return isValidArrangement(level, starsFromMarks(marks));
}
