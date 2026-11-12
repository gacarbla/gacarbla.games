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
if (total !== 4) problems.push(`catalog desktop: se esperaban 4 juegos, hay ${total}`);
await entry.page.locator('[data-filter="puzzle"]').click();
const puzzles = await entry.page.locator('[data-game-card]:visible').count();
if (puzzles !== 2) problems.push(`catalog desktop: se esperaban 2 puzzles, hay ${puzzles}`);
await entry.page.locator('[data-game-search]').fill('pulso');
const searchCount = await entry.page.locator('[data-game-card]:visible').count();
const emptyVisible = await entry.page.locator('[data-empty]').isVisible();
if (searchCount !== 0 || !emptyVisible)
  problems.push('catalog desktop: búsqueda sin resultados incorrecta');
await entry.page.locator('[data-reset-filters]').click();
const resetCount = await entry.page.locator('[data-game-card]:visible').count();
if (resetCount !== 4) problems.push(`catalog desktop: reset deja ${resetCount} juegos`);
await shot(entry.page, 'catalog-desktop');
console.info('catalog desktop', entry.info, { filtered, total, puzzles, searchCount, resetCount });

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

entry = await openPage(desktop, '/jugar/prisma/', 'prisma desktop');
await shot(entry.page, 'prisma-start-desktop');
await entry.page.locator('[data-play]').click();
await entry.page.waitForTimeout(700);
await shot(entry.page, 'prisma-playing-desktop');
const canvasBox = await entry.page.locator('[data-game-canvas]').boundingBox();
if (!canvasBox) {
  problems.push('prisma desktop: no se encontró el canvas');
} else {
  const cell = Math.min((canvasBox.width * 0.84) / 7, (canvasBox.height * 0.64) / 7, 86);
  const originX = canvasBox.x + (canvasBox.width - cell * 7) / 2;
  const originY = canvasBox.y + Math.max(72, (canvasBox.height - cell * 7) / 2 - 10);
  await entry.page.mouse.click(originX + 3.5 * cell, originY + 5.5 * cell);
  await entry.page.waitForTimeout(1500);
  const winVisible = await entry.page.locator('[data-overlay="finish"]').isVisible();
  const winTitle = await entry.page.locator('[data-finish-title]').textContent();
  if (!winVisible) problems.push('prisma desktop: el nivel 1 no muestra el overlay de victoria');
  if (!winTitle?.includes('Nivel 1'))
    problems.push(`prisma desktop: título inesperado "${winTitle}"`);
  await shot(entry.page, 'prisma-win-desktop');
  await entry.page.locator('[data-replay]').click();
  await entry.page.waitForTimeout(500);
  const nextLevel = await entry.page.locator('[data-score-value]').textContent();
  if (nextLevel !== '2/8') problems.push(`prisma desktop: no avanza al nivel 2 (${nextLevel})`);
  console.info('prisma desktop', { winVisible, winTitle, nextLevel });
}

{
  const fusionPage = await desktop.newPage();
  const errors = [];
  fusionPage.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  fusionPage.on('pageerror', (error) => errors.push(error.message));
  await fusionPage.addInitScript(() => {
    Math.random = () => 0.1;
  });
  await fusionPage.goto(`${base}/jugar/fusion/`, { waitUntil: 'networkidle' });
  await fusionPage.evaluate(() => document.fonts.ready);
  await fusionPage.waitForTimeout(400);
  await fusionPage.locator('[data-play]').click();
  await fusionPage.waitForTimeout(500);
  const box = await fusionPage.locator('[data-game-canvas]').boundingBox();
  if (!box) {
    problems.push('fusion desktop: no se encontró el canvas');
  } else {
    const cell = Math.min(
      (box.width - (box.width >= 1000 ? 254 : 22)) / 7,
      (box.height * 0.68) / 8,
      76,
    );
    const boardWidth = cell * 7;
    const sideWidth = box.width >= 1000 ? 210 : 0;
    const originX = (box.width - (boardWidth + sideWidth)) / 2;
    const originY = Math.max(76, (box.height - cell * 8) / 2 - 6);
    const x = box.x + originX + 3.5 * cell;
    const y = box.y + originY + 4 * cell;
    for (let drop = 0; drop < 3; drop += 1) {
      await fusionPage.mouse.click(x, y);
      await fusionPage.waitForTimeout(700);
    }
    await fusionPage.waitForTimeout(900);
    const score = await fusionPage.locator('[data-score-value]').textContent();
    if (score === '0') problems.push('fusion desktop: tres piezas iguales no han fusionado');
    if (errors.length) problems.push(`fusion desktop: ${errors.join(' | ')}`);
    await shot(fusionPage, 'fusion-playing-desktop');
    console.info('fusion desktop', { score });
  }
}

