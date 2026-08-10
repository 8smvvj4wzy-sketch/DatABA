/* Séance mouvante : présence bornée, arrivée et départ en cours de route,
   passage à l'atelier suivant.

   Les fonctions ne sont pas recopiées ici : elles sont extraites de
   src/App.jsx et évaluées telles quelles, sur le même principe que
   test_stabilite.mjs et test_mesures.mjs. */

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

/* Une constante tenant sur une seule ligne n'a pas de fermeture propre en
   colonne zéro : `extraire` chercherait bien plus loin dans le fichier. */
function extraireLigne(nom) {
  const re = new RegExp(`^const ${nom} = (.+);$`, 'm');
  const m = source.match(re);
  if (!m) throw new Error(`Constante introuvable (ligne unique) dans src/App.jsx : ${nom}`);
  return m[1];
}

const NOMS = [
  'uid', 'mesuresVides', 'emptyEntry', 'figerChronos', 'finalizeSession',
  'phaseHistory', 'currentPhase', 'objectiveTargets', 'currentTarget',
  'fenetrePresence', 'estPresent', 'fenetresPause', 'chevauchementMs', 'dureePresence',
  'objectifsParDefaut', 'construireDonneesSeance',
  'ajouterPersonne', 'retirerPersonne', 'supprimerPersonne', 'chainerAtelier',
  'deplacerDansListe', 'reinjecterSousEnsemble',
];

const code = `
  const DEFAULT_PHASES = ${extraireLigne('DEFAULT_PHASES')};
  ${NOMS.map(extraire).join('\n')}
  return { ${NOMS.join(', ')} };
`;
// eslint-disable-next-line no-new-func
const F = new Function(code)();

/* ==================== Fixtures ==================== */

const T0 = 1_000_000;
const HEURE = 3_600_000;
const FIN = T0 + HEURE;

const objTrials = { id: 'o1', name: 'Demander', type: 'trials', config: { trialCount: 3 }, favorite: true };
const objChain = { id: 'o2', name: 'Se laver les mains', type: 'chaining', config: { steps: [{ id: 's1', name: 'Ouvrir' }] } };
const objBalance = { id: 'o3', name: 'Balance', type: 'balance', config: { steps: [{ id: 'b1', name: 'Étape' }] } };

const alice = { id: 'A', initials: 'A.L', objectives: [objTrials, objChain, objBalance] };
const bruno = { id: 'B', initials: 'B.M', objectives: [{ ...objTrials, id: 'o4', favorite: false }] };
const eleves = [alice, bruno];

const seanceBase = () => ({
  id: 'sess1',
  date: new Date(T0).toISOString(),
  startedAt: T0,
  mode: 'atelier',
  atelierId: 'at1',
  intervenantId: 'i1',
  doubleCotation: true,
  studentIds: ['A', 'B'],
  selectedObjectives: { A: ['o1', 'o2'], B: ['o4'] },
  objectiveSnapshot: { o1: objTrials, o2: objChain, o4: { ...objTrials, id: 'o4' } },
  notes: {},
  data: {
    A: { o1: { trials: [null, null, null] }, o2: { steps: {} } },
    B: { o4: { trials: [null, null, null] } },
  },
  presence: {},
  pauses: [],
});

/* ==================== Présence ==================== */

t('séance sans champ presence : fenêtre = la séance entière',
  F.fenetrePresence({ startedAt: T0, endedAt: FIN }, 'A'),
  { from: T0, to: FIN });

t('séance en cours sans champ presence : fin ouverte',
  F.fenetrePresence({ startedAt: T0 }, 'A'),
  { from: T0, to: null });

t('présence ouverte : la fin se rabat sur celle de la séance',
  F.fenetrePresence({ startedAt: T0, endedAt: FIN, presence: { A: { from: T0 + 60_000, to: null } } }, 'A'),
  { from: T0 + 60_000, to: FIN });

t('présence close : ses propres bornes',
  F.fenetrePresence({ startedAt: T0, endedAt: FIN, presence: { A: { from: T0, to: T0 + 60_000 } } }, 'A'),
  { from: T0, to: T0 + 60_000 });

t('présent quand le champ manque', F.estPresent({ startedAt: T0 }, 'A'), true);
t('présent quand la présence est ouverte', F.estPresent({ presence: { A: { from: T0, to: null } } }, 'A'), true);
t('parti quand la présence est close', F.estPresent({ presence: { A: { from: T0, to: T0 + 10 } } }, 'A'), false);

