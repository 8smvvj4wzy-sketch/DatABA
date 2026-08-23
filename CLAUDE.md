# DatABA — application tablette

PWA React utilisée par des éducateurs pendant les séances d'intervention ABA,
dans un établissement médico-social. Les données sont celles de personnes
accompagnées en situation de handicap : elles ne quittent jamais la tablette
autrement que par un export explicite.

Application sœur : **DatABA Manager**, dépôt séparé, pour les cadres
pédagogiques. Les deux échangent par fichiers JSON chiffrés.

## Réponses

En français. Direct et techniquement précis. Les limites et les compromis se
disent, ils ne se lissent pas. Pas de reformulation de ce que je viens de dire.

## Architecture

Tout tient dans `src/App.jsx` (~10 300 lignes). C'est assumé : un seul fichier à
téléverser, pas d'outillage local. Ne pas proposer de le découper en modules
sans que je le demande.

- `AbaApp` : état global, persistance, navigation
- Panneaux du tiroir latéral : `PanneauEmploiDuTemps`, `PanneauPersonnes`, etc.
- Écrans d'onglets : `SuiviScreen`, `SessionScreen`, `ExportScreen`
- Widgets de cotation : un par mode

## Avant toute modification

1. **Lire la zone concernée avant d'éditer.** Des fonctions en double et des
   composants fantômes sont déjà apparus entre deux sessions sans que je les
   aie écrits. Vérifier systématiquement.
2. **Éditer, ne pas régénérer.** Le fichier est long ; les réécritures
   complètes introduisent des régressions invisibles.

## Avant toute livraison

```bash
./verifier.sh
```

Syntaxe (tsc), références inconnues, doublons de premier niveau et blocs de
rendu dupliqués, ordre des hooks React, écriture de données hors de la couche
de stockage, préfixe `aba:` sur tout accès `localStorage`, hors ligne (build
réel, précache injecté complet). Puis les suites de `tests/`. **Ne rien
livrer tant qu'un contrôle est rouge.**

Le vérificateur est un artefact vivant : quand une nouvelle classe de bug
apparaît, on lui ajoute un contrôle, et on le valide par un test négatif —
introduire la faute, confirmer la détection, restaurer.

Il tourne aussi en CI (`.github/workflows/deploy.yml`) : le job `verifier`
précède le build, et le déploiement en dépend. Un contrôle rouge n'atteint
plus les tablettes. Le lancer localement reste plus rapide que d'attendre le
runner.

## Après chaque mise en ligne

Rien à faire à la main. `CACHE_VERSION` (`public/sw.js`) est dérivée du
contenu réel des fichiers produits par `npm run build`
(`scripts/precache.mjs`, injectée par `vite.config.js`) — elle change dès
qu'un fichier change, et seulement alors. Le bump manuel qu'elle remplaçait
était l'oubli le plus coûteux du projet, et de toute façon insuffisant : voir
le piège ci-dessous.

## Pièges connus

- **Collision de stockage.** Les deux applications sont publiées sous la même
  adresse `github.io` et partagent le même `localStorage`. Un
  `localStorage.clear()` global dans Manager a déjà effacé les données de
  production de DatABA. Toute suppression est bornée à son préfixe : `aba:`
  ici, `aba-cadre:` dans Manager. Jamais de clear global. Contrôle
  « 2 nonies » de `verifier.sh`. La base IndexedDB `aba` n'appartient qu'à
  DatABA — jamais de suppression sur une autre, `aba-cadre` étant celle de
  Manager.
