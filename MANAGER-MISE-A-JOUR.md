# Mise à jour de DatABA Manager — dossier de passation

Document destiné à **une autre conversation**, travaillant dans le dépôt
`8smvvj4wzy-sketch/DatABA-Manager`. Il rassemble ce qu'il faut savoir pour
rattraper le retard accumulé côté Manager sans avoir à relire DatABA.

Écrit depuis DatABA à `ae99800` (10/08/2026), Manager lu à `602e110`
(03/08/2026).

Deux chantiers distincts, à ne pas mélanger dans les mêmes commits :

1. **Rattrapage fonctionnel** — Manager ne comprend pas tout ce que DatABA
   exporte aujourd'hui, et calcule certains verdicts d'acquisition autrement.
2. **Refonte visuelle et poste de travail** — Manager porte encore l'ancienne
   identité beige de DatABA, dans une mise en page pensée pour la tablette.
   Cible : la grammaire « Terminal de Terrain » de DatABA, déclinée pour un
   écran de PC.

Le chantier 1 est prioritaire : un écran refait qui affiche un mauvais
« Acquis » est pire que l'écran actuel.

---

## 1. État des lieux

| | DatABA | DatABA Manager |
|---|---|---|
| Rôle | Cotation en séance, tablette, hors ligne | Consolidation et bilans, PC des cadres |
| `src/App.jsx` | 12 868 lignes | 4 351 lignes |
| Préfixe `localStorage` | `aba:` | `aba-cadre:` |
| Stockage | plusieurs clés, index de séances par mois | une clé `aba-cadre:data`, chiffrée |
| `CACHE_VERSION` (`public/sw.js`) | `v85` | `v17` |
| Suites de tests | 8 (`tests/*.mjs`) | 11 (`tests/*.mjs`) |
| Identité visuelle | tokens CSS `[data-theme]`, clair + sombre | constantes JS en dur, beige, thème unique |
| `DESIGN.md` / `PRODUCT.md` | présents | absents |

Le `CLAUDE.md` de DatABA annonce encore « ~10 300 lignes » : chiffre périmé,
le fichier en fait 12 868. Même remarque probable pour Manager après le
chantier — penser à corriger les deux.

### Ce qui a bougé côté DatABA depuis le dernier alignement

Commits utiles (les commits « Update App.jsx » du 07/08 sont des téléversements
opaques, sans message exploitable) :

- `a5c5847` — **Renomme Groupe en Classe**, et fond l'outil de groupes dans
  l'écran Personnes accompagnées.
- `b6ae00f` — Navigation : le retour respecte la provenance.
- `5b878a3` — Session : densité au pincement, colonnes explicites, en-tête fixe.
- `bdde229` — **Réintroduit le mode Probe** : cotation 1/0, fréquence
  quotidienne, blocage après cotation du jour.
- `61fc18c` — Export : filtrage par mois.
- `5e6720e` — Suivi : fenêtre « Prévus non cotés aujourd'hui ».
- `ae99800` — logo `public/logo-databa.png` en pleine largeur du tiroir.

Avant cela, non daté précisément dans l'historique : la refonte visuelle
complète (palette « Terminal de Terrain », thème sombre, tokens CSS) et le
**suivi continu multi-axes** qui remplace le suivi de stabilité.

---

## 2. Le contrat d'échange

### 2.1 Enveloppe chiffrée

Identique des deux côtés, **ne rien y toucher** :

```js
{ format: 'aba-backup-encrypted', version: 1, salt: <b64 16o>, iv: <b64 12o>, data: <b64> }
```

PBKDF2-SHA256, 150 000 itérations, AES-GCM 256. Manager a déjà `deriveAesKey` /
`decryptEnvelope` / `encryptJSON` alignés (`src/App.jsx` ~L80-95 côté Manager,
~L350-365 côté DatABA). Rien à changer.

### 2.2 Le fichier « pour Manager »

Produit par `payloadManager()` (DatABA `src/App.jsx:5042`), nommé
`pour-manager-<appareil>-<date>.json`, chiffré ou en clair au choix de
l'éducateur.

