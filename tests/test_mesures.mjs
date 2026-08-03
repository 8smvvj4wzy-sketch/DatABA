/* Modes de cotation retirés (lot A) et mesures auxiliaires — compteur et
   chronomètre — introduites en marge de la cotation (lot B).

   Les fonctions ne sont pas recopiées ici : elles sont extraites de
   src/App.jsx et évaluées telles quelles, sur le même principe que
   test_stabilite.mjs. */

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
   « const X = » jusqu'à sa fermeture en colonne zéro. Réservé aux
   déclarations qui s'étendent sur plusieurs lignes. */
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

/* Une constante tenant sur une seule ligne n'a pas de fermeture propre en
   colonne zéro : `extraire` chercherait bien plus loin dans le fichier.
   On isole ici la seule ligne concernée. */
function extraireLigne(nom) {
  const re = new RegExp(`^const ${nom} = (.+);$`, 'm');
  const m = source.match(re);
  if (!m) throw new Error(`Constante introuvable (ligne unique) dans src/App.jsx : ${nom}`);
  return m[1];
}

const code = `
  const ListChecks = 'ListChecks', LayoutGrid = 'LayoutGrid', ListOrdered = 'ListOrdered', Route = 'Route', HelpCircle = 'HelpCircle';
  const INK_SOFT = '#5B6B5E';
  ${extraire('TYPES')}
  const PERCENT_TYPES = ${extraireLigne('PERCENT_TYPES')};
  const USES_GUIDANCE = ${extraireLigne('USES_GUIDANCE')};
  const TYPE_INCONNU = ${extraireLigne('TYPE_INCONNU')};
  ${extraire('typeMeta')}
  ${extraire('timeShort')}
  ${extraire('mesuresVides')}
  ${extraire('mesuresExport')}
  ${extraire('emptyEntry')}
  ${extraire('entryMatches')}
  ${extraire('figerChronos')}
  ${extraire('relancerMesures')}
  ${extraire('reindexMesuresEssais')}
  return { TYPES, PERCENT_TYPES, USES_GUIDANCE, typeMeta, mesuresVides, mesuresExport, emptyEntry, entryMatches, figerChronos, relancerMesures, reindexMesuresEssais };
`;
// eslint-disable-next-line no-new-func
const { TYPES, PERCENT_TYPES, USES_GUIDANCE, typeMeta, mesuresVides, mesuresExport, emptyEntry, entryMatches, figerChronos, relancerMesures, reindexMesuresEssais } = new Function(code)();

/* ==================== Lot A : quatre modes, et pas un de plus ==================== */
t('exactement quatre modes de cotation', Object.keys(TYPES), ['trials', 'interval', 'chaining', 'balance']);
t('les modes retirés ont bien disparu', Object.keys(TYPES).some((k) => ['probe', 'occurrence', 'timer', 'latency'].includes(k)), false);
PERCENT_TYPES.forEach((k) => t(`PERCENT_TYPES ne référence que des modes existants (${k})`, !!TYPES[k], true));
USES_GUIDANCE.forEach((k) => t(`USES_GUIDANCE ne référence que des modes existants (${k})`, !!TYPES[k], true));

/* ==================== Garde sur un type retiré ==================== */
t('un mode existant renvoie ses propres métadonnées', typeMeta('trials').label, 'Essai par essai');
t("un mode retiré ne fait pas planter l'affichage", typeMeta('probe').label, 'Mode retiré');
t('un type absent ne fait pas planter l\'affichage', typeMeta(undefined).label, 'Mode retiré');

/* ==================== emptyEntry : la mesure auxiliaire est du bord ==================== */
const OBJ_TRIALS = { type: 'trials', config: { trialCount: 0 } };
const OBJ_INTERVAL = { type: 'interval', config: {} };
const OBJ_CHAINING = { type: 'chaining', config: {} };
const OBJ_BALANCE = { type: 'balance', config: {} };
const OBJ_RETIRE = { type: 'probe', config: {} };

t('trials : entrée vide porte des mesures vides', emptyEntry(OBJ_TRIALS).mesures, mesuresVides());
t('interval : entrée vide porte des mesures vides', emptyEntry(OBJ_INTERVAL).mesures, mesuresVides());
t('chaining : entrée vide porte des mesures vides', emptyEntry(OBJ_CHAINING).mesures, mesuresVides());
t('balance : entrée vide porte des mesures vides', emptyEntry(OBJ_BALANCE).mesures, mesuresVides());
t('un type retiré ne produit plus de cotation', emptyEntry(OBJ_RETIRE), {});

t('entryMatches est vrai sur une entrée neuve de chaque mode conservé', entryMatches(OBJ_TRIALS, emptyEntry(OBJ_TRIALS)), true);
t('un type retiré ne correspond plus à rien', entryMatches(OBJ_RETIRE, { value: 1 }), false);

/* ==================== figerChronos : le cœur du lot B ====================
   Le chrono d'un essai chronométré (à plat sur l'entrée) et le chrono
   auxiliaire (imbriqué dans mesures.chrono) doivent se figer chacun de son
   côté, sans se marcher dessus. */
t('entrée absente : pas de plantage', figerChronos(undefined, 1000, false), undefined);

const entreeInerte = { trials: [], running: false, startedAt: null, pendingMs: 0, mesures: mesuresVides() };
t('rien en cours : entrée renvoyée telle quelle', figerChronos(entreeInerte, 1000, false), entreeInerte);

