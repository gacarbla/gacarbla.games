import {
  BaseGame,
  FONT_MONO,
  FONT_SANS,
  PALETTE,
  alpha,
  clamp,
  drawPuzzleBackground,
  drawPuzzleFooter,
  drawPuzzleHeader,
  drawUiButton,
  pointInButton,
  roundedRect,
  type GameContext,
  type GameModule,
  type UiButton,
  type View,
} from '../engine';
import {
  PENALTY_HINT,
  PENALTY_WRONG,
  ROUNDS_PER_GAME,
  buildRounds,
  matchesWord,
  pointsForWord,
  type AnagramRound,
} from './logic';

const ACCENT = '#cf8a8a';
const HEADER_SPACE = 156;
const BUTTON_HEIGHT = 44;

interface BoardLayout {
  slot: number;
  slotGap: number;
  slotsX: number;
  slotsY: number;
  panel: UiButton;
  tilesY: number;
  tileRects: UiButton[];
  buttons: {
    clear: UiButton;
    hint: UiButton;
  };
}

class Anagramas extends BaseGame {
  private rounds: AnagramRound[] = [];
  private index = 0;
  private built: number[] = [];
  private used = new Set<number>();
  private hintIndex: number | null = null;
  private hinted = false;
  private score = 0;
  private solved = 0;
  private misses = 0;
  private hintsUsed = 0;
  private feedback: 'hit' | 'miss' | null = null;
  private feedbackTimer = 0;
  private locked = false;
  private done = false;

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => this.handlePointer(point.x, point.y));
    this.input.onKeyDown((code, event) => this.handleKey(code, event));
  }

  protected reset(): void {
    this.rounds = buildRounds(ROUNDS_PER_GAME);
    this.index = 0;
    this.score = 0;
    this.solved = 0;
    this.misses = 0;
    this.hintsUsed = 0;
    this.done = false;
    this.beginRound();
    this.setScore('PUNTOS', 0);
  }

  protected update(dt: number): void {
    if (this.feedbackTimer <= 0) return;
    this.feedbackTimer = Math.max(0, this.feedbackTimer - dt);
    if (this.feedbackTimer > 0) return;

    this.feedback = null;
    if (this.done) return;

    if (this.index >= this.rounds.length - 1) {
      this.finishGame();
      return;
    }

    this.index += 1;
    this.beginRound();
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, ACCENT);

    if (this.rounds.length === 0) return;

    const round = this.rounds[Math.min(this.index, this.rounds.length - 1)]!;
    drawPuzzleHeader(
      context,
      view,
      'Anagramas',
      `${Math.min(this.index + 1, this.rounds.length)} de ${this.rounds.length} · ${round.word.length} letras`,
    );
    this.drawProgress(context, view);

    const layout = this.layout(view);

    context.save();
    roundedRect(
      context,
      layout.panel.x,
      layout.panel.y,
      layout.panel.width,
      layout.panel.height,
      22,
    );
    context.fillStyle = 'rgba(255, 253, 248, 0.84)';
    context.fill();
    context.strokeStyle =
      this.feedback === 'hit'
        ? PALETTE.forest
        : this.feedback === 'miss'
          ? PALETTE.apricot
          : alpha(PALETTE.ink, 0.14);
    context.lineWidth = this.feedback ? 2.4 : 1.4;
    context.stroke();
    context.restore();

    this.drawSlots(context, layout, round);
    this.drawNote(context, view, layout, round);
    this.drawTiles(context, layout, round);

    drawUiButton(context, layout.buttons.clear, 'Borrar', {
      accent: ACCENT,
      disabled: this.locked || this.built.length === 0,
    });
    drawUiButton(context, layout.buttons.hint, 'Pista', {
      accent: ACCENT,
      active: this.hinted,
      disabled: this.locked || this.hinted,
    });

    drawPuzzleFooter(
      context,
      view,
      `${this.solved} aciertos · ${this.misses} fallos`,
      `PUNTOS ${this.score}`,
      'Teclado: letras · Retroceso borra · Esc reinicia',
    );
  }

  private beginRound(): void {
    this.built = [];
    this.used = new Set<number>();
    this.hintIndex = null;
    this.hinted = false;
    this.feedback = null;
    this.feedbackTimer = 0;
    this.locked = false;
  }

  private handlePointer(x: number, y: number): void {
    if (this.locked || this.rounds.length === 0) return;

    const layout = this.layout(this.runtime.view);
    if (pointInButton(x, y, layout.buttons.clear)) {
      this.clear();
      return;
    }
    if (pointInButton(x, y, layout.buttons.hint)) {
      this.revealHint();
      return;
    }

    const tile = layout.tileRects.findIndex((rect) => pointInButton(x, y, rect));
    if (tile >= 0) this.pushTile(tile);
  }

  private handleKey(code: string, event: KeyboardEvent): void {
    if (event.repeat) return;

    if (code === 'Escape') {
      this.reset();
      this.audio.click();
      this.setStatus('Nueva partida de anagramas.');
      return;
    }

    if (this.locked || this.rounds.length === 0) return;

    if (code === 'Backspace') {
      event.preventDefault();
      this.clear();
      return;
    }

    if (code.length === 4 && code.startsWith('Key')) {
      const letter = code.slice(3).toLowerCase();
      const round = this.rounds[this.index]!;
      const tile = round.letters.findIndex(
        (value, position) => value === letter && !this.used.has(position),
      );
      if (tile >= 0) this.pushTile(tile);
    }
  }

  private pushTile(index: number): void {
    if (this.locked || this.used.has(index)) return;

    const round = this.rounds[this.index]!;
    this.used.add(index);
    this.built.push(index);
    this.audio.tone(420 + this.built.length * 34, 0.05, {
      type: 'triangle',
      gain: 0.05,
    });

    const required = round.word.length - (this.hinted ? 1 : 0);
    if (this.built.length >= required) this.check();
  }

  private clear(): void {
    if (this.locked) return;

    this.built = [];
    this.used = new Set<number>();
    if (this.hinted && this.hintIndex !== null) this.used.add(this.hintIndex);
    this.audio.click();
    this.setStatus('Palabra borrada.');
  }

  private revealHint(): void {
    if (this.locked || this.hinted || this.rounds.length === 0) return;

    const round = this.rounds[this.index]!;
    const firstLetter = round.word[0]!;
    const builtPosition = this.built.findIndex((tile) => round.letters[tile] === firstLetter);

    let tile: number;
    if (builtPosition >= 0) {
      tile = this.built[builtPosition]!;
      this.built = this.built.filter((_, position) => position !== builtPosition);
    } else {
      const found = round.letters.findIndex(
        (letter, position) => letter === firstLetter && !this.used.has(position),
      );
      if (found < 0) return;
      tile = found;
    }

    this.hinted = true;
    this.hintIndex = tile;
    this.used.add(tile);
    this.hintsUsed += 1;
    this.score = Math.max(0, this.score - PENALTY_HINT);
    this.setScore('PUNTOS', this.score);
    this.audio.tone(620, 0.12, { type: 'sine', gain: 0.06 });
    this.setStatus(`La palabra empieza por ${firstLetter.toUpperCase()}.`);

    const required = round.word.length - 1;
    if (this.built.length >= required) this.check();
  }

  private check(): void {
    if (this.locked) return;

    const round = this.rounds[this.index]!;
    const typed = this.built.map((tile) => round.letters[tile]!).join('');
    const attempt = this.hinted ? `${round.word[0]}${typed}` : typed;
    const correct = matchesWord(round.word, attempt);

    this.locked = true;
    this.feedback = correct ? 'hit' : 'miss';
    this.feedbackTimer = correct ? 0.85 : 1.3;

    if (correct) {
      this.solved += 1;
      this.score += pointsForWord(round.word, this.hinted);
      this.audio.chord([523.25, 659.25, 783.99], 0.28, {
        type: 'triangle',
        gain: 0.08,
      });
      this.setStatus(`Correcto: ${round.word}.`);
    } else {
      this.misses += 1;
      this.score = Math.max(0, this.score - PENALTY_WRONG);
      this.audio.tone(210, 0.16, { type: 'triangle', gain: 0.05, slideTo: 170 });
      this.setStatus(`No era esa. La palabra era ${round.word}.`);
    }

    this.setScore('PUNTOS', this.score);
  }

  private finishGame(): void {
    if (this.done) return;
    this.done = true;
    this.locked = true;
    this.audio.chord([392, 523.25, 659.25, 783.99], 0.5, { gain: 0.1 });
    this.finish({
      title: this.solved === ROUNDS_PER_GAME ? 'Ronda perfecta' : 'Ronda completada',
      message: `Has resuelto ${this.solved} de ${ROUNDS_PER_GAME} palabras.`,
      detail: `${this.misses} fallos · ${this.hintsUsed} pistas`,
      score: this.score,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Jugar otra',
      tone: this.solved >= 6 ? 'win' : 'lose',
    });
  }

  private layout(view: View): BoardLayout {
    const current = this.rounds[Math.min(this.index, Math.max(0, this.rounds.length - 1))];
    const count = current?.word.length ?? 5;
    const letterCount = current?.letters.length ?? 5;

    const slotGap = clamp(view.width * 0.014, 6, 12);
    const slot = clamp((view.width * 0.88 - slotGap * (count - 1)) / count, 30, 76);
    const slotsWidth = count * slot + (count - 1) * slotGap;
    const slotsX = (view.width - slotsWidth) / 2;

    const compact = view.width < 560;
    const perRow = compact ? Math.min(5, letterCount) : letterCount;
    const rows = Math.max(1, Math.ceil(letterCount / perRow));
    const tileGap = clamp(view.width * 0.014, 6, 12);
    const tileSize = clamp((view.width * 0.9 - tileGap * (perRow - 1)) / perRow, 34, 76);
    const gridHeight = rows * tileSize + (rows - 1) * tileGap;

    const gapA = clamp(view.height * 0.06, 40, 58);
    const gapB = clamp(view.height * 0.06, 40, 58);
    const buttonWidth = clamp(view.width * 0.3, 108, 148);
    const buttonGap = 14;
    const buttonRowWidth = buttonWidth * 2 + buttonGap;

    const block = slot + gapA + gridHeight + gapB + BUTTON_HEIGHT;
    const top = HEADER_SPACE;
    const bottom = view.height - 70;
    const slotsY = top + Math.max(0, (bottom - top - block) / 2);
    const tilesY = slotsY + slot + gapA;
    const buttonsY = tilesY + gridHeight + gapB;

    const tileRects = Array.from({ length: letterCount }, (_, index) => {
      const row = Math.floor(index / perRow);
      const column = index % perRow;
      const inRow = Math.min(perRow, letterCount - row * perRow);
      const rowWidth = inRow * tileSize + (inRow - 1) * tileGap;
      return {
        x: (view.width - rowWidth) / 2 + column * (tileSize + tileGap),
        y: tilesY + row * (tileSize + tileGap),
        width: tileSize,
        height: tileSize,
      };
    });

    const buttonsX = (view.width - buttonRowWidth) / 2;

    return {
      slot,
      slotGap,
      slotsX,
      slotsY,
      panel: {
        x: slotsX - 18,
        y: slotsY - 18,
        width: slotsWidth + 36,
        height: slot + 36,
      },
      tilesY,
      tileRects,
      buttons: {
        clear: { x: buttonsX, y: buttonsY, width: buttonWidth, height: BUTTON_HEIGHT },
        hint: {
          x: buttonsX + buttonWidth + buttonGap,
          y: buttonsY,
          width: buttonWidth,
          height: BUTTON_HEIGHT,
        },
      },
    };
  }

  private drawProgress(context: CanvasRenderingContext2D, view: View): void {
    const total = this.rounds.length;
    const step = 20;
    const startX = view.width / 2 - ((total - 1) * step) / 2;
    const y = 132;

    context.save();
    for (let index = 0; index < total; index += 1) {
      const x = startX + index * step;
      const isCurrent = index === this.index;
      const isSolved = index < this.index || (isCurrent && this.feedback === 'hit');

      context.beginPath();
      context.arc(x, y, isCurrent ? 4.5 : 3.5, 0, Math.PI * 2);
      if (isSolved) {
        context.fillStyle = PALETTE.forest;
      } else if (isCurrent) {
        context.fillStyle = alpha(ACCENT, 0.28);
      } else {
        context.fillStyle = alpha(PALETTE.ink, 0.12);
      }
      context.fill();

      if (isCurrent && !isSolved) {
        context.strokeStyle = ACCENT;
        context.lineWidth = 1.6;
        context.stroke();
      }
    }
    context.restore();
  }

  private drawSlots(
    context: CanvasRenderingContext2D,
    layout: BoardLayout,
    round: AnagramRound,
  ): void {
    const count = round.word.length;

    for (let index = 0; index < count; index += 1) {
      const x = layout.slotsX + index * (layout.slot + layout.slotGap);
      const y = layout.slotsY;
      const isHintSlot = this.hinted && index === 0;
      const builtIndex = this.hinted ? index - 1 : index;
      const tile = builtIndex >= 0 ? this.built[builtIndex] : undefined;
      const letter = isHintSlot
        ? round.word[0]!.toUpperCase()
        : tile === undefined
          ? ''
          : round.letters[tile]!.toUpperCase();

      roundedRect(context, x, y, layout.slot, layout.slot, layout.slot * 0.18);
      context.fillStyle =
        this.feedback === 'miss'
          ? alpha(PALETTE.apricot, 0.14)
          : this.feedback === 'hit'
            ? alpha(PALETTE.forest, 0.12)
            : isHintSlot
              ? alpha(ACCENT, 0.2)
              : letter
                ? alpha(ACCENT, 0.1)
                : 'rgba(255, 253, 248, 0.66)';
      context.fill();

      if (letter) {
        context.setLineDash([]);
        context.strokeStyle = isHintSlot ? ACCENT : alpha(PALETTE.ink, 0.18);
        context.lineWidth = isHintSlot ? 2 : 1.4;
      } else {
        context.setLineDash([4, 4]);
        context.strokeStyle = alpha(PALETTE.ink, 0.16);
        context.lineWidth = 1.4;
      }
      context.stroke();
      context.setLineDash([]);

      if (letter) {
        context.font = `700 ${Math.max(12, layout.slot * 0.44)}px ${FONT_MONO}`;
        context.fillStyle = isHintSlot ? ACCENT : PALETTE.ink;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(letter, x + layout.slot / 2, y + layout.slot / 2 + 1);
      }
    }
  }

  private drawNote(
    context: CanvasRenderingContext2D,
    view: View,
    layout: BoardLayout,
    round: AnagramRound,
  ): void {
    let text = 'Toca las fichas en orden';
    let color = alpha(PALETTE.ink, 0.55);

    if (this.feedback === 'hit') {
      text = `Correcto: ${round.word}`;
      color = PALETTE.forest;
    } else if (this.feedback === 'miss') {
      text = `No era esa. Era ${round.word}`;
      color = PALETTE.apricot;
    } else if (this.hinted) {
      text = `Pista: empieza por ${round.word[0]!.toUpperCase()}`;
      color = PALETTE.inkSoft;
    }

    context.save();
    context.font = `600 11px ${FONT_SANS}`;
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, view.width / 2, layout.tilesY - 22);
    context.restore();
  }

  private drawTiles(
    context: CanvasRenderingContext2D,
    layout: BoardLayout,
    round: AnagramRound,
  ): void {
    layout.tileRects.forEach((rect, index) => {
      const letter = round.letters[index]!;
      const used = this.used.has(index);
      const isHintTile = this.hintIndex === index;

      context.save();
      context.shadowColor = alpha(PALETTE.ink, 0.08);
      context.shadowBlur = used ? 0 : 8;
      context.shadowOffsetY = used ? 0 : 3;
      roundedRect(context, rect.x, rect.y, rect.width, rect.height, rect.width * 0.18);
      context.fillStyle = used
        ? alpha(PALETTE.ink, 0.04)
        : isHintTile
          ? alpha(ACCENT, 0.16)
          : PALETTE.surface;
      context.fill();
      context.restore();

      roundedRect(context, rect.x, rect.y, rect.width, rect.height, rect.width * 0.18);
      context.strokeStyle = used
        ? alpha(PALETTE.ink, 0.08)
        : isHintTile
          ? ACCENT
          : alpha(PALETTE.ink, 0.16);
      context.lineWidth = 1.6;
      context.stroke();

      context.save();
      context.font = `700 ${Math.max(14, rect.width * 0.44)}px ${FONT_MONO}`;
      context.fillStyle = used ? alpha(PALETTE.ink, 0.2) : PALETTE.ink;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(letter.toUpperCase(), rect.x + rect.width / 2, rect.y + rect.height / 2 + 1);
      context.restore();
    });
  }
}

export default {
  mount: (context: GameContext) => new Anagramas(context),
} satisfies GameModule;
