/* Le suivi par étape d'un chaînage et d'un programme Équilibre.

   L'écran Suivi ne montrait qu'une courbe agrégée : « 14 % » sans dire quelle
   étape est tenue et laquelle bloque. `objectiveSteps` descend au niveau de
   l'étape. Cette suite verrouille les quatre règles qui peuvent dériver en
   silence, et qui sont exactement celles de `objectifsAEtapes` côté Manager —
   les deux applications doivent rendre le même verdict sur les mêmes
   cotations, sans quoi la tablette contredit le bilan qu'elle a produit :

   - une étape non cotée ne produit aucun point ;
   - une issue exclue sort du dénominateur mais reste dans la répartition ;
   - une séance vaut UN point par étape, même à plusieurs essais ;
   - une étape retirée de la configuration garde ses cotations passées.

   Plus, propre à la tablette : `seancesRetenues` doit appliquer la reprise de
   suivi et le filtre de cible à l'identique pour la courbe et pour le détail.

   Fonctions extraites de src/App.jsx, jamais recopiées. */

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

const NOMS = ['DEFAULT_GUIDANCE', 'BALANCE_OUTCOMES',
  'objectiveGuidances', 'guidanceByCode', 'isIndependentCode', 'balanceOutcomes',
  'outcomeMeta', 'balanceTrials', 'masteryDe', 'toDayPoints', 'masteryStatus',
  'seancesRetenues', 'objectiveSteps', 'objectiveScore', 'objectivePoints',
  'intervalTotals', 'trialCode', 'entryMatches'];
const CONSTANTES = ['PERCENT_TYPES', 'MASTERY_TYPES', 'DEFAULT_MASTERY',
  'DEFAULT_MASTERY_PROBE', 'STEP_TYPES'];
/* Les jeux par défaut portent une couleur de la palette catégorielle : elle ne
   sert à rien ici, mais son identifiant doit exister pour que la déclaration
   s'évalue. Des jetons, pas des valeurs — aucun test ne les regarde. */
const COULEURS = ['CAT_TEAL', 'CAT_AMBER', 'CAT_CORAL', 'CAT_SLATE'];
const code = COULEURS.map((c) => `const ${c} = '${c}';`).join('\n') + '\n'
  + CONSTANTES.map((c) => `const ${c} = ${extraireLigne(c)};`).join('\n') + '\n'
  + `${NOMS.map(extraire).join('\n')}\nreturn { ${NOMS.join(', ')} };`;
// eslint-disable-next-line no-new-func
const M = new Function(code)();
const { objectiveSteps, seancesRetenues, objectivePoints, masteryStatus } = M;

const GUIDANCES = [
  { code: 'I', label: 'Indépendant', independent: true },
  { code: 'GP', label: 'Guidance partielle', independent: false },
];

/* ==================== Chaînage ==================== */
const CHAINE = {
  id: 'o1', name: 'Se laver les mains', type: 'chaining',
  config: {
    steps: [{ id: 'e1', name: 'Ouvrir le robinet' }, { id: 'e2', name: 'Savonner' }, { id: 'e3', name: 'Rincer' }],
    mastery: { threshold: 80, sessions: 2, unit: 'sessions', sens: 'min' },
  },
};
const sChaine = (id, date, steps) => ({ id, date, data: { p1: { o1: { steps } } } });

const c1 = objectiveSteps(CHAINE, 'p1', [
  sChaine('s1', '2026-06-01T09:00:00', { e1: 'I', e2: 'GP', e3: 'GP' }),
  sChaine('s2', '2026-06-02T09:00:00', { e1: 'I', e2: 'GP', e3: 'I' }),
], GUIDANCES, null);

t('les étapes gardent l’ordre de la chaîne', c1.steps.map((s) => s.nom),
  ['Ouvrir le robinet', 'Savonner', 'Rincer']);
/* Le cœur de la demande : le pourcentage global cachait qu'une étape est
   tenue et qu'une autre ne l'est jamais. */
t('chaque étape porte son propre pourcentage', c1.steps.map((s) => s.pct), [100, 0, 50]);
t('une étape indépendante deux fois de suite est acquise', c1.steps[0].mastery.mastered, true);
t('une étape jamais indépendante ne l’est pas', c1.steps[1].mastery.mastered, false);
t('la suite au seuil est comptée par étape', c1.steps.map((s) => s.mastery.streak), [2, 0, 1]);
t('la répartition des codes est comptée par étape', c1.steps[1].repartition, { GP: 2 });
t('deux séances dans la grille', c1.seances.length, 2);
t('la grille porte le code de chaque étape', c1.seances[1].parEtape, { e1: 'I', e2: 'GP', e3: 'I' });

/* Une étape non cotée n'est pas un échec : elle n'a pas été présentée. */
const c2 = objectiveSteps(CHAINE, 'p1', [
  sChaine('s1', '2026-06-01T09:00:00', { e1: 'I', e2: 'I', e3: 'I' }),
  sChaine('s2', '2026-06-02T09:00:00', { e1: 'I' }),
], GUIDANCES, null);
t('une étape non cotée ne produit pas de point', c2.steps.map((s) => s.cotations), [2, 1, 1]);
t('et ne compte pas comme un échec', c2.steps.map((s) => s.pct), [100, 100, 100]);

