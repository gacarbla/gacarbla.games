import {
  BaseGame,
  FONT_SANS,
  PALETTE,
  alpha,
  drawPuzzleBackground,
  drawPuzzleBoard,
  drawPuzzleCell,
  drawPuzzleFooter,
  puzzleLayout,
  roundedRect,
  shuffle,
  type GameContext,
  type GameModule,
  type View,
} from '../engine';

const COLUMNS = 6;
const ROWS = 5;
const PAIRS = 15;
const PREVIEW_SECONDS = 4;
const MISS_DELAY = 0.7;
const START_SCORE = 1600;
const PENALTY = 30;

const GLYPHS = ['✦', '☾', '◆', '▲', '●', '■', '✿', '❖', '✚', '☂', '♠', '♣', '♥', '♦', '✧'] as const;

const COLORS = [
  '#d97c5b',
  '#5f8fa8',
  '#9279ad',
  '#b8952f',
  '#6f9a80',
  '#c17c7c',
  '#4d7f9b',
  '#8a6ba8',
  '#a58235',
  '#4f8574',
  '#bc6f60',
  '#70809e',
  '#9a8154',
  '#5f8b80',
  '#a9778d',
] as const;

type CardState = 'hidden' | 'up' | 'matched';

interface Card {
  pair: number;
  state: CardState;
}

class Memoria extends BaseGame {
  private cards: Card[] = [];
  private open: number[] = [];
  private attempts = 0;
  private preview = PREVIEW_SECONDS;
  private clock = 0;
  private hideAt = -1;
  private cursor = -1;
  private done = false;

  constructor(context: GameContext) {
    super(context);

    this.input.onPointerDown((point) => {
      const layout = puzzleLayout(this.runtime.view, COLUMNS, ROWS, {
        maxCell: 84,
        top: 118,
        bottom: 70,
      });
      const column = Math.floor((point.x - layout.x) / layout.cell);
      const row = Math.floor((point.y - layout.y) / layout.cell);
      if (column < 0 || column >= COLUMNS || row < 0 || row >= ROWS) return;
      this.cursor = -1;
      this.flip(row * COLUMNS + column);
    });

    this.input.onKeyDown((code) => {
      if (
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown'
      ) {
        this.moveCursor(code);
        return;
      }
      if (code === 'Enter' || code === 'Space') {
        const index = this.cursor < 0 ? 0 : this.cursor;
        this.cursor = index;
        this.flip(index);
      }
    });
  }

  protected reset(): void {
    const deck = shuffle(Array.from({ length: PAIRS * 2 }, (_, index) => Math.floor(index / 2)));
    this.cards = deck.map((pair) => ({ pair, state: 'hidden' }));
    this.open = [];
    this.attempts = 0;
    this.preview = PREVIEW_SECONDS;
    this.clock = 0;
    this.hideAt = -1;
    this.cursor = -1;
    this.done = false;
    this.setScore('PUNTOS', START_SCORE);
  }

