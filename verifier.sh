#!/bin/bash
# Vérification avant livraison — à lancer depuis la racine d'un dépôt.
#   usage : ./verifier.sh
#
# Contrôles, dans l'ordre où ils attrapent le plus de choses :
#   1. syntaxe et références (tsc en mode JS permissif — le projet n'est pas
#      en TypeScript, tsc ne sert ici que de vérificateur)
#   2. doublons de premier niveau (function, const) ET blocs de rendu dupliqués
#   2 bis. ordre des hooks React
#   2 ter. séance écrite sans être passée par finalizeSession
#   2 quater. renommages laissés incomplets (vocabulaire résiduel)
#   2 quinquies. identifiants importés en double
#   2 sexies. un mode de cotation ajouté à TYPES mais pas suivi partout
#   2 septies. champ d'instance d'objectif perdu à l'édition
#   2 octies. écriture de données hors de la couche de stockage
#   2 nonies. localStorage touché sans passer par le préfixe aba:
#   3. suite de tests Node autonome
#   4. hors ligne — build réel, précache injecté complet, aucune dépendance
#      réseau au chargement (ignoré si node_modules est absent)

set -u
RACINE="$(cd "$(dirname "$0")" && pwd)"
CIBLE="${1:-.}"
cd "$CIBLE" || exit 1
ECHECS=0
NOM="$(basename "$PWD")"

echo "════════ Vérification : $NOM ════════"

# `tsc` n'est pas une dépendance du projet : sur un poste il vient d'une
# installation globale, sur un runner il n'existe pas du tout et la section 1
# échouerait sans aucun rapport avec le code. On le résout une fois, en
# acceptant aussi celui que la CI installe dans node_modules.
if command -v tsc >/dev/null 2>&1; then
  TSC="tsc"
elif [ -x ./node_modules/.bin/tsc ]; then
  TSC="./node_modules/.bin/tsc"
else
  echo "  ✗ tsc introuvable (npm install -g typescript, ou npm install --no-save typescript)"
  exit 1
fi