/* Le code d'indépendance vient du jeu de l'objectif quand il en porte un —
   jamais d'un repli en dur sur « I ». */
const RENOMME = {
  ...CHAINE,
  config: { ...CHAINE.config, guidanceSet: [{ code: 'AUT', independent: true }, { code: 'I', independent: false }] },
};
const c3 = objectiveSteps(RENOMME, 'p1', [
  sChaine('s1', '2026-06-01T09:00:00', { e1: 'AUT', e2: 'I' }),
], GUIDANCES, null);
t('le jeu de guidances de l’objectif décide de l’indépendance',
  c3.steps.filter((s) => s.cotations).map((s) => s.pct), [100, 0]);

/* Une étape retirée de la configuration garde ses cotations passées, en fin de
   liste et marquée comme telle. */
const AMPUTEE = { ...CHAINE, config: { ...CHAINE.config, steps: [{ id: 'e1', name: 'Ouvrir le robinet' }] } };
const c4 = objectiveSteps(AMPUTEE, 'p1', [
  sChaine('s1', '2026-06-01T09:00:00', { e1: 'I', e2: 'GP' }),
  sChaine('s2', '2026-06-02T09:00:00', { e1: 'I' }),
], GUIDANCES, null);
t('une étape retirée de la configuration reste lisible', c4.steps.map((s) => s.id), ['e1', 'e2']);
t('elle est marquée comme non déclarée', c4.steps.map((s) => s.declaree), [true, false]);
t('ses cotations passées sont conservées', c4.steps[1].cotations, 1);
t('faute de nom déclaré, elle porte son identifiant', c4.steps[1].nom, 'e2');

/* ==================== Équilibre ==================== */
const EQ = {
  id: 'o1', name: 'Demander de l’aide', type: 'balance',
  config: {
    steps: [{ id: 'b1', name: 'Regarder' }, { id: 'b2', name: 'Tendre l’objet' }],
    balanceOutcomes: [
      { k: 'reussi', short: 'R', reussite: true },
      { k: 'guide', short: 'G', reussite: false },
      { k: 'manque', short: 'M', reussite: false, exclu: true },
    ],
    mastery: { threshold: 80, sessions: 2, unit: 'sessions', sens: 'min' },
  },
};
const sEq = (id, date, trials) => ({ id, date, data: { p1: { o1: { trials } } } });

const e1 = objectiveSteps(EQ, 'p1', [
  sEq('s1', '2026-06-01T09:00:00', [
    { steps: { b1: { outcome: 'reussi' }, b2: { outcome: 'guide' } } },
    { steps: { b1: { outcome: 'reussi' }, b2: { outcome: 'reussi' } } },
  ]),
], GUIDANCES, null);
t('une séance à deux essais fait un seul point par étape',
  e1.steps.map((s) => s.cotations), [1, 1]);
t('le point de l’étape est la part de réussite de la séance',
  e1.steps.map((s) => s.pct), [100, 50]);
t('la répartition des issues est comptée essai par essai',
  e1.steps[1].repartition, { guide: 1, reussi: 1 });
t('les essais cotés sont comptés', e1.renforcement.essais, 2);

/* Une étape manquée est exclue du dénominateur, mais reste dans la
   répartition : « non présentée » est une information de terrain. */
const e2 = objectiveSteps(EQ, 'p1', [
  sEq('s1', '2026-06-01T09:00:00', [
    { steps: { b1: { outcome: 'manque' } } },
    { steps: { b1: { outcome: 'reussi' } } },
  ]),
], GUIDANCES, null);
t('une étape manquée sort du calcul', e2.steps[0].pct, 100);
t('mais reste visible dans la répartition', e2.steps[0].repartition, { manque: 1, reussi: 1 });

const e3 = objectiveSteps(EQ, 'p1', [
  sEq('s1', '2026-06-01T09:00:00', [{ steps: { b1: { outcome: 'manque' } } }]),
], GUIDANCES, null);
t('une étape uniquement manquée n’a aucun point', e3.steps[0].cotations, 0);
t('son pourcentage est absent, pas nul', e3.steps[0].pct, null);
t('et elle n’a pas de verdict d’acquisition', e3.steps[0].mastery, null);

/* Renforcement et demandes : deux marqueurs indépendants de l'issue, posés en
   séance. C'est ce qu'on vient lire sur un Équilibre. */
const e4 = objectiveSteps(EQ, 'p1', [
  sEq('s1', '2026-06-01T09:00:00', [
    { steps: { b1: { outcome: 'reussi', renforce: true }, b2: { outcome: 'guide', demande: true } } },
    { steps: { b1: { outcome: 'reussi' }, b2: { outcome: 'reussi', renforce: true } } },
  ]),
], GUIDANCES, null);
t('le renforcement est compté globalement', e4.renforcement.renforces, 2);
t('les demandes aussi', e4.renforcement.demandes, 1);
t('le renforcement est ventilé par étape', e4.steps.map((s) => s.renforce), [1, 1]);
t('les demandes aussi', e4.steps.map((s) => s.demande), [0, 1]);
/* Un marqueur posé sur une étape sans issue compte quand même : l'éducateur a
   bien renforcé, même s'il n'a pas coté le résultat. */
