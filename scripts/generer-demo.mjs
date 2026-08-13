#!/usr/bin/env node
/* Générateur du jeu de démonstration : trois mois de cotation.
 *
 *   node scripts/generer-demo.mjs [--fin AAAA-MM-JJ] [--graine N] [--sortie demo/]
 *
 * Produit une sauvegarde `aba-backup` v4 en clair, importable telle quelle
 * dans DatABA (restauration complète) comme dans DatABA Manager (fusion), et
 * un second fichier réduit qui n'existe que pour débloquer l'IOA de Manager —
 * `trouverPaires` exige deux séances de double cotation venant de deux
 * appareils différents.
 *
 * Deux exigences dictent la forme du code :
 *
 * 1. Reproductibilité. Même graine et même date de fin ⇒ fichier identique,
 *    octet pour octet. Sans ça le diff git d'une régénération est illisible et
 *    on ne peut plus vérifier que le JSON versionné correspond bien au script.
 *    D'où un générateur pseudo-aléatoire à graine, des identifiants dérivés du
 *    contenu plutôt que d'un compteur d'appel, et un `exportedAt` calculé
 *    depuis la date de fin — jamais `Date.now()`.
 *
 * 2. Indépendance au fuseau. Les horodatages sont construits en UTC et
 *    cantonnés entre 8 h et 18 h, si bien qu'aucun relevé ne change de journée
 *    calendaire quand `jourLocal` (côté application) le relit dans un fuseau
 *    européen. Un relevé à 23 h UTC basculerait au lendemain à Paris et
 *    déplacerait silencieusement une frise entière.
 *
 * Les données sont fictives. Les personnes accompagnées y sont désignées par
 * des initiales, comme dans l'application — PRODUCT.md l'exige jusque dans une
 * maquette. Les intervenants aussi : un croisement par intervenant se lit trop
 * vite comme une évaluation de professionnel, autant ne pas y mettre de nom.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/* ==================== 1. Hasard reproductible ==================== */

/* mulberry32 : générateur à état 32 bits, court et suffisant ici — on veut de
   la variété reproductible, pas des propriétés cryptographiques. */
function mulberry32(graine) {
  let a = graine >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function entier(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
function parmi(rng, liste) {
  return liste[Math.floor(rng() * liste.length)];
}
/* Mélange de Fisher-Yates, sur une copie : mélanger en place une liste de
   configuration la corromprait pour tous les appels suivants. */
function melanger(rng, liste) {
  const l = liste.slice();
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
}

/* Tous les identifiants sont préfixés : fusionnés dans un Manager qui contient
   déjà de vraies données, ils ne peuvent alors pas entrer en collision avec un
   `uid()` de tablette — et ils se repèrent à l'œil dans un export. */
const P = 'demo';
const idPersonne = (ini) => `${P}-p-${ini.replace(/\./g, '').toLowerCase()}`;
const idObjectif = (ini, cle) => `${P}-o-${ini.replace(/\./g, '').toLowerCase()}-${cle}`;

/* ==================== 2. Calendrier ==================== */

const MS_JOUR = 86400000;

function jourDeDate(d) {
  return d.toISOString().slice(0, 10);
}
function dateDeJour(jour) {
  const [a, m, j] = jour.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j));
}
/* Horodatage d'un moment de la journée, en UTC. Les heures restent dans la
   plage 8 h – 18 h, voir l'en-tête du fichier. */
function horodatage(jour, h, min) {
  const d = dateDeJour(jour);
  return new Date(d.getTime() + h * 3600000 + min * 60000);
}
function jourSemaine(jour) {
  return dateDeJour(jour).getUTCDay();
}
function ajouterJours(jour, n) {
  return jourDeDate(new Date(dateDeJour(jour).getTime() + n * MS_JOUR));
}

/* Les jours ouvrés de la fenêtre, moins la semaine de congés. Le trou n'est
   pas un oubli : il donne à Manager de quoi distinguer « zéro crise » de « pas
   observé », deux lectures que `joursObserves` sépare et qu'un jeu de données
   sans interruption ne permet pas de montrer. */
function construireCalendrier(finJour) {
  const debut = ajouterJours(finJour, -91);
  const conges = { debut: ajouterJours(finJour, -23), fin: ajouterJours(finJour, -17) };
  const jours = [];
  for (let j = debut; j <= finJour; j = ajouterJours(j, 1)) {
    const d = jourSemaine(j);
    if (d === 0 || d === 6) continue;
    if (j >= conges.debut && j <= conges.fin) continue;
    jours.push(j);
  }
  return { debut, fin: finJour, conges, jours };
}

/* ==================== 3. Référentiel ==================== */

const GUIDANCES = [
  { code: 'I', label: 'Indépendant', color: '#00A870', independent: true },
  { code: 'GP', label: 'Guidance partielle', color: '#FF8A3D', independent: false },
  { code: 'GT', label: 'Guidance totale', color: '#FF4D6D', independent: false },
  { code: '0', label: 'Mauvaise réponse', color: '#64748B', independent: false },
];
const NON_INDEPENDANTS = ['GP', 'GT', '0'];

const ISSUES_EQUILIBRE = [
  { k: 'reussi', label: 'Réussi', short: 'R', color: '#00A870', reussite: true },
  { k: 'guide', label: 'Guidé', short: 'G', color: '#FF8A3D', reussite: false },
  { k: 'erreur', label: 'Mauvaise réponse', short: 'E', color: '#FF4D6D', reussite: false },
  { k: 'manque', label: 'Étape manquée', short: 'M', color: '#64748B', reussite: false, exclu: true },
];

/* L'identifiant `principal` est volontairement figé, comme dans l'application :
   c'est l'axe historique vers lequel toutes les tablettes migrent, et le seul
   que `releverAliasStabilite` projette en v3. */
const AXES = [
  {
    id: 'principal',
    nom: 'Suivi de stabilité',
    criteres: [
      { k: 'stable', l: 'Stable', color: '#00A870' },
      { k: 'pre-crise', l: 'Pré-crise', color: '#FF8A3D' },
      { k: 'crise', l: 'Crise', color: '#B3261E' },
      { k: 'post-crise', l: 'Post-crise', color: '#00B8D9' },
    ],
  },
  {
    id: `${P}-axe-engagement`,
    nom: "Engagement dans l'activité",
    criteres: [
      { k: 'engage', l: 'Engagé', color: '#3B5BDB' },
      { k: 'partiel', l: 'Engagement partiel', color: '#A78BFA' },
      { k: 'opposition', l: 'Opposition', color: '#FF4D6D' },
    ],
  },
];
/* Clé retirée de la configuration de l'axe mais encore portée par d'anciens
   relevés : c'est ce qui fait apparaître « Critère retiré » dans Manager.
   Le cas se produit dès qu'on renomme un critère sur la tablette, et il vaut
   mieux qu'une démonstration le montre plutôt qu'il surprenne en réunion. */
const CRITERE_RETIRE = 'sieste';

const CLASSES = [
  { id: `${P}-cl-a`, name: 'Unité A' },
  { id: `${P}-cl-b`, name: 'Unité B' },
];

const INTERVENANTS = [
  { id: `${P}-i-1`, name: 'M.R.' },
  { id: `${P}-i-2`, name: 'S.T.' },
  { id: `${P}-i-3`, name: 'L.F.' },
];

const ATELIERS = [
  { id: `${P}-a-repas`, name: 'Repas' },
  { id: `${P}-a-social`, name: 'Habiletés sociales' },
  { id: `${P}-a-hygiene`, name: 'Autonomie et hygiène' },
  { id: `${P}-a-cuisine`, name: 'Atelier cuisine' },
];

/* Emploi du temps indexé par `Date.getDay()`, comme le stocke l'application.
   Le jeudi porte trois ateliers : c'est ce qui produit des journées à trois
   séances et donne du relief au croisement par jour de semaine. */
const EMPLOI_DU_TEMPS = {
  0: [],
  1: [`${P}-a-repas`, `${P}-a-social`],
  2: [`${P}-a-repas`, `${P}-a-hygiene`],
  3: [`${P}-a-repas`, `${P}-a-cuisine`],
  4: [`${P}-a-repas`, `${P}-a-social`, `${P}-a-hygiene`],
  5: [`${P}-a-repas`, `${P}-a-cuisine`],
  6: [],
};

const CRENEAUX_ATELIER = {
  [`${P}-a-repas`]: { h: 11, min: 45, duree: 45 },
  [`${P}-a-social`]: { h: 9, min: 30, duree: 50 },
  [`${P}-a-hygiene`]: { h: 8, min: 30, duree: 40 },
  [`${P}-a-cuisine`]: { h: 14, min: 0, duree: 60 },
};

/* ==================== 4. Catalogue EFL ==================== */

/* Les huit essentiels de l'EFL tels que l'établissement les travaille. Le
   libellé sert au regroupement dans la documentation de démonstration et au
   contrôle de couverture du test ; l'application, elle, ne connaît pas la
   notion — un objectif n'y porte pas de domaine. */
export const ESSENTIELS = {
  demandes: 'Faire des demandes',
  attendre: 'Attendre après une demande',
  tolerer: 'Tolérer le non',
  securite: 'Suivre des consignes de sécurité',
  enchainer: 'Enchaîner des tâches acquises',
  transitions: 'Faire des transitions',
  hygiene: 'Réaliser les gestes quotidiens d’hygiène',
  sante: 'Tolérer les situations de santé et de sécurité',
};

