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

const NOMS = [
  'memeJour', 'JOURS', 'migrerEmploiDuTemps', 'ateliersDuJour',
  'fusionnerOrdreJour', 'appliquerOrdreAuxAutresJours', 'planifierJour',
  'personnesPrevues', 'personnesToutesPrevues', 'joursAjustes', 'resumeAtelier',
  'configurerAtelier', 'migrerAteliersConnus',
];

const code = `
  ${NOMS.map(extraire).join('\n')}
  return { ${NOMS.join(', ')} };
`;
// eslint-disable-next-line no-new-func
const F = new Function(code)();
const {
  migrerEmploiDuTemps, ateliersDuJour, fusionnerOrdreJour, appliquerOrdreAuxAutresJours, planifierJour,
  personnesPrevues, personnesToutesPrevues, joursAjustes, resumeAtelier,
  configurerAtelier, migrerAteliersConnus,
} = F;

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

/* ==================== fusionnerOrdreJour ====================
   Le cas d'usage : « chaque jour commence par accueil et finit par goûter »
   doit survivre même quand le jour cible porte un atelier intercalaire que le
   jour de référence n'a pas. */

t(
  'un atelier intercalaire au jour cible se range entre le début et la fin communs',
  fusionnerOrdreJour(['Accueil', 'Sport', 'Goûter'], ['Langage', 'Accueil', 'Goûter', 'Motricité']),
  ['Accueil', 'Langage', 'Motricité', 'Goûter']
);
t(
  'jour cible déjà conforme à l\'ordre de référence : rien ne bouge',
  fusionnerOrdreJour(['Accueil', 'Sport', 'Goûter'], ['Accueil', 'Sport', 'Goûter', 'Motricité']),
  ['Accueil', 'Sport', 'Goûter', 'Motricité']
);
t('cas général A,B,C / C,A,D', fusionnerOrdreJour(['A', 'B', 'C'], ['C', 'A', 'D']), ['A', 'D', 'C']);
t('aucun atelier commun : jour cible inchangé', fusionnerOrdreJour(['A', 'B'], ['X', 'Y']), ['X', 'Y']);
t('sous-ensemble du jour de référence', fusionnerOrdreJour(['A', 'B', 'C'], ['C', 'A']), ['A', 'C']);
t(
  'aucun atelier n\'est ajouté ni retiré, seul l\'ordre change',
  fusionnerOrdreJour(['Accueil', 'Sport', 'Goûter'], ['Langage', 'Accueil', 'Goûter', 'Motricité']).sort(),
  ['Accueil', 'Goûter', 'Langage', 'Motricité'].sort()
);

/* ==================== appliquerOrdreAuxAutresJours ==================== */

t(
  'applique la fusion aux jours programmés, ignore les jours vides',
  appliquerOrdreAuxAutresJours(
    { 1: ['Accueil', 'Sport', 'Goûter'], 2: ['Langage', 'Accueil', 'Goûter', 'Motricité'], 3: [] },
    1
  ),
  { 1: ['Accueil', 'Sport', 'Goûter'], 2: ['Accueil', 'Langage', 'Motricité', 'Goûter'], 3: [] }
);
t(
  'réappliquer un ordre déjà propagé ne change plus rien (idempotent)',
  appliquerOrdreAuxAutresJours(
    appliquerOrdreAuxAutresJours(
      { 1: ['Accueil', 'Sport', 'Goûter'], 2: ['Langage', 'Accueil', 'Goûter', 'Motricité'] },
      1
    ),
    1
  ),
  appliquerOrdreAuxAutresJours(
    { 1: ['Accueil', 'Sport', 'Goûter'], 2: ['Langage', 'Accueil', 'Goûter', 'Motricité'] },
    1
  )
);

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

/* ==================== personnesPrevues ====================
   Un même atelier n'accueille pas le même groupe selon le jour : la liste
   commune vaut partout, sauf les jours qui portent la leur. */

const sport = {
  id: 'at1',
  name: 'Sport',
  usualStudentIds: ['s1', 's2'],
  personnesParJour: { 2: ['s3'], 4: [] },
};

