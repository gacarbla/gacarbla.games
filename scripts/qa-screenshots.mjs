import { mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.QA_URL ?? 'http://127.0.0.1:4321';
const outDir = path.resolve('.qa');
const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

let executablePath;
for (const candidate of chromeCandidates) {
  try {
    await access(candidate);
    executablePath = candidate;
    break;
  } catch {
    // Siguiente candidato.
  }
}

if (!executablePath) {
  console.error('No se encontró Chrome/Edge. Define CHROME_PATH.');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const problems = [];

const GAMES = [
  'buscaminas',
  'nonograma',
  'sudoku',
  'mastermind',
  'nim',
  'veinticuatro',
  'hanoi',
  'luces',
  'tuberias',
  'deslizante',
  'memoria',
  'laberinto',
  'sopa-de-letras',
  'sokoban',
  'conecta-cuatro',
];

async function scrollThrough(page) {
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
  });
  const height = await page.evaluate(() => document.body.scrollHeight);
  const step = await page.evaluate(() => Math.round(window.innerHeight * 0.75));
  for (let y = 0; y < height; y += step) {
    await page.evaluate((nextY) => window.scrollTo(0, nextY), y);
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
}

async function inspect(page, label) {
  const info = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.trim() ?? null,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    brokenImages: [...document.images].filter(
      (image) => !image.complete || image.naturalWidth === 0,
    ).length,
  }));
  if (info.overflow)
    problems.push(`${label}: scroll horizontal (${info.width} > ${info.viewport})`);
  if (info.brokenImages) problems.push(`${label}: imágenes rotas`);
  return info;
}

async function shot(page, name, fullPage = false) {
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage });
}

async function openPage(context, pathName, label) {
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}${pathName}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
  const info = await inspect(page, label);
  if (errors.length) problems.push(`${label}: ${errors.join(' | ')}`);
  return { page, errors, info };
}

const desktop = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
});

let entry = await openPage(desktop, '/', 'home desktop');
await scrollThrough(entry.page);
await shot(entry.page, 'home-desktop', true);
console.info('home desktop', entry.info);

entry = await openPage(desktop, '/juegos/', 'catalog desktop');
const total = await entry.page.locator('[data-game-card]:visible').count();
if (total !== 15) problems.push(`catalog desktop: se esperaban 15 juegos, hay ${total}`);
for (const [category, expected] of [
  ['logica', 7],
  ['visual', 5],
  ['palabras', 1],
  ['estrategia', 2],
]) {
  await entry.page.locator(`[data-filter="${category}"]`).click();
  const count = await entry.page.locator('[data-game-card]:visible').count();
  if (count !== expected) {
    problems.push(`catalog desktop: ${category} debería mostrar ${expected}, muestra ${count}`);
  }
}
await entry.page.locator('[data-filter="logica"]').click();
await entry.page.locator('[data-game-search]').fill('sudoku');
const searchCount = await entry.page.locator('[data-game-card]:visible').count();
if (searchCount !== 1) problems.push(`catalog desktop: búsqueda sudoku devuelve ${searchCount}`);
await entry.page.locator('[data-game-search]').fill('');
await entry.page.locator('[data-filter="todos"]').click();
const resetCount = await entry.page.locator('[data-game-card]:visible').count();
if (resetCount !== 15) problems.push(`catalog desktop: reset deja ${resetCount} juegos`);
await shot(entry.page, 'catalog-desktop', true);
console.info('catalog desktop', entry.info, { total, searchCount, resetCount });

const representative = new Set([
  'buscaminas',
  'nonograma',
  'tuberias',
  'sokoban',
  'conecta-cuatro',
]);

for (const slug of GAMES) {
  entry = await openPage(desktop, `/jugar/${slug}/`, `${slug} desktop`);
  await shot(entry.page, `${slug}-start`);
  await entry.page.locator('[data-play]').click();
  await entry.page.waitForTimeout(700);
  const state = await entry.page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    let painted = false;
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        const size = 80;
        const x = Math.max(0, Math.floor(canvas.width / 2 - size / 2));
        const y = Math.max(0, Math.floor(canvas.height / 2 - size / 2));
        const data = context.getImageData(
          x,
          y,
          Math.min(size, canvas.width),
          Math.min(size, canvas.height),
        ).data;
        const colors = new Set();
        for (let index = 0; index < data.length; index += 16) {
          colors.add(`${data[index]},${data[index + 1]},${data[index + 2]}`);
        }
        painted = colors.size > 2;
      }
    }
    return {
      playing: document.querySelector('.game-page')?.classList.contains('is-playing') ?? false,
      startHidden:
        document.querySelector('[data-overlay="start"]')?.hasAttribute('hidden') ?? false,
      painted,
      score: document.querySelector('[data-score-value]')?.textContent,
    };
  });
  if (!state.playing || !state.startHidden) problems.push(`${slug}: no entra en partida`);
  if (!state.painted) problems.push(`${slug}: el canvas parece vacío tras empezar`);
  if (entry.errors.length) problems.push(`${slug}: ${entry.errors.join(' | ')}`);
  if (representative.has(slug)) {
    await shot(entry.page, `${slug}-playing`);
  }
  await entry.page.locator('[data-pause]').click();
  await entry.page.waitForTimeout(250);
  if (!(await entry.page.locator('[data-overlay="pause"]').isVisible())) {
    problems.push(`${slug}: la pausa no muestra el overlay`);
  }
  await entry.page.close();
}

entry = await openPage(desktop, '/', 'home recent');
await entry.page.waitForTimeout(400);
const recentCount = await entry.page.locator('[data-recent-list] .continue-card').count();
const recentVisible = await entry.page.locator('[data-recent-section]').isVisible();
if (!recentVisible || recentCount === 0) problems.push('home recent: no aparece el historial');
console.info('home recent', { recentCount, recentVisible });
await desktop.close();

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  colorScheme: 'light',
});

entry = await openPage(mobile, '/', 'home mobile');
await scrollThrough(entry.page);
await shot(entry.page, 'home-mobile', true);
console.info('home mobile', entry.info);

for (const slug of GAMES) {
  entry = await openPage(mobile, `/jugar/${slug}/`, `${slug} mobile`);
  if (entry.info.width > 390) problems.push(`${slug} mobile: ancho ${entry.info.width}`);
  await entry.page.close();
}

entry = await openPage(mobile, '/juegos/', 'catalog mobile');
await shot(entry.page, 'catalog-mobile', true);
await mobile.close();

await browser.close();

console.info('\nPROBLEMAS:', problems.length === 0 ? 'ninguno' : problems);
if (problems.length) process.exitCode = 1;
