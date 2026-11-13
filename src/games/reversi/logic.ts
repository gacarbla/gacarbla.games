export const SIZE = 8;
export const CELLS = SIZE * SIZE;
export const EMPTY = 0;
export const HUMAN = 1;
export const AI = 2;
export const NO_PLAYER = 0;

export type Board = number[];

export type DiscCount = {
  human: number;
  ai: number;
  empty: number;
};

export interface MoveResult {
  board: Board;
  flipped: number[];
}

/** Las ocho direcciones de volteo, como pares fila/columna. */
export const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export function cellIndex(row: number, column: number): number {
  return row * SIZE + column;
}

export function opponent(player: number): number {
  return player === HUMAN ? AI : HUMAN;
}

export function inBounds(row: number, column: number): boolean {
  return row >= 0 && row < SIZE && column >= 0 && column < SIZE;
}

/** Posición inicial clásica: negras (HUMAN) y blancas (AI) en el centro. */
export function createBoard(): Board {
  const board = new Array<number>(CELLS).fill(EMPTY);
  const low = SIZE / 2 - 1;
  const high = SIZE / 2;
  board[cellIndex(low, low)] = AI;
  board[cellIndex(low, high)] = HUMAN;
  board[cellIndex(high, low)] = HUMAN;
  board[cellIndex(high, high)] = AI;
  return board;
}

export function createEmptyBoard(): Board {
  return new Array<number>(CELLS).fill(EMPTY);
}

/**
 * Fichas que voltearía `player` si colocase en `index` mirando solo hacia
 * (rowStep, columnStep). Devuelve [] si no hay captura en esa dirección.
 */
export function capturesInDirection(
  board: Board,
  index: number,
  player: number,
  rowStep: number,
  columnStep: number,
): number[] {
  if (rowStep === 0 && columnStep === 0) return [];

  const enemy = opponent(player);
  const captured: number[] = [];
  let row = Math.floor(index / SIZE) + rowStep;
  let column = (index % SIZE) + columnStep;

  while (inBounds(row, column)) {
    const cell = board[cellIndex(row, column)];
    if (cell === enemy) {
      captured.push(cellIndex(row, column));
      row += rowStep;
      column += columnStep;
      continue;
    }
    if (cell === player) return captured;
    return [];
  }
  return [];
}

/** Fichas que voltearía `player` al colocar en `index`, sumando las ocho direcciones. */
export function capturesFor(board: Board, index: number, player: number): number[] {
  if (index < 0 || index >= CELLS) return [];
  const flipped: number[] = [];
  for (const [rowStep, columnStep] of DIRECTIONS) {
    const line = capturesInDirection(board, index, player, rowStep, columnStep);
    for (const cell of line) flipped.push(cell);
  }
  return flipped;
}

export function isLegalMove(board: Board, index: number, player: number): boolean {
  if (index < 0 || index >= CELLS) return false;
  if (board[index] !== EMPTY) return false;
  return capturesFor(board, index, player).length > 0;
}

export function legalMoves(board: Board, player: number): number[] {
  const moves: number[] = [];
  for (let index = 0; index < CELLS; index += 1) {
    if (isLegalMove(board, index, player)) moves.push(index);
  }
  return moves;
}

/** Aplica una jugada y devuelve el tablero nuevo con las fichas volteadas. */
export function applyMove(board: Board, index: number, player: number): MoveResult | null {
  if (!isLegalMove(board, index, player)) return null;

  const flipped = capturesFor(board, index, player);
  const next = [...board];
  next[index] = player;
  for (const cell of flipped) next[cell] = player;
  return { board: next, flipped };
}

export function countDiscs(board: Board): DiscCount {
  let human = 0;
  let ai = 0;
  for (const cell of board) {
    if (cell === HUMAN) human += 1;
    else if (cell === AI) ai += 1;
  }
  return { human, ai, empty: CELLS - human - ai };
}

export function isGameOver(board: Board): boolean {
  return legalMoves(board, HUMAN).length === 0 && legalMoves(board, AI).length === 0;
}

/**
 * Siguiente jugador después de un turno de `player`: el rival si puede jugar,
 * el mismo jugador si el rival debe pasar, o NO_PLAYER si nadie puede jugar.
 */
export function nextPlayer(board: Board, player: number): number {
  const other = opponent(player);
  if (legalMoves(board, other).length > 0) return other;
  if (legalMoves(board, player).length > 0) return player;
  return NO_PLAYER;
}

/** Gana quien tiene más fichas. EMPTY indica empate. */
export function winner(board: Board): number {
  const { human, ai } = countDiscs(board);
  if (human > ai) return HUMAN;
  if (ai > human) return AI;
  return EMPTY;
}

/**
 * Tablero desde texto: '.' vacío, 'X'/'B' negras (HUMAN), 'W'/'O' blancas (AI).
 * Se usa en los tests para construir posiciones conocidas.
 */
