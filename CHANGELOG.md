# Changelog

Todas las versiones relevantes del portal. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa
versionado semántico.

## [2.0.1] — 2026-11-12

### Corregido

- El contenido de las secciones con animación de entrada sigue visible cuando JavaScript
  no está disponible o falla.

## [2.0.0] — 2026-11-12

Rediseño completo de identidad, tono y experiencia: de arcade nocturno a un rincón cálido,
familiar y sin prisa.

### Cambiado

- Nueva paleta de papel, bosque, salvia, albaricoque, cielo, lavanda y mantequilla.
- Nuevo logotipo de flor y favicon; iconos PWA y Open Graph actualizados.
- Tipografía editorial: Fraunces + Nunito Sans + DM Mono.
- Portadas SVG rediseñadas con estética de papel recortado y animaciones lentas.
- Home, catálogo, fichas, sobre y 404 reescritos con un tono tranquilo y familiar.
- Shell de juego y canvas de los cuatro juegos adaptados al tema claro.
- Copy de los juegos sin lenguaje de presión: «intentos», «fin de la ronda», «sin prisa».
- Movimiento más lento, partículas reducidas y shake máximo de 5 px.
- Nueva sección «Jugar sin prisa» y FAQ sobre bienestar y uso familiar.

### Añadido

- `docs/DESIGN.md` con la auditoría, las lentes de diseño y las reglas de bienestar.
- Manifiesto de producto: sin rachas, monedas, notificaciones, compras ni comparaciones.
- Verificación de contraste AA en todas las páginas.

### Corregido

- Enlaces de marca y contraste de etiquetas del catálogo.
- Espaciado del correo de contacto y enlaces dentro de bloques de texto.

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