```js
{
  format: 'aba-backup',
  version: 4,
  exportedAt: <ISO>,
  appareil: <string>,          // nom de la tablette d'origine

  students: [...],             // uniquement les personnes concernées par la sélection
                               // chaque personne porte classeId ET groupeId (alias)
  ateliers, emploiDuTemps, intervenants,
  classes: [...],              // NOUVEAU en v4
  groupes: [...],              // alias de compatibilité, même contenu que classes
  guidances,
  axesSuivi: [...],            // NOUVEAU — axes du suivi continu
  sessions: [...],             // séances retenues
  crises: [...],
  suivi: [...],                // NOUVEAU — relevés de suivi continu, format actuel
  stabilite: [...],            // alias v3, projection appauvrie de `suivi`
}
```

Les mêmes clés servent à la sauvegarde complète (`exportBackupClair`,
`confirmExport` — DatABA `src/App.jsx:5166` et `:5198`), qui ajoute
`classeAppareil` et n'applique aucun filtre.

Deux autres formats existent côté DatABA mais **ne concernent pas Manager** :
`aba-suivi-transfert` (échange tablette↔tablette de cotations hors classe) et
le payload de profils (`payloadProfils`, `src/App.jsx:2119`). Manager doit les
refuser proprement, pas les ingérer.

### 2.3 Les deux alias de compatibilité, et leur date de péremption

DatABA les émet **exprès** pour qu'un Manager pas encore mis à jour continue de
fonctionner. Une fois Manager à jour, ils deviennent du poids mort — mais ils
ne peuvent pas être retirés côté DatABA tant que des postes tournent sur
l'ancienne version.

| Alias | Source réelle | Fonction |
|---|---|---|
| `groupes` + `st.groupeId` | `classes` + `st.classeId` | renommage Groupe → Classe |
| `stabilite` | `suivi` | `releverAliasStabilite()`, DatABA `src/App.jsx:2008` |

`releverAliasStabilite` ne retient **que** les relevés de l'axe `principal`,
non clôturés, dont le critère fait partie des quatre clés historiques, et les
reprojette au format v3 (`{ id, studentId, timestamp, etat, source }`). Le
second axe, les critères personnalisés et les clôtures sont invisibles dans cet
alias. C'est exactement ce que Manager perd aujourd'hui.

**Règle pour le chantier** : Manager lit `suivi` s'il existe, retombe sur
`stabilite` sinon. Jamais les deux — un fichier v4 contient les mêmes relevés
dans les deux clés, les additionner les dupliquerait. Même logique pour
`classes` / `groupes`.

---

## 3. Chantier 1 — rattrapage fonctionnel

Par ordre de gravité décroissante.

### 3.1 Le critère d'acquisition est calculé faux pour deux cas

**C'est le point le plus important du dossier.** Manager `critereDe()`
(`src/App.jsx:295`) lit :

```js
const m = obj.config && obj.config.mastery;
return m ? { threshold: m.threshold || 80, needed: m.sessions || 3 } : null;
```

Il ignore deux champs que DatABA écrit dans `config.mastery` :

- **`unit`** : `'sessions'` (défaut) ou **`'days'`**. Le mode Probe se valide
  par jours consécutifs, pas par séances — plusieurs probes le même jour ne
  comptent que pour un point. Défaut Probe : `{ threshold: 100, sessions: 3,
  unit: 'days', sens: 'min' }` (DatABA `src/App.jsx:326`).
- **`sens`** : `'min'` (défaut) ou **`'max'`**. Un comportement problème coté à
  l'occurrence est acquis quand il passe **sous** le seuil. Manager ne teste
  que `>= threshold` (`src/App.jsx:351`) : il classera « Non acquis » un
  objectif atteint, et l'écart affiché (`src/App.jsx:363`) est calculé dans le
  mauvais sens.

La référence à porter est `masteryState` côté DatABA, `src/App.jsx:2649-2651` :

```js
const sens  = m.sens === 'max' ? 'max' : 'min';
const series = unit === 'days' ? toDayPoints(points) : points;
const tient = (v) => (sens === 'max' ? v <= m.threshold : v >= m.threshold);
```

`toDayPoints` est à `src/App.jsx:2625`. **Extraire ces fonctions dans un test
Manager avant de toucher à l'affichage** — c'est la règle « test d'abord pour
la logique de données », et ici deux applications doivent produire le même
verdict sur les mêmes données.