# ── 1. Syntaxe et références ───────────────────────────────────────────
echo
echo "── 1. Syntaxe (tsc) ──"
TMP="$(mktemp -d)"
cat > "$TMP/tsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "noEmit": true,
    "allowJs": true,
    "checkJs": false,
    "jsx": "preserve",
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "noResolve": true,
    "types": []
  }
}
EOF
for f in src/*.jsx src/*.js; do
  [ -e "$f" ] || continue
  cp "$f" "$TMP/$(basename "$f")"
done
if "$TSC" --project "$TMP/tsconfig.json" 2>&1 | grep -v "Cannot find module" | grep -v "^$" | grep .; then
  echo "  ✗ erreurs de syntaxe"
  ECHECS=$((ECHECS + 1))
else
  echo "  ✓ syntaxe correcte"
fi

# Références inconnues : attrape une variable, une fonction ou une icône
# utilisée mais jamais définie ni importée. C'est ce qui reste après un
# copier-coller partiel, et le grep de doublons ne le voit pas.
cat > "$TMP/tsconfig-refs.json" <<'EOF'
{
  "compilerOptions": {
    "noEmit": true, "allowJs": true, "checkJs": true, "jsx": "react",
    "target": "ES2020", "module": "ESNext", "moduleResolution": "bundler",
    "skipLibCheck": true, "noResolve": true, "types": [],
    "strict": false, "noImplicitAny": false
  }
}
EOF
INCONNUS=$("$TSC" --project "$TMP/tsconfig-refs.json" 2>&1 | grep -E "Cannot find name" | head -20)
if [ -n "$INCONNUS" ]; then
  echo "  ✗ références inconnues :"
  echo "$INCONNUS" | sed 's/^/      /'
  ECHECS=$((ECHECS + 1))
else
  echo "  ✓ aucune référence inconnue"
fi
rm -rf "$TMP"

# ── 2. Doublons ────────────────────────────────────────────────────────
echo
echo "── 2. Doublons ──"
DOUBLONS=0
for f in src/App.jsx; do
  [ -e "$f" ] || continue
  D_FN=$(grep -oP "^function \K\w+" "$f" | sort | uniq -d)
  D_CO=$(grep -oP "^const \K\w+" "$f" | sort | uniq -d)
  D_CL=$(grep -oP "^class \K\w+" "$f" | sort | uniq -d)
  [ -n "$D_FN" ] && { echo "  ✗ fonctions en double : $D_FN"; DOUBLONS=1; }
  [ -n "$D_CO" ] && { echo "  ✗ constantes en double : $D_CO"; DOUBLONS=1; }
  [ -n "$D_CL" ] && { echo "  ✗ classes en double : $D_CL"; DOUBLONS=1; }

  # Blocs de rendu conditionnels dupliqués : {vue === 'x' && …} écrit deux fois
  # dans le même composant produit deux affichages superposés. Le grep de
  # premier niveau ne les voit pas — c'est ce qui a laissé passer le doublon de
  # la vue Renforcement.
  # La garde doit être seule — « {vue === 'x' && ( » en début de ligne. Sans
  # cette exigence, deux conditions différentes qui commencent pareil
  # ({mode === 'export' && (} et {mode === 'export' && p1.length > 0 && (})
  # seraient signalées à tort. La variable reste dans la clé, pour ne pas
  # confondre vue === 'crises' de la fiche personne avec tab === 'crises' de
  # la navigation.
  D_VUE=$(grep -oP "^\s*\{\K(vue|tab|ecran|mode) === '[a-zA-Z_]+'(?= && \()" "$f" | sort | uniq -d)
  [ -n "$D_VUE" ] && { echo "  ✗ blocs de rendu en double : $D_VUE"; DOUBLONS=1; }
done
[ "$DOUBLONS" -eq 0 ] && echo "  ✓ aucun doublon" || ECHECS=$((ECHECS + 1))

# ── 2 bis. Hooks après un retour anticipé ──────────────────────────────
# React exige que les hooks soient appelés dans le même ordre à chaque rendu.
# Un useState ou useEffect placé après un « if (…) return <Empty/> » casse
# cette règle dès que la condition devient vraie, et le plantage n'arrive
# qu'à ce moment-là — donc jamais pendant les essais.
echo
echo "── 2 bis. Ordre des hooks ──"
FAUTIFS=$(awk '
  /^function [A-Z]/ { split($2, a, "("); fn = a[1]; apresRetour = 0; garde = 0; next }
  /^}/ { fn = ""; apresRetour = 0; garde = 0; next }
  fn == "" { next }
  # Garde de premier niveau ouverte sur plusieurs lignes : « if (…) { » indenté
  # de deux espaces, refermée par un « } » au même niveau. Seul un return SITUÉ
  # DEDANS est un retour anticipé. Compter tout return indenté de quatre espaces
  # attrapait aussi ceux des callbacks — un « return undefined » dans un
  # useEffect faisait alors passer tout le reste du composant pour fautif, et le
  # contrôle ne protégeait plus rien.
  # Motifs sans \< ni \> : mawk, l awk par défaut d Ubuntu, ne les connaît pas.
  garde == 0 && /^  if .*\{[ ]*$/ { garde = 1; next }
  garde == 1 && /^  \}/ { garde = 0; next }
  garde == 1 && /return/ { apresRetour = 1; next }
  # Garde tenant sur une seule ligne, ou sortie sèche du corps.
  /^  if .*return/ || /^  return/ { apresRetour = 1; next }
  apresRetour && /use(State|Effect|Memo|Ref|Reducer|Callback)[ ]*\(/ {
    print "      " fn " ligne " NR " : " $0
  }
' src/App.jsx | head -10)
if [ -n "$FAUTIFS" ]; then
  echo "  ✗ hook appelé après un retour anticipé :"
  echo "$FAUTIFS"
  ECHECS=$((ECHECS + 1))
else
  echo "  ✓ hooks appelés inconditionnellement"
fi

# ── 2 ter. Séance finalisée avant d'être écrite ────────────────────────
# Une séance écrite dans la liste persistée sans être passée par
# finalizeSession garde ses chronomètres en cours au moment de
# l'enregistrement — plus rien ne les arrête ensuite. Le chaînage d'atelier a
# donné à onFinish() un deuxième site d'appel ; ce contrôle vaut pour
# chacun, présent ou futur.
echo
echo "── 2 ter. Séance finalisée avant d'être écrite ──"
FAUTIFS=""
while IFS=: read -r num ligne; do
  echo "$ligne" | grep -q "finalizeSession(" && continue
  # Seule exception tolérée : l'argument « close » produit par chainerAtelier,
  # qui finalise en interne — vérifié séparément ici plutôt que supposé.
  if echo "$ligne" | grep -qE '\bonFinish\(close\b' \
    && awk '/^function chainerAtelier\(/,/^}/' src/App.jsx | grep -q "finalizeSession("; then
    continue
  fi
  FAUTIFS="${FAUTIFS}      ligne ${num} : ${ligne}
"
done < <(grep -n "onFinish(" src/App.jsx)
if [ -n "$FAUTIFS" ]; then
  echo "  ✗ séance écrite sans passer par finalizeSession :"
  echo -n "$FAUTIFS"
  ECHECS=$((ECHECS + 1))
else
  echo "  ✓ toute séance écrite est finalisée"
fi

# ── 2 quater. Renommages laissés incomplets ────────────────────────────
# Un renommage à l'échelle du fichier (ex. « suivi de stabilité » → « suivi
# continu ») laisse facilement une trace : un libellé, un commentaire, un nom
# de fonction oublié pendant qu'un autre a bien été renommé. Le vocabulaire
# retiré n'a le droit de survivre que dans les identifiants explicitement
# transitoires — clé de stockage historique, alias de compatibilité vers
# DatABA Manager. Tout le reste est un résidu.
#
# Cette liste est le registre des renommages complets déjà vérifiés : chaque
# terme retiré du produit y gagne une ligne, avec ses exceptions légitimes.
echo
echo "── 2 quater. Renommages laissés incomplets ──"
RENOMMAGES=0

# « Balance Program » → « Équilibre ». Le mot « stabilité » redevient du
# vocabulaire produit légitime avec le renommage de l'axe de suivi par défaut
# en « Suivi de stabilité » : il n'y a plus de résidu à traquer sur ce terme.
# Aucune exception à prévoir pour « Balance Program » : le discriminant
# persisté est la chaîne minuscule « balance » (obj.type, session.mode),
# jamais cette étiquette anglophone lue par un humain.
RESIDUS_BALANCE=$(grep -n 'Balance Program' src/App.jsx)
if [ -n "$RESIDUS_BALANCE" ]; then
  echo "  ✗ vocabulaire « Balance Program » résiduel (Équilibre attendu) :"
  echo "$RESIDUS_BALANCE" | sed 's/^/      /' | head -10
  RENOMMAGES=1
fi

[ "$RENOMMAGES" -eq 0 ] && echo "  ✓ aucun résidu détecté" || ECHECS=$((ECHECS + 1))

# ── 2 sexies. Aiguillage des modes de cotation incomplet ───────────────
# Un mode ajouté à TYPES doit être suivi dans CHAQUE fonction qui distingue
# par obj.type — sinon il se comporte comme un mode RETIRÉ à cet endroit
# précis, silencieusement. C'est exactement ce qui est arrivé à Probe à son
# ajout : absent de configCanonique, deux réglages différents (probesParJour,
# useGuidance) produisaient la même signature et un import qui changeait l'un
# des deux était ignoré sans le dire ; absent de buildDetailRows, aucune
# ligne dans l'export détaillé. Chaque fonction listée ci-dessous distingue
# les modes par la forme littérale « obj.type === 'mode' » — une recherche de
# ce littéral suffit, sans avoir à interpréter le JS.
echo
echo "── 2 sexies. Aiguillage des modes de cotation ──"
MODES=$(sed -n "/^const TYPES = {/,/^};/p" src/App.jsx | grep -oP '^\s*\K[a-zA-Z0-9_]+(?=:)')
FONCTIONS_AIGUILLAGE="emptyEntry entryMatches summarize objectiveScore configCanonique objectifEstCote buildDetailRows"
# Exceptions documentées, « FONCTION:mode » — occurrence n'a pas d'essais
# discrets et aucun champ de configuration qui lui soit propre (son seuil
# d'acquisition passe par le générique MASTERY_TYPES) : configCanonique et
# buildDetailRows n'ont donc légitimement rien de spécifique à écrire pour
# lui (voir le commentaire au-dessus de son absence dans buildDetailRows).
EXCEPTIONS="configCanonique:occurrence buildDetailRows:occurrence"
AIGUILLAGE_INCOMPLET=0
for FN in $FONCTIONS_AIGUILLAGE; do
  CORPS=$(awk -v fn="function $FN(" '
    index($0, fn) == 1 { grab = 1 }
    grab { print }
    grab && /^\}/ && index($0, fn) != 1 { exit }
  ' src/App.jsx)
  if [ -z "$CORPS" ]; then
    echo "  ✗ fonction introuvable : $FN"
    AIGUILLAGE_INCOMPLET=1
    continue
  fi
  for MODE in $MODES; do
    case " $EXCEPTIONS " in
      *" $FN:$MODE "*) continue ;;
    esac
    if ! echo "$CORPS" | grep -qF "'$MODE'"; then
      echo "  ✗ $FN ne distingue pas le mode '$MODE'"
      AIGUILLAGE_INCOMPLET=1
    fi
  done
done
[ "$AIGUILLAGE_INCOMPLET" -eq 0 ] && echo "  ✓ tous les modes sont suivis dans chaque aiguillage" || ECHECS=$((ECHECS + 1))

# ── 2 quinquies. Imports dupliqués ─────────────────────────────────────
# Un identifiant importé deux fois (copier-coller d'une icône déjà présente
# plus haut dans la liste, le plus souvent) est une erreur de syntaxe pour
# le bundler (Babel/esbuild refusent la double déclaration), mais tsc en
# mode noResolve ne la voit pas : le module non résolu laisse chaque
# spécificateur passer sans vérifier les doublons. Sans ce contrôle, le
# projet passait « prêt à livrer » avec un import qui casse `npm run dev`.
echo
echo "── 2 quinquies. Imports dupliqués ──"
TMP_IMPORTS="$(mktemp)"
awk '
  /^import / { buf=""; grab=1 }
  grab { buf = buf " " $0 }
  grab && /from[ ]+.*;[ ]*$/ { print buf; grab=0 }
' src/App.jsx > "$TMP_IMPORTS"
IMPORTS_DOUBLONS=$(sed -E "s/^ *import //; s/from[ ]+'[^']*';?//; s/[{}]//g" "$TMP_IMPORTS" \
  | tr ',' '\n' \
  | awk '{
      line = $0
      sub(/^[ \t]+/, "", line); sub(/[ \t]+$/, "", line)
      if (line ~ / as /) { sub(/.* as /, "", line) }
      gsub(/\*/, "", line)
      sub(/^[ \t]+/, "", line); sub(/[ \t]+$/, "", line)
      if (line != "") print line
    }' \
  | sort | uniq -d)
