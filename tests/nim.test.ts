import { describe, expect, it } from 'vitest';
import { applyMove, chooseMove, isWinning, legalMoves, totalObjects } from '../src/games/nim/logic';

describe('nim misère', () => {
  it('reconoce posiciones ganadoras y perdedoras', () => {
    expect(isWinning([1, 1, 0])).toBe(true);
    expect(isWinning([1, 1, 1])).toBe(false);
    expect(isWinning([2, 2, 0])).toBe(false);
    expect(isWinning([2, 1, 0])).toBe(true);
    expect(isWinning([3, 4, 5])).toBe(true);
    expect(isWinning([1, 0, 0])).toBe(false);
    expect(isWinning([0, 0, 5])).toBe(false);
  });

  it('la máquina nunca regala una posición ganadora', () => {
    for (let a = 0; a <= 5; a += 1) {
      for (let b = 0; b <= 5; b += 1) {
        for (let c = 0; c <= 5; c += 1) {
          const piles = [a, b, c];
          if (totalObjects(piles) === 0) continue;
          const move = chooseMove(piles);
          expect(move).not.toBeNull();
          if (!move) continue;
          const legal = legalMoves(piles).some(
            (candidate) => candidate.pile === move.pile && candidate.take === move.take,
          );
          expect(legal).toBe(true);
          if (isWinning(piles)) {
            expect(isWinning(applyMove(piles, move))).toBe(false);
          }
        }
      }
    }
  });

  it('aplica los movimientos sin bajar de cero', () => {
    expect(applyMove([3, 4, 5], { pile: 0, take: 3 })).toEqual([0, 4, 5]);
    expect(legalMoves([1, 0, 2])).toEqual([
      { pile: 0, take: 1 },
      { pile: 2, take: 1 },
      { pile: 2, take: 2 },
    ]);
  });
});
