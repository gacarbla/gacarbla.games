import { shuffle } from '../engine/math';

/** Paredes por celda: norte 1, este 2, sur 4, oeste 8. */
export const WALL_N = 1;
export const WALL_E = 2;
export const WALL_S = 4;
export const WALL_W = 8;

export type Direction = 0 | 1 | 2 | 3;

export const STEPS: readonly {
  wall: number;
  opposite: number;
  dx: number;
  dy: number;
  key: string;
}[] = [
  { wall: WALL_N, opposite: WALL_S, dx: 0, dy: -1, key: 'n' },
  { wall: WALL_E, opposite: WALL_W, dx: 1, dy: 0, key: 'e' },
  { wall: WALL_S, opposite: WALL_N, dx: 0, dy: 1, key: 's' },
  { wall: WALL_W, opposite: WALL_E, dx: -1, dy: 0, key: 'w' },
] as const;

export interface MazeGrid {
  size: number;
  walls: number[];
}

export interface Maze extends MazeGrid {
  start: number;
  exit: number;
  keys: number[];
}

function rowOf(index: number, size: number): number {
  return Math.floor(index / size);
}

function columnOf(index: number, size: number): number {
  return index % size;
}

function inside(size: number, column: number, row: number): boolean {
  return column >= 0 && column < size && row >= 0 && row < size;
}

export function neighbor(grid: MazeGrid, index: number, direction: Direction): number | null {
  const step = STEPS[direction]!;
  if ((grid.walls[index]! & step.wall) !== 0) return null;
  const size = grid.size;
  const column = columnOf(index, size) + step.dx;
  const row = rowOf(index, size) + step.dy;
  if (!inside(size, column, row)) return null;
  return row * size + column;
}

/** Distancias en pasos desde una celda; -1 si no es alcanzable. */
export function bfsDistances(grid: MazeGrid, from: number): number[] {
  const distances = new Array<number>(grid.size * grid.size).fill(-1);
  if (from < 0 || from >= distances.length) return distances;

  distances[from] = 0;
  const queue = [from];
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head]!;
    const distance = distances[current]!;
    for (let direction = 0; direction < 4; direction += 1) {
      const next = neighbor(grid, current, direction as Direction);
      if (next === null || distances[next] !== -1) continue;
      distances[next] = distance + 1;
      queue.push(next);
    }
  }
  return distances;
}

/** Laberinto perfecto generado con DFS aleatorio y salida/llaves alejadas del inicio. */
export function generateMaze(size = 15, keyCount = 3, random: () => number = Math.random): Maze {
  const walls = new Array<number>(size * size).fill(WALL_N | WALL_E | WALL_S | WALL_W);
  const visited = new Array<boolean>(size * size).fill(false);
  const stack = [0];
  visited[0] = true;

  while (stack.length > 0) {
    const current = stack[stack.length - 1]!;
    const options: { cell: number; direction: Direction }[] = [];
    for (let direction = 0; direction < 4; direction += 1) {
      const step = STEPS[direction]!;
      const column = columnOf(current, size) + step.dx;
      const row = rowOf(current, size) + step.dy;
      if (!inside(size, column, row)) continue;
      const cell = row * size + column;
      if (!visited[cell]) options.push({ cell, direction: direction as Direction });
    }

    if (options.length === 0) {
      stack.pop();
      continue;
    }

    const choice = options[Math.min(options.length - 1, Math.floor(random() * options.length))]!;
    const step = STEPS[choice.direction]!;
    walls[current] = walls[current]! & ~step.wall;
    walls[choice.cell] = walls[choice.cell]! & ~step.opposite;
    visited[choice.cell] = true;
    stack.push(choice.cell);
  }

  const grid: MazeGrid = { size, walls };
  const start = 0;
  const distances = bfsDistances(grid, start);
  const span = Math.max(1, ...distances.filter((distance) => distance >= 0));
  const cells = Array.from({ length: size * size }, (_, index) => index);

  const exitCandidates = shuffle(
    cells.filter((cell) => cell !== start && distances[cell]! >= Math.max(span * 0.8, span - 2)),
    random,
  );
  const exit = exitCandidates[0] ?? size * size - 1;

  const keyCandidates = shuffle(
    cells.filter(
      (cell) =>
        cell !== start && cell !== exit && distances[cell]! >= Math.max(3, Math.floor(span * 0.35)),
    ),
    random,
  );
  const keys: number[] = [];
  for (const cell of keyCandidates) {
    if (keys.length >= keyCount) break;
    keys.push(cell);
  }
  while (keys.length < keyCount) {
    const fallback = cells.find((cell) => cell !== start && cell !== exit && !keys.includes(cell));
    if (fallback === undefined) break;
    keys.push(fallback);
  }

  return { size, walls, start, exit, keys };
}

/** Cuenta de aristas abiertas, útil para comprobar que el laberinto es perfecto. */
export function openEdges(maze: MazeGrid): number {
  let edges = 0;
  for (let index = 0; index < maze.walls.length; index += 1) {
    if ((maze.walls[index]! & WALL_E) === 0) edges += 1;
    if ((maze.walls[index]! & WALL_S) === 0) edges += 1;
  }
  return edges;
}
