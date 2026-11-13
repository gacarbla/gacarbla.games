import {
  BaseGame,
  FONT_MONO,
  FONT_SANS,
  PALETTE,
  alpha,
  clamp,
  damp,
  drawPuzzleBackground,
  drawPuzzleBoard,
  drawPuzzleCell,
  drawPuzzleFooter,
  drawPuzzleHeader,
  mulberry32,
  pointInButton,
  roundedRect,
  type GameContext,
  type GameModule,
  type PuzzleLayout,
  type UiButton,
  type View,
} from '../engine';
import {
  FLOOD_COLORS,
  FLOOD_MOVES,
  FLOOD_SIZE,
  floodBoard,
  floodedCount,
  floodedPercent,
  floodedRegion,
  floodScore,
  generateBoard,
  isFlooded,
  remainingMoves,
} from './logic';

const ACCENT = '#d9b95f';
/** Seis tintes de la paleta clara, separados para distinguirse a simple vista. */
const COLORS = ['#d9b95f', '#7fa98a', '#6f9db8', '#cf8a8a', '#9a80b5', '#d97c5b'] as const;

const HEADER_BOTTOM = 118;
const FOOTER_SPACE = 76;
const BUTTON_HEIGHT = 42;
const BUTTON_GAP = 8;
const BUTTONS_GAP = 22;
const INFO_TO_BOARD = 42;
const BAR_HEIGHT = 8;

interface FloodGeometry {
  layout: PuzzleLayout;
  statsY: number;
  barY: number;
  buttons: UiButton[];
}

class Flood extends BaseGame {
  private readonly random = mulberry32(Math.floor(Math.random() * 0x1_0000_0000));
  private board: number[] = [];
  private moves = 0;
  private pulse = 0;
  private displayPercent = 0;

  constructor(context: GameContext) {
    super(context);

    this.input.onPointerDown((point) => {
      if (this.state !== 'running') return;
      const geometry = this.geometry(this.runtime.view);
      for (let index = 0; index < geometry.buttons.length; index += 1) {
        const button = geometry.buttons[index];
        if (button && pointInButton(point.x, point.y, button)) {
          this.chooseColor(index);
          return;
        }
      }
    });

    this.input.onKeyDown((code, event) => {
      if (event.repeat) return;
      if (code === 'KeyR') {
        this.reset();
        this.setStatus('Partida reiniciada.');
        return;
      }
      const digit = /^(?:Digit|Numpad)([1-6])$/.exec(code);
      if (!digit) return;
      this.chooseColor(Number(digit[1]) - 1);
    });
  }

  protected reset(): void {
    this.board = generateBoard(this.random);
    this.moves = 0;
    this.pulse = 0;
    this.displayPercent = floodedPercent(this.board);
    this.setScore('INUNDADO', `${this.displayPercent}%`);
  }

  protected update(dt: number): void {
    const target = floodedPercent(this.board);
    this.displayPercent = this.reducedMotion ? target : damp(this.displayPercent, target, 8, dt);
    this.pulse = this.reducedMotion ? 0 : Math.max(0, this.pulse - dt * 2.4);
  }

  private geometry(view: View): FloodGeometry {
    const widthLimit = Math.min(view.width - 32, 700);
    const horizontal = widthLimit / FLOOD_SIZE;
    const vertical =
      (view.height - HEADER_BOTTOM - FOOTER_SPACE - INFO_TO_BOARD - BUTTONS_GAP - BUTTON_HEIGHT) /
      FLOOD_SIZE;
    const cell = clamp(Math.min(horizontal, vertical, 70), 18, 70);
    const boardSize = cell * FLOOD_SIZE;
    const stackHeight = INFO_TO_BOARD + boardSize + BUTTONS_GAP + BUTTON_HEIGHT;
    const available = view.height - HEADER_BOTTOM - FOOTER_SPACE;
    const startY = HEADER_BOTTOM + Math.max(0, (available - stackHeight) / 2);

    const layout: PuzzleLayout = {
      cols: FLOOD_SIZE,
      rows: FLOOD_SIZE,
      cell,
      x: (view.width - boardSize) / 2,
      y: startY + INFO_TO_BOARD,
      width: boardSize,
      height: boardSize,
    };

    const totalWidth = Math.min(view.width - 32, 420);
    const buttonWidth = (totalWidth - BUTTON_GAP * (FLOOD_COLORS - 1)) / FLOOD_COLORS;
    const startX = (view.width - totalWidth) / 2;
    const buttons = Array.from({ length: FLOOD_COLORS }, (_, index) => ({
      x: startX + index * (buttonWidth + BUTTON_GAP),
      y: layout.y + boardSize + BUTTONS_GAP,
      width: buttonWidth,
      height: BUTTON_HEIGHT,
    }));

    return {
      layout,
      statsY: startY + 9,
      barY: startY + 20,
      buttons,
    };
  }