À vérifier aussi : la détection de plateau (`PLATEAU_ECART_MAX`) et l'état
`bientot` supposent implicitement un sens `min`.

### 3.2 Les classes n'existent pas dans Manager

`grep classeId src/App.jsx` côté Manager : aucun résultat. `VIDE`
(`src/App.jsx:134`) n'a ni `classes` ni `_classes` par source.

À faire :

- Ajouter `classes` à `VIDE` et à `normaliser()`.
- Dans `fusionnerImport()` (`src/App.jsx:187`), lire `backup.classes ||
  backup.groupes`, et conserver `classeId` (`s.classeId || s.groupeId`) sur la
  personne consolidée. Attention : Manager déduplique les personnes **par
  initiales** — deux J.D. de classes différentes fusionnent aujourd'hui en une
  seule. C'est précisément ce que la classe permet de désambiguïser ; c'est le
  moment de traiter le cas, ou au minimum de le signaler à l'écran.
- Exposer un filtre par classe partout où existe déjà le filtre par source.
- Renommer le vocabulaire d'interface Groupe → Classe, en gardant les données
  anciennes lisibles.

### 3.3 Le suivi continu multi-axes est tronqué

Manager ne connaît que `stabilite` et l'ancien champ `etat`. Le modèle actuel
côté DatABA :

- `axesSuivi: [{ id, nom, criteres: [{ k, l, color }] }]`, l'axe historique
  ayant l'id `principal` (`DEFAULT_SUIVIS`, DatABA `src/App.jsx:1717`). Le
  nombre d'axes n'est pas borné.
- Un relevé porte `{ id, studentId, timestamp, suiviId, critere, fin?, source,
  intervenantId, sessionId, atelierId, appareilOrigine }`.
  `critere` remplace `etat` ; `fin` marque une clôture ; les quatre champs de
  traçabilité peuvent être absents sur les relevés anciens et **ne doivent pas
  être devinés** (`TRACABILITE_RELEVE_PAR_DEFAUT`, DatABA `src/App.jsx:2017`).
- Un critère retiré de la configuration ne ressuscite pas : repli
  `CRITERE_INCONNU` (`src/App.jsx:1729`), même principe que `TYPE_INCONNU` pour
  les modes.

À faire côté Manager : stocker `axesSuivi` par source, lire `suivi` en
priorité, garder `stabilite` en repli pour les fichiers v3, et prévoir
l'affichage par axe. `intervenantId` / `atelierId` sur les relevés ouvrent un
croisement qui n'était pas possible avant — à traiter comme une piste, avec le
texte d'accompagnement qui va avec (voir §6).

### 3.4 Mode Probe : partiellement géré

`objectiveScoreValue` gère déjà `probe` (Manager `src/App.jsx:262`) et
`LIBELLES` connaît l'étiquette. Ce qui manque :

- Le critère par jour (§3.1).
- L'option `config.useGuidance` : pour Probe, la guidance est facultative
  (`USES_GUIDANCE`, DatABA `src/App.jsx:318`), la cotation 1/0 reste la voie par
  défaut. Le score gère les deux cas, l'affichage devrait le dire.
- Les créneaux : `PROBE_FREQUENCES = [1, 2]`, `PROBE_CRENEAUX = { matin,
  aprem }`, matin = avant 13 h **en heure locale**. Un probe manqué sur un
  créneau prévu est une information de suivi, pas un trou dans les données.

### 3.5 Points mineurs

- `LIBELLES` (Manager `src/App.jsx:473`) contient `timer` et `latency`, qui
  ne figurent plus dans les `TYPES` de DatABA (`src/App.jsx:180` : `trials`,
  `occurrence`, `interval`, `chaining`, `balance`, `probe`). Ils restent utiles
  pour les données anciennes — vérifier qu'ils sont bien traités comme des
  modes retirés, pas comme des modes proposables.
- Le filtrage par mois de l'export DatABA (`61fc18c`) change ce qui arrive dans
  un fichier : Manager peut recevoir des tranches mensuelles disjointes de la
  même tablette. La déduplication par `id` de séance couvre déjà le cas, mais
  le décompte « nouvelles séances » affiché à l'import mérite une relecture.