t('sans jour, la liste commune', personnesPrevues(sport, null), ['s1', 's2']);
t('un jour sans variante suit la liste commune', personnesPrevues(sport, 1), ['s1', 's2']);
t('un jour ajusté a sa propre liste', personnesPrevues(sport, 2), ['s3']);
t('une variante vide est une vraie liste vide, pas une absence', personnesPrevues(sport, 4), []);
t('atelier sans aucune liste', personnesPrevues({ id: 'at2', name: 'X' }, 3), []);
t('atelier absent', personnesPrevues(undefined, 1), []);
t('le jour 0 (dimanche) n\'est pas confondu avec l\'absence de jour',
  personnesPrevues({ id: 'at3', usualStudentIds: ['s1'], personnesParJour: { 0: ['s9'] } }, 0), ['s9']);

/* ==================== personnesToutesPrevues ==================== */

t('union de la liste commune et de toutes les variantes',
  personnesToutesPrevues(sport).sort(), ['s1', 's2', 's3']);
t('aucun doublon quand une variante reprend la liste commune',
  personnesToutesPrevues({ usualStudentIds: ['s1'], personnesParJour: { 2: ['s1', 's4'] } }).sort(), ['s1', 's4']);
t('atelier sans variante', personnesToutesPrevues({ usualStudentIds: ['s1'] }), ['s1']);
t('atelier absent', personnesToutesPrevues(null), []);

/* ==================== joursAjustes ==================== */

t('seuls les jours programmés comptent', joursAjustes(sport, [1, 2, 4]), [2, 4]);
t('une variante posée sur un jour déprogrammé ne compte pas', joursAjustes(sport, [1, 4]), [4]);
t('atelier sans variante', joursAjustes({ usualStudentIds: ['s1'] }, [1, 2]), []);

/* ==================== resumeAtelier ==================== */

const eleves = [{ id: 's1' }, { id: 's2' }, { id: 's3' }];

t(
  'le résumé compte la classe commune et signale les jours ajustés',
  resumeAtelier(sport, { 1: ['at1'], 2: ['at1'] }, eleves),
  { jours: [1, 2], nbPersonnes: 2, nbObjectifs: 0, joursAjustes: [2] }
);

t(
  'les objectifs comptés couvrent aussi une personne qui ne vient qu\'un jour',
  resumeAtelier(
    { ...sport, usualObjectives: { s1: ['o1'], s3: ['o2', 'o3'] } },
    { 1: ['at1'], 2: ['at1'] },
    eleves
  ).nbObjectifs,
  3
);

t(
  'une personne supprimée ne compte plus',
  resumeAtelier(sport, { 1: ['at1'] }, [{ id: 's1' }]).nbPersonnes,
  1
);

/* ==================== Sélection d'objectifs d'un atelier ====================
   Huit objectifs cochés dans le panneau Ateliers, une cinquantaine cotés à
   l'écran de lancement : la sélection était bien enregistrée, elle était défaite
   au lancement. `configurerAtelier` recoche d'office ce qu'il juge NOUVEAU
   depuis le réglage — absent de `usualObjectives` et absent de
   `knownObjectiveIds`. `known` doit donc porter tous les objectifs qui
   EXISTAIENT au moment du réglage. Le bouton « Mémoriser cette configuration »
   le faisait ; l'écriture depuis l'emploi du temps n'y versait que les objectifs
   cochés, si bien qu'un objectif jamais coché passait pour un objectif créé
   depuis, et revenait à chaque lancement. */
const dixObjectifs = Array.from({ length: 10 }, (_, i) => ({ id: `o${i + 1}`, name: `Objectif ${i + 1}`, type: 'trials', config: {} }));
const personnesTest = [{ id: 'p1', initials: 'A.B.', objectives: dixObjectifs }];
const huit = dixObjectifs.slice(0, 8).map((o) => o.id);

