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
  drawSegmented,
  drawUiButton,
  pointInButton,
  puzzleLayout,
  roundedRect,
  segmentedButtons,
  type GameContext,
  type GameModule,
  type PuzzleLayout,
  type UiButton,
  type View,
} from '../engine';
import {
  SUGURU_LEVELS,
  SUGURU_SIZE,
  conflictMask,
  createBoard,
  isSolved,
  regionCells,
  regionMap,
  type SuguruLevel,
} from './logic';

const ACCENT = '#df8b6c';
const REGION_COLORS = [
  '#7fa98a',
  '#6f9db8',
  '#c9a63e',
  '#cf8a8a',
  '#9a80b5',
  '#d97c5b',
  '#4f8f7a',
  '#b0865a',
  '#8a9f6b',
  '#a97ba0',
] as const;

interface SuguruGeometry {
  layout: PuzzleLayout;
  numberButtons: UiButton[];
  clearButton: UiButton;
  levelButtons: UiButton[];
  nextButton: UiButton;
}

interface LocalPoint {
  x: number;
  y: number;
}

class Suguru extends BaseGame {
  private level = 0;
  private values: number[] = createBoard(SUGURU_LEVELS[0]!);
  private given: boolean[] = this.values.map((value) => value > 0);
  private selected = 0;
  private errors = 0;
  private totalErrors = 0;
  private solved = false;
  private pendingAdvance = false;
  private finishedAll = false;

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => this.handlePointer(point));
    this.input.onKeyDown((code) => this.handleKey(code));
  }

  protected reset(): void {
    if (this.pendingAdvance) {
      this.pendingAdvance = false;
      this.level = Math.min(this.level + 1, SUGURU_LEVELS.length - 1);
    } else if (this.finishedAll) {
      this.finishedAll = false;
      this.level = 0;
      this.totalErrors = 0;
    } else {
      this.totalErrors = 0;
    }
    this.loadLevel();
  }

  private currentLevel(): SuguruLevel {
    return SUGURU_LEVELS[this.level]!;
  }

  private loadLevel(): void {
    const level = this.currentLevel();
    this.values = createBoard(level);
    this.given = this.values.map((value) => value > 0);
    const firstEmpty = this.values.findIndex((value) => value === 0);
    this.selected = firstEmpty >= 0 ? firstEmpty : 0;
    this.errors = 0;
    this.solved = false;
    this.setScore('PUNTOS', this.points());
  }

  private selectLevel(index: number): void {
    if (index < 0 || index >= SUGURU_LEVELS.length || index === this.level) return;
    this.level = index;
    this.pendingAdvance = false;
    this.loadLevel();
    this.audio.click();
    this.setStatus(`Nivel ${index + 1} de ${SUGURU_LEVELS.length}: ${this.currentLevel().name}.`);
  }

  private points(): number {
    return Math.max(0, 800 - this.totalErrors * 20);
  }

  private geometry(view: View): SuguruGeometry {
    const layout = puzzleLayout(view, SUGURU_SIZE, SUGURU_SIZE, {
      top: 150,
      bottom: 176,
      widthRatio: 0.86,
      heightRatio: 0.64,
      maxCell: 78,
    });
    const gap = 6;
    const buttonWidth = Math.min(52, (layout.width - gap * (SUGURU_SIZE - 1)) / SUGURU_SIZE);
    const total = buttonWidth * SUGURU_SIZE + gap * (SUGURU_SIZE - 1);
    const buttonY = layout.y + layout.height + 18;
    const numberButtons: UiButton[] = [];
    for (let index = 0; index < SUGURU_SIZE; index += 1) {
      numberButtons.push({
        x: (view.width - total) / 2 + index * (buttonWidth + gap),
        y: buttonY,
        width: buttonWidth,
        height: 40,
      });
    }
    const nextWidth = Math.min(220, view.width * 0.66);
    return {
      layout,
      numberButtons,
      clearButton: {
        x: (view.width - 132) / 2,
        y: buttonY + 48,
        width: 132,
        height: 34,
      },
      levelButtons: segmentedButtons(view, SUGURU_LEVELS.length, 104),
      nextButton: {
        x: (view.width - nextWidth) / 2,
        y: view.height / 2 + 52,
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
        this.level < SUGURU_LEVELS.length - 1 &&
        pointInButton(point.x, point.y, geometry.nextButton)
      ) {
        this.pendingAdvance = true;
        this.audio.click();
        this.restart();
      }
      return;
    }

    const levelIndex = geometry.levelButtons.findIndex((button) =>
      pointInButton(point.x, point.y, button),
    );
    if (levelIndex >= 0) {
      this.selectLevel(levelIndex);
      return;
    }

    for (let index = 0; index < geometry.numberButtons.length; index += 1) {
      if (pointInButton(point.x, point.y, geometry.numberButtons[index]!)) {
        this.place(index + 1, true);
        return;
      }
    }

    if (pointInButton(point.x, point.y, geometry.clearButton)) {
      this.place(0, false);
      return;
    }

    const index = cellAt(geometry.layout, point.x, point.y);
    if (index === null) return;
    this.selected = index;
    this.audio.tone(300, 0.035, { type: 'triangle', gain: 0.022 });
    if (this.given[index]) this.setStatus('Esa pista no se puede cambiar.');
  }

  private handleKey(code: string): void {
    if (this.state !== 'running') return;

    if (this.solved) {
      if (
        (code === 'Enter' || code === 'Space' || code === 'KeyN') &&
        this.level < SUGURU_LEVELS.length - 1
      ) {
        this.pendingAdvance = true;
        this.restart();
      }
      return;
    }

    const column = this.selected % SUGURU_SIZE;
    const row = Math.floor(this.selected / SUGURU_SIZE);

    if (code === 'ArrowLeft') {
      this.selected = row * SUGURU_SIZE + Math.max(0, column - 1);
      this.audio.tone(300, 0.03, { type: 'triangle', gain: 0.018 });
      return;
    }
    if (code === 'ArrowRight') {
      this.selected = row * SUGURU_SIZE + Math.min(SUGURU_SIZE - 1, column + 1);
      this.audio.tone(322, 0.03, { type: 'triangle', gain: 0.018 });
      return;
    }
    if (code === 'ArrowUp') {
      this.selected = Math.max(0, row - 1) * SUGURU_SIZE + column;
      this.audio.tone(300, 0.03, { type: 'triangle', gain: 0.018 });
      return;
    }
    if (code === 'ArrowDown') {
      this.selected = Math.min(SUGURU_SIZE - 1, row + 1) * SUGURU_SIZE + column;
      this.audio.tone(322, 0.03, { type: 'triangle', gain: 0.018 });
      return;
    }
    if (code === 'KeyR') {
      this.restart();
      return;
    }
    if (code === 'Backspace' || code === 'Delete' || code === 'Digit0' || code === 'Numpad0') {
      this.place(0, false);
      return;
    }

    const digit = code.startsWith('Digit')
      ? Number(code.slice(5))
      : code.startsWith('Numpad')
        ? Number(code.slice(6))
        : 0;
    if (digit >= 1 && digit <= SUGURU_SIZE) this.place(digit, false);
  }

  private place(value: number, toggle: boolean): void {
    const level = this.currentLevel();
    if (this.given[this.selected]) {
      this.audio.tone(180, 0.08, { type: 'triangle', gain: 0.03 });
      this.setStatus('Esa pista no se puede cambiar.');
      return;
    }

    const region = regionMap(level)[this.selected]!;
    const limit = regionCells(level)[region]!.length;
    if (value > limit) {
      this.audio.tone(170, 0.08, { type: 'triangle', gain: 0.03 });
      this.setStatus(`Esta región admite números del 1 al ${limit}.`);
      return;
    }

    const next = toggle && this.values[this.selected] === value ? 0 : value;
    if (this.values[this.selected] === next) return;
    this.values[this.selected] = next;

    if (next === 0) {
      this.audio.tone(280, 0.04, { type: 'triangle', gain: 0.025 });
      this.setStatus('Celda vacía.');
    } else {
      const conflicts = conflictMask(level, this.values);
      if (conflicts[this.selected]) {
        this.errors += 1;
        this.totalErrors += 1;
        this.audio.tone(190, 0.13, { type: 'triangle', gain: 0.05 });
        this.setStatus('Ese número repite dentro de la región o toca un igual.');
      } else {
        this.audio.tone(390 + next * 26, 0.055, { type: 'triangle', gain: 0.03 });
        this.setStatus(`Número ${next} colocado.`);
      }
    }

    this.setScore('PUNTOS', this.points());
    this.checkSolved();
  }

  private checkSolved(): void {
    const level = this.currentLevel();
    if (!isSolved(level, this.values)) return;

    this.solved = true;
    this.audio.chord([392, 494, 587], 0.55, { type: 'sine', gain: 0.09 });
    if (this.level === SUGURU_LEVELS.length - 1) {
      this.completeSession();
    } else {
      this.setStatus(`Nivel ${this.level + 1} completado: ${level.name}.`);
    }
  }

  private completeSession(): void {
    if (this.finishedAll) return;
    this.finishedAll = true;
    this.audio.chord([392, 494, 587, 784], 0.9, { type: 'sine', gain: 0.1 });
    this.setScore('PUNTOS', this.points());
    this.setStatus('Los cinco tableros están resueltos.');
    this.finish({
      title: 'Suguru resuelto',
      message: 'Cinco tableros completos, sin repeticiones en regiones ni entre vecinos.',
      detail: `${SUGURU_LEVELS.length} niveles · ${this.totalErrors} fallos`,
      score: this.points(),
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Volver a jugar',
      tone: 'win',
    });
  }

  protected update(): void {
    // Juego de lógica: toda la interacción mueve el estado.
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    const level = this.currentLevel();
    const geometry = this.geometry(view);
    const { layout } = geometry;
    const map = regionMap(level);
    const sizes = regionCells(level).map((cells) => cells.length);
    const conflicts = conflictMask(level, this.values);
    const selectedRegion = sizes[map[this.selected]!]!;

    drawPuzzleBackground(context, view, ACCENT);

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 13px ${FONT_SANS}`;
    context.fillStyle = PALETTE.ink;
    context.fillText('SUGURU', view.width / 2, 68);
    context.font = `500 9px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.55);
    context.fillText(
      `${this.level + 1} DE ${SUGURU_LEVELS.length} · 6 × 6 · REGIONES DE 2 A 6`,
      view.width / 2,
      86,
    );
    context.restore();

    drawSegmented(
      context,
      geometry.levelButtons,
      SUGURU_LEVELS.map((_, index) => String(index + 1)),
      this.level,
      ACCENT,
    );

    drawPuzzleBoard(context, layout);

    for (let index = 0; index < this.values.length; index += 1) {
      const value = this.values[index]!;
      const region = map[index]!;
      const tint = REGION_COLORS[region % REGION_COLORS.length]!;
      const selected = index === this.selected && this.state === 'running' && !this.solved;

      let fill = this.given[index] ? alpha(tint, 0.26) : alpha(tint, 0.15);
      if (conflicts[index]) fill = alpha(PALETTE.apricot, 0.32);
      else if (selected) fill = alpha(ACCENT, 0.3);

      drawPuzzleCell(context, layout, index, {
        fill,
        stroke: selected ? ACCENT : alpha(PALETTE.ink, 0.12),
        strokeWidth: selected ? 2.4 : 1.2,
        text: value > 0 ? String(value) : '',
        textColor: conflicts[index]
          ? PALETTE.apricot
          : this.given[index]
            ? PALETTE.ink
            : PALETTE.forest,
      });
    }

    context.save();
    context.strokeStyle = alpha(PALETTE.forest, 0.45);
    context.lineWidth = Math.max(1.5, layout.cell * 0.035);
    context.beginPath();
    for (let index = 0; index < this.values.length; index += 1) {
      const column = index % SUGURU_SIZE;
      const row = Math.floor(index / SUGURU_SIZE);
      if (column < SUGURU_SIZE - 1 && map[index] !== map[index + 1]) {
        const x = layout.x + (column + 1) * layout.cell;
        const y = layout.y + row * layout.cell;
        context.moveTo(x, y);
        context.lineTo(x, y + layout.cell);
      }
      if (row < SUGURU_SIZE - 1 && map[index] !== map[index + SUGURU_SIZE]) {
        const x = layout.x + column * layout.cell;
        const y = layout.y + (row + 1) * layout.cell;
        context.moveTo(x, y);
        context.lineTo(x + layout.cell, y);
      }
    }
    context.stroke();
    context.strokeStyle = alpha(PALETTE.forest, 0.62);
    context.lineWidth = Math.max(2, layout.cell * 0.045);
    context.strokeRect(layout.x, layout.y, layout.width, layout.height);
    context.restore();

    const selectedValue = this.values[this.selected] ?? 0;
    const locked = this.given[this.selected] ?? false;
    for (let index = 0; index < geometry.numberButtons.length; index += 1) {
      drawUiButton(context, geometry.numberButtons[index]!, String(index + 1), {
        active: selectedValue === index + 1,
        accent: ACCENT,
        disabled: locked || index + 1 > selectedRegion,
      });
    }
    drawUiButton(context, geometry.clearButton, 'BORRAR', {
      accent: ACCENT,
      disabled: locked,
    });

    drawPuzzleFooter(
      context,
      view,
      `NIVEL ${this.level + 1}/${SUGURU_LEVELS.length}`,
      `FALLOS ${this.errors}`,
      'TOCA O USA FLECHAS · 1–6 ESCRIBE · BORRAR · R REINICIA',
    );

    if (this.solved && this.level < SUGURU_LEVELS.length - 1) {
      this.drawOverlay(context, view, geometry);
    }
  }

  private drawOverlay(
    context: CanvasRenderingContext2D,
    view: View,
    geometry: SuguruGeometry,
  ): void {
    context.save();
    context.fillStyle = alpha(PALETTE.ink, 0.28);
    context.fillRect(0, 0, view.width, view.height);

    const width = Math.min(340, view.width * 0.84);
    const height = 210;
    const x = (view.width - width) / 2;
    const y = view.height / 2 - 105;
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
    context.fillText('NIVEL COMPLETADO', view.width / 2, y + 38);
    context.font = `600 22px ${FONT_SANS}`;
    context.fillStyle = PALETTE.ink;
    context.fillText(this.currentLevel().name, view.width / 2, y + 74);
    context.font = `500 11px ${FONT_SANS}`;
    context.fillStyle = alpha(PALETTE.ink, 0.58);
    context.fillText(
      `Quedan ${SUGURU_LEVELS.length - this.level - 1} niveles.`,
      view.width / 2,
      y + 102,
    );

    drawUiButton(context, geometry.nextButton, 'SIGUIENTE NIVEL', {
      active: true,
      accent: ACCENT,
    });
    context.restore();
  }
}

export default {
  mount: (context: GameContext) => new Suguru(context),
} satisfies GameModule;
