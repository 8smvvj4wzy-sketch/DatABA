/* Profils répartis entre tablettes : sélection et payload d'export (PR1),
   rapprochement des personnes (PR3), signature et diff des objectifs (PR5),
   fusion du suivi inter-classes (PR9). Même principe que les autres suites :
   les fonctions sont extraites de src/App.jsx et évaluées telles quelles,
   jamais recopiées. */

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

const NOMS = [
  'profilsDeLaClasse', 'axesUtilises', 'payloadProfils',
  'classeDe', 'normaliserInitiales', 'resoudreClasseImportee', 'proposerRapprochementsPersonnes',
  'nomDisponible', 'configCanonique', 'signatureObjectif', 'objectifDejaCote', 'diffObjectifsPersonne',
  'sessionPourPersonne', 'filtrerToile', 'sessionsHorsClasse', 'crisesHorsClasse', 'relevesHorsClasse', 'fusionnerSuiviRecu',
  'marquerTransferes',
];
// proposerRapprochementsPersonnes appelle classeDe, qui replie sur
// CLASSE_INCONNUE (constante sur une seule ligne, donc extraireLigne).
// configCanonique dépend de trois listes de types, également sur une seule
// ligne — PERCENT_TYPES doit être définie avant MASTERY_TYPES, qui la
// référence (`[...PERCENT_TYPES, 'occurrence']`).
const code = `const CLASSE_INCONNUE = ${extraireLigne('CLASSE_INCONNUE')};
const PERCENT_TYPES = ${extraireLigne('PERCENT_TYPES')};
const MASTERY_TYPES = ${extraireLigne('MASTERY_TYPES')};
const USES_GUIDANCE = ${extraireLigne('USES_GUIDANCE')};
${NOMS.map(extraire).join('\n')}
return { ${NOMS.join(', ')} };`;
// eslint-disable-next-line no-new-func
const {
  profilsDeLaClasse, axesUtilises, payloadProfils,
  classeDe, normaliserInitiales, resoudreClasseImportee, proposerRapprochementsPersonnes,
  nomDisponible, configCanonique, signatureObjectif, objectifDejaCote, diffObjectifsPersonne,
  sessionPourPersonne, filtrerToile, sessionsHorsClasse, crisesHorsClasse, relevesHorsClasse, fusionnerSuiviRecu,
  marquerTransferes,
} = new Function(code)();

/* ==================== profilsDeLaClasse ==================== */

const parc = [
  { id: 'a', initials: 'A.B.', classeId: 'g1' },
  { id: 'b', initials: 'C.D.', classeId: 'g2' },
  { id: 'c', initials: 'E.F.', classeId: null },
  { id: 'd', initials: 'G.H.' }, // pas encore migrée : classeId absent
];

t('ne garde que la classe demandée', profilsDeLaClasse(parc, 'g1').map((s) => s.id), ['a']);
t('une personne sans classe (null) n\'est jamais exportée', profilsDeLaClasse(parc, null).map((s) => s.id), []);
t('une personne sans classe (absent) n\'est jamais exportée, même avec un classeId vide en argument', profilsDeLaClasse(parc, undefined).map((s) => s.id), []);
t('aucun match : liste vide', profilsDeLaClasse(parc, 'g9'), []);
t('liste absente : pas de plantage', profilsDeLaClasse(undefined, 'g1'), []);

/* ==================== axesUtilises ==================== */

const axes = [
  { id: 'principal', nom: 'Suivi de stabilité', criteres: [] },
  { id: 'ax2', nom: 'Autonomie repas', criteres: [] },
  { id: 'ax3', nom: 'Non utilisé', criteres: [] },
];
const studentsAvecAxes = [
  { id: 'a', suivisActifs: ['principal'] },
  { id: 'b', suivisActifs: ['ax2', 'principal'] },
  { id: 'c', suivisActifs: [] },
];

t('seuls les axes référencés sont gardés', axesUtilises(studentsAvecAxes, axes).map((a) => a.id).sort(), ['ax2', 'principal']);
t('aucune personne : aucun axe', axesUtilises([], axes), []);
t('personne sans suivisActifs : pas de plantage', axesUtilises([{ id: 'x' }], axes), []);
t('liste d\'axes absente : pas de plantage', axesUtilises(studentsAvecAxes, undefined), []);

/* ==================== payloadProfils ==================== */

