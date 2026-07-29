# Cotations ABA — manuel d'utilisation

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
6. [Les huit modes de cotation](#6-les-huit-modes-de-cotation)
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
| **Suivi** | Courbes de progression et analyse des crises |
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
Un atelier peut mémoriser sa configuration habituelle (section 7).

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

### Modèles d'objectifs

Objectifs types réutilisables, avec leur mode de cotation, leurs cibles et leur
critère. On les enregistre depuis l'écran Personnes (icône signet), et on les
applique à la création d'un objectif.

### Sécurité

Longueur du code, modification, rappel des règles de verrouillage.

### Durée de conservation

Aucune limite (par défaut), ou 6 / 12 / 24 / 36 mois. Les séances, crises et
observations plus anciennes sont **supprimées automatiquement à l'ouverture**,
avec un message indiquant le nombre d'éléments retirés. La date de coupure
s'affiche.

> Cette suppression est **définitive**. Transmettez vos rapports avant l'échéance.

### Sauvegarde

Export et restauration (section 13).

---

## 5. Écran Personnes accompagnées

Appuyez sur une personne pour dérouler ses objectifs.

### Créer un objectif

1. **Intitulé** — la formulation qui parle à l'équipe.
2. **Phase** — Ligne de base, Intervention, Maintien ou Généralisation. Sans ce
   repère, une courbe ne dit pas ce qui a produit un changement.
3. **Mode de cotation** — parmi les huit décrits en section 6.
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

### Les cibles successives

Un objectif peut être découpé en cibles : « rouge », puis « bleu », puis
« vert ». La cotation porte sur **une seule cible à la fois**. Dès qu'elle
atteint le critère d'acquisition, l'application **passe automatiquement à la
suivante** et vous le signale.

Le passage a lieu à l'**enregistrement d'une séance**, jamais en cours de
cotation.

### Changer de phase

Le bouton portant le nom de la phase, sous l'intitulé, la fait passer à la
suivante après confirmation. Le changement est **daté** et trace un **repère
vertical sur la courbe de suivi** : on voit alors précisément à partir de
quelle séance l'intervention a commencé.

### Actions sur un objectif

| Icône | Effet |
|---|---|
| ⭐ | Objectif prioritaire, **quel que soit l'atelier** |
| Signet | Enregistrer comme modèle réutilisable |
| Copier | Dupliquer vers d'autres personnes (copies indépendantes) |
| Crayon | Modifier |
| Corbeille | Supprimer (avec confirmation) |

---

## 6. Les huit modes de cotation

### Essai par essai
Une réponse par essai, avec son niveau de guidance. Nombre d'essais **sans
limite** par défaut, ou nombre prévu (3, 5, 8, 10, 20 ou libre) servant de
simple repère : rien n'empêche de dépasser.

Option : **chronométrer chaque essai**. Le temps court à partir de la consigne
et se fige dès que l'essai est coté ; chaque essai conserve sa durée, affichée
sous sa case et reprise dans les rapports. Au choix chronomètre libre, ou temps
limite avec son et vibration à échéance.

→ Score : pourcentage de réponses autonomes. La durée moyenne s'affiche à côté.

### Probe (1 / 0)
Réussi ou échoué, en un appui. Option : **coter par guidance** plutôt qu'en 1/0.
→ Score : 100 % ou 0 %.

### Par occurrence
Compteur simple, avec correction possible à la baisse.
→ Score : nombre d'occurrences.

### Timer (durée)
**Chronomètre** (mesure libre) ou **temps fixé** (compte à rebours de 5 secondes
à 60 minutes, minutes et secondes, ex. 1 min 30), avec barre de progression, son
et vibration à zéro.
→ Score : durée.

> Pour associer une durée à une cotation, utilisez plutôt l'option
> *chronométrer chaque essai* du mode **Essai par essai**.

### Niveau par intervalle
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

### Latence
Un bouton : **Consigne donnée** lance le chrono, **Réponse** l'arrête. Plusieurs
mesures par séance ; appuyez sur une mesure pour la retirer si elle est fausse.
→ Score : latence moyenne en secondes.

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

---

## 7. Écran Session

### Préparer

1. **Type de séance** : *Atelier* ou *Balance Program*. En mode Balance Program,
   seuls les objectifs de ce type sont proposés, chaque personne cotant le sien.
2. **Atelier** — facultatif. Un second appui le retire ; la séance est alors
   dite « libre ».
3. **Intervenant** qui cote.
4. **Personnes présentes**.
5. **Objectifs** de chacune. L'étoile à droite d'un objectif le rend
   **prioritaire pour cet atelier seulement** : la même personne peut avoir des
   priorités différentes selon le groupe.
6. **Mémoriser cette configuration** — enregistre pour cet atelier : les
   personnes, leurs objectifs, et les prioritaires. Au prochain choix de cet
   atelier, tout se recoche automatiquement.

En haut de l'écran, **Relancer la dernière séance** reprend telle quelle la
configuration de la précédente — mode, atelier, personnes, objectifs — sans
qu'elle ait besoin d'avoir été mémorisée au préalable. Une personne ou un
objectif supprimé depuis est simplement écarté.

> **Les objectifs créés ensuite sont ajoutés d'office** au rappel de la
> configuration, avec un message le signalant. En revanche, un objectif que vous
> aviez volontairement décoché reste décoché.

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

### Renforcement

Au-dessus de la zone de cotation, une pastille par personne présente. Un appui
la met **en renforcement** : ses fiches se grisent dans les deux vues, ses
cotations sont suspendues et ses chronomètres se figent. Un second appui reprend
la cotation.

Si un comportement mérite d'être coté malgré le renforcement, un bandeau sur la
fiche permet de le débloquer après confirmation. L'autorisation ne vaut que pour
cette fiche, et retombe dès la fin du renforcement.

Le temps cumulé s'affiche sur la pastille. Le rapport Excel indique, pour chaque
personne et chaque séance, le **temps de renforcement** et le **temps
d'activité** correspondant.

L'écran reste allumé pendant la cotation (mention « écran maintenu »). Si elle
n'apparaît pas, réglez la mise en veille de l'appareil sur « jamais ».

### Séances enregistrées

En bas de l'écran de préparation : la liste des séances passées. Appuyez sur
l'une d'elles pour **corriger ses cotations**, sur l'icône de partage pour
transmettre son rapport, ou sur la corbeille pour la supprimer.

Un bouton en fin de liste permet de **supprimer toutes les séances** d'un coup,
après deux confirmations. Les courbes de suivi repartent alors de zéro :
exportez vos rapports et une sauvegarde avant.

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

Crises et observations se retrouvent **en bas de l'écran Export**, avec une
pastille indiquant leur type. Appuyez sur l'une d'elles pour la modifier, y
compris la date, l'heure et la durée si le bouton a été actionné en retard.

---

## 9. Écran Suivi

Quatre vues, au choix : **Objectifs**, **Bilan**, **Crises** ou **Croisement**.

### Objectifs

Une courbe par objectif, avec :

- le **seuil d'acquisition** en pointillé ;
- un badge **Acquis**, ou l'avancement (« 2/3 séances à 80 % ») ;
- pour les objectifs à cibles, la liste des cibles avec celles déjà acquises,
  la courbe ne portant que sur la **cible en cours** ;
- des **repères verticaux datés** à chaque changement de phase, avec son nom.

**Réinitialiser le suivi** (sous la courbe) fait repartir la courbe et le
critère de zéro, par exemple après un changement de protocole. Les séances
enregistrées ne sont **pas** supprimées : elles restent dans les exports, seule
la date de reprise change.

### Bilan

Une vue d'ensemble de tout l'effectif, là où les autres écrans montrent une
personne à la fois. Trois groupes :

- **Bientôt acquis** — une séance de plus au seuil suffit. C'est le moment de
  préparer la cible suivante ou une généralisation.
- **En plateau** — au moins six séances, une moyenne récente à moins de vingt
  points du seuil, sans jamais l'atteindre durablement. Un critère peut-être
  trop haut, ou un objectif à retravailler.
- **Sans cotation récente** — aucune donnée depuis plus de trois semaines alors
  que l'objectif est toujours actif.

> Ce bilan applique le critère défini pour chaque objectif. Il signale des
> situations à regarder, il ne décide de rien à votre place.

### Crises

Une analyse d'ensemble, filtrable par type (crises, observations, ou les deux)
et par personne :

- un **nuage de points temporel** — le jour en abscisse, l'heure en ordonnée,
  une couleur par fonction supposée. C'est la représentation qui fait
  apparaître les motifs : les crises de fin de matinée, celles d'un jour
  précis, celles qui suivent un même moment de la journée ;
- le **délai depuis le dernier enregistrement** pour chaque personne, avec le
  total et la date — un indicateur simple et parlant en réunion d'équipe ;
- le **premier comportement de l'enchaînement**, qui indique par quoi
  l'escalade démarre le plus souvent ;
- le **classement des antécédents**, des **comportements observés**, des
  **fonctions supposées** et des **conséquences**, en nombre et en pourcentage ;
- la **répartition par atelier** et **par jour de la semaine** ;
- le nombre d'enregistrements et leur durée moyenne.

> Ces répartitions décrivent ce qui a été observé et coché. Elles orientent une
> hypothèse, elles ne l'établissent pas : une analyse fonctionnelle reste du
> ressort du professionnel.

### Croisement

Un graphique hebdomadaire superposant le **taux d'autonomie moyen** (courbe) et
le **nombre de crises et observations** (barres), filtrable par personne. Il
répond à une question clinique directe : les progrès s'accompagnent-ils d'une
baisse des comportements-défis ?

> Une évolution parallèle des deux courbes n'établit aucun lien de cause à
> effet : d'autres facteurs — changement d'équipe, période de l'année, santé —
> pèsent aussi. Le graphique sert à repérer un moment à examiner, pas à conclure.

---

## 10. Écran Export

Deux façons de composer un rapport :

- **Par séance** — vous cochez des séances. Trois boutons rapides :
  *Non-envoyés*, *Tout sélectionner*, *Aucun*.
- **Par personne** — vous cochez des personnes, et le rapport reprend toutes
  leurs cotations sur toutes les séances. Sur une séance partagée, seules leurs
  lignes sont retenues.

Chaque séance porte une pastille **Envoyé** ou **Non envoyé**, mise à jour
automatiquement dès qu'un rapport est produit. Un appui dessus corrige le statut
à la main. Si la sélection contient une séance déjà envoyée, une confirmation
le signale.

Deux actions :

- **Télécharger** — enregistre le fichier Excel sur l'appareil ;
- **Partager** — ouvre le partage du système, qui permet notamment
  **« Enregistrer dans Fichiers »** vers un dossier OneDrive / SharePoint
  synchronisé.

> En mode *Par personne*, les séances ne sont pas marquées comme envoyées : ce
> rapport recoupe des séances déjà transmises, et le marquer fausserait le suivi
> des non-envoyés.

---

## 11. Exploiter les données dans Excel

Le fichier produit contient cinq feuilles :

| Feuille | Contenu |
|---|---|
| **Cotations** | Une ligne par objectif et par séance, résultat résumé |
| **Détail par essai** | Une ligne par essai, étape ou intervalle |
| **Crises et observations** | Grille ABC complète, avec le type |
| **Notes** | Observations qualitatives |
| **Tableau de bord** | Une ligne par personne/objectif, une colonne par date |

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

Une colonne **Durée (s)** accompagne les cotations chronométrées : essais
chronométrés, timers, latences et périodes d'intervalle.

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
| Appui sur une mesure de latence | La supprimer |
| Appui sur une pastille Envoyé | Corriger le statut |
| Appui sur un comportement coché | Le retirer de la chaîne |

Les zones qui défilent déjà horizontalement (grilles d'essais, d'intervalles) et
les champs de saisie gardent la priorité sur le balayage.

---

## 13. Sauvegarde

**Gestion → Sauvegarde → Exporter** produit un fichier contenant tout :
personnes, objectifs, séances, crises et observations. Il est **chiffré par un
mot de passe** que vous choisissez, distinct du code de l'application.

> Ce mot de passe ne peut pas être récupéré. Conservez-le en lieu sûr, en
> dehors de l'appareil.

**Restaurer** demande ce mot de passe, puis remplace **toutes** les données de
l'appareil après confirmation.

### Exporter la configuration seule

Un second bouton produit un fichier de **configuration** : ateliers,
intervenants, guidances, réponses ABC et modèles d'objectifs, **sans aucune
personne ni séance**. Il ne contient donc aucune donnée d'usager et sert à
équiper un nouvel appareil sans tout ressaisir.

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
