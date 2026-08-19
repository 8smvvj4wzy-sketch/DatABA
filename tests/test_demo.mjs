/* Le jeu de démonstration tient-il ses promesses ?
 *
 * Un jeu de données de démonstration ne se relit pas : quatre mégaoctets de
 * JSON ne se vérifient pas à l'œil, et une trajectoire qui rate son seuil de
 * deux points laisse un écran vide qu'on ne découvre qu'en réunion. C'est donc
 * ici que se vérifie ce que `scripts/generer-demo.mjs` prétend produire.
 *
 * Trois familles de contrôles :
 *   1. la conformité à ce qui a été demandé (dix personnes, dix objectifs,
 *      un ou deux prioritaires en essais ou en occurrence, huit essentiels) ;
 *   2. les invariants de structure, sans lesquels l'import échoue ou perd des
 *      données en silence ;
 *   3. la couverture — chaque état d'objectif, chaque bloc de l'écran Crises,
 *      chaque mode de cotation doit avoir de quoi s'afficher.
 *
 * Les fonctions de calcul sont extraites de src/App.jsx et évaluées telles
 * quelles, comme dans les autres suites : une copie finirait par diverger du
 * code livré.
 *
 * Une exception assumée : les seuils de classement des objectifs
 * (« plateau », « dormant »…) appartiennent à `analyserObjectif` de DatABA
 * Manager, qui vit dans un dépôt séparé et qu'aucun test d'ici ne peut
 * atteindre. Ils sont donc recopiés plus bas, avec leur origine, et c'est le
 * seul endroit de cette suite où une divergence entre les deux applications
 * pourrait passer inaperçue. Le jour où Manager change PLATEAU_ECART_MAX, ce
 * test continuera de passer alors que l'écran ne montrera plus la même chose.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { genererDemo, CATALOGUE, ESSENTIELS, PERSONNES, TYPES_PRIORITAIRES } from '../scripts/generer-demo.mjs';

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

const NOMS = [
  'objectiveGuidances', 'guidanceByCode', 'isIndependentCode',
  'balanceOutcomes', 'outcomeMeta', 'trialCode', 'trialMs', 'balanceTrials', 'balanceStats',
  'entryMatches', 'parseHM', 'segmentMinutes', 'segmentSeconds', 'intervalStepSec', 'intervalTotals',
  'masteryDe', 'toDayPoints', 'masteryStatus', 'objectiveScore', 'objectivePoints',
  'releverAliasStabilite', 'reperesDePhase',
];
const code = `const CRISIS = '#B3261E';
const CAT_TEAL = ${extraireLigne('CAT_TEAL')};
const CAT_INDIGO = ${extraireLigne('CAT_INDIGO')};
const CAT_AMBER = ${extraireLigne('CAT_AMBER')};
const CAT_CORAL = ${extraireLigne('CAT_CORAL')};
const CAT_VIOLET = ${extraireLigne('CAT_VIOLET')};
const CAT_CYAN = ${extraireLigne('CAT_CYAN')};
const CAT_LILAC = ${extraireLigne('CAT_LILAC')};
const CAT_SLATE = ${extraireLigne('CAT_SLATE')};
const PERCENT_TYPES = ${extraireLigne('PERCENT_TYPES')};
const MASTERY_TYPES = ${extraireLigne('MASTERY_TYPES')};
const DEFAULT_MASTERY = ${extraireLigne('DEFAULT_MASTERY')};
const DEFAULT_MASTERY_PROBE = ${extraireLigne('DEFAULT_MASTERY_PROBE')};
${extraire('DEFAULT_GUIDANCE')}
${extraire('BALANCE_OUTCOMES')}
${extraire('DEFAULT_CRITERES_SUIVI')}
const CLES_ETAT_HISTORIQUES = ${extraireLigne('CLES_ETAT_HISTORIQUES')};
${NOMS.map(extraire).join('\n')}
return { ${NOMS.join(', ')}, PERCENT_TYPES, MASTERY_TYPES };`;
// eslint-disable-next-line no-new-func
const {
  masteryDe, toDayPoints, masteryStatus, objectiveScore, objectivePoints,
  releverAliasStabilite, intervalTotals, balanceStats, reperesDePhase,
  PERCENT_TYPES, MASTERY_TYPES,
} = new Function(code)();

/* ==================== Seuils de DatABA Manager ====================
   Recopiés depuis DatABA-Manager/src/App.jsx — dépôt séparé, hors de portée
   d'un import. Voir l'avertissement en tête de fichier. */
const DORMANT_JOURS = 21;
const PLATEAU_MIN_POINTS = 6;
const PLATEAU_ECART_MAX = 20;