  private chooseColor(color: number): void {
    if (this.state !== 'running' || this.board.length === 0) return;
    if (!Number.isInteger(color) || color < 0 || color >= FLOOD_COLORS) return;

    if (this.board[0] === color) {
      this.audio.tone(300, 0.04, { type: 'sine', gain: 0.028 });
      this.setStatus('Ese color ya ocupa la región inundada.');
      return;
    }

    const before = floodedCount(this.board);
    this.board = floodBoard(this.board, color);
    this.moves += 1;
    this.pulse = 1;

    const after = floodedCount(this.board);
    const percent = floodedPercent(this.board);
    this.setScore('INUNDADO', `${percent}%`);
    this.audio.tone(300 + color * 55, 0.09, { type: 'triangle', gain: 0.055 });

    if (isFlooded(this.board)) {
      this.finishWin();
      return;
    }

    if (this.moves >= FLOOD_MOVES) {
      this.finishLose();
      return;
    }

    this.setStatus(
      `Inundado el ${percent} por ciento. Quedan ${remainingMoves(this.moves)} movimientos. ${after - before} celdas nuevas.`,
    );
  }

  private finishWin(): void {
    const left = remainingMoves(this.moves);
    this.audio.chord([392, 494, 587], 0.5, { type: 'sine', gain: 0.09 });
    this.finish({
      title: 'Tablero inundado',
      message:
        left > 0
          ? `Has cubierto las 100 celdas con ${left} ${left === 1 ? 'movimiento' : 'movimientos'} de sobra.`
          : 'Has cubierto las 100 celdas justo en el último movimiento.',
      detail: `${this.moves} movimientos · ${left} de sobra`,
      score: floodScore(this.board, left),
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Jugar otra vez',
      tone: 'win',
    });
  }

  private finishLose(): void {
    const percent = floodedPercent(this.board);
    this.audio.tone(240, 0.32, { type: 'sine', gain: 0.05, slideTo: 180 });
    this.finish({
      title: 'Sin movimientos',
      message: `La región cubre el ${percent}% del tablero. Otra ruta de colores puede llegar más lejos.`,
      detail: `${this.moves} movimientos · ${percent}% inundado`,
      score: floodScore(this.board, 0),
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Reintentar',
      tone: 'lose',
    });
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, ACCENT);
    if (this.board.length === 0) return;

    const geometry = this.geometry(view);
    const { layout } = geometry;
    const region = floodedRegion(this.board);
    const flooded = new Set(region);
    const solved = isFlooded(this.board);
    const percent = solved ? 100 : Math.min(99, Math.round(this.displayPercent));
    const left = remainingMoves(this.moves);
    const current = COLORS[this.board[0] ?? 0] ?? ACCENT;

    drawPuzzleHeader(context, view, 'Inundación', 'Crece desde la esquina superior izquierda');

    context.save();
    context.font = `500 10px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.6);
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.fillText(`INUNDADO ${percent}%`, layout.x, geometry.statsY);
    context.textAlign = 'right';
    context.fillText(`QUEDAN ${left} MOVIMIENTOS`, layout.x + layout.width, geometry.statsY);
    context.restore();

    roundedRect(context, layout.x, geometry.barY, layout.width, BAR_HEIGHT, BAR_HEIGHT / 2);
    context.fillStyle = alpha(PALETTE.ink, 0.09);
    context.fill();
    const barWidth = (layout.width * Math.min(100, this.displayPercent)) / 100;
    if (barWidth > 1) {
      roundedRect(context, layout.x, geometry.barY, barWidth, BAR_HEIGHT, BAR_HEIGHT / 2);
      context.fillStyle = alpha(current, 0.9);
      context.fill();
    }

    drawPuzzleBoard(context, layout, { padding: 10 });

    for (let index = 0; index < this.board.length; index += 1) {
      const color = COLORS[this.board[index] ?? 0] ?? ACCENT;
      const inside = flooded.has(index);
      drawPuzzleCell(context, layout, index, {
        fill: inside ? color : alpha(color, 0.32),
        stroke: inside ? alpha(PALETTE.ink, 0.08) : 'none',
        strokeWidth: 1,
      });
    }

    if (this.pulse > 0.02) {
      const inset = Math.max(1.5, layout.cell * 0.035);
      const size = layout.cell - inset * 2;
      context.save();
      context.globalAlpha = this.pulse * 0.3;
      context.fillStyle = PALETTE.surface;
      for (const index of region) {
        const column = index % FLOOD_SIZE;
        const row = Math.floor(index / FLOOD_SIZE);
        roundedRect(
          context,
          layout.x + column * layout.cell + inset,
          layout.y + row * layout.cell + inset,
          size,
          size,
          size * 0.18,
        );
        context.fill();
      }
      context.restore();
    }

    geometry.buttons.forEach((button, index) => {
      const color = COLORS[index] ?? ACCENT;
      const active = this.board[0] === index;
      context.save();
      roundedRect(
        context,
        button.x,
        button.y,
        button.width,
        button.height,
        Math.min(12, button.height * 0.3),
      );
      context.fillStyle = alpha(color, active ? 0.6 : 0.92);
      context.fill();
      context.strokeStyle = active ? PALETTE.ink : alpha(PALETTE.ink, 0.16);
      context.lineWidth = active ? 2 : 1.4;
      context.stroke();
      context.font = `700 13px ${FONT_SANS}`;
      context.fillStyle = alpha(PALETTE.ink, active ? 0.9 : 0.75);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(
        String(index + 1),
        button.x + button.width / 2,
        button.y + button.height / 2 + 1,
      );
      context.restore();
    });

    drawPuzzleFooter(
      context,
      view,
      `MOVIMIENTOS ${this.moves}/${FLOOD_MOVES}`,
      `MEJOR ${this.best > 0 ? this.best : '—'}`,
      'Toca un color · teclas 1–6 · R reinicia',
    );
  }
}

export default {
  mount: (context: GameContext) => new Flood(context),
} satisfies GameModule;
