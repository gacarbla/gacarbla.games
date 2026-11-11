import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const iconsDir = `${root}/public/icons`;

const favicon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="15" fill="#07080a"/>
  <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="14.25" fill="none" stroke="#ffffff" stroke-opacity=".08"/>
  <circle cx="32" cy="32" r="19" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="1.5"/>
  <path d="M49.5 43.1A19 19 0 0 0 32 13" fill="none" stroke="#c8ff4d" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="32" cy="32" r="5" fill="#f2f5f7"/>
  <circle cx="32" cy="32" r="10.5" fill="none" stroke="#ffffff" stroke-opacity=".22" stroke-width="1" stroke-dasharray="1.4 3.4"/>
  <circle cx="45.5" cy="18.5" r="3.4" fill="#ff6b57"/>
</svg>`;

const maskable = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#07080a"/>
  <g transform="translate(128 128) scale(4)">
    <circle cx="32" cy="32" r="19" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="1.5"/>
    <path d="M49.5 43.1A19 19 0 0 0 32 13" fill="none" stroke="#c8ff4d" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="32" cy="32" r="5" fill="#f2f5f7"/>
    <circle cx="32" cy="32" r="10.5" fill="none" stroke="#ffffff" stroke-opacity=".22" stroke-width="1" stroke-dasharray="1.4 3.4"/>
    <circle cx="45.5" cy="18.5" r="3.4" fill="#ff6b57"/>
  </g>
</svg>`;

const og = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#c8ff4d" stop-opacity=".22"/>
      <stop offset="100%" stop-color="#c8ff4d" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity=".045"/>
    </pattern>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity=".06"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="#07080a"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <circle cx="1010" cy="315" r="300" fill="url(#glow)"/>

  <!-- Marca -->
  <g transform="translate(72 64)">
    <circle cx="22" cy="22" r="20" fill="none" stroke="#ffffff" stroke-opacity=".22" stroke-width="1.5"/>
    <path d="M40.4 34.2A20 20 0 0 0 22 2" fill="none" stroke="#c8ff4d" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="22" cy="22" r="5" fill="#f2f5f7"/>
    <circle cx="36" cy="8" r="3.2" fill="#ff6b57"/>
    <text x="60" y="30" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="27" font-weight="600" fill="#f2f5f7" letter-spacing="-1">gacarbla</text>
    <rect x="182" y="10" width="74" height="26" rx="5" fill="none" stroke="#ffffff" stroke-opacity=".18"/>
    <text x="219" y="28" text-anchor="middle" font-family="Consolas, monospace" font-size="12" fill="#7d8896" letter-spacing="3">GAMES</text>
  </g>

  <!-- Titular -->
  <text x="72" y="298" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="82" font-weight="600" fill="#f2f5f7" letter-spacing="-4">Juegos pequeños.</text>
  <text x="72" y="392" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="82" font-weight="600" fill="#c8ff4d" letter-spacing="-4">Muy bien hechos.</text>
  <text x="76" y="452" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="25" fill="#a7b2bf" letter-spacing="-.4">Cuatro juegos originales. Gratis y sin anuncios.</text>

  <!-- Línea inferior -->
  <line x1="72" y1="518" x2="1128" y2="518" stroke="#ffffff" stroke-opacity=".1"/>
  <text x="72" y="562" font-family="Consolas, monospace" font-size="18" fill="#7d8896" letter-spacing="1">GAMES.GACARBLA.ES</text>
  <text x="1128" y="562" text-anchor="end" font-family="Consolas, monospace" font-size="18" fill="#7d8896" letter-spacing="1">ASTRO · CANVAS · 60 FPS</text>

  <!-- Motivo orbital -->
  <g transform="translate(975 315)">
    <circle r="150" fill="none" stroke="#ffffff" stroke-opacity=".1"/>
    <circle r="105" fill="none" stroke="#ffffff" stroke-opacity=".16"/>
    <circle r="55" fill="none" stroke="#ffffff" stroke-opacity=".22" stroke-dasharray="3 9"/>
    <path d="M-150 0A150 150 0 0 0 150 0" fill="none" stroke="#c8ff4d" stroke-width="3" stroke-linecap="round"/>
    <path d="M0-105A105 105 0 0 1 0 105" fill="none" stroke="#5ce1e6" stroke-width="2" stroke-linecap="round" stroke-opacity=".7"/>
    <circle r="34" fill="#f2f5f7"/>
    <circle r="8" fill="#07080a"/>
    <circle cx="106" cy="0" r="10" fill="#c8ff4d"/>
    <circle cx="-72" cy="-76" r="6" fill="#ff6b57"/>
    <circle cx="0" cy="105" r="5" fill="#5ce1e6"/>
  </g>
</svg>`;

await mkdir(iconsDir, { recursive: true });
await writeFile(`${iconsDir}/../og.png`, await sharp(Buffer.from(og)).png().toBuffer());
await writeFile(
  `${iconsDir}/icon-192.png`,
  await sharp(Buffer.from(favicon)).resize(192, 192).png().toBuffer(),
);
await writeFile(
  `${iconsDir}/icon-512.png`,
  await sharp(Buffer.from(favicon)).resize(512, 512).png().toBuffer(),
);
await writeFile(
  `${iconsDir}/apple-touch-icon.png`,
  await sharp(Buffer.from(favicon)).resize(180, 180).png().toBuffer(),
);
await writeFile(
  `${iconsDir}/icon-maskable-512.png`,
  await sharp(Buffer.from(maskable)).resize(512, 512).png().toBuffer(),
);

console.log('Assets generados en public/og.png y public/icons/.');