/* ==================== Génération ====================
   Le jeu est régénéré en mémoire à la date du jour plutôt que relu depuis
   `demo/`. C'est délibéré : la dormance et la période par défaut de Manager se
   comptent à partir de l'heure réelle, si bien qu'un fichier figé finirait par
   ne plus rien contenir de récent et ferait virer cette suite au rouge sans
   qu'aucun code n'ait bougé. Le fichier versionné est comparé plus bas, à sa
   propre date de fin. */
const { tablette1, tablette2, calendrier } = genererDemo({});
const seancesAsc = tablette1.sessions.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
const maintenant = Date.now();

/* ==================== 1. Conformité à la demande ==================== */

t('dix personnes accompagnées', tablette1.students.length, 10);
t('dix objectifs par personne', [...new Set(tablette1.students.map((s) => s.objectives.length))], [10]);
t(
  'un ou deux objectifs prioritaires par personne',
  tablette1.students.every((s) => {
    const n = s.objectives.filter((o) => o.favorite).length;
    return n >= 1 && n <= 2;
  }),
  true
);
t(
  'les objectifs prioritaires sont en essais ou en occurrence, jamais dans un autre mode',
  [...new Set(tablette1.students.flatMap((s) => s.objectives.filter((o) => o.favorite).map((o) => o.type)))].sort(),
  TYPES_PRIORITAIRES.slice().sort()
);
t('personne n’est identifiée autrement que par des initiales', tablette1.students.every((s) => /^[A-Z]\.[A-Z]\.$/.test(s.initials)), true);

const nomsCatalogue = new Set(CATALOGUE.map((o) => o.nom));
t(
  'tout objectif attribué vient du catalogue des essentiels',
  tablette1.students.every((s) => s.objectives.every((o) => nomsCatalogue.has(o.name))),
  true
);
const essentielsCouverts = new Set(
  CATALOGUE.filter((c) => tablette1.students.some((s) => s.objectives.some((o) => o.name === c.nom))).map((c) => c.essentiel)
);
t('les huit essentiels de l’EFL sont représentés', essentielsCouverts.size, Object.keys(ESSENTIELS).length);

/* ==================== 2. Invariants de structure ==================== */

t('format et version de sauvegarde', [tablette1.format, tablette1.version], ['aba-backup', 4]);
t('la clé suivi existe, donc Manager ignorera stabilite', Array.isArray(tablette1.suivi), true);
/* `stabilite` n'est pas un second jeu de relevés mais la projection v3 du
   premier. Les additionner dupliquerait tout le suivi continu — d'où ce
   contrôle sur la fonction de l'application elle-même. */
t('stabilite est exactement la projection v3 de suivi', releverAliasStabilite(tablette1.suivi), tablette1.stabilite);
t('la projection v3 ne retient que l’axe historique', tablette1.stabilite.every((r) => 'etat' in r && !('suiviId' in r)), true);

const idsPersonnes = new Set(tablette1.students.map((s) => s.id));
let coherentes = true;
let entreesCompletes = true;
tablette1.sessions.forEach((s) => {
  s.studentIds.forEach((sid) => {
    if (!idsPersonnes.has(sid)) coherentes = false;
    (s.selectedObjectives[sid] || []).forEach((oid) => {
      if (!s.objectiveSnapshot[oid]) coherentes = false;
    });
  });
  Object.entries(s.data || {}).forEach(([sid, parObjectif]) => {
    if (!idsPersonnes.has(sid)) coherentes = false;
    Object.entries(parObjectif).forEach(([oid, entry]) => {
      if (!s.objectiveSnapshot[oid]) coherentes = false;
      if (!(s.selectedObjectives[sid] || []).includes(oid)) coherentes = false;
      if (!('targetId' in entry) || !entry.mesures) entreesCompletes = false;
    });
  });
});
t('toute cotation renvoie à une personne et à un objectif connus de la séance', coherentes, true);
t('toute entrée porte targetId et mesures', entreesCompletes, true);

t(
  'les séances sont écrites de la plus récente à la plus ancienne',
  tablette1.sessions.every((s, i) => i === 0 || new Date(tablette1.sessions[i - 1].date) >= new Date(s.date)),
  true
);
t(
  'aucune trace pendant la semaine de congés',
  [...tablette1.sessions.map((s) => s.date), ...tablette1.crises.map((c) => c.date), ...tablette1.suivi.map((r) => r.timestamp)]
    .some((d) => d.slice(0, 10) >= calendrier.conges.debut && d.slice(0, 10) <= calendrier.conges.fin),
  false
);
/* `suivi` porte deux natures de relevé, séparées par le seul champ `kind` :
   un relevé d'état, qui vaut jusqu'au suivant et porte donc un axe, et un appui
   de compteur d'occurrence, qui est ponctuel et n'en porte aucun. Les
   confondre est le piège que `suiviDePersonne` / `compteursDePersonne`
   écartent côté Manager — ici, chaque assertion doit dire de laquelle des deux
   elle parle. */
