/* Logique de données du suivi de stabilité, du regroupement par jour et du
   nommage des fichiers.

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

const NOMS = ['ETATS_STABILITE', 'metaStabilite', 'etatStabilite', 'grouperParJour', 'libelleJour', 'segmentAppareil', 'nomFichier'];
const code = `const CRISIS = '#B3261E';\n${NOMS.map(extraire).join('\n')}\nreturn { ${NOMS.join(', ')} };`;
// eslint-disable-next-line no-new-func
const { ETATS_STABILITE, metaStabilite, etatStabilite, grouperParJour, libelleJour, segmentAppareil, nomFichier } = new Function(code)();

/* ==================== Les quatre états ==================== */
t('quatre états, et pas un de plus', ETATS_STABILITE.map((e) => e.k), ['stable', 'pre-crise', 'crise', 'post-crise']);
t('chaque état a une couleur', ETATS_STABILITE.every((e) => /^#[0-9A-F]{6}$/i.test(e.color)), true);
t('un état inconnu ne renvoie rien', metaStabilite('sieste'), null);
t('libellé de pré-crise', metaStabilite('pre-crise').l, 'Pré-crise');

/* ==================== État courant ====================
   Un relevé vaut jusqu'au suivant : le courant est le plus récent, quel que
   soit l'ordre d'arrivée dans le tableau. */
const R = (studentId, timestamp, etat) => ({ id: `${studentId}-${timestamp}`, studentId, timestamp, etat, source: 'pastille' });

const releves = [
  R('a', '2026-08-03T09:00:00.000Z', 'stable'),
  R('b', '2026-08-03T09:05:00.000Z', 'crise'),
  R('a', '2026-08-03T11:30:00.000Z', 'pre-crise'),
  R('a', '2026-08-03T10:00:00.000Z', 'crise'),
];

t('aucun relevé : rien à afficher', etatStabilite([], 'a'), null);
t('tableau absent : pas de plantage', etatStabilite(undefined, 'a'), null);
t('personne sans relevé', etatStabilite(releves, 'z'), null);
t('le plus récent gagne, même arrivé avant dans le tableau', etatStabilite(releves, 'a').etat, 'pre-crise');
t('les relevés des autres ne débordent pas', etatStabilite(releves, 'b').etat, 'crise');
t('un horodatage illisible est ignoré', etatStabilite([...releves, R('a', 'jamais', 'stable')], 'a').etat, 'pre-crise');
t('un relevé nul ne fait pas tomber le calcul', etatStabilite([null, ...releves], 'a').etat, 'pre-crise');
t('un seul relevé suffit', etatStabilite([R('c', '2026-01-01T08:00:00.000Z', 'post-crise')], 'c').etat, 'post-crise');

/* ==================== Regroupement par jour ====================
   C'est ce qui remplace les listes tronquées à 15 ou 20 entrées : rien ne doit
   se perdre au regroupement. */
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
t('le jour le plus récent vient en tête', groupes[0].items.length, 2);
t('les jours suivants sont en ordre décroissant', groupes.map((g) => g.cle > groupes[groupes.length - 1].cle || g === groupes[groupes.length - 1]).every(Boolean), true);
t('liste vide : aucun groupe', grouperParJour([], (s) => s.date).length, 0);
t('liste absente : aucun groupe', grouperParJour(undefined, (s) => s.date).length, 0);
t('une date illisible est isolée, pas jetée', grouperParJour([S('n\'importe quoi')], (s) => s.date)[0].items.length, 1);
t('une date illisible n\'a pas de libellé de jour', libelleJour(grouperParJour([S('n\'importe quoi')], (s) => s.date)[0].date), 'Date inconnue');

/* Le regroupement doit tenir sur un volume réaliste — un an de séances. */
const anComplet = [];
for (let i = 0; i < 365; i++) {
  const d = new Date(2025, 7, 3 + i);
  anComplet.push(S(d.toISOString()), S(new Date(d.getTime() + 3600000).toISOString()));
}
const groupesAn = grouperParJour(anComplet, (s) => s.date);
t('un an de séances : un groupe par jour', groupesAn.length, 365);
t('un an de séances : rien ne se perd', groupesAn.reduce((n, g) => n + g.items.length, 0), 730);

/* ==================== Libellés de jour ==================== */
const ref = new Date(2026, 7, 3, 10, 0, 0);
t("le jour même se dit aujourd'hui", libelleJour(new Date(2026, 7, 3, 8, 0, 0), ref), "Aujourd'hui");
t('la veille se dit hier', libelleJour(new Date(2026, 7, 2, 23, 0, 0), ref), 'Hier');
t('au-delà, le jour de la semaine est nommé', libelleJour(new Date(2026, 6, 28), ref).includes('mardi'), true);
t('un changement de mois ne casse pas la veille', libelleJour(new Date(2026, 6, 31), new Date(2026, 7, 1, 9, 0)), 'Hier');

/* ==================== Nommage des fichiers ====================
   Un dossier de sauvegardes doit dire de quelle tablette et de quel jour vient
   chaque fichier, sans qu'on ait à l'ouvrir. */
/* Le segment porte son tiret final : il se colle directement devant la date. */
t('un nom d\'appareil devient un segment propre', segmentAppareil('Tablette 2'), 'tablette-2-');
t('les accents sont réduits', segmentAppareil('Unité Verte'), 'unite-verte-');
t('la ponctuation ne fabrique pas de tirets en trop', segmentAppareil('  IME — salle 3 !! '), 'ime-salle-3-');
t('sans appareil renseigné, aucun segment', segmentAppareil(''), '');
t('appareil absent : aucun segment', segmentAppareil(undefined), '');
t('un nom entièrement exotique ne casse rien', segmentAppareil('///'), '');

const jour = new Date().toISOString().slice(0, 10);
t('appareil puis date dans le nom', nomFichier('pour-manager', 'Tablette 2', 'json'), `pour-manager-tablette-2-${jour}.json`);
t('sans appareil, la date suit directement', nomFichier('pour-manager', '', 'json'), `pour-manager-${jour}.json`);
t('le tableur suit la même règle', nomFichier('rapport', 'Tablette 2', 'xlsx'), `rapport-tablette-2-${jour}.xlsx`);

console.log(`\n${ok} au vert, ${ko} en échec`);
process.exit(ko ? 1 : 0);