const payload = payloadProfils({
  students: [{ id: 'a', initials: 'A.B.', classeId: 'g1' }],
  classes: [{ id: 'g1', name: 'Classe 1' }, { id: 'g2', name: 'Classe 2' }],
  axesSuivi: [{ id: 'principal', nom: 'Suivi de stabilité', criteres: [] }],
  appareil: 'Tablette 1',
  portee: 'classe',
  maintenant: '2026-08-06T09:00:00.000Z',
});

t('format et version', [payload.format, payload.version], ['aba-profils', 1]);
t('horodatage dérivé de maintenant', payload.exportedAt, '2026-08-06T09:00:00.000Z');
t('portee transmise telle quelle', payload.portee, 'classe');
t('la liste COMPLÈTE des classes voyage, pas seulement celle exportée', payload.classes.map((g) => g.id), ['g1', 'g2']);
t('les personnes et axes déjà filtrés par l\'appelant sont repris tels quels', [payload.students.length, payload.axesSuivi.length], [1, 1]);
t('ni ateliers ni emploi du temps dans le payload', ['ateliers' in payload, 'emploiDuTemps' in payload], [false, false]);

/* Alias de compatibilité pour un DatABA Manager pas encore mis à jour vers le
   renommage Groupe → Classe : `groupes` voyage en plus de `classes`, et
   chaque personne porte `groupeId` en plus de `classeId` — jamais à leur
   place. */
t('alias groupes = classes', payload.groupes, payload.classes);
t('alias groupeId par personne, en plus de classeId', payload.students[0].groupeId, payload.students[0].classeId);

const payloadComplet = payloadProfils({
  students: [], classes: [], axesSuivi: [], appareil: 'Centrale', portee: 'complet', maintenant: '2026-08-06T09:00:00.000Z',
});
t('portee complet acceptée telle quelle', payloadComplet.portee, 'complet');

/* ==================== normaliserInitiales ==================== */

t('points, espaces et casse ignorés', [normaliserInitiales('A.B.'), normaliserInitiales('ab'), normaliserInitiales('A B')], ['AB', 'AB', 'AB']);
t('diacritiques retirés', normaliserInitiales('É.À.'), 'EA');
t('chaîne vide ou absente', [normaliserInitiales(''), normaliserInitiales(undefined)], ['', '']);

/* ==================== resoudreClasseImportee ==================== */

const classesLocales = [{ id: 'gl1', name: 'Classe 1' }, { id: 'gl2', name: 'Classe 2' }];

t('résolution par nom, id local renvoyé', resoudreClasseImportee(classesLocales, 'Classe 2'), 'gl2');
t('aucune classe locale du même nom : null, jamais l\'id importé', resoudreClasseImportee(classesLocales, 'Classe 9'), null);
t('liste locale absente : pas de plantage', resoudreClasseImportee(undefined, 'Classe 1'), null);

/* ==================== proposerRapprochementsPersonnes ==================== */

const classesImporteesRappro = [{ id: 'gi1', name: 'Classe 1' }, { id: 'gi2', name: 'Classe 2' }];
const classesLocalesRappro = [{ id: 'gl1', name: 'Classe 1' }, { id: 'gl2', name: 'Classe 2' }];

const studentsLocauxRappro = [
  { id: 'loc-a', initials: 'A.B.', classeId: 'gl1' },
  { id: 'loc-b', initials: 'A.B.', classeId: 'gl2' }, // homonyme, autre classe
];

t('id déjà présent localement : déjà aligné, silencieux', proposerRapprochementsPersonnes(
  [{ id: 'loc-a', initials: 'A.B.', classeId: 'gi1' }], studentsLocauxRappro, classesImporteesRappro, classesLocalesRappro
), [{ importe: { id: 'loc-a', initials: 'A.B.', classeId: 'gi1' }, statut: 'deja-aligne', candidatLocalId: 'loc-a' }]);

const rapproSansIdConnu = proposerRapprochementsPersonnes(
  [{ id: 'imp-x', initials: 'A.B.', classeId: 'gi1' }], studentsLocauxRappro, classesImporteesRappro, classesLocalesRappro
);
t('mêmes initiales ET même classe résolue : candidat proposé, pas appliqué', [rapproSansIdConnu[0].statut, rapproSansIdConnu[0].candidatLocalId], ['a-confirmer', 'loc-a']);