const relevesEtat = tablette1.suivi.filter((r) => r.kind !== 'compteur');
const appuisCompteur = tablette1.suivi.filter((r) => r.kind === 'compteur');
t(
  'les relevés de suivi continu portent un axe déclaré',
  relevesEtat.every((r) => tablette1.axesSuivi.some((a) => a.id === r.suiviId)),
  true
);
t('un appui de compteur ne porte jamais d’axe', appuisCompteur.every((r) => r.suiviId === undefined), true);

/* ==================== 3. États d'objectif ====================
   Réplique du classement d'`analyserObjectif` (Manager). La série jugée
   dépend du critère : un pourcentage se lit directement, un comptage se lit
   sur la valeur brute, et un comptage sans critère explicite ne se juge pas
   du tout — le repli « 80 sur 3 séances » n'aurait aucun sens sur un
   compteur d'occurrences. */
function classer(personne, obj) {
  const points = objectivePoints(obj, personne.id, seancesAsc, tablette1.guidances);
  const pourcent = points.filter((p) => p.unit === '%');
  const brutes = points.filter((p) => p.unit !== '%');

  const critPourcent = PERCENT_TYPES.includes(obj.type);
  const applicable = MASTERY_TYPES.includes(obj.type) && (critPourcent || !!(obj.config && obj.config.mastery));
  const m = applicable ? masteryDe(obj) : null;
  const serie = applicable ? (critPourcent ? pourcent : brutes) : [];

  const derniere = [pourcent, brutes].filter((a) => a.length).map((a) => a[a.length - 1].date).sort((a, b) => new Date(b) - new Date(a))[0] || null;
  const jours = derniere ? Math.floor((maintenant - new Date(derniere)) / 86400000) : null;

  if (!serie.length) {
    if (!pourcent.length && !brutes.length) return 'non_acquis';
    if (jours >= DORMANT_JOURS) return 'dormant';
    return 'mesure';
  }

  const jugee = m.unit === 'days' ? toDayPoints(serie) : serie;
  const tient = (v) => (m.sens === 'max' ? v <= m.threshold : v >= m.threshold);
  let streak = 0;
  for (let i = jugee.length - 1; i >= 0; i--) {
    if (tient(jugee[i].value)) streak += 1;
    else break;
  }

  if (streak >= m.sessions) return 'acquis';
  if (jours >= DORMANT_JOURS) return 'dormant';
  if (m.sessions > 1 && streak >= m.sessions - 1) return 'bientot';
  if (critPourcent && jugee.length >= PLATEAU_MIN_POINTS) {
    const cinq = jugee.slice(-5);
    const moyenne = Math.round(cinq.reduce((a, p) => a + p.value, 0) / cinq.length);
    const ecart = m.sens === 'max' ? moyenne - m.threshold : m.threshold - moyenne;
    if (ecart > 0 && ecart <= PLATEAU_ECART_MAX) return 'plateau';
  }
  return 'en_cours';
}

const etats = {};
const etatParCouple = new Map();
tablette1.students.forEach((p) => {
  p.objectives.forEach((o) => {
    const e = classer(p, o);
    etats[e] = (etats[e] || 0) + 1;
    etatParCouple.set(`${p.initials}|${o.name}`, e);
  });
});

const ATTENDUS = ['acquis', 'bientot', 'plateau', 'en_cours', 'dormant', 'non_acquis', 'mesure'];
ATTENDUS.forEach((e) => {
  t(`l’état « ${e} » est représenté au moins une fois`, (etats[e] || 0) > 0, true);
});

/* Les trajectoires ne sont pas décoratives : chacune vise un état précis, et
   c'est ce couple-là qu'un cadre regardera pendant la démonstration. Vérifier
   seulement que l'état existe quelque part laisserait passer un profil qui
   rate sa cible pendant qu'un autre la double. */
t('A.B. — « Se laver les mains » est acquis', etatParCouple.get('A.B.|Se laver les mains'), 'acquis');
t('C.D. — « Accepter un refus sans comportement problème » est en plateau', etatParCouple.get('C.D.|Accepter un refus sans comportement problème'), 'plateau');
t('K.M. — « Transition entre deux activités » est bientôt acquis', etatParCouple.get('K.M.|Transition entre deux activités'), 'bientot');
t('J.L. — « Accepter un refus sans comportement problème » (prioritaire) reste non acquis, faute de cotation', etatParCouple.get('J.L.|Accepter un refus sans comportement problème'), 'non_acquis');
t('J.L. — « Tolérer le brossage des cheveux » est dormant', etatParCouple.get('J.L.|Tolérer le brossage des cheveux'), 'dormant');
t('Y.Z. — « Demandes spontanées, toutes formes » reste une mesure, sans verdict', etatParCouple.get('Y.Z.|Demandes spontanées, toutes formes'), 'mesure');
/* Le seul objectif du jeu dont le seuil se lit à l'envers : acquis quand le
   comptage passe SOUS deux occurrences. */
