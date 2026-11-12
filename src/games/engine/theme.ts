export const PALETTE = {
  bg: '#f6f1e7',
  surface: '#fffdf8',
  surfaceRaised: '#fbf6ec',
  line: 'rgba(36, 51, 45, 0.12)',
  ink: '#24332d',
  inkSoft: '#4f5f56',
  muted: '#5f6d64',
  forest: '#2f5d50',
  sage: '#7fa98a',
  apricot: '#d97c5b',
  sky: '#6f9db8',
  lilac: '#9a80b5',
  butter: '#c9a63e',
  rose: '#cf8a8a',
  lime: '#2f5d50',
  coral: '#d97c5b',
  cyan: '#4d7f9b',
  violet: '#8a6ba8',
  amber: '#b8952f',
} as const;

export const FONT_SANS =
  "'Nunito Sans Variable', 'Nunito Sans', system-ui, -apple-system, sans-serif";
export const FONT_MONO = "'DM Mono', ui-monospace, 'SFMono-Regular', monospace";

/** #rrggbb → rgba() con alfa. Acepta también rgba() ya formados. */
export function alpha(color: string, opacity: number): string {
  if (color.startsWith('rgba') || color.startsWith('rgb')) return color;
  const normalized = color.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;
  const value = Number.parseInt(full, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export function glowCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  opacity = 0.4,
): void {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, alpha(color, opacity));
  gradient.addColorStop(1, alpha(color, 0));
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

export function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}
