import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  // Chemins relatifs : le build fonctionne aussi sous un sous-dossier (GitHub Pages)
  base: './',
  build: {
    outDir: 'dist',
    // three.js seul pèse ~600 kB (150 kB gzip) : c'est attendu
    chunkSizeWarningLimit: 650,
    // three.js dans son propre fichier : il reste en cache quand seul le code de l'app change
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'three', test: /node_modules[\/]three[\/]/ }]
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
