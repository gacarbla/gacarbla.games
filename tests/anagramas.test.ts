import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/games/engine/math';
import {
  PENALTY_HINT,
  ROUNDS_PER_GAME,
  WORDS,
  buildRounds,
  matchesWord,
  normalizeWord,
  pointsForWord,
  scrambleWord,
} from '../src/games/anagramas/logic';

function sortedLetters(letters: readonly string[]): string {
  return [...letters].sort().join('');
}

describe('anagramas', () => {
  it('tiene 60 palabras únicas de 5 a 9 letras sin tildes', () => {
    expect(WORDS).toHaveLength(60);
    expect(new Set(WORDS).size).toBe(WORDS.length);

    for (const word of WORDS) {
      expect(word).toMatch(/^[a-z]{5,9}$/);
      expect(normalizeWord(word)).toBe(word);
    }
  });

  it('desordena conservando todas las letras y sin dejar la palabra original', () => {
    for (const word of WORDS) {
      for (const seed of [1, 7, 99, 2026]) {
        const letters = scrambleWord(word, mulberry32(seed));
        expect(letters).toHaveLength(word.length);
        expect(sortedLetters(letters)).toBe(sortedLetters([...word]));
        expect(letters.join('')).not.toBe(word);
      }
    }
  });

  it('acepta la palabra correcta y rechaza otra', () => {
    expect(matchesWord('perro', 'perro')).toBe(true);
    expect(matchesWord('perro', 'PERRO')).toBe(true);
    expect(matchesWord('jardin', 'JARDÍN')).toBe(true);
    expect(matchesWord('perro', 'pero')).toBe(false);
    expect(matchesWord('perro', 'gatos')).toBe(false);
    expect(matchesWord('planeta', 'planta')).toBe(false);
    expect(matchesWord('planeta', '')).toBe(false);
  });

  it('prepara ocho rondas sin palabras repetidas y de forma reproducible', () => {
    const rounds = buildRounds(ROUNDS_PER_GAME, mulberry32(99));
    expect(rounds).toHaveLength(8);
    expect(new Set(rounds.map((round) => round.word)).size).toBe(8);

    for (const round of rounds) {
      expect(WORDS).toContain(round.word);
      expect(sortedLetters(round.letters)).toBe(sortedLetters([...round.word]));
    }

    const repeated = buildRounds(ROUNDS_PER_GAME, mulberry32(99));
    expect(repeated).toEqual(rounds);
  });

  it('suma por acierto y descuenta la pista', () => {
    expect(pointsForWord('perro', false)).toBe(100);
    expect(pointsForWord('perro', true)).toBe(100 - PENALTY_HINT);
    expect(pointsForWord('primavera', false)).toBeGreaterThan(pointsForWord('perro', false));
  });
});