const e5 = objectiveSteps(EQ, 'p1', [
  sEq('s1', '2026-06-01T09:00:00', [{ steps: { b1: { outcome: 'reussi' }, b2: { renforce: true } } }]),
], GUIDANCES, null);
t('un renforcement sans issue est compté', e5.renforcement.renforces, 1);
t('et l’étape sans issue n’a pas de point', e5.steps[1].cotations, 0);

/* La forme ancienne, à un seul passage : `entry.steps` sans `trials`. */
const e6 = objectiveSteps(EQ, 'p1', [
  { id: 's1', date: '2026-06-01T09:00:00', data: { p1: { o1: { steps: { b1: { outcome: 'reussi' } } } } } },
], GUIDANCES, null);
t('une cotation Équilibre à un seul passage est lue', e6.steps[0].pct, 100);

/* Un objectif qui ne se décompose pas en étapes ne rend rien : l'appelant
   n'affiche alors pas le bloc, plutôt que d'afficher un bloc vide. */
t('un mode sans étapes ne produit pas d’analyse',
  objectiveSteps({ id: 'o1', type: 'trials', config: {} }, 'p1', [], GUIDANCES, null), null);

/* ==================== seancesRetenues ====================
   La courbe et le détail par étape doivent porter sur les mêmes séances. */
const AVEC_REPRISE = { ...CHAINE, trackingResetAt: '2026-06-02T00:00:00' };
const seances = [
  sChaine('s1', '2026-06-01T09:00:00', { e1: 'I' }),
  sChaine('s2', '2026-06-03T09:00:00', { e1: 'GP' }),
];
t('une reprise de suivi écarte les séances antérieures',
  seancesRetenues(AVEC_REPRISE, 'p1', seances, null).map((r) => r.sess.id), ['s2']);
t('et le détail par étape en tient compte comme la courbe',
  [objectiveSteps(AVEC_REPRISE, 'p1', seances, GUIDANCES, null).seances.length,
    objectivePoints(AVEC_REPRISE, 'p1', seances, GUIDANCES, null).length], [1, 1]);

/* Filtre de cible : une cotation portant une autre cible, ou aucune, sort. */
const ciblees = [
  { id: 's1', date: '2026-06-01T09:00:00', data: { p1: { o1: { targetId: 'c1', steps: { e1: 'I' } } } } },
  { id: 's2', date: '2026-06-02T09:00:00', data: { p1: { o1: { targetId: 'c2', steps: { e1: 'GP' } } } } },
  { id: 's3', date: '2026-06-03T09:00:00', data: { p1: { o1: { steps: { e1: 'GP' } } } } },
];
t('une cible en cours ne retient que ses propres cotations',
  seancesRetenues(CHAINE, 'p1', ciblees, 'c1').map((r) => r.sess.id), ['s1']);
t('sans cible, tout est retenu',
  seancesRetenues(CHAINE, 'p1', ciblees, null).map((r) => r.sess.id), ['s1', 's2', 's3']);
t('le détail par étape suit le même filtre de cible',
  objectiveSteps(CHAINE, 'p1', ciblees, GUIDANCES, 'c1').steps[0].cotations, 1);

/* ==================== Un critère en jours ====================
   `masteryStatus` regroupe alors les cotations par journée calendaire
   (`toDayPoints`, qui lit `p.date`). La série d'une étape doit donc porter la
   vraie date de séance : avec un index, deux cotations du même jour auraient
   compté pour deux jours. */
const EN_JOURS = {
  ...CHAINE,
  config: { ...CHAINE.config, steps: [{ id: 'e1', name: 'Ouvrir le robinet' }], mastery: { threshold: 80, sessions: 2, unit: 'days', sens: 'min' } },
};
const memeJour = objectiveSteps(EN_JOURS, 'p1', [
  sChaine('s1', '2026-06-01T09:00:00', { e1: 'I' }),
  sChaine('s2', '2026-06-01T15:00:00', { e1: 'I' }),
], GUIDANCES, null);
t('deux cotations du même jour ne valent qu’un jour', memeJour.steps[0].mastery.streak, 1);
t('et ne suffisent donc pas au critère', memeJour.steps[0].mastery.mastered, false);
const deuxJours = objectiveSteps(EN_JOURS, 'p1', [
  sChaine('s1', '2026-06-01T09:00:00', { e1: 'I' }),
  sChaine('s2', '2026-06-02T09:00:00', { e1: 'I' }),
], GUIDANCES, null);
t('deux journées distinctes valident le critère', deuxJours.steps[0].mastery.mastered, true);

console.log(`\n${ok} réussis, ${ko} échecs`);
process.exit(ko ? 1 : 0);
