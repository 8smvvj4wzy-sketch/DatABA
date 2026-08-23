/* Traduction d'une sauvegarde DatABA en référentiel de génération.
 *
 * Ce que la tablette sait de l'établissement — les ateliers, l'emploi du
 * temps, les objectifs travaillés dans chaque atelier — n'atteignait pas le
 * générateur, qui portait son propre référentiel en dur. Une démonstration
 * parlait donc d'« Atelier cuisine » et de « Habiletés sociales » à des gens
 * qui n'ont ni l'un ni l'autre.
 *
 * Ce module comble ce trou, et rien d'autre : il lit une sauvegarde
 * `aba-backup` v4 et en tire un référentiel de la forme de
 * `REFERENTIEL_DEFAUT`. Les personnes restent fictives — ce sont les dix
 * profils de `PERSONNES`, avec leurs trajectoires, redistribués sur les vrais
 * objectifs. Aucune donnée d'usager ne traverse : ni initiales, ni séance, ni
 * relevé, ni crise. Seuls traversent des libellés de configuration.
 *
 * Trois écarts entre ce que l'application stocke et ce que le générateur
 * attend, et c'est là que tout le travail se trouve :
 *
 * 1. **Aucune heure.** Un atelier de DatABA n'a pas de créneau horaire,
 *    seulement un rang dans la journée. Les créneaux sont donc déduits de cet
 *    ordre, puis étalés entre 8 h 30 et 16 h 30 — la borne 8 h – 18 h de
 *    l'en-tête du générateur n'est pas négociable : au-delà, un relevé change
 *    de journée calendaire dès qu'on le relit à Paris.
 * 2. **Les objectifs appartiennent aux personnes, pas aux ateliers.** Le lien
 *    passe par `usualObjectives` (par personne, dans l'atelier), qu'on suit
 *    jusqu'à `students[].objectives` pour récupérer nom, mode et
 *    configuration. Les personnes réelles ne servent qu'à cette résolution et
 *    sont laissées derrière.
 * 3. **Les identifiants sont re-préfixés `demo-`.** C'est l'invariant
 *    anti-collision du générateur : fusionné dans un Manager qui contient
 *    déjà de vraies données, rien de ce jeu ne doit se confondre avec elles.
 *    Seuls les NOMS viennent du fichier — et c'est le nom qui s'affiche, y
 *    compris pour l'appariement IOA de Manager.
 */

import {
  REFERENTIEL_DEFAUT,
  PERSONNES,
  TYPES_PRIORITAIRES,
  FORME_JAMAIS,
  P,
} from './generer-demo.mjs';

/* Les modes que `entreeDepuisNiveau` sait coter. Un objectif d'un autre mode
   est écarté nommément : produire une entrée vide pour un mode inconnu
   donnerait un objectif présent à l'écran et jamais coté, ce qui se lit comme
   un défaut de l'outil et non comme une limite du jeu. */
const TYPES_COTABLES = ['trials', 'occurrence', 'interval', 'chaining', 'balance', 'probe'];

/* La journée de génération. `DUREE_MAX` cède quand les ateliers sont trop
   nombreux pour tenir sans se chevaucher. */
const DEBUT_JOURNEE = 8 * 60 + 30;
const FIN_JOURNEE = 16 * 60 + 30;
const DUREE_MAX = 45;
const DUREE_MIN = 20;

/* Une clé de catalogue ne contient jamais de tiret : elle se relit dans
   l'identifiant de l'objectif par `cleDObjectif`. D'où le filtrage à
   `[a-z0-9]`, accents dépliés puis retirés. */
function slug(texte) {
  const brut = (texte || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 28);
  return brut || 'sansnom';
}

function slugUnique(texte, pris) {
  const base = slug(texte);
  let cle = base;
  let i = 2;
  while (pris.has(cle)) {
    cle = `${base}${i}`;
    i += 1;
  }
  pris.add(cle);
  return cle;
}

/* Un objectif dont la configuration ne porte pas ce que son mode exige
   produirait des cotations vides ou incohérentes. Mieux vaut l'écarter en le
   disant que le laisser passer et le découvrir à l'écran. */
function raisonDEcart(o) {
  if (!TYPES_COTABLES.includes(o.type)) return `mode « ${o.type || 'inconnu'} » non couvert par le générateur`;
  const c = o.config || {};
  if (o.type === 'interval' && (!Array.isArray(c.levels) || c.levels.length < 2 || !c.targetLevelId)) {
    return 'intervalle sans niveaux ou sans niveau cible';
  }
  if ((o.type === 'chaining' || o.type === 'balance') && (!Array.isArray(c.steps) || !c.steps.length)) {
    return `${o.type === 'balance' ? 'équilibre' : 'chaînage'} sans étapes`;
  }
  return null;
}

