import {
  BaseGame,
  FONT_MONO,
  FONT_SANS,
  PALETTE,
  alpha,
  clamp,
  drawPuzzleBackground,
  drawPuzzleFooter,
  pointInButton,
  roundedRect,
  type GameContext,
  type GameModule,
  type UiButton,
  type View,
} from '../engine';
import {
  ALPHABET,
  MAX_MISTAKES,
  createRound,
  guessLetter,
  hitLetters,
  letterMark,
  maskWord,
  normalizeLetter,
  pickWord,
  remainingMistakes,
  scoreRound,
  uniqueWordLetters,
  type HangmanRound,
} from './logic';

const ACCENT = '#a78fbf';
const WORD_GAP = 5;

interface KeyButton extends UiButton {
  readonly letter: string;
}

interface GallowsBox {
  top: number;
  height: number;
  centerX: number;
}

interface WordBox {
  y: number;
  slot: number;
  height: number;
  gap: number;
}

interface Scene {
  gallows: GallowsBox;
  word: WordBox;
  keys: KeyButton[];
}

class Ahorcado extends BaseGame {
  private round: HangmanRound = createRound(pickWord());
  private elapsed = 0;
  private shake = 0;
  private pulse = 0;

  constructor(context: GameContext) {
    super(context);

    this.input.onPointerDown((point) => {
      if (this.state !== 'running') return;
      const key = this.keyboard(this.runtime.view).find((candidate) =>
        pointInButton(point.x, point.y, candidate),
      );
      if (key) this.press(key.letter);
    });

    this.input.onKeyDown((_code, event) => {
      if (this.state !== 'running' || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const letter = normalizeLetter(event.key);
      if (!letter) return;
      event.preventDefault();
      this.press(letter);
    });
  }

  protected reset(): void {
    this.round = createRound(pickWord());
    this.elapsed = 0;
    this.shake = 0;
    this.pulse = 0;
    this.setScore('PUNTOS', 0);
  }

  protected update(dt: number): void {
    this.elapsed += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    if (this.pulse > 0) this.pulse = Math.max(0, this.pulse - dt * 1.8);
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, ACCENT);

    const hintLines = this.hintLines(context, view);
    this.drawHeader(context, view, hintLines);

    const scene = this.scene(view, hintLines);
    this.drawFigure(context, scene);
    this.drawWord(context, view, scene);
    this.drawKeyboard(context, scene.keys);

    drawPuzzleFooter(
      context,
      view,
      `FALLOS ${this.round.mistakes}/${MAX_MISTAKES}`,
      `LETRAS ${hitLetters(this.round).length}/${uniqueWordLetters(this.round.word).length}`,
      'TOCA UNA LETRA O USA EL TECLADO',
    );
  }

  private press(value: string): void {
    const result = guessLetter(this.round, value);
    if (
      result.outcome === 'invalid' ||
      result.outcome === 'repeated' ||
      result.outcome === 'finished'
    ) {
      this.audio.tone(220, 0.05, { type: 'sine', gain: 0.02 });
      return;
    }

    this.round = result.round;
    this.setScore('PUNTOS', scoreRound(this.round));

    if (result.outcome === 'hit') {
      this.pulse = 1;
      this.audio.tone(430 + ((result.letter.charCodeAt(0) * 7) % 190), 0.12, {
        type: 'triangle',
        gain: 0.055,
      });
      this.setStatus(
        `Letra ${result.letter} correcta. ${hitLetters(this.round).length} de ${
          uniqueWordLetters(this.round.word).length
        } letras descubiertas.`,
      );
    } else {
      this.shake = 0.4;
      this.audio.tone(230, 0.17, { type: 'triangle', gain: 0.055, slideTo: 165 });
      this.setStatus(
        `Letra ${result.letter} incorrecta. Quedan ${remainingMistakes(this.round)} fallos.`,
      );
    }

    if (this.round.status === 'won') this.win();
    else if (this.round.status === 'lost') this.lose();
  }

