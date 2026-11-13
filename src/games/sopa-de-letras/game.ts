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
  drawSegmented,
  pointInButton,
  roundedRect,
  segmentedButtons,
  type GameContext,
  type GameModule,
  type View,
} from '../engine';
import {
  DEFAULT_SOUP_LEVEL,
  SOUP_LEVELS,
  generateSoup,
  traceSelection,
  type Soup,
  type SoupLevel,
} from './logic';

const START_SCORE = 1000;
const PENALTY = 20;

interface SoupLayout {
  cols: number;
  rows: number;
  cell: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

class SopaDeLetras extends BaseGame {
  private difficulty = DEFAULT_SOUP_LEVEL;
  private level: SoupLevel = SOUP_LEVELS[this.difficulty]!;
  private soup: Soup = generateSoup(this.level);
  private selected = -1;
  private found = new Set<string>();
  private foundCells = new Set<number>();
  private foundLines: number[][] = [];
  private attempts = 0;
  private cursor = -1;
  private missCells: number[] = [];
  private missTimer = 0;
  private done = false;

  constructor(context: GameContext) {
    super(context);

    this.input.onPointerDown((point) => {
      const difficulty = this.difficultyButtons(this.runtime.view).findIndex((button) =>
        pointInButton(point.x, point.y, button),
      );
      if (difficulty >= 0) {
        this.setDifficulty(difficulty);
        return;
      }
      const layout = this.layout(this.runtime.view);
      const cell = cellAt(layout, point.x, point.y);
      if (cell === null) return;
      this.cursor = -1;
      this.select(cell);
    });

    this.input.onKeyDown((code) => {
      if (code === 'KeyR') {
        this.reset();
        this.setStatus('Nueva sopa de letras.');
        return;
      }
      if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3') {
        this.setDifficulty(Number(code.slice(5)) - 1);
        return;
      }
      if (
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown'
      ) {
        this.moveCursor(code);
        return;
      }
      if (code === 'Enter' || code === 'Space') {
        const cell = this.cursor < 0 ? 0 : this.cursor;
        this.cursor = cell;
        this.select(cell);
      }
    });
  }

  protected reset(): void {
    this.soup = generateSoup(this.level);
    this.selected = -1;
    this.found = new Set<string>();
    this.foundCells = new Set<number>();
    this.foundLines = [];
    this.attempts = 0;
    this.cursor = -1;
    this.missCells = [];
    this.missTimer = 0;
    this.done = false;
    this.setScore('PUNTOS', START_SCORE);
  }

  private difficultyButtons(view: View): ReturnType<typeof segmentedButtons> {
    return segmentedButtons(view, SOUP_LEVELS.length, 56);
  }

  private setDifficulty(index: number): void {
    if (index < 0 || index >= SOUP_LEVELS.length || index === this.difficulty) return;
    this.difficulty = index;
    this.level = SOUP_LEVELS[index]!;
    this.reset();
    this.audio.click();
    this.setStatus(
      `${this.level.label}: ${this.level.size}×${this.level.size} con ${this.level.words.length} palabras.`,
    );
  }

  protected update(dt: number): void {
    if (this.missTimer <= 0) return;
    this.missTimer = Math.max(0, this.missTimer - dt);
    if (this.missTimer === 0) this.missCells = [];
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    const accent = '#cf8a8a';
    drawPuzzleBackground(context, view, accent);
    drawSegmented(
      context,
      this.difficultyButtons(view),
      SOUP_LEVELS.map((level) => level.label),
      this.difficulty,
      accent,
    );
    const layout = this.layout(view);
    drawPuzzleBoard(context, layout);

    for (const line of this.foundLines) {
      if (line.length === 0) continue;
      const first = line[0]!;
      const last = line[line.length - 1]!;
      const x1 = layout.x + (first % this.soup.size) * layout.cell + layout.cell / 2;
      const y1 = layout.y + Math.floor(first / this.soup.size) * layout.cell + layout.cell / 2;
      const x2 = layout.x + (last % this.soup.size) * layout.cell + layout.cell / 2;
      const y2 = layout.y + Math.floor(last / this.soup.size) * layout.cell + layout.cell / 2;
      context.save();
      context.strokeStyle = alpha(PALETTE.forest, 0.2);
      context.lineWidth = layout.cell * 0.64;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
      context.restore();
    }

    for (let index = 0; index < this.soup.size * this.soup.size; index += 1) {
      const isSelected = index === this.selected;
      const isFound = this.foundCells.has(index);
      const isMiss = this.missTimer > 0 && this.missCells.includes(index);
      drawPuzzleCell(context, layout, index, {
        fill: isSelected
          ? accent
          : isFound
            ? alpha(PALETTE.forest, 0.14)
            : isMiss
              ? alpha(accent, 0.3)
              : '#fffdf8',
        stroke: isSelected
          ? accent
          : isFound
            ? alpha(PALETTE.forest, 0.3)
            : 'rgba(36, 51, 45, 0.12)',
        strokeWidth: isFound || isSelected ? 2 : 1.2,
        text: this.soup.letters[index]!,
        textColor: isSelected ? PALETTE.surface : isFound ? PALETTE.forest : PALETTE.ink,
        fontSize: layout.cell * 0.44,
      });
    }

    if (this.cursor >= 0) {
      const column = this.cursor % this.soup.size;
      const row = Math.floor(this.cursor / this.soup.size);
      context.save();
      roundedRect(
        context,
        layout.x + column * layout.cell + 2.5,
        layout.y + row * layout.cell + 2.5,
        layout.cell - 5,
        layout.cell - 5,
        layout.cell * 0.16,
      );
      context.strokeStyle = PALETTE.forest;
      context.lineWidth = 2.5;
      context.stroke();
      context.restore();
    }

    this.drawWordList(context, view, layout);
    drawPuzzleFooter(
      context,
      view,
      `Intentos ${this.attempts}`,
      `${this.found.size}/${this.soup.words.length} palabras`,
    );
  }