export function parseBoard(rows: readonly string[]): Board {
  if (rows.length !== SIZE) {
    throw new Error(`El tablero debe tener ${SIZE} filas.`);
  }

  const board = createEmptyBoard();
  for (let row = 0; row < SIZE; row += 1) {
    const line = rows[row] ?? '';
    if (line.length !== SIZE) {
      throw new Error(`La fila ${row} debe tener ${SIZE} celdas.`);
    }
    for (let column = 0; column < SIZE; column += 1) {
      const symbol = line[column];
      if (symbol === 'X' || symbol === 'B' || symbol === 'x' || symbol === 'b') {
        board[cellIndex(row, column)] = HUMAN;
      } else if (symbol === 'W' || symbol === 'O' || symbol === 'w' || symbol === 'o') {
        board[cellIndex(row, column)] = AI;
      } else if (symbol !== '.') {
        throw new Error(`Símbolo desconocido "${String(symbol)}" en la fila ${row}.`);
      }
    }
  }
  return board;
}

const WEIGHT_MATRIX: ReadonlyArray<readonly number[]> = [
  [120, -28, 14, 8, 8, 14, -28, 120],
  [-28, -60, -8, -6, -6, -8, -60, -28],
  [14, -8, 4, 2, 2, 4, -8, 14],
  [8, -6, 2, 0, 0, 2, -6, 8],
  [8, -6, 2, 0, 0, 2, -6, 8],
  [14, -8, 4, 2, 2, 4, -8, 14],
  [-28, -60, -8, -6, -6, -8, -60, -28],
  [120, -28, 14, 8, 8, 14, -28, 120],
];

function weightAt(index: number): number {
  const row = Math.floor(index / SIZE);
  const column = index % SIZE;
  return WEIGHT_MATRIX[row]?.[column] ?? 0;
}

/**
 * Evaluación desde el punto de vista de la IA: esquinas y posiciones estables
 * pesan mucho, y la diferencia de movilidad evita encerrarse.
 */
function evaluate(board: Board): number {
  let positional = 0;
  let aiDiscs = 0;
  let humanDiscs = 0;

  for (let index = 0; index < CELLS; index += 1) {
    const cell = board[index];
    if (cell === AI) {
      positional += weightAt(index);
      aiDiscs += 1;
    } else if (cell === HUMAN) {
      positional -= weightAt(index);
      humanDiscs += 1;
    }
  }

  const aiMoves = legalMoves(board, AI).length;
  const humanMoves = legalMoves(board, HUMAN).length;
  const mobility = (aiMoves - humanMoves) * 14;

  const filled = aiDiscs + humanDiscs;
  const endgame = filled > CELLS - 16 ? (aiDiscs - humanDiscs) * 6 : 0;

  return positional + mobility + endgame;
}

function finalScore(board: Board): number {
  const { human, ai } = countDiscs(board);
  if (ai > human) return 100_000 + (ai - human) * 100;
  if (human > ai) return -100_000 - (human - ai) * 100;
  return 0;
}

function orderedMoves(board: Board, player: number): number[] {
  return legalMoves(board, player).sort((left, right) => weightAt(right) - weightAt(left));
}

function minimax(board: Board, depth: number, alpha: number, beta: number, player: number): number {
  if (depth <= 0) return evaluate(board);

  const moves = orderedMoves(board, player);
  if (moves.length === 0) {
    const other = opponent(player);
    if (orderedMoves(board, other).length === 0) return finalScore(board);
    // El jugador pasa: se descuenta profundidad para que la búsqueda termine.
    return minimax(board, depth - 1, alpha, beta, other);
  }

  if (player === AI) {
    let value = -Infinity;
    for (const move of moves) {
      const result = applyMove(board, move, AI);
      if (!result) continue;
      value = Math.max(value, minimax(result.board, depth - 1, alpha, beta, HUMAN));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  }

  let value = Infinity;
  for (const move of moves) {
    const result = applyMove(board, move, HUMAN);
    if (!result) continue;
    value = Math.min(value, minimax(result.board, depth - 1, alpha, beta, AI));
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }
  return value;
}

/**
 * Jugada de la IA con minimax y poda alfa-beta. Devuelve -1 si no hay jugadas.
 * La evaluación premia esquinas, posiciones estables y movilidad.
 */
export function chooseAiMove(board: Board, depth = 4): number {
  const moves = orderedMoves(board, AI);
  const first = moves[0];
  if (first === undefined) return -1;

  let bestMove = first;
  let bestValue = -Infinity;
  let alpha = -Infinity;

  for (const move of moves) {
    const result = applyMove(board, move, AI);
    if (!result) continue;
    const value = minimax(result.board, Math.max(0, depth - 1), alpha, Infinity, HUMAN);
    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
    }
    alpha = Math.max(alpha, value);
  }

  return bestMove;
}
