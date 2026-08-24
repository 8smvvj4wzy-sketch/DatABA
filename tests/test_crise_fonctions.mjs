/* Fonctions supposées d'une crise.
 *
 *   La liste vit dans une seule constante, `CRISIS_FUNCTIONS`, et l'écran de
 *   saisie la coupe en deux rangées : les fonctions opérantes du comportement
 *   d'un côté, ce qui n'est pas du même rang de l'autre (« Physiologique »,
 *   « Indéterminée »). Cette coupe se faisait par clés en dur
 *   (`fn.k !== 'indetermine'`) : toute fonction ajoutée retombait
 *   silencieusement dans la rangée principale, quel que soit son statut. Elle
 *   passe maintenant par le drapeau `repli` posé sur l'entrée elle-même, et
 *   c'est ce que cette suite garde.
 *
 *   Comme les autres suites : rien n'est recopié, la constante est extraite de
 *   src/App.jsx et évaluée telle quelle.
 */

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

/* Les couleurs catégorielles sont doublées par leur nom : ce test porte sur
   la structure de la liste, pas sur des valeurs hexadécimales. Les doubler
   ainsi fait d'ailleurs échouer le contrôle « toutes tirées de la palette »
   si quelqu'un écrit un hex en dur dans l'entrée. */
const NOMS_CAT = ['CAT_TEAL', 'CAT_INDIGO', 'CAT_AMBER', 'CAT_CORAL', 'CAT_VIOLET', 'CAT_CYAN', 'CAT_LILAC', 'CAT_SLATE'];
const code = [
  NOMS_CAT.map((n) => `const ${n} = '${n}';`).join('\n'),
  extraire('CRISIS_FUNCTIONS'),
  'return CRISIS_FUNCTIONS;',
].join('\n');
// eslint-disable-next-line no-new-func
const CRISIS_FUNCTIONS = new Function(code)();

const cles = CRISIS_FUNCTIONS.map((f) => f.k);
const principales = CRISIS_FUNCTIONS.filter((f) => !f.repli).map((f) => f.k);
const replis = CRISIS_FUNCTIONS.filter((f) => f.repli).map((f) => f.k);

/* ==================== 1. La nouvelle hypothèse ==================== */

t('« Physiologique » est proposable',
  (CRISIS_FUNCTIONS.find((f) => f.k === 'physiologique') || {}).label, 'Physiologique');

t('les cinq fonctions historiques sont toujours là',
  ['attention', 'echappement', 'tangible', 'sensoriel', 'indetermine'].every((k) => cles.includes(k)), true);

/* ==================== 2. La coupe en deux rangées ==================== */

/* Exhaustive et disjointe : une entrée qui ne serait dans aucune des deux
   rangées ne s'afficherait nulle part et ne serait donc plus saisissable —
   c'est exactement ce qu'un filtre par clé en dur produit sur une entrée
   nouvelle. */
t('toute fonction a exactement une rangée', principales.length + replis.length, cles.length);
t('les deux rangées ne se recouvrent pas', principales.filter((k) => replis.includes(k)), []);

t('les quatre fonctions opérantes tiennent la rangée principale',
  principales, ['attention', 'echappement', 'tangible', 'sensoriel']);
t('la rangée de repli porte Physiologique puis Indéterminée',
  replis, ['physiologique', 'indetermine']);

/* Indéterminée est le dernier recours : elle se lit après tout le reste, pas
   au milieu d'une rangée. */
t('« Indéterminée » ferme la liste', cles[cles.length - 1], 'indetermine');

/* ==================== 3. Couleurs ==================== */

const couleurs = CRISIS_FUNCTIONS.map((f) => f.color);
t('chaque fonction porte une couleur de la palette catégorielle',
  couleurs.every((c) => NOMS_CAT.includes(c)), true);
t('aucune couleur n’est partagée par deux fonctions', new Set(couleurs).size, couleurs.length);

/* ==================== 4. Le filtre en dur ne revient pas ==================== */

/* Le rendu doit interroger le drapeau, jamais la clé. Ce contrôle porte sur le
   texte du fichier parce que c'est la régression elle-même qu'il vise : un
   `filter` réécrit en dur passerait tous les contrôles ci-dessus. */
t('l’écran de saisie ne filtre plus sur une clé en dur',
  /fn\.k\s*[!=]==\s*'indetermine'/.test(source), false);
t('l’écran de saisie filtre sur le drapeau `repli`',
  /CRISIS_FUNCTIONS\.filter\(\(fn\) => !fn\.repli\)/.test(source)
    && /CRISIS_FUNCTIONS\.filter\(\(fn\) => fn\.repli\)/.test(source), true);

console.log(`\n${ok} contrôle(s) au vert, ${ko} en échec`);
if (ko) process.exit(1);
