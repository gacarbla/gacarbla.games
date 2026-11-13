import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/games/engine/math';
import {
  MAX_MISTAKES,
  WORDS,
  createRound,
  guessLetter,
  hitLetters,
  letterMark,
  maskWord,
  normalizeLetter,
  normalizeWord,
  pickWord,
  scoreRound,
  uniqueWordLetters,
} from '../src/games/ahorcado/logic';

const TIBURON = WORDS.find((entry) => entry.word === 'TIBURON')!;
const MISSES = ['Z', 'J', 'K', 'W', 'Q', 'X'];

describe('ahorcado', () => {
  it('tiene sesenta palabras únicas, jugables y con pista', () => {
    expect(WORDS).toHaveLength(60);
    expect(new Set(WORDS.map((entry) => entry.word)).size).toBe(WORDS.length);

    for (const entry of WORDS) {
      expect(entry.word).toMatch(/^[A-Z]+$/);
      expect(entry.word.length).toBeGreaterThanOrEqual(4);
      expect(normalizeWord(entry.word)).toBe(entry.word);
      expect(entry.category.trim().length).toBeGreaterThan(0);
      expect(entry.hint.trim().length).toBeGreaterThan(0);
      expect(entry.hint).not.toContain('?');
    }
  });

  it('normaliza tildes y Ñ sin dejar símbolos', () => {
    expect(normalizeWord('montaña')).toBe('MONTANA');
    expect(normalizeWord('pingüino')).toBe('PINGUINO');
    expect(normalizeWord('  árbol  ')).toBe('ARBOL');
    expect(normalizeLetter('ñ')).toBe('N');
    expect(normalizeLetter('á')).toBe('A');
    expect(normalizeLetter('1')).toBeNull();
    expect(normalizeLetter('')).toBeNull();
  });

  it('revela las letras acertadas y no cambia con repetidas', () => {
    const round = createRound(TIBURON);
    expect(maskWord(round).every((item) => !item.revealed)).toBe(true);

    const first = guessLetter(round, 't');
    expect(first.outcome).toBe('hit');
    expect(first.round.mistakes).toBe(0);
    expect(first.round.guessed).toEqual(['T']);

    const masked = maskWord(first.round);
    expect(masked[0]).toEqual({ letter: 'T', revealed: true });
    expect(masked.filter((item) => item.revealed)).toHaveLength(1);

    const repeated = guessLetter(first.round, 'T');
    expect(repeated.outcome).toBe('repeated');
    expect(repeated.round).toBe(first.round);

    const wrong = guessLetter(first.round, 'Z');
    expect(wrong.outcome).toBe('miss');
    expect(wrong.round.mistakes).toBe(1);
    expect(letterMark(wrong.round, 'T')).toBe('hit');
    expect(letterMark(wrong.round, 'Z')).toBe('miss');
    expect(letterMark(wrong.round, 'A')).toBe('idle');

    const invalid = guessLetter(wrong.round, '7');
    expect(invalid.outcome).toBe('invalid');
    expect(invalid.round).toBe(wrong.round);
  });

  it('detecta la victoria y suma el bonus', () => {
    let round = createRound(TIBURON);
    const unique = uniqueWordLetters(round.word);
    expect(unique).toHaveLength(7);

    for (const letter of unique.slice(0, -1)) {
      const result = guessLetter(round, letter);
      expect(result.outcome).toBe('hit');
      round = result.round;
      expect(round.status).toBe('playing');
    }

    const last = guessLetter(round, unique[unique.length - 1]!);
    round = last.round;
    expect(last.outcome).toBe('hit');
    expect(round.status).toBe('won');
    expect(round.mistakes).toBe(0);
    expect(maskWord(round).every((item) => item.revealed)).toBe(true);
    expect(hitLetters(round)).toHaveLength(7);
    expect(scoreRound(round)).toBe(7 * 20 + 200);

    const after = guessLetter(round, 'A');
    expect(after.outcome).toBe('finished');
    expect(after.round).toBe(round);
  });

  it('detecta la derrota a los seis fallos', () => {
    let round = createRound(TIBURON);

    for (let index = 0; index < MAX_MISTAKES; index += 1) {
      const result = guessLetter(round, MISSES[index]!);
      expect(result.outcome).toBe('miss');
      round = result.round;
      expect(round.mistakes).toBe(index + 1);
      expect(round.status).toBe(index === MAX_MISTAKES - 1 ? 'lost' : 'playing');
    }

    expect(scoreRound(round)).toBe(0);

    const after = guessLetter(round, 'T');
    expect(after.outcome).toBe('finished');
    expect(after.round).toBe(round);
  });

  it('conserva los aciertos al perder y no añade el bonus', () => {
    let round = guessLetter(createRound(TIBURON), 'T').round;
    for (const letter of MISSES) round = guessLetter(round, letter).round;

    expect(round.status).toBe('lost');
    expect(hitLetters(round)).toEqual(['T']);
    expect(scoreRound(round)).toBe(20);
  });

  it('permite resolver todas las palabras solo con letras A–Z', () => {
    for (const entry of WORDS) {
      let round = createRound(entry);
      for (const letter of uniqueWordLetters(round.word)) {
        const result = guessLetter(round, letter);
        expect(result.outcome).toBe('hit');
        round = result.round;
      }
      expect(round.status).toBe('won');
      expect(round.mistakes).toBe(0);
    }
  });

  it('elige palabras de forma reproducible con mulberry32', () => {
    const first = pickWord(mulberry32(2026));
    const second = pickWord(mulberry32(2026));
    expect(first.word).toBe(second.word);
    expect(WORDS).toContain(first);

    const chosen = new Set<string>();
    for (let seed = 0; seed < 200; seed += 1) {
      chosen.add(pickWord(mulberry32(seed)).word);
    }
    expect(chosen.size).toBeGreaterThan(40);
  });
});
