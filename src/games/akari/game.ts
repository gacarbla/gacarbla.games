import {
  BaseGame,
  FONT_MONO,
  FONT_SANS,
  PALETTE,
  alpha,
  cellAt,
  drawPuzzleBackground,
  drawPuzzleBoard,
  drawPuzzleCell,
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
  AKARI_CELLS,
  AKARI_LEVELS,
  AKARI_SIZE,
  conflictMask,
  countBulbs,
  isSolved,
  isWallAt,
  litMask,
  positionOf,
  toggleBulb,
  wallsOf,
  whiteCells,
  type AkariLevel,
} from './logic';

const ACCENT = '#d9b95f';

const BOARD_LAYOUT = {
  top: 118,
  bottom: 94,
  maxCell: 74,
  widthRatio: 0.86,
  heightRatio: 0.56,
} as const;

interface OverlayGeometry {
  panel: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  button: UiButton;
}

class Akari extends BaseGame {
  private levelIndex = 0;
  private bulbs: boolean[] = [];
  private cursor = 0;
  private solved = false;
  private pendingAdvance = false;
  private finishTimer = 0;
  private finished = false;
  private elapsed = 0;

  constructor(context: GameContext) {
    super(context);

    this.input.onPointerDown((point) => {
      if (this.state !== 'running') return;
      this.handlePointer(point.x, point.y);
    });

    this.input.onKeyDown((code, event) => {
      if (this.state !== 'running') return;
      if (event.repeat && !code.startsWith('Arrow')) return;
      this.handleKey(code);
    });
  }

  protected reset(): void {
    if (this.pendingAdvance) {
      this.levelIndex = Math.min(this.levelIndex + 1, AKARI_LEVELS.length - 1);
      this.pendingAdvance = false;
    }

    const level = this.currentLevel();
    const whites = whiteCells(level);
    this.bulbs = new Array<boolean>(AKARI_CELLS).fill(false);
    this.cursor = whites[0] ?? 0;
    this.solved = false;
    this.finishTimer = 0;
    this.finished = false;
    this.elapsed = 0;
    this.setScore('NIVEL', `${this.levelIndex + 1}/${AKARI_LEVELS.length}`);
  }

  protected update(dt: number): void {
    this.elapsed += dt;
    if (!this.solved || this.pendingAdvance || this.finished) return;
    this.finishTimer -= dt;
    if (this.finishTimer <= 0) this.finishRun();
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    const level = this.currentLevel();
    const layout = this.layout(view);
    const walls = wallsOf(level);
    const lit = litMask(level, this.bulbs);
    const conflicts = conflictMask(level, this.bulbs);
    const bulbCount = countBulbs(this.bulbs);

    drawPuzzleBackground(context, view, ACCENT);
    drawPuzzleHeader(
      context,
      view,
      'AKARI',
      `${this.levelIndex + 1} de ${AKARI_LEVELS.length} · ${level.name}`,
    );
    drawPuzzleBoard(context, layout);

    for (let index = 0; index < AKARI_CELLS; index += 1) {
      if (walls[index]) {
        drawPuzzleCell(context, layout, index, {
          fill: PALETTE.ink,
          stroke: alpha(PALETTE.ink, 0.9),
          strokeWidth: 1,
        });
        continue;
      }

      const conflict = conflicts[index] === true;
      const isLit = lit[index] === true;

      drawPuzzleCell(context, layout, index, {
        fill: conflict
          ? alpha(PALETTE.apricot, 0.22)
          : isLit
            ? alpha(ACCENT, 0.2)
            : PALETTE.surface,
        stroke: conflict
          ? alpha(PALETTE.apricot, 0.9)
          : isLit
            ? alpha(PALETTE.amber, 0.32)
            : alpha(PALETTE.ink, 0.13),
        strokeWidth: conflict ? 2 : 1.2,
      });

      if (this.bulbs[index]) this.drawBulb(context, layout, index, conflict);
    }

    if (this.state === 'running' && !this.solved) this.drawCursor(context, layout);

    drawPuzzleFooter(
      context,
      view,
      `NIVEL ${this.levelIndex + 1}/${AKARI_LEVELS.length}`,
      `BOMBILLAS ${bulbCount}`,
      'Toca para iluminar',
    );

    if (this.solved && this.pendingAdvance) this.drawOverlay(context, view, bulbCount);
  }