rm -f "$TMP_IMPORTS"
if [ -n "$IMPORTS_DOUBLONS" ]; then
  echo "  ✗ identifiant importé plusieurs fois : $(echo "$IMPORTS_DOUBLONS" | tr '\n' ' ')"
  ECHECS=$((ECHECS + 1))
else
  echo "  ✓ aucun import dupliqué"
fi

# ── 2 septies. Champ d'objectif perdu à l'édition ──────────────────────
# `modeleDepuisObjectif` énumère par déstructuration tout ce qui distingue une
# instance suivie d'un modèle (id, priorité, cible en cours, cibles acquises,
# historique de phase, date de réinitialisation du suivi) : c'est le registre
# des champs d'instance d'un objectif. `ObjectiveForm.submit()` reconstruit un
# objet complet à la main pour onSubmit() ; `updateObjective` remplace
# l'objectif entier par ce que submit() renvoie. Un champ absent de cet objet
# littéral n'est pas simplement ignoré : il est effacé de l'objectif à chaque
# édition, aussi anodine soit-elle (renommer l'intitulé, par exemple). C'est
# arrivé à trackingResetAt — la date de reprise du suivi disparaissait à la
# première édition d'objectif, rouvrant tout l'historique dans la courbe et
# le calcul du critère d'acquisition.
echo
echo "── 2 septies. Champ d'objectif perdu à l'édition ──"
CHAMPS_INSTANCE=$(awk '/^function modeleDepuisObjectif\(/,/^}/' src/App.jsx \
  | grep -oP '^\s*const \{ \K[^}]+(?=\} = obj;)' \
  | tr ',' '\n' | sed -E 's/\.\.\.[a-zA-Z0-9_]+//; s/^[ \t]+|[ \t]+$//g' | grep -v '^$')
