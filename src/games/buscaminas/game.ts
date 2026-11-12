import {
  BaseGame,
  FONT_MONO,
  PALETTE,
  alpha,
  clamp,
  cellAt,
  drawPuzzleBackground,
  drawPuzzleBoard,
  drawPuzzleCell,
  drawPuzzleFooter,
  drawPuzzleHeader,
  drawUiButton,
  pointInButton,
  puzzleLayout,
  type GameContext,
  type GameModule,
  type PuzzleLayout,
  type UiButton,
  type View,
} from '../engine';
import {
  MINE_COLS,
  MINE_COUNT,
  MINE_ROWS,
  MINE_SIZE,
  SAFE_COUNT,
  createMineBoard,
  flagCount,
  revealAllMines,
  revealCell,
  revealedSafeCount,
  toggleFlag,
  type MineBoard,
} from './logic';

interface MineGeometry {
  layout: PuzzleLayout;
  flagButton: UiButton;
}

interface LocalPoint {
  x: number;
  y: number;
}

const NUMBER_COLORS = [
  '',
  '#4d7f9b',
  '#2f5d50',
  '#b8952f',
  '#d97c5b',
  '#9a80b5',
  '#cf8a8a',
  '#5f6d64',
  '#24332d',
];

class Buscaminas extends BaseGame {
  private board: MineBoard = createMineBoard();
  private cursor = Math.floor(MINE_SIZE / 2);
  private flagMode = false;
  private score = 0;
  private over = false;
  private readonly canvas: HTMLCanvasElement;

  constructor(context: GameContext) {
    super(context);
    this.canvas = context.canvas;
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
    this.input.onPointerDown((point) => this.handlePointer(point));
    this.input.onKeyDown((code) => this.handleKey(code));
  }

  destroy(): void {
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    super.destroy();
  }

  protected reset(): void {
    this.board = createMineBoard();
    this.cursor = Math.floor(MINE_SIZE / 2);
    this.flagMode = false;
    this.score = 0;
    this.over = false;
    this.setScore('PUNTOS', 0);
  }

  private geometry(view: View): MineGeometry {
    const layout = puzzleLayout(view, MINE_COLS, MINE_ROWS, {
      top: 124,
      bottom: 168,
      widthRatio: 0.78,
      heightRatio: 0.5,
      maxCell: 54,
    });
    const width = clamp(view.width * 0.42, 124, 156);
    const height = 38;
    const y = Math.min(view.height - 94, layout.y + layout.height + 18);
    return {
      layout,
      flagButton: { x: (view.width - width) / 2, y, width, height },
    };
  }

  private handlePointer(point: LocalPoint): void {
    if (this.state !== 'running' || this.over) return;
    const geometry = this.geometry(this.runtime.view);
    if (pointInButton(point.x, point.y, geometry.flagButton)) {
      this.flagMode = !this.flagMode;
      this.audio.click();
      this.setStatus(this.flagMode ? 'Modo bandera activado.' : 'Modo bandera desactivado.');
      return;
    }
    const index = cellAt(geometry.layout, point.x, point.y);
    if (index === null) return;
    this.cursor = index;
    if (this.flagMode) this.mark(index);
    else this.open(index);
  }

  private handleContextMenu = (event: MouseEvent): void => {
    if (this.state !== 'running' || this.over) return;
    event.preventDefault();
    const rectangle = this.canvas.getBoundingClientRect();
    const geometry = this.geometry(this.runtime.view);
    const index = cellAt(
      geometry.layout,
      event.clientX - rectangle.left,
      event.clientY - rectangle.top,
    );
    if (index === null) return;
    this.cursor = index;
    this.mark(index);
  };

