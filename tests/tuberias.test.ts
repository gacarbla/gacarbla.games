import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/games/engine/math';
import {
  EAST,
  NORTH,
  PIPE_SIZE,
  SOUTH,
  WEST,
  generatePipes,
  pipesSolved,
} from '../src/games/tuberias/logic';

describe('tuberías', () => {
  it('genera una red resoluble, desordenada y sin atajos triviales', () => {
    const random = mulberry32(2026);

    for (let round = 0; round < 30; round += 1) {
      const puzzle = generatePipes(random);
      expect(puzzle.masks).toHaveLength(49);
      expect(puzzle.solution).toHaveLength(49);
      expect(puzzle.path.length).toBeGreaterThanOrEqual(14);
      expect(puzzle.source % PIPE_SIZE).toBe(0);
      expect(puzzle.exit % PIPE_SIZE).toBe(PIPE_SIZE - 1);
      expect(puzzle.solution[puzzle.source]! & WEST).toBe(WEST);
      expect(puzzle.solution[puzzle.exit]! & EAST).toBe(EAST);

      // La solución deja la fuente conectada con la salida…
      expect(pipesSolved(puzzle.solution, puzzle.source, puzzle.exit)).toBe(true);
      // …pero el tablero inicial no está resuelto.
      expect(pipesSolved(puzzle.masks, puzzle.source, puzzle.exit)).toBe(false);

      // Ninguna celda del camino empieza ya en su orientación correcta.
      for (const cell of puzzle.path) {
        expect(puzzle.masks[cell]).not.toBe(puzzle.solution[cell]);
      }

      // Las celdas de relleno no apuntan fuera del tablero.
      const onPath = new Set(puzzle.path);
      for (let index = 0; index < puzzle.masks.length; index += 1) {
        if (onPath.has(index)) continue;
        const mask = puzzle.masks[index]!;
        const column = index % PIPE_SIZE;
        const row = Math.floor(index / PIPE_SIZE);
        if (column === 0) expect(mask & WEST).toBe(0);
        if (column === PIPE_SIZE - 1) expect(mask & EAST).toBe(0);
        if (row === 0) expect(mask & NORTH).toBe(0);
        if (row === PIPE_SIZE - 1) expect(mask & SOUTH).toBe(0);
      }
    }
  });
});
