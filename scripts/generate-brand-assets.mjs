import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const iconsDir = `${root}/public/icons`;

const flower = `
  <g transform="translate(6 6)">
    <circle cx="22" cy="12.6" r="8.6" fill="#2f5d50"/>
    <circle cx="31.4" cy="22" r="8.6" fill="#df8b6c"/>
    <circle cx="22" cy="31.4" r="8.6" fill="#8fb397"/>
    <circle cx="12.6" cy="22" r="8.6" fill="#7fa9c2"/>
    <circle cx="22" cy="22" r="5" fill="#fffaf0" stroke="#24332d" stroke-width="1.6"/>
  </g>`;

const favicon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="16" fill="#f6f1e7"/>
  <rect x="1" y="1" width="62" height="62" rx="15" fill="none" stroke="#24332d" stroke-opacity=".12" stroke-width="1.5"/>
  <g transform="translate(9 9) scale(1.045)">${flower.replace('translate(6 6)', '')}</g>
</svg>`;

const maskable = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#f6f1e7"/>
  <g transform="translate(168 168) scale(4)">${flower.replace('translate(6 6)', '')}</g>
</svg>`;

const card = (x, y, fill, label, motif) => `
  <g>
    <rect x="${x + 4}" y="${y + 6}" width="200" height="152" rx="24" fill="#24332d" fill-opacity=".07"/>
    <rect x="${x}" y="${y}" width="200" height="152" rx="24" fill="${fill}" stroke="#24332d" stroke-opacity=".22" stroke-width="2"/>
    ${motif}
    <text x="${x + 22}" y="${y + 130}" font-family="Verdana, Arial, sans-serif" font-size="15" font-weight="bold" fill="#24332d">${label}</text>
  </g>`;

const og = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="sage" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#8fb397" stop-opacity=".38"/>
      <stop offset="100%" stop-color="#8fb397" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="apricot" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#df8b6c" stop-opacity=".28"/>
      <stop offset="100%" stop-color="#df8b6c" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="#f6f1e7"/>
  <circle cx="1080" cy="80" r="360" fill="url(#sage)"/>
  <circle cx="1140" cy="560" r="300" fill="url(#apricot)"/>
  <g fill="#24332d" fill-opacity=".1">
    ${Array.from({ length: 12 })
      .map((_, row) =>
        Array.from({ length: 18 })
          .map((__, column) => `<circle cx="${40 + column * 68}" cy="${40 + row * 52}" r="1.4"/>`)
          .join(''),
      )
      .join('')}
  </g>

  <!-- Marca -->
  <g transform="translate(72 58)">
    <g transform="translate(0 0)">${flower.replace('translate(6 6)', '')}</g>
    <text x="58" y="32" font-family="Georgia, 'Times New Roman', serif" font-size="30" font-weight="600" fill="#24332d" letter-spacing="-.8">gacarbla</text>
    <rect x="204" y="10" width="72" height="28" rx="14" fill="#dce9d8"/>
    <text x="240" y="29" text-anchor="middle" font-family="Verdana, Arial, sans-serif" font-size="10" font-weight="bold" fill="#2f5d50" letter-spacing="1.4">JUEGOS</text>
  </g>

  <!-- Titular -->
  <text x="72" y="268" font-family="Georgia, 'Times New Roman', serif" font-size="78" font-weight="500" fill="#24332d" letter-spacing="-2.4">Juegos para</text>
  <text x="72" y="360" font-family="Georgia, 'Times New Roman', serif" font-size="78" font-style="italic" font-weight="500" fill="#2f5d50" letter-spacing="-2.4">jugar sin prisa.</text>
  <text x="76" y="420" font-family="Verdana, Arial, sans-serif" font-size="21" fill="#5d6c63">Cuatro juegos originales. Sin anuncios, sin cuentas y sin prisa.</text>

  <!-- Línea inferior -->
  <line x1="72" y1="518" x2="1128" y2="518" stroke="#24332d" stroke-opacity=".14"/>
  <text x="72" y="558" font-family="'DM Mono', Consolas, monospace" font-size="16" fill="#78857d" letter-spacing="1">GAMES.GACARBLA.ES</text>
  <text x="1128" y="558" text-anchor="end" font-family="'DM Mono', Consolas, monospace" font-size="16" fill="#78857d" letter-spacing="1">HECHO CON CALMA</text>

  <!-- Juegos -->
  ${card(
    764,
    134,
    '#dce9d8',
    'Órbita',
    `<circle cx="864" cy="196" r="44" fill="none" stroke="#24332d" stroke-opacity=".25" stroke-width="2"/>
     <circle cx="864" cy="196" r="28" fill="#fffaf0" stroke="#24332d" stroke-width="2.5"/>
     <circle cx="864" cy="196" r="7" fill="#df8b6c"/>
     <circle cx="900" cy="196" r="6" fill="#2f5d50"/>
     <path d="M820 196a44 44 0 0 0 88 0" fill="none" stroke="#2f5d50" stroke-width="2.5" stroke-linecap="round"/>`,
  )}
  ${card(
    988,
    134,
    '#dfedf2',
    'Prisma',
    `<path d="M1088 154 1122 220h-68l34-66Z" fill="#fffaf0" stroke="#24332d" stroke-width="2.5" stroke-linejoin="round"/>
     <path d="M1038 196h34l18-30 16 30h26" fill="none" stroke="#5f93b0" stroke-width="2.5" stroke-linecap="round"/>
     <rect x="1078" y="178" width="12" height="12" rx="3" fill="#df8b6c" stroke="#24332d" stroke-width="1.5" transform="rotate(45 1084 184)"/>`,
  )}
  ${card(
    764,
    308,
    '#fbe3d5',
    'Fusión',
    `<rect x="820" y="358" width="36" height="36" rx="10" fill="#8fb397" stroke="#24332d" stroke-width="2"/>
     <rect x="862" y="358" width="36" height="36" rx="10" fill="#7fa9c2" stroke="#24332d" stroke-width="2"/>
     <rect x="904" y="358" width="36" height="36" rx="10" fill="#a78fbf" stroke="#24332d" stroke-width="2"/>
     <rect x="841" y="320" width="36" height="36" rx="10" fill="#df8b6c" stroke="#24332d" stroke-width="2"/>
     <rect x="883" y="320" width="36" height="36" rx="10" fill="#d9b95f" stroke="#24332d" stroke-width="2"/>`,
  )}
  ${card(
    988,
    308,
    '#ede4f2',
    'Pulso',
    `<rect x="1032" y="330" width="42" height="42" rx="12" fill="#2f5d50" stroke="#24332d" stroke-width="2"/>
     <rect x="1082" y="330" width="42" height="42" rx="12" fill="#7fa9c2" stroke="#24332d" stroke-width="2"/>
     <rect x="1032" y="380" width="42" height="42" rx="12" fill="#a78fbf" stroke="#24332d" stroke-width="2"/>
     <rect x="1082" y="380" width="42" height="42" rx="12" fill="#df8b6c" stroke="#24332d" stroke-width="2"/>
     <circle cx="1053" cy="351" r="6" fill="#fffaf0"/>`,
  )}
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