const rapproAutreClasse = proposerRapprochementsPersonnes(
  [{ id: 'imp-y', initials: 'A.B.', classeId: 'gi2' }], studentsLocauxRappro, classesImporteesRappro, classesLocalesRappro
);
t('même initiales mais classe résolue différente : candidate l\'homonyme de la bonne classe, pas l\'autre', rapproAutreClasse[0].candidatLocalId, 'loc-b');

const rapproNouvelle = proposerRapprochementsPersonnes(
  [{ id: 'imp-z', initials: 'Z.Z.', classeId: 'gi1' }], studentsLocauxRappro, classesImporteesRappro, classesLocalesRappro
);
t('aucune correspondance : nouvelle personne', [rapproNouvelle[0].statut, rapproNouvelle[0].candidatLocalId], ['nouvelle', null]);

const rapproClasseInconnueLocalement = proposerRapprochementsPersonnes(
  [{ id: 'imp-w', initials: 'A.B.', classeId: 'gi-fantome' }], studentsLocauxRappro, classesImporteesRappro, classesLocalesRappro
);
t('classe importée introuvable dans la liste importée : aucun candidat, plutôt que de risquer un mélange', rapproClasseInconnueLocalement[0].statut, 'nouvelle');

t('liste importée absente : pas de plantage', proposerRapprochementsPersonnes(undefined, studentsLocauxRappro, classesImporteesRappro, classesLocalesRappro), []);

/* ==================== nomDisponible ==================== */

const itemsNommes = [{ id: 't1', name: 'Pointer une image' }, { id: 't2', name: 'Pointer une image (2)' }];

t('nomDisponible — nom libre inchangé', nomDisponible('Nouveau', itemsNommes), 'Nouveau');
t('nomDisponible — suffixe le premier créneau libre', nomDisponible('Pointer une image', itemsNommes), 'Pointer une image (3)');
t('nomDisponible — ignore son propre nom (édition)', nomDisponible('Pointer une image', itemsNommes, 't1'), 'Pointer une image');

/* ==================== configCanonique / signatureObjectif ==================== */

// Mêmes étapes par défaut, jamais renommées, mais des ids différents —
// exactement le piège DEFAULT_CHAIN_STEPS (st1..st3 sur une tablette, autre
// chose sur une autre si la bibliothèque a divergé entre versions).
const stepsA = [{ id: 'st1', name: '' }, { id: 'st2', name: '' }, { id: 'st3', name: '' }];
const stepsB = [{ id: 'stX1', name: '' }, { id: 'stX2', name: '' }, { id: 'stX3', name: '' }];
const stepsC = [{ id: 'st1', name: 'Ouvrir' }, { id: 'st2', name: 'Enfiler' }, { id: 'st3', name: 'Fermer' }];

t('configCanonique ignore les ids d\'étapes, compare le contenu', configCanonique('chaining', { steps: stepsA }), configCanonique('chaining', { steps: stepsB }));
t('configCanonique détecte un vrai contenu différent : signatures distinctes', JSON.stringify(configCanonique('chaining', { steps: stepsA })) === JSON.stringify(configCanonique('chaining', { steps: stepsC })), false);

const levelsA = [{ id: 'lv1', name: 'Stable' }, { id: 'lv2', name: 'Crise' }];
const levelsB = [{ id: 'lvA', name: 'Stable' }, { id: 'lvB', name: 'Crise' }];
t('configCanonique résout targetLevelId en nom, pas en id', configCanonique('interval', { levels: levelsA, targetLevelId: 'lv1' }), configCanonique('interval', { levels: levelsB, targetLevelId: 'lvA' }));

const objA = { id: 'a1', name: "Suite d'habillage", type: 'chaining', config: { steps: stepsA, avecChrono: false, avecCompteur: false }, favorite: true, currentTargetId: null, masteredTargetIds: [], phaseHistory: [{ id: 'ph1', name: 'Intervention', date: null }] };
const objB = { id: 'a2', name: "Suite d'habillage", type: 'chaining', config: { steps: stepsB, avecChrono: false, avecCompteur: false }, favorite: false, currentTargetId: null, masteredTargetIds: ['x'], phaseHistory: [] };
t('signatureObjectif ignore id, favorite, progression, phaseHistory', signatureObjectif(objA), signatureObjectif(objB));
t('signatureObjectif change avec le nom', signatureObjectif(objA) === signatureObjectif({ ...objA, name: 'Autre nom' }), false);