/* Le rang moyen d'un atelier sur les jours où il est programmé. C'est tout ce
   dont on dispose pour en déduire une heure : deux ateliers toujours posés en
   premier resteront côte à côte le matin. */
function rangMoyen(atelierId, emploiDuTemps) {
  const rangs = [];
  Object.values(emploiDuTemps).forEach((liste) => {
    const i = liste.indexOf(atelierId);
    if (i >= 0) rangs.push(i);
  });
  return rangs.length ? rangs.reduce((a, b) => a + b, 0) / rangs.length : 99;
}

function creneauxDepuisOrdre(ordre) {
  const n = ordre.length;
  const pas = n > 1 ? (FIN_JOURNEE - DEBUT_JOURNEE) / (n - 1) : 0;
  const duree = n > 1 ? Math.max(DUREE_MIN, Math.min(DUREE_MAX, Math.round(pas) - 5)) : DUREE_MAX;
  const creneaux = {};
  ordre.forEach((a, k) => {
    const minutes = n > 1 ? DEBUT_JOURNEE + Math.round(k * pas) : 11 * 60;
    creneaux[a.id] = { h: Math.floor(minutes / 60), min: minutes % 60, duree };
  });
  return creneaux;
}

/* Quatre heures de relevé, visant l'intérieur des créneaux — un relevé pris
   hors séance ne porte ni atelier ni intervenant, et Explorer ne peut alors
   plus croiser une durée de suivi par atelier. Avec moins de quatre ateliers,
   on repasse dans les mêmes créneaux, un quart d'heure plus tard. */
function heuresReleveDepuisCreneaux(ordre, creneaux) {
  return [0, 1, 2, 3].map((i) => {
    const c = creneaux[ordre[i % ordre.length].id];
    const decalage = Math.min(10 + Math.floor(i / ordre.length) * 15, Math.max(5, c.duree - 10));
    const total = c.h * 60 + c.min + decalage;
    return [Math.floor(total / 60), total % 60];
  });
}

/* Les dix profils fictifs, reposés sur le catalogue réel.
 *
 * Ce qui est conservé de chaque profil : les initiales, l'unité, la
 * description, le NOMBRE de prioritaires et surtout la **répartition des
 * formes de trajectoire** — combien d'objectifs en acquisition franche, en
 * plateau, en régression. C'est elle qui fait qu'un cadre a quelque chose à
 * lire dans chaque vue plutôt qu'un bruit uniforme.
 *
 * Ce qui change : les objectifs eux-mêmes, tirés de la rotation entrelacée
 * des ateliers pour qu'une personne ait de quoi coter dans plusieurs d'entre
 * eux — sans quoi elle traverserait la moitié de ses séances sans une seule
 * cotation. */
function personnesSurCatalogue(catalogue, rotation, avertir) {
  const parCle = new Map(catalogue.map((o) => [o.cle, o]));
  const pas = Math.max(1, Math.floor(rotation.length / PERSONNES.length));

  return PERSONNES.map((modele, indexPersonne) => {
    const formes = Object.values(modele.objectifs);
    const nb = Math.min(formes.length, rotation.length);
    const depart = (indexPersonne * pas) % rotation.length;

    const choisis = [];
    for (let i = 0; choisis.length < nb; i++) {
      const cle = rotation[(depart + i) % rotation.length];
      if (!choisis.includes(cle)) choisis.push(cle);
    }
    const affectation = choisis.map((cle, i) => ({ cle, forme: formes[i] }));

    /* L'objectif jamais coté doit être en essais : `entreeVide` d'un objectif
       en occurrence pose `count: 0`, une mesure valide que Manager compte
       comme un point coté. Seuls les essais restent structurellement vides.
       (Même raisonnement que le commentaire du profil J.L.) */
    const iJamais = affectation.findIndex((x) => x.forme === FORME_JAMAIS);
    if (iJamais >= 0) {
      const iEssais = affectation.findIndex((x) => parCle.get(x.cle).type === 'trials');
      if (iEssais < 0) {
        affectation[iJamais].forme = 'progression';
        avertir(`${modele.ini} : aucun objectif en essais dans ses ateliers, le cas « prioritaire jamais coté » n'est pas représenté`);
      } else if (iEssais !== iJamais) {
        const permute = affectation[iJamais].cle;
        affectation[iJamais].cle = affectation[iEssais].cle;
        affectation[iEssais].cle = permute;
      }
    }

    /* Les prioritaires sont épinglés à chaque séance : seuls les modes qui se
       cotent vite y ont leur place (TYPES_PRIORITAIRES). On y met d'abord
       l'objectif jamais coté quand il y est éligible — c'est le seul endroit
       où Manager le relance —, puis ceux dont la trajectoire atteint un
       critère, qui sont ce qu'on vient montrer. */
    const rangForme = { acquis: 0, bientot: 1, maintien: 2 };
    const eligibles = affectation
      .filter((x) => TYPES_PRIORITAIRES.includes(parCle.get(x.cle).type))
      .sort((a, b) => ((rangForme[a.forme] ?? 9) - (rangForme[b.forme] ?? 9)) || a.cle.localeCompare(b.cle));
    if (!eligibles.length) {
      throw new Error(
        `${modele.ini} : aucun objectif en « essai par essai » ni en « occurrence » parmi ceux de ses ateliers.\n` +
        'Un jeu sans objectif prioritaire ouvre sur des écrans vides. Ajoute au moins un objectif de l’un de ces deux modes aux ateliers, puis réexporte.'
      );
    }

    const prioritaires = [];
    const jamais = affectation.find((x) => x.forme === FORME_JAMAIS);
    if (jamais && TYPES_PRIORITAIRES.includes(parCle.get(jamais.cle).type)) prioritaires.push(jamais.cle);
    eligibles.forEach((x) => {
      if (prioritaires.length < modele.prioritaires.length && !prioritaires.includes(x.cle)) prioritaires.push(x.cle);
    });

    return {
      ini: modele.ini,
      classe: modele.classe,
      profil: modele.profil,
      prioritaires,
      objectifs: Object.fromEntries(affectation.map((x) => [x.cle, x.forme])),
    };
  });
}

