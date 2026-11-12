export const EPSILON = 1e-6;
export const TARGET = 24;

export type Operator = 'add' | 'sub' | 'mul' | 'div';

export interface OperatorInfo {
  id: Operator;
  symbol: string;
}

export const OPERATORS: readonly OperatorInfo[] = [
  { id: 'add', symbol: '+' },
  { id: 'sub', symbol: '−' },
  { id: 'mul', symbol: '×' },
  { id: 'div', symbol: '÷' },
];

const OPERATIONS: Record<Operator, (a: number, b: number) => number> = {
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  div: (a, b) => a / b,
};

export function apply(a: number, b: number, operator: Operator): number {
  return OPERATIONS[operator](a, b);
}

/** Etiqueta compacta y exacta para valores enteros o fracciones sencillas. */
export function formatValue(value: number): string {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < EPSILON) {
    const absolute = Math.abs(rounded);
    return rounded < 0 ? `−${absolute}` : String(absolute);
  }

  const sign = value < 0 ? '−' : '';
  const absolute = Math.abs(value);
  const whole = Math.floor(absolute);
  const fraction = absolute - whole;
  for (let denominator = 2; denominator <= 64; denominator += 1) {
    const numerator = Math.round(fraction * denominator);
    if (numerator <= 0 || numerator >= denominator) continue;
    if (Math.abs(fraction - numerator / denominator) < EPSILON) {
      return `${sign}${whole > 0 ? `${whole} ` : ''}${numerator}/${denominator}`;
    }
  }
  return `${sign}${absolute.toFixed(3)}`;
}

/**
 * Solver recursivo del juego de 24: combina pares con las cuatro operaciones
 * y comprueba si alguna combinación llega a 24. Las divisiones usan epsilon.
 */
export function canReach24(values: readonly number[]): boolean {
  if (values.length === 1) return Math.abs(values[0]! - TARGET) < EPSILON;

  for (let first = 0; first < values.length; first += 1) {
    for (let second = first + 1; second < values.length; second += 1) {
      const rest = values.filter((_, index) => index !== first && index !== second);
      const a = values[first]!;
      const b = values[second]!;
      const candidates = [a + b, a - b, b - a, a * b];
      if (Math.abs(b) > EPSILON) candidates.push(a / b);
      if (Math.abs(a) > EPSILON) candidates.push(b / a);

      for (const candidate of candidates) {
        if (canReach24([...rest, candidate])) return true;
      }
    }
  }
  return false;
}

/** Genera cuatro cifras con solución, evitando retos ya vistos. */
export function generatePuzzle(
  random: () => number = Math.random,
  seen: ReadonlySet<string> = new Set<string>(),
): number[] {
  for (let attempt = 0; attempt < 600; attempt += 1) {
    const values = Array.from({ length: 4 }, () => 1 + Math.floor(random() * 9));
    const key = [...values].sort((a, b) => a - b).join(',');
    if (seen.has(key)) continue;
    if (new Set(values).size === 1) continue;
    if (!canReach24(values)) continue;
    return values;
  }
  return [3, 3, 8, 8];
}
