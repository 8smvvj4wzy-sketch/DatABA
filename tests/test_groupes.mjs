/* Socle multi-tablettes : groupes (classes) et contexte de traçabilité d'un
   relevé. Le principe du dépôt vaut ici comme ailleurs : les fonctions ne
   sont pas recopiées, elles sont extraites de src/App.jsx et évaluées telles
   quelles. Les colonnes Groupe/Intervenant/Atelier de l'export et les
   assertions de migration de `migrerReleves` vivent dans test_suivi.mjs, où
   toute la chaîne de dépendances de `lignesSuiviExport` est déjà montée —
   pas de raison de la reconstruire une seconde fois ici. */

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
   colonne zéro : `extraire` chercherait bien plus loin dans le fichier. */
function extraireLigne(nom) {
  const re = new RegExp(`^const ${nom} = (.+);$`, 'm');
  const m = source.match(re);
  if (!m) throw new Error(`Constante introuvable (ligne unique) dans src/App.jsx : ${nom}`);
  return m[1];
}

const NOMS = ['jourLocal', 'posteValide', 'contexteReleve', 'migrerStudentsGroupe', 'personnesVisibles', 'groupeDe', 'nomGroupe'];
const code = `const GROUPE_INCONNU = ${extraireLigne('GROUPE_INCONNU')};\n${NOMS.map(extraire).join('\n')}\nreturn { ${NOMS.join(', ')}, GROUPE_INCONNU };`;
// eslint-disable-next-line no-new-func
const {
  jourLocal, posteValide, contexteReleve, migrerStudentsGroupe, personnesVisibles, groupeDe, nomGroupe, GROUPE_INCONNU,
} = new Function(code)();

/* ==================== posteValide ==================== */

const aujourdhui = new Date('2026-08-05T14:00:00.000Z');
const jourAujourdhui = jourLocal(aujourdhui);
const jourHier = jourLocal(new Date('2026-08-04T14:00:00.000Z'));

t('aucun poste : invalide', posteValide(null, aujourdhui), false);
t('poste sans intervenant : invalide', posteValide({ intervenantId: null, jour: jourAujourdhui }, aujourdhui), false);
t('poste du jour, avec intervenant : valide', posteValide({ intervenantId: 'i1', jour: jourAujourdhui }, aujourdhui), true);
t('poste d\'un autre jour : périmé', posteValide({ intervenantId: 'i1', jour: jourHier }, aujourdhui), false);

/* ==================== contexteReleve ==================== */

const session = { id: 's1', intervenantId: 'i2', atelierId: 'at1' };
t('en séance : intervenant, séance et atelier de la séance active', contexteReleve(session, null, aujourdhui), { intervenantId: 'i2', sessionId: 's1', atelierId: 'at1' });
t('en séance sans intervenant choisi : rien à défaut', contexteReleve({ id: 's2', atelierId: 'at1' }, null, aujourdhui), { intervenantId: null, sessionId: 's2', atelierId: 'at1' });

const posteValideAujourdhui = { intervenantId: 'i1', jour: jourAujourdhui };
t('hors séance, poste valide : seul l\'intervenant est connu', contexteReleve(null, posteValideAujourdhui, aujourdhui), { intervenantId: 'i1', sessionId: null, atelierId: null });

const postePerime = { intervenantId: 'i1', jour: jourHier };
t('hors séance, poste périmé : rien n\'est deviné', contexteReleve(null, postePerime, aujourdhui), { intervenantId: null, sessionId: null, atelierId: null });
t('hors séance, aucun poste : rien n\'est deviné', contexteReleve(null, null, aujourdhui), { intervenantId: null, sessionId: null, atelierId: null });

/* La séance active prime toujours sur un poste, même incohérent : elle est la
   source la plus sûre au moment de la cotation. */
t('la séance prime sur le poste', contexteReleve(session, posteValideAujourdhui, aujourdhui), { intervenantId: 'i2', sessionId: 's1', atelierId: 'at1' });

