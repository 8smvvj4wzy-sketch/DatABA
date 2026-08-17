# Jeu de démonstration — trois mois de cotation

Deux fichiers, produits par `scripts/generer-demo.mjs`, en clair :

| Fichier | Contenu |
| --- | --- |
| `aba-demo-tablette-1.json` | Le jeu complet. Sauvegarde `aba-backup` v4, importable dans DatABA comme dans Manager. |
| `aba-demo-tablette-2.json` | Six séances de double cotation, et rien d'autre. Ne sert qu'à la fiabilité inter-observateurs de Manager. |

## Régénérer avant chaque démonstration

```bash
node scripts/generer-demo.mjs
```

**Ce n'est pas facultatif.** Le jeu est calé sur trois mois glissants qui
s'arrêtent au jour de la génération, et deux mécanismes de Manager se comptent
à partir de l'heure réelle : la période affichée par défaut (trente derniers
jours) et la dormance d'un objectif (vingt et un jours sans cotation). Un
fichier produit en août et montré en novembre ouvre sur un écran vide et
affiche l'ensemble des objectifs en « dormant ». Les fichiers versionnés ici
sont un point de départ, pas une archive.

Pour rejouer une démonstration à l'identique, figer la date de fin :

```bash
node scripts/generer-demo.mjs --fin 2026-08-12 --graine 42
```

À paramètres égaux le fichier est identique, octet pour octet.

## Ce que contient le jeu

Dix personnes accompagnées, désignées par leurs initiales, réparties en deux
unités. Dix objectifs chacune, tous dérivés des essentiels de l'EFL — faire
des demandes, attendre, tolérer le non, suivre une consigne de sécurité,
enchaîner des tâches acquises, faire une transition, les gestes d'hygiène,
tolérer une situation de santé. Un ou deux objectifs prioritaires par
personne, en essais par essais ou en occurrence — épinglés à chaque séance,
comme dans l'application.

Chaque objectif coté démarre par une **ligne de base plate de 3 à 5
cotations**, basse et à peine bruitée, avant que l'intervention ne commence :
c'est ce qui rend lisible le repère vertical daté que Manager trace au premier
point qui suit (`reperesDePhase`, ajouté par `7e8235a`). Une partie des
objectifs reçoit en plus un **repère de changement de procédure** (guidance
dégressive, délai augmenté…) en cours d'intervention — daté comme un
changement de phase, mais sans faire bouger la phase affichée, exactement
comme le second geste de `BoutonPhase` sur la tablette — et les objectifs qui
atteignent leur critère passent en **Maintien** avant la fin de la période :
plusieurs verticales sur une même courbe.

Trois mois de séances du lundi au vendredi sur quatre ateliers récurrents,
trois intervenants, **une semaine de congés sans aucune trace**, des crises et
des observations ABC, un suivi continu sur deux axes, et un **compteur
d'occurrence** « Sollicitations » par personne — un enregistrement par appui,
jamais un total.

Chaque personne suit une trajectoire assignée, pour qu'un cadre ait quelque
chose à lire dans chaque vue :

| Personne | Trajectoire |
| --- | --- |
| A.B. | acquisition franche, cibles successives franchies |
| C.D. | plateau installé sous le seuil |
| E.F. | régression après les congés, remontée partielle |
| G.H. | démarrage tardif en cours de trimestre |
| J.L. | données lacunaires — un prioritaire ouvert jamais coté, un autre laissé de côté |
| K.M. | à une séance du critère |
| N.P. | comportement problème qui passe sous son seuil |
| R.S. | crises fréquentes et intenses |
| T.V. | suivi continu dense sur deux axes |
| Y.Z. | suivi de fréquence, sans critère à trancher |

Les compteurs d'occurrence suivent les mêmes trajectoires : les sollicitations
de A.B. et de N.P. s'estompent au fil du trimestre, celles de R.S. montent,
G.H. n'en produit qu'à partir du milieu de la période, et **J.L. garde un
compteur déclaré mais jamais utilisé** — le cas d'une série vide, que Manager
doit rendre comme telle et non comme une erreur. Deux appuis sur trois tombent
pendant une séance, ce qui les rend croisables par atelier et par intervenant ;
le reste tombe hors séance, parce qu'une sollicitation n'attend pas l'atelier.

Les données sont fictives. Aucune ne provient d'une personne réelle.

## Démonstration de DatABA

Écran Gestion → Restaurer une sauvegarde → `aba-demo-tablette-1.json`.

> La restauration **remplace** toutes les données de la tablette. À ne faire
> que sur un appareil de démonstration, jamais sur une tablette en service.