- Le message d'erreur d'import (Manager `src/App.jsx:3544`) cite le chemin
  d'export DatABA : vérifier qu'il correspond encore aux libellés actuels.

---

## 4. Chantier 2 — l'identité visuelle

La référence complète est `DESIGN.md` à la racine de DatABA. **Le copier dans
le dépôt Manager** et l'y adapter plutôt que de le réinventer : c'est le
document qui fait foi pour les deux applications.

### 4.1 Ce que Manager porte aujourd'hui, et qui saute

```js
const PAPER = '#FAF7F0';   const CARD  = '#FFFFFF';
const INK   = '#1A345C';   const INK_SOFT = '#6B7280';
const BORDER = '#E3DDD0';
const ACQUIS = '#0F8B6C';  const EN_COURS = '#D69A2D';  const NON_ACQUIS = '#A8402F';
```

Beige et terres : l'ancienne palette de DatABA, abandonnée. Le
`<meta name="theme-color" content="#20291F">` de `index.html` est un olive qui
ne correspond même plus à cette palette-là. Manager n'a **pas** de
`src/index.css` avec tokens : tout est en constantes JS.

### 4.2 La cible

Tokens CSS sur `<html>[data-theme]`, exactement comme DatABA
(`src/index.css`) :

```css
:root {
  --paper: #F3F6FB;  --card: #FFFFFF;  --border: #D7E0EE;
  --ink: #0E1B33;    --ink-soft: #52627A;
  --accent: #4A4A4A; --accent-ink: #FFFFFF;
  --nav-bg: #E4E9F5; --crisis: #D7263D;
  --accent-wash: rgba(74, 74, 74, 0.08);
  --overlay-backdrop: rgba(0, 0, 0, 0.5);
  --color-abc: #4A4A4A;
}
:root[data-theme='dark'] {
  --paper: #0A1120;  --card: #121A2E;  --border: #24304A;
  --ink: #E7ECF7;    --ink-soft: #93A2C0;
  --accent: #5B8CFF; --accent-ink: #071021;
  --nav-bg: #0F1830; --crisis: #FF5470;
  --accent-wash: rgba(91, 140, 255, 0.14);
  --color-abc: #7C5CFF;
}
```

Côté JS, les constantes deviennent `var(--…)` (DatABA `src/App.jsx:17-36`).
Le script anti-flash de `index.html` (DatABA `index.html:15-29`) est à porter
tel quel, **en changeant la clé** : `aba-cadre:theme`, jamais `aba:theme`.