CORPS_SUBMIT=$(awk '/^  function submit\(\) \{/{grab=1} grab{print} grab && /^  \}$/{exit}' src/App.jsx)
if [ -z "$CHAMPS_INSTANCE" ] || [ -z "$CORPS_SUBMIT" ]; then
  echo "  ✗ modeleDepuisObjectif ou ObjectiveForm.submit() introuvable"
  ECHECS=$((ECHECS + 1))
else
  CHAMPS_PERDUS=""
  for CHAMP in $CHAMPS_INSTANCE; do
    echo "$CORPS_SUBMIT" | grep -qE "^\s*${CHAMP}[,:]" || CHAMPS_PERDUS="${CHAMPS_PERDUS} ${CHAMP}"
  done
  if [ -n "$CHAMPS_PERDUS" ]; then
    echo "  ✗ champ(s) d'instance absent(s) de l'objet renvoyé par submit() :$CHAMPS_PERDUS"
    ECHECS=$((ECHECS + 1))
  else
    echo "  ✓ tous les champs d'instance survivent à l'édition"
  fi
fi

# ── 2 octies. Écriture de données hors de la couche de stockage ────────
# Les deux applications DatABA partagent le même localStorage sous la même
# adresse github.io, et son quota (~5 Mo par origine) est commun aux deux :
# un `setItem` posé hors de la couche saute IndexedDB, la relecture et la
# file d'écriture, et un dépassement de quota y redevient silencieux — c'est
# exactement ce qui faisait rouvrir une tablette vide après une journée de
# cotation.
#
# Deux appels sont légitimes, et deux seulement :
#   - `ecrireBrut`, le repli de la couche, qui relit ce qu'il vient d'écrire ;
#   - le thème, que le script bloquant d'index.html doit lire AVANT le premier
#     rendu, donc de façon synchrone : IndexedDB ne peut pas le servir.
# `removeItem` reste libre : il ne peut rien faire perdre d'autre que le
# doublon laissé par l'ancien emplacement.
#
# Contrôle validé par test négatif : rendre `ecrireBrut` muet sur sa relecture
# fait bien échouer tests/test_stockage.mjs, et déplacer un `setItem` hors de
# la couche fait bien échouer la ligne ci-dessous.
echo
echo "── 2 octies. Écriture de données hors de la couche de stockage ──"
# `grep -o` isole chaque appel : une ligne portant un appel légitime et un
# appel fautif serait blanchie en entier par un filtre par ligne.
ECRITURE_DIRECTE=$(grep -on "localStorage\.setItem([^)]*" src/App.jsx \
  | grep -v "setItem(cle, charge" \
  | grep -v "setItem('aba:theme'")
