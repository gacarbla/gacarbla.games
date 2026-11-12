import { describe, expect, it } from 'vitest';
import {
  bfsDistances,
  generateMaze,
  openEdges,
  WALL_E,
  WALL_N,
  WALL_S,
  WALL_W,
} from '../src/games/laberinto/logic';
import { mulberry32 } from '../src/games/engine/math';

const SIZE = 15;

describe('laberinto', () => {
  it('genera un laberinto perfecto y conectado', () => {
    for (const seed of [1, 2, 3, 99, 2026]) {
      const maze = generateMaze(SIZE, 3, mulberry32(seed));
      expect(maze.walls).toHaveLength(SIZE * SIZE);
      expect(maze.keys).toHaveLength(3);
      expect(openEdges(maze)).toBe(SIZE * SIZE - 1);

      const distances = bfsDistances(maze, maze.start);
      expect(distances[maze.exit]).toBeGreaterThan(0);
      for (const key of maze.keys) {
        expect(distances[key]).toBeGreaterThan(0);
      }

      const special = new Set([maze.start, maze.exit, ...maze.keys]);
      expect(special.size).toBe(5);
    }
  });

  it('mantiene las paredes simétricas y el borde cerrado', () => {
    const maze = generateMaze(SIZE, 3, mulberry32(7));
    for (let index = 0; index < maze.walls.length; index += 1) {
      const column = index % SIZE;
      const row = Math.floor(index / SIZE);
      const walls = maze.walls[index]!;
      if (column === 0) expect(walls & WALL_W).toBe(WALL_W);
      if (column === SIZE - 1) expect(walls & WALL_E).toBe(WALL_E);
      if (row === 0) expect(walls & WALL_N).toBe(WALL_N);
      if (row === SIZE - 1) expect(walls & WALL_S).toBe(WALL_S);

      if (column < SIZE - 1 && (walls & WALL_E) === 0) {
        expect(maze.walls[index + 1]! & WALL_W).toBe(0);
      }
      if (row < SIZE - 1 && (walls & WALL_S) === 0) {
        expect(maze.walls[index + SIZE]! & WALL_N).toBe(0);
      }
    }
  });

  it('coloca la salida lejos del inicio', () => {
    const maze = generateMaze(SIZE, 3, mulberry32(42));
    const distances = bfsDistances(maze, maze.start);
    expect(distances[maze.exit]).toBeGreaterThanOrEqual(SIZE);
  });
});
