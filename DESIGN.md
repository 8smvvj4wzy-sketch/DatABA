---
name: DatABA
description: Recueil de données comportementales ABA sur tablette, hors ligne, cadré et sobre.
colors:
  ink: "#0E1B33"
  ink-soft: "#52627A"
  paper: "#F3F6FB"
  card: "#FFFFFF"
  border: "#D7E0EE"
  accent: "#4566DE"
  accent-ink: "#FFFFFF"
  nav-bg: "#E4E9F5"
  crisis: "#D7263D"
  cat-teal: "#00A870"
  cat-indigo: "#3B5BDB"
  cat-amber: "#FF8A3D"
  cat-coral: "#FF4D6D"
  cat-violet: "#7C5CFF"
  cat-cyan: "#00B8D9"
  cat-lilac: "#A78BFA"
  cat-slate: "#64748B"
typography:
  display:
    fontFamily: "'Space Grotesk', system-ui, sans-serif"
    fontWeight: 600
  body:
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif"
    fontWeight: 400
  label:
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace"
    fontWeight: 500
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  chip-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.sm}"
---

# Design System: DatABA

## Overview

**Creative North Star: "Le Terminal de Terrain"**

Une appli outil, pas une vitrine : un éducateur la consulte entre deux enfants,
en mouvement, souvent d'une main. La palette précédente (verts et terres,
héritée des débuts du projet) laisse place à un bleu foncé cadré et
volontairement technique, plus proche d'un instrument que d'un carnet — sans
jamais céder la lisibilité en situation à l'expression visuelle, comme l'exige
un mode Operate. La structure prime : bordures nettes de 1px, quasi aucune
ombre, une seule couleur d'accent réservée à l'action et à la sélection
courante. Le thème clair et le thème sombre partagent exactement la même
grammaire — seuls les tokens de surface (fond, carte, bordure, texte) basculent
par variables CSS, jamais la structure.

**Key Characteristics :**
- Accent unique par thème (charbon neutre en clair, bleu en sombre), utilisé pour l'action primaire et l'état sélectionné — jamais en décoration.
- Palette catégorielle froide (indigo, cyan, violet, teal, ambre, corail, lilas, ardoise) fixe entre les deux thèmes, pour que les courbes et pastilles de suivi restent lisibles sur les deux.
- Structure plate par défaut : bordure 1px, pas d'ombre au repos.
- Une seule famille par rôle : Space Grotesk (titres/boutons), IBM Plex Sans (texte), IBM Plex Mono (libellés courts, données).

## Colors

Stratégie *Restrained* (mode Operate) : neutraux dominants, un seul accent qui porte l'action et la sélection.

### Primary
- **Accent** (`#4A4A4A` clair / `#5B8CFF` sombre) : boutons primaires, sélection courante, focus. Texte associé : `accent-ink` (`#FFFFFF` clair / `#071021` sombre — toujours le sens qui garde le contraste). Le clair est passé du bleu pur d'origine (`#2453FF`, trop électrique sur `paper`) à un charbon neutre début 2026 — le sombre reste bleu, confirmé qu'il convient tel quel.

### Neutral
- **Ink** (`#0E1B33` clair / `#E7ECF7` sombre) : texte principal.
- **Ink Soft** (`#52627A` clair / `#93A2C0` sombre) : texte secondaire, non sélectionné.
- **Paper** (`#F3F6FB` clair / `#0A1120` sombre) : fond de page.
- **Card** (`#FFFFFF` clair / `#121A2E` sombre) : surface des cartes et du tiroir.
- **Border** (`#D7E0EE` clair / `#24304A` sombre) : hairline 1px, seule marque de séparation au repos.
- **Nav** (`#E4E9F5` clair / `#0F1830` sombre) : fond de la barre de navigation et du tiroir.

### Alerte
- **Crisis** (`#D7263D` clair / `#FF5470` sombre) : réservée aux boutons CRISE et aux marqueurs de crise. N'entre jamais dans la palette catégorielle.
- **Color ABC** (`#4A4A4A` clair / `#7C5CFF` sombre) : réservée au bouton et aux marqueurs d'observation ABC. Assortie à l'accent en clair (même charbon), reste le violet catégoriel en sombre — token dédié pour ne pas lier l'identité ABC à un futur réglage de l'accent seul.

### Palette catégorielle (fixe, hors thème)
Utilisée pour les guidances, les types de cotation, les fonctions de crise et les courbes de suivi — jamais recalculée par thème, choisie pour rester lisible sur les deux fonds.
- **Teal** `#00A870` — indépendant / réussi / positif.
- **Indigo** `#3B5BDB`, **Cyan** `#00B8D9`, **Violet** `#7C5CFF`, **Lilas** `#A78BFA` — catégories neutres (types de cotation, fonctions de crise).
- **Ambre** `#FF8A3D` — guidance partielle / attention / priorité.
- **Corail** `#FF4D6D` — guidance totale / erreur / intensité forte.
- **Ardoise** `#64748B` — réponse manquée / catégorie retirée ou inconnue.

