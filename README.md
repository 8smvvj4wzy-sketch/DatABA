# Cotations ABA — manuel d'utilisation

Application de recueil de données comportementales en contexte de groupe.
Elle fonctionne **sans connexion** et les données restent **sur chaque appareil** :
rien n'est envoyé vers un serveur.

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Mettre l'application en ligne](#2-mettre-lapplication-en-ligne)
3. [Installer sur les appareils](#3-installer-sur-les-appareils)
4. [Premier démarrage : le code de sécurité](#4-premier-démarrage--le-code-de-sécurité)
5. [Écran Gestion](#5-écran-gestion)
6. [Écran Personnes accompagnées](#6-écran-personnes-accompagnées)
7. [Les huit modes de cotation](#7-les-huit-modes-de-cotation)
8. [Écran Session](#8-écran-session)
9. [Le bouton Crise](#9-le-bouton-crise)
10. [Écran Suivi](#10-écran-suivi)
11. [Écran Export](#11-écran-export)
12. [Exploiter les données dans Excel](#12-exploiter-les-données-dans-excel)
13. [Gestes et raccourcis](#13-gestes-et-raccourcis)
14. [Sauvegarde et récupération](#14-sauvegarde-et-récupération)
15. [Mettre l'application à jour](#15-mettre-lapplication-à-jour)
16. [RGPD et protection des données](#16-rgpd-et-protection-des-données)
17. [Dépannage](#17-dépannage)
18. [Aller plus loin](#18-aller-plus-loin)

---

## 1. Vue d'ensemble

L'application s'organise en cinq écrans, accessibles par les onglets du haut
ou par balayage horizontal :

| Écran | À quoi il sert |
|---|---|
| **Gestion** | Personnes, ateliers, intervenants, guidances, sécurité, sauvegarde |
| **Personnes** | Définir les objectifs de chacun et leur mode de cotation |
| **Session** | Préparer et coter une séance |
| **Suivi** | Courbes de progression et critères d'acquisition |
| **Export** | Produire et transmettre les rapports Excel |

Un **bouton rouge CRISE** est présent en bas de tous les écrans.

Ordre de mise en route la première fois : Gestion → Personnes → Session.

---

## 2. Mettre l'application en ligne

### Option A — GitHub Pages (recommandée)

Le fichier `.github/workflows/deploy.yml` inclus dans ce dossier compile et
publie l'application automatiquement. **Aucun logiciel à installer, aucune
commande à taper.**

1. Sur <https://github.com>, créez un compte, puis un dépôt (**New repository**),
   par exemple `aba-groupe`. **Il doit être Public** : sur un compte gratuit,
   GitHub Pages ne fonctionne qu'ainsi. Cela rend le *code* visible, jamais les
   données — elles ne quittent pas les appareils.
2. **Add file → Upload files**, puis glissez tout le contenu de ce dossier,
   dossiers `src`, `public` et `.github` inclus. Validez (**Commit**).
3. **Settings → Pages** → sous « Build and deployment », Source : **GitHub Actions**.
4. Onglet **Actions** : la publication démarre seule (1 à 2 minutes). Une fois
   la coche verte affichée, l'adresse apparaît dans **Settings → Pages**
   (`https://votre-identifiant.github.io/aba-groupe/`).

> **Attention au glisser-déposer.** Les dossiers commençant par un point, comme
> `.github`, sont masqués par le système et ne suivent pas toujours. Vérifiez
> après l'envoi que `.github`, `src` et `public` apparaissent bien comme des
> dossiers dans le dépôt, et non comme des fichiers en vrac à la racine.

### Option B — Netlify Drop, Cloudflare Pages

Ces hébergements acceptent un dossier `dist/` déjà compilé, mais demandent de
compiler soi-même :

1. Installez **Node.js** (version 18 ou plus) depuis <https://nodejs.org>, version « LTS ».
2. Dans un terminal ouvert sur ce dossier :

   ```bash
   npm install
   npm run build
   ```

3. Déposez le dossier **`dist/`** obtenu sur <https://app.netlify.com/drop>.

Pour tester en local avant publication : `npm run dev`.

> L'accès doit se faire en **HTTPS**. Sans cela, ni le mode hors connexion ni
> l'installation sur l'écran d'accueil ne fonctionnent.

---

## 3. Installer sur les appareils

### iPhone / iPad

1. Ouvrez l'adresse dans **Safari** — obligatoire, les autres navigateurs ne
   proposent pas cette option sur iOS.
2. Bouton **Partager** (carré avec une flèche vers le haut).
3. **Sur l'écran d'accueil**, puis **Ajouter**.

### Tablettes Android

1. Ouvrez l'adresse dans **Chrome**.
2. Menu **⋮** → **Installer l'application**.

L'icône se comporte ensuite comme une application : plein écran, et
fonctionnement hors connexion après la première ouverture.

---

## 4. Premier démarrage : le code de sécurité

À la première ouverture, l'application demande de créer un code, **à 4 ou
6 chiffres**. Ce code a deux rôles :

- il verrouille l'accès à l'application ;
- il sert à **chiffrer les données enregistrées** sur l'appareil.

**6 chiffres sont fortement recommandés** : 4 chiffres ne représentent que
10 000 combinaisons, contre un million pour 6.

Ensuite :

- L'application se verrouille **à chaque mise en veille** et après
  **10 minutes sans interaction**.
- Après **3 codes erronés**, la saisie se suspend 30 secondes ; après 5, cinq
  minutes ; après 8, quinze minutes. Ce délai survit à un redémarrage.
- Le code se modifie dans **Gestion → Sécurité → Modifier le code**. Les
  données sont automatiquement rechiffrées avec le nouveau code.

> ⚠️ **Le code perdu, les données sont perdues.** Elles sont chiffrées avec lui :
> il n'existe aucun moyen de les récupérer. Le seul recours est d'effacer
> l'appareil et de restaurer une sauvegarde. Voir la section 14.

---

## 5. Écran Gestion

### Personnes accompagnées

Ajoutez-les par leurs **initiales uniquement** (ex. `J.D.`). Aucun nom, aucune
date de naissance, aucune adresse n'est demandé — c'est délibéré, voir la
section 16.

L'icône crayon renomme, la croix supprime (avec confirmation, car les objectifs
de la personne partent avec).

### Ateliers

Les groupes récurrents : « Habiletés sociales », « Repas », « Atelier cuisine »…
Un atelier peut mémoriser sa configuration habituelle (section 8).

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
compte comme réussite autonome se décide objectif par objectif (section 6).

### Sécurité

Longueur du code, modification, rappel des règles de verrouillage.

### Durée de conservation

Aucune limite (par défaut), ou 6 / 12 / 24 / 36 mois. Les séances et crises
plus anciennes sont **supprimées automatiquement à l'ouverture**, avec un
message indiquant le nombre d'éléments retirés. La date de coupure s'affiche.

> Cette suppression est **définitive**. Transmettez vos rapports avant l'échéance.

### Sauvegarde

Export et restauration, chiffrés par un mot de passe (section 14).

---

## 6. Écran Personnes accompagnées

Appuyez sur une personne pour dérouler ses objectifs.

### Créer un objectif

1. **Intitulé** — la formulation qui parle à l'équipe.
2. **Mode de cotation** — parmi les huit décrits en section 7.
3. **Réglages propres au mode** (nombre d'essais, durée, étapes…).
4. **Réponses possibles** — pour les modes à guidance : lesquelles s'affichent,
   dans quel ordre (appui long pour déplacer), et **lesquelles comptent comme
   réussite autonome** (étoile). C'est ici que se décide, pour cette personne et
   cet objectif, si « guidance partielle » vaut réussite ou non.
   Vous pouvez aussi **créer une réponse personnalisée** propre à cet objectif.
5. **Critère d'acquisition** — pourcentage libre sur un nombre libre de séances
   ou de jours consécutifs. En jours, plusieurs séances d'une même journée sont
   moyennées.
6. **Cibles successives** (facultatif) — voir ci-dessous.

### Les cibles successives

Un objectif peut être découpé en cibles : « rouge », puis « bleu », puis
« vert ». La cotation porte sur **une seule cible à la fois**. Dès qu'elle
atteint le critère d'acquisition, l'application **passe automatiquement à la
suivante** et vous le signale.

Le passage a lieu à l'**enregistrement d'une séance**, jamais en cours de
cotation.

### Actions sur un objectif

| Icône | Effet |
|---|---|
| ⭐ | Objectif prioritaire, **quel que soit l'atelier** |
| Copier | Dupliquer vers d'autres personnes (copies indépendantes) |
| Crayon | Modifier |
| Corbeille | Supprimer (avec confirmation) |

---

## 7. Les huit modes de cotation

### Essai par essai
Une réponse par essai, avec son niveau de guidance. Nombre d'essais **sans
limite** par défaut, ou nombre prévu (3, 5, 8, 10, 20 ou libre) servant de
simple repère : rien n'empêche de dépasser.

Option : **chronométrer chaque essai**. Le temps court à partir de la consigne
et se fige dès que l'essai est coté ; chaque essai conserve sa durée, affichée
sous sa case et reprise dans les rapports. Deux réglages :
- **Chronomètre** — mesure libre du délai de réponse ;
- **Temps limite** — compte à rebours, avec son et vibration à échéance.

C'est la façon de combiner une durée et une cotation : plus besoin d'un objectif
Timer séparé pour cela.

→ Score : pourcentage de réponses autonomes. La durée moyenne s'affiche à côté.

### Probe (1 / 0)
Réussi ou échoué, en un appui. Option : **coter par guidance** plutôt qu'en 1/0.
→ Score : 100 % ou 0 %.

### Par occurrence
Compteur simple, avec correction possible à la baisse.
→ Score : nombre d'occurrences.

### Timer (durée)
Deux fonctionnements :
- **Chronomètre** — mesure libre ;
- **Temps fixé** — compte à rebours, de 5 secondes à 60 minutes (minutes et
  secondes, ex. 1 min 30), avec barre de progression, son et vibration à zéro.

→ Score : durée.

> Pour associer une durée à une cotation essai par essai, utilisez plutôt
> l'option *chronométrer chaque essai* du mode **Essai par essai**.

### Niveau par intervalle
Relevé périodique du niveau de fonctionnement, **toutes les 1, 5 ou 10 minutes**.
Les niveaux sont libres : autant que vous voulez, nommés comme vous voulez.

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

« Valider l'essai » ouvre l'essai suivant, sans limite de nombre. Les essais
apparaissent en puces E1, E2, E3 ; on peut revenir corriger l'un d'eux.

→ Score : pourcentage de réussites. **Les étapes manquées sont écartées du
calcul** — une étape non présentée n'est pas un échec — mais restent
comptabilisées à part.

---

## 8. Écran Session

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

### Coter

Deux vues, séparées par un curseur au centre (ou par balayage) :

- **Prioritaires** — tous les objectifs étoilés de toutes les personnes
  présentes, sur une seule page. C'est la vue qui s'ouvre par défaut.
- **Par personne** — la fiche complète d'une personne.

Le **rail de cercles** à droite bascule d'une personne à l'autre.

**En paysage, les objectifs s'affichent sur deux colonnes** — six tiennent alors
à l'écran sans défilement — et sur trois colonnes sur les grands écrans.

**Réorganiser** : appui long sur un objectif puis glissement, pour le placer où
vous voulez. L'ordre est propre à la séance et vaut pour les deux vues.

**Agrandir** : double-appui sur l'intitulé d'un objectif, ou l'icône d'expansion,
ouvre sa fiche en plein écran — utile pour un chaînage ou un Balance Program à
nombreuses étapes. « Réduire » revient à la grille.

Pendant la séance :

| Élément | Rôle |
|---|---|
| Œil barré | Masquer un objectif pour gagner de la place |
| Expansion | Agrandir la fiche en plein écran |
| Pause | Arrêter la séance : chronomètres et intervalles se figent |
| Croix | Abandonner la séance (avec confirmation) |
| Haut-parleur / vibreur | Couper le son ou la vibration des alertes d'intervalle |
| Note d'observation | Champ libre par personne, exporté à part |
| **Enregistrer** | Clôture la séance |

L'écran reste allumé pendant la cotation (mention « écran maintenu »). Si elle
n'apparaît pas, réglez la mise en veille de l'appareil sur « jamais ».

### Séances enregistrées

En bas de l'écran de préparation : la liste des séances passées. Appuyez sur
l'une d'elles pour **corriger ses cotations**, sur l'icône de partage pour
transmettre son rapport, ou sur la corbeille pour la supprimer.

---

## 9. Le bouton Crise

Le bouton rouge, présent en bas de tous les écrans, ouvre immédiatement une
fiche avec **un chronomètre qui démarre seul**.

À renseigner :

- **Personne concernée**, **atelier**, **intervenants présents** — pré-remplis
  si une séance est en cours ;
- **A — Antécédent** : ce qui se passait juste avant ;
- **B — Comportement** : ce qui a été observé, de façon factuelle ;
- **C — Conséquence** : ce qui a suivi, réaction de l'environnement ;
- **Commentaire** : contexte, hypothèses, suites à donner.

« Terminer et enregistrer » clôt le chronomètre.

Les crises se retrouvent **en bas de l'écran Export** : appuyez sur l'une
d'elles pour la modifier, y compris la date, l'heure et la durée si le bouton a
été actionné en retard.

---

## 10. Écran Suivi

Une courbe par objectif, avec :

- le **seuil d'acquisition** en pointillé ;
- un badge **Acquis**, ou l'avancement (« 2/3 séances à 80 % ») ;
- pour les objectifs à cibles, la liste des cibles avec celles déjà acquises,
  la courbe ne portant que sur la **cible en cours**.

**Réinitialiser le suivi** (sous la courbe) fait repartir la courbe et le
critère de zéro, par exemple après un changement de protocole. Les séances
enregistrées ne sont **pas** supprimées : elles restent dans les exports, seule
la date de reprise change.

---

## 11. Écran Export

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

## 12. Exploiter les données dans Excel

Le fichier produit contient cinq feuilles :

| Feuille | Contenu |
|---|---|
| **Cotations** | Une ligne par objectif et par séance, résultat résumé |
| **Détail par essai** | Une ligne par essai, étape ou intervalle |
| **Crises** | Grille ABC complète |
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
chronométrés, timers, latences et périodes d'intervalle. Une moyenne dessus
donne le délai de réponse moyen.

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

## 13. Gestes et raccourcis

| Geste | Effet |
|---|---|
| Balayage horizontal | Passer d'un écran à l'autre |
| Balayage dans la zone de cotation | Basculer Prioritaires ↔ Par personne |
| Appui long puis glissement | Réordonner les guidances, ou les objectifs en séance |
| Double-appui sur un intitulé | Agrandir la fiche de l'objectif |
| Appui sur une mesure de latence | La supprimer |
| Appui sur une pastille Envoyé | Corriger le statut |

Les zones qui défilent déjà horizontalement (grilles d'essais, d'intervalles) et
les champs de saisie gardent la priorité sur le balayage.

---

## 14. Sauvegarde et récupération

**Gestion → Sauvegarde → Exporter** produit un fichier contenant tout :
personnes, objectifs, séances, crises. Il est **chiffré par un mot de passe**
que vous choisissez, distinct du code de l'application.

> Ce mot de passe ne peut pas être récupéré. Conservez-le en lieu sûr, en
> dehors de l'appareil.

**Restaurer** demande ce mot de passe, puis remplace **toutes** les données de
l'appareil après confirmation.

### Quand sauvegarder

- Avant chaque mise à jour de l'application ;
- après chaque période de collecte importante ;
- avant tout changement d'appareil.

C'est le **seul** filet de sécurité : il n'existe aucune sauvegarde
centralisée, et les données ne sont sur aucun serveur.

---

## 15. Mettre l'application à jour

**Avec GitHub Pages** : remplacez les fichiers concernés depuis l'interface
GitHub (**Add file → Upload files** dans le bon dossier), validez. La
publication se relance seule en 1 à 2 minutes.

**Une étape à ne pas oublier** : dans `public/sw.js`, incrémentez
`CACHE_VERSION` (`'v22'` → `'v23'`, etc.). Sans cela, les appareils continuent
d'afficher l'ancienne version.

Sur l'appareil, **fermez complètement l'application** (depuis le sélecteur
multitâche, pas seulement revenir à l'accueil) avant de la rouvrir.

---

## 16. RGPD et protection des données

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
aucune date de naissance, aucune adresse, aucun identifiant administratif. Le
strict nécessaire pour qu'un professionnel présent sache de qui il s'agit.

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

**Limitation de conservation.** Durée paramétrable avec purge automatique — la
mise en œuvre concrète du principe de conservation limitée.

**Droit à l'effacement.** Suppression possible à tous les niveaux : une cotation,
une séance, une crise, une personne et tous ses objectifs, ou l'intégralité des
données de l'appareil.

**Portabilité.** L'export Excel et la sauvegarde chiffrée permettent d'extraire
les données dans des formats lisibles et réutilisables.

**Traçabilité partielle.** L'intervenant est enregistré pour chaque séance et
chaque crise.

### Les limites — à traiter au niveau de l'établissement

**1. Les initiales ne sont pas de l'anonymisation.**
C'est une **pseudonymisation**. L'équipe reconstitue l'identité immédiatement,
donc la donnée reste une donnée personnelle de santé et **toutes les obligations
du RGPD continuent de s'appliquer**. La pseudonymisation est une bonne mesure de
minimisation, pas une dispense.

**2. Le chiffrement ne vaut que ce que vaut le code.**
Quatre chiffres, c'est 10 000 combinaisons ; six, un million. Face à quelqu'un
qui récupérerait le fichier et l'analyserait avec des outils, un code court
finit par céder. **Le chiffrement de l'appareil reste indispensable** : il
s'active dès qu'un code de déverrouillage est défini sur la tablette, et c'est
lui qui protège réellement les données au repos.

**3. Les rapports Excel ne sont pas chiffrés.**
La bibliothèque utilisée ne sait pas produire de fichier protégé par mot de
passe. Leur protection dépend **entièrement de l'endroit où ils sont déposés** :
le dossier SharePoint doit être restreint aux seules personnes qui en ont besoin.

**4. Aucune authentification individuelle.**
Un seul code par appareil, partagé par l'équipe. Le champ « intervenant » est
**déclaratif** : rien ne garantit que la personne désignée est bien celle qui a
saisi. Il n'existe **aucun journal d'audit** permettant de reconstituer qui a
fait quoi et quand.

**5. Aucune sauvegarde centralisée.**
Un appareil perdu, volé ou réinitialisé sans sauvegarde récente, ce sont des
données définitivement perdues. Or l'article 32 impose aussi de garantir la
**disponibilité** des données. La discipline de sauvegarde n'est pas une option
de confort : c'est une obligation à organiser.

**6. Une requête sortante subsiste.**
Les polices de caractères sont chargées depuis Google Fonts. **Aucune donnée
d'usager n'y transite**, mais c'est une requête vers un tiers, qui expose
l'adresse IP de l'appareil. Certains délégués demandent l'auto-hébergement des
polices ; c'est réalisable.

**7. L'application est servie depuis GitHub Pages.**
Le **code** est hébergé sur une infrastructure Microsoft, aux États-Unis, dans un
dépôt public. Les **données** n'y sont jamais envoyées. Mais l'application est
téléchargée depuis ce domaine, ce qui suppose de faire confiance à cette chaîne
de publication — d'où l'intérêt de protéger le dépôt et d'exiger une relecture
avant toute mise en ligne.

**8. Les droits des personnes ne sont pas outillés.**
Répondre à une demande d'accès ou de rectification est possible, mais
manuellement, appareil par appareil. Il n'existe pas de fonction dédiée.

**9. La suppression est immédiate et définitive.**
Aucune corbeille, aucune annulation. C'est cohérent avec le droit à l'effacement,
mais impose de la prudence.

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
- **Restreindre le dossier SharePoint** aux seules personnes concernées.
- Interdire les **messageries personnelles** sur les appareils de service.
- Écrire une **procédure en cas de perte ou de vol** d'un appareil, incluant la
  notification à la CNIL sous 72 heures si une violation est caractérisée.

---

## 17. Dépannage

**Rien ne change après une mise à jour.**
Vérifiez que `CACHE_VERSION` a bien été incrémenté dans `public/sw.js`, que
l'onglet Actions affiche une coche verte récente, puis **fermez complètement**
l'application avant de la rouvrir.

**Écran blanc au démarrage.**
L'application attend le réseau 2,5 secondes au maximum avant d'ouvrir sa copie
locale. Si l'attente se prolonge, c'est plutôt un problème de compilation :
consultez l'onglet Actions.

**« Code incorrect » alors que le code est bon.**
Vérifiez la longueur attendue (4 ou 6 chiffres). Si l'écran demande de valider
manuellement, l'application ne connaît pas encore la longueur : saisissez votre
code entier puis appuyez sur **Valider**.

**La vibration ne fonctionne pas sur iPhone.**
Safari ne prend pas en charge cette fonction. Seul le son fonctionne sur iOS ;
le bouton de vibration n'apparaît que sur les appareils compatibles.

**Le fichier Excel n'apparaît pas dans le partage.**
Selon l'appareil, le fichier est simplement téléchargé : récupérez-le dans les
téléchargements et déposez-le manuellement.

**L'écran ne reste pas allumé pendant une séance.**
Vérifiez la mention « écran maintenu » dans l'en-tête. Si elle est absente,
réglez la mise en veille de l'appareil sur « jamais ».

---

## 18. Aller plus loin

### Application installable via un store

À partir de ce même projet, avec **Capacitor** :

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Cotations ABA" fr.etablissement.aba --web-dir=dist
npx cap add android
npm run build && npx cap sync
npx cap open android
```

La dernière commande ouvre **Android Studio** (gratuit), d'où se génère le
`.apk`. Pour iOS, la même démarche existe avec `@capacitor/ios`, mais exige un
Mac, Xcode et un compte développeur Apple (99 $/an, avec exonération possible
pour les établissements d'enseignement et organismes à but non lucratif
éligibles).

Alternative sans ligne de commande : <https://www.pwabuilder.com>.

### Protéger le dépôt GitHub

- **Ruleset sur `main`** : interdire la suppression et le force-push, exiger une
  pull request. Cochez « Do not allow bypassing ».
- **Environnement `github-pages` avec relecteur obligatoire** : rien ne part en
  ligne sans un second accord.
- **Épingler les actions à un identifiant de commit** plutôt qu'à `@v4`.
- **Workflow permissions en lecture seule** : Settings → Actions → General.
- **Authentification à deux facteurs** et, à terme, transfert du dépôt vers une
  **organisation** avec un second propriétaire, pour que le projet ne dépende
  pas d'un compte personnel.

---

*Application fournie telle quelle, sans garantie. Chaque établissement reste
responsable de sa propre conformité réglementaire.*
