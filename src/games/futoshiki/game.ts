import {
  BaseGame,
  FONT_MONO,
  FONT_SANS,
  PALETTE,
  alpha,
  clamp,
  drawPuzzleBackground,
  drawPuzzleBoard,
  drawPuzzleFooter,
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
  FUTOSHIKI_LEVELS,
  FUTOSHIKI_SIZE,
  conflictMask,
  isSolved,
  scoreForMistakes,
  type FutoshikiConstraint,
  type FutoshikiLevel,
} from './logic';

interface FutoshikiGeometry {
  originX: number;
  originY: number;
  slot: number;
  cell: number;
  gap: number;
  boardWidth: number;
  boardHeight: number;
  background: PuzzleLayout;
  numberButtons: UiButton[];
  eraseButton: UiButton;
  nextButton: UiButton;
}

interface LocalPoint {
  x: number;
  y: number;
}

class Futoshiki extends BaseGame {
  private levelIndex = 0;
  private values: number[] = [...FUTOSHIKI_LEVELS[0]!.givens];
  private given: boolean[] = FUTOSHIKI_LEVELS[0]!.givens.map((value) => value !== 0);
  private selected = 0;
  private errors = 0;
  private totalPoints = 0;
  private totalErrors = 0;
  private levelSolved = false;
  private pendingAdvance = false;

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => this.handlePointer(point));
    this.input.onKeyDown((code) => this.handleKey(code));
  }

  protected reset(): void {
    const advancing = this.pendingAdvance;
    this.pendingAdvance = false;

    if (advancing) {
      this.levelIndex = Math.min(this.levelIndex + 1, FUTOSHIKI_LEVELS.length - 1);
    } else {
      this.levelIndex = 0;
      this.totalPoints = 0;
      this.totalErrors = 0;
    }

    this.loadLevel(this.levelIndex);
  }

  private loadLevel(index: number): void {
    const level = FUTOSHIKI_LEVELS[index]!;
    this.values = [...level.givens];
    this.given = level.givens.map((value) => value !== 0);
    const firstEmpty = this.values.findIndex((value) => value === 0);
    this.selected = firstEmpty >= 0 ? firstEmpty : 0;
    this.errors = 0;
    this.levelSolved = false;
    this.setScore('PUNTOS', this.totalPoints + scoreForMistakes(0));
  }

  private currentLevel(): FutoshikiLevel {
    return FUTOSHIKI_LEVELS[this.levelIndex]!;
  }

  private restartLevel(): void {
    this.loadLevel(this.levelIndex);
    this.audio.tone(300, 0.06, { type: 'triangle', gain: 0.03 });
    this.setStatus('Nivel reiniciado.');
  }

  private advanceLevel(): void {
    if (this.levelIndex >= FUTOSHIKI_LEVELS.length - 1) return;
    this.pendingAdvance = true;
    this.restart();
    this.setStatus(
      `Nivel ${this.levelIndex + 1} de ${FUTOSHIKI_LEVELS.length}: ${this.currentLevel().label}.`,
    );
  }

  private geometry(view: View): FutoshikiGeometry {
    const top = 140;
    const bottom = 148;
    const available = Math.max(240, view.height - top - bottom);
    const slot = clamp(
      Math.min((view.width * 0.86) / FUTOSHIKI_SIZE, available / FUTOSHIKI_SIZE),
      40,
      104,
    );
    const gap = slot * 0.18;
    const cell = slot - gap;
    const boardWidth = slot * FUTOSHIKI_SIZE - gap;
    const boardHeight = boardWidth;
    const originX = (view.width - boardWidth) / 2;
    const originY = top + Math.max(0, (available - boardHeight) / 2);

    const buttonGap = 8;
    const buttonWidth = Math.min(56, (Math.min(view.width - 40, 312) - buttonGap * 4) / 5);
    const totalButtonWidth = buttonWidth * 5 + buttonGap * 4;
    const buttonY = originY + boardHeight + 22;
    const numberButtons = Array.from({ length: 5 }, (_, index) => ({
      x: (view.width - totalButtonWidth) / 2 + index * (buttonWidth + buttonGap),
      y: buttonY,
      width: buttonWidth,
      height: 44,
    }));

    const eraseWidth = Math.min(160, view.width * 0.44);
    const nextWidth = Math.min(210, view.width * 0.64);

    return {
      originX,
      originY,
      slot,
      cell,
      gap,
      boardWidth,
      boardHeight,
      background: {
        cols: FUTOSHIKI_SIZE,
        rows: FUTOSHIKI_SIZE,
        cell,
        x: originX,
        y: originY,
        width: boardWidth,
        height: boardHeight,
      },
      numberButtons,
      eraseButton: {
        x: (view.width - eraseWidth) / 2,
        y: buttonY + 52,
        width: eraseWidth,
        height: 34,
      },
      nextButton: {
        x: (view.width - nextWidth) / 2,
        y: view.height / 2 + 40,
        width: nextWidth,
        height: 42,
      },
    };
  }

  private cellAt(geometry: FutoshikiGeometry, x: number, y: number): number | null {
    if (
      x < geometry.originX ||
      x > geometry.originX + geometry.boardWidth ||
      y < geometry.originY ||
      y > geometry.originY + geometry.boardHeight
    ) {
      return null;
    }
    const column = Math.floor((x - geometry.originX) / geometry.slot);
    const row = Math.floor((y - geometry.originY) / geometry.slot);
    if (column < 0 || column >= FUTOSHIKI_SIZE || row < 0 || row >= FUTOSHIKI_SIZE) {
      return null;
    }
    return row * FUTOSHIKI_SIZE + column;
  }

  private handlePointer(point: LocalPoint): void {
    if (this.state !== 'running') return;
    const geometry = this.geometry(this.runtime.view);

    if (this.levelSolved) {
      if (pointInButton(point.x, point.y, geometry.nextButton)) this.advanceLevel();
      return;
    }

    for (let index = 0; index < geometry.numberButtons.length; index += 1) {
      if (pointInButton(point.x, point.y, geometry.numberButtons[index]!)) {
        if (!this.given[this.selected]) this.place(index + 1, true);
        else this.setStatus('Esa pista no se puede cambiar.');
        this.audio.click();
        return;
      }
    }

    if (pointInButton(point.x, point.y, geometry.eraseButton)) {
      this.place(0, false);
      return;
    }

    const index = this.cellAt(geometry, point.x, point.y);
    if (index === null) return;
    this.selected = index;
    this.audio.tone(300, 0.035, { type: 'triangle', gain: 0.025 });
    if (this.given[index]) this.setStatus('Esa pista no se puede cambiar.');
  }

  private handleKey(code: string): void {
    if (this.state !== 'running') return;

    if (this.levelSolved) {
      if ((code === 'Enter' || code === 'Space') && this.levelIndex < FUTOSHIKI_LEVELS.length - 1) {
        this.advanceLevel();
      }
      return;
    }

    const column = this.selected % FUTOSHIKI_SIZE;
    const row = Math.floor(this.selected / FUTOSHIKI_SIZE);

    if (code === 'ArrowLeft') {
      this.selected = row * FUTOSHIKI_SIZE + Math.max(0, column - 1);
      return;
    }
    if (code === 'ArrowRight') {
      this.selected = row * FUTOSHIKI_SIZE + Math.min(FUTOSHIKI_SIZE - 1, column + 1);
      return;
    }
    if (code === 'ArrowUp') {
      this.selected = Math.max(0, row - 1) * FUTOSHIKI_SIZE + column;
      return;
    }
    if (code === 'ArrowDown') {
      this.selected = Math.min(FUTOSHIKI_SIZE - 1, row + 1) * FUTOSHIKI_SIZE + column;
      return;
    }
    if (code === 'KeyR') {
      this.restartLevel();
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
    if (digit >= 1 && digit <= FUTOSHIKI_SIZE) this.place(digit, false);
  }

  private place(value: number, toggle: boolean): void {
    if (this.levelSolved) return;
    if (this.given[this.selected]) {
      this.audio.tone(180, 0.08, { type: 'triangle', gain: 0.03 });
      this.setStatus('Esa pista no se puede cambiar.');
      return;
    }

    let next = value;
    if (toggle && this.values[this.selected] === value) next = 0;
    if (this.values[this.selected] === next) return;

    this.values[this.selected] = next;

    if (next === 0) {
      this.audio.tone(280, 0.035, { type: 'triangle', gain: 0.025 });
      this.setStatus('Celda vacía.');
    } else if (next !== this.currentLevel().solution[this.selected]) {
      this.errors += 1;
      this.audio.tone(190, 0.12, { type: 'triangle', gain: 0.05 });
      this.setStatus(`Ese número no es el correcto. ${this.errors} fallos.`);
    } else {
      this.audio.tone(390 + next * 30, 0.055, { type: 'triangle', gain: 0.03 });
      this.setStatus('Número correcto.');
    }

    this.setScore('PUNTOS', this.totalPoints + scoreForMistakes(this.errors));

    if (isSolved(this.currentLevel(), this.values)) this.completeLevel();
  }

  private completeLevel(): void {
    if (this.levelSolved) return;
    this.levelSolved = true;

    const levelPoints = scoreForMistakes(this.errors);
    this.totalPoints += levelPoints;
    this.totalErrors += this.errors;
    this.setScore('PUNTOS', this.totalPoints);
    this.audio.chord([392, 494, 587, 784], 0.65, { type: 'sine', gain: 0.08 });

    if (this.levelIndex >= FUTOSHIKI_LEVELS.length - 1) {
      this.finish({
        title: 'Futoshiki completado',
        message: 'Las cinco rejillas respetan filas, columnas y desigualdades.',
        detail: `${FUTOSHIKI_LEVELS.length} niveles · ${this.totalErrors} fallos`,
        score: this.totalPoints,
        scoreLabel: 'PUNTOS',
        ctaLabel: 'Jugar de nuevo',
        tone: 'win',
      });
      return;
    }

    this.setStatus(
      `Nivel ${this.levelIndex + 1} resuelto con ${this.errors} fallos. Siguiente nivel.`,
    );
  }

  protected update(): void {
    // Juego de lógica pausado: la interacción mueve todo el estado.
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, '#a78fbf');
    const geometry = this.geometry(view);
    const level = this.currentLevel();
    const conflicts = conflictMask(level, this.values);
    const selectedValue = this.values[this.selected] ?? 0;
    const selectedGiven = this.given[this.selected] ?? false;

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 13px ${FONT_SANS}`;
    context.fillStyle = PALETTE.ink;
    context.fillText('FUTOSHIKI', view.width / 2, 72);
    context.font = `500 9px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.55);
    context.fillText(
      `NIVEL ${this.levelIndex + 1} DE ${FUTOSHIKI_LEVELS.length} · ${level.label.toUpperCase()} · 5 × 5`,
      view.width / 2,
      92,
    );
    context.font = `500 10px ${FONT_SANS}`;
    context.fillStyle = alpha(PALETTE.ink, 0.5);
    context.fillText('Cada fila y columna, del 1 al 5 sin repetir.', view.width / 2, 112);
    context.restore();

    drawPuzzleBoard(context, geometry.background, {
      padding: 10,
      fill: 'rgba(255, 253, 248, 0.7)',
    });

    for (let index = 0; index < this.values.length; index += 1) {
      const column = index % FUTOSHIKI_SIZE;
      const row = Math.floor(index / FUTOSHIKI_SIZE);
      const x = geometry.originX + column * geometry.slot;
      const y = geometry.originY + row * geometry.slot;
      const value = this.values[index] ?? 0;
      const isGiven = this.given[index] ?? false;
      const isSelected = index === this.selected && this.state === 'running' && !this.levelSolved;
      const conflict = conflicts[index] ?? false;

      let fill = '#fffdf8';
      if (conflict) fill = alpha(PALETTE.apricot, 0.22);
      else if (isSelected) fill = alpha(PALETTE.lilac, 0.22);
      else if (isGiven) fill = '#f4efe2';

      context.save();
      roundedRect(context, x, y, geometry.cell, geometry.cell, geometry.cell * 0.16);
      context.fillStyle = fill;
      context.fill();
      context.strokeStyle = isSelected
        ? PALETTE.lilac
        : conflict
          ? alpha(PALETTE.apricot, 0.65)
          : 'rgba(36, 51, 45, 0.13)';
      context.lineWidth = isSelected ? 2.2 : 1.3;
      context.stroke();

      if (value > 0) {
        context.font = `600 ${Math.max(16, geometry.cell * 0.38)}px ${FONT_MONO}`;
        context.fillStyle = conflict ? PALETTE.apricot : isGiven ? PALETTE.ink : PALETTE.forest;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(String(value), x + geometry.cell / 2, y + geometry.cell / 2 + 1);
      }
      context.restore();
    }

    for (const restriction of level.constraints) {
      this.drawConstraint(context, geometry, restriction);
    }

    for (let index = 0; index < geometry.numberButtons.length; index += 1) {
      drawUiButton(context, geometry.numberButtons[index]!, String(index + 1), {
        active: selectedValue === index + 1,
        accent: PALETTE.lilac,
        disabled: selectedGiven || this.levelSolved,
      });
    }

    drawUiButton(context, geometry.eraseButton, 'Borrar', {
      accent: PALETTE.lilac,
      disabled: selectedGiven || selectedValue === 0 || this.levelSolved,
    });

    drawPuzzleFooter(
      context,
      view,
      `NIVEL ${this.levelIndex + 1}/${FUTOSHIKI_LEVELS.length}`,
      `FALLOS ${this.errors}`,
      'FLECHAS · 1–5 · BORRAR · R',
    );

    if (this.levelSolved && this.levelIndex < FUTOSHIKI_LEVELS.length - 1) {
      this.drawOverlay(context, view, geometry);
    }
  }

  private drawConstraint(
    context: CanvasRenderingContext2D,
    geometry: FutoshikiGeometry,
    restriction: FutoshikiConstraint,
  ): void {
    const column = restriction.a % FUTOSHIKI_SIZE;
    const row = Math.floor(restriction.a / FUTOSHIKI_SIZE);
    const vertical = restriction.b === restriction.a + FUTOSHIKI_SIZE;

    const centerX = vertical
      ? geometry.originX + column * geometry.slot + geometry.cell / 2
      : geometry.originX + (column + 1) * geometry.slot - geometry.gap / 2;
    const centerY = vertical
      ? geometry.originY + (row + 1) * geometry.slot - geometry.gap / 2
      : geometry.originY + row * geometry.slot + geometry.cell / 2;

    context.save();
    context.translate(centerX, centerY);
    if (vertical) context.rotate(Math.PI / 2);
    context.font = `600 ${Math.max(11, Math.round(geometry.gap * 1.5))}px ${FONT_SANS}`;
    context.fillStyle = alpha(PALETTE.ink, 0.66);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(restriction.operator, 0, 1);
    context.restore();
  }

  private drawOverlay(
    context: CanvasRenderingContext2D,
    view: View,
    geometry: FutoshikiGeometry,
  ): void {
    context.save();
    context.fillStyle = alpha(PALETTE.ink, 0.26);
    context.fillRect(0, 0, view.width, view.height);

    const width = Math.min(340, view.width * 0.84);
    const height = 210;
    const x = (view.width - width) / 2;
    const y = view.height / 2 - height / 2;

    roundedRect(context, x, y, width, height, 22);
    context.fillStyle = PALETTE.surface;
    context.fill();
    context.strokeStyle = alpha(PALETTE.ink, 0.16);
    context.lineWidth = 1.5;
    context.stroke();

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 10px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.lilac, 0.95);
    context.fillText('NIVEL COMPLETADO', view.width / 2, y + 36);
    context.font = `600 22px ${FONT_SANS}`;
    context.fillStyle = PALETTE.ink;
    context.fillText(this.currentLevel().label, view.width / 2, y + 68);
    context.font = `500 11px ${FONT_SANS}`;
    context.fillStyle = alpha(PALETTE.ink, 0.58);
    context.fillText(
      `${scoreForMistakes(this.errors)} puntos · ${this.errors} fallos`,
      view.width / 2,
      y + 94,
    );

    drawUiButton(context, geometry.nextButton, 'SIGUIENTE NIVEL', {
      active: true,
      accent: PALETTE.lilac,
    });
    context.restore();
  }
}

export default {
  mount: (context: GameContext) => new Futoshiki(context),
} satisfies GameModule;