/* ==================== objectifDejaCote ==================== */

const sessionsAvecSnapshot = [{ id: 's1', objectiveSnapshot: { obj1: {} } }, { id: 's2', objectiveSnapshot: {} }];
t('objectifDejaCote détecte un objectif figé dans un snapshot', objectifDejaCote(sessionsAvecSnapshot, 'obj1'), true);
t('objectifDejaCote : rien si jamais figé', objectifDejaCote(sessionsAvecSnapshot, 'obj9'), false);
t('objectifDejaCote : pas de plantage sans séances', objectifDejaCote(undefined, 'obj1'), false);

/* ==================== diffObjectifsPersonne ==================== */

const localHabillage = { id: 'L1', name: "Suite d'habillage", type: 'chaining', config: { steps: stepsA } };

t('même id, même signature : deja-aligne', diffObjectifsPersonne(
  [localHabillage], [{ id: 'L1', name: "Suite d'habillage", type: 'chaining', config: { steps: stepsA } }]
)[0].statut, 'deja-aligne');

t('id différent mais même nom et étapes par défaut non renommées : identique-contenu, PAS conflit', diffObjectifsPersonne(
  [localHabillage], [{ id: 'IMP2', name: "Suite d'habillage", type: 'chaining', config: { steps: stepsB } }]
)[0].statut, 'identique-contenu');

t('même nom, contenu vraiment différent : conflit', diffObjectifsPersonne(
  [localHabillage], [{ id: 'IMP3', name: "Suite d'habillage", type: 'chaining', config: { steps: stepsC } }]
)[0].statut, 'conflit');

t('aucun objectif local du même nom : nouveau', diffObjectifsPersonne(
  [localHabillage], [{ id: 'IMP4', name: 'Objectif totalement nouveau', type: 'trials', config: { trialCount: 5 } }]
)[0].statut, 'nouveau');

t('liste locale absente : tout devient nouveau, pas de plantage', diffObjectifsPersonne(
  undefined, [{ id: 'IMP4', name: 'X', type: 'trials', config: {} }]
)[0].statut, 'nouveau');
t('liste importée absente : liste vide', diffObjectifsPersonne([localHabillage], undefined), []);

/* ==================== sessionPourPersonne ==================== */

const seanceMixte = {
  id: 'se1', date: 't', startedAt: 1, mode: 'atelier', atelierId: 'at1', intervenantId: 'i1',
  studentIds: ['a', 'b'],
  selectedObjectives: { a: ['oa1'], b: ['ob1'] },
  objectiveSnapshot: { oa1: { id: 'oa1', name: 'Obj A' }, ob1: { id: 'ob1', name: 'Obj B' } },
  data: { a: { oa1: { result: 'x' } }, b: { ob1: { result: 'y' } } },
  notes: { a: 'note a', b: 'note b' },
  hidden: { a: ['oa1'] },
  presence: { a: { from: 1, to: null }, b: { from: 1, to: null } },
  priorityOrder: ['a|oa1', 'b|ob1'],
  pauses: [],
};
const projA = sessionPourPersonne(seanceMixte, 'a');

t('sessionPourPersonne : ne garde que la personne visée', projA.studentIds, ['a']);
t('sessionPourPersonne : selectedObjectives réduit à la personne', projA.selectedObjectives, { a: ['oa1'] });
t('sessionPourPersonne : objectiveSnapshot réduit aux objectifs encore référencés', Object.keys(projA.objectiveSnapshot), ['oa1']);
t('sessionPourPersonne : aucune fuite dans data', projA.data, { a: { oa1: { result: 'x' } } });
t('sessionPourPersonne : aucune fuite dans notes', projA.notes, { a: 'note a' });
t('sessionPourPersonne : aucune fuite dans hidden', projA.hidden, { a: ['oa1'] });
t('sessionPourPersonne : aucune fuite dans presence', projA.presence, { a: { from: 1, to: null } });
t('sessionPourPersonne : priorityOrder filtré', projA.priorityOrder, ['a|oa1']);
t('sessionPourPersonne : personne absente de la séance → studentIds vide', sessionPourPersonne(seanceMixte, 'z').studentIds, []);
t('sessionPourPersonne : séance absente, pas de plantage', sessionPourPersonne(null, 'a'), null);

