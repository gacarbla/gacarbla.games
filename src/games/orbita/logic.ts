import { TAU, clamp, mod } from '../engine/math';

export const LANE_COUNT = 3;
export const PLAYER_ANGULAR_HALF = 0.055;

export interface Hazard {
  angle: number;
  lane: number;
  span: number;
  speed: number;
  seed: number;
}

export interface Orb {
  angle: number;
  lane: number;
  drift: number;
  phase: number;
}

export function cycleLane(lane: number, count = LANE_COUNT): number {
  return (lane + 1) % count;
}

export function angularDistance(a: number, b: number): number {
  let delta = mod(b - a + Math.PI, TAU) - Math.PI;
  if (delta < -Math.PI) delta += TAU;
  return delta;
}

export function hazardHits(
  playerAngle: number,
  playerRadius: number,
  hazard: Hazard,
  laneRadii: readonly number[],
  laneWidth: number,
): boolean {
  const targetRadius = laneRadii[hazard.lane];
  if (targetRadius === undefined) return false;
  if (Math.abs(playerRadius - targetRadius) > laneWidth * 0.42) return false;
  return (
    Math.abs(angularDistance(playerAngle, hazard.angle)) < hazard.span / 2 + PLAYER_ANGULAR_HALF
  );
}

export function orbCollects(
  playerAngle: number,
  playerRadius: number,
  orb: Orb,
  laneRadii: readonly number[],
  laneWidth: number,
): boolean {
  const targetRadius = laneRadii[orb.lane];
  if (targetRadius === undefined) return false;
  if (Math.abs(playerRadius - targetRadius) > laneWidth * 0.5) return false;
  return Math.abs(angularDistance(playerAngle, orb.angle)) < 0.115;
}

/** Velocidad angular y cadencia de aparición según el tiempo jugado. */
export function difficultyAt(elapsedSeconds: number): {
  angularSpeed: number;
  spawnEvery: number;
  hazardSpeed: number;
} {
  const ramp = clamp(elapsedSeconds / 90, 0, 1);
  return {
    angularSpeed: 0.86 + ramp * 0.78,
    spawnEvery: 2.4 - ramp * 1.05,
    hazardSpeed: 0.22 + ramp * 0.38,
  };
}

/** Evita cerrar los tres carriles en el mismo ángulo. */
export function isLaneBlocked(
  hazards: readonly Hazard[],
  lane: number,
  angle: number,
  margin = 0.55,
): boolean {
  return hazards.some(
    (hazard) =>
      hazard.lane === lane &&
      Math.abs(angularDistance(hazard.angle, angle)) < margin + hazard.span / 2,
  );
}
