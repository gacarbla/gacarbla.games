# gacarbla juegos

Un portal tranquilo de juegos originales. Cuatro juegos para un rato, sin anuncios, sin
cuentas y sin notificaciones. El progreso se queda en tu navegador.

**Producción:** [games.gacarbla.es](https://games.gacarbla.es)

## Los juegos

| Juego      | Categoría | Mecánica                                                   |
| ---------- | --------- | ---------------------------------------------------------- |
| **Órbita** | Acción    | Un paseo entre órbitas: cambia de carril y recoge núcleos. |
| **Prisma** | Puzzle    | Rota espejos y enciende la constelación pieza a pieza.     |
| **Fusión** | Puzzle    | Conecta tres orbes iguales y provoca cadenas de fusiones.  |
| **Pulso**  | Reflejos  | Repite secuencias y encuentra tu ritmo, sin prisa.         |

Comparten motor, lenguaje visual, HUD, sonido sintetizado y controles de teclado y toque.

## Diseño y bienestar

La v2 es una revisión completa de identidad y experiencia:

- Paleta cálida de papel, bosque, salvia, albaricoque, cielo y lavanda.
- Nuevo logotipo de flor y tipografía editorial: **Fraunces** + **Nunito Sans** + **DM Mono**.
- Portadas e ilustraciones SVG con estética de papel recortado.
- Movimiento lento, sin destellos agresivos ni rebotes.
- Partidas cortas, sin rachas, sin monedas, sin recompensas diarias ni comparaciones.
- Pausa y salida siempre disponibles. El juego nunca te reclama.

El detalle de las decisiones está en [docs/DESIGN.md](docs/DESIGN.md).

## Stack

| Pieza      | Elección                        | Por qué                                                                |
| ---------- | ------------------------------- | ---------------------------------------------------------------------- |
| Framework  | [Astro 7](https://astro.build)  | Salida 100 % estática, cero JS por defecto y rutas generadas en build. |
| Lenguaje   | TypeScript estricto             | Contratos claros para el catálogo y el motor de juego.                 |
| Estilos    | CSS moderno con design tokens   | Control total del detalle visual sin runtime extra.                    |
| Tipografía | Fraunces, Nunito Sans y DM Mono | Serif cálida, sans legible y mono para datos.                          |
| Juegos     | Canvas 2D + Web Audio           | Sin assets pesados ni dependencias de juego.                           |
| Tests      | Vitest                          | Lógica de juego pura y catálogo verificables.                          |
| CI/CD      | GitHub Actions + Pages          | Build, checks y despliegue automático desde `main`.                    |

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:4321
npm run check    # Astro + TypeScript
npm test         # tests de lógica
npm run build    # build de producción en dist/
npm run preview  # sirve el build
npm run qa       # capturas y flujos reales en Chrome (requiere Chrome/Edge)
```

## Añadir un juego

1. `npm run new:game -- mi-juego` genera `src/games/mi-juego/` con su metadata y su módulo.
2. Ajusta `meta.json` (título, descripción, categoría, acento, portada).
3. Implementa el juego en `game.ts` usando el motor compartido.
4. Añade tests de la lógica pura en `tests/`.
5. `npm run check && npm test && npm run build`.

El catálogo se descubre solo: no hay que tocar rutas, menús ni listados. Los detalles
están en [docs/ADDING_A_GAME.md](docs/ADDING_A_GAME.md).

## Estructura

```
src/
├── components/       Chrome del portal, tarjetas, portadas, iconos
├── data/             Registro tipado del catálogo
├── games/            Un directorio por juego + motor compartido
├── layouts/          Layout base con SEO y metadatos
├── pages/            Home, catálogo, ficha/juego, sobre, 404
├── scripts/          Mejoras progresivas del portal
└── styles/           Tokens, base y estilos de portal/juego
```

## Despliegue

Cada push a `main` ejecuta CI y publica `dist/` en GitHub Pages mediante
`actions/deploy-pages`. El dominio `games.gacarbla.es` se declara en `public/CNAME`.
Consulta [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para la configuración de DNS.

## Flujo de trabajo

- Ramas: `feature/...`, `fix/...`, `chore/...`.
- Commits: prefijo de acción en mayúsculas (`ADD:`, `EDIT:`, `FIX:`, `REMOVE:`, `DOCS:`).
- Cada cambio entra por Pull Request con CI en verde.
- `main` siempre desplegable.

Más detalle en [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

Código bajo [MIT](LICENSE). Los juegos, textos y la identidad visual son obra de gacarbla.
