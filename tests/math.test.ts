import { describe, expect, it } from 'vitest';
import { clamp, damp, mod, mulberry32, shortAngle } from '../src/games/engine/math';

describe('math', () => {
  it('clamp limita por ambos extremos', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('mod normaliza negativos', () => {
    expect(mod(-1, 10)).toBe(9);
    expect(mod(13, 10)).toBe(3);
  });

  it('shortAngle devuelve el delta más corto', () => {
    expect(shortAngle(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(-0.2, 5);
  });

  it('damp converge hacia el objetivo', () => {
    let value = 0;
    for (let frame = 0; frame < 120; frame += 1) value = damp(value, 100, 10, 1 / 60);
    expect(value).toBeGreaterThan(99);
  });

  it('mulberry32 es determinista', () => {
    const first = mulberry32(42);
    const second = mulberry32(42);
    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });
});