if [ -n "$ECRITURE_DIRECTE" ]; then
  echo "  ✗ des données sont écrites sans passer par la couche de stockage :"
  echo "$ECRITURE_DIRECTE" | sed 's/^/      /' | head -10
  ECHECS=$((ECHECS + 1))
else
  echo "  ✓ toute écriture passe par la couche de stockage"
fi

# ── 2 nonies. localStorage sans le préfixe aba: ────────────────────────
# Même origine partagée, autre bout du problème : une clé posée sans préfixe,
# ou un `localStorage.clear()` global, emporte les données consolidées de
# Manager (`aba-cadre:`). C'est déjà arrivé dans l'autre sens. Toute clé
# légitime est un littéral 'aba:…', la variable `cle` de la couche, ou le `k`
# d'une boucle déjà filtrée sur le préfixe (clearAll).
echo
echo "── 2 nonies. localStorage sans le préfixe aba: ──"
SANS_PREFIXE=$(grep -on "localStorage\.\(setItem\|getItem\|removeItem\|clear\)([^)]*" src/App.jsx \
  | grep -v "('aba:" \
  | grep -v "(cle" \
  | grep -v "removeItem(k")
if [ -n "$SANS_PREFIXE" ]; then
  echo "  ✗ localStorage touché sans passer par le préfixe aba: :"
  echo "$SANS_PREFIXE" | sed 's/^/      /' | head -10
  ECHECS=$((ECHECS + 1))
else
  echo "  ✓ tout accès localStorage passe par le préfixe"
fi