/* Repli : une séance enregistrée avant l'historique des pauses n'a qu'un
   pausedMs global. Le retirer reste exact tant que la personne a couvert
   toute la séance — c'est le calcul qui avait cours jusqu'ici. */
t('séance ancienne : pausedMs retiré tel quel',
  F.dureePresence({ startedAt: T0, endedAt: FIN, pausedMs: 600_000 }, 'A'),
  HEURE - 600_000);

t('séance ancienne, présence partielle : pausedMs non retiré, faute de savoir quand',
  F.dureePresence({ startedAt: T0, endedAt: FIN, pausedMs: 600_000, presence: { A: { from: T0 + 1_800_000, to: null } } }, 'A'),
  1_800_000);

t('pause pendant une présence complète',
  F.dureePresence({ startedAt: T0, endedAt: FIN, pauses: [{ from: T0 + 600_000, to: T0 + 900_000 }] }, 'A'),
  HEURE - 300_000);

t('pause encore ouverte à l\'enregistrement : bornée à la fin de séance',
  F.dureePresence({ startedAt: T0, endedAt: FIN, pauses: [{ from: FIN - 300_000, to: null }] }, 'A'),
  HEURE - 300_000);

t('arrivée après la pause : la pause ne lui est pas décomptée',
  F.dureePresence({
    startedAt: T0, endedAt: FIN,
    pauses: [{ from: T0 + 600_000, to: T0 + 900_000 }],
    presence: { B: { from: T0 + 1_200_000, to: null } },
  }, 'B'),
  2_400_000);

t('départ anticipé, pause à l\'intérieur de la présence',
  F.dureePresence({
    startedAt: T0, endedAt: FIN,
    pauses: [{ from: T0 + 600_000, to: T0 + 900_000 }],
    presence: { C: { from: T0, to: T0 + 1_200_000 } },
  }, 'C'),
  900_000);

t('présence débordant la séance : ramenée à ses bornes',
  F.dureePresence({ startedAt: T0, endedAt: FIN, presence: { A: { from: T0 - 500_000, to: FIN + 500_000 } } }, 'A'),
  HEURE);

t('personne partie avant d\'arriver : durée nulle',
  F.dureePresence({ startedAt: T0, endedAt: FIN, presence: { A: { from: T0 + 100, to: T0 + 100 } } }, 'A'),
  0);

t('chevauchement de deux fenêtres', F.chevauchementMs({ from: 0, to: 100 }, { from: 80, to: 200 }), 20);
t('fenêtres disjointes', F.chevauchementMs({ from: 0, to: 100 }, { from: 150, to: 200 }), 0);

/* ==================== Objectifs par défaut ==================== */

t('objectifs mémorisés pour cet atelier',
  F.objectifsParDefaut(alice, { usualObjectives: { A: ['o2'] } }, 'atelier'),
  ['o2']);

t('sans mémoire d\'atelier : repli sur les prioritaires',
  F.objectifsParDefaut(alice, null, 'atelier'),
  ['o1']);

t('sans mémoire ni prioritaire : tous les objectifs',
  F.objectifsParDefaut(bruno, null, 'atelier'),
  ['o4']);

t('mémoire pointant un objectif supprimé : repli plutôt qu\'une liste vide',
  F.objectifsParDefaut(alice, { usualObjectives: { A: ['disparu'] } }, 'atelier'),
  ['o1']);

t('mode balance : seuls les Balance Program',
  F.objectifsParDefaut(alice, null, 'balance'),
  ['o3']);

/* ==================== Composition ==================== */

{
  const { snapshot, data } = F.construireDonneesSeance(eleves, ['A'], { A: ['o1', 'o2'] }, ['o2'], 'atelier');
  t('instantané : les deux objectifs', Object.keys(snapshot).sort(), ['o1', 'o2']);
  t('prioritaire propre à l\'objectif', snapshot.o1.favorite, true);
  t('prioritaire propre à l\'atelier', snapshot.o2.favorite, true);
  t('phase reportée dans l\'instantané', snapshot.o1.activePhaseName, 'Ligne de base');
  t('cotation vide montée pour le mode', data.A.o1.trials, [null, null, null]);
  t('cotation vide du chaînage', data.A.o2.steps, {});
}

