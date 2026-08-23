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

const NOMS = ['phaseHistory', 'currentPhase', 'reperesDePhase', 'placerEtiquettesReperes', 'appliquerPhaseChoisie'];
const CONSTANTES = ['LARGEUR_TRACE_REF', 'PX_PAR_CARACTERE', 'PART_MAX_REPERE', 'MIN_CAR_REPERE', 'MAX_CAR_REPERE'];
function uid() { return Math.random().toString(36).slice(2, 9); }
const code = `const DEFAULT_PHASES = ${extraireLigne('DEFAULT_PHASES')};\n`
  + CONSTANTES.map((c) => `const ${c} = ${extraireLigne(c)};`).join('\n') + '\n'
  + `const uid = ${uid};\n`
  + `${NOMS.map(extraire).join('\n')}\nreturn { ${NOMS.join(', ')} };`;
// eslint-disable-next-line no-new-func
const { phaseHistory, currentPhase, reperesDePhase, placerEtiquettesReperes, appliquerPhaseChoisie } = new Function(code)();

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

/* ==================== reperesDePhase ==================== */
const pts = [
  { date: '2026-06-01T09:00:00.000Z', label: '01/06' },
  { date: '2026-06-08T09:00:00.000Z', label: '08/06' },
  { date: '2026-06-15T09:00:00.000Z', label: '15/06' },
];
t('une entrée non datée ne produit aucun repère', reperesDePhase(pts, [{ id: 'p0', name: 'Ligne de base', date: null }]), []);
t('un changement postérieur au dernier point est ignoré', reperesDePhase(pts, [{ id: 'p1', name: 'Maintien', date: '2026-07-01T09:00:00.000Z' }]), []);
t('le repère se pose sur le premier point postérieur au changement',
  reperesDePhase(pts, [{ id: 'p1', name: 'Intervention', date: '2026-06-05T09:00:00.000Z' }]),
  [{ id: 'p1', name: 'Intervention', repere: false, index: 1 }]);
t('le champ repere est transporté',
  reperesDePhase(pts, [{ id: 'r1', name: 'Guidance dégressive', date: '2026-06-05T09:00:00.000Z', repere: true }]),
  [{ id: 'r1', name: 'Guidance dégressive', repere: true, index: 1 }]);

/* ==================== placerEtiquettesReperes ==================== */
const r0 = { id: 'a', name: 'Intervention', repere: false, index: 0 };
t('un repère au premier point est ancré à gauche', placerEtiquettesReperes([r0], 5)[0].ancre, 'start');
const rFin = { id: 'b', name: 'Intervention', repere: false, index: 4 };
t('un repère au dernier point est ancré à droite', placerEtiquettesReperes([rFin], 5)[0].ancre, 'end');
const rMilieu = { id: 'c', name: 'Interv.', repere: false, index: 2 };
t('un repère au centre, avec un nom court, est centré', placerEtiquettesReperes([rMilieu], 5)[0].ancre, 'middle');
t('un nom long est tronqué à 18 caractères', placerEtiquettesReperes([{ id: 'd', name: 'Renforcement différé progressif', repere: false, index: 2 }], 5)[0].texte.length, 18);

const proches = [
  { id: 'e1', name: 'Intervention', repere: false, index: 2 },
  { id: 'e2', name: 'Maintien', repere: false, index: 3 },
];
const placees = placerEtiquettesReperes(proches, 10);
t('deux repères proches se répartissent sur deux lignes', placees.map((p) => p.ligne), [0, 1]);

const troisProches = [
  { id: 'f1', name: 'Ligne de base', repere: false, index: 1 },
  { id: 'f2', name: 'Intervention', repere: false, index: 2 },
  { id: 'f3', name: 'Maintien', repere: false, index: 3 },
];
t('un troisième chevauchement consécutif revient en ligne 0', placerEtiquettesReperes(troisProches, 10).map((p) => p.ligne), [0, 1, 0]);

/* La troncature n'est plus une constante mais une part de la largeur de tracé
   déclarée par l'appelant. Les cas ci-dessus, sans troisième argument, ont déjà
   vérifié que le DÉFAUT n'a pas bougé d'un caractère — c'est ce qui autorise le
   reste. Ceux-ci vérifient l'autre bout : là où la place existe (Manager
   affiche la même fonction en plein écran), un nom de phase entier ne doit plus
   être coupé. */
t('sur un tracé large, un nom de 31 caractères passe entier',
  placerEtiquettesReperes([{ id: 'g', name: 'Renforcement différé progressif', repere: false, index: 2 }], 5, 1180)[0].texte,
  'Renforcement différé progressif');
t('la troncature reste bornée même sur un tracé large',
  placerEtiquettesReperes([{ id: 'h', name: 'x'.repeat(80), repere: false, index: 2 }], 5, 1180)[0].texte.length, 46);
t('un tracé plus étroit que la référence ne tronque pas davantage',
  placerEtiquettesReperes([{ id: 'i', name: 'Renforcement différé progressif', repere: false, index: 2 }], 5, 200)[0].texte.length, 18);

/* ==================== appliquerPhaseChoisie ==================== */
const originePasDatee = [{ id: 'p0', name: 'Ligne de base', date: null }];
t('phase déjà en cours : historique inchangé (pas de repère semé)',
  appliquerPhaseChoisie(originePasDatee, 'Ligne de base', '2026-08-13T09:00:00.000Z'), originePasDatee);
t('objectif encore à sa phase d’origine : la première entrée est renommée, non datée',
  appliquerPhaseChoisie(originePasDatee, 'Intervention', '2026-08-13T09:00:00.000Z'),
  [{ id: 'p0', name: 'Intervention', date: null }]);

const dejaDatee = [
  { id: 'p0', name: 'Ligne de base', date: null },
  { id: 'p1', name: 'Intervention', date: '2026-06-01T09:00:00.000Z' },
];
const apresChangement = appliquerPhaseChoisie(dejaDatee, 'Maintien', '2026-08-13T09:00:00.000Z');
t('un historique déjà daté : une nouvelle entrée datée est ajoutée', apresChangement.length, 3);
t('la nouvelle entrée porte la phase choisie et la date fournie', [apresChangement[2].name, apresChangement[2].date], ['Maintien', '2026-08-13T09:00:00.000Z']);
t('les entrées précédentes ne sont pas touchées', apresChangement.slice(0, 2), dejaDatee);

const avecRepereEnFin = [
  { id: 'p0', name: 'Ligne de base', date: null },
  { id: 'p1', name: 'Intervention', date: '2026-06-01T09:00:00.000Z' },
  { id: 'r1', name: 'Guidance dégressive', date: '2026-06-15T09:00:00.000Z', repere: true },
];
t('un repère de procédure en fin d’historique n’est jamais réécrit',
  appliquerPhaseChoisie(avecRepereEnFin, 'Intervention', '2026-08-13T09:00:00.000Z'), avecRepereEnFin);
const apresRepere = appliquerPhaseChoisie(avecRepereEnFin, 'Maintien', '2026-08-13T09:00:00.000Z');
t('choisir une nouvelle phase après un repère de procédure ajoute une entrée, sans toucher au repère',
  apresRepere.slice(0, 3), avecRepereEnFin);
t('la nouvelle entrée porte la phase choisie, sans repère',
  [apresRepere[3].name, apresRepere[3].date, !!apresRepere[3].repere], ['Maintien', '2026-08-13T09:00:00.000Z', false]);

console.log(`\n${ok} au vert, ${ko} en échec`);
process.exit(ko > 0 ? 1 : 0);