const etapes = (prefixe, noms) => noms.map((name, i) => ({ id: `${prefixe}-${i + 1}`, name }));

const SEUIL_POURCENT = { threshold: 80, sessions: 3, unit: 'sessions', sens: 'min' };
const SEUIL_JOURS = { threshold: 100, sessions: 3, unit: 'days', sens: 'min' };

/* Un objectif du catalogue. `type` est le mode de cotation de l'application ;
   `config` est recopiée telle quelle dans l'objectif de la personne. */
export const CATALOGUE = [
  {
    cle: 'pause',
    essentiel: 'demandes',
    nom: 'Demander une pause avec le signe PAUSE',
    type: 'occurrence',
    /* Comptage en sens « min » : on veut que la demande devienne fréquente.
       Le critère est posé explicitement, et il le faut — Manager ne rend un
       verdict sur un comptage que si la tablette a réglé le seuil
       (`critereDe`, drapeau `explicite`). Sans lui l'objectif n'est pas
       « non acquis », il est simplement hors critère. */
    config: { mastery: { threshold: 5, sessions: 3, unit: 'sessions', sens: 'min' }, avecCompteur: true },
  },
  {
    cle: 'picto',
    essentiel: 'demandes',
    nom: 'Demander un objet désiré par pictogramme',
    type: 'trials',
    config: {
      trialCount: 10,
      guidanceSet: GUIDANCES,
      mastery: SEUIL_POURCENT,
      targets: [
        { id: `${P}-ci-1`, name: 'Objets du quotidien' },
        { id: `${P}-ci-2`, name: 'Aliments' },
        { id: `${P}-ci-3`, name: 'Activités' },
      ],
    },
  },
  {
    cle: 'aide',
    essentiel: 'demandes',
    nom: "Demander de l'aide face à une tâche difficile",
    type: 'trials',
    config: { trialCount: 8, guidanceSet: GUIDANCES, mastery: SEUIL_POURCENT },
  },
  {
    cle: 'mands',
    essentiel: 'demandes',
    nom: 'Demandes spontanées, toutes formes',
    type: 'occurrence',
    /* Volontairement sans `mastery` : c'est un suivi de fréquence que
       personne n'a demandé de juger. Manager le classe « mesure », et c'est
       le seul moyen de peupler cet état. */
    config: { avecCompteur: true },
  },
  {
    cle: 'attente',
    essentiel: 'attendre',
    nom: 'Attendre deux minutes après une demande',
    type: 'interval',
    config: {
      intervalSeconds: 60,
      intervalMode: 'momentane',
      levels: [
        { id: `${P}-lv-calme`, name: 'Attente calme' },
        { id: `${P}-lv-agite`, name: 'Attente agitée' },
        { id: `${P}-lv-refus`, name: "Refus d'attendre" },
      ],
      targetLevelId: `${P}-lv-calme`,
      mastery: SEUIL_POURCENT,
    },
  },
  {
    cle: 'tour',
    essentiel: 'attendre',
    nom: 'Attendre son tour au repas',
    type: 'trials',
    config: { trialCount: 6, guidanceSet: GUIDANCES, mastery: SEUIL_POURCENT },
  },
  {
    cle: 'refus',
    essentiel: 'tolerer',
    nom: 'Accepter un refus sans comportement problème',
    type: 'trials',
    config: { trialCount: 10, guidanceSet: GUIDANCES, mastery: SEUIL_POURCENT },
  },
  {
    cle: 'cp',
    essentiel: 'tolerer',
    nom: "Comportements problèmes lors d'un refus",
    type: 'occurrence',
    /* Sens « max » : l'objectif est acquis quand le comptage passe SOUS le
       seuil. C'est le seul endroit du jeu où le sens s'inverse, et Manager
       l'affiche « au plus 2 occurrences » plutôt que « seuil 2 ». */
    config: { mastery: { threshold: 2, sessions: 3, unit: 'sessions', sens: 'max' }, avecCompteur: true },
  },
  {
    cle: 'stop',
    essentiel: 'securite',
    nom: 'Répondre à STOP en moins de trois secondes',
    type: 'probe',
    /* Deux prises par jour : les créneaux matin/après-midi n'existent que
       dans ce cas, et le critère se compte en JOURS — deux probes le même
       jour ne valent qu'un point. */
    config: { probesParJour: 2, useGuidance: false, mastery: SEUIL_JOURS },
  },
  {
    cle: 'appel',
    essentiel: 'securite',
    nom: "Venir quand on l'appelle, en extérieur",
    type: 'trials',
    config: { trialCount: 5, guidanceSet: GUIDANCES, mastery: SEUIL_POURCENT },
  },
  {
    cle: 'enchainer',
    essentiel: 'enchainer',
    nom: 'Enchaîner trois tâches acquises sans guidance',
    type: 'chaining',
    config: {
      steps: etapes(`${P}-st-ench`, ['Ranger le matériel', 'Mettre la table', 'Trier le linge']),
      guidanceSet: GUIDANCES,
      mastery: SEUIL_POURCENT,
    },
  },
  {
    cle: 'equilibre',
    essentiel: 'enchainer',
    nom: 'Alterner demandes et travail',
    type: 'balance',
    config: {
      steps: etapes(`${P}-st-eq`, ['Demande initiale', 'Première tâche', 'Deuxième tâche', 'Retour au renforçateur']),
      balanceOutcomes: ISSUES_EQUILIBRE,
      mastery: { threshold: 75, sessions: 3, unit: 'sessions', sens: 'min' },
    },
  },
  {
    cle: 'transition',
    essentiel: 'transitions',
    nom: 'Transition entre deux activités',
    type: 'trials',
    config: { trialCount: 8, guidanceSet: GUIDANCES, mastery: SEUIL_POURCENT },
  },
  {
    cle: 'changement',
    essentiel: 'transitions',
    nom: "Accepter un changement annoncé d'emploi du temps",
    type: 'probe',
    config: { probesParJour: 1, useGuidance: false, mastery: SEUIL_JOURS },
  },
  {
    cle: 'mains',
    essentiel: 'hygiene',
    nom: 'Se laver les mains',
    type: 'chaining',
    config: {
      steps: etapes(`${P}-st-mains`, [
        'Ouvrir le robinet',
        'Mouiller les mains',
        'Prendre le savon',
        'Frotter les paumes',
        'Frotter le dos des mains',
        'Rincer',
        'Sécher',
      ]),
      guidanceSet: GUIDANCES,
      mastery: SEUIL_POURCENT,
    },
  },
  {
    cle: 'dents',
    essentiel: 'hygiene',
    nom: 'Se brosser les dents',
    type: 'chaining',
    config: {
      steps: etapes(`${P}-st-dents`, [
        'Prendre la brosse',
        'Mettre le dentifrice',
        'Brosser en haut',
        'Brosser en bas',
        'Rincer la bouche',
        'Ranger la brosse',
      ]),
      guidanceSet: GUIDANCES,
      mastery: SEUIL_POURCENT,
    },
  },
  {
    cle: 'temperature',
    essentiel: 'sante',
    nom: 'Tolérer la prise de température',
    type: 'trials',
    /* Chronomètre auxiliaire : la donnée voyage dans `entry.mesures` et
       ressort dans l'export détaillé, à part du score de la cotation. */
    config: { trialCount: 5, guidanceSet: GUIDANCES, mastery: SEUIL_POURCENT, avecChrono: true, chronoMode: 'chrono' },
  },
  {
    cle: 'cheveux',
    essentiel: 'sante',
    nom: 'Tolérer le brossage des cheveux',
    type: 'interval',
    config: {
      intervalSeconds: 30,
      intervalMode: 'total',
      levels: [
        { id: `${P}-lv-tol`, name: 'Tolère' },
        { id: `${P}-lv-retrait`, name: 'Se retire' },
        { id: `${P}-lv-opp`, name: 'Opposition' },
      ],
      targetLevelId: `${P}-lv-tol`,
      mastery: SEUIL_POURCENT,
    },
  },
  {
    cle: 'soin',
    essentiel: 'sante',
    nom: 'Tolérer un soin cutané',
    type: 'probe',
    config: { probesParJour: 1, useGuidance: true, guidanceSet: GUIDANCES, mastery: SEUIL_JOURS },
  },
];

const parCle = new Map(CATALOGUE.map((o) => [o.cle, o]));

/* ==================== 5. Trajectoires ==================== */

/* Une forme rend un niveau de réussite entre 0 et 1, où 1 est le meilleur.
   La conversion vers la cotation réelle dépend ensuite du mode : pourcentage,
   comptage croissant, comptage décroissant, réussite binaire d'un probe.
   Découpler les deux évite d'écrire six fois la même courbe.

   Les seuils visés sont ceux d'`analyserObjectif` côté Manager :
   0,80 pour un pourcentage à seuil 80, 0,78 pour un comptage en sens « max »
   à seuil 2, 0,56 pour un comptage en sens « min » à seuil 5. Un niveau à
   0,86 les tient tous les trois. */
