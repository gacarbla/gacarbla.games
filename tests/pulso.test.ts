import { describe, expect, it } from 'vitest';
import {
  keyToPad,
  nextPad,
  noteFor,
  padAtPoint,
  progressRatio,
  stepMatches,
} from '../src/games/pulso/logic';

describe('pulso', () => {
  it('genera siempre un pad válido', () => {
    expect(nextPad(() => 0)).toBe(0);
    expect(nextPad(() => 0.5)).toBe(2);
    expect(nextPad(() => 0.99)).toBe(3);
  });

  it('mapea teclas y flechas a pads', () => {
    expect(keyToPad('Digit1')).toBe(0);
    expect(keyToPad('ArrowRight')).toBe(1);
    expect(keyToPad('KeyS')).toBe(2);
    expect(keyToPad('ArrowLeft')).toBe(3);
    expect(keyToPad('KeyQ')).toBeNull();
  });

  it('valida el paso correcto de la secuencia', () => {
    expect(stepMatches([1, 2, 0], 1, 2)).toBe(true);
    expect(stepMatches([1, 2, 0], 1, 3)).toBe(false);
  });

  it('cada pad tiene una nota distinta', () => {
    expect(new Set([0, 1, 2, 3].map(noteFor)).size).toBe(4);
  });

  it('detecta el pad pulsado por coordenadas', () => {
    const centre = { x: 200, y: 200 };
    expect(padAtPoint(200, 100, centre.x, centre.y, 100, 30)).toBe(0);
    expect(padAtPoint(300, 200, centre.x, centre.y, 100, 30)).toBe(1);
    expect(padAtPoint(200, 200, centre.x, centre.y, 100, 30)).toBe(-1);
  });

  it('limita el progreso entre 0 y 1', () => {
    expect(progressRatio(0, 4)).toBe(0);
    expect(progressRatio(2, 4)).toBe(0.5);
    expect(progressRatio(9, 4)).toBe(1);
    expect(progressRatio(1, 0)).toBe(0);
  });
});