t('N.P. — le comportement problème passe sous son seuil', etatParCouple.get("N.P.|Comportements problèmes lors d'un refus"), 'acquis');

/* ==================== 4. De quoi remplir chaque écran ==================== */

const crises = tablette1.crises.filter((c) => c.kind === 'crise');
const abc = tablette1.crises.filter((c) => c.kind === 'abc');

t('des crises et des observations ABC', [crises.length > 40, abc.length > 20], [true, true]);
t('les observations ABC ne portent pas de durée', abc.every((c) => c.durationMs === 0), true);
t('les crises portent une durée', crises.every((c) => c.durationMs > 0), true);
/* Au-delà de six valeurs distinctes, Manager regroupe la queue sous
   « Autres » : sans huit étiquettes au moins, ce regroupement ne se voit
   jamais. */
t('au moins huit antécédents distincts', new Set(tablette1.crises.flatMap((c) => c.antecedentTags)).size >= 8, true);
t('au moins huit comportements distincts', new Set(tablette1.crises.flatMap((c) => c.comportementTags)).size >= 8, true);
t('des crises portant plusieurs étiquettes', crises.some((c) => c.comportementTags.length > 1), true);
t('les trois intensités sont présentes', [...new Set(crises.map((c) => c.intensite).filter(Boolean))].sort(), [1, 2, 3]);
t('quelques crises restent sans intensité notée', crises.some((c) => c.intensite === null), true);
t('les cinq fonctions sont présentes', new Set(tablette1.crises.map((c) => c.fonction)).size, 5);
t('les crises sont réparties sur les cinq jours ouvrés', new Set(crises.map((c) => new Date(c.date).getUTCDay())).size, 5);
t('des crises hors atelier et des crises rattachées à un atelier', [crises.some((c) => c.atelierId), crises.some((c) => !c.atelierId)], [true, true]);
/* Une crise née d'une pastille de suivi doit renvoyer au relevé qui l'a
   ouverte, sinon l'écran Crises et le suivi continu se contredisent. */
const idsReleves = new Set(tablette1.suivi.map((r) => r.id));
t('chaque crise issue du suivi renvoie à son relevé', crises.filter((c) => c.origine === 'suivi').every((c) => idsReleves.has(c.releveId)), true);
const relevesCrise = tablette1.suivi.filter((r) => r.suiviId === 'principal' && r.critere === 'crise');
t('chaque relevé « crise » a ouvert une fiche', relevesCrise.length, crises.filter((c) => c.origine === 'suivi').length);

const joursSeance = new Set(tablette1.sessions.map((s) => s.date.slice(0, 10)));
/* Au-delà de vingt-cinq tranches, l'écran Séances passe en mode paginé
   (« Afficher les N autres tranches ») : c'est un comportement qu'une
   démonstration doit atteindre, pas frôler. */
t('plus de vingt-cinq jours de séance distincts', joursSeance.size > 25, true);
t('des séances en mode Équilibre', tablette1.sessions.some((s) => s.mode === 'balance'), true);
t('des séances libres, sans atelier', tablette1.sessions.some((s) => !s.atelierId), true);
t('des notes par personne', tablette1.sessions.some((s) => Object.keys(s.notes || {}).length), true);
t('des séances comportant une pause', tablette1.sessions.some((s) => (s.pauses || []).length), true);
t('des séances transmises et des séances en attente', [tablette1.sessions.some((s) => s.sentAt), tablette1.sessions.some((s) => !s.sentAt)], [true, true]);
t('trois intervenants apparaissent', new Set(tablette1.sessions.map((s) => s.intervenantId)).size, 3);
t('quatre ateliers apparaissent', new Set(tablette1.sessions.map((s) => s.atelierId).filter(Boolean)).size, 4);
t('deux classes, et chaque personne rattachée à l’une d’elles', [tablette1.classes.length, tablette1.students.every((s) => s.classeId)], [2, true]);

const snapshots = tablette1.sessions.flatMap((s) => Object.values(s.objectiveSnapshot));
t('les six modes de cotation sont cotés', new Set(snapshots.map((o) => o.type)).size, 6);
t('plusieurs phases se croisent', new Set(snapshots.map((o) => o.activePhaseName)).size >= 2, true);
t('des cibles successives sont franchies', new Set(snapshots.map((o) => o.activeTargetName).filter(Boolean)).size >= 2, true);

/* Le créneau matin/après-midi n'existe que pour un probe à deux prises par
   jour. Les deux doivent apparaître, sinon la lecture par créneau reste
   théorique. */