  private currentLevel(): AkariLevel {
    return AKARI_LEVELS[this.levelIndex] ?? AKARI_LEVELS[0]!;
  }

  private layout(view: View): PuzzleLayout {
    return puzzleLayout(view, AKARI_SIZE, AKARI_SIZE, BOARD_LAYOUT);
  }

  private handlePointer(x: number, y: number): void {
    if (this.solved) {
      const { button } = this.overlayGeometry(this.runtime.view);
      if (this.pendingAdvance && pointInButton(x, y, button)) this.advance();
      return;
    }

    const layout = this.layout(this.runtime.view);
    const index = cellAt(layout, x, y);
    if (index === null) return;

    this.cursor = index;
    if (isWallAt(this.currentLevel(), index)) {
      this.audio.tone(170, 0.035, { type: 'triangle', gain: 0.014 });
      return;
    }

    this.toggle(index);
  }

  private handleKey(code: string): void {
    if (this.solved) {
      if ((code === 'Space' || code === 'Enter') && this.pendingAdvance) this.advance();
      return;
    }

    if (code === 'KeyR') {
      this.restart();
      this.setStatus(`Nivel ${this.levelIndex + 1} reiniciado.`);
      return;
    }

    const { row, column } = positionOf(this.cursor);

    if (code === 'ArrowLeft' || code === 'KeyA') {
      this.moveCursor(row, Math.max(0, column - 1));
      return;
    }
    if (code === 'ArrowRight' || code === 'KeyD') {
      this.moveCursor(row, Math.min(AKARI_SIZE - 1, column + 1));
      return;
    }
    if (code === 'ArrowUp' || code === 'KeyW') {
      this.moveCursor(Math.max(0, row - 1), column);
      return;
    }
    if (code === 'ArrowDown' || code === 'KeyS') {
      this.moveCursor(Math.min(AKARI_SIZE - 1, row + 1), column);
      return;
    }
    if (code === 'Space' || code === 'Enter') this.toggle(this.cursor);
  }

  private moveCursor(row: number, column: number): void {
    this.cursor = row * AKARI_SIZE + column;
    this.audio.tone(300, 0.025, { type: 'triangle', gain: 0.012 });
  }

  private toggle(index: number): void {
    const level = this.currentLevel();
    if (isWallAt(level, index)) return;

    this.bulbs = toggleBulb(level, this.bulbs, index);
    const on = this.bulbs[index] === true;
    this.audio.tone(on ? 520 : 340, 0.05, { type: 'triangle', gain: 0.035 });

    if (isSolved(level, this.bulbs)) this.completeLevel();
  }

  private completeLevel(): void {
    this.solved = true;
    this.finishTimer = 1.15;
    this.pendingAdvance = this.levelIndex < AKARI_LEVELS.length - 1;
    this.audio.chord([523.25, 659.25, 783.99], 0.45, { type: 'sine', gain: 0.09 });
    this.setStatus(
      this.pendingAdvance
        ? `Nivel ${this.levelIndex + 1} resuelto: ${this.currentLevel().name}.`
        : 'Último tablero resuelto.',
    );
  }

  private advance(): void {
    if (!this.solved || !this.pendingAdvance) return;
    this.audio.click();
    this.restart();
  }

  private finishRun(): void {
    if (this.finished) return;
    this.finished = true;
    const bulbCount = countBulbs(this.bulbs);
    this.setScore('NIVEL', `${AKARI_LEVELS.length}/${AKARI_LEVELS.length}`);
    this.finish({
      title: 'Todo iluminado',
      message: 'Has resuelto los seis tableros de Akari sin dejar una celda a oscuras.',
      detail: `${bulbCount} bombillas en el último tablero`,
      score: AKARI_LEVELS.length,
      scoreLabel: 'NIVELES',
      ctaLabel: 'Jugar otra vez',
      tone: 'win',
    });
    this.levelIndex = 0;
  }