### Named Rules
**La Règle de l'Accent Seul.** L'accent ne sert qu'à l'action primaire et à la sélection courante — jamais à la décoration, jamais dupliqué dans la palette catégorielle. Sa teinte diffère par thème (charbon en clair, bleu en sombre) ; la règle porte sur son usage, pas sur sa couleur.
**La Règle du Contraste par Thème.** Un fond coloré (accent, alerte, catégorie) s'accompagne toujours du token de texte prévu pour lui (`accent-ink`), jamais d'un blanc ou noir fixe : c'est ce qui a cassé la lisibilité de la première passe en thème sombre.

## Typography

**Display Font:** Space Grotesk (avec system-ui, sans-serif)
**Body Font:** IBM Plex Sans (avec system-ui, sans-serif)
**Label/Mono Font:** IBM Plex Mono (avec ui-monospace, monospace)

**Character:** Une seule famille par rôle, sans appariement décoratif — conforme au mode Operate. Le mono marque les libellés courts et les données chiffrées (chronomètre, pourcentages), jamais le texte courant.

### Hierarchy
- **Titre d'écran** (600, text-2xl) : `SectionTitle`, un par écran.
- **Titre de bloc** (600, text-xl) : en-têtes de carte, titres de modale.
- **Corps** (400, text-sm/base) : texte courant, formulaires.
- **Libellé** (500, text-xs, `F_MONO`) : durées, pourcentages, compteurs.

## Layout

Format tablette portrait/paysage. Cinq écrans par onglets en haut, tiroir
latéral pour Gestion/Personnes/Export. Barre du bas fixe avec les actions
CRISE et ABC toujours accessibles. Densité modérée : padding 12–16px, grille
implicite via `flex`/`gap`, pas de grille CSS dédiée. Zones de sécurité iOS
(`env(safe-area-inset-*)`) respectées sur le tiroir, la barre du bas et les
boutons flottants.

## Elevation & Depth

Plat par défaut : bordure 1px (`border`), pas d'ombre au repos. L'ombre est
réservée à ce qui flotte au-dessus du contenu — pilule de navigation, boutons
CRISE/ABC, tiroir latéral, toast — jamais à une carte ou un champ statique.
Cette réserve n'est pas gravée comme règle absolue (choix laissé ouvert),
mais elle est respectée partout où elle existe aujourd'hui.

## Shapes

Rayons croissants selon la taille du bloc : `8px` (petits contrôles, chips),
`12px` (boutons, champs, la plupart des cartes), `16px` (cartes principales,
modales), `9999px` (pilules de navigation, avatars, interrupteurs). Bordures
toujours 1px, jamais de bordure épaisse décorative.

## Components

### Buttons (`Btn`)
- **Shape:** `rounded-xl` (12px).
- **Solid (primaire) :** fond accent, texte `accent-ink`.
- **Outline :** bordure et texte accent, fond transparent.
- **Ghost :** fond carte, bordure neutre, texte `ink-soft` — pour les actions secondaires.
- **Pressed :** `active:scale-[0.98]`, sans autre transition.

### Chips / segmented controls
Motif répété (mode de cotation, sélection de personne, atelier, onglet de
navigation) : non sélectionné = bordure neutre, fond transparent, texte
`ink-soft` ; sélectionné = fond accent plein, texte `accent-ink`, bordure
accent. Jamais de fond accent avec un texte blanc fixe — le token
`accent-ink` porte la bascule de thème.

### Cards (`Card`)
- **Corner Style:** `rounded-2xl` (16px).
- **Background:** `card`.
- **Border:** 1px `border`.
- **Shadow:** aucune au repos.
- **Padding interne:** 16px.

### Inputs (`Field`)
- **Style:** bordure 1px `border`, fond transparent, `rounded-xl`.
- **Focus:** pas de traitement dédié aujourd'hui — écart connu, pas une omission de cette passe.

### Navigation
Barre du bas : pilule flottante (`rounded-full`, fond `nav-bg`, ombre), icônes
+ libellés, l'onglet actif prend le fond accent plein. Tiroir latéral : liste
de panneaux, fond `card`, ligne active teintée `paper`.

### Interrupteurs (toggles)
Piste `rounded-full`, fond accent quand actif sinon `border`, curseur blanc
fixe (`bg-white`) — le blanc du curseur reste correct sur les deux thèmes
car il ne porte jamais de texte.

## Do's and Don'ts

### Do:
- **Do** réserver l'accent à l'action primaire et à la sélection courante (Règle de l'Accent Seul).
- **Do** faire porter chaque fond coloré par son propre token de texte (`accent-ink`), jamais un blanc ou noir écrit en dur.
- **Do** garder la palette catégorielle fixe entre les deux thèmes — elle code de l'information, pas une ambiance.
- **Do** garder une seule famille de police par rôle (mode Operate : pas d'appariement display/corps ornemental).

### Don't:
- **Don't** utiliser `INK`/`PAPER`/`CARD`/`BORDER` comme couleur de remplissage supposée toujours sombre : ce sont des tokens de surface réactifs au thème, pas des constantes.
- **Don't** concaténer une transparence sur un token CSS (`INK + '0d'`) — utiliser `--accent-wash`.
- **Don't** ajouter d'ombre à un élément statique (carte, champ, chip au repos).
- **Don't** dupliquer l'accent dans la palette catégorielle ou l'alerte crise.