  private layout(view: View): SoupLayout {
    const top = 104;
    const listSpace = 96;
    const cell = clamp(
      Math.min(
        (view.width - 32) / this.soup.size,
        (view.height - top - listSpace - 26) / this.soup.size,
      ),
      14,
      38,
    );
    const width = cell * this.soup.size;
    return {
      cols: this.soup.size,
      rows: this.soup.size,
      cell,
      x: (view.width - width) / 2,
      y: top,
      width,
      height: cell * this.soup.size,
    };
  }

  private drawWordList(context: CanvasRenderingContext2D, view: View, layout: SoupLayout): void {
    const rows = 2;
    const columns = Math.ceil(this.soup.words.length / rows);
    const slot = layout.width / columns;
    const startY = layout.y + layout.height + 26;

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `700 13px ${FONT_SANS}`;
    for (let index = 0; index < this.soup.words.length; index += 1) {
      const word = this.soup.words[index]!;
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = layout.x + column * slot + slot / 2;
      const y = startY + row * 24;
      const isFound = this.found.has(word);
      context.fillStyle = isFound ? alpha(PALETTE.ink, 0.35) : PALETTE.ink;
      context.fillText(word, x, y);
      if (isFound) {
        const width = context.measureText(word).width + 8;
        context.strokeStyle = alpha(PALETTE.ink, 0.3);
        context.lineWidth = 1.2;
        context.beginPath();
        context.moveTo(x - width / 2, y + 0.5);
        context.lineTo(x + width / 2, y + 0.5);
        context.stroke();
      }
    }
    context.restore();

    const meterY = startY + 52;
    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `500 10px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.5);
    context.fillText(
      `${this.found.size} de ${this.soup.words.length} · toca las dos puntas`,
      view.width / 2,
      meterY,
    );
    context.restore();
  }

  private select(cell: number): void {
    if (this.done) return;

    if (this.selected < 0) {
      this.selected = cell;
      this.audio.click();
      this.setStatus('Primera letra elegida. Toca la última letra de la palabra.');
      return;
    }

    if (this.selected === cell) {
      this.selected = -1;
      this.audio.click();
      return;
    }

    const trace = traceSelection(this.soup, this.selected, cell);
    const from = this.selected;
    this.selected = -1;

    if (!trace) {
      this.markMiss(from, cell);
      return;
    }

    if (this.found.has(trace.word)) {
      this.audio.tone(320, 0.08, { type: 'triangle', gain: 0.04 });
      this.setStatus(`"${trace.word}" ya estaba encontrada.`);
      return;
    }

    this.found.add(trace.word);
    this.foundLines.push(trace.cells);
    for (const index of trace.cells) this.foundCells.add(index);
    this.audio.chord([523.25, 659.25, 783.99], 0.32, { gain: 0.08 });
    this.setStatus(`"${trace.word}" encontrada.`);

    if (this.found.size === this.soup.words.length) {
      this.done = true;
      this.audio.chord([392, 523.25, 659.25, 783.99], 0.5, { gain: 0.1 });
      this.finish({
        title: 'Sopa resuelta',
        message: 'Todas las palabras estaban escondidas en la sopa.',
        detail: `${this.level.size}×${this.level.size} · ${this.attempts} intentos fallidos`,
        score: this.points(),
        scoreLabel: 'PUNTOS',
        tone: 'win',
      });
    }
  }

  private markMiss(from: number, to: number): void {
    this.attempts += 1;
    this.missCells = [from, to];
    this.missTimer = 0.5;
    this.audio.tone(210, 0.12, { type: 'triangle', gain: 0.05, slideTo: 170 });
    this.setStatus('Esa línea no forma una de las palabras.');
    this.setScore('PUNTOS', this.points());
  }

  private points(): number {
    return Math.max(0, START_SCORE - this.attempts * PENALTY);
  }

  private moveCursor(code: string): void {
    if (this.cursor < 0) {
      this.cursor = 0;
      return;
    }
    const column = this.cursor % this.soup.size;
    const row = Math.floor(this.cursor / this.soup.size);
    if (code === 'ArrowLeft') this.cursor = row * this.soup.size + Math.max(0, column - 1);
    if (code === 'ArrowRight') {
      this.cursor = row * this.soup.size + Math.min(this.soup.size - 1, column + 1);
    }
    if (code === 'ArrowUp') this.cursor = Math.max(0, row - 1) * this.soup.size + column;
    if (code === 'ArrowDown') {
      this.cursor = Math.min(this.soup.size - 1, row + 1) * this.soup.size + column;
    }
    this.audio.click();
  }
}

export default {
  mount: (context: GameContext) => new SopaDeLetras(context),
} satisfies GameModule;
