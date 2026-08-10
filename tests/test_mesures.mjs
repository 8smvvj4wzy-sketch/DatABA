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
  const ListChecks = 'ListChecks', Hash = 'Hash', LayoutGrid = 'LayoutGrid', ListOrdered = 'ListOrdered', Route = 'Route', HelpCircle = 'HelpCircle', CheckCircle2 = 'CheckCircle2';
  const INK_SOFT = '#5B6B5E';
  const CAT_TEAL = ${extraireLigne('CAT_TEAL')};
  const CAT_INDIGO = ${extraireLigne('CAT_INDIGO')};
  const CAT_AMBER = ${extraireLigne('CAT_AMBER')};
  const CAT_CORAL = ${extraireLigne('CAT_CORAL')};
  const CAT_VIOLET = ${extraireLigne('CAT_VIOLET')};
  const CAT_CYAN = ${extraireLigne('CAT_CYAN')};
  const CAT_LILAC = ${extraireLigne('CAT_LILAC')};
  const CAT_SLATE = ${extraireLigne('CAT_SLATE')};
  ${extraire('TYPES')}
  const PERCENT_TYPES = ${extraireLigne('PERCENT_TYPES')};
  const USES_GUIDANCE = ${extraireLigne('USES_GUIDANCE')};
  const MASTERY_TYPES = ${extraireLigne('MASTERY_TYPES')};
  const DEFAULT_MASTERY = ${extraireLigne('DEFAULT_MASTERY')};
  const DEFAULT_MASTERY_PROBE = ${extraireLigne('DEFAULT_MASTERY_PROBE')};
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
  ${extraire('guidanceByCode')}
  ${extraire('isIndependentCode')}
  ${extraire('objectiveGuidances')}
  ${extraire('objectiveScore')}
  ${extraire('creneauProbe')}
  ${extraire('memeJour')}
  ${extraire('probesDuJour')}
  ${extraire('masteryDe')}
  ${extraire('configCanonique')}
  return { TYPES, PERCENT_TYPES, USES_GUIDANCE, MASTERY_TYPES, DEFAULT_MASTERY, DEFAULT_MASTERY_PROBE, typeMeta, mesuresVides, mesuresExport, emptyEntry, entryMatches, figerChronos, relancerMesures, reindexMesuresEssais, objectiveScore, creneauProbe, probesDuJour, masteryDe, configCanonique };
