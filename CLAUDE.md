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

Tout tient dans `src/App.jsx` (~7 800 lignes). C'est assumé : un seul fichier à
téléverser, pas d'outillage local. Ne pas proposer de le découper en modules
sans que je le demande.

- `AbaApp` : état global, persistance, navigation
- Panneaux du tiroir latéral : `PanneauAteliers`, `PanneauPersonnes`, etc.
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

Quatre contrôles : syntaxe (tsc), références inconnues, doublons de premier
niveau et blocs de rendu dupliqués, ordre des hooks React. Puis les suites de
`tests/`. **Ne rien livrer tant qu'un contrôle est rouge.**

Le vérificateur est un artefact vivant : quand une nouvelle classe de bug
apparaît, on lui ajoute un contrôle, et on le valide par un test négatif —
introduire la faute, confirmer la détection, restaurer.

## Après chaque mise en ligne

**Incrémenter `CACHE_VERSION` dans `public/sw.js`.** Sans ça, les tablettes
continuent de servir la version en cache. C'est l'oubli le plus coûteux du
projet.

## Pièges connus

- **Collision de stockage.** Les deux applications sont publiées sous la même
  adresse `github.io` et partagent le même `localStorage`. Un
  `localStorage.clear()` global dans Manager a déjà effacé les données de
  production de DatABA. Toute suppression est bornée à son préfixe : `aba:`
  ici, `aba-cadre:` dans Manager. Jamais de clear global.
- **Composants partagés plutôt qu'implémentations parallèles.** Deux blocs de
  rendu qui se ressemblent finissent par diverger — c'est arrivé sur la vue
  Renforcement de Manager.
- **Le champ `source`.** Ici il désigne l'origine d'un relevé ; dans Manager il
  désigne la tablette d'origine. Il est renommé `origine` à l'import.
- **Test d'abord pour la logique de données.** Les fonctions de calcul sont
  couvertes par `tests/*.mjs` avant que la couche d'affichage existe. Les tests
  extraient les fonctions de `src/App.jsx` plutôt que d'en recopier une version
  qui divergerait.

## Principes produit

- Pas de listes de vérification de fidélité procédurale. Embarquer les
  programmes d'intervention changerait la nature de l'application et la
  responsabilité qu'elle porte. La supervision humaine ne se remplace pas par
  des cases à cocher.
- Les outils de croisement de Manager montrent des pistes à vérifier, jamais
  des preuves de causalité. Le texte d'accompagnement doit le dire.
- Rien qui pousse un usage automatique d'une donnée sensible sans qu'un
  professionnel la relise.
