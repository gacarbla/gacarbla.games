import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/games/engine/math';
import {
  MAX_ATTEMPTS,
  WORD_LENGTH,
  WORDS,
  chooseSecret,
  evaluateGuess,
  isValidWord,
  mergeKeyboard,
  progressMessage,
  revealedWord,
  scoreForAttempts,
} from '../src/games/palabra-oculta/logic';

describe('palabra oculta', () => {
  it('mantiene 150 palabras jugables de cinco letras sin tildes ni Ñ', () => {
    expect(WORD_LENGTH).toBe(5);
    expect(MAX_ATTEMPTS).toBe(6);
    expect(WORDS).toHaveLength(150);
    expect(new Set(WORDS).size).toBe(150);
    for (const word of WORDS) {
      expect(word).toMatch(/^[a-z]{5}$/);
    }
  });

  it('valida palabras de la lista y rechaza el resto', () => {
    expect(isValidWord('abeja')).toBe(true);
    expect(isValidWord('ABEJA')).toBe(true);
    expect(isValidWord('cabra')).toBe(true);
    expect(isValidWord('zzzzz')).toBe(false);
    expect(isValidWord('abejas')).toBe(false);
    expect(isValidWord('abej')).toBe(false);
    expect(isValidWord('abejá')).toBe(false);
  });

  it('marca letras exactas, presentes y ausentes', () => {
    expect(evaluateGuess('cabra', 'barco')).toEqual([
      'present',
      'exact',
      'present',
      'present',
      'absent',
    ]);
    expect(evaluateGuess('perro', 'perla')).toEqual([
      'exact',
      'exact',
      'exact',
      'absent',
      'absent',
    ]);
  });

  it('respeta las repeticiones al calcular el feedback', () => {
    // La secreta tiene dos aes y el intento cinco: solo cuentan dos.
    expect(evaluateGuess('abeja', 'aaaaa')).toEqual([
      'exact',
      'absent',
      'absent',
      'absent',
      'exact',
    ]);
    // Las dos erres exactas consumen las dos erres de la secreta.
    expect(evaluateGuess('perro', 'rrrrr')).toEqual([
      'absent',
      'absent',
      'exact',
      'exact',
      'absent',
    ]);
    // Una letra exacta no vuelve a contar como presente en otra posición.
    expect(evaluateGuess('calor', 'colca')).toEqual([
      'exact',
      'present',
      'exact',
      'absent',
      'present',
    ]);
    expect(evaluateGuess('abeja', 'barco')).toEqual([
      'present',
      'present',
      'absent',
      'absent',
      'absent',
    ]);
    expect(evaluateGuess('verde', 'beber')).toEqual([
      'absent',
      'exact',
      'absent',
      'present',
      'present',
    ]);
  });

  it('rechaza intentos que no miden cinco letras', () => {
    expect(() => evaluateGuess('abeja', 'bar')).toThrow();
    expect(() => evaluateGuess('cabra', 'barcoo')).toThrow();
  });

  it('conserva el mejor estado de cada tecla sin degradarlo', () => {
    const first = mergeKeyboard({}, 'barco', evaluateGuess('cabra', 'barco'));
    expect(first.B).toBe('present');
    expect(first.A).toBe('exact');
    expect(first.O).toBe('absent');

    const second = mergeKeyboard(first, 'beber', evaluateGuess('cabra', 'beber'));
    expect(second.B).toBe('exact');
    expect(second.E).toBe('absent');

    const kept = mergeKeyboard({ C: 'exact' }, 'barco', evaluateGuess('cabra', 'barco'));
    expect(kept.C).toBe('exact');
  });

  it('elige secretos reproducibles con mulberry32', () => {
    for (const seed of [1, 7, 42, 2026]) {
      const first = chooseSecret(mulberry32(seed));
      const second = chooseSecret(mulberry32(seed));
      expect(first).toBe(second);
      expect(WORDS).toContain(first);
    }

    const seen = new Set<string>();
    for (let seed = 0; seed < 60; seed += 1) seen.add(chooseSecret(mulberry32(seed)));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('puntúa mejor cuantos menos intentos hacen falta', () => {
    expect(scoreForAttempts(1)).toBe(1000);
    expect(scoreForAttempts(6)).toBe(250);
    for (let attempts = 2; attempts <= MAX_ATTEMPTS; attempts += 1) {
      expect(scoreForAttempts(attempts)).toBeLessThan(scoreForAttempts(attempts - 1));
    }
  });

  it('no revela la palabra mientras la partida sigue', () => {
    const playing = {
      secret: 'abeja',
      guesses: ['barco'],
      status: 'playing' as const,
    };
    expect(revealedWord(playing)).toBeNull();
    expect(progressMessage(playing).toLowerCase()).not.toContain(playing.secret);
    expect(progressMessage(playing)).toContain('2');

    const won = { ...playing, guesses: ['barco', 'abeja'], status: 'won' as const };
    expect(revealedWord(won)).toBe('ABEJA');

    const lost = { ...playing, status: 'lost' as const };
    expect(revealedWord(lost)).toBe('ABEJA');
    expect(progressMessage(lost)).toContain('ABEJA');
  });
});