const FORMES = {
  /* Progression franche : les six derniers relevés tiennent le seuil, donc la
     suite dépasse les trois exigées et l'objectif bascule « acquis ». */
  acquis: (i, n) => (i >= n - 6 ? 0.86 + 0.03 * (i % 3) : 0.30 + (0.45 * i) / Math.max(1, n - 6)),

  /* Déjà en maintien : haut et stable du premier au dernier relevé. */
  maintien: (i) => 0.88 + 0.04 * (i % 2),

  /* Les deux derniers relevés tiennent le seuil, le troisième en partant de
     la fin non : la suite vaut exactement deux, soit `needed - 1`. C'est la
     définition de « bientôt acquis », et elle ne tolère pas l'à-peu-près. */
  bientot: (i, n) => (i >= n - 2 ? 0.86 + 0.03 * (i % 2) : i === n - 3 ? 0.70 : 0.30 + (0.35 * i) / Math.max(1, n - 3)),

  /* Plateau : jamais au seuil, mais la moyenne des cinq derniers reste à
     moins de vingt points en dessous. Au-delà de vingt points d'écart Manager
     ne parle plus de plateau mais d'objectif en cours. */
  plateau: (i, n) => (i >= n - 8 ? 0.66 + 0.04 * (i % 3) : 0.25 + (0.35 * i) / Math.max(1, n - 8)),

  /* En cours : progresse sans approcher le seuil. La moyenne des cinq
     derniers doit rester sous 0,60, sinon Manager y lirait un plateau. */
  progression: (i, n) => 0.22 + (0.30 * i) / Math.max(1, n - 1) + (i % 2 ? 0.03 : 0),

  /* Monte jusqu'aux congés, décroche au retour, ne récupère qu'en partie.
     Le creux est le point de la démonstration : il se voit sur la courbe. */
  regression: (i, n) => {
    const t = i / Math.max(1, n - 1);
    if (t < 0.55) return 0.35 + 0.5 * (t / 0.55);
    if (t < 0.7) return 0.44;
    return 0.44 + 0.13 * ((t - 0.7) / 0.3);
  },

  /* Démarrage tardif : peu de relevés, tous bas. */
  tardif: (i, n) => 0.2 + (0.35 * i) / Math.max(1, n - 1),
};

/* Deux formes ne se calculent pas sur le niveau mais sur le calendrier : elles
   décident *si* l'objectif est coté, pas à quelle hauteur. */
const FORME_DORMANTE = 'dormant';
const FORME_JAMAIS = 'jamais';

export const PERSONNES = [
  {
    ini: 'A.B.',
    classe: 0,
    profil: 'Acquisition franche — plusieurs objectifs atteignent le critère, une cible succède à l’autre',
    prioritaires: ['pause', 'refus'],
    objectifs: {
      picto: 'acquis',
      pause: 'acquis',
      refus: 'acquis',
      mains: 'acquis',
      dents: 'maintien',
      enchainer: 'progression',
      transition: 'progression',
      stop: 'acquis',
      tour: 'progression',
      attente: 'progression',
    },
  },
  {
    ini: 'C.D.',
    classe: 0,
    profil: 'Plateau installé — trois objectifs stagnent juste sous le seuil',
    prioritaires: ['refus'],
    objectifs: {
      refus: 'plateau',
      transition: 'plateau',
      mains: 'plateau',
      picto: 'progression',
      aide: 'progression',
      tour: 'progression',
      dents: 'progression',
      equilibre: 'progression',
      cp: 'progression',
      changement: 'progression',
    },
  },
  {
    ini: 'E.F.',
    classe: 0,
    profil: 'Régression après les congés, remontée partielle',
    prioritaires: ['aide', 'cp'],
    objectifs: {
      aide: 'regression',
      transition: 'regression',
      mains: 'regression',
      cp: 'progression',
      picto: 'progression',
      attente: 'progression',
      enchainer: 'progression',
      dents: 'progression',
      soin: 'progression',
      mands: 'progression',
    },
  },
  {
    ini: 'G.H.',
    classe: 0,
    profil: 'Démarrage tardif — arrivée en cours de trimestre, tout est en cours',
    prioritaires: ['picto'],
    objectifs: {
      picto: 'tardif',
      pause: 'tardif',
      tour: 'tardif',
      transition: 'tardif',
      mains: 'tardif',
      appel: 'tardif',
      attente: 'tardif',
      dents: 'tardif',
      equilibre: 'tardif',
      mands: 'tardif',
    },
  },
  {
    ini: 'J.L.',
    classe: 0,
    profil: 'Données lacunaires — un prioritaire ouvert jamais coté, un autre laissé de côté depuis un mois',
    prioritaires: ['refus', 'pause'],
    objectifs: {
      /* L'objectif jamais coté doit être prioritaire : dans l'application,
         l'encadré « Prévus non cotés » ne relance que sur les prioritaires
         (voir src/App.jsx, objectifsPrevusNonCotes) — un objectif ordinaire
         resté vierge n'y apparaîtrait jamais et ne démontrerait rien.
         En essais, pas en occurrence : `entreeVide` d'un objectif en
         occurrence pose `count: 0`, une mesure valide (zéro occurrence
         observée) que Manager compte comme un point coté. Seuls les essais
         restent structurellement vides — un tableau de `null` — et
         produisent bien l'état « non acquis ». */
      refus: FORME_JAMAIS,
      cheveux: FORME_DORMANTE,
      pause: 'progression',
      soin: 'progression',
      picto: 'progression',
      mains: 'progression',
      transition: 'progression',
      tour: 'progression',
      dents: 'progression',
      attente: 'progression',
    },
  },
  {
    ini: 'K.M.',
    classe: 1,
    profil: 'À la frontière — plusieurs objectifs à une séance du critère',
    prioritaires: ['transition', 'pause'],
    objectifs: {
      transition: 'bientot',
      picto: 'bientot',
      dents: 'bientot',
      pause: 'progression',
      refus: 'progression',
      mains: 'progression',
      enchainer: 'progression',
      appel: 'progression',
      changement: 'progression',
      equilibre: 'progression',
    },
  },
  {
    ini: 'N.P.',
    classe: 1,
    profil: 'Comportement problème en baisse — le comptage passe sous le seuil',
    prioritaires: ['cp'],
    objectifs: {
      cp: 'acquis',
      refus: 'progression',
      attente: 'progression',
      transition: 'progression',
      picto: 'progression',
      mains: 'progression',
      temperature: 'progression',
      soin: 'progression',
      mands: 'progression',
      tour: 'progression',
    },
  },
  {
    ini: 'R.S.',
    classe: 1,
    profil: 'Crises fréquentes et intenses — les cotations en portent la trace',
    prioritaires: ['cp', 'refus'],
    objectifs: {
      cp: 'progression',
      refus: 'progression',
      attente: 'progression',
      transition: 'progression',
      appel: 'progression',
      picto: 'progression',
      mains: 'progression',
      equilibre: 'progression',
      temperature: 'progression',
      changement: 'progression',
    },
  },
  {
    ini: 'T.V.',
    classe: 1,
    profil: 'Suivi continu dense — deux axes relevés toute la journée',
    prioritaires: ['pause'],
    objectifs: {
      pause: 'acquis',
      mains: 'acquis',
      cheveux: 'progression',
      attente: 'progression',
      soin: 'progression',
      temperature: 'progression',
      enchainer: 'progression',
      dents: 'progression',
      picto: 'progression',
      stop: 'progression',
    },
  },
  {
    ini: 'Y.Z.',
    classe: 1,
    profil: 'Suivi de fréquence — l’essentiel se mesure, sans critère à trancher',
    prioritaires: ['mands', 'pause'],
    objectifs: {
      mands: 'progression',
      pause: 'progression',
      cp: 'progression',
      picto: 'progression',
      equilibre: 'progression',
      cheveux: 'progression',
      changement: 'progression',
      aide: 'progression',
      appel: 'progression',
      tour: 'progression',
    },
  },
];

/* Les prioritaires sont limités aux modes « essai par essai » et
   « occurrence » : ce sont les deux seuls qui se cotent assez vite pour être
   repris à chaque séance, et c'est la contrainte posée pour ce jeu. */
export const TYPES_PRIORITAIRES = ['trials', 'occurrence'];

/* ==================== 6. Construction des personnes ==================== */

function construirePersonnes() {
  return PERSONNES.map((p) => {
    const cles = Object.keys(p.objectifs);
    /* La contrainte sur les prioritaires se vérifie ici plutôt que dans le
       test : une table mal remplie doit faire échouer la génération, pas
       produire un fichier qu'on découvre invalide plus tard. */
    p.prioritaires.forEach((cle) => {
      const m = parCle.get(cle);
      if (!m) throw new Error(`Objectif prioritaire absent du catalogue : ${cle}`);
      if (!cles.includes(cle)) throw new Error(`${p.ini} : objectif prioritaire non attribué : ${cle}`);
      if (!TYPES_PRIORITAIRES.includes(m.type)) {
        throw new Error(`${p.ini} : un objectif prioritaire doit être « ${TYPES_PRIORITAIRES.join(' » ou « ')} », or ${cle} est en ${m.type}`);
      }
    });
    if (!p.prioritaires.length || p.prioritaires.length > 2) {
      throw new Error(`${p.ini} : un ou deux objectifs prioritaires, pas ${p.prioritaires.length}`);
    }
    const objectives = cles.map((cle) => {
      const modele = parCle.get(cle);
      if (!modele) throw new Error(`Objectif absent du catalogue : ${cle}`);
      const forme = p.objectifs[cle];
      return {
        id: idObjectif(p.ini, cle),
        name: modele.nom,
        type: modele.type,
        config: JSON.parse(JSON.stringify(modele.config)),
        favorite: p.prioritaires.includes(cle),
        currentTargetId: (modele.config.targets && modele.config.targets[0].id) || null,
        masteredTargetIds: [],
        /* Un seul point de départ, non daté : la phase d'origine ne marque
           jamais de repère (voir reperesDePhase côté Manager). L'historique
           réel se construit séance après séance dans construireSeances, à
           mesure que les dates de cotation existent — c'est lui qui remplace
           cette valeur de départ une fois la génération terminée
           (appliquerPhaseHistoriquesFinales). */
        phaseHistory: [{ id: `${idObjectif(p.ini, cle)}-p0`, name: 'Ligne de base', date: null }],
      };
    });
    return {
      id: idPersonne(p.ini),
      initials: p.ini,
      classeId: CLASSES[p.classe].id,
      objectives,
      /* L'axe d'engagement n'est relevé que pour une partie des personnes :
         un suivi continu activé pour tout le monde ne ressemble à aucun
         établissement, et le comparatif entre personnes suivies et non
         suivies fait partie de ce qu'un cadre regarde. */
      suivisActifs: ['principal', ...(['E.F.', 'R.S.', 'T.V.'].includes(p.ini) ? [`${P}-axe-engagement`] : [])],
      compteurs: [{ id: `${P}-cpt-${p.ini.replace(/\./g, '').toLowerCase()}`, nom: 'Sollicitations' }],
    };
  });
}