const entrees = tablette1.sessions.flatMap((s) => Object.values(s.data).flatMap((o) => Object.values(o)));
t('des probes le matin et l’après-midi', [entrees.some((e) => e.creneau === 'matin'), entrees.some((e) => e.creneau === 'aprem')], [true, true]);
t('des cotations par intervalle avec période saisie à la main', entrees.some((e) => (e.segments || []).length), true);
t('des mesures auxiliaires validées, et d’autres jamais mesurées', [
  entrees.some((e) => e.mesures.compteur.valideA || e.mesures.chrono.valideA),
  entrees.some((e) => !e.mesures.compteur.valideA && !e.mesures.chrono.valideA),
], [true, true]);
/* `trials` ne porte pas la même chose selon le mode : en Équilibre, des objets
   `{ steps }` ; en Essais, des codes de cotation et des `null` pour les essais
   prévus mais non cotés (`Array(trialCount).fill(null)`). Balayer toutes les
   entrées sans distinction faisait donc lire `.steps` sur `null` et cette suite
   plantait avant d'annoncer quoi que ce soit. */
t('des étapes d’Équilibre écartées du calcul', entrees.some((e) => (e.trials || []).some((tr) => tr && tr.steps && Object.values(tr.steps).some((x) => x.outcome === 'manque'))), true);

/* Suivi continu : la frise se lit en segments, et un segment n'est borné que
   par le relevé suivant ou par une clôture. Sans journée laissée ouverte, le
   rendu en hachures et la ligne « N relevés sans durée connue » ne se
   montrent pas. */
const parPersonneJour = new Map();
tablette1.suivi.filter((r) => r.suiviId === 'principal').forEach((r) => {
  const cle = `${r.studentId}|${r.timestamp.slice(0, 10)}`;
  if (!parPersonneJour.has(cle)) parPersonneJour.set(cle, { releves: 0, cloture: false });
  const e = parPersonneJour.get(cle);
  if (r.fin) e.cloture = true;
  else e.releves += 1;
});
t('des journées clôturées', [...parPersonneJour.values()].some((e) => e.cloture), true);
t('des journées laissées ouvertes, dont le dernier segment reste sans durée', [...parPersonneJour.values()].some((e) => e.releves && !e.cloture), true);
const clesAxe = new Set(tablette1.axesSuivi.find((a) => a.id === 'principal').criteres.map((c) => c.k));
t('des relevés portent un critère retiré de la configuration', tablette1.suivi.some((r) => r.suiviId === 'principal' && !r.fin && !clesAxe.has(r.critere)), true);
t('deux axes de suivi sont relevés', new Set(relevesEtat.map((r) => r.suiviId)).size, 2);
/* Sans atelier ni intervenant sur le relevé, Explorer ne sait pas croiser une
   durée de suivi par atelier ou par intervenant : les deux mesures restent
   vides quel que soit le volume de relevés. */
t('des relevés rattachés à une séance, pour croiser le suivi par atelier', relevesEtat.some((r) => r.atelierId && r.intervenantId), true);

/* ==================== Compteurs d'occurrence ====================
   Le compteur « Sollicitations » était déclaré sur les dix personnes et ne
   recevait aucun appui : toute la chaîne compteurs de Manager restait morte
   pendant une démonstration. Ce bloc vérifie que le jeu l'exerce vraiment. */
t('les dix personnes déclarent un compteur', tablette1.students.every((s) => (s.compteurs || []).length === 1), true);
t('des appuis de compteur existent', appuisCompteur.length > 0, true);
t(
  'chaque appui vise un compteur déclaré sur sa personne',
  appuisCompteur.every((r) => {
    const st = tablette1.students.find((x) => x.id === r.studentId);
    return st && (st.compteurs || []).some((c) => c.id === r.compteurId);
  }),
  true
);
t('un appui ne porte ni critère ni clôture', appuisCompteur.every((r) => r.critere === undefined && r.fin === undefined), true);
/* Un appui = un enregistrement, jamais un total : deux appuis de la même
   personne le même jour sont deux lignes. */
const joursAvecPlusieursAppuis = new Set();
const parPersonneJourCompteur = new Map();
appuisCompteur.forEach((r) => {
  const cle = `${r.studentId}|${r.timestamp.slice(0, 10)}`;
  parPersonneJourCompteur.set(cle, (parPersonneJourCompteur.get(cle) || 0) + 1);
  if (parPersonneJourCompteur.get(cle) > 1) joursAvecPlusieursAppuis.add(cle);
});
t('des journées portent plusieurs appuis, un par ligne', joursAvecPlusieursAppuis.size > 0, true);
t('des journées sans aucun appui', parPersonneJourCompteur.size < tablette1.students.length * calendrier.jours.length, true);
/* Les deux gestes de DatABA : la pastille sur le moment, la saisie après coup.
   Manager les distingue depuis qu'il expose `origine` comme axe de croisement. */
t('les deux gestes de saisie sont représentés', new Set(appuisCompteur.map((r) => r.source)).size, 2);
/* Sans atelier ni intervenant, la mesure « occurrences comptées » d'Explorer
   existe mais ne se croise sur aucun de ces deux axes. */
