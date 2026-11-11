# Changelog

Todas las versiones relevantes del portal. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa
versionado semántico.

## [1.0.0] — 2026-11-11

Primer lanzamiento público en [games.gacarbla.es](https://games.gacarbla.es).

### Añadido

- Portal con portada editorial, juego destacado, catálogo con filtros y búsqueda,
  historial local de partidas, manifiesto, página sobre y 404.
- Sistema visual completo: tokens, tipografía autoalojada, portadas SVG generativas,
  microinteracciones y modo de movimiento reducido.
- Motor de juego compartido: bucle rAF con DPR y resize, input de puntero y teclado,
  audio sintetizado, almacenamiento local, partículas y screen shake.
- Shell de juego con inicio, pausa, fin de partida, récord, mute, pantalla completa,
  foco y atajos de teclado.
- **Órbita**: arcade orbital de un botón con tres carriles, vidas, combos y dificultad
  progresiva.
- **Prisma**: puzzle de luz con espejos, divisores, 8 niveles y solver de haces.
- **Fusión**: puzzle de caída con grupos, gravedad, fusiones y cadenas.
- **Pulso**: memoria y ritmo con cuatro pads, secuencias crecientes y audio.
- Catálogo auto-descubierto con metadata validada con Zod.
- Generador de juegos con `npm run new:game`.
- CI con formato, tipos, tests y build; despliegue automático a GitHub Pages.
- QA visual y funcional con Playwright en escritorio y móvil.
- SEO: sitemap, robots, canónicas, Open Graph, Twitter Cards y JSON-LD.
- Documentación de arquitectura, despliegue, QA y cómo añadir juegos.

### Corregido

- Scroll horizontal en el catálogo móvil por el ancho mínimo de los filtros.
- Enlaces de marca con nombres accesibles incompletos.
- Orden de encabezados en la página de catálogo.
- Lockfile de npm con dependencias wasm opcionales.
