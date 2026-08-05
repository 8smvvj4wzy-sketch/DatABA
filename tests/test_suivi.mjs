/* Logique de données du suivi continu (ex-suivi de stabilité) : critères
   paramétrables, état du jour, dormance, segments de la frise, lignes
   d'export et migrations depuis l'ancien format.

   Les fonctions ne sont pas recopiées ici : elles sont extraites de
   src/App.jsx et évaluées telles quelles. Une copie dans le test finirait par
   diverger du code livré et validerait alors une implémentation qui n'existe
   plus — le contraire de ce qu'on attend d'une suite de tests. */

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

const NOMS = [
  'DEFAULT_CRITERES_SUIVI', 'CRITERE_INCONNU', 'DEFAULT_SUIVIS',
  'metaCritere', 'axeDe', 'memeJour', 'relevesDuJour', 'critereCourant',
  'suiviDormant', 'segmentsJournee', 'lignesSuiviExport',
  'migrerReleves', 'migrerStudentsSuivi', 'migrerAxesSuivi',
  'jourLocal', 'dureeReleve', 'journeesSuivi', 'migrerEnvoisCrises',
  'grouperParJour', 'libelleJour', 'segmentAppareil', 'nomFichier', 'timeShort',
  'compteurDe', 'nomAxe', 'nomCompteur',
];
const code = `const CRISIS = '#B3261E';\nconst CAT_TEAL = ${extraireLigne('CAT_TEAL')};\nconst CAT_INDIGO = ${extraireLigne('CAT_INDIGO')};\nconst CAT_AMBER = ${extraireLigne('CAT_AMBER')};\nconst CAT_CORAL = ${extraireLigne('CAT_CORAL')};\nconst CAT_VIOLET = ${extraireLigne('CAT_VIOLET')};\nconst CAT_CYAN = ${extraireLigne('CAT_CYAN')};\nconst CAT_LILAC = ${extraireLigne('CAT_LILAC')};\nconst CAT_SLATE = ${extraireLigne('CAT_SLATE')};\nconst PASTILLE_PAVES_MAX = ${extraireLigne('PASTILLE_PAVES_MAX')};\nconst COMPTEUR_INCONNU = ${extraireLigne('COMPTEUR_INCONNU')};\n${NOMS.map(extraire).join('\n')}\nreturn { ${NOMS.join(', ')}, PASTILLE_PAVES_MAX };`;
// eslint-disable-next-line no-new-func
const {
  DEFAULT_CRITERES_SUIVI, CRITERE_INCONNU, DEFAULT_SUIVIS,
  metaCritere, axeDe, memeJour, relevesDuJour, critereCourant,
  suiviDormant, segmentsJournee, lignesSuiviExport,
  migrerReleves, migrerStudentsSuivi, migrerAxesSuivi,
  jourLocal, dureeReleve, journeesSuivi, migrerEnvoisCrises,
  grouperParJour, libelleJour, segmentAppareil, nomFichier, timeShort, PASTILLE_PAVES_MAX,
  compteurDe, nomAxe, nomCompteur,
} = new Function(code)();

/* Le nombre d'axes n'est plus borné : seule la pastille de la barre du bas
   l'est, et c'est un plafond d'affichage. */
t('la pastille montre au plus trois pavés', PASTILLE_PAVES_MAX, 3);
t('migrerAxesSuivi replie sur les axes par défaut si rien n\'est stocké', migrerAxesSuivi(undefined), DEFAULT_SUIVIS);
t('migrerAxesSuivi replie sur les axes par défaut si la liste est vide', migrerAxesSuivi([]), DEFAULT_SUIVIS);
t('migrerAxesSuivi complète un axe sans critères', migrerAxesSuivi([{ id: 'x', nom: 'Test' }]), [{ id: 'x', nom: 'Test', criteres: [] }]);
t('migrerAxesSuivi écarte un critère sans clé', migrerAxesSuivi([{ id: 'x', nom: 'Test', criteres: [{ l: 'Sans clé' }, { k: 'ok', l: 'Ok', color: '#000000' }] }])[0].criteres.map((c) => c.k), ['ok']);
/* Un axe créé mais pas encore renommé porte un nom vide (champ à placeholder,
   pas de valeur à effacer) : la migration ne doit pas le confondre avec un
   axe stocké sans le champ du tout, sous peine de le re-remplir à chaque
   rechargement. */
