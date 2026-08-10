/* Fenêtre « Prévus non cotés aujourd'hui » de l'écran Suivi. Même principe
   que les autres suites : les fonctions ne sont pas recopiées, elles sont
   extraites de src/App.jsx et évaluées telles quelles. */

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

const NOMS = [
  'memeJour', 'mesuresVides', 'emptyEntry', 'entryMatches', 'trialCode', 'balanceTrials',
  'objectifEstCote', 'probesDuJour', 'ateliersDuJour', 'personnesPrevues', 'objectifsPrevusNonCotes',
];
const code = `${NOMS.map(extraire).join('\n')}\nreturn { ${NOMS.join(', ')} };`;
// eslint-disable-next-line no-new-func
const { objectifsPrevusNonCotes } = new Function(code)();

const MAINTENANT = new Date(2026, 7, 5, 15, 0).getTime(); // 5 août 2026 (mercredi), 15h
const JOUR = new Date(MAINTENANT).getDay();

const objTrials = { id: 'ot1', name: 'Pointer une image', type: 'trials', config: { trialCount: 3 } };
const objProbe = { id: 'op1', name: 'Salutation', type: 'probe', config: { probesParJour: 2 } };

const eleve = { id: 'e1', initials: 'A.B.', objectives: [objTrials, objProbe] };

const emploiDuTemps = { [String(JOUR)]: ['at1', 'at2'] };

function session(atelierId, oid, entry, dateIso) {
  return {
    date: dateIso,
    atelierId,
    objectiveSnapshot: { [oid]: oid === 'ot1' ? objTrials : objProbe },
    data: { e1: { [oid]: entry } },
  };
}

/* ==================== Règle 1 : dédoublonnage multi-ateliers ==================== */
const atelier1 = { id: 'at1', name: 'Motricité', usualStudentIds: ['e1'], usualObjectives: { e1: ['ot1'] } };
const atelier2 = { id: 'at2', name: 'Repas', usualStudentIds: ['e1'], usualObjectives: { e1: ['ot1'] } };

const res1 = objectifsPrevusNonCotes([eleve], [atelier1, atelier2], emploiDuTemps, [], null, MAINTENANT);
t('un même objectif dans deux ateliers ne ressort qu\'une fois', res1[0].objectifs.length, 1);
t('les deux ateliers d\'origine sont listés', res1[0].objectifs[0].ateliers.sort(), ['Motricité', 'Repas']);

/* ==================== Règle 3 : coté vs non coté ==================== */
const ateliersTrials = [{ id: 'at1', name: 'Motricité', usualStudentIds: ['e1'], usualObjectives: { e1: ['ot1'] } }];

const nonCote = objectifsPrevusNonCotes([eleve], ateliersTrials, { [String(JOUR)]: ['at1'] }, [], null, MAINTENANT);
t('objectif prévu, aucune cotation aujourd\'hui : apparaît', nonCote.length, 1);

const seanceTrialsCotee = session('at1', 'ot1', { trials: ['I', null, null], running: false, startedAt: null, mesures: { compteur: { total: 0, valideA: null }, chrono: { elapsedMs: 0, running: false, startedAt: null, valideA: null } } }, '2026-08-05T09:00:00.000Z');
const cote = objectifsPrevusNonCotes([eleve], ateliersTrials, { [String(JOUR)]: ['at1'] }, [seanceTrialsCotee], null, MAINTENANT);
t('au moins un essai coté aujourd\'hui : disparaît', cote.length, 0);

const seanceTrialsVierge = session('at1', 'ot1', { trials: [null, null, null], running: false, startedAt: null, mesures: { compteur: { total: 0, valideA: null }, chrono: { elapsedMs: 0, running: false, startedAt: null, valideA: null } } }, '2026-08-05T09:00:00.000Z');
const vierge = objectifsPrevusNonCotes([eleve], ateliersTrials, { [String(JOUR)]: ['at1'] }, [seanceTrialsVierge], null, MAINTENANT);
t('une entrée créée mais restée vierge : toujours affiché', vierge.length, 1);

