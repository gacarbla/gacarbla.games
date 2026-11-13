# Arquitectura y producto

## 1. La idea

Un portal de juegos para una pausa tranquila. Quince juegos originales, un mismo lenguaje
visual y ninguna mecánica que intente retenerte más de lo que quieras. Nada de anuncios,
cuentas, notificaciones ni monedas.

**Principios**

1. **Calma.** La interfaz y los juegos se mueven despacio, con contraste suficiente y sin
   estímulos agresivos. El objetivo es pasar un rato, no subir la adrenalina.
2. **Uniformidad.** Todos los juegos comparten paleta, tipografía, HUD, sonido sintetizado y
   reglas de interacción. Un juego nuevo no parece un injerto.
3. **Bienestar.** Sin rachas, recompensas diarias, comparaciones sociales ni bucles que
   oculten la salida. Pausa y salida siempre están disponibles.
4. **Velocidad.** HTML estático, fuentes locales, cero dependencias de UI y juego en canvas.
   El primer juego debe estar a un clic y cargar en menos de un segundo.
5. **Respeto.** Sin tracking, cookies ni muros. Las puntuaciones viven en `localStorage`.
6. **Escalabilidad.** El catálogo es un registro autodescubierto. Añadir un juego no toca
   rutas, menús ni listados.

## 2. Arquitectura de información

```
/                     Portada: propuesta, juego destacado, catálogo, manifiesto
/juegos/              Catálogo completo con búsqueda y filtros
/jugar/<slug>/        Ficha inmersiva + juego + cómo jugar + relacionados
/sobre/               Proyecto, principios, bienestar, tecnología y privacidad
/404                  Página de error con salida al catálogo
```

La portada y el catálogo comparten el mismo componente de rejilla, así que la experiencia
no se rompe al crecer. La ficha de juego incluye contexto útil (controles, categoría, mejor
marca) sin competir con el área de juego.

## 3. Lenguaje visual

- **Tema:** papel cálido, luz natural y formas suaves. Fondo `#f6f1e7`, superficies crema y
  bordes de tinta al 12 %.
- **Acentos:** bosque (`#2f5d50`) para la acción; salvia, albaricoque, cielo, lavanda y
  mantequilla para los juegos y las categorías. Cada juego declara su acento.
- **Tipografía:** Fraunces Variable para titulares editoriales; Nunito Sans Variable para
  interfaz y texto; DM Mono para marcadores y datos. Todas autoalojadas.
- **Forma:** radios generosos, botones píldora, tarjetas de papel y sombras muy suaves.
- **Movimiento:** entradas de 600–700 ms, recorridos de 10–14 px, sin rebotes ni flashes.
  Todo respeta `prefers-reduced-motion`.

Las portadas son un hueco para una imagen propia: cada juego puede declarar `thumbnail`
con una ruta dentro de `/images/games/`. Si no lo hace, la portada muestra únicamente el
nombre del juego sobre su color de acento. No hay numeración ni ilustraciones de relleno.
La identidad completa está en [DESIGN.md](DESIGN.md).

## 4. El catálogo como sistema

Cada juego es un directorio:

```
src/games/<slug>/
├── meta.json      # contrato público validado con Zod
└── game.ts        # default export: factoría que monta el juego
```

`src/data/games.ts` descubre los directorios con `import.meta.glob`, valida la metadata en
build y expone:

- `games`: lista ordenada para portada y catálogo.
- `getGame(slug)`: metadata del juego.
- `GameMeta`: tipo inferido del esquema.

La ruta `/jugar/[slug]/` es única para todo el catálogo. El módulo del juego se carga como
chunk independiente solo cuando se entra a jugar, de modo que la portada no paga el coste de
los juegos. Un catálogo de 4 o de 400 juegos usa exactamente la misma infraestructura.

## 5. Motor de juego

`src/games/engine/` concentra lo que todos comparten:

| Módulo       | Responsabilidad                                              |
| ------------ | ------------------------------------------------------------ |
| `runtime.ts` | Bucle rAF con delta limitado, pausa, resize y DPR.           |
| `input.ts`   | Puntero + teclado normalizados (acción, ejes, posición).     |
| `audio.ts`   | Sintetizador Web Audio: tonos, acordes, ruido. Sin archivos. |
| `storage.ts` | Récords y progreso con namespace y manejo de errores.        |
| `effects.ts` | Partículas y shake contenidos.                               |
| `math.ts`    | Utilidades deterministas y aleatoriedad con semilla.         |
| `types.ts`   | Contrato `GameModule`, `GameContext`, `GameInstance`.        |