  private win(): void {
    const score = scoreRound(this.round);
    const total = uniqueWordLetters(this.round.word).length;
    const mistakes = this.round.mistakes;
    this.setScore('PUNTOS', score);
    this.setStatus(`Palabra descubierta: ${this.round.word}.`);
    this.audio.chord([392, 523.25, 659.25, 783.99], 0.55, {
      type: 'triangle',
      gain: 0.09,
    });
    this.finish({
      title: 'Palabra descubierta',
      message: `La palabra era ${this.round.word}.`,
      detail: `${this.round.word} · ${total} letras · ${mistakes} ${
        mistakes === 1 ? 'fallo' : 'fallos'
      }`,
      score,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Otra palabra',
      tone: 'win',
    });
  }

  private lose(): void {
    const score = scoreRound(this.round);
    this.setScore('PUNTOS', score);
    this.setStatus(`Sin intentos. La palabra era ${this.round.word}.`);
    this.audio.tone(196, 0.42, { type: 'sine', gain: 0.06, slideTo: 128 });
    this.finish({
      title: 'Se acabaron los intentos',
      message: `La palabra era ${this.round.word}.`,
      detail: `${this.round.word} · ${hitLetters(this.round).length} letras acertadas`,
      score,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Reintentar',
      tone: 'lose',
    });
  }

  private keyboard(view: View): KeyButton[] {
    const columns = view.width < 520 ? 7 : view.width < 820 ? 9 : 13;
    const compact = columns === 7;
    const gap = compact ? 5 : 6;
    const keyHeight = compact ? 44 : 40;
    const available = Math.min(view.width - 28, 760);
    const keyWidth = Math.min(compact ? 46 : 50, (available - gap * (columns - 1)) / columns);
    const rows = Math.ceil(ALPHABET.length / columns);
    const totalHeight = rows * keyHeight + (rows - 1) * gap;
    const top = view.height - 58 - totalHeight;

    return ALPHABET.map((letter, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const rowCount = Math.min(columns, ALPHABET.length - row * columns);
      const rowWidth = rowCount * keyWidth + (rowCount - 1) * gap;
      const rowX = (view.width - rowWidth) / 2;
      return {
        letter,
        x: rowX + column * (keyWidth + gap),
        y: top + row * (keyHeight + gap),
        width: keyWidth,
        height: keyHeight,
      };
    });
  }

  private scene(view: View, hintLines: readonly string[]): Scene {
    const keys = this.keyboard(view);
    const keyboardTop = keys.length > 0 ? Math.min(...keys.map((key) => key.y)) : view.height - 60;
    const headerBottom = 130 + Math.max(0, hintLines.length - 1) * 16;
    const contentTop = headerBottom + 6;
    const contentBottom = keyboardTop - 24;
    const available = Math.max(96, contentBottom - contentTop);
    const gallowsHeight = clamp(available * 0.62, 60, 360);

    const length = this.round.word.length;
    const maxWordWidth = Math.min(view.width - 44, 760);
    const desiredSlot = Math.min(42, (maxWordWidth - WORD_GAP * (length - 1)) / length);
    const heightLimit = Math.max(22, (available - gallowsHeight - 18) * 0.85);
    const slot = Math.max(12, Math.min(desiredSlot, heightLimit / 1.16));
    const wordHeight = slot * 1.16;

    const groupHeight = gallowsHeight + 20 + wordHeight;
    const groupTop = contentTop + Math.max(0, (available - groupHeight) / 2);

    return {
      gallows: {
        top: groupTop,
        height: gallowsHeight,
        centerX: view.width / 2,
      },
      word: {
        y: groupTop + gallowsHeight + 20,
        slot,
        height: wordHeight,
        gap: WORD_GAP,
      },
      keys,
    };
  }

