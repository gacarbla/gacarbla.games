/** Lógica pura de las damas 8×8: reglas, movimientos, coronación e IA. */

export const SIZE = 8;
export const SQUARES = SIZE * SIZE;

export const EMPTY = 0;
export const HUMAN = 1;
export const AI = 2;
export const KING = 4;

export const HUMAN_MAN = HUMAN;
export const HUMAN_KING = HUMAN | KING;
export const AI_MAN = AI;
export const AI_KING = AI | KING;

export type Board = number[];

export interface MoveStep {
  from: number;
  to: number;
  captured: number | null;
}

export interface Move {
  from: number;
  to: number;
  /** Casillas de aterrizaje intermedias y final, en orden. */
  path: number[];
  /** Índices de las piezas capturadas, en orden. */
  captures: number[];
  steps: MoveStep[];
  promotion: boolean;
}

type Direction = readonly [number, number];

const ALL_DIRECTIONS: readonly Direction[] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

const FORWARD: Record<number, readonly Direction[]> = {
  [HUMAN]: [
    [-1, -1],
    [-1, 1],
  ],
  [AI]: [
    [1, -1],
    [1, 1],
  ],
};

export function rowOf(index: number): number {
  return Math.floor(index / SIZE);
}

export function colOf(index: number): number {
  return index % SIZE;
}

export function indexOf(row: number, col: number): number {
  return row * SIZE + col;
}

export function inside(row: number, col: number): boolean {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

export function playerOf(piece: number): number {
  return piece & 3;
}

export function isKing(piece: number): boolean {
  return (piece & KING) !== 0;
}

export function opponent(player: number): number {
  return player === HUMAN ? AI : HUMAN;
}

export function promotionRow(player: number): number {
  return player === HUMAN ? 0 : SIZE - 1;
}

export function emptyBoard(): Board {
  return new Array<number>(SQUARES).fill(EMPTY);
}

/** Posición inicial clásica: 12 peones por bando en las casillas oscuras. */
export function createInitialBoard(): Board {
  const board = emptyBoard();
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if ((row + col) % 2 !== 1) continue;
      if (row < 3) board[indexOf(row, col)] = AI_MAN;
      else if (row > 4) board[indexOf(row, col)] = HUMAN_MAN;
    }
  }
  return board;
}

export function countPieces(board: Board, player: number): number {
  let total = 0;
  for (const piece of board) {
    if (piece !== EMPTY && playerOf(piece) === player) total += 1;
  }
  return total;
}

function directionsFor(player: number, king: boolean): readonly Direction[] {
  if (king) return ALL_DIRECTIONS;
  return FORWARD[player] ?? ALL_DIRECTIONS;
}

function isPromotion(player: number, king: boolean, index: number): boolean {
  return !king && rowOf(index) === promotionRow(player);
}

function collectCaptures(
  board: Board,
  player: number,
  origin: number,
  from: number,
  piece: number,
  path: number[],
  captures: number[],
  steps: MoveStep[],
  captured: number[],
  results: Move[],
): void {
  const king = isKing(piece);
  const directions = directionsFor(player, king);
  const row = rowOf(from);
  const col = colOf(from);
  let extended = false;

  for (const [rowStep, colStep] of directions) {
    const middleRow = row + rowStep;
    const middleCol = col + colStep;
    const landingRow = row + rowStep * 2;
    const landingCol = col + colStep * 2;
    if (!inside(middleRow, middleCol) || !inside(landingRow, landingCol)) continue;

    const middle = indexOf(middleRow, middleCol);
    const landing = indexOf(landingRow, landingCol);
    const target = board[middle]!;
    if (target === EMPTY || playerOf(target) === player) continue;
    if (captured.includes(middle)) continue;
    if (board[landing] !== EMPTY) continue;
    if (landing === origin || path.includes(landing)) continue;

    extended = true;
    path.push(landing);
    captures.push(middle);
    steps.push({ from, to: landing, captured: middle });
    captured.push(middle);

    collectCaptures(
      board,
      player,
      origin,
      landing,
      piece,
      path,
      captures,
      steps,
      captured,
      results,
    );

    captured.pop();
    steps.pop();
    captures.pop();
    path.pop();
  }

  if (extended || captures.length === 0) return;

  results.push({
    from: origin,
    to: from,
    path: [...path],
    captures: [...captures],
    steps: steps.map((step) => ({ ...step })),
    promotion: isPromotion(player, king, from),
  });
}

function captureMoves(board: Board, player: number): Move[] {
  const moves: Move[] = [];
  for (let index = 0; index < SQUARES; index += 1) {
    const piece = board[index]!;
    if (piece === EMPTY || playerOf(piece) !== player) continue;
    collectCaptures(board, player, index, index, piece, [], [], [], [], moves);
  }
  moves.sort((a, b) => b.captures.length - a.captures.length || a.to - b.to);
  return moves;
}