t('migrerAxesSuivi préserve un nom volontairement vide', migrerAxesSuivi([{ id: 'x', nom: '', criteres: [] }])[0].nom, '');

/* ==================== Critères par défaut ==================== */
t('quatre critères par défaut, et pas un de plus', DEFAULT_CRITERES_SUIVI.map((c) => c.k), ['stable', 'pre-crise', 'crise', 'post-crise']);
t('chaque critère a une couleur', DEFAULT_CRITERES_SUIVI.every((c) => /^#[0-9A-F]{6}$/i.test(c.color)), true);
t('un axe par défaut, nommé', DEFAULT_SUIVIS.map((s) => s.id), ['principal']);
t("l'axe par défaut porte les critères par défaut", DEFAULT_SUIVIS[0].criteres.map((c) => c.k), ['stable', 'pre-crise', 'crise', 'post-crise']);

/* ==================== metaCritere / axeDe ==================== */
t('un critère existant se retrouve par sa clé', metaCritere(DEFAULT_CRITERES_SUIVI, 'pre-crise').l, 'Pré-crise');
t('une clé inconnue replie sur "Critère retiré"', metaCritere(DEFAULT_CRITERES_SUIVI, 'sieste'), CRITERE_INCONNU);
t('une liste vide replie aussi', metaCritere([], 'stable'), CRITERE_INCONNU);
t('une liste absente ne plante pas', metaCritere(undefined, 'stable'), CRITERE_INCONNU);
t('un renommage ne change pas la clé retrouvée', metaCritere([{ k: 'stable', l: 'Posé', color: '#000000' }], 'stable').l, 'Posé');

t('un axe existant se retrouve par son id', axeDe(DEFAULT_SUIVIS, 'principal').id, 'principal');
t('un id inconnu renvoie null', axeDe(DEFAULT_SUIVIS, 'zzz'), null);
t('une liste d\'axes absente ne plante pas', axeDe(undefined, 'principal'), null);

/* ==================== memeJour ==================== */
t('même jour, heures différentes', memeJour(new Date(2026, 7, 3, 8, 0), new Date(2026, 7, 3, 23, 0)), true);
t('jours consécutifs, pas le même jour', memeJour(new Date(2026, 7, 3, 23, 59), new Date(2026, 7, 4, 0, 1)), false);
t('changement de mois détecté', memeJour(new Date(2026, 6, 31), new Date(2026, 7, 1)), false);

/* ==================== Relevés du jour / critère courant / dormance ====================
   Un relevé vaut jusqu'au suivant, mais seulement pour le jour en cours :
   c'est ce qui distingue le suivi continu de l'ancien suivi de stabilité, où
   le dernier relevé restait affiché quel que soit son âge. */
const R = (studentId, timestamp, critere, extra) => ({ id: `${studentId}-${timestamp}-${critere}`, studentId, suiviId: 'principal', timestamp, critere, source: 'pastille', ...extra });
const CLOTURE = (studentId, timestamp) => ({ id: `${studentId}-${timestamp}-fin`, studentId, suiviId: 'principal', timestamp, critere: null, fin: true, source: 'cloture' });

const refAujourdhui = new Date('2026-08-03T14:00:00.000Z');

const relevesJour = [
  R('a', '2026-08-03T09:00:00.000Z', 'stable'),
  R('b', '2026-08-03T09:05:00.000Z', 'crise'),
  R('a', '2026-08-03T11:30:00.000Z', 'pre-crise'),
  R('a', '2026-08-03T10:00:00.000Z', 'crise'),
];

t('aucun relevé : dormant', critereCourant([], 'a', 'principal', refAujourdhui), null);
t('tableau absent : pas de plantage', critereCourant(undefined, 'a', 'principal', refAujourdhui), null);
t('personne sans relevé : dormant', critereCourant(relevesJour, 'z', 'principal', refAujourdhui), null);
t('le plus récent du jour gagne, même arrivé avant dans le tableau', critereCourant(relevesJour, 'a', 'principal', refAujourdhui).critere, 'pre-crise');
t("les relevés des autres personnes ne débordent pas", critereCourant(relevesJour, 'b', 'principal', refAujourdhui).critere, 'crise');
t('un horodatage illisible est ignoré', critereCourant([...relevesJour, R('a', 'jamais', 'stable')], 'a', 'principal', refAujourdhui).critere, 'pre-crise');
t('un relevé nul ne fait pas tomber le calcul', critereCourant([null, ...relevesJour], 'a', 'principal', refAujourdhui).critere, 'pre-crise');

t("un relevé d'hier seul : dormant aujourd'hui — changement de comportement assumé", critereCourant([R('c', '2026-08-02T09:00:00.000Z', 'stable')], 'c', 'principal', refAujourdhui), null);
t("le même relevé, vu le jour même, n'est pas dormant", critereCourant([R('c', '2026-08-02T09:00:00.000Z', 'stable')], 'c', 'principal', new Date('2026-08-02T20:00:00.000Z')).critere, 'stable');

t('une clôture en dernier renvoie dormant', critereCourant([...relevesJour, CLOTURE('a', '2026-08-03T12:00:00.000Z')], 'a', 'principal', refAujourdhui), null);
t('un nouveau relevé après clôture relance le suivi', critereCourant([...relevesJour, CLOTURE('a', '2026-08-03T12:00:00.000Z'), R('a', '2026-08-03T13:00:00.000Z', 'stable')], 'a', 'principal', refAujourdhui).critere, 'stable');

t('un axe différent de la même personne ne se mélange pas', critereCourant([R('a', '2026-08-03T09:00:00.000Z', 'stable', { suiviId: 'secondaire' })], 'a', 'principal', refAujourdhui), null);

t('dormant quand aucun relevé du jour', suiviDormant([], 'a', 'principal', refAujourdhui), true);
t('pas dormant avec un relevé du jour', suiviDormant(relevesJour, 'a', 'principal', refAujourdhui), false);
t('dormant après clôture', suiviDormant([...relevesJour, CLOTURE('a', '2026-08-03T12:00:00.000Z')], 'a', 'principal', refAujourdhui), true);

/* ==================== relevesDuJour ==================== */
t('relevés du jour triés par heure croissante', relevesDuJour(relevesJour, 'a', 'principal', refAujourdhui).map((r) => r.critere), ['stable', 'crise', 'pre-crise']);
t('relevés du jour : rien pour une personne absente', relevesDuJour(relevesJour, 'z', 'principal', refAujourdhui), []);

/* ==================== Segments de la frise ==================== */
const seg1 = segmentsJournee([R('a', '2026-08-03T09:00:00.000Z', 'stable')], 'a', 'principal', refAujourdhui, refAujourdhui.getTime());
t('un seul relevé : un segment ouvert jusqu\'à maintenant', seg1.length, 1);
t('durée du segment ouvert = maintenant - début', seg1[0].ms, refAujourdhui.getTime() - new Date('2026-08-03T09:00:00.000Z').getTime());

const seg3 = segmentsJournee(relevesJour, 'a', 'principal', refAujourdhui, refAujourdhui.getTime());
t('trois relevés : trois segments contigus', seg3.length, 3);
t('la somme des segments couvre la durée totale', seg3.reduce((n, s) => n + s.ms, 0), refAujourdhui.getTime() - new Date('2026-08-03T09:00:00.000Z').getTime());

const segClos = segmentsJournee([...relevesJour, CLOTURE('a', '2026-08-03T12:00:00.000Z')], 'a', 'principal', refAujourdhui, refAujourdhui.getTime());
t('une clôture ferme le dernier segment, pas un segment en soi', segClos.length, 3);
t('le dernier segment est borné par la clôture, pas par "maintenant"', segClos[2].fin, new Date('2026-08-03T12:00:00.000Z').getTime());

const segPasse = segmentsJournee([R('c', '2026-08-01T09:00:00.000Z', 'stable')], 'c', 'principal', new Date('2026-08-01T20:00:00.000Z'), null);
t("un jour passé non clôturé : durée inconnue, jamais étirée jusqu'à minuit", segPasse[0].ms, null);

t('jour sans relevé : aucun segment', segmentsJournee([], 'a', 'principal', refAujourdhui, refAujourdhui.getTime()), []);

/* ==================== Lignes d'export ==================== */
const suivis = DEFAULT_SUIVIS;
const students = [{ id: 'a', initials: 'A.B.' }, { id: 'b', initials: 'C.D.' }];

const lignesA = lignesSuiviExport(relevesJour, students, suivis, null);
t('une ligne par relevé', lignesA.length, relevesJour.length);
t('tri chronologique croissant', lignesA.map((l) => l[1]), relevesJour.slice().sort((x, y) => new Date(x.timestamp) - new Date(y.timestamp)).map((r) => timeShort(r.timestamp)));

const lignesFiltrees = lignesSuiviExport(relevesJour, students, suivis, ['b']);
t('filtrage par personne', lignesFiltrees.every((l) => l[3] === 'C.D.'), true);
t('filtrage par personne : le bon nombre de lignes', lignesFiltrees.length, relevesJour.filter((r) => r.studentId === 'b').length);

const dernierRelevePasse = [R('a', '2026-08-01T09:00:00.000Z', 'stable')];
const ligneOuverte = lignesSuiviExport(dernierRelevePasse, students, suivis, null);
t('dernier relevé sans suivant : durée vide', ligneOuverte[0][6], '');

const avecSuivant = [R('a', '2026-08-01T09:00:00.000Z', 'stable'), R('a', '2026-08-01T09:30:00.000Z', 'crise')];
const ligneDuree = lignesSuiviExport(avecSuivant, students, suivis, null);
t('durée en minutes jusqu\'au relevé suivant', ligneDuree[0][6], 30);

const avecCloture = [R('a', '2026-08-01T09:00:00.000Z', 'stable'), CLOTURE('a', '2026-08-01T09:15:00.000Z')];
const ligneCloture = lignesSuiviExport(avecCloture, students, suivis, null);
t('la clôture porte un libellé dédié', ligneCloture[1][5], '— fin —');
t('la clôture ferme la durée du relevé précédent', ligneCloture[0][6], 15);

const critereSupprime = [R('a', '2026-08-01T09:00:00.000Z', 'disparu')];
const ligneRetire = lignesSuiviExport(critereSupprime, students, suivis, null);
t('un critère supprimé reste traçable avec sa clé brute', ligneRetire[0][5], 'Critère retiré (disparu)');

/* ==================== Migrations ==================== */
t('un relevé ancien format gagne suiviId et critere', migrerReleves([{ id: 'x', studentId: 'a', timestamp: 't', etat: 'stable', source: 'pastille' }]), [{ id: 'x', studentId: 'a', suiviId: 'principal', timestamp: 't', critere: 'stable', source: 'pastille' }]);
t('un relevé déjà au nouveau format n\'est pas altéré', migrerReleves([R('a', 't', 'stable')]), [R('a', 't', 'stable')]);
t('migration idempotente', migrerReleves(migrerReleves([{ id: 'x', studentId: 'a', timestamp: 't', etat: 'stable' }])), migrerReleves([{ id: 'x', studentId: 'a', timestamp: 't', etat: 'stable' }]));
t('un relevé nul ou sans personne est écarté', migrerReleves([null, { timestamp: 't' }, R('a', 't', 'stable')]), [R('a', 't', 'stable')]);
t('tableau absent : pas de plantage', migrerReleves(undefined), []);

t('suiviStabilite=true devient axesSuivi=[principal]', migrerStudentsSuivi([{ id: 'a', initials: 'A.', suiviStabilite: true }]), [{ id: 'a', initials: 'A.', suivisActifs: ['principal'] }]);
t('suiviStabilite=false devient axesSuivi=[]', migrerStudentsSuivi([{ id: 'a', initials: 'A.', suiviStabilite: false }]), [{ id: 'a', initials: 'A.', suivisActifs: [] }]);
t('absence de suiviStabilite devient aussi axesSuivi=[]', migrerStudentsSuivi([{ id: 'a', initials: 'A.' }]), [{ id: 'a', initials: 'A.', suivisActifs: [] }]);
t('un élève déjà migré n\'est pas altéré', migrerStudentsSuivi([{ id: 'a', initials: 'A.', suivisActifs: ['principal'] }]), [{ id: 'a', initials: 'A.', suivisActifs: ['principal'] }]);
t('migration des élèves idempotente', migrerStudentsSuivi(migrerStudentsSuivi([{ id: 'a', initials: 'A.', suiviStabilite: true }])), migrerStudentsSuivi([{ id: 'a', initials: 'A.', suiviStabilite: true }]));

/* ==================== Non-régression : regroupement, libellés, nommage ==================== */
const S = (date) => ({ id: date, date });
const seances = [
  S('2026-08-03T09:00:00.000Z'),
  S('2026-08-01T14:00:00.000Z'),
  S('2026-08-03T15:00:00.000Z'),
  S('2026-07-28T08:00:00.000Z'),
];
const groupes = grouperParJour(seances, (s) => s.date);
t('un groupe par jour distinct', groupes.length, 3);
t('aucune entrée perdue au regroupement', groupes.reduce((n, g) => n + g.items.length, 0), seances.length);

const ref = new Date(2026, 7, 3, 10, 0, 0);
t("le jour même se dit aujourd'hui", libelleJour(new Date(2026, 7, 3, 8, 0, 0), ref), "Aujourd'hui");
t('la veille se dit hier', libelleJour(new Date(2026, 7, 2, 23, 0, 0), ref), 'Hier');

t('un nom d\'appareil devient un segment propre', segmentAppareil('Tablette 2'), 'tablette-2-');
const jour = new Date().toISOString().slice(0, 10);
t('appareil puis date dans le nom', nomFichier('pour-manager', 'Tablette 2', 'json'), `pour-manager-tablette-2-${jour}.json`);

/* ==================== jourLocal ==================== */

t('jour local d\'un horodatage', jourLocal(new Date(2026, 7, 3, 9, 30).toISOString()), '2026-08-03');
t('une fin de soirée reste sur son jour local', jourLocal(new Date(2026, 7, 3, 23, 45).toISOString()), '2026-08-03');
t('horodatage invalide', jourLocal('pas une date'), null);

/* ==================== dureeReleve ====================
   C'est ce calcul qu'emprunte la fiche crise ouverte depuis le suivi continu :
   de l'appui au passage à l'état suivant. */

const H = (h, m = 0) => new Date(2026, 7, 3, h, m).toISOString();
const suite = [
  { id: 'r1', studentId: 's1', suiviId: 'principal', timestamp: H(9), critere: 'stable' },
  { id: 'r2', studentId: 's1', suiviId: 'principal', timestamp: H(9, 30), critere: 'crise' },
  { id: 'r3', studentId: 's1', suiviId: 'principal', timestamp: H(9, 47), critere: 'post-crise' },
  { id: 'r4', studentId: 's1', suiviId: 'second', timestamp: H(9, 35), critere: 'a' },
  { id: 'r5', studentId: 's2', suiviId: 'principal', timestamp: H(9, 32), critere: 'stable' },
];

t('durée jusqu\'au relevé suivant du même axe', dureeReleve(suite, 'r2'), 17 * 60000);
t('un relevé d\'un autre axe ne borne rien', dureeReleve(suite, 'r4'), null);
t('un relevé d\'une autre personne ne borne rien', dureeReleve(suite, 'r5'), null);
t('le dernier relevé n\'a pas de durée plutôt qu\'une durée nulle', dureeReleve(suite, 'r3'), null);
t('une clôture borne le segment comme n\'importe quel successeur',
  dureeReleve([...suite, { id: 'r6', studentId: 's1', suiviId: 'principal', timestamp: H(10), critere: null, fin: true }], 'r3'),
  13 * 60000);
t('une clôture n\'a elle-même pas de durée',
  dureeReleve([...suite, { id: 'r6', studentId: 's1', suiviId: 'principal', timestamp: H(10), critere: null, fin: true }], 'r6'),
  null);
t('un relevé inséré après coup raccourcit le segment qui le précède',
  dureeReleve([...suite, { id: 'r7', studentId: 's1', suiviId: 'principal', timestamp: H(9, 40), critere: 'stable' }], 'r2'),
  10 * 60000);
t('relevé inconnu', dureeReleve(suite, 'rX'), null);
t('liste vide', dureeReleve([], 'r1'), null);

/* ==================== journeesSuivi ==================== */

const axes = [{ id: 'principal', nom: 'État émotionnel', criteres: [] }, { id: 'second', nom: 'Engagement', criteres: [] }];
const eleves = [{ id: 's1', initials: 'J.D.' }, { id: 's2', initials: 'M.L.' }];
const veille = (h) => new Date(2026, 7, 2, h).toISOString();
const journalier = [
  ...suite,
  { id: 'r8', studentId: 's1', suiviId: 'principal', timestamp: veille(14), critere: 'stable' },
];

const js = journeesSuivi(journalier, eleves, axes, null);
t('une entrée par personne, axe et jour', js.length, 4);
t('les journées les plus récentes en tête', js[js.length - 1].jour, '2026-08-02');
t('la journée porte les initiales et le nom de l\'axe',
  js.filter((j) => j.studentId === 's1' && j.suiviId === 'principal' && j.jour === '2026-08-03')
    .map((j) => [j.initials, j.nomAxe, j.releves.length])[0],
  ['J.D.', 'État émotionnel', 3]);
t('un axe supprimé reste lisible',
  journeesSuivi([{ id: 'x', studentId: 's1', suiviId: 'disparu', timestamp: H(9) , critere: 'k' }], eleves, axes, null)[0].nomAxe,
  'Suivi retiré');
t('le filtre par personne s\'applique',
  journeesSuivi(journalier, eleves, axes, ['s2']).map((j) => j.studentId), ['s2']);
t('une journée n\'est envoyée que si tous ses relevés le sont',
  journeesSuivi(
    [{ id: 'a', studentId: 's1', suiviId: 'principal', timestamp: H(9), critere: 'stable', sentAt: H(20) },
     { id: 'b', studentId: 's1', suiviId: 'principal', timestamp: H(10), critere: 'stable' }],
    eleves, axes, null
  )[0].envoye,
  false);
t('journée entièrement envoyée',
  journeesSuivi(
    [{ id: 'a', studentId: 's1', suiviId: 'principal', timestamp: H(9), critere: 'stable', sentAt: H(20) }],
    eleves, axes, null
  )[0].envoye,
  true);
t('un horodatage invalide n\'ouvre pas de journée fantôme',
  journeesSuivi([{ id: 'a', studentId: 's1', suiviId: 'principal', timestamp: 'nawak', critere: 'stable' }], eleves, axes, null),
  []);

/* ==================== migrerEnvoisCrises ====================
   Une crise partie avec le rapport d'une séance envoyée l'a été aussi. Le
   reste n'est pas déductible et reste à transmettre. */

const seancesEnvoi = [{ id: 'se1', sentAt: '2026-08-03T18:00:00.000Z' }, { id: 'se2', sentAt: null }];

t('crise d\'une séance envoyée',
  migrerEnvoisCrises([{ id: 'c1', sessionId: 'se1' }], seancesEnvoi)[0].sentAt,
  '2026-08-03T18:00:00.000Z');
t('crise d\'une séance non envoyée', migrerEnvoisCrises([{ id: 'c2', sessionId: 'se2' }], seancesEnvoi)[0].sentAt, null);
t('crise hors séance', migrerEnvoisCrises([{ id: 'c3', sessionId: null }], seancesEnvoi)[0].sentAt, null);
t('un statut déjà posé n\'est jamais réécrit',
  migrerEnvoisCrises([{ id: 'c4', sessionId: 'se1', sentAt: null }], seancesEnvoi)[0].sentAt, null);
t('idempotente',
  migrerEnvoisCrises(migrerEnvoisCrises([{ id: 'c1', sessionId: 'se1' }], seancesEnvoi), seancesEnvoi)[0].sentAt,
  '2026-08-03T18:00:00.000Z');

console.log(`\n${ok} au vert, ${ko} en échec`);
process.exit(ko ? 1 : 0);
