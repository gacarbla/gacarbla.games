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

Cubre formato, tipos de Astro/TypeScript, 46 tests de lógica y el build estático de
producción. El despliegue de `main` repite las mismas comprobaciones antes de publicar.

## Navegador (`npm run qa`)

```bash
npm run dev            # en otra terminal
npm run qa
```

Requiere Chrome o Edge instalado (o `CHROME_PATH`). Las capturas y artefactos van a
`.qa/`, que está ignorado por git.

El script comprueba:

| Flujo     | Comprobación                                                          |
| --------- | --------------------------------------------------------------------- |
| Portada   | Sin overflow, sin imágenes rotas, sin errores de consola.             |
| Catálogo  | Filtro por categoría, búsqueda sin resultados, reset y contador.      |
| Órbita    | Inicio, canvas no vacío, cambio de carril, pausa.                     |
| Prisma    | Resolver nivel 1 con un clic, overlay de victoria, avance al nivel 2. |
| Fusión    | Forzar tres orbes iguales, verificar fusión y puntuación.             |
| Pulso     | Completar la ronda 1, avanzar de ronda, forzar fallo y overlay final. |
| Historial | La portada muestra las partidas recientes.                            |
| Móvil     | 390 × 844 en las cuatro fichas y la portada.                          |

## Checklist manual antes de publicar

- [ ] Home y catálogo en 1440, 1024, 768 y 390 px.
- [ ] Un juego completo con clic y otro completo con teclado.
- [ ] Pausa, reanudar, reiniciar, mute y pantalla completa.
- [ ] El récord persiste al recargar.
- [ ] El historial se guarda y se puede limpiar.
- [ ] El foco de teclado es visible en cabecera, tarjetas y overlays.
- [ ] `prefers-reduced-motion` reduce partículas y shake.
- [ ] Enlaces, canónicas y JSON-LD correctos (`view-source`).
- [ ] Sin peticiones a dominios de terceros en la pestaña Network.
- [ ] Lighthouse ≥ 95 en Accesibilidad, Buenas prácticas y SEO.

## Resultados de la v1.0.0

- Lighthouse: **100 / 100 / 100** en portada, fichas y sobre; catálogo corregido a
  **100** en accesibilidad.
- 46 tests de lógica en verde.
- QA completo en 1440 × 960 y 390 × 844 sin overflow horizontal.
- Flujos verificados: victoria de Prisma, fusión de Fusión, ronda y fallo de Pulso.

## Limitaciones conocidas

- El dominio personalizado requiere el CNAME de DNS descrito en
  [DEPLOYMENT.md](DEPLOYMENT.md). Hasta que exista, `gacarbla.github.io` redirige al
  dominio y este no resuelve.
- `npm run qa` no se ejecuta en CI porque necesita un navegador instalado; es una
  comprobación local de release.

## Artefactos

Las capturas se generan en `.qa/`:

```
home-desktop.png       home-mobile.png
catalog-desktop.png    catalog-mobile.png
game-start-*.png       game-playing-*.png
prisma-win-desktop.png fusion-playing-desktop.png
pulso-playing-desktop.png pulso-fail-desktop.png
```

No se versionan: son evidencia de la última pasada, no parte del producto.