/* ==================== 6 bis. Trajectoires ====================
   Une ligne de base plate avant l'intervention est ce qui rend un repère de
   phase lisible sur une courbe : sans palier bas et stable, la verticale
   tombe au milieu d'une progression déjà entamée. Chaque couple
   personne-objectif reçoit donc 3 à 5 cotations de ligne de base — basses,
   à peine bruitées — avant que FORMES[forme] ne prenne le relais.

   Deux repères supplémentaires, optionnels :
   - un changement de procédure (guidance dégressive, délai augmenté…),
     daté mais sans effet sur la phase de fond — comme dans l'application,
     ce n'est pas une phase, seulement un repère (`repere: true`) ;
   - un passage en Maintien pour les objectifs qui atteignent leur critère
     (forme 'acquis'), posé peu avant la fin de la période pour qu'il reste
     au moins quelques points après lui.

   Un objectif jamais coté (FORME_JAMAIS) n'a pas de trajectoire : sa fiche
   reste `null` dans la table, et aucun code ne doit la lire. */
const LIBELLES_PROCEDURE = [
  'Guidance dégressive',
  'Renforcement différé',
  'Délai de réponse augmenté',
  'Support visuel retiré',
  'Estompage du signal',
];

function construireTrajectoires(rng, personnes) {
  const trajectoires = new Map();
  personnes.forEach((personne) => {
    const profil = PERSONNES.find((x) => x.ini === personne.initials);
    personne.objectives.forEach((obj) => {
      const cle = obj.id.split('-').pop();
      const forme = profil.objectifs[cle];
      const cleTraj = `${personne.id}|${obj.id}`;
      if (forme === FORME_JAMAIS) { trajectoires.set(cleTraj, null); return; }
      const nBase = entier(rng, 3, 5);
      /* Pas de repère de procédure sur un démarrage tardif : la période
         d'intervention y est déjà courte, la charger d'un second repère la
         rendrait illisible. Un objectif sur trois environ en reçoit un. */
      const repere = forme !== 'tardif' && rng() < 0.35
        ? { frac: 0.3 + rng() * 0.35, nom: parmi(rng, LIBELLES_PROCEDURE) }
        : null;
      trajectoires.set(cleTraj, { nBase, repere, maintien: forme === 'acquis' });
    });
  });
  return trajectoires;
}

/* Un repère daté ignore la phase de fond, comme currentPhase côté
   application : la dernière entrée SANS `repere` est la phase courante. */
function phaseCourante(histo) {
  for (let i = histo.length - 1; i >= 0; i--) {
    if (!histo[i].repere) return histo[i];
  }
  return histo[histo.length - 1];
}

/* ==================== 7. Cotations ==================== */

/* Traduit un niveau (0 à 1) en cotation réelle du mode concerné. C'est le seul
   endroit qui connaît la forme d'une entrée : ajouter un mode de cotation à
   l'application se répercute ici et nulle part ailleurs. */
function entreeDepuisNiveau(obj, niveau, rng, contexte) {
  const c = obj.config || {};
  const mesures = mesuresPour(obj, niveau, rng, contexte);
  const base = { targetId: contexte.targetId || null, mesures };

  if (obj.type === 'trials') {
    const n = c.trialCount || 10;
    const reussis = Math.round(niveau * n);
    const codes = [];
    for (let i = 0; i < n; i++) codes.push(i < reussis ? 'I' : parmi(rng, NON_INDEPENDANTS));
    return { ...base, trials: melanger(rng, codes), running: false, startedAt: null };
  }

  if (obj.type === 'occurrence') {
    const seuil = c.mastery;
    /* Trois échelles distinctes, et il faut les distinguer : un comptage en
       sens « max » descend quand la personne progresse, un comptage sans
       critère n'a aucune cible à atteindre. */
    let count;
    if (seuil && seuil.sens === 'max') count = Math.round((1 - niveau) * 9);
    else if (seuil) count = Math.round(niveau * 9);
    else count = Math.round(2 + niveau * 12);
    return { ...base, count };
  }

  if (obj.type === 'interval') {
    const cible = c.targetLevelId;
    const autres = (c.levels || []).filter((l) => l.id !== cible).map((l) => l.id);
    const nb = 12;
    const marks = {};
    const auSeuil = Math.round(niveau * nb);
    const ordre = melanger(rng, Array.from({ length: nb }, (_, i) => i + 1));
    ordre.forEach((num, rang) => {
      marks[String(num)] = rang < auSeuil ? cible : parmi(rng, autres);
    });
    /* Une cotation sur cinq porte aussi une période saisie à la main. Les deux
       s'additionnent dans le total (`intervalTotals`), donc la période
       respecte la même proportion, faute de quoi elle déplacerait le score
       sans qu'on l'ait voulu. */
    const segments = [];
    if (contexte.avecSegments) {
      const minutesCible = Math.max(1, Math.round(niveau * 30));
      segments.push({ id: `${contexte.idEntree}-sg1`, start: '10:00', end: minutesHM(10 * 60 + minutesCible), levelId: cible });
      if (minutesCible < 30) {
        segments.push({ id: `${contexte.idEntree}-sg2`, start: minutesHM(10 * 60 + minutesCible), end: '10:30', levelId: autres[0] });
      }
    }
    return { ...base, marks, segments };
  }

  if (obj.type === 'chaining') {
    const etps = c.steps || [];
    const reussis = Math.round(niveau * etps.length);
    const ordre = melanger(rng, etps.map((s) => s.id));
    const steps = {};
    ordre.forEach((sid, rang) => {
      steps[sid] = rang < reussis ? 'I' : parmi(rng, NON_INDEPENDANTS);
    });
    return { ...base, steps };
  }

  if (obj.type === 'balance') {
    const etps = c.steps || [];
    const essais = [];
    for (let e = 0; e < 2; e++) {
      const steps = {};
      etps.forEach((st, i) => {
        /* Une étape manquée n'est pas un échec : elle n'a pas été présentée,
           et `balanceStats` la sort du dénominateur. En glisser quelques-unes
           est le seul moyen de montrer que le calcul en tient compte. */
        if (rng() < 0.08) {
          steps[st.id] = { outcome: 'manque', demande: false, renforce: false };
          return;
        }
        const reussi = rng() < niveau;
        steps[st.id] = {
          outcome: reussi ? 'reussi' : rng() < 0.6 ? 'guide' : 'erreur',
          demande: i === 0,
          renforce: i === etps.length - 1,
        };
      });
      essais.push({ steps });
    }
    return { ...base, trials: essais };
  }

  if (obj.type === 'probe') {
    /* Au-dessus de 0,75 la réussite est acquise : c'est ce qui permet à une
       trajectoire « acquis » de produire les trois journées consécutives à
       100 % qu'exige un critère exprimé en jours. En dessous, le tirage rend
       la variabilité d'un vrai probe. */
    const reussi = niveau >= 0.75 ? 1 : rng() < niveau ? 1 : 0;
    if (c.useGuidance) {
      return { ...base, value: null, guidance: reussi ? 'I' : parmi(rng, NON_INDEPENDANTS), creneau: contexte.creneau };
    }
    return { ...base, value: reussi, guidance: null, creneau: contexte.creneau };
  }

  return base;
}

