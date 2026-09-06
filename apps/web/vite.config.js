import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: el mismo dist/ sirve en usuario.github.io/repo/ y en la raíz,
  // sin tener que hardcodear el nombre del repo. (Sobre file:// no funciona: CORS.)
  base: './',
});
