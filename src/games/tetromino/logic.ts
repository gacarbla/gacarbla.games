export type TetrominoKind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export interface GridCell {
  readonly x: number;
  readonly y: number;
}

export interface TetrominoPlacement {
  /** Índice de la pieza dentro del nivel. */
  slot: number;
  /** Esquina superior izquierda de la caja de la pieza. */
  x: number;
  y: number;
  /** Giros de 90° en sentido horario, de 0 a 3. */
  rotation: number;
}

export interface TetrominoLevel {
  name: string;
  cols: number;
  rows: number;
  pieces: readonly TetrominoKind[];
  solution: readonly TetrominoPlacement[];
}

export interface TilingReport {
  complete: boolean;
  covered: number;
  total: number;
  overlaps: number;
  outOfBounds: number;
  duplicateSlots: number;
  unusedSlots: number[];
}

export const PIECE_KINDS: readonly TetrominoKind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

const PIECE_SHAPES: Record<TetrominoKind, readonly GridCell[]> = {
  I: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
  ],
  O: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
  T: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 1, y: 1 },
  ],
  S: [
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
  Z: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
  J: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
  L: [
    { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
};

function turnsOf(rotation: number): number {
  return ((rotation % 4) + 4) % 4;
}

function rotateCell(cell: GridCell): GridCell {
  return { x: -cell.y, y: cell.x };
}

function normalize(cells: readonly GridCell[]): GridCell[] {
  const minX = Math.min(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  return cells
    .map((cell) => ({ x: cell.x - minX, y: cell.y - minY }))
    .sort((left, right) => left.y - right.y || left.x - right.x);
}

/** Celdas de la pieza normalizadas: la caja empieza en (0, 0). */
export function pieceCells(kind: TetrominoKind, rotation: number): GridCell[] {
  let cells = PIECE_SHAPES[kind].map((cell) => ({ ...cell }));
  for (let turn = 0; turn < turnsOf(rotation); turn += 1) {
    cells = cells.map(rotateCell);
  }
  return normalize(cells);
}

export function pieceSize(
  kind: TetrominoKind,
  rotation: number,
): { width: number; height: number } {
  const cells = pieceCells(kind, rotation);
  return {
    width: Math.max(...cells.map((cell) => cell.x)) + 1,
    height: Math.max(...cells.map((cell) => cell.y)) + 1,
  };
}

/** Celdas absolutas del tablero que ocupa una colocación. */
export function placementCells(kind: TetrominoKind, placement: TetrominoPlacement): GridCell[] {
  return pieceCells(kind, placement.rotation).map((cell) => ({
    x: placement.x + cell.x,
    y: placement.y + cell.y,
  }));
}

/** Rejilla de propietarios: -1 libre, en otro caso el índice de la pieza. */
export function emptyGrid(level: TetrominoLevel): number[] {
  return new Array<number>(level.cols * level.rows).fill(-1);
}

function inside(level: TetrominoLevel, cell: GridCell): boolean {
  return cell.x >= 0 && cell.x < level.cols && cell.y >= 0 && cell.y < level.rows;
}

export function canPlace(
  level: TetrominoLevel,
  owners: readonly number[],
  kind: TetrominoKind,
  x: number,
  y: number,
  rotation: number,
): boolean {
  return pieceCells(kind, rotation).every((cell) => {
    const target = { x: x + cell.x, y: y + cell.y };
    if (!inside(level, target)) return false;
    return owners[target.y * level.cols + target.x] === -1;
  });
}

/** Devuelve una rejilla nueva con la pieza colocada, o null si no cabe. */
export function applyPlacement(
  level: TetrominoLevel,
  owners: readonly number[],
  slot: number,
  x: number,
  y: number,
  rotation: number,
): number[] | null {
  const kind = level.pieces[slot];
  if (!kind || !canPlace(level, owners, kind, x, y, rotation)) return null;
  const next = [...owners];
  for (const cell of pieceCells(kind, rotation)) {
    next[(y + cell.y) * level.cols + x + cell.x] = slot;
  }
  return next;
}

export function isGridFull(owners: readonly number[]): boolean {
  return owners.every((owner) => owner >= 0);
}

/** Analiza un conjunto de colocaciones y decide si cubre el tablero. */
export function analyzeTiling(
  level: TetrominoLevel,
  placements: readonly TetrominoPlacement[],
): TilingReport {
  const total = level.cols * level.rows;
  const owners = emptyGrid(level);
  const used = new Set<number>();
  let overlaps = 0;
  let outOfBounds = 0;
  let duplicateSlots = 0;

  for (const placement of placements) {
    const kind = level.pieces[placement.slot];
    if (!kind) {
      outOfBounds += 1;
      continue;
    }
    if (used.has(placement.slot)) duplicateSlots += 1;
    used.add(placement.slot);

    for (const cell of placementCells(kind, placement)) {
      if (!inside(level, cell)) {
        outOfBounds += 1;
        continue;
      }
      const index = cell.y * level.cols + cell.x;
      if (owners[index]! >= 0) {
        overlaps += 1;
      } else {
        owners[index] = placement.slot;
      }
    }
  }

  const covered = owners.reduce((count, owner) => count + (owner >= 0 ? 1 : 0), 0);
  const unusedSlots = level.pieces.map((_, slot) => slot).filter((slot) => !used.has(slot));

  return {
    complete:
      covered === total &&
      overlaps === 0 &&
      outOfBounds === 0 &&
      duplicateSlots === 0 &&
      unusedSlots.length === 0,
    covered,
    total,
    overlaps,
    outOfBounds,
    duplicateSlots,
    unusedSlots,
  };
}

/**
 * Cinco encajes hechos a mano. Cada tablero tiene veinte celdas y cada nivel
 * reparte cinco tetrominós de cuatro celdas. Las soluciones sirven de
 * referencia para los tests; en juego se valida la cobertura completa, no una
 * disposición concreta.
 */
export const TETROMINO_LEVELS: readonly TetrominoLevel[] = [
  {
    name: 'Primer encaje',
    cols: 4,
    rows: 5,
    pieces: ['L', 'I', 'S', 'L', 'O'],
    solution: [
      { slot: 0, x: 0, y: 0, rotation: 2 },
      { slot: 1, x: 3, y: 0, rotation: 1 },
      { slot: 2, x: 0, y: 1, rotation: 0 },
      { slot: 3, x: 2, y: 2, rotation: 1 },
      { slot: 4, x: 0, y: 3, rotation: 0 },
    ],
  },
  {
    name: 'Escalera corta',
    cols: 4,
    rows: 5,
    pieces: ['O', 'J', 'I', 'L', 'Z'],
    solution: [
      { slot: 0, x: 0, y: 0, rotation: 0 },
      { slot: 1, x: 1, y: 0, rotation: 3 },
      { slot: 2, x: 3, y: 0, rotation: 1 },
      { slot: 3, x: 0, y: 2, rotation: 1 },
      { slot: 4, x: 1, y: 3, rotation: 0 },
    ],
  },
  {
    name: 'Franja ancha',
    cols: 5,
    rows: 4,
    pieces: ['I', 'Z', 'J', 'O', 'L'],
    solution: [
      { slot: 0, x: 0, y: 0, rotation: 0 },
      { slot: 1, x: 3, y: 0, rotation: 1 },
      { slot: 2, x: 0, y: 1, rotation: 2 },
      { slot: 3, x: 0, y: 2, rotation: 0 },
      { slot: 4, x: 2, y: 2, rotation: 0 },
    ],
  },
  {
    name: 'Cuatro esquinas',
    cols: 4,
    rows: 5,
    pieces: ['I', 'T', 'L', 'S', 'T'],
    solution: [
      { slot: 0, x: 0, y: 0, rotation: 1 },
      { slot: 1, x: 1, y: 0, rotation: 3 },
      { slot: 2, x: 2, y: 0, rotation: 3 },
      { slot: 3, x: 2, y: 2, rotation: 1 },
      { slot: 4, x: 0, y: 3, rotation: 2 },
    ],
  },
  {
    name: 'Último hueco',
    cols: 5,
    rows: 4,
    pieces: ['I', 'T', 'T', 'J', 'S'],
    solution: [
      { slot: 0, x: 0, y: 0, rotation: 1 },
      { slot: 1, x: 1, y: 0, rotation: 3 },
      { slot: 2, x: 2, y: 0, rotation: 0 },
      { slot: 3, x: 3, y: 1, rotation: 3 },
      { slot: 4, x: 1, y: 2, rotation: 0 },
    ],
  },
];