t('des appuis rattachés à une séance', appuisCompteur.some((r) => r.atelierId && r.intervenantId), true);
t('et des appuis hors séance', appuisCompteur.some((r) => !r.atelierId), true);
/* Un compteur déclaré et jamais utilisé n'existerait nulle part ailleurs dans
   le jeu : Manager doit le rendre comme une série vide, pas comme une erreur. */
const personnesAvecAppuis = new Set(appuisCompteur.map((r) => r.studentId));
t('une personne garde un compteur déclaré mais jamais utilisé',
  tablette1.students.filter((s) => !personnesAvecAppuis.has(s.id)).length, 1);
/* Des trajectoires distinctes, sans quoi le graphique d'un compteur n'a rien à
   montrer qu'un autre ne montre déjà. */
const volumes = tablette1.students.map((s) => appuisCompteur.filter((r) => r.studentId === s.id).length).filter(Boolean);
t('les volumes diffèrent d’une personne à l’autre', new Set(volumes).size > 3, true);

/* La période par défaut de tous les écrans de Manager est de trente jours.
   Un jeu dense sur trois mois mais creux sur le dernier ne montre rien à
   l'ouverture — et c'est l'ouverture qu'on regarde en démonstration. */
const ilya30 = maintenant - 30 * 86400000;
const recentes = seancesAsc.filter((s) => new Date(s.date).getTime() >= ilya30);
t('au moins vingt séances dans les trente derniers jours', recentes.length >= 20, true);
const objectifsRecents = new Map();
recentes.forEach((s) => {
  Object.entries(s.selectedObjectives).forEach(([sid, oids]) => {
    if (!objectifsRecents.has(sid)) objectifsRecents.set(sid, new Set());
    oids.forEach((oid) => objectifsRecents.get(sid).add(s.objectiveSnapshot[oid].name));
  });
});
/* Le radar de l'écran Personnes exige trois objectifs cotés sur la période
   pour dessiner quoi que ce soit. */
t(
  'chaque personne a au moins trois objectifs cotés dans les trente derniers jours',
  tablette1.students.every((p) => (objectifsRecents.get(p.id) || new Set()).size >= 3),
  true
);

/* Les courbes superposées (tendance, moyenne mobile, médiane) ne se calculent
   qu'à partir de trois points. */
let courbesSuffisantes = true;
tablette1.students.forEach((p) => {
  const cotes = p.objectives.filter((o) => objectivePoints(o, p.id, seancesAsc, tablette1.guidances).length);
  if (cotes.filter((o) => objectivePoints(o, p.id, seancesAsc, tablette1.guidances).length >= 3).length < 3) courbesSuffisantes = false;
});
t('chaque personne a au moins trois objectifs à trois points ou plus', courbesSuffisantes, true);

/* ==================== 5. Cohérence des scores ==================== */

/* Les scores tombent-ils bien dans une échelle exploitable ? Un objectif dont
   toutes les cotations rendent `null` n'apparaît nulle part et ne se voit pas
   dans un contrôle d'état. */
let scoresValides = true;
seancesAsc.forEach((s) => {
  Object.entries(s.data).forEach(([sid, parObjectif]) => {
    Object.entries(parObjectif).forEach(([oid, entry]) => {
      const obj = s.objectiveSnapshot[oid];
      const sc = objectiveScore(obj, entry, tablette1.guidances);
      if (!sc) return;
      if (sc.percent && (sc.value < 0 || sc.value > 100)) scoresValides = false;
      if (!sc.percent && sc.value < 0) scoresValides = false;
    });
  });
});
t('aucun score hors échelle', scoresValides, true);
t(
  'les cotations par intervalle totalisent bien une durée',
  entrees.filter((e) => e.marks && Object.keys(e.marks).length).every((e) => intervalTotals({ config: { intervalSeconds: 60 } }, e).total > 0),
  true
);
t(
  'les cotations d’Équilibre ont des étapes notées',
  entrees.filter((e) => Array.isArray(e.trials) && e.trials[0] && e.trials[0].steps)
    .every((e) => balanceStats({ config: { steps: Object.keys(e.trials[0].steps).map((id) => ({ id })) } }, e).notes >= 0),
  true
);
/* Le critère d'acquisition de la tablette et celui de Manager doivent rendre
   le même verdict : c'est ce qui empêche un bilan de contredire l'écran qui a
   produit les données. On le vérifie sur les objectifs classés « acquis ». */
let verdictsAccordes = true;
tablette1.students.forEach((p) => {
  p.objectives.forEach((o) => {
    if (etatParCouple.get(`${p.initials}|${o.name}`) !== 'acquis') return;
    const st = masteryStatus(o, objectivePoints(o, p.id, seancesAsc, tablette1.guidances));
    if (!st || !st.mastered) verdictsAccordes = false;
  });
});
t('la tablette confirme chaque objectif que Manager dirait acquis', verdictsAccordes, true);

