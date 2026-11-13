import {
  BaseGame,
  FONT_MONO,
  FONT_SANS,
  PALETTE,
  alpha,
  cellAt,
  clamp,
  drawPuzzleBackground,
  drawPuzzleBoard,
  drawPuzzleCell,
  drawPuzzleFooter,
  drawPuzzleHeader,
  drawUiButton,
  pointInButton,
  roundedRect,
  type GameContext,
  type GameModule,
  type PuzzleLayout,
  type UiButton,
  type View,
} from '../engine';
import {
  TENTS_LEVELS,
  TENTS_SIZE,
  adjacentTentCells,
  countPlaced,
  isTreeAt,
  tentCounts,
  validateTents,
  type TentsLevel,
} from './logic';

const ACCENT = '#6f9a80';
const BOARD_CELLS = TENTS_SIZE * TENTS_SIZE;

interface TentsGeometry {
  layout: PuzzleLayout;
  checkButton: UiButton;
  nextButton: UiButton;
}

interface LocalPoint {
  x: number;
  y: number;
}

class Tents extends BaseGame {
  private level = 0;
  private completed = 0;
  private placed: boolean[] = Array.from({ length: BOARD_CELLS }, () => false);
  private cursor = 0;
  private solved = false;
  private solvedTimer = 0;
  private pendingAdvance = false;
  private checkRequested = false;
  private wrongCells = new Set<number>();

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => this.handlePointer(point));
    this.input.onKeyDown((code) => this.handleKey(code));
  }

  protected reset(): void {
    if (this.pendingAdvance) {
      this.pendingAdvance = false;
      this.level = Math.min(this.level + 1, TENTS_LEVELS.length - 1);
    } else {
      this.level = 0;
      this.completed = 0;
    }
    this.loadLevel();
    this.setScore('PUNTOS', this.completed * 100);
  }

  private loadLevel(): void {
    this.placed = Array.from({ length: BOARD_CELLS }, () => false);
    this.cursor = 0;
    this.solved = false;
    this.solvedTimer = 0;
    this.checkRequested = false;
    this.wrongCells.clear();
  }

  private currentLevel(): TentsLevel {
    return TENTS_LEVELS[this.level]!;
  }

  private geometry(view: View): TentsGeometry {
    const cell = clamp(Math.min((view.width * 0.84) / 9.6, (view.height * 0.6) / 9.6), 20, 60);
    const boardWidth = cell * TENTS_SIZE;
    const boardHeight = cell * TENTS_SIZE;
    const clueRight = cell * 1.45;
    const clueBottom = cell * 1.2;
    const totalWidth = boardWidth + clueRight;
    const totalHeight = boardHeight + clueBottom;
    const top = 118;
    const bottom = 132;
    const available = Math.max(120, view.height - top - bottom);
    const y = top + Math.max(0, (available - totalHeight) / 2);
    const x = (view.width - totalWidth) / 2;

    const layout: PuzzleLayout = {
      cols: TENTS_SIZE,
      rows: TENTS_SIZE,
      cell,
      x,
      y,
      width: boardWidth,
      height: boardHeight,
    };

    const checkWidth = Math.min(196, Math.max(132, view.width * 0.5));
    const checkHeight = 40;
    const nextWidth = Math.min(220, view.width * 0.66);

    return {
      layout,
      checkButton: {
        x: (view.width - checkWidth) / 2,
        y: y + boardHeight + clueBottom + 14,
        width: checkWidth,
        height: checkHeight,
      },
      nextButton: {
        x: (view.width - nextWidth) / 2,
        y: view.height / 2 + 40,
        width: nextWidth,
        height: 42,
      },
    };
  }

  private handlePointer(point: LocalPoint): void {
    if (this.state !== 'running') return;
    const geometry = this.geometry(this.runtime.view);

    if (this.solved) {
      if (
        this.level < TENTS_LEVELS.length - 1 &&
        pointInButton(point.x, point.y, geometry.nextButton)
      ) {
        this.pendingAdvance = true;
        this.restart();
      }
      return;
    }

    if (pointInButton(point.x, point.y, geometry.checkButton)) {
      this.check();
      return;
    }

    const index = cellAt(geometry.layout, point.x, point.y);
    if (index === null) return;
    this.cursor = index;
    this.toggle(index);
  }

  private handleKey(code: string): void {
    if (this.state !== 'running') return;

    if (this.solved) {
      if ((code === 'Enter' || code === 'Space') && this.level < TENTS_LEVELS.length - 1) {
        this.pendingAdvance = true;
        this.restart();
      }
      return;
    }

    const row = Math.floor(this.cursor / TENTS_SIZE);
    const column = this.cursor % TENTS_SIZE;

    if (code === 'ArrowLeft') {
      this.cursor = row * TENTS_SIZE + Math.max(0, column - 1);
      this.audio.tone(300, 0.03, { type: 'triangle', gain: 0.018 });
      return;
    }
    if (code === 'ArrowRight') {
      this.cursor = row * TENTS_SIZE + Math.min(TENTS_SIZE - 1, column + 1);
      this.audio.tone(320, 0.03, { type: 'triangle', gain: 0.018 });
      return;
    }
    if (code === 'ArrowUp') {
      this.cursor = Math.max(0, row - 1) * TENTS_SIZE + column;
      this.audio.tone(300, 0.03, { type: 'triangle', gain: 0.018 });
      return;
    }
    if (code === 'ArrowDown') {
      this.cursor = Math.min(TENTS_SIZE - 1, row + 1) * TENTS_SIZE + column;
      this.audio.tone(320, 0.03, { type: 'triangle', gain: 0.018 });
      return;
    }
    if (code === 'Space' || code === 'Enter') {
      this.toggle(this.cursor);
      return;
    }
    if (code === 'KeyC') {
      this.check();
      return;
    }
    if (code === 'KeyR') {
      this.resetLevel();
    }
  }

  private toggle(index: number): void {
    if (this.solved) return;

    if (isTreeAt(this.currentLevel(), index)) {
      this.audio.tone(220, 0.06, { type: 'sine', gain: 0.025 });
      this.setStatus('Los árboles son fijos: coloca la tienda en una celda contigua.');
      return;
    }

    this.placed[index] = !this.placed[index];
    this.wrongCells.clear();
    this.checkRequested = false;

    const placed = this.placed[index] === true;
    this.audio.tone(placed ? 440 : 320, 0.05, { type: 'triangle', gain: 0.03 });
    this.setStatus(placed ? 'Tienda colocada.' : 'Tienda retirada.');
    this.checkSolved();
  }

  private checkSolved(): void {
    if (validateTents(this.currentLevel(), this.placed).ok) {
      this.completeLevel();
    }
  }

  private completeLevel(): void {
    if (this.solved) return;
    this.solved = true;
    this.solvedTimer = 0;
    this.completed = Math.max(this.completed, this.level + 1);
    this.setScore('PUNTOS', this.completed * 100);
    this.setStatus(`Nivel completado: ${this.currentLevel().name}.`);
    this.audio.chord([392, 494, 587], 0.55, { type: 'sine', gain: 0.09 });
  }

  private check(): void {
    if (this.solved) return;

    const result = validateTents(this.currentLevel(), this.placed);
    this.checkRequested = true;
    this.wrongCells = new Set(adjacentTentCells(this.placed));

    if (result.ok) {
      this.completeLevel();
      return;
    }

    const message = result.reason ?? 'La colocación no es válida.';
    this.setStatus(message);
    this.toast(message, 1900);
    this.audio.tone(210, 0.12, { type: 'sine', gain: 0.035 });
  }

  private resetLevel(): void {
    this.placed = Array.from({ length: BOARD_CELLS }, () => false);
    this.cursor = 0;
    this.solved = false;
    this.solvedTimer = 0;
    this.checkRequested = false;
    this.wrongCells.clear();
    this.setStatus('Nivel reiniciado.');
    this.audio.tone(300, 0.08, { type: 'triangle', gain: 0.03 });
  }

  protected update(dt: number): void {
    if (!this.solved) return;
    this.solvedTimer += dt;
    if (this.level === TENTS_LEVELS.length - 1 && this.solvedTimer > 1.1) {
      this.finishSession();
    }
  }

  private finishSession(): void {
    this.finish({
      title: 'Campamento completo',
      message: 'Has emparejado cada árbol con su tienda sin que ninguna se tocara.',
      detail: '5 niveles · 40 árboles y 40 tiendas',
      score: this.completed * 100,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Volver a jugar',
      tone: 'win',
    });
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, ACCENT);
    const geometry = this.geometry(view);
    const { layout } = geometry;
    const level = this.currentLevel();

    drawPuzzleHeader(
      context,
      view,
      'TIENDAS DE CAMPAÑA',
      `${level.name} · nivel ${this.level + 1} de ${TENTS_LEVELS.length}`,
    );

    drawPuzzleBoard(
      context,
      {
        ...layout,
        width: layout.width + layout.cell * 1.45,
        height: layout.height + layout.cell * 1.2,
      },
      { padding: 8 },
    );

    this.drawGrid(context, layout, level);
    this.drawClues(context, layout, level);

    if (!this.solved) {
      drawUiButton(context, geometry.checkButton, 'COMPROBAR', {
        active: true,
        accent: ACCENT,
      });
    }

    drawPuzzleFooter(
      context,
      view,
      `NIVEL ${this.level + 1}/${TENTS_LEVELS.length}`,
      `TIENDAS ${countPlaced(this.placed)}/${level.trees.length}`,
      this.solved ? 'NIVEL RESUELTO' : 'TOCA PARA COLOCAR · C COMPROBAR · R REINICIAR',
    );

    if (this.solved && this.level < TENTS_LEVELS.length - 1) {
      this.drawOverlay(context, view, geometry);
    }
  }

  private drawGrid(
    context: CanvasRenderingContext2D,
    layout: PuzzleLayout,
    level: TentsLevel,
  ): void {
    const tentAlpha = this.solved
      ? this.reducedMotion
        ? 0.5
        : 0.46 + Math.sin(this.solvedTimer * 4) * 0.08
      : 0.3;

    for (let index = 0; index < BOARD_CELLS; index += 1) {
      const row = Math.floor(index / TENTS_SIZE);
      const column = index % TENTS_SIZE;
      const tree = isTreeAt(level, index);
      const tent = this.placed[index] === true;
      const wrong = this.wrongCells.has(index);
      const isCursor = index === this.cursor && this.state === 'running' && !this.solved;

      const fill = wrong
        ? alpha(PALETTE.apricot, 0.28)
        : tree
          ? alpha(ACCENT, 0.16)
          : tent
            ? alpha(ACCENT, 0.08)
            : PALETTE.surface;
      const stroke = isCursor ? PALETTE.sky : wrong ? PALETTE.apricot : 'rgba(36, 51, 45, 0.13)';

      drawPuzzleCell(context, layout, index, {
        fill,
        stroke,
        strokeWidth: isCursor ? 2.4 : 1.2,
      });

      const centerX = layout.x + (column + 0.5) * layout.cell;
      const centerY = layout.y + (row + 0.5) * layout.cell;

      if (tree) {
        this.drawTree(context, centerX, centerY, layout.cell);
      } else if (tent) {
        this.drawTent(context, centerX, centerY, layout.cell, tentAlpha);
      }
    }
  }

  private drawTree(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    cell: number,
  ): void {
    const size = cell * 0.82;

    context.save();
    context.fillStyle = '#8a6a4a';
    roundedRect(
      context,
      centerX - size * 0.055,
      centerY + size * 0.13,
      size * 0.11,
      size * 0.21,
      size * 0.04,
    );
    context.fill();

    context.fillStyle = PALETTE.forest;
    context.beginPath();
    context.moveTo(centerX, centerY - size * 0.17);
    context.lineTo(centerX - size * 0.3, centerY + size * 0.16);
    context.lineTo(centerX + size * 0.3, centerY + size * 0.16);
    context.closePath();
    context.fill();

    context.beginPath();
    context.moveTo(centerX, centerY - size * 0.37);
    context.lineTo(centerX - size * 0.22, centerY - size * 0.04);
    context.lineTo(centerX + size * 0.22, centerY - size * 0.04);
    context.closePath();
    context.fill();

    context.fillStyle = alpha(PALETTE.sage, 0.42);
    context.beginPath();
    context.moveTo(centerX, centerY - size * 0.32);
    context.lineTo(centerX - size * 0.1, centerY - size * 0.12);
    context.lineTo(centerX + size * 0.1, centerY - size * 0.12);
    context.closePath();
    context.fill();
    context.restore();
  }

  private drawTent(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    cell: number,
    fillAlpha: number,
  ): void {
    const size = cell * 0.76;
    const baseY = centerY + size * 0.27;
    const apexY = centerY - size * 0.33;
    const half = size * 0.36;

    context.save();
    context.beginPath();
    context.moveTo(centerX, apexY);
    context.lineTo(centerX - half, baseY);
    context.lineTo(centerX + half, baseY);
    context.closePath();
    context.fillStyle = alpha(ACCENT, fillAlpha);
    context.fill();
    context.strokeStyle = PALETTE.forest;
    context.lineWidth = Math.max(1.2, cell * 0.035);
    context.stroke();

    context.beginPath();
    context.moveTo(centerX, apexY + size * 0.4);
    context.lineTo(centerX - size * 0.12, baseY);
    context.lineTo(centerX + size * 0.12, baseY);
    context.closePath();
    context.fillStyle = alpha(PALETTE.forest, 0.62);
    context.fill();
    context.restore();
  }

  private drawClues(
    context: CanvasRenderingContext2D,
    layout: PuzzleLayout,
    level: TentsLevel,
  ): void {
    const counts = tentCounts(this.placed);
    const fontSize = Math.max(10, layout.cell * 0.34);

    context.save();
    context.font = `700 ${fontSize}px ${FONT_MONO}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    for (let row = 0; row < TENTS_SIZE; row += 1) {
      const expected = level.rows[row]!;
      const current = counts.rows[row]!;
      const mismatch = this.checkRequested && current !== expected;
      context.fillStyle = mismatch
        ? PALETTE.apricot
        : current === expected
          ? PALETTE.forest
          : alpha(PALETTE.ink, 0.48);
      context.fillText(
        String(expected),
        layout.x + layout.width + layout.cell * 0.72,
        layout.y + (row + 0.5) * layout.cell + 1,
      );
    }

    for (let column = 0; column < TENTS_SIZE; column += 1) {
      const expected = level.cols[column]!;
      const current = counts.cols[column]!;
      const mismatch = this.checkRequested && current !== expected;
      context.fillStyle = mismatch
        ? PALETTE.apricot
        : current === expected
          ? PALETTE.forest
          : alpha(PALETTE.ink, 0.48);
      context.fillText(
        String(expected),
        layout.x + (column + 0.5) * layout.cell,
        layout.y + layout.height + layout.cell * 0.6,
      );
    }
    context.restore();
  }

  private drawOverlay(
    context: CanvasRenderingContext2D,
    view: View,
    geometry: TentsGeometry,
  ): void {
    context.save();
    context.fillStyle = alpha(PALETTE.ink, 0.24);
    context.fillRect(0, 0, view.width, view.height);

    const width = Math.min(340, view.width * 0.84);
    const height = 206;
    const x = (view.width - width) / 2;
    const y = view.height / 2 - 108;
    roundedRect(context, x, y, width, height, 22);
    context.fillStyle = PALETTE.surface;
    context.fill();
    context.strokeStyle = alpha(PALETTE.ink, 0.16);
    context.lineWidth = 1.5;
    context.stroke();

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 11px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.forest, 0.8);
    context.fillText('NIVEL COMPLETADO', view.width / 2, y + 34);

    context.font = `600 22px ${FONT_SANS}`;
    context.fillStyle = PALETTE.ink;
    context.fillText(this.currentLevel().name, view.width / 2, y + 68);

    context.font = `500 11px ${FONT_SANS}`;
    context.fillStyle = alpha(PALETTE.ink, 0.58);
    context.fillText('El siguiente campamento ya está preparado.', view.width / 2, y + 94);

    context.font = `600 10px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.45);
    context.fillText(
      `QUEDAN ${TENTS_LEVELS.length - this.level - 1} NIVELES`,
      view.width / 2,
      y + 114,
    );

    drawUiButton(context, geometry.nextButton, 'SIGUIENTE NIVEL', {
      active: true,
      accent: PALETTE.forest,
    });
    context.restore();
  }
}

export default {
  mount: (context: GameContext) => new Tents(context),
} satisfies GameModule;
