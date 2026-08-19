# DatABA — manuel d'utilisation

Application de recueil de données comportementales en contexte de groupe.
Elle fonctionne **sans connexion** et les données restent **sur l'appareil** :
rien n'est envoyé vers un serveur.

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Installer l'application](#2-installer-lapplication)
3. [Le code de sécurité](#3-le-code-de-sécurité)
4. [Écran Gestion](#4-écran-gestion)
5. [Écran Personnes accompagnées](#5-écran-personnes-accompagnées)
6. [Les cinq modes de cotation](#6-les-cinq-modes-de-cotation)
7. [Écran Session](#7-écran-session)
8. [Crises et observations ABC](#8-crises-et-observations-abc)
9. [Écran Suivi](#9-écran-suivi)
10. [Écran Export](#10-écran-export)
11. [Exploiter les données dans Excel](#11-exploiter-les-données-dans-excel)
12. [Gestes et raccourcis](#12-gestes-et-raccourcis)
13. [Sauvegarde](#13-sauvegarde)
14. [Mises à jour](#14-mises-à-jour)
15. [RGPD et protection des données](#15-rgpd-et-protection-des-données)
16. [Dépannage](#16-dépannage)

---

## 1. Vue d'ensemble

Cinq écrans, accessibles par les onglets du haut ou par balayage horizontal :

| Écran | À quoi il sert |
|---|---|
| **Gestion** | Personnes, ateliers, intervenants, guidances, réponses ABC, sécurité, sauvegarde |
| **Personnes** | Définir les objectifs de chacun et leur mode de cotation |
| **Session** | Préparer et coter une séance |
| **Suivi** | Où en sont les objectifs, et leurs courbes de progression |
| **Export** | Produire et transmettre les rapports Excel |

Deux boutons sont présents en bas de tous les écrans : **CRISE** et **ABC**.

Ordre de mise en route la première fois : Gestion → Personnes → Session.

---

## 2. Installer l'application

Ouvrez l'adresse fournie par votre établissement, puis :

**iPhone / iPad** — dans **Safari** (obligatoire, les autres navigateurs ne le
proposent pas sur iOS) : bouton **Partager**, puis **Sur l'écran d'accueil**,
puis **Ajouter**.

**Tablette Android** — dans **Chrome** : menu **⋮**, puis
**Installer l'application**.

L'icône se comporte ensuite comme une application : plein écran, et
fonctionnement hors connexion après la première ouverture.

---

## 3. Le code de sécurité

À la première ouverture, l'application demande de choisir une protection :

- **Code chiffré**, à 4 ou 6 chiffres — rapide à saisir. **6 chiffres sont
  fortement recommandés**, ils protègent nettement mieux que 4.
- **Mot de passe écrit** — plus solide, mais plus lent à chaque ouverture.

Dans les deux cas, il a deux rôles : verrouiller l'accès, et **chiffrer les
données enregistrées** sur l'appareil.

- L'application se verrouille **à chaque mise en veille** et après
  **10 minutes sans interaction**.
- Après **3 codes erronés**, la saisie se suspend 30 secondes ; après 5, cinq
  minutes ; après 8, quinze minutes. Ce délai survit à un redémarrage.
- Le code ou mot de passe se modifie dans **Gestion → Sécurité**. Les données
  sont automatiquement rechiffrées.

### Désactiver la protection

**Gestion → Sécurité** propose de retirer la protection. C'est un vrai recul :
les données sont alors **déchiffrées et enregistrées en clair**, et quiconque
accède à l'appareil peut les lire, y compris en récupérant les fichiers. Deux
confirmations sont demandées.

À n'envisager que si l'appareil est lui-même verrouillé par un code et réservé
au service. La réactivation se fait depuis le même écran.

> ⚠️ **Le code perdu, les données sont perdues.** Elles sont chiffrées avec lui :
> il n'existe aucun moyen de les récupérer. Le seul recours est d'effacer
> l'appareil et de restaurer une sauvegarde (section 13).

---

## 4. Écran Gestion

### Personnes accompagnées

Ajoutez-les par leurs **initiales uniquement** (ex. `J.D.`). Aucun nom, aucune
date de naissance, aucune adresse n'est demandé — c'est délibéré, voir la
section 15.

L'icône crayon renomme, la croix supprime (avec confirmation, car les objectifs
de la personne partent avec).

### Ateliers

Les groupes récurrents : « Habiletés sociales », « Repas », « Atelier cuisine »…
Créez-le par son nom, puis dépliez-le (appui sur la ligne) pour régler dans le
même écran :

- **les jours** de la semaine où il a lieu ;
- **les personnes habituelles** — cocher une personne présélectionne ses
  objectifs (mémorisés pour cet atelier, sinon ses objectifs prioritaires,
  sinon tous) ;
- **les objectifs de chacune**, avec l'étoile qui les rend prioritaires pour
  cet atelier seulement.

**Un groupe différent selon le jour.** Le sport du mardi n'accueille pas
forcément les mêmes que celui du jeudi. Dès qu'un atelier a lieu sur plusieurs
jours, une rangée apparaît au-dessus des personnes : **Tous les jours**, puis un
bouton par jour programmé. Sur *Tous les jours*, vous réglez la liste commune ;
sur un jour, vous ne réglez que ce jour-là — il part d'une copie de la liste
commune et s'en détache dès la première modification. Un point signale les
jours ainsi ajustés, et **Revenir au réglage commun** efface la variante.

> Les objectifs, eux, restent communs à l'atelier quel que soit le jour : les
> faire varier aussi doublerait le paramétrage sans rien apporter.

Aucune personne accompagnée ? Un bouton dans le panneau ouvre directement leur
écran de création. Depuis une personne cochée, le chevron renvoie à sa fiche.

Un atelier peut aussi mémoriser sa configuration au fil d'une séance réelle
(section 7) — les deux réglages écrivent au même endroit et restent
cohérents entre eux. Si le jour en cours porte une liste propre, c'est elle que
la mémorisation met à jour, pas le réglage commun.

**La semaine.** Sous la liste des ateliers, une grille horizontale montre les
jours de la semaine, chacun avec ses ateliers dans l'ordre où ils se
dérouleront. Appui long sur un atelier pour changer sa place dans la journée
(comme partout ailleurs où un réordonnancement est proposé). **Appliquer aux
autres jours**, sous une colonne, reprend cet ordre pour les autres jours —
sans jamais programmer ni déprogrammer un atelier : seuls les ateliers déjà
communs aux deux jours sont repositionnés, les ateliers propres à un jour
restent à leur place. C'est un geste ponctuel, pas une règle permanente : un
atelier ajouté plus tard à un jour ne se replace pas tout seul, il faut
réappliquer.

### Intervenants

Les professionnels qui cotent. On en sélectionne un au lancement d'une séance ;
il apparaît dans les rapports, pour la traçabilité.

### Guidances

La bibliothèque de réponses proposée à la création d'un objectif. Quatre sont
fournies : **I** (indépendant), **GP** (guidance partielle), **GT** (guidance
totale) et **0** (mauvaise réponse).

Vous pouvez en ajouter (code, intitulé, couleur), en supprimer, et **réordonner
la liste par appui long puis glissement**.

L'étoile ne fixe ici qu'une **valeur par défaut** : le fait qu'une guidance
compte comme réussite autonome se décide objectif par objectif (section 5).

### Réponses ABC

Les réponses proposées derrière le bouton **+** des zones A, B et C, pour les
crises comme pour les observations. Les trois listes sont entièrement
modifiables : ajout, renommage, suppression, et réorganisation par appui long.

Placez en tête ce que votre équipe coche le plus souvent : c'est l'ordre
d'affichage.

### Suivi continu

Les critères notés au fil de la journée pour une personne, indépendamment des
ateliers — « Stable », « Pré-crise », « Crise », « Post-crise » par défaut.
Entièrement modifiable : ajout, renommage, couleur, suppression, réorganisation
par appui long. Renommer un critère ne perd pas les relevés déjà notés sous
son ancien nom ; en supprimer un les laisse visibles comme « Critère retiré »,
sans jamais ressusciter la clé effacée.

Cet écran est la **bibliothèque des suivis disponibles** : créez-en autant qu'il
en faut — « état émotionnel », « engagement », « douleur »… — chacun avec sa
propre liste de critères. Il n'y a pas de limite de nombre. Chaque carte
rappelle pour qui le suivi est actif.

L'activation par personne se fait depuis l'écran Personnes accompagnées
(section 5) : une pastille par axe activé apparaît alors en bas d'écran, sur
tous les onglets.

> Le libellé du critère en cours ne s'affiche que si la personne n'a qu'un
> seul axe actif ; au-delà, seules les couleurs restent lisibles dans la barre
> du bas, trois au plus suivies d'un compteur — le détail se lit dans la
> feuille de choix, ouverte au tap.

**Corriger après coup.** Une cotation oubliée, une heure fausse : depuis la
feuille de choix, **Corriger la journée** ouvre la liste des relevés du jour.
On y change une heure, on ajoute la cotation manquante, on retire le relevé de
trop. Les durées se recalculent seules — aucune n'est stockée. La même feuille
s'ouvre depuis l'écran Export (section 10).

**Grise, la pastille est dormante** : aucun critère n'a encore été noté ce
jour-là pour cet axe, quel qu'ait été le dernier relevé les jours précédents.
Un appui dessus propose de lancer les cotations de la journée. Le relevé peut
être enregistré **à tout moment**, dans ou hors séance — un critère vaut
jusqu'au suivant, il n'y a rien à refermer en cours de journée. **Clôturer la
journée**, depuis la même feuille, arrête le dernier critère à l'instant
présent et repasse la pastille au gris ; sans clôture, le dernier critère du
jour reste en cours jusqu'au lendemain.

### Modèles d'objectifs

Objectifs types réutilisables, avec leur mode de cotation, leurs cibles et leur
critère. Deux façons de les constituer : le bouton **Nouveau modèle** de cet
écran, ou l'icône signet posée sur un objectif existant depuis la fiche d'une
personne (section 5).

Chaque modèle se modifie et se supprime depuis cet écran. L'icône de copie
ouvre **« Appliquer à… »** : cochez une ou plusieurs personnes, donnez
éventuellement un intitulé différent du modèle, et chacune reçoit une copie
indépendante — la modifier ensuite n'affecte ni le modèle ni les autres
copies.

### Sécurité

Longueur du code, modification, rappel des règles de verrouillage.

### Durée de conservation

Aucune limite (par défaut), ou 6 / 12 / 24 / 36 mois. Les séances, crises,
observations et relevés de suivi continu plus anciens sont **supprimés
automatiquement à l'ouverture**, avec un message indiquant le nombre
d'éléments retirés. La date de coupure s'affiche.

> Cette suppression est **définitive**. Transmettez vos rapports avant l'échéance.

### Sauvegarde

Export et restauration (section 13).

---

## 5. Écran Personnes accompagnées

Appuyez sur une personne pour dérouler sa fiche : ses **suivis continus**, puis
ses **objectifs**.

### Les suivis continus d'une personne

Seuls les suivis **actifs** pour cette personne s'affichent, chacun retirable
d'une croix. **Ajouter un suivi** ouvre une feuille listant ceux de la
bibliothèque (section 4) qui ne sont pas encore actifs pour elle ; on en choisit
un, ou on en crée un nouveau — il est aussitôt activé, et l'onglet Suivi continu
s'ouvre pour en définir les critères. Depuis cet onglet, une rangée de puces
d'initiales sur chaque suivi permet symétriquement d'y assigner des personnes.

Supprimer un suivi de la bibliothèque le désactive partout où il l'était ; les
relevés déjà notés restent dans l'historique et l'export, marqués comme un
suivi retiré.

### Créer un objectif

1. **Intitulé** — la formulation qui parle à l'équipe.
2. **Phase** — Ligne de base, Intervention, Maintien ou Généralisation. Sans ce
   repère, une courbe ne dit pas ce qui a produit un changement.
3. **Mode de cotation** — parmi les cinq décrits en section 6.
4. **Réglages propres au mode** (nombre d'essais, durée, étapes…).
5. **Réponses possibles** — pour les modes à guidance : lesquelles s'affichent,
   dans quel ordre (appui long pour déplacer), et **lesquelles comptent comme
   réussite autonome** (étoile). C'est ici que se décide, pour cette personne et
   cet objectif, si « guidance partielle » vaut réussite ou non. Vous pouvez
   aussi **créer une réponse personnalisée** propre à cet objectif.
6. **Critère d'acquisition** — pourcentage libre sur un nombre libre de séances
   ou de jours consécutifs. En jours, plusieurs séances d'une même journée sont
   moyennées.
7. **Cibles successives** (facultatif) — voir ci-dessous.

À côté du bouton **Ajouter un objectif**, l'icône signet ouvre **« Partir d'un
modèle »** si la bibliothèque en contient déjà (section 4) : le formulaire
s'ouvre préempli, il ne reste qu'à ajuster et valider. Si elle est vide, la
même icône ouvre directement l'écran des modèles pour en créer un.

### Les cibles successives

Un objectif peut être découpé en cibles : « rouge », puis « bleu », puis
« vert ». La cotation porte sur **une seule cible à la fois**. Dès qu'elle
atteint le critère d'acquisition, l'application **passe automatiquement à la
suivante** et vous le signale.

Le passage a lieu à l'**enregistrement d'une séance**, jamais en cours de
cotation.

### Changer de phase

Le bouton portant le nom de la phase, sous l'intitulé, ouvre deux actions :

- **Passer à la phase suivante** — après confirmation, la phase avance
  (Ligne de base → Intervention → Maintien → Généralisation). Le changement
  est **daté** et trace un **repère vertical sur la courbe de suivi** : on
  voit alors précisément à partir de quelle séance l'intervention a commencé.
- **Marquer un changement de procédure** — un court libellé (« Guidance
  dégressive », « Délai augmenté »…) trace lui aussi un repère daté, sans
  faire changer la phase affichée. Utile pour dater un ajustement de
  protocole à l'intérieur d'une même phase, sans multiplier les phases.
  Seuls le libellé et la date sont enregistrés — jamais le contenu du
  protocole.

### Actions sur un objectif

| Icône | Effet |
|---|---|
| ⭐ | Objectif prioritaire, **quel que soit l'atelier** |
| Signet | Enregistrer comme modèle réutilisable |
| Copier | Dupliquer vers d'autres personnes (copies indépendantes) |
| Crayon | Modifier |
| Corbeille | Supprimer (avec confirmation) |

---

## 6. Les cinq modes de cotation

### Essais
Une réponse par essai, avec son niveau de guidance. Nombre d'essais **sans
limite** par défaut, ou nombre prévu (3, 5, 8, 10, 20 ou libre) servant de
simple repère : rien n'empêche de dépasser.

→ Score : pourcentage de réponses autonomes.

### Occurrence
Un simple comptage : chaque appui sur **+1** enregistre une occurrence du
comportement observé, avec un **−1** pour corriger un appui de trop.

Le **critère d'acquisition** se règle dans les deux sens — **au moins** N
occurrences (pour développer un comportement, par exemple des demandes
spontanées) ou **au plus** N (pour en réduire un ; « au plus 0 » vise
l'extinction complète), sur un nombre de séances ou de jours consécutifs.

Le chronomètre des mesures annexes, s'il est activé, sert de fenêtre
d'observation ; le compteur annexe n'est pas proposé sur ce mode, le comptage
étant déjà la cotation elle-même.

→ Score : nombre brut d'occurrences.

### Intervalles
Relevé périodique du niveau de fonctionnement. Le **pas est libre, de 10
secondes à 60 minutes** — raccourcis à 30 s, 1, 2, 5, 10 et 15 min, ou saisie
en minutes et secondes. Un pas court donne une mesure plus fine, mais demande
une attention soutenue pendant toute la séance.

Les niveaux sont libres : autant que vous voulez, nommés comme vous voulez.
Quatre sont proposés par défaut — **Stable, Pré-crise, Crise, Post-crise**.

Précisez ce que mesure le relevé :
- **Échantillonnage momentané** — l'état à l'instant précis du top ;
- **Intervalle partiel** — le comportement est survenu au moins une fois ;
- **Intervalle total** — il a duré tout l'intervalle.

Deux façons de saisir, combinables :
- **En direct** — la grille défile, vous appuyez sur le niveau observé ;
- **Périodes à la main** — « 9h00 → 9h20 : engagé », y compris a posteriori.
  L'heure de fin devient le début de la suivante, pour enchaîner vite.

Une **crise déclenchée pendant la séance** marque d'un point rouge les
intervalles qu'elle traverse, et apparaît dans le rapport.
→ Score : pourcentage de temps passé au niveau cible.

### Chaînage
Une séquence d'étapes, chacune cotée par son niveau de guidance.
→ Score : pourcentage d'étapes autonomes.

### Balance Program
Une séquence d'étapes, cotée sur **plusieurs essais** dans la même séance.

Pour chaque étape : **R** (réussi), **G** (guidé), **E** (mauvaise réponse),
**M** (étape manquée) — plus deux marqueurs indépendants : **Demande** et
**Renforcé**, cochables à n'importe quelle étape.

**Ces réponses sont personnalisables** à la création de l'objectif : ajout,
suppression, couleur, abrégé, réorganisation. Deux réglages en déterminent
l'effet sur le score — l'**étoile** marque ce qui compte comme réussite, l'**œil
barré** ce qui sort du calcul. Vous pouvez ainsi décider que « guidé » vaut
réussite pour un accompagnement et pas pour un autre.

« Valider l'essai » ouvre l'essai suivant, sans limite de nombre. Les essais
apparaissent en puces E1, E2, E3 ; on peut revenir corriger l'un d'eux.

→ Score : pourcentage de réussites. **Les étapes manquées sont écartées du
calcul** — une étape non présentée n'est pas un échec — mais restent
comptabilisées à part.

### Mesures annexes : compteur et chronomètre
Deux options, indépendantes l'une de l'autre, disponibles sur les modes
ci-dessus (compteur excepté sur Occurrence, où il ferait double emploi avec la
cotation) **et** sur les fiches crise et ABC. Elles produisent une donnée à
part de la cotation — un comptage ou une durée relevés en marge, jamais
mélangés à un score ni à une courbe de progression.

Dès qu'une option est activée sur un objectif, une icône discrète apparaît sur
sa carte pendant la séance. Un appui déplie un petit panneau sous la carte
(compteur avec correction à la baisse, ou chrono démarrer/arrêter/remettre à
zéro), qu'un bouton discret **Enregistrer** valide et horodate. Les deux
panneaux se déplient indépendamment et peuvent rester ouverts ensemble, l'un
sous l'autre — compter et chronométrer en même temps sans repasser par
l'icône à chaque fois. Une mesure non validée reste modifiable ; une mesure
jamais prise n'apparaît nulle part dans les rapports — elle n'est pas
confondue avec une mesure à zéro.

Le chrono admet un second mode, **temps limite** : une durée fixée à
l'avance, avec son et vibration une fois écoulée — le chrono se fige sans se
valider seul, pour ne rien enregistrer sans confirmation.

Sur **essai par essai, chaînage et Balance Program** (pas sur l'intervalle, qui
mesure des tops de temps et non des essais discrets), chaque option admet en
plus **Relancer à chaque essai** : le compteur ou le chrono se fige et se
range sous l'essai qu'on vient de coter, puis repart de zéro pour le suivant.
Chaque essai garde ainsi sa propre mesure, reprise dans la feuille « Détail par
essai » de l'export.

---

## 7. Écran Session

### Préparer

L'écran propose d'emblée, **dépliée et prête à lancer**, la carte du premier
atelier non encore joué de la semaine type (section 4) : sa classe du jour est
déjà cochée, avec les objectifs habituels de chacune repliés sous
**Objectifs et options**. L'**intervenant qui cote** se choisit juste
au-dessus, en haut de l'écran.

**Lancer un autre atelier** déplie, sans faire défiler le reste de l'écran, la
liste de tous les autres ateliers — les restants de la semaine type d'abord —
suivie de **Balance Program** et **Séance libre**. Chaque ligne propose deux
gestes :

- l'icône **▶** lance directement l'atelier avec sa classe habituelle du
  jour, sans rien déplier — pour l'atelier suivant, quand rien n'a besoin
  d'être ajusté ;
- un appui sur le nom déplie sa fiche complète : personnes présentes,
  intervenant propre à cet atelier si besoin, objectifs de chacune (l'étoile
  les rend **prioritaires pour cet atelier seulement**), deux observateurs en
  parallèle, et **Mémoriser cette configuration**, qui enregistre pour cet
  atelier les personnes, leurs objectifs et les prioritaires.

En mode **Balance Program**, seuls les objectifs de ce type sont proposés,
chaque personne cotant le sien. **Séance libre** ouvre la même fiche sans
atelier associé.

> **Les objectifs créés depuis la dernière mémorisation sont ajoutés
> d'office**, avec un message le signalant. Un objectif volontairement
> décoché reste décoché.

### Coter

Deux vues, séparées par un curseur au centre (ou par balayage) :

- **Prioritaires** — tous les objectifs étoilés de toutes les personnes
  présentes, mélangés dans un **flux unique**. C'est la vue qui s'ouvre par
  défaut. Chaque fiche porte les initiales de la personne concernée ; appuyer
  dessus ouvre sa fiche complète.

  En **séance Balance Program**, ces cotations apparaissent ici d'office, sans
  qu'il soit nécessaire de les étoiler ni de basculer sur la vue par personne.
  Le Balance Program occupe alors la **zone principale** et les autres objectifs
  prioritaires passent sur le côté ; à partir de deux Balance Program simultanés,
  ils se placent côte à côte.
- **Par personne** — la fiche complète d'une personne.

Le **rail de cercles** à droite bascule d'une personne à l'autre.

**Les objectifs s'empilent en colonnes**, chacun à sa hauteur réelle. Un simple
compteur occupe deux fois moins de place qu'une série d'essais, et la place
laissée libre est reprise par l'objectif suivant — même s'il appartient à une
autre personne.

Le bouton de pourcentage dans l'en-tête (**100 % / 85 % / 70 % / 60 %**) règle
la densité : plus elle est réduite, plus il tient d'objectifs à l'écran. Sur
iPhone en paysage, comptez 70 % pour en voir six d'un coup. Le réglage est
mémorisé.

**Réorganiser** : appui long sur un objectif puis glissement, pour le placer où
vous voulez, y compris entre deux personnes.

**Agrandir** : double-appui sur l'intitulé, ou l'icône d'expansion, ouvre la
fiche en plein écran — utile pour un chaînage ou un Balance Program à
nombreuses étapes.

| Élément | Rôle |
|---|---|
| Œil barré | Masquer un objectif pour gagner de la place |
| Expansion | Agrandir la fiche en plein écran |
| Pourcentage | Régler la densité d'affichage |
| Pause | Arrêter la séance : chronomètres et intervalles se figent |
| Croix | Abandonner la séance (avec confirmation) |
| Haut-parleur / vibreur | Couper le son ou la vibration des alertes d'intervalle |
| Note d'observation | Champ libre par personne, exporté à part |
| **Enregistrer** | Clôture la séance |

L'écran reste allumé pendant la cotation (mention « écran maintenu »). Si elle
n'apparaît pas, réglez la mise en veille de l'appareil sur « jamais ».

### Accord inter-observateurs

Deux intervenants cotent la même séance, chacun sur son appareil, sans se
concerter. Ensuite :

1. Le premier appuie sur l'**icône de personnes** de sa séance, choisit un mot
   de passe, et transmet le fichier obtenu à son collègue.
2. Le second le reçoit et le charge par **Gestion → Sauvegarde → Restaurer**,
   saisit le mot de passe, puis choisit **sa propre cotation** de la même séance.
3. L'application affiche le **pourcentage d'accord**, global et objectif par
   objectif, en signalant les points où les deux relevés divergent.

Le rapprochement se fait sur les initiales et l'intitulé des objectifs, donc les
deux appareils n'ont pas besoin de partager la même base.

> Un accord d'au moins **80 %** est l'usage courant pour considérer des relevés
> fiables. En dessous, mieux vaut reprendre ensemble les définitions avant de
> poursuivre. C'est aussi l'argument le plus solide face à un tiers qui
> questionnerait la fiabilité des données.

---

## 8. Crises et observations ABC

Deux boutons en bas de tous les écrans, pour deux usages différents :

| Bouton | Quand l'utiliser |
|---|---|
| **CRISE** (rouge) | Comportement relevant des critères de crise. Un **chronomètre démarre immédiatement**. |
| **ABC** (ambre) | Comportement à consigner sans qu'il relève d'une crise. Pas de chronomètre. |

Les deux ouvrent la même grille :

- **Personne concernée**, **atelier**, **intervenants présents** — pré-remplis
  si une séance est en cours ;
- **A — Antécédent** : ce qui se passait juste avant ;
- **B — Comportement** : ce qui a été observé, de façon factuelle. **Cochez les
  comportements dans leur ordre d'apparition** : ils se numérotent, et cette
  chaîne d'escalade indique par quoi commencent habituellement les crises,
  donc à quel moment intervenir ;
- **C — Conséquence** : ce qui a suivi, réaction de l'environnement ;
- **Fonction supposée** : attention, échappement, tangible, sensoriel ou
  indéterminée ;
- **Intensité ressentie**, de 1 à 3 — légère, modérée, forte. C'est une
  appréciation de l'intervenant sur le moment, pas une mesure : trois niveaux
  suffisent, une échelle plus fine donnerait une fausse impression de
  précision. Reprise dans DatABA Manager ;
- **Commentaire** : contexte, hypothèses, suites à donner.

Chaque zone A, B et C porte un bouton **+** qui déplie les réponses à cocher,
plusieurs par zone. Les réponses retenues s'affichent en pastilles ; un appui
dessus les retire. Le champ de texte libre reste disponible sous chaque zone
pour les précisions.

Les listes proposées se modifient dans **Gestion → Réponses ABC**.

> Ce sont ces réponses cochées qui rendent les enregistrements comptables : un
> texte seul ne s'agrège pas. Sans elles, l'écran Suivi n'a rien à analyser.

### Enchaîner plusieurs ABC

Le bouton **Enchaîner** enregistre la fiche en cours et en ouvre aussitôt une
nouvelle dont **l'antécédent reprend la conséquence de la précédente** — tags
cochés et texte libre. On documente ainsi une séquence entière : ce qui a suivi
le premier épisode devient le point de départ du suivant.

Les maillons partagent un identifiant de chaîne, visible dans la liste sous la
forme `2/3`, et repris dans l'export avec deux colonnes **Chaîne** et **Rang**.

Crises et observations se retrouvent **dans l'écran Export**, avec une pastille
indiquant leur type. Appuyez sur l'une d'elles pour la modifier, y compris la
date, l'heure et la durée si le bouton a été actionné en retard.

**Une fiche ouverte depuis le suivi continu** — en notant le critère « Crise »
— porte la mention *à compléter* et prend sa durée du suivi : de l'appui
jusqu'au critère suivant du même axe. Corriger les relevés de la journée
(section 4) recale cette durée. Dès que vous la saisissez à la main, elle cesse
de suivre ; **Reprendre le calcul automatique** la rebranche.

---

## 9. Écran Suivi

Si au moins une personne a un suivi continu actif, tout en haut : **Aujourd'hui**,
une bande par personne et par axe suivi, du premier relevé du jour à
maintenant, découpée en segments colorés proportionnels à leur durée réelle.
Sans mention d'atelier — le relevé n'en porte pas, c'est DatABA Manager qui
recoupe après coup avec les horaires des séances. Un axe non encore noté ce
jour-là s'affiche « Non démarré aujourd'hui ». **Appuyez sur une bande** pour
noter directement le critère du jour de cette personne, sans chercher sa
pastille en bas d'écran.

Ensuite, **où en sont les objectifs** : quatre compteurs qui se déplient.

| Groupe | Ce qu'il signale |
|---|---|
| **Acquis** | Le critère est atteint. |
| **Bientôt acquis** | Une séance de plus au seuil suffit. |
| **En plateau** | Proche du seuil depuis plusieurs séances, sans l'atteindre. |
| **Manque de données** | Pas encore de quoi se prononcer : trop peu de séances, ou plus rien depuis trois semaines. |

**Une ligne de cette liste s'ouvre au tap** : elle déplie la personne concernée
et fait défiler jusqu'à **la courbe de l'objectif**, plus bas dans le même
écran. Pour le modifier, c'est **Modifier l'objectif**, sous la courbe.

En dessous, une courbe par objectif, avec :

- le **seuil d'acquisition** en pointillé ;
- un badge **Acquis**, ou l'avancement (« 2/3 séances à 80 % ») ;
- pour les objectifs à cibles, la liste des cibles avec celles déjà acquises,
  la courbe ne portant que sur la **cible en cours** ;
- des **repères verticaux datés** à chaque changement de phase et à chaque
  changement de procédure marqué, avec son nom.

Sous la courbe, deux actions rapides : **changer de phase** (même bouton et
même effet que sur la fiche personne, section 5) et **modifier l'objectif**,
qui ouvre directement son formulaire d'édition.

**Réinitialiser le suivi** (sous la courbe) fait repartir la courbe et le
critère de zéro, par exemple après un changement de protocole. Les séances
enregistrées ne sont **pas** supprimées : elles restent dans les exports, seule
la date de reprise change.

---

## 10. Écran Export

C'est l'endroit où l'on **relit et corrige avant de transmettre**. Trois
collections y figurent, dans cet ordre :

- **Rapports de séance** — le crayon rouvre la séance en correction, la
  corbeille la supprime (avec confirmation) ;
- **Crises et observations** — un appui ouvre la fiche, y compris pour
  renseigner l'ABC, l'intensité ou la durée ;
- **Suivi continu** — une entrée par personne, axe et journée ; un appui ouvre
  la journée relevé par relevé (section 4).

**Supprimer toutes les séances enregistrées**, en bas d'écran, efface la
totalité de l'historique d'un coup, après confirmation. Les courbes de suivi
repartent alors de zéro : exportez vos rapports et une sauvegarde avant.

Ce qui reste **à transmettre** vient en premier. Les **options d'export** se
placent juste dessous. Tout ce qui est déjà parti descend dans le dépliant
**Archive**, en bas — modifiable et re-sélectionnable lui aussi.

Deux façons de composer un rapport :

- **Par séance** — vous cochez ce que vous voulez envoyer, dans les trois
  listes indépendamment. Trois boutons rapides sur les séances :
  *Non-envoyés*, *Tout sélectionner*, *Aucun*.
- **Par personne** — vous cochez des personnes, et le rapport reprend tout ce
  qui les concerne. Sur une séance partagée, seules leurs lignes sont retenues.

Chaque élément porte une pastille **Envoyé** ou **Non envoyé**, mise à jour
automatiquement dès qu'un rapport est produit. Un appui dessus corrige le statut
à la main et fait passer l'élément d'une liste à l'autre. Si la sélection
contient une séance déjà envoyée, une confirmation le signale.

> **À la première ouverture après la mise à jour**, les crises et les journées
> de suivi continu apparaissent toutes comme non envoyées : elles ne portaient
> pas encore de statut. Seules les crises rattachées à une séance déjà envoyée
> sont reprises automatiquement — elles sont parties avec son rapport. Pour le
> reste, **Tout marquer comme déjà transmis** solde l'arriéré en un geste, sans
> rien envoyer.

Deux actions :

- **Télécharger** — enregistre le fichier Excel sur l'appareil ;
- **Partager** — ouvre le partage du système, qui permet notamment
  **« Enregistrer dans Fichiers »** vers un dossier OneDrive / SharePoint
  synchronisé.

> En mode *Par personne*, rien n'est marqué comme envoyé : ce rapport recoupe
> des éléments déjà transmis, et les marquer fausserait le suivi des
> non-envoyés.

---

## 11. Exploiter les données dans Excel

Le fichier produit contient six feuilles :

| Feuille | Contenu |
|---|---|
| **Cotations** | Une ligne par objectif et par séance, résultat résumé |
| **Détail par essai** | Une ligne par essai, étape ou intervalle |
| **Crises et observations** | Grille ABC complète, avec le type |
| **Notes** | Observations qualitatives |
| **Suivi continu** | Une ligne par relevé, avec son heure et sa durée |
| **Tableau de bord** | Une ligne par personne/objectif, une colonne par date |

### La feuille « Suivi continu »

Une ligne par relevé, triée par date et heure : personne, axe, critère, et la
**durée en minutes** jusqu'au relevé suivant du même axe pour la même
personne. Cette durée reste **vide** sur le dernier relevé d'une journée non
clôturée, plutôt que d'être devinée jusqu'à minuit — même principe que la
colonne Indépendant de « Détail par essai », qui reste vide plutôt qu'à zéro
quand l'information manque réellement. Une clôture apparaît comme une ligne
à part, avec le critère « — fin — ».

En mode *Par séance*, seuls les relevés des jours couverts par les séances
retenues sont repris ; en mode *Par personne*, tout l'historique de suivi
continu des personnes cochées est repris, comme pour les autres feuilles.

### La feuille « Détail par essai »

C'est la plus utile pour l'analyse. Elle comporte une colonne **Indépendant**
valant **1** ou **0**. Une simple **moyenne** dessus donne un pourcentage,
sans aucune formule à écrire :

1. Cliquez dans les données → **Insertion → Tableau croisé dynamique**.
2. Lignes = *Date*, Valeurs = **Moyenne** de *Indépendant* → taux d'autonomie
   par jour, prêt à passer en graphique.
3. Colonnes = *Résultat*, Valeurs = **Nombre** de *Résultat* → répartition
   I / GP / GT / 0 dans le temps.

Les étapes manquées laissent cette colonne **vide** plutôt qu'à 0, pour ne pas
fausser les moyennes.

Une colonne **Durée (s)** accompagne les périodes d'intervalle saisies à la
main (elle peut aussi contenir des durées d'essais chronométrés dans un export
antérieur à la suppression de cette option).

Deux colonnes **Compteur** et **Chrono (s)** reprennent, pour l'essai ou
l'étape concerné, la mesure auxiliaire capturée quand l'option **Relancer à
chaque essai** est active — vides sinon.

### Copier rapidement vers un tableau de bord

Cliquez sur la première cellule de données (A2, sous les en-têtes), puis
**Ctrl+Maj+Fin** : la sélection s'arrête à la dernière cellule remplie sans
jamais inclure la ligne d'en-tête. Copier, coller à la suite du tableau existant.

### Tableau de bord alimenté automatiquement (facultatif)

Pour consolider tous les rapports sans copier-coller :

1. Déposez tous les rapports dans **un seul dossier** SharePoint.
2. Dans un classeur : **Données → Obtenir des données → À partir d'un fichier →
   À partir d'un dossier**.
3. **Combiner → Combiner et transformer les données**, fichier exemple, feuille
   **Détail par essai**.
4. **Fermer et charger**. À chaque nouveau rapport déposé : **Données →
   Actualiser tout**.

Dans les propriétés de la requête, cochez **Actualiser les données lors de
l'ouverture du fichier** : le classeur se met à jour tout seul à l'ouverture.

> **Deux limites à connaître.** N'alimentez ce dossier **qu'avec les rapports
> par séance** : y mêler des rapports par personne compterait les mêmes
> cotations deux fois, sans erreur visible. Et l'actualisation exige **Excel
> installé** sur un ordinateur : Excel dans le navigateur ne sait pas actualiser
> ce type de source.

---

## 12. Gestes et raccourcis

| Geste | Effet |
|---|---|
| Balayage horizontal | Passer d'un écran à l'autre |
| Balayage dans la zone de cotation | Basculer Prioritaires ↔ Par personne |
| Appui long puis glissement | Réordonner les guidances, les réponses ABC, ou les objectifs en séance |
| Double-appui sur un intitulé | Agrandir la fiche de l'objectif |
| Appui sur l'icône compteur ou chronomètre | Déplier le panneau de mesure annexe |
| Appui sur une pastille Envoyé | Corriger le statut |
| Appui sur un comportement coché | Le retirer de la chaîne |

Les zones qui défilent déjà horizontalement (grilles d'essais, d'intervalles) et
les champs de saisie gardent la priorité sur le balayage.

---

## 13. Sauvegarde

**Gestion → Sauvegarde → Exporter** produit un fichier contenant tout :
personnes, objectifs, séances, crises, observations et relevés de suivi
continu. Deux formes possibles :

- **Chiffrée par mot de passe** (recommandé) — le fichier reste illisible sans
  le mot de passe, y compris s'il est transmis par erreur. Ce mot de passe est
  distinct du code de l'application.
- **Sans chiffrement** — plus simple à relire, mais le fichier est lisible par
  quiconque y a accès. À réserver à un transfert qui reste dans un espace déjà
  protégé, comme un dossier partagé restreint.

> Le mot de passe de chiffrement ne peut pas être récupéré. Conservez-le en
> lieu sûr, en dehors de l'appareil.

**Restaurer** demande ce mot de passe, puis remplace **toutes** les données de
l'appareil après confirmation.

### Exporter la configuration seule

Un second bouton produit un fichier de **configuration** : ateliers,
intervenants, guidances, réponses ABC, axes de suivi continu et modèles
d'objectifs, **sans aucune personne ni séance**. Il ne contient donc aucune
donnée d'usager et sert à équiper un nouvel appareil sans tout ressaisir.

Il se restaure avec le même bouton **Restaurer** : l'application reconnaît le
format et **complète** l'existant au lieu de le remplacer.

### Quand sauvegarder

- Après chaque période de collecte importante ;
- avant tout changement d'appareil ;
- avant une mise à jour annoncée.

C'est le **seul** filet de sécurité : il n'existe aucune sauvegarde
centralisée, et les données ne sont sur aucun serveur.

---

## 14. Mises à jour

Les mises à jour arrivent toutes seules. Quand on vous en annonce une :
**fermez complètement l'application** — depuis le sélecteur multitâche, en la
faisant glisser vers le haut, pas seulement en revenant à l'écran d'accueil —
puis rouvrez-la.

Vos données ne sont jamais affectées par une mise à jour.

---

## 15. RGPD et protection des données

Cette section explique ce que l'application fait dans le sens du règlement, et
surtout **ce qu'elle ne peut pas garantir**. Elle ne remplace pas l'avis de
votre délégué à la protection des données.

### La nature des données traitées

Il s'agit de données comportementales rattachées à un accompagnement, concernant
des **personnes vulnérables, souvent mineures**. Elles relèvent des **données de
santé** au sens de l'article 9 du RGPD : une catégorie particulière, dont le
traitement est interdit par principe et n'est possible que dans des cas
encadrés, avec des garanties renforcées.

### Ce qui va dans le sens du règlement

**Minimisation.** L'application ne demande que des **initiales**. Aucun nom,
aucune date de naissance, aucune adresse, aucun identifiant administratif.

**Aucun transfert.** Les données ne quittent jamais l'appareil : pas de serveur,
pas de compte en ligne, pas de sous-traitant hébergeur, pas d'API externe. Il
n'y a donc ni transfert hors Union européenne, ni sous-traitant à encadrer par
contrat pour les données elles-mêmes.

**Aucun traçage.** Ni publicité, ni statistiques d'usage, ni cookie de mesure,
ni outil analytique.

**Chiffrement au repos.** Les données enregistrées sont chiffrées en AES-256-GCM,
avec une clé dérivée du code par 150 000 itérations PBKDF2. La clé ne vit qu'en
mémoire et n'est jamais écrite sur l'appareil.

**Contrôle d'accès.** Code obligatoire, verrouillage automatique à la mise en
veille et après 10 minutes d'inactivité, blocage progressif après plusieurs
codes erronés.

**Limitation de conservation.** Durée paramétrable avec purge automatique.

**Droit à l'effacement.** Suppression possible à tous les niveaux : une cotation,
une séance, une crise, une personne et tous ses objectifs, ou l'intégralité des
données de l'appareil.

**Portabilité.** L'export Excel et la sauvegarde chiffrée permettent d'extraire
les données dans des formats lisibles et réutilisables.

**Traçabilité partielle.** L'intervenant est enregistré pour chaque séance,
chaque crise et chaque observation.

### Les limites — à traiter au niveau de l'établissement

**1. Les initiales ne sont pas de l'anonymisation.**
C'est une **pseudonymisation**. L'équipe reconstitue l'identité immédiatement,
donc la donnée reste une donnée personnelle de santé et **toutes les obligations
du RGPD continuent de s'appliquer**.

**2. Le chiffrement ne vaut que ce que vaut le code.**
Quatre chiffres, c'est 10 000 combinaisons ; six, un million. Face à quelqu'un
qui récupérerait le fichier et l'analyserait avec des outils, un code court
finit par céder. **Le chiffrement de l'appareil reste indispensable** : il
s'active dès qu'un code de déverrouillage est défini sur la tablette.

**3. Les rapports Excel ne sont pas chiffrés.**
Leur protection dépend **entièrement de l'endroit où ils sont déposés** : le
dossier partagé doit être restreint aux seules personnes qui en ont besoin.

**4. Aucune authentification individuelle.**
Un seul code par appareil, partagé par l'équipe. Le champ « intervenant » est
**déclaratif** : rien ne garantit que la personne désignée est bien celle qui a
saisi. Il n'existe **aucun journal d'audit**.

**5. Aucune sauvegarde centralisée.**
Un appareil perdu, volé ou réinitialisé sans sauvegarde récente, ce sont des
données définitivement perdues. Or l'article 32 impose aussi de garantir la
**disponibilité** des données.

**6. Une requête sortante subsiste.**
Les polices de caractères sont chargées depuis un service tiers. **Aucune donnée
d'usager n'y transite**, mais c'est une requête qui expose l'adresse IP de
l'appareil.

**7. L'application est servie depuis un hébergement tiers.**
Le **code** est hébergé à l'extérieur ; les **données** n'y sont jamais
envoyées. Mais l'application est téléchargée depuis ce domaine, ce qui suppose
de faire confiance à cette chaîne de publication.

**8. Les droits des personnes ne sont pas outillés.**
Répondre à une demande d'accès ou de rectification est possible, mais
manuellement, appareil par appareil.

**9. La suppression est immédiate et définitive.**
Aucune corbeille, aucune annulation.

**10. Aucune validation juridique ni audit.**
Cette application n'est ni certifiée, ni auditée, ni hébergée chez un hébergeur
de données de santé agréé. Elle a été conçue pour un usage interne et fournie
telle quelle.

### Ce qui reste à faire, et qui ne relève pas du logiciel

- Inscrire le traitement au **registre des activités de traitement**.
- Conduire une **analyse d'impact (AIPD)** : le croisement données de santé +
  personnes vulnérables + mineurs la rend très probablement obligatoire. La CNIL
  met à disposition un outil gratuit (PIA).
- Identifier la **base légale** et **informer** les personnes accompagnées et
  leurs représentants légaux.
- Imposer un **code de déverrouillage sur chaque appareil**.
- Décider et paramétrer une **durée de conservation**.
- **Restreindre le dossier partagé** aux seules personnes concernées.
- Interdire les **messageries personnelles** sur les appareils de service.
- Écrire une **procédure en cas de perte ou de vol**, incluant la notification à
  la CNIL sous 72 heures si une violation est caractérisée.

---

## 16. Dépannage

**Rien ne change après une mise à jour annoncée.**
Fermez complètement l'application depuis le sélecteur multitâche, puis
rouvrez-la.

**Écran blanc au démarrage.**
L'application attend le réseau 2,5 secondes au maximum avant d'ouvrir sa copie
locale. Si l'attente se prolonge, signalez-le à la personne qui gère
l'application.

**L'application ne s'ouvre pas sans réseau.**
Une seule ouverture en ligne suffit à la rendre utilisable ensuite sans
réseau — y compris ses polices, qui ne sont plus chargées depuis internet.
Après une mise à jour, une ouverture en ligne est de nouveau nécessaire, une
seule, avant que le hors-ligne fonctionne à nouveau. Le panneau **Données**
(menu ☰) dit si la tablette est prête : carte « Hors ligne ».

**« Code incorrect » alors que le code est bon.**
Vérifiez la longueur attendue (4 ou 6 chiffres). Si l'écran demande de valider
manuellement, saisissez votre code entier puis appuyez sur **Valider**.

**La vibration ne fonctionne pas sur iPhone.**
Safari ne prend pas en charge cette fonction. Seul le son fonctionne sur iOS ;
le bouton de vibration n'apparaît que sur les appareils compatibles.

**Le fichier Excel n'apparaît pas dans le partage.**
Selon l'appareil, le fichier est simplement téléchargé : récupérez-le dans les
téléchargements et déposez-le manuellement.

**L'écran ne reste pas allumé pendant une séance.**
Vérifiez la mention « écran maintenu » dans l'en-tête. Si elle est absente,
réglez la mise en veille de l'appareil sur « jamais ».

**Un objectif n'apparaît pas dans la vue Prioritaires.**
Il doit être étoilé, soit à sa création (prioritaire partout), soit dans la
préparation de séance (prioritaire pour cet atelier).

---

*Application fournie telle quelle, sans garantie. Chaque établissement reste
responsable de sa propre conformité réglementaire.*