{
  const pulsoPage = await desktop.newPage();
  const errors = [];
  pulsoPage.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  pulsoPage.on('pageerror', (error) => errors.push(error.message));
  await pulsoPage.addInitScript(() => {
    Math.random = () => 0;
  });
  await pulsoPage.goto(`${base}/jugar/pulso/`, { waitUntil: 'networkidle' });
  await pulsoPage.evaluate(() => document.fonts.ready);
  await pulsoPage.waitForTimeout(400);
  await shot(pulsoPage, 'pulso-start-desktop');
  await pulsoPage.locator('[data-play]').click();
  await pulsoPage.waitForTimeout(1600);
  const pulsoBox = await pulsoPage.locator('[data-game-canvas]').boundingBox();
  if (!pulsoBox) {
    problems.push('pulso desktop: no se encontró el canvas');
  } else {
    const unit = Math.min(pulsoBox.width, pulsoBox.height);
    const radius = Math.min(250, Math.max(110, unit * 0.33));
    const cx = pulsoBox.x + pulsoBox.width / 2;
    const cy = pulsoBox.y + pulsoBox.height / 2 + 8;
    await pulsoPage.mouse.click(cx, cy - radius);
    await pulsoPage.waitForFunction(
      () => document.querySelector('[data-score-value]')?.textContent === '2',
      undefined,
      { timeout: 5000 },
    );
    await shot(pulsoPage, 'pulso-playing-desktop');
    console.info('pulso desktop: ronda 1 completada');

    await pulsoPage.waitForTimeout(2000);
    await pulsoPage.mouse.click(cx, cy + radius);
    await pulsoPage.waitForTimeout(1600);
    const failVisible = await pulsoPage.locator('[data-overlay="finish"]').isVisible();
    const failTitle = await pulsoPage.locator('[data-finish-title]').textContent();
    if (!failVisible) problems.push('pulso desktop: no muestra el overlay tras fallar');
    if (!failTitle?.includes('Fin de la ronda')) {
      problems.push(`pulso desktop: título inesperado "${failTitle}"`);
    }
    if (errors.length) problems.push(`pulso desktop: ${errors.join(' | ')}`);
    await shot(pulsoPage, 'pulso-fail-desktop');
    console.info('pulso desktop', { failVisible, failTitle });
  }
}

entry = await openPage(desktop, '/', 'home recent');
await entry.page.waitForTimeout(500);
const recentCount = await entry.page.locator('[data-recent-list] .continue-card').count();
const recentVisible = await entry.page.locator('[data-recent-section]').isVisible();
if (!recentVisible || recentCount === 0) {
  problems.push('home recent: no aparece el historial de partidas');
}
await scrollThrough(entry.page);
await shot(entry.page, 'home-recent-desktop');
console.info('home recent', { recentCount, recentVisible });

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

entry = await openPage(mobile, '/jugar/prisma/', 'prisma mobile');
await shot(entry.page, 'prisma-start-mobile');
console.info('prisma mobile', entry.info);

entry = await openPage(mobile, '/jugar/fusion/', 'fusion mobile');
await shot(entry.page, 'fusion-start-mobile');
console.info('fusion mobile', entry.info);

entry = await openPage(mobile, '/jugar/pulso/', 'pulso mobile');
await shot(entry.page, 'pulso-start-mobile');
console.info('pulso mobile', entry.info);
await mobile.close();

await browser.close();

console.info('\nPROBLEMAS:', problems.length === 0 ? 'ninguno' : problems);
if (problems.length) process.exitCode = 1;
