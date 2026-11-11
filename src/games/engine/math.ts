export const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function invLerp(from: number, to: number, value: number): number {
  if (from === to) return 0;
  return clamp((value - from) / (to - from), 0, 1);
}

/** Interpolación independiente del framerate. */
export function damp(from: number, to: number, lambda: number, dt: number): number {
  return lerp(from, to, 1 - Math.exp(-lambda * dt));
}

export function mod(value: number, length: number): number {
  return ((value % length) + length) % length;
}

export function shortAngle(from: number, to: number): number {
  let delta = mod(to - from + Math.PI, TAU) - Math.PI;
  if (delta < -Math.PI) delta += TAU;
  return delta;
}

export function angleDamp(from: number, to: number, lambda: number, dt: number): number {
  return from + shortAngle(from, to) * (1 - Math.exp(-lambda * dt));
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function randomRange(min: number, max: number, random: () => number = Math.random): number {
  return min + random() * (max - min);
}

export function randomInt(min: number, max: number, random: () => number = Math.random): number {
  return Math.floor(randomRange(min, max + 1, random));
}

export function pick<T>(items: readonly T[], random: () => number = Math.random): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))]!;
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap]!, copy[index]!];
  }
  return copy;
}

/** PRNG determinista para retos reproducibles y tests. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
