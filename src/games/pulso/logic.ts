export const PAD_COUNT = 4;

export const PAD_NOTES = [261.63, 329.63, 392, 523.25] as const;

const KEY_TO_PAD: Record<string, number> = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
  ArrowUp: 0,
  ArrowRight: 1,
  ArrowDown: 2,
  ArrowLeft: 3,
  KeyW: 0,
  KeyD: 1,
  KeyS: 2,
  KeyA: 3,
};

export function nextPad(random: () => number = Math.random): number {
  return Math.min(PAD_COUNT - 1, Math.max(0, Math.floor(random() * PAD_COUNT)));
}

export function stepMatches(sequence: readonly number[], index: number, pad: number): boolean {
  return sequence[index] === pad;
}

export function keyToPad(code: string): number | null {
  return KEY_TO_PAD[code] ?? null;
}

export function noteFor(pad: number): number {
  return PAD_NOTES[pad] ?? PAD_NOTES[0];
}

export function padAtPoint(
  x: number,
  y: number,
  centreX: number,
  centreY: number,
  ringRadius: number,
  padRadius: number,
): number {
  let bestPad = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let pad = 0; pad < PAD_COUNT; pad += 1) {
    const angle = -Math.PI / 2 + (pad * Math.PI) / 2;
    const padX = centreX + Math.cos(angle) * ringRadius;
    const padY = centreY + Math.sin(angle) * ringRadius;
    const distance = Math.hypot(x - padX, y - padY);
    if (distance <= padRadius * 1.5 && distance < bestDistance) {
      bestPad = pad;
      bestDistance = distance;
    }
  }

  return bestPad;
}

export function progressRatio(progress: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, progress / total));
}
