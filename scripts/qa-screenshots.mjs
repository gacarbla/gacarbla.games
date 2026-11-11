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

async function scrollThrough(page) {
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
  });
  const height = await page.evaluate(() => document.body.scrollHeight);
  const step = await page.evaluate(() => Math.round(window.innerHeight * 0.75));
  for (let y = 0; y < height; y += step) {
    await page.evaluate((nextY) => window.scrollTo(0, nextY), y);
    await page.waitForTimeout(70);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
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
    activeElement: document.activeElement?.tagName ?? null,
    scrollY: window.scrollY,
  }));
  if (info.overflow)
    problems.push(`${label}: scroll horizontal (${info.width} > ${info.viewport})`);
  return info;
}

async function shot(page, name, fullPage = true) {
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage });
}

async function openPage(context, pathName, label, ignoreExpected404 = false) {
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (ignoreExpected404 && message.text().includes('404 (Not Found)')) return;
    errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}${pathName}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const info = await inspect(page, label);
  if (errors.length) problems.push(`${label}: ${errors.join(' | ')}`);
  return { page, errors, info };
}

// Escritorio -----------------------------------------------------------------
const desktop = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 1,
  colorScheme: 'dark',
});

let entry = await openPage(desktop, '/', 'home desktop');
await scrollThrough(entry.page);
await shot(entry.page, 'home-desktop');
console.info('home desktop', entry.info);

entry = await openPage(desktop, '/juegos/', 'catalog desktop');
await entry.page.locator('[data-filter="accion"]').click();
const filtered = await entry.page.locator('[data-game-card]:visible').count();
if (filtered === 0) problems.push('catalog desktop: el filtro acción no muestra juegos');
await entry.page.locator('[data-filter="todos"]').click();
const total = await entry.page.locator('[data-game-card]:visible').count();
if (total === 0) problems.push('catalog desktop: el filtro todos no muestra juegos');
await shot(entry.page, 'catalog-desktop');
console.info('catalog desktop', entry.info, { filtered, total });

entry = await openPage(desktop, '/jugar/orbita/', 'game desktop');
await shot(entry.page, 'game-start-desktop');
await entry.page.locator('[data-play]').click();
await entry.page.waitForTimeout(1800);
await entry.page.keyboard.press('Space');
await entry.page.waitForTimeout(500);
await entry.page.keyboard.press('Space');
await entry.page.waitForTimeout(500);
const playing = await entry.page.evaluate(() => ({
  playing: document.querySelector('.game-page')?.classList.contains('is-playing') ?? false,
  startHidden: document.querySelector('[data-overlay="start"]')?.hasAttribute('hidden') ?? false,
  score: document.querySelector('[data-score-value]')?.textContent,
  canvas: (() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const pixel = context.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
    return { width: canvas.width, height: canvas.height, center: [...pixel] };
  })(),
}));
if (!playing.playing || !playing.startHidden)
  problems.push('game desktop: no entra en modo partida');
if (
  !playing.canvas ||
  playing.canvas.center[0] + playing.canvas.center[1] + playing.canvas.center[2] < 10
) {
  problems.push('game desktop: el canvas parece vacío');
}
await shot(entry.page, 'game-playing-desktop');
await entry.page.locator('[data-pause]').click();
await entry.page.waitForTimeout(400);
const paused = await entry.page.locator('[data-overlay="pause"]').isVisible();
if (!paused) problems.push('game desktop: la pausa no muestra el overlay');
await shot(entry.page, 'game-pause-desktop');
console.info('game desktop', entry.info, playing, { paused });

entry = await openPage(desktop, '/sobre/', 'about desktop');
await scrollThrough(entry.page);
await shot(entry.page, 'about-desktop');

entry = await openPage(desktop, '/ruta-inexistente/', '404 desktop', true);
await shot(entry.page, '404-desktop');
await desktop.close();

// Móvil ----------------------------------------------------------------------
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  colorScheme: 'dark',
});

entry = await openPage(mobile, '/', 'home mobile');
await scrollThrough(entry.page);
await shot(entry.page, 'home-mobile');
console.info('home mobile', entry.info);

entry = await openPage(mobile, '/juegos/', 'catalog mobile');
await shot(entry.page, 'catalog-mobile');

entry = await openPage(mobile, '/jugar/orbita/', 'game mobile');
await shot(entry.page, 'game-start-mobile');
await entry.page.locator('[data-play]').click();
await entry.page.waitForTimeout(1500);
await entry.page.locator('[data-game-canvas]').click({ position: { x: 195, y: 320 } });
await entry.page.waitForTimeout(700);
await shot(entry.page, 'game-playing-mobile');
const mobilePlaying = await entry.page.evaluate(() => ({
  playing: document.querySelector('.game-page')?.classList.contains('is-playing') ?? false,
  startHidden: document.querySelector('[data-overlay="start"]')?.hasAttribute('hidden') ?? false,
}));
if (!mobilePlaying.playing || !mobilePlaying.startHidden)
  problems.push('game mobile: no entra en modo partida');
console.info('game mobile', entry.info, mobilePlaying);
await mobile.close();

await browser.close();

console.info('\nPROBLEMAS:', problems.length === 0 ? 'ninguno' : problems);
if (problems.length) process.exitCode = 1;
