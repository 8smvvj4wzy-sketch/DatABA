/* Profils répartis entre tablettes : sélection et payload d'export (PR1),
   rapprochement des personnes (PR3), signature et diff des objectifs (PR5),
   fusion du suivi inter-groupes (PR9). Même principe que les autres suites :
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

const NOMS = ['profilsDuGroupe', 'axesUtilises', 'payloadProfils'];
const code = `${NOMS.map(extraire).join('\n')}\nreturn { ${NOMS.join(', ')} };`;
// eslint-disable-next-line no-new-func
const { profilsDuGroupe, axesUtilises, payloadProfils } = new Function(code)();

/* ==================== profilsDuGroupe ==================== */

const parc = [
  { id: 'a', initials: 'A.B.', groupeId: 'g1' },
  { id: 'b', initials: 'C.D.', groupeId: 'g2' },
  { id: 'c', initials: 'E.F.', groupeId: null },
  { id: 'd', initials: 'G.H.' }, // pas encore migrée : groupeId absent
];

t('ne garde que le groupe demandé', profilsDuGroupe(parc, 'g1').map((s) => s.id), ['a']);
t('une personne sans groupe (null) n\'est jamais exportée', profilsDuGroupe(parc, null).map((s) => s.id), []);
t('une personne sans groupe (absent) n\'est jamais exportée, même avec un groupeId vide en argument', profilsDuGroupe(parc, undefined).map((s) => s.id), []);
t('aucun match : liste vide', profilsDuGroupe(parc, 'g9'), []);
t('liste absente : pas de plantage', profilsDuGroupe(undefined, 'g1'), []);

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
  students: [{ id: 'a', initials: 'A.B.', groupeId: 'g1' }],
  groupes: [{ id: 'g1', name: 'Classe 1' }, { id: 'g2', name: 'Classe 2' }],
  axesSuivi: [{ id: 'principal', nom: 'Suivi de stabilité', criteres: [] }],
  appareil: 'Tablette 1',
  portee: 'groupe',
  maintenant: '2026-08-06T09:00:00.000Z',
});

t('format et version', [payload.format, payload.version], ['aba-profils', 1]);
t('horodatage dérivé de maintenant', payload.exportedAt, '2026-08-06T09:00:00.000Z');
t('portee transmise telle quelle', payload.portee, 'groupe');
t('la liste COMPLÈTE des groupes voyage, pas seulement celui exporté', payload.groupes.map((g) => g.id), ['g1', 'g2']);
t('les personnes et axes déjà filtrés par l\'appelant sont repris tels quels', [payload.students.length, payload.axesSuivi.length], [1, 1]);
t('ni ateliers ni emploi du temps dans le payload', ['ateliers' in payload, 'emploiDuTemps' in payload], [false, false]);

const payloadComplet = payloadProfils({
  students: [], groupes: [], axesSuivi: [], appareil: 'Centrale', portee: 'complet', maintenant: '2026-08-06T09:00:00.000Z',
});
t('portee complet acceptée telle quelle', payloadComplet.portee, 'complet');

console.log(`\n${ok} au vert, ${ko} en échec`);
process.exit(ko > 0 ? 1 : 0);
