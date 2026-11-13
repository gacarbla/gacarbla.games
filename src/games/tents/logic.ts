export const TENTS_SIZE = 8;

export type TentsCoord = readonly [row: number, col: number];

export interface TentsLevel {
  name: string;
  trees: readonly TentsCoord[];
  tents: readonly TentsCoord[];
  rows: readonly number[];
  cols: readonly number[];
}

export interface TentsCounts {
  rows: number[];
  cols: number[];
}

export interface TentsValidation {
  ok: boolean;
  reason: string | null;
  /** Índice de celda de la tienda asignada a cada árbol, o null si no hay emparejamiento. */
  assignment: number[] | null;
}

/**
 * Cinco campamentos dibujados a mano. La primera coordenada de cada pareja es la
 * fila y la segunda la columna. Las tiendas son la solución conocida y los conteos
 * de filas y columnas se derivan de ellas.
 */
export const TENTS_LEVELS: readonly TentsLevel[] = [
  {
    name: 'Primer campamento',
    trees: [
      [1, 1],
      [1, 5],
      [2, 2],
      [3, 1],
      [3, 5],
      [5, 3],
    ],
    tents: [
      [0, 1],
      [0, 5],
      [2, 3],
      [4, 1],
      [4, 5],
      [6, 3],
    ],
    rows: [2, 0, 1, 0, 2, 0, 1, 0],
    cols: [0, 2, 0, 2, 0, 2, 0, 0],
  },
  {
    name: 'Claro del bosque',
    trees: [
      [1, 2],
      [1, 6],
      [3, 0],
      [3, 4],
      [4, 6],
      [5, 2],
      [7, 4],
    ],
    tents: [
      [0, 2],
      [0, 6],
      [2, 0],
      [2, 4],
      [4, 7],
      [6, 2],
      [7, 5],
    ],
    rows: [2, 0, 2, 0, 1, 0, 1, 1],
    cols: [1, 0, 2, 0, 1, 1, 1, 1],
  },
  {
    name: 'Ribera tranquila',
    trees: [
      [1, 0],
      [1, 4],
      [1, 6],
      [2, 2],
      [4, 4],
      [4, 6],
      [6, 0],
      [6, 7],
    ],
    tents: [
      [0, 0],
      [0, 4],
      [1, 7],
      [3, 2],
      [3, 6],
      [5, 0],
      [5, 4],
      [7, 7],
    ],
    rows: [2, 1, 0, 2, 0, 2, 0, 1],
    cols: [2, 0, 1, 0, 2, 0, 1, 2],
  },
  {
    name: 'Bosque alto',
    trees: [
      [1, 1],
      [1, 5],
      [2, 2],
      [3, 0],
      [3, 7],
      [4, 5],
      [5, 2],
      [5, 6],
      [7, 3],
    ],
    tents: [
      [0, 1],
      [0, 5],
      [2, 3],
      [2, 7],
      [4, 0],
      [4, 4],
      [6, 2],
      [6, 6],
      [7, 4],
    ],
    rows: [2, 0, 2, 0, 2, 0, 2, 1],
    cols: [1, 1, 1, 1, 2, 1, 1, 1],
  },
  {
    name: 'Gran campamento',
    trees: [
      [1, 0],
      [1, 4],
      [3, 2],
      [3, 6],
      [4, 3],
      [5, 0],
      [5, 6],
      [7, 1],
      [7, 2],
      [7, 5],
    ],
    tents: [
      [0, 0],
      [0, 4],
      [2, 2],
      [2, 6],
      [4, 0],
      [4, 4],
      [6, 2],
      [6, 6],
      [7, 0],
      [7, 4],
    ],
    rows: [2, 0, 2, 0, 2, 0, 2, 2],
    cols: [3, 0, 2, 0, 3, 0, 2, 0],
  },
];