export function referentielDepuisSauvegarde(backup) {
  const avertissements = [];
  const avertir = (m) => avertissements.push(m);

  if (!backup || typeof backup !== 'object') throw new Error('Fichier illisible : ce n’est pas un objet JSON.');
  if (backup.format === 'aba-backup-encrypted') {
    throw new Error(
      'Cette sauvegarde est chiffrée. Réexporte-la depuis l’onglet Export avec « Sauvegarde sans chiffrement ».'
    );
  }

  const ateliersSource = (Array.isArray(backup.ateliers) ? backup.ateliers : []).filter((a) => a && a.name);
  if (!ateliersSource.length) {
    throw new Error(
      'Aucun atelier dans ce fichier. Un export de configuration (« aba-config ») ne suffit pas non plus : il ne porte pas les objectifs par atelier. Il faut une sauvegarde complète.'
    );
  }

  /* ── Ateliers et emploi du temps ── */
  const prisAteliers = new Set();
  const idDemoDe = new Map();
  const ateliers = ateliersSource.map((a) => {
    const atelier = { id: `${P}-a-${slugUnique(a.name, prisAteliers)}`, name: a.name };
    idDemoDe.set(a.id, atelier.id);
    return atelier;
  });

  const emploiDuTemps = {};
  for (let j = 0; j <= 6; j++) {
    const liste = (backup.emploiDuTemps && backup.emploiDuTemps[String(j)]) || [];
    const remap = [];
    liste.forEach((id) => {
      const cible = idDemoDe.get(id);
      if (!cible) return; // atelier supprimé depuis, comme ateliersDuJour l'ignore déjà
      if (!remap.includes(cible)) remap.push(cible);
    });
    emploiDuTemps[j] = remap;
  }

  const programmes = ateliers.filter((a) => Object.values(emploiDuTemps).some((l) => l.includes(a.id)));
  if (!programmes.length) {
    throw new Error(
      'Aucun atelier n’est programmé dans l’emploi du temps. Sans jour de passage, le générateur n’a aucune séance à produire — coche les jours de chaque atelier dans l’écran « Ateliers et emploi du temps », puis réexporte.'
    );
  }

  const ordre = programmes
    .slice()
    .sort((a, b) => (rangMoyen(a.id, emploiDuTemps) - rangMoyen(b.id, emploiDuTemps)) || a.name.localeCompare(b.name, 'fr'));
  const creneaux = creneauxDepuisOrdre(ordre);
  const heuresReleve = heuresReleveDepuisCreneaux(ordre, creneaux);

  /* ── Catalogue, atelier par atelier ── */
  const objectifsSource = new Map();
  (backup.students || []).forEach((s) => (s.objectives || []).forEach((o) => { if (o && o.id) objectifsSource.set(o.id, o); }));

  const parSignature = new Map();
  const prisCles = new Set();
  const catalogue = [];
  const objectifsParAtelier = {};
  const ecartes = new Map();

  ateliersSource.forEach((aSrc) => {
    const idDemo = idDemoDe.get(aSrc.id);
    const cles = new Set();
    const ids = new Set();
    Object.values(aSrc.usualObjectives || {}).forEach((l) => (l || []).forEach((id) => ids.add(id)));
    (aSrc.knownObjectiveIds || []).forEach((id) => ids.add(id));
    (aSrc.favoriteObjectiveIds || []).forEach((id) => ids.add(id));

    [...ids].sort().forEach((id) => {
      const o = objectifsSource.get(id);
      if (!o || !o.name) return; // objectif supprimé depuis : usualObjectives le perd déjà en silence
      const raison = raisonDEcart(o);
      if (raison) {
        ecartes.set(o.name, raison);
        return;
      }
      const signature = `${o.name} ${o.type}`;
      let entree = parSignature.get(signature);
      if (!entree) {
        entree = {
          cle: slugUnique(o.name, prisCles),
          nom: o.name,
          type: o.type,
          /* Copie profonde : la configuration réelle porte cibles, étapes,
             seuils et jeu de guidances, et le générateur en fait des
             instances par personne. */
          config: JSON.parse(JSON.stringify(o.config || {})),
        };
        parSignature.set(signature, entree);
        catalogue.push(entree);
      }
      cles.add(entree.cle);
    });

    objectifsParAtelier[idDemo] = cles;
    if (!cles.size && programmes.some((a) => a.id === idDemo)) {
      avertir(`atelier « ${aSrc.name} » : aucun objectif rattaché, il n'aura aucune séance`);
    }
  });

  if (!catalogue.length) {
    throw new Error(
      'Aucun objectif rattaché à un atelier. Le lien se fait dans l’écran « Ateliers et emploi du temps » : ouvrir un atelier, y ajouter les personnes, puis cocher leurs objectifs. Réexporte ensuite.'
    );
  }

  /* Rotation entrelacée : un objectif du premier atelier, un du deuxième…
     C'est ce qui donne à chaque personne des objectifs répartis sur plusieurs
     ateliers plutôt que tous concentrés dans un seul. */
  const listes = ordre.map((a) => [...(objectifsParAtelier[a.id] || [])].sort());
  const rotation = [];
  const vus = new Set();
  const profondeur = Math.max(0, ...listes.map((l) => l.length));
  for (let r = 0; r < profondeur; r++) {
    listes.forEach((l) => {
      if (r < l.length && !vus.has(l[r])) { vus.add(l[r]); rotation.push(l[r]); }
    });
  }
  // Objectifs rattachés à un atelier jamais programmé : gardés en fin de file.
  catalogue.forEach((o) => { if (!vus.has(o.cle)) { vus.add(o.cle); rotation.push(o.cle); } });

  /* ── Guidances ── */
  const guidances = Array.isArray(backup.guidances) && backup.guidances.length ? backup.guidances : REFERENTIEL_DEFAUT.guidances;
  const independante = guidances.find((g) => g.independent);
  const nonIndependantes = guidances.filter((g) => !g.independent).map((g) => g.code);
  if (!independante) avertir('aucune guidance marquée « indépendant » : le code « I » du jeu par défaut est repris');
  if (!nonIndependantes.length) avertir('aucune guidance dépendante : les codes du jeu par défaut sont repris');

  /* Une unité fréquente un atelier sur deux plus que l'autre — des journées à
     composition identique effacent le croisement par unité de Manager. */
  const affinites = {};
  ordre.forEach((a, k) => {
    if (k % 2 === 1) affinites[a.id] = { classe: (k >> 1) % REFERENTIEL_DEFAUT.classes.length, reste: k % 3 };
  });

  const personnes = personnesSurCatalogue(catalogue, rotation, avertir);

  const referentiel = {
    ateliers,
    emploiDuTemps,
    creneaux,
    affinites,
    objectifsParAtelier,
    catalogue,
    personnes,
    guidances,
    codeIndependant: independante ? independante.code : REFERENTIEL_DEFAUT.codeIndependant,
    codesNonIndependants: nonIndependantes.length ? nonIndependantes : REFERENTIEL_DEFAUT.codesNonIndependants,
    /* Fictifs, et ils le restent : une démonstration qui nomme les
       professionnels se lit comme une évaluation de professionnel. */
    classes: REFERENTIEL_DEFAUT.classes,
    intervenants: REFERENTIEL_DEFAUT.intervenants,
    axes: REFERENTIEL_DEFAUT.axes,
    heuresReleve,
  };

  return {
    referentiel,
    resume: {
      ateliers: ateliers.length,
      programmes: ordre.map((a) => ({
        nom: a.name,
        heure: `${String(creneaux[a.id].h).padStart(2, '0')}:${String(creneaux[a.id].min).padStart(2, '0')}`,
        objectifs: (objectifsParAtelier[a.id] || new Set()).size,
      })),
      objectifs: catalogue.length,
      ecartes: [...ecartes].map(([nom, raison]) => `${nom} — ${raison}`),
      avertissements,
    },
  };
}
