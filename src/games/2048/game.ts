import {
  BaseGame,
  FONT_MONO,
  PALETTE,
  alpha,
  clamp,
  drawPuzzleBackground,
  drawPuzzleBoard,
  drawPuzzleFooter,
  drawPuzzleHeader,
  drawUiButton,
  pointInButton,
  puzzleLayout,
  roundedRect,
  type GameContext,
  type GameModule,
  type PuzzleLayout,
  type UiButton,
  type View,
} from '../engine';
import {
  CELL_COUNT,
  SIZE,
  createBoard,
  hasMoves,
  maxTile,
  move as moveBoard,
  type Direction,
} from './logic';

const ACCENT = '#df8b6c';
const SPAWN_TIME = 0.18;
const MERGE_TIME = 0.24;

interface TileColor {
  bg: string;
  ink: string;
}

const TILE_COLORS: Record<number, TileColor> = {
  2: { bg: '#f3ead9', ink: '#4f5f56' },
  4: { bg: '#ecdfc6', ink: '#4f5f56' },
  8: { bg: '#e8caa6', ink: '#3d3a30' },
  16: { bg: '#e0b489', ink: '#3d3a30' },
  32: { bg: '#d99b73', ink: '#fffdf8' },
  64: { bg: '#d97c5b', ink: '#fffdf8' },
  128: { bg: '#cf9d68', ink: '#fffdf8' },
  256: { bg: '#c99257', ink: '#fffdf8' },
  512: { bg: '#bd8446', ink: '#fffdf8' },
  1024: { bg: '#a9713a', ink: '#fffdf8' },
  2048: { bg: '#2f5d50', ink: '#fffdf8' },
};

function tileColor(value: number): TileColor {
  return TILE_COLORS[value] ?? { bg: '#24332d', ink: '#f6f1e7' };
}

class Juego2048 extends BaseGame {
  private board: number[] = [];
  private score = 0;
  private moves = 0;
  private goalReached = false;
  private resumeAfterGoal = false;
  private spawnIndex: number | null = null;
  private spawnTimer = 0;
  private mergedCells: number[] = [];
  private mergeTimer = 0;
  private dragStart: { x: number; y: number } | null = null;

  constructor(context: GameContext) {
    super(context);

    this.input.onPointerDown((point) => {
      const button = this.resetButton(this.runtime.view);
      if (pointInButton(point.x, point.y, button)) {
        this.startFreshGame();
        return;
      }
      this.dragStart = { x: point.x, y: point.y };
    });

    this.input.onPointerMove((point) => {
      if (!this.dragStart || !this.input.pointer.down) return;

      const dx = point.x - this.dragStart.x;
      const dy = point.y - this.dragStart.y;
      const threshold = clamp(this.runtime.view.width * 0.05, 18, 36);
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

      this.dragStart = null;
      if (Math.abs(dx) >= Math.abs(dy)) {
        this.play(dx > 0 ? 'right' : 'left');
      } else {
        this.play(dy > 0 ? 'down' : 'up');
      }
    });

    this.input.onKeyDown((code) => {
      if (code === 'KeyR') {
        this.startFreshGame();
        return;
      }
      if (code === 'ArrowLeft' || code === 'KeyA') this.play('left');
      if (code === 'ArrowRight' || code === 'KeyD') this.play('right');
      if (code === 'ArrowUp' || code === 'KeyW') this.play('up');
      if (code === 'ArrowDown' || code === 'KeyS') this.play('down');
    });
  }

  protected reset(): void {
    // El botón «Seguir jugando» del resultado llama a restart(), que pasa por
    // aquí. En ese caso conservamos el tablero en lugar de empezar de cero.
    if (this.resumeAfterGoal) {
      this.resumeAfterGoal = false;
      this.dragStart = null;
      this.setScore('PUNTOS', this.score);
      return;
    }

    this.board = createBoard();
    this.score = 0;
    this.moves = 0;
    this.goalReached = false;
    this.resumeAfterGoal = false;
    this.spawnIndex = null;
    this.spawnTimer = 0;
    this.mergedCells = [];
    this.mergeTimer = 0;
    this.dragStart = null;
    this.setScore('PUNTOS', 0);
  }

  protected update(dt: number): void {
    if (this.spawnTimer > 0) this.spawnTimer = Math.max(0, this.spawnTimer - dt);
    if (this.mergeTimer > 0) this.mergeTimer = Math.max(0, this.mergeTimer - dt);
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, ACCENT);
    const layout = this.layout(view);
    const subtitle = this.goalReached
      ? '2048 conseguido · sigue sumando'
      : 'Une fichas iguales hasta llegar a 2048';

    drawPuzzleHeader(context, view, '2048', subtitle);
    drawPuzzleBoard(context, layout, {
      padding: 9,
      fill: 'rgba(226, 209, 184, 0.62)',
    });

    const merged = new Set(this.mergedCells);
    for (let index = 0; index < CELL_COUNT; index += 1) {
      const value = this.board[index] ?? 0;
      if (value === 0) {
        this.drawEmptyCell(context, layout, index);
      } else {
        this.drawTile(context, layout, index, value, merged.has(index));
      }
    }

    drawUiButton(context, this.resetButton(view), 'Reiniciar', { accent: ACCENT });

