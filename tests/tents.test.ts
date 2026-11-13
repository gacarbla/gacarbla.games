import { describe, expect, it } from 'vitest';
import {
  TENTS_LEVELS,
  TENTS_SIZE,
  adjacentTentCells,
  boardFromSolution,
  cellIndex,
  countPlaced,
  createEmptyBoard,
  haveAdjacentTents,
  inBounds,
  isTreeAt,
  levelCounts,
  matchTrees,
  tentCounts,
  validateTents,
  type TentsCoord,
  type TentsLevel,
} from '../src/games/tents/logic';

const puzzleLevels = TENTS_LEVELS.map((level) => [level.name, level] as const);

describe('niveles de tiendas de campaña', () => {
  it('contiene cinco niveles de 8 × 8', () => {
    expect(TENTS_LEVELS).toHaveLength(5);
    expect(TENTS_SIZE).toBe(8);
  });

  it.each(puzzleLevels)('el nivel "%s" está dentro del tablero', (_name, level) => {
    const coords: TentsCoord[] = [...level.trees, ...level.tents];
    for (const [row, col] of coords) {
      expect(inBounds(row, col)).toBe(true);
    }
    expect(new Set(level.trees.map(([row, col]) => cellIndex(row, col))).size).toBe(
      level.trees.length,
    );
    expect(new Set(level.tents.map(([row, col]) => cellIndex(row, col))).size).toBe(
      level.tents.length,
    );
    expect(level.rows).toHaveLength(TENTS_SIZE);
    expect(level.cols).toHaveLength(TENTS_SIZE);
  });

  it.each(puzzleLevels)(
    'la solución de "%s" empareja cada árbol con una tienda',
    (_name, level) => {
      const solution = boardFromSolution(level);
      expect(countPlaced(solution)).toBe(level.trees.length);

      const assignment = matchTrees(level, solution);
      expect(assignment).not.toBeNull();
      expect(assignment).toHaveLength(level.trees.length);
      expect(new Set(assignment).size).toBe(level.trees.length);

      assignment!.forEach((tent, treeIndex) => {
        const [treeRow, treeCol] = level.trees[treeIndex]!;
        const tentRow = Math.floor(tent / TENTS_SIZE);
        const tentCol = tent % TENTS_SIZE;
        expect(Math.abs(treeRow - tentRow) + Math.abs(treeCol - tentCol)).toBe(1);
      });
    },
  );

  it.each(puzzleLevels)('la solución de "%s" respeta los conteos', (_name, level) => {
    const counts = levelCounts(level);
    expect(counts.rows).toEqual([...level.rows]);
    expect(counts.cols).toEqual([...level.cols]);
    expect(counts.rows.reduce((sum, value) => sum + value, 0)).toBe(level.trees.length);
    expect(counts.cols.reduce((sum, value) => sum + value, 0)).toBe(level.trees.length);

    const solution = boardFromSolution(level);
    expect(tentCounts(solution)).toEqual(counts);
  });

  it.each(puzzleLevels)(
    'la solución de "%s" no tiene tiendas adyacentes ni en diagonal',
    (_name, level) => {
      const solution = boardFromSolution(level);
      expect(haveAdjacentTents(solution)).toBe(false);
      expect(adjacentTentCells(solution)).toEqual([]);
    },
  );

  it.each(puzzleLevels)('la solución de "%s" pasa la validación completa', (_name, level) => {
    const result = validateTents(level, boardFromSolution(level));
    expect(result.ok).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.assignment).not.toBeNull();
  });

  it.each(puzzleLevels)('el nivel "%s" no empieza resuelto', (_name, level) => {
    expect(validateTents(level, createEmptyBoard()).ok).toBe(false);
  });

  it('ninguna tienda de la solución ocupa la celda de un árbol', () => {
    for (const level of TENTS_LEVELS) {
      const treeCells = new Set(level.trees.map(([row, col]) => cellIndex(row, col)));
      for (const [row, col] of level.tents) {
        expect(treeCells.has(cellIndex(row, col))).toBe(false);
      }
    }
  });
});

describe('validación de colocaciones', () => {
  const level = TENTS_LEVELS[0]!;
  const solution = boardFromSolution(level);

  it('acepta la solución conocida', () => {
    expect(validateTents(level, solution).ok).toBe(true);
  });

  it('rechaza una tienda que ocupa un árbol', () => {
    const board = boardFromSolution(level);
    const firstTent = level.tents[0]!;
    const [treeRow, treeCol] = level.trees[0]!;
    board[cellIndex(firstTent[0], firstTent[1])] = false;
    board[cellIndex(treeRow, treeCol)] = true;

    const result = validateTents(level, board);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('árbol');
  });

  it('rechaza una colocación a la que le falta una tienda', () => {
    const board = boardFromSolution(level);
    const [row, col] = level.tents[0]!;
    board[cellIndex(row, col)] = false;

    const result = validateTents(level, board);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('tiendas');
  });

  it('rechaza dos tiendas que se tocan en diagonal', () => {
    const board = boardFromSolution(level);
    const [row, col] = level.tents[0]!;
    const [otherRow, otherCol] = level.tents[1]!;
    const treeCells = new Set(level.trees.map(([treeRow, treeCol]) => cellIndex(treeRow, treeCol)));

    let placedNeighbor = false;
    for (const [rowStep, colStep] of [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ] as const) {
      const nextRow = row + rowStep;
      const nextCol = col + colStep;
      if (!inBounds(nextRow, nextCol)) continue;
      const index = cellIndex(nextRow, nextCol);
      if (board[index] || treeCells.has(index)) continue;
      board[cellIndex(otherRow, otherCol)] = false;
      board[index] = true;
      placedNeighbor = true;
      break;
    }

    expect(placedNeighbor).toBe(true);
    expect(countPlaced(board)).toBe(level.trees.length);
    expect(haveAdjacentTents(board)).toBe(true);

    const result = validateTents(level, board);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('tocan');
  });

  it('rechaza una tienda que no es contigua a ningún árbol', () => {
    const board = createEmptyBoard();
    board[cellIndex(7, 0)] = true;

    expect(matchTrees(level, board)).toBeNull();
  });

  it('rechaza un tablero con cifras manipuladas', () => {
    const altered: TentsLevel = {
      ...level,
      rows: level.rows.map((value, index) => (index === 0 ? value + 1 : value)),
    };

    const result = validateTents(altered, solution);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('filas');
  });

  it('no acepta que dos árboles compartan una sola tienda', () => {
    const mini: TentsLevel = {
      name: 'prueba',
      trees: [
        [3, 3],
        [3, 5],
      ],
      tents: [],
      rows: [0, 0, 1, 0, 0, 0, 0, 0],
      cols: [0, 0, 0, 0, 1, 0, 0, 0],
    };
    const board = createEmptyBoard();
    board[cellIndex(3, 4)] = true;
    board[cellIndex(2, 4)] = true;

    expect(isTreeAt(mini, cellIndex(3, 3))).toBe(true);
    expect(matchTrees(mini, board)).toBeNull();
  });
});