  protected update(dt: number): void {
    if (this.done) return;
    this.clock += dt;

    if (this.preview > 0) {
      this.preview = Math.max(0, this.preview - dt);
      if (this.preview === 0) {
        this.audio.noise(0.18, { gain: 0.035, frequency: 700 });
        this.setStatus('Las cartas se han ocultado. Busca las parejas.');
      }
      return;
    }

    if (this.hideAt >= 0 && this.clock >= this.hideAt) {
      for (const index of this.open) {
        const card = this.cards[index];
        if (card && card.state === 'up') card.state = 'hidden';
      }
      this.open = [];
      this.hideAt = -1;
    }
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    const accent = '#df8b6c';
    drawPuzzleBackground(context, view, accent);

    const layout = puzzleLayout(view, COLUMNS, ROWS, {
      maxCell: 84,
      top: 118,
      bottom: 70,
    });
    drawPuzzleBoard(context, layout);

    const previewing = this.preview > 0;
    const matched = this.matchedPairs();
    const score = this.score();

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = PALETTE.ink;
    context.font = `600 15px ${FONT_SANS}`;
    context.fillText(
      previewing ? 'Memoriza las cartas' : `${matched} de ${PAIRS} parejas`,
      view.width / 2,
      78,
    );
    context.fillStyle = alpha(PALETTE.ink, 0.58);
    context.font = `500 11px ${FONT_SANS}`;
    context.fillText(
      previewing
        ? `Se ocultan en ${Math.ceil(this.preview)} s · ${score} pts en juego`
        : `${this.attempts} intentos · ${score} pts`,
      view.width / 2,
      98,
    );
    context.restore();

    for (let index = 0; index < this.cards.length; index += 1) {
      const card = this.cards[index]!;
      const color = COLORS[card.pair] ?? PALETTE.forest;
      const glyph = GLYPHS[card.pair] ?? '✦';
      const revealed = previewing || card.state !== 'hidden';
      const isMatched = card.state === 'matched';

      if (revealed) {
        drawPuzzleCell(context, layout, index, {
          fill: isMatched ? alpha(color, 0.2) : '#fffdf8',
          stroke: alpha(color, isMatched ? 0.55 : 0.32),
          strokeWidth: isMatched ? 2 : 1.4,
          text: glyph,
          textColor: color,
          fontSize: layout.cell * 0.42,
          alpha: previewing ? 0.92 : 1,
        });
      } else {
        drawPuzzleCell(context, layout, index, {
          fill: '#eee4d4',
          stroke: 'rgba(36, 51, 45, 0.14)',
        });
        const column = index % COLUMNS;
        const row = Math.floor(index / COLUMNS);
        const x = layout.x + column * layout.cell + layout.cell / 2;
        const y = layout.y + row * layout.cell + layout.cell / 2;
        const radius = layout.cell * 0.16;
        context.save();
        context.beginPath();
        context.moveTo(x, y - radius);
        context.lineTo(x + radius, y);
        context.lineTo(x, y + radius);
        context.lineTo(x - radius, y);
        context.closePath();
        context.fillStyle = alpha(PALETTE.forest, 0.18);
        context.fill();
        context.restore();
      }
    }

    if (this.cursor >= 0) {
      const column = this.cursor % COLUMNS;
      const row = Math.floor(this.cursor / COLUMNS);
      const inset = 3;
      context.save();
      roundedRect(
        context,
        layout.x + column * layout.cell + inset,
        layout.y + row * layout.cell + inset,
        layout.cell - inset * 2,
        layout.cell - inset * 2,
        layout.cell * 0.16,
      );
      context.strokeStyle = alpha(PALETTE.forest, 0.85);
      context.lineWidth = 2.5;
      context.stroke();
      context.restore();
    }

    drawPuzzleFooter(
      context,
      view,
      `Intentos ${this.attempts}`,
      `${matched}/${PAIRS} parejas`,
      previewing ? 'Observa con calma' : 'Toca dos cartas',
    );
  }

  private matchedPairs(): number {
    return this.cards.filter((card) => card.state === 'matched').length / 2;
  }

  private score(): number {
    return Math.max(0, START_SCORE - this.attempts * PENALTY);
  }

  private flip(index: number): void {
    if (this.done || this.preview > 0 || this.hideAt >= 0) return;
    const card = this.cards[index];
    if (!card || card.state !== 'hidden') return;

    card.state = 'up';
    this.open.push(index);
    this.audio.click();

    if (this.open.length < 2) return;

    const firstIndex = this.open[0]!;
    const secondIndex = this.open[1]!;
    const first = this.cards[firstIndex]!;
    const second = this.cards[secondIndex]!;
    this.attempts += 1;
    this.setScore('PUNTOS', this.score());

    if (first.pair === second.pair) {
      first.state = 'matched';
      second.state = 'matched';
      this.open = [];
      this.audio.chord([523.25, 659.25, 783.99], 0.32, { gain: 0.09 });
      const matched = this.matchedPairs();
      this.setStatus(`Pareja encontrada. ${matched} de ${PAIRS}.`);
      if (matched === PAIRS) {
        this.done = true;
        this.finish({
          title: 'Memoria completa',
          message: 'Las quince parejas están sobre la mesa.',
          detail: `${this.attempts} intentos`,
          score: this.score(),
          scoreLabel: 'PUNTOS',
          tone: 'win',
        });
      }
    } else {
      this.hideAt = this.clock + MISS_DELAY;
      this.audio.tone(230, 0.1, { type: 'triangle', gain: 0.05, slideTo: 185 });
      this.setStatus('No coinciden. Se ocultan de nuevo.');
    }
  }

  private moveCursor(code: string): void {
    if (this.cursor < 0) {
      this.cursor = 0;
      return;
    }
    const column = this.cursor % COLUMNS;
    const row = Math.floor(this.cursor / COLUMNS);
    if (code === 'ArrowLeft') this.cursor = row * COLUMNS + Math.max(0, column - 1);
    if (code === 'ArrowRight') this.cursor = row * COLUMNS + Math.min(COLUMNS - 1, column + 1);
    if (code === 'ArrowUp') this.cursor = Math.max(0, row - 1) * COLUMNS + column;
    if (code === 'ArrowDown') this.cursor = Math.min(ROWS - 1, row + 1) * COLUMNS + column;
    this.audio.click();
  }
}

export default {
  mount: (context: GameContext) => new Memoria(context),
} satisfies GameModule;