`;
// eslint-disable-next-line no-new-func
const { TYPES, PERCENT_TYPES, USES_GUIDANCE, MASTERY_TYPES, DEFAULT_MASTERY, DEFAULT_MASTERY_PROBE, typeMeta, mesuresVides, mesuresExport, emptyEntry, entryMatches, figerChronos, relancerMesures, reindexMesuresEssais, objectiveScore, creneauProbe, probesDuJour, masteryDe, configCanonique } = new Function(code)();

/* ==================== Lot A : six modes, et pas un de plus ====================
   Le comptage par occurrence, retiré faute d'usage, a été réintroduit comme
   un mode de cotation à part entière ; Probe l'a été à son tour, pour les
   objectifs qui se valident par sondage quotidien. Les deux modes retirés à
   la refonte des modes qui restent absents : timer, latence. */
t('exactement six modes de cotation', Object.keys(TYPES), ['trials', 'occurrence', 'interval', 'chaining', 'balance', 'probe']);
t('les modes encore retirés restent absents', Object.keys(TYPES).some((k) => ['timer', 'latency'].includes(k)), false);
PERCENT_TYPES.forEach((k) => t(`PERCENT_TYPES ne référence que des modes existants (${k})`, !!TYPES[k], true));
USES_GUIDANCE.forEach((k) => t(`USES_GUIDANCE ne référence que des modes existants (${k})`, !!TYPES[k], true));

/* ==================== Garde sur un type retiré ==================== */
t('un mode existant renvoie ses propres métadonnées', typeMeta('trials').label, 'Essais');
t("un mode retiré ne fait pas planter l'affichage", typeMeta('timer').label, 'Mode retiré');
t('un type absent ne fait pas planter l\'affichage', typeMeta(undefined).label, 'Mode retiré');

/* ==================== emptyEntry : la mesure auxiliaire est du bord ==================== */
const OBJ_TRIALS = { type: 'trials', config: { trialCount: 0 } };
const OBJ_OCCURRENCE = { type: 'occurrence', config: {} };
const OBJ_INTERVAL = { type: 'interval', config: {} };
const OBJ_CHAINING = { type: 'chaining', config: {} };
const OBJ_BALANCE = { type: 'balance', config: {} };
const OBJ_RETIRE = { type: 'timer', config: {} };

const OBJ_PROBE = { type: 'probe', config: { probesParJour: 1 } };
const OBJ_PROBE_GUIDANCE = { type: 'probe', config: { probesParJour: 2, useGuidance: true } };

t('trials : entrée vide porte des mesures vides', emptyEntry(OBJ_TRIALS).mesures, mesuresVides());
t('occurrence : entrée vide part de zéro', emptyEntry(OBJ_OCCURRENCE), { count: 0, mesures: mesuresVides() });
t('interval : entrée vide porte des mesures vides', emptyEntry(OBJ_INTERVAL).mesures, mesuresVides());
t('chaining : entrée vide porte des mesures vides', emptyEntry(OBJ_CHAINING).mesures, mesuresVides());
t('balance : entrée vide porte des mesures vides', emptyEntry(OBJ_BALANCE).mesures, mesuresVides());
t('probe : entrée vide, rien coté', emptyEntry(OBJ_PROBE), { value: null, guidance: null, creneau: null, mesures: mesuresVides() });
t('un type retiré ne produit plus de cotation', emptyEntry(OBJ_RETIRE), {});

t('entryMatches reconnaît une entrée occurrence', entryMatches(OBJ_OCCURRENCE, emptyEntry(OBJ_OCCURRENCE)), true);
t('un compte à zéro reste une entrée valide (0 est un nombre)', entryMatches(OBJ_OCCURRENCE, { count: 0 }), true);
t("une entrée sans compte n'est pas une cotation occurrence", entryMatches(OBJ_OCCURRENCE, { count: '3' }), false);

t('entryMatches est vrai sur une entrée neuve de chaque mode conservé', entryMatches(OBJ_TRIALS, emptyEntry(OBJ_TRIALS)), true);
t('entryMatches probe : 0 est une cotation valide', entryMatches(OBJ_PROBE, { value: 0 }), true);
t('entryMatches probe : 1 est une cotation valide', entryMatches(OBJ_PROBE, { value: 1 }), true);
t('entryMatches probe : entrée neuve (structure) reconnue', entryMatches(OBJ_PROBE, emptyEntry(OBJ_PROBE)), true);
t('un type retiré ne correspond plus à rien', entryMatches(OBJ_RETIRE, { value: 1 }), false);

/* ==================== objectiveScore : probe, 1/0 et guidance ==================== */
const guidancesProbe = [{ code: 'I', label: 'Indépendant', independent: true }, { code: '0', label: 'Aide totale', independent: false }];
t('probe 1/0 : coté 1 → score 100', objectiveScore(OBJ_PROBE, { value: 1 }, guidancesProbe), { value: 100, percent: true, unit: '%' });
t('probe 1/0 : coté 0 → score 0', objectiveScore(OBJ_PROBE, { value: 0 }, guidancesProbe), { value: 0, percent: true, unit: '%' });
t('probe 1/0 : non coté → aucun score', objectiveScore(OBJ_PROBE, { value: null }, guidancesProbe), null);
t('probe par guidance : code indépendant → score 100', objectiveScore(OBJ_PROBE_GUIDANCE, { value: null, guidance: 'I' }, guidancesProbe), { value: 100, percent: true, unit: '%' });
t('probe par guidance : code non indépendant → score 0', objectiveScore(OBJ_PROBE_GUIDANCE, { value: null, guidance: '0' }, guidancesProbe), { value: 0, percent: true, unit: '%' });
t('probe par guidance : rien coté → aucun score', objectiveScore(OBJ_PROBE_GUIDANCE, { value: null, guidance: null }, guidancesProbe), null);

/* ==================== creneauProbe : matin/après-midi, bornes locales ==================== */
t('avant 13h : matin', creneauProbe(new Date(2026, 7, 3, 9, 0).getTime()), 'matin');
t('12h59 : encore matin', creneauProbe(new Date(2026, 7, 3, 12, 59).getTime()), 'matin');
t('13h00 pile : après-midi', creneauProbe(new Date(2026, 7, 3, 13, 0).getTime()), 'aprem');
t('en soirée : après-midi', creneauProbe(new Date(2026, 7, 3, 18, 30).getTime()), 'aprem');
t('horodatage invalide : pas de plantage', creneauProbe('n-importe-quoi'), null);

/* ==================== figerChronos : le cœur du lot B ====================
   Le chrono d'un essai chronométré (à plat sur l'entrée) et le chrono
   auxiliaire (imbriqué dans mesures.chrono) doivent se figer chacun de son
   côté, sans se marcher dessus. */
t('entrée absente : pas de plantage', figerChronos(undefined, 1000), undefined);

const entreeInerte = { trials: [], running: false, startedAt: null, mesures: mesuresVides() };
t('rien en cours : entrée renvoyée telle quelle', figerChronos(entreeInerte, 1000), entreeInerte);

const entreeDeuxChronos = {
  trials: [],
  running: true, startedAt: 1000,
  mesures: { compteur: { total: 3, valideA: null }, chrono: { elapsedMs: 2000, running: true, startedAt: 4000, valideA: null } },
};
const figee = figerChronos(entreeDeuxChronos, 6000);
t("le chrono de l'essai est figé sur son propre fragment", figee.elapsedMs, 5000);
t("le chrono de l'essai est arrêté", figee.running, false);
t('le chrono auxiliaire est figé sur son propre fragment, sans se mélanger', figee.mesures.chrono.elapsedMs, 4000);
t('le chrono auxiliaire est arrêté', figee.mesures.chrono.running, false);
t('le compteur auxiliaire traverse le repliage sans changer', figee.mesures.compteur, { total: 3, valideA: null });

const entreeSansMesures = { running: true, startedAt: 1000 };
t("une entrée sans mesures traverse le repliage sans qu'on lui en invente", 'mesures' in figerChronos(entreeSansMesures, 2000), false);

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

/* ==================== probesDuJour : quota par créneaux distincts ====================
   Un même objectif Probe peut revenir dans plusieurs ateliers le même jour :
   les séances déjà enregistrées ET la séance en cours comptent, mais un
   créneau ne se compte qu'une fois même coté deux fois par erreur. */
const OBJ_PROBE_2X = { id: 'p1', name: 'Salutation', type: 'probe', config: { probesParJour: 2 } };
const ref = new Date(2026, 7, 5, 15, 0); // 5 août 2026, 15h

function seanceProbe(dateIso, value, creneau) {
  return {
    date: dateIso,
    objectiveSnapshot: { p1: OBJ_PROBE_2X },
    data: { eleve: { p1: { value, guidance: null, creneau } } },
  };
}

t('aucune séance : quota à zéro', probesDuJour([], null, 'eleve', 'p1', ref).faites, 0);

const matinFait = seanceProbe('2026-08-05T09:00:00.000Z', 1, 'matin');
t('une probe faite ce matin : un créneau', probesDuJour([matinFait], null, 'eleve', 'p1', ref).faites, 1);

const memeAtelierMatinRefait = seanceProbe('2026-08-05T09:30:00.000Z', 1, 'matin');
t('même créneau coté deux fois : ne compte qu\'une fois', probesDuJour([matinFait, memeAtelierMatinRefait], null, 'eleve', 'p1', ref).faites, 1);

const apremFait = seanceProbe('2026-08-05T14:00:00.000Z', 0, 'aprem');
t('deux ateliers, deux créneaux différents : quota atteint (2)', probesDuJour([matinFait, apremFait], null, 'eleve', 'p1', ref).faites, 2);

const hierMatin = seanceProbe('2026-08-04T09:00:00.000Z', 1, 'matin');
t('une probe d\'hier ne compte pas pour aujourd\'hui', probesDuJour([hierMatin], null, 'eleve', 'p1', ref).faites, 0);

const sessionCourante = seanceProbe('2026-08-05T15:00:00.000Z', 1, 'aprem');
t('la séance en cours compte aussi, pas seulement l\'historique', probesDuJour([matinFait], sessionCourante, 'eleve', 'p1', ref).faites, 2);

const nonCote = seanceProbe('2026-08-05T09:00:00.000Z', null, null);
t('entrée créée mais pas cotée (value null) : ne compte pas', probesDuJour([nonCote], null, 'eleve', 'p1', ref).faites, 0);

const autrePersonne = { ...matinFait, data: { autre: matinFait.data.eleve } };
t('une probe d\'une autre personne ne compte pas', probesDuJour([autrePersonne], null, 'eleve', 'p1', ref).faites, 0);

/* `ref` en nombre (epoch ms), comme le lui passe SessionRunning.probeEstBloque
   — pas seulement en Date, comme le lui passe objectifsPrevusNonCotes. Sans
   la normalisation, memeJour plante sur .getFullYear() d'un nombre. */
t('ref en nombre (epoch ms) : pas de plantage, même résultat qu\'en Date', probesDuJour([matinFait], null, 'eleve', 'p1', ref.getTime()).faites, 1);

/* ==================== configCanonique : signature d'un probe ====================
   Sans probesParJour ni useGuidance dans la signature, deux probes réglés
   différemment se confondent — diffObjectifsPersonne les classerait alors
   « déjà alignés », et un import qui change la fréquence ou le mode de
   cotation serait silencieusement ignoré. */
const sigProbe1x = JSON.stringify(configCanonique('probe', { probesParJour: 1, useGuidance: false }));
const sigProbe2x = JSON.stringify(configCanonique('probe', { probesParJour: 2, useGuidance: false }));
const sigProbeGuidance = JSON.stringify(configCanonique('probe', { probesParJour: 1, useGuidance: true }));
t('configCanonique : 1 par jour ≠ 2 par jour', sigProbe1x === sigProbe2x, false);
t('configCanonique : 1/0 ≠ par guidance', sigProbe1x === sigProbeGuidance, false);
t('configCanonique : deux réglages identiques → même signature', sigProbe1x === JSON.stringify(configCanonique('probe', { probesParJour: 1, useGuidance: false })), true);

/* ==================== masteryDe : repli selon le type ==================== */
t('probe sans config.mastery : repli à 100 % sur 3 jours, pas 80 % sur 3 séances', masteryDe(OBJ_PROBE), DEFAULT_MASTERY_PROBE);
t('trials sans config.mastery : repli habituel à 80 % sur 3 séances', masteryDe(OBJ_TRIALS), DEFAULT_MASTERY);
t('probe avec mastery personnalisé : le repli ne prime pas', masteryDe({ type: 'probe', config: { mastery: { threshold: 90, sessions: 5, unit: 'days', sens: 'min' } } }).threshold, 90);

console.log(`\n${ok} au vert, ${ko} en échec`);
process.exit(ko ? 1 : 0);
