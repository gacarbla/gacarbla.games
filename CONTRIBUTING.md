# Contribuir

Gracias por asomarte. Este repositorio mantiene un arcade pequeño y coherente: la
calidad y la uniformidad importan más que el número de juegos.

## Antes de empezar

- Lee [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para entender el producto y el motor.
- Para un juego nuevo, sigue [docs/ADDING_A_GAME.md](docs/ADDING_A_GAME.md).
- Abre un issue antes de invertir horas en una mecánica o un cambio grande.

## Ramas

```
feature/nombre-corto     Nueva funcionalidad o juego
fix/nombre-corto         Corrección
chore/nombre-corto       Infraestructura, dependencias, release
```

Siempre desde `main` actualizado. Nada de commits directos a `main`.

## Commits

Cada commit empieza por la acción en mayúsculas y dos puntos:

```
ADD: Prisma con ocho niveles y solver de haces
EDIT: ajusta el contraste de los pads
FIX: evita el scroll horizontal en móvil
REMOVE: retira una dependencia sin uso
DOCS: documenta el contrato de los juegos
```

Un commit = un cambio con sentido. Si necesitas explicar el «por qué», hazlo en el
cuerpo del commit o en el PR.

## Pull requests

1. Rellena la plantilla.
2. Deja el CI en verde: formato, tipos, tests y build.
3. Adjunta capturas de escritorio y móvil si hay cambios visuales.
4. Prueba los flujos reales, no solo que compile.
5. Un PR de juego incluye metadata, módulo, lógica testeable y tests.

## Calidad

```bash
npm run format:check
npm run check
npm test
npm run build
npm run qa
```

`qa` necesita Chrome o Edge instalado y el servidor de desarrollo en
`http://127.0.0.1:4321`. Genera capturas en `.qa/` (ignorado por git) y comprueba
overflow, errores de consola y flujos de juego.

## Reglas de producto

- Sin anuncios, cookies, analítica ni peticiones a terceros.
- Sin registro ni cuentas. El progreso vive en `localStorage`.
- Todo juego debe funcionar con teclado y con toque.
- Respetar `prefers-reduced-motion`.
- Un mismo lenguaje visual: usa los tokens y el motor compartido.
- Nada de contenido de terceros ni clones de franquicias.

## Código

- TypeScript estricto, sin `any` innecesario.
- Lógica de juego pura fuera del DOM cuando sea posible.
- CSS con tokens; nada de estilos ad hoc si ya existe una primitiva.
- Comentarios solo cuando explican una decisión, no lo que ya dice el código.

## Licencia

Al contribuir aceptas que el código se publique bajo MIT. Los juegos, textos e
identidad visual son obra de gacarbla.
