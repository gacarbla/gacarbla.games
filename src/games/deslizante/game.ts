import {
  BaseGame,
  FONT_MONO,
  FONT_SANS,
  PALETTE,
  alpha,
  cellAt,
  drawPuzzleBackground,
  drawPuzzleBoard,
  drawPuzzleFooter,
  drawPuzzleHeader,
  puzzleLayout,
  roundedRect,
  type GameContext,
  type GameModule,
  type PuzzleLayout,
  type View,
} from '../engine';
import {
  SLIDE_SIZE,
  adjacentCells,
  canSlide,
  blankIndex,
  isSolved,
  shuffleBoard,
  slide,
} from './logic';

const LAYOUT = {
  top: 118,
  bottom: 92,
  maxCell: 86,
  widthRatio: 0.78,
  heightRatio: 0.52,
} as const;

class Deslizante extends BaseGame {
  private tiles: number[] = [];
  private moves = 0;

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => {
      const index = cellAt(this.layout(this.runtime.view), point.x, point.y);
      if (index !== null) this.trySlide(index);
    });
    this.input.onKeyDown((code, event) => {
      if (event.repeat) return;
      this.handleKey(code);
    });
  }

  protected reset(): void {
    this.tiles = shuffleBoard().tiles;
    this.moves = 0;
    this.setScore('MOVIMIENTOS', 0);
  }

  protected update(): void {
    // Sin animaciones: el tablero solo cambia con cada deslizamiento legal.
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, PALETTE.violet);
    const layout = this.layout(view);

    drawPuzzleHeader(
      context,
      view,
      'Deslizante',
      `${this.moves} movimiento${this.moves === 1 ? '' : 's'} · ordena del 1 al 15`,
    );
    drawPuzzleBoard(context, layout, { padding: 10 });

    const blank = blankIndex(this.tiles);
    const movable = new Set(adjacentCells(blank));
    const cell = layout.cell;
    const inset = Math.max(2.5, cell * 0.055);
    const size = cell - inset * 2;

    for (let index = 0; index < this.tiles.length; index += 1) {
      const tile = this.tiles[index]!;
      const column = index % SLIDE_SIZE;
      const row = Math.floor(index / SLIDE_SIZE);
      const x = layout.x + column * cell + inset;
      const y = layout.y + row * cell + inset;

      if (tile === 0) {
        roundedRect(context, x, y, size, size, size * 0.16);
        context.fillStyle = alpha(PALETTE.ink, 0.035);
        context.fill();
        context.setLineDash([5, 5]);
        context.strokeStyle = alpha(PALETTE.ink, 0.14);
        context.lineWidth = 1.5;
        context.stroke();
        context.setLineDash([]);
        continue;
      }

      const canMove = movable.has(index);
      context.save();
      context.shadowColor = alpha(PALETTE.ink, 0.13);
      context.shadowBlur = 8;
      context.shadowOffsetY = 3;
      roundedRect(context, x, y, size, size, size * 0.16);
      context.fillStyle = canMove ? '#f8f3e7' : PALETTE.surface;
      context.fill();
      context.restore();

      roundedRect(context, x, y, size, size, size * 0.16);
      context.strokeStyle = canMove ? alpha(PALETTE.violet, 0.5) : alpha(PALETTE.ink, 0.13);
      context.lineWidth = canMove ? 2 : 1.3;
      context.stroke();

      context.save();
      context.font = `700 ${size * 0.38}px ${FONT_MONO}`;
      context.fillStyle = canMove ? PALETTE.violet : PALETTE.ink;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(String(tile), x + size / 2, y + size / 2 + 1);
      context.restore();
    }

    drawPuzzleFooter(
      context,
      view,
      `MOVIMIENTOS ${this.moves}`,
      `PUNTOS ${Math.max(0, 2000 - this.moves * 8)}`,
      'Clic o flechas para deslizar · R reiniciar',
    );

    context.save();
    context.font = `500 9px ${FONT_SANS}`;
    context.fillStyle = alpha(PALETTE.ink, 0.42);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(
      'Las piezas con borde violeta pueden entrar en el hueco.',
      view.width / 2,
      view.height - 60,
    );
    context.restore();
  }

  private layout(view: View): PuzzleLayout {
    return puzzleLayout(view, SLIDE_SIZE, SLIDE_SIZE, LAYOUT);
  }

  private handleKey(code: string): void {
    if (code === 'KeyR') {
      this.reset();
      return;
    }

    const blank = blankIndex(this.tiles);
    const column = blank % SLIDE_SIZE;
    const row = Math.floor(blank / SLIDE_SIZE);
    let target = -1;
    if (code === 'ArrowLeft' && column < SLIDE_SIZE - 1) target = blank + 1;
    if (code === 'ArrowRight' && column > 0) target = blank - 1;
    if (code === 'ArrowUp' && row < SLIDE_SIZE - 1) target = blank + SLIDE_SIZE;
    if (code === 'ArrowDown' && row > 0) target = blank - SLIDE_SIZE;
    if (target >= 0) this.trySlide(target);
  }

  private trySlide(index: number): void {
    if (!canSlide(this.tiles, index)) return;
    const tile = this.tiles[index]!;
    const next = slide(this.tiles, index);
    if (!next) return;

    this.tiles = next;
    this.moves += 1;
    this.setScore('MOVIMIENTOS', this.moves);
    this.audio.tone(330 + tile * 18, 0.05, { type: 'triangle', gain: 0.05 });

    if (!isSolved(this.tiles)) return;
    const score = Math.max(0, 2000 - this.moves * 8);
    this.audio.chord([523.25, 659.25, 783.99, 1046.5], 0.5, {
      type: 'triangle',
      gain: 0.1,
    });
    this.finish({
      title: 'Puzzle ordenado',
      message:
        this.moves <= 120
          ? 'Has deshecho el desorden en menos de lo que costó crearlo.'
          : `Has ordenado las quince piezas en ${this.moves} movimientos.`,
      detail: `${this.moves} movimientos`,
      score,
      scoreLabel: 'PUNTOS',
      tone: 'win',
    });
  }
}

export default {
  mount: (context: GameContext) => new Deslizante(context),
} satisfies GameModule;
