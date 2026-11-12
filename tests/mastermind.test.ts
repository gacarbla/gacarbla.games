import { describe, expect, it } from 'vitest';
import { formatCode, randomCode, scoreGuess } from '../src/games/mastermind/logic';

describe('mastermind', () => {
  it('cuenta exactos y colores desplazados', () => {
    expect(scoreGuess([0, 1, 2, 3], [0, 2, 1, 4])).toEqual({ exact: 1, partial: 2 });
    expect(scoreGuess([0, 0, 1, 1], [0, 1, 0, 1])).toEqual({ exact: 2, partial: 2 });
    expect(scoreGuess([0, 1, 2, 3], [3, 2, 1, 0])).toEqual({ exact: 0, partial: 4 });
    expect(scoreGuess([0, 0, 0, 0], [0, 0, 0, 1])).toEqual({ exact: 3, partial: 0 });
  });

  it('genera códigos de cuatro colores y los describe', () => {
    const code = randomCode(() => 0.5);
    expect(code).toHaveLength(4);
    expect(code.every((color) => color >= 0 && color < 6)).toBe(true);
    expect(formatCode([0, 1, 2, 3])).toBe('Verde · Coral · Azul · Mostaza');
  });
});
