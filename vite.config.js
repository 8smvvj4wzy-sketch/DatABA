import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { classerFichiers, empreinte, injecterPrecache } from './scripts/precache.mjs';

/* Injecte dans dist/sw.js la liste réelle des fichiers produits et la
   version de cache qui en dérive — remplace le bump manuel de
   CACHE_VERSION et la découverte à l'exécution que faisait src/main.jsx
   (voir le piège « Le hors-ligne ne se découvre pas à l'exécution » dans
   CLAUDE.md). N'agit qu'au build (`vite build`) ; `vite dev` sert
   public/sw.js tel quel, avec ses valeurs par défaut. */
function precacheHorsLigne() {
  let outDir = 'dist';
  return {
    name: 'precache-hors-ligne',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const distDir = resolve(process.cwd(), outDir);
      const swPath = join(distDir, 'sw.js');
      const chemins = listerRecursif(distDir).filter((c) => c !== 'sw.js');
      const { obligatoires, facultatifs } = classerFichiers(chemins);
      const version = empreinte(
        chemins.map((chemin) => ({ nom: chemin, contenu: readFileSync(join(distDir, chemin)) }))
      );
      const contenuSW = readFileSync(swPath, 'utf8');
      writeFileSync(swPath, injecterPrecache(contenuSW, { obligatoires, facultatifs, version }));
    },
  };
}

function listerRecursif(dir, base = dir) {
  const resultats = [];
  for (const entree of readdirSync(dir, { withFileTypes: true })) {
    const chemin = join(dir, entree.name);
    if (entree.isDirectory()) {
      resultats.push(...listerRecursif(chemin, base));
    } else {
      resultats.push(relative(base, chemin).split('\\').join('/'));
    }
  }
  return resultats;
}

export default defineConfig({
  // './' permet à l'application de fonctionner dans un sous-dossier
  // (ex. https://mon-site.fr/aba/) et dans un futur emballage Capacitor.
  base: './',
  plugins: [react(), precacheHorsLigne()],
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