const entreeDeuxChronos = {
  trials: [],
  running: true, startedAt: 1000, pendingMs: 0,
  mesures: { compteur: { total: 3, valideA: null }, chrono: { elapsedMs: 2000, running: true, startedAt: 4000, valideA: null } },
};
const figee = figerChronos(entreeDeuxChronos, 6000, false);
t("le chrono de l'essai est figé sur son propre fragment", figee.elapsedMs, 5000);
t("le chrono de l'essai est arrêté", figee.running, false);
t('le chrono auxiliaire est figé sur son propre fragment, sans se mélanger', figee.mesures.chrono.elapsedMs, 4000);
t('le chrono auxiliaire est arrêté', figee.mesures.chrono.running, false);
t('le compteur auxiliaire traverse le repliage sans changer', figee.mesures.compteur, { total: 3, valideA: null });

const entreeRenfo = { running: true, startedAt: 1000, pendingMs: 500, mesures: mesuresVides() };
const figeeRenfo = figerChronos(entreeRenfo, 3500, true);
t('cumulePending alimente pendingMs pour le renforcement', figeeRenfo.pendingMs, 3000);
const figeeSansRenfo = figerChronos(entreeRenfo, 3500, false);
t('sans cumulePending, pendingMs ne bouge pas', figeeSansRenfo.pendingMs, 500);

const entreeSansMesures = { running: true, startedAt: 1000, pendingMs: 0 };
t("une entrée sans mesures traverse le repliage sans qu'on lui en invente", 'mesures' in figerChronos(entreeSansMesures, 2000, false), false);

/* ==================== mesuresExport : jamais un zéro par défaut ==================== */
t('rien mesuré : toutes les cellules vides', mesuresExport(undefined), { compteurTotal: '', chronoSecondes: '', valideA: '' });
t('compteur à zéro jamais validé : cellule vide, pas un zéro', mesuresExport({ compteur: { total: 0, valideA: null }, chrono: mesuresVides().chrono }).compteurTotal, '');
t('compteur validé : la valeur sort', mesuresExport({ compteur: { total: 4, valideA: '2026-08-03T10:00:00.000Z' }, chrono: mesuresVides().chrono }).compteurTotal, 4);
t('chrono validé : durée arrondie à la seconde', mesuresExport({ compteur: mesuresVides().compteur, chrono: { elapsedMs: 12345, running: false, startedAt: null, valideA: '2026-08-03T10:00:00.000Z' } }).chronoSecondes, 12);
t('chrono non validé : cellule vide malgré une durée non nulle', mesuresExport({ compteur: mesuresVides().compteur, chrono: { elapsedMs: 12345, running: false, startedAt: null, valideA: null } }).chronoSecondes, '');

/* ==================== relancerMesures : compteur/chrono par essai ====================
   Sur trials, chaînage et balance program, une relance capture la mesure en
   cours sous la clé de l'essai puis remet à zéro les seules sous-parties
   concernées — l'autre reste un relevé unique, inchangé. */
t('aucune relance demandée : rien ne bouge', relancerMesures({ mesures: mesuresVides() }, 0, false, false, 1000), {});

const entreeAvecCompteur = { mesures: { compteur: { total: 5, valideA: null }, chrono: mesuresVides().chrono } };
const relance1 = relancerMesures(entreeAvecCompteur, 0, true, false, 5000);
t('compteur relancé : la valeur en cours est capturée sous la clé', relance1.mesuresEssais[0].compteur.total, 5);
t('compteur relancé : capturé avec un horodatage', relance1.mesuresEssais[0].compteur.valideA, new Date(5000).toISOString());
t('compteur relancé : remis à zéro pour l’essai suivant', relance1.mesures.compteur, { total: 0, valideA: null });
t('compteur relancé : le chrono, non concerné, ne migre pas', 'chrono' in relance1.mesuresEssais[0], false);

const entreeAvecChronoEnCours = { mesures: { compteur: mesuresVides().compteur, chrono: { elapsedMs: 2000, running: true, startedAt: 3000, valideA: null } } };
const relance2 = relancerMesures(entreeAvecChronoEnCours, 2, false, true, 6000);
t('chrono relancé : capturé figé, même s’il tournait encore', relance2.mesuresEssais[2].chrono.elapsedMs, 5000);
t('chrono relancé : capturé arrêté', relance2.mesuresEssais[2].chrono.running, false);
t('chrono relancé : remis à zéro et arrêté pour l’essai suivant', relance2.mesures.chrono, { elapsedMs: 0, running: false, startedAt: null, valideA: null });

const entreeDejaEssais = { mesures: mesuresVides(), mesuresEssais: { 0: { compteur: { total: 2, valideA: '2026-08-03T09:00:00.000Z' } } } };
const relance3 = relancerMesures(entreeDejaEssais, 1, true, false, 7000);
t('relance sur une nouvelle clé : les essais précédents restent intacts', relance3.mesuresEssais[0].compteur.total, 2);

/* ==================== reindexMesuresEssais : annuler un essai indexé ==================== */
t('pas de mesures par essai : rien à réindexer', reindexMesuresEssais(undefined, 1), undefined);

const essaisAvantSuppression = {
  0: { compteur: { total: 1, valideA: 'a' } },
  1: { compteur: { total: 2, valideA: 'b' } },
  2: { compteur: { total: 3, valideA: 'c' } },
};
const reindexes = reindexMesuresEssais(essaisAvantSuppression, 1);
t("l'essai supprimé disparaît : plus que deux essais", Object.keys(reindexes).length, 2);
t('les essais suivants glissent d’un cran', reindexes[1].compteur.total, 3);
t('les essais précédents restent en place', reindexes[0].compteur.total, 1);

console.log(`\n${ok} au vert, ${ko} en échec`);
process.exit(ko ? 1 : 0);