  private handleKey(code: string): void {
    if (this.state !== 'running' || this.over) return;
    const column = this.cursor % MINE_COLS;
    const row = Math.floor(this.cursor / MINE_COLS);

    if (code === 'ArrowLeft') {
      this.cursor = row * MINE_COLS + Math.max(0, column - 1);
      this.audio.tone(300, 0.03, { type: 'triangle', gain: 0.018 });
      return;
    }
    if (code === 'ArrowRight') {
      this.cursor = row * MINE_COLS + Math.min(MINE_COLS - 1, column + 1);
      this.audio.tone(320, 0.03, { type: 'triangle', gain: 0.018 });
      return;
    }
    if (code === 'ArrowUp') {
      this.cursor = Math.max(0, row - 1) * MINE_COLS + column;
      this.audio.tone(300, 0.03, { type: 'triangle', gain: 0.018 });
      return;
    }
    if (code === 'ArrowDown') {
      this.cursor = Math.min(MINE_ROWS - 1, row + 1) * MINE_COLS + column;
      this.audio.tone(320, 0.03, { type: 'triangle', gain: 0.018 });
      return;
    }
    if (code === 'KeyF') {
      this.mark(this.cursor);
      return;
    }
    if (code === 'Space' || code === 'Enter') {
      this.open(this.cursor);
    }
  }

  private mark(index: number): void {
    if (this.over || this.board.revealed[index]) return;
    const flagged = toggleFlag(this.board, index);
    this.audio.tone(flagged ? 520 : 340, 0.05, { type: 'triangle', gain: 0.035 });
    this.setStatus(flagged ? 'Bandera colocada.' : 'Bandera retirada.');
  }

  private open(index: number): void {
    if (this.over) return;
    const result = revealCell(this.board, index);
    if (result.hitMine) {
      this.lose();
      return;
    }
    if (result.opened === 0) return;

    this.cursor = index;
    this.score = revealedSafeCount(this.board) * 10;
    this.setScore('PUNTOS', this.score);
    this.audio.tone(420 + Math.min(result.opened, 8) * 24, 0.07, {
      type: 'triangle',
      gain: 0.03,
    });
    if (result.opened > 3) {
      this.audio.noise(0.09, { gain: 0.018, filter: 'lowpass', frequency: 720 });
    }

    if (revealedSafeCount(this.board) === SAFE_COUNT) this.win();
  }

  private win(): void {
    this.over = true;
    this.score = SAFE_COUNT * 10 + 500;
    this.setScore('PUNTOS', this.score);
    this.setStatus(`Campo despejado. ${this.score} puntos.`);
    this.audio.chord([392, 494, 587], 0.55, { type: 'sine', gain: 0.1 });
    this.finish({
      title: 'Campo despejado',
      message: 'Has deducido todas las casillas seguras sin pisar una mina.',
      detail: `${SAFE_COUNT} casillas · 12 minas · bonus +500`,
      score: this.score,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Otra partida',
      tone: 'win',
    });
  }

  private lose(): void {
    this.over = true;
    revealAllMines(this.board);
    this.score = revealedSafeCount(this.board) * 10;
    this.setScore('PUNTOS', this.score);
    this.setStatus('Una mina. La partida termina.');
    this.audio.tone(210, 0.3, { type: 'sine', gain: 0.08, slideTo: 120 });
    this.audio.noise(0.3, { gain: 0.05, filter: 'lowpass', frequency: 420 });
    this.finish({
      title: 'Una mina',
      message: 'El tablero queda al descubierto. La próxima vez, cuenta las banderas.',
      detail: `${revealedSafeCount(this.board)} casillas seguras de ${SAFE_COUNT}`,
      score: this.score,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Reintentar',
      tone: 'lose',
    });
  }

  protected update(): void {
    // El buscaminas es por turnos: no necesita simulación continua.
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, '#7fa9c2');
    drawPuzzleHeader(context, view, 'BUSCAMINAS', '12 minas · primer clic seguro');
    const geometry = this.geometry(view);
    const { layout } = geometry;

    drawPuzzleBoard(context, layout);