/* ==================== 6. Fiabilité inter-observateurs ==================== */

/* `trouverPaires` (Manager) apparie deux séances de double cotation le même
   jour, sur un atelier de même NOM, venant de deux appareils différents.
   Une seule tablette ne peut donc rien peupler ici, quel qu'en soit le
   contenu : c'est toute la raison d'être du second fichier. */
t('le second fichier vient d’un autre appareil', [tablette1.appareil, tablette2.appareil], ['demo-tablette-1', 'demo-tablette-2']);
t('il ne contient que des séances de double cotation', tablette2.sessions.length && tablette2.sessions.every((s) => s.doubleCotation), true);

const nomsAteliers1 = new Map(tablette1.ateliers.map((a) => [a.id, a.name]));
const nomsAteliers2 = new Map(tablette2.ateliers.map((a) => [a.id, a.name]));
const paires = [];
tablette2.sessions.forEach((s2) => {
  const jour = s2.date.slice(0, 10);
  const s1 = tablette1.sessions.find(
    (s) => s.doubleCotation && s.date.slice(0, 10) === jour && s.atelierId && nomsAteliers1.get(s.atelierId) === nomsAteliers2.get(s2.atelierId)
  );
  if (s1) paires.push([s1, s2]);
});
t('chaque séance du second fichier trouve sa jumelle, même jour et même atelier', paires.length, tablette2.sessions.length);

const initiales1 = new Map(tablette1.students.map((s) => [s.id, s.initials]));
const initiales2 = new Map(tablette2.students.map((s) => [s.id, s.initials]));
t(
  'les personnes se rapprochent par leurs initiales, pas par leur identifiant',
  tablette2.students.every((s) => tablette1.students.some((x) => x.initials === s.initials && x.id !== s.id)),
  true
);

/* Accord essai par essai, comme le calcule `ioaPourEntree` pour un objectif
   coté en essais. */
const accords = paires.map(([s1, s2]) => {
  let communs = 0;
  let total = 0;
  Object.entries(s2.selectedObjectives).forEach(([sid2, oids2]) => {
    /* Le rapprochement se fait par initiales, exactement comme Manager :
       les deux appareils ne partagent aucun identifiant. */
    const ini = initiales2.get(sid2);
    const idCote1 = [...initiales1.keys()].find((id) => initiales1.get(id) === ini && s1.data[id]);
    if (!idCote1) return;
    oids2.forEach((oid2) => {
      const nom = s2.objectiveSnapshot[oid2].name;
      const oid1 = Object.keys(s1.objectiveSnapshot).find((k) => s1.objectiveSnapshot[k].name === nom);
      if (!oid1) return;
      const a = (s1.data[idCote1] || {})[oid1];
      const b = s2.data[sid2][oid2];
      if (!a || !b || !Array.isArray(a.trials) || !Array.isArray(b.trials)) return;
      a.trials.forEach((code, i) => {
        if (code == null || b.trials[i] == null) return;
        total += 1;
        if (code === b.trials[i]) communs += 1;
      });
    });
  });
  return total ? Math.round((communs / total) * 100) : null;
}).filter((x) => x !== null);

t('chaque paire donne un accord calculable', accords.length, paires.length);
/* Trois niveaux d'accord : Manager colore au-dessus de 80 % puis de 60 %.
   Une démonstration qui ne montre qu'un accord parfait ne dit rien de
   l'outil. */
t('un accord élevé, au-dessus du seuil vert', accords.some((a) => a >= 80), true);
t('un accord intermédiaire', accords.some((a) => a >= 55 && a < 80), true);
t('un accord bas, sous le seuil ambre', accords.some((a) => a < 55), true);

/* ==================== 7. Repères de phase ====================
   DatABA trace désormais une verticale datée à chaque changement de phase
   (`reperesDePhase`, ajouté par 7e8235a), et Manager fait le même calcul de
   son côté — mais seulement si `phaseHistory` porte des dates.
   `reperesDePhase` est désormais extraite de src/App.jsx comme le reste de
   cette suite, plutôt que recopiée à la main. */

/* Ligne de base : 3 à 5 cotations avant le premier repère daté, sur tout
   objectif qui en a reçu assez pour en porter une (voir nBaseEffectif —
   un objectif trop peu coté n'a pas à en avoir). */
let baselinesValides = true;
let baselineRencontree = false;
tablette1.students.forEach((p) => {
  p.objectives.forEach((o) => {
    const datees = o.phaseHistory.filter((ph) => ph.date);
    if (!datees.length) return;
    const points = objectivePoints(o, p.id, seancesAsc, tablette1.guidances);
    const avant = points.filter((pt) => new Date(pt.date) < new Date(datees[0].date)).length;
    if (avant > 0) { baselineRencontree = true; if (avant < 3 || avant > 5) baselinesValides = false; }
  });
});
t('une ligne de base a été rencontrée', baselineRencontree, true);
t('chaque ligne de base rencontrée compte 3 à 5 cotations', baselinesValides, true);

