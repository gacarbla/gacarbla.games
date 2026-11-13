# gacarbla juegos

Un portal tranquilo de juegos originales. Quince juegos para un rato, sin anuncios, sin
cuentas y sin notificaciones. El progreso se queda en tu navegador.

**Producción:** [games.gacarbla.es](https://games.gacarbla.es)

## Los juegos

| Juego               | Categoría  | Mecánica                                                       |
| ------------------- | ---------- | -------------------------------------------------------------- |
| **Buscaminas**      | Lógica     | Deduce minas en 8×8, 9×9 o 12×12 con primer clic seguro.       |
| **Nonograma**       | Lógica     | Cruza pistas de filas y columnas para revelar el dibujo.       |
| **Sudoku**          | Lógica     | Completa 4×4, 6×6 o 9×9 sin repetir números en filas o cajas.  |
| **Mastermind**      | Lógica     | Descifra un código de cuatro colores en seis intentos.         |
| **Nim**             | Lógica     | Retira objetos y obliga a la máquina a coger el último.        |
| **Veinticuatro**    | Lógica     | Combina cuatro números y operaciones para llegar a 24.         |
| **Torres de Hanoi** | Lógica     | Mueve cinco discos con un mínimo de 31 movimientos.            |
| **Luces**           | Visual     | Apaga un tablero 5×5 donde cada pulsación cambia varias luces. |
| **Tuberías**        | Visual     | Rota conexiones para llevar la fuente hasta la salida.         |
| **Deslizante**      | Visual     | Ordena el 15-puzzle deslizando las piezas hacia el hueco.      |
| **Memoria**         | Visual     | Memoriza 30 cartas y encuentra las 15 parejas.                 |
| **Laberinto**       | Visual     | Explora con niebla, recoge tres llaves y encuentra la salida.  |
| **Sopa de letras**  | Palabras   | Encuentra palabras en 10×10, 12×12 o 15×15.                    |
| **Sokoban**         | Estrategia | Empuja cada caja a su destino en diez niveles.                 |
| **Conecta cuatro**  | Estrategia | Gana a una IA con minimax y poda alfa-beta.                    |

Comparten motor, lenguaje visual, HUD, sonido sintetizado y controles de teclado y toque.

## Diseño y bienestar

La v2.1 combina el rediseño de identidad de la v2 con quince juegos nuevos:

- Paleta cálida de papel, bosque, salvia, albaricoque, cielo y lavanda.
- Nuevo logotipo de flor y tipografía editorial: **Fraunces** + **Nunito Sans** + **DM Mono**.
- Miniaturas opcionales: si el juego no declara `thumbnail`, la portada muestra solo su nombre sobre papel tintado.
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
2. Ajusta `meta.json` (título, descripción, categoría, acento y, si quieres, `thumbnail`).
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
