/* Emploi du temps hebdomadaire des ateliers.

   Les fonctions ne sont pas recopiées ici : elles sont extraites de
   src/App.jsx et évaluées telles quelles, sur le même principe que
   test_stabilite.mjs et test_seance_souple.mjs. */

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

/* Découpe une déclaration de premier niveau : de « function X( » ou
   « const X = » jusqu'à sa fermeture en colonne zéro. */
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

const NOMS = ['memeJour', 'JOURS', 'migrerEmploiDuTemps', 'ateliersDuJour', 'planifierJour'];

const code = `
  ${NOMS.map(extraire).join('\n')}
  return { ${NOMS.join(', ')} };
`;
// eslint-disable-next-line no-new-func
const F = new Function(code)();
const { migrerEmploiDuTemps, ateliersDuJour, planifierJour } = F;

/* ==================== Fixtures ==================== */

const ateliers = [
  { id: 'at1', name: 'Habiletés sociales' },
  { id: 'at2', name: 'Motricité fine' },
  { id: 'at3', name: 'Langage' },
];

// 2026-08-03 est un lundi.
const LUNDI = new Date(2026, 7, 3, 9, 0).getTime();
const JOUR_MS = 86_400_000;

/* ==================== migrerEmploiDuTemps ==================== */

t('valeur absente devient un objet vide', migrerEmploiDuTemps(undefined), {});
t('un tableau brut est écarté', migrerEmploiDuTemps(['at1', 'at2']), {});
t('une chaîne est écartée', migrerEmploiDuTemps('at1'), {});
t(
  'entrées bien formées conservées, jours inconnus ignorés',
  migrerEmploiDuTemps({ 1: ['at1', 'at2'], 9: ['at3'], 4: ['at3'] }),
  { 1: ['at1', 'at2'], 4: ['at3'] }
);
t(
  'un jour dont la valeur n\'est pas un tableau est écarté',
  migrerEmploiDuTemps({ 1: ['at1'], 2: 'at2' }),
  { 1: ['at1'] }
);
t(
  'un id non-chaîne dans la liste d\'un jour est filtré',
  migrerEmploiDuTemps({ 1: ['at1', 42, null, 'at2'] }),
  { 1: ['at1', 'at2'] }
);

/* ==================== ateliersDuJour ==================== */

t(
  'ordre de l\'emploi du temps conservé',
  ateliersDuJour({ 1: ['at3', 'at1'] }, ateliers, 1).map((a) => a.id),
  ['at3', 'at1']
);
t('atelier supprimé écarté silencieusement', ateliersDuJour({ 1: ['at1', 'at9'] }, ateliers, 1).map((a) => a.id), ['at1']);
t('jour absent de l\'emploi du temps renvoie une liste vide', ateliersDuJour({ 1: ['at1'] }, ateliers, 2), []);

/* ==================== planifierJour ==================== */

t('aucun emploi du temps pour ce jour → rien à jouer', planifierJour({}, ateliers, [], LUNDI), { jour: 1, total: 0, restants: [] });

t(
  'emploi du temps du jour, aucune séance encore jouée : tout reste',
  planifierJour({ 1: ['at1', 'at2'] }, ateliers, [], LUNDI).restants.map((a) => a.id),
  ['at1', 'at2']
);

t(
  'un atelier déjà joué aujourd\'hui est écarté',
  planifierJour(
    { 1: ['at1', 'at2'] },
    ateliers,
    [{ atelierId: 'at1', date: new Date(LUNDI + 3_600_000).toISOString() }],
    LUNDI
  ).restants.map((a) => a.id),
  ['at2']
);

t(
  'une séance jouée hier n\'a aucun effet aujourd\'hui',
  planifierJour(
    { 1: ['at1'] },
    ateliers,
    [{ atelierId: 'at1', date: new Date(LUNDI - JOUR_MS).toISOString() }],
    LUNDI
  ).restants.map((a) => a.id),
  ['at1']
);

t(
  'le même atelier peut figurer sur deux jours sans se gêner',
  planifierJour(
    { 1: ['at1'], 2: ['at1'] },
    ateliers,
    [{ atelierId: 'at1', date: new Date(LUNDI).toISOString() }],
    LUNDI + JOUR_MS
  ).restants.map((a) => a.id),
  ['at1']
);

t(
  'journée terminée : tous les ateliers du jour ont une séance, restants vide',
  planifierJour(
    { 1: ['at1', 'at2'] },
    ateliers,
    [
      { atelierId: 'at1', date: new Date(LUNDI).toISOString() },
      { atelierId: 'at2', date: new Date(LUNDI + 3_600_000).toISOString() },
    ],
    LUNDI
  ),
  { jour: 1, total: 2, restants: [] }
);

t(
  'une séance en mode balance (atelierId nul) n\'écarte rien',
  planifierJour({ 1: ['at1'] }, ateliers, [{ atelierId: null, date: new Date(LUNDI).toISOString() }], LUNDI).restants.map((a) => a.id),
  ['at1']
);

console.log(`\n${ok} OK, ${ko} en échec`);
process.exit(ko > 0 ? 1 : 0);