Cada juego implementa `update(dt)` y `draw(ctx)`, y declara su HUD. El shell (Astro) se
encarga de inicio, pausa, fin, audio, pantalla completa, récord y navegación. Así un juego
nuevo hereda gratis la experiencia completa.

### Los quince juegos

| Juego               | Categoría  | Mecánica                               | Lo que demuestra                         |
| ------------------- | ---------- | -------------------------------------- | ---------------------------------------- |
| **Buscaminas**      | Lógica     | Tres dificultades, primer clic seguro. | Flood-fill, banderas, generación segura. |
| **Nonograma**       | Lógica     | Pistas de fila y columna.              | Patrones, validación exacta.             |
| **Sudoku**          | Lógica     | 4×4, 6×6 y 9×9 con solución única.     | Backtracking, conflictos.                |
| **Mastermind**      | Lógica     | Código de cuatro colores.              | Feedback exacto/desplazado.              |
| **Nim**             | Lógica     | Misère contra IA.                      | Minimax, estrategia.                     |
| **Veinticuatro**    | Lógica     | Cuatro números, una meta.              | Solver con fracciones.                   |
| **Torres de Hanoi** | Lógica     | Cinco discos.                          | Planificación, mínimo 31.                |
| **Luces**           | Visual     | Lights Out 5×5.                        | Generación reversible.                   |
| **Tuberías**        | Visual     | Conexión de red 7×7.                   | DFS, rotaciones, conectividad.           |
| **Deslizante**      | Visual     | 15-puzzle.                             | Desorden soluble.                        |
| **Memoria**         | Visual     | 15 parejas con preview.                | Memoria, emparejamiento.                 |
| **Laberinto**       | Visual     | 15×15 con niebla.                      | DFS, exploración.                        |
| **Sopa de letras**  | Palabras   | 10×10, 12×12 y 15×15.                  | Colocación en 8 direcciones.             |
| **Sokoban**         | Estrategia | Diez niveles de empuje.                | Planificación, deshacer.                 |
| **Conecta cuatro**  | Estrategia | 7×6 contra IA.                         | Minimax con poda alfa-beta.              |

## 6. Rendimiento

- Astro genera HTML estático; el JS del portal es mínimo y el de cada juego se carga aparte.
- Fuentes variables autoalojadas con subsets por `unicode-range`.
- Sin frameworks de UI, sin librerías de animación y sin imágenes de mapa de bits en el
  catálogo. Las portadas son SVG.
- Canvas con `devicePixelRatio` limitado a 2 y `ResizeObserver`.
- El bucle se detiene con la pestaña oculta y al pausar.

## 7. Accesibilidad

- HTML semántico, un `h1` por página, landmarks y skip link.
- Foco visible; los overlays del juego se gestionan con `hidden` y foco explícito.
- Todos los juegos tienen controles de teclado además de puntero.
- Estados relevantes anunciados con `aria-live`.
- Contraste AA, objetivos táctiles de 44 px.
- `prefers-reduced-motion` desactiva animaciones decorativas y suaviza el juego.

## 8. SEO y despliegue

- URLs canónicas, `sitemap-index.xml`, `robots.txt`, Open Graph y Twitter Cards.
- JSON-LD `WebSite` en portada y `VideoGame` en cada ficha.
- GitHub Pages con dominio propio (`public/CNAME`).
- Workflow de despliegue desde `main`; los PR pasan formato, tipos, tests y build.

## 9. Privacidad

No hay analítica ni cookies. Solo se guardan dos claves locales: sonido y récords o
progreso. No se envía nada a ningún servidor.

## 10. Bienestar

El diseño evita deliberadamente los patrones de captura de atención: rachas, recompensas
variables, notificaciones, comparaciones sociales, monedas y esperas artificiales. Las
partidas son cortas, el final es explícito y la salida está siempre a la vista. No se
prometen beneficios terapéuticos; solo se respeta el tiempo de quien juega.

## 11. Roadmap

- **v2.1:** más niveles de Prisma y ajustes de accesibilidad en el canvas.
- **v2.2:** nuevos juegos con el mismo lenguaje visual y modo de sesión corta.
- **Infraestructura:** presupuesto de rendimiento en CI y snapshots visuales.
