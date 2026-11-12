export const CODE_LENGTH = 4;
export const MAX_ATTEMPTS = 6;
export const COLOR_COUNT = 6;

export interface MastermindColor {
  name: string;
  hex: string;
}

export const MASTERMIND_COLORS: readonly MastermindColor[] = [
  { name: 'Verde', hex: '#2f5d50' },
  { name: 'Coral', hex: '#d97c5b' },
  { name: 'Azul', hex: '#6f9db8' },
  { name: 'Mostaza', hex: '#c9a63e' },
  { name: 'Malva', hex: '#9a80b5' },
  { name: 'Rosa', hex: '#cf8a8a' },
];

export interface Feedback {
  exact: number;
  partial: number;
}

export function randomCode(random: () => number = Math.random): number[] {
  const code: number[] = [];
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code.push(Math.floor(random() * COLOR_COUNT));
  }
  return code;
}

/** Exactos primero; el resto se cuenta como color presente en otra posición. */
export function scoreGuess(secret: readonly number[], guess: readonly number[]): Feedback {
  let exact = 0;
  const secretCounts = Array<number>(COLOR_COUNT).fill(0);
  const guessCounts = Array<number>(COLOR_COUNT).fill(0);

  for (let index = 0; index < CODE_LENGTH; index += 1) {
    if (secret[index] === guess[index]) {
      exact += 1;
    } else {
      secretCounts[secret[index]!]! += 1;
      guessCounts[guess[index]!]! += 1;
    }
  }

  let partial = 0;
  for (let color = 0; color < COLOR_COUNT; color += 1) {
    partial += Math.min(secretCounts[color]!, guessCounts[color]!);
  }
  return { exact, partial };
}

export function formatCode(code: readonly number[]): string {
  return code.map((color) => MASTERMIND_COLORS[color]!.name).join(' · ');
}
