import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import {
  Plus, X, Play, Pause, Square, Check, ChevronRight, Hash, Route, MessageSquare, Gift,
  Timer as TimerIcon, LayoutGrid, RotateCcw, Save,
  Users, Layers, AlertTriangle, Trash2, FileSpreadsheet, ListChecks,
  Volume2, VolumeX, TrendingUp, Upload, Download, Award, UserCog, Sun, Pencil,
  ListOrdered, Copy, StickyNote, Star, SlidersHorizontal, EyeOff, Eye, Target, PauseCircle, Lock, GripVertical, CalendarClock, CalendarDays, Maximize2, Minimize2, Flag, BookmarkPlus, ClipboardList, Link2,
  Menu, ChevronLeft, ChevronDown, Activity, Database, HelpCircle, Moon, Info, School,
} from 'lucide-react';

/* ==================== Design tokens ====================
   Valeurs posées par les variables CSS de index.css (--ink, --paper, etc.),
   qui basculent selon [data-theme] sur <html>. Ce ne sont pas des couleurs
   figées : elles s'adaptent au thème clair/sombre choisi dans le tiroir. */
const INK = 'var(--ink)';
const INK_SOFT = 'var(--ink-soft)';
const PAPER = 'var(--paper)';
const CARD = 'var(--card)';
const BORDER = 'var(--border)';
const CRISIS = 'var(--crisis)';
/* Fond de la barre de navigation du bas : un cran plus sombre que la page,
   pour que la pilule se détache sans devenir un bloc noir en bas d'écran. */
const NAV_BG = 'var(--nav-bg)';
/* Couleur d'accent : actions principales, sélection, états actifs.
   Utilisée avec parcimonie (mode Operate) — jamais en décoration. */
const ACCENT = 'var(--accent)';
const ACCENT_INK = 'var(--accent-ink)';
/* Fond teinté d'une ligne ou d'un bloc sélectionné : accent à faible
   opacité, calculé par thème (voir index.css). */
const ACCENT_WASH = 'var(--accent-wash)';
/* Couleur du bouton flottant ABC/observation, distincte de CRISIS pour ne
   jamais se confondre avec l'alerte crise. Théme-réactive (voir index.css) :
   charbon en clair comme l'accent, violet catégoriel en sombre. */
const COLOR_ABC = 'var(--color-abc)';

/* ==================== Palette catégorielle ====================
   Sert partout où plusieurs catégories doivent rester visuellement
   distinctes (guidances, types de cotation, fonctions de crise, courbes de
   suivi). Indépendante des tokens de surface ci-dessus : elle ne change pas
   avec le thème clair/sombre, choisie pour rester lisible sur les deux. */
const CAT_TEAL = '#00A870';
const CAT_INDIGO = '#3B5BDB';
const CAT_AMBER = '#FF8A3D';
const CAT_CORAL = '#FF4D6D';
const CAT_VIOLET = '#7C5CFF';
const CAT_CYAN = '#00B8D9';
const CAT_LILAC = '#A78BFA';
const CAT_SLATE = '#64748B';

/* Texte sur aplat catégoriel : la palette ci-dessus est fixe entre thèmes,
   donc son texte doit l'être aussi — pas de token accent-ink réactif ici.
   Le blanc fixe ne tient pas 4.5:1 sur l'ambre ni le corail ; on choisit noir
   ou blanc selon lequel des deux tient le meilleur contraste, plutôt que d'en
   présumer un seul pour toute la palette. */
function texteLisibleSur(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const contrasteBlanc = 1.05 / (L + 0.05);
  const contrasteNoir = (L + 0.05) / 0.05;
  return contrasteBlanc >= contrasteNoir ? '#fff' : '#000';
}

/* ==================== Points restés ouverts ====================
   Le document de décisions laisse plusieurs choix à trancher. Ils sont
   rassemblés ici plutôt qu'arbitrés dans le code : une seule ligne à changer
   le jour où la décision est prise, sans rouvrir les composants.

   Point 1 — tranché : le tiroir latéral se ferme par tap sur la zone visible
   à droite et par glissement, en plus du bouton de fermeture.

   Point 6 — retiré : la dérive visuelle de la pastille de suivi continu est
   remplacée par l'état dormant (aucun relevé aujourd'hui), qui dit la même
   chose sans mécanisme séparé à activer. */
const TIROIR_FERME_AU_TAP_DEHORS = true;
const TIROIR_FERME_AU_BALAYAGE = true;

const F_DISPLAY = "'Space Grotesk', system-ui, sans-serif";
const F_BODY = "'IBM Plex Sans', system-ui, sans-serif";
const F_MONO = "'IBM Plex Mono', ui-monospace, monospace";

function useFonts() {
  useEffect(() => {
    if (!document.getElementById('aba-fonts')) {
      const link = document.createElement('link');
      link.id = 'aba-fonts';
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap';
      // Chargement non bloquant : l'affichage ne dépend jamais du réseau
      link.media = 'print';
      link.onload = () => { link.media = 'all'; link.onload = null; };
      document.head.appendChild(link);
    }
    if (!document.getElementById('aba-anim')) {
      const style = document.createElement('style');
      style.id = 'aba-anim';
      /* Transition courte et de faible amplitude : beaucoup plus fiable qu'un
         déplacement de toute la page, qui provoquait des blancs de rendu. */
      style.textContent = `
@keyframes abaInFromRight { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: none; } }
@keyframes abaInFromLeft  { from { opacity: 0; transform: translateX(-18px); } to { opacity: 1; transform: none; } }
@keyframes abaTiroir { from { transform: translateX(-100%); } to { transform: none; } }
/* Essai qui vient d'être coté : accuse réception du tap sans jamais retarder
   le suivant — la cellule existait déjà (grise), seul son remplissage est
   neuf, donc l'animation ne rejoue que sur cette cellule précise. */
@keyframes abaTrialIn { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
.aba-trial-in { animation: abaTrialIn .15s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes abaToastIn { from { opacity: 0; transform: translate(-50%, 6px); } to { opacity: 1; transform: translate(-50%, 0); } }
.aba-toast-in { animation: abaToastIn .2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.aba-toast-out { opacity: 0; transform: translate(-50%, 4px); transition: opacity .16s ease-in, transform .16s ease-in; }
@media (prefers-reduced-motion: reduce) {
  @keyframes abaInFromRight { from { opacity: 1; } to { opacity: 1; } }
  @keyframes abaInFromLeft  { from { opacity: 1; } to { opacity: 1; } }
  @keyframes abaTiroir { from { transform: none; } to { transform: none; } }
  .aba-trial-in { animation: none; }
  .aba-toast-in { animation: none; transform: translate(-50%, 0); }
  .aba-toast-out { transition: opacity .16s ease-in; transform: translate(-50%, 0); }
}
[data-reorder] {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
[data-reorder] input,
[data-reorder] textarea {
  -webkit-user-select: text;
  user-select: text;
}`;
      document.head.appendChild(style);
    }
  }, []);
}

/* ==================== Constantes métier ==================== */
/* Guidances par défaut. La liste est modifiable dans l'écran Gestion :
   le drapeau "independent" désigne ce qui compte comme réussite autonome
   dans les pourcentages et les critères de maîtrise. */
const DEFAULT_GUIDANCE = [
  { code: 'I', label: 'Indépendant', color: CAT_TEAL, independent: true },
  { code: 'GP', label: 'Guidance partielle', color: CAT_AMBER, independent: false },
  { code: 'GT', label: 'Guidance totale', color: CAT_CORAL, independent: false },
  { code: '0', label: 'Mauvaise réponse', color: CAT_SLATE, independent: false },
];

/* Version du jeu de guidances préenregistrées. Incrémentée quand on en ajoute,
   pour compléter les listes déjà enregistrées sans écraser les personnalisations. */
const GUIDANCE_VERSION = 2;

/* Guidances retenues pour un objectif donné : sa sélection, ou toutes par défaut */
/* Guidances retenues pour un objectif donné.
   - guidanceSet : liste complète propre à l'objectif (ordre, couleurs, libellés,
     et surtout le drapeau "independent" décidé pour cette personne et cet objectif)
   - guidanceCodes : ancien format, simple sélection dans la liste globale
   - sinon : toutes les guidances de l'écran Gestion */
function objectiveGuidances(obj, guidances) {
  const all = guidances && guidances.length ? guidances : DEFAULT_GUIDANCE;
  const set = obj.config && obj.config.guidanceSet;
  if (set && set.length) return set;
  const codes = obj.config && obj.config.guidanceCodes;
  if (!codes || !codes.length) return all;
  const sel = all.filter((g) => codes.includes(g.code));
  return sel.length ? sel : all;
}
const GUIDANCE_PALETTE = [CAT_TEAL, CAT_INDIGO, CAT_AMBER, CAT_CORAL, CAT_VIOLET, CAT_CYAN, CAT_LILAC, CAT_SLATE];

function guidanceByCode(guidances, code) {
  return (guidances || DEFAULT_GUIDANCE).find((g) => g.code === code) || null;
}
function isIndependentCode(guidances, code) {
  const g = guidanceByCode(guidances, code);
  return g ? !!g.independent : code === 'I';
}

const TYPES = {
  trials: { label: 'Essais', short: 'Essais', icon: ListChecks, color: CAT_VIOLET },
  occurrence: { label: 'Occurrence', short: 'Occurrence', icon: Hash, color: CAT_TEAL },
  interval: { label: 'Intervalles', short: 'Intervalles', icon: LayoutGrid, color: CAT_LILAC },
  chaining: { label: 'Chaînage', short: 'Chaînage', icon: ListOrdered, color: CAT_CYAN },
  balance: { label: 'Équilibre', short: 'Équilibre', icon: Route, color: CAT_INDIGO },
};

/* Couleur commune à tout ce qui mesure une durée : le chronomètre par essai
   d'un objectif « essai par essai » et le chronomètre auxiliaire. */
const COLOR_CHRONO = CAT_AMBER;
/* Couleur du compteur auxiliaire. */
const COLOR_COMPTEUR = CAT_TEAL;

/* Un objectif enregistré avant la refonte peut porter un type retiré. On ne le
   ressuscite pas — on évite seulement qu'il fasse planter l'affichage. */
const TYPE_INCONNU = { label: 'Mode retiré', short: '—', icon: HelpCircle, color: INK_SOFT };
function typeMeta(type) {
  return TYPES[type] || TYPE_INCONNU;
}

/* Ce que mesure réellement un relevé par intervalle : à préciser pour que les données soient comparables */
const INTERVAL_MODES = [
  { k: 'momentane', label: 'Échantillonnage momentané', hint: 'On note ce qui se passe à l’instant précis du top' },
  { k: 'partiel', label: 'Intervalle partiel', hint: 'Noté si le comportement survient au moins une fois' },
  { k: 'total', label: 'Intervalle total', hint: 'Noté seulement si le comportement dure tout l’intervalle' },
];
const INTERVAL_MODE_SHORT = { momentane: 'momentané', partiel: 'partiel', total: 'total' };

/* Équilibre : chaque étape reçoit une issue, et deux marqueurs
   indépendants — une demande de la personne, et le moment du renforcement,
   qui varie d'une étape à l'autre. */
const BALANCE_OUTCOMES = [
  { k: 'reussi', label: 'Réussi', short: 'R', color: CAT_TEAL, reussite: true },
  { k: 'guide', label: 'Guidé', short: 'G', color: CAT_AMBER, reussite: false },
  { k: 'erreur', label: 'Mauvaise réponse', short: 'E', color: CAT_CORAL, reussite: false },
  { k: 'manque', label: 'Étape manquée', short: 'M', color: CAT_SLATE, reussite: false, exclu: true },
];

/* Réponses retenues pour un Équilibre : celles de l'objectif, sinon
   celles fournies par défaut. « reussite » désigne ce qui compte comme réussi,
   « exclu » ce qui sort du calcul — une étape non présentée n'est pas un échec. */
function balanceOutcomes(obj) {
  const l = obj && obj.config && obj.config.balanceOutcomes;
  return l && l.length ? l : BALANCE_OUTCOMES;
}
function outcomeMeta(obj, k) {
  return balanceOutcomes(obj).find((x) => x.k === k) || null;
}

/* --- Phases d'un objectif ---
   Distinguer ligne de base et intervention est indispensable pour interpréter
   une courbe : sans repère, on ne sait pas ce qui a produit un changement. */
const DEFAULT_PHASES = ['Ligne de base', 'Intervention', 'Maintien', 'Généralisation'];

/* --- Analyse des crises ---
   Catégories cochables en plus du texte libre. C'est ce qui rend les crises
   agrégeables : un texte seul ne se compte pas. */
const CRISIS_ANTECEDENTS = [
  'Consigne ou demande',
  'Transition',
  'Attente',
  'Refus',
  'Bruit ou stimulation',
  'Interaction avec un pair',
  'Imprévu, changement',
  'Arrêt de tâche plaisante',
  'Aucun déclencheur identifié',
];
const CRISIS_BEHAVIORS = [
  'Auto-agression',
  'Hétéro-agression',
  'Morsure',
  'Mise au sol',
  'Cris',
  'Jet d\'objet',
  'Destruction de matériel',
  'Fuite, départ de la pièce',
  'Refus, immobilité',
];
const CRISIS_CONSEQUENCES = [
  'Accès à la demande',
  'Attention de l\'adulte',
  'Accès à un objet ou une activité',
  'Retrait, mise à l\'écart',
  'Maintien de consigne',
];
/* Listes proposées par défaut. Elles sont recopiées dans les réglages au
   premier lancement, puis entièrement modifiables dans l'écran Gestion. */
const DEFAULT_ABC = {
  antecedents: CRISIS_ANTECEDENTS,
  comportements: CRISIS_BEHAVIORS,
  consequences: CRISIS_CONSEQUENCES,
};

/* Intensité ressentie par l'intervenant. Volontairement à trois niveaux :
   une échelle plus fine donnerait une fausse impression de précision sur un
   jugement qui reste subjectif. */
const CRISIS_INTENSITES = [
  { n: 1, label: 'Légère', aide: 'Gérable, retour au calme rapide', color: CAT_TEAL },
  { n: 2, label: 'Modérée', aide: 'A demandé un accompagnement soutenu', color: CAT_AMBER },
  { n: 3, label: 'Forte', aide: 'Difficilement contenue, retentissement marqué', color: CAT_CORAL },
];

const CRISIS_FUNCTIONS = [
  { k: 'attention', label: 'Attention', color: CAT_CYAN },
  { k: 'echappement', label: 'Échappement', color: CAT_AMBER },
  { k: 'tangible', label: 'Tangible', color: CAT_TEAL },
  { k: 'sensoriel', label: 'Sensoriel', color: CAT_VIOLET },
  { k: 'indetermine', label: 'Indéterminée', color: CAT_SLATE },
];

/* Trois lignes vides à la création — le placeholder porte le numéro, pas de
   texte à effacer avant de saisir. */
const DEFAULT_CHAIN_STEPS = [
  { id: 'st1', name: '' },
  { id: 'st2', name: '' },
  { id: 'st3', name: '' },
];

const DEFAULT_INTERVAL_LEVELS = [
  { id: 'lv1', name: 'Stable' },
  { id: 'lv2', name: 'Pré-crise' },
  { id: 'lv3', name: 'Crise' },
  { id: 'lv4', name: 'Post-crise' },
];
const LEVEL_COLORS = [CAT_TEAL, CAT_INDIGO, CAT_AMBER, CAT_CORAL, CAT_VIOLET, CAT_CYAN, CAT_LILAC, CAT_SLATE];

/* Types dont le score est un pourcentage : eux seuls portent des cibles successives */
const PERCENT_TYPES = ['trials', 'interval', 'chaining', 'balance'];
/* Types admettant un critère d'acquisition. Le comptage d'occurrences en a un
   lui aussi, mais sur un nombre brut et souvent dans l'autre sens : un
   comportement problème est acquis quand il passe *sous* le seuil. */
const MASTERY_TYPES = [...PERCENT_TYPES, 'occurrence'];
/* Types dont la cotation repose sur des niveaux de guidance */
const USES_GUIDANCE = ['trials', 'chaining'];
/* `sens` : 'min' = au moins le seuil (le défaut historique, et le seul sens qui
   ait du sens pour un pourcentage de réussite), 'max' = au plus le seuil. */
const DEFAULT_MASTERY = { threshold: 80, sessions: 3, unit: 'sessions', sens: 'min' };

/* ==================== Sécurité : code PIN et sauvegarde chiffrée ====================
   Tout se fait avec l'API Web Crypto du navigateur, sans aucun serveur.
   Le PIN n'est jamais stocké en clair : seul son empreinte (dérivée par PBKDF2)
   est conservée, avec un sel propre à cette installation. La sauvegarde est
   chiffrée avec un mot de passe distinct du PIN, saisi à chaque export/import. */

function toB64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(binary);
}
function fromB64(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function deriveAesKey(passphrase, salt) {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function encryptJSON(obj, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt);
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { format: 'aba-backup-encrypted', version: 1, salt: toB64(salt), iv: toB64(iv), data: toB64(ciphertext) };
}

async function decryptJSON(envelope, passphrase) {
  const key = await deriveAesKey(passphrase, fromB64(envelope.salt));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(envelope.iv) }, key, fromB64(envelope.data));
  return JSON.parse(new TextDecoder().decode(plain));
}

async function hashPin(pin, saltB64) {
  const salt = fromB64(saltB64);
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, keyMaterial, 256);
  return toB64(bits);
}
function newSalt() {
  return toB64(crypto.getRandomValues(new Uint8Array(16)));
}

/* --- Chiffrement des données au repos ---
   La clé est dérivée du code à l'ouverture et ne vit qu'en mémoire : elle
   n'est jamais écrite sur l'appareil. Sans le code, les données enregistrées
   ne sont plus lisibles telles quelles.
   À noter : un code court reste devinable par essais successifs si quelqu'un
   récupère le fichier ; c'est le verrou de la tablette et la limite de
   tentatives qui complètent réellement cette protection. */
let dataKey = null;

async function deriveDataKey(pin, saltB64) {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromB64(saltB64), iterations: 150000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptValue(plaintext, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  return JSON.stringify({ __enc: 1, iv: toB64(iv), data: toB64(ct) });
}

async function decryptValue(raw, key) {
  let env = null;
  try {
    env = JSON.parse(raw);
  } catch (e) {
    return raw; // ancien enregistrement en clair
  }
  if (!env || env.__enc !== 1) return raw;
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(env.iv) }, key, fromB64(env.data));
  return new TextDecoder().decode(plain);
}

/* --- Historique des séances, réparti par mois ---
   Tout garder sous une seule clé obligeait à réécrire et rechiffrer
   l'historique complet au moindre changement : le coût grandissait avec
   l'ancienneté de l'installation. Chaque mois a désormais sa propre clé, et
   seuls les mois réellement modifiés sont réécrits. */
const SESSIONS_INDEX = 'aba:sessions-index';
const moisDe = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return 'inconnu';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const grouperParMois = (sessions) => {
  const g = {};
  sessions.forEach((s) => {
    const k = moisDe(s.date);
    (g[k] = g[k] || []).push(s);
  });
  return g;
};

/* ==================== Écran de verrouillage ==================== */
/* Pavé numérique unique, utilisé en plein écran comme en fenêtre.
   Sans longueur connue, la saisie accepte 4 à 8 chiffres avec validation
   manuelle : c'est ce qui permet d'entrer un code plus long que prévu. */
function PinPad({ title, subtitle, onSubmit, error, digits, submitLabel, disabled, compact }) {
  const [value, setValue] = useState('');
  const flexible = !digits;
  const maxLen = digits || 8;
  const minLen = digits || 4;
  const showValidate = flexible || !!submitLabel;

  function press(d) {
    if (disabled || value.length >= maxLen) return;
    const next = value + d;
    setValue(next);
    if (!showValidate && next.length === digits) {
      onSubmit(next);
      setValue('');
    }
  }
  function validate() {
    if (value.length < minLen) return;
    onSubmit(value);
    setValue('');
  }

  const pave = (
    <>
      <div className={`flex justify-center gap-3 ${compact ? 'mb-4' : 'mb-6'}`}>
        {Array.from({ length: Math.max(minLen, value.length) }, (_, i) => (
          <div key={i} className={compact ? 'w-3.5 h-3.5 rounded-full border-2' : 'w-4 h-4 rounded-full border-2'}
            style={{ borderColor: ACCENT, backgroundColor: i < value.length ? ACCENT : 'transparent' }} />
        ))}
      </div>
      {error && <p className="text-sm text-center mb-3" style={{ color: CRISIS }}>{error}</p>}
      <div className={`grid grid-cols-3 ${compact ? 'gap-2' : 'gap-3'}`}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) =>
          d === '' ? <div key={i} /> : (
            <button
              key={i}
              onClick={() => (d === '⌫' ? setValue((v) => v.slice(0, -1)) : press(d))}
              disabled={disabled}
              className={`rounded-2xl font-medium active:scale-95 transition-transform disabled:opacity-40 ${compact ? 'py-3 text-lg rounded-xl' : 'py-4 text-xl'}`}
              style={{ backgroundColor: compact ? PAPER : CARD, color: INK, fontFamily: F_DISPLAY, border: `1px solid ${BORDER}` }}
            >
              {d}
            </button>
          )
        )}
      </div>
      {showValidate && (
        <Btn onClick={validate} disabled={disabled || value.length < minLen} className={`w-full ${compact ? 'mt-3 text-sm' : 'mt-5'}`}>
          {submitLabel || 'Valider'}
        </Btn>
      )}
    </>
  );

  if (compact) return <div>{pave}</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: PAPER, fontFamily: F_BODY }}>
      <div className="w-full max-w-xs">
        <h1 className="text-xl font-semibold text-center mb-1" style={{ fontFamily: F_DISPLAY, color: INK }}>{title}</h1>
        {subtitle && <p className="text-sm text-center mb-5" style={{ color: INK_SOFT }}>{subtitle}</p>}
        {pave}
      </div>
    </div>
  );
}

/* Champ de mot de passe, en plein écran ou en fenêtre selon « compact ». */
function PasswordScreen({ title, subtitle, onSubmit, error, disabled, label, compact }) {
  const [value, setValue] = useState('');
  const valider = () => { if (value.length >= 4) { onSubmit(value); setValue(''); } };

  const champ = (
    <>
      {error && <p className="text-sm text-center mb-3" style={{ color: CRISIS }}>{error}</p>}
      <input
        type="password"
        value={value}
        autoFocus
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') valider(); }}
        placeholder="Mot de passe"
        className="w-full rounded-xl border px-3 py-3 text-base bg-transparent mb-3"
        style={{ borderColor: BORDER, color: INK }}
      />
      <Btn onClick={valider} disabled={disabled || value.length < 4} className="w-full">
        {label || 'Valider'}
      </Btn>
      {!compact && <p className="text-xs text-center mt-3" style={{ color: INK_SOFT }}>Au moins 4 caractères.</p>}
    </>
  );

  if (compact) return <div>{champ}</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: PAPER, fontFamily: F_BODY }}>
      <div className="w-full max-w-xs">
        <h1 className="text-xl font-semibold text-center mb-1" style={{ fontFamily: F_DISPLAY, color: INK }}>{title}</h1>
        {subtitle && <p className="text-sm text-center mb-5" style={{ color: INK_SOFT }}>{subtitle}</p>}
        {champ}
      </div>
    </div>
  );
}

/* Délai imposé après plusieurs codes erronés. Il croît avec le nombre d'essais
   et survit à un redémarrage, puisqu'il est enregistré avec les réglages. */
function lockDelayMs(failed) {
  if (failed < 3) return 0;
  if (failed < 5) return 30 * 1000;
  if (failed < 8) return 5 * 60 * 1000;
  return 15 * 60 * 1000;
}

function LockScreen({ security, onUnlock, onSetup, onFailedAttempt }) {
  const digits = security.pinDigits || null; // null : longueur inconnue, saisie libre
  const [step, setStep] = useState(security.pinHash ? 'enter' : 'choose');
  const [newDigits, setNewDigits] = useState(4);
  const [newMode, setNewMode] = useState('pin');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const lockedUntil = security.lockUntil || 0;
  const waiting = lockedUntil > now;

  useEffect(() => {
    if (!waiting) return undefined;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [waiting]);

  async function handleEnter(pin) {
    if (waiting || busy) return;
    setBusy(true);
    const hash = await hashPin(pin, security.pinSalt);
    if (hash === security.pinHash) {
      onUnlock(pin);
      return; // busy reste actif : l'écran laisse place à l'application
    }
    setBusy(false);
    const failed = (security.failedAttempts || 0) + 1;
    const delay = lockDelayMs(failed);
    onFailedAttempt(failed, delay ? Date.now() + delay : 0);
    setError(delay ? 'Code incorrect — saisie suspendue' : 'Code incorrect');
    setTimeout(() => setError(''), 1500);
  }

  function handleCreate1(pin) {
    setFirstPin(pin);
    setStep('create2');
  }
  async function handleCreate2(pin) {
    if (pin !== firstPin) {
      setError('Les deux codes ne correspondent pas');
      setStep('create1');
      setFirstPin('');
      setTimeout(() => setError(''), 1500);
      return;
    }
    const salt = newSalt();
    const hash = await hashPin(pin, salt);
    await onSetup(hash, salt, newDigits, pin, newMode);
  }

  /* Choix de la longueur, à la toute première ouverture */
  if (step === 'choose') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: PAPER, fontFamily: F_BODY }}>
        <div className="w-full max-w-xs">
          <h1 className="text-xl font-semibold text-center mb-1" style={{ fontFamily: F_DISPLAY, color: INK }}>Protéger l'application</h1>
          <p className="text-sm text-center mb-5" style={{ color: INK_SOFT }}>
            Ce code verrouille l'accès et sert à chiffrer les données enregistrées sur cet appareil.
          </p>
          <div className="flex gap-2 mb-3">
            {[{ k: 'pin', l: 'Code chiffré' }, { k: 'password', l: 'Mot de passe' }].map((m) => (
              <button key={m.k} onClick={() => setNewMode(m.k)} className="flex-1 rounded-xl py-3 border text-sm font-medium"
                style={{ fontFamily: F_DISPLAY, borderColor: newMode === m.k ? ACCENT : BORDER, backgroundColor: newMode === m.k ? ACCENT : 'transparent', color: newMode === m.k ? ACCENT_INK : INK_SOFT }}>
                {m.l}
              </button>
            ))}
          </div>
          {newMode === 'pin' && (
            <div className="flex gap-2 mb-3">
              {[4, 6].map((n) => (
                <button key={n} onClick={() => setNewDigits(n)} className="flex-1 rounded-xl py-3 border text-sm font-medium"
                  style={{ fontFamily: F_DISPLAY, borderColor: newDigits === n ? ACCENT : BORDER, backgroundColor: newDigits === n ? ACCENT : 'transparent', color: newDigits === n ? ACCENT_INK : INK_SOFT }}>
                  {n} chiffres
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-center mb-5" style={{ color: INK_SOFT }}>
            {newMode === 'pin'
              ? '6 chiffres protègent nettement mieux les données que 4 en cas de perte de l\'appareil.'
              : 'Un mot de passe écrit protège mieux qu\'un code chiffré, mais se saisit plus lentement à chaque ouverture.'}
          </p>
          <Btn onClick={() => setStep('create1')} className="w-full">Continuer</Btn>
        </div>
      </div>
    );
  }

  if (step === 'enter') {
    const reste = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
    if (security.mode === 'password') {
      return (
        <div>
          <PasswordScreen
            title={waiting ? 'Saisie suspendue' : 'Application verrouillée'}
            subtitle={waiting
              ? `Trop d'essais. Nouvel essai possible dans ${fmtClock(reste * 1000)}.`
              : 'Saisissez votre mot de passe'}
            onSubmit={handleEnter}
            error={error}
            disabled={waiting}
            label="Déverrouiller"
          />
          <div className="fixed bottom-8 left-0 right-0 text-center">
            <button onClick={() => setShowReset(true)} className="text-xs underline" style={{ color: INK_SOFT }}>Mot de passe oublié ?</button>
          </div>
          {showReset && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'var(--overlay-backdrop)' }}>
              <div className="rounded-2xl p-5 max-w-xs w-full" style={{ backgroundColor: CARD }}>
                <h2 className="font-semibold mb-2" style={{ fontFamily: F_DISPLAY }}>Réinitialiser</h2>
                <p className="text-sm mb-4" style={{ color: INK_SOFT }}>
                  Les données étant chiffrées avec ce mot de passe, il n'existe aucun moyen de les
                  récupérer sans lui. La seule solution est d'effacer les données de DatABA, puis de
                  restaurer une sauvegarde si vous en avez une. Les autres applications installées
                  ne sont pas touchées.
                </p>
                <div className="flex gap-2">
                  <Btn onClick={async () => { await store.clearAll(); window.location.reload(); }} className="flex-1 text-sm" style={{ backgroundColor: CRISIS }}>
                    Effacer et recommencer
                  </Btn>
                  <Btn variant="ghost" onClick={() => setShowReset(false)} className="text-sm">Annuler</Btn>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
    return (
      <div>
        <PinPad
          title={waiting ? 'Saisie suspendue' : busy ? 'Ouverture…' : 'Code verrouillé'}
          subtitle={waiting
            ? `Trop de codes erronés. Nouvel essai possible dans ${fmtClock(reste * 1000)}.`
            : busy
            ? 'Déchiffrement des données en cours'
            : digits
            ? `Saisissez votre code à ${digits} chiffres`
            : 'Saisissez votre code, puis validez'}
          onSubmit={handleEnter}
          error={error}
          digits={digits}
          disabled={waiting || busy}
        />
        <div className="fixed bottom-8 left-0 right-0 text-center">
          <button onClick={() => setShowReset(true)} className="text-xs underline" style={{ color: INK_SOFT }}>Code oublié ?</button>
        </div>
        {showReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'var(--overlay-backdrop)' }}>
            <div className="rounded-2xl p-5 max-w-xs w-full" style={{ backgroundColor: CARD }}>
              <h2 className="font-semibold mb-2" style={{ fontFamily: F_DISPLAY }}>Réinitialiser le code</h2>
              <p className="text-sm mb-4" style={{ color: INK_SOFT }}>
                Les données étant chiffrées avec ce code, il n'existe aucun moyen de les récupérer sans lui.
                La seule solution est de tout effacer sur cette tablette, puis de restaurer une sauvegarde
                chiffrée si vous en avez une.
              </p>
              <div className="flex gap-2">
                <Btn
                  onClick={async () => { await store.clearAll(); window.location.reload(); }}
                  className="flex-1 text-sm"
                  style={{ backgroundColor: CRISIS }}
                >
                  Effacer et recommencer
                </Btn>
                <Btn variant="ghost" onClick={() => setShowReset(false)} className="text-sm">Annuler</Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (newMode === 'password') {
    return (
      <PasswordScreen
        key={step}
        title={step === 'create1' ? 'Créer un mot de passe' : 'Confirmez'}
        subtitle={step === 'create1' ? 'Il servira aussi à chiffrer les données' : 'Ressaisissez le même mot de passe'}
        onSubmit={step === 'create1' ? handleCreate1 : handleCreate2}
        error={error}
        label={step === 'create1' ? 'Continuer' : 'Valider'}
      />
    );
  }

  return (
    <PinPad
      title={step === 'create1' ? 'Créer un code' : 'Confirmez le code'}
      subtitle={step === 'create1' ? `Choisissez un code à ${newDigits} chiffres` : 'Ressaisissez le même code'}
      onSubmit={step === 'create1' ? handleCreate1 : handleCreate2}
      error={error}
      digits={newDigits}
    />
  );
}

/* ==================== Stockage ====================
   Dans Claude, window.storage est disponible. Une fois l'application hébergée
   ailleurs (PWA, APK, iOS), il n'existe plus : on bascule sur localStorage.
   Les données restent dans tous les cas sur l'appareil. */
const store = {
  /* Lecture et écriture brutes, sans chiffrement : réservées aux réglages de
     sécurité eux-mêmes, qui doivent être lisibles avant la saisie du code. */
  async getRaw(key) {
    if (typeof window !== 'undefined' && window.storage) {
      try {
        const r = await window.storage.get(key, false);
        return r && r.value ? r.value : null;
      } catch (e) {
        return null;
      }
    }
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  async setRaw(key, value) {
    if (typeof window !== 'undefined' && window.storage) {
      try {
        await window.storage.set(key, value, false);
        return true;
      } catch (e) {
        return false;
      }
    }
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  },
  /* Lecture et écriture des données : chiffrées dès qu'une clé est disponible.
     Un enregistrement antérieur laissé en clair reste lu correctement, puis
     réécrit chiffré à la première modification. */
  async get(key) {
    const raw = await store.getRaw(key);
    if (raw == null || !dataKey) return raw;
    try {
      return await decryptValue(raw, dataKey);
    } catch (e) {
      return null; // clé incorrecte ou enregistrement abîmé
    }
  },
  async set(key, value) {
    if (!dataKey) return store.setRaw(key, value);
    try {
      return store.setRaw(key, await encryptValue(value, dataKey));
    } catch (e) {
      return false;
    }
  },
  /* Efface UNIQUEMENT les clés de cette application.
     Les deux applications DatABA sont publiées sous la même adresse
     (nom.github.io) et partagent donc le même espace de stockage : un
     effacement global emporterait aussi les données de l'autre. */
  async clearAll() {
    if (typeof window !== 'undefined' && window.storage) {
      try {
        const list = await window.storage.list('aba:', false);
        if (list && list.keys) await Promise.all(list.keys.map((k) => window.storage.delete(k, false)));
        return true;
      } catch (e) {
        return false;
      }
    }
    try {
      const aSupprimer = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith('aba:')) aSupprimer.push(k);
      }
      aSupprimer.forEach((k) => window.localStorage.removeItem(k));
      return true;
    } catch (e) {
      return false;
    }
  },
};

/* ==================== Alerte d'intervalle (son + vibration) ==================== */
let audioCtx = null;

/* À appeler sur un geste utilisateur, sinon le navigateur bloque le son */
function primeAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) {}
}

function beep() {
  try {
    primeAudio();
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(1180, t + 0.16);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.36);
  } catch (e) {}
}

/* Vibration : non supportée par Safari sur iPhone/iPad, où seul le son
   fonctionnera. Sur Android, le motif court-pause-court est bien distinct
   d'une notification ordinaire. */
function vibrateSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

function alertInterval({ soundOn, vibrateOn }) {
  if (soundOn) beep();
  if (vibrateOn && vibrateSupported()) {
    try {
      navigator.vibrate([200, 100, 200, 100, 300]);
    } catch (e) {}
  }
}

/* ==================== Utilitaires ==================== */
function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
}
function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m} min ${String(r).padStart(2, '0')} s` : `${r} s`;
}
function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function dateKey(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}
function timeShort(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/* Conversions pour les champs datetime-local, qui travaillent en heure locale */
function toLocalInput(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d) ? null : d.toISOString();
}

/* Champs <input type="time"> de l'éditeur d'une journée de suivi continu : la
   date est celle de la journée qu'on corrige, seule l'heure se saisit — un
   relevé déplacé sur un autre jour disparaîtrait de la feuille ouverte. */
function heureInput(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function isoDepuisJourHeure(jour, hm) {
  if (!jour || !hm) return null;
  const d = new Date(`${jour}T${hm}`);
  return isNaN(d) ? null : d.toISOString();
}

/* Compteur et chronomètre auxiliaires : une donnée à part de la cotation
   elle-même, dans la même forme sur une entrée de séance et sur une fiche
   crise/ABC. `valideA` distingue « pas encore mesuré » (null) de « mesuré à
   zéro ». */
function mesuresVides() {
  return {
    compteur: { total: 0, valideA: null },
    chrono: { elapsedMs: 0, running: false, startedAt: null, valideA: null },
  };
}

/* Cellules d'export d'une mesure auxiliaire : vides tant que rien n'a été
   validé, jamais un zéro par défaut — la distinction compte pour Manager. */
function mesuresExport(mesures) {
  const compteur = mesures && mesures.compteur;
  const chrono = mesures && mesures.chrono;
  const dates = [compteur && compteur.valideA, chrono && chrono.valideA].filter(Boolean).sort();
  return {
    compteurTotal: compteur && compteur.valideA ? compteur.total : '',
    chronoSecondes: chrono && chrono.valideA ? Math.round((chrono.elapsedMs || 0) / 1000) : '',
    valideA: dates.length ? timeShort(dates[dates.length - 1]) : '',
  };
}

function emptyEntry(obj) {
  const base = (() => {
    if (obj.type === 'trials') return { trials: obj.config.trialCount ? Array(obj.config.trialCount).fill(null) : [], running: false, startedAt: null };
    if (obj.type === 'occurrence') return { count: 0 };
    if (obj.type === 'interval') return { marks: {}, segments: [] };
    if (obj.type === 'chaining') return { steps: {} };
    if (obj.type === 'balance') return { trials: [{ steps: {} }] };
    return null;
  })();
  if (!base) return {};
  return { ...base, mesures: mesuresVides() };
}

/* Un essai est enregistré soit comme un simple code (format d'origine), soit
   comme { code, ms } lorsque l'objectif chronomètre chaque essai. Ces deux
   accesseurs permettent de lire les deux sans distinction. */
function trialCode(t) {
  return t && typeof t === 'object' ? t.code : t;
}
function trialMs(t) {
  return t && typeof t === 'object' && typeof t.ms === 'number' ? t.ms : null;
}

/* Une cotation peut dater d'avant un changement de type d'objectif : on vérifie qu'elle correspond */
function entryMatches(obj, entry) {
  if (!entry) return false;
  if (obj.type === 'trials') return Array.isArray(entry.trials);
  if (obj.type === 'occurrence') return typeof entry.count === 'number';
  if (obj.type === 'interval') return !!entry.marks;
  if (obj.type === 'chaining') return !!entry.steps;
  if (obj.type === 'balance') return Array.isArray(entry.trials) || !!entry.steps;
  return false;
}

/* Fige les chronomètres encore en cours d'une cotation : celui des essais, à
   plat sur l'entrée, et celui de la mesure auxiliaire, imbriqué dans
   `mesures.chrono`. */
function figerChronos(entry, stamp) {
  if (!entry) return entry;
  let next = entry;
  if (entry.running && entry.startedAt) {
    next = { ...next, running: false, elapsedMs: (entry.elapsedMs || 0) + (stamp - entry.startedAt), startedAt: null };
  }
  const chrono = entry.mesures && entry.mesures.chrono;
  if (chrono && chrono.running && chrono.startedAt) {
    next = {
      ...next,
      mesures: {
        ...next.mesures,
        chrono: { ...chrono, running: false, elapsedMs: (chrono.elapsedMs || 0) + (stamp - chrono.startedAt), startedAt: null },
      },
    };
  }
  return next;
}

/* Relance à chaque essai : sur les modes à essais discrets (trials, chaînage,
   balance program), le compteur et/ou le chrono auxiliaires peuvent se figer
   sous l'essai qu'on vient de coter puis repartir de zéro pour le suivant.
   `cle` est l'index de l'essai (trials, balance) ou l'id de l'étape
   (chaînage). Retourne le seul patch à fusionner sur l'entrée — un objet vide
   si aucune des deux relances n'est active. */
function relancerMesures(entry, cle, compteurParEssai, chronoParEssai, stamp) {
  if (!compteurParEssai && !chronoParEssai) return {};
  const m = (entry && entry.mesures) || mesuresVides();
  const essais = { ...((entry && entry.mesuresEssais) || {}) };
  const capture = { ...(essais[cle] || {}) };
  let mesures = m;
  const iso = new Date(stamp).toISOString();
  if (compteurParEssai) {
    capture.compteur = { ...m.compteur, valideA: m.compteur.valideA || iso };
    mesures = { ...mesures, compteur: { total: 0, valideA: null } };
  }
  if (chronoParEssai) {
    const c = m.chrono;
    const fige = c.running
      ? { ...c, running: false, elapsedMs: (c.elapsedMs || 0) + (stamp - c.startedAt), startedAt: null }
      : c;
    capture.chrono = { ...fige, valideA: fige.valideA || iso };
    mesures = { ...mesures, chrono: { elapsedMs: 0, running: false, startedAt: null, valideA: null } };
  }
  essais[cle] = capture;
  return { mesures, mesuresEssais: essais };
}

/* Après la suppression d'un essai indexé (annuler un essai en trials, retirer
   un essai en balance), les mesures capturées aux index suivants doivent
   glisser d'un cran pour rester alignées sur l'essai qu'elles décrivent. Sans
   cela, une mesure resterait accrochée au mauvais essai après l'annulation. */
function reindexMesuresEssais(mesuresEssais, indexSupprime) {
  if (!mesuresEssais) return mesuresEssais;
  const next = {};
  Object.entries(mesuresEssais).forEach(([k, v]) => {
    const i = Number(k);
    if (i === indexSupprime) return;
    next[i > indexSupprime ? i - 1 : i] = v;
  });
  return next;
}

/* Arrête les chronomètres encore en cours au moment de l'enregistrement */
function finalizeSession(session) {
  const stamp = Date.now();
  const data = {};
  Object.entries(session.data || {}).forEach(([sid, objs]) => {
    data[sid] = {};
    Object.entries(objs).forEach(([oid, entry]) => {
      data[sid][oid] = figerChronos(entry, stamp);
    });
  });
  return { ...session, data, endedAt: session.isEdit ? session.endedAt || stamp : stamp };
}

/* ==================== Séance mouvante ====================
   Sur le terrain une séance ne se déroule pas comme elle a été configurée :
   un jeune part, un autre arrive, un atelier en enchaîne un autre. Ces
   fonctions décrivent ces mouvements sur l'objet séance, hors de tout
   affichage — elles sont couvertes par tests/test_seance_souple.mjs. */

/* Fenêtre de présence d'une personne. Une séance enregistrée avant l'arrivée
   des entrées et sorties en cours de route n'a pas de champ `presence` : tout
   le monde y est réputé présent d'un bout à l'autre. */
function fenetrePresence(session, sid) {
  const debut = session ? session.startedAt : 0;
  const fin = session && session.endedAt ? session.endedAt : null;
  const p = session && session.presence && session.presence[sid];
  if (!p) return { from: debut, to: fin };
  return { from: p.from == null ? debut : p.from, to: p.to == null ? fin : p.to };
}

function estPresent(session, sid) {
  const p = session && session.presence && session.presence[sid];
  return !p || p.to == null;
}

/* Fenêtres de pause closes. La pause encore ouverte est bornée à `fin`, sans
   quoi une séance enregistrée alors qu'elle est en pause ne verrait jamais sa
   dernière pause décomptée. */
function fenetresPause(session, fin) {
  const bornes = [];
  ((session && session.pauses) || []).forEach((p) => {
    if (!p || p.from == null) return;
    const to = p.to == null ? fin : p.to;
    if (to != null && to > p.from) bornes.push({ from: p.from, to });
  });
  return bornes;
}

function chevauchementMs(a, b) {
  return Math.max(0, Math.min(a.to, b.to) - Math.max(a.from, b.from));
}

/* Durée de présence effective, pauses déduites. C'est elle qui fonde le temps
   d'activité à l'export : sans elle, une personne arrivée en cours de séance
   se verrait créditer la séance entière.

   Repli pour les séances antérieures à l'historique des pauses : elles n'ont
   qu'un `pausedMs` global, retiré tel quel dès lors que la personne a été
   présente d'un bout à l'autre. C'est le calcul qui avait cours jusqu'ici, et
   il reste exact dans ce cas précis. */
function dureePresence(session, sid) {
  if (!session || !session.startedAt) return 0;
  const finSeance = session.endedAt || session.startedAt;
  const f = fenetrePresence(session, sid);
  const debut = Math.max(f.from == null ? session.startedAt : f.from, session.startedAt);
  const fin = Math.min(f.to == null ? finSeance : f.to, finSeance);
  const brut = Math.max(0, fin - debut);
  if (!brut) return 0;
  const pauses = fenetresPause(session, finSeance);
  if (!pauses.length) {
    const couvreTout = debut <= session.startedAt && fin >= finSeance;
    return Math.max(0, brut - (couvreTout ? session.pausedMs || 0 : 0));
  }
  const enPause = pauses.reduce((n, p) => n + chevauchementMs({ from: debut, to: fin }, p), 0);
  return Math.max(0, brut - enPause);
}

/* Objectifs cochés d'office pour une personne dans un atelier : ce qui a été
   mémorisé pour elle dans cet atelier, à défaut ses objectifs prioritaires, à
   défaut tous. Ajouter quelqu'un en pleine séance ne doit pas renvoyer à
   l'écran de configuration. */
function objectifsParDefaut(student, atelier, mode) {
  if (!student) return [];
  const visibles = (student.objectives || []).filter((o) => (mode === 'balance' ? o.type === 'balance' : true));
  const ids = visibles.map((o) => o.id);
  const memorise = atelier && atelier.usualObjectives && atelier.usualObjectives[student.id];
  const retenus = memorise ? memorise.filter((oid) => ids.includes(oid)) : [];
  if (retenus.length) return retenus;
  const prioritaires = visibles.filter((o) => o.favorite).map((o) => o.id);
  return prioritaires.length ? prioritaires : ids;
}

/* Personnes concernées par Équilibre : celles qui portent au moins un
   objectif de ce type. La sélection Équilibre de Session ne doit proposer
   qu'elles — les autres n'ont rien à y coter. */
function personnesAvecEquilibre(students) {
  return (students || []).filter((s) => (s.objectives || []).some((o) => o.type === 'balance'));
}

/* Préremplissage complet d'un atelier au moment où on l'ouvre pour lancer une
   séance : la classe prévue ce jour-là, avec pour chacun ses objectifs
   mémorisés (les nouveaux depuis la mémorisation cochés d'office), à défaut
   ses prioritaires, à défaut tous. Extraite pour que le lancement rapide
   (bouton ▶ sur une ligne repliée) et le dépli complet calculent exactement
   la même chose — deux copies auraient fini par diverger. */
function configurerAtelier(students, atelier, jour, mode) {
  const favorites = (atelier && atelier.favoriteObjectiveIds) || [];
  if (!atelier) return { studentIds: [], selected: {}, favorites, nouveautes: {} };
  const ids = personnesPrevues(atelier, jour).filter((sid) => students.some((s) => s.id === sid));
  const savedObjectives = atelier.usualObjectives;
  const known = atelier.knownObjectiveIds;
  const visibleObjectives = (st) => (mode === 'balance' ? st.objectives.filter((o) => o.type === 'balance') : st.objectives);
  const selected = {};
  const nouveautes = {};
  ids.forEach((id) => {
    const st = students.find((s) => s.id === id);
    if (!st) return;
    const visibles = visibleObjectives(st);
    const visiblesIds = visibles.map((o) => o.id);
    const saved = savedObjectives && savedObjectives[id];
    if (!saved) { selected[id] = visiblesIds; return; }
    const retenus = saved.filter((oid) => visiblesIds.includes(oid));
    const nouveaux = visibles
      .filter((o) => !saved.includes(o.id))
      .filter((o) => (known ? !known.includes(o.id) : !!o.favorite))
      .map((o) => o.id);
    if (nouveaux.length) nouveautes[id] = nouveaux;
    selected[id] = [...retenus, ...nouveaux];
    if (!selected[id].length) selected[id] = visiblesIds;
  });
  return { studentIds: ids, selected, favorites, nouveautes };
}

/* Résumé en une ligne du réglage d'un objectif — ou d'un modèle, qui a la
   même forme amputée des seules clés d'instance. Partagé par la fiche
   personne et la bibliothèque de modèles pour ne pas en garder deux versions
   qui divergeraient. */
/* Seuil d'acquisition en toutes lettres, préposition comprise : un seul endroit
   pour la description d'un objectif et le badge de sa courbe. L'unité suit le
   type, le sens suit le critère. */
function libelleSeuil(obj) {
  const m = { ...DEFAULT_MASTERY, ...(obj.config.mastery || {}) };
  const unite = PERCENT_TYPES.includes(obj.type) ? '%' : 'occ.';
  return m.sens === 'max' ? `à ${m.threshold} ${unite} ou moins` : `à ${m.threshold} ${unite}`;
}

function descriptionObjectif(obj) {
  const meta = typeMeta(obj.type);
  let s = meta.short;
  if (obj.type === 'trials') s += obj.config.trialCount ? ` · ${obj.config.trialCount} essais prévus` : ' · essais sans limite';
  if (obj.type === 'interval') s += ` · toutes les ${fmtDuration(intervalStepSec(obj) * 1000)} · ${INTERVAL_MODE_SHORT[obj.config.intervalMode] || 'momentané'} · ${(obj.config.levels || []).length} niveaux`;
  if (obj.type === 'chaining' || obj.type === 'balance') s += ` · ${(obj.config.steps || []).length} étapes`;
  if (obj.config.mastery) s += ` · acquis ${libelleSeuil(obj)} sur ${obj.config.mastery.sessions} ${obj.config.mastery.unit === 'days' ? 'jours' : 'séances'}`;
  if (obj.config.avecCompteur) s += ' · compteur';
  if (obj.config.avecChrono) {
    s += (obj.config.chronoMode === 'countdown' && obj.config.chronoSeconds)
      ? ` · chrono limite ${fmtDuration(obj.config.chronoSeconds * 1000)}`
      : ' · chrono';
  }
  return s;
}

/* Un modèle est un objectif amputé de tout ce qui appartient à une instance
   suivie : id, priorité, cible en cours, cibles acquises, historique de
   phase, date de réinitialisation du suivi. Seul endroit qui sait ce qu'est
   un modèle — utilisé au signet comme à la création directe. */
function modeleDepuisObjectif(obj) {
  const { id, favorite, currentTargetId, masteredTargetIds, phaseHistory, trackingResetAt, ...reste } = obj;
  return { ...reste, id: uid() };
}

/* Un nom déjà pris est suffixé plutôt que rejeté — pas seulement pour les
   modèles (nomModeleDisponible ci-dessous) : le même besoin se pose pour un
   objectif importé qui porte le nom d'un objectif local différent (« garder
   les deux », voir diffObjectifsPersonne). */
function nomDisponible(nom, items, exceptId) {
  const pris = new Set((items || []).filter((t) => t.id !== exceptId).map((t) => t.name));
  if (!pris.has(nom)) return nom;
  let i = 2;
  while (pris.has(`${nom} (${i})`)) i++;
  return `${nom} (${i})`;
}

/* importConfig dédoublonne les modèles par `name` : deux homonymes locaux
   deviendraient indiscernables dans la liste puis silencieusement fusionnés
   au premier import, sans ce suffixage. */
function nomModeleDisponible(nom, templates, exceptId) {
  return nomDisponible(nom, templates, exceptId);
}

/* Projette la configuration d'un objectif sur son CONTENU, jamais ses ids.
   Neutralise le piège des ids par défaut, non générés par uid() (DEFAULT_
   CHAIN_STEPS : st1..st3 ; DEFAULT_INTERVAL_LEVELS : lv1..lv4 ; BALANCE_
   OUTCOMES : reussi/guide/erreur/manque) : ils coïncident naturellement
   entre deux tablettes tant que rien n'est personnalisé. Comparer par id
   déclarerait à tort un conflit entre deux objectifs identiques — ou
   l'inverse, laisserait passer deux objectifs réellement différents qui
   partagent un id par défaut non renommé. */
function configCanonique(type, config) {
  const c = config || {};
  const base = {
    avecCompteur: !!c.avecCompteur,
    compteurParEssai: !!c.compteurParEssai,
    avecChrono: !!c.avecChrono,
    chronoMode: c.chronoMode || null,
    chronoSeconds: c.chronoSeconds || null,
    chronoParEssai: !!c.chronoParEssai,
  };
  if (USES_GUIDANCE.includes(type)) {
    base.guidanceSet = (c.guidanceSet || []).map((g) => ({ code: g.code, label: g.label, independent: !!g.independent }));
  }
  if (MASTERY_TYPES.includes(type)) {
    base.mastery = c.mastery
      ? { threshold: c.mastery.threshold, sessions: c.mastery.sessions, unit: c.mastery.unit, sens: c.mastery.sens }
      : null;
  }
  if (PERCENT_TYPES.includes(type)) {
    base.targets = (c.targets || []).map((t) => t.name);
  }
  if (type === 'trials') {
    base.trialCount = c.trialCount || 0;
  }
  if (type === 'interval') {
    base.intervalSeconds = c.intervalSeconds || null;
    base.intervalMode = c.intervalMode || null;
    base.levels = (c.levels || []).map((l) => l.name);
    const niveauCible = (c.levels || []).find((l) => l.id === c.targetLevelId);
    base.targetLevelName = niveauCible ? niveauCible.name : null;
  }
  if (type === 'chaining' || type === 'balance') {
    base.steps = (c.steps || []).map((s) => s.name);
  }
  if (type === 'balance') {
    base.balanceOutcomes = (c.balanceOutcomes || []).map((o) => ({ label: o.label, short: o.short, reussite: !!o.reussite, exclu: !!o.exclu }));
  }
  return base;
}

/* Empreinte de contenu d'un objectif, en excluant exactement ce que
   modeleDepuisObjectif exclut déjà (id, priorité, progression en cours,
   historique de phase) — deux objectifs de même signature sont
   interchangeables du point de vue de la fusion. */
function signatureObjectif(obj) {
  return JSON.stringify({
    name: (obj.name || '').trim(),
    type: obj.type,
    config: configCanonique(obj.type, obj.config),
  });
}

/* objectiveSnapshot est indexé par objectiveId (construireDonneesSeance) :
   la présence de la clé suffit à savoir qu'une séance a figé cet objectif.
   C'est le verrou qui empêche un import de remplacer les cibles d'un
   objectif déjà coté — l'historique deviendrait un graphe de points
   orphelins. */
function objectifDejaCote(sessions, objectiveId) {
  return (sessions || []).some((se) => se && se.objectiveSnapshot && Object.prototype.hasOwnProperty.call(se.objectiveSnapshot, objectiveId));
}

/* Compare les objectifs importés d'une personne à ceux de son homologue
   local (déjà apparié — voir proposerRapprochementsPersonnes). Priorité :
   1. même id ET même signature → deja-aligne (silencieux)
   2. sinon même nom ET même signature → identique-contenu (remap silencieux,
      sûr : le contenu est prouvé identique)
   3. sinon même nom mais signature différente → conflit (arbitrage requis)
   4. sinon → nouveau (ajouté directement)
   Si l'id local a changé de nom en même temps qu'il divergeait, il n'est pas
   retrouvé au pas 2 et retombe en « nouveau » — limite assumée, un
   changement de nom et de contenu simultané des deux côtés est ambigu par
   nature. */
function diffObjectifsPersonne(locaux, importes) {
  return (importes || []).map((imp) => {
    const parId = (locaux || []).find((l) => l.id === imp.id);
    if (parId && signatureObjectif(parId) === signatureObjectif(imp)) {
      return { importe: imp, local: parId, statut: 'deja-aligne' };
    }
    const cible = (imp.name || '').trim().toLowerCase();
    const parNom = (locaux || []).find((l) => (l.name || '').trim().toLowerCase() === cible);
    if (parNom) {
      const statut = signatureObjectif(parNom) === signatureObjectif(imp) ? 'identique-contenu' : 'conflit';
      return { importe: imp, local: parNom, statut };
    }
    return { importe: imp, local: null, statut: 'nouveau' };
  });
}

/* L'inverse : instancie un objectif réel et indépendant à partir d'un
   modèle. Mêmes valeurs par défaut que la création via ObjectiveForm.submit
   quand `initial` est un modèle — utilisé ici sans passer par le formulaire,
   pour appliquer un modèle à plusieurs personnes d'un coup. */
function instancierModele(modele, nom) {
  const cibles = (modele.config && modele.config.targets) || [];
  return {
    id: uid(),
    name: (nom && nom.trim()) || modele.name,
    type: modele.type,
    config: modele.config,
    favorite: false,
    currentTargetId: cibles.length ? cibles[0].id : null,
    masteredTargetIds: [],
    phaseHistory: [{ id: uid(), name: DEFAULT_PHASES[0], date: null }],
  };
}

/* Monte l'instantané des objectifs et les cotations vides. Un seul endroit
   sait le faire : le lancement, l'arrivée d'une personne en cours de route et
   le passage à l'atelier suivant s'appuient tous dessus. */
function construireDonneesSeance(students, studentIds, selected, favorisAtelier, mode) {
  const snapshot = {};
  const data = {};
  (studentIds || []).forEach((sid) => {
    const st = (students || []).find((s) => s.id === sid);
    if (!st) return;
    data[sid] = {};
    ((selected && selected[sid]) || []).forEach((oid) => {
      const obj = (st.objectives || []).find((o) => o.id === oid);
      if (!obj) return;
      const cible = currentTarget(obj);
      // Prioritaire si l'objectif l'est en soi, ou s'il l'est pour cet atelier
      const favorite = !!obj.favorite || (mode !== 'balance' && (favorisAtelier || []).includes(oid));
      snapshot[oid] = { ...obj, favorite, activeTargetName: cible ? cible.name : null, activePhaseName: currentPhase(obj).name };
      data[sid][oid] = { ...emptyEntry(obj), targetId: cible ? cible.id : null };
    });
  });
  return { snapshot, data };
}

/* Arrivée en cours de séance. Une personne déjà passée par là et repartie
   retrouve sa place : ses cotations sont conservées, rien n'est recréé. */
function ajouterPersonne(session, student, oids, stamp, favorisAtelier) {
  if (!session || !student) return session;
  const sid = student.id;
  const presence = { ...(session.presence || {}) };
  if ((session.studentIds || []).includes(sid)) {
    presence[sid] = { from: presence[sid] && presence[sid].from != null ? presence[sid].from : stamp, to: null };
    return { ...session, presence };
  }
  const { snapshot, data } = construireDonneesSeance([student], [sid], { [sid]: oids }, favorisAtelier, session.mode);
  presence[sid] = { from: stamp, to: null };
  return {
    ...session,
    studentIds: [...(session.studentIds || []), sid],
    selectedObjectives: { ...(session.selectedObjectives || {}), [sid]: Object.keys(data[sid] || {}) },
    objectiveSnapshot: { ...(session.objectiveSnapshot || {}), ...snapshot },
    data: { ...(session.data || {}), [sid]: data[sid] || {} },
    presence,
  };
}

/* Départ en cours de séance : les cotations restent acquises, les
   chronomètres s'arrêtent là. À distinguer de la suppression, qui efface —
   d'où deux fonctions et deux commandes. */
function retirerPersonne(session, sid, stamp) {
  if (!session) return session;
  const presence = { ...(session.presence || {}) };
  const actuelle = presence[sid];
  presence[sid] = { from: actuelle && actuelle.from != null ? actuelle.from : session.startedAt, to: stamp };

  const maj = {};
  Object.entries((session.data || {})[sid] || {}).forEach(([oid, e]) => {
    maj[oid] = figerChronos(e, stamp);
  });

  return { ...session, presence, data: { ...(session.data || {}), [sid]: maj } };
}

/* Suppression : la personne n'aurait pas dû figurer dans cette séance. Tout ce
   qui la concerne s'en va, y compris les objectifs devenus orphelins de
   l'instantané. Destructif — l'appelant demande confirmation. */
function supprimerPersonne(session, sid) {
  if (!session) return session;
  const sansElle = (obj) => {
    const n = { ...(obj || {}) };
    delete n[sid];
    return n;
  };
  const studentIds = (session.studentIds || []).filter((x) => x !== sid);
  const selectedObjectives = sansElle(session.selectedObjectives);
  const encoreUtilises = new Set();
  studentIds.forEach((x) => (selectedObjectives[x] || []).forEach((oid) => encoreUtilises.add(oid)));
  const objectiveSnapshot = {};
  Object.entries(session.objectiveSnapshot || {}).forEach(([oid, o]) => {
    if (encoreUtilises.has(oid)) objectiveSnapshot[oid] = o;
  });
  return {
    ...session,
    studentIds,
    selectedObjectives,
    objectiveSnapshot,
    data: sansElle(session.data),
    notes: sansElle(session.notes),
    hidden: sansElle(session.hidden),
    presence: sansElle(session.presence),
    priorityOrder: (session.priorityOrder || []).filter((k) => k.split('|')[0] !== sid),
  };
}

/* Symétrique inverse de supprimerPersonne : au lieu de retirer une personne
   d'une séance, ne garde qu'elle. Une séance mixte (deux groupes dans le même
   atelier) ne doit jamais transmettre à une autre tablette les données d'un
   participant qu'elle n'a pas à détenir — c'est la brique de base du renvoi
   du suivi hors groupe (sessionsHorsGroupe). */
function sessionPourPersonne(session, sid) {
  if (!session) return session;
  const garder = (obj) => {
    const v = (obj || {})[sid];
    return v === undefined ? {} : { [sid]: v };
  };
  const studentIds = (session.studentIds || []).includes(sid) ? [sid] : [];
  const selectedObjectives = garder(session.selectedObjectives);
  const encoreUtilises = new Set(selectedObjectives[sid] || []);
  const objectiveSnapshot = {};
  Object.entries(session.objectiveSnapshot || {}).forEach(([oid, o]) => {
    if (encoreUtilises.has(oid)) objectiveSnapshot[oid] = o;
  });
  return {
    ...session,
    studentIds,
    selectedObjectives,
    objectiveSnapshot,
    data: garder(session.data),
    notes: garder(session.notes),
    hidden: garder(session.hidden),
    presence: garder(session.presence),
    priorityOrder: (session.priorityOrder || []).filter((k) => k.split('|')[0] === sid),
  };
}

/* Passage à l'atelier suivant. La séance en cours est close et enregistrée
   telle quelle, une nouvelle s'ouvre sur le nouvel atelier : l'atelier reste
   une propriété de la séance, ce qu'attendent l'export et DatABA Manager, et
   une fiche de crise ouverte reste rattachée à l'atelier où elle a commencé.
   `chainId` relie les deux séances, sur le principe des crises enchaînées.

   Contrepartie assumée : le chronomètre repart de zéro. Un atelier a sa durée
   propre. */
function chainerAtelier(session, atelierId, plan, stamp) {
  const chainId = session.chainId || session.id;
  const close = finalizeSession({ ...session, chainId, chainIndex: session.chainIndex || 1 });
  const studentIds = (plan && plan.studentIds) || [];
  const { snapshot, data } = construireDonneesSeance(plan.students, studentIds, plan.selected, plan.favorites, session.mode);
  const presence = {};
  const selectedObjectives = {};
  studentIds.forEach((sid) => {
    presence[sid] = { from: stamp, to: null };
    selectedObjectives[sid] = Object.keys(data[sid] || {});
  });
  const next = {
    id: uid(),
    date: new Date(stamp).toISOString(),
    startedAt: stamp,
    mode: session.mode,
    atelierId: session.mode === 'balance' ? null : atelierId,
    intervenantId: session.intervenantId || null,
    doubleCotation: !!session.doubleCotation,
    chainId,
    chainIndex: (session.chainIndex || 1) + 1,
    studentIds,
    selectedObjectives,
    objectiveSnapshot: snapshot,
    notes: {},
    data,
    presence,
    pauses: [],
  };
  return { close, next };
}

/* Pas d'un relevé par intervalle, en secondes. Les objectifs enregistrés avant
   la durée libre n'ont qu'un nombre de minutes : on le convertit. */
function intervalStepSec(obj) {
  const c = (obj && obj.config) || {};
  if (c.intervalSeconds) return c.intervalSeconds;
  return (c.intervalMinutes || 5) * 60;
}

/* --- Cotation par intervalle : relevés en direct + périodes saisies à la main ---
   Les deux sources sont ramenées à une durée en minutes, ce qui permet de les
   additionner. Un relevé en direct vaut la durée d'un intervalle ; une période
   saisie vaut sa durée réelle. */
function parseHM(hm) {
  if (!hm || typeof hm !== 'string') return null;
  const m = hm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function segmentMinutes(seg) {
  const a = parseHM(seg.start);
  const b = parseHM(seg.end);
  if (a === null || b === null) return 0;
  return b > a ? b - a : 0;
}
function segmentSeconds(seg) {
  return segmentMinutes(seg) * 60;
}

/* Cumuls en secondes : relevé en direct et période saisie à la main se
   additionnent alors quelle que soit la durée du pas. */
function intervalTotals(obj, entry) {
  const step = intervalStepSec(obj);
  const totals = {};
  Object.values(entry.marks || {}).forEach((lid) => {
    if (lid) totals[lid] = (totals[lid] || 0) + step;
  });
  (entry.segments || []).forEach((s) => {
    const d = segmentSeconds(s);
    if (d > 0 && s.levelId) totals[s.levelId] = (totals[s.levelId] || 0) + d;
  });
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  return { totals, total };
}

/* Intervalles traversés par une crise, pour signalement dans le relevé */
function crisisIntervals(session, crises, stepMinutes, studentId) {
  const set = new Set();
  if (!session || !crises || !stepMinutes) return set;
  const stepMs = stepMinutes * 60000;
  crises.forEach((c) => {
    if (c.sessionId !== session.id) return;
    if (c.studentId && studentId && c.studentId !== studentId) return;
    const start = new Date(c.date).getTime();
    if (isNaN(start)) return;
    const end = start + (c.durationMs || 0);
    const first = Math.max(1, Math.floor((start - session.startedAt) / stepMs) + 1);
    const last = Math.max(1, Math.floor((end - session.startedAt) / stepMs) + 1);
    for (let i = first; i <= last && i - first < 500; i++) set.add(i);
  });
  return set;
}

/* ==================== Suivi continu ====================
   Relevés indépendants des séances, sur le même principe que les crises : un
   critère peut être noté à n'importe quel moment de la journée, dans ou hors
   atelier. Un relevé n'a pas de fin — il vaut jusqu'au suivant, comme un
   interrupteur, jusqu'à la fin de sa journée ou une clôture explicite.

   Les axes forment une bibliothèque : on en crée autant qu'il en faut (état
   émotionnel, engagement, douleur…), chacun avec sa propre liste de critères
   paramétrables, et chaque personne active ceux qui la concernent. Le nombre
   n'est plus plafonné ; c'est l'affichage qui s'adapte, la pastille de la barre
   du bas se bornant à PASTILLE_PAVES_MAX pavés suivis d'un compteur.

   Le suivi est dormant tant qu'aucun relevé n'a été noté aujourd'hui : le
   dernier relevé d'un autre jour ne compte pas, contrairement à la version
   précédente de cette fonctionnalité, qui affichait le plus récent relevé
   quel que soit son âge.

   Le croisement avec les ateliers se calcule après coup dans DatABA Manager,
   en comparant l'horodatage du relevé aux bornes des séances. Aucune saisie
   supplémentaire n'est demandée ici pour ça. */
const DEFAULT_CRITERES_SUIVI = [
  { k: 'stable', l: 'Stable', color: CAT_TEAL },
  { k: 'pre-crise', l: 'Pré-crise', color: CAT_AMBER },
  { k: 'crise', l: 'Crise', color: CRISIS },
  { k: 'post-crise', l: 'Post-crise', color: CAT_CYAN },
];

/* Clé volontairement fixe (pas uid()) : c'est l'identifiant de l'axe
   historique, celui que toutes les tablettes déjà en service migrent vers. */
const DEFAULT_SUIVIS = [
  { id: 'principal', nom: 'Suivi de stabilité', criteres: DEFAULT_CRITERES_SUIVI },
];

/* Le nombre d'axes n'est pas borné ; la pastille de la barre du bas, si : au
   delà, les pavés deviennent illisibles et la barre mange l'écran. Le reste se
   lit dans la feuille de choix, ouverte au tap. */
const PASTILLE_PAVES_MAX = 3;

/* Repli pour un critère renommé ou supprimé de la configuration : les relevés
   passés qui le portaient restent affichés, sans jamais ressusciter la clé
   retirée — même principe que TYPE_INCONNU pour les modes de cotation. */
const CRITERE_INCONNU = { k: null, l: 'Critère retiré', color: CAT_SLATE };

/* Palette proposée à la création d'un critère, indépendante de celle des
   guidances et des niveaux d'intervalle : ces listes n'ont pas à évoluer
   ensemble. */
const PALETTE_SUIVI = [CAT_TEAL, CAT_INDIGO, CAT_AMBER, CAT_CORAL, CAT_VIOLET, CRISIS, CAT_CYAN, CAT_LILAC, CAT_SLATE];

function metaCritere(criteres, k) {
  return (criteres || []).find((c) => c.k === k) || CRITERE_INCONNU;
}

function axeDe(suivis, suiviId) {
  return (suivis || []).find((s) => s.id === suiviId) || null;
}

/* Même jour calendaire, en heure locale. Partagé avec libelleJour. */
function memeJour(x, y) {
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/* Relevés d'une personne sur un axe, pour le jour local de `ref`, triés du
   plus ancien au plus récent. Les clôtures y figurent : elles bornent le
   dernier segment de la journée. */
function relevesDuJour(releves, studentId, suiviId, ref) {
  const refDate = ref ? new Date(ref) : new Date();
  return (releves || [])
    .filter((r) => r && r.studentId === studentId && r.suiviId === suiviId)
    .map((r) => ({ r, d: new Date(r.timestamp) }))
    .filter(({ d }) => !Number.isNaN(d.getTime()) && memeJour(d, refDate))
    .sort((a, b) => a.d - b.d)
    .map(({ r }) => r);
}

/* Nombre d'appuis d'un compteur pour le jour local de `ref` — l'équivalent de
   relevesDuJour pour un comptage, où seul le total du jour compte, pas la
   succession. */
function comptesCompteurJour(releves, studentId, compteurId, ref) {
  const refDate = ref ? new Date(ref) : new Date();
  return (releves || []).filter((r) => {
    if (!r || r.kind !== 'compteur' || r.studentId !== studentId || r.compteurId !== compteurId) return false;
    const d = new Date(r.timestamp);
    return !Number.isNaN(d.getTime()) && memeJour(d, refDate);
  }).length;
}

/* Relevé en vigueur pour le jour de `ref` : le dernier relevé du jour, ou
   `null` si aucun n'existe encore ou si le dernier est une clôture — c'est ce
   qui rend un suivi dormant. */
function critereCourant(releves, studentId, suiviId, ref) {
  const jour = relevesDuJour(releves, studentId, suiviId, ref);
  if (!jour.length) return null;
  const dernier = jour[jour.length - 1];
  return dernier.fin ? null : dernier;
}

function suiviDormant(releves, studentId, suiviId, ref) {
  return !critereCourant(releves, studentId, suiviId, ref);
}

/* Découpage de la journée en segments proportionnels à leur durée réelle,
   pour la frise de l'onglet Suivi. Le dernier segment court jusqu'à
   `maintenant` s'il est fourni ; une clôture le borne à sa place ; à défaut
   des deux, sa durée reste inconnue (`ms: null`) plutôt que d'être étirée
   jusqu'à minuit — ce serait inventer une donnée jamais saisie. */
function segmentsJournee(releves, studentId, suiviId, ref, maintenant) {
  const jour = relevesDuJour(releves, studentId, suiviId, ref);
  const segments = [];
  for (let i = 0; i < jour.length; i++) {
    const r = jour[i];
    if (r.fin) continue;
    const debut = new Date(r.timestamp).getTime();
    const suivant = jour[i + 1];
    let fin = null;
    if (suivant) fin = new Date(suivant.timestamp).getTime();
    else if (maintenant != null) fin = new Date(maintenant).getTime();
    segments.push({ debut, fin, critere: r.critere, ms: fin != null ? fin - debut : null });
  }
  return segments;
}

/* Jour local d'un horodatage, en « AAAA-MM-JJ » : la clé de regroupement des
   journées de suivi continu, et l'ancre du champ heure de leur éditeur. Pas
   `toISOString().slice(0, 10)`, qui bascule de jour en fin de soirée. */
function jourLocal(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* L'intervenant en poste n'est valable que pour le jour où il a été choisi :
   périmé dès que la date locale change, il redevient vide et se redemande
   plutôt que d'attribuer silencieusement les relevés du lendemain à
   quelqu'un qui n'est peut-être plus là. */
function posteValide(poste, maintenant) {
  return !!(poste && poste.intervenantId && poste.jour === jourLocal(maintenant));
}

/* Contexte de traçabilité attaché à un relevé au moment de sa création : en
   séance, l'intervenant, la séance et l'atelier en cours ; hors séance, seul
   l'intervenant en poste est connu, à condition d'être encore valide pour
   aujourd'hui — jamais de séance ni d'atelier devinés hors cotation. */
function contexteReleve(activeSession, poste, maintenant) {
  if (activeSession) {
    return {
      intervenantId: activeSession.intervenantId || null,
      sessionId: activeSession.id || null,
      atelierId: activeSession.atelierId || null,
    };
  }
  return {
    intervenantId: posteValide(poste, maintenant) ? poste.intervenantId : null,
    sessionId: null,
    atelierId: null,
  };
}

/* Durée d'un relevé, en ms, jusqu'au relevé suivant du même couple
   personne/axe — une clôture borne le segment comme n'importe quel successeur.
   `null` tant qu'aucun successeur n'existe : on ne devine pas une durée qui n'a
   pas encore été bornée, même principe que segmentsJournee.

   C'est ce calcul qu'emprunte la fiche crise ouverte par un relevé « crise » :
   sa durée est l'écart entre l'appui et le passage à l'état suivant. */
function dureeReleve(releves, releveId) {
  const source = (releves || []).find((r) => r && r.id === releveId);
  if (!source || source.fin) return null;
  const debut = new Date(source.timestamp).getTime();
  if (Number.isNaN(debut)) return null;
  let fin = null;
  (releves || []).forEach((r) => {
    if (!r || r.id === releveId) return;
    if (r.studentId !== source.studentId || r.suiviId !== source.suiviId) return;
    const t = new Date(r.timestamp).getTime();
    if (Number.isNaN(t) || t <= debut) return;
    if (fin == null || t < fin) fin = t;
  });
  return fin == null ? null : fin - debut;
}

/* Journées de suivi continu, une entrée par personne × axe × jour : la maille
   à laquelle l'écran Export les liste, les coche et les archive. Une journée
   est envoyée quand tous ses relevés le sont — un relevé ajouté après coup la
   fait ressortir du lot déjà transmis, ce qui est le comportement voulu. */
function journeesSuivi(releves, students, suivis, studentFilter) {
  const keep = (sid) => !studentFilter || studentFilter.includes(sid);
  const index = {};
  const ordre = [];
  (releves || []).forEach((r) => {
    if (!r || !keep(r.studentId)) return;
    const d = new Date(r.timestamp);
    if (Number.isNaN(d.getTime())) return;
    const jour = jourLocal(d);
    const estCompteur = r.kind === 'compteur';
    // Même maille personne × axe × jour, l'axe étant soit un axe de suivi
    // continu, soit un compteur — préfixé pour ne jamais entrer en collision
    // avec un id de suivi.
    const cle = `${r.studentId}|${estCompteur ? `c:${r.compteurId}` : r.suiviId}|${jour}`;
    if (!index[cle]) {
      const st = (students || []).find((s) => s.id === r.studentId);
      index[cle] = {
        cle,
        studentId: r.studentId,
        suiviId: estCompteur ? null : r.suiviId,
        compteurId: estCompteur ? r.compteurId : null,
        jour,
        date: new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString(),
        initials: (st || {}).initials || '?',
        nomAxe: estCompteur ? nomCompteur(compteurDe(st, r.compteurId)) : (axeDe(suivis, r.suiviId) ? nomAxe(axeDe(suivis, r.suiviId)) : 'Suivi retiré'),
        releves: [],
      };
      ordre.push(index[cle]);
    }
    index[cle].releves.push(r);
  });
  ordre.forEach((j) => {
    j.releves.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    j.envoye = j.releves.every((r) => !!r.sentAt);
  });
  return ordre.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/* Les crises n'ont porté un statut d'envoi qu'à partir de l'archive de l'écran
   Export. Sans reprise, toutes les fiches antérieures se présenteraient comme
   restant à transmettre. Une seule reprise est certaine : une crise rattachée à
   une séance déjà envoyée est partie avec son rapport — l'export l'y incluait
   systématiquement. Les fiches hors séance restent à transmettre : leur sort
   n'est pas déductible, et l'affirmer serait inventer une transmission.
   Idempotente : un `sentAt` déjà posé n'est jamais réécrit. */
function migrerEnvoisCrises(crises, sessions) {
  const envoyees = new Map();
  (sessions || []).forEach((s) => { if (s && s.sentAt) envoyees.set(s.id, s.sentAt); });
  return (crises || []).map((c) => {
    if (!c || c.sentAt !== undefined) return c;
    const quand = c.sessionId ? envoyees.get(c.sessionId) : null;
    return { ...c, sentAt: quand || null };
  });
}

/* Lignes de la feuille d'export « Suivi continu », sans en-tête. Une ligne par
   relevé, triées chronologiquement ; la durée jusqu'au relevé suivant du même
   couple personne/axe reste vide si ce relevé clôt la journée sans successeur
   le même jour — même principe que les étapes manquées de « Détail par
   essai », qui restent vides plutôt qu'à zéro pour ne pas fausser les
   moyennes. */
/* Trois colonnes ajoutées en bout de ligne, communes aux deux formes de
   relevé : le groupe de la personne (pas celui de la tablette qui exporte —
   une personne cotée hors de son groupe garde le sien), et le contexte du
   geste tel qu'enregistré par `contexteReleve`. Un relevé plus ancien que la
   traçabilité, ou pris hors séance, laisse ces cases vides plutôt que de
   deviner. */
function lignesSuiviExport(releves, students, suivis, studentFilter, groupes, intervenants, ateliers) {
  const keep = (sid) => !studentFilter || studentFilter.includes(sid);
  const intervenantName = (id) => (id && ((intervenants || []).find((i) => i.id === id) || {}).name) || '';
  const atelierName = (id) => (id && ((ateliers || []).find((a) => a.id === id) || {}).name) || '';
  const tries = (releves || [])
    .filter((r) => r && keep(r.studentId))
    .slice()
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return tries.map((r, i) => {
    const st = (students || []).find((s) => s.id === r.studentId);
    const d = new Date(r.timestamp);
    const contexte = [nomGroupe(groupes, st && st.groupeId), intervenantName(r.intervenantId), atelierName(r.atelierId)];
    // Un compteur n'a ni durée (chaque appui est ponctuel) ni critère : une
    // ligne à part, plutôt que de forcer sa forme dans celle d'un relevé de
    // suivi continu.
    if (r.kind === 'compteur') {
      return [
        d.toLocaleDateString('fr-FR'),
        timeShort(r.timestamp),
        libelleJour(d),
        st ? st.initials : '?',
        nomCompteur(compteurDe(st, r.compteurId)),
        'occurrence',
        '',
        ...contexte,
      ];
    }
    const axe = axeDe(suivis, r.suiviId);
    const suivant = tries.slice(i + 1).find((x) => x.studentId === r.studentId && x.suiviId === r.suiviId && x.kind !== 'compteur');
    let duree = '';
    if (!r.fin && suivant) {
      const dSuiv = new Date(suivant.timestamp);
      if (memeJour(d, dSuiv)) duree = Math.round((dSuiv - d) / 60000);
    }
    let critereLabel = '— fin —';
    if (!r.fin) {
      const meta = metaCritere(axe ? axe.criteres : [], r.critere);
      critereLabel = meta === CRITERE_INCONNU ? `${meta.l} (${r.critere})` : meta.l;
    }
    return [
      d.toLocaleDateString('fr-FR'),
      timeShort(r.timestamp),
      libelleJour(d),
      st ? st.initials : '?',
      axe ? nomAxe(axe) : 'Suivi retiré',
      critereLabel,
      duree,
      ...contexte,
    ];
  });
}

/* Alias transitoire pour un DatABA Manager pas encore mis à jour vers le
   suivi continu : seuls les relevés de l'axe historique, dans une des quatre
   clés d'origine, projetés au format v3 (`etat`). Ni le second axe ni les
   clôtures n'y figurent — un Manager v3 continue de fonctionner exactement
   comme avant, sans rien savoir de ce qu'il ne comprendrait pas. */
const CLES_ETAT_HISTORIQUES = new Set(DEFAULT_CRITERES_SUIVI.map((c) => c.k));
function releverAliasStabilite(releves) {
  return (releves || [])
    .filter((r) => r && !r.fin && r.suiviId === 'principal' && CLES_ETAT_HISTORIQUES.has(r.critere))
    .map((r) => ({ id: r.id, studentId: r.studentId, timestamp: r.timestamp, etat: r.critere, source: r.source || 'pastille' }));
}

/* Champs de traçabilité d'un relevé : absents des tablettes déjà en service,
   jamais devinés — un relevé ancien n'a ni intervenant ni contexte connus,
   et le rester est plus honnête qu'une valeur inventée. */
const TRACABILITE_RELEVE_PAR_DEFAUT = { intervenantId: null, sessionId: null, atelierId: null, appareilOrigine: null };

/* Migration depuis l'ancien format de relevé (`etat`, sans axe) : `etat`
   devient `critere`, chaque relevé gagne son `suiviId`. Idempotente — un
   relevé déjà au nouveau format traverse inchangé — pour pouvoir tourner à
   chaque chargement sans jamais avoir besoin d'un drapeau « déjà migré ».
   Gagne aussi ses champs de traçabilité s'il ne les a pas déjà : un relevé
   de compteur n'a jamais eu d'autre format à migrer, mais peut tout de même
   en manquer. */
function migrerReleves(releves) {
  return (releves || [])
    .filter((r) => r && r.studentId && r.timestamp)
    .map((r) => {
      // Un relevé de compteur n'a jamais eu d'autre format : rien à migrer,
      // et surtout pas lui donner un `suiviId` — il se confondrait avec un
      // relevé de suivi continu dans tout ce qui filtre dessus.
      if (r.kind === 'compteur') return { ...TRACABILITE_RELEVE_PAR_DEFAUT, ...r };
      const suiviId = r.suiviId || 'principal';
      if (r.critere !== undefined) return { ...TRACABILITE_RELEVE_PAR_DEFAUT, ...r, suiviId };
      return { ...TRACABILITE_RELEVE_PAR_DEFAUT, id: r.id, studentId: r.studentId, suiviId, timestamp: r.timestamp, critere: r.etat, source: r.source || 'pastille' };
    });
}

/* `student.suiviStabilite` (booléen) devient `student.suivisActifs`
   (identifiants d'axes) — idempotente, même principe. */
function migrerStudentsSuivi(students) {
  return (students || []).map((s) => {
    if (Array.isArray(s.suivisActifs)) return s;
    const { suiviStabilite, ...rest } = s;
    return { ...rest, suivisActifs: suiviStabilite ? ['principal'] : [] };
  });
}

/* `student.groupeId` : absent des tablettes déjà en service, ajouté à `null`
   plutôt que deviné — c'est cette valeur qui garde une personne visible sur
   toutes les tablettes tant que son groupe n'est pas renseigné. Idempotente,
   même principe que migrerStudentsSuivi. */
function migrerStudentsGroupe(students) {
  return (students || []).map((s) => ('groupeId' in s ? s : { ...s, groupeId: null }));
}

/* Personnes affichées sur l'écran Suivi de cette tablette. Deux replis
   volontaires, sans lesquels la mise à jour viderait l'écran le jour de sa
   mise en ligne : une tablette pas encore rattachée à un groupe voit tout le
   monde, et une personne sans groupe reste visible partout tant qu'elle n'est
   pas rangée. Le filtre ne se referme donc qu'à mesure que les groupes sont
   réellement configurés — jamais d'un coup, jamais par défaut. */
function personnesVisibles(students, groupeAppareil) {
  if (!groupeAppareil) return students || [];
  return (students || []).filter((s) => !s.groupeId || s.groupeId === groupeAppareil);
}

/* Repli pour un groupe supprimé alors que des personnes le portent encore :
   jamais de suppression en cascade, même principe que CRITERE_INCONNU. Un
   `groupeId` absent (aucun groupe assigné) est distinct d'un groupe
   supprimé — seul le second replie sur GROUPE_INCONNU. */
const GROUPE_INCONNU = { id: null, name: 'Groupe retiré' };
function groupeDe(groupes, id) {
  if (!id) return null;
  return (groupes || []).find((g) => g && g.id === id) || GROUPE_INCONNU;
}
function nomGroupe(groupes, id) {
  const g = groupeDe(groupes, id);
  return g ? g.name : '';
}

/* Personnes exportées vers une autre tablette : filtre STRICT, à l'inverse de
   personnesVisibles qui garde une personne sans groupe partout. Ici l'absence
   de groupe ne doit jamais faire partir une personne dans « mes profils » —
   l'ambiguïté de propriété serait pire qu'une omission. Un `groupeId` vide en
   argument (tablette pas encore rattachée) renvoie donc toujours une liste
   vide, même si des personnes locales partagent ce même « aucun groupe » —
   « exporter les profils de mon groupe » n'a pas de sens sans groupe. */
function profilsDuGroupe(students, groupeId) {
  if (!groupeId) return [];
  return (students || []).filter((s) => s.groupeId === groupeId);
}

/* Les seuls axes de suivi continu réellement référencés par les personnes
   exportées — pas tout le référentiel de la tablette source, qui peut porter
   des axes propres à d'autres groupes. */
function axesUtilises(students, axesSuivi) {
  const ids = new Set();
  (students || []).forEach((s) => (s.suivisActifs || []).forEach((id) => ids.add(id)));
  return (axesSuivi || []).filter((a) => a && ids.has(a.id));
}

/* Fichier destiné à une autre tablette : les profils (personnes + objectifs)
   d'un groupe, ou le référentiel complet lors d'une rediffusion depuis la
   tablette centrale (`portee: 'complet'`). La liste COMPLÈTE des groupes
   voyage toujours, quelle que soit la portée : c'est elle qui permet de
   résoudre un groupe importé par son nom plutôt que par un id qui n'a aucun
   sens sur la tablette qui reçoit (voir resoudreGroupeImporte). Ni ateliers,
   ni emploi du temps, ni les listes d'objectifs propres à un atelier — hors
   périmètre d'un profil de personne, déjà exclues d'exportConfig pour la
   même raison. */
function payloadProfils({ students, groupes, axesSuivi, appareil, portee, maintenant }) {
  return {
    format: 'aba-profils',
    version: 1,
    exportedAt: new Date(maintenant).toISOString(),
    appareil,
    portee,
    groupes,
    students,
    axesSuivi,
  };
}

/* Séances contenant au moins une personne d'un autre groupe que celui de
   cette tablette, projetées via sessionPourPersonne — une ligne par personne
   concernée, jamais la séance entière : une séance mixte ne doit repartir que
   pour son propriétaire. Une personne sans groupe reste sur place, propriété
   non tranchée, on ne devine pas — même principe que personnesVisibles. */
function sessionsHorsGroupe(sessions, students, groupeAppareil) {
  if (!groupeAppareil) return [];
  const resultats = [];
  (sessions || []).forEach((se) => {
    (se.studentIds || []).forEach((sid) => {
      const st = (students || []).find((s) => s.id === sid);
      if (st && st.groupeId && st.groupeId !== groupeAppareil) resultats.push(sessionPourPersonne(se, sid));
    });
  });
  return resultats;
}

/* crisis.studentId et releve.studentId sont déjà singuliers : un simple
   filtre suffit, pas de projection comme pour les séances. */
function crisesHorsGroupe(crises, students, groupeAppareil) {
  if (!groupeAppareil) return [];
  return (crises || []).filter((c) => {
    const st = (students || []).find((s) => s.id === c.studentId);
    return !!(st && st.groupeId && st.groupeId !== groupeAppareil);
  });
}
function relevesHorsGroupe(releves, students, groupeAppareil) {
  if (!groupeAppareil) return [];
  return (releves || []).filter((r) => {
    const st = (students || []).find((s) => s.id === r.studentId);
    return !!(st && st.groupeId && st.groupeId !== groupeAppareil);
  });
}

/* Fusion additive stricte des données de suivi reçues d'une autre tablette :
   jamais d'écrasement, jamais de fuite vers un studentId ou un objectiveId
   inconnus localement. C'est ce refus systématique de l'inconnu qui garantit
   qu'un fichier envoyé à la mauvaise tablette ne peut rien y déposer — pas
   même la question ne se pose, la donnée est rejetée avant d'être regardée.

   Une séance est rejetée EN BLOC dès qu'un seul de ses objectifs référencés
   (objectiveSnapshot) est inconnu de la personne concernée : jamais de fusion
   partielle qui laisserait un objectiveSnapshot à moitié reconnu. */
function fusionnerSuiviRecu({ sessionsLocales, crisesLocales, relevesLocales, studentsLocaux, recu }) {
  const studentIds = new Set((studentsLocaux || []).map((s) => s.id));
  const objectifsConnusDe = {};
  (studentsLocaux || []).forEach((s) => {
    objectifsConnusDe[s.id] = new Set((s.objectives || []).map((o) => o.id));
  });

  const idsSessionsLocales = new Set((sessionsLocales || []).map((s) => s.id));
  const idsCrisesLocales = new Set((crisesLocales || []).map((c) => c.id));
  const idsRelevesLocaux = new Set((relevesLocales || []).map((r) => r.id));

  let idInconnu = 0;
  let dejaPresentes = 0;

  const sessionsAcceptees = [];
  ((recu && recu.sessions) || []).forEach((se) => {
    if (idsSessionsLocales.has(se.id)) { dejaPresentes++; return; }
    const idsSession = se.studentIds || [];
    if (idsSession.length === 0 || !idsSession.every((sid) => studentIds.has(sid))) { idInconnu++; return; }
    const objectifsConnus = new Set();
    idsSession.forEach((sid) => (objectifsConnusDe[sid] || new Set()).forEach((oid) => objectifsConnus.add(oid)));
    const objectifsRequis = Object.keys(se.objectiveSnapshot || {});
    if (!objectifsRequis.every((oid) => objectifsConnus.has(oid))) { idInconnu++; return; }
    sessionsAcceptees.push(se);
  });

  const crisesAcceptees = [];
  ((recu && recu.crises) || []).forEach((c) => {
    if (idsCrisesLocales.has(c.id)) { dejaPresentes++; return; }
    if (!c.studentId || !studentIds.has(c.studentId)) { idInconnu++; return; }
    crisesAcceptees.push(c);
  });

  const relevesAcceptes = [];
  ((recu && recu.suivi) || []).forEach((r) => {
    if (idsRelevesLocaux.has(r.id)) { dejaPresentes++; return; }
    if (!r.studentId || !studentIds.has(r.studentId)) { idInconnu++; return; }
    relevesAcceptes.push(r);
  });

  return {
    sessions: [...(sessionsLocales || []), ...sessionsAcceptees],
    crises: [...(crisesLocales || []), ...crisesAcceptees],
    releves: [...(relevesLocales || []), ...relevesAcceptes],
    ignorees: { idInconnu, dejaPresentes },
  };
}

/* Normalisation d'initiales pour la COMPARAISON, jamais pour l'affichage :
   retrait des diacritiques (même principe que segmentAppareil), de toute
   ponctuation et des espaces, en majuscules. 'A.B.', 'ab', 'A B' → 'AB'. */
function normaliserInitiales(txt) {
  return (txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();
}

/* Un groupe importé ne se résout JAMAIS par son id brut — les groupes ne sont
   pas remappés à l'import (contrairement aux ateliers, voir importConfig) et
   un id d'origine n'a aucun sens sur la tablette qui reçoit. La résolution se
   fait par nom, seule information stable entre deux tablettes. */
function resoudreGroupeImporte(groupesLocaux, nomGroupeImporte) {
  const local = (groupesLocaux || []).find((g) => g && g.name === nomGroupeImporte);
  return local ? local.id : null;
}

/* Propose un rapprochement pour chaque personne importée, ne l'applique
   jamais : un id déjà présent localement est un signe fiable (import répété,
   tablette déjà alignée) ; sinon, mêmes initiales normalisées ET même groupe
   résolu ne valent que comme suggestion. Deux vrais homonymes du même groupe
   produisent la même proposition — limite assumée, à corriger à la main dans
   l'écran de rapprochement. */
function proposerRapprochementsPersonnes(studentsImportes, studentsLocaux, groupesImportes, groupesLocaux) {
  return (studentsImportes || []).map((importe) => {
    if ((studentsLocaux || []).some((s) => s.id === importe.id)) {
      return { importe, statut: 'deja-aligne', candidatLocalId: importe.id };
    }
    const groupeImp = groupeDe(groupesImportes, importe.groupeId);
    const groupeResolu = groupeImp ? resoudreGroupeImporte(groupesLocaux, groupeImp.name) : null;
    const cible = normaliserInitiales(importe.initials);
    const candidat = (studentsLocaux || []).find(
      (s) => normaliserInitiales(s.initials) === cible && (s.groupeId || null) === groupeResolu
    );
    if (candidat) return { importe, statut: 'a-confirmer', candidatLocalId: candidat.id };
    return { importe, statut: 'nouvelle', candidatLocalId: null };
  });
}

/* Compteur d'occurrence d'une personne, par id — repli explicite pour un
   compteur supprimé, même principe que CRITERE_INCONNU. */
const COMPTEUR_INCONNU = { id: null, nom: 'Compteur retiré' };
function compteurDe(student, compteurId) {
  return ((student && student.compteurs) || []).find((c) => c.id === compteurId) || COMPTEUR_INCONNU;
}

/* Nom affichable d'un axe de suivi continu ou d'un compteur d'occurrence : ils
   naissent sans nom (champ vide à placeholder, pas de valeur à effacer), donc
   tant qu'ils ne sont pas renommés, ce repli évite une ligne muette dans la
   frise, la fiche d'une personne ou l'export. */
function nomAxe(axe) {
  return (axe && axe.nom && axe.nom.trim()) || 'Suivi sans nom';
}
function nomCompteur(c) {
  return (c && c.nom && c.nom.trim()) || 'Compteur sans nom';
}

/* Repli sur la configuration par défaut si aucun axe n'a encore été
   enregistré, et filtrage défensif des entrées mal formées — un axe stocké
   sans liste de critères, ou un critère sans clé, ne doit pas faire planter
   l'affichage. */
function migrerAxesSuivi(stocke) {
  if (!Array.isArray(stocke) || stocke.length === 0) return DEFAULT_SUIVIS;
  return stocke
    .filter((a) => a && a.id)
    .map((a) => {
      // L'axe historique (id « principal ») portait le nom de la
      // fonctionnalité elle-même ; les tablettes déjà en service le portent
      // encore. Un nom personnalisé, sur cet axe ou un autre, n'est jamais
      // écrasé — y compris un nom volontairement vide (axe créé mais pas
      // encore renommé) : `typeof` distingue ce cas de l'absence totale du
      // champ, seule situation où le nom par défaut s'applique.
      const nomParDefaut = a.id === 'principal' ? 'Suivi de stabilité' : 'Suivi continu';
      const nom = a.id === 'principal' && a.nom === 'Suivi continu'
        ? 'Suivi de stabilité'
        : typeof a.nom === 'string' ? a.nom : nomParDefaut;
      return { id: a.id, nom, criteres: (a.criteres || []).filter((c) => c && c.k) };
    });
}

/* Jours de la semaine dans l'ordre d'affichage d'un emploi du temps — lundi
   en tête, dimanche en fin. `k` est l'index natif de Date.getDay() (0 =
   dimanche), pour indexer emploiDuTemps sans conversion. */
const JOURS = [
  { k: 1, label: 'Lundi' },
  { k: 2, label: 'Mardi' },
  { k: 3, label: 'Mercredi' },
  { k: 4, label: 'Jeudi' },
  { k: 5, label: 'Vendredi' },
  { k: 6, label: 'Samedi' },
  { k: 0, label: 'Dimanche' },
];

/* Défense en lecture, sur le même principe que migrerAxesSuivi : une forme
   inattendue ne fait jamais planter l'affichage, seulement retomber sur une
   semaine vide. */
function migrerEmploiDuTemps(stocke) {
  if (!stocke || typeof stocke !== 'object' || Array.isArray(stocke)) return {};
  const propre = {};
  JOURS.forEach(({ k }) => {
    const liste = stocke[String(k)];
    if (Array.isArray(liste)) propre[String(k)] = liste.filter((id) => typeof id === 'string');
  });
  return propre;
}

/* Ateliers d'un jour, dans l'ordre de l'emploi du temps — un atelier
   supprimé depuis disparaît silencieusement, comme usualObjectives le fait
   déjà pour les objectifs disparus. */
function ateliersDuJour(emploiDuTemps, ateliers, jour) {
  const ids = (emploiDuTemps && emploiDuTemps[String(jour)]) || [];
  return ids.map((id) => (ateliers || []).find((a) => a.id === id)).filter(Boolean);
}

/* Reprend l'ordre d'un jour de référence pour un autre jour, sans jamais
   programmer ni déprogrammer d'atelier — seuls les ids déjà communs aux deux
   jours sont repositionnés. Les ateliers propres au jour cible (absents du
   jour de référence) se rangent entre le bloc commun et la queue commune
   contiguë : ainsi « commence par accueil, finit par goûter » survit même si
   le jour cible porte un atelier que le jour de référence n'a pas. Si le jour
   cible suit déjà l'ordre complet du jour de référence, rien ne bouge. */
function fusionnerOrdreJour(source, cible) {
  const src = source || [];
  const dst = cible || [];
  const communs = src.filter((id) => dst.includes(id));
  if (communs.length === 0) return dst;
  const propres = dst.filter((id) => !src.includes(id));
  let queue = [];
  for (let i = src.length - 1; i >= 0; i--) {
    if (dst.includes(src[i])) queue.unshift(src[i]);
    else break;
  }
  if (queue.length === src.length) queue = [];
  const communsSansQueue = communs.filter((id) => !queue.includes(id));
  return [...communsSansQueue, ...propres, ...queue];
}

/* Applique l'ordre d'un jour aux six autres, jour par jour, via
   fusionnerOrdreJour — un geste ponctuel, pas une règle permanente. Un jour
   sans atelier n'est pas touché. */
function appliquerOrdreAuxAutresJours(emploiDuTemps, jourSource) {
  const source = (emploiDuTemps && emploiDuTemps[String(jourSource)]) || [];
  const suivant = { ...emploiDuTemps };
  JOURS.forEach(({ k }) => {
    if (k === jourSource) return;
    const cle = String(k);
    const cible = emploiDuTemps[cle];
    if (!cible || cible.length === 0) return;
    suivant[cle] = fusionnerOrdreJour(source, cible);
  });
  return suivant;
}

/* Un atelier écarté, les restants de la semaine type en tête dans leur ordre
   — c'est le prochain qu'on cherche le plus souvent en enchaînant — avant les
   autres, inchangés. Partagée entre la proposition de lancement et le
   chaînage en cours de séance : deux copies auraient fini par diverger. */
function ordonnerPropositions(ateliers, restants, exclureId) {
  const autres = (ateliers || []).filter((a) => a.id !== exclureId);
  const idsRestants = new Set((restants || []).map((a) => a.id));
  return [...autres.filter((a) => idsRestants.has(a.id)), ...autres.filter((a) => !idsRestants.has(a.id))];
}

/* Ce qui reste à jouer aujourd'hui : les ateliers du jour dont aucune séance
   du jour même ne porte déjà l'atelierId. Fait avancer la proposition au fil
   de la journée sans état persistant supplémentaire — le chaînage enregistre
   une séance à chaque passage d'atelier. */
function planifierJour(emploiDuTemps, ateliers, sessions, maintenant) {
  const ref = new Date(maintenant);
  const jour = ref.getDay();
  const duJour = ateliersDuJour(emploiDuTemps, ateliers, jour);
  const joues = new Set(
    (sessions || [])
      .filter((s) => s.atelierId && memeJour(new Date(s.date), ref))
      .map((s) => s.atelierId)
  );
  const restants = duJour.filter((a) => !joues.has(a.id));
  return { jour, total: duJour.length, restants };
}

/* ==================== Personnes prévues, par jour ====================
   Un même atelier — le sport, typiquement — n'accueille pas le même groupe
   selon le jour. Plutôt qu'une liste par case de l'emploi du temps, qu'il
   faudrait ressaisir même quand rien ne change, l'atelier garde sa liste
   commune (`usualStudentIds`) et ne porte une variante que pour les jours qui
   s'en écartent :

       atelier.personnesParJour = { "2": ["sid1", "sid2"] }   // clé = getDay()

   Clé absente ⇒ repli sur la liste commune. Le champ n'existe pas tant que
   personne ne s'en sert : rien n'alourdit le paramétrage de ceux qui n'en ont
   pas besoin. Les objectifs, eux, restent communs à l'atelier — les faire
   varier par jour doublerait le réglage sans besoin exprimé. */
function personnesPrevues(atelier, jour) {
  if (!atelier) return [];
  const variante = jour != null && atelier.personnesParJour ? atelier.personnesParJour[String(jour)] : null;
  return Array.isArray(variante) ? variante : (atelier.usualStudentIds || []);
}

/* Toutes les personnes qu'un atelier accueille, un jour ou l'autre. C'est
   l'ensemble dont il faut régler les objectifs : quelqu'un qui ne vient que le
   mardi ne figure pas dans la liste commune. */
function personnesToutesPrevues(atelier) {
  if (!atelier) return [];
  const vues = new Set(atelier.usualStudentIds || []);
  Object.values(atelier.personnesParJour || {}).forEach((liste) => {
    (Array.isArray(liste) ? liste : []).forEach((sid) => vues.add(sid));
  });
  return Array.from(vues);
}

/* Jours pour lesquels l'atelier porte une liste propre, parmi ceux où il a
   lieu. Une variante posée sur un jour déprogrammé depuis ne compte pas : elle
   dort dans les données sans rien décrire. */
function joursAjustes(atelier, jours) {
  const variantes = (atelier && atelier.personnesParJour) || {};
  return (jours || []).filter((k) => Array.isArray(variantes[String(k)]));
}

/* Résumé d'un atelier pour sa ligne repliée dans PanneauEmploiDuTemps : les
   jours où il a lieu, l'effectif de sa classe habituelle, et les jours qui
   s'en écartent. */
function resumeAtelier(atelier, emploiDuTemps, students) {
  const jours = JOURS.filter((j) => ((emploiDuTemps && emploiDuTemps[String(j.k)]) || []).includes(atelier.id)).map((j) => j.k);
  const studentIds = (atelier.usualStudentIds || []).filter((sid) => (students || []).some((s) => s.id === sid));
  const tous = personnesToutesPrevues(atelier).filter((sid) => (students || []).some((s) => s.id === sid));
  const nbObjectifs = tous.reduce((n, sid) => n + (((atelier.usualObjectives || {})[sid] || []).length), 0);
  return { jours, nbPersonnes: studentIds.length, nbObjectifs, joursAjustes: joursAjustes(atelier, jours) };
}

/* ==================== Regroupement par jour ====================
   Les listes d'historique plafonnaient à quelques entrées, sans aucun moyen
   d'atteindre ce qui était plus ancien : la limite n'était pas seulement
   visuelle, elle rendait le reste inaccessible. Un jour replié ne coûte rien à
   l'affichage, il n'y a donc plus de raison de tronquer quoi que ce soit. */
function grouperParJour(items, dateDe) {
  const groupes = [];
  const index = {};
  (items || []).forEach((it) => {
    const d = new Date(dateDe(it));
    const valide = !Number.isNaN(d.getTime());
    const cle = valide ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '0000-00-00';
    if (!index[cle]) {
      index[cle] = { cle, date: valide ? d : null, items: [] };
      groupes.push(index[cle]);
    }
    index[cle].items.push(it);
  });
  groupes.sort((a, b) => (a.cle < b.cle ? 1 : a.cle > b.cle ? -1 : 0));
  return groupes;
}

function libelleJour(d, maintenant) {
  if (!d) return 'Date inconnue';
  const ref = maintenant ? new Date(maintenant) : new Date();
  const hier = new Date(ref.getTime() - 86400000);
  if (memeJour(d, ref)) return "Aujourd'hui";
  if (memeJour(d, hier)) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* Résumé texte d'une cotation, utilisé à l'écran et dans l'export */
function summarize(obj, entry, guidances) {
  if (!entryMatches(obj, entry)) return { result: '—', detail: '' };
  const gList = objectiveGuidances(obj, guidances);
  if (obj.type === 'trials') {
    const done = entry.trials.filter((t) => trialCode(t));
    const indep = done.filter((t) => isIndependentCode(gList, trialCode(t))).length;
    const pct = done.length ? Math.round((indep / done.length) * 100) : 0;
    const durees = done.map(trialMs).filter((m) => m != null);
    const moyenne = durees.length ? durees.reduce((a, b) => a + b, 0) / durees.length : null;
    return {
      result: done.length
        ? `${indep}/${done.length} indépendant (${pct} %)${moyenne != null ? ` · ${(moyenne / 1000).toFixed(1)} s en moyenne` : ''}`
        : 'Non coté',
      detail: entry.trials
        .map((t, i) => {
          const c = trialCode(t);
          if (!c) return '';
          const ms = trialMs(t);
          return `E${i + 1}:${c}${ms != null ? `(${(ms / 1000).toFixed(1)}s)` : ''}`;
        })
        .filter(Boolean)
        .join(' '),
    };
  }
  if (obj.type === 'occurrence') {
    return { result: `${entry.count} occurrence${entry.count !== 1 ? 's' : ''}`, detail: '' };
  }
  if (obj.type === 'interval') {
    const levels = obj.config.levels || [];
    const { totals, total } = intervalTotals(obj, entry);
    if (!total) return { result: 'Non coté', detail: '' };
    const mode = INTERVAL_MODE_SHORT[obj.config.intervalMode] || '';
    const named = levels.filter((l) => totals[l.id]).map((l) => ({ name: l.name, sec: totals[l.id] }));
    const top = named.slice().sort((a, b) => b.sec - a.sec)[0];
    const manual = (entry.segments || []).filter((s) => segmentSeconds(s) > 0).length;
    return {
      result: `${fmtDuration(total * 1000)} cotées · dominant : ${top ? top.name : '—'}`,
      detail: `${named.map((c) => `${c.name}: ${fmtDuration(c.sec * 1000)} (${Math.round((c.sec / total) * 100)} %)`).join(' | ')}${mode ? ` (${mode})` : ''}${manual ? ` [${manual} période${manual > 1 ? 's' : ''} saisie${manual > 1 ? 's' : ''} à la main]` : ''}`,
    };
  }
  if (obj.type === 'chaining') {
    const steps = obj.config.steps || [];
    const coded = steps.filter((s) => entry.steps[s.id]);
    if (!coded.length) return { result: 'Non coté', detail: '' };
    const indep = coded.filter((s) => isIndependentCode(gList, entry.steps[s.id])).length;
    const pct = Math.round((indep / coded.length) * 100);
    return {
      result: `${indep}/${coded.length} étapes indépendantes (${pct} %)`,
      detail: steps.map((s, i) => (entry.steps[s.id] ? `${i + 1}.${s.name}:${entry.steps[s.id]}` : '')).filter(Boolean).join(' | '),
    };
  }
  if (obj.type === 'balance') {
    const steps = obj.config.steps || [];
    const st = balanceStats(obj, entry);
    if (!st.notes && !st.manque) return { result: 'Non coté', detail: '' };
    const trials = balanceTrials(entry);
    const detail = trials
      .map((tr, ti) => {
        const inner = steps
          .map((step, i) => {
            const e = (tr.steps || {})[step.id];
            if (!e || !e.outcome) return '';
            const o = outcomeMeta(obj, e.outcome);
            return `${i + 1}:${o ? o.short : e.outcome}${e.demande ? '+D' : ''}${e.renforce ? '+R' : ''}`;
          })
          .filter(Boolean)
          .join(' ');
        return inner ? `E${ti + 1}[${inner}]` : '';
      })
      .filter(Boolean)
      .join(' | ');
    return {
      result: `${st.cotes} essai${st.cotes > 1 ? 's' : ''} · ${st.reussi}/${st.notes} réussies (${st.pct} %)${st.manque ? ` · ${st.manque} manquée${st.manque > 1 ? 's' : ''}` : ''}${st.demandes ? ` · ${st.demandes} demande${st.demandes > 1 ? 's' : ''}` : ''}`,
      detail: `${detail}${st.renforts.length ? ` — renforcé : ${st.renforts.join(', ')}` : ''}`,
    };
  }
  return { result: '—', detail: '' };
}

/* Score normalisé d'une cotation, utilisé pour les courbes de progression */
function objectiveScore(obj, entry, guidances) {
  if (!entryMatches(obj, entry)) return null;
  const gList = objectiveGuidances(obj, guidances);
  if (obj.type === 'trials') {
    const done = entry.trials.filter((t) => trialCode(t));
    if (!done.length) return null;
    return { value: Math.round((done.filter((t) => isIndependentCode(gList, trialCode(t))).length / done.length) * 100), percent: true, unit: '%' };
  }
  if (obj.type === 'occurrence') return { value: entry.count, percent: false, unit: 'occ.' };
  if (obj.type === 'interval') {
    const { totals, total } = intervalTotals(obj, entry);
    if (!total) return null;
    const levels = obj.config.levels || [];
    const targetId = obj.config.targetLevelId || (levels[0] && levels[0].id);
    return { value: Math.round(((totals[targetId] || 0) / total) * 100), percent: true, unit: '%' };
  }
  if (obj.type === 'chaining') {
    const steps = obj.config.steps || [];
    const coded = steps.filter((s) => entry.steps[s.id]);
    if (!coded.length) return null;
    return { value: Math.round((coded.filter((s) => isIndependentCode(gList, entry.steps[s.id])).length / coded.length) * 100), percent: true, unit: '%' };
  }
  if (obj.type === 'balance') {
    // Les étapes manquées sont écartées : elles n'ont pas été présentées
    const st = balanceStats(obj, entry);
    if (!st.notes) return null;
    return { value: st.pct, percent: true, unit: '%' };
  }
  return null;
}

/* Regroupe les points d'une même journée calendaire en un seul point moyenné,
   pour un critère de maîtrise exprimé en jours plutôt qu'en séances
   (utile quand plusieurs séances ont lieu le même jour). */
function toDayPoints(points) {
  const byDay = new Map();
  points.forEach((p) => {
    if (!p.date) return;
    const day = new Date(p.date).toDateString();
    if (!byDay.has(day)) byDay.set(day, { sum: 0, n: 0, date: p.date });
    const e = byDay.get(day);
    e.sum += p.value;
    e.n += 1;
  });
  return Array.from(byDay.values())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((e) => ({ value: Math.round(e.sum / e.n) }));
}

/* Objectif acquis si les N dernières séances (ou N derniers jours) tiennent
   toutes le seuil. `sens` décide du côté : « au moins » pour un pourcentage de
   réussite, « au plus » pour un comptage qu'on cherche à faire baisser. Les
   objectifs enregistrés avant l'ajout du champ retombent sur 'min', donc sur le
   comportement d'origine. */
function masteryStatus(obj, points) {
  if (!MASTERY_TYPES.includes(obj.type)) return null;
  const m = { ...DEFAULT_MASTERY, ...(obj.config.mastery || {}) };
  const unit = m.unit === 'days' ? 'days' : 'sessions';
  const sens = m.sens === 'max' ? 'max' : 'min';
  const series = unit === 'days' ? toDayPoints(points) : points;
  const tient = (v) => (sens === 'max' ? v <= m.threshold : v >= m.threshold);
  let streak = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (tient(series[i].value)) streak++;
    else break;
  }
  return { mastered: streak >= m.sessions, threshold: m.threshold, needed: m.sessions, streak: Math.min(streak, m.sessions), unit, sens };
}

/* --- Équilibre ---
   Une séance comporte plusieurs essais. Le dernier élément du tableau est
   l'essai en cours. Les anciennes cotations à un seul passage sont converties
   à la volée pour rester lisibles. */
function balanceTrials(entry) {
  if (Array.isArray(entry.trials)) return entry.trials;
  if (entry.steps && Object.keys(entry.steps).length) return [{ steps: entry.steps }];
  return [{ steps: {} }];
}

function balanceStats(obj, entry) {
  const steps = obj.config.steps || [];
  const trials = balanceTrials(entry);
  let reussi = 0;
  let notes = 0;
  let manque = 0;
  let demandes = 0;
  const renforts = [];
  trials.forEach((tr, ti) => {
    steps.forEach((st, si) => {
      const e = (tr.steps || {})[st.id];
      if (!e) return;
      if (e.demande) demandes += 1;
      if (e.renforce) renforts.push(`E${ti + 1}·${si + 1}`);
      if (!e.outcome) return;
      const meta = outcomeMeta(obj, e.outcome);
      if (meta && meta.exclu) { manque += 1; return; }
      notes += 1;
      if (meta && meta.reussite) reussi += 1;
    });
  });
  const cotes = trials.filter((tr) => Object.values(tr.steps || {}).some((e) => e && e.outcome)).length;
  const pct = notes ? Math.round((reussi / notes) * 100) : 0;
  return { reussi, notes, manque, demandes, renforts, nbTrials: trials.length, cotes, pct };
}

/* --- Phases ---
   La dernière entrée de l'historique est la phase en cours. */
function phaseHistory(obj) {
  if (obj.phaseHistory && obj.phaseHistory.length) return obj.phaseHistory;
  return [{ id: 'p0', name: DEFAULT_PHASES[0], date: null }];
}
function currentPhase(obj) {
  const h = phaseHistory(obj);
  return h[h.length - 1];
}

/* --- Cibles d'un objectif ---
   Un objectif peut être découpé en cibles successives (ex. « rouge », puis
   « bleu », puis « vert »). La cotation porte sur la cible courante ; dès que
   le critère de maîtrise est atteint, on passe automatiquement à la suivante. */
function objectiveTargets(obj) {
  return (obj.config && obj.config.targets) || [];
}
function currentTarget(obj) {
  const targets = objectiveTargets(obj);
  if (!targets.length) return null;
  const done = obj.masteredTargetIds || [];
  if (obj.currentTargetId) {
    const t = targets.find((x) => x.id === obj.currentTargetId);
    if (t && !done.includes(t.id)) return t;
  }
  return targets.find((t) => !done.includes(t.id)) || null;
}

/* Points de progression d'un objectif, éventuellement limités à une cible */
function objectivePoints(obj, studentId, sessions, guidances, targetId) {
  const points = [];
  sessions.forEach((sess) => {
    if (obj.trackingResetAt && new Date(sess.date) < new Date(obj.trackingResetAt)) return;
    const entry = ((sess.data || {})[studentId] || {})[obj.id];
    if (!entry) return;
    if (targetId && entry.targetId && entry.targetId !== targetId) return;
    if (targetId && !entry.targetId) return;
    const sc = objectiveScore(obj, entry, guidances);
    if (!sc) return;
    points.push({
      date: sess.date,
      label: new Date(sess.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      value: sc.value,
      unit: sc.unit,
    });
  });
  return points;
}

/* Après enregistrement d'une séance : marque les cibles atteintes et avance.
   Renvoie la liste des personnes mise à jour et les cibles franchies. */
function advanceMasteredTargets(students, sessions, guidances) {
  const achieved = [];
  const ordered = sessions.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const nextStudents = students.map((st) => ({
    ...st,
    objectives: st.objectives.map((obj) => {
      const targets = objectiveTargets(obj);
      if (!targets.length || !PERCENT_TYPES.includes(obj.type)) return obj;
      const cur = currentTarget(obj);
      if (!cur) return obj;
      const points = objectivePoints(obj, st.id, ordered, guidances, cur.id);
      const status = masteryStatus(obj, points);
      if (!status || !status.mastered) return obj;
      const done = [...(obj.masteredTargetIds || []), cur.id];
      const next = targets.find((t) => !done.includes(t.id));
      achieved.push({ initials: st.initials, objective: obj.name, target: cur.name, next: next ? next.name : null });
      return { ...obj, masteredTargetIds: done, currentTargetId: next ? next.id : null };
    }),
  }));
  return { students: nextStudents, achieved };
}

/* ==================== Génération Excel ==================== */
/* --- Mise à plat pour l'analyse Excel ---
   Une ligne empilant tous les essais dans une seule cellule se filtre mal et
   ne se met pas en graphique. Ici, chaque essai / étape / intervalle devient
   sa propre ligne. La colonne "Indépendant" vaut 1 ou 0 : une moyenne dessus
   donne directement un pourcentage, sans formule à écrire. Les étapes
   manquées restent hors de cette colonne, comme dans les calculs de l'appli. */
function buildDetailRows(sessions, students, ateliers, intervenants, groupes, guidances, studentFilter) {
  const studentName = (id) => (students.find((s) => s.id === id) || {}).initials || '?';
  const atelierName = (id) => (ateliers.find((a) => a.id === id) || {}).name || '—';
  const intervenantName = (id) => (intervenants.find((i) => i.id === id) || {}).name || '—';
  const groupName = (sid) => nomGroupe(groupes, (students.find((s) => s.id === sid) || {}).groupeId) || '—';

  const rows = [['Date', 'Heure', 'Atelier', 'Intervenant', 'Personne accompagnée', 'Groupe', 'Objectif', 'Cible', 'Phase', 'Type', 'N°', 'Étape', 'Résultat', 'Indépendant', 'Demande', 'Renforcé', 'Durée (s)', 'Compteur', 'Chrono (s)']];

  /* Mesure auxiliaire capturée pour cet essai (relance à chaque essai) — vide
     tant que rien n'a été relancé sous cette clé, jamais un zéro par défaut. */
  function mesureEssaiCells(entry, cle) {
    const e = entry.mesuresEssais && entry.mesuresEssais[cle];
    const compteur = e && e.compteur && e.compteur.valideA ? e.compteur.total : '';
    const chrono = e && e.chrono && e.chrono.valideA ? Math.round((e.chrono.elapsedMs || 0) / 1000) : '';
    return [compteur, chrono];
  }

  function base(sess, sid, obj) {
    return [
      new Date(sess.date).toLocaleDateString('fr-FR'),
      timeShort(sess.date),
      sess.atelierId ? atelierName(sess.atelierId) : sess.mode === 'balance' ? 'Équilibre' : 'Séance libre',
      intervenantName(sess.intervenantId),
      studentName(sid),
      groupName(sid),
      obj.name,
      obj.activeTargetName || '—',
      obj.activePhaseName || currentPhase(obj).name,
    ];
  }

  sessions.forEach((sess) => {
    const dureeSeance = sess.endedAt && sess.startedAt
      ? Math.max(0, sess.endedAt - sess.startedAt - (sess.pausedMs || 0))
      : 0;

    /* Présence : une seule ligne, et seulement quand la personne n'a pas
       couvert toute la séance. Sans elle, un faible nombre d'essais se lit
       comme un mauvais résultat alors que la personne n'était pas là. */
    (sess.studentIds || []).forEach((sid) => {
      if (studentFilter && !studentFilter.includes(sid)) return;
      const presence = dureePresence(sess, sid);
      if (!dureeSeance || presence >= dureeSeance) return;
      const f = fenetrePresence(sess, sid);
      rows.push([
        ...base(sess, sid, { name: 'Présence', activeTargetName: null, activePhaseName: '—', config: {} }),
        'Présence', 1, '',
        `Présent ${Math.round(presence / 60000)} min sur ${Math.round(dureeSeance / 60000)} — de ${timeShort(f.from)} à ${timeShort(f.to || sess.endedAt)}`,
        '', '', '', Math.round(presence / 1000), '', '',
      ]);
    });

    (sess.studentIds || []).forEach((sid) => {
      if (studentFilter && !studentFilter.includes(sid)) return;
      const objIds = (sess.selectedObjectives && sess.selectedObjectives[sid]) || [];
      objIds.forEach((oid) => {
        const obj = (sess.objectiveSnapshot || {})[oid];
        if (!obj) return;
        const entry = ((sess.data || {})[sid] || {})[oid];
        if (!entry) return;
        const b = base(sess, sid, obj);
        const gl = objectiveGuidances(obj, guidances);

        if (obj.type === 'trials') {
          (entry.trials || []).forEach((t, i) => {
            const code = trialCode(t);
            if (!code) return;
            const g = guidanceByCode(gl, code);
            const ms = trialMs(t);
            rows.push([
              ...b, 'Essais', i + 1, '', g ? g.label : code,
              isIndependentCode(gl, code) ? 1 : 0, '', '',
              ms == null ? '' : Math.round(ms / 100) / 10,
              ...mesureEssaiCells(entry, i),
            ]);
          });
        }

        /* Le mode Occurrence n'a pas d'essais discrets : comme dans son
           implémentation d'origine, il ne produit pas de ligne dans
           « Détail par essai » — son nombre se lit sur la feuille
           « Cotations », au niveau de l'objectif (summarize/objectiveScore,
           génériques à tous les modes). */

        if (obj.type === 'chaining') {
          (obj.config.steps || []).forEach((st, i) => {
            const code = entry.steps && entry.steps[st.id];
            if (!code) return;
            const g = guidanceByCode(gl, code);
            rows.push([...b, 'Chaînage', i + 1, st.name, g ? g.label : code, isIndependentCode(gl, code) ? 1 : 0, '', '', '', ...mesureEssaiCells(entry, st.id)]);
          });
        }

        if (obj.type === 'balance') {
          balanceTrials(entry).forEach((tr, ti) => {
            (obj.config.steps || []).forEach((st, si) => {
              const e = (tr.steps || {})[st.id];
              if (!e || !e.outcome) return;
              const o = outcomeMeta(obj, e.outcome);
              rows.push([
                ...b, 'Équilibre', ti + 1, st.name, o ? o.label : e.outcome,
                o && o.exclu ? '' : o && o.reussite ? 1 : 0,
                e.demande ? 'Oui' : 'Non', e.renforce ? 'Oui' : 'Non', '',
                ...mesureEssaiCells(entry, ti),
              ]);
            });
          });
        }

        if (obj.type === 'interval') {
          const levels = obj.config.levels || [];
          Object.entries(entry.marks || {}).forEach(([n, lid]) => {
            const lv = levels.find((l) => l.id === lid);
            if (lv) rows.push([...b, 'Intervalles', Number(n), '', lv.name, '', '', '', '', '', '']);
          });
          (entry.segments || []).forEach((seg) => {
            const lv = levels.find((l) => l.id === seg.levelId);
            if (lv) rows.push([...b, 'Intervalles (saisie manuelle)', `${seg.start}-${seg.end}`, '', lv.name, '', '', '', segmentSeconds(seg), '', '']);
          });
        }
      });
    });
  });

  return rows;
}

function buildWorkbook(sessions, crises, students, ateliers, intervenants = [], groupes = [], guidances, studentFilter, releves = [], axesSuivi = []) {
  const keepStudent = (sid) => !studentFilter || studentFilter.includes(sid);
  const studentName = (id) => (students.find((s) => s.id === id) || {}).initials || '?';
  const atelierName = (id) => (ateliers.find((a) => a.id === id) || {}).name || '—';
  const intervenantName = (id) => (intervenants.find((i) => i.id === id) || {}).name || '—';

  const rows = [['Date', 'Heure', 'Atelier', 'Intervenant', 'Personne accompagnée', 'Objectif', 'Cible', 'Type de cotation', 'Résultat', 'Score', 'Détail', 'Comptage', 'Chrono (s)', 'Mesures validées à']];
  sessions.forEach((s) => {
    const d = new Date(s.date);
    (s.studentIds || []).forEach((sid) => {
      if (!keepStudent(sid)) return;
      const objIds = (s.selectedObjectives && s.selectedObjectives[sid]) || [];
      objIds.forEach((oid) => {
        const obj = (s.objectiveSnapshot || {})[oid];
        if (!obj) return;
        const entry = ((s.data || {})[sid] || {})[oid];
        const { result, detail } = summarize(obj, entry, guidances);
        const score = objectiveScore(obj, entry, guidances);
        let fullDetail = detail;
        if (obj.type === 'interval') {
          const set = crisisIntervals(s, crises, intervalStepSec(obj) / 60, sid);
          if (set.size > 0) {
            const list = Array.from(set).sort((a, b) => a - b).map((n) => `#${n}`).join(', ');
            fullDetail = `${detail}${detail ? ' — ' : ''}CRISE sur ${set.size > 1 ? 'les intervalles' : "l'intervalle"} ${list}`;
          }
        }
        const mesures = mesuresExport(entry && entry.mesures);
        rows.push([
          d.toLocaleDateString('fr-FR'),
          timeShort(s.date),
          atelierName(s.atelierId),
          intervenantName(s.intervenantId),
          studentName(sid),
          obj.name,
          obj.activeTargetName || '—',
          typeMeta(obj.type).label,
          result,
          score ? score.value : '',
          fullDetail,
          mesures.compteurTotal,
          mesures.chronoSecondes,
          mesures.valideA,
        ]);
      });
    });
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 16 }, { wch: 10 }, { wch: 34 }, { wch: 16 }, { wch: 22 }, { wch: 26 }, { wch: 8 }, { wch: 40 }, { wch: 9 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Cotations');

  const detailRows = buildDetailRows(sessions, students, ateliers, intervenants, groupes, guidances, studentFilter);
  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetail['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 34 }, { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 7 }, { wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 9 }, { wch: 9 }, { wch: 10 }, { wch: 10 }, { wch: 11 }];
  wsDetail['!freeze'] = { xSplit: 0, ySplit: 1 };
  if (detailRows.length > 1) XLSX.utils.book_append_sheet(wb, wsDetail, 'Détail par essai');

  const crisisRows = [['Type', 'Chaîne', 'Rang', 'Date', 'Heure', 'Jour', 'Personne accompagnée', 'Atelier', 'Intervenants présents', 'Durée', 'Durée (s)', 'Intensité', 'Antécédents', 'Enchaînement des comportements', 'Premier comportement', 'Fonction supposée', 'Conséquences', 'Antécédent (libre)', 'Comportement (libre)', 'Conséquence (libre)', 'Commentaire', 'Comptage annexe', 'Chrono annexe (s)', 'Mesures validées à']];
  crises.forEach((c) => {
    if (studentFilter && c.studentId && !studentFilter.includes(c.studentId)) return;
    const ids = c.intervenantIds || (c.intervenantId ? [c.intervenantId] : []);
    const f = c.fonction ? CRISIS_FUNCTIONS.find((x) => x.k === c.fonction) : null;
    const mesures = mesuresExport(c.mesures);
    crisisRows.push([
      c.kind === 'abc' ? 'Observation' : 'Crise',
      c.chainId ? c.chainId.slice(0, 6) : '',
      c.chainIndex || '',
      new Date(c.date).toLocaleDateString('fr-FR'),
      timeShort(c.date),
      new Date(c.date).toLocaleDateString('fr-FR', { weekday: 'long' }),
      c.studentId ? studentName(c.studentId) : '—',
      c.atelierId ? atelierName(c.atelierId) : '—',
      ids.map(intervenantName).join(', ') || '—',
      fmtDuration(c.durationMs),
      Math.round((c.durationMs || 0) / 1000),
      c.intensite || '',
      (c.antecedentTags || []).join(' | '),
      (c.comportementTags || []).map((v, i) => `${i + 1}. ${v}`).join(' → '),
      (c.comportementTags || [])[0] || '',
      f ? f.label : '',
      (c.consequenceTags || []).join(' | '),
      c.antecedent || '',
      c.comportement || '',
      c.consequence || '',
      c.commentaire || '',
      mesures.compteurTotal,
      mesures.chronoSecondes,
      mesures.valideA,
    ]);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(crisisRows);
  ws2['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 6 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 24 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 34 }, { wch: 44 }, { wch: 22 }, { wch: 16 }, { wch: 34 }, { wch: 34 }, { wch: 34 }, { wch: 34 }, { wch: 34 }, { wch: 9 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Crises et observations');

  const noteRows = [['Date', 'Heure', 'Atelier', 'Personne accompagnée', 'Note']];
  sessions.forEach((s) => {
    Object.entries(s.notes || {}).forEach(([sid, note]) => {
      if (!note || !note.trim() || !keepStudent(sid)) return;
      noteRows.push([
        new Date(s.date).toLocaleDateString('fr-FR'),
        timeShort(s.date),
        atelierName(s.atelierId),
        studentName(sid),
        note.trim(),
      ]);
    });
  });
  const ws3 = XLSX.utils.aoa_to_sheet(noteRows);
  ws3['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 10 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Notes');

  /* Suivi continu : une ligne par relevé, avec son heure et sa durée jusqu'au
     relevé suivant du même couple personne/suivi. Toujours créée, même vide,
     pour que le nombre de feuilles ne varie pas d'un rapport à l'autre. */
  const suiviRows = [['Date', 'Heure', 'Jour', 'Personne accompagnée', 'Suivi', 'Critère', 'Durée (min)', 'Groupe', 'Intervenant', 'Atelier']];
  const lignesSuivi = lignesSuiviExport(releves, students, axesSuivi, studentFilter, groupes, intervenants, ateliers);
  if (lignesSuivi.length) {
    lignesSuivi.forEach((l) => suiviRows.push(l));
  } else {
    suiviRows.push(['', '', '', '', '', 'Aucun relevé de suivi continu sur cette sélection.', '', '', '', '']);
  }
  const ws5 = XLSX.utils.aoa_to_sheet(suiviRows);
  ws5['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 16 }, { wch: 10 }, { wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws5, 'Suivi continu');

  /* Tableau de bord : une ligne par personne/objectif, une colonne par date.
     Format matriciel directement exploitable en graphique ou tableau croisé. */
  const dates = Array.from(new Set(sessions.map((x) => new Date(x.date).toLocaleDateString('fr-FR'))))
    .sort((a, b) => {
      const [ja, ma, aa] = a.split('/');
      const [jb, mb, ab] = b.split('/');
      return new Date(`${aa}-${ma}-${ja}`) - new Date(`${ab}-${mb}-${jb}`);
    });

  const byRow = new Map();
  sessions.forEach((sess) => {
    const jour = new Date(sess.date).toLocaleDateString('fr-FR');
    (sess.studentIds || []).forEach((sid) => {
      if (!keepStudent(sid)) return;
      const objIds = (sess.selectedObjectives && sess.selectedObjectives[sid]) || [];
      objIds.forEach((oid) => {
        const obj = (sess.objectiveSnapshot || {})[oid];
        if (!obj) return;
        const entry = ((sess.data || {})[sid] || {})[oid];
        const score = objectiveScore(obj, entry, guidances);
        if (!score) return;
        const key = `${sid}|${oid}|${obj.activeTargetName || ''}`;
        if (!byRow.has(key)) {
          byRow.set(key, {
            eleve: studentName(sid),
            objectif: obj.name,
            cible: obj.activeTargetName || '—',
            unite: score.percent ? '%' : score.unit,
            valeurs: {},
          });
        }
        const r = byRow.get(key);
        // Plusieurs séances le même jour : on retient la moyenne
        const prev = r.valeurs[jour];
        r.valeurs[jour] = prev === undefined ? score.value : Math.round((prev + score.value) / 2);
      });
    });
  });

  const dashRows = [['Personne accompagnée', 'Objectif', 'Cible', 'Unité', ...dates, 'Dernier', 'Moyenne', 'Tendance']];
  Array.from(byRow.values())
    .sort((a, b) => a.eleve.localeCompare(b.eleve) || a.objectif.localeCompare(b.objectif))
    .forEach((r) => {
      const serie = dates.map((d) => (r.valeurs[d] === undefined ? '' : r.valeurs[d]));
      const chiffres = serie.filter((v) => v !== '');
      const dernier = chiffres.length ? chiffres[chiffres.length - 1] : '';
      const moyenne = chiffres.length ? Math.round(chiffres.reduce((a, b) => a + b, 0) / chiffres.length) : '';
      let tendance = '';
      if (chiffres.length >= 2) {
        const delta = chiffres[chiffres.length - 1] - chiffres[0];
        tendance = delta > 0 ? `+${delta}` : `${delta}`;
      }
      dashRows.push([r.eleve, r.objectif, r.cible, r.unite, ...serie, dernier, moyenne, tendance]);
    });

  const ws4 = XLSX.utils.aoa_to_sheet(dashRows);
  ws4['!cols'] = [{ wch: 10 }, { wch: 34 }, { wch: 16 }, { wch: 7 }, ...dates.map(() => ({ wch: 11 })), { wch: 9 }, { wch: 9 }, { wch: 10 }];
  ws4['!freeze'] = { xSplit: 4, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws4, 'Tableau de bord');

  return wb;
}

function workbookBlob(wb) {
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/* ==================== Nommage des fichiers produits ====================
   Un dossier de sauvegardes doit se lire sans ouvrir les fichiers : de quelle
   tablette vient celui-ci, et de quel jour. L'appareil précède donc la date
   dans chaque nom, et voyage aussi dans la charge utile — le nom de fichier
   étant la première chose qu'un renommage manuel fait perdre. */
function segmentAppareil(nom) {
  const propre = (nom || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return propre ? `${propre}-` : '';
}

function nomFichier(base, appareil, ext) {
  return `${base}-${segmentAppareil(appareil)}${new Date().toISOString().slice(0, 10)}.${ext}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* Partage d'un rapport : passe par le partage natif de l'appareil, qui propose
   « Enregistrer dans Fichiers » vers un dossier OneDrive/SharePoint synchronisé
   si configuré sur la tablette. Plus de repli par mail : si le partage natif
   n'est pas disponible, le fichier est simplement téléchargé, à déposer
   manuellement dans le dossier voulu. Renvoie `false` seulement quand
   l'utilisateur a annulé la feuille de partage — les appelants s'en servent
   pour ne pas archiver un envoi qui n'est jamais parti. */
async function shareReport({ blob, name, title, notify }) {
  try {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return true;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return false;
  }
  downloadBlob(blob, name);
  if (notify) notify('Fichier téléchargé — à déposer dans le dossier SharePoint');
  return true;
}

/* ==================== Composants UI de base ==================== */
function Btn({ children, onClick, variant = 'solid', disabled, className = '', style = {}, ...rest }) {
  const base = 'rounded-xl px-4 py-3 font-medium flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-30';
  const styles =
    variant === 'solid'
      ? { backgroundColor: ACCENT, color: ACCENT_INK }
      : variant === 'outline'
      ? { border: `1px solid ${ACCENT}`, color: ACCENT, backgroundColor: 'transparent' }
      : { border: `1px solid ${BORDER}`, color: INK_SOFT, backgroundColor: CARD };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${className}`} style={{ fontFamily: F_DISPLAY, ...styles, ...style }} {...rest}>
      {children}
    </button>
  );
}

function Field({ value, onChange, placeholder, onEnter, autoFocus, className = '' }) {
  return (
    <input
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onEnter && onEnter()}
      placeholder={placeholder}
      className={`rounded-xl border px-3 py-3 text-base bg-transparent w-full ${className}`}
      style={{ borderColor: BORDER, fontFamily: F_BODY, color: INK }}
    />
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border p-4 ${className}`} style={{ borderColor: BORDER, backgroundColor: CARD }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-semibold" style={{ fontFamily: F_DISPLAY }}>{children}</h1>
      {sub && <p className="text-sm mt-0.5" style={{ color: INK_SOFT }}>{sub}</p>}
    </div>
  );
}

/* Ouverture du tiroir depuis un onglet — Suivi, Session hors cotation, Export.
   Absent pendant une cotation en cours : SessionRunning ne le reçoit pas. */
function BoutonMenu({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-2 text-sm shrink-0"
      style={{ color: INK_SOFT }}
    >
      <Menu size={16} /> Menu
    </button>
  );
}

function Chip({ label, on, onClick, color = ACCENT }) {
  /* INK sert de texte, pas de fond : en thème sombre il est quasi blanc, donc
     un chip sélectionné qui l'utilisait comme remplissage devenait blanc sur
     blanc. Le remplissage par défaut est l'accent, avec son texte apparié —
     exactement le motif documenté pour les chips sélectionnés. */
  const texte = color === ACCENT ? ACCENT_INK : texteLisibleSur(color);
  return (
    <button
      onClick={onClick}
      className="rounded-xl px-4 py-2.5 border text-sm active:scale-95 transition-transform"
      style={{ fontFamily: F_DISPLAY, borderColor: on ? color : BORDER, backgroundColor: on ? color : 'transparent', color: on ? texte : INK_SOFT }}
    >
      {label}
    </button>
  );
}

/* Porteur d'identité d'une personne accompagnée : une pilule, ses initiales
   en entier (ponctuation retirée). Unique porteur du nom dans une ligne de
   liste — pas de titre texte à côté, ça ferait doublon. */
function PastillePersonne({ initials, taille = 40 }) {
  return (
    <span
      className="rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
      style={{ minWidth: taille, height: taille, padding: '0 0.6rem', backgroundColor: ACCENT, color: ACCENT_INK, fontFamily: F_DISPLAY }}
    >
      {initials.replace(/\./g, '')}
    </span>
  );
}

/* Ligne renommable : bascule entre affichage et champ de saisie */
function EditableRow({ label, onRename, onRemove, chip }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);

  function commit() {
    if (draft.trim() && draft.trim() !== label) onRename(draft.trim());
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex gap-2 items-center">
        <Field autoFocus value={draft} onChange={setDraft} onEnter={commit} />
        <Btn onClick={commit} className="px-3 shrink-0 py-2.5"><Check size={16} /></Btn>
        <Btn variant="ghost" onClick={() => { setDraft(label); setEditing(false); }} className="px-3 shrink-0 py-2.5"><X size={16} /></Btn>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${chip ? '' : 'justify-between'}`} style={{ backgroundColor: PAPER }}>
      <span className={chip ? 'text-sm font-semibold' : 'text-sm flex-1'} style={chip ? { fontFamily: F_DISPLAY } : undefined}>{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => { setDraft(label); setEditing(true); }} style={{ color: INK_SOFT }} title="Renommer"><Pencil size={14} /></button>
        <button onClick={onRemove} style={{ color: INK_SOFT }} title="Supprimer"><X size={15} /></button>
      </div>
    </div>
  );
}

/* Vrai pendant un déplacement par appui long : évite qu'un balayage se
   déclenche en même temps que le réordonnancement. */
let reorderDragging = false;

/* Liste réordonnable : appui long (~0,3 s) puis glissement vertical.
   Les écouteurs sont posés en natif avec passive:false, indispensable pour
   bloquer le défilement pendant le déplacement — React les poserait en passif. */
function ReorderList({ items, keyOf, onReorder, renderItem, className = '', style, itemStyle }) {
  const containerRef = useRef(null);
  const [dragKey, setDragKey] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const st = useRef({ timer: null, dragging: false, from: null, over: null, justDragged: false });

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const keyOfRef = useRef(keyOf);
  keyOfRef.current = keyOf;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const s = st.current;

    const rows = () => Array.from(el.children);

    function indexFromTarget(target) {
      const list = rows();
      const row = list.find((r) => r.contains(target));
      return row ? list.indexOf(row) : -1;
    }
    /* Repère l'élément sous le doigt. On teste d'abord le survol exact, ce qui
       fonctionne aussi bien pour une liste verticale que pour une grille ;
       à défaut on retient le plus proche par le centre. */
    function indexFromPoint(clientX, clientY) {
      const list = rows();
      if (!list.length) return -1;
      for (let i = 0; i < list.length; i++) {
        const r = list[i].getBoundingClientRect();
        if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return i;
      }
      let best = 0;
      let bestDist = Infinity;
      list.forEach((el2, i) => {
        const r = el2.getBoundingClientRect();
        const dx = clientX - (r.left + r.width / 2);
        const dy = clientY - (r.top + r.height / 2);
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    }

    function start(e) {
      const t = e.touches ? e.touches[0] : e;
      const i = indexFromTarget(e.target);
      if (i < 0) return;
      s.startY = t.clientY;
      s.startX = t.clientX;
      s.from = i;
      s.dragging = false;
      clearTimeout(s.timer);
      s.timer = setTimeout(() => {
        s.dragging = true;
        reorderDragging = true;
        s.over = i;
        setDragKey(keyOfRef.current(itemsRef.current[i]));
        setOverIndex(i);
        try { if (navigator.vibrate) navigator.vibrate(25); } catch (err) {}
      }, 320);
    }

    function move(e) {
      const t = e.touches ? e.touches[0] : e;
      if (!s.dragging) {
        // Un mouvement franc avant la fin du délai = défilement, pas un déplacement
        if (s.timer && (Math.abs(t.clientY - s.startY) > 8 || Math.abs(t.clientX - s.startX) > 8)) {
          clearTimeout(s.timer);
          s.timer = null;
        }
        return;
      }
      if (e.cancelable) e.preventDefault();
      const i = indexFromPoint(t.clientX, t.clientY);
      if (i >= 0 && i !== s.over) { s.over = i; setOverIndex(i); }
    }

    function end() {
      clearTimeout(s.timer);
      s.timer = null;
      if (s.dragging && s.from !== null && s.over !== null && s.from !== s.over) {
        const next = itemsRef.current.slice();
        const [moved] = next.splice(s.from, 1);
        next.splice(s.over, 0, moved);
        onReorderRef.current(next);
      }
      if (s.dragging) {
        // Empêche le clic parasite sur le bouton relâché en fin de glissement
        s.justDragged = true;
        setTimeout(() => { s.justDragged = false; }, 250);
      }
      s.dragging = false; s.from = null; s.over = null;
      reorderDragging = false;
      setDragKey(null); setOverIndex(null);
    }

    function blockClick(e) {
      if (s.justDragged) { e.stopPropagation(); e.preventDefault(); }
    }

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end, { passive: true });
    el.addEventListener('touchcancel', end, { passive: true });
    el.addEventListener('mousedown', start);
    el.addEventListener('click', blockClick, true);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    return () => {
      clearTimeout(s.timer);
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
      el.removeEventListener('mousedown', start);
      el.removeEventListener('click', blockClick, true);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
    };
  }, []);

  return (
    <div ref={containerRef} data-no-swipe data-reorder className={className} style={style}>
      {items.map((it, i) => {
        const k = keyOf(it);
        const isDragging = dragKey === k;
        const isOver = dragKey !== null && overIndex === i && !isDragging;
        return (
          <div
            key={k}
            style={{
              ...itemStyle,
              opacity: isDragging ? 0.45 : 1,
              outline: isOver ? `2px solid ${INK}` : 'none',
              outlineOffset: '2px',
              borderRadius: isOver ? '1rem' : undefined,
              transition: 'opacity .15s',
              touchAction: dragKey !== null ? 'none' : 'auto',
            }}
          >
            {renderItem(it, i, isDragging)}
          </div>
        );
      })}
    </div>
  );
}

/* Liste de réponses modifiable : ajout, renommage, suppression, et
   réorganisation par appui long. */
function TagListEditor({ titre, items, onChange }) {
  const [nouveau, setNouveau] = useState('');
  const ajouter = () => {
    const v = nouveau.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setNouveau('');
  };
  return (
    <div className="mb-4">
      <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>{titre}</div>
      {items.length > 0 && (
        <ReorderList
          items={items}
          keyOf={(v) => v}
          onReorder={onChange}
          className="space-y-1.5 mb-2"
          renderItem={(v) => (
            <EditableRow
              label={v}
              onRename={(n) => onChange(items.map((x) => (x === v ? n : x)))}
              onRemove={() => onChange(items.filter((x) => x !== v))}
            />
          )}
        />
      )}
      <div className="flex gap-2">
        <Field value={nouveau} onChange={setNouveau} placeholder="Ajouter une réponse" onEnter={ajouter} />
        <Btn variant="ghost" onClick={ajouter} className="px-4 shrink-0"><Plus size={16} /></Btn>
      </div>
      {nouveau.trim() && items.includes(nouveau.trim()) && (
        <div className="text-xs mt-1" style={{ color: CRISIS }}>Cette réponse existe déjà.</div>
      )}
    </div>
  );
}

function Empty({ children }) {
  return (
    <div className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm" style={{ borderColor: BORDER, color: INK_SOFT }}>
      {children}
    </div>
  );
}

/* Modale générique centrée : recouvrement + carte + croix de fermeture. Les
   nouveaux blocs de ce lot l'utilisent ; les modales déjà en place ailleurs
   dans le fichier ne sont pas migrées, pour ne pas risquer une régression sur
   des écrans de cotation en production. */
function Modale({ titre, onClose, children, className }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'var(--overlay-backdrop)' }}>
      <div className={`rounded-2xl p-4 max-w-sm w-full max-h-[80vh] overflow-y-auto ${className || ''}`} style={{ backgroundColor: CARD }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>{titre}</span>
          <button onClick={onClose} style={{ color: INK_SOFT }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* Sélecteur multiple au doigt : un <select multiple> natif est illisible sur
   tablette (appui long / ctrl pour choisir plusieurs options). On affiche à la
   place un bouton au style d'un <select> qui déplie une liste de lignes
   cochables — même geste que les tags A/B/C de la fiche crise. */
function ChoixMultiple({ placeholder, options, values, onToggle }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ouvert) return;
    const surExterieur = (ev) => { if (ref.current && !ref.current.contains(ev.target)) setOuvert(false); };
    document.addEventListener('pointerdown', surExterieur);
    return () => document.removeEventListener('pointerdown', surExterieur);
  }, [ouvert]);

  const noms = options.filter((o) => values.includes(o.id)).map((o) => o.name);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="w-full rounded-lg px-3 py-2.5 text-sm border flex items-center justify-between gap-2"
        style={{ borderColor: BORDER, backgroundColor: PAPER, color: noms.length ? INK : INK_SOFT }}
      >
        <span className="truncate text-left">{noms.length ? noms.join(', ') : placeholder}</span>
        <ChevronDown size={16} style={{ color: INK_SOFT, transform: ouvert ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} className="shrink-0" />
      </button>
      {ouvert && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border overflow-hidden max-h-56 overflow-y-auto" style={{ borderColor: BORDER, backgroundColor: CARD }}>
          {options.map((o) => {
            const on = values.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onToggle(o.id)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left"
                style={{ backgroundColor: on ? PAPER : 'transparent', color: INK }}
              >
                <span className="truncate">{o.name}</span>
                {on && <Check size={15} className="shrink-0" style={{ color: ACCENT }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Icône d'aide qui ouvre une bulle d'information au tap — le seul mécanisme
   d'aide contextuelle de l'app jusqu'ici était l'attribut natif `title`,
   inopérant au tactile. Se referme au second tap sur l'icône, au tap sur la
   bulle elle-même, ou au tap ailleurs dans l'écran. */
function BulleInfo({ titre, children }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ouvert) return;
    const surExterieur = (ev) => { if (ref.current && !ref.current.contains(ev.target)) setOuvert(false); };
    document.addEventListener('pointerdown', surExterieur);
    return () => document.removeEventListener('pointerdown', surExterieur);
  }, [ouvert]);

  return (
    <span className="relative inline-flex" ref={ref}>
      <button onClick={() => setOuvert((v) => !v)} style={{ color: INK_SOFT }} aria-label={titre || "Plus d'information"}>
        <Info size={14} />
      </button>
      {ouvert && (
        <div
          onClick={() => setOuvert(false)}
          className="absolute z-30 top-full right-0 mt-2 rounded-xl p-3 text-xs shadow-lg"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, color: INK_SOFT, maxWidth: '17rem', width: '17rem' }}
        >
          {titre && <div className="font-semibold mb-1" style={{ color: INK, fontFamily: F_DISPLAY }}>{titre}</div>}
          {children}
        </div>
      )}
    </span>
  );
}

/* Une ligne de critère de suivi continu : pastille de couleur (ouvre une
   palette au tap), libellé renommable, suppression. Distincte d'EditableRow
   parce qu'elle porte une donnée de plus — la couleur — sans en faire un cas
   particulier dans un composant partagé par d'autres listes. */
function CritereRow({ critere, onRename, onRecolor, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(critere.l);
  const [palette, setPalette] = useState(false);

  function commit() {
    if (draft.trim() && draft.trim() !== critere.l) onRename(draft.trim());
    setEditing(false);
  }

  return (
    <div className="rounded-xl px-3 py-2.5" style={{ backgroundColor: PAPER }}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPalette((v) => !v)}
          className="w-6 h-6 rounded-full shrink-0 border"
          style={{ backgroundColor: critere.color, borderColor: BORDER }}
          aria-label="Changer la couleur"
        />
        {editing ? (
          <>
            <Field autoFocus value={draft} onChange={setDraft} onEnter={commit} />
            <Btn onClick={commit} className="px-3 shrink-0 py-2.5"><Check size={16} /></Btn>
            <Btn variant="ghost" onClick={() => { setDraft(critere.l); setEditing(false); }} className="px-3 shrink-0 py-2.5"><X size={16} /></Btn>
          </>
        ) : (
          <>
            <span className="text-sm flex-1">{critere.l}</span>
            <button onClick={() => { setDraft(critere.l); setEditing(true); }} style={{ color: INK_SOFT }} title="Renommer"><Pencil size={14} /></button>
            <button onClick={onRemove} style={{ color: INK_SOFT }} title="Supprimer"><X size={15} /></button>
          </>
        )}
      </div>
      {palette && (
        <div className="flex flex-wrap gap-2 mt-2.5 pl-8">
          {PALETTE_SUIVI.map((c) => (
            <button
              key={c}
              onClick={() => { onRecolor(c); setPalette(false); }}
              className="w-6 h-6 rounded-full border-2"
              style={{ backgroundColor: c, borderColor: c === critere.color ? INK : 'transparent' }}
              aria-label={c}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* Liste de critères modifiable : ajout, renommage, couleur, suppression, et
   réorganisation par appui long. La clé interne (`k`) est fixée à la
   création et ne change plus jamais : renommer ou recolorer un critère ne
   déconnecte pas les relevés qui le portent déjà. */
function CritereListEditor({ criteres, onChange }) {
  const [nouveau, setNouveau] = useState('');
  const ajouter = () => {
    const l = nouveau.trim();
    if (!l || criteres.some((c) => c.l === l)) return;
    const prises = new Set(criteres.map((c) => c.color));
    const color = PALETTE_SUIVI.find((c) => !prises.has(c)) || PALETTE_SUIVI[criteres.length % PALETTE_SUIVI.length];
    onChange([...criteres, { k: `c${uid()}`, l, color }]);
    setNouveau('');
  };
  return (
    <div className="mb-4">
      {criteres.length > 0 && (
        <ReorderList
          items={criteres}
          keyOf={(c) => c.k}
          onReorder={onChange}
          className="space-y-1.5 mb-2"
          renderItem={(c) => (
            <CritereRow
              critere={c}
              onRename={(l) => onChange(criteres.map((x) => (x.k === c.k ? { ...x, l } : x)))}
              onRecolor={(color) => onChange(criteres.map((x) => (x.k === c.k ? { ...x, color } : x)))}
              onRemove={() => onChange(criteres.filter((x) => x.k !== c.k))}
            />
          )}
        />
      )}
      <div className="flex gap-2">
        <Field value={nouveau} onChange={setNouveau} placeholder="Ajouter un critère" onEnter={ajouter} />
        <Btn variant="ghost" onClick={ajouter} className="px-4 shrink-0"><Plus size={16} /></Btn>
      </div>
      {nouveau.trim() && criteres.some((c) => c.l === nouveau.trim()) && (
        <div className="text-xs mt-1" style={{ color: CRISIS }}>Ce critère existe déjà.</div>
      )}
    </div>
  );
}

/* Liste d'historique repliée par jour. Le jour le plus récent est ouvert, les
   autres se déplient à la demande — l'historique reste entier et consultable,
   sans être déroulé d'un bloc. */
function ListeParJour({ items, dateDe, renderItem }) {
  const groupes = grouperParJour(items, dateDe);
  const [ouvert, setOuvert] = useState(undefined);
  if (!groupes.length) return null;
  const cleOuverte = ouvert === undefined ? groupes[0].cle : ouvert;
  return (
    <div className="space-y-1.5">
      {groupes.map((g) => {
        const on = cleOuverte === g.cle;
        return (
          <div key={g.cle} className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER, backgroundColor: CARD }}>
            <button onClick={() => setOuvert(on ? null : g.cle)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
              <ChevronDown size={15} style={{ color: INK_SOFT, transform: on ? 'none' : 'rotate(-90deg)', transition: 'transform .15s' }} className="shrink-0" />
              <span className="text-sm font-medium flex-1 min-w-0 truncate first-letter:uppercase" style={{ fontFamily: F_DISPLAY }}>
                {libelleJour(g.date)}
              </span>
              <span className="text-xs shrink-0" style={{ color: INK_SOFT, fontFamily: F_MONO }}>{g.items.length}</span>
            </button>
            {on && <div className="px-2 pb-2 space-y-1.5">{g.items.map(renderItem)}</div>}
          </div>
        );
      })}
    </div>
  );
}

/* Densités d'affichage de la zone de cotation. Réduire fait tenir plus
   d'objectifs à l'écran, au prix de boutons plus petits. */
const ZOOM_LEVELS = [
  { v: 1, l: '100 %' },
  { v: 0.85, l: '85 %' },
  { v: 0.7, l: '70 %' },
  { v: 0.6, l: '60 %' },
];

/* ==================== Navigation par balayage ====================
   Ordre des onglets, utilisé pour savoir vers quel écran glisser. Gestion et
   Personnes ont quitté la barre principale : ils vivent désormais dans le
   tiroir latéral. Suivi devient l'extrémité gauche, ce qui libère le balayage
   vers la droite depuis cet écran — c'est lui qui ouvre le tiroir, sans avoir
   à délimiter une bande de bord qui entrerait en conflit avec le balayage
   document déjà en place. */
const TAB_ORDER = ['suivi', 'session', 'export'];

/* Logo affiché en pied du tiroir latéral. */
function LogoDatABA({ height = 30 }) {
  return (
    <svg height={height} viewBox="0 0 260 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="DatABA">
      <defs>
        <linearGradient id="logoDatabaDark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#12386b" />
          <stop offset="1" stopColor="#1c5aa8" />
        </linearGradient>
        <linearGradient id="logoDatabaLight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f8fe0" />
          <stop offset="1" stopColor="#4fc3f7" />
        </linearGradient>
        <clipPath id="logoDatabaPiece">
          <path d="
            M 25,20
            A 10,10 0 0 1 35,10
            L 47,10
            A 11,11 0 0 0 69,10
            L 77,10
            A 11,11 0 0 0 99,10
            L 105,10
            A 10,10 0 0 1 115,20
            L 115,31
            A 11,11 0 0 0 115,53
            L 115,67
            A 11,11 0 0 0 115,89
            L 115,100
            A 10,10 0 0 1 105,110
            L 35,110
            A 10,10 0 0 1 25,100
            L 25,78
            A 18,18 0 0 1 25,42
            L 25,20
            Z
          " />
        </clipPath>
      </defs>
      <g clipPath="url(#logoDatabaPiece)">
        <rect x="0" y="0" width="140" height="120" fill="url(#logoDatabaDark)" />
        <polygon points="25,20 115,20 115,100" fill="url(#logoDatabaLight)" />
      </g>
      <text x="150" y="55" fontFamily={F_DISPLAY} fontWeight="800" fontSize="42" fill="#12386b">Dat</text>
      <text x="150" y="95" fontFamily={F_DISPLAY} fontWeight="800" fontSize="42" fill="#2f9bef">ABA</text>
    </svg>
  );
}

/* Les dix panneaux du tiroir latéral. Source unique : autrefois écrits en
   dur dans le JSX du tiroir en plus du `switch` de rendu, ce qui obligeait à
   maintenir deux listes en parallèle à chaque ajout ou retrait de panneau. */
const PANNEAUX = [
  { k: 'personnes', label: 'Personnes accompagnées', icon: Users },
  { k: 'ateliers', label: 'Ateliers et emploi du temps', icon: CalendarDays },
  { k: 'intervenants', label: 'Intervenants', icon: UserCog },
  { k: 'groupes', label: 'Groupes', icon: School },
  { k: 'modeles', label: "Modèles d'objectifs", icon: BookmarkPlus },
  { k: 'guidances', label: 'Guidances', icon: SlidersHorizontal },
  { k: 'abc', label: 'Réponses ABC', icon: AlertTriangle },
  { k: 'suivicontinu', label: 'Suivi continu', icon: Activity },
  { k: 'motsdepasse', label: 'Mots de passe', icon: Lock },
  { k: 'donnees', label: 'Données', icon: Database },
];

/* Un balayage ne doit pas voler le geste à une zone qui défile déjà
   horizontalement (grille d'essais, grille d'intervalles), à un champ de
   saisie, ni à un graphique. */
function ownsHorizontalGesture(target, boundary, ignoreNoSwipe) {
  let n = target;
  while (n && n !== document.body) {
    if (boundary && n === boundary) return false; // on s'arrête au conteneur qui gère le geste
    if (!ignoreNoSwipe && n.dataset && n.dataset.noSwipe !== undefined) return true;
    const tag = n.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (n.scrollWidth > n.clientWidth + 4) {
      const ox = window.getComputedStyle(n).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
    n = n.parentElement;
  }
  return false;
}

/* Balayage horizontal générique.
   Le contenu suit le doigt de façon amortie et plafonnée : assez pour que le
   geste soit tangible, sans déplacer toute la page hors de l'écran — ce qui
   provoquait des blancs de rendu sur iOS. */
function useHorizontalSwipe(ref, { onLeft, onRight, enabled = true, onDocument = false, ignoreNoSwipe = false }) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [el, setEl] = useState(null);
  const state = useRef(null);

  /* L'élément peut n'apparaître qu'à un rendu ultérieur (écran de chargement
     affiché en premier). On le suit à chaque rendu ; React ignore un état
     identique, donc pas de boucle. */
  useEffect(() => {
    setEl(ref && ref.current ? ref.current : null);
  });

  useEffect(() => {
    // Au niveau document, le geste fonctionne partout et ne dépend d'aucun montage
    const target = onDocument ? document : el;
    if (!target || !enabled) return undefined;
    const boundary = onDocument ? null : el;

    const MAX = 80;

    function start(e) {
      if (e.touches.length !== 1 || reorderDragging || ownsHorizontalGesture(e.target, boundary, ignoreNoSwipe)) {
        state.current = null;
        return;
      }
      const t = e.touches[0];
      state.current = { x: t.clientX, y: t.clientY, axis: null, dx: 0, time: Date.now() };
    }

    function move(e) {
      const g = state.current;
      if (!g || e.touches.length !== 1) return;
      if (reorderDragging) {
        // Un déplacement d'objectif vient de démarrer : on abandonne le balayage
        state.current = null;
        setDragging(false);
        setOffset(0);
        return;
      }
      const t = e.touches[0];
      const dx = t.clientX - g.x;
      const dy = t.clientY - g.y;
      if (!g.axis) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        g.axis = Math.abs(dx) > Math.abs(dy) + 4 ? 'x' : 'y';
        if (g.axis === 'x') setDragging(true);
      }
      if (g.axis !== 'x') return;
      if (e.cancelable) e.preventDefault();
      g.dx = dx;
      setOffset(Math.sign(dx) * Math.min(Math.abs(dx) * 0.45, MAX));
    }

    function end() {
      const g = state.current;
      state.current = null;
      setDragging(false);
      setOffset(0);
      if (!g || g.axis !== 'x') return;
      const speed = Math.abs(g.dx) / Math.max(1, Date.now() - g.time);
      if (Math.abs(g.dx) < 55 && speed < 0.4) return;
      if (g.dx < 0) { if (onLeft) onLeft(); } else if (onRight) onRight();
    }

    target.addEventListener('touchstart', start, { passive: true });
    target.addEventListener('touchmove', move, { passive: false });
    target.addEventListener('touchend', end, { passive: true });
    target.addEventListener('touchcancel', end, { passive: true });
    return () => {
      target.removeEventListener('touchstart', start);
      target.removeEventListener('touchmove', move);
      target.removeEventListener('touchend', end);
      target.removeEventListener('touchcancel', end);
    };
  }, [el, onLeft, onRight, enabled, onDocument, ignoreNoSwipe]);

  return { offset, dragging };
}

/* Glissement vertical de haut en bas, engagé depuis une zone de préhension
   (l'en-tête d'une fiche plein écran) plutôt que sur tout le document : on ne
   veut réduire la fiche qu'à partir d'un geste délibéré depuis le haut, pas
   depuis n'importe quel défilement du contenu. Suit le doigt sans
   amortissement jusqu'au bas de l'écran, comme le balayage horizontal avec
   aperçu ; seul le sens vers le bas est retenu. */
function useVerticalDismiss(ref, { onDismiss, enabled = true }) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [el, setEl] = useState(null);
  const state = useRef(null);
  const coast = useRef(null);

  useEffect(() => {
    setEl(ref && ref.current ? ref.current : null);
  });

  useEffect(() => {
    if (!el || !enabled) return undefined;

    function start(e) {
      if (e.touches.length !== 1) { state.current = null; return; }
      if (coast.current) { cancelAnimationFrame(coast.current); coast.current = null; }
      const t = e.touches[0];
      state.current = { x: t.clientX, y: t.clientY, axis: null, dy: 0, time: Date.now() };
    }

    function move(e) {
      const g = state.current;
      if (!g || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - g.x;
      const dy = t.clientY - g.y;
      if (!g.axis) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        g.axis = Math.abs(dy) > Math.abs(dx) + 4 ? 'y' : 'x';
        if (g.axis === 'y') setDragging(true);
      }
      if (g.axis !== 'y') return;
      if (dy < 0) return; // vers le haut : on laisse la zone défiler normalement
      if (e.cancelable) e.preventDefault();
      g.dy = dy;
      const h = window.innerHeight;
      // Résistance au-delà de la hauteur de l'écran, pour ne jamais dépasser
      // largement la course utile même avec un geste très ample.
      setOffset(dy < h ? dy : h + (dy - h) * 0.25);
    }

    function end() {
      const g = state.current;
      state.current = null;
      if (!g || g.axis !== 'y' || g.dy <= 0) { setDragging(false); setOffset(0); return; }
      const speed = g.dy / Math.max(1, Date.now() - g.time);
      const h = window.innerHeight;
      const depasse = g.dy > h * 0.24 || speed > 0.45;
      if (!depasse) { setDragging(false); setOffset(0); return; }
      // Termine la course jusqu'en bas dans la continuité du doigt — animée
      // image par image, comme le balayage horizontal, pour que la réduction
      // en pastille arrive exactement quand le mouvement visuel se termine.
      const depart = g.dy;
      const t0 = performance.now();
      const duree = 180;
      const pas = (maintenant) => {
        const p = Math.min(1, (maintenant - t0) / duree);
        const e = 1 - (1 - p) * (1 - p);
        setOffset(depart + (h - depart) * e);
        if (p < 1) {
          coast.current = requestAnimationFrame(pas);
        } else {
          coast.current = null;
          setDragging(false);
          setOffset(0);
          if (onDismiss) onDismiss();
        }
      };
      coast.current = requestAnimationFrame(pas);
    }

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end, { passive: true });
    el.addEventListener('touchcancel', end, { passive: true });
    return () => {
      if (coast.current) { cancelAnimationFrame(coast.current); coast.current = null; }
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, [el, enabled, onDismiss]);

  return { offset, dragging };
}

/* Modal de mot de passe pour la sauvegarde chiffrée. Un seul composant pour
   les deux usages : "export" demande une saisie en double pour éviter une
   faute de frappe qui rendrait le fichier illisible ; "import" ne demande
   qu'une saisie, avec un message d'erreur si elle ne convient pas. */
function PassphraseModal({ mode, error, onSubmit, onClose }) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const ready = mode === 'export' ? p1.length >= 4 && p1 === p2 : p1.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'var(--overlay-backdrop)' }}>
      <div className="rounded-2xl p-5 max-w-xs w-full" style={{ backgroundColor: CARD }}>
        <div className="flex justify-end mb-1">
          <button onClick={onClose} style={{ color: INK_SOFT }}><X size={18} /></button>
        </div>
        <h2 className="text-lg font-semibold text-center mb-1" style={{ fontFamily: F_DISPLAY }}>
          {mode === 'export' ? 'Protéger la sauvegarde' : 'Mot de passe de la sauvegarde'}
        </h2>
        <p className="text-sm text-center mb-4" style={{ color: INK_SOFT }}>
          {mode === 'export'
            ? 'Ce mot de passe sera nécessaire pour restaurer cette sauvegarde. Conservez-le en lieu sûr : il ne peut pas être récupéré.'
            : 'Saisissez le mot de passe défini lors de l\'export de ce fichier.'}
        </p>
        {error && <p className="text-sm text-center mb-3" style={{ color: CRISIS }}>{error}</p>}
        <input
          type="password"
          value={p1}
          onChange={(e) => setP1(e.target.value)}
          placeholder="Mot de passe"
          autoFocus
          className="w-full rounded-xl border px-3 py-2.5 text-base bg-transparent mb-2"
          style={{ borderColor: BORDER, color: INK }}
        />
        {mode === 'export' && (
          <input
            type="password"
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            placeholder="Confirmer le mot de passe"
            className="w-full rounded-xl border px-3 py-2.5 text-base bg-transparent mb-2"
            style={{ borderColor: BORDER, color: INK }}
          />
        )}
        {mode === 'export' && p1.length > 0 && p1.length < 4 && (
          <p className="text-xs mb-2" style={{ color: INK_SOFT }}>Au moins 4 caractères.</p>
        )}
        {mode === 'export' && p2.length > 0 && p1 !== p2 && (
          <p className="text-xs mb-2" style={{ color: CRISIS }}>Les deux saisies ne correspondent pas.</p>
        )}
        <Btn onClick={() => onSubmit(p1)} disabled={!ready} className="w-full mt-2">
          {mode === 'export' ? 'Chiffrer et télécharger' : 'Déchiffrer'}
        </Btn>
      </div>
    </div>
  );
}

/* ==================== Application ==================== */
function AbaApp() {
  useFonts();
  /* Thème clair/sombre. Posé une première fois par le script bloquant de
     index.html (attribut data-theme sur <html>, avant le premier rendu) ;
     l'état ici ne fait que le lire et le faire suivre au bouton du tiroir.
     Préférence non sensible : clé aba: en clair, hors du chiffrement. */
  const [theme, setThemeState] = useState(() => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  });
  const basculerTheme = () => {
    setThemeState((t) => {
      const suivant = t === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', suivant);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', suivant === 'dark' ? '#0A1120' : '#F3F6FB');
      try { window.localStorage.setItem('aba:theme', suivant); } catch (e) {}
      return suivant;
    });
  };
  /* L'application s'ouvre sur Session : c'est l'écran utilisé à chaque prise
     de poste, alors que la gestion ne sert qu'épisodiquement. */
  const [tab, setTab] = useState('session');
  /* Écran ouvert depuis le tiroir latéral. Il prend la place du contenu
     d'onglet ; la barre du bas reste visible, avec les boutons Crise et ABC. */
  const [ecran, setEcran] = useState(null);
  /* Contexte porté par un lien croisé : ouvrir un panneau déjà positionné sur
     une personne ou un objectif précis, plutôt que sur sa liste vide. Remis à
     null à chaque ouverture depuis le tiroir ou chaque retour à un onglet —
     il ne doit jamais survivre à un changement d'écran non lié. */
  const [focusEcran, setFocusEcran] = useState(null);
  const [tiroir, setTiroir] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [security, setSecurity] = useState({ pinHash: null, pinSalt: null });
  const [securityLoaded, setSecurityLoaded] = useState(false);
  const [locked, setLocked] = useState(true);
  const [retentionMonths, setRetentionMonths] = useState(0);

  const [students, setStudents] = useState([]);
  const [ateliers, setAteliers] = useState([]);
  /* Semaine type : quel atelier, quel jour, dans quel ordre. Clés = index
     Date.getDay() en chaînes (transit JSON), valeurs = ids d'ateliers
     ordonnés. Un même atelier peut figurer sur plusieurs jours. */
  const [emploiDuTemps, setEmploiDuTemps] = useState({});
  const [intervenants, setIntervenants] = useState([]);
  /* Groupes (classes) : ce qui distingue deux personnes aux mêmes initiales
     dans des classes différentes, et ce qui décide, tablette par tablette, de
     ce qui s'affiche sur l'écran Suivi. Configuration de premier niveau, comme
     intervenants et ateliers. */
  const [groupes, setGroupes] = useState([]);
  const [guidances, setGuidances] = useState(DEFAULT_GUIDANCE);
  const [objectiveTemplates, setObjectiveTemplates] = useState([]);
  const [abcOptions, setAbcOptions] = useState(DEFAULT_ABC);
  /* Bibliothèque des axes de suivi continu et de leurs critères, sans limite
     de nombre : chaque personne active ceux qui la concernent. */
  const [axesSuivi, setAxesSuivi] = useState(DEFAULT_SUIVIS);
  /* Nom de cet appareil. Il voyage dans chaque fichier produit et se retrouve
     dans son nom : sans lui, un dossier de sauvegardes ne dit pas de quelle
     tablette vient quoi. */
  const [appareil, setAppareil] = useState('');
  /* Groupe auquel CETTE tablette est rattachée — distinct du groupe d'une
     personne. C'est lui qui filtre l'écran Suivi (personnesVisibles) : vide,
     rien n'est filtré. Choisi dans PanneauDonnees. */
  const [groupeAppareil, setGroupeAppareil] = useState('');
  /* Intervenant en poste : { intervenantId, jour } — n'attribue les relevés
     pris hors séance qu'à condition d'être encore valide pour aujourd'hui
     (posteValide). Choisi dans PanneauDonnees, périmé au changement de jour
     local plutôt que reconduit d'un jour sur l'autre. */
  const [poste, setPoste] = useState(null);
  const choisirPosteIntervenant = (intervenantId) =>
    setPoste(intervenantId ? { intervenantId, jour: jourLocal(Date.now()) } : null);
  const [sessions, setSessions] = useState([]);
  const [crises, setCrises] = useState([]);
  /* Relevés de suivi continu : un tableau à part, indépendant des séances, sur
     le même modèle que les crises. Tous axes confondus, distingués par
     `suiviId` sur chaque relevé. */
  const [releves, setReleves] = useState([]);
  const [choixSuivi, setChoixSuivi] = useState(null); // personne dont on choisit le critère
  /* Journée de suivi continu ouverte en correction : { studentId, suiviId, jour }.
     Atteignable depuis la feuille de choix comme depuis l'écran Export. */
  const [journeeSuivi, setJourneeSuivi] = useState(null);

  const [activeSession, setActiveSession] = useState(null);
  /* Plusieurs crises ou observations peuvent être ouvertes en même temps :
     chacune garde son propre chronomètre, une seule est affichée à la fois. */
  const [openCrises, setOpenCrises] = useState([]);
  const [activeCrisisId, setActiveCrisisId] = useState(null);
  const crisis = openCrises.find((c) => c.id === activeCrisisId) || null;
  const setCrisis = (maj) =>
    setOpenCrises((l) => l.map((c) => (c.id === activeCrisisId ? (typeof maj === 'function' ? maj(c) : maj) : c)));
  const [crisisTick, setCrisisTick] = useState(Date.now());
  useEffect(() => {
    if (!openCrises.length) return undefined;
    const id = setInterval(() => setCrisisTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [openCrises.length]);
  const [toast, setToast] = useState(null);
  const [toastLeaving, setToastLeaving] = useState(false);
  const toastToken = useRef(0);
  const rootRef = useRef(null);
  const contentRef = useRef(null);
  const [dir, setDir] = useState(0);

  /* Ce qu'il reste à jouer aujourd'hui d'après la semaine type — recalculé
     seulement quand l'emploi du temps, les ateliers ou les séances changent,
     pas à chaque rendu. */
  const planDuJour = React.useMemo(
    () => planifierJour(emploiDuTemps, ateliers, sessions, Date.now()),
    [emploiDuTemps, ateliers, sessions]
  );

  const goTab = React.useCallback(
    (delta) => {
      const i = TAB_ORDER.indexOf(tab);
      const next = i + delta;
      if (next < 0 || next >= TAB_ORDER.length) return;
      setDir(delta);
      setTab(TAB_ORDER[next]);
    },
    [tab]
  );

  /* Sélection directe depuis la barre du bas : referme un écran du tiroir et
     anime dans le sens du déplacement. */
  const allerA = React.useCallback(
    (k) => {
      const i = TAB_ORDER.indexOf(tab);
      const j = TAB_ORDER.indexOf(k);
      setDir(ecran ? 0 : Math.sign(j - i));
      setEcran(null);
      setFocusEcran(null);
      setTab(k);
    },
    [tab, ecran]
  );

  /* Lien croisé : ouvre un panneau du tiroir déjà positionné sur une personne
     ou un objectif précis (`focus`), au lieu de sa liste. */
  const ouvrirEcran = React.useCallback((k, focus = null) => {
    setFocusEcran(focus);
    setEcran(k);
    setTiroir(false);
  }, []);

  /* La barre est figée une fois les cotations lancées, pas avant : l'écran de
     configuration n'a rien à protéger d'un balayage accidentel. Seule la
     cotation en cours ne doit jamais changer d'onglet sous le doigt. */
  const navFige = !ecran && tab === 'session' && !!activeSession;
  const swipeActif = tiroir ? TIROIR_FERME_AU_BALAYAGE : !navFige;

  /* Bouton « Menu » de tous les onglets (Suivi, Session hors cotation, Export)
     et bouton « ‹ Menu » des écrans ouverts depuis le tiroir : une seule
     action, ouvrir le tiroir, quel que soit l'endroit d'où elle part. */
  const ouvrirMenu = React.useCallback(() => { setEcran(null); setFocusEcran(null); setTiroir(true); }, []);

  const onLeft = React.useCallback(() => {
    if (tiroir) { if (TIROIR_FERME_AU_BALAYAGE) setTiroir(false); return; }
    // Depuis un écran ouvert par le tiroir : retour direct à l'onglet
    // d'origine (celui d'où le bouton Menu ou le balayage a été déclenché),
    // sans repasser par le tiroir — `tab` n'a jamais changé entre-temps.
    if (ecran) { setEcran(null); setFocusEcran(null); return; }
    goTab(1);
  }, [tiroir, ecran, goTab]);

  /* Depuis Suivi — l'extrémité gauche — il n'y a pas d'onglet précédent : le
     balayage vers la droite y est libre, c'est lui qui ouvre le tiroir. Depuis
     un écran ouvert par le tiroir, ce même sens ouvre le tiroir à son tour —
     symétrique avec le bouton Menu, pas avec le retour de gauche. */
  const onRight = React.useCallback(() => {
    if (tiroir) return;
    if (ecran) { ouvrirMenu(); return; }
    if (tab === TAB_ORDER[0]) { setTiroir(true); return; }
    goTab(-1);
  }, [tiroir, ecran, tab, ouvrirMenu, goTab]);

  const { offset, dragging } = useHorizontalSwipe(null, { onLeft, onRight, onDocument: true, enabled: swipeActif });

  /* La barre se réduit pendant le défilement et reprend sa taille à l'arrêt —
     sauf là où elle est figée. */
  const [barreReduite, setBarreReduite] = useState(false);
  useEffect(() => {
    if (navFige) { setBarreReduite(false); return undefined; }
    let t = null;
    const onScroll = () => {
      setBarreReduite(true);
      clearTimeout(t);
      t = setTimeout(() => setBarreReduite(false), 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(t);
    };
  }, [navFige]);

  /* Sur tablette, le clavier virtuel réduit la fenêtre : la barre du bas, ancrée
     au viewport de mise en page, remonte et vient se poser au-dessus du champ en
     cours de saisie. On la retire tant qu'un champ a le focus. */
  const [saisieEnCours, setSaisieEnCours] = useState(false);
  useEffect(() => {
    const estChamp = (el) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    const onIn = (e) => { if (estChamp(e.target)) setSaisieEnCours(true); };
    // focusout précède le focusin du champ suivant : on attend un tour
    // d'événements pour ne pas faire clignoter la barre en changeant de champ.
    const onOut = () => { setTimeout(() => setSaisieEnCours(estChamp(document.activeElement)), 0); };
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);

  /* --- chargement ---
     Les réglages de sécurité se lisent en clair, avant tout déverrouillage.
     Les données, elles, ne sont chargées qu'une fois la clé dérivée du code. */
  useEffect(() => {
    (async () => {
      const sec = await store.getRaw('aba:security');
      if (sec) {
        try {
          let parsed = JSON.parse(sec);
          // Un code enregistré sans longueur connue vient d'une version où le
          // changement de code était défectueux : les échecs accumulés
          // portaient sur une saisie impossible, on repart à zéro.
          if (parsed.pinHash && !parsed.pinDigits && (parsed.failedAttempts || parsed.lockUntil)) {
            parsed = { ...parsed, failedAttempts: 0, lockUntil: 0 };
            await store.setRaw('aba:security', JSON.stringify(parsed));
          }
          setSecurity(parsed);
        } catch (e) {}
      }
      setSecurityLoaded(true);
    })();
  }, []);

  /* Protection désactivée : rien à déverrouiller, on charge tout de suite. */
  useEffect(() => {
    if (!securityLoaded || loaded || !security.disabled) return;
    dataKey = null;
    setLocked(false);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [securityLoaded, security.disabled]);

  async function loadData() {
    const config = await store.get('aba:config');
    let retention = 0;
    let nbPersonnes = 0;
    if (config) {
      try {
        const d = JSON.parse(config);
        nbPersonnes = (d.students || []).length;
        setStudents(migrerStudentsGroupe(migrerStudentsSuivi(d.students || [])));
        setAteliers(d.ateliers || []);
        setEmploiDuTemps(migrerEmploiDuTemps(d.emploiDuTemps));
        setIntervenants(d.intervenants || []);
        setGroupes(d.groupes || []);
        setAppareil(d.appareil || '');
        setGroupeAppareil(d.groupeAppareil || '');
        retention = d.retentionMonths || 0;
        setRetentionMonths(retention);
        if (Array.isArray(d.guidances) && d.guidances.length) {
          // Complète les guidances préenregistrées ajoutées depuis, sans toucher aux personnalisées
          const stored = d.guidances;
          const merged =
            (d.guidanceVersion || 1) < GUIDANCE_VERSION
              ? [...stored, ...DEFAULT_GUIDANCE.filter((g) => !stored.some((x) => x.code === g.code))]
              : stored;
          setGuidances(merged);
        }
        /* Ces trois listes étaient sauvegardées (persistAll et l'effet de
           sauvegarde de la configuration écrivent déjà ces champs) mais
           jamais relues ici : l'effet réécrivait aba:config avec les valeurs
           par défaut à chaque chargement, effaçant silencieusement les
           réponses ABC, les modèles d'objectifs et les axes de suivi continu
           personnalisés. */
        setAbcOptions({ ...DEFAULT_ABC, ...(d.abcOptions || {}) });
        if (Array.isArray(d.objectiveTemplates)) setObjectiveTemplates(d.objectiveTemplates);
        setAxesSuivi(migrerAxesSuivi(d.axesSuivi));
      } catch (e) {}
    }

    let loadedSessions = [];
    let loadedCrises = [];
    /* Ancien format : un seul bloc. On le relit, puis il sera réparti par mois
       à la première sauvegarde. */
    const ancien = await store.get('aba:sessions');
    if (ancien) {
      try { loadedSessions = JSON.parse(ancien) || []; } catch (e) {}
    } else {
      const idx = await store.get(SESSIONS_INDEX);
      let mois = [];
      if (idx) { try { mois = JSON.parse(idx) || []; } catch (e) {} }
      for (const m of mois) {
        const bloc = await store.get(`aba:sessions:${m}`);
        if (!bloc) continue;
        try { loadedSessions = loadedSessions.concat(JSON.parse(bloc) || []); } catch (e) {}
      }
      loadedSessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    const cri = await store.get('aba:crises');
    if (cri) { try { loadedCrises = JSON.parse(cri) || []; } catch (e) {} }
    /* Nouvelle clé aba:suivi ; repli sur l'ancienne aba:stabilite tant qu'une
       tablette n'a pas encore réécrit la sienne (voir clesDonnees et
       persistAll : l'ancienne clé n'est vidée qu'une fois la nouvelle
       confirmée). */
    let loadedReleves = [];
    const suv = await store.get('aba:suivi');
    if (suv) {
      try { loadedReleves = JSON.parse(suv) || []; } catch (e) {}
    } else {
      const sta = await store.get('aba:stabilite');
      if (sta) { try { loadedReleves = JSON.parse(sta) || []; } catch (e) {} }
    }
    loadedReleves = migrerReleves(loadedReleves);

    // Purge automatique au-delà de la durée de conservation retenue
    if (retention > 0) {
      const limite = new Date();
      limite.setMonth(limite.getMonth() - retention);
      const gardeS = loadedSessions.filter((x) => new Date(x.date) >= limite);
      const gardeC = loadedCrises.filter((x) => new Date(x.date) >= limite);
      const gardeT = loadedReleves.filter((x) => new Date(x.timestamp) >= limite);
      const retires = (loadedSessions.length - gardeS.length) + (loadedCrises.length - gardeC.length) + (loadedReleves.length - gardeT.length);
      if (retires > 0) {
        loadedSessions = gardeS;
        loadedCrises = gardeC;
        loadedReleves = gardeT;
        setTimeout(() => notify(`${retires} enregistrement${retires > 1 ? 's' : ''} supprimé${retires > 1 ? 's' : ''} (durée de conservation)`), 600);
      }
    }
    setSessions(loadedSessions);
    setCrises(migrerEnvoisCrises(loadedCrises, loadedSessions));
    setReleves(loadedReleves);

    const act = await store.get('aba:active');
    if (act) { try { setActiveSession(JSON.parse(act)); } catch (e) {} }

    const pos = await store.get('aba:poste');
    if (pos) { try { setPoste(JSON.parse(pos)); } catch (e) {} }

    /* Tablette neuve : rien à coter, on ouvre directement sur la configuration
       des personnes accompagnées. Dès qu'une personne existe, l'application
       reprend son comportement normal et démarre sur Session. */
    if (nbPersonnes === 0) setEcran('personnes');

    setLoaded(true);
  }

  /* Toutes les clés contenant des données, mois par mois compris. */
  async function clesDonnees() {
    const base = ['aba:config', 'aba:sessions', 'aba:crises', 'aba:suivi', 'aba:stabilite', 'aba:active', 'aba:poste', SESSIONS_INDEX];
    const idx = await store.getRaw(SESSIONS_INDEX);
    if (!idx) return base;
    try {
      const brut = dataKey ? await decryptValue(idx, dataKey) : idx;
      const mois = JSON.parse(brut) || [];
      return base.concat(mois.map((m) => `aba:sessions:${m}`));
    } catch (e) {
      return base;
    }
  }

  /* Vérifie qu'une clé déchiffre bien les données déjà enregistrées. */
  async function keyOpensData(key) {
    const raw = await store.getRaw('aba:config');
    if (raw == null) return true; // rien d'enregistré, rien à vérifier
    let env = null;
    try { env = JSON.parse(raw); } catch (e) { return true; }
    if (!env || env.__enc !== 1) return true; // enregistrement en clair
    try {
      await decryptValue(raw, key);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Rechiffre les données d'une clé vers une autre, au niveau du stockage :
     aucune donnée ne transite par l'état React, ce qui évite toute perte. */
  async function reEncrypt(fromKey, toKey) {
    for (const k of await clesDonnees()) {
      const raw = await store.getRaw(k);
      if (raw == null) continue;
      try {
        const plain = await decryptValue(raw, fromKey);
        await store.setRaw(k, await encryptValue(plain, toKey));
      } catch (e) { /* enregistrement illisible : on n'y touche pas */ }
    }
  }

  /* Déverrouillage : on dérive la clé de chiffrement, puis on charge. */
  async function unlockWith(pin) {
    let sec = security;
    let changed = false;
    if (!sec.dataSalt) {
      // Installation antérieure au chiffrement : on crée le sel maintenant,
      // les données en clair seront réécrites chiffrées à la première sauvegarde.
      sec = { ...sec, dataSalt: newSalt() };
      changed = true;
    }
    if (!sec.pinDigits) {
      // Longueur inconnue : on la retient d'après le code réellement saisi
      sec = { ...sec, pinDigits: pin.length };
      changed = true;
    }
    if (sec.failedAttempts || sec.lockUntil) {
      sec = { ...sec, failedAttempts: 0, lockUntil: 0 };
      changed = true;
    }
    if (changed) {
      setSecurity(sec);
      await store.setRaw('aba:security', JSON.stringify(sec));
    }

    const key = await deriveDataKey(pin, sec.dataSalt);

    /* Réparation d'une anomalie d'une version antérieure : lors d'un changement
       de code, le code saisi n'était pas transmis et les données avaient été
       rechiffrées avec une clé bâtie sur une valeur vide. On la reconnaît ici
       et on rechiffre proprement avec le code réel. */
    if (!(await keyOpensData(key))) {
      const cleDefectueuse = await deriveDataKey('undefined', sec.dataSalt);
      if (await keyOpensData(cleDefectueuse)) {
        await reEncrypt(cleDefectueuse, key);
        setTimeout(() => notify('Données récupérées et rechiffrées'), 600);
      }
    }

    dataKey = key;
    setLocked(false);
    await loadData();
  }

  /* Réécrit toutes les données avec la clé courante — utilisé après un
     changement de code, puisque l'ancienne clé ne déchiffrerait plus rien. */
  async function persistAll() {
    await store.set('aba:config', JSON.stringify({ students, ateliers, emploiDuTemps, intervenants, groupes, guidances, guidanceVersion: GUIDANCE_VERSION, retentionMonths, objectiveTemplates, abcOptions, axesSuivi, appareil, groupeAppareil }));
    moisEcrits.current = {};
    await persistSessions(sessions);
    await store.set('aba:crises', JSON.stringify(crises));
    if (await store.set('aba:suivi', JSON.stringify(releves))) {
      await store.setRaw('aba:stabilite', '');
    }
    await store.set('aba:active', JSON.stringify(activeSession));
    await store.set('aba:poste', JSON.stringify(poste));
  }

  async function changePin(pinHash, pinSalt, pinDigits, pin, mode) {
    const dataSalt = newSalt();
    const next = { ...security, pinHash, pinSalt, pinDigits, mode: mode || security.mode || 'pin', dataSalt, failedAttempts: 0, lockUntil: 0 };
    setSecurity(next);
    await store.setRaw('aba:security', JSON.stringify(next));
    dataKey = await deriveDataKey(pin, dataSalt);
    await persistAll();
    notify('Code modifié');
  }

  /* Désactivation : les données sont déchiffrées et réécrites en clair.
     C'est un vrai recul de protection, la confirmation le dit sans détour. */
  async function disableProtection() {
    const cle = dataKey;
    if (cle) {
      for (const k of await clesDonnees()) {
        const raw = await store.getRaw(k);
        if (raw == null) continue;
        try { await store.setRaw(k, await decryptValue(raw, cle)); } catch (e) { /* déjà en clair */ }
      }
    }
    dataKey = null;
    const next = { disabled: true, pinHash: null, pinSalt: null, dataSalt: null, pinDigits: null, mode: null, failedAttempts: 0, lockUntil: 0 };
    setSecurity(next);
    await store.setRaw('aba:security', JSON.stringify(next));
    setLocked(false);
    notify('Protection désactivée, données déchiffrées');
  }

  async function registerFailedAttempt(failedAttempts, lockUntil) {
    const next = { ...security, failedAttempts, lockUntil };
    setSecurity(next);
    await store.setRaw('aba:security', JSON.stringify(next));
  }

  useEffect(() => {
    if (!securityLoaded) return;
    store.setRaw('aba:security', JSON.stringify(security));
  }, [security, securityLoaded]);

  /* Verrouillage automatique : dès que l'app repasse au premier plan après
     avoir été masquée (écran éteint, changement d'appli), et après un long
     moment sans interaction pendant qu'elle reste affichée. */
  useEffect(() => {
    if (!security.pinHash || security.disabled) return undefined;
    let idleTimer = null;
    const IDLE_MS = 10 * 60 * 1000;
    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setLocked(true), IDLE_MS);
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') setLocked(true); };
    document.addEventListener('visibilitychange', onVisibility);
    ['touchstart', 'mousedown', 'keydown'].forEach((ev) => document.addEventListener(ev, resetIdle));
    resetIdle();
    return () => {
      clearTimeout(idleTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      ['touchstart', 'mousedown', 'keydown'].forEach((ev) => document.removeEventListener(ev, resetIdle));
    };
  }, [security.pinHash]);

  /* --- sauvegardes --- */
  useEffect(() => {
    if (!loaded) return;
    store.set('aba:config', JSON.stringify({ students, ateliers, emploiDuTemps, intervenants, groupes, guidances, guidanceVersion: GUIDANCE_VERSION, retentionMonths, objectiveTemplates, abcOptions, axesSuivi, appareil, groupeAppareil }));
  }, [students, ateliers, emploiDuTemps, intervenants, groupes, guidances, retentionMonths, objectiveTemplates, abcOptions, axesSuivi, appareil, groupeAppareil, loaded]);
  /* Empreinte du dernier enregistrement de chaque mois, pour n'écrire que ce
     qui a réellement changé. */
  const moisEcrits = useRef({});

  async function persistSessions(liste) {
    const groupes = grouperParMois(liste);
    const mois = Object.keys(groupes).sort();
    for (const m of mois) {
      const contenu = JSON.stringify(groupes[m]);
      if (moisEcrits.current[m] === contenu) continue;
      await store.set(`aba:sessions:${m}`, contenu);
      moisEcrits.current[m] = contenu;
    }
    // Mois devenus vides : on retire leur clé
    for (const m of Object.keys(moisEcrits.current)) {
      if (groupes[m]) continue;
      await store.setRaw(`aba:sessions:${m}`, '');
      delete moisEcrits.current[m];
    }
    await store.set(SESSIONS_INDEX, JSON.stringify(mois));
    // L'ancien bloc unique n'a plus lieu d'être
    const ancien = await store.getRaw('aba:sessions');
    if (ancien) await store.setRaw('aba:sessions', '');
  }

  useEffect(() => {
    if (!loaded) return;
    persistSessions(sessions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, loaded]);
  useEffect(() => {
    if (!loaded) return;
    store.set('aba:crises', JSON.stringify(crises));
  }, [crises, loaded]);
  useEffect(() => {
    if (!loaded) return;
    /* L'ancienne clé n'est vidée qu'une fois la nouvelle confirmée : jamais
       l'inverse, pour ne pas se retrouver sans aucune copie lisible. */
    (async () => {
      const ecrit = await store.set('aba:suivi', JSON.stringify(releves));
      if (ecrit) {
        const ancien = await store.getRaw('aba:stabilite');
        if (ancien) await store.setRaw('aba:stabilite', '');
      }
    })();
  }, [releves, loaded]);
  useEffect(() => {
    if (!loaded) return;
    store.set('aba:active', JSON.stringify(activeSession));
  }, [activeSession, loaded]);
  useEffect(() => {
    if (!loaded) return;
    store.set('aba:poste', JSON.stringify(poste));
  }, [poste, loaded]);

  function notify(msg) {
    const jeton = ++toastToken.current;
    setToast(msg);
    setToastLeaving(false);
    setTimeout(() => { if (toastToken.current === jeton) setToastLeaving(true); }, 2600);
    setTimeout(() => { if (toastToken.current === jeton) setToast(null); }, 2760);
  }

  /* --- gestion --- */
  const addStudent = (initials, groupeId = null) => setStudents((s) => [...s, { id: uid(), initials, groupeId, objectives: [] }]);
  const removeStudent = (id) => setStudents((s) => s.filter((x) => x.id !== id));
  const renameStudent = (id, initials) => setStudents((s) => s.map((x) => (x.id === id ? { ...x, initials } : x)));
  /* Distinct de renameStudent : le groupe conditionne l'écran Suivi
     (personnesVisibles), pas juste l'affichage d'une fiche. */
  const setStudentGroupe = (id, groupeId) => setStudents((s) => s.map((x) => (x.id === id ? { ...x, groupeId } : x)));
  const addAtelier = (name) => setAteliers((a) => [...a, { id: uid(), name }]);
  const removeAtelier = (id) => {
    setAteliers((a) => a.filter((x) => x.id !== id));
    // Sans ce nettoyage, l'id supprimé reste dans emploiDuTemps — absorbé en
    // silence par ateliersDuJour, mais visible dans la grille de la semaine.
    setEmploiDuTemps((e) => {
      const suivant = {};
      Object.keys(e).forEach((cle) => { suivant[cle] = e[cle].filter((aid) => aid !== id); });
      return suivant;
    });
  };
  const renameAtelier = (id, name) => setAteliers((a) => a.map((x) => (x.id === id ? { ...x, name } : x)));
  /* Mémorisation cumulative : la liste des personnes habituelles et celle des
     prioritaires sont remplacées, mais les objectifs mémorisés des personnes
     absentes ce jour-là sont conservés. Sans ça, une personne qui manque le
     jour de la mémorisation perd sa liste — et l'ajouter en pleine séance
     obligerait à repasser par l'écran de configuration. */
  const setAtelierGroup = (id, config) =>
    setAteliers((a) => a.map((x) => {
      if (x.id !== id) return x;
      /* Si ce jour-là porte déjà une liste propre, c'est elle que la
         mémorisation met à jour : mémoriser un mardi ne doit pas écraser le
         réglage commun aux autres jours. */
      const jour = String(new Date().getDay());
      const ajuste = x.personnesParJour && Array.isArray(x.personnesParJour[jour]);
      return {
        ...x,
        ...(ajuste
          ? { personnesParJour: { ...x.personnesParJour, [jour]: config.studentIds } }
          : { usualStudentIds: config.studentIds }),
        usualObjectives: { ...(x.usualObjectives || {}), ...config.objectives },
        favoriteObjectiveIds: config.favorites,
        knownObjectiveIds: Array.from(new Set([...(x.knownObjectiveIds || []), ...(config.known || [])])),
      };
    }));

  /* Réglage à froid d'un atelier, depuis son propre panneau — distinct de
     setAtelierGroup (mémorisation cumulative depuis une séance réelle). Ici
     un décochage doit retirer, pas être protégé : setAtelierPersonnes et
     setAtelierObjectifs remplacent plutôt que de fusionner. */
  const basculerAtelierJour = (atelierId, jour) =>
    setEmploiDuTemps((e) => {
      const cle = String(jour);
      const ids = e[cle] || [];
      return { ...e, [cle]: ids.includes(atelierId) ? ids.filter((id) => id !== atelierId) : [...ids, atelierId] };
    });
  const reordonnerJourAtelier = (jour, ids) => setEmploiDuTemps((e) => ({ ...e, [String(jour)]: ids }));
  const appliquerOrdreJour = (jour) => setEmploiDuTemps((e) => appliquerOrdreAuxAutresJours(e, jour));
  const setAtelierPersonnes = (atelierId, studentIds) =>
    setAteliers((a) => a.map((x) => (x.id === atelierId ? { ...x, usualStudentIds: studentIds } : x)));
  /* Liste propre à un jour. `studentIds === null` supprime la variante : le
     jour repasse sous le réglage commun, et le champ disparaît des données
     quand plus aucun jour ne s'en écarte. */
  const setAtelierPersonnesJour = (atelierId, jour, studentIds) =>
    setAteliers((a) => a.map((x) => {
      if (x.id !== atelierId) return x;
      const variantes = { ...(x.personnesParJour || {}) };
      if (studentIds === null) delete variantes[String(jour)];
      else variantes[String(jour)] = studentIds;
      if (!Object.keys(variantes).length) {
        const { personnesParJour, ...reste } = x;
        return reste;
      }
      return { ...x, personnesParJour: variantes };
    }));
  const setAtelierObjectifs = (atelierId, studentId, objectiveIds) =>
    setAteliers((a) => a.map((x) => (x.id === atelierId
      ? {
          ...x,
          usualObjectives: { ...(x.usualObjectives || {}), [studentId]: objectiveIds },
          knownObjectiveIds: Array.from(new Set([...(x.knownObjectiveIds || []), ...objectiveIds])),
        }
      : x)));
  const toggleAtelierFavori = (atelierId, objectiveId) =>
    setAteliers((a) => a.map((x) => {
      if (x.id !== atelierId) return x;
      const favs = x.favoriteObjectiveIds || [];
      return { ...x, favoriteObjectiveIds: favs.includes(objectiveId) ? favs.filter((id) => id !== objectiveId) : [...favs, objectiveId] };
    }));

  const addIntervenant = (name) => setIntervenants((l) => [...l, { id: uid(), name }]);
  const removeIntervenant = (id) => setIntervenants((l) => l.filter((x) => x.id !== id));
  const renameIntervenant = (id, name) => setIntervenants((l) => l.map((x) => (x.id === id ? { ...x, name } : x)));
  /* Suppression jamais en cascade : une personne qui portait ce groupe le
     garde, affiché en « Groupe retiré » (GROUPE_INCONNU) partout où il est
     lu — même principe que la suppression d'un intervenant ou d'un axe de
     suivi. */
  const addGroupe = (name) => setGroupes((l) => [...l, { id: uid(), name }]);
  const removeGroupe = (id) => setGroupes((l) => l.filter((x) => x.id !== id));
  const renameGroupe = (id, name) => setGroupes((l) => l.map((x) => (x.id === id ? { ...x, name } : x)));
  /* Depuis la fiche d'une personne : crée le groupe et l'affecte dans le même
     geste, l'id étant généré ici plutôt que dans deux actions dépendantes qui
     liraient un état pas encore à jour. Second point d'entrée de création de
     groupe, assumé : un geste humain explicite sur une fiche n'a rien à voir
     avec la création automatique et silencieuse interdite à l'import (voir
     resoudreGroupeImporte, qui ne crée jamais de groupe). */
  const creerGroupeEtAffecter = (studentId, name) => {
    const id = uid();
    setGroupes((l) => [...l, { id, name }]);
    setStudents((s) => s.map((x) => (x.id === studentId ? { ...x, groupeId: id } : x)));
  };
  const addGuidance = (g) => setGuidances((l) => [...l, g]);
  const removeGuidance = (code) => setGuidances((l) => (l.length > 1 ? l.filter((x) => x.code !== code) : l));
  const toggleIndependent = (code) => setGuidances((l) => l.map((x) => (x.code === code ? { ...x, independent: !x.independent } : x)));

  const saveTemplate = (obj) => {
    const modele = modeleDepuisObjectif(obj);
    setObjectiveTemplates((l) => [...l, { ...modele, name: nomModeleDisponible(modele.name, l) }]);
    notify('Modèle enregistré');
  };
  const addTemplate = (obj) =>
    setObjectiveTemplates((l) => {
      const modele = modeleDepuisObjectif(obj);
      return [...l, { ...modele, name: nomModeleDisponible(modele.name, l) }];
    });
  const updateTemplate = (id, obj) =>
    setObjectiveTemplates((l) => {
      const modele = modeleDepuisObjectif(obj);
      return l.map((t) => (t.id === id ? { ...modele, id, name: nomModeleDisponible(modele.name, l, id) } : t));
    });
  const removeTemplate = (id) => setObjectiveTemplates((l) => l.filter((t) => t.id !== id));
  const appliquerTemplate = (templateId, studentIds, nom) => {
    const t = objectiveTemplates.find((x) => x.id === templateId);
    if (!t || !studentIds.length) return;
    studentIds.forEach((sid) => addObjective(sid, instancierModele(t, nom)));
    notify(`Modèle appliqué à ${studentIds.length} personne${studentIds.length !== 1 ? 's' : ''}`);
  };

  /* Export de configuration : ateliers, intervenants, groupes, guidances et
     modèles. Aucune personne, aucune séance, aucune crise — le fichier ne
     contient donc aucune donnée d'usager et peut circuler librement entre
     appareils. */
  function exportConfig() {
    const payload = {
      format: 'aba-config',
      version: 1,
      exportedAt: new Date().toISOString(),
      ateliers: ateliers.map(({ usualStudentIds, usualObjectives, favoriteObjectiveIds, knownObjectiveIds, personnesParJour, ...a }) => a),
      emploiDuTemps,
      intervenants,
      groupes,
      guidances,
      objectiveTemplates,
      abcOptions,
      axesSuivi,
      appareil,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    downloadBlob(blob, nomFichier('configuration-aba', appareil, 'json'));
    notify('Configuration exportée');
  }

  function importConfig(d) {
    const nbA = (d.ateliers || []).length;
    const nbI = (d.intervenants || []).length;
    const nbG = (d.groupes || []).length;
    const nbT = (d.objectiveTemplates || []).length;
    if (!window.confirm(
      `Importer cette configuration ?\n\n${nbA} atelier(s), ${nbI} intervenant(s), ${nbG} groupe(s), ${nbT} modèle(s) d'objectif.\n\nLes éléments existants sont conservés, les nouveaux s'ajoutent.`
    )) return;
    /* Un atelier importé dont le nom existe déjà localement est écarté au
       profit de l'atelier existant : son id d'origine doit être remappé vers
       l'id local avant de fusionner l'emploi du temps importé, sans quoi il
       pointerait vers un atelier qui n'a jamais été créé ici. */
    const correspondance = {};
    (d.ateliers || []).forEach((a) => {
      const existant = ateliers.find((x) => x.name === a.name);
      correspondance[a.id] = existant ? existant.id : a.id;
    });
    setAteliers((cur) => [...cur, ...(d.ateliers || []).filter((a) => !cur.some((x) => x.name === a.name))]);
    if (d.emploiDuTemps) {
      const importe = migrerEmploiDuTemps(d.emploiDuTemps);
      setEmploiDuTemps((cur) => {
        const next = { ...cur };
        JOURS.forEach(({ k }) => {
          const cle = String(k);
          const ids = (importe[cle] || []).map((id) => correspondance[id] || id);
          const deja = next[cle] || [];
          const ajouts = ids.filter((id) => !deja.includes(id));
          if (ajouts.length) next[cle] = [...deja, ...ajouts];
        });
        return next;
      });
    }
    setIntervenants((cur) => [...cur, ...(d.intervenants || []).filter((i) => !cur.some((x) => x.name === i.name))]);
    setGroupes((cur) => [...cur, ...(d.groupes || []).filter((g) => !cur.some((x) => x.name === g.name))]);
    setGuidances((cur) => [...cur, ...(d.guidances || []).filter((g) => !cur.some((x) => x.code === g.code))]);
    setObjectiveTemplates((cur) => [...cur, ...(d.objectiveTemplates || []).filter((t) => !cur.some((x) => x.name === t.name))]);
    if (d.abcOptions) {
      setAbcOptions((cur) => ({
        antecedents: [...cur.antecedents, ...(d.abcOptions.antecedents || []).filter((v) => !cur.antecedents.includes(v))],
        comportements: [...cur.comportements, ...(d.abcOptions.comportements || []).filter((v) => !cur.comportements.includes(v))],
        consequences: [...cur.consequences, ...(d.abcOptions.consequences || []).filter((v) => !cur.consequences.includes(v))],
      }));
    }
    if (Array.isArray(d.axesSuivi) && d.axesSuivi.length) {
      setAxesSuivi((cur) => [...cur, ...d.axesSuivi.filter((a) => !cur.some((x) => x.nom === a.nom))]);
    }
    if (d.appareil && !appareil.trim()) setAppareil(d.appareil);
    notify('Configuration importée');
  }

  /* --- sauvegarde / restauration --- */
  const [backupPrompt, setBackupPrompt] = useState(null); // { mode: 'export' } | { mode: 'import', envelope, error }
  /* Import d'un fichier de profils : { payload } le temps que l'écran de
     rapprochement soit validé, puis null. */
  const [rapprochement, setRapprochement] = useState(null);
  /* Conflits d'objectifs à trancher, enchaînés depuis la validation du
     rapprochement : { conflits: [{ studentId, importe, local }], resume }. */
  const [arbitrage, setArbitrage] = useState(null);

  /* Applique un rapprochement validé : les personnes déjà alignées ou
     rapprochées à la main sont fusionnées, les autres deviennent de
     nouvelles personnes avec leurs objectifs importés tels quels — rien à
     trancher, elles n'existaient pas ici. Pour les personnes appariées à une
     personne existante, chaque objectif importé est diffé (diffObjectifsPersonne) :
     les identiques ou déjà alignés ne bougent pas, les nouveaux s'ajoutent
     directement, les conflits partent vers l'écran d'arbitrage plutôt que
     d'être tranchés en silence. */
  function appliquerRapprochement(propositions, choix) {
    const payload = rapprochement.payload;
    const correspondance = {};
    const nouvellesPersonnes = [];

    propositions.forEach((p) => {
      const importeId = p.importe.id;
      if (p.statut === 'deja-aligne') {
        correspondance[importeId] = importeId;
        return;
      }
      const c = choix[importeId];
      if (c && c !== 'nouvelle') {
        correspondance[importeId] = c;
        return;
      }
      const nouvelId = uid();
      const groupeImp = groupeDe(payload.groupes, p.importe.groupeId);
      const groupeResolu = groupeImp ? resoudreGroupeImporte(groupes, groupeImp.name) : null;
      nouvellesPersonnes.push({ ...p.importe, id: nouvelId, groupeId: groupeResolu });
      correspondance[importeId] = nouvelId;
    });

    const conflits = [];
    let ajoutes = 0;
    const studentsMisAJour = students.map((st) => {
      const importe = payload.students.find((im) => correspondance[im.id] === st.id);
      if (!importe) return st;
      const diff = diffObjectifsPersonne(st.objectives, importe.objectives || []);
      let objectives = st.objectives;
      diff.forEach((d) => {
        if (d.statut === 'nouveau') {
          objectives = [...objectives, { ...d.importe }];
          ajoutes++;
        } else if (d.statut === 'conflit') {
          conflits.push({ studentId: st.id, importe: d.importe, local: d.local });
        }
      });
      return objectives === st.objectives ? st : { ...st, objectives };
    });

    setStudents([...studentsMisAJour, ...nouvellesPersonnes]);
    setRapprochement(null);

    if (conflits.length) {
      setArbitrage({ conflits, resume: { nouvelles: nouvellesPersonnes.length, ajoutes } });
    } else {
      notify(`Profils importés : ${nouvellesPersonnes.length} nouvelle(s) personne(s), ${ajoutes} objectif(s) ajouté(s).`);
    }
  }

  /* Applique les décisions de l'écran d'arbitrage. « Prendre l'importé »
     conserve l'id LOCAL de l'objectif : n'étant jamais autorisé sur un
     objectif déjà coté (objectifDejaCote, vérifié aussi côté écran), rien
     d'externe n'en dépend, et ça évite tout remappage en aval. « Garder les
     deux » ajoute l'objectif importé avec un id neuf et un nom disponible. */
  function appliquerArbitrage(decisions) {
    const conflits = arbitrage.conflits;
    setStudents((cur) => cur.map((st) => {
      const mesConflits = conflits.map((c, i) => ({ ...c, i })).filter((c) => c.studentId === st.id);
      if (!mesConflits.length) return st;
      let objectives = st.objectives;
      mesConflits.forEach((c) => {
        const decision = decisions[c.i] || 'deux';
        if (decision === 'local') return;
        if (decision === 'importe') {
          objectives = objectives.map((o) => (o.id === c.local.id ? { ...c.importe, id: c.local.id } : o));
        } else if (decision === 'deux') {
          objectives = [...objectives, { ...c.importe, id: uid(), name: nomDisponible(c.importe.name, objectives) }];
        }
      });
      return { ...st, objectives };
    }));
    setArbitrage(null);
    notify('Objectifs importés arbitrés et appliqués.');
  }

  function exportBackup() {
    setBackupPrompt({ mode: 'export-choix' });
  }

  /* Fichier destiné à DatABA Manager, limité aux séances retenues.
     On y joint la configuration des personnes concernées : Manager en a besoin
     pour retrouver les critères d'acquisition. Les personnes absentes de la
     sélection n'y figurent pas. */
  function payloadManager(seancesRetenues) {
    const idsConcernes = new Set();
    seancesRetenues.forEach((se) => (se.studentIds || []).forEach((id) => idsConcernes.add(id)));
    const crisesRetenues = crises.filter((c) => !c.sessionId || seancesRetenues.some((se) => se.id === c.sessionId));
    /* Les relevés de suivi continu ne sont rattachés à aucune séance : on
       joint ceux des personnes concernées par la sélection. C'est Manager qui
       les croisera ensuite avec les bornes horaires des séances. */
    const relevesRetenus = releves.filter((r) => idsConcernes.has(r.studentId));
    return {
      format: 'aba-backup',
      version: 4,
      exportedAt: new Date().toISOString(),
      appareil,
      /* groupeId voyage déjà sur chaque personne (aucun champ retiré) ; sans
         la liste des groupes ci-dessous, Manager n'aurait qu'un identifiant
         opaque et ne pourrait pas distinguer deux homonymes de classes
         différentes — la raison d'être du groupe dans le croisement. */
      students: students.filter((st) => idsConcernes.has(st.id)),
      ateliers,
      emploiDuTemps,
      intervenants,
      groupes,
      guidances,
      axesSuivi,
      sessions: seancesRetenues,
      crises: crisesRetenues,
      suivi: relevesRetenus,
      stabilite: releverAliasStabilite(relevesRetenus),
    };
  }

  /* Même boîte de dialogue que l'export Excel — partage natif, ou
     téléchargement si le partage n'est pas disponible — et même règle
     d'archivage : `apresExport` (la fonction qui marque les séances comme
     transmises) n'est appelée que si le fichier est réellement parti. Pour le
     chemin chiffré, la continuation attend la validation de la passphrase :
     voir confirmExport. */
  async function exportManager(seancesRetenues, chiffre, apresExport) {
    const payload = payloadManager(seancesRetenues);
    const nom = nomFichier('pour-manager', appareil, 'json');
    if (!chiffre) {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const ok = await shareReport({ blob, name: nom, title: nom, notify });
      if (ok && apresExport) apresExport();
      return;
    }
    setBackupPrompt({ mode: 'export', managerPayload: payload, managerNom: nom, apresExport });
  }

  /* Profils (personnes + objectifs) vers une autre tablette : `portee`
     'groupe' pour « mes profils » (filtré sur groupeAppareil), 'complet' pour
     la rediffusion depuis une tablette centrale (tout le parc — voir PR7).
     Toujours chiffré, sans choix clair/chiffré comme pour la sauvegarde
     complète : ce fichier ne contient que des données d'usagers, jamais de
     raison de le laisser lisible en clair. */
  function exportProfils(portee) {
    const concernes = portee === 'complet' ? students : profilsDuGroupe(students, groupeAppareil);
    const payload = payloadProfils({
      students: concernes,
      groupes,
      axesSuivi: axesUtilises(concernes, axesSuivi),
      appareil,
      portee,
      maintenant: Date.now(),
    });
    const nom = nomFichier(portee === 'complet' ? 'profils-complets' : 'mes-profils', appareil, 'json');
    setBackupPrompt({ mode: 'export', profilsPayload: payload, profilsNom: nom });
  }

  /* Ce qui a été coté ici pour des personnes d'un autre groupe, à renvoyer
     vers leur tablette — jamais vers Manager, qui n'a que faire de savoir
     quelle tablette a coté quoi. Toujours chiffré, mêmes données personnelles
     que « mes profils ». Un même fichier peut contenir des tranches
     destinées à plusieurs tablettes : le tri se fait à la réception
     (fusionnerSuiviRecu), pas à l'envoi — pas besoin de savoir d'avance qui
     le recevra. */
  function exportSuiviHorsGroupe() {
    const payload = {
      format: 'aba-suivi-transfert',
      version: 1,
      exportedAt: new Date().toISOString(),
      appareil,
      sessions: sessionsHorsGroupe(sessions, students, groupeAppareil),
      crises: crisesHorsGroupe(crises, students, groupeAppareil),
      suivi: relevesHorsGroupe(releves, students, groupeAppareil),
    };
    const nom = nomFichier('suivi-hors-groupe', appareil, 'json');
    setBackupPrompt({ mode: 'export', suiviPayload: payload, suiviNom: nom });
  }

  /* Applique une fusion additive stricte (fusionnerSuiviRecu) et résume ce
     qui a été ajouté, déjà présent ou ignoré — jamais un silence qui
     laisserait croire à un échec quand une partie du fichier ne concernait
     simplement pas cette tablette. */
  function appliquerSuiviRecu(payload) {
    const avant = { sessions: sessions.length, crises: crises.length, releves: releves.length };
    const resultat = fusionnerSuiviRecu({
      sessionsLocales: sessions, crisesLocales: crises, relevesLocales: releves,
      studentsLocaux: students, recu: payload,
    });
    setSessions(resultat.sessions);
    setCrises(resultat.crises);
    setReleves(resultat.releves);
    const ajoutSeances = resultat.sessions.length - avant.sessions;
    const ajoutCrises = resultat.crises.length - avant.crises;
    const ajoutReleves = resultat.releves.length - avant.releves;
    const { idInconnu, dejaPresentes } = resultat.ignorees;
    const parts = [];
    if (ajoutSeances) parts.push(`${ajoutSeances} séance(s)`);
    if (ajoutCrises) parts.push(`${ajoutCrises} crise(s)`);
    if (ajoutReleves) parts.push(`${ajoutReleves} relevé(s)`);
    let msg = parts.length ? `Suivi reçu : ${parts.join(', ')} ajouté(s)` : 'Suivi reçu : rien de nouveau';
    if (dejaPresentes) msg += ` — ${dejaPresentes} déjà présent(s)`;
    if (idInconnu) msg += ` — ${idInconnu} ignoré(s), non reconnus ici`;
    notify(msg);
  }

  /* Sauvegarde en clair : lisible sans mot de passe, donc à réserver aux
     transferts qui restent dans un espace déjà protégé. */
  function exportBackupClair() {
    const payload = { format: 'aba-backup', version: 4, exportedAt: new Date().toISOString(), appareil, groupeAppareil, students, ateliers, emploiDuTemps, intervenants, groupes, guidances, axesSuivi, sessions, crises, suivi: releves, stabilite: releverAliasStabilite(releves) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    downloadBlob(blob, nomFichier('sauvegarde-aba', appareil, 'json'));
    setBackupPrompt(null);
    notify('Sauvegarde exportée sans chiffrement');
  }


  async function confirmExport(passphrase) {
    if (backupPrompt && backupPrompt.managerPayload) {
      const enveloppe = await encryptJSON(backupPrompt.managerPayload, passphrase);
      const blob = new Blob([JSON.stringify(enveloppe)], { type: 'application/json' });
      const ok = await shareReport({ blob, name: backupPrompt.managerNom, title: backupPrompt.managerNom, notify });
      const apresExport = backupPrompt.apresExport;
      setBackupPrompt(null);
      if (ok && apresExport) apresExport();
      return;
    }
    if (backupPrompt && backupPrompt.profilsPayload) {
      const enveloppe = await encryptJSON(backupPrompt.profilsPayload, passphrase);
      const blob = new Blob([JSON.stringify(enveloppe)], { type: 'application/json' });
      await shareReport({ blob, name: backupPrompt.profilsNom, title: backupPrompt.profilsNom, notify });
      setBackupPrompt(null);
      return;
    }
    if (backupPrompt && backupPrompt.suiviPayload) {
      const enveloppe = await encryptJSON(backupPrompt.suiviPayload, passphrase);
      const blob = new Blob([JSON.stringify(enveloppe)], { type: 'application/json' });
      await shareReport({ blob, name: backupPrompt.suiviNom, title: backupPrompt.suiviNom, notify });
      setBackupPrompt(null);
      return;
    }
    const payload = { format: 'aba-backup', version: 4, exportedAt: new Date().toISOString(), appareil, groupeAppareil, students, ateliers, emploiDuTemps, intervenants, groupes, guidances, axesSuivi, sessions, crises, suivi: releves, stabilite: releverAliasStabilite(releves) };
    const envelope = await encryptJSON(payload, passphrase);
    const blob = new Blob([JSON.stringify(envelope)], { type: 'application/json' });
    downloadBlob(blob, nomFichier('sauvegarde-aba', appareil, 'json'));
    setBackupPrompt(null);
    notify('Sauvegarde chiffrée exportée');
  }


  function applyRestoredData(d) {
    if (!d || !Array.isArray(d.students)) {
      notify('Ce fichier n’est pas une sauvegarde valide');
      return;
    }
    const ok = window.confirm(
      `Restaurer cette sauvegarde ?\n\n${(d.students || []).length} personne(s), ${(d.sessions || []).length} séance(s).\n\nToutes les données actuelles de cette tablette seront remplacées.`
    );
    if (!ok) return;
    setStudents(migrerStudentsGroupe(migrerStudentsSuivi(d.students || [])));
    setAteliers(d.ateliers || []);
    setEmploiDuTemps(migrerEmploiDuTemps(d.emploiDuTemps));
    setIntervenants(d.intervenants || []);
    setGroupes(d.groupes || []);
    if (Array.isArray(d.guidances) && d.guidances.length) setGuidances(d.guidances);
    setSessions(d.sessions || []);
    setCrises(d.crises || []);
    setAxesSuivi(migrerAxesSuivi(d.axesSuivi));
    setReleves(migrerReleves(d.suivi || d.stabilite || []));
    /* Le nom d'appareil et le groupe de rattachement du fichier ne s'imposent
       pas à la tablette qui restaure : elle garde les siens s'ils sont déjà
       renseignés, sinon elle reprend ceux de la sauvegarde plutôt que de
       rester anonyme. */
    if (d.appareil && !appareil.trim()) setAppareil(d.appareil);
    if (d.groupeAppareil && !groupeAppareil.trim()) setGroupeAppareil(d.groupeAppareil);
    notify('Sauvegarde restaurée');
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let d;
      try {
        d = JSON.parse(reader.result);
      } catch (e) {
        notify('Fichier illisible');
        return;
      }
      if (d && d.format === 'aba-config') {
        importConfig(d);
        return;
      }
      if (d && d.format === 'aba-backup-encrypted') {
        setBackupPrompt({ mode: 'import', envelope: d, error: '' });
        return;
      }
      if (d && d.format === 'aba-profils') {
        // Même route que confirmImport, pour un fichier de profils resté en clair.
        setRapprochement({ payload: d });
        return;
      }
      if (d && d.format === 'aba-suivi-transfert') {
        appliquerSuiviRecu(d);
        return;
      }
      // Ancienne sauvegarde exportée en clair, avant l'ajout du chiffrement : toujours acceptée
      applyRestoredData(d);
    };
    reader.readAsText(file);
  }

  async function confirmImport(passphrase) {
    try {
      const d = await decryptJSON(backupPrompt.envelope, passphrase);
      setBackupPrompt(null);
      /* Un fichier de profils est toujours chiffré (exportProfils) : son
         format réel n'apparaît qu'ici, après déchiffrement — l'enveloppe vue
         par importBackup est indistincte d'une sauvegarde complète chiffrée.
         Ne jamais laisser passer vers applyRestoredData, qui REMPLACE tout :
         un fichier de profils n'a ni ateliers ni emploi du temps ni séances,
         les confirmer ferait tout disparaître. */
      if (d && d.format === 'aba-profils') {
        setRapprochement({ payload: d });
        return;
      }
      if (d && d.format === 'aba-suivi-transfert') {
        appliquerSuiviRecu(d);
        return;
      }
      applyRestoredData(d);
    } catch (e) {
      setBackupPrompt({ ...backupPrompt, error: 'Mot de passe incorrect ou fichier corrompu' });
    }
  }

  const addObjective = (studentId, objective) =>
    setStudents((s) => s.map((st) => (st.id === studentId ? { ...st, objectives: [...st.objectives, objective] } : st)));
  const removeObjective = (studentId, objId) =>
    setStudents((s) => s.map((st) => (st.id === studentId ? { ...st, objectives: st.objectives.filter((o) => o.id !== objId) } : st)));
  const updateObjective = (studentId, objId, next) =>
    setStudents((s) => s.map((st) => (st.id === studentId ? { ...st, objectives: st.objectives.map((o) => (o.id === objId ? { ...next, id: objId } : o)) } : st)));
  const duplicateObjective = (objective, targetIds) => {
    setStudents((s) => s.map((st) => (targetIds.includes(st.id) ? { ...st, objectives: [...st.objectives, { ...objective, id: uid() }] } : st)));
    notify(`Objectif copié vers ${targetIds.length} personne${targetIds.length !== 1 ? 's' : ''}`);
  };
  const resetTracking = (studentId, objId) =>
    setStudents((s) => s.map((st) => (st.id === studentId
      ? { ...st, objectives: st.objectives.map((o) => (o.id === objId
          ? { ...o, trackingResetAt: new Date().toISOString(), masteredTargetIds: [], currentTargetId: null }
          : o)) }
      : st)));
  const changePhase = (studentId, objId, nom) =>
    setStudents((s) => s.map((st) => (st.id === studentId
      ? { ...st, objectives: st.objectives.map((o) => (o.id === objId
          ? { ...o, phaseHistory: [...phaseHistory(o), { id: uid(), name: nom, date: new Date().toISOString() }] }
          : o)) }
      : st)));
  const toggleFavorite = (studentId, objId) =>
    setStudents((s) => s.map((st) => (st.id === studentId ? { ...st, objectives: st.objectives.map((o) => (o.id === objId ? { ...o, favorite: !o.favorite } : o)) } : st)));

  /* --- reprise d'une séance enregistrée pour correction --- */
  const editSession = (s) => setActiveSession({ ...s, isEdit: true });

  /* Statut d'envoi sur les trois collections, pas seulement les séances : sans
     lui, crises et journées de suivi ne pourraient pas se ranger dans
     l'archive de l'écran Export. */
  const markSent = (ids, sent = true) =>
    setSessions((list) => list.map((s) => (ids.includes(s.id) ? { ...s, sentAt: sent ? new Date().toISOString() : null } : s)));

  const markCrisesSent = (ids, sent = true) =>
    setCrises((list) => list.map((c) => (ids.includes(c.id) ? { ...c, sentAt: sent ? new Date().toISOString() : null } : c)));

  const markRelevesSent = (ids, sent = true) =>
    setReleves((list) => list.map((r) => (ids.includes(r.id) ? { ...r, sentAt: sent ? new Date().toISOString() : null } : r)));

  const deleteAllSessions = () => {
    setSessions([]);
    notify('Toutes les séances ont été supprimées');
  };

  const deleteSession = (id) => {
    setSessions((list) => list.filter((s) => s.id !== id));
    notify('Séance supprimée');
  };

  /* --- crises et observations --- */
  const nouvelleFiche = (kind) => ({
    id: uid(),
    date: new Date().toISOString(),
    startedAt: Date.now(),
    isNew: true,
    kind,
    sessionId: (activeSession && activeSession.id) || null,
    // Séance à une seule personne présente : pas de raison de la redemander,
    // surtout au moment où on en a le moins le temps.
    studentId: (activeSession && activeSession.studentIds && activeSession.studentIds.length === 1) ? activeSession.studentIds[0] : null,
    atelierId: (activeSession && activeSession.atelierId) || null,
    intervenantIds: activeSession && activeSession.intervenantId ? [activeSession.intervenantId] : [],
    commentaire: '',
    antecedent: '',
    comportement: '',
    consequence: '',
    antecedentTags: [],
    comportementTags: [],
    consequenceTags: [],
    mesures: mesuresVides(),
  });

  /* Une nouvelle fiche s'ajoute aux autres : celles déjà ouvertes continuent
     de tourner, chacune avec son propre chronomètre. */
  const ouvrirFiche = (kind) => {
    const fiche = nouvelleFiche(kind);
    setOpenCrises((l) => [...l, fiche]);
    setActiveCrisisId(fiche.id);
  };
  const openObservation = () => ouvrirFiche('abc');
  const openCrisis = () => ouvrirFiche('crise');

  const editCrisis = (c) => {
    const deja = openCrises.find((x) => x.id === c.id);
    if (deja) { setActiveCrisisId(c.id); return; }
    const fiche = {
      ...c,
      kind: c.kind || 'crise',
      isNew: false,
      atelierId: c.atelierId || null,
      intervenantIds: c.intervenantIds || (c.intervenantId ? [c.intervenantId] : []),
      commentaire: c.commentaire || '',
    };
    setOpenCrises((l) => [...l, fiche]);
    setActiveCrisisId(fiche.id);
  };

  /* Enchaînement ABC : on enregistre le maillon en cours et on en ouvre un
     nouveau dont l'antécédent reprend la conséquence du précédent. Les maillons
     partagent un identifiant de chaîne, ce qui permet de les relire ensemble. */
  const chainCrisis = (c) => {
    const { isNew, ...rest } = c;
    const chainId = c.chainId || uid();
    const rang = c.chainIndex || 1;
    const maillon = figerChronos({ ...rest, chainId, chainIndex: rang }, Date.now());

    if (isNew) {
      const duree = rest.kind === 'abc' ? 0 : Date.now() - c.startedAt;
      setCrises((list) => [{ ...maillon, durationMs: duree }, ...list]);
    } else {
      setCrises((list) => list.map((x) => (x.id === rest.id ? { ...x, ...maillon } : x)));
    }

    const suivant = {
      ...nouvelleFiche(c.kind),
      chainId,
      chainIndex: rang + 1,
      studentId: c.studentId,
      atelierId: c.atelierId,
      intervenantIds: c.intervenantIds,
      // Ce qui a suivi devient le point de départ du maillon suivant
      antecedentTags: [...(c.consequenceTags || [])],
      antecedent: c.consequence || '',
    };
    setOpenCrises((l) => [...l.filter((x) => x.id !== c.id), suivant]);
    setActiveCrisisId(suivant.id);
    notify(`Maillon ${rang} enregistré — suite de la chaîne`);
  };

  const fermerFiche = (id) => {
    setOpenCrises((l) => l.filter((x) => x.id !== id));
    setActiveCrisisId((cur) => (cur === id ? null : cur));
  };

  const saveCrisis = (c) => {
    const { isNew, ...restBrut } = c;
    const rest = figerChronos(restBrut, Date.now());
    if (isNew) {
      const duree = rest.kind === 'abc' ? 0 : Date.now() - c.startedAt;
      setCrises((list) => [{ ...rest, durationMs: duree }, ...list]);
      notify(rest.kind === 'abc' ? 'Observation enregistrée' : 'Crise enregistrée');
    } else {
      setCrises((list) => list.map((x) => (x.id === rest.id ? { ...x, ...rest } : x)));
      notify(rest.kind === 'abc' ? 'Observation modifiée' : 'Crise modifiée');
    }
    fermerFiche(c.id);
  };

  const deleteCrisis = (id) => {
    setCrises((list) => list.filter((x) => x.id !== id));
    fermerFiche(id);
    notify('Enregistrement supprimé');
  };

  /* --- suivi continu --- */
  /* Un axe supprimé de la bibliothèque doit disparaître des personnes qui
     l'avaient activé : avec deux axes figés le résidu ne se voyait pas, avec
     une bibliothèque il laisserait des activations fantômes. */
  const majAxesSuivi = (axes) => {
    setAxesSuivi(axes);
    const vivants = new Set(axes.map((a) => a.id));
    setStudents((l) => l.map((s) => {
      const actifs = s.suivisActifs || [];
      const restants = actifs.filter((id) => vivants.has(id));
      return restants.length === actifs.length ? s : { ...s, suivisActifs: restants };
    }));
  };

  /* Nouveau suivi créé depuis la fiche d'une personne : il entre dans la
     bibliothèque, il est activé pour elle, et son panneau s'ouvre dessus pour
     qu'on en définisse les critères dans la foulée. */
  const creerSuiviPour = (studentId) => {
    const axe = { id: uid(), nom: '', criteres: [] };
    setAxesSuivi((l) => [...l, axe]);
    setStudents((l) => l.map((s) => (s.id === studentId ? { ...s, suivisActifs: [...(s.suivisActifs || []), axe.id] } : s)));
    ouvrirEcran('suivicontinu', { axe: axe.id });
  };

  const toggleAxeSuivi = (studentId, suiviId) =>
    setStudents((l) => l.map((x) => {
      if (x.id !== studentId) return x;
      const actifs = x.suivisActifs || [];
      const suivisActifs = actifs.includes(suiviId) ? actifs.filter((id) => id !== suiviId) : [...actifs, suiviId];
      return { ...x, suivisActifs };
    }));

  /* --- compteurs d'occurrence --- */
  /* Pas de bibliothèque : chaque personne a les siens, créés et nommés sur sa
     propre fiche. Le seul lien avec la bibliothèque de suivi continu est le
     stockage des relevés — même tableau, même export. */
  const ajouterCompteur = (studentId) =>
    setStudents((l) => l.map((s) => (s.id === studentId ? { ...s, compteurs: [...(s.compteurs || []), { id: uid(), nom: '' }] } : s)));

  const renommerCompteur = (studentId, compteurId, nom) =>
    setStudents((l) => l.map((s) => (s.id === studentId
      ? { ...s, compteurs: (s.compteurs || []).map((c) => (c.id === compteurId ? { ...c, nom } : c)) }
      : s)));

  /* Les occurrences déjà notées restent dans l'historique et l'export,
     marquées « Compteur retiré » — même principe que la suppression d'un axe
     de suivi continu. */
  const supprimerCompteur = (studentId, compteurId) =>
    setStudents((l) => l.map((s) => (s.id === studentId
      ? { ...s, compteurs: (s.compteurs || []).filter((c) => c.id !== compteurId) }
      : s)));

  /* Un relevé s'ajoute simplement à la suite : il vaut jusqu'au suivant, pour
     la journée en cours — voir l'état dormant. Le critère de clé `crise` crée
     en plus une fiche crise minimale dans le tableau habituel, quel que soit
     l'axe — la même fiche que celle du bouton CRISE, pas une seconde série.

     Elle est enregistrée sans chronomètre, mais plus sans durée : elle garde
     le lien vers son relevé (`releveId`) et emprunte au suivi continu l'écart
     jusqu'au relevé suivant, recalé par l'effet plus bas. `dureeAuto` tombe dès
     qu'on saisit la durée à la main depuis l'écran Export. */
  const noterSuivi = (studentId, suiviId, critere) => {
    const maintenant = new Date().toISOString();
    const releveId = uid();
    setReleves((l) => [...l, { id: releveId, studentId, suiviId, timestamp: maintenant, critere, source: 'pastille', ...contexteReleve(activeSession, poste, maintenant), appareilOrigine: null }]);
    const st = students.find((s) => s.id === studentId);
    const nom = st ? st.initials : '';
    if (critere === 'crise') {
      setCrises((list) => [
        {
          id: uid(),
          date: maintenant,
          kind: 'crise',
          sessionId: (activeSession && activeSession.id) || null,
          studentId,
          atelierId: (activeSession && activeSession.atelierId) || null,
          intervenantIds: activeSession && activeSession.intervenantId ? [activeSession.intervenantId] : [],
          commentaire: '',
          antecedent: '',
          comportement: '',
          consequence: '',
          antecedentTags: [],
          comportementTags: [],
          consequenceTags: [],
          durationMs: 0,
          releveId,
          dureeAuto: true,
          origine: 'suivi',
          aCompleter: true,
        },
        ...list,
      ]);
      notify(`${nom} — fiche crise créée, à compléter depuis Export`);
    } else {
      const axe = axeDe(axesSuivi, suiviId);
      notify(`${nom} — ${metaCritere(axe ? axe.criteres : [], critere).l}`);
    }
  };

  /* Compteurs d'occurrence : un appui, un relevé de plus, sur le même
     principe que noterSuivi mais sans critère ni fin — chaque appui compte
     pour lui-même, rien ne « vaut jusqu'au suivant ». */
  const noterCompteur = (studentId, compteurId) => {
    const maintenant = new Date().toISOString();
    setReleves((l) => [...l, { id: uid(), studentId, compteurId, timestamp: maintenant, kind: 'compteur', source: 'pastille', ...contexteReleve(activeSession, poste, maintenant), appareilOrigine: null }]);
  };

  /* Annule le dernier appui du jour pour ce compteur — un doigt qui glisse est
     la première correction attendue, pas un aller-retour par Export. Sans
     effet si rien n'a encore été compté aujourd'hui. */
  const annulerDernierCompteur = (studentId, compteurId) => {
    setReleves((l) => {
      let idx = -1;
      let dernierTs = -Infinity;
      l.forEach((r, i) => {
        if (r.kind !== 'compteur' || r.studentId !== studentId || r.compteurId !== compteurId) return;
        const d = new Date(r.timestamp);
        if (!memeJour(d, new Date())) return;
        const t = d.getTime();
        if (t > dernierTs) { dernierTs = t; idx = i; }
      });
      return idx < 0 ? l : l.filter((_, i) => i !== idx);
    });
  };

  /* Occurrence ajoutée après coup, depuis la correction d'une journée —
     symétrique de ajouterReleve pour un compteur. */
  /* Aucun contexte deviné ici, ni séance ni poste : une correction porte
     souvent sur un jour passé, et l'intervenant qui corrige n'est pas
     forcément celui qui a observé au moment visé. */
  const ajouterCompteurReleve = (studentId, compteurId, timestamp) =>
    setReleves((l) => [...l, { id: uid(), studentId, compteurId, timestamp, kind: 'compteur', source: 'manuel', ...TRACABILITE_RELEVE_PAR_DEFAUT }]);

  /* Clôture la journée d'un axe : le dernier critère cesse de courir, le
     suivi redevient dormant. Sans effet si rien n'était en cours. */
  const cloturerSuivi = (studentId, suiviId) => {
    if (!critereCourant(releves, studentId, suiviId, Date.now())) return;
    const maintenant = new Date().toISOString();
    setReleves((l) => [...l, { id: uid(), studentId, suiviId, timestamp: maintenant, critere: null, fin: true, source: 'cloture', ...contexteReleve(activeSession, poste, maintenant), appareilOrigine: null }]);
  };

  /* Correction après coup — une cotation oubliée, une heure fausse. Aucune
     durée n'étant stockée, tout ce qui en dérive (frise, feuille d'export,
     fiches crise) se recale de lui-même : il n'y a qu'à toucher aux relevés.
     `sentAt` est effacé à la modification : une journée corrigée ressort du lot
     déjà transmis, ce qui est bien le but. */
  /* Même choix que ajouterCompteurReleve : pas de contexte deviné sur une
     correction après coup. */
  const ajouterReleve = (studentId, suiviId, timestamp, critere, fin = false) =>
    setReleves((l) => [...l, { id: uid(), studentId, suiviId, timestamp, critere, fin, source: 'manuel', ...TRACABILITE_RELEVE_PAR_DEFAUT }]);

  const modifierReleve = (id, maj) =>
    setReleves((l) => l.map((r) => (r.id === id ? { ...r, ...maj, sentAt: null } : r)));

  /* Un relevé supprimé qui portait une fiche crise : la fiche reste, mais elle
     se détache du calcul automatique. Sa dernière durée connue est une donnée
     relevée — la remettre à zéro serait en perdre une, la laisser suivre un
     relevé disparu serait en inventer une. */
  const supprimerReleve = (id) => {
    setCrises((list) => list.map((c) => (c.releveId === id ? { ...c, releveId: null, dureeAuto: false } : c)));
    setReleves((l) => l.filter((r) => r.id !== id));
  };

  /* Recalage des fiches crise nées d'un relevé : leur durée est l'écart
     jusqu'au relevé suivant du même axe, leur horodatage celui du relevé.
     Tant que `dureeAuto` tient, corriger le suivi corrige la fiche. */
  useEffect(() => {
    setCrises((list) => {
      let change = false;
      const next = list.map((c) => {
        if (!c.dureeAuto || !c.releveId) return c;
        const source = releves.find((r) => r.id === c.releveId);
        if (!source) return c;
        const ms = dureeReleve(releves, c.releveId);
        const duree = ms == null ? 0 : ms;
        if (duree === c.durationMs && source.timestamp === c.date) return c;
        change = true;
        return { ...c, durationMs: duree, date: source.timestamp };
      });
      return change ? next : list;
    });
  }, [releves]);

  /* Une pastille par personne suivie sur au moins un axe. Les autres n'en ont
     aucune : rien n'apparaît, rien n'encombre. Chaque pastille porte un pavé
     par axe actif — dès qu'il y en a plus d'un, seule la couleur reste lisible,
     le libellé se lit dans la feuille de choix. */
  const pastillesSuivi = students
    .filter((s) => (s.suivisActifs || []).length > 0 || (s.compteurs || []).length > 0)
    .map((st) => {
      const blocs = (st.suivisActifs || [])
        .map((suiviId) => axeDe(axesSuivi, suiviId))
        .filter(Boolean)
        .map((axe) => {
          const releve = critereCourant(releves, st.id, axe.id, Date.now());
          const meta = releve ? metaCritere(axe.criteres, releve.critere) : null;
          return { axe, releve, meta };
        });
      const totalCompteurs = (st.compteurs || []).reduce((n, c) => n + comptesCompteurJour(releves, st.id, c.id, Date.now()), 0);
      return { st, blocs, totalCompteurs };
    });

  /* Contenu d'un onglet ou d'un écran ouvert depuis le tiroir, désigné par sa
     clé (nom d'onglet, ou nom d'écran) — pour pouvoir en afficher deux à la
     fois, côte à côte, pendant un balayage. */
  const contenuPourCle = (cle) => {
    switch (cle) {
      case 'ateliers':
        return (
          <PanneauEmploiDuTemps
            ateliers={ateliers} students={students} onAdd={addAtelier} onRename={renameAtelier} onRemove={removeAtelier}
            emploiDuTemps={emploiDuTemps}
            onBasculerJour={basculerAtelierJour} onSetPersonnes={setAtelierPersonnes}
            onSetPersonnesJour={setAtelierPersonnesJour}
            onSetObjectifs={setAtelierObjectifs} onToggleFavori={toggleAtelierFavori}
            onReordonnerJour={reordonnerJourAtelier} onAppliquerOrdre={appliquerOrdreJour}
            notify={notify}
            onOuvrirPersonnes={() => ouvrirEcran('personnes')}
            onOuvrirPersonne={(sid) => ouvrirEcran('personnes', { personne: sid })}
          />
        );
      case 'personnes':
        return (
          <PanneauPersonnes
            students={students} guidances={guidances} templates={objectiveTemplates} focus={focusEcran}
            premiereConfiguration={students.length === 0}
            addStudent={addStudent} removeStudent={removeStudent} renameStudent={renameStudent}
            groupes={groupes} onSetGroupe={setStudentGroupe} onCreerGroupe={creerGroupeEtAffecter}
            axesSuivi={axesSuivi} onToggleAxeSuivi={toggleAxeSuivi}
            onCreerSuivi={creerSuiviPour}
            onAjouterCompteur={ajouterCompteur} onRenommerCompteur={renommerCompteur} onSupprimerCompteur={supprimerCompteur}
            addObjective={addObjective} removeObjective={removeObjective} updateObjective={updateObjective}
            duplicateObjective={duplicateObjective} toggleFavorite={toggleFavorite} changePhase={changePhase}
            onSaveTemplate={saveTemplate}
            onOuvrirGuidances={() => ouvrirEcran('guidances')} onOuvrirModeles={() => ouvrirEcran('modeles')}
            onOuvrirAteliers={() => ouvrirEcran('ateliers')} onOuvrirIntervenants={() => ouvrirEcran('intervenants')}
          />
        );
      case 'intervenants':
        return <PanneauIntervenants intervenants={intervenants} onAdd={addIntervenant} onRename={renameIntervenant} onRemove={removeIntervenant} />;
      case 'groupes':
        return <PanneauGroupes groupes={groupes} onAdd={addGroupe} onRename={renameGroupe} onRemove={removeGroupe} />;
      case 'modeles':
        return (
          <PanneauModeles
            templates={objectiveTemplates} students={students} guidances={guidances}
            onAdd={addTemplate} onUpdate={updateTemplate} onRemove={removeTemplate} onAppliquer={appliquerTemplate}
            onOuvrirGuidances={() => ouvrirEcran('guidances')}
          />
        );
      case 'motsdepasse':
        return <PanneauMotsDePasse security={security} onChangePin={changePin} onDisableProtection={disableProtection} />;
      case 'donnees':
        return (
          <PanneauDonnees
            appareil={appareil} onSetAppareil={setAppareil}
            groupes={groupes} groupeAppareil={groupeAppareil} onSetGroupeAppareil={setGroupeAppareil}
            intervenants={intervenants} poste={poste} onChoisirPoste={choisirPosteIntervenant}
            retentionMonths={retentionMonths} onSetRetention={setRetentionMonths}
            onExportConfig={exportConfig} onExportBackup={exportBackup} onImportBackup={importBackup}
            onExportProfils={() => exportProfils('groupe')} onExportProfilsComplet={() => exportProfils('complet')}
          />
        );
      case 'guidances':
        return (
          <PanneauGuidances
            guidances={guidances} onAdd={addGuidance} onRemove={removeGuidance}
            onToggleIndependent={toggleIndependent} onReorder={setGuidances}
          />
        );
      case 'abc':
        return <PanneauAbc abcOptions={abcOptions} onSetAbc={setAbcOptions} />;
      case 'suivicontinu':
        return <PanneauSuiviContinu axes={axesSuivi} students={students} onSetAxes={majAxesSuivi} onToggleAxeSuivi={toggleAxeSuivi} focus={focusEcran} />;
      case 'suivi':
        /* Seul point de filtrage : une personne d'un autre groupe reste
           cotable partout ailleurs (Session, Export, Personnes), mais ne
           s'affiche pas ici — cette tablette a produit sa donnée, elle ne
           la lit pas. personnesVisibles réplique en tout point sans
           rattachement ni personne sans groupe encore configuré. */
        return (
          <SuiviScreen
            students={personnesVisibles(students, groupeAppareil)} sessions={sessions} guidances={guidances}
            releves={releves} axesSuivi={axesSuivi}
            onResetTracking={resetTracking} onOuvrirMenu={ouvrirMenu}
            onChangePhase={changePhase}
            onOuvrirObjectif={(sid, oid) => ouvrirEcran('personnes', { personne: sid, objectif: oid })}
            onAjouterObjectif={(sid) => ouvrirEcran('personnes', { personne: sid, nouveau: true })}
            onOuvrirSuivi={(sid) => setChoixSuivi(sid)}
          />
        );
      case 'session':
        return (
          <SessionScreen
            students={students} ateliers={ateliers} intervenants={intervenants}
            crises={crises} guidances={guidances}
            onSetAtelierGroup={setAtelierGroup} notify={notify} onOuvrirConfiguration={() => ouvrirEcran('personnes')}
            onProgrammerEquilibre={(sid) => ouvrirEcran('personnes', { personne: sid, nouveau: 'balance' })}
            onOuvrirMenu={ouvrirMenu} planDuJour={planDuJour}
            activeSession={activeSession} setActiveSession={setActiveSession}
            onAnnulerCorrection={() => allerA('export')}
            onFinish={(session, suivante) => {
              const { isEdit, ...rest } = session;
              // Passage à l'atelier suivant : la nouvelle séance remplace l'active,
              // au lieu de repasser par l'écran de configuration.
              setActiveSession(suivante || null);
              const nextSessions = isEdit
                ? sessions.map((s) => (s.id === rest.id ? rest : s))
                : [rest, ...sessions];
              setSessions(nextSessions);

              // Passage automatique à la cible suivante si le critère est atteint
              const { students: nextStudents, achieved } = advanceMasteredTargets(students, nextSessions, guidances);
              if (achieved.length) {
                setStudents(nextStudents);
                const a = achieved[0];
                notify(
                  achieved.length === 1
                    ? `${a.initials} — « ${a.target} » acquise${a.next ? `, passage à « ${a.next} »` : ', dernière cible'}`
                    : `${achieved.length} cibles acquises`
                );
              } else if (!suivante) {
                notify(isEdit ? 'Séance corrigée' : 'Séance enregistrée');
              }
              // Une correction repart d'Export, là où elle a été ouverte —
              // sans ça, valider une correction laisse sur l'onglet Session.
              if (isEdit && !suivante) allerA('export');
            }}
          />
        );
      case 'export':
        /* Corriger une séance la rouvre en cotation : sans le changement
           d'onglet, l'appui depuis Export n'aurait aucun effet visible. */
        return (
          <ExportScreen
            sessions={sessions} crises={crises} students={students} ateliers={ateliers} intervenants={intervenants} groupes={groupes}
            guidances={guidances} releves={releves} axesSuivi={axesSuivi} appareil={appareil} groupeAppareil={groupeAppareil} notify={notify}
            onEditCrisis={editCrisis} onMarkSent={markSent}
            onMarkCrisesSent={markCrisesSent} onMarkRelevesSent={markRelevesSent}
            onEditSession={(s) => { editSession(s); allerA('session'); }}
            onDeleteSession={deleteSession} onDeleteAllSessions={deleteAllSessions}
            onOuvrirJournee={(j) => setJourneeSuivi({ studentId: j.studentId, suiviId: j.suiviId, compteurId: j.compteurId, jour: j.jour })}
            onExportManager={exportManager}
            onExportSuiviHorsGroupe={exportSuiviHorsGroupe}
            onOuvrirMenu={ouvrirMenu}
          />
        );
      default:
        return null;
    }
  };

  const estOngletPrincipal = (cle) => cle === 'suivi' || cle === 'session' || cle === 'export';

  const volet = (cle) => (
    <>
      {!estOngletPrincipal(cle) && (
        <button onClick={ouvrirMenu} className="flex items-center gap-1 text-sm mb-3" style={{ color: INK_SOFT }}>
          <ChevronLeft size={16} /> Menu
        </button>
      )}
      {contenuPourCle(cle)}
    </>
  );

  const cleCourante = ecran || tab;

  if (!securityLoaded) {
    return (
      <div ref={rootRef} className="min-h-screen flex items-center justify-center" style={{ background: PAPER, color: INK_SOFT, fontFamily: F_BODY }}>
        Chargement…
      </div>
    );
  }

  if (!security.disabled && (locked || !security.pinHash)) {
    return (
      <LockScreen
        security={security}
        onUnlock={unlockWith}
        onFailedAttempt={registerFailedAttempt}
        onSetup={async (pinHash, pinSalt, pinDigits, pin, mode) => {
          const dataSalt = newSalt();
          const next = { pinHash, pinSalt, pinDigits, mode: mode || 'pin', dataSalt, failedAttempts: 0, lockUntil: 0 };
          setSecurity(next);
          await store.setRaw('aba:security', JSON.stringify(next));
          dataKey = await deriveDataKey(pin, dataSalt);
          setLocked(false);
          await loadData();
        }}
      />
    );
  }

  if (!loaded) {
    return (
      <div ref={rootRef} className="min-h-screen flex items-center justify-center" style={{ background: PAPER, color: INK_SOFT, fontFamily: F_BODY }}>
        Chargement…
      </div>
    );
  }

  return (
    <div ref={rootRef} className="min-h-screen" style={{ background: PAPER, color: INK, fontFamily: F_BODY }}>
      {/* Contenu : l'onglet courant, ou un écran ouvert depuis le tiroir */}
      <div
        ref={contentRef}
        className="max-w-4xl mx-auto px-4 pb-44"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)',
          // Tiroir ouvert, le contenu ne doit pas suivre le doigt : il est
          // rendu hors du panneau et glisserait dans la bande visible à droite.
          transform: offset && !tiroir ? `translateX(${offset}px)` : 'none',
          transition: dragging ? 'none' : 'transform .2s ease-out',
        }}
      >
        <div
          key={cleCourante}
          style={{
            animation: dir === 0 ? 'none' : `${dir > 0 ? 'abaInFromRight' : 'abaInFromLeft'} .18s ease-out`,
          }}
        >
          {volet(cleCourante)}
        </div>
      </div>

      {/* ==================== Barre du bas ====================
          ABC et Crise encadrent la pilule de navigation : le bas d'écran est la
          zone atteignable d'une main sur une tablette, ce que la fréquence du
          bouton Crise exige. Au-dessus, les pastilles — celles des fiches
          ouvertes, puis celles du suivi continu. */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 px-3 pt-8 pointer-events-none"
        style={{
          background: `linear-gradient(to top, ${PAPER} 60%, transparent)`,
          // Barre abaissée : moins d'espace qu'avant entre les libellés ABC/
          // CRISE (désormais hors flux, voir plus bas) et le bord de l'écran.
          // Ce padding doit rester assez grand pour contenir ces libellés :
          // ils ne comptent plus dans la hauteur de la rangée qui les porte.
          // Gardé au-dessus de 0 pour laisser une marge visible avec le bord.
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
          display: saisieEnCours ? 'none' : undefined,
        }}
      >
        <div
          className="max-w-4xl mx-auto pointer-events-auto"
          style={{
            transform: barreReduite ? 'scale(0.84)' : 'none',
            transformOrigin: 'bottom center',
            transition: 'transform .18s ease-out',
          }}
        >
        {/* Suivi continu : une pastille par personne concernée, aucune pour les
            autres. Un pavé par axe actif — gris quand l'axe est dormant
            (aucun relevé aujourd'hui), coloré par le critère sinon. */}
        {pastillesSuivi.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 justify-center">
            {pastillesSuivi.map((p) => {
              const unAxe = p.blocs.length === 1;
              /* Au delà de PASTILLE_PAVES_MAX pavés, un compteur remplace le
                 reste : la barre garde sa hauteur, et la feuille de choix
                 montre de toute façon les axes au complet. */
              const visibles = p.blocs.slice(0, PASTILLE_PAVES_MAX);
              const caches = p.blocs.length - visibles.length;
              return (
                <button
                  key={p.st.id}
                  onClick={() => setChoixSuivi(p.st.id)}
                  className="rounded-2xl overflow-hidden flex items-stretch text-xs border shadow-sm"
                  style={{ borderColor: BORDER, backgroundColor: CARD, fontFamily: F_DISPLAY }}
                >
                  <span className="px-2.5 py-1.5 flex items-center gap-1.5" style={{ color: INK_SOFT }}>
                    <Activity size={12} />
                    {p.st.initials}
                  </span>
                  {visibles.map((b) => (
                    <span
                      key={b.axe.id}
                      title={`${nomAxe(b.axe)} — ${b.meta ? b.meta.l : 'non démarré'}`}
                      className={unAxe ? 'px-2.5 py-1.5 flex items-center' : 'w-3 self-stretch'}
                      style={{
                        backgroundColor: b.meta ? b.meta.color : BORDER,
                        color: b.meta ? texteLisibleSur(b.meta.color) : '#fff',
                      }}
                    >
                      {unAxe ? (b.meta ? b.meta.l : 'à noter') : ''}
                    </span>
                  ))}
                  {caches > 0 && (
                    <span className="px-1.5 py-1.5 flex items-center" style={{ color: INK_SOFT, fontFamily: F_MONO }}
                      title={`${caches} autre${caches > 1 ? 's' : ''} suivi${caches > 1 ? 's' : ''}`}>
                      +{caches}
                    </span>
                  )}
                  {/* Total des compteurs du jour, tous compteurs confondus —
                      le détail par compteur se lit dans la feuille de choix. */}
                  {p.totalCompteurs > 0 && (
                    <span className="px-2.5 py-1.5 flex items-center gap-1" style={{ backgroundColor: PAPER, color: INK_SOFT, fontFamily: F_MONO }}
                      title="Total des compteurs aujourd'hui">
                      <Hash size={11} />{p.totalCompteurs}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Une pastille par fiche ouverte : chacune garde son chronomètre */}
        {openCrises.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 justify-center">
            {openCrises.map((c) => {
              const st = students.find((x) => x.id === c.studentId);
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCrisisId(c.id)}
                  className="rounded-2xl px-3 py-2 text-white flex items-center gap-1.5 shadow-lg text-sm"
                  style={{ backgroundColor: c.kind === 'abc' ? COLOR_ABC : CRISIS, fontFamily: F_DISPLAY }}
                >
                  {c.kind === 'abc' ? <ClipboardList size={14} /> : <AlertTriangle size={14} />}
                  <span>{st ? st.initials : c.kind === 'abc' ? 'Observation' : 'Crise'}</span>
                  {c.kind !== 'abc' && c.isNew && (
                    <span className="tabular-nums" style={{ fontFamily: F_MONO }}>
                      {fmtClock(Math.max(0, crisisTick - c.startedAt))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* items-center, plutôt que items-end : les libellés ABC/CRISE sont
            sortis du flux (position absolute) pour ne plus pousser leurs
            cercles vers le haut — sans ça, aucun alignement centré n'est
            possible entre des icônes de tailles différentes. */}
        <div className="flex items-center justify-center gap-2">
          {/* Comportement à consigner sans qu'il relève d'une crise. Libellé
              visible en permanence : icône seule + title ne se lit jamais au
              doigt sur tablette, et c'est un des deux boutons "toujours
              accessibles" du produit — il ne doit pas s'apprendre par essai. */}
          <div className="relative flex items-center justify-center shrink-0">
            <button
              onClick={openObservation}
              className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 active:scale-[0.96] transition-transform"
              style={{ backgroundColor: CARD, borderColor: COLOR_ABC, color: COLOR_ABC }}
              title="Observation ABC, hors crise"
              aria-label="Observation ABC"
            >
              <ClipboardList size={20} />
            </button>
            <span className="absolute top-full mt-1 text-[11px] font-medium whitespace-nowrap" style={{ fontFamily: F_DISPLAY, color: COLOR_ABC }}>ABC</span>
          </div>

          <div className="rounded-full flex items-center gap-0.5 p-1.5 shadow-lg" style={{ backgroundColor: NAV_BG }}>
            {[
              { k: 'suivi', label: 'Suivi', icon: TrendingUp },
              { k: 'session', label: 'Session', icon: Play },
              { k: 'export', label: 'Export', icon: FileSpreadsheet },
            ].map((t) => {
              const Icon = t.icon;
              const on = !ecran && tab === t.k;
              return (
                <button
                  key={t.k}
                  onClick={() => allerA(t.k)}
                  className="rounded-full px-4 py-3.5 text-base font-medium flex items-center justify-center gap-1.5"
                  style={{
                    fontFamily: F_DISPLAY,
                    backgroundColor: on ? ACCENT : 'transparent',
                    color: on ? ACCENT_INK : INK_SOFT,
                  }}
                  aria-label={t.label}
                >
                  <Icon size={20} />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative flex items-center justify-center shrink-0">
            <button
              onClick={openCrisis}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg active:scale-[0.96] transition-transform"
              style={{ backgroundColor: CRISIS }}
              title="Ouvrir une fiche de crise"
              aria-label="Crise"
            >
              <AlertTriangle size={20} />
            </button>
            <span className="absolute top-full mt-1 text-[11px] font-semibold whitespace-nowrap" style={{ fontFamily: F_DISPLAY, color: CRISIS }}>CRISE</span>
          </div>
        </div>
        </div>
      </div>

      {/* ==================== Tiroir latéral ====================
          Ouvert par un balayage vers la droite depuis l'écran Suivi, ou par le
          bouton de cet écran. */}
      {tiroir && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'var(--overlay-backdrop)' }}
          onClick={TIROIR_FERME_AU_TAP_DEHORS ? () => setTiroir(false) : undefined}
        >
          <div
            className="h-full overflow-y-auto shadow-2xl flex flex-col"
            style={{
              width: '86%',
              maxWidth: '22rem',
              backgroundColor: CARD,
              animation: 'abaTiroir .2s ease-out',
              paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
            }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="px-4 flex items-center justify-between mb-4">
              <span className="font-semibold text-lg" style={{ fontFamily: F_DISPLAY }}>Menu</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={basculerTheme}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: PAPER, color: INK_SOFT }}
                  aria-label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
                  title={theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
                >
                  {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                </button>
                <button
                  onClick={() => setTiroir(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: PAPER, color: INK_SOFT }}
                  aria-label="Fermer le menu"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="px-2 space-y-0.5">
              {PANNEAUX.map((it) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.k}
                    onClick={() => ouvrirEcran(it.k)}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-3.5 text-left"
                    style={{ backgroundColor: ecran === it.k ? PAPER : 'transparent' }}
                  >
                    <Icon size={17} style={{ color: INK_SOFT }} className="shrink-0" />
                    <span className="text-sm flex-1 min-w-0" style={{ fontFamily: F_DISPLAY }}>{it.label}</span>
                    <ChevronRight size={16} style={{ color: INK_SOFT }} className="shrink-0" />
                  </button>
                );
              })}
            </div>

            <div className="flex-1 flex items-center justify-center">
              <LogoDatABA />
            </div>
          </div>
        </div>
      )}

      {/* Choix du critère de suivi continu, depuis une pastille — un bloc par
          axe actif de la personne. */}
      {choixSuivi && (() => {
        const st = students.find((s) => s.id === choixSuivi);
        if (!st) return null;
        const axes = (st.suivisActifs || []).map((id) => axeDe(axesSuivi, id)).filter(Boolean);
        return (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ backgroundColor: 'var(--overlay-backdrop)' }}
            onClick={() => setChoixSuivi(null)}
          >
            <div
              className="w-full max-w-md rounded-t-3xl p-5 overflow-y-auto"
              style={{ backgroundColor: CARD, maxHeight: '82vh', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold" style={{ fontFamily: F_DISPLAY }}>{st.initials}</span>
                <button onClick={() => setChoixSuivi(null)} style={{ color: INK_SOFT }} aria-label="Fermer"><X size={18} /></button>
              </div>
              {axes.map((axe) => {
                const courant = critereCourant(releves, st.id, axe.id, Date.now());
                return (
                  <div key={axe.id} className="mb-5 last:mb-0">
                    <div className="text-sm font-semibold mb-1" style={{ fontFamily: F_DISPLAY }}>{nomAxe(axe)}</div>
                    <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
                      {courant
                        ? `${metaCritere(axe.criteres, courant.critere).l} depuis ${timeShort(courant.timestamp)}`
                        : "Suivi continu non démarré aujourd'hui."}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {axe.criteres.map((c) => (
                        <button
                          key={c.k}
                          onClick={() => noterSuivi(st.id, axe.id, c.k)}
                          className="rounded-2xl py-4 text-sm font-semibold text-white active:scale-[0.98] transition-transform"
                          style={{ backgroundColor: c.color, fontFamily: F_DISPLAY }}
                        >
                          {c.l}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {courant && (
                        <button
                          onClick={() => cloturerSuivi(st.id, axe.id)}
                          className="flex-1 rounded-2xl py-2.5 text-sm border"
                          style={{ borderColor: BORDER, color: INK_SOFT, fontFamily: F_DISPLAY }}
                        >
                          Clôturer la journée
                        </button>
                      )}
                      <button
                        onClick={() => { setChoixSuivi(null); setJourneeSuivi({ studentId: st.id, suiviId: axe.id, jour: jourLocal(Date.now()) }); }}
                        className="flex-1 rounded-2xl py-2.5 text-sm border flex items-center justify-center gap-1.5"
                        style={{ borderColor: BORDER, color: INK_SOFT, fontFamily: F_DISPLAY }}
                      >
                        <Pencil size={13} /> Corriger la journée
                      </button>
                    </div>
                  </div>
                );
              })}
              {axes.length > 0 && <p className="text-xs mb-4" style={{ color: INK_SOFT }}>
                Un critère vaut jusqu'au suivant ou jusqu'à la clôture.
                « Crise » crée en plus une fiche crise, dont la durée court jusqu'au critère suivant.
              </p>}
              {/* Compteurs d'occurrence de la personne : un appui = une
                  occurrence de plus, sans notion de « en cours ». */}
              {(st.compteurs || []).map((c) => {
                const total = comptesCompteurJour(releves, st.id, c.id, Date.now());
                return (
                  <div key={c.id} className="mb-5 last:mb-0">
                    <div className="text-sm font-semibold mb-1" style={{ fontFamily: F_DISPLAY }}>{nomCompteur(c)}</div>
                    <button
                      onClick={() => noterCompteur(st.id, c.id)}
                      className="w-full rounded-2xl py-4 text-sm font-semibold text-white active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                      style={{ backgroundColor: CAT_INDIGO, fontFamily: F_DISPLAY }}
                    >
                      <Hash size={16} />
                      <span className="text-2xl" style={{ fontFamily: F_MONO }}>{total}</span>
                      occurrence{total !== 1 ? 's' : ''}
                    </button>
                    <p className="text-xs text-center mt-1" style={{ color: INK_SOFT }}>aujourd'hui</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => annulerDernierCompteur(st.id, c.id)}
                        disabled={total === 0}
                        className="flex-1 rounded-2xl py-2.5 text-sm border disabled:opacity-40"
                        style={{ borderColor: BORDER, color: INK_SOFT, fontFamily: F_DISPLAY }}
                      >
                        Annuler le dernier appui
                      </button>
                      <button
                        onClick={() => { setChoixSuivi(null); setJourneeSuivi({ studentId: st.id, compteurId: c.id, jour: jourLocal(Date.now()) }); }}
                        className="flex-1 rounded-2xl py-2.5 text-sm border flex items-center justify-center gap-1.5"
                        style={{ borderColor: BORDER, color: INK_SOFT, fontFamily: F_DISPLAY }}
                      >
                        <Pencil size={13} /> Corriger la journée
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {journeeSuivi && (
        <FeuilleJourneeSuivi
          cible={journeeSuivi}
          releves={releves} students={students} axesSuivi={axesSuivi}
          onAjouter={ajouterReleve} onModifier={modifierReleve} onSupprimer={supprimerReleve}
          onAjouterCompteur={ajouterCompteurReleve}
          onClose={() => setJourneeSuivi(null)}
        />
      )}

      {crisis && (
        <CrisisOverlay
          key={crisis.id}
          crisis={crisis} setCrisis={setCrisis}
          students={students} ateliers={ateliers} intervenants={intervenants} abcOptions={abcOptions}
          nbAutres={openCrises.length - 1}
          onChain={chainCrisis}
          onMinimize={() => setActiveCrisisId(null)}
          onAbandon={() => fermerFiche(crisis.id)}
          onSave={saveCrisis} onDelete={deleteCrisis}
        />
      )}

      {backupPrompt && backupPrompt.mode === 'export-choix' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'var(--overlay-backdrop)' }}>
          <div className="rounded-2xl p-5 max-w-xs w-full" style={{ backgroundColor: CARD }}>
            <div className="flex justify-end mb-1">
              <button onClick={() => setBackupPrompt(null)} style={{ color: INK_SOFT }}><X size={18} /></button>
            </div>
            <h2 className="text-lg font-semibold text-center mb-1" style={{ fontFamily: F_DISPLAY }}>Exporter la sauvegarde</h2>
            <p className="text-sm text-center mb-4" style={{ color: INK_SOFT }}>
              Le fichier contient les initiales, les cotations et les crises.
            </p>

            <Btn onClick={() => setBackupPrompt({ mode: 'export' })} className="w-full mb-2">
              <Lock size={16} /> Chiffrée par mot de passe
            </Btn>
            <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
              Recommandé. Le fichier reste illisible sans le mot de passe, y compris s'il est transmis par erreur.
            </p>

            <Btn
              variant="outline"
              onClick={() => {
                if (window.confirm(
                  "Exporter sans chiffrement ?\n\nLe fichier sera lisible par n'importe qui y ayant accès : messagerie, clé USB, dossier partagé mal restreint.\n\nÀ réserver à un transfert qui reste dans un espace déjà protégé."
                )) exportBackupClair();
              }}
              className="w-full"
            >
              <Download size={16} /> Sans chiffrement
            </Btn>
            <p className="text-xs mt-2" style={{ color: INK_SOFT }}>
              Plus simple à relire, mais le fichier n'est plus protégé une fois sorti de l'appareil.
            </p>
          </div>
        </div>
      )}

      {backupPrompt && backupPrompt.mode !== 'export-choix' && (
        <PassphraseModal
          mode={backupPrompt.mode}
          error={backupPrompt.error}
          onSubmit={backupPrompt.mode === 'export' ? confirmExport : confirmImport}
          onClose={() => setBackupPrompt(null)}
        />
      )}

      {rapprochement && (
        <EcranRapprochementPersonnes
          payload={rapprochement.payload}
          students={students}
          groupes={groupes}
          onValider={appliquerRapprochement}
          onClose={() => setRapprochement(null)}
        />
      )}

      {arbitrage && (
        <EcranArbitrageObjectifs
          conflits={arbitrage.conflits}
          students={students}
          sessions={sessions}
          onValider={appliquerArbitrage}
          onClose={() => setArbitrage(null)}
        />
      )}

      {toast && (
        <div
          className={`fixed left-1/2 z-40 px-4 py-2.5 rounded-xl text-sm shadow-lg ${toastLeaving ? 'aba-toast-out' : 'aba-toast-in'}`}
          style={{ backgroundColor: ACCENT, color: ACCENT_INK, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 8rem)' }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/* ==================== Écran 1 : gestion ==================== */
/* Modification du code : ré-utilise les mêmes pavés numériques que l'écran de
   verrouillage, mais dans une fenêtre compacte plutôt qu'en plein écran. */
function ChangePinModal({ security, onSave, onClose }) {
  const currentDigits = security.pinDigits || 4;
  const [step, setStep] = useState('current');
  const [newDigits, setNewDigits] = useState(currentDigits);
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');

  async function checkCurrent(pin) {
    const hash = await hashPin(pin, security.pinSalt);
    if (hash === security.pinHash) {
      setStep(security.mode === 'password' ? 'new1' : 'length');
    } else {
      setError('Code actuel incorrect');
      setTimeout(() => setError(''), 1200);
    }
  }
  function acceptNew(pin) {
    setNewPin(pin);
    setStep('new2');
  }
  async function confirmNew(pin) {
    if (pin !== newPin) {
      setError('Les deux codes ne correspondent pas');
      setStep('new1');
      setNewPin('');
      setTimeout(() => setError(''), 1500);
      return;
    }
    const salt = newSalt();
    const hash = await hashPin(pin, salt);
    onSave(hash, salt, newDigits, pin, security.mode || 'pin');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'var(--overlay-backdrop)' }}>
      <div className="rounded-2xl p-5 max-w-xs w-full" style={{ backgroundColor: CARD }}>
        <div className="flex justify-end mb-1">
          <button onClick={onClose} style={{ color: INK_SOFT }}><X size={18} /></button>
        </div>

        {step === 'length' ? (
          <>
            <h2 className="text-lg font-semibold text-center mb-1" style={{ fontFamily: F_DISPLAY }}>Longueur du code</h2>
            <p className="text-sm text-center mb-4" style={{ color: INK_SOFT }}>
              6 chiffres protègent nettement mieux les données en cas de perte de l'appareil.
            </p>
            <div className="flex gap-2 mb-4">
              {[4, 6].map((n) => (
                <button key={n} onClick={() => setNewDigits(n)} className="flex-1 rounded-xl py-3 border text-sm font-medium"
                  style={{ fontFamily: F_DISPLAY, borderColor: newDigits === n ? ACCENT : BORDER, backgroundColor: newDigits === n ? ACCENT : 'transparent', color: newDigits === n ? ACCENT_INK : INK_SOFT }}>
                  {n} chiffres
                </button>
              ))}
            </div>
            <Btn onClick={() => setStep('new1')} className="w-full">Continuer</Btn>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-center mb-1" style={{ fontFamily: F_DISPLAY }}>
              {step === 'current' ? 'Code actuel' : step === 'new1' ? 'Nouveau code' : 'Confirmez'}
            </h2>
            <p className="text-sm text-center mb-4" style={{ color: INK_SOFT }}>
              {step === 'current'
                ? 'Confirmez le code en cours'
                : step === 'new1'
                ? `Choisissez un code à ${newDigits} chiffres`
                : 'Ressaisissez le nouveau code'}
            </p>
            {error && <p className="text-sm text-center mb-3" style={{ color: CRISIS }}>{error}</p>}
            {step === 'new1' && (
              <p className="text-xs text-center mb-3" style={{ color: INK_SOFT }}>
                Les données enregistrées seront rechiffrées avec ce nouveau code.
              </p>
            )}
            {security.mode === 'password' ? (
              <PasswordScreen
                key={step}
                compact
                onSubmit={step === 'current' ? checkCurrent : step === 'new1' ? acceptNew : confirmNew}
                label={step === 'current' ? 'Vérifier' : step === 'new1' ? 'Continuer' : 'Valider'}
              />
            ) : (
              <PinPad
                key={step}
                compact
                digits={step === 'current' ? currentDigits : newDigits}
                onSubmit={step === 'current' ? checkCurrent : step === 'new1' ? acceptNew : confirmNew}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ==================== Écrans du tiroir ====================
   L'ancien écran Gestion réunissait tout dans une seule page à faire défiler.
   Il est découpé ici en panneaux indépendants, atteignables un par un depuis
   le tiroir latéral. Rien n'a été retiré au passage. */

/* Ateliers et semaine type dans un seul écran : deux vues qui se
   consultaient déjà côte à côte à la création d'une séance (l'atelier, puis
   qui doit s'y trouver) n'avaient pas de raison d'être séparées ici.

   La programmation (quels jours) reste réglée par les puces Jours de la
   fiche atelier. L'ordre dans la journée, lui, se règle dans la grille de la
   semaine ci-dessous — appui long pour déplacer, comme partout ailleurs dans
   l'application (ReorderList). « Appliquer aux autres jours » ne programme ni
   ne déprogramme rien : il ne fait que reprendre cet ordre pour les ateliers
   déjà communs aux autres jours. */
function PanneauEmploiDuTemps({
  ateliers, students, onAdd, onRename, onRemove, emploiDuTemps,
  onBasculerJour, onSetPersonnes, onSetPersonnesJour, onSetObjectifs, onToggleFavori,
  onReordonnerJour, onAppliquerOrdre, notify,
  onOuvrirPersonnes, onOuvrirPersonne,
}) {
  const [nom, setNom] = useState('');
  const [openId, setOpenId] = useState(null);
  /* Jour dont on règle les personnes dans la fiche dépliée : `null` = le
     réglage commun à tous les jours. Remis à `null` en changeant d'atelier —
     un jour sélectionné n'a de sens que pour l'atelier qu'on regarde. */
  const [jourPersonnes, setJourPersonnes] = useState(null);
  const ajouter = () => { if (nom.trim()) { onAdd(nom.trim()); setNom(''); } };

  const deplier = (id) => {
    setOpenId((prec) => (prec === id ? null : id));
    setJourPersonnes(null);
  };

  const togglePersonne = (atelier, student) => {
    const actuels = personnesPrevues(atelier, jourPersonnes);
    const suivants = actuels.includes(student.id)
      ? actuels.filter((id) => id !== student.id)
      : [...actuels, student.id];
    if (jourPersonnes == null) onSetPersonnes(atelier.id, suivants);
    else onSetPersonnesJour(atelier.id, jourPersonnes, suivants);
    // Une personne nouvellement cochée arrive avec ses objectifs par défaut —
    // mémorisés pour cet atelier, à défaut prioritaires, à défaut tous. Les
    // objectifs restent communs à l'atelier : les faire varier par jour
    // doublerait le paramétrage pour un besoin qui ne s'est pas présenté.
    if (!actuels.includes(student.id) && !(atelier.usualObjectives && atelier.usualObjectives[student.id])) {
      onSetObjectifs(atelier.id, student.id, objectifsParDefaut(student, atelier, 'atelier'));
    }
  };
  const toggleObjectif = (atelier, studentId, objectif) => {
    const choisis = (atelier.usualObjectives && atelier.usualObjectives[studentId]) || [];
    onSetObjectifs(
      atelier.id, studentId,
      choisis.includes(objectif.id) ? choisis.filter((id) => id !== objectif.id) : [...choisis, objectif.id]
    );
  };

  return (
    <div>
      <SectionTitle sub="Les groupes dans lesquels se déroulent les séances, les jours où ils ont lieu et les personnes qu'ils accueillent.">
        Ateliers
      </SectionTitle>
      <Card className="mb-4">
        <div className="flex gap-2 mb-3">
          <Field value={nom} onChange={setNom} placeholder="Nom de l'atelier (ex. Groupe habiletés sociales)" onEnter={ajouter} />
          <Btn onClick={ajouter} className="px-4 shrink-0"><Plus size={18} /></Btn>
        </div>
        {ateliers.length === 0 ? (
          <Empty>Aucun atelier créé.</Empty>
        ) : (
          <div className="space-y-3">
            {ateliers.map((a) => {
              const resume = resumeAtelier(a, emploiDuTemps, students);
              const libellesJours = JOURS.filter((j) => resume.jours.includes(j.k)).map((j) => j.label.slice(0, 2)).join(', ');
              const open = openId === a.id;
              return (
                <div key={a.id} className="rounded-xl px-3 py-2.5" style={{ backgroundColor: PAPER }}>
                  <button className="w-full flex items-center justify-between" onClick={() => deplier(a.id)}>
                    <span className="text-left min-w-0">
                      <span className="block font-semibold text-sm truncate" style={{ fontFamily: F_DISPLAY }}>{a.name}</span>
                      <span className="block text-xs" style={{ color: INK_SOFT }}>
                        {libellesJours || 'Aucun jour programmé'} · {resume.nbPersonnes} personne{resume.nbPersonnes !== 1 ? 's' : ''} · {resume.nbObjectifs} objectif{resume.nbObjectifs !== 1 ? 's' : ''}
                        {resume.joursAjustes.length > 0 && ` · ${resume.joursAjustes.length} jour${resume.joursAjustes.length > 1 ? 's' : ''} ajusté${resume.joursAjustes.length > 1 ? 's' : ''}`}
                      </span>
                    </span>
                    <ChevronRight size={18} style={{ color: INK_SOFT, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} className="shrink-0" />
                  </button>

                  {open && (
                    <div className="mt-3 space-y-3">
                      <EditableRow label={a.name} onRename={(v) => onRename(a.id, v)} onRemove={() => onRemove(a.id)} />

                      <div>
                        <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Jours</div>
                        <div className="flex flex-wrap gap-1.5">
                          {JOURS.map((j) => (
                            <Chip key={j.k} label={j.label.slice(0, 2)} on={resume.jours.includes(j.k)} onClick={() => onBasculerJour(a.id, j.k)} />
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Personnes habituelles</div>
                        {students.length === 0 ? (
                          <div>
                            <p className="text-xs mb-2" style={{ color: INK_SOFT }}>Aucune personne accompagnée pour l'instant.</p>
                            <Btn variant="ghost" onClick={onOuvrirPersonnes} className="text-sm">
                              <Plus size={14} /> Créer une personne accompagnée
                            </Btn>
                          </div>
                        ) : (
                          <>
                            {/* Un même atelier n'accueille pas toujours les mêmes personnes
                                selon le jour. Tant qu'aucun jour n'est ajusté, il n'y a
                                qu'une liste et rien de plus à régler ; un jour ajusté part
                                d'une copie de la liste commune et s'en détache. */}
                            {/* Libellés en toutes lettres, là où la rangée
                                « Jours » juste au-dessus est en deux lettres :
                                deux rangées de puces identiques à quelques
                                pixels l'une de l'autre se confondent. */}
                            {resume.jours.length > 1 && (
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                <Chip label="Tous les jours" on={jourPersonnes == null} onClick={() => setJourPersonnes(null)} />
                                {JOURS.filter((j) => resume.jours.includes(j.k)).map((j) => (
                                  <Chip
                                    key={j.k}
                                    label={`${j.label}${resume.joursAjustes.includes(j.k) ? ' •' : ''}`}
                                    on={jourPersonnes === j.k}
                                    onClick={() => setJourPersonnes(jourPersonnes === j.k ? null : j.k)}
                                  />
                                ))}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1.5">
                              {students.map((s) => (
                                <Chip
                                  key={s.id}
                                  label={s.initials}
                                  on={personnesPrevues(a, jourPersonnes).includes(s.id)}
                                  onClick={() => togglePersonne(a, s)}
                                />
                              ))}
                            </div>
                            {jourPersonnes != null && (
                              <div className="text-xs mt-2 flex items-center gap-2 flex-wrap" style={{ color: INK_SOFT }}>
                                <span>
                                  {resume.joursAjustes.includes(jourPersonnes)
                                    ? `Liste propre au ${((JOURS.find((j) => j.k === jourPersonnes) || {}).label || 'jour').toLowerCase()}.`
                                    : 'Ce jour suit encore la liste commune. La modifier ici le détachera.'}
                                </span>
                                {resume.joursAjustes.includes(jourPersonnes) && (
                                  <button onClick={() => onSetPersonnesJour(a.id, jourPersonnes, null)} style={{ color: INK_SOFT }} className="underline">
                                    Revenir au réglage commun
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {personnesToutesPrevues(a).map((sid) => {
                        const st = students.find((s) => s.id === sid);
                        if (!st) return null;
                        const choisis = (a.usualObjectives && a.usualObjectives[sid]) || [];
                        const favs = a.favoriteObjectiveIds || [];
                        return (
                          <div key={sid} className="rounded-xl p-2.5" style={{ backgroundColor: CARD }}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-sm" style={{ fontFamily: F_DISPLAY }}>{st.initials}</span>
                              <button onClick={() => onOuvrirPersonne(sid)} style={{ color: INK_SOFT }} title="Voir la fiche de cette personne">
                                <ChevronRight size={16} />
                              </button>
                            </div>
                            {st.objectives.length === 0 ? (
                              <div className="text-sm" style={{ color: INK_SOFT }}>Aucun objectif défini pour cette personne.</div>
                            ) : (
                              <div className="space-y-1.5">
                                {st.objectives.map((o) => {
                                  const on = choisis.includes(o.id);
                                  const meta = typeMeta(o.type);
                                  const Icon = meta.icon;
                                  const favAtelier = favs.includes(o.id);
                                  return (
                                    <div key={o.id} className="w-full rounded-xl px-3 py-2.5 flex items-center gap-2 border text-sm"
                                      style={{ borderColor: on ? meta.color : BORDER, backgroundColor: on ? meta.color + '14' : 'transparent' }}>
                                      <button onClick={() => toggleObjectif(a, sid, o)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                                        <Icon size={15} style={{ color: meta.color }} className="shrink-0" />
                                        <span className="flex-1 min-w-0 truncate">{o.name}</span>
                                        {on && <Check size={15} style={{ color: meta.color }} className="shrink-0" />}
                                      </button>
                                      {on && (
                                        <button onClick={() => onToggleFavori(a.id, o.id)} className="shrink-0"
                                          style={{ color: favAtelier ? CAT_AMBER : INK_SOFT }} title="Prioritaire pour cet atelier">
                                          <Star size={15} fill={favAtelier ? CAT_AMBER : 'none'} />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <div className="font-semibold text-sm mb-1" style={{ fontFamily: F_DISPLAY }}>Semaine</div>
        <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
          Appui long sur un atelier pour changer sa place dans la journée. La programmation elle-même
          — quels jours — se règle par les puces Jours de la fiche atelier, ci-dessus.
        </p>
        {ateliers.length === 0 ? (
          <Empty>Aucun atelier créé.</Empty>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1" data-no-swipe>
            {JOURS.filter((j) => (j.k !== 0 && j.k !== 6) || (emploiDuTemps[String(j.k)] || []).length > 0).map((j) => {
              const duJour = ateliersDuJour(emploiDuTemps, ateliers, j.k);
              const autreJourProgramme = JOURS.some((autre) => autre.k !== j.k && (emploiDuTemps[String(autre.k)] || []).length > 0);
              return (
                <div key={j.k} className="rounded-xl p-2 shrink-0" style={{ backgroundColor: PAPER, minWidth: '8.5rem' }}>
                  <div className="text-xs font-semibold mb-1.5 flex items-center justify-between" style={{ fontFamily: F_DISPLAY }}>
                    <span>{j.label}</span>
                    <span style={{ color: INK_SOFT, fontFamily: F_MONO }}>{duJour.length}</span>
                  </div>
                  {duJour.length === 0 ? (
                    <div className="text-xs" style={{ color: INK_SOFT }}>—</div>
                  ) : (
                    <ReorderList
                      items={duJour}
                      keyOf={(a) => a.id}
                      onReorder={(liste) => onReordonnerJour(j.k, liste.map((a) => a.id))}
                      className="space-y-1"
                      renderItem={(a) => (
                        <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ backgroundColor: CARD }}>
                          <GripVertical size={12} style={{ color: INK_SOFT }} className="shrink-0" />
                          <span className="text-xs truncate">{a.name}</span>
                        </div>
                      )}
                    />
                  )}
                  {duJour.length > 1 && autreJourProgramme && (
                    <button
                      onClick={() => { onAppliquerOrdre(j.k); notify('Ordre appliqué aux autres jours'); }}
                      className="w-full mt-2 rounded-lg px-2 py-1.5 text-xs flex items-center justify-center gap-1"
                      style={{ color: INK_SOFT, backgroundColor: CARD }}
                    >
                      <Copy size={12} /> Appliquer aux autres jours
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function PanneauIntervenants({ intervenants, onAdd, onRename, onRemove }) {
  const [nom, setNom] = useState('');
  const ajouter = () => { if (nom.trim()) { onAdd(nom.trim()); setNom(''); } };
  return (
    <div>
      <SectionTitle sub="Les professionnels qui cotent, pour la traçabilité des relevés.">Intervenants</SectionTitle>
      <Card>
        <div className="flex gap-2 mb-3">
          <Field value={nom} onChange={setNom} placeholder="Nom de l'intervenant" onEnter={ajouter} />
          <Btn onClick={ajouter} className="px-4 shrink-0"><Plus size={18} /></Btn>
        </div>
        {intervenants.length === 0 ? (
          <Empty>Aucun intervenant enregistré.</Empty>
        ) : (
          <div className="space-y-1.5">
            {intervenants.map((i) => (
              <EditableRow key={i.id} label={i.name} onRename={(v) => onRename(i.id, v)} onRemove={() => onRemove(i.id)} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* Calqué sur PanneauIntervenants : même forme, même EditableRow. Un groupe
   supprimé n'emporte personne avec lui — voir removeGroupe et GROUPE_INCONNU. */
function PanneauGroupes({ groupes, onAdd, onRename, onRemove }) {
  const [nom, setNom] = useState('');
  const ajouter = () => { if (nom.trim()) { onAdd(nom.trim()); setNom(''); } };
  return (
    <div>
      <SectionTitle sub="Les classes de l'établissement : elles distinguent deux personnes aux mêmes initiales et décident, tablette par tablette, de qui apparaît sur l'écran Suivi.">Groupes</SectionTitle>
      <Card>
        <div className="flex gap-2 mb-3">
          <Field value={nom} onChange={setNom} placeholder="Nom du groupe (ex. Classe 1)" onEnter={ajouter} />
          <Btn onClick={ajouter} className="px-4 shrink-0"><Plus size={18} /></Btn>
        </div>
        {groupes.length === 0 ? (
          <Empty>Aucun groupe enregistré.</Empty>
        ) : (
          <div className="space-y-1.5">
            {groupes.map((g) => (
              <EditableRow key={g.id} label={g.name} onRename={(v) => onRename(g.id, v)} onRemove={() => onRemove(g.id)} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function PanneauModeles({ templates, students, guidances, onAdd, onUpdate, onRemove, onAppliquer, onOuvrirGuidances }) {
  const [creation, setCreation] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [appliquant, setAppliquant] = useState(null);
  const [cibles, setCibles] = useState([]);
  const [nomInstance, setNomInstance] = useState('');

  const ouvrirApplication = (t) => { setAppliquant(t.id); setCibles([]); setNomInstance(''); };
  const toggleCible = (sid) => setCibles((c) => (c.includes(sid) ? c.filter((x) => x !== sid) : [...c, sid]));
  const confirmerApplication = () => { onAppliquer(appliquant, cibles, nomInstance); setAppliquant(null); };

  return (
    <div>
      <SectionTitle sub="Objectifs types réutilisables, avec leur mode de cotation, leurs cibles et leur critère.">
        Modèles d'objectifs
      </SectionTitle>

      <Card className="mb-4">
        {creation ? (
          <ObjectiveForm
            guidances={guidances}
            masquerPhase
            libelleValidation="Créer le modèle"
            onOuvrirGuidances={onOuvrirGuidances}
            onSubmit={(o) => { onAdd(o); setCreation(false); }}
            onCancel={() => setCreation(false)}
          />
        ) : (
          <Btn variant="ghost" onClick={() => setCreation(true)} className="w-full text-sm">
            <Plus size={16} /> Nouveau modèle
          </Btn>
        )}
      </Card>

      {templates.length === 0 ? (
        <Empty>
          Aucun modèle enregistré. Créez-en un ci-dessus, ou enregistrez-en un depuis un objectif
          existant — l'icône signet, sur la fiche d'une personne.
        </Empty>
      ) : (
        <div className="space-y-1.5">
          {templates.map((t) => {
            const meta = typeMeta(t.type);
            const Icon = meta.icon;
            if (editingId === t.id) {
              return (
                <ObjectiveForm
                  key={t.id}
                  initial={t}
                  guidances={guidances}
                  masquerPhase
                  libelleValidation="Enregistrer les modifications"
                  onOuvrirGuidances={onOuvrirGuidances}
                  onSubmit={(o) => { onUpdate(t.id, o); setEditingId(null); }}
                  onCancel={() => setEditingId(null)}
                />
              );
            }
            const nbCibles = (t.config.targets || []).length;
            return (
              <div key={t.id} className="rounded-xl px-3 py-2.5" style={{ backgroundColor: PAPER }}>
                <div className="flex items-start gap-2">
                  <Icon size={15} style={{ color: meta.color, marginTop: 2 }} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium break-words">{t.name}</div>
                    <div className="text-xs" style={{ color: INK_SOFT }}>
                      {descriptionObjectif(t)}{nbCibles > 0 && ` · ${nbCibles} cible${nbCibles !== 1 ? 's' : ''}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => ouvrirApplication(t)} style={{ color: INK_SOFT }} title="Appliquer à…"><Copy size={15} /></button>
                    <button onClick={() => setEditingId(t.id)} style={{ color: INK_SOFT }} title="Modifier"><Pencil size={15} /></button>
                    <button onClick={() => onRemove(t.id)} style={{ color: INK_SOFT }} title="Supprimer"><X size={15} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {appliquant && (() => {
        const t = templates.find((x) => x.id === appliquant);
        if (!t) return null;
        return (
          <Modale titre={`Appliquer « ${t.name} » à…`} onClose={() => setAppliquant(null)}>
            {students.length === 0 ? (
              <Empty>Aucune personne accompagnée.</Empty>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {students.map((s) => (
                    <Chip key={s.id} label={s.initials} on={cibles.includes(s.id)} onClick={() => toggleCible(s.id)} />
                  ))}
                </div>
                <Field value={nomInstance} onChange={setNomInstance} placeholder={`Intitulé (${t.name})`} onEnter={confirmerApplication} />
                <p className="text-xs mt-1.5 mb-3" style={{ color: INK_SOFT }}>
                  Facultatif — laissez vide pour reprendre l'intitulé du modèle. Chaque personne
                  cochée reçoit une copie indépendante.
                </p>
                <Btn onClick={confirmerApplication} disabled={cibles.length === 0} className="w-full text-sm">
                  Appliquer {cibles.length > 0 ? `à ${cibles.length} personne${cibles.length !== 1 ? 's' : ''}` : ''}
                </Btn>
              </>
            )}
          </Modale>
        );
      })()}
    </div>
  );
}

function PanneauGuidances({ guidances, onAdd, onRemove, onToggleIndependent, onReorder }) {
  const [ajout, setAjout] = useState(false);
  const [gCode, setGCode] = useState('');
  const [gLabel, setGLabel] = useState('');
  const [gColor, setGColor] = useState(GUIDANCE_PALETTE[0]);
  const [gIndep, setGIndep] = useState(false);
  return (
    <div>
      <SectionTitle sub="Bibliothèque proposée à la création d'un objectif.">Guidances</SectionTitle>
      <Card>
        <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
          C'est dans chaque objectif que l'on choisit les réponses retenues et celles qui comptent
          comme réussite autonome — l'étoile ci-dessous ne fixe que la valeur par défaut.
          Appui long sur une ligne pour la déplacer.
        </p>
        <ReorderList
          items={guidances}
          keyOf={(g) => g.code}
          onReorder={onReorder}
          className="space-y-1.5 mb-3"
          renderItem={(g) => (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: PAPER }}>
              <GripVertical size={14} style={{ color: INK_SOFT }} className="shrink-0" />
              <span className="w-9 h-7 rounded-md flex items-center justify-center text-xs font-semibold text-white shrink-0"
                style={{ backgroundColor: g.color, fontFamily: F_DISPLAY }}>
                {g.code}
              </span>
              <span className="text-sm flex-1 min-w-0 truncate">{g.label}</span>
              <button onClick={() => onToggleIndependent(g.code)} title="Réussite autonome par défaut"
                style={{ color: g.independent ? CAT_AMBER : INK_SOFT }}>
                <Star size={15} fill={g.independent ? CAT_AMBER : 'none'} />
              </button>
              <button onClick={() => onRemove(g.code)} style={{ color: INK_SOFT }} title="Supprimer">
                <X size={15} />
              </button>
            </div>
          )}
        />
        {ajout ? (
          <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: BORDER }}>
            <div className="flex gap-2">
              <input
                value={gCode}
                onChange={(e) => setGCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="Code"
                className="w-24 rounded-xl border px-3 py-2.5 text-sm bg-transparent text-center"
                style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }}
              />
              <Field value={gLabel} onChange={setGLabel} placeholder="Intitulé complet" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {GUIDANCE_PALETTE.map((c) => (
                <button key={c} onClick={() => setGColor(c)} className="w-8 h-8 rounded-lg border-2"
                  style={{ backgroundColor: c, borderColor: gColor === c ? INK : 'transparent' }} />
              ))}
            </div>
            <button onClick={() => setGIndep((v) => !v)} className="flex items-center gap-1.5 text-xs" style={{ color: gIndep ? CAT_AMBER : INK_SOFT }}>
              <Star size={14} fill={gIndep ? CAT_AMBER : 'none'} /> Compte comme réussite autonome
            </button>
            <div className="flex gap-2">
              <Btn
                onClick={() => {
                  const code = gCode.trim();
                  if (!code || !gLabel.trim()) return;
                  onAdd({ code, label: gLabel.trim(), color: gColor, independent: gIndep });
                  setGCode(''); setGLabel(''); setGIndep(false); setAjout(false);
                }}
                disabled={!gCode.trim() || !gLabel.trim() || guidances.some((x) => x.code === gCode.trim())}
                className="flex-1 text-sm py-2.5"
              >
                Ajouter
              </Btn>
              <Btn variant="ghost" onClick={() => setAjout(false)} className="text-sm py-2.5">Annuler</Btn>
            </div>
            {guidances.some((x) => x.code === gCode.trim()) && gCode.trim() && (
              <div className="text-xs" style={{ color: CRISIS }}>Ce code existe déjà.</div>
            )}
          </div>
        ) : (
          <Btn variant="ghost" onClick={() => setAjout(true)} className="w-full text-sm">
            <Plus size={16} /> Ajouter une guidance
          </Btn>
        )}
      </Card>
    </div>
  );
}

function PanneauAbc({ abcOptions, onSetAbc }) {
  return (
    <div>
      <SectionTitle sub="Réponses proposées derrière le bouton + des zones A, B et C.">Réponses ABC</SectionTitle>
      <Card>
        <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
          Valables pour les crises comme pour les observations. Appui long sur une ligne pour la
          déplacer : l'ordre est celui d'affichage, placez en tête ce que votre équipe coche le plus
          souvent.
        </p>
        <TagListEditor titre="A — Antécédents" items={abcOptions.antecedents} onChange={(v) => onSetAbc({ ...abcOptions, antecedents: v })} />
        <TagListEditor titre="B — Comportements" items={abcOptions.comportements} onChange={(v) => onSetAbc({ ...abcOptions, comportements: v })} />
        <TagListEditor titre="C — Conséquences" items={abcOptions.consequences} onChange={(v) => onSetAbc({ ...abcOptions, consequences: v })} />
      </Card>
    </div>
  );
}

/* Bibliothèque des suivis disponibles : on en crée autant qu'il en faut, et
   chaque personne active les siens depuis sa fiche. Chaque critère garde sa clé
   interne au renommage ou au recoloriage : les relevés déjà notés restent
   rattachés. Chaque carte rappelle qui
   l'utilise — sans ça, un suivi créé pour une personne et jamais activé se
   confondrait avec un suivi en service. */
function PanneauSuiviContinu({ axes, students, onSetAxes, onToggleAxeSuivi, focus }) {
  const cartes = useRef({});
  useEffect(() => {
    if (!focus || !focus.axe) return;
    const node = cartes.current[focus.axe];
    if (node) node.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focus]);

  const actifPour = (axe) => (students || []).filter((s) => (s.suivisActifs || []).includes(axe.id));

  const ajouterAxe = () => onSetAxes([...axes, { id: uid(), nom: '', criteres: [] }]);
  const supprimerAxe = (axe) => {
    const utilise = actifPour(axe);
    const avertissement = utilise.length
      ? `\n\nIl est actif pour ${utilise.map((s) => s.initials).join(', ')} : il y sera désactivé.`
      : '';
    if (!window.confirm(`Supprimer le suivi « ${nomAxe(axe)} » ?${avertissement}\n\nLes relevés déjà notés restent dans l'historique et l'export, marqués comme un suivi retiré.`)) return;
    onSetAxes(axes.filter((a) => a.id !== axe.id));
  };
  return (
    <div>
      <SectionTitle sub="Les critères notés au fil de la journée, indépendamment des ateliers. Créez-en autant qu'il en faut, et cochez qui les suit.">Suivi continu</SectionTitle>
      {axes.length === 0 && <Empty>Aucun suivi dans la bibliothèque.</Empty>}
      {axes.map((axe) => (
        <Card key={axe.id} className="mb-4">
          <div ref={(n) => { cartes.current[axe.id] = n; }}>
            <div className="flex items-center gap-2 mb-1">
              <Field
                value={axe.nom}
                onChange={(nom) => onSetAxes(axes.map((a) => (a.id === axe.id ? { ...a, nom } : a)))}
                placeholder="Nom du suivi"
              />
              <button onClick={() => supprimerAxe(axe)} style={{ color: INK_SOFT }} title="Supprimer ce suivi">
                <Trash2 size={16} />
              </button>
            </div>
            {/* Assignation depuis l'axe, symétrique de celle de la fiche d'une
                personne — même geste que les personnes habituelles d'un
                atelier. */}
            <div className="mb-3">
              <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Actif pour</div>
              {(students || []).length === 0 ? (
                <p className="text-xs" style={{ color: INK_SOFT }}>Aucune personne accompagnée pour l'instant.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {students.map((s) => (
                    <Chip
                      key={s.id}
                      label={s.initials}
                      on={(s.suivisActifs || []).includes(axe.id)}
                      onClick={() => onToggleAxeSuivi(s.id, axe.id)}
                    />
                  ))}
                </div>
              )}
            </div>
            <CritereListEditor
              criteres={axe.criteres}
              onChange={(criteres) => onSetAxes(axes.map((a) => (a.id === axe.id ? { ...a, criteres } : a)))}
            />
          </div>
        </Card>
      ))}
      <Btn variant="ghost" onClick={ajouterAxe} className="w-full text-sm">
        <Plus size={16} /> Ajouter un suivi
      </Btn>
    </div>
  );
}

function PanneauMotsDePasse({ security, onChangePin, onDisableProtection }) {
  const [changingPin, setChangingPin] = useState(false);
  return (
    <div>
      <SectionTitle sub="Ce qui protège l'accès à l'application et le chiffrement des données.">Mots de passe</SectionTitle>
      <Card>
        {security.disabled ? (
          <>
            <p className="text-xs mb-3" style={{ color: CRISIS }}>
              <strong>Protection désactivée.</strong> L'application s'ouvre sans code et les données ne sont
              plus chiffrées : quiconque accède à l'appareil peut les lire. Seul le verrouillage de la
              tablette les protège encore.
            </p>
            <Btn variant="outline" onClick={() => window.location.reload()} className="w-full text-sm">
              <Lock size={16} /> Réactiver une protection
            </Btn>
            <p className="text-xs mt-2" style={{ color: INK_SOFT }}>
              La réactivation passe par un rechargement : un nouveau code vous sera demandé, et les
              données seront à nouveau chiffrées.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
              {security.mode === 'password'
                ? 'Mot de passe écrit.'
                : `Code à ${security.pinDigits || 4} chiffres.`}{' '}
              L'application se verrouille à chaque mise en veille et après 10 minutes d'inactivité, et la
              saisie se suspend après plusieurs essais erronés. Les données enregistrées sur cet appareil
              sont chiffrées avec lui.
            </p>
            <Btn variant="outline" onClick={() => setChangingPin(true)} className="w-full text-sm mb-2">
              <Lock size={16} /> Modifier {security.mode === 'password' ? 'le mot de passe' : 'le code'}
            </Btn>
            <button
              onClick={() => {
                if (!window.confirm(
                  "Avez-vous une sauvegarde récente ?\n\nAvant toute modification de la protection, exportez vos données : c'est le seul moyen de revenir en arrière en cas de problème.\n\nOK pour continuer, Annuler pour aller sauvegarder d'abord."
                )) return;
                if (window.confirm(
                  "Désactiver la protection ?\n\nLes données seront DÉCHIFFRÉES et enregistrées en clair sur cet appareil. Quiconque y accède pourra les lire, y compris en récupérant les fichiers.\n\nÀ n'envisager que si l'appareil est lui-même verrouillé et réservé au service."
                ) && window.confirm('Dernière confirmation : le chiffrement des données va être retiré.')) {
                  onDisableProtection();
                }
              }}
              className="w-full text-xs py-2"
              style={{ color: CRISIS }}
            >
              Désactiver la protection et le chiffrement
            </button>
          </>
        )}
        {changingPin && (
          <ChangePinModal
            security={security}
            onSave={(hash, salt, digits, pin) => { onChangePin(hash, salt, digits, pin); setChangingPin(false); }}
            onClose={() => setChangingPin(false)}
          />
        )}
      </Card>
    </div>
  );
}

/* Les deux exports existaient déjà, mais sous deux boutons aux libellés
   proches. Ils sont présentés ici comme un seul choix explicite : avec ou sans
   données personnelles. */
function PanneauDonnees({ appareil, onSetAppareil, groupes, groupeAppareil, onSetGroupeAppareil, intervenants, poste, onChoisirPoste, retentionMonths, onSetRetention, onExportConfig, onExportBackup, onImportBackup, onExportProfils, onExportProfilsComplet }) {
  const fileRef = useRef(null);
  const [nom, setNom] = useState(appareil || '');
  useEffect(() => { setNom(appareil || ''); }, [appareil]);
  return (
    <div>
      <SectionTitle sub="Sortir les données de cette tablette, ou en rapatrier.">Données</SectionTitle>

      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <StickyNote size={16} style={{ color: INK_SOFT }} />
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>Nom de cet appareil</span>
        </div>
        <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
          Il apparaît dans le nom de chaque fichier produit, avant la date — <span style={{ fontFamily: F_MONO }}>pour-manager-tablette-2-2026-08-03.json</span> —
          et voyage aussi à l'intérieur du fichier, qu'un renommage ne fait donc pas perdre.
          Sans lui, un dossier de sauvegardes ne dit plus de quelle tablette vient quoi.
        </p>
        <div className="flex gap-2">
          <Field value={nom} onChange={setNom} placeholder="Ex. Tablette 2, Unité verte…" onEnter={() => onSetAppareil(nom.trim())} />
          <Btn onClick={() => onSetAppareil(nom.trim())} disabled={nom.trim() === (appareil || '').trim()} className="px-4 shrink-0">
            <Check size={18} />
          </Btn>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <School size={16} style={{ color: INK_SOFT }} />
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>Groupe de cette tablette</span>
        </div>
        <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
          Filtre l'écran Suivi sur ce groupe : les personnes d'un autre groupe restent cotables ici,
          mais leur suivi ne s'affiche que sur la tablette de leur propre groupe. Tant qu'aucun groupe
          n'est choisi, l'écran Suivi montre tout le monde.
        </p>
        <select
          value={groupeAppareil || ''}
          onChange={(ev) => onSetGroupeAppareil(ev.target.value)}
          className="w-full rounded-lg px-2.5 py-2 text-sm border"
          style={{ borderColor: BORDER, backgroundColor: CARD }}
        >
          <option value="">Aucun (tout afficher)</option>
          {groupeAppareil && !groupes.some((g) => g.id === groupeAppareil) && (
            <option value={groupeAppareil}>{nomGroupe(groupes, groupeAppareil)}</option>
          )}
          {groupes.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </Card>

      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <UserCog size={16} style={{ color: INK_SOFT }} />
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>Intervenant en poste</span>
        </div>
        <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
          Attribue les relevés de suivi pris hors séance — une pastille appuyée en dehors d'une
          cotation n'a pas d'autre moyen de savoir qui l'a saisie. Remis à zéro chaque jour : à
          rechoisir en arrivant, jamais reconduit du jour précédent.
        </p>
        <select
          value={posteValide(poste, Date.now()) ? poste.intervenantId : ''}
          onChange={(ev) => onChoisirPoste(ev.target.value || null)}
          className="w-full rounded-lg px-2.5 py-2 text-sm border"
          style={{ borderColor: BORDER, backgroundColor: CARD }}
        >
          <option value="">Aucun</option>
          {intervenants.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Card>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          if (f) onImportBackup(f);
          e.target.value = '';
        }}
      />

      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Download size={16} style={{ color: INK_SOFT }} />
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>Exporter</span>
        </div>
        <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
          Quatre fichiers différents. Les trois derniers ne quittent pas l'établissement sans précaution.
        </p>

        <button
          onClick={onExportConfig}
          className="w-full rounded-2xl border p-3.5 mb-2 text-left"
          style={{ borderColor: BORDER, backgroundColor: PAPER }}
        >
          <div className="text-sm font-medium mb-0.5" style={{ fontFamily: F_DISPLAY }}>Sans données personnelles</div>
          <div className="text-xs" style={{ color: INK_SOFT }}>
            Ateliers, intervenants, guidances et modèles. Aucune personne accompagnée, aucune séance,
            aucune crise : le fichier ne contient donc aucune donnée d'usager et sert à équiper un
            nouvel appareil sans tout ressaisir.
          </div>
        </button>

        <button
          onClick={onExportBackup}
          className="w-full rounded-2xl border-2 p-3.5 mb-2 text-left"
          style={{ borderColor: INK, backgroundColor: CARD }}
        >
          <div className="text-sm font-medium mb-0.5" style={{ fontFamily: F_DISPLAY }}>Avec les données personnelles</div>
          <div className="text-xs" style={{ color: INK_SOFT }}>
            Sauvegarde complète : initiales, objectifs, cotations, crises et relevés de suivi continu.
            C'est le seul moyen de récupérer l'historique après un effacement ou un changement
            d'appareil — et le seul fichier à protéger par mot de passe.
          </div>
        </button>

        <button
          onClick={onExportProfils}
          disabled={!groupeAppareil}
          className="w-full rounded-2xl border-2 p-3.5 mb-2 text-left"
          style={{ borderColor: ACCENT, backgroundColor: CARD, opacity: groupeAppareil ? 1 : 0.5 }}
        >
          <div className="text-sm font-medium mb-0.5" style={{ fontFamily: F_DISPLAY }}>Mes profils, vers une autre tablette</div>
          <div className="text-xs" style={{ color: INK_SOFT }}>
            {groupeAppareil
              ? "Personnes et objectifs du groupe de cette tablette, à agréger sur une tablette centrale. Toujours chiffré."
              : 'Configurez d’abord le groupe de cette tablette, ci-dessus.'}
          </div>
        </button>

        <button
          onClick={onExportProfilsComplet}
          className="w-full rounded-2xl border-2 p-3.5 text-left"
          style={{ borderColor: ACCENT, backgroundColor: CARD }}
        >
          <div className="text-sm font-medium mb-0.5" style={{ fontFamily: F_DISPLAY }}>Rediffuser tous les profils</div>
          <div className="text-xs" style={{ color: INK_SOFT }}>
            Depuis la tablette centrale, après agrégation : personnes et objectifs de tout l'établissement,
            pas seulement de ce groupe. Toujours chiffré.
          </div>
        </button>
      </Card>

      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Upload size={16} style={{ color: INK_SOFT }} />
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>Restaurer</span>
        </div>
        <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
          Le même bouton accepte les deux fichiers. Une configuration s'ajoute à l'existant ;
          une sauvegarde complète remplace tout, après confirmation.
        </p>
        <Btn variant="ghost" onClick={() => fileRef.current && fileRef.current.click()} className="w-full text-sm">
          <Upload size={16} /> Choisir un fichier
        </Btn>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-2">
          <CalendarClock size={16} style={{ color: INK_SOFT }} />
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>Durée de conservation</span>
        </div>
        <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
          Les séances, les crises et les relevés de suivi continu plus anciens que cette durée sont
          supprimés automatiquement à l'ouverture de l'application. Exportez et transmettez vos
          rapports avant l'échéance : la suppression est définitive.
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {[{ v: 0, l: 'Aucune limite' }, { v: 6, l: '6 mois' }, { v: 12, l: '12 mois' }, { v: 24, l: '24 mois' }, { v: 36, l: '36 mois' }].map((o) => {
            const on = retentionMonths === o.v;
            return (
              <button key={o.v} onClick={() => onSetRetention(o.v)} className="rounded-lg px-3 py-2 text-xs border"
                style={{ borderColor: on ? ACCENT : BORDER, backgroundColor: on ? ACCENT : 'transparent', color: on ? ACCENT_INK : INK_SOFT }}>
                {o.l}
              </button>
            );
          })}
        </div>
        {retentionMonths > 0 && (() => {
          const limite = new Date();
          limite.setMonth(limite.getMonth() - retentionMonths);
          return (
            <p className="text-xs mt-2" style={{ color: INK_SOFT }}>
              Seront conservés les enregistrements postérieurs au{' '}
              <span style={{ fontFamily: F_MONO }}>{limite.toLocaleDateString('fr-FR')}</span>.
            </p>
          );
        })()}
      </Card>
    </div>
  );
}

/* Bouton de phase d'un objectif : fait tourner sur DEFAULT_PHASES, avec
   confirmation puisque le changement trace un repère daté sur la courbe de
   suivi. Partagé par la fiche personne et le graphe de suivi, plutôt que
   deux versions qui divergeraient. */
function BoutonPhase({ obj, onChange }) {
  const actuelle = currentPhase(obj).name;
  const suivante = DEFAULT_PHASES[(DEFAULT_PHASES.indexOf(actuelle) + 1) % DEFAULT_PHASES.length];
  return (
    <button
      onClick={() => {
        if (window.confirm(`Passer « ${obj.name} » en phase « ${suivante} » ?\n\nUn repère daté sera tracé sur la courbe de suivi.`)) {
          onChange(suivante);
        }
      }}
      className="text-xs inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 border"
      style={{ borderColor: BORDER, color: INK }}
      title="Changer de phase"
    >
      <Flag size={11} /> {actuelle}
    </button>
  );
}

/* ==================== Écran 2 : personnes accompagnées et objectifs ==================== */
/* Création des personnes, objectifs et activation du suivi continu au même
   endroit : la fiche d'une personne se tenait jusqu'ici à deux écrans de
   distance, une carte dans Gestion et une carte dans Personnes. */
function PanneauPersonnes({
  students, guidances, templates, premiereConfiguration, focus,
  addStudent, removeStudent, renameStudent, groupes, onSetGroupe, onCreerGroupe, axesSuivi, onToggleAxeSuivi, onCreerSuivi,
  onAjouterCompteur, onRenommerCompteur, onSupprimerCompteur,
  addObjective, removeObjective, updateObjective, duplicateObjective, toggleFavorite, changePhase, onSaveTemplate,
  onOuvrirGuidances, onOuvrirModeles, onOuvrirAteliers, onOuvrirIntervenants,
}) {
  const [openId, setOpenId] = useState(null);
  const [editingObj, setEditingObj] = useState(null);
  const [copyingObj, setCopyingObj] = useState(null);
  const [copyTargets, setCopyTargets] = useState([]);
  const [initials, setInitials] = useState('');
  /* Personne pour laquelle le sélecteur de groupe propose de créer un
     nouveau groupe plutôt que d'en choisir un existant. */
  const [creationGroupePour, setCreationGroupePour] = useState(null);
  const [nomNouveauGroupe, setNomNouveauGroupe] = useState('');
  /* Personne pour laquelle on choisit un suivi à ajouter. */
  const [ajoutSuivi, setAjoutSuivi] = useState(null);
  /* Personne pour laquelle un nouvel objectif s'ouvre déjà déplié, et le type
     à préremplir (ex. 'balance' depuis Session/Équilibre). */
  const [creationPour, setCreationPour] = useState(null);
  const [typeNouveau, setTypeNouveau] = useState(null);
  const studentRefs = useRef({});

  const ajouter = () => {
    const v = initials.trim();
    if (!v) return;
    addStudent(v);
    setInitials('');
  };

  /* Lien croisé : ouvrir ce panneau déjà déplié sur une personne, et son
     objectif en édition le cas échéant — depuis le Suivi ou depuis un
     atelier, plutôt que de retomber sur la liste entière. `nouveau` ouvre
     directement le formulaire de création plutôt qu'un objectif existant. */
  useEffect(() => {
    if (!focus || !focus.personne) return;
    setOpenId(focus.personne);
    if (focus.objectif) setEditingObj(focus.objectif);
    if (focus.nouveau) {
      setCreationPour(focus.personne);
      setTypeNouveau(focus.nouveau === true ? null : focus.nouveau);
    }
    const node = studentRefs.current[focus.personne];
    if (node) node.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focus]);

  return (
    <div>
      <SectionTitle sub="Identifiées par leurs initiales uniquement. Objectifs et mode de cotation se règlent ici.">
        Personnes accompagnées
      </SectionTitle>

      {premiereConfiguration && (
        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sun size={16} style={{ color: INK_SOFT }} />
            <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>Première configuration</span>
          </div>
          <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
            Cette tablette est vierge. Commencez par créer les personnes accompagnées, puis leurs
            objectifs. Aux ouvertures suivantes, l'application démarrera directement sur Session.
          </p>
          <div className="flex flex-wrap gap-2">
            {onOuvrirAteliers && (
              <Btn variant="ghost" onClick={onOuvrirAteliers} className="text-xs px-3 py-2">Ateliers</Btn>
            )}
            {onOuvrirIntervenants && (
              <Btn variant="ghost" onClick={onOuvrirIntervenants} className="text-xs px-3 py-2">Intervenants</Btn>
            )}
            {onOuvrirGuidances && (
              <Btn variant="ghost" onClick={onOuvrirGuidances} className="text-xs px-3 py-2">Guidances</Btn>
            )}
          </div>
        </Card>
      )}

      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} style={{ color: INK_SOFT }} />
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>Ajouter</span>
          <span className="text-sm ml-auto" style={{ color: INK_SOFT, fontFamily: F_MONO }}>{students.length}</span>
        </div>
        <div className="flex gap-2">
          <Field value={initials} onChange={setInitials} placeholder="Initiales (ex. J.D.)" onEnter={ajouter} />
          <Btn onClick={ajouter} className="px-4 shrink-0"><Plus size={18} /></Btn>
        </div>
      </Card>

      {students.length === 0 ? (
        <Empty>Ajoutez une première personne accompagnée pour commencer.</Empty>
      ) : (
      <div className="space-y-3">
        {students.map((s) => (
          <div key={s.id} ref={(el) => { studentRefs.current[s.id] = el; }}>
          <Card>
            <button className="w-full flex items-center justify-between" onClick={() => setOpenId(openId === s.id ? null : s.id)}>
              <span className="flex items-center gap-3">
                <PastillePersonne initials={s.initials} />
                <span className="text-left block text-xs" style={{ color: INK_SOFT }}>
                  {s.objectives.length} objectif{s.objectives.length !== 1 ? 's' : ''}
                  {(s.suivisActifs || []).length > 0 &&
                    ` · ${(s.suivisActifs || []).map((id) => axeDe(axesSuivi, id)).filter(Boolean).map(nomAxe).join(', ')}`}
                </span>
              </span>
              <ChevronRight size={18} style={{ color: INK_SOFT, transform: openId === s.id ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
            </button>

            {openId === s.id && (
              <div className="mt-4">
                <div className="rounded-xl px-3 py-2.5 mb-3" style={{ backgroundColor: PAPER }}>
                  <EditableRow
                    label={s.initials}
                    onRename={(v) => renameStudent(s.id, v)}
                    onRemove={() => {
                      if (window.confirm(`Supprimer ${s.initials} et ses ${s.objectives.length} objectif(s) ?`)) removeStudent(s.id);
                    }}
                  />
                  {/* Le groupe distingue deux personnes aux mêmes initiales et
                      décide, tablette par tablette, de qui apparaît sur l'écran
                      Suivi (personnesVisibles). Sans groupe, une personne reste
                      visible partout — ce n'est jamais un état bloquant. */}
                  <div className="mt-2.5">
                    <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Groupe</div>
                    {creationGroupePour === s.id ? (
                      <div className="flex gap-2">
                        <Field
                          value={nomNouveauGroupe}
                          onChange={setNomNouveauGroupe}
                          placeholder="Nom du groupe (ex. Classe 3)"
                          onEnter={() => {
                            const nom = nomNouveauGroupe.trim();
                            if (!nom) return;
                            onCreerGroupe(s.id, nom);
                            setCreationGroupePour(null);
                          }}
                        />
                        <Btn
                          onClick={() => {
                            const nom = nomNouveauGroupe.trim();
                            if (!nom) return;
                            onCreerGroupe(s.id, nom);
                            setCreationGroupePour(null);
                          }}
                          className="px-4 shrink-0"
                        >
                          <Plus size={18} />
                        </Btn>
                        <Btn variant="ghost" onClick={() => setCreationGroupePour(null)} className="px-3 shrink-0">
                          <X size={18} />
                        </Btn>
                      </div>
                    ) : (
                      <select
                        value={s.groupeId || ''}
                        onChange={(ev) => {
                          const v = ev.target.value;
                          if (v === '__nouveau') {
                            setNomNouveauGroupe('');
                            setCreationGroupePour(s.id);
                            return;
                          }
                          onSetGroupe(s.id, v || null);
                        }}
                        className="w-full rounded-lg px-2.5 py-2 text-sm border"
                        style={{ borderColor: BORDER, backgroundColor: CARD }}
                      >
                        <option value="">Sans groupe</option>
                        {/* Un groupe supprimé reste proposé sur la personne qui le
                            porte : sans ça, ouvrir la fiche le réécrirait en
                            silence vers « Sans groupe ». */}
                        {s.groupeId && !groupes.some((g) => g.id === s.groupeId) && (
                          <option value={s.groupeId}>{nomGroupe(groupes, s.groupeId)}</option>
                        )}
                        {groupes.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        <option value="__nouveau">+ Nouveau groupe…</option>
                      </select>
                    )}
                  </div>
                  {/* Seuls les suivis actifs de cette personne figurent ici.
                      La bibliothèque étant illimitée, tous les lister en
                      interrupteurs faisait grossir la fiche sans fin : le choix
                      passe par une feuille, ouverte à la demande. */}
                  <div className="mt-2.5">
                    <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Suivi continu</div>
                    {(s.suivisActifs || []).length === 0 ? (
                      <p className="text-xs" style={{ color: INK_SOFT }}>Aucun suivi actif pour cette personne.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {(s.suivisActifs || []).map((id) => {
                          const axe = axeDe(axesSuivi, id);
                          if (!axe) return null;
                          return (
                            <div key={axe.id} className="rounded-xl px-2.5 py-2 flex items-start gap-2" style={{ backgroundColor: CARD }}>
                              <Activity size={14} style={{ color: INK_SOFT, marginTop: 2 }} className="shrink-0" />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium" style={{ fontFamily: F_DISPLAY }}>{nomAxe(axe)}</span>
                                <span className="block text-xs" style={{ color: INK_SOFT }}>
                                  {axe.criteres.map((c) => c.l).join(', ') || 'aucun critère défini'}
                                </span>
                              </span>
                              <button onClick={() => onToggleAxeSuivi(s.id, axe.id)} style={{ color: INK_SOFT }} className="shrink-0" title="Retirer ce suivi">
                                <X size={15} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <button onClick={() => setAjoutSuivi(s.id)} className="text-xs flex items-center gap-1 mt-2" style={{ color: INK_SOFT }}>
                      <Plus size={13} /> Ajouter un suivi
                    </button>
                  </div>
                  {/* Compteurs d'occurrence : pas de bibliothèque, ils se
                      créent et se renomment directement sur la fiche. */}
                  <div className="mt-3">
                    <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Compteurs d'occurrence</div>
                    {(s.compteurs || []).length === 0 ? (
                      <p className="text-xs" style={{ color: INK_SOFT }}>Aucun compteur pour cette personne.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {(s.compteurs || []).map((c) => (
                          <div key={c.id} className="rounded-xl px-2.5 py-2 flex items-center gap-2" style={{ backgroundColor: CARD }}>
                            <Hash size={14} style={{ color: INK_SOFT }} className="shrink-0" />
                            <div className="flex-1 min-w-0">
                              <Field
                                value={c.nom}
                                onChange={(nom) => onRenommerCompteur(s.id, c.id, nom)}
                                placeholder="Nom du compteur"
                              />
                            </div>
                            <button
                              onClick={() => {
                                if (window.confirm(`Supprimer le compteur « ${nomCompteur(c)} » ?\n\nLes occurrences déjà notées restent dans l'historique et l'export, marquées comme un compteur retiré.`)) onSupprimerCompteur(s.id, c.id);
                              }}
                              style={{ color: INK_SOFT }}
                              className="shrink-0"
                              title="Supprimer ce compteur"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => onAjouterCompteur(s.id)} className="text-xs flex items-center gap-1 mt-2" style={{ color: INK_SOFT }}>
                      <Plus size={13} /> Ajouter un compteur
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 mb-3">
                  {s.objectives.map((o) => {
                    const meta = typeMeta(o.type);
                    const Icon = meta.icon;
                    if (editingObj === o.id) {
                      return (
                        <ObjectiveForm
                          key={o.id}
                          initial={o}
                          guidances={guidances}
                          onOuvrirGuidances={onOuvrirGuidances}
                          onSubmit={(next) => { updateObjective(s.id, o.id, next); setEditingObj(null); }}
                          onCancel={() => setEditingObj(null)}
                        />
                      );
                    }
                    return (
                      <div key={o.id} className="rounded-xl px-3 py-2.5" style={{ backgroundColor: PAPER }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <Icon size={15} style={{ color: meta.color, marginTop: 2 }} />
                            <div>
                              <div className="text-sm">{o.name}</div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <BoutonPhase obj={o} onChange={(nom) => changePhase(s.id, o.id, nom)} />
                              {currentTarget(o) && (
                                <span className="text-xs inline-flex items-center gap-1 rounded-md px-1.5 py-0.5" style={{ backgroundColor: CARD, color: INK }}>
                                  <Target size={11} /> cible en cours : {currentTarget(o).name}
                                </span>
                              )}
                            </div>
                              <div className="text-xs" style={{ color: INK_SOFT }}>
                                {descriptionObjectif(o)}
                                {objectiveTargets(o).length > 0 && ` · ${(o.masteredTargetIds || []).length}/${objectiveTargets(o).length} cibles acquises`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => toggleFavorite(s.id, o.id)} style={{ color: o.favorite ? CAT_AMBER : INK_SOFT }} title="Objectif prioritaire">
                              <Star size={15} fill={o.favorite ? CAT_AMBER : 'none'} />
                            </button>
                            <button
                              onClick={() => { if (window.confirm(`Enregistrer « ${o.name} » comme modèle réutilisable ?`)) onSaveTemplate(o); }}
                              style={{ color: INK_SOFT }} title="Enregistrer comme modèle"
                            ><BookmarkPlus size={15} /></button>
                            <button onClick={() => { setCopyingObj(copyingObj === o.id ? null : o.id); setCopyTargets([]); }} style={{ color: INK_SOFT }} title="Copier vers d'autres personnes"><Copy size={15} /></button>
                            <button onClick={() => setEditingObj(o.id)} style={{ color: INK_SOFT }} title="Modifier"><Pencil size={15} /></button>
                            <button
                              onClick={() => { if (window.confirm(`Supprimer l'objectif « ${o.name} » ?`)) removeObjective(s.id, o.id); }}
                              style={{ color: INK_SOFT }} title="Supprimer"
                            ><Trash2 size={15} /></button>
                          </div>
                        </div>

                        {copyingObj === o.id && (
                          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                            <div className="text-xs mb-2" style={{ color: INK_SOFT }}>Copier cet objectif vers</div>
                            {students.filter((x) => x.id !== s.id).length === 0 ? (
                              <div className="text-xs" style={{ color: INK_SOFT }}>Aucune autre personne enregistrée.</div>
                            ) : (
                              <>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {students.filter((x) => x.id !== s.id).map((x) => (
                                    <Chip
                                      key={x.id} label={x.initials} on={copyTargets.includes(x.id)}
                                      onClick={() => setCopyTargets((t) => (t.includes(x.id) ? t.filter((y) => y !== x.id) : [...t, x.id]))}
                                    />
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <Btn
                                    onClick={() => { duplicateObjective(o, copyTargets); setCopyingObj(null); setCopyTargets([]); }}
                                    disabled={copyTargets.length === 0}
                                    className="flex-1 text-sm py-2.5"
                                  >
                                    Copier
                                  </Btn>
                                  <Btn variant="ghost" onClick={() => setCopyingObj(null)} className="text-sm py-2.5">Annuler</Btn>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <ObjectiveEditor
                  guidances={guidances} templates={templates} onAdd={(o) => addObjective(s.id, o)}
                  onOuvrirGuidances={onOuvrirGuidances} onOuvrirModeles={onOuvrirModeles}
                  ouvrir={creationPour === s.id} typeInitial={typeNouveau}
                />
              </div>
            )}
          </Card>
          </div>
        ))}
      </div>
      )}

      {ajoutSuivi && (
        <FeuilleAjoutSuivi
          student={students.find((s) => s.id === ajoutSuivi)}
          axes={axesSuivi}
          onChoisir={(axeId) => { onToggleAxeSuivi(ajoutSuivi, axeId); setAjoutSuivi(null); }}
          onCreer={() => { const sid = ajoutSuivi; setAjoutSuivi(null); onCreerSuivi(sid); }}
          onClose={() => setAjoutSuivi(null)}
        />
      )}
    </div>
  );
}

/* Choix d'un suivi continu à activer pour une personne : la bibliothèque moins
   ce qu'elle a déjà. En créer un depuis ici l'active et bascule sur l'onglet
   Suivi continu, où se définissent ses critères — un suivi sans critère ne sert
   à rien, autant y conduire tout de suite. */
function FeuilleAjoutSuivi({ student, axes, onChoisir, onCreer, onClose }) {
  const dispo = (axes || []).filter((a) => !((student && student.suivisActifs) || []).includes(a.id));
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0" style={{ backgroundColor: 'var(--overlay-backdrop)' }} onClick={onClose}>
      <div className="rounded-2xl p-5 max-w-sm w-full max-h-[85vh] overflow-y-auto" style={{ backgroundColor: CARD }} onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>
            Ajouter un suivi — {student ? student.initials : ''}
          </span>
          <button onClick={onClose} style={{ color: INK_SOFT }} aria-label="Fermer"><X size={18} /></button>
        </div>

        {dispo.length === 0 ? (
          <Empty>
            {(axes || []).length === 0
              ? 'Aucun suivi dans la bibliothèque.'
              : 'Tous les suivis de la bibliothèque sont déjà actifs pour cette personne.'}
          </Empty>
        ) : (
          <div className="space-y-1.5 mb-4">
            {dispo.map((axe) => (
              <button
                key={axe.id}
                onClick={() => onChoisir(axe.id)}
                className="w-full rounded-xl px-3 py-2.5 text-left border"
                style={{ borderColor: BORDER }}
              >
                <span className="block text-sm font-medium" style={{ fontFamily: F_DISPLAY }}>{nomAxe(axe)}</span>
                <span className="block text-xs" style={{ color: INK_SOFT }}>
                  {axe.criteres.map((c) => c.l).join(', ') || 'aucun critère défini'}
                </span>
              </button>
            ))}
          </div>
        )}

        <Btn variant="ghost" onClick={onCreer} className="w-full text-sm">
          <Plus size={16} /> Créer un nouveau suivi
        </Btn>
      </div>
    </div>
  );
}

function ObjectiveEditor({ guidances, templates, onAdd, onOuvrirGuidances, onOuvrirModeles, ouvrir, typeInitial }) {
  const [open, setOpen] = useState(false);
  const [depuisModele, setDepuisModele] = useState(false);
  const [base, setBase] = useState(null);

  /* Ouverture pilotée depuis l'extérieur (lien croisé Suivi/Session) :
     directement le formulaire, préempli d'un type si fourni (ex. Équilibre). */
  useEffect(() => {
    if (!ouvrir) return;
    setBase(typeInitial ? { type: typeInitial } : null);
    setOpen(true);
  }, [ouvrir, typeInitial]);

  if (!open) {
    return (
      <div className="flex gap-2">
        <Btn variant="ghost" onClick={() => { setBase(null); setOpen(true); }} className="flex-1 text-sm">
          <Plus size={16} /> Ajouter un objectif
        </Btn>
        {templates && templates.length > 0 ? (
          <Btn variant="ghost" onClick={() => setDepuisModele(true)} className="text-sm px-4" title="Depuis un modèle">
            <BookmarkPlus size={16} />
          </Btn>
        ) : onOuvrirModeles && (
          <Btn variant="ghost" onClick={onOuvrirModeles} className="text-sm px-4" title="Aucun modèle enregistré : en créer un">
            <BookmarkPlus size={16} />
          </Btn>
        )}
        {depuisModele && (
          <Modale titre="Partir d'un modèle" onClose={() => setDepuisModele(false)}>
            <div className="space-y-1.5">
              {templates.map((t) => {
                const meta = typeMeta(t.type);
                const Icon = meta.icon;
                return (
                  <button key={t.id}
                    onClick={() => { setBase(t); setDepuisModele(false); setOpen(true); }}
                    className="w-full rounded-xl px-3 py-2.5 flex items-center gap-2 text-left border text-sm"
                    style={{ borderColor: BORDER }}>
                    <Icon size={15} style={{ color: meta.color }} className="shrink-0" />
                    <span className="flex-1 min-w-0 break-words">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </Modale>
        )}
      </div>
    );
  }
  return (
    <ObjectiveForm
      guidances={guidances}
      initial={base ? { ...base, id: null } : undefined}
      libelleValidation="Ajouter l'objectif"
      onOuvrirGuidances={onOuvrirGuidances}
      onSubmit={(o) => { onAdd({ ...o, id: uid() }); setOpen(false); setBase(null); }}
      onCancel={() => { setOpen(false); setBase(null); }}
    />
  );
}

function ObjectiveForm({ initial, guidances, onSubmit, onCancel, libelleValidation, onOuvrirGuidances, masquerPhase }) {
  const allGuidances = guidances && guidances.length ? guidances : DEFAULT_GUIDANCE;
  const init = initial || {};
  const initConfig = init.config || {};
  const [name, setName] = useState(init.name || '');
  const [type, setType] = useState(init.type || 'trials');
  /* Seuls les modes à essais discrets se prêtent à une relance du compteur ou
     du chrono auxiliaires à chaque essai — l'intervalle mesure des tops de
     temps, pas des essais. */
  const parEssaiPossible = ['trials', 'chaining', 'balance'].includes(type);
  const [trialCount, setTrialCount] = useState(initConfig.trialCount === undefined ? 0 : initConfig.trialCount);
  const [intervalMin, setIntervalMin] = useState(() => {
    const sec = initConfig.intervalSeconds || (initConfig.intervalMinutes || 5) * 60;
    return Math.floor(sec / 60);
  });
  const [intervalSec, setIntervalSec] = useState(() => {
    const sec = initConfig.intervalSeconds || (initConfig.intervalMinutes || 5) * 60;
    return sec % 60;
  });
  const [intervalMode, setIntervalMode] = useState(initConfig.intervalMode || 'momentane');
  const [steps, setSteps] = useState(initConfig.steps || DEFAULT_CHAIN_STEPS);
  const [newStep, setNewStep] = useState('');
  const [balanceSet, setBalanceSet] = useState(() =>
    (initConfig.balanceOutcomes && initConfig.balanceOutcomes.length
      ? initConfig.balanceOutcomes
      : BALANCE_OUTCOMES).map((o) => ({ ...o }))
  );
  const [addingOutcome, setAddingOutcome] = useState(false);
  const [oLabel, setOLabel] = useState('');
  const [oShort, setOShort] = useState('');
  const [oColor, setOColor] = useState(GUIDANCE_PALETTE[0]);
  const [oReussite, setOReussite] = useState(false);
  const [oExclu, setOExclu] = useState(false);
  const [targets, setTargets] = useState(initConfig.targets || []);
  const [newTarget, setNewTarget] = useState('');
  /* Liste de réponses propre à cet objectif. On reprend d'abord un éventuel
     guidanceSet enregistré, sinon l'ancienne sélection par codes, sinon toutes
     les guidances enregistrées — chacune copiée pour que les modifications
     faites ici ne touchent pas la liste globale. */
  const [guidanceSet, setGuidanceSet] = useState(() => {
    if (initConfig.guidanceSet && initConfig.guidanceSet.length) return initConfig.guidanceSet.map((g) => ({ ...g }));
    if (initConfig.guidanceCodes && initConfig.guidanceCodes.length) {
      const sel = allGuidances.filter((g) => initConfig.guidanceCodes.includes(g.code));
      if (sel.length) return sel.map((g) => ({ ...g }));
    }
    return allGuidances.map((g) => ({ ...g }));
  });
  const [addingResponse, setAddingResponse] = useState(false);
  const [rCode, setRCode] = useState('');
  const [rLabel, setRLabel] = useState('');
  const [rColor, setRColor] = useState(GUIDANCE_PALETTE[0]);
  const [rIndep, setRIndep] = useState(false);
  const [phaseName, setPhaseName] = useState(
    init.phaseHistory && init.phaseHistory.length ? init.phaseHistory[init.phaseHistory.length - 1].name : DEFAULT_PHASES[0]
  );
  const [avecCompteur, setAvecCompteur] = useState(!!initConfig.avecCompteur);
  const [avecChrono, setAvecChrono] = useState(!!initConfig.avecChrono);
  const [chronoMode, setChronoMode] = useState(initConfig.chronoMode || 'chrono');
  const [chronoMin, setChronoMin] = useState(initConfig.chronoSeconds ? Math.floor(initConfig.chronoSeconds / 60) : 0);
  const [chronoSec, setChronoSec] = useState(initConfig.chronoSeconds ? initConfig.chronoSeconds % 60 : 30);
  /* « Relancer à chaque essai » : seuls les modes à essais discrets s'y prêtent
     — l'intervalle mesure des tops de temps, pas des essais. */
  const [compteurParEssai, setCompteurParEssai] = useState(!!initConfig.compteurParEssai);
  const [chronoParEssai, setChronoParEssai] = useState(!!initConfig.chronoParEssai);
  const [levels, setLevels] = useState(initConfig.levels || DEFAULT_INTERVAL_LEVELS);
  const [newLevel, setNewLevel] = useState('');
  const [targetLevelId, setTargetLevelId] = useState(
    initConfig.targetLevelId || (initConfig.levels && initConfig.levels[0] && initConfig.levels[0].id) || DEFAULT_INTERVAL_LEVELS[0].id
  );
  const [threshold, setThreshold] = useState((initConfig.mastery || DEFAULT_MASTERY).threshold);
  const [masterySessions, setMasterySessions] = useState((initConfig.mastery || DEFAULT_MASTERY).sessions);
  const [masteryUnit, setMasteryUnit] = useState((initConfig.mastery || DEFAULT_MASTERY).unit || 'sessions');
  /* Sens du critère, propre au mode Occurrence : « au moins » (augmenter un
     comportement) ou « au plus » (le réduire). Les autres modes restent sur
     « au moins », seul sens cohérent pour un pourcentage de réussite. */
  const [masterySens, setMasterySens] = useState((initConfig.mastery || DEFAULT_MASTERY).sens || 'min');

  function submit() {
    if (!name.trim()) return;
    const config = {};
    if (type === 'trials') {
      config.trialCount = trialCount;
    }
    if (type === 'interval') {
      const pas = Math.min(3600, Math.max(10, (Number(intervalMin) || 0) * 60 + (Number(intervalSec) || 0)));
      config.intervalSeconds = pas;
      config.intervalMinutes = pas / 60; // conservé pour les versions antérieures
      config.intervalMode = intervalMode;
      config.levels = levels;
      config.targetLevelId = levels.some((l) => l.id === targetLevelId) ? targetLevelId : levels[0].id;
    }
    if (type === 'chaining' || type === 'balance') config.steps = steps.filter((s) => s.name.trim());
    if (type === 'balance' && balanceSet.length) config.balanceOutcomes = balanceSet;
    if (avecCompteur && type !== 'occurrence') {
      config.avecCompteur = true;
      if (parEssaiPossible && compteurParEssai) config.compteurParEssai = true;
    }
    if (avecChrono) {
      config.avecChrono = true;
      config.chronoMode = chronoMode;
      if (chronoMode === 'countdown') {
        config.chronoSeconds = Math.min(3600, Math.max(5, (Number(chronoMin) || 0) * 60 + (Number(chronoSec) || 0)));
      }
      if (parEssaiPossible && chronoParEssai) config.chronoParEssai = true;
    }
    if (USES_GUIDANCE.includes(type) && guidanceSet.length) config.guidanceSet = guidanceSet;
    if (MASTERY_TYPES.includes(type)) {
      const occ = type === 'occurrence';
      config.mastery = {
        threshold: threshold === '' || threshold === null ? 80 : Math.min(occ ? 999 : 100, Math.max(occ ? 0 : 1, Number(threshold))),
        sessions: masterySessions === '' || masterySessions === null ? 3 : Math.min(60, Math.max(1, Number(masterySessions))),
        unit: masteryUnit,
        sens: occ ? masterySens : 'min',
      };
      // Les cibles successives ne concernent que les types à pourcentage.
      if (PERCENT_TYPES.includes(type) && targets.length) config.targets = targets;
    }
    /* Une phase renommée à la création remplace la première entrée ; un
       changement de phase en cours de suivi passe par le bouton dédié, qui
       ajoute une entrée datée et trace un repère sur la courbe. */
    const histo = init.phaseHistory && init.phaseHistory.length
      ? init.phaseHistory.map((ph, i) => (i === init.phaseHistory.length - 1 ? { ...ph, name: phaseName } : ph))
      : [{ id: uid(), name: phaseName, date: null }];

    onSubmit({
      id: init.id || uid(),
      name: name.trim(),
      type,
      config,
      favorite: !!init.favorite,
      currentTargetId: init.currentTargetId || null,
      masteredTargetIds: init.masteredTargetIds || [],
      phaseHistory: histo,
    });
  }

  return (
    <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: BORDER }}>
      <Field autoFocus value={name} onChange={setName} placeholder="Intitulé de l'objectif" />

      {!masquerPhase && (
        <div>
          <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Phase en cours</div>
          <div className="flex gap-1.5 flex-wrap">
            {DEFAULT_PHASES.map((ph) => (
              <button key={ph} onClick={() => setPhaseName(ph)} className="rounded-lg px-3 py-2 text-xs border"
                style={{ borderColor: phaseName === ph ? ACCENT : BORDER, backgroundColor: phaseName === ph ? ACCENT : 'transparent', color: phaseName === ph ? ACCENT_INK : INK_SOFT }}>
                {ph}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Mode de cotation</div>
        {/* Flex plutôt qu'une grille à colonnes fixes : TYPES compte cinq
            entrées, un nombre impair qui laisserait toujours la dernière
            case orpheline sur deux colonnes. Le grow fait remonter ce reste
            à la largeur de la ligne au lieu de le laisser vide à côté. */}
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(TYPES).map(([k, m]) => {
            const Icon = m.icon;
            const on = type === k;
            return (
              <button
                key={k}
                onClick={() => setType(k)}
                className="rounded-xl px-2.5 py-2.5 text-xs flex items-center gap-1.5 border text-left"
                style={{ flex: '1 1 calc(50% - 0.375rem)', borderColor: on ? m.color : BORDER, backgroundColor: on ? m.color + '18' : 'transparent', color: on ? m.color : INK_SOFT }}
              >
                <Icon size={14} /> {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {type === 'trials' && (
        <div>
          <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>
            Nombre d'essais prévus{' '}
            <span style={{ fontFamily: F_MONO }}>{trialCount ? trialCount : 'sans limite'}</span>
          </div>
          <div className="flex gap-1.5 flex-wrap items-center">
            <button onClick={() => setTrialCount(0)} className="rounded-lg px-3 py-2 text-xs border"
              style={{ borderColor: !trialCount ? ACCENT : BORDER, backgroundColor: !trialCount ? ACCENT : 'transparent', color: !trialCount ? ACCENT_INK : INK_SOFT }}>
              Sans limite
            </button>
            {[3, 5, 8, 10, 20].map((n) => (
              <button key={n} onClick={() => setTrialCount(n)} className="rounded-lg px-3.5 py-2 text-sm border"
                style={{ borderColor: trialCount === n ? ACCENT : BORDER, backgroundColor: trialCount === n ? ACCENT : 'transparent', color: trialCount === n ? ACCENT_INK : INK_SOFT, fontFamily: F_MONO }}>
                {n}
              </button>
            ))}
            <input
              type="number" inputMode="numeric" min="0" max="200" value={trialCount || ''}
              placeholder="autre"
              onChange={(e) => setTrialCount(e.target.value === '' ? 0 : Number(e.target.value))}
              onBlur={() => setTrialCount((v) => Math.min(200, Math.max(0, Number(v) || 0)))}
              className="w-20 rounded-lg border px-2 py-2 text-sm bg-transparent text-center"
              style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }}
            />
          </div>
          <p className="text-xs mt-1.5" style={{ color: INK_SOFT }}>
            Un nombre prévu sert de repère pendant la cotation, mais n'empêche jamais d'ajouter des essais supplémentaires.
          </p>
        </div>
      )}

      {type === 'interval' && (
        <div className="space-y-3">
          <div>
            <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Ce que mesure le relevé</div>
            <div className="space-y-1.5">
              {INTERVAL_MODES.map((m) => {
                const on = intervalMode === m.k;
                return (
                  <button key={m.k} onClick={() => setIntervalMode(m.k)} className="w-full rounded-lg px-3 py-2 text-left border"
                    style={{ borderColor: on ? ACCENT : BORDER, backgroundColor: on ? ACCENT : 'transparent', color: on ? ACCENT_INK : INK }}>
                    <div className="text-sm">{m.label}</div>
                    <div className="text-xs" style={{ opacity: 0.75 }}>{m.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Relevé toutes les</div>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {[30, 60, 120, 300, 600, 900].map((total) => {
                const m = Math.floor(total / 60);
                const sec = total % 60;
                const on = (Number(intervalMin) || 0) * 60 + (Number(intervalSec) || 0) === total;
                return (
                  <button key={total} onClick={() => { setIntervalMin(m); setIntervalSec(sec); }}
                    className="rounded-lg px-3 py-2 text-sm border"
                    style={{ borderColor: on ? ACCENT : BORDER, backgroundColor: on ? ACCENT : 'transparent', color: on ? ACCENT_INK : INK_SOFT, fontFamily: F_MONO }}>
                    {m ? `${m} min` : ''}{sec ? `${m ? ' ' : ''}${sec} s` : ''}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 items-center">
              <input type="number" inputMode="numeric" min="0" max="60" value={intervalMin}
                onChange={(e) => setIntervalMin(e.target.value === '' ? '' : Number(e.target.value))}
                onBlur={() => setIntervalMin((v) => (v === '' || v === null ? 0 : Math.min(60, Math.max(0, Number(v)))))}
                className="w-20 rounded-lg border px-2 py-2.5 text-sm bg-transparent text-center"
                style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }} />
              <span className="text-xs" style={{ color: INK_SOFT }}>min</span>
              <input type="number" inputMode="numeric" min="0" max="59" value={intervalSec}
                onChange={(e) => setIntervalSec(e.target.value === '' ? '' : Number(e.target.value))}
                onBlur={() => setIntervalSec((v) => (v === '' || v === null ? 0 : Math.min(59, Math.max(0, Number(v)))))}
                className="w-20 rounded-lg border px-2 py-2.5 text-sm bg-transparent text-center"
                style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }} />
              <span className="text-xs" style={{ color: INK_SOFT }}>s</span>
              <span className="text-xs ml-auto" style={{ color: INK_SOFT, fontFamily: F_MONO }}>
                = {fmtDuration(Math.min(3600, Math.max(10, (Number(intervalMin) || 0) * 60 + (Number(intervalSec) || 0))) * 1000)}
              </span>
            </div>
            <p className="text-xs mt-1.5" style={{ color: INK_SOFT }}>
              De 10 secondes à 60 minutes. Un pas court donne une mesure plus fine, mais demande
              une attention soutenue pendant toute la séance.
            </p>
          </div>
          <div>
            <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Niveaux de fonctionnement</div>
            <div className="space-y-1.5 mb-2">
              {levels.map((l, i) => (
                <div key={l.id} className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ backgroundColor: PAPER }}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: LEVEL_COLORS[i % LEVEL_COLORS.length] }} />
                  <span className="text-sm flex-1">{l.name}</span>
                  <button onClick={() => setLevels((ls) => ls.filter((x) => x.id !== l.id))} style={{ color: INK_SOFT }}><X size={14} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Field value={newLevel} onChange={setNewLevel} placeholder="Nom du niveau" onEnter={() => { if (newLevel.trim()) { setLevels((ls) => [...ls, { id: uid(), name: newLevel.trim() }]); setNewLevel(''); } }} />
              <Btn variant="ghost" onClick={() => { if (newLevel.trim()) { setLevels((ls) => [...ls, { id: uid(), name: newLevel.trim() }]); setNewLevel(''); } }} className="px-4 shrink-0"><Plus size={16} /></Btn>
            </div>
          </div>
          {levels.length > 0 && (
            <div>
              <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Niveau cible suivi dans les courbes de progression</div>
              <div className="flex flex-wrap gap-1.5">
                {levels.map((l) => (
                  <button key={l.id} onClick={() => setTargetLevelId(l.id)} className="rounded-lg px-3 py-2 text-xs border"
                    style={{ borderColor: targetLevelId === l.id ? ACCENT : BORDER, backgroundColor: targetLevelId === l.id ? ACCENT : 'transparent', color: targetLevelId === l.id ? ACCENT_INK : INK_SOFT }}>
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(type === 'chaining' || type === 'balance') && (
        <div>
          <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Étapes de la séquence, dans l'ordre</div>
          <div className="space-y-1.5 mb-2">
            {steps.map((st, i) => (
              <div key={st.id} className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ backgroundColor: PAPER }}>
                <span className="text-xs w-5 shrink-0" style={{ fontFamily: F_MONO, color: INK_SOFT }}>{i + 1}</span>
                <input
                  value={st.name}
                  onChange={(e) => setSteps((ls) => ls.map((x) => (x.id === st.id ? { ...x, name: e.target.value } : x)))}
                  placeholder={`Étape ${i + 1}`}
                  className="text-sm flex-1 min-w-0 bg-transparent border-b"
                  style={{ borderColor: BORDER, color: INK, fontFamily: F_BODY }}
                />
                <button onClick={() => setSteps((ls) => (i > 0 ? [...ls.slice(0, i - 1), ls[i], ls[i - 1], ...ls.slice(i + 1)] : ls))} style={{ color: INK_SOFT }} title="Monter">↑</button>
                <button onClick={() => setSteps((ls) => ls.filter((x) => x.id !== st.id))} style={{ color: INK_SOFT }}><X size={14} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Field value={newStep} onChange={setNewStep} placeholder="Nom de l'étape" onEnter={() => { if (newStep.trim()) { setSteps((ls) => [...ls, { id: uid(), name: newStep.trim() }]); setNewStep(''); } }} />
            <Btn variant="ghost" onClick={() => { if (newStep.trim()) { setSteps((ls) => [...ls, { id: uid(), name: newStep.trim() }]); setNewStep(''); } }} className="px-4 shrink-0"><Plus size={16} /></Btn>
          </div>
        </div>
      )}

      {USES_GUIDANCE.includes(type) && (
        <div className="rounded-xl px-3 py-3" style={{ backgroundColor: PAPER }}>
          <div className="flex items-center gap-1.5 mb-1">
            <SlidersHorizontal size={14} style={{ color: INK_SOFT }} />
            <span className="text-xs font-medium" style={{ color: INK_SOFT }}>Réponses possibles</span>
            {onOuvrirGuidances && (
              <button onClick={onOuvrirGuidances} className="text-xs ml-auto underline" style={{ color: INK_SOFT }}>
                Gérer les guidances
              </button>
            )}
          </div>

          <>
              <p className="text-xs mb-2" style={{ color: INK_SOFT }}>
                Appui long sur une réponse pour la déplacer. L'étoile désigne ce qui compte
                comme réussite autonome, pour cette personne et cet objectif précis.
              </p>

              <ReorderList
                items={guidanceSet}
                keyOf={(g) => g.code}
                onReorder={setGuidanceSet}
                className="space-y-1.5 mb-2"
                renderItem={(g) => (
                  <div className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ backgroundColor: CARD }}>
                    <GripVertical size={14} style={{ color: INK_SOFT }} className="shrink-0" />
                    <span className="w-9 h-7 rounded-md flex items-center justify-center text-xs font-semibold text-white shrink-0"
                      style={{ backgroundColor: g.color, fontFamily: F_DISPLAY }}>
                      {g.code}
                    </span>
                    <span className="text-sm flex-1 min-w-0 truncate">{g.label}</span>
                    <button
                      onClick={() => setGuidanceSet((cur) => cur.map((x) => (x.code === g.code ? { ...x, independent: !x.independent } : x)))}
                      style={{ color: g.independent ? CAT_AMBER : INK_SOFT }}
                      title="Compte comme réussite autonome"
                    >
                      <Star size={15} fill={g.independent ? CAT_AMBER : 'none'} />
                    </button>
                    <button
                      onClick={() => setGuidanceSet((cur) => (cur.length > 1 ? cur.filter((x) => x.code !== g.code) : cur))}
                      style={{ color: INK_SOFT }}
                      title="Retirer de cet objectif"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}
              />

              {allGuidances.filter((g) => !guidanceSet.some((x) => x.code === g.code)).length > 0 && (
                <div className="mb-2">
                  <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Ajouter depuis les guidances enregistrées</div>
                  <div className="flex flex-wrap gap-1.5">
                    {allGuidances.filter((g) => !guidanceSet.some((x) => x.code === g.code)).map((g) => (
                      <button
                        key={g.code}
                        onClick={() => setGuidanceSet((cur) => [...cur, { ...g }])}
                        className="rounded-lg px-3 py-2 text-xs border-2 flex items-center gap-1"
                        style={{ borderColor: g.color, color: g.color }}
                      >
                        <Plus size={12} /> {g.code} · {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {addingResponse ? (
                <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: BORDER, backgroundColor: CARD }}>
                  <div className="flex gap-2">
                    <input
                      value={rCode}
                      onChange={(e) => setRCode(e.target.value.toUpperCase().slice(0, 4))}
                      placeholder="Code"
                      className="w-24 rounded-xl border px-3 py-2.5 text-sm bg-transparent text-center"
                      style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }}
                    />
                    <Field value={rLabel} onChange={setRLabel} placeholder="Intitulé complet" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {GUIDANCE_PALETTE.map((c) => (
                      <button key={c} onClick={() => setRColor(c)} className="w-8 h-8 rounded-lg border-2"
                        style={{ backgroundColor: c, borderColor: rColor === c ? INK : 'transparent' }} />
                    ))}
                  </div>
                  <button onClick={() => setRIndep((v) => !v)} className="flex items-center gap-1.5 text-xs" style={{ color: rIndep ? CAT_AMBER : INK_SOFT }}>
                    <Star size={14} fill={rIndep ? CAT_AMBER : 'none'} /> Compte comme réussite autonome
                  </button>
                  <div className="flex gap-2">
                    <Btn
                      onClick={() => {
                        const code = rCode.trim();
                        if (!code || !rLabel.trim()) return;
                        setGuidanceSet((cur) => [...cur, { code, label: rLabel.trim(), color: rColor, independent: rIndep }]);
                        setRCode(''); setRLabel(''); setRIndep(false); setAddingResponse(false);
                      }}
                      disabled={!rCode.trim() || !rLabel.trim() || guidanceSet.some((x) => x.code === rCode.trim())}
                      className="flex-1 text-sm py-2.5"
                    >
                      Ajouter
                    </Btn>
                    <Btn variant="ghost" onClick={() => setAddingResponse(false)} className="text-sm py-2.5">Annuler</Btn>
                  </div>
                  {rCode.trim() && guidanceSet.some((x) => x.code === rCode.trim()) && (
                    <div className="text-xs" style={{ color: CRISIS }}>Ce code est déjà utilisé dans cet objectif.</div>
                  )}
                </div>
              ) : (
                <Btn variant="ghost" onClick={() => setAddingResponse(true)} className="w-full text-sm py-2.5">
                  <Plus size={15} /> Créer une réponse personnalisée
                </Btn>
              )}
            </>
        </div>
      )}

      {MASTERY_TYPES.includes(type) && (
        <div className="rounded-xl px-3 py-3" style={{ backgroundColor: PAPER }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Award size={14} style={{ color: INK_SOFT }} />
            <span className="text-xs font-medium" style={{ color: INK_SOFT }}>Critère d'acquisition</span>
          </div>
          {type === 'occurrence' && (
            <div className="flex gap-1.5 mb-2">
              {[{ k: 'max', l: 'Au plus' }, { k: 'min', l: 'Au moins' }].map((s) => (
                <button key={s.k} onClick={() => setMasterySens(s.k)} className="rounded-lg px-3 py-2 text-xs border"
                  style={{ borderColor: masterySens === s.k ? ACCENT : BORDER, backgroundColor: masterySens === s.k ? ACCENT : 'transparent', color: masterySens === s.k ? ACCENT_INK : INK_SOFT }}>
                  {s.l}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm">{type === 'occurrence' ? '' : 'À partir de'}</span>
            <input
              type="number" inputMode="numeric" min={type === 'occurrence' ? 0 : 1} max={type === 'occurrence' ? 999 : 100} value={threshold}
              /* On accepte la saisie telle quelle pendant la frappe, y compris
                 vide : borner à chaque caractère empêchait d'écrire « 85 »,
                 le « 8 » intermédiaire étant aussitôt réécrit. */
              onChange={(e) => setThreshold(e.target.value === '' ? '' : Number(e.target.value))}
              onBlur={() => setThreshold((v) => {
                if (v === '' || v === null) return 80;
                return type === 'occurrence' ? Math.min(999, Math.max(0, Number(v))) : Math.min(100, Math.max(1, Number(v)));
              })}
              className="w-16 rounded-lg border px-2 py-2 text-sm bg-transparent text-center"
              style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }}
            />
            <span className="text-sm">{type === 'occurrence' ? 'occurrences sur' : '% sur'}</span>
            <input
              type="number" inputMode="numeric" min="1" max="60" value={masterySessions}
              onChange={(e) => setMasterySessions(e.target.value === '' ? '' : Number(e.target.value))}
              onBlur={() => setMasterySessions((v) => (v === '' || v === null ? 3 : Math.min(60, Math.max(1, Number(v)))))}
              className="w-16 rounded-lg border px-2 py-2 text-sm bg-transparent text-center"
              style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }}
            />
            <div className="flex gap-1">
              {[{ k: 'sessions', l: 'séances' }, { k: 'days', l: 'jours' }].map((u) => (
                <button key={u.k} onClick={() => setMasteryUnit(u.k)} className="rounded-lg px-3 py-2 text-xs border"
                  style={{ borderColor: masteryUnit === u.k ? ACCENT : BORDER, backgroundColor: masteryUnit === u.k ? ACCENT : 'transparent', color: masteryUnit === u.k ? ACCENT_INK : INK_SOFT }}>
                  {u.l}
                </button>
              ))}
            </div>
            <span className="text-sm">consécutifs</span>
          </div>
          {masteryUnit === 'days' && (
            <p className="text-xs mt-2" style={{ color: INK_SOFT }}>
              Plusieurs séances d'une même journée sont moyennées et comptent pour un seul jour.
            </p>
          )}
          {type === 'occurrence' && (
            <p className="text-xs mt-2" style={{ color: INK_SOFT }}>
              {masterySens === 'max'
                ? '« Au plus 0 » vise l\'extinction complète du comportement.'
                : 'Utile pour suivre l\'augmentation d\'un comportement à développer, par exemple des demandes spontanées.'}
            </p>
          )}
        </div>
      )}

      {type === 'balance' && (
        <div className="rounded-xl px-3 py-3" style={{ backgroundColor: PAPER }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Route size={14} style={{ color: INK_SOFT }} />
            <span className="text-xs font-medium" style={{ color: INK_SOFT }}>Réponses possibles par étape</span>
          </div>
          <p className="text-xs mb-2" style={{ color: INK_SOFT }}>
            L'étoile désigne ce qui compte comme réussite. L'œil barré exclut la réponse du calcul,
            pour une étape non présentée qui ne doit pas peser comme un échec.
            Appui long pour réordonner.
          </p>

          <ReorderList
            items={balanceSet}
            keyOf={(o) => o.k}
            onReorder={setBalanceSet}
            className="space-y-1.5 mb-2"
            renderItem={(o) => (
              <div className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ backgroundColor: CARD }}>
                <GripVertical size={14} style={{ color: INK_SOFT }} className="shrink-0" />
                <span className="w-8 h-7 rounded-md flex items-center justify-center text-xs font-semibold text-white shrink-0"
                  style={{ backgroundColor: o.color, fontFamily: F_DISPLAY }}>
                  {o.short}
                </span>
                <span className="text-sm flex-1 min-w-0 break-words">{o.label}</span>
                <button onClick={() => setBalanceSet((cur) => cur.map((x) => (x.k === o.k ? { ...x, reussite: !x.reussite, exclu: false } : x)))}
                  style={{ color: o.reussite ? CAT_AMBER : INK_SOFT }} title="Compte comme réussite">
                  <Star size={15} fill={o.reussite ? CAT_AMBER : 'none'} />
                </button>
                <button onClick={() => setBalanceSet((cur) => cur.map((x) => (x.k === o.k ? { ...x, exclu: !x.exclu, reussite: false } : x)))}
                  style={{ color: o.exclu ? INK : INK_SOFT }} title="Exclue du calcul">
                  <EyeOff size={15} />
                </button>
                <button onClick={() => setBalanceSet((cur) => (cur.length > 1 ? cur.filter((x) => x.k !== o.k) : cur))}
                  style={{ color: INK_SOFT }} title="Retirer">
                  <X size={15} />
                </button>
              </div>
            )}
          />

          {addingOutcome ? (
            <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: BORDER, backgroundColor: CARD }}>
              <div className="flex gap-2">
                <input value={oShort} onChange={(e) => setOShort(e.target.value.toUpperCase().slice(0, 3))}
                  placeholder="Abrégé" className="w-24 rounded-xl border px-3 py-2.5 text-sm bg-transparent text-center"
                  style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }} />
                <Field value={oLabel} onChange={setOLabel} placeholder="Intitulé complet" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {GUIDANCE_PALETTE.map((c) => (
                  <button key={c} onClick={() => setOColor(c)} className="w-8 h-8 rounded-lg border-2"
                    style={{ backgroundColor: c, borderColor: oColor === c ? INK : 'transparent' }} />
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setOReussite((v) => !v); setOExclu(false); }} className="flex items-center gap-1.5 text-xs" style={{ color: oReussite ? CAT_AMBER : INK_SOFT }}>
                  <Star size={14} fill={oReussite ? CAT_AMBER : 'none'} /> Réussite
                </button>
                <button onClick={() => { setOExclu((v) => !v); setOReussite(false); }} className="flex items-center gap-1.5 text-xs" style={{ color: oExclu ? INK : INK_SOFT }}>
                  <EyeOff size={14} /> Exclue du calcul
                </button>
              </div>
              <div className="flex gap-2">
                <Btn
                  onClick={() => {
                    if (!oLabel.trim() || !oShort.trim()) return;
                    setBalanceSet((cur) => [...cur, { k: uid(), label: oLabel.trim(), short: oShort.trim(), color: oColor, reussite: oReussite, exclu: oExclu }]);
                    setOLabel(''); setOShort(''); setOReussite(false); setOExclu(false); setAddingOutcome(false);
                  }}
                  disabled={!oLabel.trim() || !oShort.trim()}
                  className="flex-1 text-sm py-2.5"
                >
                  Ajouter
                </Btn>
                <Btn variant="ghost" onClick={() => setAddingOutcome(false)} className="text-sm py-2.5">Annuler</Btn>
              </div>
            </div>
          ) : (
            <Btn variant="ghost" onClick={() => setAddingOutcome(true)} className="w-full text-sm py-2.5">
              <Plus size={15} /> Ajouter une réponse
            </Btn>
          )}
        </div>
      )}

      {PERCENT_TYPES.includes(type) && (
        <div className="rounded-xl px-3 py-3" style={{ backgroundColor: PAPER }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Target size={14} style={{ color: INK_SOFT }} />
            <span className="text-xs font-medium" style={{ color: INK_SOFT }}>Cibles successives</span>
            <span className="text-xs ml-auto" style={{ color: INK_SOFT }}>facultatif</span>
          </div>
          <p className="text-xs mb-2" style={{ color: INK_SOFT }}>
            La cotation porte sur une cible à la fois. Dès qu'elle atteint le critère ci-dessus,
            l'application passe automatiquement à la suivante.
          </p>
          {targets.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {targets.map((t, i) => (
                <div key={t.id} className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ backgroundColor: CARD }}>
                  <span className="text-xs w-5 shrink-0" style={{ fontFamily: F_MONO, color: INK_SOFT }}>{i + 1}</span>
                  <span className="text-sm flex-1 min-w-0 truncate">{t.name}</span>
                  <button onClick={() => setTargets((ls) => (i > 0 ? [...ls.slice(0, i - 1), ls[i], ls[i - 1], ...ls.slice(i + 1)] : ls))} style={{ color: INK_SOFT }} title="Monter">↑</button>
                  <button onClick={() => setTargets((ls) => ls.filter((x) => x.id !== t.id))} style={{ color: INK_SOFT }}><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Field value={newTarget} onChange={setNewTarget} placeholder="Nom de la cible (ex. rouge)"
              onEnter={() => { if (newTarget.trim()) { setTargets((ls) => [...ls, { id: uid(), name: newTarget.trim() }]); setNewTarget(''); } }} />
            <Btn variant="ghost" onClick={() => { if (newTarget.trim()) { setTargets((ls) => [...ls, { id: uid(), name: newTarget.trim() }]); setNewTarget(''); } }} className="px-4 shrink-0"><Plus size={16} /></Btn>
          </div>
        </div>
      )}

      <div className="rounded-xl px-3 py-3" style={{ backgroundColor: PAPER }}>
        <div className="text-xs mb-2" style={{ color: INK_SOFT }}>
          Mesures annexes — à part de la cotation, indépendantes l'une de l'autre
        </div>
        <div className="space-y-3">
          {/* Sur le mode Occurrence, le comptage est déjà la cotation : un
              compteur annexe en plus serait une source d'erreur de saisie. */}
          {type !== 'occurrence' && (
            <div>
              <button onClick={() => setAvecCompteur((v) => !v)} className="flex items-center gap-1.5 text-sm">
                <span className="w-9 h-5 rounded-full relative shrink-0" style={{ backgroundColor: avecCompteur ? ACCENT : BORDER }}>
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white" style={{ left: avecCompteur ? '1.25rem' : '0.125rem', transition: 'left .15s' }} />
                </span>
                Compteur
              </button>
              {avecCompteur && parEssaiPossible && (
                <button onClick={() => setCompteurParEssai((v) => !v)} className="flex items-center gap-1.5 text-xs mt-2 ml-1" style={{ color: INK_SOFT }}>
                  <span className="w-7 h-4 rounded-full relative shrink-0" style={{ backgroundColor: compteurParEssai ? ACCENT : BORDER }}>
                    <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white" style={{ left: compteurParEssai ? '0.875rem' : '0.125rem', transition: 'left .15s' }} />
                  </span>
                  Relancer à chaque essai
                </button>
              )}
            </div>
          )}
          <div>
            <button onClick={() => setAvecChrono((v) => !v)} className="flex items-center gap-1.5 text-sm">
              <span className="w-9 h-5 rounded-full relative shrink-0" style={{ backgroundColor: avecChrono ? ACCENT : BORDER }}>
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white" style={{ left: avecChrono ? '1.25rem' : '0.125rem', transition: 'left .15s' }} />
              </span>
              Chronomètre
            </button>
            {avecChrono && (
              <div className="mt-2 ml-1 space-y-2">
                <div className="flex gap-1.5">
                  {[{ k: 'chrono', l: 'Chronomètre' }, { k: 'countdown', l: 'Temps limite' }].map((m) => (
                    <button key={m.k} onClick={() => setChronoMode(m.k)} className="flex-1 rounded-lg py-2 text-xs border"
                      style={{ borderColor: chronoMode === m.k ? ACCENT : BORDER, backgroundColor: chronoMode === m.k ? ACCENT : 'transparent', color: chronoMode === m.k ? ACCENT_INK : INK_SOFT }}>
                      {m.l}
                    </button>
                  ))}
                </div>
                {chronoMode === 'countdown' && (
                  <div className="flex gap-2 items-center">
                    <input type="number" inputMode="numeric" min="0" max="60" value={chronoMin}
                      onChange={(e) => setChronoMin(e.target.value === '' ? '' : Number(e.target.value))}
                      onBlur={() => setChronoMin((v) => (v === '' || v === null ? 0 : Math.min(60, Math.max(0, Number(v)))))}
                      className="w-20 rounded-lg border px-2 py-2.5 text-sm bg-transparent text-center"
                      style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }} />
                    <span className="text-xs" style={{ color: INK_SOFT }}>min</span>
                    <input type="number" inputMode="numeric" min="0" max="59" value={chronoSec}
                      onChange={(e) => setChronoSec(e.target.value === '' ? '' : Number(e.target.value))}
                      onBlur={() => setChronoSec((v) => (v === '' || v === null ? 0 : Math.min(59, Math.max(0, Number(v)))))}
                      className="w-20 rounded-lg border px-2 py-2.5 text-sm bg-transparent text-center"
                      style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }} />
                    <span className="text-xs" style={{ color: INK_SOFT }}>s</span>
                    <span className="text-xs ml-auto" style={{ color: INK_SOFT, fontFamily: F_MONO }}>
                      = {fmtDuration(Math.min(3600, Math.max(5, (Number(chronoMin) || 0) * 60 + (Number(chronoSec) || 0))) * 1000)}
                    </span>
                  </div>
                )}
                {parEssaiPossible && (
                  <button onClick={() => setChronoParEssai((v) => !v)} className="flex items-center gap-1.5 text-xs" style={{ color: INK_SOFT }}>
                    <span className="w-7 h-4 rounded-full relative shrink-0" style={{ backgroundColor: chronoParEssai ? ACCENT : BORDER }}>
                      <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white" style={{ left: chronoParEssai ? '0.875rem' : '0.125rem', transition: 'left .15s' }} />
                    </span>
                    Relancer à chaque essai
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Btn onClick={submit} disabled={!name.trim() || (type === 'interval' && levels.length === 0) || ((type === 'chaining' || type === 'balance') && !steps.some((s) => s.name.trim()))} className="flex-1 text-sm">
          {libelleValidation || (initial ? 'Enregistrer les modifications' : "Ajouter l'objectif")}
        </Btn>
        <Btn variant="ghost" onClick={onCancel} className="text-sm">Annuler</Btn>
      </div>
    </div>
  );
}

/* ==================== Écran 3 : session ==================== */
function SessionScreen({ students, ateliers, intervenants, crises, guidances, onSetAtelierGroup, notify, onOuvrirConfiguration, onProgrammerEquilibre, onOuvrirMenu, planDuJour, activeSession, setActiveSession, onFinish, onAnnulerCorrection }) {
  if (activeSession) {
    return <SessionRunning session={activeSession} setSession={setActiveSession} students={students} ateliers={ateliers} intervenants={intervenants} crises={crises} guidances={guidances} notify={notify} onFinish={onFinish} onAnnulerCorrection={onAnnulerCorrection} suiteDuJour={planDuJour && planDuJour.restants} />;
  }
  return (
    <SessionSetup
      students={students} ateliers={ateliers} intervenants={intervenants}
      onSetAtelierGroup={onSetAtelierGroup} notify={notify} onOuvrirConfiguration={onOuvrirConfiguration}
      onProgrammerEquilibre={onProgrammerEquilibre}
      onOuvrirMenu={onOuvrirMenu} planDuJour={planDuJour}
      onStart={setActiveSession}
    />
  );
}

/* Tout le réglage d'un atelier avant lancement — personnes présentes,
   objectifs et options — dans un seul bloc réutilisé pour la proposition du
   jour comme pour n'importe quel autre atelier déplié. Chaque instance a son
   propre état local pour les personnes et objectifs : deux ateliers ouverts à
   la fois ne doivent pas se marcher dessus. L'intervenant, lui, est contrôlé
   par l'écran parent (`SessionSetup`) — un seul sélecteur, quel que soit le
   mode, pour qu'un choix fait avant de basculer d'onglet ne se perde pas. */
function AtelierLancement({
  students, atelier, mode, jour, intervenants, intervenantId, onChangeIntervenant,
  notify, onSetAtelierGroup, onLancer, banniere, titre,
}) {
  const initial = React.useMemo(() => configurerAtelier(students, atelier, jour, mode), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [studentIds, setStudentIds] = useState(initial.studentIds);
  const [selected, setSelected] = useState(initial.selected);
  const [atelierFavorites, setAtelierFavorites] = useState(initial.favorites);
  const [doubleCotation, setDoubleCotation] = useState(false);
  const [depuisMemoire, setDepuisMemoire] = useState(!!atelier && initial.studentIds.length > 0);
  const [detailObjectifs, setDetailObjectifs] = useState(false);

  useEffect(() => {
    const nbNouveaux = Object.values(initial.nouveautes).reduce((n, l) => n + l.length, 0);
    if (nbNouveaux > 0) {
      setTimeout(() => notify(`${nbNouveaux} nouvel${nbNouveaux > 1 ? 'x' : ''} objectif${nbNouveaux > 1 ? 's' : ''} ajouté${nbNouveaux > 1 ? 's' : ''} à cet atelier`), 400);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleObjectives = (st) => (mode === 'balance' ? st.objectives.filter((o) => o.type === 'balance') : st.objectives);

  const toggleStudent = (id) => {
    setStudentIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    setSelected((sel) => {
      if (sel[id]) { const n = { ...sel }; delete n[id]; return n; }
      const st = students.find((s) => s.id === id);
      // Même cascade qu'en cours de séance (FeuilleAjout, changerAtelier) :
      // mémorisé pour cet atelier, à défaut prioritaires, à défaut tous.
      return { ...sel, [id]: st ? objectifsParDefaut(st, atelier, mode) : [] };
    });
    setDepuisMemoire(false);
  };
  const toggleObjective = (sid, oid) => {
    setDetailObjectifs(true);
    setSelected((sel) => {
      const cur = sel[sid] || [];
      return { ...sel, [sid]: cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid] };
    });
  };
  const toggleAtelierFavorite = (oid) =>
    setAtelierFavorites((cur) => (cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid]));

  /* Le bouton de mémorisation n'apparaît que si la configuration en cours
     diffère de celle déjà enregistrée pour cet atelier. */
  const sameAsUsual = (() => {
    if (!atelier) return false;
    const savedIds = personnesPrevues(atelier, jour);
    if (savedIds.length !== studentIds.length || !savedIds.every((id) => studentIds.includes(id))) return false;
    const savedFav = atelier.favoriteObjectiveIds || [];
    if (savedFav.length !== atelierFavorites.length || !savedFav.every((id) => atelierFavorites.includes(id))) return false;
    const savedObj = atelier.usualObjectives || {};
    return studentIds.every((id) => {
      const a = savedObj[id] || [];
      const b = selected[id] || [];
      return a.length === b.length && a.every((oid) => b.includes(oid));
    });
  })();

  const ready = studentIds.length > 0 && studentIds.every((id) => (selected[id] || []).length > 0);
  const lancer = () => onLancer({
    mode, atelierId: atelier ? atelier.id : null, studentIds, selected,
    favorites: atelierFavorites, doubleCotation, intervenantId,
  });

  return (
    <>
      {banniere}
      {titre && (
        /* Le lancement se fait d'ici plutôt qu'en bas de carte : sur une
           configuration longue, l'éducateur ne devrait pas avoir à redescendre
           jusqu'au bouton après avoir relu le nom de l'atelier. */
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="font-semibold" style={{ fontFamily: F_DISPLAY }}>{titre}</div>
          <Btn onClick={lancer} disabled={!ready} className="text-sm py-2 shrink-0">
            <Play size={16} /> Lancer
          </Btn>
        </div>
      )}

      {mode === 'balance' && (
        <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
          Sélectionnez les personnes concernées : chacune cotera son propre Équilibre.
        </p>
      )}

      {/* Tout ce qui concerne « qui cote » regroupé en une seule zone :
          l'intervenant est réglé une fois pour l'écran entier (voir
          SessionSetup), la double cotation reste propre à ce lancement. */}
      <div className="mb-3">
        {intervenants.length > 0 && (
          <>
            <div className="text-xs mb-2" style={{ color: INK_SOFT }}>Qui cote</div>
            <div className="flex flex-wrap gap-2 mb-2.5">
              {intervenants.map((i) => {
                const on = intervenantId === i.id;
                return (
                  <button key={i.id} onClick={() => onChangeIntervenant(on ? null : i.id)} className="rounded-xl px-4 py-2.5 border text-sm"
                    style={{ borderColor: on ? ACCENT : BORDER, backgroundColor: on ? ACCENT : 'transparent', color: on ? ACCENT_INK : INK_SOFT }}>
                    {i.name}
                  </button>
                );
              })}
            </div>
          </>
        )}
        <div className="flex items-center gap-2.5">
          <button onClick={() => setDoubleCotation((v) => !v)} className="w-9 h-5 rounded-full relative shrink-0" style={{ backgroundColor: doubleCotation ? ACCENT : BORDER }} aria-label="Deux observateurs en parallèle">
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white" style={{ left: doubleCotation ? '1.25rem' : '0.125rem', transition: 'left .15s' }} />
          </button>
          <button onClick={() => setDoubleCotation((v) => !v)} className="text-sm font-medium text-left" style={{ fontFamily: F_DISPLAY }}>
            Deux observateurs en parallèle
          </button>
          <BulleInfo titre="Accord inter-observateurs">
            À cocher par chacun des deux intervenants qui cotent cette même séance, chacun sur son
            appareil. DatABA Manager repérera ensuite les deux relevés pour mesurer leur accord.
          </BulleInfo>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs" style={{ color: INK_SOFT }}>Personnes présentes</span>
        {atelier && studentIds.length > 0 && !sameAsUsual && (
          <button
            onClick={() => {
              const known = studentIds.flatMap((sid) => {
                const st = students.find((x) => x.id === sid);
                return st ? st.objectives.map((o) => o.id) : [];
              });
              onSetAtelierGroup(atelier.id, { studentIds, objectives: selected, favorites: atelierFavorites, known });
              notify('Configuration mémorisée pour cet atelier');
            }}
            className="text-xs flex items-center gap-1"
            style={{ color: INK_SOFT }}
          >
            <Star size={12} /> Mémoriser cette configuration
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {students.map((s) => {
          const on = studentIds.includes(s.id);
          return (
            <button key={s.id} onClick={() => toggleStudent(s.id)} className="rounded-xl px-4 py-2.5 border font-semibold text-sm"
              style={{ fontFamily: F_DISPLAY, borderColor: on ? ACCENT : BORDER, backgroundColor: on ? ACCENT : 'transparent', color: on ? ACCENT_INK : INK_SOFT }}>
              {s.initials}
            </button>
          );
        })}
      </div>

      {/* Configuration mémorisée appliquée : on ne montre que ce qui diffère de
          l'habituel, plutôt que de redérouler toute la liste à revérifier. */}
      {depuisMemoire && !detailObjectifs && studentIds.length > 0 && (() => {
        const nbObjectifs = studentIds.reduce((n, sid) => n + (selected[sid] || []).length, 0);
        const lignesNeuves = Object.keys(initial.nouveautes).flatMap((sid) => {
          const st = students.find((x) => x.id === sid);
          if (!st) return [];
          return initial.nouveautes[sid]
            .map((oid) => st.objectives.find((o) => o.id === oid))
            .filter(Boolean)
            .map((o) => ({ cle: `${sid}-${o.id}`, initiales: st.initials, nom: o.name, type: o.type }));
        });
        return (
          <Card className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Star size={16} style={{ color: CAT_AMBER }} />
              <span className="font-semibold text-sm" style={{ fontFamily: F_DISPLAY }}>Configuration habituelle appliquée</span>
            </div>
            <div className="text-xs mb-3" style={{ color: INK_SOFT }}>
              <span style={{ fontFamily: F_MONO }}>{studentIds.length}</span> personne{studentIds.length !== 1 ? 's' : ''} ·{' '}
              <span style={{ fontFamily: F_MONO }}>{nbObjectifs}</span> objectif{nbObjectifs !== 1 ? 's' : ''} coché{nbObjectifs !== 1 ? 's' : ''}
            </div>

            {lignesNeuves.length === 0 ? (
              <div className="text-xs mb-3" style={{ color: INK_SOFT }}>
                Rien de nouveau depuis la dernière mémorisation. Décochez une personne absente
                ci-dessus si besoin, sinon lancez directement.
              </div>
            ) : (
              <div className="mb-3">
                <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>
                  Ajouté{lignesNeuves.length !== 1 ? 's' : ''} depuis la mémorisation, coché{lignesNeuves.length !== 1 ? 's' : ''} d'office :
                </div>
                <div className="space-y-1.5">
                  {lignesNeuves.map((l) => {
                    const meta = typeMeta(l.type);
                    const Icon = meta.icon;
                    return (
                      <div key={l.cle} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: PAPER }}>
                        <Icon size={14} style={{ color: meta.color }} className="shrink-0" />
                        <span className="font-semibold shrink-0" style={{ fontFamily: F_DISPLAY }}>{l.initiales}</span>
                        <span className="min-w-0 flex-1 truncate">{l.nom}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Btn variant="ghost" onClick={() => setDetailObjectifs(true)} className="w-full text-sm">
              <Eye size={15} /> Afficher le détail des objectifs
            </Btn>
          </Card>
        );
      })()}

      {(!depuisMemoire || detailObjectifs) && studentIds.map((sid) => {
        const st = students.find((s) => s.id === sid);
        if (!st) return null;
        return (
          <Card key={sid} className="mb-3">
            <div className="font-semibold mb-2" style={{ fontFamily: F_DISPLAY }}>{st.initials}</div>
            {visibleObjectives(st).length === 0 ? (
              <div className="text-sm" style={{ color: INK_SOFT }}>
                {mode === 'balance' ? 'Aucun Équilibre défini pour cette personne.' : 'Aucun objectif défini pour cette personne.'}
              </div>
            ) : (
              <div className="space-y-1.5">
                {visibleObjectives(st).map((o) => {
                  const on = (selected[sid] || []).includes(o.id);
                  const meta = typeMeta(o.type);
                  const Icon = meta.icon;
                  const favAtelier = atelierFavorites.includes(o.id);
                  return (
                    <div key={o.id} className="w-full rounded-xl px-3 py-2.5 flex items-center gap-2 border text-sm"
                      style={{ borderColor: on ? meta.color : BORDER, backgroundColor: on ? meta.color + '14' : 'transparent' }}>
                      <button onClick={() => toggleObjective(sid, o.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                        <Icon size={15} style={{ color: meta.color }} className="shrink-0" />
                        <span className="flex-1 min-w-0">
                          {o.name}
                          {o.favorite && (
                            <span className="text-xs ml-1.5" style={{ color: CAT_AMBER }}>prioritaire</span>
                          )}
                        </span>
                        {on && <Check size={15} style={{ color: meta.color }} className="shrink-0" />}
                      </button>
                      {/* Prioritaire pour cet atelier seulement */}
                      {atelier && on && !o.favorite && (
                        <button
                          onClick={() => toggleAtelierFavorite(o.id)}
                          className="shrink-0"
                          style={{ color: favAtelier ? CAT_AMBER : INK_SOFT }}
                          title="Prioritaire pour cet atelier"
                        >
                          <Star size={15} fill={favAtelier ? CAT_AMBER : 'none'} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}

      {/* Sans titre (atelier déplié depuis la liste), pas d'en-tête pour
          accueillir le bouton : il reste ici, seule implémentation restante
          pour ce cas. */}
      {!titre && (
        <Btn onClick={lancer} disabled={!ready} className="w-full mt-2">
          <Play size={17} /> Lancer
        </Btn>
      )}
    </>
  );
}

/* Les trois façons d'ouvrir une session : Atelier (le cas courant, ouvert par
   défaut), Équilibre et Libre. Elles étaient auparavant deux entrées perdues
   au fond de la liste « Un autre atelier » — assez peu visibles pour être
   ignorées un jour de routine chargée. */
const SELECTIONS_SESSION = [
  { k: 'atelier', label: 'Atelier' },
  { k: 'equilibre', label: 'Équilibre' },
  { k: 'libre', label: 'Libre' },
];

function SessionSetup({ students, ateliers, intervenants, onSetAtelierGroup, notify, onOuvrirConfiguration, onProgrammerEquilibre, onOuvrirMenu, planDuJour, onStart }) {
  const proposition = planDuJour && planDuJour.restants && planDuJour.restants[0];
  const [selection, setSelection] = useState('atelier');
  const [intervenantId, setIntervenantId] = useState(null);
  const [lancementId, setLancementId] = useState(null);
  const studentsEquilibre = React.useMemo(() => personnesAvecEquilibre(students), [students]);
  const sansEquilibre = React.useMemo(() => students.filter((s) => !studentsEquilibre.includes(s)), [students, studentsEquilibre]);

  /* Balayage entre Atelier / Équilibre / Libre — même geste que la bascule
     prioritaires/par personne en cotation, data-no-swipe + ignoreNoSwipe pour
     ne pas déclencher le changement d'onglet. */
  const selectionRef = useRef(null);
  const selectionSuivante = React.useCallback(() => {
    const i = SELECTIONS_SESSION.findIndex((s) => s.k === selection);
    if (i < SELECTIONS_SESSION.length - 1) setSelection(SELECTIONS_SESSION[i + 1].k);
  }, [selection]);
  const selectionPrecedente = React.useCallback(() => {
    const i = SELECTIONS_SESSION.findIndex((s) => s.k === selection);
    if (i > 0) setSelection(SELECTIONS_SESSION[i - 1].k);
  }, [selection]);
  const selectionSwipe = useHorizontalSwipe(selectionRef, { onLeft: selectionSuivante, onRight: selectionPrecedente, ignoreNoSwipe: true });

  const jour = planDuJour ? planDuJour.jour : new Date().getDay();
  const autresAteliers = ordonnerPropositions(ateliers, planDuJour && planDuJour.restants, proposition ? proposition.id : null);

  const demarrer = ({ mode, atelierId, studentIds, selected, favorites, doubleCotation, intervenantId: intId }) => {
    primeAudio();
    const stamp = Date.now();
    const { snapshot, data } = construireDonneesSeance(students, studentIds, selected, favorites, mode);
    const presence = {};
    studentIds.forEach((sid) => { presence[sid] = { from: stamp, to: null }; });
    onStart({
      id: uid(),
      date: new Date(stamp).toISOString(),
      startedAt: stamp,
      mode,
      atelierId: mode === 'balance' ? null : atelierId,
      intervenantId: intId,
      doubleCotation,
      studentIds,
      selectedObjectives: selected,
      objectiveSnapshot: snapshot,
      notes: {},
      data,
      presence,
      pauses: [],
    });
  };

  if (students.length === 0) {
    return (
      <div>
        <div className="flex items-start justify-between gap-3">
          <SectionTitle>Session</SectionTitle>
          <BoutonMenu onClick={onOuvrirMenu} />
        </div>
        <Empty>Aucune personne accompagnée n'est enregistrée sur cette tablette.</Empty>
        <Btn onClick={onOuvrirConfiguration} className="w-full mt-3">
          <Users size={17} /> Créer une personne accompagnée
        </Btn>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <SectionTitle sub="Choisissez l'atelier, les personnes présentes et les objectifs travaillés.">Nouvelle session</SectionTitle>
        <BoutonMenu onClick={onOuvrirMenu} />
      </div>

      <div className="rounded-full flex items-center gap-0.5 p-1 mb-4" style={{ backgroundColor: NAV_BG }}>
        {SELECTIONS_SESSION.map((s) => {
          const on = selection === s.k;
          return (
            <button
              key={s.k}
              onClick={() => setSelection(s.k)}
              className="flex-1 rounded-full px-3 py-2 text-sm font-medium"
              style={{ fontFamily: F_DISPLAY, backgroundColor: on ? ACCENT : 'transparent', color: on ? ACCENT_INK : INK_SOFT }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div
        ref={selectionRef}
        data-no-swipe
        style={{
          transform: selectionSwipe.offset ? `translateX(${selectionSwipe.offset}px)` : 'none',
          transition: selectionSwipe.dragging ? 'none' : 'transform .2s ease-out',
        }}
      >
      {selection === 'atelier' && (
        <>
          {proposition ? (
            <Card className="mb-4">
              <AtelierLancement
                key={proposition.id}
                students={students} atelier={proposition} mode="atelier" jour={jour}
                intervenants={intervenants} intervenantId={intervenantId} onChangeIntervenant={setIntervenantId}
                notify={notify} onSetAtelierGroup={onSetAtelierGroup} onLancer={demarrer}
                titre={proposition.name}
                banniere={
                  <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: INK_SOFT }}>
                    <CalendarDays size={13} />
                    {(JOURS.find((j) => j.k === planDuJour.jour) || {}).label} · {(() => {
                      const rang = planDuJour.total - planDuJour.restants.length + 1;
                      return rang === 1 ? '1er' : `${rang}e`;
                    })()} sur {planDuJour.total}
                  </div>
                }
              />
            </Card>
          ) : (
            <Card className="mb-4">
              <Empty>Aucun atelier programmé aujourd'hui.</Empty>
            </Card>
          )}

          {autresAteliers.length > 0 && (
            <>
              <select
                value=""
                onChange={(e) => { if (e.target.value) setLancementId(e.target.value); }}
                className="w-full rounded-lg px-3 py-2.5 text-sm border"
                style={{ borderColor: BORDER, backgroundColor: PAPER, color: INK }}
              >
                <option value="">Lancer un autre atelier…</option>
                {autresAteliers.map((a) => {
                  const apercu = configurerAtelier(students, a, jour, 'atelier');
                  return (
                    <option key={a.id} value={a.id}>
                      {a.name} — {apercu.studentIds.length} personne{apercu.studentIds.length !== 1 ? 's' : ''} prévue{apercu.studentIds.length !== 1 ? 's' : ''}
                    </option>
                  );
                })}
              </select>
              {lancementId && (() => {
                const atelierLance = autresAteliers.find((a) => a.id === lancementId);
                if (!atelierLance) return null;
                return (
                  <Modale titre={atelierLance.name} onClose={() => setLancementId(null)}>
                    <AtelierLancement
                      key={lancementId}
                      students={students} atelier={atelierLance} mode="atelier" jour={jour}
                      intervenants={intervenants} intervenantId={intervenantId} onChangeIntervenant={setIntervenantId}
                      notify={notify} onSetAtelierGroup={onSetAtelierGroup} onLancer={demarrer}
                    />
                  </Modale>
                );
              })()}
            </>
          )}
        </>
      )}

      {selection === 'equilibre' && (
        <Card className="mb-4">
          {studentsEquilibre.length === 0 ? (
            <Empty>Aucune personne accompagnée n'a de programme Équilibre.</Empty>
          ) : (
            <AtelierLancement
              key="equilibre"
              students={studentsEquilibre} atelier={null} mode="balance" jour={jour}
              intervenants={intervenants} intervenantId={intervenantId} onChangeIntervenant={setIntervenantId}
              notify={notify} onSetAtelierGroup={onSetAtelierGroup} onLancer={demarrer}
              titre="Équilibre"
            />
          )}
          {/* Un Équilibre n'est pas une entité à part : c'est un objectif de
              type balance. Programmer le premier bascule directement sur la
              fiche de la personne, formulaire déjà ouvert dans ce mode. */}
          {sansEquilibre.length > 0 && onProgrammerEquilibre && (
            <div className={studentsEquilibre.length > 0 ? 'mt-4 pt-4 border-t' : ''} style={studentsEquilibre.length > 0 ? { borderColor: BORDER } : undefined}>
              <div className="text-xs mb-2" style={{ color: INK_SOFT }}>Programmer un Équilibre pour</div>
              <div className="flex flex-wrap gap-2">
                {sansEquilibre.map((s) => (
                  <button key={s.id} onClick={() => onProgrammerEquilibre(s.id)} title={`Créer un Équilibre pour ${s.initials}`}>
                    <PastillePersonne initials={s.initials} taille={36} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {selection === 'libre' && (
        <Card className="mb-4">
          <AtelierLancement
            key="libre"
            students={students} atelier={null} mode="atelier" jour={jour}
            intervenants={intervenants} intervenantId={intervenantId} onChangeIntervenant={setIntervenantId}
            notify={notify} onSetAtelierGroup={onSetAtelierGroup} onLancer={demarrer}
            titre="Séance libre"
          />
        </Card>
      )}
      </div>
    </div>
  );
}

function SessionRunning({ session, setSession, students, ateliers, intervenants, crises, guidances, notify, onFinish, onAnnulerCorrection, suiteDuJour }) {
  const isEdit = !!session.isEdit;
  const [currentId, setCurrentId] = useState(session.studentIds[0]);
  const [viewMode, setViewMode] = useState('priority');
  const [now, setNow] = useState(Date.now());
  const [soundOn, setSoundOn] = useState(true);
  const [vibrateOn, setVibrateOn] = useState(true);
  const [wakeOk, setWakeOk] = useState(false);
  const stepsRef = useRef({});
  const [expanded, setExpanded] = useState(null); // { sid, oid } de l'objectif agrandi

  /* Feuilles de commande, une seule ouverte à la fois : 'atelier' (passage à
     l'atelier suivant), 'ajout' (arrivée d'une personne), ou { personne: sid }. */
  const [feuille, setFeuille] = useState(null);

  /* Densité d'affichage. Réduire la taille agrandit d'autant la largeur
     disponible en pixels de mise en page : la grille place alors davantage de
     colonnes d'elle-même, et davantage de lignes tiennent en hauteur. */
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    (async () => {
      const v = await store.getRaw('aba:zoom');
      const n = Number(v);
      if (ZOOM_LEVELS.some((z) => z.v === n)) setZoom(n);
    })();
  }, []);
  function cycleZoom() {
    const i = ZOOM_LEVELS.findIndex((z) => z.v === zoom);
    const next = ZOOM_LEVELS[(i + 1) % ZOOM_LEVELS.length].v;
    setZoom(next);
    store.setRaw('aba:zoom', String(next));
  }
  /* Disposition en colonnes plutôt qu'en lignes : une fiche courte (un
     compteur) n'impose plus sa hauteur à la fiche voisine, et l'espace
     laissé libre est repris par l'objectif suivant, même s'il appartient à
     une autre personne. Le nombre de colonnes suit la largeur disponible,
     donc la densité choisie. */
  const gridItemStyle = {
    breakInside: 'avoid',
    WebkitColumnBreakInside: 'avoid',
    pageBreakInside: 'avoid',
    display: 'inline-block',
    width: '100%',
    marginBottom: '0.75rem',
  };
  /* Les colonnes CSS ne répartissent vraiment les fiches sur plusieurs
     colonnes qu'à partir de trois : avec une ou deux — le cas le plus
     courant en début de suivi, quand une personne n'a encore qu'un ou deux
     objectifs — le navigateur les empile dans la première colonne et laisse
     le reste de la largeur inoccupé, quelle que soit la place disponible.
     En dessous de ce seuil, une rangée flex n'a pas ce défaut. */
  const packStyle = (count, colWidth) => (
    count >= 3
      ? { style: { zoom, columnWidth: `${colWidth}px`, columnGap: '0.75rem' }, itemStyle: gridItemStyle }
      : { style: { zoom, display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }, itemStyle: { flex: `1 1 ${colWidth}px`, minWidth: 0 } }
  );
  const cotationRef = useRef(null);

  /* Personnes dont les cotations sont à l'écran. Une personne repartie sort de
     la zone de cotation mais reste dans la séance — en correction, tout le
     monde est coté, sinon on ne pourrait plus reprendre les relevés de
     quelqu'un qui a quitté l'atelier. */
  const aCoter = session.studentIds.filter((sid) => isEdit || estPresent(session, sid));

  /* La personne affichée a pu quitter l'atelier ou être retirée : on se rabat
     sur la première encore à l'écran plutôt que de rendre une vue vide. */
  useEffect(() => {
    if (aCoter.length && !aCoter.includes(currentId)) setCurrentId(aCoter[0]);
  }, [aCoter.join('|'), currentId]);

  /* Réordonne les objectifs d'une personne. En vue Prioritaires on ne déplace
     qu'un sous-ensemble : les positions occupées par ce sous-ensemble dans la
     liste complète sont réutilisées, l'ordre des autres reste intact. */
  /* Liste à plat des objectifs prioritaires, toutes personnes confondues.
     L'ordre choisi par l'éducateur est conservé dans la séance ; les objectifs
     qui n'y figurent pas encore sont ajoutés à la suite. */
  const priorityItems = (() => {
    const naturel = [];
    aCoter.forEach((sid) => {
      (session.selectedObjectives[sid] || []).forEach((oid) => {
        const o = session.objectiveSnapshot[oid];
        if (!o) return;
        /* En séance Équilibre, la cotation doit être accessible sans
           passer par la vue par personne : elle figure d'office ici. */
        const autoBalance = session.mode === 'balance' && o.type === 'balance';
        if (o.favorite || autoBalance) naturel.push(`${sid}|${oid}`);
      });
    });
    const memorise = session.priorityOrder || [];
    return [...memorise.filter((k) => naturel.includes(k)), ...naturel.filter((k) => !memorise.includes(k))];
  })();

  /* Zone dominante pour les Équilibre, zone latérale pour le reste */
  const balanceKeys = priorityItems.filter((k) => {
    const o = session.objectiveSnapshot[k.split('|')[1]];
    return o && o.type === 'balance';
  });
  const autresKeys = priorityItems.filter((k) => !balanceKeys.includes(k));

  function reorderPriority(sousEnsemble) {
    setSession((s0) => {
      const complet = s0.priorityOrder && s0.priorityOrder.length ? s0.priorityOrder.slice() : priorityItems.slice();
      const positions = [];
      complet.forEach((k, i) => { if (sousEnsemble.includes(k)) positions.push(i); });
      const suite = complet.slice();
      positions.forEach((pos, i) => { suite[pos] = sousEnsemble[i]; });
      return { ...s0, priorityOrder: suite };
    });
  }

  function reorderObjectives(sid, nouvelOrdre) {
    setSession((s0) => {
      const complet = s0.selectedObjectives[sid] || [];
      const positions = [];
      complet.forEach((oid, i) => { if (nouvelOrdre.includes(oid)) positions.push(i); });
      const suite = complet.slice();
      positions.forEach((pos, k) => { suite[pos] = nouvelOrdre[k]; });
      return { ...s0, selectedObjectives: { ...s0.selectedObjectives, [sid]: suite } };
    });
  }

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  /* Écran maintenu allumé pendant la cotation */
  useEffect(() => {
    let lock = null;
    let cancelled = false;
    async function acquire() {
      try {
        if (!('wakeLock' in navigator)) return;
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) { lock.release(); lock = null; return; }
        setWakeOk(true);
        lock.addEventListener('release', () => setWakeOk(false));
      } catch (e) {
        setWakeOk(false);
      }
    }
    acquire();
    const onVis = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      if (lock) { try { lock.release(); } catch (e) {} }
    };
  }, []);

  /* Alerte au passage d'un intervalle */
  useEffect(() => {
    if (isEdit || session.pausedAt) return;
    const stepSet = new Set();
    Object.values(session.objectiveSnapshot || {}).forEach((o) => {
      if (o && o.type === 'interval') stepSet.add(intervalStepSec(o) / 60);
    });
    let fire = false;
    stepSet.forEach((min) => {
      const idx = Math.floor((now - session.startedAt) / (min * 60000)) + 1;
      const prev = stepsRef.current[min];
      if (prev !== undefined && idx > prev) fire = true;
      stepsRef.current[min] = idx;
    });
    if (fire) alertInterval({ soundOn, vibrateOn });
  }, [now]);

  /* Balayage dans la zone de cotation : bascule prioritaires / par personne.
     Le hook s'arrête au conteneur, donc son propre data-no-swipe — qui empêche
     le changement de page — ne bloque pas ce geste-ci. */
  const toStudentView = React.useCallback(() => setViewMode('student'), []);
  const toPriorityView = React.useCallback(() => setViewMode('priority'), []);
  const cotationSwipe = useHorizontalSwipe(cotationRef, { onLeft: toStudentView, onRight: toPriorityView, ignoreNoSwipe: true });

  const atelier = ateliers.find((a) => a.id === session.atelierId);
  const intervenant = intervenants.find((i) => i.id === session.intervenantId);
  const student = students.find((s) => s.id === currentId);
  const objIds = session.selectedObjectives[currentId] || [];
  const hasInterval = Object.values(session.objectiveSnapshot || {}).some((o) => o && o.type === 'interval');

  /* Les pauses sont historisées en plus du cumul `pausedMs` : une personne
     arrivée ou repartie en cours de séance ne doit se voir décompter que les
     pauses qui recoupent réellement sa présence. */
  function togglePause() {
    setSession((s0) => {
      const stamp = Date.now();
      if (s0.pausedAt) {
        const pauses = (s0.pauses || []).slice();
        const i = pauses.findIndex((p) => p.from === s0.pausedAt && p.to == null);
        if (i >= 0) pauses[i] = { ...pauses[i], to: stamp };
        else pauses.push({ from: s0.pausedAt, to: stamp });
        return { ...s0, pauses, pausedMs: (s0.pausedMs || 0) + (stamp - s0.pausedAt), pausedAt: null };
      }
      // On arrête les chronomètres en cours pour ne pas compter le temps de pause
      const data = {};
      Object.entries(s0.data || {}).forEach(([sid, objs]) => {
        data[sid] = {};
        Object.entries(objs).forEach(([oid, e]) => {
          data[sid][oid] = figerChronos(e, stamp);
        });
      });
      return { ...s0, data, pausedAt: stamp, pauses: [...(s0.pauses || []), { from: stamp, to: null }] };
    });
  }

  function toggleHidden(sid, oid) {
    setSession((s0) => {
      const hidden = { ...(s0.hidden || {}) };
      const list = hidden[sid] || [];
      hidden[sid] = list.includes(oid) ? list.filter((x) => x !== oid) : [...list, oid];
      return { ...s0, hidden };
    });
  }

  const hiddenFor = (sid) => (session.hidden && session.hidden[sid]) || [];

  function updateEntry(sid, oid, patch) {
    setSession((s) => ({
      ...s,
      data: { ...s.data, [sid]: { ...s.data[sid], [oid]: { ...s.data[sid][oid], ...patch } } },
    }));
  }

  /* Arrivée, départ, suppression : la logique vit dans les fonctions de
     premier niveau (App.jsx), ici seulement le geste et le retour visuel. */
  function ajouter(sid, oids) {
    const st = students.find((s) => s.id === sid);
    if (!st) return;
    const atelier = ateliers.find((a) => a.id === session.atelierId);
    setSession((s0) => ajouterPersonne(s0, st, oids, Date.now(), (atelier && atelier.favoriteObjectiveIds) || []));
    setFeuille(null);
    if (notify) notify(`${st.initials} — ajout à la séance`);
  }
  function partir(sid) {
    setSession((s0) => retirerPersonne(s0, sid, Date.now()));
    setFeuille(null);
  }
  function fairRevenir(sid) {
    const st = students.find((s) => s.id === sid);
    if (!st) return;
    setSession((s0) => ajouterPersonne(s0, st, s0.selectedObjectives[sid] || [], Date.now(), []));
  }
  function supprimer(sid) {
    setSession((s0) => supprimerPersonne(s0, sid));
    setFeuille(null);
  }

  const pausedTotal = session.pausedMs || 0;
  const isPaused = !!session.pausedAt;
  const elapsed = isEdit
    ? Math.max(0, (session.endedAt || session.startedAt) - session.startedAt - pausedTotal)
    : Math.max(0, (isPaused ? session.pausedAt : now) - session.startedAt - pausedTotal);

  const nbMasques = Object.values(session.hidden || {}).reduce((a, l) => a + l.length, 0);

  function abandonner() {
    if (window.confirm('Abandonner cette séance ? Toutes les cotations en cours seront perdues.')) setSession(null);
  }

  function changerAtelier(atelierId, keepIds) {
    const cible = ateliers.find((a) => a.id === atelierId);
    const selected = {};
    keepIds.forEach((sid) => {
      selected[sid] = objectifsParDefaut(students.find((s) => s.id === sid), cible, session.mode);
    });
    const { close, next } = chainerAtelier(session, atelierId, {
      students, studentIds: keepIds, selected, favorites: (cible && cible.favoriteObjectiveIds) || [],
    }, Date.now());
    setFeuille(null);
    onFinish(close, next);
  }

  const alerteActive = soundOn || vibrateOn;
  function toggleAlerte() {
    const next = !alerteActive;
    setSoundOn(next);
    setVibrateOn(next);
    if (next) {
      primeAudio(); beep();
      try { navigator.vibrate([200, 100, 200]); } catch (e) {}
    }
  }

  return (
    <div>
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {isEdit ? (
            <h1 className="text-xl font-semibold truncate min-w-0" style={{ fontFamily: F_DISPLAY }}>
              {atelier ? atelier.name : session.mode === 'balance' ? 'Équilibre' : 'Séance libre'}
            </h1>
          ) : (
            <button onClick={() => setFeuille('atelier')} className="flex items-center gap-1 min-w-0 text-left" title="Changer d'atelier">
              <h1 className="text-xl font-semibold truncate" style={{ fontFamily: F_DISPLAY }}>
                {atelier ? atelier.name : session.mode === 'balance' ? 'Équilibre' : 'Séance libre'}
              </h1>
              <ChevronDown size={16} style={{ color: INK_SOFT }} className="shrink-0" />
            </button>
          )}
          <div className="flex flex-wrap gap-1.5 shrink-0 ml-auto">
            {isEdit && (
              <Btn variant="ghost" onClick={() => { setSession(null); if (onAnnulerCorrection) onAnnulerCorrection(); }} className="text-sm py-2">Annuler</Btn>
            )}
            {!isEdit && (
              <button
                onClick={togglePause}
                className="rounded-xl px-2.5 py-2 border"
                style={{ borderColor: isPaused ? ACCENT : BORDER, backgroundColor: isPaused ? ACCENT : CARD, color: isPaused ? ACCENT_INK : INK_SOFT }}
                title={isPaused ? 'Reprendre la séance' : 'Mettre en pause'}
              >
                {isPaused ? <Play size={15} /> : <Pause size={15} />}
              </button>
            )}
            {!isEdit && (
              <button
                onClick={cycleZoom}
                className="rounded-xl px-2.5 py-2 border"
                style={{ borderColor: BORDER, color: INK_SOFT, backgroundColor: CARD }}
                title={`Densité d'affichage : ${(ZOOM_LEVELS.find((z) => z.v === zoom) || ZOOM_LEVELS[0]).l}`}
              >
                <LayoutGrid size={15} />
              </button>
            )}
            {!isEdit && hasInterval && (
              <button
                onClick={toggleAlerte}
                className="rounded-xl px-2.5 py-2 border"
                style={{ borderColor: BORDER, color: INK_SOFT, backgroundColor: CARD }}
                title={alerteActive ? 'Couper alerte sonore et vibration' : 'Activer alerte sonore et vibration'}
              >
                {alerteActive ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
            )}
            {!isEdit && (
              <button
                onClick={abandonner}
                className="rounded-xl px-2.5 py-2 border"
                style={{ borderColor: CRISIS, color: CRISIS, backgroundColor: CARD }}
                title="Abandonner la séance"
              >
                <X size={15} />
              </button>
            )}
            <Btn variant="outline" onClick={() => onFinish(finalizeSession(session))} className="text-sm py-2" title={isEdit ? 'Valider' : 'Enregistrer'}>
              <Save size={15} />
            </Btn>
          </div>
        </div>
        <p className="text-sm" style={{ color: INK_SOFT }}>
          {isEdit ? <>Correction · {new Date(session.date).toLocaleDateString('fr-FR')} {timeShort(session.date)}</> : <span style={{ fontFamily: F_MONO }}>{fmtClock(elapsed)}</span>}
          {intervenant && <> · {intervenant.name}</>}
          {!isEdit && wakeOk && <> · <Sun size={12} className="inline" /> écran maintenu</>}
        </p>
      </div>

      {nbMasques > 0 && (
        <div className="rounded-xl px-3 py-2.5 mb-4 flex items-center justify-between gap-2 text-sm" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}` }}>
          <span className="flex items-center gap-2" style={{ color: INK_SOFT }}>
            <EyeOff size={15} /> {nbMasques} objectif{nbMasques > 1 ? 's' : ''} masqué{nbMasques > 1 ? 's' : ''}
          </span>
          <button onClick={() => setSession((s0) => ({ ...s0, hidden: {} }))} className="text-xs font-medium flex items-center gap-1" style={{ color: ACCENT }}>
            <Eye size={13} /> Tout réafficher
          </button>
        </div>
      )}

      {isPaused && (
        <div className="rounded-xl px-3 py-2.5 mb-4 flex items-center gap-2 text-sm" style={{ backgroundColor: ACCENT, color: ACCENT_INK }}>
          <PauseCircle size={16} />
          Séance en pause — le chronomètre et les intervalles sont arrêtés.
        </div>
      )}

      {/* Mini-curseur : bascule prioritaires / tous les objectifs.
          Réagit aussi au balayage sur la zone de cotation. */}
      <div className="flex justify-center mb-3">
        <div className="relative flex rounded-full p-1 w-full max-w-xs" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <div
            className="absolute top-1 bottom-1 rounded-full"
            style={{
              left: viewMode === 'priority' ? '0.25rem' : 'calc(50% - 0.125rem)',
              width: 'calc(50% - 0.125rem)',
              backgroundColor: ACCENT,
              transition: 'left .2s ease-out',
            }}
          />
          {[
            { k: 'priority', label: 'Prioritaires', icon: Star },
            { k: 'student', label: 'Par personne', icon: Users },
          ].map((v) => {
            const Icon = v.icon;
            const on = viewMode === v.k;
            return (
              <button key={v.k} onClick={() => setViewMode(v.k)}
                className="relative flex-1 rounded-full py-2 text-sm font-medium flex items-center justify-center gap-1.5"
                style={{ fontFamily: F_DISPLAY, color: on ? ACCENT_INK : INK_SOFT, transition: 'color .2s' }}>
                <Icon size={15} /> {v.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="flex gap-3"
        data-no-swipe
        ref={cotationRef}
        style={{
          transform: cotationSwipe.offset ? `translateX(${cotationSwipe.offset}px)` : 'none',
          transition: cotationSwipe.dragging ? 'none' : 'transform .2s ease-out',
        }}
      >
        {/* Contenu : tous les prioritaires, ou la personne courante.
            En paysage, les objectifs s'affichent en deux colonnes — six tiennent
            alors à l'écran sans défilement. */}
        <div className="flex-1 min-w-0">
          {viewMode === 'priority' ? (
            priorityItems.length === 0 ? (
              <Empty>Aucun objectif prioritaire parmi les personnes présentes.</Empty>
            ) : (() => {
              /* Une fiche par objectif, rendue par les deux zones */
              const carte = (k) => {
                const [sid, oid] = k.split('|');
                const obj = session.objectiveSnapshot[oid];
                const st = students.find((x) => x.id === sid);
                if (!obj || !session.data[sid]) return null;
                return (
                  <ObjectiveCard
                    obj={obj}
                    entry={session.data[sid][oid]}
                    now={now} elapsed={elapsed}
                    session={session} crises={crises} studentId={sid} guidances={guidances}
                    studentLabel={st ? st.initials : null}
                    onStudentClick={() => { setCurrentId(sid); setViewMode('student'); }}
                    hidden={hiddenFor(sid).includes(oid)}
                    onToggleHidden={() => toggleHidden(sid, oid)}
                    onExpand={() => setExpanded({ sid, oid })}
                    onChange={(p) => updateEntry(sid, oid, p)}
                  />
                );
              };

              /* Sans Équilibre, un flux unique suffit. */
              if (balanceKeys.length === 0) {
                const pack = packStyle(priorityItems.length, 280);
                return (
                  <ReorderList
                    items={priorityItems}
                    keyOf={(k) => k}
                    onReorder={reorderPriority}
                    style={pack.style}
                    itemStyle={pack.itemStyle}
                    renderItem={carte}
                  />
                );
              }

              /* Avec Équilibre : il occupe la zone principale, les autres
                 objectifs prioritaires passent sur le côté. Deux Équilibre ou plus
                 se placent côte à côte dans cette zone — un seul reste étalé sur
                 toute la largeur, cas que packStyle ne couvre pas. */
              const packBalance = balanceKeys.length > 1
                ? packStyle(balanceKeys.length, 340)
                : { style: { zoom, columnWidth: '100%', columnGap: '0.75rem' }, itemStyle: gridItemStyle };
              const packCote = packStyle(autresKeys.length, 260);

              return (
                <div className="flex flex-col landscape:flex-row gap-3 items-start">
                  <div className="w-full landscape:flex-[3] min-w-0">
                    <ReorderList
                      items={balanceKeys}
                      keyOf={(k) => k}
                      onReorder={reorderPriority}
                      style={packBalance.style}
                      itemStyle={packBalance.itemStyle}
                      renderItem={carte}
                    />
                  </div>
                  {autresKeys.length > 0 && (
                    <div className="w-full landscape:flex-1 min-w-0">
                      <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Autres objectifs prioritaires</div>
                      <ReorderList
                        items={autresKeys}
                        keyOf={(k) => k}
                        onReorder={reorderPriority}
                        style={packCote.style}
                        itemStyle={packCote.itemStyle}
                        renderItem={carte}
                      />
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div>
              <div className="mb-3">
                <span className="text-2xl font-semibold" style={{ fontFamily: F_DISPLAY }}>{student ? student.initials : ''}</span>
              </div>

              <ReorderList
                items={objIds}
                keyOf={(oid) => oid}
                onReorder={(next) => reorderObjectives(currentId, next)}
                style={packStyle(objIds.length, 280).style}
                itemStyle={packStyle(objIds.length, 280).itemStyle}
                renderItem={(oid) => {
                  const obj = session.objectiveSnapshot[oid];
                  if (!obj) return null;
                  return (
                    <ObjectiveCard
                      obj={obj}
                      entry={session.data[currentId][oid]}
                      now={now} elapsed={elapsed}
                      session={session} crises={crises} studentId={currentId} guidances={guidances}
                      hidden={hiddenFor(currentId).includes(oid)}
                      onToggleHidden={() => toggleHidden(currentId, oid)}
                      onExpand={() => setExpanded({ sid: currentId, oid })}
                      onChange={(p) => updateEntry(currentId, oid, p)}
                    />
                  );
                }}
              />

              <Card className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <StickyNote size={15} style={{ color: INK_SOFT }} />
                  <span className="text-sm font-medium" style={{ fontFamily: F_DISPLAY }}>Note d'observation</span>
                </div>
                <textarea
                  value={(session.notes && session.notes[currentId]) || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSession((s) => ({ ...s, notes: { ...(s.notes || {}), [currentId]: v } }));
                  }}
                  rows={3}
                  placeholder="Ce qui ne rentre dans aucune case : contexte, réaction, élément à signaler."
                  className="w-full rounded-xl border px-3 py-2.5 text-base bg-transparent"
                  style={{ borderColor: BORDER, fontFamily: F_BODY, color: INK }}
                />
              </Card>
            </div>
          )}
        </div>

        {/* Fenêtre agrandie : la même fiche, en plein écran */}
        {expanded && session.objectiveSnapshot[expanded.oid] && (
          <div className="fixed inset-0 z-40 overflow-y-auto" style={{ backgroundColor: PAPER }}>
            <div
              className="max-w-3xl mx-auto px-4 pb-10"
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold" style={{ fontFamily: F_DISPLAY }}>
                  {(students.find((x) => x.id === expanded.sid) || {}).initials || ''}
                </span>
                <button
                  onClick={() => setExpanded(null)}
                  className="rounded-xl px-3 py-2 border flex items-center gap-1.5 text-sm"
                  style={{ borderColor: BORDER, color: INK_SOFT, backgroundColor: CARD }}
                >
                  <Minimize2 size={15} /> Réduire
                </button>
              </div>
              <ObjectiveCard
                obj={session.objectiveSnapshot[expanded.oid]}
                entry={session.data[expanded.sid][expanded.oid]}
                now={now} elapsed={elapsed}
                session={session} crises={crises} studentId={expanded.sid} guidances={guidances}
                expandedView
                onExpand={() => setExpanded(null)}
                onChange={(p) => updateEntry(expanded.sid, expanded.oid, p)}
              />
            </div>
          </div>
        )}

        {/* Rail de personnes : navigation, arrivée et départ — les trois se
            jouaient auparavant à trois endroits de l'écran. */}
        <div className="shrink-0 flex flex-col gap-1.5 sticky top-20 self-start">
          {session.studentIds.map((sid) => {
            const st = students.find((s) => s.id === sid);
            if (!st) return null;
            const present = isEdit || estPresent(session, sid);
            const on = viewMode === 'student' && sid === currentId;
            return (
              <div key={sid} className="flex flex-col items-center gap-0.5">
                <button
                  onClick={() => {
                    if (!present) { fairRevenir(sid); return; }
                    setCurrentId(sid); setViewMode('student');
                  }}
                  className="relative w-14 h-14 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-transform active:scale-95"
                  style={{
                    fontFamily: F_DISPLAY,
                    opacity: present ? 1 : 0.45,
                    backgroundColor: on ? ACCENT : CARD,
                    color: on ? ACCENT_INK : INK_SOFT,
                    borderColor: on ? ACCENT : BORDER,
                  }}
                  title={!present ? 'Reparti de l’atelier — appuyer pour faire revenir' : undefined}
                >
                  {st.initials.replace(/\./g, '').slice(0, 3)}
                </button>
                {!isEdit && (
                  <button onClick={() => setFeuille({ personne: sid })} style={{ color: INK_SOFT }} title="Options">
                    <ChevronDown size={14} />
                  </button>
                )}
              </div>
            );
          })}
          {!isEdit && students.some((s) => !session.studentIds.includes(s.id)) && (
            <button
              onClick={() => setFeuille('ajout')}
              className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-dashed mt-1"
              style={{ borderColor: BORDER, color: INK_SOFT }}
              title="Ajouter une personne"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>

      {feuille === 'atelier' && (
        <FeuilleAtelier
          session={session} ateliers={ateliers} students={students} aCoter={aCoter}
          suiteDuJour={suiteDuJour}
          onClose={() => setFeuille(null)}
          onConfirm={changerAtelier}
        />
      )}

      {feuille === 'ajout' && (
        <FeuilleAjout
          session={session} students={students}
          atelier={ateliers.find((a) => a.id === session.atelierId)}
          onClose={() => setFeuille(null)}
          onConfirm={ajouter}
        />
      )}

      {feuille && feuille.personne && (
        <FeuillePersonne
          sid={feuille.personne}
          students={students}
          present={isEdit || estPresent(session, feuille.personne)}
          onPartir={() => partir(feuille.personne)}
          onFaireRevenir={() => { fairRevenir(feuille.personne); setFeuille(null); }}
          onSupprimer={() => supprimer(feuille.personne)}
          onClose={() => setFeuille(null)}
        />
      )}
    </div>
  );
}

/* --- Feuilles de commande de la séance en cours ---
   Composants à part entière (et non des fonctions imbriquées) pour que leurs
   propres useState ne soient montés que le temps où la feuille est ouverte. */


/* Passage à l'atelier suivant : la séance en cours est enregistrée telle
   quelle, une nouvelle démarre sur l'atelier choisi. Précoché par défaut :
   les personnes présentes qui sont aussi habituées du nouvel atelier ; les
   habituées absentes de la séance en cours restent proposées, décochées. */
function FeuilleAtelier({ session, ateliers, students, aCoter, onClose, onConfirm, suiteDuJour }) {
  const [atelierId, setAtelierId] = useState(null);
  const [checked, setChecked] = useState(() => new Set(aCoter));
  const atelier = ateliers.find((a) => a.id === atelierId);

  /* Les personnes prévues pour l'atelier suivant ce jour-là s'ajoutent d'office
     à celles déjà présentes, plutôt que de les remplacer : on décoche celles
     qui partent, on n'a plus à cocher celles qui arrivent. Un précochage par
     intersection faisait disparaître un arrivant du jour sous le doigt. */
  const prevusPour = (id) =>
    personnesPrevues(ateliers.find((a) => a.id === id), new Date().getDay())
      .filter((sid) => students.some((s) => s.id === sid));

  function choisir(id) {
    setAtelierId(id);
    setChecked(new Set([...aCoter, ...prevusPour(id)]));
  }

  const ordonnes = ordonnerPropositions(ateliers, suiteDuJour, session.atelierId);
  const idsSuite = new Set((suiteDuJour || []).map((a) => a.id));

  useEffect(() => {
    if (ordonnes[0]) choisir(ordonnes[0].id);
  }, []);

  const prevus = atelier ? prevusPour(atelier.id) : [];
  const candidats = atelier
    ? students.filter((s) => aCoter.includes(s.id) || prevus.includes(s.id))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0" style={{ backgroundColor: 'var(--overlay-backdrop)' }}>
      <div className="rounded-2xl p-5 max-w-sm w-full max-h-[85vh] overflow-y-auto" style={{ backgroundColor: CARD }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>Passer à l'atelier suivant</span>
          <button onClick={onClose} style={{ color: INK_SOFT }}><X size={18} /></button>
        </div>
        <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
          La séance en cours est enregistrée telle quelle. La nouvelle démarre avec un
          chronomètre et un temps de renforcement remis à zéro.
        </p>
        {ordonnes.length === 0 ? (
          <Empty>Aucun autre atelier n'est configuré.</Empty>
        ) : (
          <select
            value={atelierId || ''}
            onChange={(e) => choisir(e.target.value)}
            className="w-full rounded-lg px-3 py-2.5 text-sm border mb-3"
            style={{ borderColor: BORDER, backgroundColor: PAPER, color: INK }}
          >
            {ordonnes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}{idsSuite.has(a.id) ? ' — prévu aujourd’hui' : ''}
              </option>
            ))}
          </select>
        )}
        {atelier && (
          <>
            <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>
              Personnes à reporter — celles prévues pour cet atelier aujourd'hui sont déjà cochées.
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {candidats.map((s) => {
                const on = checked.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => setChecked((c) => { const n = new Set(c); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })}
                    className="rounded-xl px-4 py-2.5 border font-semibold text-sm"
                    style={{ fontFamily: F_DISPLAY, borderColor: on ? ACCENT : BORDER, backgroundColor: on ? ACCENT : 'transparent', color: on ? ACCENT_INK : INK_SOFT }}
                  >
                    {s.initials}
                  </button>
                );
              })}
            </div>
            <Btn onClick={() => onConfirm(atelierId, Array.from(checked))} disabled={checked.size === 0} className="w-full">
              <Play size={16} /> Enregistrer et lancer « {atelier.name} »
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}

/* Arrivée en cours de séance : objectifs précochés d'après ce qui est
   mémorisé pour cet atelier, à défaut les objectifs prioritaires. */
function FeuilleAjout({ session, students, atelier, onClose, onConfirm }) {
  const absents = students.filter((s) => !session.studentIds.includes(s.id));
  const [sid, setSid] = useState(absents[0] ? absents[0].id : null);
  const st = students.find((s) => s.id === sid);
  const [oids, setOids] = useState(() => objectifsParDefaut(st, atelier, session.mode));

  function choisir(id) {
    setSid(id);
    setOids(objectifsParDefaut(students.find((s) => s.id === id), atelier, session.mode));
  }

  if (!absents.length) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0" style={{ backgroundColor: 'var(--overlay-backdrop)' }}>
        <div className="rounded-2xl p-5 max-w-sm w-full" style={{ backgroundColor: CARD }}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>Ajouter une personne</span>
            <button onClick={onClose} style={{ color: INK_SOFT }}><X size={18} /></button>
          </div>
          <Empty>Toutes les personnes enregistrées sont déjà dans cette séance.</Empty>
        </div>
      </div>
    );
  }

  const visibles = st ? (session.mode === 'balance' ? st.objectives.filter((o) => o.type === 'balance') : st.objectives) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0" style={{ backgroundColor: 'var(--overlay-backdrop)' }}>
      <div className="rounded-2xl p-5 max-w-sm w-full max-h-[85vh] overflow-y-auto" style={{ backgroundColor: CARD }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>Ajouter une personne</span>
          <button onClick={onClose} style={{ color: INK_SOFT }}><X size={18} /></button>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {absents.map((s) => (
            <button
              key={s.id} onClick={() => choisir(s.id)}
              className="rounded-xl px-4 py-2.5 border font-semibold text-sm"
              style={{ fontFamily: F_DISPLAY, borderColor: sid === s.id ? ACCENT : BORDER, backgroundColor: sid === s.id ? ACCENT : 'transparent', color: sid === s.id ? ACCENT_INK : INK_SOFT }}
            >
              {s.initials}
            </button>
          ))}
        </div>
        {st && (
          visibles.length === 0 ? (
            <Empty>Aucun objectif défini pour cette personne.</Empty>
          ) : (
            <div className="space-y-1.5 mb-4">
              {visibles.map((o) => {
                const on = oids.includes(o.id);
                const meta = typeMeta(o.type);
                const Icon = meta.icon;
                return (
                  <button
                    key={o.id}
                    onClick={() => setOids((l) => (l.includes(o.id) ? l.filter((x) => x !== o.id) : [...l, o.id]))}
                    className="w-full rounded-xl px-3 py-2.5 flex items-center gap-2 border text-sm text-left"
                    style={{ borderColor: on ? meta.color : BORDER, backgroundColor: on ? meta.color + '14' : 'transparent' }}
                  >
                    <Icon size={15} style={{ color: meta.color }} className="shrink-0" />
                    <span className="flex-1 min-w-0">{o.name}</span>
                    {on && <Check size={15} style={{ color: meta.color }} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          )
        )}
        <Btn onClick={() => onConfirm(sid, oids)} disabled={!st || oids.length === 0} className="w-full">
          <Plus size={16} /> Ajouter à la séance
        </Btn>
      </div>
    </div>
  );
}

/* Actions propres à une personne de la séance. Départ (cotations conservées)
   et suppression (destructif) sont volontairement deux commandes distinctes :
   un bouton unique aurait effacé des données sans le dire clairement. */
function FeuillePersonne({ sid, students, present, onPartir, onFaireRevenir, onSupprimer, onClose }) {
  const st = students.find((s) => s.id === sid);
  if (!st) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0" style={{ backgroundColor: 'var(--overlay-backdrop)' }}>
      <div className="rounded-2xl p-5 max-w-sm w-full" style={{ backgroundColor: CARD }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>{st.initials}</span>
          <button onClick={onClose} style={{ color: INK_SOFT }}><X size={18} /></button>
        </div>
        <div className="space-y-1.5">
          {present ? (
            <button onClick={onPartir} className="w-full rounded-xl px-3 py-2.5 flex items-center gap-2 border text-sm text-left" style={{ borderColor: BORDER }}>
              <Users size={16} /> A quitté l'atelier — garder ses cotations
            </button>
          ) : (
            <button onClick={onFaireRevenir} className="w-full rounded-xl px-3 py-2.5 flex items-center gap-2 border text-sm text-left" style={{ borderColor: BORDER }}>
              <Users size={16} /> Faire revenir dans l'atelier
            </button>
          )}
          <button
            onClick={() => { if (window.confirm(`Retirer ${st.initials} de cette séance ? Ses cotations seront perdues.`)) onSupprimer(); }}
            className="w-full rounded-xl px-3 py-2.5 flex items-center gap-2 text-sm text-left"
            style={{ color: CRISIS }}
          >
            <Trash2 size={16} /> Retirer de la séance — supprime ses cotations
          </button>
        </div>
      </div>
    </div>
  );
}

function ObjectiveCard({ obj, entry, now, elapsed, session, crises, studentId, guidances, hidden, onToggleHidden, onExpand, onChange, expandedView, studentLabel, onStudentClick }) {
  /* Double-appui sur l'intitulé : agrandit la fiche. On le détecte à la main,
     l'événement natif de double-clic étant peu fiable au toucher sur iOS. */
  const dernierAppui = useRef(0);
  function handleHeaderTap() {
    if (!onExpand) return;
    const t = Date.now();
    if (t - dernierAppui.current < 320) {
      dernierAppui.current = 0;
      onExpand();
      return;
    }
    dernierAppui.current = t;
  }

  if (!obj) return null;
  const crisisSet =
    obj.type === 'interval' ? crisisIntervals(session, crises, intervalStepSec(obj) / 60, studentId) : null;
  const meta = typeMeta(obj.type);
  const Icon = meta.icon;

  if (hidden) {
    return (
      <button
        onClick={onToggleHidden}
        className="w-full rounded-2xl border px-3 py-2.5 flex items-center gap-2 text-left"
        style={{ borderColor: BORDER, backgroundColor: CARD }}
      >
        {studentLabel && (
          <span className="text-xs font-semibold shrink-0" style={{ fontFamily: F_DISPLAY, color: INK }}>{studentLabel}</span>
        )}
        <Icon size={14} style={{ color: meta.color }} className="shrink-0" />
        <span className="text-sm flex-1 min-w-0 truncate" style={{ color: INK_SOFT }}>{obj.name}</span>
        <Eye size={15} style={{ color: INK_SOFT }} />
      </button>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        {studentLabel && (
          <button
            onClick={onStudentClick}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold"
            style={{ fontFamily: F_DISPLAY, backgroundColor: ACCENT, color: ACCENT_INK }}
            title="Voir tous les objectifs de cette personne"
          >
            {studentLabel}
          </button>
        )}
        <div className="min-w-0 flex-1 cursor-pointer" onClick={handleHeaderTap}>
          <ObjectiveHeader obj={obj} entry={entry} guidances={guidances} />
        </div>
        {onExpand && !expandedView && (
          <button onClick={onExpand} style={{ color: INK_SOFT }} title="Agrandir" className="shrink-0">
            <Maximize2 size={15} />
          </button>
        )}
        {onToggleHidden && !expandedView && (
          <button onClick={onToggleHidden} style={{ color: INK_SOFT }} title="Masquer cet objectif" className="shrink-0">
            <EyeOff size={15} />
          </button>
        )}
      </div>
      <div className="mt-3">
        {obj.type === 'trials' && <TrialsWidget obj={obj} entry={entry} guidances={guidances} onChange={onChange} />}
        {obj.type === 'occurrence' && <OccurrenceWidget entry={entry} onChange={onChange} />}
        {obj.type === 'interval' && <IntervalWidget obj={obj} entry={entry} elapsed={elapsed} crisisSet={crisisSet} onChange={onChange} />}
        {obj.type === 'chaining' && <ChainingWidget obj={obj} entry={entry} guidances={guidances} onChange={onChange} />}
        {obj.type === 'balance' && <BalanceWidget obj={obj} entry={entry} onChange={onChange} />}
        {!TYPES[obj.type] && (
          <div className="text-xs" style={{ color: INK_SOFT }}>
            Ce mode de cotation a été retiré. L'objectif est à recréer dans un mode disponible.
          </div>
        )}
        {(obj.config.avecCompteur || obj.config.avecChrono) && (
          <MesuresAuxiliaires
            mesures={entry && entry.mesures}
            avecCompteur={!!obj.config.avecCompteur}
            avecChrono={!!obj.config.avecChrono}
            chronoMode={obj.config.chronoMode}
            chronoSeconds={obj.config.chronoSeconds}
            now={now}
            couleur={meta.color}
            onChange={(mesures) => onChange({ mesures })}
          />
        )}
      </div>
    </Card>
  );
}

function ObjectiveHeader({ obj, entry, guidances }) {
  const meta = typeMeta(obj.type);
  const Icon = meta.icon;
  const { result } = summarize(obj, entry, guidances);
  const cible = obj.activeTargetName;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0">
        <Icon size={16} style={{ color: meta.color, marginTop: 2 }} className="shrink-0" />
        <div className="min-w-0">
          <div className="font-medium leading-snug break-words" style={{ overflowWrap: 'anywhere' }}>{obj.name}</div>
          {cible && (
            <div className="text-xs mt-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5" style={{ backgroundColor: PAPER, color: INK }}>
              <Target size={11} /> {cible}
            </div>
          )}
          <div className="text-xs mt-0.5" style={{ color: INK_SOFT }}>{result}</div>
        </div>
      </div>
    </div>
  );
}

/* --- Compteur et chronomètre auxiliaires ---
   Une donnée à part de la cotation : disponible sur les quatre modes de
   cotation (si l'option est paramétrée sur l'objectif) et, sans réglage,
   sur les fiches crise et ABC. Composant unique pour les deux emplacements
   — CLAUDE.md interdit les implémentations parallèles. */
function MesuresAuxiliaires({ mesures, avecCompteur, avecChrono, chronoMode, chronoSeconds, now, couleur, onChange }) {
  /* Deux booléens indépendants plutôt qu'un seul « panneau ouvert » : le
     compteur et le chrono se pilotent en même temps, sans que l'ouverture de
     l'un ne referme l'autre. */
  const [ouvertCompteur, setOuvertCompteur] = useState(false);
  const [ouvertChrono, setOuvertChrono] = useState(false);
  const m = mesures || mesuresVides();
  const compteur = m.compteur || mesuresVides().compteur;
  const chrono = m.chrono || mesuresVides().chrono;
  const chronoAffiche = chrono.running ? (chrono.elapsedMs || 0) + (now - chrono.startedAt) : (chrono.elapsedMs || 0);

  /* Temps limite : sur le même principe que l'ancien chrono par essai — une
     alerte sonore et vibrée une seule fois, puis le chrono se fige à la
     limite sans se valider tout seul. */
  const countdown = chronoMode === 'countdown' && chronoSeconds > 0;
  const targetMs = (chronoSeconds || 0) * 1000;
  const ecoule = countdown && chronoAffiche >= targetMs;
  const sonne = useRef(false);

  useEffect(() => {
    if (!countdown || !chrono.running || sonne.current) return;
    if (chronoAffiche >= targetMs) {
      sonne.current = true;
      alertInterval({ soundOn: true, vibrateOn: true });
      onChange({ ...m, chrono: { ...chrono, running: false, elapsedMs: targetMs, startedAt: null } });
    }
  });
  useEffect(() => {
    if (!chrono.running) sonne.current = false;
  }, [chrono.running]);

  function ecrire(patch) {
    onChange({ ...m, ...patch });
  }

  function ajusterCompteur(delta) {
    ecrire({ compteur: { total: Math.max(0, compteur.total + delta), valideA: null } });
  }
  function validerCompteur() {
    ecrire({ compteur: { ...compteur, valideA: new Date().toISOString() } });
    setOuvertCompteur(false);
  }

  function basculerChrono() {
    if (chrono.running) {
      ecrire({ chrono: { ...chrono, running: false, elapsedMs: (chrono.elapsedMs || 0) + (Date.now() - chrono.startedAt), startedAt: null, valideA: null } });
      return;
    }
    if (countdown && (chrono.elapsedMs || 0) >= targetMs) {
      sonne.current = false;
      ecrire({ chrono: { elapsedMs: 0, running: true, startedAt: Date.now(), valideA: null } });
      return;
    }
    ecrire({ chrono: { ...chrono, running: true, startedAt: Date.now(), valideA: null } });
  }
  function validerChrono() {
    const fige = chrono.running
      ? { ...chrono, running: false, elapsedMs: (chrono.elapsedMs || 0) + (Date.now() - chrono.startedAt), startedAt: null }
      : chrono;
    ecrire({ chrono: { ...fige, valideA: new Date().toISOString() } });
    setOuvertChrono(false);
  }

  if (!avecCompteur && !avecChrono) return null;

  return (
    <div className="mt-2.5">
      <div className="flex items-center gap-3">
        {avecCompteur && (
          <button
            onClick={() => setOuvertCompteur((v) => !v)}
            className="flex items-center gap-1.5 text-xs py-1 px-0.5"
            style={{ color: INK_SOFT }}
            title="Compteur auxiliaire"
          >
            <Hash size={18} />
            {compteur.total > 0 && <span style={{ fontFamily: F_MONO }}>{compteur.total}</span>}
            {compteur.valideA && <Check size={12} style={{ color: COLOR_COMPTEUR }} />}
          </button>
        )}
        {avecChrono && (
          <button
            onClick={() => setOuvertChrono((v) => !v)}
            className="flex items-center gap-1.5 text-xs py-1 px-0.5"
            style={{ color: INK_SOFT }}
            title="Chronomètre auxiliaire"
          >
            <TimerIcon size={18} />
            {chronoAffiche > 0 && <span style={{ fontFamily: F_MONO }}>{fmtClock(chronoAffiche)}</span>}
            {chrono.valideA && <Check size={12} style={{ color: COLOR_CHRONO }} />}
          </button>
        )}
      </div>

      {ouvertCompteur && (
        <div className="mt-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: PAPER }}>
          <div className="flex items-center gap-3">
            <button onClick={() => ajusterCompteur(-1)} disabled={compteur.total === 0}
              className="w-10 h-10 rounded-lg border flex items-center justify-center text-lg disabled:opacity-30"
              style={{ borderColor: BORDER, color: INK_SOFT }}>−</button>
            <button onClick={() => ajusterCompteur(1)}
              className="flex-1 rounded-lg py-3 text-white active:scale-95 transition-transform"
              style={{ backgroundColor: COLOR_COMPTEUR }}>
              <span className="text-xl font-semibold" style={{ fontFamily: F_MONO }}>{compteur.total}</span>
              <span className="text-xs ml-2 opacity-90">+1</span>
            </button>
          </div>
          <button onClick={validerCompteur} className="mt-2 w-full text-xs flex items-center justify-center gap-1.5 py-1.5" style={{ color: INK_SOFT }}>
            <Check size={12} /> Enregistrer ce comptage
          </button>
        </div>
      )}

      {ouvertChrono && (
        <div className="mt-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: PAPER }}>
          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold tabular-nums" style={{ fontFamily: F_MONO, color: ecoule ? COLOR_CHRONO : INK }}>
              {fmtClock(countdown ? Math.max(0, targetMs - chronoAffiche) : chronoAffiche)}
            </span>
            {countdown && (
              <span className="text-xs" style={{ color: INK_SOFT }}>{ecoule ? 'temps écoulé' : `sur ${fmtDuration(targetMs)}`}</span>
            )}
            <button onClick={basculerChrono}
              className="ml-auto rounded-lg px-4 py-2.5 text-white flex items-center gap-1.5 active:scale-95 transition-transform"
              style={{ backgroundColor: chrono.running ? CAT_CORAL : COLOR_CHRONO, fontFamily: F_DISPLAY }}>
              {chrono.running ? <><Pause size={15} /> Arrêter</> : <><Play size={15} /> Démarrer</>}
            </button>
            {(chronoAffiche > 0 || chrono.running) && (
              <button onClick={() => ecrire({ chrono: { elapsedMs: 0, running: false, startedAt: null, valideA: null } })} style={{ color: INK_SOFT }}>
                <RotateCcw size={15} />
              </button>
            )}
          </div>
          <button onClick={validerChrono} className="mt-2 w-full text-xs flex items-center justify-center gap-1.5 py-1.5" style={{ color: INK_SOFT }}>
            <Check size={12} /> Enregistrer cette durée
          </button>
        </div>
      )}
    </div>
  );
}

/* --- Widgets de cotation --- */

/* Chaque appui compte une occurrence. Pas d'essais, pas de niveaux : le
   comptage brut est la cotation elle-même. Le chronomètre annexe, s'il est
   activé, sert de fenêtre d'observation sans changer ce widget. */
function OccurrenceWidget({ entry, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => onChange({ count: Math.max(0, entry.count - 1) })} disabled={entry.count === 0}
        className="w-12 h-12 rounded-xl border flex items-center justify-center text-xl disabled:opacity-30"
        style={{ borderColor: BORDER, color: INK_SOFT }}>−</button>
      <button onClick={() => onChange({ count: entry.count + 1 })}
        className="flex-1 rounded-xl py-4 text-white active:scale-95 transition-transform"
        style={{ backgroundColor: TYPES.occurrence.color }}>
        <span className="text-2xl font-semibold" style={{ fontFamily: F_MONO }}>{entry.count}</span>
        <span className="text-sm ml-2 opacity-90">+1</span>
      </button>
    </div>
  );
}

function TrialsWidget({ obj, entry, guidances, onChange }) {
  const list = objectiveGuidances(obj, guidances);
  const trials = entry.trials || [];
  const planned = obj.config.trialCount || 0; // 0 = pas de limite
  const done = trials.filter((t) => trialCode(t)).length;
  const unlimited = !planned;

  /* Relance à chaque essai : le compteur et/ou le chrono auxiliaires, s'ils
     sont paramétrés ainsi, se figent sous l'essai qu'on vient de coter puis
     repartent de zéro pour le suivant. */
  const compteurParEssai = !!(obj.config.avecCompteur && obj.config.compteurParEssai);
  const chronoParEssai = !!(obj.config.avecChrono && obj.config.chronoParEssai);

  const cells = unlimited ? [...trials.filter((t) => trialCode(t)), null] : trials;

  /* Anime uniquement la cellule qui vient d'être cotée — pas tout l'historique
     à chaque remontage du widget (changement d'onglet, dépliage de la carte). */
  const [justRecorded, setJustRecorded] = useState(null);

  function record(code) {
    let next;
    let idx;
    if (unlimited) {
      next = [...trials.filter((t) => trialCode(t)), code];
      idx = next.length - 1;
    } else {
      const empty = trials.findIndex((t) => !trialCode(t));
      if (empty === -1) {
        next = [...trials, code];
        idx = next.length - 1;
      } else {
        next = trials.slice();
        next[empty] = code;
        idx = empty;
      }
    }
    const patch = { trials: next };
    if (compteurParEssai || chronoParEssai) {
      Object.assign(patch, relancerMesures(entry, idx, compteurParEssai, chronoParEssai, Date.now()));
    }
    setJustRecorded(idx);
    onChange(patch);
  }

  function undo() {
    if (!done) return;
    if (unlimited || done > planned) {
      const kept = trials.filter((t) => trialCode(t));
      const removedIdx = kept.length - 1;
      kept.pop();
      const patch = { trials: unlimited ? kept : [...kept, ...Array(Math.max(0, planned - kept.length)).fill(null)] };
      if (entry.mesuresEssais) patch.mesuresEssais = reindexMesuresEssais(entry.mesuresEssais, removedIdx);
      onChange(patch);
      return;
    }
    const next = trials.slice();
    next[done - 1] = null;
    const patch = { trials: next };
    if (entry.mesuresEssais) patch.mesuresEssais = reindexMesuresEssais(entry.mesuresEssais, done - 1);
    onChange(patch);
  }

  const cursor = unlimited ? done : trials.findIndex((t) => !trialCode(t));

  return (
    <div>
      <div className="flex gap-1.5 mb-2.5 overflow-x-auto pb-1">
        {cells.map((t, i) => {
          const code = trialCode(t);
          const g = code ? guidanceByCode(list, code) : null;
          const isNext = !code && (unlimited ? i === cells.length - 1 : i === cursor);
          const ms = trialMs(t);
          return (
            <div key={i} className="shrink-0 text-center">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold border ${code && i === justRecorded ? 'aba-trial-in' : ''}`}
                style={{
                  fontFamily: F_MONO,
                  backgroundColor: g ? g.color : CARD,
                  color: g ? texteLisibleSur(g.color) : INK_SOFT,
                  borderColor: g ? g.color : BORDER,
                  boxShadow: isNext ? `0 0 0 2px ${TYPES.trials.color}66` : 'none',
                }}
              >
                {code || i + 1}
              </div>
              {ms != null && (
                <div className="text-[10px] mt-0.5" style={{ fontFamily: F_MONO, color: INK_SOFT }}>{(ms / 1000).toFixed(1)}s</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {list.map((g) => {
          const texte = texteLisibleSur(g.color);
          return (
            <button
              key={g.code}
              onClick={() => record(g.code)}
              className="flex-1 min-w-[72px] rounded-xl py-3 active:scale-95 transition-transform"
              style={{ backgroundColor: g.color, color: texte }}
            >
              <div className="text-sm font-semibold" style={{ fontFamily: F_DISPLAY }}>{g.code}</div>
              <div className="text-[11px] leading-tight break-words" style={{ overflowWrap: 'anywhere', color: texte }}>{g.label}</div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs" style={{ color: INK_SOFT }}>
          {unlimited
            ? `${done} essai${done !== 1 ? 's' : ''} coté${done !== 1 ? 's' : ''}`
            : cursor === -1
            ? `${done} essais cotés${done > planned ? ` (${planned} prévus)` : ' — série complète'}`
            : `Essai ${cursor + 1} sur ${planned}`}
        </span>
        {done > 0 && (
          <button onClick={undo} className="text-xs flex items-center gap-1" style={{ color: INK_SOFT }}>
            <RotateCcw size={12} /> annuler
          </button>
        )}
      </div>
    </div>
  );
}

function IntervalWidget({ obj, entry, elapsed, crisisSet, onChange }) {
  const stepMs = intervalStepSec(obj) * 1000;
  const current = Math.floor(elapsed / stepMs) + 1;
  const remaining = stepMs - (elapsed % stepMs);
  const levels = obj.config.levels || [];
  const segments = entry.segments || [];
  const scrollRef = useRef(null);

  const [adding, setAdding] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [levelId, setLevelId] = useState(levels[0] ? levels[0].id : '');

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [current]);

  const marked = entry.marks[current];
  const { total } = intervalTotals(obj, entry);
  const draftMinutes = segmentMinutes({ start, end });

  function addSegment() {
    if (!draftMinutes || !levelId) return;
    onChange({ segments: [...segments, { id: uid(), start, end, levelId }] });
    setStart(end);
    setEnd('');
    setAdding(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="text-xs" style={{ color: INK_SOFT }}>
          Intervalle <span style={{ fontFamily: F_MONO }}>#{current}</span> · prochain dans <span style={{ fontFamily: F_MONO }}>{fmtClock(remaining)}</span>
          {obj.config.intervalMode && <> · {INTERVAL_MODE_SHORT[obj.config.intervalMode]}</>}
        </span>
        {marked && <span className="text-xs shrink-0" style={{ color: TYPES.interval.color }}>coté</span>}
      </div>

      <div ref={scrollRef} className="flex gap-1 mb-2.5 overflow-x-auto pb-1">
        {Array.from({ length: current }, (_, i) => i + 1).map((n) => {
          const lid = entry.marks[n];
          const idx = levels.findIndex((l) => l.id === lid);
          const color = idx >= 0 ? LEVEL_COLORS[idx % LEVEL_COLORS.length] : null;
          const hasCrisis = crisisSet && crisisSet.has(n);
          return (
            <div key={n} className="relative shrink-0">
              <div className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] border"
                style={{
                  fontFamily: F_MONO,
                  backgroundColor: color || CARD,
                  color: color ? texteLisibleSur(color) : INK_SOFT,
                  borderColor: hasCrisis ? CRISIS : color || BORDER,
                  boxShadow: n === current ? `0 0 0 2px ${TYPES.interval.color}55` : 'none',
                }}>
                {n}
              </div>
              {hasCrisis && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: CRISIS, borderColor: CARD }} />
              )}
            </div>
          );
        })}
      </div>

      {crisisSet && crisisSet.size > 0 && (
        <div className="text-xs mb-2.5 flex items-center gap-1.5" style={{ color: CRISIS }}>
          <AlertTriangle size={12} />
          Crise sur {crisisSet.size > 1 ? 'les intervalles' : "l'intervalle"} {Array.from(crisisSet).sort((a, b) => a - b).map((n) => `#${n}`).join(', ')}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        {levels.map((l, i) => {
          const color = LEVEL_COLORS[i % LEVEL_COLORS.length];
          const on = marked === l.id;
          return (
            <button key={l.id}
              onClick={() => {
                const marks = { ...entry.marks };
                if (on) delete marks[current];
                else marks[current] = l.id;
                onChange({ marks });
              }}
              className="rounded-xl py-3 px-2.5 text-sm border-2 text-left leading-tight break-words hyphens-auto active:scale-95 transition-transform"
              style={{ borderColor: color, backgroundColor: on ? color : 'transparent', color: on ? texteLisibleSur(color) : color, fontFamily: F_DISPLAY, overflowWrap: 'anywhere' }}>
              {l.name}
            </button>
          );
        })}
      </div>

      {/* Saisie de périodes à la main, avant ou après coup */}
      <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: INK_SOFT }}>
            Périodes saisies à la main
            {total > 0 && <> · <span style={{ fontFamily: F_MONO }}>{total} min</span> cotées au total</>}
          </span>
          {!adding && (
            <button onClick={() => { setAdding(true); if (!levelId && levels[0]) setLevelId(levels[0].id); }}
              className="text-xs flex items-center gap-1 rounded-lg px-2.5 py-1.5 border"
              style={{ borderColor: BORDER, color: INK_SOFT, backgroundColor: CARD }}>
              <Plus size={13} /> Ajouter
            </button>
          )}
        </div>

        {segments.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {segments.map((s) => {
              const li = levels.findIndex((l) => l.id === s.levelId);
              const lv = levels[li];
              const color = li >= 0 ? LEVEL_COLORS[li % LEVEL_COLORS.length] : INK_SOFT;
              const mins = segmentMinutes(s);
              return (
                <div key={s.id} className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ backgroundColor: PAPER }}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-sm" style={{ fontFamily: F_MONO }}>{s.start} → {s.end}</span>
                  <span className="text-xs" style={{ color: INK_SOFT }}>{mins} min</span>
                  <span className="text-sm flex-1 min-w-0 truncate text-right">{lv ? lv.name : 'niveau supprimé'}</span>
                  <button onClick={() => onChange({ segments: segments.filter((x) => x.id !== s.id) })} style={{ color: INK_SOFT }}>
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {adding && (
          <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: BORDER }}>
            <div className="flex items-center gap-2">
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)}
                className="flex-1 rounded-lg border px-2.5 py-2.5 text-sm bg-transparent"
                style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }} />
              <span className="text-xs" style={{ color: INK_SOFT }}>→</span>
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)}
                className="flex-1 rounded-lg border px-2.5 py-2.5 text-sm bg-transparent"
                style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }} />
              <span className="text-xs w-14 text-right" style={{ color: INK_SOFT, fontFamily: F_MONO }}>
                {draftMinutes ? `${draftMinutes} min` : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {levels.map((l, i) => {
                const color = LEVEL_COLORS[i % LEVEL_COLORS.length];
                const on = levelId === l.id;
                return (
                  <button key={l.id} onClick={() => setLevelId(l.id)}
                    className="rounded-lg px-2.5 py-2 text-xs border leading-tight break-words"
                    style={{ borderColor: color, backgroundColor: on ? color : 'transparent', color: on ? texteLisibleSur(color) : color, overflowWrap: 'anywhere' }}>
                    {l.name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Btn onClick={addSegment} disabled={!draftMinutes || !levelId} className="flex-1 text-sm py-2.5">Ajouter la période</Btn>
              <Btn variant="ghost" onClick={() => setAdding(false)} className="text-sm py-2.5">Annuler</Btn>
            </div>
            {start && end && !draftMinutes && (
              <div className="text-xs" style={{ color: CRISIS }}>L'heure de fin doit être après l'heure de début.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChainingWidget({ obj, entry, guidances, onChange }) {
  const list = objectiveGuidances(obj, guidances);
  const steps = obj.config.steps || [];
  const coded = steps.filter((s) => entry.steps[s.id]).length;
  const compteurParEssai = !!(obj.config.avecCompteur && obj.config.compteurParEssai);
  const chronoParEssai = !!(obj.config.avecChrono && obj.config.chronoParEssai);

  function setStep(stepId, code) {
    const next = { ...entry.steps };
    const patch = { steps: next };
    if (next[stepId] === code) {
      delete next[stepId];
      // L'étape redevient à coter : sa mesure capturée n'a plus de sens.
      if (entry.mesuresEssais && entry.mesuresEssais[stepId]) {
        const essais = { ...entry.mesuresEssais };
        delete essais[stepId];
        patch.mesuresEssais = essais;
      }
    } else {
      next[stepId] = code;
      if (compteurParEssai || chronoParEssai) {
        Object.assign(patch, relancerMesures(entry, stepId, compteurParEssai, chronoParEssai, Date.now()));
      }
    }
    onChange(patch);
  }

  return (
    <div>
      <div className="space-y-2">
        {steps.map((s, i) => {
          const current = entry.steps[s.id];
          return (
            /* Nom d'étape sur sa propre ligne : avec les boutons à côté, il était
               tronqué dès que l'intitulé dépassait quelques mots. */
            <div key={s.id} className="rounded-xl px-2.5 py-2" style={{ backgroundColor: PAPER }}>
              <div className="flex items-start gap-2 mb-1.5">
                <span className="text-xs w-5 shrink-0 pt-0.5" style={{ fontFamily: F_MONO, color: INK_SOFT }}>{i + 1}</span>
                <span className="text-sm flex-1 leading-snug break-words" style={{ overflowWrap: 'anywhere' }}>{s.name}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {list.map((g) => {
                  const on = current === g.code;
                  return (
                    <button key={g.code} onClick={() => setStep(s.id, g.code)}
                      className="flex-1 min-w-[56px] rounded-lg py-2 text-xs font-semibold border active:scale-95 transition-transform"
                      style={{ fontFamily: F_DISPLAY, borderColor: on ? g.color : BORDER, backgroundColor: on ? g.color : 'transparent', color: on ? texteLisibleSur(g.color) : INK_SOFT }}
                      title={g.label}>
                      {g.code}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs" style={{ color: INK_SOFT }}>{coded}/{steps.length} étapes cotées</span>
        {coded > 0 && (
          <button onClick={() => onChange({ steps: {}, mesuresEssais: {} })} className="text-xs flex items-center gap-1" style={{ color: INK_SOFT }}>
            <RotateCcw size={12} /> tout effacer
          </button>
        )}
      </div>
    </div>
  );
}

function BalanceWidget({ obj, entry, onChange }) {
  const steps = obj.config.steps || [];
  const issues = balanceOutcomes(obj);
  const trials = balanceTrials(entry);
  const [active, setActive] = useState(trials.length - 1);
  const idx = Math.min(active, trials.length - 1);
  const trial = trials[idx] || { steps: {} };
  const compteurParEssai = !!(obj.config.avecCompteur && obj.config.compteurParEssai);
  const chronoParEssai = !!(obj.config.avecChrono && obj.config.chronoParEssai);

  function writeTrials(next, extra) {
    onChange({ trials: next, steps: undefined, ...extra });
  }

  function setStep(stepId, patch) {
    const cur = (trial.steps || {})[stepId] || {};
    const merged = { ...cur, ...patch };
    const nextSteps = { ...(trial.steps || {}), [stepId]: merged };
    if (!merged.outcome && !merged.demande && !merged.renforce) delete nextSteps[stepId];
    const next = trials.map((t, i) => (i === idx ? { ...t, steps: nextSteps } : t));
    writeTrials(next);
  }

  function validateTrial() {
    const next = [...trials, { steps: {} }];
    const extra = (compteurParEssai || chronoParEssai) ? relancerMesures(entry, idx, compteurParEssai, chronoParEssai, Date.now()) : undefined;
    writeTrials(next, extra);
    setActive(next.length - 1);
  }

  function removeTrial() {
    if (trials.length <= 1) {
      writeTrials([{ steps: {} }], entry.mesuresEssais ? { mesuresEssais: {} } : undefined);
      setActive(0);
      return;
    }
    const next = trials.filter((_, i) => i !== idx);
    const extra = entry.mesuresEssais ? { mesuresEssais: reindexMesuresEssais(entry.mesuresEssais, idx) } : undefined;
    writeTrials(next, extra);
    setActive(Math.max(0, idx - 1));
  }

  const trialCoded = Object.values(trial.steps || {}).some((e) => e && e.outcome);
  const stats = balanceStats(obj, entry);
  const renfortsEssai = steps.map((st, i) => ((trial.steps || {})[st.id] || {}).renforce ? i + 1 : null).filter(Boolean);

  return (
    <div>
      {/* Essais de la séance : le dernier est celui en cours */}
      <div className="flex flex-wrap gap-1 mb-2.5 items-center">
        {trials.map((t, i) => {
          const coded = Object.values(t.steps || {}).some((e) => e && e.outcome);
          const on = i === idx;
          return (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="rounded-lg px-2.5 py-1.5 text-xs border"
              style={{
                fontFamily: F_MONO,
                borderColor: on ? TYPES.balance.color : BORDER,
                backgroundColor: on ? TYPES.balance.color : coded ? PAPER : 'transparent',
                color: on ? texteLisibleSur(TYPES.balance.color) : INK_SOFT,
              }}
            >
              E{i + 1}
            </button>
          );
        })}
        <span className="text-xs ml-auto" style={{ color: INK_SOFT }}>
          {stats.cotes} coté{stats.cotes > 1 ? 's' : ''} · <span style={{ fontFamily: F_MONO }}>{stats.pct} %</span>
        </span>
      </div>

      <div className="space-y-2">
        {steps.map((st, i) => {
          const e = (trial.steps || {})[st.id] || {};
          return (
            <div key={st.id} className="rounded-xl px-2.5 py-2" style={{ backgroundColor: PAPER }}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs w-5 shrink-0" style={{ fontFamily: F_MONO, color: INK_SOFT }}>{i + 1}</span>
                <span className="text-sm flex-1 min-w-0 leading-snug break-words" style={{ overflowWrap: 'anywhere' }}>{st.name}</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {issues.map((o) => {
                  const on = e.outcome === o.k;
                  return (
                    <button
                      key={o.k}
                      onClick={() => setStep(st.id, { outcome: on ? null : o.k })}
                      className="flex-1 min-w-[44px] rounded-lg py-2 text-xs font-semibold border active:scale-95 transition-transform"
                      style={{ fontFamily: F_DISPLAY, borderColor: on ? o.color : BORDER, backgroundColor: on ? o.color : 'transparent', color: on ? texteLisibleSur(o.color) : INK_SOFT }}
                      title={o.label}
                    >
                      {o.short}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setStep(st.id, { demande: !e.demande })}
                  className="flex-1 rounded-lg py-1.5 text-xs border flex items-center justify-center gap-1"
                  style={{ borderColor: e.demande ? CAT_CYAN : BORDER, backgroundColor: e.demande ? CAT_CYAN : 'transparent', color: e.demande ? texteLisibleSur(CAT_CYAN) : INK_SOFT }}
                >
                  <MessageSquare size={12} /> Demande
                </button>
                <button
                  onClick={() => setStep(st.id, { renforce: !e.renforce })}
                  className="flex-1 rounded-lg py-1.5 text-xs border flex items-center justify-center gap-1"
                  style={{ borderColor: e.renforce ? CAT_AMBER : BORDER, backgroundColor: e.renforce ? CAT_AMBER : 'transparent', color: e.renforce ? texteLisibleSur(CAT_AMBER) : INK_SOFT }}
                >
                  <Gift size={12} /> Renforcé
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-2.5">
        <Btn
          onClick={validateTrial}
          disabled={!trialCoded || idx !== trials.length - 1}
          className="flex-1 text-sm py-2.5"
          style={{ backgroundColor: TYPES.balance.color }}
        >
          <Check size={16} /> Valider l'essai
        </Btn>
        <button onClick={removeTrial} className="rounded-xl px-3 py-2.5 border" style={{ borderColor: BORDER, color: INK_SOFT }} title="Supprimer cet essai">
          <Trash2 size={15} />
        </button>
      </div>

      <div className="text-xs mt-1.5" style={{ color: INK_SOFT }}>
        Essai {idx + 1}
        {renfortsEssai.length > 0 && <> · renforcé aux étapes <span style={{ fontFamily: F_MONO }}>{renfortsEssai.join(', ')}</span></>}
        {idx !== trials.length - 1 && ' · essai déjà validé, en cours de correction'}
      </div>
    </div>
  );
}

/* ==================== Écran suivi : progression et maîtrise ==================== */
/* Bande de la journée en cours pour le suivi continu : un segment par
   critère noté, large de sa durée réelle, du premier relevé du jour à
   maintenant. Sans mention d'atelier — le relevé n'en porte pas, c'est
   Manager qui recoupe après coup. Le rafraîchissement périodique vit ici,
   pas dans SuiviScreen, qui a un retour anticipé avant tout hook. */
function FriseJournee({ students, axesSuivi, releves, onOuvrirSuivi }) {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setMaintenant(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const lignes = [];
  students.forEach((st) => {
    (st.suivisActifs || []).forEach((suiviId) => {
      const axe = axeDe(axesSuivi, suiviId);
      if (!axe) return;
      lignes.push({ st, axe, segments: segmentsJournee(releves, st.id, suiviId, maintenant, maintenant) });
    });
  });
  const lignesCompteurs = [];
  students.forEach((st) => {
    (st.compteurs || []).forEach((c) => {
      lignesCompteurs.push({ st, compteur: c, total: comptesCompteurJour(releves, st.id, c.id, maintenant) });
    });
  });
  if (lignes.length === 0 && lignesCompteurs.length === 0) return null;

  return (
    <Card className="mb-4">
      <SectionTitle sub="Les critères notés aujourd'hui, dans l'ordre où ils sont arrivés — sans lien avec les ateliers.">
        Aujourd'hui
      </SectionTitle>
      <div className="space-y-4">
        {lignes.map(({ st, axe, segments }) => {
          const label = `${st.initials} — ${nomAxe(axe)}`;
          if (segments.length === 0) {
            return (
              <button key={`${st.id}-${axe.id}`} className="w-full text-left" onClick={() => onOuvrirSuivi(st.id)} title="Noter le critère de ce jour">
                <div className="text-xs mb-1" style={{ color: INK_SOFT }}>{label}</div>
                <div className="h-6 rounded-lg border border-dashed flex items-center px-2 text-xs" style={{ borderColor: BORDER, color: INK_SOFT }}>
                  Non démarré aujourd'hui
                </div>
              </button>
            );
          }
          const debut = segments[0].debut;
          const dernier = segments[segments.length - 1];
          const finVisible = dernier.fin != null ? Math.min(dernier.fin, maintenant) : maintenant;
          const duree = Math.max(1, finVisible - debut);
          const heures = [];
          const premiere = new Date(debut);
          premiere.setMinutes(0, 0, 0);
          for (let h = premiere.getTime() + 3600000; h < finVisible; h += 3600000) heures.push(h);
          return (
            <button key={`${st.id}-${axe.id}`} className="w-full text-left" onClick={() => onOuvrirSuivi(st.id)} title="Noter le critère de ce jour">
              <div className="text-xs mb-1" style={{ color: INK_SOFT }}>{label}</div>
              <div className="relative h-6 rounded-lg overflow-hidden flex" style={{ backgroundColor: PAPER }}>
                {segments.map((seg, j) => {
                  const meta = metaCritere(axe.criteres, seg.critere);
                  const largeur = seg.ms != null ? (seg.ms / duree) * 100 : 0;
                  return (
                    <span
                      key={j}
                      title={`${meta.l} — ${timeShort(new Date(seg.debut).toISOString())}${seg.fin != null ? ` à ${timeShort(new Date(seg.fin).toISOString())}` : ''}`}
                      style={{ width: `${largeur}%`, backgroundColor: meta.color }}
                    />
                  );
                })}
                {heures.map((h) => (
                  <span
                    key={h}
                    title={timeShort(new Date(h).toISOString())}
                    className="absolute top-0 bottom-0 w-px"
                    style={{ left: `${((h - debut) / duree) * 100}%`, backgroundColor: 'rgba(255,255,255,0.6)' }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs mt-1" style={{ color: INK_SOFT, fontFamily: F_MONO }}>
                <span>{timeShort(new Date(debut).toISOString())}</span>
                <span>{timeShort(new Date(finVisible).toISOString())}</span>
              </div>
            </button>
          );
        })}
      </div>
      {/* Compteurs : pas de segments à dessiner, juste le total du jour —
          une ligne compacte suffit, l'historique se lit depuis la pastille. */}
      {lignesCompteurs.length > 0 && (
        <div className="space-y-1.5 mt-4">
          {lignesCompteurs.map(({ st, compteur, total }) => (
            <button
              key={`${st.id}-${compteur.id}`}
              className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs"
              style={{ backgroundColor: PAPER }}
              onClick={() => onOuvrirSuivi(st.id)}
              title="Compter une occurrence de plus"
            >
              <span style={{ color: INK_SOFT }}>{st.initials} — {nomCompteur(compteur)}</span>
              <span style={{ fontFamily: F_MONO }}>{total}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ==================== Correction d'une journée de suivi continu ====================
   Une cotation oubliée, une heure fausse : la journée se reprend ici, relevé
   par relevé. Rien n'est recalculé à la main — aucune durée n'est stockée, tout
   ce qui en dérive (la frise, la feuille d'export, la durée des fiches crise
   nées d'un relevé « crise ») se recale sur la liste corrigée. */
function FeuilleJourneeSuivi({ cible, releves, students, axesSuivi, onAjouter, onModifier, onSupprimer, onAjouterCompteur, onClose }) {
  const [heure, setHeure] = useState('');
  const [critere, setCritere] = useState('');

  const st = students.find((s) => s.id === cible.studentId);
  const estCompteur = !!cible.compteurId;
  const axe = axeDe(axesSuivi, cible.suiviId);
  const criteres = (axe && axe.criteres) || [];
  /* Midi local : n'importe quelle heure de la journée visée conviendrait pour
     la comparaison de jour, celle-ci ne bascule jamais d'un fuseau à l'autre. */
  const duJourAxe = estCompteur ? [] : relevesDuJour(releves, cible.studentId, cible.suiviId, new Date(`${cible.jour}T12:00:00`));
  /* Un compteur n'a pas relevesDuJour (filtré sur suiviId) : ses occurrences se
     trouvent à la main, sur le même principe. */
  const duJourCompteur = React.useMemo(() => {
    if (!estCompteur) return [];
    const refDate = new Date(`${cible.jour}T12:00:00`);
    return (releves || [])
      .filter((r) => r && r.kind === 'compteur' && r.studentId === cible.studentId && r.compteurId === cible.compteurId)
      .map((r) => ({ r, d: new Date(r.timestamp) }))
      .filter(({ d }) => !Number.isNaN(d.getTime()) && memeJour(d, refDate))
      .sort((a, b) => a.d - b.d)
      .map(({ r }) => r);
  }, [releves, estCompteur, cible.studentId, cible.compteurId, cible.jour]);
  const duJour = estCompteur ? duJourCompteur : duJourAxe;

  const ajouter = () => {
    if (estCompteur) {
      const iso = isoDepuisJourHeure(cible.jour, heure);
      if (!iso) return;
      onAjouterCompteur(cible.studentId, cible.compteurId, iso);
      setHeure('');
      return;
    }
    const iso = isoDepuisJourHeure(cible.jour, heure);
    if (!iso || !critere) return;
    onAjouter(cible.studentId, cible.suiviId, iso, critere === '__fin' ? null : critere, critere === '__fin');
    setHeure('');
    setCritere('');
  };

  if (estCompteur) {
    const libelleCompteur = nomCompteur(compteurDe(st, cible.compteurId));
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0" style={{ backgroundColor: 'var(--overlay-backdrop)' }} onClick={onClose}>
        <div className="rounded-2xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto" style={{ backgroundColor: CARD }} onClick={(ev) => ev.stopPropagation()}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>
              {st ? st.initials : '?'} — {libelleCompteur}
            </span>
            <button onClick={onClose} style={{ color: INK_SOFT }} aria-label="Fermer"><X size={18} /></button>
          </div>
          <p className="text-xs mb-4" style={{ color: INK_SOFT }}>
            {dateKey(`${cible.jour}T12:00:00`)} — corrigez une heure, ajoutez une occurrence oubliée,
            retirez un appui de trop.
          </p>

          {duJour.length === 0 ? (
            <Empty>Aucune occurrence ce jour-là.</Empty>
          ) : (
            <div className="space-y-1.5 mb-4">
              {duJour.map((r) => (
                <div key={r.id} className="rounded-xl p-2.5 flex items-center gap-2" style={{ backgroundColor: PAPER }}>
                  <input
                    type="time"
                    value={heureInput(r.timestamp)}
                    onChange={(ev) => {
                      const iso = isoDepuisJourHeure(cible.jour, ev.target.value);
                      if (iso) onModifier(r.id, { timestamp: iso });
                    }}
                    className="rounded-lg px-2 py-1.5 text-sm border shrink-0"
                    style={{ borderColor: BORDER, backgroundColor: CARD, fontFamily: F_MONO }}
                  />
                  <span className="flex-1 text-xs" style={{ color: INK_SOFT }}>
                    {r.source === 'manuel' ? 'ajouté à la main' : 'occurrence'}
                  </span>
                  <button onClick={() => onSupprimer(r.id)} style={{ color: INK_SOFT }} className="shrink-0" title="Supprimer cet appui">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Ajouter une occurrence</div>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={heure}
              onChange={(ev) => setHeure(ev.target.value)}
              className="rounded-lg px-2 py-1.5 text-sm border flex-1"
              style={{ borderColor: BORDER, backgroundColor: PAPER, fontFamily: F_MONO }}
            />
            <Btn onClick={ajouter} disabled={!heure} className="px-3 shrink-0"><Plus size={16} /></Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0" style={{ backgroundColor: 'var(--overlay-backdrop)' }} onClick={onClose}>
      <div className="rounded-2xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto" style={{ backgroundColor: CARD }} onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>
            {st ? st.initials : '?'} — {axe ? nomAxe(axe) : 'Suivi retiré'}
          </span>
          <button onClick={onClose} style={{ color: INK_SOFT }} aria-label="Fermer"><X size={18} /></button>
        </div>
        <p className="text-xs mb-4" style={{ color: INK_SOFT }}>
          {dateKey(`${cible.jour}T12:00:00`)} — corrigez une heure, ajoutez une cotation oubliée,
          retirez un relevé de trop. Les durées se recalculent seules.
        </p>

        {duJour.length === 0 ? (
          <Empty>Aucun relevé ce jour-là.</Empty>
        ) : (
          <div className="space-y-1.5 mb-4">
            {duJour.map((r) => {
              const ms = dureeReleve(releves, r.id);
              const meta = r.fin ? null : metaCritere(criteres, r.critere);
              return (
                <div key={r.id} className="rounded-xl p-2.5" style={{ backgroundColor: PAPER }}>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={heureInput(r.timestamp)}
                      onChange={(ev) => {
                        const iso = isoDepuisJourHeure(cible.jour, ev.target.value);
                        if (iso) onModifier(r.id, { timestamp: iso });
                      }}
                      className="rounded-lg px-2 py-1.5 text-sm border shrink-0"
                      style={{ borderColor: BORDER, backgroundColor: CARD, fontFamily: F_MONO }}
                    />
                    <select
                      value={r.fin ? '__fin' : r.critere || ''}
                      onChange={(ev) => {
                        const v = ev.target.value;
                        onModifier(r.id, v === '__fin' ? { critere: null, fin: true } : { critere: v, fin: false });
                      }}
                      className="flex-1 min-w-0 rounded-lg px-2 py-1.5 text-sm border"
                      style={{ borderColor: BORDER, backgroundColor: CARD }}
                    >
                      {/* Un critère retiré de la configuration reste proposé sur
                          le relevé qui le porte : sans ça, l'ouvrir le
                          réécrirait silencieusement. */}
                      {meta === CRITERE_INCONNU && <option value={r.critere}>{`${meta.l} (${r.critere})`}</option>}
                      {criteres.map((c) => <option key={c.k} value={c.k}>{c.l}</option>)}
                      <option value="__fin">— fin de journée —</option>
                    </select>
                    <button onClick={() => onSupprimer(r.id)} style={{ color: INK_SOFT }} className="shrink-0" title="Supprimer ce relevé">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="text-xs mt-1 flex items-center gap-2" style={{ color: INK_SOFT }}>
                    {!r.fin && (
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta ? meta.color : BORDER }} />
                    )}
                    <span style={{ fontFamily: F_MONO }}>
                      {r.fin ? 'clôture' : ms == null ? 'en cours' : fmtDuration(ms)}
                    </span>
                    {r.source === 'manuel' && <span>· ajouté à la main</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Ajouter un relevé</div>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={heure}
            onChange={(ev) => setHeure(ev.target.value)}
            className="rounded-lg px-2 py-1.5 text-sm border shrink-0"
            style={{ borderColor: BORDER, backgroundColor: PAPER, fontFamily: F_MONO }}
          />
          <select
            value={critere}
            onChange={(ev) => setCritere(ev.target.value)}
            className="flex-1 min-w-0 rounded-lg px-2 py-1.5 text-sm border"
            style={{ borderColor: BORDER, backgroundColor: PAPER }}
          >
            <option value="">Critère…</option>
            {criteres.map((c) => <option key={c.k} value={c.k}>{c.l}</option>)}
            <option value="__fin">— fin de journée —</option>
          </select>
          <Btn onClick={ajouter} disabled={!heure || !critere} className="px-3 shrink-0"><Plus size={16} /></Btn>
        </div>
        <p className="text-xs mt-3" style={{ color: INK_SOFT }}>
          Une fiche crise ouverte depuis un relevé « Crise » suit ces
          corrections, tant que sa durée n'a pas été saisie à la main.
        </p>
      </div>
    </div>
  );
}

/* Écran de rapprochement : propose une correspondance pour chaque personne
   importée, ne l'applique jamais seul. Les personnes déjà alignées (même id
   des deux côtés) ne sont même pas affichées — c'est ce qui rend une
   rediffusion répétée quasi silencieuse. */
function EcranRapprochementPersonnes({ payload, students, groupes, onValider, onClose }) {
  const propositions = React.useMemo(
    () => proposerRapprochementsPersonnes(payload.students, students, payload.groupes, groupes),
    [payload, students, groupes]
  );
  const aTraiter = propositions.filter((p) => p.statut !== 'deja-aligne');
  const dejaAlignees = propositions.length - aTraiter.length;

  const [choix, setChoix] = useState(() => {
    const init = {};
    aTraiter.forEach((p) => { init[p.importe.id] = p.statut === 'a-confirmer' ? p.candidatLocalId : 'nouvelle'; });
    return init;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0" style={{ backgroundColor: 'var(--overlay-backdrop)' }} onClick={onClose}>
      <div className="rounded-2xl p-5 max-w-lg w-full max-h-[85vh] flex flex-col" style={{ backgroundColor: CARD }} onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>
            Profils reçus{payload.appareil ? ` de ${payload.appareil}` : ''}
          </span>
          <button onClick={onClose} style={{ color: INK_SOFT }} aria-label="Fermer"><X size={18} /></button>
        </div>
        <p className="text-xs mb-4" style={{ color: INK_SOFT }}>
          {dejaAlignees > 0 && `${dejaAlignees} personne(s) déjà à jour. `}
          Rien n'est appliqué tant que vous n'avez pas validé — corrigez la correspondance si elle ne convient pas.
        </p>

        {aTraiter.length === 0 ? (
          <Empty>Tout est déjà à jour.</Empty>
        ) : (
          <div className="space-y-2 mb-4 overflow-y-auto flex-1">
            {aTraiter.map((p) => (
              <div key={p.importe.id} className="rounded-xl p-3" style={{ backgroundColor: PAPER }}>
                <div className="text-sm font-medium mb-1.5" style={{ fontFamily: F_DISPLAY }}>
                  {p.importe.initials}{' '}
                  <span className="text-xs font-normal" style={{ color: INK_SOFT }}>
                    — {(p.importe.objectives || []).length} objectif{(p.importe.objectives || []).length !== 1 ? 's' : ''}
                  </span>
                </div>
                <select
                  value={choix[p.importe.id]}
                  onChange={(ev) => setChoix((c) => ({ ...c, [p.importe.id]: ev.target.value }))}
                  className="w-full rounded-lg px-2.5 py-2 text-sm border"
                  style={{ borderColor: BORDER, backgroundColor: CARD }}
                >
                  <option value="nouvelle">Nouvelle personne</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.initials}{s.groupeId ? ` — ${nomGroupe(groupes, s.groupeId)}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        <Btn onClick={() => onValider(propositions, choix)} className="w-full shrink-0">Valider</Btn>
      </div>
    </div>
  );
}

/* Écran d'arbitrage : seuls les vrais conflits de contenu s'affichent, les
   objectifs identiques ou déjà alignés ont déjà été appliqués en silence par
   appliquerRapprochement. « Garder les deux » présélectionné partout : valider
   sans lire crée un doublon à nettoyer, jamais une perte de travail. */
function EcranArbitrageObjectifs({ conflits, students, sessions, onValider, onClose }) {
  const [decisions, setDecisions] = useState(() => {
    const init = {};
    conflits.forEach((c, i) => { init[i] = 'deux'; });
    return init;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0" style={{ backgroundColor: 'var(--overlay-backdrop)' }} onClick={onClose}>
      <div className="rounded-2xl p-5 max-w-lg w-full max-h-[85vh] flex flex-col" style={{ backgroundColor: CARD }} onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>Objectifs à arbitrer</span>
          <button onClick={onClose} style={{ color: INK_SOFT }} aria-label="Fermer"><X size={18} /></button>
        </div>
        <p className="text-xs mb-4" style={{ color: INK_SOFT }}>
          Un objectif importé porte le même nom qu'un objectif local, avec un contenu différent.
          « Garder les deux » n'écrase jamais rien.
        </p>

        <div className="space-y-3 mb-4 overflow-y-auto flex-1">
          {conflits.map((c, i) => {
            const st = students.find((s) => s.id === c.studentId);
            const verrouille = objectifDejaCote(sessions, c.local.id);
            return (
              <div key={i} className="rounded-xl p-3" style={{ backgroundColor: PAPER }}>
                <div className="text-sm font-medium mb-2" style={{ fontFamily: F_DISPLAY }}>
                  {st ? st.initials : '?'} — {c.local.name}
                </div>
                {verrouille && (
                  <p className="text-xs mb-2" style={{ color: INK_SOFT }}>
                    Déjà coté : ses cibles ne peuvent pas être remplacées.
                  </p>
                )}
                <div className="flex flex-col gap-1.5">
                  {[
                    { v: 'local', l: 'Garder local' },
                    { v: 'importe', l: "Prendre l'importé", disabled: verrouille },
                    { v: 'deux', l: 'Garder les deux' },
                  ].map((opt) => (
                    <label key={opt.v} className="flex items-center gap-2 text-sm" style={{ color: INK, opacity: opt.disabled ? 0.4 : 1 }}>
                      <input
                        type="radio"
                        name={`arbitrage-${i}`}
                        checked={decisions[i] === opt.v}
                        disabled={opt.disabled}
                        onChange={() => setDecisions((d) => ({ ...d, [i]: opt.v }))}
                      />
                      {opt.l}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <Btn onClick={() => onValider(decisions)} className="w-full shrink-0">Valider</Btn>
      </div>
    </div>
  );
}

function SuiviScreen({ students, sessions, guidances, releves, axesSuivi, onResetTracking, onOuvrirMenu, onOuvrirObjectif, onAjouterObjectif, onOuvrirSuivi, onChangePhase }) {
  const [openId, setOpenId] = useState(students.length ? students[0].id : null);
  /* Une ligne du résumé mène à la courbe de l'objectif, dans ce même écran :
     c'est là qu'on voit où il en est. L'édition reste derrière « Modifier
     l'objectif », sous la courbe — auparavant le résumé y sautait directement,
     et consulter obligeait à passer par le formulaire. */
  const graphRefs = useRef({});
  const [cible, setCible] = useState(null);
  const voirGraphique = (sid, oid) => {
    setOpenId(sid);
    setCible({ personne: sid, objectif: oid });
  };
  /* Après commit : la carte de la personne est dépliée, la courbe est montée,
     sa ref est renseignée — même recette que le lien croisé de
     PanneauPersonnes. */
  useEffect(() => {
    if (!cible) return;
    const node = graphRefs.current[`${cible.personne}:${cible.objectif}`];
    if (node) node.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setCible(null);
  }, [cible]);

  if (students.length === 0) {
    return (
      <div>
        <div className="flex items-start justify-between gap-3">
          <SectionTitle>Suivi</SectionTitle>
          <BoutonMenu onClick={onOuvrirMenu} />
        </div>
        <Empty>Ajoutez des personnes accompagnées et enregistrez des séances pour voir les courbes.</Empty>
      </div>
    );
  }

  const ordered = sessions.slice().sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <SectionTitle sub="Où en est chaque objectif, et comment il évolue.">Suivi</SectionTitle>
        <BoutonMenu onClick={onOuvrirMenu} />
      </div>

      <FriseJournee students={students} axesSuivi={axesSuivi} releves={releves} onOuvrirSuivi={onOuvrirSuivi} />
      <ResumeObjectifs students={students} sessions={sessions} guidances={guidances} onVoirGraphique={voirGraphique} />
      <div className="space-y-3">
        {students.map((s) => {
          const open = openId === s.id;
          return (
            <Card key={s.id}>
              <button className="w-full flex items-center justify-between" onClick={() => setOpenId(open ? null : s.id)}>
                <span className="flex items-center gap-3">
                  <PastillePersonne initials={s.initials} />
                </span>
                <ChevronRight size={18} style={{ color: INK_SOFT, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
              </button>

              {open && (
                <div className="mt-4 space-y-5">
                  {s.objectives.length === 0 && (
                    <Empty>
                      Aucun objectif défini.
                      {onAjouterObjectif && (
                        <div className="mt-3">
                          <Btn variant="ghost" onClick={() => onAjouterObjectif(s.id)} className="text-sm">
                            <Plus size={16} /> Ajouter un objectif
                          </Btn>
                        </div>
                      )}
                    </Empty>
                  )}
                  {s.objectives.map((o) => (
                    <div key={o.id} ref={(n) => { graphRefs.current[`${s.id}:${o.id}`] = n; }}>
                      <ObjectiveChart
                        obj={o} studentId={s.id} sessions={ordered} guidances={guidances}
                        onReset={() => onResetTracking(s.id, o.id)}
                        onChangePhase={(nom) => onChangePhase(s.id, o.id, nom)}
                        onOuvrirObjectif={() => onOuvrirObjectif(s.id, o.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ==================== Résumé des objectifs ====================
   L'essentiel pour un éducateur : ce qui est acquis, ce qui va l'être, ce qui
   stagne, et ce sur quoi on manque encore de données pour se prononcer.
   Les analyses croisées et l'étude des crises vivent dans DatABA Manager. */
const RESUME_PLATEAU_MIN = 6;
const RESUME_ECART_MAX = 20;
const RESUME_DORMANT_JOURS = 21;

function resumerObjectifs(students, sessions, guidances) {
  const ordered = sessions.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const groupes = { acquis: [], bientot: [], plateau: [], manque: [] };

  students.forEach((st) => {
    st.objectives.forEach((obj) => {
      const cible = currentTarget(obj);
      const points = objectivePoints(obj, st.id, ordered, guidances, cible ? cible.id : null);
      const base = {
        studentId: st.id,
        objectifId: obj.id,
        initials: st.initials,
        objectif: obj.name,
        type: obj.type,
        cible: cible ? cible.name : null,
        points: points.length,
      };

      const etat = masteryStatus(obj, points);
      if (!points.length) { groupes.manque.push({ ...base, raison: 'aucune cotation' }); return; }

      const jours = Math.floor((Date.now() - new Date(points[points.length - 1].date)) / 86400000);
      if (etat && etat.mastered) { groupes.acquis.push({ ...base, ...etat }); return; }

      if (jours >= RESUME_DORMANT_JOURS) {
        groupes.manque.push({ ...base, raison: `rien depuis ${jours} jours` });
        return;
      }
      if (etat && points.length < etat.needed) {
        groupes.manque.push({ ...base, raison: `${points.length}/${etat.needed} séances` });
        return;
      }
      if (etat && etat.needed > 1 && etat.streak >= etat.needed - 1) {
        groupes.bientot.push({ ...base, ...etat, valeur: points[points.length - 1].value });
        return;
      }
      if (etat && points.length >= RESUME_PLATEAU_MIN) {
        const cinq = points.slice(-5);
        const moyenne = Math.round(cinq.reduce((a, p) => a + p.value, 0) / cinq.length);
        /* L'écart au seuil se compte du côté qu'il reste à franchir : sur un
           critère « au plus », c'est le dépassement qui manque à combler. */
        const ecart = etat.sens === 'max' ? moyenne - etat.threshold : etat.threshold - moyenne;
        if (ecart > 0 && ecart <= RESUME_ECART_MAX) {
          groupes.plateau.push({ ...base, ...etat, moyenne });
        }
      }
    });
  });
  return groupes;
}

function ResumeObjectifs({ students, sessions, guidances, onVoirGraphique }) {
  const [ouvert, setOuvert] = useState(null);
  const g = resumerObjectifs(students, sessions, guidances);

  const blocs = [
    { k: 'acquis', label: 'Acquis', couleur: CAT_TEAL, aide: 'Le critère est atteint.', rendu: (l) => `${l.streak}/${l.needed}` },
    { k: 'bientot', label: 'Bientôt acquis', couleur: CAT_TEAL, aide: 'Une séance de plus au seuil suffit.', rendu: (l) => `${l.streak}/${l.needed} · ${l.valeur} %` },
    { k: 'plateau', label: 'En plateau', couleur: CAT_AMBER, aide: 'Proche du seuil depuis plusieurs séances, sans l\'atteindre.', rendu: (l) => `${l.moyenne} % · seuil ${l.threshold} %` },
    { k: 'manque', label: 'Manque de données', couleur: INK_SOFT, aide: 'Pas encore de quoi se prononcer.', rendu: (l) => l.raison },
  ];

  if (!sessions.length) return null;

  return (
    <Card className="mb-5">
      <div className="text-xs uppercase tracking-wide mb-3" style={{ color: INK_SOFT }}>Où en sont les objectifs</div>
      <div className="flex flex-wrap gap-2 mb-1">
        {blocs.map((b) => {
          const n = g[b.k].length;
          const on = ouvert === b.k;
          return (
            <button key={b.k} onClick={() => setOuvert(on ? null : b.k)} disabled={!n}
              className="flex-1 min-w-[110px] px-1 py-1 text-left disabled:opacity-50">
              <div className="text-2xl font-semibold" style={{ fontFamily: F_MONO, color: b.couleur }}>{n}</div>
              <div className="text-xs" style={{ color: on ? INK : INK_SOFT, fontWeight: on ? 600 : 400 }}>{b.label}</div>
            </button>
          );
        })}
      </div>

      {ouvert && (
        <div className="mt-3">
          <p className="text-xs mb-2" style={{ color: INK_SOFT }}>{blocs.find((b) => b.k === ouvert).aide}</p>
          <div className="space-y-1.5">
            {g[ouvert].map((l, i) => (
              <button key={i} onClick={() => onVoirGraphique(l.studentId, l.objectifId)}
                title="Voir la courbe de cet objectif"
                className="w-full rounded-xl px-3 py-2.5 flex items-start justify-between gap-2 text-left" style={{ backgroundColor: PAPER }}>
                <div className="min-w-0">
                  <div className="text-sm break-words">
                    <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>{l.initials}</span> · {l.objectif}
                  </div>
                  {l.cible && <div className="text-xs" style={{ color: INK_SOFT }}>cible {l.cible}</div>}
                </div>
                <span className="text-xs shrink-0" style={{ fontFamily: F_MONO, color: blocs.find((b) => b.k === ouvert).couleur }}>
                  {blocs.find((b) => b.k === ouvert).rendu(l)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function ObjectiveChart({ obj, studentId, sessions, guidances, onReset, onChangePhase, onOuvrirObjectif }) {
  const meta = typeMeta(obj.type);
  const Icon = meta.icon;

  /* Repères de phase : on place la ligne sur la première séance postérieure au
     changement, seul point de la courbe où il devient lisible. */
  const phases = phaseHistory(obj).filter((ph) => ph.date);

  const targets = objectiveTargets(obj);
  const cible = currentTarget(obj);
  const doneTargets = obj.masteredTargetIds || [];

  // Avec des cibles, la courbe et le critère ne portent que sur la cible en cours
  const points = objectivePoints(obj, studentId, sessions, guidances, cible ? cible.id : null);

  const percent = PERCENT_TYPES.includes(obj.type);
  const mastery = points.length ? masteryStatus(obj, points) : null;
  const last = points.length ? points[points.length - 1] : null;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2 min-w-0">
          <Icon size={15} style={{ color: meta.color, marginTop: 2 }} className="shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium leading-snug">{obj.name}</div>
            <div className="text-xs" style={{ color: INK_SOFT }}>
              {currentPhase(obj).name} · {points.length} séance{points.length !== 1 ? 's' : ''}
              {last && <> · dernier : <span style={{ fontFamily: F_MONO }}>{last.value}{percent ? ' %' : ` ${last.unit}`}</span></>}
            </div>
          </div>
        </div>
        {mastery && (
          <span
            className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium flex items-center gap-1"
            style={{
              backgroundColor: mastery.mastered ? CAT_TEAL : PAPER,
              color: mastery.mastered ? texteLisibleSur(CAT_TEAL) : INK_SOFT,
              fontFamily: F_DISPLAY,
            }}
          >
            {mastery.mastered
              ? <><Award size={13} /> Acquis</>
              : `${mastery.streak}/${mastery.needed} ${mastery.unit === 'days' ? 'jours' : 'séances'} ${libelleSeuil(obj)}`}
          </span>
        )}
      </div>

      {targets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {targets.map((t) => {
            const done = doneTargets.includes(t.id);
            const active = cible && cible.id === t.id;
            return (
              <span key={t.id} className="text-xs rounded-lg px-2 py-1 flex items-center gap-1"
                style={{
                  backgroundColor: done ? CAT_TEAL : active ? ACCENT : PAPER,
                  color: done ? texteLisibleSur(CAT_TEAL) : active ? ACCENT_INK : INK_SOFT,
                }}>
                {done && <Check size={11} />} {t.name}
              </span>
            );
          })}
        </div>
      )}

      {points.length === 0 ? (
        <div className="rounded-xl border border-dashed px-3 py-5 text-center text-xs" style={{ borderColor: BORDER, color: INK_SOFT }}>
          Pas encore de donnée cotée{cible ? ` pour « ${cible.name} »` : ''}.
        </div>
      ) : (
        <div style={{ height: 170 }} data-no-swipe>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 6, right: 10, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={BORDER} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: INK_SOFT, fontFamily: 'IBM Plex Mono' }} axisLine={{ stroke: BORDER }} tickLine={false} />
              <YAxis
                domain={percent ? [0, 100] : ['auto', 'auto']}
                tick={{ fontSize: 11, fill: INK_SOFT, fontFamily: 'IBM Plex Mono' }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: `1px solid ${BORDER}`, fontFamily: 'IBM Plex Sans', fontSize: 12 }}
                formatter={(v) => [`${v}${percent ? ' %' : ` ${last ? last.unit : ''}`}`, 'Résultat']}
                labelFormatter={(l) => `Séance du ${l}`}
              />
              {mastery && (
                <ReferenceLine y={mastery.threshold} stroke={CAT_TEAL} strokeDasharray="4 4" strokeWidth={1.5} />
              )}
              {phases.map((ph) => {
                const pt = points.find((x) => new Date(x.date) >= new Date(ph.date));
                if (!pt) return null;
                return (
                  <ReferenceLine
                    key={ph.id}
                    x={pt.label}
                    stroke={INK}
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    label={{ value: ph.name, position: 'top', fontSize: 10, fill: INK_SOFT }}
                  />
                );
              })}
              <Line type="monotone" dataKey="value" stroke={meta.color} strokeWidth={2.5} dot={{ r: 3.5, fill: meta.color }} activeDot={{ r: 5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
        {onChangePhase && <BoutonPhase obj={obj} onChange={onChangePhase} />}
        {onOuvrirObjectif && (
          <button onClick={onOuvrirObjectif} className="text-xs flex items-center gap-1" style={{ color: INK_SOFT }}>
            <Pencil size={12} /> Modifier l'objectif
          </button>
        )}
      </div>
      {onReset && (points.length > 0 || obj.trackingResetAt) && (
        <div className="flex items-center justify-between mt-1.5">
          {obj.trackingResetAt ? (
            <span className="text-xs" style={{ color: INK_SOFT }}>
              Suivi repris le {new Date(obj.trackingResetAt).toLocaleDateString('fr-FR')}
            </span>
          ) : (
            <span />
          )}
          <button
            onClick={() => {
              if (window.confirm(`Réinitialiser le suivi de « ${obj.name} » ?\n\nLa courbe et le critère repartent de zéro. Les séances déjà enregistrées ne sont pas supprimées et restent dans les exports.`)) onReset();
            }}
            className="text-xs flex items-center gap-1"
            style={{ color: INK_SOFT }}
          >
            <RotateCcw size={12} /> Réinitialiser le suivi
          </button>
        </div>
      )}
    </div>
  );
}

/* ==================== Écran 4 : export ====================
   Trois collections partent aux cadres pédagogiques : les séances, les crises
   et observations, et les journées de suivi continu. Elles se présentent dans
   cet ordre — ce qui reste à transmettre d'abord, les options d'export juste
   dessous, puis une archive dépliante pour ce qui est déjà parti. Tout y est
   corrigeable, avant comme après l'envoi : c'est le seul endroit où l'on relit
   avant de transmettre. */
function ExportScreen({ sessions, crises, students, ateliers, intervenants, groupes, guidances, releves, axesSuivi, appareil, groupeAppareil, notify, onEditCrisis, onEditSession, onDeleteSession, onDeleteAllSessions, onOuvrirJournee, onMarkSent, onMarkCrisesSent, onMarkRelevesSent, onExportManager, onExportSuiviHorsGroupe, onOuvrirMenu }) {
  /* Compteur permanent, visible sans le chercher : le renvoi oublié est le
     seul défaut du dispositif de fusion inter-groupes qui produise une
     donnée fausse en silence. Ne retombe à zéro que quand tout est parti. */
  const horsGroupe = React.useMemo(() => ({
    sessions: sessionsHorsGroupe(sessions, students, groupeAppareil),
    crises: crisesHorsGroupe(crises, students, groupeAppareil),
    releves: relevesHorsGroupe(releves, students, groupeAppareil),
  }), [sessions, crises, releves, students, groupeAppareil]);
  const nbHorsGroupe = horsGroupe.sessions.length + horsGroupe.crises.length + horsGroupe.releves.length;
  const unsentIds = React.useMemo(() => sessions.filter((s) => !s.sentAt).map((s) => s.id), [sessions]);
  const journees = React.useMemo(
    () => journeesSuivi(releves, students, axesSuivi, null),
    [releves, students, axesSuivi]
  );

  // Valeurs d'état initiales seulement : React les ignore aux rendus suivants,
  // donc une sélection ajustée à la main n'est jamais écrasée par un
  // changement ultérieur (nouvelle séance, statut modifié...).
  const [picked, setPicked] = useState(unsentIds);
  const [pickedCrises, setPickedCrises] = useState(() => crises.filter((c) => !c.sentAt).map((c) => c.id));
  const [pickedJournees, setPickedJournees] = useState(() => journees.filter((j) => !j.envoye).map((j) => j.cle));
  const [archiveOuverte, setArchiveOuverte] = useState(false);

  /* Deux façons de composer un rapport : en choisissant des séances, ou en
     choisissant des personnes — auquel cas toutes leurs cotations sont reprises,
     quelles que soient les séances. */
  const [mode, setMode] = useState('sessions');
  const [pickedStudents, setPickedStudents] = useState([]);

  /* Balayage entre les deux modes de composition du rapport — même geste que
     dans SessionSetup et en cotation. */
  const modeRef = useRef(null);
  const toStudentsMode = React.useCallback(() => setMode('students'), []);
  const toSessionsMode = React.useCallback(() => setMode('sessions'), []);
  const modeSwipe = useHorizontalSwipe(modeRef, { onLeft: toStudentsMode, onRight: toSessionsMode, ignoreNoSwipe: true });

  const byStudent = mode === 'students';
  const studentFilter = byStudent ? pickedStudents : null;

  /* Les trois collections se cochent séparément. Auparavant les crises
     suivaient mécaniquement les séances retenues et les relevés étaient bornés
     à leurs journées ; ça ne tenait plus dès lors qu'il faut distinguer, dans
     chacune, ce qui est parti de ce qui reste à envoyer. */
  const chosen = byStudent
    ? sessions.filter((s) => (s.studentIds || []).some((sid) => pickedStudents.includes(sid)))
    : sessions.filter((s) => picked.includes(s.id));
  const chosenCrises = byStudent
    ? crises.filter((c) => c.studentId && pickedStudents.includes(c.studentId))
    : crises.filter((c) => pickedCrises.includes(c.id));
  const chosenJournees = byStudent
    ? journees.filter((j) => pickedStudents.includes(j.studentId))
    : journees.filter((j) => pickedJournees.includes(j.cle));
  const chosenReleves = chosenJournees.reduce((l, j) => l.concat(j.releves), []);
  const chosenSentCount = byStudent ? 0 : chosen.filter((s) => s.sentAt).length;

  const seancesTriees = sessions.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const aTransmettre = {
    seances: seancesTriees.filter((s) => !s.sentAt),
    crises: crises.filter((c) => !c.sentAt),
    journees: journees.filter((j) => !j.envoye),
  };
  const archive = {
    seances: seancesTriees.filter((s) => s.sentAt),
    crises: crises.filter((c) => c.sentAt),
    journees: journees.filter((j) => j.envoye),
  };
  const nbArchive = archive.seances.length + archive.crises.length + archive.journees.length;
  const rienATransmettre = !aTransmettre.seances.length && !aTransmettre.crises.length && !aTransmettre.journees.length;

  const atelierName = (id) => (ateliers.find((a) => a.id === id) || {}).name || 'Séance libre';
  const sessionLabel = (sess) => (sess.atelierId ? atelierName(sess.atelierId) : sess.mode === 'balance' ? 'Équilibre' : 'Séance libre');

  function makeFile() {
    const wb = buildWorkbook(chosen, chosenCrises, students, ateliers, intervenants, groupes, guidances, studentFilter, chosenReleves, axesSuivi);
    const blob = workbookBlob(wb);
    const initials = byStudent
      ? students.filter((s) => pickedStudents.includes(s.id)).map((s) => s.initials.replace(/\./g, '')).join('-')
      : '';
    const name = byStudent
      ? nomFichier(`rapport-${initials}`, appareil, 'xlsx')
      : nomFichier('rapport', appareil, 'xlsx');
    return { blob, name };
  }

  function confirmIfNeeded() {
    if (chosenSentCount === 0) return true;
    return window.confirm(
      `${chosenSentCount} des ${chosen.length} rapport(s) sélectionné(s) ${chosenSentCount > 1 ? 'ont' : 'a'} déjà été envoyé(s).\n\nConfirmer l'envoi quand même ?`
    );
  }

  /* En mode « par personne », rien n'est marqué : ce rapport recoupe des
     éléments déjà transmis, et les marquer fausserait le suivi des non-envoyés.
     C'était déjà la règle pour les séances, elle vaut pour les trois. */
  function marquerEnvoye() {
    if (byStudent) return;
    onMarkSent(picked);
    onMarkCrisesSent(chosenCrises.map((c) => c.id));
    onMarkRelevesSent(chosenReleves.map((r) => r.id));
  }

  async function shareSelection() {
    if (!confirmIfNeeded()) return;
    const { blob, name } = makeFile();
    const ok = await shareReport({ blob, name, title: name, notify });
    if (ok) marquerEnvoye();
  }

  const canExport = byStudent
    ? pickedStudents.length > 0 && (chosen.length > 0 || chosenCrises.length > 0 || chosenJournees.length > 0)
    : picked.length + pickedCrises.length + pickedJournees.length > 0;

  /* Pastille de statut, identique sur les trois collections : un appui corrige
     le statut à la main et fait passer l'élément d'une liste à l'autre. */
  const pilule = (sent, onToggle) => (
    <button
      onClick={onToggle}
      className="shrink-0 rounded-lg px-2 py-1 text-xs flex items-center gap-1 border"
      style={{
        borderColor: sent ? CAT_TEAL : BORDER,
        backgroundColor: sent ? CAT_TEAL : 'transparent',
        color: sent ? texteLisibleSur(CAT_TEAL) : INK_SOFT,
      }}
      title="Appuyer pour changer le statut manuellement"
    >
      {sent ? <Check size={12} /> : null} {sent ? 'Envoyé' : 'Non envoyé'}
    </button>
  );

  const caseACocher = (on, onToggle) => (
    <button onClick={onToggle}
      className="w-6 h-6 rounded-md border flex items-center justify-center shrink-0"
      style={{ borderColor: on ? ACCENT : BORDER, backgroundColor: on ? ACCENT : 'transparent' }}>
      {on && <Check size={14} color={ACCENT_INK} />}
    </button>
  );

  const ligneSeance = (s) => {
    const on = picked.includes(s.id);
    const basculer = () => setPicked((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]));
    return (
      <div key={s.id} className="w-full rounded-xl px-3.5 py-3 flex items-center gap-2.5 border"
        style={{ borderColor: on && !byStudent ? ACCENT : BORDER, backgroundColor: on && !byStudent ? ACCENT_WASH : CARD }}>
        <button className="flex-1 text-left min-w-0" onClick={byStudent ? () => onEditSession(s) : basculer}>
          <div className="text-sm font-medium truncate">{sessionLabel(s)}</div>
          <div className="text-xs" style={{ color: INK_SOFT }}>
            {timeShort(s.date)} · {s.studentIds.length} personne{s.studentIds.length !== 1 ? 's' : ''}
          </div>
        </button>
        <button onClick={() => onEditSession(s)} className="shrink-0" style={{ color: INK_SOFT }} title="Corriger cette séance">
          <Pencil size={15} />
        </button>
        <button
          onClick={() => { if (window.confirm('Supprimer définitivement cette séance ?')) onDeleteSession(s.id); }}
          className="shrink-0" style={{ color: INK_SOFT }} title="Supprimer cette séance"
        >
          <Trash2 size={15} />
        </button>
        {pilule(!!s.sentAt, () => onMarkSent([s.id], !s.sentAt))}
        {!byStudent && caseACocher(on, basculer)}
      </div>
    );
  };

  const ligneCrise = (c) => {
    const st = students.find((s) => s.id === c.studentId);
    const ids = c.intervenantIds || (c.intervenantId ? [c.intervenantId] : []);
    const names = ids.map((id) => (intervenants.find((i) => i.id === id) || {}).name).filter(Boolean);
    const on = pickedCrises.includes(c.id);
    const basculer = () => setPickedCrises((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]));
    return (
      <div key={c.id} className="w-full rounded-2xl border p-3.5 flex items-center gap-2.5"
        style={{ borderColor: on && !byStudent ? ACCENT : BORDER, backgroundColor: on && !byStudent ? ACCENT_WASH : PAPER }}>
        <button onClick={() => onEditCrisis(c)} className="flex-1 text-left min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-semibold min-w-0 truncate" style={{ fontFamily: F_DISPLAY }}>{st ? st.initials : 'Personne non renseignée'}</span>
            <span className="text-xs shrink-0 rounded-md px-1.5 py-0.5"
              style={{ backgroundColor: c.kind === 'abc' ? COLOR_ABC : CRISIS, color: '#fff' }}>
              {c.kind === 'abc' ? 'Observation' : 'Crise'}
            </span>
            {/* Fiche ouverte depuis un relevé de suivi continu : elle attend une
                relecture — ABC, intensité, commentaire. L'indicateur existait
                depuis toujours sans que rien ne l'affiche. */}
            {c.aCompleter && (
              <span className="text-xs shrink-0 rounded-md px-1.5 py-0.5" style={{ backgroundColor: CAT_AMBER, color: texteLisibleSur(CAT_AMBER) }}>
                à compléter
              </span>
            )}
            {c.chainId && (
              <span className="text-xs shrink-0 rounded-md px-1.5 py-0.5 flex items-center gap-1"
                style={{ backgroundColor: PAPER, color: INK_SOFT }}>
                <Link2 size={11} /> {c.chainIndex || 1}
                {(() => {
                  const n = crises.filter((x) => x.chainId === c.chainId).length;
                  return n > 1 ? `/${n}` : '';
                })()}
              </span>
            )}
            {c.intensite && (
              <span className="text-xs shrink-0 rounded-md px-1.5 py-0.5"
                style={{
                  backgroundColor: (CRISIS_INTENSITES.find((x) => x.n === c.intensite) || {}).color,
                  color: texteLisibleSur((CRISIS_INTENSITES.find((x) => x.n === c.intensite) || {}).color || '#000'),
                }}>
                {c.intensite}
              </span>
            )}
            {c.kind !== 'abc' && (
              <span className="text-xs shrink-0" style={{ color: INK_SOFT, fontFamily: F_MONO }}>{fmtDuration(c.durationMs)}</span>
            )}
          </div>
          <div className="text-xs" style={{ color: INK_SOFT }}>
            {timeShort(c.date)}
            {c.atelierId && <> · {atelierName(c.atelierId)}</>}
            {names.length > 0 && <> · {names.join(', ')}</>}
          </div>
          <div className="text-xs mt-1" style={{ color: INK_SOFT }}>
            {(c.comportementTags || []).join(', ') || c.comportement || 'comportement non renseigné'}
          </div>
        </button>
        {pilule(!!c.sentAt, () => onMarkCrisesSent([c.id], !c.sentAt))}
        {!byStudent && caseACocher(on, basculer)}
      </div>
    );
  };

  const ligneJournee = (j) => {
    const on = pickedJournees.includes(j.cle);
    const basculer = () => setPickedJournees((p) => (on ? p.filter((x) => x !== j.cle) : [...p, j.cle]));
    const notes = j.releves.filter((r) => !r.fin).length;
    return (
      <div key={j.cle} className="w-full rounded-xl px-3.5 py-3 flex items-center gap-2.5 border"
        style={{ borderColor: on && !byStudent ? ACCENT : BORDER, backgroundColor: on && !byStudent ? ACCENT_WASH : CARD }}>
        <button className="flex-1 text-left min-w-0" onClick={() => onOuvrirJournee(j)}>
          <div className="text-sm font-medium truncate">
            <span style={{ fontFamily: F_DISPLAY }}>{j.initials}</span> · {j.nomAxe}
          </div>
          <div className="text-xs" style={{ color: INK_SOFT }}>
            {notes} relevé{notes !== 1 ? 's' : ''}
            {j.releves.length > notes && ' · clôturée'}
            {' · '}{timeShort(j.releves[0].timestamp)}
          </div>
        </button>
        <button onClick={() => onOuvrirJournee(j)} className="shrink-0" style={{ color: INK_SOFT }} title="Corriger cette journée">
          <Pencil size={15} />
        </button>
        {pilule(j.envoye, () => onMarkRelevesSent(j.releves.map((r) => r.id), !j.envoye))}
        {!byStudent && caseACocher(on, basculer)}
      </div>
    );
  };

  /* Les trois listes, dans le même ordre à transmettre et en archive : les
     répliquer côte à côte les ferait diverger. */
  const troisListes = (lot, cle) => (
    <>
      {lot.seances.length > 0 && (
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wide mb-2" style={{ color: INK_SOFT }}>
            Rapports de séance — <span style={{ fontFamily: F_MONO }}>{lot.seances.length}</span>
          </div>
          <ListeParJour key={`s-${cle}`} items={lot.seances} dateDe={(s) => s.date} renderItem={ligneSeance} />
        </div>
      )}
      {lot.crises.length > 0 && (
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wide mb-2" style={{ color: INK_SOFT }}>
            Crises et observations — <span style={{ fontFamily: F_MONO }}>{lot.crises.length}</span>
          </div>
          <ListeParJour key={`c-${cle}`} items={lot.crises} dateDe={(c) => c.date} renderItem={ligneCrise} />
        </div>
      )}
      {lot.journees.length > 0 && (
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wide mb-2" style={{ color: INK_SOFT }}>
            Suivi continu — <span style={{ fontFamily: F_MONO }}>{lot.journees.length}</span> journée{lot.journees.length !== 1 ? 's' : ''}
          </div>
          <ListeParJour key={`j-${cle}`} items={lot.journees} dateDe={(j) => j.date} renderItem={ligneJournee} />
        </div>
      )}
    </>
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <SectionTitle sub="Relisez, corrigez, puis transmettez aux cadres pédagogiques.">Export</SectionTitle>
        <BoutonMenu onClick={onOuvrirMenu} />
      </div>

      {nbHorsGroupe > 0 && (
        <button
          onClick={onExportSuiviHorsGroupe}
          className="w-full rounded-2xl border-2 p-3.5 mb-4 text-left"
          style={{ borderColor: CRISIS, backgroundColor: CARD }}
        >
          <div className="text-sm font-medium mb-0.5" style={{ fontFamily: F_DISPLAY }}>
            {horsGroupe.sessions.length > 0 && `${horsGroupe.sessions.length} séance(s)`}
            {horsGroupe.sessions.length > 0 && (horsGroupe.crises.length > 0 || horsGroupe.releves.length > 0) && ', '}
            {horsGroupe.crises.length > 0 && `${horsGroupe.crises.length} crise(s)`}
            {horsGroupe.crises.length > 0 && horsGroupe.releves.length > 0 && ', '}
            {horsGroupe.releves.length > 0 && `${horsGroupe.releves.length} relevé(s)`}
            {' '}appartenant à d'autres groupes
          </div>
          <div className="text-xs" style={{ color: INK_SOFT }}>
            À transférer vers leur tablette — appuyer pour exporter, toujours chiffré.
          </div>
        </button>
      )}

      <div className="flex gap-1.5 mb-4">
        {[
          { k: 'sessions', label: 'Par séance', icon: Layers },
          { k: 'students', label: 'Par personne', icon: Users },
        ].map((m) => {
          const Icon = m.icon;
          const on = mode === m.k;
          return (
            <button key={m.k} onClick={() => setMode(m.k)}
              className="flex-1 rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-1.5 border"
              style={{ fontFamily: F_DISPLAY, borderColor: on ? ACCENT : BORDER, backgroundColor: on ? ACCENT : 'transparent', color: on ? ACCENT_INK : INK_SOFT }}>
              <Icon size={15} /> {m.label}
            </button>
          );
        })}
      </div>

      <div
        ref={modeRef}
        data-no-swipe
        style={{
          transform: modeSwipe.offset ? `translateX(${modeSwipe.offset}px)` : 'none',
          transition: modeSwipe.dragging ? 'none' : 'transform .2s ease-out',
        }}
      >
      {byStudent && (
        <div className="mb-4">
          <div className="text-xs mb-2" style={{ color: INK_SOFT }}>
            Personnes à inclure — tout ce qui les concerne est repris, quelles que soient les séances
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {students.map((st) => {
              const on = pickedStudents.includes(st.id);
              return (
                <button key={st.id}
                  onClick={() => setPickedStudents((cur) => (on ? cur.filter((x) => x !== st.id) : [...cur, st.id]))}
                  className="rounded-xl px-4 py-2.5 border font-semibold text-sm"
                  style={{ fontFamily: F_DISPLAY, borderColor: on ? ACCENT : BORDER, backgroundColor: on ? ACCENT : 'transparent', color: on ? ACCENT_INK : INK_SOFT }}>
                  {st.initials}
                </button>
              );
            })}
          </div>
          {pickedStudents.length > 0 && (
            <div className="text-xs" style={{ color: INK_SOFT }}>
              <span style={{ fontFamily: F_MONO }}>{chosen.length}</span> séance{chosen.length !== 1 ? 's' : ''}
              {' · '}<span style={{ fontFamily: F_MONO }}>{chosenCrises.length}</span> crise{chosenCrises.length !== 1 ? 's' : ''}
              {' · '}<span style={{ fontFamily: F_MONO }}>{chosenJournees.length}</span> journée{chosenJournees.length !== 1 ? 's' : ''} de suivi
            </div>
          )}
        </div>
      )}

      {!byStudent && aTransmettre.seances.length > 0 && (
        <div className="flex gap-1.5 mb-3">
          <button onClick={() => setPicked(unsentIds)} className="flex-1 rounded-lg py-2 text-xs border" style={{ borderColor: BORDER, color: INK_SOFT, backgroundColor: CARD }}>
            Non-envoyés ({unsentIds.length})
          </button>
          <button onClick={() => setPicked(sessions.map((s) => s.id))} className="flex-1 rounded-lg py-2 text-xs border" style={{ borderColor: BORDER, color: INK_SOFT, backgroundColor: CARD }}>
            Tout sélectionner
          </button>
          <button onClick={() => setPicked([])} className="flex-1 rounded-lg py-2 text-xs border" style={{ borderColor: BORDER, color: INK_SOFT, backgroundColor: CARD }}>
            Aucun
          </button>
        </div>
      )}

      {rienATransmettre ? (
        <Empty>
          {sessions.length + crises.length + journees.length === 0
            ? 'Rien d’enregistré pour le moment.'
            : 'Tout a été transmis. Ce qui est parti se retrouve dans l’archive, plus bas.'}
        </Empty>
      ) : (
        <>
          {troisListes(aTransmettre, 'envoi')}
          {/* Reprise du passé : les crises hors séance et les journées de suivi
              n'ont jamais porté de statut d'envoi, elles arrivent donc toutes
              ici à la première ouverture. Un geste pour solder l'arriéré. */}
          <button
            onClick={() => {
              const n = aTransmettre.seances.length + aTransmettre.crises.length + aTransmettre.journees.length;
              if (!window.confirm(`Marquer ces ${n} élément(s) comme déjà transmis ?\n\nRien n'est envoyé : ils passent simplement dans l'archive.`)) return;
              onMarkSent(aTransmettre.seances.map((s) => s.id));
              onMarkCrisesSent(aTransmettre.crises.map((c) => c.id));
              onMarkRelevesSent(aTransmettre.journees.reduce((l, j) => l.concat(j.releves.map((r) => r.id)), []));
            }}
            className="text-xs mb-4 flex items-center gap-1"
            style={{ color: INK_SOFT }}
          >
            <Check size={12} /> Tout marquer comme déjà transmis
          </button>
        </>
      )}

      {/* Les options viennent juste après ce qu'elles emportent */}
      <Card className="mb-3">
        <div className="text-xs uppercase tracking-wide mb-2" style={{ color: INK_SOFT }}>
          Rapport Excel — à lire, imprimer ou déposer sur le dossier partagé
        </div>
        <Btn onClick={shareSelection} disabled={!canExport} className="w-full">
          <FileSpreadsheet size={17} /> Exporter
        </Btn>
      </Card>

      <Card className="mb-3">
        <div className="text-xs uppercase tracking-wide mb-2" style={{ color: INK_SOFT }}>
          Fichier pour DatABA Manager
        </div>
        <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
          Le rapport Excel se lit, mais ne contient pas les critères d'acquisition. Ce fichier-ci
          les emporte : c'est lui que le cadre pédagogique charge dans DatABA Manager.
        </p>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={() => { if (confirmIfNeeded()) onExportManager(chosen, true, marquerEnvoye); }} disabled={!canExport} className="flex-1">
            <Lock size={16} /> Chiffré
          </Btn>
          <Btn
            variant="ghost"
            onClick={() => {
              if (!confirmIfNeeded()) return;
              if (window.confirm(
                "Exporter sans chiffrement ?\n\nLe fichier sera lisible par quiconque y a accès. À réserver à un dépôt dans un dossier déjà restreint."
              )) onExportManager(chosen, false, marquerEnvoye);
            }}
            disabled={!canExport}
            className="flex-1"
          >
            <Download size={16} /> Sans chiffrement
          </Btn>
        </div>
      </Card>

      {nbArchive > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setArchiveOuverte((v) => !v)}
            className="w-full flex items-center justify-between rounded-xl px-3.5 py-3 border"
            style={{ borderColor: BORDER, backgroundColor: PAPER }}
          >
            <span className="text-left">
              <span className="block text-sm font-medium" style={{ fontFamily: F_DISPLAY }}>Archive</span>
              <span className="block text-xs" style={{ color: INK_SOFT }}>
                <span style={{ fontFamily: F_MONO }}>{nbArchive}</span> élément{nbArchive !== 1 ? 's' : ''} déjà transmis — modifiables eux aussi
              </span>
            </span>
            <ChevronDown size={18} style={{ color: INK_SOFT, transform: archiveOuverte ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </button>
          {archiveOuverte && <div className="mt-3">{troisListes(archive, 'archive')}</div>}
        </div>
      )}

      {sessions && sessions.length > 1 && (
        <button
          onClick={() => { if (window.confirm('Supprimer définitivement toutes les séances enregistrées ?')) onDeleteAllSessions(); }}
          className="w-full mt-6 rounded-xl border px-3 py-2 text-xs flex items-center justify-center gap-1.5"
          style={{ borderColor: BORDER, color: INK_SOFT, backgroundColor: CARD }}
        >
          <Trash2 size={13} /> Supprimer toutes les séances enregistrées
        </button>
      )}
      </div>
    </div>
  );
}


/* ==================== Module crise ABC ==================== */
function CrisisOverlay({ crisis, setCrisis, students, ateliers, intervenants, abcOptions, nbAutres, onChain, onMinimize, onAbandon, onSave, onDelete }) {
  const options = abcOptions || DEFAULT_ABC;
  const isNew = !!crisis.isNew;
  const [picker, setPicker] = useState(null); // zone dont les catégories sont ouvertes
  const estObservation = crisis.kind === 'abc';
  const [now, setNow] = useState(Date.now());

  /* Le chrono de la fiche ne tourne que pour une crise en cours ; le chrono
     auxiliaire, lui, peut tourner sur une observation ABC — il lui faut le
     même tic. */
  const chronoAuxTourne = !!(crisis.mesures && crisis.mesures.chrono && crisis.mesures.chrono.running);
  useEffect(() => {
    if (!chronoAuxTourne && (!isNew || crisis.kind === 'abc')) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isNew, crisis.kind, chronoAuxTourne]);

  const elapsed = isNew ? now - crisis.startedAt : crisis.durationMs || 0;
  const set = (patch) => setCrisis((c) => ({ ...c, ...patch }));
  const selectedIntervenants = crisis.intervenantIds || [];

  const toggleIntervenant = (id) =>
    set({ intervenantIds: selectedIntervenants.includes(id) ? selectedIntervenants.filter((x) => x !== id) : [...selectedIntervenants, id] });

  /* Glissement de haut en bas depuis l'en-tête : réduit la fiche en pastille,
     de façon progressive — même geste que le bouton Réduire, en plus du tap. */
  const enTeteRef = useRef(null);
  const reduction = useVerticalDismiss(enTeteRef, { onDismiss: onMinimize, enabled: !!onMinimize });

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden"
      style={{
        backgroundColor: PAPER,
        transform: reduction.offset ? `translateY(${reduction.offset}px) scale(${1 - Math.min(0.06, (reduction.offset / window.innerHeight) * 0.06)})` : 'none',
        transformOrigin: 'top center',
        opacity: reduction.offset ? Math.max(0.4, 1 - reduction.offset / window.innerHeight) : 1,
        transition: reduction.dragging ? 'none' : 'transform .2s ease-out, opacity .2s ease-out',
      }}
    >
      <div
        ref={enTeteRef}
        className="sticky top-0 px-4 pb-4 text-white"
        style={{ backgroundColor: estObservation ? COLOR_ABC : CRISIS, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {estObservation ? <ClipboardList size={20} className="shrink-0" /> : <AlertTriangle size={20} className="shrink-0" />}
            <div className="min-w-0">
              <div className="font-semibold leading-tight" style={{ fontFamily: F_DISPLAY }}>
                {estObservation
                  ? (isNew ? 'Observation ABC' : "Modifier l'observation")
                  : (isNew ? 'Crise en cours' : 'Modifier la crise')}
              </div>
              <div className="text-xs opacity-90 truncate">
                {isNew
                  ? (estObservation ? 'Comportement hors crise' : 'Grille ABC')
                  : `${new Date(crisis.date).toLocaleDateString('fr-FR')} à ${timeShort(crisis.date)}`}
                {crisis.chainIndex > 1 && ` · maillon ${crisis.chainIndex} de la chaîne`}
                {nbAutres > 0 && ` · ${nbAutres} autre${nbAutres > 1 ? 's' : ''} en cours`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {!estObservation && (
              <div className="text-3xl font-semibold tabular-nums" style={{ fontFamily: F_MONO }}>{fmtClock(elapsed)}</div>
            )}
            {onMinimize && (
              <button
                onClick={onMinimize}
                className="rounded-lg px-2.5 py-2 text-xs flex items-center gap-1"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                title="Revenir aux cotations sans interrompre la saisie"
              >
                <Minimize2 size={14} /> Réduire
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-8">
        {!isNew && (
          <div className="rounded-xl px-3 py-3" style={{ backgroundColor: PAPER }}>
            <div className="text-xs mb-2" style={{ color: INK_SOFT }}>Date, heure et durée relevées</div>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="datetime-local"
                value={toLocalInput(crisis.date)}
                onChange={(e) => { const d = fromLocalInput(e.target.value); if (d) set({ date: d }); }}
                className="rounded-xl border px-3 py-2.5 text-sm bg-transparent"
                style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }}
              />
              <div className="flex items-center gap-1.5">
                {/* Saisir la durée à la main détache la fiche du suivi continu :
                    une valeur relevée par un professionnel ne doit pas être
                    réécrite au relevé suivant. */}
                <input
                  type="number" min="0" max="999"
                  value={Math.floor((crisis.durationMs || 0) / 60000)}
                  onChange={(e) => {
                    const min = Math.max(0, Number(e.target.value) || 0);
                    const sec = Math.floor(((crisis.durationMs || 0) % 60000) / 1000);
                    set({ durationMs: (min * 60 + sec) * 1000, dureeAuto: false });
                  }}
                  className="w-16 rounded-xl border px-2 py-2.5 text-sm bg-transparent text-center"
                  style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }}
                />
                <span className="text-xs" style={{ color: INK_SOFT }}>min</span>
                <input
                  type="number" min="0" max="59"
                  value={Math.floor(((crisis.durationMs || 0) % 60000) / 1000)}
                  onChange={(e) => {
                    const sec = Math.min(59, Math.max(0, Number(e.target.value) || 0));
                    const min = Math.floor((crisis.durationMs || 0) / 60000);
                    set({ durationMs: (min * 60 + sec) * 1000, dureeAuto: false });
                  }}
                  className="w-16 rounded-xl border px-2 py-2.5 text-sm bg-transparent text-center"
                  style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }}
                />
                <span className="text-xs" style={{ color: INK_SOFT }}>s</span>
              </div>
            </div>
            {crisis.releveId && (
              <div className="text-xs mt-2 flex items-center gap-2 flex-wrap" style={{ color: INK_SOFT }}>
                {crisis.dureeAuto ? (
                  <span>Durée reprise du suivi continu : de l'appui au critère suivant. La saisir ici la fige.</span>
                ) : (
                  <>
                    <span>Durée saisie à la main.</span>
                    <button onClick={() => set({ dureeAuto: true })} className="underline" style={{ color: INK_SOFT }}>
                      Reprendre le calcul automatique
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* En tête de fiche : c'est le champ le plus structurant pour l'export
            et le seul requis pour enregistrer — il ne doit pas se perdre sous
            des mesures annexes optionnelles. */}
        <div>
          <div className="text-xs mb-2 flex items-center gap-1.5" style={{ color: crisis.studentId ? INK_SOFT : CRISIS, transition: 'color .15s ease-out' }}>
            Personne concernée {!crisis.studentId && '— requis pour enregistrer'}
          </div>
          {students.length === 0 ? (
            <div className="text-sm" style={{ color: INK_SOFT }}>Aucune personne enregistrée.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {students.map((s) => (
                <Chip key={s.id} label={s.initials} color={CRISIS} on={crisis.studentId === s.id}
                  onClick={() => set({ studentId: crisis.studentId === s.id ? null : s.id })} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl px-3 py-3" style={{ backgroundColor: PAPER }}>
          <div className="text-xs mb-2" style={{ color: INK_SOFT }}>
            Mesures annexes — un comptage et une durée, indépendants de la grille ABC
          </div>
          <MesuresAuxiliaires
            mesures={crisis.mesures}
            avecCompteur
            avecChrono
            now={now}
            couleur={estObservation ? COLOR_ABC : CRISIS}
            onChange={(mesures) => set({ mesures })}
          />
        </div>

        <div>
          <div className="text-xs mb-2" style={{ color: INK_SOFT }}>Atelier</div>
          {ateliers.length === 0 ? (
            <div className="text-sm" style={{ color: INK_SOFT }}>Aucun atelier enregistré.</div>
          ) : (
            <select
              value={crisis.atelierId || ''}
              onChange={(e) => set({ atelierId: e.target.value || null })}
              className="w-full rounded-lg px-3 py-2.5 text-sm border"
              style={{ borderColor: BORDER, backgroundColor: PAPER, color: INK }}
            >
              <option value="">Aucun atelier</option>
              {ateliers.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <div className="text-xs mb-2" style={{ color: INK_SOFT }}>Intervenants présents</div>
          {intervenants.length === 0 ? (
            <div className="text-sm" style={{ color: INK_SOFT }}>Aucun intervenant enregistré.</div>
          ) : (
            <ChoixMultiple
              placeholder="Aucun intervenant"
              options={intervenants}
              values={selectedIntervenants}
              onToggle={toggleIntervenant}
            />
          )}
        </div>

        {[
          { k: 'antecedent', tagKey: 'antecedentTags', options: options.antecedents, label: 'A — Antécédent', hint: 'Ce qui se passait juste avant' },
          { k: 'comportement', tagKey: 'comportementTags', options: options.comportements, label: 'B — Comportement', hint: "Cochez dans l'ordre d'apparition : c'est ce qui donne la chaîne d'escalade", ordonne: true },
          { k: 'consequence', tagKey: 'consequenceTags', options: options.consequences, label: 'C — Conséquence', hint: "Ce qui a suivi, réaction de l'environnement" },
        ].map((f) => {
          const tags = crisis[f.tagKey] || [];
          const ouvert = picker === f.k;
          const bascule = (v) =>
            set({ [f.tagKey]: tags.includes(v) ? tags.filter((x) => x !== v) : [...tags, v] });
          return (
            <div key={f.k} className="rounded-2xl border p-3" style={{ borderColor: BORDER, backgroundColor: CARD }}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <div className="text-sm font-medium" style={{ fontFamily: F_DISPLAY }}>{f.label}</div>
                  <div className="text-xs" style={{ color: INK_SOFT }}>
                    {f.k === 'antecedent' && crisis.chainIndex > 1
                      ? 'Repris de la conséquence du maillon précédent'
                      : f.hint}
                  </div>
                </div>
                {/* Le + ouvre les catégories : c'est elles qui rendent les crises comptables */}
                <button
                  onClick={() => setPicker(ouvert ? null : f.k)}
                  className="shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center"
                  style={{ borderColor: ouvert ? CRISIS : BORDER, backgroundColor: ouvert ? CRISIS : 'transparent', color: ouvert ? '#fff' : CRISIS }}
                  title="Ajouter des catégories"
                >
                  {ouvert ? <X size={16} /> : <Plus size={18} />}
                </button>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((v, i) => (
                    <button key={v} onClick={() => bascule(v)}
                      className="rounded-lg pl-2 pr-1.5 py-1 text-xs flex items-center gap-1"
                      style={{ backgroundColor: CRISIS, color: '#fff' }}>
                      {f.ordonne && (
                        <span className="rounded px-1" style={{ backgroundColor: 'rgba(255,255,255,0.25)', fontFamily: F_MONO }}>{i + 1}</span>
                      )}
                      {v} <X size={12} />
                    </button>
                  ))}
                </div>
              )}

              {ouvert && (
                <div className="rounded-xl p-2 mb-2" style={{ backgroundColor: PAPER }}>
                  <div className="flex flex-wrap gap-1.5">
                    {f.options.filter((v) => !tags.includes(v)).map((v) => (
                      <button key={v} onClick={() => bascule(v)}
                        className="rounded-lg px-2.5 py-1.5 text-xs border"
                        style={{ borderColor: BORDER, color: INK, backgroundColor: CARD }}>
                        {v}
                      </button>
                    ))}
                  </div>
                  {f.options.every((v) => tags.includes(v)) && (
                    <div className="text-xs" style={{ color: INK_SOFT }}>Toutes les catégories sont retenues.</div>
                  )}
                </div>
              )}

              <textarea
                value={crisis[f.k] || ''}
                onChange={(e) => set({ [f.k]: e.target.value })}
                rows={2}
                placeholder="Précisions libres"
                className="w-full rounded-xl border px-3 py-2.5 text-base bg-transparent"
                style={{ borderColor: BORDER, fontFamily: F_BODY, color: INK }}
              />
            </div>
          );
        })}

        <div>
          <div className="text-sm font-medium mb-1" style={{ fontFamily: F_DISPLAY }}>Fonction supposée</div>
          <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Hypothèse de travail, à confronter aux observations répétées</div>
          {/* Les 4 fonctions classiques du comportement d'abord ; « Indéterminée »
              est le repli, pas une 5e fonction du même rang — elle reste à
              un tap, juste visuellement à part pour ne pas faire 5 choix
              équivalents au même point de décision. */}
          <div className="flex flex-wrap gap-2">
            {CRISIS_FUNCTIONS.filter((fn) => fn.k !== 'indetermine').map((fn) => {
              const on = crisis.fonction === fn.k;
              return (
                <button key={fn.k} onClick={() => set({ fonction: on ? null : fn.k })}
                  className="rounded-xl px-4 py-2.5 border text-sm"
                  style={{ fontFamily: F_DISPLAY, borderColor: fn.color, backgroundColor: on ? fn.color : 'transparent', color: on ? texteLisibleSur(fn.color) : fn.color }}>
                  {fn.label}
                </button>
              );
            })}
          </div>
          {CRISIS_FUNCTIONS.filter((fn) => fn.k === 'indetermine').map((fn) => {
            const on = crisis.fonction === fn.k;
            return (
              <button key={fn.k} onClick={() => set({ fonction: on ? null : fn.k })}
                className="mt-1.5 rounded-xl px-4 py-2 border border-dashed text-xs"
                style={{ fontFamily: F_DISPLAY, borderColor: fn.color, backgroundColor: on ? fn.color : 'transparent', color: on ? texteLisibleSur(fn.color) : INK_SOFT }}>
                {fn.label}
              </button>
            );
          })}
        </div>

        {!estObservation && (
          <div>
            <div className="text-sm font-medium mb-1" style={{ fontFamily: F_DISPLAY }}>Intensité ressentie</div>
            <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>
              Appréciation de l'intervenant sur le moment, non une mesure
            </div>
            <div className="flex gap-2">
              {CRISIS_INTENSITES.map((i) => {
                const on = crisis.intensite === i.n;
                const texte = on ? texteLisibleSur(i.color) : i.color;
                return (
                  <button key={i.n} onClick={() => set({ intensite: on ? null : i.n })}
                    className="flex-1 rounded-xl px-2 py-2.5 border text-left"
                    style={{ borderColor: i.color, backgroundColor: on ? i.color : 'transparent', color: texte }}>
                    <div className="text-sm font-semibold" style={{ fontFamily: F_DISPLAY }}>{i.n} · {i.label}</div>
                    <div className="text-[11px] leading-tight" style={{ color: texte, opacity: 0.85 }}>{i.aide}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="text-sm font-medium mb-1" style={{ fontFamily: F_DISPLAY }}>Commentaire</div>
          <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Contexte, hypothèses, suites à donner</div>
          <textarea
            value={crisis.commentaire || ''}
            onChange={(e) => set({ commentaire: e.target.value })}
            rows={3}
            className="w-full rounded-xl border px-3 py-2.5 text-base bg-transparent"
            style={{ borderColor: BORDER, fontFamily: F_BODY, color: INK }}
          />
        </div>

        {/* Enregistrer occupe toute la largeur ; les deux actions secondaires
            se partagent la ligne suivante. Sur trois boutons côte à côte, le
            dernier débordait de l'écran. */}
        <div className="pt-1">
          <Btn
            onClick={() => {
              const abcVide = !(crisis.antecedent || '').trim() && !(crisis.comportement || '').trim() && !(crisis.consequence || '').trim()
                && (crisis.antecedentTags || []).length === 0 && (crisis.comportementTags || []).length === 0 && (crisis.consequenceTags || []).length === 0;
              if (abcVide && !window.confirm('Aucune observation A, B ou C renseignée : la fiche sera enregistrée sans détail de comportement.\n\nEnregistrer quand même ?')) return;
              onSave(crisis);
            }}
            disabled={!crisis.studentId}
            className="w-full mb-2"
            style={{ backgroundColor: estObservation ? COLOR_ABC : CRISIS }}
          >
            {isNew
              ? (estObservation ? <><Save size={16} /> Enregistrer</> : <><Square size={16} /> Terminer et enregistrer</>)
              : <><Save size={16} /> Enregistrer les modifications</>}
          </Btn>
          <div className="flex gap-2">
            {onChain && (
              <Btn
                variant="outline"
                onClick={() => {
                  if ((crisis.consequenceTags || []).length === 0 && !(crisis.consequence || '').trim()) {
                    if (!window.confirm("Aucune conséquence renseignée : le maillon suivant démarrera sans antécédent repris.\n\nContinuer ?")) return;
                  }
                  onChain(crisis);
                }}
                className="flex-1 text-sm py-2.5"
                title="Enregistrer et enchaîner : la conséquence devient l'antécédent du maillon suivant"
              >
                <Link2 size={16} /> Enchaîner
              </Btn>
            )}
            <Btn variant="ghost" onClick={onAbandon} className="flex-1">{isNew ? 'Abandonner' : 'Annuler'}</Btn>
          </div>
        </div>

        {!isNew && (
          <button
            onClick={() => {
              if (window.confirm(`Supprimer définitivement cette ${estObservation ? 'observation' : 'crise'} ?`)) onDelete(crisis.id);
            }}
            className="w-full text-sm flex items-center justify-center gap-1.5 py-2"
            style={{ color: INK_SOFT }}
          >
            <Trash2 size={14} /> Supprimer cet enregistrement
          </button>
        )}
      </div>
    </div>
  );
}

/* ==================== Garde-fou d'affichage ====================
   Sans lui, la moindre erreur au rendu laisse un écran blanc, impossible à
   diagnostiquer. Ici le message est affiché, et les données restent intactes :
   rien n'est effacé, l'erreur concerne l'affichage, pas le contenu. */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
  }
  render() {
    if (!this.state.error) return this.props.children;
    const message = String((this.state.error && this.state.error.message) || this.state.error);
    const pile = (this.state.info && this.state.info.componentStack) || '';
    return (
      <div className="min-h-screen px-5 py-8" style={{ background: PAPER, color: INK, fontFamily: F_BODY }}>
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-semibold mb-2" style={{ fontFamily: F_DISPLAY }}>L'affichage a rencontré une erreur</h1>
          <p className="text-sm mb-4" style={{ color: INK_SOFT }}>
            Vos données ne sont pas touchées : elles restent enregistrées et chiffrées sur cet appareil.
            Recopiez le message ci-dessous, il indique précisément l'origine du problème.
          </p>
          <div className="rounded-xl border p-3 mb-4 text-xs overflow-auto"
            style={{ borderColor: BORDER, backgroundColor: CARD, fontFamily: F_MONO, maxHeight: '40vh', whiteSpace: 'pre-wrap' }}>
            {message}
            {pile ? `\n${pile.split('\n').slice(0, 8).join('\n')}` : ''}
          </div>
          <div className="flex gap-2">
            <Btn onClick={() => window.location.reload()} className="flex-1 text-sm">Recharger</Btn>
            <Btn
              variant="ghost"
              onClick={() => {
                if (navigator.clipboard) navigator.clipboard.writeText(`${message}\n${pile}`);
              }}
              className="text-sm"
            >
              Copier
            </Btn>
          </div>
        </div>
      </div>
    );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AbaApp />
    </ErrorBoundary>
  );
}