Palette catégorielle, **fixe entre les deux thèmes**, à recopier telle quelle
(elle code de l'information, pas une ambiance) :

```
teal #00A870 · indigo #3B5BDB · ambre #FF8A3D · corail #FF4D6D
violet #7C5CFF · cyan #00B8D9 · lilas #A78BFA · ardoise #64748B
```

Correspondance à établir pour les états Manager : `acquis` → teal,
`en_cours` → indigo, `plateau` → ambre, `non_acquis` → corail, `dormant` →
ardoise, `mesure` → lilas ou violet. À arbitrer, mais **sans réintroduire
l'accent** dans cette palette : Règle de l'Accent Seul.

Polices inchangées, déjà en place : Space Grotesk (titres, boutons), IBM Plex
Sans (texte), IBM Plex Mono (libellés courts, chiffres).

Rayons : 8 / 12 / 16 / 9999. Bordures 1px, aucune ombre au repos — l'ombre est
réservée à ce qui flotte (modale, tiroir, toast).

### 4.3 Les deux règles nommées, valables ici aussi

- **Règle de l'Accent Seul** — l'accent ne sert qu'à l'action primaire et à la
  sélection courante. Jamais décoratif, jamais dupliqué dans la palette
  catégorielle ni dans l'alerte crise.
- **Règle du Contraste par Thème** — un fond coloré s'accompagne toujours de son
  token de texte (`accent-ink`), jamais d'un `#fff` écrit en dur. Le code
  Manager en contient au moins six occurrences (`src/App.jsx` L583, L599,
  L1411, L1691, L2368, et la barre d'onglets ~L4270) : c'est exactement ce qui
  a cassé le thème sombre lors de la première passe côté DatABA.
  `grep -n "'#fff'" src/App.jsx` donne la liste à jour.

Interdits explicites : utiliser `INK`/`PAPER`/`CARD`/`BORDER` comme si c'étaient
des couleurs fixes, et concaténer une transparence sur un token
(`INK + '0d'` — utiliser `--accent-wash`).

### 4.4 Recharts

Manager s'appuie beaucoup plus sur les graphiques que DatABA. Les couleurs
d'axes, de grille et d'infobulle passent par les mêmes tokens ; les séries
prennent la palette catégorielle. Vérifier chaque `contentStyle` de `<Tooltip>`
(il y en a plusieurs en dur, ex. `src/App.jsx:2707`) et chaque
`CartesianGrid` : ce sont les endroits où un thème sombre se casse sans
prévenir.

---

## 5. Chantier 2 bis — optimiser pour le PC

DatABA est une tablette tenue à une main ; Manager est un poste assis, souris
et clavier, écran large, avec de l'impression. La grammaire visuelle est
commune, la mise en page ne doit pas l'être.

**Ce qui n'a rien à faire dans Manager :**

- Le **balayage horizontal entre onglets** (`src/App.jsx:526`, `:4213`). Un
  swipe accidentel au trackpad change d'écran en plein travail. À retirer, pas
  à conserver « au cas où ».
- Le `max-w-5xl` central (`src/App.jsx:4247`) : il gâche la moitié d'un écran
  de bureau alors que les tableaux et les graphiques manquent de largeur.
- Les cibles tactiles surdimensionnées et les onglets `flex-1` étirés sur toute
  la largeur.

**Ce qu'un poste PC appelle :**

- **Navigation latérale persistante** plutôt qu'une rangée d'onglets : les sept
  destinations visibles en permanence, avec leur libellé (le
  `hidden sm:inline` actuel les masque), repliable en rail d'icônes. Ligne
  active teintée `--accent-wash`, cohérente avec le tiroir de DatABA.
- **Largeur fluide** avec un plafond de lecture pour le texte seul ; tableaux,
  graphiques et vue Explorer prennent la largeur disponible.
- **Deux colonnes** là où le travail est comparatif : liste des personnes à
  gauche, détail à droite pour l'écran Personnes ; sélection de séances à
  gauche, accord inter-observateurs à droite. Aujourd'hui tout est empilé.
- **Densité** : une variante compacte des cartes et des tableaux. Un cadre
  balaie des dizaines de lignes, il ne cote pas dans l'urgence — le compromis
  n'est pas celui de la tablette.
- **États de survol et focus visible.** DatABA ne les traite pas (`DESIGN.md`
  le note comme un écart assumé sur les champs) ; sur PC ils ne sont pas
  optionnels. Un anneau de focus dérivé de `--accent` sur tout ce qui est
  interactif.
- **Clavier** : `⌘K`/`Ctrl+K` pour aller à une personne, `1`–`7` pour les
  onglets, `Échap` pour fermer une modale. Une aide découvrable, pas des
  raccourcis secrets.
- **Impression.** C'est une fonction centrale de Manager, et le terrain le plus
  piégeux du chantier (voir §6). Le thème sombre ne doit **jamais** partir à
  l'imprimante : forcer les tokens clairs sous `@media print`.
- Le `<meta name="viewport">` peut perdre les contraintes tactiles ; garder
  l'installabilité PWA (Chrome/Edge, « Installer l'application »), qui est
  documentée dans le README Manager.

Le logo `public/logo-databa.png` peut servir en tête de navigation latérale,
avec une mention « Manager » qui distingue les deux applications au premier
coup d'œil — c'est le rôle que jouait le bleu d'accent dans l'ancienne palette,
et qu'il ne joue plus.

---

## 6. Garde-fous — non négociables

Repris des deux `CLAUDE.md`, plus ce que la lecture du code confirme.

1. **Jamais de `localStorage.clear()` global.** Les deux applications partagent
   la même adresse `github.io` et le même `localStorage`. Un clear global dans
   Manager a déjà effacé les données de production d'une tablette. Toute
   suppression passe par `effacerDonneesManager()` et le préfixe
   `aba-cadre:`. Même règle pour toute nouvelle clé introduite pendant le
   chantier — y compris la clé de thème.
2. **Le champ `source`.** Côté DatABA il désigne l'origine d'un relevé ; côté
   Manager la tablette d'origine. Le renommage en `origine` se fait à l'import
   dans `fusionnerImport` (`src/App.jsx:221-223`). Toute nouvelle donnée
   importée qui porte un `source` doit passer par le même traitement, sinon
   l'attribution par tablette est écrasée.
3. **Les purges doivent être exhaustives.** Une suppression par date, par source
   ou par personne doit atteindre *tous* les tableaux. Le chantier ajoute
   `classes` et des relevés `suivi` : **les inclure dans les purges et dans
   `tests/test_purge.mjs`**. Un tableau oublié laisse des données d'usager
   derrière une purge que l'utilisateur croit complète — c'est déjà arrivé.
4. **`BlocsCrise` est partagé** entre l'écran et l'impression. Ne pas en créer
   une seconde version pour l'impression : c'est ce qui a produit le doublon de
   la vue Renforcement.
5. **Impression.** L'export PDF des crises repose sur du CSS par ancêtres
   (`display: none` sur les frères). Ne pas revenir à un conteneur `no-print`
   englobant : ça produisait des pages blanches. Une navigation latérale change
   l'arbre DOM — **c'est le risque de régression n°1 du chantier PC.** Vérifier
   l'impression après chaque changement de structure, pas à la fin.
6. **Croisements ≠ causalité.** Chaque vue de croisement porte son texte
   d'accompagnement : un écart sur un atelier peut venir de l'heure à laquelle
   il est programmé. Les nouveaux croisements ouverts par `intervenantId` sur
   les relevés sont les plus sensibles de tous — un croisement par intervenant
   se lit vite comme une évaluation de professionnel. Le dire explicitement à
   l'écran.
7. **Un seul fichier `src/App.jsx`.** Ne pas proposer de découpage en modules
   sans demande explicite.
8. **Éditer, ne pas régénérer.** Lire la zone avant de la modifier : des
   fonctions en double et des composants fantômes sont déjà apparus entre deux
   sessions.
9. **Aucune donnée d'usager fabriquée.** Les personnes sont identifiées par
   initiales seules. Pas de nom, de date de naissance ni d'adresse inventés
   dans une maquette, un test ou une capture.

---

## 7. Vérification et livraison

`./verifier.sh` à la racine de Manager, plus les 11 suites de `tests/`. **Rien
ne se livre sur un contrôle rouge.**

Le vérificateur de Manager (6 677 o) est en retard sur celui de DatABA
(11 596 o). Contrôles présents côté DatABA et absents côté Manager, à porter :

- **2 quater — renommages laissés incomplets.** Détecte le vocabulaire
  résiduel après un renommage à l'échelle du fichier. Directement utile pour
  Groupe → Classe (§3.2) et pour stabilité → suivi continu (§3.3).
- **2 quinquies — identifiants importés en double.**
- Le contrôle 2 ter de DatABA (`finalizeSession`) est spécifique à la tablette,
  il n'a pas d'équivalent ici.

Deux contrôles nouveaux mériteraient d'exister côté Manager :

- Une couleur hexadécimale en dur dans `src/App.jsx` hors du bloc de palette
  catégorielle — c'est la faute qui casse le thème sombre, et elle est
  invisible tant qu'on développe en clair.
- Un `localStorage` touché sans passer par le préfixe `aba-cadre:`.

Le vérificateur est un artefact vivant : chaque nouvelle classe de bug lui vaut
un contrôle, **validé par un test négatif** — introduire la faute, confirmer la
détection, restaurer.

**Après chaque mise en ligne : incrémenter `CACHE_VERSION` dans
`public/sw.js`** (`v17` aujourd'hui). Sans ça, les postes continuent de servir
la version en cache. C'est l'oubli le plus coûteux du projet.

---

## 8. Ordre de travail proposé

Un lot par commit, `./verifier.sh` vert entre chaque.

| Lot | Contenu | Pourquoi là |
|---|---|---|
| 1 | Tests d'abord : `sens`, `unit: 'days'`, `toDayPoints` | La logique fausse se corrige avant tout affichage |
| 2 | Correction du critère d'acquisition (§3.1) | Bug de justesse, indépendant du reste |
| 3 | Lecture de `classes` / `classeId` à l'import, purges incluses (§3.2) | Change `VIDE` : tout le reste s'appuie dessus |
| 4 | Suivi continu multi-axes (§3.3) | Même remarque, plus gros volume |
| 5 | Probe complet (§3.4) et points mineurs (§3.5) | Dépend des lots 1 et 2 |
| 6 | Tokens CSS, `index.css`, script anti-flash, bascule de thème | Refonte visuelle : le socle |
| 7 | Passage des composants aux tokens, Recharts compris (§4) | Le gros du volume, mécanique |
| 8 | Mise en page PC : navigation latérale, largeur, deux colonnes (§5) | Après les tokens, sinon double travail |
| 9 | Clavier, focus, survol, densité (§5) | Finition |
| 10 | `DESIGN.md` et `PRODUCT.md` dans Manager, `CLAUDE.md` à jour, `CACHE_VERSION` | Livraison |

Vérifier l'impression aux lots 8 **et** 9, pas seulement à la fin.

---

## 9. Amorce pour la nouvelle conversation

À coller tel quel :

> Dépôt `8smvvj4wzy-sketch/DatABA-Manager`. Lis d'abord `CLAUDE.md`, puis le
> dossier de passation `MANAGER-MISE-A-JOUR.md` du dépôt DatABA (branche
> `claude/databa-manager-update-s112v6`), ainsi que `DESIGN.md` et `PRODUCT.md`
> de DatABA : ils décrivent le contrat d'échange JSON v4, l'identité visuelle
> cible et l'ordre de travail.
>
> Commence par le lot 1 : les tests de `sens` / `unit: 'days'` / `toDayPoints`,
> extraits de `src/App.jsx` de DatABA plutôt que recopiés. Ne passe au lot
> suivant qu'avec `./verifier.sh` vert.
>
> Réponds en français. Un lot par commit. Ne découpe pas `src/App.jsx` en
> modules.

### Fichiers de référence à avoir sous la main

Côté DatABA (`8smvvj4wzy-sketch/DatABA`, branche
`claude/databa-manager-update-s112v6`) :

| Fichier | Ce qu'on y trouve |
|---|---|
| `DESIGN.md` | Système de design complet, tokens, règles nommées |
| `PRODUCT.md` | Cadre produit, contraintes, principes |
| `CLAUDE.md` | Conventions et pièges côté tablette |
| `src/index.css` | Les tokens CSS des deux thèmes |
| `index.html` L15-29 | Script anti-flash de thème |
| `src/App.jsx` L17-50 | Constantes de couleur et palette catégorielle |
| `src/App.jsx` L180-330 | `TYPES`, Probe, `MASTERY_TYPES`, `DEFAULT_MASTERY*` |
| `src/App.jsx` L1717-1742 | Axes de suivi continu |
| `src/App.jsx` L2008-2030 | `releverAliasStabilite`, traçabilité des relevés |
| `src/App.jsx` L2625-2660 | `toDayPoints`, `masteryState` |
| `src/App.jsx` L5042-5075 | `payloadManager` — le contrat d'échange |
| `verifier.sh` | Les contrôles à porter |

Côté Manager (`8smvvj4wzy-sketch/DatABA-Manager`) :

| Emplacement | Ce qu'il faut y changer |
|---|---|
| `src/App.jsx` L16-60 | Palette beige à remplacer par les tokens |
| `src/App.jsx` L127-160 | `PREFIXE`, `VIDE`, `normaliser` |
| `src/App.jsx` L186-240 | `fusionnerImport` — classes et suivi continu |
| `src/App.jsx` L256-300 | Scores et critère d'acquisition |
| `src/App.jsx` L340-370 | Détection acquis / plateau — le `sens` manquant |
| `src/App.jsx` L3500-3600 | Lecture des formats de fichier à l'import |
| `src/App.jsx` L4200-4300 | Onglets, balayage, mise en page racine |
| `index.html` | `theme-color` périmé, script de thème à ajouter |
| `src/index.css` | À créer |
| `public/sw.js` | `CACHE_VERSION` |
