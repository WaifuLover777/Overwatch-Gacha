import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths: the same dist/ works at usuario.github.io/repo/ and at the
  // root, with no repo name hardcoded. (It does not work over file://: CORS.)
  base: './',
});
