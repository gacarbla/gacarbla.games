import {
  BaseGame,
  FONT_SANS,
  PALETTE,
  alpha,
  clamp,
  drawPuzzleBackground,
  drawPuzzleFooter,
  drawPuzzleHeader,
  pointInButton,
  roundedRect,
  type GameContext,
  type GameModule,
  type UiButton,
  type View,
} from '../engine';
import {
  MAX_ATTEMPTS,
  WORD_LENGTH,
  chooseSecret,
  evaluateGuess,
  isValidWord,
  mergeKeyboard,
  scoreForAttempts,
  type GuessRecord,
  type LetterState,
  type RoundStatus,
} from './logic';

const ACCENT = '#8fb397';
const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] as const;
const ABSENT_COLOR = '#8b978f';

type KeyAction = 'letter' | 'enter' | 'back';

interface KeyboardKey {
  button: UiButton;
  label: string;
  action: KeyAction;
  letter: string | null;
}

interface Geometry {
  gridX: number;
  gridY: number;
  cell: number;
  gap: number;
  keyboard: KeyboardKey[];
}

class PalabraOculta extends BaseGame {
  private secret = chooseSecret();
  private guesses: GuessRecord[] = [];
  private typed = '';
  private keyboard: Record<string, LetterState> = {};
  private phase: RoundStatus = 'playing';
  private invalid = 0;

  constructor(context: GameContext) {
    super(context);

    this.input.onPointerDown((point) => {
      if (this.phase !== 'playing') return;
      const key = this.geometry(this.runtime.view).keyboard.find((candidate) =>
        pointInButton(point.x, point.y, candidate.button),
      );
      if (key) this.pressKey(key);
    });

    this.input.onKeyDown((code, event) => {
      if (event.repeat) return;
      if (this.phase !== 'playing') return;
      if (code === 'Backspace' || code === 'Delete') {
        this.removeLetter();
        return;
      }
      if (code === 'Enter' || code === 'NumpadEnter') {
        this.submit();
        return;
      }
      if (code === 'Escape') {
        this.reset();
        this.setStatus('Nueva palabra oculta.');
        return;
      }
      if (!code.startsWith('Key')) return;
      const letter = code.slice(3);
      if (letter.length === 1 && letter >= 'A' && letter <= 'Z') this.addLetter(letter);
    });
  }

  protected reset(): void {
    this.secret = chooseSecret();
    this.guesses = [];
    this.typed = '';
    this.keyboard = {};
    this.phase = 'playing';
    this.invalid = 0;
    this.setScore('INTENTOS', `0/${MAX_ATTEMPTS}`);
  }

  protected update(dt: number): void {
    if (this.invalid > 0) this.invalid = Math.max(0, this.invalid - dt);
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, ACCENT);
    drawPuzzleHeader(context, view, 'Palabra oculta', 'Cinco letras · seis intentos');

    const geometry = this.geometry(view);
    this.drawGrid(context, geometry);
    this.drawKeyboard(context, geometry);

