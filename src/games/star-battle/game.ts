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
  CELL_DISCARD,
  CELL_EMPTY,
  CELL_STAR,
  STAR_BATTLE_LEVELS,
  STAR_BATTLE_SIZE,
  conflictMask,
  isValidArrangement,
  nextMark,
  regionLabel,
  starProgress,
  starsFromMarks,
  type StarBattleLevel,
  type StarMark,
} from './logic';

const ACCENT = '#cf8a8a';
const REGION_TINTS: readonly string[] = [
  '#cf8a8a',
  '#8fb397',
  '#d9b95f',
  '#7fa9c2',
  '#a78fbf',
  '#df8b6c',
];

interface StarBattleGeometry {
  layout: PuzzleLayout;
  checkButton: UiButton;
  resetButton: UiButton;
  nextButton: UiButton;
}

interface LocalPoint {
  x: number;
  y: number;
}

class StarBattle extends BaseGame {
  private level = 0;
  private marks: StarMark[] = new Array<StarMark>(STAR_BATTLE_SIZE * STAR_BATTLE_SIZE).fill(
    CELL_EMPTY,
  );
  private conflicts: boolean[] = new Array<boolean>(STAR_BATTLE_SIZE * STAR_BATTLE_SIZE).fill(
    false,
  );
  private cursor = 0;
  private score = 0;
  private levelMistakes = 0;
  private totalMistakes = 0;
  private solved = false;
  private solvedTimer = 0;
  private pendingAdvance = false;
  private finished = false;
  private attemptFlagged = false;
  private showConflicts = false;

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => this.handlePointer(point));
    this.input.onKeyDown((code) => this.handleKey(code));
  }

  protected reset(): void {
    if (this.pendingAdvance) {
      this.pendingAdvance = false;
      this.level = (this.level + 1) % STAR_BATTLE_LEVELS.length;
    } else {
      this.level = 0;
      this.score = 0;
      this.totalMistakes = 0;
    }
    this.levelMistakes = 0;
    this.loadLevel();
    this.setScore('PUNTOS', this.score);
  }

  private loadLevel(): void {
    this.marks = new Array<StarMark>(STAR_BATTLE_SIZE * STAR_BATTLE_SIZE).fill(CELL_EMPTY);
    this.conflicts = new Array<boolean>(STAR_BATTLE_SIZE * STAR_BATTLE_SIZE).fill(false);
    this.cursor = 0;
    this.solved = false;
    this.solvedTimer = 0;
    this.finished = false;
    this.attemptFlagged = false;
    this.showConflicts = false;
  }

  private currentLevel(): StarBattleLevel {
    return STAR_BATTLE_LEVELS[this.level]!;
  }

  private geometry(view: View): StarBattleGeometry {
    const layout = puzzleLayout(view, STAR_BATTLE_SIZE, STAR_BATTLE_SIZE, {
      top: 122,
      bottom: 104,
      widthRatio: 0.84,
      heightRatio: 0.62,
      maxCell: 72,
    });

    const gap = 10;
    const buttonWidth = Math.min(150, Math.max(96, (view.width - 48 - gap) / 2));
    const totalWidth = buttonWidth * 2 + gap;
    const startX = (view.width - totalWidth) / 2;
    const buttonY = layout.y + layout.height + 18;

    const nextWidth = Math.min(220, view.width * 0.7);

    return {
      layout,
      checkButton: { x: startX, y: buttonY, width: buttonWidth, height: 38 },
      resetButton: {
        x: startX + buttonWidth + gap,
        y: buttonY,
        width: buttonWidth,
        height: 38,
      },
      nextButton: {
        x: (view.width - nextWidth) / 2,
        y: view.height / 2 + 42,
        width: nextWidth,
        height: 44,
      },
    };
  }

  private handlePointer(point: LocalPoint): void {
    if (this.state !== 'running') return;
    const geometry = this.geometry(this.runtime.view);

    if (this.solved) {
      if (
        this.level < STAR_BATTLE_LEVELS.length - 1 &&
        pointInButton(point.x, point.y, geometry.nextButton)
      ) {
        this.advance();
      }
      return;
    }

    if (pointInButton(point.x, point.y, geometry.checkButton)) {
      this.checkPlacement();
      return;
    }
    if (pointInButton(point.x, point.y, geometry.resetButton)) {
      this.restartLevel();
      return;
    }

    const index = cellAt(geometry.layout, point.x, point.y);
    if (index === null) return;
    this.cursor = index;
    this.cycleCell(index);
  }

  private handleKey(code: string): void {
    if (this.state !== 'running') return;

    if (this.solved) {
      if (
        this.level < STAR_BATTLE_LEVELS.length - 1 &&
        (code === 'Space' || code === 'Enter' || code === 'NumpadEnter')
      ) {
        this.advance();
      }
      return;
    }

    const column = this.cursor % STAR_BATTLE_SIZE;
    const row = Math.floor(this.cursor / STAR_BATTLE_SIZE);

    if (code === 'ArrowLeft') {
      this.cursor = row * STAR_BATTLE_SIZE + Math.max(0, column - 1);
      this.moveTone();
      return;
    }
    if (code === 'ArrowRight') {
      this.cursor = row * STAR_BATTLE_SIZE + Math.min(STAR_BATTLE_SIZE - 1, column + 1);
      this.moveTone();
      return;
    }
    if (code === 'ArrowUp') {
      this.cursor = Math.max(0, row - 1) * STAR_BATTLE_SIZE + column;
      this.moveTone();
      return;
    }
    if (code === 'ArrowDown') {
      this.cursor = Math.min(STAR_BATTLE_SIZE - 1, row + 1) * STAR_BATTLE_SIZE + column;
      this.moveTone();
      return;
    }
    if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter') {
      this.setStar(this.cursor);
      return;
    }
    if (code === 'KeyX') {
      this.setDiscard(this.cursor);
      return;
    }
    if (code === 'KeyR') {
      this.restartLevel();
      return;
    }
    if (code === 'KeyC') {
      this.checkPlacement();
    }
  }

  private moveTone(): void {
    this.audio.tone(300, 0.025, { type: 'triangle', gain: 0.012 });
  }

  private cycleCell(index: number): void {
    const next = nextMark(this.marks[index] ?? CELL_EMPTY);
    this.marks[index] = next;
    this.toggleTone(next);
    this.afterChange();
  }

  private setStar(index: number): void {
    const next = this.marks[index] === CELL_STAR ? CELL_EMPTY : CELL_STAR;
    this.marks[index] = next;
    this.toggleTone(next);
    this.afterChange();
  }

  private setDiscard(index: number): void {
    const next = this.marks[index] === CELL_DISCARD ? CELL_EMPTY : CELL_DISCARD;
    this.marks[index] = next;
    this.toggleTone(next);
    this.afterChange();
  }

  private toggleTone(mark: StarMark): void {
    if (mark === CELL_STAR) {
      this.audio.tone(640, 0.05, { type: 'triangle', gain: 0.03 });
    } else if (mark === CELL_DISCARD) {
      this.audio.tone(360, 0.04, { type: 'triangle', gain: 0.022 });
    } else {
      this.audio.tone(280, 0.04, { type: 'triangle', gain: 0.018 });
    }
  }

  private afterChange(): void {
    const level = this.currentLevel();
    const stars = starsFromMarks(this.marks);
    const progress = starProgress(level, stars);
    this.conflicts = conflictMask(level, stars);

    if (progress.stars >= STAR_BATTLE_SIZE) {
      if (isValidArrangement(level, stars)) {
        this.solve();
        return;
      }
      this.registerMistake();
      this.showConflicts = true;
      this.setStatus(
        'Hay estrellas en conflicto. Revisa las filas, columnas, regiones y los contactos en diagonal.',
      );
      return;
    }

    if (this.attemptFlagged) this.attemptFlagged = false;
    this.showConflicts = false;
  }

  private registerMistake(): void {
    if (this.attemptFlagged) return;
    this.attemptFlagged = true;
    this.levelMistakes += 1;
    this.totalMistakes += 1;
  }

  private checkPlacement(): void {
    const level = this.currentLevel();
    const stars = starsFromMarks(this.marks);
    const progress = starProgress(level, stars);

    if (progress.stars === 0) {
      this.setStatus('Todavía no hay estrellas. Toca una celda para colocar la primera.');
      this.toast('Coloca una estrella');
      return;
    }
    if (progress.stars < STAR_BATTLE_SIZE) {
      const remaining = STAR_BATTLE_SIZE - progress.stars;
      const label = remaining === 1 ? 'estrella' : 'estrellas';
      this.setStatus(`Faltan ${remaining} ${label} para completar el tablero.`);
      this.toast(`Faltan ${remaining} ${label}`);
      return;
    }
    if (progress.stars > STAR_BATTLE_SIZE) {
      this.registerMistake();
      this.conflicts = conflictMask(level, stars);
      this.showConflicts = true;
      this.setStatus('Hay demasiadas estrellas. Debe quedar una por fila, columna y región.');
      this.audio.tone(180, 0.16, { type: 'sine', gain: 0.04 });
      return;
    }

    this.conflicts = conflictMask(level, stars);
    if (isValidArrangement(level, stars)) {
      this.solve();
      return;
    }

    this.registerMistake();
    this.showConflicts = true;
    this.setStatus(
      'La disposición no cumple las reglas: sobra una estrella en alguna fila, columna o región, o hay dos en contacto.',
    );
    this.audio.tone(180, 0.16, { type: 'sine', gain: 0.04 });
  }

  private solve(): void {
    if (this.solved) return;
    this.solved = true;
    this.solvedTimer = 0;
    this.showConflicts = false;
    this.conflicts = new Array<boolean>(STAR_BATTLE_SIZE * STAR_BATTLE_SIZE).fill(false);

    const gained = Math.max(120, 200 - this.levelMistakes * 20);
    this.score += gained;
    this.setScore('PUNTOS', this.score);
    this.setStatus(`Nivel ${this.level + 1} completado: ${this.currentLevel().name}.`);
    this.audio.chord([392, 494, 587, 784], 0.7, { type: 'sine', gain: 0.09 });
  }

  private advance(): void {
    if (this.level >= STAR_BATTLE_LEVELS.length - 1) return;
    this.pendingAdvance = true;
    this.audio.click();
    this.restart();
  }

  private restartLevel(): void {
    this.loadLevel();
    this.setScore('PUNTOS', this.score);
    this.audio.click();
    this.setStatus(`Nivel ${this.level + 1} reiniciado.`);
  }

  private finishSession(): void {
    if (this.finished) return;
    this.finished = true;
    const detail =
      this.totalMistakes === 0
        ? `${STAR_BATTLE_LEVELS.length} mapas sin conflictos`
        : `${this.totalMistakes} ${this.totalMistakes === 1 ? 'disposición con conflicto' : 'disposiciones con conflicto'}`;
    this.finish({
      title: 'Constelación completa',
      message:
        'Has resuelto los cinco mapas estelares respetando filas, columnas, regiones y distancias.',
      detail,
      score: this.score,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Jugar de nuevo',
      tone: 'win',
    });
  }

  protected update(dt: number): void {
    if (!this.solved) return;
    this.solvedTimer += dt;
    if (this.level === STAR_BATTLE_LEVELS.length - 1 && this.solvedTimer > 1.1 && !this.finished) {
      this.finishSession();
    }
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, ACCENT);
    drawPuzzleHeader(context, view, 'BATALLA ESTELAR', 'UNA ESTRELLA POR FILA, COLUMNA Y REGIÓN');

    const geometry = this.geometry(view);
    const { layout } = geometry;

    drawPuzzleBoard(context, layout, { padding: 10, fill: 'rgba(255, 253, 248, 0.8)' });
    this.drawProgress(context, view, layout);
    this.drawBoard(context, layout);
    this.drawButtons(context, geometry);

    const stars = this.marks.reduce<number>(
      (total, mark) => total + (mark === CELL_STAR ? 1 : 0),
      0,
    );
    drawPuzzleFooter(
      context,
      view,
      `NIVEL ${this.level + 1}/${STAR_BATTLE_LEVELS.length}`,
      `ESTRELLAS ${stars}/${STAR_BATTLE_SIZE}`,
      'TOCA PARA MARCAR · X DESCARTE · R REINICIA',
    );

    if (this.solved && this.level < STAR_BATTLE_LEVELS.length - 1) {
      this.drawOverlay(context, view, geometry);
    }
  }

  private drawProgress(context: CanvasRenderingContext2D, view: View, layout: PuzzleLayout): void {
    const progress = starProgress(this.currentLevel(), starsFromMarks(this.marks));
    const text = `FILAS ${progress.rows}/${STAR_BATTLE_SIZE} · COLUMNAS ${progress.columns}/${STAR_BATTLE_SIZE} · REGIONES ${progress.regions}/${STAR_BATTLE_SIZE}`;

    context.save();
    context.font = `500 ${view.width < 480 ? 9 : 10}px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.55);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, view.width / 2, layout.y - 16);
    context.restore();
  }

  private drawBoard(context: CanvasRenderingContext2D, layout: PuzzleLayout): void {
    const level = this.currentLevel();

    for (let index = 0; index < STAR_BATTLE_SIZE * STAR_BATTLE_SIZE; index += 1) {
      const row = Math.floor(index / STAR_BATTLE_SIZE);
      const column = index % STAR_BATTLE_SIZE;
      const label = regionLabel(level, row, column);
      const tint = REGION_TINTS[label - 1] ?? PALETTE.surface;
      const isCursor = index === this.cursor && this.state === 'running' && !this.solved;
      const isConflict = this.showConflicts && this.conflicts[index] === true;

      drawPuzzleCell(context, layout, index, {
        fill: alpha(tint, isCursor ? 0.3 : 0.19),
        stroke: isConflict ? PALETTE.apricot : isCursor ? PALETTE.sky : alpha(PALETTE.ink, 0.12),
        strokeWidth: isConflict || isCursor ? 2.2 : 1.2,
      });
    }

    this.drawRegionBorders(context, layout);

    for (let index = 0; index < STAR_BATTLE_SIZE * STAR_BATTLE_SIZE; index += 1) {
      const mark = this.marks[index] ?? CELL_EMPTY;
      if (mark === CELL_EMPTY) continue;

      const row = Math.floor(index / STAR_BATTLE_SIZE);
      const column = index % STAR_BATTLE_SIZE;
      const centerX = layout.x + (column + 0.5) * layout.cell;
      const centerY = layout.y + (row + 0.5) * layout.cell;

      if (mark === CELL_STAR) {
        const isConflict = this.showConflicts && this.conflicts[index] === true;
        this.drawStar(
          context,
          centerX,
          centerY,
          layout.cell * 0.29,
          isConflict ? PALETTE.apricot : PALETTE.butter,
        );
      } else {
        this.drawDiscard(context, centerX, centerY, layout.cell);
      }
    }
  }

  private drawRegionBorders(context: CanvasRenderingContext2D, layout: PuzzleLayout): void {
    const level = this.currentLevel();

    context.save();
    context.beginPath();
    for (let row = 0; row < STAR_BATTLE_SIZE; row += 1) {
      for (let column = 0; column < STAR_BATTLE_SIZE; column += 1) {
        const label = regionLabel(level, row, column);
        const x = layout.x + column * layout.cell;
        const y = layout.y + row * layout.cell;
        if (column < STAR_BATTLE_SIZE - 1 && regionLabel(level, row, column + 1) !== label) {
          context.moveTo(x + layout.cell, y + 3);
          context.lineTo(x + layout.cell, y + layout.cell - 3);
        }
        if (row < STAR_BATTLE_SIZE - 1 && regionLabel(level, row + 1, column) !== label) {
          context.moveTo(x + 3, y + layout.cell);
          context.lineTo(x + layout.cell - 3, y + layout.cell);
        }
      }
    }
    context.strokeStyle = alpha(PALETTE.ink, 0.38);
    context.lineWidth = Math.max(1.6, layout.cell * 0.04);
    context.lineCap = 'round';
    context.stroke();
    context.restore();
  }

  private drawStar(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    color: string,
  ): void {
    context.save();
    context.beginPath();
    for (let point = 0; point < 10; point += 1) {
      const angle = -Math.PI / 2 + (point * Math.PI) / 5;
      const distance = point % 2 === 0 ? radius : radius * 0.44;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      if (point === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fillStyle = color;
    context.fill();
    context.strokeStyle = alpha(PALETTE.ink, 0.45);
    context.lineWidth = Math.max(1, radius * 0.16);
    context.lineJoin = 'round';
    context.stroke();
    context.restore();
  }

  private drawDiscard(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    cell: number,
  ): void {
    const size = cell * 0.16;
    context.save();
    context.strokeStyle = alpha(PALETTE.ink, 0.34);
    context.lineWidth = Math.max(1.5, cell * 0.05);
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(centerX - size, centerY - size);
    context.lineTo(centerX + size, centerY + size);
    context.moveTo(centerX + size, centerY - size);
    context.lineTo(centerX - size, centerY + size);
    context.stroke();
    context.restore();
  }

  private drawButtons(context: CanvasRenderingContext2D, geometry: StarBattleGeometry): void {
    if (this.solved) return;
    drawUiButton(context, geometry.checkButton, 'COMPROBAR', { accent: PALETTE.forest });
    drawUiButton(context, geometry.resetButton, 'REINICIAR', { accent: PALETTE.forest });
  }

  private drawOverlay(
    context: CanvasRenderingContext2D,
    view: View,
    geometry: StarBattleGeometry,
  ): void {
    context.save();
    context.fillStyle = alpha(PALETTE.ink, 0.28);
    context.fillRect(0, 0, view.width, view.height);

    const width = Math.min(340, view.width * 0.84);
    const height = 200;
    const x = (view.width - width) / 2;
    const y = view.height / 2 - 106;

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
    context.fillText(this.currentLevel().name, view.width / 2, y + 72);
    context.font = `500 11px ${FONT_SANS}`;
    context.fillStyle = alpha(PALETTE.ink, 0.58);
    context.fillText('Los cielos siguen esperando.', view.width / 2, y + 98);

    drawUiButton(context, geometry.nextButton, 'SIGUIENTE NIVEL', {
      active: true,
      accent: PALETTE.forest,
    });
    context.restore();
  }
}

export default {
  mount: (context: GameContext) => new StarBattle(context),
} satisfies GameModule;
