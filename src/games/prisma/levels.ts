import type { LevelDefinition } from './logic';

/**
 * Símbolos:
 *   .  vacío        #  muro        o  cristal
 *   L  espejo /     R  espejo \    *  divisor fijo
 *   > v < ^         emisores
 */
export const levels: LevelDefinition[] = [
  {
    name: 'Primera luz',
    rows: ['.......', '.......', '...o...', '.......', '.......', '>..R...', '.......'],
  },
  {
    name: 'Doble reflejo',
    rows: ['.......', '....R.o', '.......', '.......', '>...R..', '.......', '.......'],
  },
  {
    name: 'Bifurcación',
    rows: ['.......', '...R.o.', '.......', '>..*..#', '.......', '...L.o.', '.......'],
  },
  {
    name: 'La esquina',
    rows: ['R....L.', '.......', '.......', '.....o.', '.......', '.......', '^......'],
  },
  {
    name: 'Tres haces',
    rows: ['.o.....', '...R.o.', '.......', '.L.*..#', '.......', '.......', '...^...'],
  },
  {
    name: 'Dos caminos',
    rows: ['....o..', '..R..o.', '....L.<', '.......', '>.R....', '.......', '.......'],
  },
  {
    name: 'Estrella',
    rows: ['.R..o..', '...R..o', '.......', '.L.*..o', '.......', '.......', '...^...'],
  },
  {
    name: 'Constelación',
    rows: ['R..LR.L', '.......', '...o...', '....o..', '.......', '.......', '^.....^'],
  },
];
