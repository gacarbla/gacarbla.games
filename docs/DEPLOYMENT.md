# Despliegue

El portal se publica como sitio estático en GitHub Pages, con el dominio propio
`games.gacarbla.es`.

## Cómo funciona

1. Cada push a `main` lanza `.github/workflows/deploy.yml`.
2. El workflow instala dependencias, comprueba formato, tipos, tests y build.
3. `dist/` se sube como artefacto y `actions/deploy-pages` lo publica.
4. `public/CNAME` viaja dentro del artefacto y fija el dominio personalizado.

No hay servidor ni paso manual: `main` es siempre la versión publicada.

## Configuración de GitHub

- **Settings → Pages → Build and deployment → Source:** `GitHub Actions`.
- **Settings → Pages → Custom domain:** `games.gacarbla.es`.
- **Settings → Pages → Enforce HTTPS:** activado (requiere DNS verificado).

## DNS

En el proveedor del dominio (`gacarbla.es`, actualmente Cloudflare) hay que crear:

| Tipo  | Nombre  | Valor                | Proxy                |
| ----- | ------- | -------------------- | -------------------- |
| CNAME | `games` | `gacarbla.github.io` | DNS only (nube gris) |

El proxy de Cloudflare debe estar desactivado para este registro: GitHub Pages
necesita resolver el CNAME directamente para emitir el certificado TLS.

Si el registro se deja con proxy (nube naranja), Cloudflare termina el TLS y el sitio
funciona, pero GitHub no emite su propio certificado y el flujo estándar de Pages queda
incompleto. Para una configuración limpia, usa **DNS only** y activa «Enforce HTTPS» en
GitHub cuando el certificado esté listo.

Comprobación:

```bash
dig games.gacarbla.es CNAME +short
# gacarbla.github.io.
curl -I https://games.gacarbla.es
```

## Entornos locales

```bash
npm run build
npm run preview   # sirve dist/ como en producción
```

La URL canónica y el sitemap se generan con `site` de `astro.config.mjs`. Si el
dominio cambia, actualiza también `public/CNAME` y `src/data/site.ts`.