    drawPuzzleFooter(
      context,
      view,
      `INTENTO ${Math.min(this.guesses.length + 1, MAX_ATTEMPTS)}/${MAX_ATTEMPTS}`,
      `ACIERTOS ${this.lastExact()}`,
      'TECLADO FÍSICO O EN PANTALLA · ENTER COMPRUEBA',
    );
  }

  private geometry(view: View): Geometry {
    const cell = Math.floor(
      clamp(Math.min((view.width - 34) / WORD_LENGTH, (view.height * 0.45) / MAX_ATTEMPTS), 32, 68),
    );
    const gap = Math.max(4, Math.round(cell * 0.09));
    const gridWidth = cell * WORD_LENGTH;
    const gridHeight = cell * MAX_ATTEMPTS;

    const keyboardWidth = Math.min(540, view.width - 24);
    const keyHeight = Math.round(clamp(view.height * 0.052, 38, 52));
    const keyGap = 5;
    const unit = (keyboardWidth - keyGap * 9) / 10;
    const keyboardHeight = keyHeight * 3 + keyGap * 2;

    const contentHeight = gridHeight + 20 + keyboardHeight;
    const available = Math.max(0, view.height - 108 - 66);
    const gridY = Math.round(108 + Math.max(0, (available - contentHeight) / 2));
    const gridX = (view.width - gridWidth) / 2;

    const rows: Array<Array<{ label: string; action: KeyAction; units: number }>> = [
      KEY_ROWS[0]!
        .split('')
        .map((letter) => ({ label: letter, action: 'letter' as const, units: 1 })),
      KEY_ROWS[1]!
        .split('')
        .map((letter) => ({ label: letter, action: 'letter' as const, units: 1 })),
      [
        ...KEY_ROWS[2]!
          .split('')
          .map((letter) => ({ label: letter, action: 'letter' as const, units: 1 })),
        { label: 'ENTRAR', action: 'enter' as const, units: 1.5 },
        { label: 'BORRAR', action: 'back' as const, units: 1.5 },
      ],
    ];

    const keyboard: KeyboardKey[] = [];
    let rowY = gridY + gridHeight + 20;
    for (const row of rows) {
      const rowWidth =
        row.reduce((total, key) => total + key.units * unit, 0) + keyGap * (row.length - 1);
      let rowX = (view.width - rowWidth) / 2;
      for (const key of row) {
        const width = key.units * unit;
        keyboard.push({
          button: { x: rowX, y: rowY, width, height: keyHeight },
          label: key.label,
          action: key.action,
          letter: key.action === 'letter' ? key.label : null,
        });
        rowX += width + keyGap;
      }
      rowY += keyHeight + keyGap;
    }

    return { gridX, gridY, cell, gap, keyboard };
  }

  private drawGrid(context: CanvasRenderingContext2D, geometry: Geometry): void {
    const size = geometry.cell - geometry.gap;
    const radius = size * 0.16;
    const activeRow = this.guesses.length;

    for (let row = 0; row < MAX_ATTEMPTS; row += 1) {
      const guess = this.guesses[row];
      const isActive = row === activeRow && this.phase === 'playing';
      for (let column = 0; column < WORD_LENGTH; column += 1) {
        const x = geometry.gridX + column * geometry.cell + geometry.gap / 2;
        const y = geometry.gridY + row * geometry.cell + geometry.gap / 2;
        const state = guess?.states[column];
        const letter = guess ? guess.word[column] : isActive ? this.typed[column] : undefined;

        let fill = 'rgba(255, 253, 248, 0.72)';
        let stroke: string = alpha(PALETTE.ink, 0.14);
        let strokeWidth = 1.3;
        let textColor: string = PALETTE.ink;

        if (state === 'exact') {
          fill = PALETTE.forest;
          stroke = PALETTE.forest;
          textColor = PALETTE.surface;
        } else if (state === 'present') {
          fill = PALETTE.amber;
          stroke = PALETTE.amber;
          textColor = PALETTE.surface;
        } else if (state === 'absent') {
          fill = ABSENT_COLOR;
          stroke = ABSENT_COLOR;
          textColor = PALETTE.surface;
        } else if (isActive) {
          fill = '#fffdf8';
          stroke = this.invalid > 0 ? PALETTE.apricot : alpha(PALETTE.forest, 0.55);
          strokeWidth = this.invalid > 0 ? 2.4 : 1.8;
        }

        context.save();
        roundedRect(context, x, y, size, size, radius);
        context.fillStyle = fill;
        context.fill();
        context.strokeStyle = stroke;
        context.lineWidth = strokeWidth;
        context.stroke();

        if (letter) {
          context.fillStyle = textColor;
          context.font = `700 ${Math.round(size * 0.44)}px ${FONT_SANS}`;
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText(letter.toUpperCase(), x + size / 2, y + size / 2 + 1);
        }
        context.restore();
      }
    }
  }

  private drawKeyboard(context: CanvasRenderingContext2D, geometry: Geometry): void {
    for (const key of geometry.keyboard) {
      const state = key.letter ? this.keyboard[key.letter] : undefined;
      this.drawKey(context, key, state);
    }
  }

  private drawKey(
    context: CanvasRenderingContext2D,
    key: KeyboardKey,
    state: LetterState | undefined,
  ): void {
    const { button } = key;
    let fill = key.action === 'letter' ? '#fffdf8' : alpha(ACCENT, 0.18);
    let stroke: string = alpha(PALETTE.ink, 0.18);
    let textColor: string = PALETTE.ink;

    if (state === 'exact') {
      fill = PALETTE.forest;
      stroke = PALETTE.forest;
      textColor = PALETTE.surface;
    } else if (state === 'present') {
      fill = PALETTE.amber;
      stroke = PALETTE.amber;
      textColor = PALETTE.surface;
    } else if (state === 'absent') {
      fill = ABSENT_COLOR;
      stroke = ABSENT_COLOR;
      textColor = PALETTE.surface;
    } else if (key.action !== 'letter') {
      stroke = alpha(PALETTE.forest, 0.3);
      textColor = PALETTE.forest;
    }

    context.save();
    roundedRect(context, button.x, button.y, button.width, button.height, button.height * 0.22);
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = stroke;
    context.lineWidth = 1.3;
    context.stroke();

    const fontSize =
      key.action === 'letter'
        ? Math.min(button.height * 0.38, button.width * 0.52)
        : Math.min(button.height * 0.28, button.width * 0.2);
    context.font = `700 ${Math.max(8, Math.round(fontSize))}px ${FONT_SANS}`;
    context.fillStyle = textColor;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(key.label, button.x + button.width / 2, button.y + button.height / 2 + 1);
    context.restore();
  }

  private pressKey(key: KeyboardKey): void {
    if (key.action === 'enter') {
      this.submit();
      return;
    }
    if (key.action === 'back') {
      this.removeLetter();
      return;
    }
    if (key.letter) this.addLetter(key.letter);
  }

  private addLetter(letter: string): void {
    if (this.phase !== 'playing' || this.typed.length >= WORD_LENGTH) return;
    this.typed += letter.toLowerCase();
    this.audio.tone(320 + this.typed.length * 34, 0.045, { type: 'triangle', gain: 0.03 });
  }

  private removeLetter(): void {
    if (this.phase !== 'playing' || this.typed.length === 0) return;
    this.typed = this.typed.slice(0, -1);
    this.audio.tone(250, 0.05, { type: 'triangle', gain: 0.03 });
  }

  private submit(): void {
    if (this.phase !== 'playing' || this.guesses.length >= MAX_ATTEMPTS) return;

    if (this.typed.length < WORD_LENGTH) {
      this.reject('Faltan letras: la palabra tiene cinco.');
      return;
    }

    const word = this.typed.toLowerCase();
    if (!isValidWord(word)) {
      this.reject('Esa palabra no está en la lista.');
      return;
    }

    const states = evaluateGuess(this.secret, word);
    this.guesses.push({ word, states });
    this.keyboard = mergeKeyboard(this.keyboard, word, states);
    this.typed = '';
    this.invalid = 0;
    this.setScore('INTENTOS', `${this.guesses.length}/${MAX_ATTEMPTS}`);

    const exact = states.filter((state) => state === 'exact').length;

    if (word === this.secret) {
      this.win();
      return;
    }

    if (this.guesses.length >= MAX_ATTEMPTS) {
      this.lose();
      return;
    }

    this.audio.tone(exact > 0 ? 520 : 300, 0.09, { type: 'triangle', gain: 0.04 });
    this.setStatus(
      `${exact} ${exact === 1 ? 'letra exacta' : 'letras exactas'}. Quedan ${
        MAX_ATTEMPTS - this.guesses.length
      } ${MAX_ATTEMPTS - this.guesses.length === 1 ? 'intento' : 'intentos'}.`,
    );
  }

  private reject(message: string): void {
    this.invalid = 0.65;
    this.audio.tone(210, 0.14, { type: 'triangle', gain: 0.05, slideTo: 160 });
    this.setStatus(message);
    this.toast(message);
  }

  private win(): void {
    this.phase = 'won';
    const score = scoreForAttempts(this.guesses.length);
    this.setScore('PUNTOS', score);
    this.setStatus(`Palabra resuelta en ${this.guesses.length} intentos.`);
    this.audio.chord([392, 523.25, 659.25, 783.99], 0.55, { gain: 0.09 });
    this.finish({
      title: 'Palabra oculta resuelta',
      message: `Has acertado "${this.secret.toUpperCase()}" en ${this.guesses.length} ${
        this.guesses.length === 1 ? 'intento' : 'intentos'
      }.`,
      detail: `${this.guesses.length} de ${MAX_ATTEMPTS} intentos`,
      score,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Nueva palabra',
      tone: 'win',
    });
  }

  private lose(): void {
    this.phase = 'lost';
    this.setScore('PUNTOS', 0);
    this.setStatus(`Sin intentos. La palabra era ${this.secret.toUpperCase()}.`);
    this.audio.tone(220, 0.3, { type: 'sine', gain: 0.07, slideTo: 140 });
    this.finish({
      title: 'Se agotaron los intentos',
      message: `La palabra era "${this.secret.toUpperCase()}".`,
      detail: `${MAX_ATTEMPTS} intentos empleados`,
      score: 0,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Reintentar',
      tone: 'lose',
    });
  }

  private lastExact(): number {
    const last = this.guesses[this.guesses.length - 1];
    if (!last) return 0;
    return last.states.filter((state) => state === 'exact').length;
  }
}

export default {
  mount: (context: GameContext) => new PalabraOculta(context),
} satisfies GameModule;