  private drawBulb(
    context: CanvasRenderingContext2D,
    layout: PuzzleLayout,
    index: number,
    conflict: boolean,
  ): void {
    const { row, column } = positionOf(index);
    const centerX = layout.x + (column + 0.5) * layout.cell;
    const centerY = layout.y + (row + 0.5) * layout.cell;
    const radius = layout.cell * 0.2;
    const pulse = this.reducedMotion ? 0.5 : 0.5 + Math.sin(this.elapsed * 1.6) * 0.18;
    const glowColor = conflict ? PALETTE.apricot : PALETTE.amber;

    context.save();

    const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 2.6);
    glow.addColorStop(0, alpha(glowColor, 0.2 + pulse * 0.22));
    glow.addColorStop(1, alpha(glowColor, 0));
    context.fillStyle = glow;
    context.beginPath();
    context.arc(centerX, centerY, radius * 2.6, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fillStyle = conflict ? '#f4cdb8' : '#f3dd93';
    context.fill();
    context.strokeStyle = alpha(glowColor, 0.95);
    context.lineWidth = Math.max(1.2, layout.cell * 0.04);
    context.stroke();

    context.beginPath();
    context.arc(centerX, centerY, radius * 0.4, 0, Math.PI * 2);
    context.fillStyle = alpha(PALETTE.surface, 0.95);
    context.fill();

    context.restore();
  }

  private drawCursor(context: CanvasRenderingContext2D, layout: PuzzleLayout): void {
    const { row, column } = positionOf(this.cursor);
    const inset = Math.max(3, layout.cell * 0.07);

    context.save();
    roundedRect(
      context,
      layout.x + column * layout.cell + inset,
      layout.y + row * layout.cell + inset,
      layout.cell - inset * 2,
      layout.cell - inset * 2,
      (layout.cell - inset * 2) * 0.18,
    );
    context.setLineDash([5, 4]);
    context.strokeStyle = alpha(PALETTE.forest, 0.75);
    context.lineWidth = 2;
    context.stroke();
    context.restore();
  }

  private overlayGeometry(view: View): OverlayGeometry {
    const width = Math.min(340, view.width * 0.84);
    const height = 214;
    const x = (view.width - width) / 2;
    const y = Math.max(92, (view.height - height) / 2 - 8);
    const buttonWidth = Math.min(220, width - 56);
    return {
      panel: { x, y, width, height },
      button: {
        x: (view.width - buttonWidth) / 2,
        y: y + height - 66,
        width: buttonWidth,
        height: 42,
      },
    };
  }

  private drawOverlay(context: CanvasRenderingContext2D, view: View, bulbCount: number): void {
    const geometry = this.overlayGeometry(view);
    const { panel, button } = geometry;

    context.save();
    context.fillStyle = alpha(PALETTE.ink, 0.26);
    context.fillRect(0, 0, view.width, view.height);

    roundedRect(context, panel.x, panel.y, panel.width, panel.height, 22);
    context.fillStyle = PALETTE.surface;
    context.fill();
    context.strokeStyle = alpha(PALETTE.ink, 0.16);
    context.lineWidth = 1.5;
    context.stroke();

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 11px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.amber, 0.95);
    context.fillText('NIVEL COMPLETADO', view.width / 2, panel.y + 34);
    context.font = `600 23px ${FONT_SANS}`;
    context.fillStyle = PALETTE.ink;
    context.fillText(this.currentLevel().name, view.width / 2, panel.y + 70);
    context.font = `500 11px ${FONT_SANS}`;
    context.fillStyle = alpha(PALETTE.ink, 0.58);
    context.fillText(`${bulbCount} bombillas en el tablero`, view.width / 2, panel.y + 100);

    drawUiButton(context, button, 'SIGUIENTE NIVEL', {
      active: true,
      accent: PALETTE.forest,
    });

    context.font = `500 9px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.5);
    context.fillText('Intro o toca el botón', view.width / 2, panel.y + panel.height - 16);
    context.restore();
  }
}

export default {
  mount: (context: GameContext) => new Akari(context),
} satisfies GameModule;
