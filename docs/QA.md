# QA

La calidad se comprueba en tres capas: tests de lógica pura, CI de build y una pasada
real en navegador antes de cada release.

## Automático (CI)

Cada pull request ejecuta:

```bash
npm run format:check
npm run check
npm test
npm run build
```

Cubre formato, tipos de Astro/TypeScript, **51 tests** de lógica y el build estático de
producción. El despliegue de `main` repite las mismas comprobaciones antes de publicar.

## Navegador (`npm run qa`)

```bash
npm run dev            # en otra terminal
npm run qa
```

Requiere Chrome o Edge instalado (o `CHROME_PATH`). Las capturas y artefactos van a
`.qa/`, que está ignorado por git.

El script comprueba:

| Flujo         | Comprobación                                                 |
| ------------- | ------------------------------------------------------------ |
| Portada       | Sin overflow, sin imágenes rotas, sin errores de consola.    |
| Catálogo      | 15 tarjetas, filtros por categoría, búsqueda y reset.        |
| Los 15 juegos | Carga, inicio, canvas dibujado, pausa y ausencia de errores. |
| Dificultad    | Buscaminas, Sudoku y Sopa cambian de tamaño sin errores.     |
| Historial     | La portada muestra las partidas recientes.                   |
| Móvil         | 390 × 844 en la portada, el catálogo y cada ficha.           |

Cada juego tiene además tests de su lógica pura: minas, pistas, sudoku, feedback de
código, Nim, solver de 24, luces, tuberías, deslizante, memoria, laberinto, sopa,
sokoban y conecta cuatro.

## Checklist manual antes de publicar

- [ ] Home y catálogo en 1440, 1024, 768 y 390 px.
- [ ] Recorrer los 15 juegos, con ratón y con teclado.
- [ ] Verificar que cada puzzle se puede completar y que no se resuelve por accidente.
- [ ] Pausa, reanudar, reiniciar, mute y pantalla completa.
- [ ] El récord persiste al recargar.
- [ ] El historial se guarda y se puede limpiar.
- [ ] El foco de teclado es visible en cabecera, tarjetas y overlays.
- [ ] `prefers-reduced-motion` reduce partículas y shake.
- [ ] Enlaces, canónicas y JSON-LD correctos (`view-source`).
- [ ] Sin peticiones a dominios de terceros en la pestaña Network.
- [ ] Lighthouse ≥ 95 en Accesibilidad, Buenas prácticas y SEO.

## Resultados de la v2.3.0

- **Sokoban** ampliado a **10 niveles**, con cinco nuevos almacenes más difíciles.
- **Buscaminas**, **Sudoku** y **Sopa de letras** estrenan selector de dificultad.
- **51 tests** de lógica en verde.
- QA en navegador: los 15 juegos inician, dibujan canvas, pausan y no lanzan errores.
- Dificultades verificadas en escritorio y móvil: 12×12 con 28 minas, sudoku 9×9,
  sopa 15×15 con ocho palabras y diagonales.
- Catálogo de 15 tarjetas con filtros (Lógica 7, Visual 5, Palabras 1, Estrategia 2).
- 1440 × 960 y 390 × 844 sin overflow horizontal.

## Limitaciones conocidas

- El dominio se sirve a través del proxy de Cloudflare. Funciona, pero GitHub Pages no
  gestiona el certificado hasta que el registro pase a DNS only (nube gris). Está
  documentado en [DEPLOYMENT.md](DEPLOYMENT.md).
- `npm run qa` no se ejecuta en CI porque necesita un navegador instalado; es una
  comprobación local de release.
- La IA de Conecta cuatro usa profundidad 4; es un rival real, no invencible.
- Sokoban tiene diez niveles finitos; se pueden repetir desde el inicio.

## Artefactos

Las capturas se generan en `.qa/`:

```
home-desktop.png          home-mobile.png
catalog-desktop.png       catalog-mobile.png
<slug>-start.png          <slug>-playing.png
```

No se versionan: son evidencia de la última pasada, no parte del producto.