const seanceHier = session('at1', 'ot1', { trials: ['I', null, null], running: false, startedAt: null, mesures: { compteur: { total: 0, valideA: null }, chrono: { elapsedMs: 0, running: false, startedAt: null, valideA: null } } }, '2026-08-04T09:00:00.000Z');
const coteHier = objectifsPrevusNonCotes([eleve], ateliersTrials, { [String(JOUR)]: ['at1'] }, [seanceHier], null, MAINTENANT);
t('coté hier, pas aujourd\'hui : toujours affiché', coteHier.length, 1);

/* ==================== Règle 4 : exception Probe ==================== */
const ateliersProbe = [{ id: 'at1', name: 'Motricité', usualStudentIds: ['e1'], usualObjectives: { e1: ['op1'] } }];
const eleveProbe = { id: 'e1', initials: 'A.B.', objectives: [objProbe] };

const probeRien = objectifsPrevusNonCotes([eleveProbe], ateliersProbe, { [String(JOUR)]: ['at1'] }, [], null, MAINTENANT);
t('probe : rien coté, quota 2 → affiché avec 2 restantes', [probeRien[0].objectifs[0].probeReste, probeRien[0].objectifs[0].probeQuota], [2, 2]);

const probeMatin = session('at1', 'op1', { value: 1, guidance: null, creneau: 'matin' }, '2026-08-05T09:00:00.000Z');
const probeUnFait = objectifsPrevusNonCotes([eleveProbe], ateliersProbe, { [String(JOUR)]: ['at1'] }, [probeMatin], null, MAINTENANT);
t('probe : 1 sur 2 faite → toujours affiché, 1 restante', [probeUnFait.length, probeUnFait[0].objectifs[0].probeReste], [1, 1]);

const probeAprem = session('at2', 'op1', { value: 0, guidance: null, creneau: 'aprem' }, '2026-08-05T14:00:00.000Z');
const probeDeuxFaits = objectifsPrevusNonCotes([eleveProbe], ateliersProbe, { [String(JOUR)]: ['at1'] }, [probeMatin, probeAprem], null, MAINTENANT);
t('probe : quota de 2 atteint (même dans un autre atelier) → disparaît', probeDeuxFaits.length, 0);

/* ==================== Règle 5 : regroupement par personne, ordre de students ==================== */
const eleve2 = { id: 'e2', initials: 'C.D.', objectives: [objTrials] };
const ateliersDeux = [{ id: 'at1', name: 'Motricité', usualStudentIds: ['e1', 'e2'], usualObjectives: { e1: ['ot1'], e2: ['ot1'] } }];
const resDeux = objectifsPrevusNonCotes([eleve, eleve2], ateliersDeux, { [String(JOUR)]: ['at1'] }, [], null, MAINTENANT);
t('une entrée par personne concernée, dans l\'ordre de students', resDeux.map((p) => p.studentId), ['e1', 'e2']);

/* ==================== Cas vides ==================== */
t('aucun atelier programmé aujourd\'hui : liste vide', objectifsPrevusNonCotes([eleve], [], {}, [], null, MAINTENANT), []);
t('atelier sans objectifs réglés pour la personne : rien', objectifsPrevusNonCotes(
  [eleve], [{ id: 'at1', name: 'Motricité', usualStudentIds: ['e1'], usualObjectives: {} }], { [String(JOUR)]: ['at1'] }, [], null, MAINTENANT
), []);

/* ==================== Séance en cours ==================== */
const sessionCourante = session('at1', 'ot1', { trials: ['I', null, null], running: false, startedAt: null, mesures: { compteur: { total: 0, valideA: null }, chrono: { elapsedMs: 0, running: false, startedAt: null, valideA: null } } }, new Date(MAINTENANT).toISOString());
const avecCourante = objectifsPrevusNonCotes([eleve], ateliersTrials, { [String(JOUR)]: ['at1'] }, [], sessionCourante, MAINTENANT);
t('la séance en cours compte aussi, pas seulement l\'historique', avecCourante.length, 0);

console.log(`\n${ok} au vert, ${ko} en échec`);
process.exit(ko > 0 ? 1 : 0);