const atelierRegle = {
  id: 'at1', usualStudentIds: ['p1'],
  usualObjectives: { p1: huit },
  knownObjectiveIds: dixObjectifs.map((o) => o.id),
};
t('huit objectifs cochés sur dix : huit au lancement',
  configurerAtelier(personnesTest, atelierRegle, null, 'atelier').selected.p1, huit);
t('et rien à annoncer comme nouveauté',
  configurerAtelier(personnesTest, atelierRegle, null, 'atelier').nouveautes, {});

/* La fonctionnalité que le défaut parasitait doit survivre : un objectif créé
   APRÈS le réglage — absent de `saved` comme de `known` — est bien recoché et
   annoncé. */
const onze = [...dixObjectifs, { id: 'o11', name: 'Objectif 11', type: 'trials', config: {} }];
const avecNouveau = configurerAtelier([{ id: 'p1', initials: 'A.B.', objectives: onze }], atelierRegle, null, 'atelier');
t('un objectif créé depuis le réglage est recoché', avecNouveau.selected.p1, [...huit, 'o11']);
t('et il est annoncé comme nouveauté', avecNouveau.nouveautes, { p1: ['o11'] });

/* Un objectif décoché après avoir été coché est dans `known` et hors de
   `saved` : il ne revient pas. C'est ce qui distingue « décoché » de
   « jamais coché » — et les deux doivent maintenant se comporter pareil. */
t('un objectif décoché ne revient pas',
  configurerAtelier(personnesTest, { ...atelierRegle, usualObjectives: { p1: huit.slice(0, 7) } }, null, 'atelier').selected.p1,
  huit.slice(0, 7));

/* Rien de mémorisé pour cette personne : le repli documenté reste « tout ». */
t('sans rien de mémorisé, tous les objectifs partent',
  configurerAtelier(personnesTest, { id: 'at1', usualStudentIds: ['p1'] }, null, 'atelier').selected.p1,
  dixObjectifs.map((o) => o.id));

/* ==================== migrerAteliersConnus ====================
   Les ateliers déjà réglés depuis l'emploi du temps portent un `known` amputé :
   corriger l'écriture ne les répare pas, il faut les rattraper en lecture. */
const amputee = [{ id: 'at1', usualStudentIds: ['p1'], usualObjectives: { p1: huit }, knownObjectiveIds: huit }];
const repare = migrerAteliersConnus(amputee, personnesTest);
t('la migration complète les objectifs connus',
  repare[0].knownObjectiveIds.slice().sort(), dixObjectifs.map((o) => o.id).sort());
t('et la sélection redevient celle qui était réglée',
  configurerAtelier(personnesTest, repare[0], null, 'atelier').selected.p1, huit);
/* Un atelier sans rien de mémorisé n'a rien à rattraper : le toucher lui
   inventerait un réglage qui n'a jamais existé. */
t('un atelier sans usualObjectives n’est pas touché',
  migrerAteliersConnus([{ id: 'at2', usualStudentIds: ['p1'] }], personnesTest)[0].knownObjectiveIds, undefined);
/* Une personne disparue depuis garde ce qui avait été coché pour elle : ces
   objectifs-là ont forcément existé au moment du réglage, c'est même la seule
   chose qu'on sache encore d'eux. */
t('les objectifs déjà choisis restent connus, même sans la personne',
  migrerAteliersConnus([{ id: 'at3', usualStudentIds: ['zz'], usualObjectives: { zz: ['x'] } }], personnesTest)[0].knownObjectiveIds,
  ['x']);
/* Défense en lecture, comme migrerEmploiDuTemps : une forme inattendue ne
   fait pas planter l'écran, elle retombe sur ce qu'on peut encore savoir. */
t('une liste absente rend une liste vide', migrerAteliersConnus(null, personnesTest), []);
t('sans les personnes, la migration retombe sur ce qui était coché',
  migrerAteliersConnus(amputee, null)[0].knownObjectiveIds, huit);
t('un atelier nul traverse sans planter', migrerAteliersConnus([null], personnesTest), [null]);

console.log(`\n${ok} OK, ${ko} en échec`);
process.exit(ko > 0 ? 1 : 0);
