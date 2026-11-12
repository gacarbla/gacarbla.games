export type Piles = [number, number, number];

export const NIM_START: Piles = [3, 4, 5];
export const NIM_MAX_TAKE = 3;

export interface NimMove {
  pile: number;
  take: number;
}

export function totalObjects(piles: readonly number[]): number {
  return piles.reduce((total, pile) => total + pile, 0);
}

export function legalMoves(piles: readonly number[]): NimMove[] {
  const moves: NimMove[] = [];
  piles.forEach((pile, index) => {
    const maximum = Math.min(NIM_MAX_TAKE, pile);
    for (let take = 1; take <= maximum; take += 1) moves.push({ pile: index, take });
  });
  return moves;
}

export function applyMove(piles: readonly number[], move: NimMove): Piles {
  const next: Piles = [piles[0]!, piles[1]!, piles[2]!];
  next[move.pile] = Math.max(0, next[move.pile]! - move.take);
  return next;
}

/**
 * Posición ganadora para quien debe mover en esta variante misère con
 * retiradas de 1 a 3 objetos. El límite de retirada hace que el XOR puro no
 * sea suficiente, así que se resuelve el árbol completo (solo hay 216 estados)
 * y se memoriza. Sin objetos, quien debe mover ya ha ganado: el rival cogió
 * el último y perdió.
 */
const positionCache = new Map<string, boolean>();

function positionKey(piles: readonly number[]): string {
  return [...piles].sort((left, right) => left - right).join(',');
}

export function isWinning(piles: readonly number[]): boolean {
  if (totalObjects(piles) === 0) return true;
  const key = positionKey(piles);
  const cached = positionCache.get(key);
  if (cached !== undefined) return cached;

  const winning = legalMoves(piles).some((move) => !isWinning(applyMove(piles, move)));
  positionCache.set(key, winning);
  return winning;
}

/**
 * Estrategia óptima misère. Entre las jugadas que dejan al rival en posición
 * perdedora prefiere el XOR cero; cuando todas las pilas son de 1, deja un
 * número impar de objetos. Si la posición es perdedora, elige una jugada legal.
 */
export function chooseMove(piles: readonly number[]): NimMove | null {
  const candidates = legalMoves(piles);
  if (candidates.length === 0) return null;

  const losing = candidates.filter((move) => !isWinning(applyMove(piles, move)));
  if (losing.length === 0) return candidates[0]!;

  const allSmall = piles.every((pile) => pile <= 1);
  if (allSmall) {
    const odd = losing.find((move) => {
      const next = applyMove(piles, move);
      return next.filter((pile) => pile === 1).length % 2 === 1;
    });
    return odd ?? losing[0]!;
  }

  const xorZero = losing.find(
    (move) => applyMove(piles, move).reduce((xor, pile) => xor ^ pile, 0) === 0,
  );
  return xorZero ?? losing[0]!;
}
