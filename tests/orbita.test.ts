import { describe, expect, it } from 'vitest';
import {
  cycleLane,
  difficultyAt,
  angularDistance,
  hazardHits,
  isLaneBlocked,
  orbCollects,
  type Hazard,
  type Orb,
} from '../src/games/orbita/logic';

const radii = [100, 150, 200];
const laneWidth = 50;

const hazard: Hazard = { angle: 0, lane: 1, span: 0.4, speed: 0.2, seed: 0.5 };
const orb: Orb = { angle: 0.4, lane: 2, drift: 0, phase: 0 };

describe('cycleLane', () => {
  it('avanza y vuelve al primer carril', () => {
    expect(cycleLane(0)).toBe(1);
    expect(cycleLane(1)).toBe(2);
    expect(cycleLane(2)).toBe(0);
  });
});

describe('angularDistance', () => {
  it('elige siempre el camino corto', () => {
    expect(angularDistance(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(-0.2, 5);
    expect(angularDistance(Math.PI * 2 - 0.1, 0.1)).toBeCloseTo(0.2, 5);
  });
});

describe('hazardHits', () => {
  it('impacta en el mismo carril y dentro del arco', () => {
    expect(hazardHits(0.1, 150, hazard, radii, laneWidth)).toBe(true);
  });

  it('no impacta en otro carril', () => {
    expect(hazardHits(0.1, 100, hazard, radii, laneWidth)).toBe(false);
  });

  it('no impacta fuera del arco', () => {
    expect(hazardHits(1.2, 150, hazard, radii, laneWidth)).toBe(false);
  });
});

describe('orbCollects', () => {
  it('recoge un núcleo en su carril y ángulo', () => {
    expect(orbCollects(0.35, 200, orb, radii, laneWidth)).toBe(true);
  });

  it('ignora un núcleo en otro carril', () => {
    expect(orbCollects(0.35, 100, orb, radii, laneWidth)).toBe(false);
  });
});

describe('difficultyAt', () => {
  it('acelera con el tiempo sin superar el máximo', () => {
    const start = difficultyAt(0);
    const middle = difficultyAt(45);
    const end = difficultyAt(900);

    expect(middle.angularSpeed).toBeGreaterThan(start.angularSpeed);
    expect(end.angularSpeed).toBeGreaterThan(middle.angularSpeed);
    expect(end.spawnEvery).toBeLessThan(start.spawnEvery);
    expect(end.spawnEvery).toBeGreaterThan(0.5);
  });
});

describe('isLaneBlocked', () => {
  it('detecta un carril ocupado cerca del ángulo', () => {
    expect(isLaneBlocked([hazard], 1, 0.2)).toBe(true);
    expect(isLaneBlocked([hazard], 1, 2)).toBe(false);
    expect(isLaneBlocked([hazard], 0, 0.2)).toBe(false);
  });
});
