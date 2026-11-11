# Arquitectura y producto

## 1. La idea

Un arcade independiente para una pausa de tres minutos. La referencia de categoría es el
portal de minijuegos clásico, pero el producto se aleja de su modelo: nada de anuncios,
nada de cuentas, nada de ventanas emergentes. Una portada cuidada, juegos originales y una
experiencia homogénea de principio a fin.

**Principios**

1. **Uniformidad.** Todos los juegos comparten paleta, tipografía, HUD, sonido sintetizado y
   reglas de interacción. Un juego nuevo no parece un injerto.
2. **Velocidad.** HTML estático, fuentes locales, cero dependencias de UI y juego en canvas.
   El primer juego debe estar a un clic y cargar en menos de un segundo.
3. **Respeto.** Sin tracking, sin cookies, sin muros. Las puntuaciones viven en `localStorage`.
4. **Escalabilidad.** El catálogo es un registro autodescubierto. Añadir un juego no toca
   rutas, menús ni listados.
5. **Detalle.** Microinteracciones, sonido, foco visible, teclado y reduced motion. Lo pequeño
   es lo que hace que se sienta terminado.

## 2. Arquitectura de información

```
/                     Portada: propuesta de valor, juego destacado, catálogo, manifiesto
/juegos/              Catálogo completo con búsqueda y filtros
/jugar/<slug>/        Ficha inmersiva + juego + cómo jugar + juegos relacionados
/sobre/               Proyecto, principios, tecnología y privacidad
/404                  Página de error con salida al catálogo
```

La portada y el catálogo comparten el mismo componente de rejilla, así que la experiencia
no se rompe al crecer. La ficha de juego incluye contexto útil (controles, categoría, mejor
marca) sin competir con el área de juego.

## 3. Lenguaje visual

- **Tema:** arcade moderno oscuro. Fondo casi negro (`#07080a`), superficies elevadas y
  hairlines al 9 % de blanco.
- **Acentos:** lima (`#c8ff4d`) como color de acción, coral para peligro, cian y violeta para
  categorías. Cada juego declara su acento en su metadata.
- **Tipografía:** Space Grotesk Variable para display y texto; JetBrains Mono para datos,
  etiquetas y HUD. Ambas autoalojadas.
- **Forma:** radios generosos, botones píldora, rejilla estricta, mucho aire y una textura de
  grano casi invisible que evita el aspecto de plantilla.
- **Movimiento:** entradas de 600 ms con `cubic-bezier(.22,1,.36,1)`, hover de 2 px, glows
  contenidos. Todo respeta `prefers-reduced-motion`.

Las portadas no son imágenes: son SVG generados por motivo (`orbit`, `prism`, `fusion`,
`pulse`...). Comparten rejilla, numeración, etiqueta y composición, por lo que el catálogo
siempre se ve como una colección.

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
- `getGame(slug)`: metadata + loader dinámico del módulo de juego.
- `GameMeta`: tipo inferido del esquema.

La ruta `/jugar/[slug]/` es única para todo el catálogo. El módulo del juego se carga como
chunk independiente solo cuando se entra a jugar, de modo que la portada no paga el coste de
los juegos. Un catálogo de 4 o de 400 juegos usa exactamente la misma infraestructura.

## 5. Motor de juego

`src/games/engine/` concentra lo que todos comparten:

| Módulo       | Responsabilidad                                                |
| ------------ | -------------------------------------------------------------- |
| `runtime.ts` | Bucle rAF con delta limitado, pausa, resize y DPR.             |
| `input.ts`   | Puntero + teclado normalizados (acción, ejes, posición).       |
| `audio.ts`   | Sintetizador Web Audio: tonos, acordes, ruido. Sin archivos.   |
| `hud.ts`     | Puente tipado con el chrome del juego (marcador, estado, fin). |
| `storage.ts` | Récords y progreso con namespace y manejo de errores.          |
| `math.ts`    | Utilidades deterministas y aleatoriedad con semilla.           |
| `types.ts`   | Contrato `GameModule`, `GameContext`, `GameInstance`.          |

Cada juego implementa `update(dt)` y `draw(ctx)`, y declara su HUD. El shell (Astro) se
encarga de start, pausa, game over, audio, pantalla completa, récord y navegación. Así un
juego nuevo hereda gratis la experiencia completa.

### Los cuatro juegos del lanzamiento

| Juego      | Categoría | Mecánica                                                            | Lo que demuestra                                   |
| ---------- | --------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| **Órbita** | Acción    | Cambia de carril orbital para recoger núcleos y esquivar escombros. | Acción endless, dificultad progresiva, partículas. |
| **Prisma** | Puzzle    | Rota espejos y divisores para encender todos los cristales.         | Niveles, estado persistente, simulación de haces.  |
| **Fusión** | Puzzle    | Suelta piezas y conecta tres iguales para fusionarlas en cadena.    | Física simple, cascadas, puntuación combinatoria.  |
| **Pulso**  | Reflejos  | Repite secuencias de pads que crecen y aceleran.                    | Audio sintetizado, memoria, ritmo.                 |

## 6. Rendimiento

- Astro genera HTML estático; el JS del portal es mínimo y el de cada juego se carga aparte.
- Fuentes variables autoalojadas con `font-display: swap` y subsets por `unicode-range`.
- Sin frameworks de UI, sin librerías de animación, sin imágenes de mapa de bits en el
  catálogo. Las portadas son SVG/CSS.
- Canvas con `devicePixelRatio` limitado a 2 y `ResizeObserver`.
- El bucle se detiene con la pestaña oculta y al pausar.

## 7. Accesibilidad

- HTML semántico, un solo `h1` por página, landmarks y skip link.
- Foco visible siempre; los overlays del juego atrapan y devuelven el foco.
- Todos los juegos tienen controles de teclado además de puntero.
- Estados de juego anunciados con `aria-live` y botones con etiquetas explícitas.
- Contraste AA sobre el fondo oscuro y objetivos táctiles de 44 px.
- `prefers-reduced-motion` desactiva animaciones decorativas y suaviza el juego.

## 8. SEO y despliegue

- URLs canónicas, `sitemap-index.xml`, `robots.txt`, Open Graph y Twitter Cards.
- JSON-LD `WebSite` en portada y `VideoGame` en cada ficha.
- GitHub Pages con dominio propio (`public/CNAME`) y HTTPS.
- Workflow de despliegue desde `main`; los PR pasan formato, tipos, tests y build.

## 9. Privacidad

No hay analítica ni cookies. Solo se guardan dos claves locales: mute y récords/progreso.
No se envía nada a ningún servidor.

## 10. Roadmap

- **v1.1:** más niveles de Prisma, modo contrarreloj en Órbita y tabla local por juego.
- **v1.2:** puzzles semanales y retos con semilla compartible.
- **v2:** variantes multijugador local y editor de niveles comunitario.
- **Infraestructura:** plantilla de juego aún más declarativa, snapshots visuales y
  presupuesto de rendimiento en CI.
