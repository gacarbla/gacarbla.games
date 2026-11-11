# gacarbla games

Un portal de juegos originales: pequeños, rápidos y con un mismo lenguaje visual.
Sin anuncios, sin registro y sin descargas. El progreso se guarda en el navegador.

**Producción:** [games.gacarbla.es](https://games.gacarbla.es)

## Stack

| Pieza     | Elección                       | Por qué                                                                |
| --------- | ------------------------------ | ---------------------------------------------------------------------- |
| Framework | [Astro 7](https://astro.build) | Salida 100 % estática, cero JS por defecto y rutas generadas en build. |
| Lenguaje  | TypeScript estricto            | Contratos claros para el catálogo y el motor de juego.                 |
| Estilos   | CSS moderno con design tokens  | Control total del detalle visual sin runtime extra.                    |
| Juegos    | Canvas 2D + Web Audio          | 60 fps, sin assets pesados ni dependencias.                            |
| Tests     | Vitest                         | Lógica de juego pura y catálogo verificables.                          |
| CI/CD     | GitHub Actions + Pages         | Build, checks y despliegue automático desde `main`.                    |

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:4321
npm run check    # Astro + TypeScript
npm test         # tests de lógica
npm run build    # build de producción en dist/
npm run preview  # sirve el build
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

## Licencia

Código bajo [MIT](LICENSE). Los juegos, textos y la identidad visual son obra de gacarbla.