  private hintLines(context: CanvasRenderingContext2D, view: View): string[] {
    const maxWidth = Math.min(600, Math.max(220, view.width - 40));
    const text = `Pista: ${this.round.entry.hint}`;
    context.save();
    context.font = `500 12px ${FONT_SANS}`;
    const lines: string[] = [];
    let current = '';
    for (const word of text.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && context.measureText(candidate).width > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    context.restore();
    return lines.length > 0 ? lines : [''];
  }

  private drawHeader(
    context: CanvasRenderingContext2D,
    view: View,
    hintLines: readonly string[],
  ): void {
    const center = view.width / 2;
    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    context.font = `600 10px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.48);
    context.fillText('AHORCADO', center, 64);

    const label = this.round.entry.category.toUpperCase();
    context.font = `700 10px ${FONT_MONO}`;
    const chipWidth = Math.min(view.width - 32, context.measureText(label).width + 26);
    roundedRect(context, center - chipWidth / 2, 76, chipWidth, 22, 11);
    context.fillStyle = alpha(ACCENT, 0.16);
    context.fill();
    context.strokeStyle = alpha(ACCENT, 0.52);
    context.lineWidth = 1;
    context.stroke();
    context.fillStyle = PALETTE.inkSoft;
    context.fillText(label, center, 88);

    context.font = `500 12px ${FONT_SANS}`;
    context.fillStyle = alpha(PALETTE.ink, 0.68);
    hintLines.forEach((line, index) => {
      context.fillText(line, center, 122 + index * 16);
    });
    context.restore();
  }

  private drawFigure(context: CanvasRenderingContext2D, scene: Scene): void {
    const { top, height } = scene.gallows;
    const offset =
      this.reducedMotion || this.shake <= 0
        ? 0
        : Math.sin(this.elapsed * 42) * 3 * (this.shake / 0.4);
    const centerX = scene.gallows.centerX + offset;
    const baseY = top + height * 0.94;
    const poleTop = top + height * 0.06;
    const poleX = centerX - height * 0.26;
    const ropeX = poleX + height * 0.38;
    const wood = Math.max(2.2, height * 0.018);
    const figure = Math.max(2.4, height * 0.021);

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Estructura de madera.
    context.strokeStyle = alpha(PALETTE.ink, 0.42);
    context.lineWidth = wood;
    context.beginPath();
    context.moveTo(poleX - height * 0.14, baseY);
    context.lineTo(poleX + height * 0.16, baseY);
    context.moveTo(poleX, baseY);
    context.lineTo(poleX, poleTop);
    context.moveTo(poleX - height * 0.02, poleTop);
    context.lineTo(ropeX, poleTop);
    context.moveTo(poleX, poleTop + height * 0.11);
    context.lineTo(poleX + height * 0.1, poleTop);
    context.stroke();

    // Cuerda.
    context.strokeStyle = alpha(PALETTE.ink, 0.3);
    context.lineWidth = Math.max(1.2, height * 0.012);
    context.beginPath();
    context.moveTo(ropeX, poleTop);
    context.lineTo(ropeX, poleTop + height * 0.09);
    context.stroke();

    const headRadius = height * 0.065;
    const headY = poleTop + height * 0.09 + headRadius;
    const neckY = headY + headRadius;
    const hipY = neckY + height * 0.19;
    const shoulderY = neckY + height * 0.035;

    context.strokeStyle = PALETTE.ink;
    context.lineWidth = figure;

    if (this.round.mistakes >= 1) {
      context.beginPath();
      context.arc(ropeX, headY, headRadius, 0, Math.PI * 2);
      context.stroke();
    }
    if (this.round.mistakes >= 2) {
      context.beginPath();
      context.moveTo(ropeX, neckY);
      context.lineTo(ropeX, hipY);
      context.stroke();
    }
    if (this.round.mistakes >= 3) {
      context.beginPath();
      context.moveTo(ropeX, shoulderY);
      context.lineTo(ropeX - height * 0.12, shoulderY + height * 0.11);
      context.stroke();
    }
    if (this.round.mistakes >= 4) {
      context.beginPath();
      context.moveTo(ropeX, shoulderY);
      context.lineTo(ropeX + height * 0.12, shoulderY + height * 0.11);
      context.stroke();
    }
    if (this.round.mistakes >= 5) {
      context.beginPath();
      context.moveTo(ropeX, hipY);
      context.lineTo(ropeX - height * 0.13, hipY + height * 0.15);
      context.stroke();
    }
    if (this.round.mistakes >= 6) {
      context.beginPath();
      context.moveTo(ropeX, hipY);
      context.lineTo(ropeX + height * 0.13, hipY + height * 0.15);
      context.stroke();
    }

    context.restore();
  }

  private drawWord(context: CanvasRenderingContext2D, view: View, scene: Scene): void {
    const masked = maskWord(this.round);
    const { y, slot, height, gap } = scene.word;
    const total = masked.length * slot + (masked.length - 1) * gap;
    const startX = (view.width - total) / 2;
    const lost = this.round.status === 'lost';
    const won = this.round.status === 'won';

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 ${Math.max(10, slot * 0.68)}px ${FONT_MONO}`;

    masked.forEach((item, index) => {
      const x = startX + index * (slot + gap);
      const revealed = item.revealed;
      const show = revealed || lost;
      roundedRect(context, x, y, slot, height, Math.max(5, slot * 0.22));
      context.fillStyle = won
        ? alpha(PALETTE.forest, 0.14)
        : lost && !revealed
          ? alpha(PALETTE.apricot, 0.15)
          : revealed
            ? alpha(ACCENT, 0.14)
            : 'rgba(255, 253, 248, 0.8)';
      context.fill();
      context.strokeStyle = won
        ? alpha(PALETTE.forest, 0.35)
        : lost && !revealed
          ? alpha(PALETTE.apricot, 0.4)
          : revealed
            ? alpha(ACCENT, 0.45)
            : alpha(PALETTE.ink, 0.16);
      context.lineWidth = revealed && this.pulse > 0 ? 2 : 1.4;
      context.stroke();

      if (show) {
        context.fillStyle = won
          ? PALETTE.forest
          : lost && !revealed
            ? PALETTE.apricot
            : PALETTE.ink;
        context.fillText(item.letter, x + slot / 2, y + height * 0.47);
      } else {
        context.strokeStyle = alpha(PALETTE.ink, 0.2);
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(x + slot * 0.27, y + height * 0.68);
        context.lineTo(x + slot * 0.73, y + height * 0.68);
        context.stroke();
      }
    });

    context.restore();
  }

  private drawKeyboard(context: CanvasRenderingContext2D, keys: readonly KeyButton[]): void {
    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `700 ${Math.max(11, keys[0] ? keys[0].height * 0.38 : 14)}px ${FONT_MONO}`;

    for (const key of keys) {
      const mark = letterMark(this.round, key.letter);
      roundedRect(context, key.x, key.y, key.width, key.height, key.height * 0.3);
      context.fillStyle =
        mark === 'hit'
          ? alpha(PALETTE.forest, 0.16)
          : mark === 'miss'
            ? alpha(PALETTE.ink, 0.045)
            : PALETTE.surface;
      context.fill();
      context.strokeStyle =
        mark === 'hit'
          ? alpha(PALETTE.forest, 0.4)
          : mark === 'miss'
            ? alpha(PALETTE.ink, 0.1)
            : alpha(PALETTE.ink, 0.18);
      context.lineWidth = 1.3;
      context.stroke();

      context.fillStyle =
        mark === 'hit' ? PALETTE.forest : mark === 'miss' ? alpha(PALETTE.ink, 0.3) : PALETTE.ink;
      context.fillText(key.letter, key.x + key.width / 2, key.y + key.height / 2 + 1);

      if (mark === 'miss') {
        context.strokeStyle = alpha(PALETTE.apricot, 0.5);
        context.lineWidth = 1.2;
        context.beginPath();
        context.moveTo(key.x + key.width * 0.28, key.y + key.height * 0.68);
        context.lineTo(key.x + key.width * 0.72, key.y + key.height * 0.68);
        context.stroke();
      }
    }

    context.restore();
  }
}

export default {
  mount: (context: GameContext) => new Ahorcado(context),
} satisfies GameModule;