/* ==================== migrerStudentsGroupe ==================== */

t('une personne sans groupeId en gagne un, à null', migrerStudentsGroupe([{ id: 'a', initials: 'A.B.' }]), [{ id: 'a', initials: 'A.B.', groupeId: null }]);
t('une personne déjà rangée n\'est pas altérée', migrerStudentsGroupe([{ id: 'a', initials: 'A.B.', groupeId: 'g1' }]), [{ id: 'a', initials: 'A.B.', groupeId: 'g1' }]);
t('une personne explicitement sans groupe (null) n\'est pas retouchée', migrerStudentsGroupe([{ id: 'a', initials: 'A.B.', groupeId: null }]), [{ id: 'a', initials: 'A.B.', groupeId: null }]);
t('liste absente : pas de plantage', migrerStudentsGroupe(undefined), []);
t('migration idempotente', migrerStudentsGroupe(migrerStudentsGroupe([{ id: 'a', initials: 'A.B.' }])), migrerStudentsGroupe([{ id: 'a', initials: 'A.B.' }]));

/* ==================== personnesVisibles ==================== */

const parc = [
  { id: 'a', initials: 'A.B.', groupeId: 'g1' },
  { id: 'b', initials: 'C.D.', groupeId: 'g2' },
  { id: 'c', initials: 'E.F.', groupeId: null },
  { id: 'd', initials: 'G.H.' }, // pas encore migrée : groupeId absent
];

t('tablette sans groupe rattaché : tout le monde reste visible', personnesVisibles(parc, null), parc);
t('tablette sans groupe rattaché (chaîne vide) : tout le monde reste visible', personnesVisibles(parc, ''), parc);
t('tablette rattachée : son groupe, plus les personnes sans groupe', personnesVisibles(parc, 'g1').map((s) => s.id), ['a', 'c', 'd']);
t('un autre groupe ne s\'invite pas', personnesVisibles(parc, 'g1').some((s) => s.id === 'b'), false);
t('liste absente : pas de plantage', personnesVisibles(undefined, 'g1'), []);

/* Le jour où le parc entier gagne un groupe, le filtre se referme
   complètement : c'est le comportement voulu, pas une régression. */
const parcRange = [
  { id: 'a', initials: 'A.B.', groupeId: 'g1' },
  { id: 'b', initials: 'C.D.', groupeId: 'g2' },
];
t('tout le monde rangé : le filtre s\'applique sans repli', personnesVisibles(parcRange, 'g1').map((s) => s.id), ['a']);

/* ==================== groupeDe / nomGroupe ==================== */

const listeGroupes = [{ id: 'g1', name: 'Classe 1' }, { id: 'g2', name: 'Classe 2' }];

t('un groupe existant se retrouve par son id', groupeDe(listeGroupes, 'g1'), { id: 'g1', name: 'Classe 1' });
t('aucun groupe assigné : pas de repli, juste rien', groupeDe(listeGroupes, null), null);
t('aucun groupe assigné (undefined) : pas de repli, juste rien', groupeDe(listeGroupes, undefined), null);
t('un groupe supprimé replie sur GROUPE_INCONNU', groupeDe(listeGroupes, 'g9'), GROUPE_INCONNU);
t('une liste absente ne plante pas et replie sur GROUPE_INCONNU si un id est fourni', groupeDe(undefined, 'g1'), GROUPE_INCONNU);

t('nomGroupe lit le nom du groupe existant', nomGroupe(listeGroupes, 'g1'), 'Classe 1');
t('nomGroupe : rien pour une personne sans groupe', nomGroupe(listeGroupes, null), '');
t('nomGroupe : « Groupe retiré » pour un groupe supprimé', nomGroupe(listeGroupes, 'g9'), 'Groupe retiré');

console.log(`\n${ok} au vert, ${ko} en échec`);
process.exit(ko > 0 ? 1 : 0);
