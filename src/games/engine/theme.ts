export const PALETTE = {
  bg: '#07080a',
  surface: '#0f1217',
  surfaceRaised: '#141821',
  line: 'rgba(255, 255, 255, 0.09)',
  ink: '#f2f5f7',
  inkSoft: '#a7b2bf',
  muted: '#7d8896',
  lime: '#c8ff4d',
  coral: '#ff6b57',
  cyan: '#5ce1e6',
  violet: '#a78bfa',
  amber: '#ffc857',
} as const;

export const FONT_SANS =
  "'Space Grotesk Variable', 'Space Grotesk', system-ui, -apple-system, sans-serif";
export const FONT_MONO = "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace";

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
