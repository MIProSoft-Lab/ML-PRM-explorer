// @ts-check
import { defineConfig } from 'astro/config';

// SITE_URL and BASE_PATH are set by the deploy workflow. For a GitHub Pages
// project site they are https://<user>.github.io and /<repo>.
export default defineConfig({
  site: process.env.SITE_URL,
  base: process.env.BASE_PATH ?? '/',
  trailingSlash: 'ignore',
  vite: {
    server: {
      // Reload the dev server when the content files change.
      watch: { ignored: ['!**/content/**'] },
    },
  },
});
