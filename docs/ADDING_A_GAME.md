# Añadir un juego

El catálogo se descubre solo. Un juego es una carpeta con dos archivos y, opcionalmente,
su lógica y sus tests. No hay que tocar rutas, menús ni listados.

## 1. Genera el esqueleto

```bash
npm run new:game -- mi-juego
```

Crea:

```
src/games/mi-juego/
├── meta.json   # contrato público (validado con Zod en build)
└── game.ts     # módulo que monta el juego
```

El esqueleto ya es jugable: pulsa para acertar en el objetivo. Úsalo como punto de partida.

## 2. Rellena `meta.json`

| Campo         | Tipo                                                                     | Notas                                           |
| ------------- | ------------------------------------------------------------------------ | ----------------------------------------------- |
| `slug`        | string                                                                   | Kebab-case y **debe coincidir con la carpeta**. |
| `title`       | string                                                                   | Máximo 40 caracteres.                           |
| `tagline`     | string                                                                   | Una frase; se usa en tarjetas y ficha.          |
| `description` | string                                                                   | 40–320 caracteres; alimenta el SEO.             |
| `category`    | `accion` \| `puzzle` \| `reflejos`                                       | Controla filtros y etiqueta.                    |
| `tags`        | string[1–4]                                                              | Etiquetas cortas para la tarjeta.               |
| `accent`      | `#rrggbb`                                                                | Color del juego en portada, foco y HUD.         |
| `cover`       | `orbit` \| `prism` \| `fusion` \| `pulse` \| `grid` \| `wave` \| `stack` | Motivo SVG de la portada.                       |
| `controls`    | string                                                                   | Texto de controles. Incluye teclado.            |
| `goal`        | string                                                                   | Objetivo en una o dos frases.                   |
| `duration`    | string                                                                   | Por ejemplo `2–5 min`.                          |
| `order`       | number                                                                   | Posición en el catálogo.                        |
| `featured`    | boolean                                                                  | Solo uno debería estar destacado.               |
| `released`    | `YYYY-MM-DD`                                                             | Fecha de publicación.                           |
| `scoreLabel`  | string                                                                   | Etiqueta del marcador (`PUNTOS`, `NIVEL`...).   |
| `bestSuffix`  | string                                                                   | Sufijo de la mejor marca (`pts`, `nivel`...).   |

Si algo no cuadra, el build falla con el archivo y el campo exactos. Es intencionado: un
catálogo grande sin validación se rompe en silencio.

## 3. Implementa el juego

`game.ts` exporta un `GameModule`:

```ts
import { BaseGame, type GameContext, type GameModule } from '../engine';

class MiJuego extends BaseGame {
  protected reset(): void {
    // Estado inicial. Se llama al empezar y al reiniciar.
    this.setScore('PUNTOS', 0);
  }

  protected update(dt: number): void {
    // Lógica. dt está limitado a 50 ms para evitar saltos.
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    // Dibuja el frame completo. Usa view.width / view.height.
  }
}

export default {
  mount: (context: GameContext) => new MiJuego(context),
} satisfies GameModule;
```

`BaseGame` te da gratis:

- Bucle `requestAnimationFrame` con pausa, reanudación y `destroy`.
- `this.input`: puntero y teclado normalizados. `onPointerDown`, `onPointerMove`,
  `onKeyDown`, `onAction`.
- `this.audio`: sintetizador Web Audio (`tone`, `chord`, `noise`). Sin archivos.
- `this.hud`: `setScore`, `setStatus`, `toast` y `finish`.
- `this.reducedMotion`: respeta `prefers-reduced-motion`.
- Vista previa estática detrás de la pantalla de inicio (se dibuja tras `reset`).

Al terminar:

```ts
this.finish({
  title: 'Fin de la partida',
  message: 'Una frase breve.',
  detail: '12 núcleos · 38 s',
  score: this.score,
  scoreLabel: 'PUNTOS',
  ctaLabel: 'Jugar otra vez',
  tone: 'lose',
});
```

El shell guarda la mejor marca, muestra el récord y gestiona reinicio, pausa, audio y
pantalla completa. No lo reimplementes.

### Reglas de diseño

1. **Mismo idioma visual.** Usa `PALETTE`, `FONT_SANS`, `FONT_MONO` y `alpha` del motor.
2. **Un acento por juego.** El color declarado en `meta.json` debe ser el protagonista.
3. **Controles completos.** Teclado además de puntero. Espacio o flechas para la acción
   principal; `P` y `Esc` ya pausan.
4. **60 fps.** Evita `shadowBlur` masivo, gradientes por partícula y arrays sin límite.
   El motor limita el DPR a 2.
5. **Legibilidad.** Texto de canvas con las fuentes del sistema compartido o `FONT_MONO`.
6. **Reduced motion.** Menos partículas, sin shake y sin animaciones agresivas.
7. **Sin dependencias externas.** Nada de CDNs, imágenes remotas ni fuentes de terceros.

## 4. Lógica testeable

Saca la simulación pura a `logic.ts` y pruébala con Vitest. Evita importar DOM en los tests.

```ts
// src/games/mi-juego/logic.ts
export function scoreFor(combo: number): number {
  return 10 * Math.min(combo, 9);
}
```

```ts
// tests/mi-juego.test.ts
import { expect, it } from 'vitest';
import { scoreFor } from '../src/games/mi-juego/logic';

it('limita el multiplicador', () => {
  expect(scoreFor(20)).toBe(90);
});
```

## 5. Checklist antes del PR

```bash
npm run format
npm run check
npm test
npm run build
npm run qa   # capturas y comprobaciones en Chrome
```

- [ ] El juego es divertido después de 30 segundos y después de 3 minutos.
- [ ] Se puede jugar solo con teclado y solo con toque.
- [ ] La pausa, el reinicio y el game over funcionan.
- [ ] El récord persiste al recargar.
- [ ] No hay scroll horizontal en 390 px.
- [ ] La vista previa del inicio no está en blanco.
- [ ] `meta.json` describe el juego sin exagerar.
- [ ] Sin peticiones de red nuevas.

## 6. Revisión

Un PR de juego debe incluir: `meta.json`, `game.ts`, `logic.ts` si hay simulación, tests,
y capturas de escritorio y móvil. El CI ejecuta formato, tipos, tests y build; el despliegue
es automático al fusionar en `main`.

Con eso, el juego aparece en portada, catálogo, filtros, búsqueda, ficha, relacionados y
sitemap. Sin tocar nada más.
