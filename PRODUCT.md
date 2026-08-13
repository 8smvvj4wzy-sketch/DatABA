# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Éducateurs spécialisés qui mènent des séances d'intervention ABA en
établissement médico-social, seuls ou en petit groupe. Ils cotent en
situation : pendant ou juste après l'intervention, souvent debout, entre deux
enfants, sur une tablette partagée entre plusieurs intervenants d'un même
établissement.

## Product Purpose

Recueillir les données comportementales d'une séance ABA (cotation d'objectifs,
crises, observations ABC) directement sur tablette, sans connexion, et
produire des exports Excel pour le suivi et la transmission. L'application
sœur DatABA Manager s'adresse aux cadres pédagogiques pour le pilotage
transversal ; les deux échangent uniquement par fichier JSON chiffré, jamais
par serveur partagé.

## Positioning

Deux mécanismes qu'un concurrent ne peut pas copier sans changer la nature du
produit :

- **Zéro-serveur, chiffrement local.** Les données ne quittent jamais la
  tablette hors export explicite chiffré : pas de compte, pas de cloud, pas de
  sous-traitant hébergeur, pas de collecte de PII (initiales uniquement). C'est
  une garantie structurelle, pas une politique de confidentialité déclarative.
- **Séparation terrain / pilotage.** DatABA (cotation en séance) et DatABA
  Manager (pilotage pédagogique) sont deux applications distinctes qui
  échangent par fichier JSON chiffré. Aucune donnée comportementale ne transite
  par un serveur partagé entre les deux usages.

## Operating Context

Séance d'intervention ABA en établissement médico-social, individuelle ou en
groupe (ateliers récurrents : habiletés sociales, repas, cuisine…). Tablette
iPad ou Android, installée en PWA, utilisée hors connexion après la première
ouverture. Cinq écrans (Gestion, Personnes, Session, Suivi, Export) accessibles
par onglets ou balayage horizontal ; deux actions toujours accessibles en bas
d'écran (CRISE, ABC). Cotation rapide en situation : la vitesse de saisie
prime sur tout le reste — l'éducateur ne doit pas être ralenti pendant qu'il
intervient.

## Capabilities and Constraints

- Fonctionne intégralement hors ligne après la première ouverture (PWA,
  service worker).
- Cinq modes de cotation d'objectifs, chacun avec son propre widget de saisie.
- Verrouillage par code chiffré (4-6 chiffres) ou mot de passe, verrouillage
  automatique à la mise en veille et après 10 min d'inactivité, blocage
  progressif après codes erronés.
- Export Excel restructuré autour de ce qui reste à transmettre.
- Contrainte technique délibérée : tout le code applicatif tient dans un seul
  fichier `src/App.jsx` (~10 300 lignes), pas d'outillage de build modulaire
  local — voir CLAUDE.md pour la justification.
- Piège connu : DatABA et DatABA Manager partagent le même `localStorage` sous
  la même adresse `github.io` ; toute suppression de données doit rester
  bornée au préfixe `aba:` (jamais de clear global).
- Pas de listes de vérification de fidélité procédurale embarquées : la
  supervision humaine du programme d'intervention ne se remplace pas par des
  cases à cocher.

## Brand Commitments

Nom du produit : DatABA (application sœur : DatABA Manager). Aucune identité
visuelle de marque externe imposée à ce jour.

## Evidence on Hand

Les personnes accompagnées sont identifiées par initiales uniquement (ex.
« J.D. ») — aucun nom, date de naissance ou adresse. À ne pas fabriquer dans
un contenu de démonstration ou de maquette.

## Product Principles

- La vitesse de cotation en situation prime sur toute autre considération
  d'interface.
- Aucune donnée sensible ne quitte l'appareil sans export explicite et
  chiffré.
- L'application ne pousse jamais un usage automatique d'une donnée sensible
  sans relecture par un professionnel.
- Les outils de croisement (dans Manager) montrent des pistes à vérifier,
  jamais des preuves de causalité. La contrainte porte sur ce que l'outil
  calcule et présente, pas sur un texte à afficher : pas de rappel
  d'interprétation dans l'interface. Les textes d'accompagnement expliquent le
  fonctionnement de l'outil, jamais la méthode de celui qui lit.
- Un seul fichier applicatif assumé : pas de fragmentation en modules sans
  demande explicite.

## Accessibility & Inclusion

Utilisation tablette en mouvement, souvent à une main, en environnement de
salle variable (luminosité, bruit). Aucune exigence d'accessibilité normée
(WCAG, RGAA) formellement documentée à ce jour.