function minutesHM(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/* Compteur et chronomètre auxiliaires. `valideA` à `null` signifie « pas
   mesuré » et se distingue d'un zéro mesuré — la nuance voyage jusqu'à
   l'export détaillé de Manager, autant qu'elle apparaisse dans le jeu. */
function mesuresPour(obj, niveau, rng, contexte) {
  const c = obj.config || {};
  const vide = {
    compteur: { total: 0, valideA: null },
    chrono: { elapsedMs: 0, running: false, startedAt: null, valideA: null },
  };
  if (c.avecCompteur && contexte.avecMesures) {
    vide.compteur = { total: entier(rng, 1, 9), valideA: contexte.horodatage };
  }
  if (c.avecChrono && contexte.avecMesures) {
    vide.chrono = { elapsedMs: Math.round((20 + niveau * 100) * 1000), running: false, startedAt: null, valideA: contexte.horodatage };
  }
  return vide;
}

/* ==================== 8. Séances ==================== */

/* Qui participe à quel atelier, à quelle date. Le tirage est stable pour une
   graine donnée, mais varie d'un jour à l'autre : un groupe figé sur trois
   mois ne ressemble à rien et rendrait le croisement par atelier illisible. */
function participants(rng, personnes, atelierId, indexJour) {
  const dispo = personnes.filter((p) => {
    if (atelierId === `${P}-a-cuisine`) return p.classeId === CLASSES[1].id || (indexJour + p.initials.charCodeAt(0)) % 3 === 0;
    if (atelierId === `${P}-a-social`) return p.classeId === CLASSES[0].id || (indexJour + p.initials.charCodeAt(0)) % 3 === 1;
    return true;
  });
  const melange = melanger(rng, dispo);
  return melange.slice(0, entier(rng, 3, 4));
}

/* Les objectifs retenus pour une personne dans une séance donnée. Les
   prioritaires sont épinglés à chaque séance — c'est ce qui en fait des
   prioritaires, dans l'application comme ici — et les places restantes
   tournent sur les autres objectifs plutôt que d'être tirées au sort : sur
   trois mois, chacun reçoit ainsi un nombre de cotations comparable,
   condition pour que les courbes et les critères d'acquisition soient
   lisibles. */
function objectifsDeLaSeance(personne, compteurs, nb) {
  const prioritaires = personne.objectives.filter((o) => o.favorite).map((o) => o.id);
  const autres = personne.objectives.filter((o) => !o.favorite).map((o) => o.id);
  const nAutres = Math.max(0, nb - prioritaires.length);
  const depart = compteurs.get(personne.id) || 0;
  if (autres.length) compteurs.set(personne.id, (depart + nAutres) % autres.length);
  const retenus = [...prioritaires];
  for (let i = 0; i < nAutres && autres.length; i++) retenus.push(autres[(depart + i) % autres.length]);
  return retenus;
}

function construireSeances(rng, personnes, calendrier, trajectoires) {
  const seances = [];
  const compteurs = new Map();
  /* Un compteur de cotations par couple personne-objectif : les formes de
     trajectoire ont besoin du rang du relevé et du total attendu, et le total
     ne se connaît qu'après coup. On compte d'abord, on cote ensuite. */
  const prevision = new Map();
  const plan = [];

  const debutTardif = ajouterJours(calendrier.fin, -45);
  const finDormance = ajouterJours(calendrier.fin, -30);

  calendrier.jours.forEach((jour, indexJour) => {
    const ateliersDuJour = EMPLOI_DU_TEMPS[jourSemaine(jour)] || [];
    ateliersDuJour.forEach((atelierId, rangAtelier) => {
      const presents = participants(rng, personnes, atelierId, indexJour);
      if (!presents.length) return;
      const selection = {};
      presents.forEach((p) => {
        const profil = PERSONNES.find((x) => x.ini === p.initials);
        /* Un démarrage tardif ne coche aucune séance avant son arrivée : la
           personne existe, elle n'est simplement pas encore suivie. */
        if (profil.objectifs && Object.values(profil.objectifs).every((f) => f === 'tardif') && jour < debutTardif) return;
        const oids = objectifsDeLaSeance(p, compteurs, 4);
        const retenus = oids.filter((oid) => {
          const cle = oid.split('-').pop();
          const forme = profil.objectifs[cle];
          /* Un objectif dormant cesse d'être coté un mois avant la fin : c'est
             ce qui le fait passer au-delà des vingt et un jours de dormance
             que Manager surveille. */
          if (forme === FORME_DORMANTE && jour > finDormance) return false;
          return true;
        });
        if (retenus.length) selection[p.id] = retenus;
      });
      if (!Object.keys(selection).length) return;
      Object.entries(selection).forEach(([sid, oids]) => {
        oids.forEach((oid) => {
          const cle = `${sid}|${oid}`;
          prevision.set(cle, (prevision.get(cle) || 0) + 1);
        });
      });
      plan.push({ jour, indexJour, atelierId, rangAtelier, selection });
    });
  });

  /* `ateliersDuJour.forEach` pousse dans l'ordre du tableau EMPLOI_DU_TEMPS,
     pas dans celui des créneaux horaires : le jeudi, Repas (11 h 45) est posé
     avant Hygiène (8 h 30). Sans remise en ordre, le rang d'une cotation ne
     correspond plus à sa date réelle dès qu'une personne — typiquement pour
     un prioritaire, épinglé à chaque atelier — est présente à plusieurs
     ateliers le même jour, et la ligne de base ou un repère de phase se pose
     alors sur la mauvaise cotation. Le tri final de `seances` (plus bas) ne
     corrige que l'ordre d'affichage, pas celui, antérieur, de matérialisation. */
  plan.sort((a, b) => {
    const ta = horodatage(a.jour, CRENEAUX_ATELIER[a.atelierId].h, CRENEAUX_ATELIER[a.atelierId].min).getTime();
    const tb = horodatage(b.jour, CRENEAUX_ATELIER[b.atelierId].h, CRENEAUX_ATELIER[b.atelierId].min).getTime();
    return ta - tb;
  });

  /* Le total réel de chaque couple personne-objectif n'est connu qu'une fois
     le plan complet posé : la ligne de base et les repères s'y calent, jamais
     sur les 3 à 5 cotations demandées au tirage si l'objectif n'en reçoit pas
     assez sur toute la période — un objectif dormant ou tardif peut n'être
     coté que quelques fois en tout. */
  trajectoires.forEach((traj, cle) => {
    if (!traj) return;
    const total = prevision.get(cle) || 0;
    traj.nBaseEffectif = Math.min(traj.nBase, Math.max(0, total - 1));
    const totalIntervention = Math.max(1, total - traj.nBaseEffectif);
    if (traj.repere) {
      const brut = traj.nBaseEffectif + Math.max(1, Math.min(totalIntervention - 1, Math.round(traj.repere.frac * totalIntervention)));
      traj.repereRang = brut;
    }
    if (traj.maintien) {
      traj.maintienRang = traj.nBaseEffectif + Math.max(1, totalIntervention - 3);
    }
    // Un repère et un passage en Maintien ne tombent jamais sur le même rang.
    if (traj.repere && traj.maintien && traj.repereRang === traj.maintienRang) {
      traj.repereRang = Math.max(traj.nBaseEffectif + 1, traj.repereRang - 1);
    }
  });

  const rangs = new Map();
  const phaseHistories = new Map();
  plan.forEach((etape, indexSeance) => {
    seances.push(materialiserSeance(rng, personnes, etape, indexSeance, prevision, rangs, calendrier, trajectoires, phaseHistories));
  });

  /* La trajectoire finale de chaque objectif — celle que verrait un
     éducateur en ouvrant l'écran Suivi aujourd'hui — remplace l'entrée
     unique posée à la construction des personnes. Chaque objectiveSnapshot
     de séance garde, lui, son histoire propre : la personne mutée ici ne le
     modifie pas rétroactivement. */
  personnes.forEach((personne) => {
    personne.objectives = personne.objectives.map((obj) => {
      const histo = phaseHistories.get(`${personne.id}|${obj.id}`);
      return histo && histo.length ? { ...obj, phaseHistory: histo.slice() } : obj;
    });
  });

  /* Manager comme DatABA lisent les séances du plus récent au plus ancien.
     Écrire l'inverse ne casse rien visiblement, mais décale les listes
     paginées et les « dernières séances » de chaque écran. */
  return seances.sort((a, b) => new Date(b.date) - new Date(a.date));
}

const NOTES = [
  'Séance calme, participation soutenue.',
  'Fatigue en début de séance, mieux ensuite.',
  'A demandé une pause spontanément, accordée.',
  'Bruit dans le couloir, attention difficile à tenir.',
  'Bonne coopération sur les consignes de sécurité.',
];

function materialiserSeance(rng, personnes, etape, indexSeance, prevision, rangs, calendrier, trajectoires, phaseHistories) {
  const { jour, atelierId, rangAtelier, selection } = etape;
  const creneau = CRENEAUX_ATELIER[atelierId];
  const debut = horodatage(jour, creneau.h, creneau.min);
  const fin = new Date(debut.getTime() + creneau.duree * 60000);
  const intervenant = INTERVENANTS[(etape.indexJour + rangAtelier) % INTERVENANTS.length];
  const id = `${P}-s-${jour.replace(/-/g, '')}-${rangAtelier + 1}`;

  const objectiveSnapshot = {};
  const data = {};
  const presence = {};
  const notes = {};

  Object.entries(selection).forEach(([sid, oids]) => {
    const personne = personnes.find((p) => p.id === sid);
    const profil = PERSONNES.find((x) => x.ini === personne.initials);
    presence[sid] = { from: debut.getTime(), to: null };
    if (rng() < 0.12) notes[sid] = parmi(rng, NOTES);
    data[sid] = {};

    oids.forEach((oid) => {
      const obj = personne.objectives.find((o) => o.id === oid);
      const cle = oid.split('-').pop();
      const forme = profil.objectifs[cle];
      const cible = cibleCourante(obj, personne, jour, calendrier);
      const cleRang = `${sid}|${oid}`;
      const traj = trajectoires.get(cleRang);
      // Rang de CETTE cotation, avant incrément — sert autant à la ligne de
      // base et aux repères qu'au niveau produit plus bas.
      const rang = rangs.get(cleRang) || 0;

      let histo = phaseHistories.get(cleRang);
      if (!histo) {
        histo = [{ id: `${oid}-p0`, name: 'Ligne de base', date: null }];
        phaseHistories.set(cleRang, histo);
      }
      /* Un objectif jamais coté n'a pas de trajectoire (traj est null) :
         il reste sur sa phase d'origine, jamais datée, pour toujours. */
      if (traj) {
        const horoPhase = debut.toISOString();
        if (rang === traj.nBaseEffectif) {
          histo.push({ id: `${oid}-intervention`, name: 'Intervention', date: horoPhase });
        }
        if (traj.repere && rang === traj.repereRang) {
          histo.push({ id: `${oid}-repere`, name: traj.repere.nom, date: horoPhase, repere: true });
        }
        if (traj.maintien && rang === traj.maintienRang) {
          histo.push({ id: `${oid}-maintien`, name: 'Maintien', date: horoPhase });
        }
      }

      objectiveSnapshot[oid] = {
        ...obj,
        currentTargetId: cible ? cible.id : null,
        masteredTargetIds: cible ? cible.acquises : obj.masteredTargetIds,
        favorite: obj.favorite,
        activeTargetName: cible ? cible.name : null,
        // Instantané de l'historique à la date de CETTE séance — jamais des
        // changements à venir, qu'une vraie tablette ne peut pas connaître.
        phaseHistory: histo.slice(),
        activePhaseName: phaseCourante(histo).name,
      };

      /* Un objectif ouvert mais jamais coté reste une entrée vide : c'est ce
         que produit l'application quand la séance passe sans qu'on ait eu le
         temps de coter, et c'est le seul chemin vers l'état « non acquis »
         de Manager. Une entrée absente donnerait le même verdict, mais pas la
         même trace dans le détail de la séance. */
      if (forme === FORME_JAMAIS) {
        data[sid][oid] = entreeVide(obj);
        return;
      }

      rangs.set(cleRang, rang + 1);
      const total = prevision.get(cleRang) || 1;
      const nBaseEffectif = traj ? traj.nBaseEffectif : 0;
      let niveau;
      if (rang < nBaseEffectif) {
        // Ligne de base : basse et plate, à peine bruitée — c'est ce qui
        // rend le repère « Intervention » lisible une fois posé.
        niveau = 0.12 + rng() * 0.06;
      } else {
        const totalIntervention = Math.max(1, total - nBaseEffectif);
        const rangIntervention = rang - nBaseEffectif;
        const fonction = FORMES[forme] || FORMES.progression;
        niveau = fonction(rangIntervention, totalIntervention);
      }
      niveau = Math.min(1, Math.max(0, niveau));

      const horo = new Date(debut.getTime() + entier(rng, 2, creneau.duree - 2) * 60000).toISOString();
      data[sid][oid] = entreeDepuisNiveau(obj, niveau, rng, {
        targetId: cible ? cible.id : null,
        /* Le créneau n'existe que pour un probe à deux prises par jour ;
           l'application le calcule sur l'heure locale, avant ou après 13 h. */
        creneau: obj.type === 'probe' && (obj.config.probesParJour || 1) > 1 ? (creneau.h < 13 ? 'matin' : 'aprem') : null,
        avecSegments: obj.type === 'interval' && rang % 5 === 0,
        avecMesures: rng() < 0.5,
        horodatage: horo,
        idEntree: `${id}-${oid}`,
      });
    });
  });

  const pauses = rng() < 0.1 ? [{ from: debut.getTime() + 10 * 60000, to: debut.getTime() + 15 * 60000 }] : [];
  const pausedMs = pauses.reduce((a, p) => a + (p.to - p.from), 0);

  return {
    id,
    date: debut.toISOString(),
    startedAt: debut.getTime(),
    endedAt: fin.getTime(),
    /* Quelques séances en mode Équilibre, quelques séances libres sans
       atelier : deux cas que l'écran Séances distingue et qui resteraient
       invisibles dans un jeu uniforme. */
    mode: indexSeance % 23 === 0 ? 'balance' : 'atelier',
    atelierId: indexSeance % 17 === 0 ? null : atelierId,
    intervenantId: intervenant.id,
    /* Les séances de double cotation sont marquées ici ; leur jumelle vit
       dans le second fichier, seule façon de peupler l'IOA de Manager. */
    doubleCotation: indexSeance % 19 === 3,
    studentIds: Object.keys(selection),
    selectedObjectives: selection,
    objectiveSnapshot,
    notes,
    data,
    presence,
    pauses,
    pausedMs,
    /* Les séances de la dernière semaine ne sont pas encore transmises :
       l'écran Export de DatABA a alors quelque chose à montrer. */
    sentAt: jour < ajouterJours(calendrier.fin, -7) ? new Date(fin.getTime() + 2 * MS_JOUR).toISOString() : null,
  };
}

function entreeVide(obj) {
  const mesures = {
    compteur: { total: 0, valideA: null },
    chrono: { elapsedMs: 0, running: false, startedAt: null, valideA: null },
  };
  const base = { targetId: null, mesures };
  if (obj.type === 'trials') return { ...base, trials: Array(obj.config.trialCount || 10).fill(null), running: false, startedAt: null };
  if (obj.type === 'occurrence') return { ...base, count: 0 };
  if (obj.type === 'interval') return { ...base, marks: {}, segments: [] };
  if (obj.type === 'chaining') return { ...base, steps: {} };
  if (obj.type === 'balance') return { ...base, trials: [{ steps: {} }] };
  return { ...base, value: null, guidance: null, creneau: null };
}

/* Cible en cours d'un objectif à cibles successives. Une seule personne les
   fait progresser sur la période — assez pour montrer le mécanisme, pas assez
   pour que toutes les courbes se coupent en trois morceaux. */
function cibleCourante(obj, personne, jour, calendrier) {
  const cibles = (obj.config && obj.config.targets) || [];
  if (!cibles.length) return null;
  if (personne.initials !== 'A.B.') return { ...cibles[0], acquises: [] };
  const t = (dateDeJour(jour) - dateDeJour(calendrier.debut)) / (dateDeJour(calendrier.fin) - dateDeJour(calendrier.debut));
  const rang = t < 0.35 ? 0 : t < 0.7 ? 1 : 2;
  return { ...cibles[rang], acquises: cibles.slice(0, rang).map((c) => c.id) };
}

/* ==================== 9. Suivi continu ==================== */

/* Les proportions comptent autant que les clés : un relevé sur douze en crise
   donne une centaine de crises sur le trimestre pour dix personnes, ce qui
   reste dans l'ordre de grandeur d'un établissement. Une clé « crise » tirée
   une fois sur six en produirait plus de deux cents et rendrait tous les
   graphiques de l'écran Crises saturés — donc illisibles, donc inutiles à
   montrer. */
const CRITERES_PRINCIPAL = [
  'stable', 'stable', 'stable', 'stable', 'stable', 'stable',
  'stable', 'stable', 'pre-crise', 'pre-crise', 'crise', 'post-crise',
];
const CRITERES_ENGAGEMENT = ['engage', 'engage', 'partiel', 'opposition'];

/* Heures de relevé, calées sur les quatre créneaux d'atelier de
   CRENEAUX_ATELIER. Voir la boucle de construireSuivi pour la raison. */
const HEURES_RELEVE = [[8, 40], [9, 40], [11, 55], [14, 10]];

function construireSuivi(rng, personnes, calendrier, seances) {
  const releves = [];
  const crisesDepuisSuivi = [];
  const parJour = new Map();
  seances.forEach((s) => {
    const j = s.date.slice(0, 10);
    if (!parJour.has(j)) parJour.set(j, []);
    parJour.get(j).push(s);
  });

  calendrier.jours.forEach((jour, indexJour) => {
    const seancesDuJour = parJour.get(jour) || [];
    personnes.forEach((personne) => {
      const profil = PERSONNES.find((x) => x.ini === personne.initials);
      const crisePlus = profil.ini === 'R.S.';
      personne.suivisActifs.forEach((axeId) => {
        const principal = axeId === 'principal';
        const nb = principal ? (personne.initials === 'T.V.' ? 4 : 2) : 2;
        for (let k = 0; k < nb; k++) {
          /* Les heures de relevé visent l'intérieur des créneaux d'atelier.
             Ce n'est pas cosmétique : un relevé pris hors séance ne porte ni
             atelier ni intervenant, et Explorer ne peut alors pas croiser une
             durée de suivi par atelier — la mesure existe mais reste vide. */
          const [h, base] = nb >= 4 ? HEURES_RELEVE[k] : HEURES_RELEVE[k + 1];
          const min = base + entier(rng, 0, 8);
          const ts = horodatage(jour, h + Math.floor(min / 60), min % 60);
          /* Le relevé est rattaché à la séance en cours s'il y en a une :
             sans `atelierId` ni `intervenantId`, Explorer ne peut pas croiser
             une durée de suivi par atelier ou par intervenant. */
          const seance = seancesDuJour.find((s) => ts.getTime() >= s.startedAt && ts.getTime() <= s.endedAt && s.studentIds.includes(personne.id));
          let critere;
          if (!principal) {
            critere = parmi(rng, CRITERES_ENGAGEMENT);
          } else if (indexJour % 31 === 5) {
            /* Quelques relevés portent une clé qui n'est plus dans la
               configuration de l'axe : Manager les affiche « Critère retiré »
               plutôt que de les perdre. */
            critere = CRITERE_RETIRE;
          } else {
            critere = parmi(rng, crisePlus ? [...CRITERES_PRINCIPAL, 'crise', 'pre-crise'] : CRITERES_PRINCIPAL);
          }
          const id = `${P}-r-${jour.replace(/-/g, '')}-${personne.id.slice(-4)}-${axeId === 'principal' ? 'p' : 'e'}${k}`;
          releves.push({
            id,
            studentId: personne.id,
            suiviId: axeId,
            timestamp: ts.toISOString(),
            critere,
            source: k === 0 ? 'manuel' : 'pastille',
            intervenantId: seance ? seance.intervenantId : null,
            sessionId: seance ? seance.id : null,
            atelierId: seance ? seance.atelierId : null,
            appareilOrigine: null,
            sentAt: null,
          });
          /* Un relevé « crise » ouvre une fiche de crise dans l'application.
             Ne pas la produire ici laisserait le suivi continu et l'écran
             Crises se contredire. */
          if (principal && critere === 'crise') {
            crisesDepuisSuivi.push({ releveId: id, jour, ts, personne, seance });
          }
        }
        /* Clôture de journée : c'est elle qui borne le dernier segment de la
           frise. Deux journées sur trente restent volontairement ouvertes —
           le segment est alors rendu en hachures et sort des pourcentages,
           comportement qu'il vaut mieux montrer que découvrir. */
        if (principal && indexJour % 30 !== 11) {
          releves.push({
            id: `${P}-r-${jour.replace(/-/g, '')}-${personne.id.slice(-4)}-fin`,
            studentId: personne.id,
            suiviId: axeId,
            timestamp: horodatage(jour, 16, 30).toISOString(),
            critere: null,
            fin: true,
            source: 'cloture',
            intervenantId: null,
            sessionId: null,
            atelierId: null,
            appareilOrigine: null,
            sentAt: null,
          });
        }
      });
    });
  });

  return { releves, crisesDepuisSuivi };
}

/* Projection v3 de l'axe historique, à l'identique de `releverAliasStabilite`
   dans src/App.jsx. Manager lit `suivi` dès que la clé existe et ignore alors
   `stabilite` : les deux doivent dire la même chose, jamais s'additionner. */
function projeterStabilite(releves) {
  const historiques = new Set(AXES[0].criteres.map((c) => c.k));
  return releves
    .filter((r) => r && !r.fin && r.suiviId === 'principal' && historiques.has(r.critere))
    .map((r) => ({ id: r.id, studentId: r.studentId, timestamp: r.timestamp, etat: r.critere, source: r.source || 'pastille' }));
}

/* ==================== 10. Crises et observations ==================== */

/* Neuf antécédents et neuf comportements : au-delà de six valeurs distinctes,
   Manager regroupe la queue sous « Autres ». C'est un comportement qu'on ne
   voit pas avec un jeu à quatre catégories, et qui surprend le jour où de
   vraies données l'atteignent. */
const ANTECEDENTS = [
  'Consigne ou demande',
  'Transition',
  'Attente',
  'Refus',
  'Bruit ou stimulation',
  'Interaction avec un pair',
  'Imprévu, changement',
  'Arrêt de tâche plaisante',
  'Aucun déclencheur identifié',
];
const COMPORTEMENTS = [
  'Auto-agression',
  'Hétéro-agression',
  'Morsure',
  'Mise au sol',
  'Cris',
  "Jet d'objet",
  'Destruction de matériel',
  'Fuite, départ de la pièce',
  'Refus, immobilité',
];
const CONSEQUENCES = [
  'Accès à la demande',
  "Attention de l'adulte",
  'Accès à un objet ou une activité',
  "Retrait, mise à l'écart",
  'Maintien de consigne',
];
const FONCTIONS = ['attention', 'echappement', 'tangible', 'sensoriel', 'indetermine'];

function construireCrises(rng, crisesDepuisSuivi, seances, calendrier) {
  const crises = [];

  crisesDepuisSuivi.forEach((c, i) => {
    const forte = c.personne.initials === 'R.S.';
    /* Une crise sur onze reste sans intensité notée : la mention « N sans
       intensité » de Manager n'apparaît que dans ce cas, et c'est une
       situation courante en séance. */
    const intensite = i % 11 === 7 ? null : forte ? entier(rng, 2, 3) : entier(rng, 1, 2);
    const duree = (forte ? entier(rng, 8, 40) : entier(rng, 2, 15)) * 60000;
    crises.push({
      id: `${P}-c-${c.releveId.slice(-16)}`,
      date: c.ts.toISOString(),
      startedAt: c.ts.getTime(),
      kind: 'crise',
      sessionId: c.seance ? c.seance.id : null,
      studentId: c.personne.id,
      atelierId: c.seance ? c.seance.atelierId : null,
      intervenantIds: c.seance ? [c.seance.intervenantId] : [],
      commentaire: '',
      antecedent: '',
      comportement: '',
      consequence: '',
      /* Plusieurs étiquettes sur une même crise : le total empilé d'un
         graphique dépasse alors le nombre de crises, ce qui se lit mal si on
         ne l'a jamais vu. */
      antecedentTags: melanger(rng, ANTECEDENTS).slice(0, rng() < 0.3 ? 2 : 1),
      comportementTags: melanger(rng, COMPORTEMENTS).slice(0, rng() < 0.4 ? 2 : 1),
      consequenceTags: melanger(rng, CONSEQUENCES).slice(0, 1),
      mesures: {
        compteur: { total: 0, valideA: null },
        chrono: { elapsedMs: duree, running: false, startedAt: null, valideA: c.ts.toISOString() },
      },
      durationMs: duree,
      intensite,
      fonction: parmi(rng, FONCTIONS),
      releveId: c.releveId,
      origine: 'suivi',
      aCompleter: false,
      sentAt: null,
    });
  });

  /* Observations ABC directes, sans crise : elles n'ont pas de durée et
     pèsent zéro dans les bilans de durée. C'est voulu, et c'est une source de
     confusion récurrente quand on lit un bilan sans le savoir. */
  const joursAbc = calendrier.jours.filter((_, i) => i % 2 === 0).flatMap((j) => [j, j]);
  joursAbc.forEach((jour, i) => {
    const candidates = seances.filter((s) => s.date.slice(0, 10) === jour && s.studentIds.length);
    if (!candidates.length) return;
    const seance = candidates[i % candidates.length];
    const sid = seance.studentIds[i % seance.studentIds.length];
    const ts = new Date(seance.startedAt + entier(rng, 5, 30) * 60000);
    crises.push({
      id: `${P}-abc-${jour.replace(/-/g, '')}-${i}`,
      date: ts.toISOString(),
      startedAt: ts.getTime(),
      kind: 'abc',
      sessionId: seance.id,
      studentId: sid,
      atelierId: seance.atelierId,
      intervenantIds: [seance.intervenantId],
      commentaire: '',
      antecedent: '',
      comportement: '',
      consequence: '',
      antecedentTags: [parmi(rng, ANTECEDENTS)],
      comportementTags: [parmi(rng, COMPORTEMENTS)],
      consequenceTags: [parmi(rng, CONSEQUENCES)],
      mesures: {
        compteur: { total: 0, valideA: null },
        chrono: { elapsedMs: 0, running: false, startedAt: null, valideA: null },
      },
      durationMs: 0,
      intensite: null,
      fonction: parmi(rng, FONCTIONS),
      sentAt: null,
    });
  });

  return crises.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/* ==================== 11. Assemblage ==================== */

function construireAteliers(personnes, seances) {
  return ATELIERS.map((a) => {
    const usuels = new Set();
    const parJourSemaine = {};
    const objectifsUsuels = {};
    seances.forEach((s) => {
      if (s.atelierId !== a.id) return;
      const d = String(new Date(s.date).getUTCDay());
      if (!parJourSemaine[d]) parJourSemaine[d] = new Set();
      s.studentIds.forEach((sid) => {
        usuels.add(sid);
        parJourSemaine[d].add(sid);
        if (!objectifsUsuels[sid]) objectifsUsuels[sid] = new Set();
        (s.selectedObjectives[sid] || []).forEach((oid) => objectifsUsuels[sid].add(oid));
      });
    });
    return {
      id: a.id,
      name: a.name,
      usualStudentIds: [...usuels],
      personnesParJour: Object.fromEntries(Object.entries(parJourSemaine).map(([d, set]) => [d, [...set]])),
      usualObjectives: Object.fromEntries(Object.entries(objectifsUsuels).map(([sid, set]) => [sid, [...set]])),
      favoriteObjectiveIds: personnes.flatMap((p) => p.objectives.filter((o) => o.favorite).map((o) => o.id)),
      knownObjectiveIds: [],
    };
  });
}

export function genererDemo({ fin, graine = 42 } = {}) {
  const finJour = fin || jourDeDate(new Date());
  const rng = mulberry32(graine);
  const calendrier = construireCalendrier(finJour);
  const personnes = construirePersonnes();
  const trajectoires = construireTrajectoires(rng, personnes);
  const seances = construireSeances(rng, personnes, calendrier, trajectoires);
  const { releves, crisesDepuisSuivi } = construireSuivi(rng, personnes, calendrier, seances);
  const crises = construireCrises(rng, crisesDepuisSuivi, seances, calendrier);
  const ateliers = construireAteliers(personnes, seances);

  const tablette1 = {
    format: 'aba-backup',
    version: 4,
    /* Dérivé de la date de fin, jamais de l'horloge : c'est ce qui rend deux
       exécutions comparables et permet au test de détecter un fichier
       versionné qui aurait divergé du script. */
    exportedAt: horodatage(finJour, 17, 0).toISOString(),
    appareil: 'demo-tablette-1',
    classeAppareil: '',
    students: personnes.map((p) => ({ ...p, groupeId: p.classeId })),
    ateliers,
    emploiDuTemps: EMPLOI_DU_TEMPS,
    intervenants: INTERVENANTS,
    classes: CLASSES,
    groupes: CLASSES,
    guidances: GUIDANCES,
    axesSuivi: AXES,
    sessions: seances,
    crises,
    suivi: releves,
    stabilite: projeterStabilite(releves),
  };

  const tablette2 = construireSecondeTablette(mulberry32(graine + 1), personnes, seances, finJour);

  return { tablette1, tablette2, calendrier, personnes };
}

/* ==================== 12. Seconde tablette (IOA) ==================== */

/* `trouverPaires` exige deux séances de double cotation, le même jour, sur un
   atelier de même NOM, venant de deux appareils différents. Une seule
   tablette ne peut donc pas peupler l'IOA, quoi qu'on mette dedans : d'où ce
   second fichier, réduit au strict nécessaire.
   Les personnes y portent les mêmes initiales mais d'autres identifiants —
   c'est exactement le cas réel, et Manager les rapproche par les initiales. */
function construireSecondeTablette(rng, personnes, seances, finJour) {
  const P2 = 'demo2';
  const ateliers2 = ATELIERS.map((a) => ({
    id: a.id.replace(P, P2),
    name: a.name,
    usualStudentIds: [],
    personnesParJour: {},
    usualObjectives: {},
    favoriteObjectiveIds: [],
    knownObjectiveIds: [],
  }));
  const intervenants2 = [{ id: `${P2}-i-1`, name: 'C.B.' }];

  const doubles = seances.filter((s) => s.doubleCotation && s.atelierId).slice(0, 6);
  /* Trois niveaux d'accord, deux paires chacun : Manager colore le résultat
     au-dessus de 80 % puis de 60 %, et une démonstration qui ne montre qu'un
     accord parfait ne dit rien de l'outil.

     Un TAUX plutôt qu'un compte fixe de désaccords : une séance à deux
     personnes ne produit pas le même nombre d'essais communs qu'une séance
     à quatre, et un compte fixe de « 3 essais retournés » dérive alors d'une
     paire à l'autre selon qui s'y trouve. Le taux, lui, cible directement
     l'accord voulu quel que soit le nombre d'essais comparés. */
  const tauxDesaccord = [0.03, 0.15, 0.35, 0.5, 0.55, 0.62];

  const idsPersonnes = new Map();
  const idsObjectifs = new Map();
  const utilisees = new Map();

  const sessions2 = doubles.map((s, index) => {
    const selection = {};
    const snapshot = {};
    const data = {};
    const presence = {};

    Object.entries(s.selectedObjectives).forEach(([sid, oids]) => {
      const personne = personnes.find((p) => p.id === sid);
      if (!personne) return;
      if (!idsPersonnes.has(sid)) idsPersonnes.set(sid, `${P2}-p-${personne.initials.replace(/\./g, '').toLowerCase()}`);
      const sid2 = idsPersonnes.get(sid);
      if (!utilisees.has(sid2)) utilisees.set(sid2, { initials: personne.initials, objectives: new Map() });
      presence[sid2] = { from: s.startedAt, to: null };
      selection[sid2] = [];
      data[sid2] = {};

      oids.forEach((oid) => {
        const obj = personne.objectives.find((o) => o.id === oid);
        /* On ne rejoue que les essais par essais : l'IOA se lit essai par
           essai et le désaccord y est contrôlable au coup près. Sur un
           chaînage ou un équilibre, on ne saurait pas viser 70 % précisément.
           Un objectif prioritaire jamais coté (voir J.L.) reste sélectionné à
           chaque séance mais n'a rien à comparer : ses essais sont tous
           `null`, et un second observateur ne cote pas ce que le premier n'a
           pas présenté. Le répliquer produirait une paire sans le moindre
           essai commun. */
        const origineTrials = (s.data[sid] && s.data[sid][oid] && s.data[sid][oid].trials) || [];
        if (!obj || obj.type !== 'trials' || !origineTrials.some((c) => c != null)) return;
        if (!idsObjectifs.has(oid)) idsObjectifs.set(oid, oid.replace(P, P2));
        const oid2 = idsObjectifs.get(oid);
        const copie = { ...obj, id: oid2 };
        utilisees.get(sid2).objectives.set(oid2, copie);
        selection[sid2].push(oid2);
        /* La phase et son historique se lisent sur le snapshot de la séance
           d'origine, déjà tronqué à sa date — jamais sur `obj.phaseHistory`,
           qui porte la trajectoire complète et finale une fois la génération
           terminée. Une séance de mai ne peut pas déjà savoir qu'un repère
           d'août existe. */
        const snapOrigine = s.objectiveSnapshot[oid];
        snapshot[oid2] = {
          ...copie,
          favorite: obj.favorite,
          activeTargetName: null,
          phaseHistory: snapOrigine.phaseHistory,
          activePhaseName: snapOrigine.activePhaseName,
        };

        const origine = s.data[sid][oid];
        const codes = (origine.trials || []).slice();
        const nAChanger = Math.round(tauxDesaccord[index] * codes.length);
        const aChanger = melanger(rng, codes.map((_, i) => i)).slice(0, nAChanger);
        aChanger.forEach((i) => {
          codes[i] = codes[i] === 'I' ? parmi(rng, NON_INDEPENDANTS) : 'I';
        });
        data[sid2][oid2] = {
          targetId: null,
          trials: codes,
          running: false,
          startedAt: null,
          mesures: {
            compteur: { total: 0, valideA: null },
            chrono: { elapsedMs: 0, running: false, startedAt: null, valideA: null },
          },
        };
      });
      if (!selection[sid2].length) {
        delete selection[sid2];
        delete data[sid2];
        delete presence[sid2];
      }
    });

    return {
      id: s.id.replace(`${P}-s-`, `${P2}-s-`),
      date: s.date,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      mode: 'atelier',
      atelierId: s.atelierId.replace(P, P2),
      intervenantId: intervenants2[0].id,
      doubleCotation: true,
      studentIds: Object.keys(selection),
      selectedObjectives: selection,
      objectiveSnapshot: snapshot,
      notes: {},
      data,
      presence,
      pauses: [],
      pausedMs: 0,
      sentAt: null,
    };
  }).filter((s) => s.studentIds.length);

  const students2 = [...utilisees.entries()].map(([id, v]) => ({
    id,
    initials: v.initials,
    classeId: null,
    groupeId: null,
    objectives: [...v.objectives.values()],
    suivisActifs: ['principal'],
    compteurs: [],
  }));

  return {
    format: 'aba-backup',
    version: 4,
    exportedAt: horodatage(finJour, 17, 30).toISOString(),
    appareil: 'demo-tablette-2',
    classeAppareil: '',
    students: students2,
    ateliers: ateliers2,
    emploiDuTemps: EMPLOI_DU_TEMPS,
    intervenants: intervenants2,
    classes: [],
    groupes: [],
    guidances: GUIDANCES,
    axesSuivi: AXES,
    sessions: sessions2.sort((a, b) => new Date(b.date) - new Date(a.date)),
    crises: [],
    suivi: [],
    stabilite: [],
  };
}

/* ==================== 13. Ligne de commande ==================== */

function lireArguments(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fin') opts.fin = argv[++i];
    else if (a === '--graine') opts.graine = Number(argv[++i]);
    else if (a === '--sortie') opts.sortie = argv[++i];
  }
  return opts;
}

function principal(argv) {
  const opts = lireArguments(argv);
  if (opts.fin && !/^\d{4}-\d{2}-\d{2}$/.test(opts.fin)) {
    console.error('--fin attend une date au format AAAA-MM-JJ');
    process.exit(1);
  }
  const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const sortie = resolve(racine, opts.sortie || 'demo');
  const { tablette1, tablette2, calendrier } = genererDemo({ fin: opts.fin, graine: opts.graine });

  mkdirSync(sortie, { recursive: true });
  const f1 = join(sortie, 'aba-demo-tablette-1.json');
  const f2 = join(sortie, 'aba-demo-tablette-2.json');
  /* JSON compact, comme celui que produit l'application. Indenter un fichier
     de plusieurs mégaoctets ne le rend pas relisible pour autant et gonfle le
     dépôt d'un tiers ; c'est `tests/test_demo.mjs` qui garantit son contenu,
     pas une lecture au diff. */
  writeFileSync(f1, `${JSON.stringify(tablette1)}\n`);
  writeFileSync(f2, `${JSON.stringify(tablette2)}\n`);

  console.log(`Période      : ${calendrier.debut} → ${calendrier.fin} (congés du ${calendrier.conges.debut} au ${calendrier.conges.fin})`);
  console.log(`Personnes    : ${tablette1.students.length}`);
  console.log(`Séances      : ${tablette1.sessions.length}`);
  console.log(`Crises / ABC : ${tablette1.crises.filter((c) => c.kind === 'crise').length} / ${tablette1.crises.filter((c) => c.kind === 'abc').length}`);
  console.log(`Relevés      : ${tablette1.suivi.length} (dont ${tablette1.stabilite.length} projetés en v3)`);
  console.log(`Écrit        : ${f1}`);
  console.log(`Écrit        : ${f2} (${tablette2.sessions.length} séances de double cotation)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2));
}