/* La première entrée n'est jamais datée (c'est la phase d'origine, elle ne
   marque aucun changement) ; toute entrée suivante l'est, et dans l'ordre. */
let premiereJamaisDatee = true;
let datesCroissantes = true;
tablette1.students.forEach((p) => {
  p.objectives.forEach((o) => {
    if (o.phaseHistory[0].date !== null) premiereJamaisDatee = false;
    for (let i = 1; i < o.phaseHistory.length; i++) {
      const prec = o.phaseHistory[i - 1].date;
      const cour = o.phaseHistory[i].date;
      if (prec && cour && new Date(cour) < new Date(prec)) datesCroissantes = false;
    }
  });
});
t('la première entrée de chaque historique n’est jamais datée', premiereJamaisDatee, true);
t('les entrées datées se succèdent dans l’ordre chronologique', datesCroissantes, true);

/* Au moins un repère de procédure existe, et il n'écrase pas la phase de
   fond : currentPhase (voir src/App.jsx) ignore les entrées `repere: true`. */
function phaseCourante(histo) {
  for (let i = histo.length - 1; i >= 0; i--) if (!histo[i].repere) return histo[i];
  return histo[histo.length - 1];
}
const tousLesObjectifs = tablette1.students.flatMap((p) => p.objectives);
t('au moins un objectif porte un repère de procédure', tousLesObjectifs.some((o) => o.phaseHistory.some((ph) => ph.repere)), true);
t(
  'la phase courante d’un objectif n’est jamais un repère de procédure',
  tousLesObjectifs.every((o) => !phaseCourante(o.phaseHistory).repere),
  true
);
t('au moins un objectif a rejoint le Maintien avant la fin de la période', tousLesObjectifs.some((o) => o.phaseHistory.some((ph) => ph.name === 'Maintien')), true);

/* Manager retrouve bien un repère par changement daté, au bon point. */
let managerVoitUnRepere = false;
tablette1.students.forEach((p) => {
  p.objectives.forEach((o) => {
    if (!o.phaseHistory.some((ph) => ph.date)) return;
    const points = objectivePoints(o, p.id, seancesAsc, tablette1.guidances);
    if (reperesDePhase(points, o.phaseHistory).length > 0) managerVoitUnRepere = true;
  });
});
t('Manager retrouve au moins un repère daté sur une courbe', managerVoitUnRepere, true);

/* L'instantané d'une séance ne peut pas connaître un changement à venir :
   aucune entrée de son phaseHistory ne doit être postérieure à sa date. */
let snapshotsSansAnticipation = true;
let snapshotsSansRepereEnPhase = true;
tablette1.sessions.forEach((s) => {
  Object.values(s.objectiveSnapshot).forEach((snap) => {
    (snap.phaseHistory || []).forEach((ph) => {
      if (ph.date && new Date(ph.date) > new Date(s.date)) snapshotsSansAnticipation = false;
    });
    if (phaseCourante(snap.phaseHistory).repere) snapshotsSansRepereEnPhase = false;
  });
});
t('aucun instantané de séance ne porte un changement de phase à venir', snapshotsSansAnticipation, true);
t('aucun instantané n’affiche un repère de procédure comme phase courante', snapshotsSansRepereEnPhase, true);

/* ==================== 8. Le fichier versionné n'a pas divergé ==================== */

/* Un `demo/*.json` retouché à la main, ou un script modifié sans
   régénération, se voit ici et nulle part ailleurs. La comparaison se fait à
   la date de fin inscrite dans le fichier, pas à celle du jour : c'est ce qui
   permet au fichier de vieillir sans faire échouer la suite. */
try {
  const brut = readFileSync(join(ici, '..', 'demo', 'aba-demo-tablette-1.json'), 'utf8');
  const commite = JSON.parse(brut);
  const finCommitee = commite.exportedAt.slice(0, 10);
  const rejoue = genererDemo({ fin: finCommitee });
  t('le fichier versionné correspond au script qui l’a produit', JSON.stringify(rejoue.tablette1), JSON.stringify(commite));
  const brut2 = readFileSync(join(ici, '..', 'demo', 'aba-demo-tablette-2.json'), 'utf8');
  t('le second fichier versionné aussi', JSON.stringify(rejoue.tablette2), brut2.trim());
} catch (e) {
  if (e && e.code === 'ENOENT') {
    console.log('OK   demo/ absent : rien à comparer (lancer scripts/generer-demo.mjs)');
    ok++;
  } else {
    throw e;
  }
}

console.log(`\n${ok} contrôle(s) au vert, ${ko} en échec`);
if (ko) process.exit(1);