- **Une cotation qui s'affiche n'est pas une cotation enregistrée.** Le quota
  de `localStorage` est d'environ 5 Mo par origine, compté en UTF-16, sur du
  base64 (≈ 1,33× le JSON) — et cette origine est PARTAGÉE avec Manager, qui
  compte dans le même plafond. `setItem` lève alors `QuotaExceededError` :
  l'ancienne couche le rendait en `false`, et cinq des six effets de
  sauvegarde ignoraient ce `false`. La séance s'affichait, la journée se
  déroulait, la tablette rouvrait sans rien. D'où trois règles, les mêmes que
  côté Manager :
  1. **IndexedDB d'abord** (`ouvrirBase`, `lireIDB`, `ecrireIDB`), base `aba`,
     table `bloc`, une entrée par clé applicative. `localStorage` n'est plus
     qu'un repli et un chemin de migration : le doublon y est retiré dès la
     première écriture IndexedDB réussie — deux copies, c'est une copie
     périmée qui ressuscite le jour où la bonne disparaît.
  2. **Toute écriture est relue avant d'être annoncée réussie**, et son
     résultat remonte à l'écran (`BandeauStockage`, `CarteStockage` du panneau
     Données). Un `setItem` qui ne lève pas ne prouve rien. Côté IndexedDB, la
     réussite se lit sur `tx.oncomplete`, jamais sur `req.onsuccess` : un
     dépassement de quota laisse la requête réussir puis avorte la
     transaction.
  3. **Rien ne s'écrit hors de `store`.** Contrôle « 2 octies » de
     `verifier.sh` ; seuls `ecrireBrut` et le thème (lu par le script bloquant
     d'`index.html` avant le premier rendu, donc synchrone) y échappent.
  Les écritures sont sérialisées (`enFile`) : sans file, de deux
  enregistrements rapprochés le plus lent validait après le plus récent et
  remettait l'état précédent. Et `store.set` rend maintenant un **résultat**,
  pas un booléen — un objet est toujours vrai, tout appelant qui le teste doit
  lire `.ok`.
- **Une lecture ratée n'est pas une tablette vide.** `loadData` avalait toute
  erreur de lecture dans des `catch (e) {}`, posait un état vide, puis
  `setLoaded(true)` déclenchait les effets de sauvegarde qui écrasaient des
  données encore intactes. `store.lire` rend maintenant `{ valeur, etat }`
  avec `etat` à `'vide'` (rien de stocké), `'illisible'` (une valeur existe,
  elle n'a pas pu être lue : déchiffrement, JSON, stockage en panne) ou
  `'ok'`. `loadData` lit **tout avant d'appliquer quoi que ce soit** : sur un
  seul `'illisible'`, rien n'est posé dans l'état, `loaded` reste faux, les
  six effets de sauvegarde sont gardés par `blocIllisible`, et l'écran
  bloquant `EcranBlocIllisible` s'affiche. `tests/test_stockage.mjs` couvre
  les trois états, le quota, le repli, la migration, la suppression, la
  sérialisation et la borne de l'effacement.
- **Composants partagés plutôt qu'implémentations parallèles.** Deux blocs de
  rendu qui se ressemblent finissent par diverger — c'est arrivé sur la vue
  Renforcement de Manager.
- **Le champ `source`.** Ici il désigne l'origine d'un relevé ; dans Manager il
  désigne la tablette d'origine. Il est renommé `origine` à l'import.
- **Un chaînage et un Équilibre ne se lisent pas à leur score agrégé.**
  « 14 % » est la moyenne de quatorze étapes : le chiffre est juste et ne dit
  ni laquelle est tenue, ni laquelle bloque. `objectiveSteps` descend à
  l'étape, `EtapesObjectif` l'affiche sous la courbe. Quatre règles s'y jouent,
  **les mêmes qu'`objectifsAEtapes` côté Manager** — les deux applications
  doivent rendre le même verdict sur les mêmes cotations, sans quoi la tablette
  contredit le bilan qu'elle a produit : une étape non cotée ne produit aucun
  point (elle n'a pas été présentée, ce n'est pas un échec) ; une issue `exclu`
  sort du dénominateur mais **reste** dans la répartition affichée ; une séance
  vaut **un** point par étape même en Équilibre, où elle compte plusieurs
  essais ; une étape retirée de `config.steps` garde ses cotations passées, en
  fin de liste. L'état d'une étape passe par `masteryStatus` : pas de seconde
  définition de l'acquisition. La série d'une étape porte la **vraie date** de
  séance et non un index — un critère en jours passe par `toDayPoints`, qui
  regroupe sur `p.date`. `tests/test_etapes.mjs` couvre le tout.
  `seancesRetenues` est extraite d'`objectivePoints` pour que la courbe et le
  détail portent sur exactement les mêmes séances (reprise de suivi, cible en
  cours) ; les deux doivent continuer d'y passer. La case de la grille étape ×
  séance porte `{ cle, demande, renforce }` et non l'issue seule : les
  marqueurs d'un Équilibre ne se lisaient qu'en total, sans dire à quelle
  séance. Elle existe dès qu'il y a une issue **ou** un marqueur — un
  renforcement posé sans cotation était invisible.
- **`knownObjectiveIds` dit ce qui EXISTAIT, pas ce qui a été retenu.** C'est
  lui qui permet à `configurerAtelier` de recocher au lancement les objectifs
  créés *depuis* le réglage, et eux seuls. `setAtelierObjectifs` — l'écriture
  depuis le panneau Ateliers — n'y versait que les objectifs **cochés** : un
  objectif jamais coché n'y entrait donc jamais, passait pour un objectif tout
  neuf et se recochait à chaque lancement. Huit objectifs réglés dans l'emploi
  du temps ressortaient à cinquante sur l'écran de lancement, la sélection
  paraissant ignorée alors qu'elle était bien enregistrée (le résumé de
  l'atelier, lui, comptait juste). Les deux chemins d'écriture y versent
  maintenant **tous** les objectifs des personnes concernées, comme le faisait
  déjà « Mémoriser cette configuration », et `migrerAteliersConnus` rattrape en
  lecture les ateliers déjà réglés. `tests/test_emploi_du_temps.mjs` couvre la
  sélection tenue, la nouveauté qui doit survivre, le décochage, et la
  migration.
- **La ligne d'objectif d'un atelier est un composant partagé.**
  `LigneObjectifAtelier` sert au panneau Ateliers et à l'écran de lancement.
  Les deux la rendaient chacun de leur côté et avaient déjà divergé : le
  panneau tronquait le nom et n'écrivait pas la mention « prioritaire », si
  bien qu'on ne voyait pas, en réglant l'atelier, quels objectifs l'étaient.
  Exactement le piège annoncé deux entrées plus haut.
- **Test d'abord pour la logique de données.** Les fonctions de calcul sont
  couvertes par `tests/*.mjs` avant que la couche d'affichage existe. Les tests
  extraient les fonctions de `src/App.jsx` plutôt que d'en recopier une version
  qui divergerait.
- **Le hors-ligne ne se découvre pas à l'exécution.** `public/sw.js` ne peut
  pas deviner les noms hachés des fichiers compilés
  (`assets/index-XXXXXX.js`) : jusqu'à ce que ce piège soit corrigé, c'est
  `src/main.jsx` qui les découvrait après coup (`performance.getEntriesByType`)
  et les envoyait au service worker par `postMessage`. Deux défauts
  s'additionnaient. D'abord un ordre d'activation cassé :
  `self.skipWaiting()` était appelé avant tout précache, et `activate`
  supprimait sans condition tous les caches autres que le sien ; sur une mise
  en ligne, l'ancien service worker (encore actif le temps que la page
  réponde) écrivait la liste reçue dans SON cache, pendant que le nouveau,
  déjà activé, l'avait déjà supprimé — le cache effectivement servi ne
  contenait plus que la coquille, aucun `.js`, aucun `.css`. Ensuite un
  défaut structurel : la liste n'existant qu'à l'exécution, le hors-ligne ne
  pouvait jamais fonctionner à la première ouverture d'une version, seulement
  après une visite en ligne entière et réussie — sur tablette, l'usage
  quotidien referme vite cette fenêtre, ce qui a longtemps masqué le défaut
  sur cet appareil pendant qu'il restait bloquant sur un poste PC ouvert
  juste après une mise en ligne. La liste des fichiers à précacher et la
  version de cache sont maintenant calculées par `scripts/precache.mjs` à
  partir des fichiers réellement produits, et injectées dans `dist/sw.js`
  par `vite.config.js` — la page n'a plus rien à dicter, seulement à
  interroger (`CarteHorsLigne`, panneau Données). Tout nouveau fichier servi
  à l'exécution doit entrer dans cette liste au build, jamais dans un
  message envoyé après coup — et les polices (`src/polices/`) sont
  embarquées pour la même raison : `index.html` et `useFonts()`
  (`src/App.jsx`) chargeaient chacun, en double, la même feuille
  `fonts.googleapis.com`, jamais servable dès que le navigateur n'en avait
  pas déjà sa propre copie en cache HTTP. `tests/test_horsligne.mjs` rejoue
  la régression (ordre `skipWaiting`, purge conditionnelle à l'activation,
  réponses hors ligne) sur un faux service worker ; `verifier.sh` (section
  « 4. Hors ligne ») construit réellement le projet et vérifie que rien,
  dans `dist/`, ne dépend plus du réseau.

## Principes produit

- Pas de listes de vérification de fidélité procédurale. Embarquer les
  programmes d'intervention changerait la nature de l'application et la
  responsabilité qu'elle porte. La supervision humaine ne se remplace pas par
  des cases à cocher.
- Les outils de croisement de Manager montrent des pistes à vérifier, jamais
  des preuves de causalité. C'est une contrainte sur ce que l'outil calcule et
  sur la façon dont il le présente, pas un texte à afficher : **aucun rappel
  d'interprétation dans l'interface**. Les textes d'accompagnement expliquent
  le fonctionnement de l'outil — ce qu'une vue prend en compte, ce qu'elle
  écarte, comment un chiffre est calculé — jamais la méthode de celui qui lit.
  Ils s'adressent à des professionnels.
- Rien qui pousse un usage automatique d'une donnée sensible sans qu'un
  professionnel la relise.