    drawPuzzleFooter(
      context,
      view,
      `PUNTOS ${this.score}`,
      `MOVIMIENTOS ${this.moves}`,
      'Flechas o desliza · R reiniciar',
    );
  }

  private layout(view: View): PuzzleLayout {
    return puzzleLayout(view, SIZE, SIZE, {
      top: 132,
      bottom: 118,
      maxCell: 108,
      widthRatio: 0.86,
      heightRatio: 0.56,
    });
  }

  private resetButton(view: View): UiButton {
    const layout = this.layout(view);
    const width = 138;
    const height = 36;
    return {
      x: (view.width - width) / 2,
      y: layout.y + layout.height + 26,
      width,
      height,
    };
  }

  private drawEmptyCell(
    context: CanvasRenderingContext2D,
    layout: PuzzleLayout,
    index: number,
  ): void {
    const column = index % SIZE;
    const row = Math.floor(index / SIZE);
    const inset = Math.max(2, layout.cell * 0.045);
    const size = layout.cell - inset * 2;
    const x = layout.x + column * layout.cell + inset;
    const y = layout.y + row * layout.cell + inset;

    roundedRect(context, x, y, size, size, size * 0.14);
    context.fillStyle = alpha(PALETTE.ink, 0.055);
    context.fill();
  }

  private drawTile(
    context: CanvasRenderingContext2D,
    layout: PuzzleLayout,
    index: number,
    value: number,
    merged: boolean,
  ): void {
    const column = index % SIZE;
    const row = Math.floor(index / SIZE);
    const inset = Math.max(2, layout.cell * 0.045);
    const size = layout.cell - inset * 2;
    const centerX = layout.x + column * layout.cell + layout.cell / 2;
    const centerY = layout.y + row * layout.cell + layout.cell / 2;

    let scale = 1;
    if (index === this.spawnIndex && this.spawnTimer > 0) {
      const progress = 1 - clamp(this.spawnTimer / SPAWN_TIME, 0, 1);
      scale = 0.6 + 0.4 * (1 - (1 - progress) * (1 - progress));
    }

    const color = tileColor(value);
    const digits = String(value).length;
    const fontSize = size * (digits <= 2 ? 0.42 : digits === 3 ? 0.34 : digits === 4 ? 0.27 : 0.22);

    context.save();
    context.translate(centerX, centerY);
    context.scale(scale, scale);

    context.shadowColor = alpha(PALETTE.ink, 0.13);
    context.shadowBlur = 9;
    context.shadowOffsetY = 3;
    roundedRect(context, -size / 2, -size / 2, size, size, size * 0.14);
    context.fillStyle = color.bg;
    context.fill();
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;

    context.strokeStyle = alpha(PALETTE.ink, 0.1);
    context.lineWidth = 1.2;
    context.stroke();

    if (merged && this.mergeTimer > 0) {
      const strength = clamp(this.mergeTimer / MERGE_TIME, 0, 1);
      roundedRect(context, -size / 2 + 2, -size / 2 + 2, size - 4, size - 4, size * 0.12);
      context.strokeStyle = alpha(ACCENT, 0.95 * strength);
      context.lineWidth = 2.5;
      context.stroke();
    }

    context.font = `700 ${fontSize}px ${FONT_MONO}`;
    context.fillStyle = color.ink;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(value), 0, 1);
    context.restore();
  }

  private play(direction: Direction): void {
    if (this.state !== 'running') return;

    const result = moveBoard(this.board, direction);
    if (!result.moved) {
      this.audio.tone(165, 0.045, { type: 'triangle', gain: 0.025 });
      return;
    }

    this.board = result.board;
    this.score += result.gained;
    this.moves += 1;
    this.spawnIndex = result.spawn?.index ?? null;
    this.spawnTimer = this.spawnIndex === null ? 0 : SPAWN_TIME;
    this.mergedCells = result.merged;
    this.mergeTimer = result.merged.length > 0 ? MERGE_TIME : 0;

    this.setScore('PUNTOS', this.score);

    if (result.gained > 0) {
      const pitch = Math.min(880, 300 + Math.log2(Math.max(2, result.gained)) * 70);
      this.audio.tone(pitch, 0.09, { type: 'triangle', gain: 0.06 });
    } else {
      this.audio.tone(220, 0.04, { type: 'sine', gain: 0.025 });
    }

    if (!hasMoves(this.board)) {
      this.finishBlocked();
      return;
    }

    if (!this.goalReached && maxTile(this.board) >= 2048) {
      this.goalReached = true;
      this.resumeAfterGoal = true;
      this.audio.chord([523.25, 659.25, 783.99, 1046.5], 0.55, {
        type: 'triangle',
        gain: 0.12,
      });
      this.setStatus('Has llegado a 2048. Puedes seguir jugando.');
      this.finish({
        title: 'Objetivo cumplido',
        message: 'Has reunido la ficha 2048. Sigue jugando para sumar más puntos.',
        detail: `${this.moves} ${this.moves === 1 ? 'movimiento' : 'movimientos'} · ficha ${maxTile(this.board)}`,
        score: this.score,
        scoreLabel: 'PUNTOS',
        ctaLabel: 'Seguir jugando',
        tone: 'win',
      });
    }
  }

  private finishBlocked(): void {
    this.resumeAfterGoal = false;
    this.setStatus('No quedan movimientos posibles.');
    this.finish({
      title: 'Sin movimientos',
      message: `El tablero se ha bloqueado. Tu ficha más alta fue ${maxTile(this.board)}.`,
      detail: `${this.moves} ${this.moves === 1 ? 'movimiento' : 'movimientos'}`,
      score: this.score,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Nueva partida',
      tone: 'lose',
    });
  }

  private startFreshGame(): void {
    this.resumeAfterGoal = false;
    this.reset();
    this.audio.click();
    this.setStatus('Tablero nuevo.');
  }
}

export default {
  mount: (context: GameContext) => new Juego2048(context),
} satisfies GameModule;
