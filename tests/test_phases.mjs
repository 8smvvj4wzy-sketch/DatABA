/* Phases et repères de procédure. `currentPhase` doit ignorer les entrées
   marquées `repere: true` : un changement de procédure trace une verticale
   datée sur la courbe sans faire bouger la phase de fond — sans quoi
   `activePhaseName` (posé dans chaque snapshot de séance, lu par Manager
   dans la colonne « phase » d'Explorer et le rapport imprimé) afficherait le
   libellé d'un protocole à la place de la phase réelle. Même principe que les
   autres suites : les fonctions ne sont pas recopiées, elles sont extraites
   de src/App.jsx et évaluées telles quelles. */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let ok = 0, ko = 0;
const t = (n, a, e) => {
  const p = JSON.stringify(a) === JSON.stringify(e);
  console.log(`${p ? 'OK  ' : 'ECHEC'} ${n}` + (p ? '' : ` → ${JSON.stringify(a)} au lieu de ${JSON.stringify(e)}`));
  p ? ok++ : ko++;
};

const ici = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(ici, '..', 'src', 'App.jsx'), 'utf8');

function extraire(nom) {
  const lignes = source.split('\n');
  const debut = lignes.findIndex((l) => l.startsWith(`function ${nom}(`) || l.startsWith(`const ${nom} =`));
  if (debut < 0) throw new Error(`Déclaration introuvable dans src/App.jsx : ${nom}`);
  for (let i = debut; i < lignes.length; i++) {
    if (i > debut && /^(\}|\];|\);)/.test(lignes[i])) {
      return lignes.slice(debut, i + 1).join('\n');
    }
  }
  throw new Error(`Fin de déclaration introuvable : ${nom}`);
}
function extraireLigne(nom) {
  const re = new RegExp(`^const ${nom} = (.+);$`, 'm');
  const m = source.match(re);
  if (!m) throw new Error(`Constante introuvable (ligne unique) dans src/App.jsx : ${nom}`);
  return m[1];
}

const NOMS = ['phaseHistory', 'currentPhase'];
const code = `const DEFAULT_PHASES = ${extraireLigne('DEFAULT_PHASES')};\n${NOMS.map(extraire).join('\n')}\nreturn { ${NOMS.join(', ')} };`;
// eslint-disable-next-line no-new-func
const { phaseHistory, currentPhase } = new Function(code)();

/* ==================== phaseHistory ==================== */
t('un objectif sans historique replie sur la phase par défaut', phaseHistory({}).map((p) => p.name), ['Ligne de base']);
t('un historique existant est repris tel quel', phaseHistory({ phaseHistory: [{ id: 'p0', name: 'Intervention', date: null }] }).map((p) => p.name), ['Intervention']);

/* ==================== currentPhase ==================== */
t('sans historique : la phase par défaut', currentPhase({}).name, 'Ligne de base');

const sansRepere = { phaseHistory: [
  { id: 'p0', name: 'Ligne de base', date: null },
  { id: 'p1', name: 'Intervention', date: '2026-06-01T09:00:00.000Z' },
] };
t('la dernière phase, sans repère : elle est retenue normalement', currentPhase(sansRepere).name, 'Intervention');

const avecRepereFinal = { phaseHistory: [
  { id: 'p0', name: 'Ligne de base', date: null },
  { id: 'p1', name: 'Intervention', date: '2026-06-01T09:00:00.000Z' },
  { id: 'r1', name: 'Guidance dégressive', date: '2026-06-15T09:00:00.000Z', repere: true },
] };
t('un repère de procédure en fin d’historique ne devient pas la phase en cours', currentPhase(avecRepereFinal).name, 'Intervention');
t('le repère lui-même reste lisible dans l’historique complet', phaseHistory(avecRepereFinal).map((p) => p.name), ['Ligne de base', 'Intervention', 'Guidance dégressive']);

const plusieursReperes = { phaseHistory: [
  { id: 'p0', name: 'Ligne de base', date: null },
  { id: 'p1', name: 'Intervention', date: '2026-06-01T09:00:00.000Z' },
  { id: 'r1', name: 'Guidance dégressive', date: '2026-06-15T09:00:00.000Z', repere: true },
  { id: 'r2', name: 'Renforcement différé', date: '2026-07-01T09:00:00.000Z', repere: true },
] };
t('plusieurs repères à la suite : la phase reste la dernière vraie phase', currentPhase(plusieursReperes).name, 'Intervention');

const repereApresMaintien = { phaseHistory: [
  { id: 'p0', name: 'Ligne de base', date: null },
  { id: 'p1', name: 'Intervention', date: '2026-06-01T09:00:00.000Z' },
  { id: 'p2', name: 'Maintien', date: '2026-07-01T09:00:00.000Z' },
  { id: 'r1', name: 'Délai augmenté', date: '2026-07-10T09:00:00.000Z', repere: true },
] };
t('un repère après un changement de phase ne masque pas la nouvelle phase', currentPhase(repereApresMaintien).name, 'Maintien');

console.log(`\n${ok} au vert, ${ko} en échec`);
process.exit(ko > 0 ? 1 : 0);
