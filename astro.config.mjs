import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// El sitio se publica en GitHub Pages con dominio propio.
// El CNAME vive en public/CNAME para que viaje dentro del artefacto de build.
export default defineConfig({
  site: 'https://games.gacarbla.es',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
