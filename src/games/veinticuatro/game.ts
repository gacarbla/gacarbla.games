import {
  BaseGame,
  FONT_MONO,
  FONT_SANS,
  PALETTE,
  alpha,
  clamp,
  drawPuzzleBackground,
  drawPuzzleFooter,
  drawPuzzleHeader,
  drawUiButton,
  pointInButton,
  roundedRect,
  type GameContext,
  type GameModule,
  type UiButton,
  type View,
} from '../engine';
import {
  EPSILON,
  OPERATORS,
  TARGET,
  apply,
  formatValue,
  generatePuzzle,
  type Operator,
} from './logic';

const OP_KEYS: Record<string, Operator> = {
  Equal: 'add',
  NumpadAdd: 'add',
  Minus: 'sub',
  NumpadSubtract: 'sub',
  KeyX: 'mul',
  Digit8: 'mul',
  NumpadMultiply: 'mul',
  Slash: 'div',
  NumpadDivide: 'div',
};

interface CardGeometry {
  size: number;
  gap: number;
  startX: number;
  y: number;
}

class Veinticuatro extends BaseGame {
  private cards: number[] = [];
  private first: number | null = null;
  private operator: Operator | null = null;
  private solved = 0;
  private round = 1;
  private freeze = 0;
  private note = '';
  private readonly seen = new Set<string>();

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => this.handlePointer(point.x, point.y));
    this.input.onKeyDown((code, event) => {
      if (event.repeat) return;
      this.handleKey(code);
    });
  }

  protected reset(): void {
    this.cards = [];
    this.first = null;
    this.operator = null;
    this.solved = 0;
    this.round = 1;
    this.freeze = 0;
    this.seen.clear();
    this.setScore('ACERTIJOS', 0);
    this.nextPuzzle();
  }

  protected update(dt: number): void {
    if (this.freeze <= 0) return;
    this.freeze -= dt;
    if (this.freeze <= 0) {
      this.freeze = 0;
      this.round += 1;
      this.nextPuzzle();
    }
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, PALETTE.rose);
    drawPuzzleHeader(
      context,
      view,
      'Veinticuatro',
      `Ronda ${this.round} · ${this.solved} acierto${this.solved === 1 ? '' : 's'}`,
    );

    const geometry = this.cardGeometry(view);
    if (this.note) {
      context.save();
      context.font = `500 10px ${FONT_SANS}`;
      context.fillStyle = alpha(PALETTE.ink, 0.62);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(this.note, view.width / 2, geometry.y - 20);
      context.restore();
    }

    const rects = this.cardRects(view);
    this.cards.forEach((value, index) => {
      const rect = rects[index]!;
      const selected = this.first === index;
      const raised = selected ? 4 : 0;
      const y = rect.y - raised;
      const label = formatValue(value);

      context.save();
      context.shadowColor = alpha(PALETTE.ink, 0.1);
      context.shadowBlur = 10;
      context.shadowOffsetY = selected ? 6 : 3;
      roundedRect(context, rect.x, y, rect.width, rect.height, 14);
      context.fillStyle = selected ? alpha(PALETTE.rose, 0.22) : PALETTE.surface;
      context.fill();
      context.restore();

      roundedRect(context, rect.x, y, rect.width, rect.height, 14);
      context.strokeStyle = selected ? PALETTE.rose : alpha(PALETTE.ink, 0.14);
      context.lineWidth = selected ? 2 : 1.5;
      context.stroke();

      context.save();
      context.font = `600 8px ${FONT_MONO}`;
      context.fillStyle = alpha(PALETTE.ink, 0.38);
      context.textAlign = 'left';
      context.textBaseline = 'top';
      context.fillText(String(index + 1), rect.x + 9, y + 8);

      const scale = label.length > 5 ? 0.2 : label.length > 3 ? 0.24 : 0.34;
      const fontSize = rect.width * scale;
      context.font = `700 ${fontSize}px ${FONT_MONO}`;
      context.fillStyle = PALETTE.ink;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(label, rect.x + rect.width / 2, y + rect.height / 2 + 1);
      context.restore();
    });

    const operatorRects = this.operatorRects(view);
    OPERATORS.forEach((operator, index) => {
      drawUiButton(context, operatorRects[index]!, operator.symbol, {
        active: this.operator === operator.id,
        accent: PALETTE.rose,
        disabled: this.cards.length < 2,
      });
    });

    drawUiButton(context, this.resetRect(view), 'Reiniciar', { accent: PALETTE.rose });

    drawPuzzleFooter(
      context,
      view,
      'R · reiniciar',
      `ACERTIJOS ${this.solved}`,
      '1–4 cartas · + − × ÷ operadores',
    );
  }

  private cardGeometry(view: View): CardGeometry {
    const count = Math.max(1, this.cards.length);
    const size = clamp(Math.min(view.width * 0.16, view.height * 0.18, 96), 44, 96);
    const gap = clamp(size * 0.14, 8, 16);
    const total = count * size + (count - 1) * gap;
    const operatorSize = clamp(size * 0.58, 36, 54);
    const block =
      size +
      clamp(view.height * 0.05, 18, 38) +
      operatorSize +
      clamp(view.height * 0.035, 16, 30) +
      32;
    const available = view.height - 126 - 84;
    return {
      size,
      gap,
      startX: (view.width - total) / 2,
      y: 126 + Math.max(0, (available - block) / 2),
    };
  }

  private cardRects(view: View): UiButton[] {
    const geometry = this.cardGeometry(view);
    return this.cards.map((_, index) => ({
      x: geometry.startX + index * (geometry.size + geometry.gap),
      y: geometry.y,
      width: geometry.size,
      height: geometry.size,
    }));
  }

  private operatorRects(view: View): UiButton[] {
    const geometry = this.cardGeometry(view);
    const size = clamp(geometry.size * 0.58, 36, 54);
    const gap = clamp(size * 0.24, 8, 14);
    const total = OPERATORS.length * size + (OPERATORS.length - 1) * gap;
    const x = (view.width - total) / 2;
    const y = geometry.y + geometry.size + clamp(view.height * 0.05, 18, 38);
    return OPERATORS.map((_, index) => ({
      x: x + index * (size + gap),
      y,
      width: size,
      height: size,
    }));
  }

  private resetRect(view: View): UiButton {
    const first = this.operatorRects(view)[0]!;
    const width = Math.min(150, view.width * 0.46);
    return {
      x: (view.width - width) / 2,
      y: first.y + first.height + clamp(view.height * 0.035, 16, 30),
      width,
      height: 32,
    };
  }

  private handlePointer(x: number, y: number): void {
    if (this.freeze > 0) return;

    if (pointInButton(x, y, this.resetRect(this.runtime.view))) {
      this.reset();
      return;
    }

    const rects = this.cardRects(this.runtime.view);
    for (let index = 0; index < rects.length; index += 1) {
      if (pointInButton(x, y, rects[index]!)) {
        this.selectCard(index);
        return;
      }
    }

    const operators = this.operatorRects(this.runtime.view);
    for (let index = 0; index < operators.length; index += 1) {
      if (pointInButton(x, y, operators[index]!)) {
        this.chooseOperator(OPERATORS[index]!.id);
        return;
      }
    }
  }

  private handleKey(code: string): void {
    if (code === 'KeyR') {
      this.reset();
      return;
    }
    if (this.freeze > 0) return;

    const operator = OP_KEYS[code];
    if (operator) {
      this.chooseOperator(operator);
      return;
    }

    if (code === 'Backspace') {
      this.first = null;
      this.operator = null;
      this.note = 'Selección cancelada.';
      return;
    }

    const number = code.startsWith('Digit')
      ? Number(code.slice(5))
      : code.startsWith('Numpad')
        ? Number(code.slice(6))
        : 0;
    if (Number.isInteger(number) && number >= 1 && number <= 4 && number <= this.cards.length) {
      this.selectCard(number - 1);
    }
  }

  private selectCard(index: number): void {
    if (this.freeze > 0 || index < 0 || index >= this.cards.length) return;
    const value = this.cards[index]!;

    if (this.first === null) {
      this.first = index;
      this.note = `Elegido ${formatValue(value)}. Elige operador y otra carta.`;
      this.audio.tone(520, 0.07, { type: 'triangle', gain: 0.06 });
      return;
    }

    if (this.first === index) {
      this.first = null;
      this.operator = null;
      this.note = 'Selección cancelada.';
      return;
    }

    if (this.operator === null) {
      this.first = index;
      this.note = `Elegido ${formatValue(value)}. Elige operador.`;
      this.audio.tone(520, 0.07, { type: 'triangle', gain: 0.06 });
      return;
    }

    this.combine(this.first, index);
  }

  private chooseOperator(operator: Operator): void {
    if (this.freeze > 0 || this.cards.length < 2) return;
    this.operator = operator;
    const symbol = OPERATORS.find((entry) => entry.id === operator)?.symbol ?? '';
    this.note =
      this.first === null
        ? `Operador ${symbol}. Elige la primera carta.`
        : `${formatValue(this.cards[this.first]!)} ${symbol} … elige otra carta.`;
    this.audio.tone(610, 0.05, { type: 'sine', gain: 0.05 });
  }

  private combine(firstIndex: number, secondIndex: number): void {
    const operator = this.operator;
    if (!operator) return;

    const left = this.cards[firstIndex]!;
    const right = this.cards[secondIndex]!;
    if (operator === 'div' && Math.abs(right) < EPSILON) {
      this.note = 'No se puede dividir entre cero.';
      this.audio.tone(180, 0.1, { type: 'sine', gain: 0.05 });
      return;
    }

    const symbol = OPERATORS.find((entry) => entry.id === operator)?.symbol ?? '';
    const result = apply(left, right, operator);
    const rest = this.cards.filter((_, index) => index !== firstIndex && index !== secondIndex);
    rest.push(result);

    this.cards = rest;
    this.first = null;
    this.operator = null;
    this.note = `${formatValue(left)} ${symbol} ${formatValue(right)} = ${formatValue(result)}`;

    if (rest.length === 1) {
      if (Math.abs(result - TARGET) < EPSILON) {
        this.solved += 1;
        this.setScore('ACERTIJOS', this.solved);
        this.freeze = 1;
        this.note = '¡24! Preparando otro reto…';
        this.audio.chord([523.25, 659.25, 783.99, 1046.5], 0.45, {
          type: 'triangle',
          gain: 0.1,
        });
      } else {
        this.finish({
          title: 'No llegaste a 24',
          message:
            this.solved > 0
              ? `Has resuelto ${this.solved} acertijo${this.solved === 1 ? '' : 's'}.`
              : 'Esta combinación no llegaba a 24.',
          detail: `Ronda ${this.round}`,
          score: this.solved,
          scoreLabel: 'ACERTIJOS',
          tone: 'lose',
        });
      }
      return;
    }

    this.audio.tone(clamp(340 + Math.abs(result) * 24, 220, 760), 0.07, {
      type: 'triangle',
      gain: 0.06,
    });
  }

  private nextPuzzle(): void {
    this.cards = this.pickValues();
    this.first = null;
    this.operator = null;
    this.note = 'Elige una carta, un operador y otra carta.';
  }

  private pickValues(): number[] {
    while (this.seen.size >= 320) {
      const oldest = this.seen.values().next().value;
      if (oldest === undefined) break;
      this.seen.delete(oldest);
    }

    for (let attempt = 0; attempt < 80; attempt += 1) {
      const values = generatePuzzle(Math.random, this.seen);
      const key = [...values].sort((a, b) => a - b).join(',');
      if (this.seen.has(key)) continue;
      this.seen.add(key);
      return values;
    }
    return [3, 3, 8, 8];
  }
}

export default {
  mount: (context: GameContext) => new Veinticuatro(context),
} satisfies GameModule;
