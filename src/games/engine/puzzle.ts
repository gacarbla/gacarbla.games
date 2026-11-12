import { clamp } from './math';
import { FONT_MONO, FONT_SANS, PALETTE, alpha, glowCircle, roundedRect } from './theme';
import type { View } from './types';

export interface PuzzleLayout {
  cols: number;
  rows: number;
  cell: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutOptions {
  maxCell?: number;
  top?: number;
  bottom?: number;
  widthRatio?: number;
  heightRatio?: number;
}

export interface CellStyle {
  fill?: string;
  stroke?: string;
  text?: string;
  textColor?: string;
  fontSize?: number;
  subtext?: string;
  alpha?: number;
  strokeWidth?: number;
  dashed?: boolean;
}

/** Tablero cuadrado centrado, con aire para la barra superior y el pie. */
export function puzzleLayout(
  view: View,
  cols: number,
  rows: number,
  options: LayoutOptions = {},
): PuzzleLayout {
  const top = options.top ?? 88;
  const bottom = options.bottom ?? 64;
  const widthRatio = options.widthRatio ?? 0.84;
  const heightRatio = options.heightRatio ?? 0.7;
  const cell = clamp(
    Math.min(
      (view.width * widthRatio) / cols,
      (view.height * heightRatio) / rows,
      options.maxCell ?? 76,
    ),
    22,
    82,
  );
  const width = cell * cols;
  const height = cell * rows;
  const available = Math.max(120, view.height - top - bottom);
  return {
    cols,
    rows,
    cell,
    x: (view.width - width) / 2,
    y: top + Math.max(0, (available - height) / 2),
    width,
    height,
  };
}

export function cellAt(layout: PuzzleLayout, x: number, y: number): number | null {
  const column = Math.floor((x - layout.x) / layout.cell);
  const row = Math.floor((y - layout.y) / layout.cell);
  if (column < 0 || column >= layout.cols || row < 0 || row >= layout.rows) return null;
  return row * layout.cols + column;
}

export function drawPuzzleBackground(
  context: CanvasRenderingContext2D,
  view: View,
  accent: string,
): void {
  const gradient = context.createRadialGradient(
    view.width / 2,
    view.height / 2,
    0,
    view.width / 2,
    view.height / 2,
    Math.max(view.width, view.height) * 0.72,
  );
  gradient.addColorStop(0, '#f3f6ed');
  gradient.addColorStop(0.58, '#faf5eb');
  gradient.addColorStop(1, PALETTE.bg);
  context.fillStyle = gradient;
  context.fillRect(0, 0, view.width, view.height);

  glowCircle(
    context,
    view.width / 2,
    view.height / 2,
    Math.min(view.width, view.height) * 0.65,
    accent,
    0.08,
  );

  context.save();
  context.fillStyle = alpha(PALETTE.ink, 0.05);
  const step = 28;
  for (let x = step; x < view.width; x += step) {
    for (let y = step; y < view.height; y += step) {
      context.beginPath();
      context.arc(x, y, 0.8, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

export function drawPuzzleBoard(
  context: CanvasRenderingContext2D,
  layout: PuzzleLayout,
  options: { padding?: number; fill?: string; stroke?: string } = {},
): void {
  const padding = options.padding ?? 8;
  roundedRect(
    context,
    layout.x - padding,
    layout.y - padding,
    layout.width + padding * 2,
    layout.height + padding * 2,
    18,
  );
  context.fillStyle = options.fill ?? 'rgba(255, 253, 248, 0.78)';
  context.fill();
  context.strokeStyle = options.stroke ?? 'rgba(36, 51, 45, 0.16)';
  context.lineWidth = 1.5;
  context.stroke();
}

export function drawPuzzleCell(
  context: CanvasRenderingContext2D,
  layout: PuzzleLayout,
  index: number,
  style: CellStyle = {},
): void {
  const column = index % layout.cols;
  const row = Math.floor(index / layout.cols);
  const inset = Math.max(1.5, layout.cell * 0.035);
  const x = layout.x + column * layout.cell + inset;
  const y = layout.y + row * layout.cell + inset;
  const size = layout.cell - inset * 2;

  context.save();
  if (style.alpha !== undefined) context.globalAlpha = style.alpha;
  roundedRect(context, x, y, size, size, size * 0.18);
  context.fillStyle = style.fill ?? '#fffdf8';
  context.fill();
  if (style.stroke !== 'none') {
    context.strokeStyle = style.stroke ?? 'rgba(36, 51, 45, 0.14)';
    context.lineWidth = style.strokeWidth ?? 1.5;
    if (style.dashed) context.setLineDash([4, 4]);
    context.stroke();
    context.setLineDash([]);
  }
  if (style.text) {
    context.fillStyle = style.textColor ?? PALETTE.ink;
    context.font = `600 ${style.fontSize ?? Math.max(12, size * 0.36)}px ${FONT_MONO}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(style.text, x + size / 2, y + size / 2 + (style.subtext ? -size * 0.08 : 1));
  }
  if (style.subtext) {
    context.fillStyle = alpha(PALETTE.ink, 0.55);
    context.font = `500 ${Math.max(7, size * 0.14)}px ${FONT_SANS}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(style.subtext, x + size / 2, y + size / 2 + size * 0.24);
  }
  context.restore();
}

export function drawPuzzleFooter(
  context: CanvasRenderingContext2D,
  view: View,
  left: string,
  right = '',
  hint = '',
): void {
  context.save();
  context.font = `500 10px ${FONT_MONO}`;
  context.fillStyle = alpha(PALETTE.ink, 0.55);
  context.textBaseline = 'middle';
  context.textAlign = 'left';
  context.fillText(left, 22, view.height - 22);
  if (right) {
    context.textAlign = 'right';
    context.fillText(right, view.width - 22, view.height - 22);
  }
  if (hint) {
    context.textAlign = 'center';
    context.fillStyle = alpha(PALETTE.ink, 0.58);
    context.fillText(hint, view.width / 2, view.height - 44);
  }
  context.restore();
}

export function drawPuzzleHeader(
  context: CanvasRenderingContext2D,
  view: View,
  title: string,
  subtitle = '',
): void {
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `600 13px ${FONT_SANS}`;
  context.fillStyle = PALETTE.ink;
  context.fillText(title, view.width / 2, 84);
  if (subtitle) {
    context.font = `500 10px ${FONT_SANS}`;
    context.fillStyle = alpha(PALETTE.ink, 0.55);
    context.fillText(subtitle, view.width / 2, 102);
  }
  context.restore();
}

export interface UiButton {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function drawUiButton(
  context: CanvasRenderingContext2D,
  button: UiButton,
  label: string,
  options: { active?: boolean; accent?: string; disabled?: boolean } = {},
): void {
  const accent = options.accent ?? PALETTE.forest;
  context.save();
  roundedRect(context, button.x, button.y, button.width, button.height, button.height / 2);
  context.fillStyle = options.active ? accent : '#fffdf8';
  context.fill();
  context.strokeStyle = options.active ? accent : alpha(PALETTE.ink, 0.2);
  context.lineWidth = 1.5;
  context.stroke();
  context.font = `700 ${Math.max(10, button.height * 0.32)}px ${FONT_SANS}`;
  context.fillStyle = options.active ? PALETTE.surface : PALETTE.ink;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.globalAlpha = options.disabled ? 0.35 : 1;
  context.fillText(label, button.x + button.width / 2, button.y + button.height / 2 + 1);
  context.restore();
}

export function pointInButton(x: number, y: number, button: UiButton): boolean {
  return (
    x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height
  );
}