{
  /* o2 n'est pas prioritaire en soi : seul le prioritaire d'atelier pourrait
     le rendre tel, et il ne s'applique pas en Balance Program. */
  const atelier = F.construireDonneesSeance(eleves, ['A'], { A: ['o2'] }, ['o2'], 'atelier');
  const balance = F.construireDonneesSeance(eleves, ['A'], { A: ['o2'] }, ['o2'], 'balance');
  t('le prioritaire d\'atelier s\'applique en atelier', atelier.snapshot.o2.favorite, true);
  t('le prioritaire d\'atelier ne s\'applique pas en Balance Program', balance.snapshot.o2.favorite, false);
}

t('objectif inconnu ignoré plutôt que planter',
  Object.keys(F.construireDonneesSeance(eleves, ['A'], { A: ['fantome'] }, [], 'atelier').data.A),
  []);

/* ==================== Arrivée en cours de séance ==================== */

{
  const s = F.ajouterPersonne(seanceBase(), { id: 'C', initials: 'C.D', objectives: [{ ...objTrials, id: 'o5' }] }, ['o5'], T0 + 900_000);
  t('la personne rejoint la séance', s.studentIds, ['A', 'B', 'C']);
  t('ses objectifs sont cochés', s.selectedObjectives.C, ['o5']);
  t('sa cotation vide est montée', s.data.C.o5.trials, [null, null, null]);
  t('son instantané complète celui de la séance', Object.keys(s.objectiveSnapshot).sort(), ['o1', 'o2', 'o4', 'o5']);
  t('sa présence démarre à son arrivée', s.presence.C, { from: T0 + 900_000, to: null });
  t('les autres présences ne bougent pas', s.presence.A, undefined);
}

{
  /* Une personne partie puis revenue ne doit pas voir ses cotations refaites. */
  const partie = F.retirerPersonne(seanceBase(), 'B', T0 + 600_000);
  const revenue = F.ajouterPersonne(partie, bruno, ['o4'], T0 + 1_200_000);
  t('le retour ne duplique pas la personne', revenue.studentIds, ['A', 'B']);
  t('le retour rouvre la présence sans effacer l\'arrivée', revenue.presence.B, { from: T0, to: null });
  t('le retour conserve les cotations', revenue.data.B.o4.trials, [null, null, null]);
}

/* ==================== Départ ==================== */

{
  const depart = seanceBase();
  depart.data.B.o4 = { trials: [], running: true, startedAt: T0 + 100_000, elapsedMs: 5_000 };
  const s = F.retirerPersonne(depart, 'B', T0 + 600_000);

  t('la présence est bornée au départ', s.presence.B, { from: T0, to: T0 + 600_000 });
  t('la personne reste dans la séance', s.studentIds, ['A', 'B']);
  t('ses cotations sont conservées', !!s.data.B.o4, true);
  t('son chronomètre est figé', s.data.B.o4.running, false);
  t('le temps couru est cumulé', s.data.B.o4.elapsedMs, 5_000 + 500_000);
  t('la personne restée n\'est pas touchée', s.presence.A, undefined);
}

/* ==================== Suppression ==================== */

{
  const avant = seanceBase();
  avant.selectedObjectives.B = ['o4', 'o1']; // objectif partagé avec A
  avant.data.B.o1 = { trials: [] };
  avant.objectiveSnapshot.o4 = { ...objTrials, id: 'o4' };
  avant.notes = { A: 'note A', B: 'note B' };
  avant.hidden = { B: ['o4'] };
  avant.presence = { B: { from: T0, to: null } };
  avant.priorityOrder = ['A|o1', 'B|o4', 'A|o2'];
  const s = F.supprimerPersonne(avant, 'B');

  t('la personne quitte la liste', s.studentIds, ['A']);
  t('ses objectifs cochés disparaissent', s.selectedObjectives.B, undefined);
  t('ses cotations disparaissent', s.data.B, undefined);
  t('sa note disparaît', s.notes, { A: 'note A' });
  t('ses objectifs masqués disparaissent', s.hidden, {});
  t('sa présence disparaît', s.presence, {});
  t('l\'ordre des prioritaires est purgé', s.priorityOrder, ['A|o1', 'A|o2']);
  t('l\'instantané perd l\'objectif devenu orphelin', Object.keys(s.objectiveSnapshot).sort(), ['o1', 'o2']);
  t('l\'objectif encore coté par une autre personne est conservé', !!s.objectiveSnapshot.o1, true);
}

/* ==================== Passage à l'atelier suivant ==================== */

