import { describe, expect, it } from 'vitest';
import {
  BRIDGES_LEVELS,
  BRIDGES_SIZE,
  createPairs,
  crossingsOf,
  cycleBridge,
  evaluate,
  isAdjacentPair,
  isConnected,
  levelPairs,
  solutionBridges,
  type BridgesIsland,
} from '../src/games/bridges/logic';

describe('bridges', () => {
  it('contiene cinco niveles de 7×7 con islas únicas y números válidos', () => {
    expect(BRIDGES_LEVELS).toHaveLength(5);

    for (const level of BRIDGES_LEVELS) {
      expect(level.islands.length).toBeGreaterThanOrEqual(7);
      const positions = new Set<string>();
      for (const island of level.islands) {
        expect(Number.isInteger(island.x)).toBe(true);
        expect(Number.isInteger(island.y)).toBe(true);
        expect(island.x).toBeGreaterThanOrEqual(0);
        expect(island.x).toBeLessThan(BRIDGES_SIZE);
        expect(island.y).toBeGreaterThanOrEqual(0);
        expect(island.y).toBeLessThan(BRIDGES_SIZE);
        expect(island.value).toBeGreaterThanOrEqual(1);
        expect(island.value).toBeLessThanOrEqual(8);

        const key = `${island.x},${island.y}`;
        expect(positions.has(key)).toBe(false);
        positions.add(key);
      }
    }
  });

  it('la solución conocida cumple grados, cruces y conectividad', () => {
    for (const level of BRIDGES_LEVELS) {
      const pairs = levelPairs(level);
      const bridges = solutionBridges(level, pairs);

      expect(bridges).toHaveLength(pairs.length);
      expect(bridges.every((count) => count >= 0 && count <= 2)).toBe(true);
      expect(bridges.reduce((total, count) => total + count, 0)).toBe(
        level.links.reduce((total, link) => total + link.count, 0),
      );

      const evaluation = evaluate(level.islands, pairs, bridges);
      expect(evaluation.allDegrees).toBe(true);
      expect(evaluation.degreesMet.every(Boolean)).toBe(true);
      expect(evaluation.crossings).toEqual([]);
      expect(evaluation.connected).toBe(true);
      expect(evaluation.solved).toBe(true);
    }
  });

  it('rechaza un tablero vacío y cualquier solución alterada', () => {
    for (const level of BRIDGES_LEVELS) {
      const pairs = levelPairs(level);
      const solution = solutionBridges(level, pairs);

      const empty = pairs.map(() => 0);
      expect(evaluate(level.islands, pairs, empty).solved).toBe(false);

      const changed = solution.findIndex((count) => count === 1);
      expect(changed).toBeGreaterThanOrEqual(0);
      const altered = [...solution];
      altered[changed] = altered[changed] === 1 ? 2 : 1;
      expect(evaluate(level.islands, pairs, altered).solved).toBe(false);
    }
  });

  it('cicla los puentes 0 → 1 → 2 → 0', () => {
    expect(cycleBridge(0)).toBe(1);
    expect(cycleBridge(1)).toBe(2);
    expect(cycleBridge(2)).toBe(0);
  });

  it('solo considera adyacentes las islas alineadas sin islas en medio', () => {
    const islands: BridgesIsland[] = [
      { x: 0, y: 0, value: 1 },
      { x: 1, y: 0, value: 1 },
      { x: 2, y: 0, value: 1 },
    ];
    expect(isAdjacentPair(islands, 0, 1)).toBe(true);
    expect(isAdjacentPair(islands, 1, 2)).toBe(true);
    expect(isAdjacentPair(islands, 0, 2)).toBe(false);
    expect(createPairs(islands)).toHaveLength(2);
  });

  it('detecta cruces entre puentes y descarta la conexión global', () => {
    const islands: BridgesIsland[] = [
      { x: 0, y: 1, value: 1 },
      { x: 2, y: 1, value: 1 },
      { x: 1, y: 0, value: 1 },
      { x: 1, y: 2, value: 1 },
    ];
    const pairs = createPairs(islands);
    expect(pairs).toHaveLength(2);

    const bridges = pairs.map(() => 1);
    const evaluation = evaluate(islands, pairs, bridges);
    expect(evaluation.allDegrees).toBe(true);
    expect(evaluation.crossings).toHaveLength(2);
    expect(crossingsOf(islands, pairs, bridges)).toHaveLength(2);
    expect(evaluation.connected).toBe(false);
    expect(evaluation.solved).toBe(false);
  });

  it('conecta mediante union-find y exige que no queden islas aisladas', () => {
    const islands: BridgesIsland[] = [
      { x: 0, y: 0, value: 1 },
      { x: 1, y: 0, value: 1 },
      { x: 2, y: 0, value: 1 },
    ];
    const pairs = createPairs(islands);
    expect(pairs).toHaveLength(2);

    expect(isConnected(islands, pairs, [0, 0])).toBe(false);
    expect(isConnected(islands, pairs, [1, 0])).toBe(false);
    expect(isConnected(islands, pairs, [1, 1])).toBe(true);
    expect(isConnected(islands, pairs, [2, 2])).toBe(true);
  });

  it('los enlaces de la solución son vecinos directos', () => {
    for (const level of BRIDGES_LEVELS) {
      const islands = level.islands;
      for (const link of level.links) {
        expect(isAdjacentPair(islands, link.a, link.b)).toBe(true);
      }
    }
  });
});
