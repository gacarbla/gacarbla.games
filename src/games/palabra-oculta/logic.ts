import { pick } from '../engine/math';

export const WORD_LENGTH = 5;
export const MAX_ATTEMPTS = 6;

/** Lista curada de palabras de cinco letras, sin tildes ni Ñ. */
export const WORDS: readonly string[] = [
  'abeja',
  'abono',
  'acero',
  'acoso',
  'aguja',
  'aldea',
  'alfil',
  'altar',
  'amigo',
  'ancho',
  'baila',
  'banco',
  'barco',
  'beber',
  'bello',
  'besar',
  'bomba',
  'brazo',
  'cabra',
  'calle',
  'calor',
  'calma',
  'campo',
  'canal',
  'canto',
  'carne',
  'carro',
  'carta',
  'danza',
  'dejar',
  'denso',
  'desde',
  'dicha',
  'disco',
  'dolor',
  'droga',
  'enero',
  'enojo',
  'enano',
  'error',
  'estar',
  'extra',
  'etapa',
  'falda',
  'falta',
  'fauna',
  'favor',
  'fecha',
  'feliz',
  'feria',
  'firma',
  'gallo',
  'ganar',
  'garra',
  'gasto',
  'gente',
  'gesto',
  'golpe',
  'grupo',
  'haber',
  'habla',
  'hacer',
  'hasta',
  'hielo',
  'hogar',
  'horno',
  'icono',
  'igual',
  'indio',
  'istmo',
  'jarra',
  'jaula',
  'joven',
  'juego',
  'junta',
  'labio',
  'lance',
  'largo',
  'larva',
  'leche',
  'lejos',
  'lento',
  'letra',
  'libro',
  'llave',
  'madre',
  'magia',
  'manta',
  'marco',
  'marea',
  'mejor',
  'mente',
  'metal',
  'metro',
  'mirar',
  'nadar',
  'nariz',
  'nieve',
  'noche',
  'norte',
  'nuevo',
  'oasis',
  'ocaso',
  'odiar',
  'oeste',
  'olivo',
  'pacto',
  'padre',
  'palma',
  'papel',
  'parar',
  'pared',
  'parte',
  'pasar',
  'pasta',
  'peine',
  'queja',
  'queso',
  'quema',
  'queda',
  'radio',
  'recto',
  'regar',
  'reina',
  'reloj',
  'remar',
  'ritmo',
  'robar',
  'sabor',
  'sabio',
  'salir',
  'salto',
  'salud',
  'santo',
  'tabla',
  'tarde',
  'tarea',
  'techo',
  'tecla',
  'temor',
  'tigre',
  'tinta',
  'vagar',
  'valle',
  'valor',
  'vapor',
  'veloz',
  'zanja',
  'zorro',
  'zurdo',
];

const WORD_SET: ReadonlySet<string> = new Set(WORDS);

export type LetterState = 'exact' | 'present' | 'absent';
export type RoundStatus = 'playing' | 'won' | 'lost';

/** Estados de una palabra secreta ordenados del más al menos informativo. */
const STATE_PRIORITY: Record<LetterState, number> = {
  absent: 1,
  present: 2,
  exact: 3,
};

export interface GuessRecord {
  word: string;
  states: LetterState[];
}

export interface RoundSnapshot {
  secret: string;
  guesses: readonly string[];
  status: RoundStatus;
}

export function normalizeWord(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidWord(value: string): boolean {
  const word = normalizeWord(value);
  return /^[a-z]{5}$/.test(word) && WORD_SET.has(word);
}

/**
 * Evalúa un intento respetando las repeticiones: primero se marcan las letras
 * exactas y solo las sobrantes de la secreta pueden contar como presentes.
 */
export function evaluateGuess(secretInput: string, guessInput: string): LetterState[] {
  const secret = normalizeWord(secretInput);
  const guess = normalizeWord(guessInput);
  if (secret.length !== WORD_LENGTH || guess.length !== WORD_LENGTH) {
    throw new Error(`Se esperaban dos palabras de ${WORD_LENGTH} letras.`);
  }

  const result: LetterState[] = Array<LetterState>(WORD_LENGTH).fill('absent');
  const remaining = new Map<string, number>();

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    const secretLetter = secret[index]!;
    if (guess[index] === secretLetter) {
      result[index] = 'exact';
    } else {
      remaining.set(secretLetter, (remaining.get(secretLetter) ?? 0) + 1);
    }
  }

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (result[index] === 'exact') continue;
    const letter = guess[index]!;
    const available = remaining.get(letter) ?? 0;
    if (available > 0) {
      result[index] = 'present';
      remaining.set(letter, available - 1);
    }
  }

  return result;
}

/** Mezcla los estados de una nueva fila con los del teclado sin degradarlos. */
export function mergeKeyboard(
  current: Readonly<Record<string, LetterState>>,
  guess: string,
  states: readonly LetterState[],
): Record<string, LetterState> {
  const next: Record<string, LetterState> = { ...current };
  for (let index = 0; index < guess.length; index += 1) {
    const letter = guess[index]!.toUpperCase();
    const state = states[index];
    if (!state) continue;
    const previous = next[letter];
    if (!previous || STATE_PRIORITY[state] > STATE_PRIORITY[previous]) {
      next[letter] = state;
    }
  }
  return next;
}

export function chooseSecret(random: () => number = Math.random): string {
  return pick(WORDS, random);
}

const SCORE_BY_ATTEMPT: readonly number[] = [1000, 850, 700, 550, 400, 250];

/** Puntos según el número de intentos empleados (1 a 6). */
export function scoreForAttempts(attempts: number): number {
  const index = Math.min(MAX_ATTEMPTS, Math.max(1, Math.floor(attempts))) - 1;
  return SCORE_BY_ATTEMPT[index]!;
}

/** Texto de progreso apto para la interfaz: nunca revela la secreta en juego. */
export function progressMessage(snapshot: RoundSnapshot): string {
  if (snapshot.status === 'lost') {
    return `Sin intentos. La palabra era ${snapshot.secret.toUpperCase()}.`;
  }
  if (snapshot.status === 'won') {
    const intentos = snapshot.guesses.length;
    return `Palabra resuelta en ${intentos} ${intentos === 1 ? 'intento' : 'intentos'}.`;
  }
  const attempt = Math.min(snapshot.guesses.length + 1, MAX_ATTEMPTS);
  return `Intento ${attempt} de ${MAX_ATTEMPTS}.`;
}

/** Devuelve la secreta solo cuando la partida ya ha terminado. */
export function revealedWord(snapshot: RoundSnapshot): string | null {
  return snapshot.status === 'playing' ? null : snapshot.secret.toUpperCase();
}
