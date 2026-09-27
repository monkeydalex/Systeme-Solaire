import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  // Chemins relatifs : le build fonctionne aussi sous un sous-dossier (GitHub Pages)
  base: './',
  build: {
    outDir: 'dist'
  },
  server: {
    port: 3000,
    open: true
  }
});