    context.save();
    context.font = `600 10px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.62);
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.fillText(`MINAS ${MINE_COUNT}`, layout.x, layout.y - 17);
    context.textAlign = 'right';
    context.fillText(`BANDERAS ${flagCount(this.board)}`, layout.x + layout.width, layout.y - 17);
    context.restore();

    for (let index = 0; index < MINE_SIZE; index += 1) {
      this.drawCell(context, layout, index);
    }

    drawUiButton(context, geometry.flagButton, 'BANDERA', {
      active: this.flagMode,
      accent: PALETTE.sky,
    });

    drawPuzzleFooter(
      context,
      view,
      `SEGURAS ${revealedSafeCount(this.board)}/${SAFE_COUNT}`,
      `PUNTOS ${this.score}`,
      'CLIC DESCUBRE · DERECHO / F BANDERA',
    );
  }

  private drawCell(context: CanvasRenderingContext2D, layout: PuzzleLayout, index: number): void {
    const revealed = this.board.revealed[index]!;
    const flagged = this.board.flags[index]!;
    const cursor = index === this.cursor && this.state === 'running' && !this.over;
    const column = index % MINE_COLS;
    const row = Math.floor(index / MINE_COLS);
    const x = layout.x + column * layout.cell;
    const y = layout.y + row * layout.cell;

    if (!revealed) {
      drawPuzzleCell(context, layout, index, {
        fill: '#e4e8df',
        stroke: cursor ? PALETTE.sky : 'rgba(36, 51, 45, 0.12)',
        strokeWidth: cursor ? 2 : 1.3,
      });
      if (flagged) {
        this.drawFlag(context, x + layout.cell / 2, y + layout.cell / 2, layout.cell * 0.3);
      }
      return;
    }

    if (this.board.mines[index]) {
      drawPuzzleCell(context, layout, index, {
        fill: alpha(PALETTE.apricot, 0.2),
        stroke: alpha(PALETTE.apricot, 0.5),
      });
      this.drawMine(
        context,
        x + layout.cell / 2,
        y + layout.cell / 2,
        layout.cell * 0.32,
        PALETTE.apricot,
      );
      return;
    }

    const count = this.board.counts[index]!;
    drawPuzzleCell(context, layout, index, {
      fill: count === 0 ? '#f5f1e6' : '#fffdf8',
      stroke: 'rgba(36, 51, 45, 0.08)',
      text: count > 0 ? String(count) : '',
      textColor: NUMBER_COLORS[count] ?? PALETTE.ink,
      strokeWidth: cursor ? 2 : 1,
    });
    if (cursor) {
      drawPuzzleCell(context, layout, index, {
        fill: 'rgba(0, 0, 0, 0)',
        stroke: PALETTE.sky,
        strokeWidth: 2,
      });
    }
    if (this.over && flagged && !this.board.mines[index]) {
      this.drawCross(context, x + layout.cell / 2, y + layout.cell / 2, layout.cell * 0.18);
    }
  }

  private drawFlag(context: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
    context.save();
    context.strokeStyle = PALETTE.inkSoft;
    context.fillStyle = PALETTE.apricot;
    context.lineWidth = Math.max(1.4, size * 0.16);
    context.beginPath();
    context.moveTo(cx - size * 0.1, cy - size * 1.1);
    context.lineTo(cx - size * 0.1, cy + size * 0.9);
    context.stroke();
    context.beginPath();
    context.moveTo(cx - size * 0.1, cy - size * 1.1);
    context.lineTo(cx + size * 1.05, cy - size * 0.6);
    context.lineTo(cx - size * 0.1, cy - size * 0.05);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(cx - size * 0.5, cy + size * 0.9);
    context.lineTo(cx + size * 0.35, cy + size * 0.9);
    context.stroke();
    context.restore();
  }

  private drawMine(
    context: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    color: string,
  ): void {
    context.save();
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = Math.max(1.2, radius * 0.18);
    context.beginPath();
    context.arc(cx, cy, radius * 0.58, 0, Math.PI * 2);
    context.fill();
    for (let index = 0; index < 8; index += 1) {
      const angle = (index * Math.PI) / 4;
      context.beginPath();
      context.moveTo(cx + Math.cos(angle) * radius * 0.78, cy + Math.sin(angle) * radius * 0.78);
      context.lineTo(cx + Math.cos(angle) * radius * 1.18, cy + Math.sin(angle) * radius * 1.18);
      context.stroke();
    }
    context.fillStyle = alpha(PALETTE.surface, 0.85);
    context.beginPath();
    context.arc(cx - radius * 0.18, cy - radius * 0.2, radius * 0.16, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  private drawCross(context: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
    context.save();
    context.strokeStyle = PALETTE.apricot;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(cx - size, cy - size);
    context.lineTo(cx + size, cy + size);
    context.moveTo(cx + size, cy - size);
    context.lineTo(cx - size, cy + size);
    context.stroke();
    context.restore();
  }
}

export default {
  mount: (context: GameContext) => new Buscaminas(context),
} satisfies GameModule;