{
  const encours = seanceBase();
  encours.data.A.o1 = { trials: [], running: true, startedAt: T0 + 100_000, elapsedMs: 0 };
  const { close, next } = F.chainerAtelier(encours, 'at2', {
    students: eleves,
    studentIds: ['A'],
    selected: { A: ['o1'] },
    favorites: [],
  }, T0 + 1_800_000);

  t('la séance close garde son atelier', close.atelierId, 'at1');
  t('la séance close est finalisée', close.data.A.o1.running, false);
  t('la séance close est datée de sa fin', typeof close.endedAt, 'number');
  t('la nouvelle séance porte le nouvel atelier', next.atelierId, 'at2');
  t('les deux séances partagent une chaîne', close.chainId === next.chainId, true);
  t('la chaîne part de la première séance', close.chainId, 'sess1');
  t('le rang s\'incrémente', [close.chainIndex, next.chainIndex], [1, 2]);
  t('la nouvelle séance a son propre identifiant', next.id !== close.id, true);
  t('l\'intervenant est repris', next.intervenantId, 'i1');
  t('la double cotation est reprise', next.doubleCotation, true);
  t('seules les personnes retenues suivent', next.studentIds, ['A']);
  t('leurs cotations repartent à vide', next.data.A.o1.trials, [null, null, null]);
  t('leur présence démarre au changement', next.presence.A, { from: T0 + 1_800_000, to: null });
  t('le chronomètre de la nouvelle séance repart', next.startedAt, T0 + 1_800_000);
  t('aucune pause reportée', next.pauses, []);
  t('aucune note reportée', next.notes, {});

  /* Un troisième atelier prolonge la même chaîne. */
  const suite = F.chainerAtelier(next, 'at3', {
    students: eleves, studentIds: ['A'], selected: { A: ['o1'] }, favorites: [],
  }, T0 + 2_400_000);
  t('la chaîne se prolonge', suite.next.chainId, 'sess1');
  t('le rang suit', [suite.close.chainIndex, suite.next.chainIndex], [2, 3]);
}

{
  /* En Balance Program il n'y a pas d'atelier : le chaînage ne doit pas en
     inventer un. */
  const bal = { ...seanceBase(), mode: 'balance', atelierId: null };
  const { next } = F.chainerAtelier(bal, 'at2', {
    students: eleves, studentIds: ['A'], selected: { A: ['o3'] }, favorites: [],
  }, T0 + 600_000);
  t('Balance Program : aucun atelier posé', next.atelierId, null);
  t('Balance Program : le mode est repris', next.mode, 'balance');
}

/* ---- Ordre des cartes dans la zone de cotation ---- */

{
  const l = ['a', 'b', 'c', 'd'];
  t('déplacement vers la fin', F.deplacerDansListe(l, 0, 2), ['b', 'c', 'a', 'd']);
  t('déplacement vers le début', F.deplacerDansListe(l, 3, 1), ['a', 'd', 'b', 'c']);
  t('sur place : liste inchangée', F.deplacerDansListe(l, 2, 2), ['a', 'b', 'c', 'd']);
  t('bornes ramenées dans la liste', F.deplacerDansListe(l, 0, 99), ['b', 'c', 'd', 'a']);
  t('la source n\'est pas modifiée', l, ['a', 'b', 'c', 'd']);
}

{
  /* Réordonner un sous-ensemble ne doit déplacer que les créneaux qu'il
     occupait déjà — les autres gardent leur place exacte. */
  t(
    'sous-ensemble complet : l\'ordre passe tel quel',
    F.reinjecterSousEnsemble(['a', 'b', 'c'], ['c', 'a', 'b']),
    ['c', 'a', 'b']
  );
  t(
    'sous-ensemble partiel : les autres ne bougent pas',
    F.reinjecterSousEnsemble(['a', 'x', 'b', 'y', 'c'], ['c', 'b', 'a']),
    ['c', 'x', 'b', 'y', 'a']
  );
  /* Un objectif devenu prioritaire après coup n'est pas encore dans
     priorityOrder : il n'a aucun créneau à réutiliser et était perdu. */
  t(
    'clé absente de la liste complète : insérée à la position choisie',
    F.reinjecterSousEnsemble(['a', 'b', 'z'], ['b', 'a', 'nouveau']),
    ['b', 'a', 'nouveau', 'z']
  );
  t(
    'liste complète vide : le sous-ensemble fait la liste',
    F.reinjecterSousEnsemble([], ['a', 'b']),
    ['a', 'b']
  );
}

console.log(`\n${ok} OK, ${ko} en échec`);
process.exit(ko ? 1 : 0);
