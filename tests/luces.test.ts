import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/games/engine/math';
import { generateLights, litCount, pressLight } from '../src/games/luces/logic';

describe('luces', () => {
  it('genera tableros resolubles y no triviales', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const puzzle = generateLights(mulberry32(seed));
      expect(puzzle.cells).toHaveLength(25);
      expect(litCount(puzzle.cells)).toBeGreaterThanOrEqual(8);
      expect(puzzle.presses.length).toBeGreaterThanOrEqual(12);
      expect(puzzle.presses.length).toBeLessThanOrEqual(16);
      expect(new Set(puzzle.presses).size).toBe(puzzle.presses.length);

      let replay = new Array<boolean>(25).fill(false);
      for (const index of puzzle.presses) replay = pressLight(replay, index);
      expect(replay).toEqual(puzzle.cells);
    }
  });

  it('pulsar dos veces la misma casilla no cambia nada', () => {
    const cells = new Array<boolean>(25).fill(false);
    cells[0] = true;
    const once = pressLight(cells, 7);
    expect(once).not.toEqual(cells);
    expect(pressLight(once, 7)).toEqual(cells);
  });
});