/* ==================== sessionsHorsClasse / crisesHorsClasse / relevesHorsClasse ==================== */

const studentsClassesTest = [
  { id: 'a', initials: 'A', classeId: 'g1' },
  { id: 'b', initials: 'B', classeId: 'g2' },
  { id: 'c', initials: 'C', classeId: null },
];
const seanceTrois = {
  ...seanceMixte, studentIds: ['a', 'b', 'c'],
  selectedObjectives: { a: ['oa1'], b: ['ob1'], c: [] },
  data: { a: {}, b: {}, c: {} }, presence: {}, notes: {}, hidden: {},
};
const horsClasse = sessionsHorsClasse([seanceTrois], studentsClassesTest, 'g1');

t('sessionsHorsClasse : une ligne pour la personne d\'une autre classe', horsClasse.length, 1);
t('sessionsHorsClasse : projetée sur la bonne personne, ni la même classe ni la personne sans classe', horsClasse[0].studentIds, ['b']);
t('sessionsHorsClasse : sans classeAppareil, rien ne part', sessionsHorsClasse([seanceTrois], studentsClassesTest, null), []);

const crisesTest = [{ id: 'cr1', studentId: 'a' }, { id: 'cr2', studentId: 'b' }, { id: 'cr3', studentId: 'c' }];
t('crisesHorsClasse : seule la crise de l\'autre classe part', crisesHorsClasse(crisesTest, studentsClassesTest, 'g1').map((c) => c.id), ['cr2']);
t('crisesHorsClasse : sans classeAppareil, rien ne part', crisesHorsClasse(crisesTest, studentsClassesTest, null), []);

const relevesTest = [{ id: 'r1', studentId: 'a' }, { id: 'r2', studentId: 'b' }];
t('relevesHorsClasse : seul le relevé de l\'autre classe part', relevesHorsClasse(relevesTest, studentsClassesTest, 'g1').map((r) => r.id), ['r2']);

/* Une fois transfereAt posé, l'élément sort du lot « à transférer » — sans
   ce filtre, le compteur de l'écran Export ne retombait jamais à zéro après
   un renvoi réussi. `tout` le fait quand même ressortir : reprise après un
   fichier perdu. */
const seanceTransferee = { ...seanceTrois, transfereAt: '2026-08-20T10:00:00.000Z' };
t('sessionsHorsClasse : une séance déjà transférée ne repart pas', sessionsHorsClasse([seanceTransferee], studentsClassesTest, 'g1'), []);
t('sessionsHorsClasse : « tout » la fait quand même repartir', sessionsHorsClasse([seanceTransferee], studentsClassesTest, 'g1', true).length, 1);

const crisesTransfert = [{ id: 'cr2', studentId: 'b', transfereAt: '2026-08-20T10:00:00.000Z' }];
t('crisesHorsClasse : une crise déjà transférée ne repart pas', crisesHorsClasse(crisesTransfert, studentsClassesTest, 'g1'), []);
t('crisesHorsClasse : « tout » la fait quand même repartir', crisesHorsClasse(crisesTransfert, studentsClassesTest, 'g1', true).map((c) => c.id), ['cr2']);

const relevesTransfert = [{ id: 'r2', studentId: 'b', transfereAt: '2026-08-20T10:00:00.000Z' }];
t('relevesHorsClasse : un relevé déjà transféré ne repart pas', relevesHorsClasse(relevesTransfert, studentsClassesTest, 'g1'), []);
t('relevesHorsClasse : « tout » le fait quand même repartir', relevesHorsClasse(relevesTransfert, studentsClassesTest, 'g1', true).map((r) => r.id), ['r2']);

/* ==================== marquerTransferes ==================== */

const marques = marquerTransferes(
  [{ id: 'x', v: 1 }, { id: 'y', v: 2 }], ['x'], '2026-08-23T09:00:00.000Z'
);
t('marquerTransferes : seul l\'id ciblé reçoit la marque', marques.map((m) => m.transfereAt), ['2026-08-23T09:00:00.000Z', undefined]);
t('marquerTransferes : liste absente, pas de plantage', marquerTransferes(undefined, ['x'], 'q'), []);
t('marquerTransferes : ids absents, pas de plantage', marquerTransferes([{ id: 'x' }], undefined, 'q')[0].transfereAt, undefined);