Ensuite : l'écran Suivi montre les états d'acquisition et les courbes, avec
leurs repères de phase et de procédure ; l'encadré orange « Objectifs
prioritaires pas encore cotés » ne relance que sur les prioritaires — c'est le
seul objectif de J.L. qui doit y apparaître. L'écran Session permet d'ouvrir
une séance sur un atelier existant et de coter dans chacun des six modes,
l'écran Export produit le fichier pour Manager. Les séances de la dernière
semaine ne sont pas marquées comme transmises : l'écran Export a donc quelque
chose à proposer.

## Démonstration de Manager

Écran Gestion → Importer → `aba-demo-tablette-1.json`.

Trois gestes conditionnent ce qui s'affiche, et une démonstration qui les
oublie donne l'impression que l'outil montre moins qu'il ne montre :

1. **Passer la période sur « 3 mois ».** Par défaut tous les écrans n'affichent
   que les trente derniers jours — la semaine de congés y creuse un trou, et
   les deux premiers mois n'apparaissent pas.
2. **Régler une période de comparaison.** Les écarts chiffrés, le contour de
   référence du radar et les colonnes d'évolution d'Explorer n'existent que
   dans ce cas.
3. **Importer aussi `aba-demo-tablette-2.json`** au moment de montrer la
   fiabilité inter-observateurs, la fusion multi-sources ou la purge par
   source. Sans ce second fichier ces trois fonctions restent vides — elles
   exigent deux appareils, pas deux séances.

Ce que chaque destination a de quoi montrer :

- **Tableau de bord** — les sept états d'objectif sont représentés : acquis,
  bientôt acquis, plateau, en cours, dormant, non acquis, et mesure sans
  critère. Seize objectifs prioritaires. La carte des crises a de quoi
  calculer sa tendance sur la période précédente.
- **Séances** — 134 séances, plus de vingt-cinq jours distincts : le
  regroupement par jour passe en mode paginé. Des séances en mode Équilibre,
  des séances libres sans atelier, des notes par personne, des probes avec
  créneau matin et après-midi.
- **Personnes accompagnées** — les cinq sous-vues sont peuplées. La sous-vue
  Suivi continu montre les deux axes **et** le compteur d'occurrence, qui se
  promeut en objectif (« au plus N appuis sur N jours ») : sur A.B., la série
  passe sous son seuil et l'objectif finit acquis. Le bilan des
  objectifs, avec ses **repères verticaux datés** — un changement de phase, un
  changement de procédure, parfois les deux sur la même courbe — le radar
  (chaque personne a au moins trois objectifs cotés sur les trente derniers
  jours), les crises, le suivi continu, le croisement. L'export « Détail des
  cotations » descend jusqu'à l'essai, l'étape et l'intervalle.
- **Crises** — une centaine de crises et 62 observations ABC. Neuf
  antécédents et neuf comportements distincts : le regroupement « Autres » se
  déclenche. Des crises à plusieurs étiquettes, les trois intensités,
  quelques crises sans intensité notée, les cinq fonctions, une répartition
  sur les cinq jours ouvrés.
- **Explorer** — les quinze mesures rendent toutes un chiffre. Une réserve qui
  n'est pas un trou dans les données mais un choix de Manager, et qui se fait
  remarquer si on ne l'annonce pas : le taux d'autonomie ne porte que sur les
  modes dont le score est un pourcentage, donc l'occurrence en est exclue —
  l'intervalle, lui, y entre bien. Les durées de suivi se croisent par atelier
  et par intervenant, parce que les relevés sont calés sur les créneaux de
  séance ; les occurrences comptées aussi, et en plus par « Geste de relevé »
  (pastille, clôture de journée, saisie manuelle).
- **Rapport** — de quoi composer un bilan pour n'importe laquelle des dix
  personnes, avec ou sans graphiques, avec ou sans bilan de crises.
- **Gestion** — deux sources listées, des séances anciennes de trois mois pour
  la purge par date, dix personnes pour la purge par personne.

## Ce qui ne voyage pas dans le fichier

Quatre choses vivent côté Manager et ne peuvent pas être pré-remplies par une
sauvegarde de tablette. Il faut les saisir pendant la démonstration — c'est
rapide, mais mieux vaut le savoir avant :

- **les codes de curriculum** (`codesEfl`), attachés au nom de l'objectif ;
- **les libellés d'affichage** (`alias`) pour les personnes et les objectifs ;
- **les commentaires** par personne et par objectif ;
- **les rapports enregistrés** : ils se composent depuis l'onglet Rapport, et
  le bilan de crises qu'on peut y joindre se prépare depuis l'onglet Crises.

## Contrôle

`tests/test_demo.mjs` vérifie ce que le jeu prétend contenir : conformité à ce
qui a été demandé, invariants de structure, couverture des sept états
d'objectif et de chaque bloc d'écran, et surtout que les fichiers versionnés
correspondent bien au script qui les a produits. Il tourne avec le reste de la
suite :

```bash
./verifier.sh
```

Un `demo/*.json` retouché à la main s'y voit immédiatement.
