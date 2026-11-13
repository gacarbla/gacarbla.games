# Miniaturas de juego

Deja aquí las imágenes de portada que quieras usar.

- Formatos recomendados: `.webp`, `.avif`, `.jpg` o `.png`.
- Proporción: **4:3** (por ejemplo 1200 × 900).
- Referencia desde `src/games/<slug>/meta.json`:

```json
"thumbnail": "/images/games/<slug>.webp"
```

Si un juego no declara `thumbnail`, su portada muestra únicamente el nombre del juego
sobre el color de acento. No hay numeración ni ilustraciones generadas de reserva.

Las imágenes se sirven desde GitHub Pages y no se transforman en build.
