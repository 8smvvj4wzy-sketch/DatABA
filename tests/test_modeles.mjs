/* Modèles d'objectifs : normalisation à l'enregistrement, instanciation à
   l'application. Les fonctions ne sont pas recopiées ici : elles sont
   extraites de src/App.jsx et évaluées telles quelles, sur le même principe
   que test_seance_souple.mjs. */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let ok = 0, ko = 0;
const t = (n, a, e) => {
  const p = JSON.stringify(a) === JSON.stringify(e);
  console.log(`${p ? 'OK  ' : 'ECHEC'} ${n}` + (p ? '' : ` → ${JSON.stringify(a)} au lieu de ${JSON.stringify(e)}`));
  p ? ok++ : ko++;
};
const assert = (n, cond) => {
  console.log(`${cond ? 'OK  ' : 'ECHEC'} ${n}`);
  cond ? ok++ : ko++;
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

/* Une constante tenant sur une seule ligne n'a pas de fermeture propre en
   colonne zéro : `extraire` chercherait bien plus loin dans le fichier. */
function extraireLigne(nom) {
  const re = new RegExp(`^const ${nom} = (.+);$`, 'm');
  const m = source.match(re);
  if (!m) throw new Error(`Constante introuvable (ligne unique) dans src/App.jsx : ${nom}`);
  return m[1];
}

const NOMS = ['uid', 'modeleDepuisObjectif', 'instancierModele', 'nomModeleDisponible'];

const code = `
  const DEFAULT_PHASES = ${extraireLigne('DEFAULT_PHASES')};
  ${NOMS.map(extraire).join('\n')}
  return { ${NOMS.join(', ')} };
`;
// eslint-disable-next-line no-new-func
const F = new Function(code)();
const { modeleDepuisObjectif, instancierModele, nomModeleDisponible } = F;

/* ==================== Fixtures ==================== */

const objectifSansCibles = {
  id: 'obj1',
  name: 'Pointer une image',
  type: 'trials',
  config: { trialCount: 10, guidanceSet: [{ code: 'I', label: 'Indépendant', color: '#000', independent: true }] },
  favorite: true,
  currentTargetId: null,
  masteredTargetIds: [],
  phaseHistory: [{ id: 'ph1', name: 'Intervention', date: '2026-01-01T00:00:00.000Z' }],
};

const objectifAvecCibles = {
  id: 'obj2',
  name: 'Nommer une couleur',
  type: 'trials',
  config: { trialCount: 5, targets: [{ id: 'c1', name: 'rouge' }, { id: 'c2', name: 'bleu' }] },
  favorite: false,
  currentTargetId: 'c1',
  masteredTargetIds: [],
  phaseHistory: [{ id: 'ph2', name: 'Ligne de base', date: null }],
};

/* ==================== modeleDepuisObjectif ==================== */

const modele1 = modeleDepuisObjectif(objectifSansCibles);

t('modeleDepuisObjectif — garde name, type, config', { name: modele1.name, type: modele1.type, config: modele1.config },
  { name: 'Pointer une image', type: 'trials', config: objectifSansCibles.config });
assert('modeleDepuisObjectif — id neuf, différent de celui de l\'objectif', typeof modele1.id === 'string' && modele1.id !== objectifSansCibles.id);
assert('modeleDepuisObjectif — n\'a plus favorite/cibles/historique', !('favorite' in modele1) && !('currentTargetId' in modele1) && !('masteredTargetIds' in modele1) && !('phaseHistory' in modele1));

/* ==================== instancierModele ==================== */

const inst1 = instancierModele(modele1);
t('instancierModele — reprend le nom du modèle si aucun n\'est fourni', inst1.name, modele1.name);
t('instancierModele — même type et même config que le modèle', { type: inst1.type, config: inst1.config }, { type: modele1.type, config: modele1.config });
t('instancierModele — instance neuve : pas prioritaire, aucune cible acquise', { favorite: inst1.favorite, masteredTargetIds: inst1.masteredTargetIds, currentTargetId: inst1.currentTargetId },
  { favorite: false, masteredTargetIds: [], currentTargetId: null });
t('instancierModele — phase initiale, sans date', { name: inst1.phaseHistory[0].name, date: inst1.phaseHistory[0].date }, { name: 'Ligne de base', date: null });
assert('instancierModele — id neuf, différent du modèle et de l\'objectif d\'origine', typeof inst1.id === 'string' && inst1.id !== modele1.id && inst1.id !== objectifSansCibles.id);

const inst2 = instancierModele(modele1, 'Pointer une image (J.D.)');
t('instancierModele — le nom fourni écrase celui du modèle', inst2.name, 'Pointer une image (J.D.)');
assert('instancierModele — deux instances du même modèle ont des id distincts', inst1.id !== inst2.id);

const modele2 = modeleDepuisObjectif(objectifAvecCibles);
const inst3 = instancierModele(modele2);
t('instancierModele — cible en cours = première cible du modèle', inst3.currentTargetId, 'c1');

/* ==================== Aller-retour objectif → modèle → objectif ==================== */

const copieA = instancierModele(modeleDepuisObjectif(objectifSansCibles));
const copieB = instancierModele(modeleDepuisObjectif(objectifSansCibles));
assert('aller-retour — deux applications successives restent indépendantes (id distincts)', copieA.id !== copieB.id);
t('aller-retour — la configuration de cotation traverse sans altération', copieA.config, objectifSansCibles.config);
assert('aller-retour — la priorité et la progression de l\'original ne sont pas héritées', copieA.favorite === false && copieA.masteredTargetIds.length === 0);

/* ==================== nomModeleDisponible ==================== */

const templates = [{ id: 't1', name: 'Pointer une image' }, { id: 't2', name: 'Pointer une image (2)' }];
t('nomModeleDisponible — nom libre inchangé', nomModeleDisponible('Nouveau modèle', templates), 'Nouveau modèle');
t('nomModeleDisponible — suffixe le premier créneau libre', nomModeleDisponible('Pointer une image', templates), 'Pointer une image (3)');
t('nomModeleDisponible — un modèle ignore son propre nom en édition', nomModeleDisponible('Pointer une image', templates, 't1'), 'Pointer une image');

console.log(`\n${ok} OK, ${ko} en échec`);
process.exit(ko ? 1 : 0);
