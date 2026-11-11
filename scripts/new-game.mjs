import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const slug = process.argv[2]?.trim();

if (!slug || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('Uso: npm run new:game -- mi-juego');
  console.error('El slug debe ir en kebab-case: minúsculas, números y guiones.');
  process.exit(1);
}

const gamesRoot = path.resolve('src/games');
const target = path.join(gamesRoot, slug);

try {
  await access(target);
  console.error(`Ya existe ${target}. Elige otro slug.`);
  process.exit(1);
} catch {
  // Libre.
}

const entries = await readdir(gamesRoot, { withFileTypes: true });
let maxOrder = 0;
for (const entry of entries) {
  if (!entry.isDirectory() || entry.name === 'engine') continue;
  try {
    const raw = await readFile(path.join(gamesRoot, entry.name, 'meta.json'), 'utf8');
    const meta = JSON.parse(raw);
    if (typeof meta.order === 'number') maxOrder = Math.max(maxOrder, meta.order);
  } catch {
    // Sin metadata todavía.
  }
}

const title = slug
  .split('-')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const meta = {
  slug,
  title,
  tagline: 'Un juego nuevo, pequeño y directo.',
  description:
    'Describe el juego en una o dos frases. Qué haces, por qué engancha y qué lo hace distinto.',
  category: 'accion',
  tags: ['Un botón', 'Reflejos'],
  accent: '#c8ff4d',
  cover: 'grid',
  controls: 'Espacio, clic o toque para jugar. P o Esc para pausar.',
  goal: 'Explica el objetivo en una frase clara y concreta.',
  duration: '2–4 min',
  order: maxOrder + 1,
  featured: false,
  released: new Date().toISOString().slice(0, 10),
  scoreLabel: 'PUNTOS',
  bestSuffix: 'pts',
  version: '1.0.0',
};

const gameTemplate = `import {
  BaseGame,
  FONT_MONO,
  PALETTE,
  TAU,
  alpha,
  clamp,
  glowCircle,
  type GameContext,
  type GameModule,
  type View,
} from '../engine';

const ROUND_SECONDS = 30;

class ${pascalCase(slug)} extends BaseGame {
  private score = 0;
  private elapsed = 0;
  private hitFlash = 0;
  private targetX = 0.5;
  private targetY = 0.5;

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => this.tryHit(point.x, point.y));
    this.input.onKeyDown((code) => {
      if (code !== 'Space' && code !== 'ArrowUp' && code !== 'KeyW') return;
      const view = this.runtime.view;
      this.tryHit(view.width / 2, view.height / 2);
    });
  }

  protected reset(): void {
    this.score = 0;
    this.elapsed = 0;
    this.hitFlash = 0;
    this.targetX = 0.5;
    this.targetY = 0.5;
    this.setScore('PUNTOS', 0);
  }

  protected update(dt: number): void {
    this.elapsed += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 3);

    const t = this.elapsed * 0.9;
    this.targetX = 0.5 + Math.cos(t) * 0.22;
    this.targetY = 0.5 + Math.sin(t * 1.3) * 0.18;

    if (this.elapsed >= ROUND_SECONDS) {
      this.finish({
        title: 'Tiempo',
        message: 'Vuelve a intentarlo y supera tu marca.',
        detail: \`\${this.score} aciertos en \${ROUND_SECONDS} s\`,
        score: this.score,
        ctaLabel: 'Jugar otra vez',
        tone: 'lose',
      });
    }
  }

  private tryHit(x: number, y: number): void {
    if (this.state !== 'running') return;
    const view = this.runtime.view;
    const targetX = this.targetX * view.width;
    const targetY = this.targetY * view.height;
    const radius = Math.max(34, Math.min(view.width, view.height) * 0.07);
    const hit = Math.hypot(x - targetX, y - targetY) <= radius;

    if (hit) {
      this.score += 1;
      this.hitFlash = 1;
      this.setScore('PUNTOS', this.score);
      this.audio.tone(520 + Math.min(this.score, 12) * 40, 0.1, {
        type: 'triangle',
        gain: 0.08,
        slideTo: 760,
      });
    } else {
      this.audio.tone(160, 0.08, { type: 'sawtooth', gain: 0.04 });
    }
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    const background = context.createRadialGradient(
      view.width / 2,
      view.height / 2,
      0,
      view.width / 2,
      view.height / 2,
      Math.max(view.width, view.height) * 0.7,
    );
    background.addColorStop(0, '#0b1110');
    background.addColorStop(1, PALETTE.bg);
    context.fillStyle = background;
    context.fillRect(0, 0, view.width, view.height);

    const x = this.targetX * view.width;
    const y = this.targetY * view.height;
    const radius = Math.max(34, Math.min(view.width, view.height) * 0.07);
    const pulse = 1 + this.hitFlash * 0.18;

    glowCircle(context, x, y, radius * 2.6, PALETTE.lime, 0.25 + this.hitFlash * 0.2);
    context.strokeStyle = alpha(PALETTE.lime, 0.35);
    context.lineWidth = 1;
    context.beginPath();
    context.arc(x, y, radius * 1.7 * pulse, 0, TAU);
    context.stroke();
    context.fillStyle = this.hitFlash > 0.1 ? PALETTE.lime : PALETTE.ink;
    context.beginPath();
    context.arc(x, y, radius * 0.72 * pulse, 0, TAU);
    context.fill();

    const remaining = clamp(1 - this.elapsed / ROUND_SECONDS, 0, 1);
    context.fillStyle = alpha(PALETTE.ink, 0.1);
    context.fillRect(view.width * 0.1, view.height - 26, view.width * 0.8, 3);
    context.fillStyle = PALETTE.lime;
    context.fillRect(view.width * 0.1, view.height - 26, view.width * 0.8 * remaining, 3);

    context.font = \`500 11px \${FONT_MONO}\`;
    context.fillStyle = PALETTE.muted;
    context.textAlign = 'center';
    context.fillText('ESPACIO / TOQUE PARA ACERTAR', view.width / 2, view.height - 42);
  }
}

const gameModule: GameModule = {
  mount: (context) => new ${pascalCase(slug)}(context),
};

export default gameModule;
`;

function pascalCase(value) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

await mkdir(target, { recursive: true });
await writeFile(path.join(target, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
await writeFile(path.join(target, 'game.ts'), gameTemplate);

console.log(`Juego creado en src/games/${slug}/`);
console.log('Siguiente: ajusta meta.json, implementa la mecánica y ejecuta npm run check.');
