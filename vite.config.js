import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // './' permet à l'application de fonctionner dans un sous-dossier
  // (ex. https://mon-site.fr/aba/) et dans un futur emballage Capacitor.
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Regroupe les grosses bibliothèques pour accélérer le premier chargement
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          excel: ['xlsx'],
        },
      },
    },
  },
});
