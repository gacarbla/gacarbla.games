import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  createState,
  isSolved,
  parseLevel,
  tryMove,
  type BoxState,
  type Level,
} from '../src/games/sokoban/logic';

function reachable(level: Level, boxes: readonly number[], start: number): Set<number> {
  const blocked = new Set(boxes);
  const seen = new Set<number>([start]);
  const queue = [start];
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head]!;
    for (let direction = 0; direction < 4; direction += 1) {
      const step = [0, 1, 0, -1][direction]!;
      const other = [-1, 0, 1, 0][direction]!;
      const column = (current % level.width) + step;
      const row = Math.floor(current / level.width) + other;
      if (column < 0 || column >= level.width) continue;
      if (row < 0 || row >= level.height) continue;
      const cell = row * level.width + column;
      if (level.walls[cell] || blocked.has(cell) || seen.has(cell)) continue;
      seen.add(cell);
      queue.push(cell);
    }
  }
  return seen;
}

function pushKey(boxes: readonly number[], region: Set<number>): string {
  return `${[...boxes].sort((a, b) => a - b).join(',')}|${Math.min(...region)}`;
}

/** Búsqueda por empujes: más pequeña que simular cada paso del jugador. */
function solve(level: Level): number {
  const start = createState(level);
  const startRegion = reachable(level, start.boxes, start.player);
  const queue: BoxState[] = [start];
  const depth = [0];
  const seen = new Set<string>([pushKey(start.boxes, startRegion)]);

  for (let head = 0; head < queue.length; head += 1) {
    const state = queue[head]!;
    const moves = depth[head]!;
    const region = reachable(level, state.boxes, state.player);

    for (let boxIndex = 0; boxIndex < state.boxes.length; boxIndex += 1) {
      const box = state.boxes[boxIndex]!;
      const boxColumn = box % level.width;
      const boxRow = Math.floor(box / level.width);
      for (let direction = 0; direction < 4; direction += 1) {
        const dx = [0, 1, 0, -1][direction]!;
        const dy = [-1, 0, 1, 0][direction]!;
        const behindColumn = boxColumn - dx;
        const behindRow = boxRow - dy;
        const beyondColumn = boxColumn + dx;
        const beyondRow = boxRow + dy;
        if (behindColumn < 0 || behindColumn >= level.width) continue;
        if (behindRow < 0 || behindRow >= level.height) continue;
        if (beyondColumn < 0 || beyondColumn >= level.width) continue;
        if (beyondRow < 0 || beyondRow >= level.height) continue;

        const behind = behindRow * level.width + behindColumn;
        const beyond = beyondRow * level.width + beyondColumn;
        if (level.walls[behind] || level.walls[beyond]) continue;
        if (state.boxes.includes(behind) || state.boxes.includes(beyond)) continue;
        if (!region.has(behind)) continue;

        const boxes = [...state.boxes];
        boxes[boxIndex] = beyond;
        const next: BoxState = { player: box, boxes };
        if (isSolved(level, next)) return moves + 1;

        const beyondColumnWalls = [
          level.walls[beyond - level.width] === true,
          level.walls[beyond + level.width] === true,
          level.walls[beyond - 1] === true,
          level.walls[beyond + 1] === true,
        ];
        if (!level.goals[beyond]) {
          const vertical = beyondColumnWalls[0]! || beyondColumnWalls[1]!;
          const horizontal = beyondColumnWalls[2]! || beyondColumnWalls[3]!;
          if (vertical && horizontal) continue;
        }

        const nextRegion = reachable(level, boxes, next.player);
        const key = pushKey(boxes, nextRegion);
        if (seen.has(key)) continue;
        seen.add(key);
        queue.push(next);
        depth.push(moves + 1);
      }
    }
  }
  return -1;
}

describe('sokoban', () => {
  it('los cinco niveles están bien formados', () => {
    expect(LEVELS).toHaveLength(5);
    for (const [index, rows] of LEVELS.entries()) {
      const width = rows[0]!.length;
      expect(rows.every((row) => row.length === width)).toBe(true);
      expect(rows.length).toBeLessThanOrEqual(10);
      expect(width).toBeLessThanOrEqual(10);

      const level = parseLevel(rows);
      expect(level.boxes.length).toBeGreaterThan(0);
      expect(level.boxes.length).toBe(level.goals.filter(Boolean).length);
      expect(level.boxes.length).toBeLessThanOrEqual(4);
      expect(index).toBeLessThan(5);
    }
  });

  it('mueve, bloquea paredes y empuja una caja', () => {
    const level = parseLevel(['#####', '#@$.#', '#####']);
    const start = createState(level);
    expect(tryMove(level, start, 0)).toBeNull();
    expect(tryMove(level, start, 2)).toBeNull();

    const pushed = tryMove(level, start, 1);
    expect(pushed).not.toBeNull();
    expect(pushed!.boxes).toEqual([8]);
    expect(pushed!.player).toBe(7);
    expect(isSolved(level, pushed!)).toBe(true);
  });

  it('no permite empujar dos cajas a la vez', () => {
    const level = parseLevel(['######', '#@$$.#', '######']);
    const state = createState(level);
    expect(tryMove(level, state, 1)).toBeNull();
  });

  it('cada nivel tiene solución', () => {
    for (const [index, rows] of LEVELS.entries()) {
      const level = parseLevel(rows);
      expect(solve(level), `nivel ${index + 1}`).toBeGreaterThan(0);
    }
  }, 20_000);
});