# ── 3. Tests ───────────────────────────────────────────────────────────
echo
echo "── 3. Tests ──"
DOSSIER_TESTS=""
for d in tests test; do
  if [ -d "$d" ] && ls "$d"/*.mjs >/dev/null 2>&1; then DOSSIER_TESTS="$d"; break; fi
done
if [ -n "$DOSSIER_TESTS" ]; then
  N_OK=0; N_KO=0
  for t in "$DOSSIER_TESTS"/*.mjs; do
    if SORTIE=$(node "$t" 2>&1); then
      N_OK=$((N_OK + 1))
    else
      N_KO=$((N_KO + 1))
      echo "  ✗ $(basename "$t")"
      echo "$SORTIE" | sed 's/^/      /' | head -12
    fi
  done
  echo "  $N_OK suite(s) au vert, $N_KO en échec"
  [ "$N_KO" -gt 0 ] && ECHECS=$((ECHECS + 1))
else
  # Aucun test trouvé : un vérificateur qui reste vert sans jamais exécuter de
  # test ne vérifie rien. C'est ce qui a laissé passer l'oubli du dossier
  # tests/ (pluriel) pendant que le dépôt écrivait test/ (singulier).
  echo "  ✗ aucun test trouvé dans tests/ ni test/"
  ECHECS=$((ECHECS + 1))
fi

# ── 4. Hors ligne ────────────────────────────────────────────────────
# tests/test_horsligne.mjs (section 3) couvre precache.mjs et sw.js en
# environnement simulé ; ce contrôle-ci construit réellement le projet et
# relit dist/, seul moyen de vérifier que l'injection du build (vite.config.js)
# a effectivement eu lieu et que rien, à l'exécution, ne dépend plus du
# réseau — voir CLAUDE.md, piège « Le hors-ligne ne se découvre pas à
# l'exécution ».
echo
echo "── 4. Hors ligne ──"
if [ -d node_modules ]; then
  if SORTIE_BUILD=$(npm run build 2>&1); then
    if [ -f dist/sw.js ]; then
      HORS_LIGNE_OK=1
      for f in dist/assets/*; do
        [ -e "$f" ] || continue
        NOM_ASSET="./assets/$(basename "$f")"
        if ! grep -qF "\"$NOM_ASSET\"" dist/sw.js; then
          echo "  ✗ absent du précache injecté : $NOM_ASSET"
          HORS_LIGNE_OK=0
        fi
      done
      if grep -q 'CACHE_VERSION = "dev"' dist/sw.js; then
        echo "  ✗ CACHE_VERSION n'a pas été injectée par le build (reste à 'dev')"
        HORS_LIGNE_OK=0
      fi
      # Aucune dépendance réseau au chargement : un lien Google Fonts ou un
      # script tiers réintroduirait la panne réglée par cette section — seuls
      # dist/index.html et les feuilles de style compilées sont regardés, pas
      # le bundle JS, où une URL http:// peut légitimement n'être qu'une
      # chaîne de caractères (xmlns SVG, par exemple).
      URLS_EXTERNES=$(grep -ohE "https?://[^\"' )]+" dist/index.html dist/assets/*.css 2>/dev/null)
      if [ -n "$URLS_EXTERNES" ]; then
        echo "  ✗ dépendance réseau externe détectée :"
        echo "$URLS_EXTERNES" | sed 's/^/      /'
        HORS_LIGNE_OK=0
      fi
      [ "$HORS_LIGNE_OK" -eq 1 ] && echo "  ✓ précache complet, aucune dépendance réseau externe" \
        || ECHECS=$((ECHECS + 1))
    else
      echo "  ✗ dist/sw.js introuvable après le build"
      ECHECS=$((ECHECS + 1))
    fi
  else
    echo "  ✗ le build a échoué :"
    echo "$SORTIE_BUILD" | sed 's/^/      /' | tail -20
    ECHECS=$((ECHECS + 1))
  fi
else
  echo "  ⚠ node_modules absent (npm install requis), section ignorée"
fi

echo
if [ "$ECHECS" -eq 0 ]; then
  echo "════════ $NOM : PRÊT À LIVRER ════════"
  exit 0
fi
echo "════════ $NOM : $ECHECS CONTRÔLE(S) EN ÉCHEC — NE PAS LIVRER ════════"
exit 1