/* ==================== fusionnerSuiviRecu ==================== */

const studentsLocauxFusion = [{ id: 'x', initials: 'X', objectives: [{ id: 'ox1', name: 'Obj X' }] }];
const sessionConnue = { id: 'sf1', studentIds: ['x'], objectiveSnapshot: { ox1: {} } };
const sessionObjectifInconnu = { id: 'sf2', studentIds: ['x'], objectiveSnapshot: { 'ox-fantome': {} } };
const sessionPersonneInconnue = { id: 'sf3', studentIds: ['y'], objectiveSnapshot: {} };

const res1 = fusionnerSuiviRecu({
  sessionsLocales: [], crisesLocales: [], relevesLocales: [], studentsLocaux: studentsLocauxFusion,
  recu: { sessions: [sessionConnue, sessionObjectifInconnu, sessionPersonneInconnue], crises: [], suivi: [] },
});
t('fusionnerSuiviRecu : séance aux objectifs connus acceptée', res1.sessions.map((s) => s.id), ['sf1']);
t('fusionnerSuiviRecu : objectif inconnu ET studentId inconnu rejetés EN BLOC (2 séances)', res1.ignorees.idInconnu, 2);

const res2 = fusionnerSuiviRecu({
  sessionsLocales: res1.sessions, crisesLocales: [], relevesLocales: [], studentsLocaux: studentsLocauxFusion,
  recu: { sessions: [sessionConnue], crises: [], suivi: [] },
});
t('fusionnerSuiviRecu : réimporter la même séance n\'ajoute rien', res2.sessions.length, 1);
t('fusionnerSuiviRecu : comptée comme déjà présente, pas comme un nouvel ajout', res2.ignorees.dejaPresentes, 1);

const res3 = fusionnerSuiviRecu({
  sessionsLocales: [], crisesLocales: [], relevesLocales: [], studentsLocaux: studentsLocauxFusion,
  recu: {
    sessions: [],
    crises: [{ id: 'cf1', studentId: 'x' }, { id: 'cf2', studentId: 'z' }],
    suivi: [{ id: 'rf1', studentId: 'x' }, { id: 'rf2', studentId: 'z' }],
  },
});
t('fusionnerSuiviRecu : crise et relevé au studentId inconnu rejetés', [res3.crises.length, res3.releves.length], [1, 1]);
t('fusionnerSuiviRecu : comptés comme id inconnu (1 crise + 1 relevé)', res3.ignorees.idInconnu, 2);

t('fusionnerSuiviRecu : rien reçu, pas de plantage', fusionnerSuiviRecu({
  sessionsLocales: [], crisesLocales: [], relevesLocales: [], studentsLocaux: studentsLocauxFusion, recu: {},
}).sessions, []);

/* La marque « transfereAt » de la tablette expéditrice ne doit jamais
   traverser : elle dit « parti d'ici », pas « à ne plus jamais renvoyer ». La
   personne peut changer de classe sur la tablette qui reçoit et rendre cette
   même donnée hors classe à son tour. */
const sessionDejaTransfereeAilleurs = { id: 'sf4', studentIds: ['x'], objectiveSnapshot: { ox1: {} }, transfereAt: '2026-08-01T00:00:00.000Z' };
const crisTransfereeAilleurs = { id: 'cf3', studentId: 'x', transfereAt: '2026-08-01T00:00:00.000Z' };
const releveTransfereAilleurs = { id: 'rf3', studentId: 'x', transfereAt: '2026-08-01T00:00:00.000Z' };
const res4 = fusionnerSuiviRecu({
  sessionsLocales: [], crisesLocales: [], relevesLocales: [], studentsLocaux: studentsLocauxFusion,
  recu: { sessions: [sessionDejaTransfereeAilleurs], crises: [crisTransfereeAilleurs], suivi: [releveTransfereAilleurs] },
});
t('fusionnerSuiviRecu : transfereAt remis à null sur une séance reçue', res4.sessions[0].transfereAt, null);
t('fusionnerSuiviRecu : transfereAt remis à null sur une crise reçue', res4.crises[0].transfereAt, null);
t('fusionnerSuiviRecu : transfereAt remis à null sur un relevé reçu', res4.releves[0].transfereAt, null);

console.log(`\n${ok} au vert, ${ko} en échec`);
process.exit(ko > 0 ? 1 : 0);
