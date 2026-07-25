# Cotations ABA — installation sur les tablettes

Ce dossier contient l'application prête à être compilée et mise en ligne.
Une fois installée, elle fonctionne **sans connexion** et les données restent
**sur chaque tablette** : rien n'est envoyé sur un serveur.

---

## 1. Compiler l'application

Une seule fois, sur un ordinateur (Windows, Mac ou Linux) :

1. Installez **Node.js** (version 18 ou plus) depuis <https://nodejs.org> — prenez la version « LTS ».
2. Ouvrez un terminal dans ce dossier, puis lancez :

```bash
npm install
npm run build
```

Un dossier **`dist/`** apparaît. C'est lui, et lui seul, qu'il faut mettre en ligne.

Pour tester avant de publier :

```bash
npm run dev
```

puis ouvrez l'adresse affichée dans le terminal.

---

## 2. Mettre en ligne

Déposez **le contenu du dossier `dist/`** sur un hébergement en **HTTPS**.
Le HTTPS est indispensable : sans lui, ni le mode hors ligne ni l'installation
sur l'écran d'accueil ne fonctionnent.

Quelques options gratuites où il suffit de glisser-déposer le dossier `dist/` :

- **Netlify Drop** — <https://app.netlify.com/drop>
- **Cloudflare Pages**
- **GitHub Pages**

Vous obtenez une adresse du type `https://cotations-aba.netlify.app`.

> Si votre établissement dispose d'un serveur interne, le dossier `dist/`
> peut aussi y être déposé, du moment que l'accès se fait en HTTPS.

---

## 3. Installer sur les tablettes

### Android

1. Ouvrez l'adresse dans **Chrome**.
2. Menu **⋮** → **Installer l'application** (ou « Ajouter à l'écran d'accueil »).
3. L'icône apparaît sur l'écran d'accueil et l'application s'ouvre en plein écran.

### iPhone / iPad

1. Ouvrez l'adresse dans **Safari** (obligatoire, les autres navigateurs ne le proposent pas).
2. Bouton **Partager** → **Sur l'écran d'accueil**.

Après la première ouverture, l'application fonctionne hors connexion.

---

## 4. Mettre à jour l'application plus tard

1. Modifiez `src/App.jsx`.
2. Dans `public/sw.js`, incrémentez `CACHE_VERSION` (`'v1'` → `'v2'`, etc.).
   **Cette étape est indispensable**, sinon les tablettes garderont l'ancienne version.
3. Relancez `npm run build` et redéposez le dossier `dist/`.

Les tablettes récupèrent la nouvelle version à la prochaine ouverture avec du réseau.

---

## 5. Points à connaître

- **Les données sont propres à chaque tablette.** Il n'y a aucune synchronisation.
  Utilisez l'export de sauvegarde (écran Administratif) régulièrement : c'est le
  seul moyen de récupérer l'historique en cas de perte, de panne ou de remplacement.
- **Ne videz pas les données du navigateur** sur les tablettes : cela effacerait
  l'historique de l'application.
- **Polices.** Hors connexion, l'application bascule sur les polices du système.
  L'affichage change légèrement, rien de plus.
- **Écran maintenu allumé.** Cette fonction marche correctement une fois
  l'application installée ainsi (elle est bridée dans un aperçu en cadre).
- **Envoi par mail.** Sur Android, le partage natif joint directement le fichier
  Excel. Sinon le fichier est téléchargé et le mail s'ouvre pré-rempli, à vous
  d'ajouter la pièce jointe.
- **RGPD.** Même réduites aux initiales, ces données restent des données
  personnelles de santé. Prévoyez un code de déverrouillage sur les tablettes,
  une durée de conservation définie et une inscription au registre des
  traitements de l'établissement.

---

## 6. Pour aller jusqu'au fichier .apk (facultatif)

Une fois la PWA en ligne et validée par l'équipe, l'emballage en application
Android se fait à partir de ce même projet :

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Cotations ABA" fr.etablissement.aba --web-dir=dist
npx cap add android
npm run build && npx cap sync
npx cap open android
```

La dernière commande ouvre **Android Studio** (gratuit), d'où vous générez
le `.apk` à installer sur les tablettes ou à diffuser via votre gestionnaire de parc.

Pour iOS, la même démarche existe avec `@capacitor/ios`, mais elle exige un Mac,
Xcode et un compte développeur Apple (99 $/an).

Alternative sans ligne de commande : <https://www.pwabuilder.com> génère les
paquets Android et iOS à partir de l'adresse de votre PWA.