function simpleMoves(board: Board, player: number): Move[] {
  const moves: Move[] = [];
  for (let index = 0; index < SQUARES; index += 1) {
    const piece = board[index]!;
    if (piece === EMPTY || playerOf(piece) !== player) continue;
    const king = isKing(piece);
    const row = rowOf(index);
    const col = colOf(index);

    for (const [rowStep, colStep] of directionsFor(player, king)) {
      const landingRow = row + rowStep;
      const landingCol = col + colStep;
      if (!inside(landingRow, landingCol)) continue;
      const landing = indexOf(landingRow, landingCol);
      if (board[landing] !== EMPTY) continue;

      moves.push({
        from: index,
        to: landing,
        path: [landing],
        captures: [],
        steps: [{ from: index, to: landing, captured: null }],
        promotion: isPromotion(player, king, landing),
      });
    }
  }
  return moves;
}

/**
 * Movimientos legales del jugador. Si existe al menos una captura, solo se
 * devuelven capturas: la captura es obligatoria.
 */
export function generateMoves(board: Board, player: number): Move[] {
  const captures = captureMoves(board, player);
  if (captures.length > 0) return captures;
  return simpleMoves(board, player);
}

export function applyMove(board: Board, move: Move): Board {
  const next = board.slice();
  const piece = next[move.from]!;
  if (piece === EMPTY) return next;

  next[move.from] = EMPTY;
  for (const captured of move.captures) {
    next[captured] = EMPTY;
  }

  const player = playerOf(piece);
  const promoted = !isKing(piece) && rowOf(move.to) === promotionRow(player) ? piece | KING : piece;
  next[move.to] = promoted;
  return next;
}

/** Ganador si el jugador que debe mover se queda sin piezas o sin movimientos. */
export function getWinner(board: Board, playerToMove: number): number | null {
  const humanPieces = countPieces(board, HUMAN);
  const aiPieces = countPieces(board, AI);
  if (humanPieces === 0) return AI;
  if (aiPieces === 0) return HUMAN;
  if (generateMoves(board, playerToMove).length === 0) return opponent(playerToMove);
  return null;
}

const MAN_VALUE = 100;
const KING_VALUE = 168;
const WIN_SCORE = 1_000_000;

/** Evaluación estática desde el punto de vista indicado: material + posición. */
export function evaluateBoard(board: Board, perspective: number = AI): number {
  let score = 0;

  for (let index = 0; index < SQUARES; index += 1) {
    const piece = board[index]!;
    if (piece === EMPTY) continue;

    const player = playerOf(piece);
    const sign = player === perspective ? 1 : -1;
    const king = isKing(piece);
    const row = rowOf(index);
    const col = colOf(index);
    const center = SIZE - 1 - (Math.abs(col - (SIZE - 1) / 2) + Math.abs(row - (SIZE - 1) / 2));

    let value = king ? KING_VALUE : MAN_VALUE;
    value += center * (king ? 2 : 1);

    if (!king) {
      const advancement = player === HUMAN ? SIZE - 1 - row : row;
      value += advancement * 4;
      if (row === promotionRow(opponent(player))) value += 6;
      if (col === 0 || col === SIZE - 1) value -= 2;
    }

    score += sign * value;
  }

  return score;
}

function orderMoves(moves: readonly Move[]): Move[] {
  return [...moves].sort((a, b) => {
    if (a.promotion !== b.promotion) return a.promotion ? -1 : 1;
    if (a.captures.length !== b.captures.length) return b.captures.length - a.captures.length;
    return a.to - b.to;
  });
}

function search(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  turn: number,
  perspective: number,
): number {
  const moves = generateMoves(board, turn);
  if (moves.length === 0) {
    return turn === perspective ? -WIN_SCORE - depth : WIN_SCORE + depth;
  }
  if (depth <= 0) return evaluateBoard(board, perspective);

  const ordered = orderMoves(moves);
  if (turn === perspective) {
    let best = -Infinity;
    let window = alpha;
    for (const move of ordered) {
      const value = search(
        applyMove(board, move),
        depth - 1,
        window,
        beta,
        opponent(turn),
        perspective,
      );
      if (value > best) best = value;
      if (best > window) window = best;
      if (window >= beta) break;
    }
    return best;
  }

  let best = Infinity;
  let window = beta;
  for (const move of ordered) {
    const value = search(
      applyMove(board, move),
      depth - 1,
      alpha,
      window,
      opponent(turn),
      perspective,
    );
    if (value < best) best = value;
    if (best < window) window = best;
    if (alpha >= window) break;
  }
  return best;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.min(index, Math.floor(random() * (index + 1)));
    [copy[index], copy[swap]] = [copy[swap]!, copy[index]!];
  }
  return copy;
}

/**
 * IA minimax con poda alfa-beta. La profundidad por defecto es 4; se admiten
 * 4 o 5. `random` solo desempata y desordena la raíz para variar las partidas.
 */
export function chooseAiMove(
  board: Board,
  depth = 4,
  random: () => number = Math.random,
): Move | null {
  const moves = generateMoves(board, AI);
  if (moves.length === 0) return null;

  const searchDepth = Math.max(1, Math.min(5, Math.floor(depth)));
  const ordered = shuffle(orderMoves(moves), random);

  let bestMove = ordered[0]!;
  let bestValue = -Infinity;
  let alpha = -Infinity;

  for (const move of ordered) {
    const value = search(applyMove(board, move), searchDepth - 1, alpha, Infinity, HUMAN, AI);
    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
    }
    if (value > alpha) alpha = value;
  }

  return bestMove;
}
