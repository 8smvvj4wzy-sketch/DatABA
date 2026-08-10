/* Socle multi-tablettes : classes et contexte de traçabilité d'un relevé. Le
   principe du dépôt vaut ici comme ailleurs : les fonctions ne sont pas
   recopiées, elles sont extraites de src/App.jsx et évaluées telles quelles.
   Les colonnes Classe/Intervenant/Atelier de l'export et les assertions de
   migration de `migrerReleves` vivent dans test_suivi.mjs, où toute la
   chaîne de dépendances de `lignesSuiviExport` est déjà montée — pas de
   raison de la reconstruire une seconde fois ici. */

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

const NOMS = ['jourLocal', 'posteValide', 'contexteReleve', 'migrerStudentsClasse', 'personnesVisibles', 'classeDe', 'nomClasse'];
const code = `const CLASSE_INCONNUE = ${extraireLigne('CLASSE_INCONNUE')};\n${NOMS.map(extraire).join('\n')}\nreturn { ${NOMS.join(', ')}, CLASSE_INCONNUE };`;
// eslint-disable-next-line no-new-func
const {
  jourLocal, posteValide, contexteReleve, migrerStudentsClasse, personnesVisibles, classeDe, nomClasse, CLASSE_INCONNUE,
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

/* ==================== migrerStudentsClasse ==================== */

t('une personne sans classeId en gagne un, à null', migrerStudentsClasse([{ id: 'a', initials: 'A.B.' }]), [{ id: 'a', initials: 'A.B.', classeId: null }]);
t('une personne déjà rangée n\'est pas altérée', migrerStudentsClasse([{ id: 'a', initials: 'A.B.', classeId: 'g1' }]), [{ id: 'a', initials: 'A.B.', classeId: 'g1' }]);
t('une personne explicitement sans classe (null) n\'est pas retouchée', migrerStudentsClasse([{ id: 'a', initials: 'A.B.', classeId: null }]), [{ id: 'a', initials: 'A.B.', classeId: null }]);
t('liste absente : pas de plantage', migrerStudentsClasse(undefined), []);
t('migration idempotente', migrerStudentsClasse(migrerStudentsClasse([{ id: 'a', initials: 'A.B.' }])), migrerStudentsClasse([{ id: 'a', initials: 'A.B.' }]));

/* Renommage Groupe → Classe : une personne restaurée depuis une sauvegarde
   d'avant le renommage ne porte que `groupeId`. La migration doit reprendre
   cette valeur sous `classeId`, sans laisser `groupeId` traîner ensuite — et
   rester idempotente une fois migrée. */
t('ancien champ groupeId repris sous classeId', migrerStudentsClasse([{ id: 'a', initials: 'A.B.', groupeId: 'g1' }]), [{ id: 'a', initials: 'A.B.', classeId: 'g1' }]);
t('ancien groupeId à null repris tel quel', migrerStudentsClasse([{ id: 'a', initials: 'A.B.', groupeId: null }]), [{ id: 'a', initials: 'A.B.', classeId: null }]);
t('une fois migrée, la personne ne porte plus classeId ET groupeId à la fois', Object.keys(migrerStudentsClasse([{ id: 'a', initials: 'A.B.', groupeId: 'g1' }])[0]).includes('groupeId'), false);

/* ==================== personnesVisibles ==================== */

const parc = [
  { id: 'a', initials: 'A.B.', classeId: 'g1' },
  { id: 'b', initials: 'C.D.', classeId: 'g2' },
  { id: 'c', initials: 'E.F.', classeId: null },
  { id: 'd', initials: 'G.H.' }, // pas encore migrée : classeId absent
];

t('tablette sans classe rattachée : tout le monde reste visible', personnesVisibles(parc, null), parc);
t('tablette sans classe rattachée (chaîne vide) : tout le monde reste visible', personnesVisibles(parc, ''), parc);
t('tablette rattachée : sa classe, plus les personnes sans classe', personnesVisibles(parc, 'g1').map((s) => s.id), ['a', 'c', 'd']);
t('une autre classe ne s\'invite pas', personnesVisibles(parc, 'g1').some((s) => s.id === 'b'), false);
t('liste absente : pas de plantage', personnesVisibles(undefined, 'g1'), []);

/* Le jour où le parc entier gagne une classe, le filtre se referme
   complètement : c'est le comportement voulu, pas une régression. */
const parcRange = [
  { id: 'a', initials: 'A.B.', classeId: 'g1' },
  { id: 'b', initials: 'C.D.', classeId: 'g2' },
];
t('tout le monde rangé : le filtre s\'applique sans repli', personnesVisibles(parcRange, 'g1').map((s) => s.id), ['a']);

/* ==================== classeDe / nomClasse ==================== */

const listeClasses = [{ id: 'g1', name: 'Classe 1' }, { id: 'g2', name: 'Classe 2' }];

t('une classe existante se retrouve par son id', classeDe(listeClasses, 'g1'), { id: 'g1', name: 'Classe 1' });
t('aucune classe assignée : pas de repli, juste rien', classeDe(listeClasses, null), null);
t('aucune classe assignée (undefined) : pas de repli, juste rien', classeDe(listeClasses, undefined), null);
t('une classe supprimée replie sur CLASSE_INCONNUE', classeDe(listeClasses, 'g9'), CLASSE_INCONNUE);
t('une liste absente ne plante pas et replie sur CLASSE_INCONNUE si un id est fourni', classeDe(undefined, 'g1'), CLASSE_INCONNUE);

t('nomClasse lit le nom de la classe existante', nomClasse(listeClasses, 'g1'), 'Classe 1');
t('nomClasse : rien pour une personne sans classe', nomClasse(listeClasses, null), '');
t('nomClasse : « Classe retirée » pour une classe supprimée', nomClasse(listeClasses, 'g9'), 'Classe retirée');

console.log(`\n${ok} au vert, ${ko} en échec`);
process.exit(ko > 0 ? 1 : 0);