const NEIGHBOR_STEPS: readonly TentsCoord[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

const TOUCH_STEPS: readonly TentsCoord[] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export function cellIndex(row: number, col: number): number {
  return row * TENTS_SIZE + col;
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < TENTS_SIZE && col >= 0 && col < TENTS_SIZE;
}

export function createEmptyBoard(): boolean[] {
  return Array.from({ length: TENTS_SIZE * TENTS_SIZE }, () => false);
}

export function boardFromSolution(level: TentsLevel): boolean[] {
  const board = createEmptyBoard();
  for (const [row, col] of level.tents) {
    if (inBounds(row, col)) board[cellIndex(row, col)] = true;
  }
  return board;
}

export function isTreeAt(level: TentsLevel, index: number): boolean {
  const row = Math.floor(index / TENTS_SIZE);
  const col = index % TENTS_SIZE;
  return level.trees.some(([treeRow, treeCol]) => treeRow === row && treeCol === col);
}

export function countPlaced(board: readonly boolean[]): number {
  return board.reduce((total, cell) => total + (cell ? 1 : 0), 0);
}

export function tentCounts(board: readonly boolean[]): TentsCounts {
  const rows = Array.from({ length: TENTS_SIZE }, () => 0);
  const cols = Array.from({ length: TENTS_SIZE }, () => 0);

  for (let index = 0; index < board.length; index += 1) {
    if (!board[index]) continue;
    rows[Math.floor(index / TENTS_SIZE)]! += 1;
    cols[index % TENTS_SIZE]! += 1;
  }

  return { rows, cols };
}

/** Conteos que debería producir la solución dibujada a mano. */
export function levelCounts(level: TentsLevel): TentsCounts {
  return tentCounts(boardFromSolution(level));
}

/** Celdas con tienda que tocan otra tienda, aunque sea en diagonal. */
export function adjacentTentCells(board: readonly boolean[]): number[] {
  const conflicts = new Set<number>();

  for (let index = 0; index < board.length; index += 1) {
    if (!board[index]) continue;
    const row = Math.floor(index / TENTS_SIZE);
    const col = index % TENTS_SIZE;

    for (const [rowStep, colStep] of TOUCH_STEPS) {
      const nextRow = row + rowStep;
      const nextCol = col + colStep;
      if (!inBounds(nextRow, nextCol)) continue;
      const neighbor = cellIndex(nextRow, nextCol);
      if (neighbor !== index && board[neighbor]) {
        conflicts.add(index);
        conflicts.add(neighbor);
      }
    }
  }

  return [...conflicts].sort((left, right) => left - right);
}

export function haveAdjacentTents(board: readonly boolean[]): boolean {
  return adjacentTentCells(board).length > 0;
}

function tentNeighbors(level: TentsLevel, treeIndex: number, board: readonly boolean[]): number[] {
  const tree = level.trees[treeIndex];
  if (!tree) return [];

  const [row, col] = tree;
  const neighbors: number[] = [];
  for (const [rowStep, colStep] of NEIGHBOR_STEPS) {
    const nextRow = row + rowStep;
    const nextCol = col + colStep;
    if (!inBounds(nextRow, nextCol)) continue;
    const index = cellIndex(nextRow, nextCol);
    if (board[index]) neighbors.push(index);
  }
  return neighbors;
}

/**
 * Emparejamiento perfecto árbol → tienda por caminos aumentantes (Kuhn).
 * Devuelve la celda de la tienda asignada a cada árbol o null si no existe.
 */
export function matchTrees(level: TentsLevel, board: readonly boolean[]): number[] | null {
  if (board.length !== TENTS_SIZE * TENTS_SIZE) return null;

  const treeToTent = new Array<number>(level.trees.length).fill(-1);
  const tentToTree = new Array<number>(board.length).fill(-1);

  const assign = (treeIndex: number, visited: boolean[]): boolean => {
    for (const tent of tentNeighbors(level, treeIndex, board)) {
      if (visited[tent]) continue;
      visited[tent] = true;
      const currentTree = tentToTree[tent]!;
      if (currentTree === -1 || assign(currentTree, visited)) {
        tentToTree[tent] = treeIndex;
        return true;
      }
    }
    return false;
  };

  for (let treeIndex = 0; treeIndex < level.trees.length; treeIndex += 1) {
    const visited = new Array<boolean>(board.length).fill(false);
    if (!assign(treeIndex, visited)) return null;
  }

  for (let tent = 0; tent < board.length; tent += 1) {
    const treeIndex = tentToTree[tent]!;
    if (treeIndex >= 0) treeToTent[treeIndex] = tent;
  }

  return treeToTent;
}

/** Valida una colocación completa: número, árboles, adyacencia, cifras y emparejamiento. */
export function validateTents(level: TentsLevel, board: readonly boolean[]): TentsValidation {
  const fail = (reason: string): TentsValidation => ({ ok: false, reason, assignment: null });

  if (board.length !== TENTS_SIZE * TENTS_SIZE) {
    return fail('El tablero no tiene el tamaño esperado.');
  }

  const placed = countPlaced(board);
  if (placed !== level.trees.length) {
    return fail(`Coloca ${level.trees.length} tiendas: ahora hay ${placed}.`);
  }

  for (let index = 0; index < board.length; index += 1) {
    if (board[index] && isTreeAt(level, index)) {
      return fail('Una tienda no puede ocupar la celda de un árbol.');
    }
  }

  if (haveAdjacentTents(board)) {
    return fail('Dos tiendas se tocan: deben quedar separadas, también en diagonal.');
  }

  const counts = tentCounts(board);
  if (counts.rows.some((value, row) => value !== level.rows[row])) {
    return fail('Las cifras de las filas no cuadran con las tiendas colocadas.');
  }
  if (counts.cols.some((value, col) => value !== level.cols[col])) {
    return fail('Las cifras de las columnas no cuadran con las tiendas colocadas.');
  }

  const assignment = matchTrees(level, board);
  if (!assignment) {
    return fail('Cada árbol necesita una tienda distinta en una celda contigua.');
  }

  return { ok: true, reason: null, assignment };
}
