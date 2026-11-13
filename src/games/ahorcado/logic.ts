/**
 * Lógica pura del ahorcado: lista de palabras, normalización y estado de la
 * ronda. Sin canvas ni acceso al DOM para poder probarla con Vitest.
 */

export const MAX_MISTAKES = 6;
export const POINTS_PER_LETTER = 20;
export const WIN_BONUS = 200;

export const ALPHABET: readonly string[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export interface WordEntry {
  readonly word: string;
  readonly category: string;
  readonly hint: string;
}

/** Sesenta palabras en español, normalizadas a A–Z, con categoría y pista. */
export const WORDS: readonly WordEntry[] = [
  // Animales
  { word: 'TIBURON', category: 'Animales', hint: 'Pez grande con dientes afilados' },
  { word: 'ELEFANTE', category: 'Animales', hint: 'Mamífero de trompa larga y orejas grandes' },
  { word: 'JIRAFA', category: 'Animales', hint: 'Cuello largo y manchas en la sabana' },
  { word: 'DELFIN', category: 'Animales', hint: 'Mamífero marino que salta y silba' },
  { word: 'PINGUINO', category: 'Animales', hint: 'Ave marina que no vuela y camina erguida' },
  { word: 'MARIPOSA', category: 'Animales', hint: 'Vuela de flor en flor con alas de colores' },
  { word: 'TORTUGA', category: 'Animales', hint: 'Reptil lento con caparazón duro' },
  { word: 'ARDILLA', category: 'Animales', hint: 'Roedor ágil que guarda nueces' },
  { word: 'CASTOR', category: 'Animales', hint: 'Roedor que construye diques en el río' },
  { word: 'CAMALEON', category: 'Animales', hint: 'Reptil que cambia de color' },
  { word: 'MURCIELAGO', category: 'Animales', hint: 'Mamífero volador que duerme de día' },
  { word: 'BALLENA', category: 'Animales', hint: 'El animal más grande del océano' },

  // Naturaleza
  { word: 'VOLCAN', category: 'Naturaleza', hint: 'Montaña que expulsa lava' },
  { word: 'DESIERTO', category: 'Naturaleza', hint: 'Paisaje seco de dunas y calor' },
  { word: 'CASCADA', category: 'Naturaleza', hint: 'Agua que cae desde una altura' },
  { word: 'BOSQUE', category: 'Naturaleza', hint: 'Terreno cubierto de árboles' },
  { word: 'MONTANA', category: 'Naturaleza', hint: 'Gran elevación natural del terreno' },
  { word: 'LAGUNA', category: 'Naturaleza', hint: 'Masa de agua tranquila y pequeña' },
  { word: 'TRUENO', category: 'Naturaleza', hint: 'Ruido fuerte que sigue al rayo' },
  { word: 'ARCOIRIS', category: 'Naturaleza', hint: 'Arco de colores tras la lluvia' },
  { word: 'ESTRELLA', category: 'Naturaleza', hint: 'Punto brillante en el cielo nocturno' },
  { word: 'PLANETA', category: 'Naturaleza', hint: 'Cuerpo que gira alrededor del Sol' },
  { word: 'COMETA', category: 'Naturaleza', hint: 'Astro con cola que cruza el cielo' },

  // Comida
  { word: 'CHOCOLATE', category: 'Comida', hint: 'Dulce oscuro hecho con cacao' },
  { word: 'AGUACATE', category: 'Comida', hint: 'Fruta verde cremosa con hueso central' },
  { word: 'TORTILLA', category: 'Comida', hint: 'Plato de huevo batido y patatas' },
  { word: 'ENSALADA', category: 'Comida', hint: 'Comida fría de verduras y hojas' },
  { word: 'CROQUETA', category: 'Comida', hint: 'Bocado frito de masa cremosa' },
  { word: 'MERMELADA', category: 'Comida', hint: 'Conserva dulce de fruta triturada' },
  { word: 'GUISANTE', category: 'Comida', hint: 'Legumbre verde y redonda en una vaina' },
  { word: 'ZANAHORIA', category: 'Comida', hint: 'Hortaliza naranja y alargada' },
  { word: 'CALABAZA', category: 'Comida', hint: 'Hortaliza grande y anaranjada' },
  { word: 'ESPAGUETI', category: 'Comida', hint: 'Pasta larga y fina con forma de hilo' },

  // Objetos
  { word: 'PARAGUAS', category: 'Objetos', hint: 'Objeto para cubrirse de la lluvia' },
  { word: 'TIJERAS', category: 'Objetos', hint: 'Herramienta de dos hojas para cortar' },
  { word: 'ESPEJO', category: 'Objetos', hint: 'Superficie que refleja tu imagen' },
  { word: 'LINTERNA', category: 'Objetos', hint: 'Aparato portátil que da luz' },
  { word: 'BRUJULA', category: 'Objetos', hint: 'Instrumento que señala el norte' },
  { word: 'CUADERNO', category: 'Objetos', hint: 'Libro de hojas para escribir' },
  { word: 'RELOJ', category: 'Objetos', hint: 'Mide las horas y los minutos' },
  { word: 'ALMOHADA', category: 'Objetos', hint: 'Cojín blando para dormir' },
  { word: 'VENTANA', category: 'Objetos', hint: 'Abertura con cristal para ver fuera' },
  { word: 'ESCALERA', category: 'Objetos', hint: 'Serie de peldaños para subir' },

  // Lugares
  { word: 'BIBLIOTECA', category: 'Lugares', hint: 'Lugar lleno de libros para leer' },
  { word: 'MERCADO', category: 'Lugares', hint: 'Lugar donde se venden alimentos' },
  { word: 'CASTILLO', category: 'Lugares', hint: 'Fortaleza antigua con torres' },
  { word: 'FARO', category: 'Lugares', hint: 'Torre que guía a los barcos' },
  { word: 'MUELLE', category: 'Lugares', hint: 'Plataforma junto al agua para atracar' },
  { word: 'PLAZA', category: 'Lugares', hint: 'Espacio abierto y amplio en la ciudad' },
  { word: 'TEATRO', category: 'Lugares', hint: 'Edificio donde se representan obras' },

  // Cuerpo
  { word: 'CORAZON', category: 'Cuerpo', hint: 'Órgano que bombea la sangre' },
  { word: 'PULMON', category: 'Cuerpo', hint: 'Órgano que sirve para respirar' },
  { word: 'RODILLA', category: 'Cuerpo', hint: 'Articulación entre muslo y pantorrilla' },
  { word: 'HOMBRO', category: 'Cuerpo', hint: 'Parte del cuerpo donde se une el brazo' },
  { word: 'CABEZA', category: 'Cuerpo', hint: 'Parte del cuerpo que contiene el cerebro' },

  // Transporte
  { word: 'BICICLETA', category: 'Transporte', hint: 'Vehículo de dos ruedas y pedales' },
  { word: 'AVION', category: 'Transporte', hint: 'Vehículo que vuela por el aire' },
  { word: 'BARCO', category: 'Transporte', hint: 'Vehículo que navega por el agua' },
  { word: 'TREN', category: 'Transporte', hint: 'Vehículo que avanza sobre raíles' },
  { word: 'HELICOPTERO', category: 'Transporte', hint: 'Aeronave con hélices verticales' },
];

export type RoundStatus = 'playing' | 'won' | 'lost';
export type GuessOutcome = 'hit' | 'miss' | 'repeated' | 'invalid' | 'finished';
export type LetterMark = 'hit' | 'miss' | 'idle';

export interface HangmanRound {
  readonly entry: WordEntry;
  readonly word: string;
  readonly guessed: readonly string[];
  readonly mistakes: number;
  readonly status: RoundStatus;
}

export interface GuessResult {
  readonly round: HangmanRound;
  readonly letter: string;
  readonly outcome: GuessOutcome;
}

export interface MaskedLetter {
  readonly letter: string;
  readonly revealed: boolean;
}

/** Deja una palabra en mayúsculas A–Z, sin tildes ni Ñ. */
export function normalizeWord(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

/** Normaliza una pulsación a una letra A–Z, o null si no es válida. */
export function normalizeLetter(value: string): string | null {
  const normalized = normalizeWord(value);
  return normalized.length === 1 ? normalized : null;
}

export function uniqueWordLetters(word: string): string[] {
  return [...new Set(word.split(''))];
}

/** Elige una palabra de la lista con un generador inyectable. */
export function pickWord(random: () => number = Math.random): WordEntry {
  const index = Math.min(WORDS.length - 1, Math.floor(random() * WORDS.length));
  return WORDS[Math.max(0, index)]!;
}

export function createRound(entry: WordEntry): HangmanRound {
  const word = normalizeWord(entry.word);
  if (word.length === 0) throw new Error('La palabra del ahorcado no es válida.');
  return {
    entry: { ...entry, word },
    word,
    guessed: [],
    mistakes: 0,
    status: 'playing',
  };
}

/**
 * Aplica una letra. Las letras repetidas, las inválidas y las jugadas con la
 * ronda terminada no cambian el estado.
 */
export function guessLetter(round: HangmanRound, value: string): GuessResult {
  const letter = normalizeLetter(value);
  if (!letter) return { round, letter: '', outcome: 'invalid' };
  if (round.status !== 'playing') return { round, letter, outcome: 'finished' };
  if (round.guessed.includes(letter)) return { round, letter, outcome: 'repeated' };

  const hit = round.word.includes(letter);
  const guessed = [...round.guessed, letter];
  const mistakes = round.mistakes + (hit ? 0 : 1);
  const solved = [...round.word].every((character) => guessed.includes(character));
  const status: RoundStatus = solved ? 'won' : mistakes >= MAX_MISTAKES ? 'lost' : 'playing';

  return {
    round: { ...round, guessed, mistakes, status },
    letter,
    outcome: hit ? 'hit' : 'miss',
  };
}

/** Letras correctas ya descubiertas (sin repetir). */
export function hitLetters(round: HangmanRound): string[] {
  return uniqueWordLetters(round.word).filter((letter) => round.guessed.includes(letter));
}

/** Puntos = letras acertadas × 20 + 200 si se gana. */
export function scoreRound(round: HangmanRound): number {
  return hitLetters(round).length * POINTS_PER_LETTER + (round.status === 'won' ? WIN_BONUS : 0);
}

export function remainingMistakes(round: HangmanRound): number {
  return Math.max(0, MAX_MISTAKES - round.mistakes);
}

export function maskWord(round: HangmanRound): MaskedLetter[] {
  return round.word.split('').map((letter) => ({
    letter,
    revealed: round.guessed.includes(letter),
  }));
}

export function letterMark(round: HangmanRound, letter: string): LetterMark {
  if (!round.guessed.includes(letter)) return 'idle';
  return round.word.includes(letter) ? 'hit' : 'miss';
}
