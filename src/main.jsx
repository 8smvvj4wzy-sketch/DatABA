import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* Service worker : permet à l'application de fonctionner sans réseau.
   Enregistré après le chargement pour ne pas ralentir le premier affichage. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL || './';
    navigator.serviceWorker.register(`${base}sw.js`).catch(() => {
      /* Sans HTTPS (ou en http:// simple), l'enregistrement échoue :
         l'application fonctionne quand même, mais sans mode hors ligne. */
    });
  });
}
