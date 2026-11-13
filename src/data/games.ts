import { z } from 'zod';
import type { GameCategory } from '../games/engine/types';

export const gameMetaSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug debe ir en kebab-case.'),
  title: z.string().min(1).max(40),
  tagline: z.string().min(8).max(90),
  description: z.string().min(40).max(320),
  category: z.enum(['logica', 'visual', 'palabras', 'estrategia']),
  tags: z.array(z.string().min(1).max(20)).min(1).max(4),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'El acento debe ser un color #rrggbb.'),
  thumbnail: z
    .string()
    .regex(/^\/images\/games\/[a-zA-Z0-9._/-]+$/, 'La miniatura debe vivir en /images/games/.')
    .optional(),
  controls: z.string().min(8).max(160),
  goal: z.string().min(8).max(180),
  duration: z.string().min(2).max(20),
  scoreLabel: z.string().min(2).max(20).default('PUNTOS'),
  bestSuffix: z.string().min(1).max(16).default('pts'),
  order: z.number().int().min(0),
  featured: z.boolean().default(false),
  released: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  version: z.string().default('1.0.0'),
});

export type GameMeta = z.infer<typeof gameMetaSchema>;

export const CATEGORY_LABELS: Record<GameCategory, string> = {
  logica: 'Lógica',
  visual: 'Visual',
  palabras: 'Palabras',
  estrategia: 'Estrategia',
};

export const CATEGORY_DESCRIPTIONS: Record<GameCategory, string> = {
  logica: 'Deducción, números y paciencia. Piensa antes de tocar.',
  visual: 'Formas, luces y espacio. Un reto para la mirada.',
  palabras: 'Letras, rutas y vocabulario. Encuentra la palabra.',
  estrategia: 'Planifica, anticipa y gana con la cabeza.',
};

const metaModules = import.meta.glob<{ default: unknown }>('../games/*/meta.json', {
  eager: true,
});
const gameModules = import.meta.glob('../games/*/game.ts');

function slugFromPath(path: string): string {
  const segments = path.split('/');
  return segments[segments.length - 2] ?? '';
}

const discovered: GameMeta[] = Object.entries(metaModules).map(([path, module]) => {
  const raw = 'default' in module ? module.default : module;
  const parsed = gameMetaSchema.safeParse(raw);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'meta'}: ${issue.message}`)
      .join(' · ');
    throw new Error(`[games] Metadata inválida en ${path} → ${issues}`);
  }

  const directorySlug = slugFromPath(path);
  if (parsed.data.slug !== directorySlug) {
    throw new Error(
      `[games] El slug "${parsed.data.slug}" no coincide con la carpeta "${directorySlug}" (${path}).`,
    );
  }

  if (!gameModules[`../games/${directorySlug}/game.ts`]) {
    throw new Error(`[games] Falta el módulo game.ts del juego "${directorySlug}".`);
  }

  return parsed.data;
});

const seen = new Set<string>();
for (const game of discovered) {
  if (seen.has(game.slug)) throw new Error(`[games] Slug duplicado: "${game.slug}".`);
  seen.add(game.slug);
}

export const games: readonly GameMeta[] = discovered.sort((a, b) => a.order - b.order);

export const featuredGame: GameMeta | undefined = games.find((game) => game.featured) ?? games[0];

export function getGame(slug: string): GameMeta | undefined {
  return games.find((game) => game.slug === slug);
}

export function getRelatedGames(slug: string, limit = 3): GameMeta[] {
  return games.filter((game) => game.slug !== slug).slice(0, limit);
}

export function getCategoryCounts(): Record<GameCategory, number> {
  const counts: Record<GameCategory, number> = { logica: 0, visual: 0, palabras: 0, estrategia: 0 };
  for (const game of games) counts[game.category] += 1;
  return counts;
}
