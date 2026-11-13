import { shuffle } from '../engine/math';

/** Palabras curadas para la partida: 60 entradas, todas entre 5 y 9 letras. */
export const WORDS: readonly string[] = [
  // 5 letras
  'perro',
  'gatos',
  'libro',
  'playa',
  'cielo',
  'campo',
  'noche',
  'tarde',
  'calle',
  'verde',
  'raton',
  'leche',
  'queso',
  'nieve',
  'barco',
  'avion',
  'farol',
  'papel',
  // 6 letras
  'puente',
  'piedra',
  'camino',
  'jardin',
  'bosque',
  'ciudad',
  'verano',
  'musica',
  'amigos',
  'flores',
  'cocina',
  'madera',
  'camisa',
  'zapato',
  'conejo',
  'puerto',
  // 7 letras
  'ventana',
  'escuela',
  'familia',
  'trabajo',
  'montana',
  'naranja',
  'planeta',
  'cuchara',
  'botella',
  'carpeta',
  'monedas',
  'pizarra',
  // 8 letras
  'estrella',
  'invierno',
  'silencio',
  'castillo',
  'ventanas',
  'caminata',
  'cuaderno',
  'mariposa',
  // 9 letras
  'sombrilla',
  'cuadernos',
  'mariposas',
  'castillos',
  'caminatas',
  'primavera',
];

export const ROUNDS_PER_GAME = 8;

export const POINTS_PER_WORD = 40;
export const POINTS_PER_LETTER = 12;
export const PENALTY_WRONG = 30;
export const PENALTY_HINT = 25;

export interface AnagramRound {
  word: string;
  letters: string[];
}

/** Minúsculas y sin tildes: así el teclado y las fichas se comparan igual. */
export function normalizeWord(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

/** Baraja las letras y garantiza un orden distinto cuando hay letras diferentes. */
export function scrambleWord(word: string, random: () => number = Math.random): string[] {
  const letters = [...normalizeWord(word)];
  if (letters.length < 2) return letters;

  const original = letters.join('');
  let scrambled = shuffle(letters, random);
  for (let attempt = 0; attempt < 16 && scrambled.join('') === original; attempt += 1) {
    scrambled = shuffle(letters, random);
  }

  if (scrambled.join('') === original) {
    const different = letters.findIndex((letter) => letter !== letters[0]);
    if (different > 0) {
      [scrambled[0], scrambled[different]] = [scrambled[different]!, scrambled[0]!];
    }
  }

  return scrambled;
}

/** Elige palabras distintas para una partida. */
export function pickWords(count = ROUNDS_PER_GAME, random: () => number = Math.random): string[] {
  const limit = Math.max(0, Math.min(count, WORDS.length));
  return shuffle(WORDS, random).slice(0, limit);
}

/** Construye las rondas de una partida, cada una con sus fichas ya desordenadas. */
export function buildRounds(
  count = ROUNDS_PER_GAME,
  random: () => number = Math.random,
): AnagramRound[] {
  return pickWords(count, random).map((word) => ({
    word,
    letters: scrambleWord(word, random),
  }));
}

/** Compara sin distinguir mayúsculas ni tildes. */
export function matchesWord(word: string, attempt: string): boolean {
  return normalizeWord(attempt) === normalizeWord(word);
}

/** Puntos de una palabra acertada; la pista resta una penalización fija. */
export function pointsForWord(word: string, usedHint: boolean): number {
  const letters = normalizeWord(word).length;
  const base = POINTS_PER_WORD + letters * POINTS_PER_LETTER;
  return Math.max(10, base - (usedHint ? PENALTY_HINT : 0));
}
