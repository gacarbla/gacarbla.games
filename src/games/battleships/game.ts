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
  BATTLESHIPS_CELLS,
  BATTLESHIPS_FLEET,
  BATTLESHIPS_LEVELS,
  BATTLESHIPS_SIZE,
  FLEET_CELLS,
  emptyGrid,
  validateBattleships,
  type BattleshipsLevel,
  type BattleshipsValidation,
} from './logic';

const ACCENT = '#5f93b0';
const LEVEL_SCORE = 200;
const CHECK_PENALTY = 20;
const FLEET_LEGEND = BATTLESHIPS_FLEET.map((entry) =>
  Array.from({ length: entry.count }, () => entry.length).join(' '),
).join(' · ');

interface CompletePanel {
  x: number;
  y: number;
  width: number;
  height: number;
  button: UiButton;
}

interface BattleshipsGeometry {
  layout: PuzzleLayout;
  gutter: number;
  checkButton: UiButton;
  surrenderButton: UiButton;
  panel: CompletePanel;
}

interface LocalPoint {
  x: number;
  y: number;
}

class Battleships extends BaseGame {
  private level = 0;
  private marks: boolean[] = emptyGrid();
  private cursor = 0;
  private validation: BattleshipsValidation | null = null;
  private solved = false;
  private pendingAdvance = false;
  private finished = false;
  private points = 0;
  private levelPenalty = 0;
  private levelAward = 0;
  private pendingFinish = false;
  private finishTimer = 0;

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => this.handlePointer(point));
    this.input.onKeyDown((code) => this.handleKey(code));
  }

  protected reset(): void {
    if (this.pendingAdvance && this.level < BATTLESHIPS_LEVELS.length - 1) {
      this.level += 1;
      this.pendingAdvance = false;
    } else {
      this.level = 0;
      this.pendingAdvance = false;
      this.points = 0;
    }
    this.loadLevel();
    this.setScore('PUNTOS', this.points);
  }

  private loadLevel(): void {
    this.marks = emptyGrid();
    this.cursor = 0;
    this.validation = null;
    this.solved = false;
    this.pendingAdvance = false;
    this.finished = false;
    this.levelPenalty = 0;
    this.levelAward = 0;
    this.pendingFinish = false;
    this.finishTimer = 0;
  }

  private currentLevel(): BattleshipsLevel {
    return BATTLESHIPS_LEVELS[this.level]!;
  }

  private geometry(view: View): BattleshipsGeometry {
    const top = 112;
    const bottom = 122;
    const available = Math.max(120, view.height - top - bottom);
    const cell = clamp(
      Math.min(
        (view.width * 0.9) / (BATTLESHIPS_SIZE + 1.2),
        (view.height * 0.62) / (BATTLESHIPS_SIZE + 1.2),
        available / (BATTLESHIPS_SIZE + 1.15),
        68,
      ),
      20,
      68,
    );
    const gutter = cell * 1.15;
    const width = cell * BATTLESHIPS_SIZE;
    const height = cell * BATTLESHIPS_SIZE;
    const boardY = top + gutter + Math.max(0, (available - (height + gutter)) / 2);
    const boardX = (view.width - (width + gutter)) / 2 + gutter;

    const layout: PuzzleLayout = {
      cols: BATTLESHIPS_SIZE,
      rows: BATTLESHIPS_SIZE,
      cell,
      x: boardX,
      y: boardY,
      width,
      height,
    };

    const gap = 10;
    const buttonWidth = Math.max(112, Math.min(180, (view.width - 44 - gap) / 2));
    const buttonHeight = 44;
    const buttonsY = view.height - 86;
    const buttonsStart = (view.width - (buttonWidth * 2 + gap)) / 2;

    const panelWidth = Math.min(350, Math.max(280, view.width * 0.82));
    const panelHeight = 212;
    const panelY = Math.max(
      120,
      Math.min(view.height - panelHeight - 96, view.height / 2 - panelHeight / 2),
    );
    const panelX = (view.width - panelWidth) / 2;
    const nextWidth = Math.min(240, panelWidth - 56);

    return {
      layout,
      gutter,
      checkButton: {
        x: buttonsStart,
        y: buttonsY,
        width: buttonWidth,
        height: buttonHeight,
      },
      surrenderButton: {
        x: buttonsStart + buttonWidth + gap,
        y: buttonsY,
        width: buttonWidth,
        height: buttonHeight,
      },
      panel: {
        x: panelX,
        y: panelY,
        width: panelWidth,
        height: panelHeight,
        button: {
          x: (view.width - nextWidth) / 2,
          y: panelY + panelHeight - 62,
          width: nextWidth,
          height: 44,
        },
      },
    };
  }

  private handlePointer(point: LocalPoint): void {
    if (this.state !== 'running') return;
    const geometry = this.geometry(this.runtime.view);

    if (this.solved) {
      if (
        this.level < BATTLESHIPS_LEVELS.length - 1 &&
        pointInButton(point.x, point.y, geometry.panel.button)
      ) {
        this.advance();
      }
      return;
    }

    if (pointInButton(point.x, point.y, geometry.checkButton)) {
      this.checkBoard(true);
      return;
    }
    if (pointInButton(point.x, point.y, geometry.surrenderButton)) {
      this.surrender();
      return;
    }

    const index = cellAt(geometry.layout, point.x, point.y);
    if (index === null) return;
    this.cursor = index;
    this.toggleCell(index);
  }

  private handleKey(code: string): void {
    if (this.state !== 'running') return;

    if (this.solved) {
      if (
        this.level < BATTLESHIPS_LEVELS.length - 1 &&
        (code === 'Space' || code === 'Enter' || code === 'KeyC')
      ) {
        this.advance();
      }
      return;
    }

    const size = BATTLESHIPS_SIZE;
    const column = this.cursor % size;
    const row = Math.floor(this.cursor / size);

    if (code === 'ArrowLeft') {
      this.moveTo(row * size + Math.max(0, column - 1));
      return;
    }
    if (code === 'ArrowRight') {
      this.moveTo(row * size + Math.min(size - 1, column + 1));
      return;
    }
    if (code === 'ArrowUp') {
      this.moveTo(Math.max(0, row - 1) * size + column);
      return;
    }
    if (code === 'ArrowDown') {
      this.moveTo(Math.min(size - 1, row + 1) * size + column);
      return;
    }
    if (code === 'Space' || code === 'Enter') {
      this.toggleCell(this.cursor);
      return;
    }
    if (code === 'KeyC') {
      this.checkBoard(true);
      return;
    }
    if (code === 'KeyR') {
      this.restartLevel();
    }
  }

  private moveTo(index: number): void {
    if (index === this.cursor) return;
    this.cursor = index;
    this.audio.tone(300, 0.03, { type: 'triangle', gain: 0.018 });
  }

  private toggleCell(index: number): void {
    if (this.solved) return;
    this.marks[index] = this.marks[index] !== true;
    this.validation = null;
    this.audio.tone(this.marks[index] === true ? 420 : 300, 0.045, {
      type: 'triangle',
      gain: 0.03,
    });
    const row = Math.floor(index / BATTLESHIPS_SIZE) + 1;
    const column = (index % BATTLESHIPS_SIZE) + 1;
    this.setStatus(
      `Fila ${row}, columna ${column}: ${this.marks[index] === true ? 'barco' : 'agua'}.`,
    );
    this.autoCheck();
  }

  private autoCheck(): void {
    const occupied = this.marks.reduce((total, mark) => total + (mark === true ? 1 : 0), 0);
    if (occupied === FLEET_CELLS) this.checkBoard(false);
  }

  private checkBoard(manual: boolean): void {
    if (this.solved) return;
    const result = validateBattleships(this.marks, this.currentLevel());
    this.validation = result;

    if (result.valid) {
      this.solveLevel();
      return;
    }

    if (manual) {
      this.levelPenalty = Math.min(LEVEL_SCORE, this.levelPenalty + CHECK_PENALTY);
      this.audio.tone(175, 0.16, { type: 'triangle', gain: 0.05 });
    } else {
      this.audio.tone(210, 0.1, { type: 'triangle', gain: 0.03 });
    }
    this.setStatus(result.issues[0] ?? 'La colocación todavía no cumple las reglas.');
  }

  private solveLevel(): void {
    if (this.solved) return;
    this.solved = true;
    this.levelAward = Math.max(0, LEVEL_SCORE - this.levelPenalty);
    this.points += this.levelAward;
    this.setScore('PUNTOS', this.points);
    this.audio.chord([392, 494, 587], 0.55, { type: 'sine', gain: 0.09 });
    this.setStatus(`Nivel resuelto: ${this.currentLevel().name}.`);

    if (this.level >= BATTLESHIPS_LEVELS.length - 1) {
      this.pendingFinish = true;
      this.finishTimer = 0;
    }
  }

  private advance(): void {
    if (!this.solved || this.level >= BATTLESHIPS_LEVELS.length - 1) return;
    this.audio.click();
    this.pendingAdvance = true;
    this.restart();
    this.setStatus(
      `Nivel ${this.level + 1} de ${BATTLESHIPS_LEVELS.length}: ${this.currentLevel().name}.`,
    );
  }

  private restartLevel(): void {
    if (this.solved) return;
    this.audio.click();
    this.loadLevel();
    this.setStatus(`Nivel ${this.level + 1} reiniciado.`);
  }

  private surrender(): void {
    if (this.state !== 'running' || this.solved) return;
    this.audio.tone(200, 0.24, { type: 'triangle', gain: 0.05 });
    const solvedLevels = this.level;
    this.finish({
      title: 'Travesía interrumpida',
      message:
        solvedLevels > 0
          ? `Has resuelto ${solvedLevels} de ${BATTLESHIPS_LEVELS.length} niveles antes de retirarte.`
          : 'No has llegado a resolver ningún nivel.',
      detail: `${this.points} puntos`,
      score: this.points,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Volver a intentarlo',
      tone: 'lose',
    });
  }

  private finishSession(): void {
    if (this.finished) return;
    this.finished = true;
    this.audio.chord([392, 494, 587, 784], 0.9, { type: 'sine', gain: 0.1 });
    this.setStatus(`Travesía completada con ${this.points} puntos.`);
    this.finish({
      title: 'Travesía completada',
      message: 'Has colocado las cinco flotas sin un solo contacto entre barcos.',
      detail: `${BATTLESHIPS_LEVELS.length} niveles · ${this.points} puntos`,
      score: this.points,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Jugar de nuevo',
      tone: 'win',
    });
  }

  protected update(dt: number): void {
    if (!this.pendingFinish) return;
    this.finishTimer += dt;
    if (this.finishTimer >= 0.9) {
      this.pendingFinish = false;
      this.finishSession();
    }
  }

  private drawClues(
    context: CanvasRenderingContext2D,
    layout: PuzzleLayout,
    geometry: BattleshipsGeometry,
  ): void {
    const level = this.currentLevel();
    const fontSize = Math.max(10, layout.cell * 0.3);
    const center = geometry.gutter * 0.5;
    const validation = this.validation;

    context.save();
    context.font = `600 ${fontSize}px ${FONT_MONO}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    for (let index = 0; index < BATTLESHIPS_SIZE; index += 1) {
      const rowValue = level.rows[index] ?? 0;
      const rowError = validation?.rowErrors[index] === true;
      context.fillStyle = rowError
        ? PALETTE.apricot
        : rowValue === 0
          ? alpha(PALETTE.ink, 0.3)
          : alpha(PALETTE.ink, 0.7);
      context.fillText(
        String(rowValue),
        layout.x - center,
        layout.y + (index + 0.5) * layout.cell + 1,
      );

      const columnValue = level.columns[index] ?? 0;
      const columnError = validation?.columnErrors[index] === true;
      context.fillStyle = columnError
        ? PALETTE.apricot
        : columnValue === 0
          ? alpha(PALETTE.ink, 0.3)
          : alpha(PALETTE.ink, 0.7);
      context.fillText(
        String(columnValue),
        layout.x + (index + 0.5) * layout.cell,
        layout.y - center + 1,
      );
    }
    context.restore();
  }

  private drawCells(context: CanvasRenderingContext2D, layout: PuzzleLayout): void {
    const invalid = new Set(this.validation?.invalidCells ?? []);
    const cursorVisible = this.state === 'running' && !this.solved;

    for (let index = 0; index < BATTLESHIPS_CELLS; index += 1) {
      const row = Math.floor(index / BATTLESHIPS_SIZE);
      const column = index % BATTLESHIPS_SIZE;
      const occupied = this.marks[index] === true;
      const bad = invalid.has(index);
      const cursor = cursorVisible && index === this.cursor;
      const fill = bad ? alpha(PALETTE.apricot, 0.92) : occupied ? ACCENT : '#fffdf8';
      const stroke = bad ? PALETTE.apricot : cursor ? PALETTE.forest : 'rgba(36, 51, 45, 0.13)';

      drawPuzzleCell(context, layout, index, {
        fill,
        stroke,
        strokeWidth: cursor ? 2.1 : 1.25,
      });

      if (occupied) {
        context.save();
        roundedRect(
          context,
          layout.x + column * layout.cell + layout.cell * 0.29,
          layout.y + row * layout.cell + layout.cell * 0.31,
          layout.cell * 0.42,
          layout.cell * 0.38,
          layout.cell * 0.12,
        );
        context.fillStyle = alpha(PALETTE.surface, 0.34);
        context.fill();
        context.restore();
      }
    }
  }

  private drawLegend(
    context: CanvasRenderingContext2D,
    view: View,
    geometry: BattleshipsGeometry,
  ): void {
    const boardBottom = geometry.layout.y + geometry.layout.height;
    const space = geometry.checkButton.y - boardBottom;
    const compact = space < 58;
    const legendY = compact
      ? boardBottom + 16
      : Math.min(boardBottom + 26, geometry.checkButton.y - 46);
    const invalid = this.validation !== null && !this.validation.valid && !this.solved;
    const message = this.solved
      ? 'FLOTA COMPLETADA'
      : invalid
        ? (this.validation?.issues[0] ?? 'La colocación no cumple las reglas.')
        : 'FLECHAS + ESPACIO · C COMPROBAR · R REINICIA';

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `500 9px ${FONT_MONO}`;
    if (!compact) {
      context.fillStyle = alpha(PALETTE.ink, 0.56);
      context.fillText(`FLOTA ${FLEET_LEGEND}`, view.width / 2, legendY);
    }
    context.fillStyle = this.solved
      ? PALETTE.forest
      : invalid
        ? PALETTE.apricot
        : alpha(PALETTE.ink, 0.44);
    context.fillText(message, view.width / 2, compact ? legendY : legendY + 18);
    context.restore();
  }

  private drawComplete(
    context: CanvasRenderingContext2D,
    view: View,
    geometry: BattleshipsGeometry,
  ): void {
    const panel = geometry.panel;
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
    context.fillStyle = alpha(ACCENT, 0.9);
    context.fillText('NIVEL COMPLETADO', view.width / 2, panel.y + 38);

    context.font = `600 22px ${FONT_SANS}`;
    context.fillStyle = PALETTE.ink;
    context.fillText(this.currentLevel().name, view.width / 2, panel.y + 72);

    context.font = `600 12px ${FONT_MONO}`;
    context.fillStyle = PALETTE.forest;
    context.fillText(`+${this.levelAward} PUNTOS`, view.width / 2, panel.y + 100);

    context.font = `500 11px ${FONT_SANS}`;
    context.fillStyle = alpha(PALETTE.ink, 0.58);
    context.fillText('La siguiente ruta espera.', view.width / 2, panel.y + 122);

    drawUiButton(context, panel.button, 'SIGUIENTE NIVEL', {
      active: true,
      accent: ACCENT,
    });
    context.restore();
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, ACCENT);
    const geometry = this.geometry(view);
    const { layout } = geometry;
    const occupied = this.marks.reduce((total, mark) => total + (mark === true ? 1 : 0), 0);

    drawPuzzleHeader(
      context,
      view,
      'BATALLA NAVAL',
      `NIVEL ${this.level + 1} DE ${BATTLESHIPS_LEVELS.length} · ${this.currentLevel().name}`,
    );

    if (layout.y - geometry.gutter > 140) {
      context.save();
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `500 9px ${FONT_SANS}`;
      context.fillStyle = alpha(PALETTE.ink, 0.5);
      context.fillText('Las cifras indican casillas ocupadas.', view.width / 2, 120);
      context.restore();
    }

    drawPuzzleBoard(
      context,
      {
        ...layout,
        x: layout.x - geometry.gutter,
        y: layout.y - geometry.gutter,
        width: layout.width + geometry.gutter,
        height: layout.height + geometry.gutter,
      },
      { padding: 0 },
    );

    this.drawClues(context, layout, geometry);
    this.drawCells(context, layout);
    this.drawLegend(context, view, geometry);

    if (!this.solved) {
      drawUiButton(context, geometry.checkButton, 'COMPROBAR', {
        active: true,
        accent: ACCENT,
      });
      drawUiButton(context, geometry.surrenderButton, 'RENDIRSE');
    }

    drawPuzzleFooter(
      context,
      view,
      `NIVEL ${this.level + 1}/${BATTLESHIPS_LEVELS.length}`,
      `CASILLAS ${occupied}/${FLEET_CELLS}`,
    );

    if (this.solved && this.level < BATTLESHIPS_LEVELS.length - 1) {
      this.drawComplete(context, view, geometry);
    }
  }
}

export default {
  mount: (context: GameContext) => new Battleships(context),
} satisfies GameModule;
