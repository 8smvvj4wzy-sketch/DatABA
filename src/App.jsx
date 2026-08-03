import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import {
  Plus, X, Play, Pause, Square, Check, ChevronRight, Hash, Route, MessageSquare, Gift,
  Timer as TimerIcon, LayoutGrid, CheckCircle2, RotateCcw, Save,
  Users, Layers, AlertTriangle, Trash2, FileSpreadsheet, ListChecks,
  Volume2, VolumeX, TrendingUp, Upload, Download, Award, UserCog, Sun, Pencil,
  ListOrdered, Gauge, Copy, StickyNote, Star, SlidersHorizontal, EyeOff, Eye, Target, PauseCircle, Lock, Share2, Vibrate, GripVertical, CalendarClock, Maximize2, Minimize2, Flag, BookmarkPlus, ClipboardList, Link2,
  Menu, ChevronLeft, ChevronDown, Activity, Database,
} from 'lucide-react';

/* ==================== Design tokens ==================== */
const INK = '#20291F';
const INK_SOFT = '#5B6B5E';
const PAPER = '#EFF2EC';
const CARD = '#FBFCFA';
const BORDER = '#DBE3D8';
const CRISIS = '#B3261E';
/* Fond de la barre de navigation du bas : un cran plus sombre que la page,
   pour que la pilule se détache sans devenir un bloc noir en bas d'écran. */
const NAV_BG = '#DFE5DA';

/* ==================== Points restés ouverts ====================
   Le document de décisions laisse plusieurs choix à trancher. Ils sont
   rassemblés ici plutôt qu'arbitrés dans le code : une seule ligne à changer
   le jour où la décision est prise, sans rouvrir les composants.

   Point 1 — fermeture du tiroir latéral. Tant que les deux valent false, seul
   le bouton de fermeture du tiroir le referme. Passer l'une ou l'autre (ou les
   deux) à true ajoute le geste correspondant.

   Point 6 — dérive visuelle de la pastille de stabilité. null : la pastille ne
   change jamais d'aspect faute de relevé récent. Un nombre de millisecondes
   active l'affichage estompé au-delà de ce délai. */
const TIROIR_FERME_AU_TAP_DEHORS = false;
const TIROIR_FERME_AU_BALAYAGE = false;
const STABILITE_DERIVE_MS = null;

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
@media (prefers-reduced-motion: reduce) {
  @keyframes abaInFromRight { from { opacity: 1; } to { opacity: 1; } }
  @keyframes abaInFromLeft  { from { opacity: 1; } to { opacity: 1; } }
  @keyframes abaTiroir { from { transform: none; } to { transform: none; } }
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
  { code: 'I', label: 'Indépendant', color: '#0F8B6C', independent: true },
  { code: 'GP', label: 'Guidance partielle', color: '#D69A2D', independent: false },
  { code: 'GT', label: 'Guidance totale', color: '#A8402F', independent: false },
  { code: '0', label: 'Mauvaise réponse', color: '#565E54', independent: false },
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
const GUIDANCE_PALETTE = ['#0F8B6C', '#7A9A3A', '#D69A2D', '#C36A2E', '#A8402F', '#2E6E8E', '#7A6A9A', '#6B5178'];

function guidanceByCode(guidances, code) {
  return (guidances || DEFAULT_GUIDANCE).find((g) => g.code === code) || null;
}
function isIndependentCode(guidances, code) {
  const g = guidanceByCode(guidances, code);
  return g ? !!g.independent : code === 'I';
}

const TYPES = {
  trials: { label: 'Essai par essai', short: 'Essais', icon: ListChecks, color: '#7A6A9A' },
  probe: { label: 'Probe (1 / 0)', short: 'Probe', icon: CheckCircle2, color: '#2E6E8E' },
  occurrence: { label: 'Par occurrence', short: 'Occurrence', icon: Hash, color: '#0F8B6C' },
  timer: { label: 'Timer (durée)', short: 'Timer', icon: TimerIcon, color: '#C36A2E' },
  interval: { label: 'Niveau par intervalle', short: 'Intervalle', icon: LayoutGrid, color: '#6B5178' },
  chaining: { label: 'Chaînage', short: 'Chaînage', icon: ListOrdered, color: '#2E8B7A' },
  latency: { label: 'Latence', short: 'Latence', icon: Gauge, color: '#B07A2E' },
  balance: { label: 'Balance Program', short: 'Balance', icon: Route, color: '#A0567A' },
};

/* Ce que mesure réellement un relevé par intervalle : à préciser pour que les données soient comparables */
const INTERVAL_MODES = [
  { k: 'momentane', label: 'Échantillonnage momentané', hint: 'On note ce qui se passe à l’instant précis du top' },
  { k: 'partiel', label: 'Intervalle partiel', hint: 'Noté si le comportement survient au moins une fois' },
  { k: 'total', label: 'Intervalle total', hint: 'Noté seulement si le comportement dure tout l’intervalle' },
];
const INTERVAL_MODE_SHORT = { momentane: 'momentané', partiel: 'partiel', total: 'total' };

/* Balance Program : chaque étape reçoit une issue, et deux marqueurs
   indépendants — une demande de la personne, et le moment du renforcement,
   qui varie d'une étape à l'autre. */
const BALANCE_OUTCOMES = [
  { k: 'reussi', label: 'Réussi', short: 'R', color: '#0F8B6C', reussite: true },
  { k: 'guide', label: 'Guidé', short: 'G', color: '#D69A2D', reussite: false },
  { k: 'erreur', label: 'Mauvaise réponse', short: 'E', color: '#A8402F', reussite: false },
  { k: 'manque', label: 'Étape manquée', short: 'M', color: '#565E54', reussite: false, exclu: true },
];

/* Réponses retenues pour un Balance Program : celles de l'objectif, sinon
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
  { n: 1, label: 'Légère', aide: 'Gérable, retour au calme rapide', color: '#7A9A3A' },
  { n: 2, label: 'Modérée', aide: 'A demandé un accompagnement soutenu', color: '#D69A2D' },
  { n: 3, label: 'Forte', aide: 'Difficilement contenue, retentissement marqué', color: '#A8402F' },
];

const CRISIS_FUNCTIONS = [
  { k: 'attention', label: 'Attention', color: '#2E6E8E' },
  { k: 'echappement', label: 'Échappement', color: '#C36A2E' },
  { k: 'tangible', label: 'Tangible', color: '#7A9A3A' },
  { k: 'sensoriel', label: 'Sensoriel', color: '#7A6A9A' },
  { k: 'indetermine', label: 'Indéterminée', color: '#565E54' },
];

const DEFAULT_CHAIN_STEPS = [
  { id: 'st1', name: 'Étape 1' },
  { id: 'st2', name: 'Étape 2' },
  { id: 'st3', name: 'Étape 3' },
];

const DEFAULT_INTERVAL_LEVELS = [
  { id: 'lv1', name: 'Stable' },
  { id: 'lv2', name: 'Pré-crise' },
  { id: 'lv3', name: 'Crise' },
  { id: 'lv4', name: 'Post-crise' },
];
const LEVEL_COLORS = ['#0F8B6C', '#7A9A3A', '#D69A2D', '#C36A2E', '#A8402F', '#2E6E8E', '#7A6A9A', '#6B5178'];

/* Types dont le score est un pourcentage : seuls ceux-là admettent un critère de maîtrise */
const PERCENT_TYPES = ['trials', 'probe', 'interval', 'chaining', 'balance'];
/* Types dont la cotation repose sur des niveaux de guidance */
const USES_GUIDANCE = ['trials', 'chaining', 'probe'];
const DEFAULT_MASTERY = { threshold: 80, sessions: 3, unit: 'sessions' };

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
            style={{ borderColor: INK, backgroundColor: i < value.length ? INK : 'transparent' }} />
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
                style={{ fontFamily: F_DISPLAY, borderColor: newMode === m.k ? INK : BORDER, backgroundColor: newMode === m.k ? INK : 'transparent', color: newMode === m.k ? '#fff' : INK_SOFT }}>
                {m.l}
              </button>
            ))}
          </div>
          {newMode === 'pin' && (
            <div className="flex gap-2 mb-3">
              {[4, 6].map((n) => (
                <button key={n} onClick={() => setNewDigits(n)} className="flex-1 rounded-xl py-3 border text-sm font-medium"
                  style={{ fontFamily: F_DISPLAY, borderColor: newDigits === n ? INK : BORDER, backgroundColor: newDigits === n ? INK : 'transparent', color: newDigits === n ? '#fff' : INK_SOFT }}>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
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

function emptyEntry(obj) {
  if (obj.type === 'trials') return { trials: obj.config.trialCount ? Array(obj.config.trialCount).fill(null) : [], running: false, startedAt: null, pendingMs: 0 };
  if (obj.type === 'probe') return { value: null, guidance: null };
  if (obj.type === 'occurrence') return { count: 0 };
  if (obj.type === 'timer') return { elapsedMs: 0, running: false, startedAt: null };
  if (obj.type === 'interval') return { marks: {}, segments: [] };
  if (obj.type === 'chaining') return { steps: {} };
  if (obj.type === 'latency') return { latencies: [], running: false, startedAt: null };
  if (obj.type === 'balance') return { trials: [{ steps: {} }] };
  return {};
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
  if (obj.type === 'probe') return entry.value === 0 || entry.value === 1 || entry.value === null || 'guidance' in entry;
  if (obj.type === 'occurrence') return typeof entry.count === 'number';
  if (obj.type === 'timer') return typeof entry.elapsedMs === 'number';
  if (obj.type === 'interval') return !!entry.marks;
  if (obj.type === 'chaining') return !!entry.steps;
  if (obj.type === 'latency') return Array.isArray(entry.latencies);
  if (obj.type === 'balance') return Array.isArray(entry.trials) || !!entry.steps;
  return false;
}

/* Arrête les chronomètres encore en cours au moment de l'enregistrement */
function finalizeSession(session) {
  const stamp = Date.now();
  const data = {};
  Object.entries(session.data || {}).forEach(([sid, objs]) => {
    data[sid] = {};
    Object.entries(objs).forEach(([oid, entry]) => {
      data[sid][oid] =
        entry && entry.running && entry.startedAt
          ? { ...entry, running: false, elapsedMs: (entry.elapsedMs || 0) + (stamp - entry.startedAt), startedAt: null }
          : entry;
    });
  });
  const reinforcement = {};
  Object.entries(session.reinforcement || {}).forEach(([sid, r]) => {
    reinforcement[sid] = r && r.running && r.startedAt
      ? { running: false, startedAt: null, totalMs: (r.totalMs || 0) + (stamp - r.startedAt) }
      : r;
  });
  return { ...session, data, reinforcement, endedAt: session.isEdit ? session.endedAt || stamp : stamp };
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

/* ==================== Suivi de stabilité ====================
   Relevés indépendants des séances, sur le même principe que les crises : un
   état peut être noté à n'importe quel moment de la journée, dans ou hors
   atelier. Un relevé n'a pas de fin — il vaut jusqu'au suivant, comme un
   interrupteur. Rien à refermer, donc aucun état laissé ouvert par oubli.

   Le croisement avec les ateliers se calcule après coup dans DatABA Manager,
   en comparant l'horodatage du relevé aux bornes des séances. Aucune saisie
   supplémentaire n'est demandée ici pour ça. */
const ETATS_STABILITE = [
  { k: 'stable', l: 'Stable', color: '#2E7D5B' },
  { k: 'pre-crise', l: 'Pré-crise', color: '#D69A2D' },
  { k: 'crise', l: 'Crise', color: CRISIS },
  { k: 'post-crise', l: 'Post-crise', color: '#5B6B8E' },
];

function metaStabilite(k) {
  return ETATS_STABILITE.find((e) => e.k === k) || null;
}

/* Relevé courant d'une personne : simplement le plus récent. */
function etatStabilite(stabilite, studentId) {
  let dernier = null;
  (stabilite || []).forEach((r) => {
    if (!r || r.studentId !== studentId) return;
    const t = new Date(r.timestamp).getTime();
    if (Number.isNaN(t)) return;
    if (!dernier || t > new Date(dernier.timestamp).getTime()) dernier = r;
  });
  return dernier;
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
  const memeJour = (x, y) => x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
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
  if (obj.type === 'probe') {
    if (obj.config && obj.config.useGuidance) {
      if (!entry.guidance) return { result: 'Non coté', detail: '' };
      const g = guidanceByCode(gList, entry.guidance);
      return { result: g ? `${g.label} (${g.code})` : entry.guidance, detail: entry.guidance };
    }
    return { result: entry.value === 1 ? 'Réussi (1)' : entry.value === 0 ? 'Échoué (0)' : 'Non coté', detail: '' };
  }
  if (obj.type === 'occurrence') {
    return { result: `${entry.count} occurrence${entry.count !== 1 ? 's' : ''}`, detail: '' };
  }
  if (obj.type === 'timer') {
    const base = entry.elapsedMs ? fmtDuration(entry.elapsedMs) : 'Non démarré';
    const cible = obj.config && obj.config.timerMode === 'countdown' && obj.config.timerSeconds
      ? ` / ${fmtDuration(obj.config.timerSeconds * 1000)}`
      : '';
    return { result: `${base}${cible}`, detail: `${Math.round((entry.elapsedMs || 0) / 1000)} s` };
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
  if (obj.type === 'latency') {
    const n = entry.latencies.length;
    if (!n) return { result: 'Non coté', detail: '' };
    const avg = entry.latencies.reduce((a, b) => a + b, 0) / n / 1000;
    return {
      result: `${n} mesure${n !== 1 ? 's' : ''} · moyenne ${avg.toFixed(1)} s`,
      detail: entry.latencies.map((ms) => `${(ms / 1000).toFixed(1)} s`).join(' | '),
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
  if (obj.type === 'probe') {
    if (obj.config && obj.config.useGuidance) {
      if (!entry.guidance) return null;
      return { value: isIndependentCode(gList, entry.guidance) ? 100 : 0, percent: true, unit: '%' };
    }
    if (entry.value !== 0 && entry.value !== 1) return null;
    return { value: entry.value * 100, percent: true, unit: '%' };
  }
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
  if (obj.type === 'latency') {
    if (!entry.latencies.length) return null;
    const avg = entry.latencies.reduce((a, b) => a + b, 0) / entry.latencies.length / 1000;
    return { value: Math.round(avg * 10) / 10, percent: false, unit: 's' };
  }
  if (obj.type === 'occurrence') return { value: entry.count, percent: false, unit: 'occ.' };
  if (obj.type === 'timer') {
    if (!entry.elapsedMs) return null;
    return { value: Math.round(entry.elapsedMs / 1000), percent: false, unit: 's' };
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

/* Objectif acquis si les N dernières séances (ou N derniers jours) atteignent toutes le seuil */
function masteryStatus(obj, points) {
  if (!PERCENT_TYPES.includes(obj.type)) return null;
  const m = { ...DEFAULT_MASTERY, ...(obj.config.mastery || {}) };
  const unit = m.unit === 'days' ? 'days' : 'sessions';
  const series = unit === 'days' ? toDayPoints(points) : points;
  let streak = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].value >= m.threshold) streak++;
    else break;
  }
  return { mastered: streak >= m.sessions, threshold: m.threshold, needed: m.sessions, streak: Math.min(streak, m.sessions), unit };
}

/* --- Balance Program ---
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
function buildDetailRows(sessions, students, ateliers, intervenants, guidances, studentFilter) {
  const studentName = (id) => (students.find((s) => s.id === id) || {}).initials || '?';
  const atelierName = (id) => (ateliers.find((a) => a.id === id) || {}).name || '—';
  const intervenantName = (id) => (intervenants.find((i) => i.id === id) || {}).name || '—';

  const rows = [['Date', 'Heure', 'Atelier', 'Intervenant', 'Personne accompagnée', 'Objectif', 'Cible', 'Phase', 'Type', 'N°', 'Étape', 'Résultat', 'Indépendant', 'Demande', 'Renforcé', 'Durée (s)']];

  function base(sess, sid, obj) {
    return [
      new Date(sess.date).toLocaleDateString('fr-FR'),
      timeShort(sess.date),
      sess.atelierId ? atelierName(sess.atelierId) : sess.mode === 'balance' ? 'Balance Program' : 'Séance libre',
      intervenantName(sess.intervenantId),
      studentName(sid),
      obj.name,
      obj.activeTargetName || '—',
      obj.activePhaseName || currentPhase(obj).name,
    ];
  }

  sessions.forEach((sess) => {
    // Temps de renforcement et temps d'activité, par personne
    const dureeSeance = sess.endedAt && sess.startedAt
      ? Math.max(0, sess.endedAt - sess.startedAt - (sess.pausedMs || 0))
      : 0;
    Object.entries(sess.reinforcement || {}).forEach(([sid, r]) => {
      if (studentFilter && !studentFilter.includes(sid)) return;
      const renfo = Math.round((r.totalMs || 0) / 1000);
      if (!renfo) return;
      const activite = Math.max(0, Math.round(dureeSeance / 1000) - renfo);
      rows.push([
        ...base(sess, sid, { name: 'Temps de renforcement', activeTargetName: null, activePhaseName: '—', config: {} }),
        'Renforcement', 1, '',
        `${Math.round(renfo / 60)} min de renforcement · ${Math.round(activite / 60)} min d'activité`,
        '', '', '', renfo,
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
              ...b, 'Essai par essai', i + 1, '', g ? g.label : code,
              isIndependentCode(gl, code) ? 1 : 0, '', '',
              ms == null ? '' : Math.round(ms / 100) / 10,
            ]);
          });
        }

        if (obj.type === 'chaining') {
          (obj.config.steps || []).forEach((st, i) => {
            const code = entry.steps && entry.steps[st.id];
            if (!code) return;
            const g = guidanceByCode(gl, code);
            rows.push([...b, 'Chaînage', i + 1, st.name, g ? g.label : code, isIndependentCode(gl, code) ? 1 : 0, '', '', '']);
          });
        }

        if (obj.type === 'balance') {
          balanceTrials(entry).forEach((tr, ti) => {
            (obj.config.steps || []).forEach((st, si) => {
              const e = (tr.steps || {})[st.id];
              if (!e || !e.outcome) return;
              const o = outcomeMeta(obj, e.outcome);
              rows.push([
                ...b, 'Balance Program', ti + 1, st.name, o ? o.label : e.outcome,
                o && o.exclu ? '' : o && o.reussite ? 1 : 0,
                e.demande ? 'Oui' : 'Non', e.renforce ? 'Oui' : 'Non', '',
              ]);
            });
          });
        }

        if (obj.type === 'timer' && (entry.elapsedMs || 0) > 0) {
          const secondes = Math.round((entry.elapsedMs || 0) / 1000);
          rows.push([...b, 'Timer', 1, '', `${secondes} s`, '', '', '', secondes]);
        }

        if (obj.type === 'latency') {
          (entry.latencies || []).forEach((ms, i) => {
            rows.push([...b, 'Latence', i + 1, '', `${(ms / 1000).toFixed(1)} s`, '', '', '', Math.round(ms / 1000)]);
          });
        }

        if (obj.type === 'interval') {
          const levels = obj.config.levels || [];
          Object.entries(entry.marks || {}).forEach(([n, lid]) => {
            const lv = levels.find((l) => l.id === lid);
            if (lv) rows.push([...b, 'Intervalle', Number(n), '', lv.name, '', '', '', '']);
          });
          (entry.segments || []).forEach((seg) => {
            const lv = levels.find((l) => l.id === seg.levelId);
            if (lv) rows.push([...b, 'Intervalle (saisie manuelle)', `${seg.start}-${seg.end}`, '', lv.name, '', '', '', segmentSeconds(seg)]);
          });
        }
      });
    });
  });

  return rows;
}

function buildWorkbook(sessions, crises, students, ateliers, intervenants = [], guidances, studentFilter) {
  const keepStudent = (sid) => !studentFilter || studentFilter.includes(sid);
  const studentName = (id) => (students.find((s) => s.id === id) || {}).initials || '?';
  const atelierName = (id) => (ateliers.find((a) => a.id === id) || {}).name || '—';
  const intervenantName = (id) => (intervenants.find((i) => i.id === id) || {}).name || '—';

  const rows = [['Date', 'Heure', 'Atelier', 'Intervenant', 'Personne accompagnée', 'Objectif', 'Cible', 'Type de cotation', 'Résultat', 'Score', 'Détail']];
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
        rows.push([
          d.toLocaleDateString('fr-FR'),
          timeShort(s.date),
          atelierName(s.atelierId),
          intervenantName(s.intervenantId),
          studentName(sid),
          obj.name,
          obj.activeTargetName || '—',
          TYPES[obj.type].label,
          result,
          score ? score.value : '',
          fullDetail,
        ]);
      });
    });
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 16 }, { wch: 10 }, { wch: 34 }, { wch: 16 }, { wch: 22 }, { wch: 26 }, { wch: 8 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Cotations');

  const detailRows = buildDetailRows(sessions, students, ateliers, intervenants, guidances, studentFilter);
  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetail['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 16 }, { wch: 10 }, { wch: 34 }, { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 7 }, { wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 9 }, { wch: 9 }, { wch: 10 }];
  wsDetail['!freeze'] = { xSplit: 0, ySplit: 1 };
  if (detailRows.length > 1) XLSX.utils.book_append_sheet(wb, wsDetail, 'Détail par essai');

  const crisisRows = [['Type', 'Chaîne', 'Rang', 'Date', 'Heure', 'Jour', 'Personne accompagnée', 'Atelier', 'Intervenants présents', 'Durée', 'Durée (s)', 'Intensité', 'Antécédents', 'Enchaînement des comportements', 'Premier comportement', 'Fonction supposée', 'Conséquences', 'Antécédent (libre)', 'Comportement (libre)', 'Conséquence (libre)', 'Commentaire']];
  crises.forEach((c) => {
    if (studentFilter && c.studentId && !studentFilter.includes(c.studentId)) return;
    const ids = c.intervenantIds || (c.intervenantId ? [c.intervenantId] : []);
    const f = c.fonction ? CRISIS_FUNCTIONS.find((x) => x.k === c.fonction) : null;
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
    ]);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(crisisRows);
  ws2['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 6 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 24 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 34 }, { wch: 44 }, { wch: 22 }, { wch: 16 }, { wch: 34 }, { wch: 34 }, { wch: 34 }, { wch: 34 }, { wch: 34 }];
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
   manuellement dans le dossier voulu. */
async function shareReport({ blob, name, title, notify }) {
  try {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  downloadBlob(blob, name);
  if (notify) notify('Fichier téléchargé — à déposer dans le dossier SharePoint');
}

/* ==================== Composants UI de base ==================== */
function Btn({ children, onClick, variant = 'solid', disabled, className = '', style = {}, ...rest }) {
  const base = 'rounded-xl px-4 py-3 font-medium flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-30';
  const styles =
    variant === 'solid'
      ? { backgroundColor: INK, color: '#fff' }
      : variant === 'outline'
      ? { border: `1px solid ${INK}`, color: INK, backgroundColor: 'transparent' }
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

function Chip({ label, on, onClick, color = INK }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl px-4 py-2.5 border text-sm active:scale-95 transition-transform"
      style={{ fontFamily: F_DISPLAY, borderColor: on ? color : BORDER, backgroundColor: on ? color : 'transparent', color: on ? '#fff' : INK_SOFT }}
    >
      {label}
    </button>
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

/* Modal de mot de passe pour la sauvegarde chiffrée. Un seul composant pour
   les deux usages : "export" demande une saisie en double pour éviter une
   faute de frappe qui rendrait le fichier illisible ; "import" ne demande
   qu'une saisie, avec un message d'erreur si elle ne convient pas. */
function PassphraseModal({ mode, error, onSubmit, onClose }) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const ready = mode === 'export' ? p1.length >= 4 && p1 === p2 : p1.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
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
  /* L'application s'ouvre sur Session : c'est l'écran utilisé à chaque prise
     de poste, alors que la gestion ne sert qu'épisodiquement. */
  const [tab, setTab] = useState('session');
  /* Écran ouvert depuis le tiroir latéral. Il prend la place du contenu
     d'onglet ; la barre du bas reste visible, avec les boutons Crise et ABC. */
  const [ecran, setEcran] = useState(null);
  const [tiroir, setTiroir] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [security, setSecurity] = useState({ pinHash: null, pinSalt: null });
  const [securityLoaded, setSecurityLoaded] = useState(false);
  const [locked, setLocked] = useState(true);
  const [retentionMonths, setRetentionMonths] = useState(0);

  const [students, setStudents] = useState([]);
  const [ateliers, setAteliers] = useState([]);
  const [intervenants, setIntervenants] = useState([]);
  const [guidances, setGuidances] = useState(DEFAULT_GUIDANCE);
  const [objectiveTemplates, setObjectiveTemplates] = useState([]);
  const [abcOptions, setAbcOptions] = useState(DEFAULT_ABC);
  /* Nom de cet appareil. Il voyage dans chaque fichier produit et se retrouve
     dans son nom : sans lui, un dossier de sauvegardes ne dit pas de quelle
     tablette vient quoi. */
  const [appareil, setAppareil] = useState('');
  const [sessions, setSessions] = useState([]);
  const [crises, setCrises] = useState([]);
  /* Relevés de stabilité : un tableau à part, indépendant des séances, sur le
     même modèle que les crises. */
  const [stabilite, setStabilite] = useState([]);
  const [choixStabilite, setChoixStabilite] = useState(null); // personne dont on choisit l'état

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
  const rootRef = useRef(null);
  const contentRef = useRef(null);
  const [dir, setDir] = useState(0);

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
      setTab(k);
    },
    [tab, ecran]
  );

  /* La barre est figée sur l'onglet Session, qui couvre les deux écrans
     concernés : la configuration avant lancement et la cotation en cours. Un
     balayage accidentel pendant une cotation ne doit jamais changer d'onglet,
     et la barre ne doit pas se dérober sous le doigt. */
  const navFige = !ecran && tab === 'session';
  const swipeActif = !ecran && (tiroir ? TIROIR_FERME_AU_BALAYAGE : !navFige);

  const onLeft = React.useCallback(() => {
    if (tiroir) { if (TIROIR_FERME_AU_BALAYAGE) setTiroir(false); return; }
    goTab(1);
  }, [tiroir, goTab]);

  /* Depuis Suivi — l'extrémité gauche — il n'y a pas d'onglet précédent : le
     balayage vers la droite y est libre, c'est lui qui ouvre le tiroir. */
  const onRight = React.useCallback(() => {
    if (tiroir) return;
    if (tab === TAB_ORDER[0]) { setTiroir(true); return; }
    goTab(-1);
  }, [tiroir, tab, goTab]);

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
        setStudents(d.students || []);
        setAteliers(d.ateliers || []);
        setIntervenants(d.intervenants || []);
        setAppareil(d.appareil || '');
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
    let loadedStabilite = [];
    const sta = await store.get('aba:stabilite');
    if (sta) { try { loadedStabilite = JSON.parse(sta) || []; } catch (e) {} }

    // Purge automatique au-delà de la durée de conservation retenue
    if (retention > 0) {
      const limite = new Date();
      limite.setMonth(limite.getMonth() - retention);
      const gardeS = loadedSessions.filter((x) => new Date(x.date) >= limite);
      const gardeC = loadedCrises.filter((x) => new Date(x.date) >= limite);
      const gardeT = loadedStabilite.filter((x) => new Date(x.timestamp) >= limite);
      const retires = (loadedSessions.length - gardeS.length) + (loadedCrises.length - gardeC.length) + (loadedStabilite.length - gardeT.length);
      if (retires > 0) {
        loadedSessions = gardeS;
        loadedCrises = gardeC;
        loadedStabilite = gardeT;
        setTimeout(() => notify(`${retires} enregistrement${retires > 1 ? 's' : ''} supprimé${retires > 1 ? 's' : ''} (durée de conservation)`), 600);
      }
    }
    setSessions(loadedSessions);
    setCrises(loadedCrises);
    setStabilite(loadedStabilite);

    const act = await store.get('aba:active');
    if (act) { try { setActiveSession(JSON.parse(act)); } catch (e) {} }

    /* Tablette neuve : rien à coter, on ouvre directement sur la configuration
       des personnes accompagnées. Dès qu'une personne existe, l'application
       reprend son comportement normal et démarre sur Session. */
    if (nbPersonnes === 0) setEcran('personnes');

    setLoaded(true);
  }

  /* Toutes les clés contenant des données, mois par mois compris. */
  async function clesDonnees() {
    const base = ['aba:config', 'aba:sessions', 'aba:crises', 'aba:stabilite', 'aba:active', SESSIONS_INDEX];
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
    await store.set('aba:config', JSON.stringify({ students, ateliers, intervenants, guidances, guidanceVersion: GUIDANCE_VERSION, retentionMonths, objectiveTemplates, abcOptions, appareil }));
    moisEcrits.current = {};
    await persistSessions(sessions);
    await store.set('aba:crises', JSON.stringify(crises));
    await store.set('aba:stabilite', JSON.stringify(stabilite));
    await store.set('aba:active', JSON.stringify(activeSession));
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
    store.set('aba:config', JSON.stringify({ students, ateliers, intervenants, guidances, guidanceVersion: GUIDANCE_VERSION, retentionMonths, objectiveTemplates, abcOptions, appareil }));
  }, [students, ateliers, intervenants, guidances, retentionMonths, objectiveTemplates, abcOptions, appareil, loaded]);
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
    store.set('aba:stabilite', JSON.stringify(stabilite));
  }, [stabilite, loaded]);
  useEffect(() => {
    if (!loaded) return;
    store.set('aba:active', JSON.stringify(activeSession));
  }, [activeSession, loaded]);

  function notify(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  /* --- gestion --- */
  const addStudent = (initials) => setStudents((s) => [...s, { id: uid(), initials, objectives: [] }]);
  const removeStudent = (id) => setStudents((s) => s.filter((x) => x.id !== id));
  const renameStudent = (id, initials) => setStudents((s) => s.map((x) => (x.id === id ? { ...x, initials } : x)));
  const addAtelier = (name) => setAteliers((a) => [...a, { id: uid(), name }]);
  const removeAtelier = (id) => setAteliers((a) => a.filter((x) => x.id !== id));
  const renameAtelier = (id, name) => setAteliers((a) => a.map((x) => (x.id === id ? { ...x, name } : x)));
  const setAtelierGroup = (id, config) =>
    setAteliers((a) => a.map((x) => (x.id === id
      ? {
          ...x,
          usualStudentIds: config.studentIds,
          usualObjectives: config.objectives,
          favoriteObjectiveIds: config.favorites,
          knownObjectiveIds: config.known,
        }
      : x)));
  const addIntervenant = (name) => setIntervenants((l) => [...l, { id: uid(), name }]);
  const removeIntervenant = (id) => setIntervenants((l) => l.filter((x) => x.id !== id));
  const renameIntervenant = (id, name) => setIntervenants((l) => l.map((x) => (x.id === id ? { ...x, name } : x)));
  const addGuidance = (g) => setGuidances((l) => [...l, g]);
  const removeGuidance = (code) => setGuidances((l) => (l.length > 1 ? l.filter((x) => x.code !== code) : l));
  const toggleIndependent = (code) => setGuidances((l) => l.map((x) => (x.code === code ? { ...x, independent: !x.independent } : x)));

  const saveTemplate = (obj) => {
    const { id, favorite, currentTargetId, masteredTargetIds, phaseHistory: ph, trackingResetAt, ...reste } = obj;
    setObjectiveTemplates((l) => [...l, { ...reste, id: uid() }]);
    notify('Modèle enregistré');
  };
  const removeTemplate = (id) => setObjectiveTemplates((l) => l.filter((t) => t.id !== id));

  /* Export de configuration : ateliers, intervenants, guidances et modèles.
     Aucune personne, aucune séance, aucune crise — le fichier ne contient donc
     aucune donnée d'usager et peut circuler librement entre appareils. */
  function exportConfig() {
    const payload = {
      format: 'aba-config',
      version: 1,
      exportedAt: new Date().toISOString(),
      ateliers: ateliers.map(({ usualStudentIds, usualObjectives, favoriteObjectiveIds, knownObjectiveIds, ...a }) => a),
      intervenants,
      guidances,
      objectiveTemplates,
      abcOptions,
      appareil,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    downloadBlob(blob, nomFichier('configuration-aba', appareil, 'json'));
    notify('Configuration exportée');
  }

  function importConfig(d) {
    const nbA = (d.ateliers || []).length;
    const nbI = (d.intervenants || []).length;
    const nbT = (d.objectiveTemplates || []).length;
    if (!window.confirm(
      `Importer cette configuration ?\n\n${nbA} atelier(s), ${nbI} intervenant(s), ${nbT} modèle(s) d'objectif.\n\nLes éléments existants sont conservés, les nouveaux s'ajoutent.`
    )) return;
    setAteliers((cur) => [...cur, ...(d.ateliers || []).filter((a) => !cur.some((x) => x.name === a.name))]);
    setIntervenants((cur) => [...cur, ...(d.intervenants || []).filter((i) => !cur.some((x) => x.name === i.name))]);
    setGuidances((cur) => [...cur, ...(d.guidances || []).filter((g) => !cur.some((x) => x.code === g.code))]);
    setObjectiveTemplates((cur) => [...cur, ...(d.objectiveTemplates || []).filter((t) => !cur.some((x) => x.name === t.name))]);
    if (d.abcOptions) {
      setAbcOptions((cur) => ({
        antecedents: [...cur.antecedents, ...(d.abcOptions.antecedents || []).filter((v) => !cur.antecedents.includes(v))],
        comportements: [...cur.comportements, ...(d.abcOptions.comportements || []).filter((v) => !cur.comportements.includes(v))],
        consequences: [...cur.consequences, ...(d.abcOptions.consequences || []).filter((v) => !cur.consequences.includes(v))],
      }));
    }
    if (d.appareil && !appareil.trim()) setAppareil(d.appareil);
    notify('Configuration importée');
  }

  /* --- sauvegarde / restauration --- */
  const [backupPrompt, setBackupPrompt] = useState(null); // { mode: 'export' } | { mode: 'import', envelope, error }

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
    /* Les relevés de stabilité ne sont rattachés à aucune séance : on joint
       ceux des personnes concernées par la sélection. C'est Manager qui les
       croisera ensuite avec les bornes horaires des séances. */
    const stabiliteRetenue = stabilite.filter((r) => idsConcernes.has(r.studentId));
    return {
      format: 'aba-backup',
      version: 3,
      exportedAt: new Date().toISOString(),
      appareil,
      students: students.filter((st) => idsConcernes.has(st.id)),
      ateliers,
      intervenants,
      guidances,
      sessions: seancesRetenues,
      crises: crisesRetenues,
      stabilite: stabiliteRetenue,
    };
  }

  function exportManager(seancesRetenues, chiffre) {
    const payload = payloadManager(seancesRetenues);
    const nom = nomFichier('pour-manager', appareil, 'json');
    if (!chiffre) {
      downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), nom);
      notify('Fichier Manager exporté sans chiffrement');
      return;
    }
    setBackupPrompt({ mode: 'export', managerPayload: payload, managerNom: nom });
  }

  /* Sauvegarde en clair : lisible sans mot de passe, donc à réserver aux
     transferts qui restent dans un espace déjà protégé. */
  function exportBackupClair() {
    const payload = { format: 'aba-backup', version: 3, exportedAt: new Date().toISOString(), appareil, students, ateliers, intervenants, guidances, sessions, crises, stabilite };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    downloadBlob(blob, nomFichier('sauvegarde-aba', appareil, 'json'));
    setBackupPrompt(null);
    notify('Sauvegarde exportée sans chiffrement');
  }


  async function confirmExport(passphrase) {
    if (backupPrompt && backupPrompt.managerPayload) {
      const enveloppe = await encryptJSON(backupPrompt.managerPayload, passphrase);
      downloadBlob(new Blob([JSON.stringify(enveloppe)], { type: 'application/json' }), backupPrompt.managerNom);
      setBackupPrompt(null);
      notify('Fichier Manager chiffré exporté');
      return;
    }
    const payload = { format: 'aba-backup', version: 3, exportedAt: new Date().toISOString(), appareil, students, ateliers, intervenants, guidances, sessions, crises, stabilite };
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
    setStudents(d.students || []);
    setAteliers(d.ateliers || []);
    setIntervenants(d.intervenants || []);
    if (Array.isArray(d.guidances) && d.guidances.length) setGuidances(d.guidances);
    setSessions(d.sessions || []);
    setCrises(d.crises || []);
    setStabilite(d.stabilite || []);
    /* Le nom d'appareil du fichier ne s'impose pas à la tablette qui restaure :
       elle garde le sien s'il est déjà renseigné, sinon elle reprend celui de
       la sauvegarde plutôt que de rester anonyme. */
    if (d.appareil && !appareil.trim()) setAppareil(d.appareil);
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
      // Ancienne sauvegarde exportée en clair, avant l'ajout du chiffrement : toujours acceptée
      applyRestoredData(d);
    };
    reader.readAsText(file);
  }

  async function confirmImport(passphrase) {
    try {
      const d = await decryptJSON(backupPrompt.envelope, passphrase);
      setBackupPrompt(null);
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

  const markSent = (ids, sent = true) =>
    setSessions((list) => list.map((s) => (ids.includes(s.id) ? { ...s, sentAt: sent ? new Date().toISOString() : null } : s)));

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
    studentId: null,
    atelierId: (activeSession && activeSession.atelierId) || null,
    intervenantIds: activeSession && activeSession.intervenantId ? [activeSession.intervenantId] : [],
    commentaire: '',
    antecedent: '',
    comportement: '',
    consequence: '',
    antecedentTags: [],
    comportementTags: [],
    consequenceTags: [],
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
    const maillon = { ...rest, chainId, chainIndex: rang };

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
    const { isNew, ...rest } = c;
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

  /* --- suivi de stabilité --- */
  const toggleSuiviStabilite = (id) =>
    setStudents((l) => l.map((x) => (x.id === id ? { ...x, suiviStabilite: !x.suiviStabilite } : x)));

  /* Un relevé s'ajoute simplement à la suite : il vaut jusqu'au suivant.
     L'état « crise » crée en plus une fiche crise minimale dans le tableau
     habituel — la même fiche que celle du bouton CRISE, pas une seconde
     série. Elle est enregistrée directement, sans chronomètre : la durée reste
     à renseigner à la main depuis l'écran Export.

     Le repère visuel signalant qu'une telle fiche reste à compléter n'est pas
     tranché : l'indicateur `aCompleter` est posé sur la fiche, rien ne
     l'affiche encore. */
  const noterStabilite = (studentId, etat) => {
    const maintenant = new Date().toISOString();
    setStabilite((l) => [...l, { id: uid(), studentId, timestamp: maintenant, etat, source: 'pastille' }]);
    const st = students.find((s) => s.id === studentId);
    const nom = st ? st.initials : '';
    if (etat === 'crise') {
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
          origine: 'stabilite',
          aCompleter: true,
        },
        ...list,
      ]);
      notify(`${nom} — fiche crise créée, à compléter depuis Export`);
    } else {
      notify(`${nom} — ${(metaStabilite(etat) || {}).l || etat}`);
    }
    setChoixStabilite(null);
  };

  /* Une pastille par personne dont le suivi de stabilité est activé. Les
     autres n'en ont aucune : rien n'apparaît, rien n'encombre. */
  const pastillesStabilite = students
    .filter((s) => s.suiviStabilite)
    .map((st) => {
      const releve = etatStabilite(stabilite, st.id);
      const meta = releve ? metaStabilite(releve.etat) : null;
      const perime = !!(releve && STABILITE_DERIVE_MS != null
        && Date.now() - new Date(releve.timestamp).getTime() > STABILITE_DERIVE_MS);
      return { st, releve, meta, perime };
    });

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
          transform: offset ? `translateX(${offset}px)` : 'none',
          transition: dragging ? 'none' : 'transform .2s ease-out',
        }}
      >
        <div
          key={ecran || tab}
          style={{
            animation: dir === 0 ? 'none' : `${dir > 0 ? 'abaInFromRight' : 'abaInFromLeft'} .18s ease-out`,
          }}
        >
        {ecran && (
          <button
            onClick={() => { setEcran(null); setTiroir(true); }}
            className="flex items-center gap-1 text-sm mb-3"
            style={{ color: INK_SOFT }}
          >
            <ChevronLeft size={16} /> Menu
          </button>
        )}
        {ecran === 'ateliers' && (
          <PanneauAteliers ateliers={ateliers} onAdd={addAtelier} onRename={renameAtelier} onRemove={removeAtelier} />
        )}
        {ecran === 'personnes' && (
          <PanneauPersonnes
            students={students} guidances={guidances} templates={objectiveTemplates}
            premiereConfiguration={students.length === 0}
            addStudent={addStudent} removeStudent={removeStudent} renameStudent={renameStudent}
            onToggleStabilite={toggleSuiviStabilite}
            addObjective={addObjective} removeObjective={removeObjective} updateObjective={updateObjective}
            duplicateObjective={duplicateObjective} toggleFavorite={toggleFavorite} changePhase={changePhase}
            onSaveTemplate={saveTemplate}
          />
        )}
        {ecran === 'intervenants' && (
          <PanneauIntervenants intervenants={intervenants} onAdd={addIntervenant} onRename={renameIntervenant} onRemove={removeIntervenant} />
        )}
        {ecran === 'modeles' && (
          <PanneauModeles templates={objectiveTemplates} onRemove={removeTemplate} />
        )}
        {ecran === 'motsdepasse' && (
          <PanneauMotsDePasse security={security} onChangePin={changePin} onDisableProtection={disableProtection} />
        )}
        {ecran === 'donnees' && (
          <PanneauDonnees
            appareil={appareil} onSetAppareil={setAppareil}
            retentionMonths={retentionMonths} onSetRetention={setRetentionMonths}
            onExportConfig={exportConfig} onExportBackup={exportBackup} onImportBackup={importBackup}
          />
        )}
        {ecran === 'guidances' && (
          <PanneauGuidances
            guidances={guidances} onAdd={addGuidance} onRemove={removeGuidance}
            onToggleIndependent={toggleIndependent} onReorder={setGuidances}
          />
        )}
        {ecran === 'abc' && (
          <PanneauAbc abcOptions={abcOptions} onSetAbc={setAbcOptions} />
        )}

        {!ecran && (
          <>
        {tab === 'suivi' && (
          <SuiviScreen
            students={students} sessions={sessions} guidances={guidances}
            onResetTracking={resetTracking} onOuvrirMenu={() => setTiroir(true)}
          />
        )}
        {tab === 'session' && (
          <SessionScreen
            students={students} ateliers={ateliers} intervenants={intervenants}
            sessions={sessions} crises={crises} guidances={guidances} onEditSession={editSession} onDeleteSession={deleteSession} onDeleteAllSessions={deleteAllSessions}
            onSetAtelierGroup={setAtelierGroup} notify={notify} onOuvrirConfiguration={() => setEcran('personnes')}
            activeSession={activeSession} setActiveSession={setActiveSession}
            onFinish={(session) => {
              const { isEdit, ...rest } = session;
              setActiveSession(null);
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
              } else {
                notify(isEdit ? 'Séance corrigée' : 'Séance enregistrée');
              }
            }}
          />
        )}
        {tab === 'export' && (
          <ExportScreen
            sessions={sessions} crises={crises} students={students} ateliers={ateliers} intervenants={intervenants}
            guidances={guidances} appareil={appareil} notify={notify}
            onEditCrisis={editCrisis} onMarkSent={markSent} onExportManager={exportManager}
          />
        )}
          </>
        )}
        </div>
      </div>

      {/* ==================== Barre du bas ====================
          ABC et Crise encadrent la pilule de navigation : le bas d'écran est la
          zone atteignable d'une main sur une tablette, ce que la fréquence du
          bouton Crise exige. Au-dessus, les pastilles — celles des fiches
          ouvertes, puis celles du suivi de stabilité. */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 px-3 pt-8 pointer-events-none"
        style={{
          background: `linear-gradient(to top, ${PAPER} 60%, transparent)`,
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.6rem)',
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
        {/* Suivi de stabilité : une pastille par personne concernée, aucune pour les autres */}
        {pastillesStabilite.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 justify-center">
            {pastillesStabilite.map((p) => (
              <button
                key={p.st.id}
                onClick={() => setChoixStabilite(p.st.id)}
                className="rounded-2xl px-3 py-1.5 flex items-center gap-1.5 text-xs border shadow-sm"
                style={{
                  backgroundColor: p.meta ? p.meta.color : CARD,
                  borderColor: p.meta ? p.meta.color : BORDER,
                  color: p.meta ? '#fff' : INK_SOFT,
                  opacity: p.perime ? 0.55 : 1,
                  fontFamily: F_DISPLAY,
                }}
              >
                <Activity size={12} />
                <span>{p.st.initials}</span>
                <span style={{ opacity: 0.85 }}>{p.meta ? p.meta.l : 'à noter'}</span>
              </button>
            ))}
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
                  style={{ backgroundColor: c.kind === 'abc' ? '#B07A2E' : CRISIS, fontFamily: F_DISPLAY }}
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

        <div className="flex items-center justify-center gap-2">
          {/* Comportement à consigner sans qu'il relève d'une crise */}
          <button
            onClick={openObservation}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-2 shrink-0 active:scale-[0.96] transition-transform"
            style={{ backgroundColor: CARD, borderColor: '#B07A2E', color: '#B07A2E' }}
            title="Observation ABC, hors crise"
            aria-label="Observation ABC"
          >
            <ClipboardList size={22} />
          </button>

          <div className="rounded-full flex items-center gap-0.5 p-1 shadow-lg" style={{ backgroundColor: NAV_BG }}>
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
                  className="rounded-full px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5"
                  style={{
                    fontFamily: F_DISPLAY,
                    backgroundColor: on ? INK : 'transparent',
                    color: on ? '#fff' : INK_SOFT,
                  }}
                  aria-label={t.label}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={openCrisis}
            className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg shrink-0 active:scale-[0.96] transition-transform"
            style={{ backgroundColor: CRISIS }}
            title="Ouvrir une fiche de crise"
            aria-label="Crise"
          >
            <AlertTriangle size={24} />
          </button>
        </div>
        </div>
      </div>

      {/* ==================== Tiroir latéral ====================
          Ouvert par un balayage vers la droite depuis l'écran Suivi, ou par le
          bouton de cet écran. */}
      {tiroir && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(32,41,31,0.35)' }}
          onClick={TIROIR_FERME_AU_TAP_DEHORS ? () => setTiroir(false) : undefined}
        >
          <div
            className="h-full overflow-y-auto shadow-2xl"
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
              <button
                onClick={() => setTiroir(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: PAPER, color: INK_SOFT }}
                aria-label="Fermer le menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-2 space-y-0.5">
              {[
                { k: 'ateliers', label: 'Ateliers', icon: Layers },
                { k: 'personnes', label: 'Personnes accompagnées', icon: Users },
                { k: 'intervenants', label: 'Intervenants', icon: UserCog },
                { k: 'modeles', label: "Modèles d'objectifs", icon: BookmarkPlus },
                { k: 'motsdepasse', label: 'Mots de passe', icon: Lock },
                { k: 'donnees', label: 'Données', icon: Database },
              ].map((it) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.k}
                    onClick={() => { setEcran(it.k); setTiroir(false); }}
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

            {/* Ces deux écrans n'ont pas encore de place attribuée dans le menu.
                Ils restent atteignables ici plutôt que de disparaître. */}
            <div className="px-4 mt-6 mb-1">
              <div className="text-xs uppercase tracking-wide" style={{ color: INK_SOFT }}>Emplacement provisoire</div>
            </div>
            <div className="px-2 space-y-0.5">
              {[
                { k: 'guidances', label: 'Guidances', icon: SlidersHorizontal },
                { k: 'abc', label: 'Réponses ABC', icon: AlertTriangle },
              ].map((it) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.k}
                    onClick={() => { setEcran(it.k); setTiroir(false); }}
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
          </div>
        </div>
      )}

      {/* Choix de l'état de stabilité, depuis une pastille */}
      {choixStabilite && (() => {
        const st = students.find((s) => s.id === choixStabilite);
        if (!st) return null;
        const courant = etatStabilite(stabilite, st.id);
        return (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            onClick={() => setChoixStabilite(null)}
          >
            <div
              className="w-full max-w-md rounded-t-3xl p-5"
              style={{ backgroundColor: CARD, paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg font-semibold" style={{ fontFamily: F_DISPLAY }}>{st.initials}</span>
                <button onClick={() => setChoixStabilite(null)} style={{ color: INK_SOFT }} aria-label="Fermer"><X size={18} /></button>
              </div>
              <p className="text-xs mb-4" style={{ color: INK_SOFT }}>
                {courant
                  ? `${(metaStabilite(courant.etat) || {}).l || courant.etat} depuis ${timeShort(courant.timestamp)}`
                  : 'Aucun relevé pour le moment.'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ETATS_STABILITE.map((et) => (
                  <button
                    key={et.k}
                    onClick={() => noterStabilite(st.id, et.k)}
                    className="rounded-2xl py-4 text-sm font-semibold text-white active:scale-[0.98] transition-transform"
                    style={{ backgroundColor: et.color, fontFamily: F_DISPLAY }}
                  >
                    {et.l}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-3" style={{ color: INK_SOFT }}>
                Un état vaut jusqu'au suivant, il n'y a rien à refermer.
                « Crise » crée en plus une fiche crise à compléter depuis l'écran Export.
              </p>
            </div>
          </div>
        );
      })()}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
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

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-xl text-sm text-white shadow-lg" style={{ backgroundColor: INK, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 8rem)' }}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
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
                  style={{ fontFamily: F_DISPLAY, borderColor: newDigits === n ? INK : BORDER, backgroundColor: newDigits === n ? INK : 'transparent', color: newDigits === n ? '#fff' : INK_SOFT }}>
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

function PanneauAteliers({ ateliers, onAdd, onRename, onRemove }) {
  const [nom, setNom] = useState('');
  const ajouter = () => { if (nom.trim()) { onAdd(nom.trim()); setNom(''); } };
  return (
    <div>
      <SectionTitle sub="Les groupes dans lesquels se déroulent les séances.">Ateliers</SectionTitle>
      <Card>
        <div className="flex gap-2 mb-3">
          <Field value={nom} onChange={setNom} placeholder="Nom de l'atelier (ex. Groupe habiletés sociales)" onEnter={ajouter} />
          <Btn onClick={ajouter} className="px-4 shrink-0"><Plus size={18} /></Btn>
        </div>
        {ateliers.length === 0 ? (
          <Empty>Aucun atelier créé.</Empty>
        ) : (
          <div className="space-y-1.5">
            {ateliers.map((a) => (
              <EditableRow key={a.id} label={a.name} onRename={(v) => onRename(a.id, v)} onRemove={() => onRemove(a.id)} />
            ))}
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

function PanneauModeles({ templates, onRemove }) {
  return (
    <div>
      <SectionTitle sub="Objectifs types réutilisables, avec leur mode de cotation, leurs cibles et leur critère.">
        Modèles d'objectifs
      </SectionTitle>
      <Card>
        <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
          On les enregistre depuis l'écran Personnes accompagnées, et on les applique à la création
          d'un objectif.
        </p>
        {templates.length === 0 ? (
          <Empty>Aucun modèle enregistré.</Empty>
        ) : (
          <div className="space-y-1.5">
            {templates.map((t) => {
              const meta = TYPES[t.type];
              const Icon = meta.icon;
              return (
                <div key={t.id} className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: PAPER }}>
                  <Icon size={15} style={{ color: meta.color }} className="shrink-0" />
                  <span className="text-sm flex-1 min-w-0 break-words">{t.name}</span>
                  <button onClick={() => onRemove(t.id)} style={{ color: INK_SOFT }}><X size={15} /></button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
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
                style={{ color: g.independent ? '#D69A2D' : INK_SOFT }}>
                <Star size={15} fill={g.independent ? '#D69A2D' : 'none'} />
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
            <button onClick={() => setGIndep((v) => !v)} className="flex items-center gap-1.5 text-xs" style={{ color: gIndep ? '#D69A2D' : INK_SOFT }}>
              <Star size={14} fill={gIndep ? '#D69A2D' : 'none'} /> Compte comme réussite autonome
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
function PanneauDonnees({ appareil, onSetAppareil, retentionMonths, onSetRetention, onExportConfig, onExportBackup, onImportBackup }) {
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
          Deux fichiers très différents. Le second ne quitte pas l'établissement sans précaution.
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
          className="w-full rounded-2xl border-2 p-3.5 text-left"
          style={{ borderColor: INK, backgroundColor: CARD }}
        >
          <div className="text-sm font-medium mb-0.5" style={{ fontFamily: F_DISPLAY }}>Avec les données personnelles</div>
          <div className="text-xs" style={{ color: INK_SOFT }}>
            Sauvegarde complète : initiales, objectifs, cotations, crises et relevés de stabilité.
            C'est le seul moyen de récupérer l'historique après un effacement ou un changement
            d'appareil — et le seul fichier à protéger par mot de passe.
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
          Les séances, les crises et les relevés de stabilité plus anciens que cette durée sont
          supprimés automatiquement à l'ouverture de l'application. Exportez et transmettez vos
          rapports avant l'échéance : la suppression est définitive.
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {[{ v: 0, l: 'Aucune limite' }, { v: 6, l: '6 mois' }, { v: 12, l: '12 mois' }, { v: 24, l: '24 mois' }, { v: 36, l: '36 mois' }].map((o) => {
            const on = retentionMonths === o.v;
            return (
              <button key={o.v} onClick={() => onSetRetention(o.v)} className="rounded-lg px-3 py-2 text-xs border"
                style={{ borderColor: on ? INK : BORDER, backgroundColor: on ? INK : 'transparent', color: on ? '#fff' : INK_SOFT }}>
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

/* ==================== Écran 2 : personnes accompagnées et objectifs ==================== */
/* Création des personnes, objectifs et activation du suivi de stabilité au
   même endroit : la fiche d'une personne se tenait jusqu'ici à deux écrans de
   distance, une carte dans Gestion et une carte dans Personnes. */
function PanneauPersonnes({
  students, guidances, templates, premiereConfiguration,
  addStudent, removeStudent, renameStudent, onToggleStabilite,
  addObjective, removeObjective, updateObjective, duplicateObjective, toggleFavorite, changePhase, onSaveTemplate,
}) {
  const [openId, setOpenId] = useState(null);
  const [editingObj, setEditingObj] = useState(null);
  const [copyingObj, setCopyingObj] = useState(null);
  const [copyTargets, setCopyTargets] = useState([]);
  const [initials, setInitials] = useState('');

  const ajouter = () => {
    const v = initials.trim();
    if (!v) return;
    addStudent(v);
    setInitials('');
  };

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
          <p className="text-xs" style={{ color: INK_SOFT }}>
            Cette tablette est vierge. Commencez par créer les personnes accompagnées, puis leurs
            objectifs. Les ateliers et les intervenants se règlent ensuite depuis le menu — le bouton
            <strong> Menu</strong> en haut de cet écran. Aux ouvertures suivantes, l'application
            démarrera directement sur Session.
          </p>
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
          <Card key={s.id}>
            <button className="w-full flex items-center justify-between" onClick={() => setOpenId(openId === s.id ? null : s.id)}>
              <span className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white" style={{ backgroundColor: INK, fontFamily: F_DISPLAY }}>
                  {s.initials.replace(/\./g, '').slice(0, 3)}
                </span>
                <span className="text-left">
                  <span className="block font-semibold" style={{ fontFamily: F_DISPLAY }}>{s.initials}</span>
                  <span className="block text-xs" style={{ color: INK_SOFT }}>
                    {s.objectives.length} objectif{s.objectives.length !== 1 ? 's' : ''}
                    {s.suiviStabilite && ' · stabilité suivie'}
                  </span>
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
                  <button onClick={() => onToggleStabilite(s.id)} className="flex items-start gap-2.5 text-left w-full mt-2.5">
                    <span className="w-9 h-5 rounded-full relative shrink-0 mt-0.5" style={{ backgroundColor: s.suiviStabilite ? INK : BORDER }}>
                      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white" style={{ left: s.suiviStabilite ? '1.25rem' : '0.125rem', transition: 'left .15s' }} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium" style={{ fontFamily: F_DISPLAY }}>Suivi de stabilité</span>
                      <span className="block text-xs" style={{ color: INK_SOFT }}>
                        Ajoute une pastille en bas d'écran pour noter à tout moment son état — stable,
                        pré-crise, crise, post-crise. Sans activation, aucune pastille n'apparaît.
                      </span>
                    </span>
                  </button>
                </div>
                <div className="space-y-1.5 mb-3">
                  {s.objectives.map((o) => {
                    const meta = TYPES[o.type];
                    const Icon = meta.icon;
                    if (editingObj === o.id) {
                      return (
                        <ObjectiveForm
                          key={o.id}
                          initial={o}
                          guidances={guidances}
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
                              <button
                                onClick={() => {
                                  const actuelle = currentPhase(o).name;
                                  const suivante = DEFAULT_PHASES[(DEFAULT_PHASES.indexOf(actuelle) + 1) % DEFAULT_PHASES.length];
                                  if (window.confirm(`Passer « ${o.name} » en phase « ${suivante} » ?\n\nUn repère daté sera tracé sur la courbe de suivi.`)) {
                                    changePhase(s.id, o.id, suivante);
                                  }
                                }}
                                className="text-xs inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 border"
                                style={{ borderColor: BORDER, color: INK }}
                                title="Changer de phase"
                              >
                                <Flag size={11} /> {currentPhase(o).name}
                              </button>
                              {currentTarget(o) && (
                                <span className="text-xs inline-flex items-center gap-1 rounded-md px-1.5 py-0.5" style={{ backgroundColor: CARD, color: INK }}>
                                  <Target size={11} /> cible en cours : {currentTarget(o).name}
                                </span>
                              )}
                            </div>
                              <div className="text-xs" style={{ color: INK_SOFT }}>
                                {meta.short}
                                {o.type === 'trials' && (o.config.trialCount ? ` · ${o.config.trialCount} essais prévus` : ' · essais sans limite')}
                                {o.type === 'trials' && o.config.withTimer && (o.config.timerMode === 'countdown' && o.config.timerSeconds
                                  ? ` · limite ${fmtDuration(o.config.timerSeconds * 1000)}`
                                  : ' · chronométré')}
                                {o.type === 'interval' && ` · toutes les ${fmtDuration(intervalStepSec(o) * 1000)} · ${INTERVAL_MODE_SHORT[o.config.intervalMode] || 'momentané'} · ${(o.config.levels || []).length} niveaux`}
                                {(o.type === 'chaining' || o.type === 'balance') && ` · ${(o.config.steps || []).length} étapes`}
                                {o.type === 'timer' && (o.config.timerMode === 'countdown' && o.config.timerSeconds
                                  ? ` · ${fmtDuration(o.config.timerSeconds * 1000)}`
                                  : ' · chronomètre')}
                                {o.config.mastery && ` · acquis à ${o.config.mastery.threshold} % sur ${o.config.mastery.sessions} ${o.config.mastery.unit === 'days' ? 'jours' : 'séances'}`}
                                {objectiveTargets(o).length > 0 && ` · ${(o.masteredTargetIds || []).length}/${objectiveTargets(o).length} cibles acquises`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => toggleFavorite(s.id, o.id)} style={{ color: o.favorite ? '#D69A2D' : INK_SOFT }} title="Objectif prioritaire">
                              <Star size={15} fill={o.favorite ? '#D69A2D' : 'none'} />
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
                <ObjectiveEditor guidances={guidances} templates={templates} onAdd={(o) => addObjective(s.id, o)} />
              </div>
            )}
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}

function ObjectiveEditor({ guidances, templates, onAdd }) {
  const [open, setOpen] = useState(false);
  const [depuisModele, setDepuisModele] = useState(false);
  const [base, setBase] = useState(null);

  if (!open) {
    return (
      <div className="flex gap-2">
        <Btn variant="ghost" onClick={() => { setBase(null); setOpen(true); }} className="flex-1 text-sm">
          <Plus size={16} /> Ajouter un objectif
        </Btn>
        {templates && templates.length > 0 && (
          <Btn variant="ghost" onClick={() => setDepuisModele(true)} className="text-sm px-4" title="Depuis un modèle">
            <BookmarkPlus size={16} />
          </Btn>
        )}
        {depuisModele && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="rounded-2xl p-4 max-w-sm w-full max-h-[80vh] overflow-y-auto" style={{ backgroundColor: CARD }}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>Partir d'un modèle</span>
                <button onClick={() => setDepuisModele(false)} style={{ color: INK_SOFT }}><X size={18} /></button>
              </div>
              <div className="space-y-1.5">
                {templates.map((t) => {
                  const meta = TYPES[t.type];
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
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <ObjectiveForm
      guidances={guidances}
      initial={base ? { ...base, id: null } : undefined}
      onSubmit={(o) => { onAdd({ ...o, id: uid() }); setOpen(false); setBase(null); }}
      onCancel={() => { setOpen(false); setBase(null); }}
    />
  );
}

function ObjectiveForm({ initial, guidances, onSubmit, onCancel }) {
  const allGuidances = guidances && guidances.length ? guidances : DEFAULT_GUIDANCE;
  const init = initial || {};
  const initConfig = init.config || {};
  const [name, setName] = useState(init.name || '');
  const [type, setType] = useState(init.type || 'trials');
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
  const [useGuidance, setUseGuidance] = useState(!!initConfig.useGuidance);
  const [phaseName, setPhaseName] = useState(
    init.phaseHistory && init.phaseHistory.length ? init.phaseHistory[init.phaseHistory.length - 1].name : DEFAULT_PHASES[0]
  );
  const [withTimer, setWithTimer] = useState(!!initConfig.withTimer);
  const [timerMode, setTimerMode] = useState(initConfig.timerMode || 'chrono');
  const [timerMin, setTimerMin] = useState(initConfig.timerSeconds ? Math.floor(initConfig.timerSeconds / 60) : 5);
  const [timerSec, setTimerSec] = useState(initConfig.timerSeconds ? initConfig.timerSeconds % 60 : 0);
  const [levels, setLevels] = useState(initConfig.levels || DEFAULT_INTERVAL_LEVELS);
  const [newLevel, setNewLevel] = useState('');
  const [targetLevelId, setTargetLevelId] = useState(
    initConfig.targetLevelId || (initConfig.levels && initConfig.levels[0] && initConfig.levels[0].id) || DEFAULT_INTERVAL_LEVELS[0].id
  );
  const [threshold, setThreshold] = useState((initConfig.mastery || DEFAULT_MASTERY).threshold);
  const [masterySessions, setMasterySessions] = useState((initConfig.mastery || DEFAULT_MASTERY).sessions);
  const [masteryUnit, setMasteryUnit] = useState((initConfig.mastery || DEFAULT_MASTERY).unit || 'sessions');

  function submit() {
    if (!name.trim()) return;
    const config = {};
    if (type === 'trials') {
      config.trialCount = trialCount;
      config.withTimer = withTimer;
      if (withTimer) {
        config.timerMode = timerMode;
        if (timerMode === 'countdown') {
          config.timerSeconds = Math.min(3600, Math.max(5, (Number(timerMin) || 0) * 60 + (Number(timerSec) || 0)));
        }
      }
    }
    if (type === 'interval') {
      const pas = Math.min(3600, Math.max(10, (Number(intervalMin) || 0) * 60 + (Number(intervalSec) || 0)));
      config.intervalSeconds = pas;
      config.intervalMinutes = pas / 60; // conservé pour les versions antérieures
      config.intervalMode = intervalMode;
      config.levels = levels;
      config.targetLevelId = levels.some((l) => l.id === targetLevelId) ? targetLevelId : levels[0].id;
    }
    if (type === 'chaining' || type === 'balance') config.steps = steps;
    if (type === 'balance' && balanceSet.length) config.balanceOutcomes = balanceSet;
    if (type === 'probe') config.useGuidance = useGuidance;
    if (type === 'timer') {
      config.timerMode = timerMode;
      if (timerMode === 'countdown') {
        const m = Number(timerMin) || 0;
        const sec = Number(timerSec) || 0;
        config.timerSeconds = Math.min(3600, Math.max(5, m * 60 + sec));
      }
    }
    if (USES_GUIDANCE.includes(type) && guidanceSet.length) config.guidanceSet = guidanceSet;
    if (PERCENT_TYPES.includes(type)) {
      config.mastery = {
        threshold: threshold === '' || threshold === null ? 80 : Math.min(100, Math.max(1, Number(threshold))),
        sessions: masterySessions === '' || masterySessions === null ? 3 : Math.min(60, Math.max(1, Number(masterySessions))),
        unit: masteryUnit,
      };
      if (targets.length) config.targets = targets;
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

      <div>
        <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Phase en cours</div>
        <div className="flex gap-1.5 flex-wrap">
          {DEFAULT_PHASES.map((ph) => (
            <button key={ph} onClick={() => setPhaseName(ph)} className="rounded-lg px-3 py-2 text-xs border"
              style={{ borderColor: phaseName === ph ? INK : BORDER, backgroundColor: phaseName === ph ? INK : 'transparent', color: phaseName === ph ? '#fff' : INK_SOFT }}>
              {ph}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Mode de cotation</div>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(TYPES).map(([k, m]) => {
            const Icon = m.icon;
            const on = type === k;
            return (
              <button
                key={k}
                onClick={() => setType(k)}
                className="rounded-xl px-2.5 py-2.5 text-xs flex items-center gap-1.5 border text-left"
                style={{ borderColor: on ? m.color : BORDER, backgroundColor: on ? m.color + '18' : 'transparent', color: on ? m.color : INK_SOFT }}
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
              style={{ borderColor: !trialCount ? INK : BORDER, backgroundColor: !trialCount ? INK : 'transparent', color: !trialCount ? '#fff' : INK_SOFT }}>
              Sans limite
            </button>
            {[3, 5, 8, 10, 20].map((n) => (
              <button key={n} onClick={() => setTrialCount(n)} className="rounded-lg px-3.5 py-2 text-sm border"
                style={{ borderColor: trialCount === n ? INK : BORDER, backgroundColor: trialCount === n ? INK : 'transparent', color: trialCount === n ? '#fff' : INK_SOFT, fontFamily: F_MONO }}>
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
          <p className="text-xs mt-1.5 mb-3" style={{ color: INK_SOFT }}>
            Un nombre prévu sert de repère pendant la cotation, mais n'empêche jamais d'ajouter des essais supplémentaires.
          </p>

          <div className="rounded-xl px-3 py-3" style={{ backgroundColor: PAPER }}>
            <button onClick={() => setWithTimer((v) => !v)} className="flex items-center gap-1.5 text-sm">
              <span className="w-9 h-5 rounded-full relative shrink-0" style={{ backgroundColor: withTimer ? INK : BORDER }}>
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white" style={{ left: withTimer ? '1.25rem' : '0.125rem', transition: 'left .15s' }} />
              </span>
              Chronométrer chaque essai
            </button>
            {withTimer && (
              <div className="mt-3 space-y-3">
                <p className="text-xs" style={{ color: INK_SOFT }}>
                  Le temps court à partir de la consigne et se fige dès que l'essai est coté. Chaque essai
                  conserve sa durée, reprise dans les rapports.
                </p>
                <div className="flex gap-1.5">
                  {[{ k: 'chrono', l: 'Chronomètre' }, { k: 'countdown', l: 'Temps limite' }].map((m) => (
                    <button key={m.k} onClick={() => setTimerMode(m.k)} className="flex-1 rounded-lg py-2.5 text-sm border"
                      style={{ borderColor: timerMode === m.k ? INK : BORDER, backgroundColor: timerMode === m.k ? INK : 'transparent', color: timerMode === m.k ? '#fff' : INK_SOFT }}>
                      {m.l}
                    </button>
                  ))}
                </div>
                {timerMode === 'countdown' && (
                  <div className="flex gap-2 items-center">
                    <input type="number" inputMode="numeric" min="0" max="60" value={timerMin}
                      onChange={(e) => setTimerMin(e.target.value === '' ? '' : Number(e.target.value))}
                      onBlur={() => setTimerMin((v) => (v === '' || v === null ? 0 : Math.min(60, Math.max(0, Number(v)))))}
                      className="w-20 rounded-lg border px-2 py-2.5 text-sm bg-transparent text-center"
                      style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }} />
                    <span className="text-xs" style={{ color: INK_SOFT }}>min</span>
                    <input type="number" inputMode="numeric" min="0" max="59" value={timerSec}
                      onChange={(e) => setTimerSec(e.target.value === '' ? '' : Number(e.target.value))}
                      onBlur={() => setTimerSec((v) => (v === '' || v === null ? 0 : Math.min(59, Math.max(0, Number(v)))))}
                      className="w-20 rounded-lg border px-2 py-2.5 text-sm bg-transparent text-center"
                      style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }} />
                    <span className="text-xs" style={{ color: INK_SOFT }}>s</span>
                    <span className="text-xs ml-auto" style={{ color: INK_SOFT, fontFamily: F_MONO }}>
                      = {fmtDuration(Math.min(3600, Math.max(5, (Number(timerMin) || 0) * 60 + (Number(timerSec) || 0))) * 1000)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
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
                    style={{ borderColor: on ? INK : BORDER, backgroundColor: on ? INK : 'transparent', color: on ? '#fff' : INK }}>
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
                    style={{ borderColor: on ? INK : BORDER, backgroundColor: on ? INK : 'transparent', color: on ? '#fff' : INK_SOFT, fontFamily: F_MONO }}>
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
                    style={{ borderColor: targetLevelId === l.id ? INK : BORDER, backgroundColor: targetLevelId === l.id ? INK : 'transparent', color: targetLevelId === l.id ? '#fff' : INK_SOFT }}>
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {type === 'timer' && (
        <div className="space-y-3">
          <div>
            <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Fonctionnement</div>
            <div className="flex gap-1.5">
              {[{ k: 'chrono', l: 'Chronomètre' }, { k: 'countdown', l: 'Temps fixé' }].map((m) => (
                <button key={m.k} onClick={() => setTimerMode(m.k)} className="flex-1 rounded-lg py-2.5 text-sm border"
                  style={{ borderColor: timerMode === m.k ? INK : BORDER, backgroundColor: timerMode === m.k ? INK : 'transparent', color: timerMode === m.k ? '#fff' : INK_SOFT }}>
                  {m.l}
                </button>
              ))}
            </div>
          </div>

          {timerMode === 'countdown' && (
            <div>
              <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Durée, 60 minutes au maximum</div>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {[30, 60, 90, 120, 300, 600].map((total) => {
                  const m = Math.floor(total / 60);
                  const sec = total % 60;
                  const on = Number(timerMin) * 60 + Number(timerSec) === total;
                  return (
                    <button key={total} onClick={() => { setTimerMin(m); setTimerSec(sec); }}
                      className="rounded-lg px-3 py-2 text-sm border"
                      style={{ borderColor: on ? INK : BORDER, backgroundColor: on ? INK : 'transparent', color: on ? '#fff' : INK_SOFT, fontFamily: F_MONO }}>
                      {m ? `${m} min` : ''}{sec ? `${m ? ' ' : ''}${sec} s` : ''}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="number" inputMode="numeric" min="0" max="60" value={timerMin}
                  onChange={(e) => setTimerMin(e.target.value === '' ? '' : Number(e.target.value))}
                  onBlur={() => setTimerMin((v) => (v === '' || v === null ? 0 : Math.min(60, Math.max(0, Number(v)))))}
                  className="w-20 rounded-lg border px-2 py-2.5 text-sm bg-transparent text-center"
                  style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }}
                />
                <span className="text-xs" style={{ color: INK_SOFT }}>min</span>
                <input
                  type="number" inputMode="numeric" min="0" max="59" value={timerSec}
                  onChange={(e) => setTimerSec(e.target.value === '' ? '' : Number(e.target.value))}
                  onBlur={() => setTimerSec((v) => (v === '' || v === null ? 0 : Math.min(59, Math.max(0, Number(v)))))}
                  className="w-20 rounded-lg border px-2 py-2.5 text-sm bg-transparent text-center"
                  style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }}
                />
                <span className="text-xs" style={{ color: INK_SOFT }}>s</span>
                <span className="text-xs ml-auto" style={{ color: INK_SOFT, fontFamily: F_MONO }}>
                  = {fmtDuration(Math.min(3600, Math.max(5, (Number(timerMin) || 0) * 60 + (Number(timerSec) || 0))) * 1000)}
                </span>
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
          </div>

          {type === 'probe' && (
            <button onClick={() => setUseGuidance((v) => !v)} className="flex items-center gap-1.5 text-sm my-2">
              <span className="w-9 h-5 rounded-full relative shrink-0" style={{ backgroundColor: useGuidance ? INK : BORDER }}>
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white" style={{ left: useGuidance ? '1.25rem' : '0.125rem', transition: 'left .15s' }} />
              </span>
              Coter par guidance plutôt qu'en 1 / 0
            </button>
          )}

          {(type !== 'probe' || useGuidance) && (
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
                      style={{ color: g.independent ? '#D69A2D' : INK_SOFT }}
                      title="Compte comme réussite autonome"
                    >
                      <Star size={15} fill={g.independent ? '#D69A2D' : 'none'} />
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
                  <button onClick={() => setRIndep((v) => !v)} className="flex items-center gap-1.5 text-xs" style={{ color: rIndep ? '#D69A2D' : INK_SOFT }}>
                    <Star size={14} fill={rIndep ? '#D69A2D' : 'none'} /> Compte comme réussite autonome
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
          )}
        </div>
      )}

      {PERCENT_TYPES.includes(type) && (
        <div className="rounded-xl px-3 py-3" style={{ backgroundColor: PAPER }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Award size={14} style={{ color: INK_SOFT }} />
            <span className="text-xs font-medium" style={{ color: INK_SOFT }}>Critère d'acquisition</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm">À partir de</span>
            <input
              type="number" inputMode="numeric" min="1" max="100" value={threshold}
              /* On accepte la saisie telle quelle pendant la frappe, y compris
                 vide : borner à chaque caractère empêchait d'écrire « 85 »,
                 le « 8 » intermédiaire étant aussitôt réécrit. */
              onChange={(e) => setThreshold(e.target.value === '' ? '' : Number(e.target.value))}
              onBlur={() => setThreshold((v) => (v === '' || v === null ? 80 : Math.min(100, Math.max(1, Number(v)))))}
              className="w-16 rounded-lg border px-2 py-2 text-sm bg-transparent text-center"
              style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }}
            />
            <span className="text-sm">% sur</span>
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
                  style={{ borderColor: masteryUnit === u.k ? INK : BORDER, backgroundColor: masteryUnit === u.k ? INK : 'transparent', color: masteryUnit === u.k ? '#fff' : INK_SOFT }}>
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
                  style={{ color: o.reussite ? '#D69A2D' : INK_SOFT }} title="Compte comme réussite">
                  <Star size={15} fill={o.reussite ? '#D69A2D' : 'none'} />
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
                <button onClick={() => { setOReussite((v) => !v); setOExclu(false); }} className="flex items-center gap-1.5 text-xs" style={{ color: oReussite ? '#D69A2D' : INK_SOFT }}>
                  <Star size={14} fill={oReussite ? '#D69A2D' : 'none'} /> Réussite
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

      <div className="flex gap-2">
        <Btn onClick={submit} disabled={!name.trim() || (type === 'interval' && levels.length === 0) || ((type === 'chaining' || type === 'balance') && steps.length === 0)} className="flex-1 text-sm">
          {initial ? 'Enregistrer les modifications' : "Ajouter l'objectif"}
        </Btn>
        <Btn variant="ghost" onClick={onCancel} className="text-sm">Annuler</Btn>
      </div>
    </div>
  );
}

/* ==================== Écran 3 : session ==================== */
function SessionScreen({ students, ateliers, intervenants, sessions, crises, guidances, onEditSession, onDeleteSession, onDeleteAllSessions, onSetAtelierGroup, notify, onOuvrirConfiguration, activeSession, setActiveSession, onFinish }) {
  if (activeSession) {
    return <SessionRunning session={activeSession} setSession={setActiveSession} students={students} ateliers={ateliers} intervenants={intervenants} crises={crises} guidances={guidances} onFinish={onFinish} />;
  }
  return (
    <SessionSetup
      students={students} ateliers={ateliers} intervenants={intervenants} sessions={sessions}
      onEditSession={onEditSession} onDeleteSession={onDeleteSession} onDeleteAllSessions={onDeleteAllSessions}
      onSetAtelierGroup={onSetAtelierGroup} notify={notify} onOuvrirConfiguration={onOuvrirConfiguration}
      onStart={setActiveSession}
    />
  );
}

function SessionSetup({ students, ateliers, intervenants, sessions, onEditSession, onDeleteSession, onDeleteAllSessions, onSetAtelierGroup, notify, onOuvrirConfiguration, onStart }) {
  const [atelierId, setAtelierId] = useState(null);
  const [intervenantId, setIntervenantId] = useState(null);
  const [studentIds, setStudentIds] = useState([]);
  const [selected, setSelected] = useState({});
  const [autoApplied, setAutoApplied] = useState(false);
  const [mode, setMode] = useState('atelier');

  /* En mode Balance Program, seuls les objectifs de ce type sont proposés :
     chaque personne a le sien. Il reste disponible dans un atelier classique. */
  const visibleObjectives = (st) => (mode === 'balance' ? st.objectives.filter((o) => o.type === 'balance') : st.objectives);

  /* Objectifs prioritaires propres à cet atelier : une même personne peut avoir des
     priorités différentes d'un atelier à l'autre. Distinct du prioritaire posé
     à la création de l'objectif, qui vaut lui quel que soit l'atelier. */
  const [atelierFavorites, setAtelierFavorites] = useState([]);
  const [doubleCotation, setDoubleCotation] = useState(false);

  /* Une configuration d'atelier mémorisée n'a pas à être revérifiée en entier
     à chaque lancement. Quand elle s'applique, seul ce qui diffère de
     l'habituel est montré — les objectifs apparus depuis la mémorisation — et
     le détail complet reste à un appui de distance. */
  const [depuisMemoire, setDepuisMemoire] = useState(false);
  const [nouveautes, setNouveautes] = useState({});
  const [detailObjectifs, setDetailObjectifs] = useState(false);

  const applyGroup = (ids, savedObjectives, known, memoire) => {
    const next = {};
    const neufs = {};
    let nbNouveaux = 0;
    ids.forEach((id) => {
      const st = students.find((s) => s.id === id);
      if (!st) return;
      const visibles = visibleObjectives(st);
      const visiblesIds = visibles.map((o) => o.id);
      const saved = savedObjectives && savedObjectives[id];
      if (!saved) { next[id] = visiblesIds; return; }

      // On ne retient que les objectifs encore existants et visibles dans ce mode
      const retenus = saved.filter((oid) => visiblesIds.includes(oid));

      /* Objectifs créés depuis la mémorisation : cochés d'office, pour qu'un
         nouvel objectif n'échappe pas à un atelier déjà configuré. Pour les
         configurations enregistrées avant l'ajout de ce repère, on se rabat
         sur les objectifs marqués prioritaires. */
      const nouveaux = visibles
        .filter((o) => !saved.includes(o.id))
        .filter((o) => (known ? !known.includes(o.id) : !!o.favorite))
        .map((o) => o.id);

      nbNouveaux += nouveaux.length;
      if (nouveaux.length) neufs[id] = nouveaux;
      next[id] = [...retenus, ...nouveaux];
      if (!next[id].length) next[id] = visiblesIds;
    });

    setStudentIds(ids);
    setSelected(next);
    setAutoApplied(true);
    setDepuisMemoire(!!memoire);
    setNouveautes(neufs);
    setDetailObjectifs(false);
    if (nbNouveaux > 0) {
      setTimeout(() => notify(`${nbNouveaux} nouvel${nbNouveaux > 1 ? 'x' : ''} objectif${nbNouveaux > 1 ? 's' : ''} ajouté${nbNouveaux > 1 ? 's' : ''} à cet atelier`), 400);
    }
  };

  const pickAtelier = (id) => {
    const next = atelierId === id ? null : id;
    setAtelierId(next);
    if (!next) { setAtelierFavorites([]); setDepuisMemoire(false); return; }
    const a = ateliers.find((x) => x.id === next);
    const usual = a && a.usualStudentIds ? a.usualStudentIds.filter((sid) => students.some((s) => s.id === sid)) : [];
    setAtelierFavorites((a && a.favoriteObjectiveIds) || []);
    if (usual.length && (studentIds.length === 0 || autoApplied)) applyGroup(usual, a && a.usualObjectives, a && a.knownObjectiveIds, true);
  };

  const toggleStudent = (id) => {
    setAutoApplied(false);
    setStudentIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    setSelected((sel) => {
      if (sel[id]) { const n = { ...sel }; delete n[id]; return n; }
      const st = students.find((s) => s.id === id);
      return { ...sel, [id]: st ? visibleObjectives(st).map((o) => o.id) : [] };
    });
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

  /* Relance de la dernière séance : reprend la même configuration (mode,
     atelier, personnes, objectifs, prioritaires d'atelier), en écartant les
     objectifs supprimés depuis — même logique de repli que la mémorisation
     d'atelier. */
  const derniereSeance = sessions && sessions.length
    ? sessions.reduce((a, s) => (new Date(s.date) > new Date(a.date) ? s : a))
    : null;

  function relancerDerniere() {
    const sess = derniereSeance;
    if (!sess) return;
    const ids = (sess.studentIds || []).filter((sid) => students.some((s) => s.id === sid));
    if (!ids.length) return;
    setMode(sess.mode === 'balance' ? 'balance' : 'atelier');
    setAtelierId(sess.atelierId || null);
    setIntervenantId(sess.intervenantId || null);
    setAtelierFavorites([]);
    setDoubleCotation(!!sess.doubleCotation);
    applyGroup(ids, sess.selectedObjectives);
  }

  const currentAtelier = ateliers.find((a) => a.id === atelierId);

  /* Le bouton de mémorisation n'apparaît que si la configuration en cours
     diffère de celle déjà enregistrée pour cet atelier. */
  const sameAsUsual = (() => {
    if (!currentAtelier) return false;
    const savedIds = currentAtelier.usualStudentIds || [];
    if (savedIds.length !== studentIds.length || !savedIds.every((id) => studentIds.includes(id))) return false;
    const savedFav = currentAtelier.favoriteObjectiveIds || [];
    if (savedFav.length !== atelierFavorites.length || !savedFav.every((id) => atelierFavorites.includes(id))) return false;
    const savedObj = currentAtelier.usualObjectives || {};
    return studentIds.every((id) => {
      const a = savedObj[id] || [];
      const b = selected[id] || [];
      return a.length === b.length && a.every((oid) => b.includes(oid));
    });
  })();

  const ready = studentIds.length > 0 && studentIds.every((id) => (selected[id] || []).length > 0);

  function start() {
    primeAudio();
    const snapshot = {};
    const data = {};
    studentIds.forEach((sid) => {
      const st = students.find((s) => s.id === sid);
      data[sid] = {};
      (selected[sid] || []).forEach((oid) => {
        const obj = st.objectives.find((o) => o.id === oid);
        const cible = currentTarget(obj);
        // Prioritaire si l'objectif l'est en soi, ou s'il l'est pour cet atelier
        const favorite = !!obj.favorite || (mode === 'atelier' && atelierFavorites.includes(oid));
        snapshot[oid] = { ...obj, favorite, activeTargetName: cible ? cible.name : null, activePhaseName: currentPhase(obj).name };
        data[sid][oid] = { ...emptyEntry(obj), targetId: cible ? cible.id : null };
      });
    });
    onStart({
      id: uid(),
      date: new Date().toISOString(),
      startedAt: Date.now(),
      mode,
      atelierId: mode === 'balance' ? null : atelierId,
      intervenantId,
      studentIds,
      selectedObjectives: selected,
      objectiveSnapshot: snapshot,
      notes: {},
      data,
    });
  }

  if (students.length === 0) {
    return (
      <div>
        <SectionTitle>Session</SectionTitle>
        <Empty>Aucune personne accompagnée n'est enregistrée sur cette tablette.</Empty>
        <Btn onClick={onOuvrirConfiguration} className="w-full mt-3">
          <Users size={17} /> Créer une personne accompagnée
        </Btn>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle sub="Choisissez l'atelier, les personnes présentes et les objectifs travaillés.">Nouvelle session</SectionTitle>

      {derniereSeance && (
        <button
          onClick={relancerDerniere}
          className="w-full rounded-2xl border p-3.5 mb-4 flex items-center gap-3 text-left"
          style={{ borderColor: BORDER, backgroundColor: CARD }}
        >
          <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: PAPER }}>
            <RotateCcw size={16} style={{ color: INK }} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">
              Relancer la dernière séance
            </span>
            <span className="block text-xs truncate" style={{ color: INK_SOFT }}>
              {(() => {
                const a = ateliers.find((x) => x.id === derniereSeance.atelierId);
                const nom = a ? a.name : derniereSeance.mode === 'balance' ? 'Balance Program' : 'Séance libre';
                return `${nom} · ${new Date(derniereSeance.date).toLocaleDateString('fr-FR')} · ${derniereSeance.studentIds.length} personne${derniereSeance.studentIds.length !== 1 ? 's' : ''}`;
              })()}
            </span>
          </span>
        </button>
      )}

      <div className="flex gap-1.5 mb-4">
        {[
          { k: 'atelier', label: 'Atelier', icon: Layers },
          { k: 'balance', label: 'Balance Program', icon: Route },
        ].map((m) => {
          const Icon = m.icon;
          const on = mode === m.k;
          return (
            <button
              key={m.k}
              onClick={() => { setMode(m.k); setStudentIds([]); setSelected({}); setAutoApplied(false); setDepuisMemoire(false); setNouveautes({}); }}
              className="flex-1 rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-1.5 border"
              style={{ fontFamily: F_DISPLAY, borderColor: on ? INK : BORDER, backgroundColor: on ? INK : 'transparent', color: on ? '#fff' : INK_SOFT }}
            >
              <Icon size={15} /> {m.label}
            </button>
          );
        })}
      </div>

      {mode === 'balance' && (
        <p className="text-xs mb-4" style={{ color: INK_SOFT }}>
          Sélectionnez les personnes concernées : chacune cotera son propre Balance Program.
        </p>
      )}

      {mode === 'atelier' && (
      <Card className="mb-4">
        <div className="text-xs mb-2" style={{ color: INK_SOFT }}>Atelier <span style={{ opacity: 0.7 }}>— facultatif, appuyez à nouveau pour retirer</span></div>
        <div className="space-y-1.5">
          {ateliers.map((a) => (
            <button key={a.id} onClick={() => pickAtelier(a.id)} className="w-full rounded-xl px-3 py-3 text-left flex items-center justify-between border"
              style={{ borderColor: atelierId === a.id ? INK : BORDER, backgroundColor: atelierId === a.id ? INK : 'transparent', color: atelierId === a.id ? '#fff' : INK }}>
              <span>
                {a.name}
                {a.usualStudentIds && a.usualStudentIds.length > 0 && (
                  <span className="block text-xs mt-0.5" style={{ opacity: 0.7 }}>
                    Mémorisé : {a.usualStudentIds.length} personne{a.usualStudentIds.length !== 1 ? 's' : ''}
                    {a.favoriteObjectiveIds && a.favoriteObjectiveIds.length > 0 &&
                      ` · ${a.favoriteObjectiveIds.length} prioritaire${a.favoriteObjectiveIds.length !== 1 ? 's' : ''}`}
                  </span>
                )}
              </span>
              {atelierId === a.id && <Check size={16} className="shrink-0" />}
            </button>
          ))}
        </div>
      </Card>
      )}

      {intervenants.length > 0 && (
        <Card className="mb-4">
          <div className="text-xs mb-2" style={{ color: INK_SOFT }}>Intervenant qui cote</div>
          <div className="flex flex-wrap gap-2">
            {intervenants.map((i) => {
              const on = intervenantId === i.id;
              return (
                <button key={i.id} onClick={() => setIntervenantId(on ? null : i.id)} className="rounded-xl px-4 py-2.5 border text-sm"
                  style={{ borderColor: on ? INK : BORDER, backgroundColor: on ? INK : 'transparent', color: on ? '#fff' : INK_SOFT }}>
                  {i.name}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="mb-4">
        <button onClick={() => setDoubleCotation((v) => !v)} className="flex items-start gap-2.5 text-left w-full">
          <span className="w-9 h-5 rounded-full relative shrink-0 mt-0.5" style={{ backgroundColor: doubleCotation ? INK : BORDER }}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white" style={{ left: doubleCotation ? '1.25rem' : '0.125rem', transition: 'left .15s' }} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium" style={{ fontFamily: F_DISPLAY }}>Deux observateurs en parallèle</span>
            <span className="block text-xs" style={{ color: INK_SOFT }}>
              À cocher par chacun des deux intervenants qui cotent cette même séance, chacun sur son
              appareil. DatABA Manager repérera ensuite les deux relevés pour mesurer leur accord.
            </span>
          </span>
        </button>
      </Card>

      <Card className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: INK_SOFT }}>Personnes présentes</span>
          {mode === 'atelier' && atelierId && studentIds.length > 0 && !sameAsUsual && (
            <button
              onClick={() => {
                const known = studentIds.flatMap((sid) => {
                  const st = students.find((x) => x.id === sid);
                  return st ? st.objectives.map((o) => o.id) : [];
                });
                onSetAtelierGroup(atelierId, { studentIds, objectives: selected, favorites: atelierFavorites, known });
                notify('Configuration mémorisée pour cet atelier');
              }}
              className="text-xs flex items-center gap-1"
              style={{ color: INK_SOFT }}
            >
              <Star size={12} /> Mémoriser cette configuration
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {students.map((s) => {
            const on = studentIds.includes(s.id);
            return (
              <button key={s.id} onClick={() => toggleStudent(s.id)} className="rounded-xl px-4 py-2.5 border font-semibold text-sm"
                style={{ fontFamily: F_DISPLAY, borderColor: on ? INK : BORDER, backgroundColor: on ? INK : 'transparent', color: on ? '#fff' : INK_SOFT }}>
                {s.initials}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Configuration mémorisée appliquée : on ne montre que ce qui diffère de
          l'habituel, plutôt que de redérouler toute la liste à revérifier. */}
      {depuisMemoire && !detailObjectifs && studentIds.length > 0 && (() => {
        const nbObjectifs = studentIds.reduce((n, sid) => n + (selected[sid] || []).length, 0);
        const lignesNeuves = Object.keys(nouveautes).flatMap((sid) => {
          const st = students.find((x) => x.id === sid);
          if (!st) return [];
          return nouveautes[sid]
            .map((oid) => st.objectives.find((o) => o.id === oid))
            .filter(Boolean)
            .map((o) => ({ cle: `${sid}-${o.id}`, initiales: st.initials, nom: o.name, type: o.type }));
        });
        return (
          <Card className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Star size={16} style={{ color: '#D69A2D' }} />
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
                    const meta = TYPES[l.type];
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
                {mode === 'balance' ? 'Aucun Balance Program défini pour cette personne.' : 'Aucun objectif défini pour cette personne.'}
              </div>
            ) : (
              <div className="space-y-1.5">
                {visibleObjectives(st).map((o) => {
                  const on = (selected[sid] || []).includes(o.id);
                  const meta = TYPES[o.type];
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
                            <span className="text-xs ml-1.5" style={{ color: '#D69A2D' }}>prioritaire</span>
                          )}
                        </span>
                        {on && <Check size={15} style={{ color: meta.color }} className="shrink-0" />}
                      </button>
                      {/* Prioritaire pour cet atelier seulement */}
                      {mode === 'atelier' && atelierId && on && !o.favorite && (
                        <button
                          onClick={() => toggleAtelierFavorite(o.id)}
                          className="shrink-0"
                          style={{ color: favAtelier ? '#D69A2D' : INK_SOFT }}
                          title="Prioritaire pour cet atelier"
                        >
                          <Star size={15} fill={favAtelier ? '#D69A2D' : 'none'} />
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

      <Btn onClick={start} disabled={!ready} className="w-full mt-2">
        <Play size={17} /> Lancer les cotations
      </Btn>

      {sessions && sessions.length > 0 && (
        <div className="mt-8">
          <div className="text-xs uppercase tracking-wide mb-2" style={{ color: INK_SOFT }}>
            Séances enregistrées — <span style={{ fontFamily: F_MONO }}>{sessions.length}</span> au total
          </div>
          <p className="text-xs mb-2" style={{ color: INK_SOFT }}>
            Dépliez un jour, puis appuyez sur une séance pour corriger ses cotations. Les rapports et
            les fichiers destinés à DatABA Manager se génèrent depuis l'écran <strong>Export</strong>.
          </p>
          <ListeParJour
            items={sessions}
            dateDe={(s) => s.date}
            renderItem={(s) => {
              const a = ateliers.find((x) => x.id === s.atelierId);
              return (
                <div key={s.id} className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: BORDER, backgroundColor: PAPER }}>
                  <button className="flex-1 text-left min-w-0" onClick={() => onEditSession(s)}>
                    <div className="text-sm font-medium truncate">{a ? a.name : s.mode === 'balance' ? 'Balance Program' : 'Séance libre'}</div>
                    <div className="text-xs" style={{ color: INK_SOFT }}>
                      {timeShort(s.date)} · {s.studentIds.length} personne{s.studentIds.length !== 1 ? 's' : ''}
                      {s.doubleCotation && ' · double cotation'}
                    </div>
                  </button>
                  <button
                    onClick={() => { if (window.confirm('Supprimer définitivement cette séance ?')) onDeleteSession(s.id); }}
                    style={{ color: INK_SOFT }}
                    className="shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            }}
          />
          {sessions.length > 1 && (
            <button
              onClick={onDeleteAllSessions}
              className="w-full mt-2 rounded-xl border px-3 py-2 text-xs flex items-center justify-center gap-1.5"
              style={{ borderColor: BORDER, color: INK_SOFT, backgroundColor: CARD }}
            >
              <Trash2 size={13} /> Supprimer toutes les séances enregistrées
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SessionRunning({ session, setSession, students, ateliers, intervenants, crises, guidances, onFinish }) {
  const isEdit = !!session.isEdit;
  const [currentId, setCurrentId] = useState(session.studentIds[0]);
  const [viewMode, setViewMode] = useState('priority');
  const [now, setNow] = useState(Date.now());
  const [soundOn, setSoundOn] = useState(true);
  const [vibrateOn, setVibrateOn] = useState(true);
  const [wakeOk, setWakeOk] = useState(false);
  const stepsRef = useRef({});
  const [expanded, setExpanded] = useState(null); // { sid, oid } de l'objectif agrandi

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
  const gridStyle = {
    zoom,
    columnWidth: '280px',
    columnGap: '0.75rem',
  };
  const gridItemStyle = {
    breakInside: 'avoid',
    WebkitColumnBreakInside: 'avoid',
    pageBreakInside: 'avoid',
    display: 'inline-block',
    width: '100%',
    marginBottom: '0.75rem',
  };
  const cotationRef = useRef(null);

  /* Réordonne les objectifs d'une personne. En vue Prioritaires on ne déplace
     qu'un sous-ensemble : les positions occupées par ce sous-ensemble dans la
     liste complète sont réutilisées, l'ordre des autres reste intact. */
  /* Liste à plat des objectifs prioritaires, toutes personnes confondues.
     L'ordre choisi par l'éducateur est conservé dans la séance ; les objectifs
     qui n'y figurent pas encore sont ajoutés à la suite. */
  const priorityItems = (() => {
    const naturel = [];
    session.studentIds.forEach((sid) => {
      (session.selectedObjectives[sid] || []).forEach((oid) => {
        const o = session.objectiveSnapshot[oid];
        if (!o) return;
        /* En séance Balance Program, la cotation doit être accessible sans
           passer par la vue par personne : elle figure d'office ici. */
        const autoBalance = session.mode === 'balance' && o.type === 'balance';
        if (o.favorite || autoBalance) naturel.push(`${sid}|${oid}`);
      });
    });
    const memorise = session.priorityOrder || [];
    return [...memorise.filter((k) => naturel.includes(k)), ...naturel.filter((k) => !memorise.includes(k))];
  })();

  /* Zone dominante pour les Balance Program, zone latérale pour le reste */
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

  function togglePause() {
    setSession((s0) => {
      if (s0.pausedAt) {
        return { ...s0, pausedMs: (s0.pausedMs || 0) + (Date.now() - s0.pausedAt), pausedAt: null };
      }
      // On arrête les chronomètres en cours pour ne pas compter le temps de pause
      const stamp = Date.now();
      const data = {};
      Object.entries(s0.data || {}).forEach(([sid, objs]) => {
        data[sid] = {};
        Object.entries(objs).forEach(([oid, e]) => {
          data[sid][oid] =
            e && e.running && e.startedAt
              ? { ...e, running: false, elapsedMs: (e.elapsedMs || 0) + (stamp - e.startedAt), startedAt: null }
              : e;
        });
      });
      return { ...s0, data, pausedAt: stamp };
    });
  }

  /* Renforcement : pendant qu'il court, les cotations de la personne sont
     suspendues. On mesure ainsi le temps d'activité et le temps de renforcement. */
  const renfoDe = (sid) => (session.reinforcement && session.reinforcement[sid]) || { running: false, startedAt: null, totalMs: 0 };
  const renfoTotal = (sid) => {
    const r = renfoDe(sid);
    return (r.totalMs || 0) + (r.running && r.startedAt ? now - r.startedAt : 0);
  };
  const enRenfo = (sid) => !!renfoDe(sid).running;

  function toggleRenfo(sid) {
    setSession((s0) => {
      const cur = (s0.reinforcement && s0.reinforcement[sid]) || { running: false, startedAt: null, totalMs: 0 };
      let next;
      let data = s0.data;
      if (cur.running) {
        next = { running: false, startedAt: null, totalMs: (cur.totalMs || 0) + (Date.now() - cur.startedAt) };
      } else {
        next = { running: true, startedAt: Date.now(), totalMs: cur.totalMs || 0 };
        // Les chronomètres en cours de cette personne sont figés
        const stamp = Date.now();
        const objs = s0.data[sid] || {};
        const maj = {};
        Object.entries(objs).forEach(([oid, e]) => {
          maj[oid] = e && e.running && e.startedAt
            ? { ...e, running: false, elapsedMs: (e.elapsedMs || 0) + (stamp - e.startedAt), pendingMs: (e.pendingMs || 0) + (stamp - e.startedAt), startedAt: null }
            : e;
        });
        data = { ...s0.data, [sid]: maj };
      }
      return { ...s0, data, reinforcement: { ...(s0.reinforcement || {}), [sid]: next } };
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

  const pausedTotal = session.pausedMs || 0;
  const isPaused = !!session.pausedAt;
  const elapsed = isEdit
    ? Math.max(0, (session.endedAt || session.startedAt) - session.startedAt - pausedTotal)
    : Math.max(0, (isPaused ? session.pausedAt : now) - session.startedAt - pausedTotal);

  return (
    <div>
      <div className="flex flex-col gap-2 mb-4 landscape:flex-row landscape:items-start landscape:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate" style={{ fontFamily: F_DISPLAY }}>{atelier ? atelier.name : session.mode === 'balance' ? 'Balance Program' : 'Séance libre'}</h1>
          <p className="text-sm" style={{ color: INK_SOFT }}>
            {isEdit ? <>Correction · {new Date(session.date).toLocaleDateString('fr-FR')} {timeShort(session.date)}</> : <span style={{ fontFamily: F_MONO }}>{fmtClock(elapsed)}</span>}
            {intervenant && <> · {intervenant.name}</>}
            {!isEdit && wakeOk && <> · <Sun size={12} className="inline" /> écran maintenu</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {hasInterval && !isEdit && (
            <button
              onClick={() => { const next = !soundOn; setSoundOn(next); if (next) { primeAudio(); beep(); } }}
              className="rounded-xl px-3 py-2.5 border"
              style={{ borderColor: BORDER, color: soundOn ? INK : INK_SOFT, backgroundColor: CARD }}
              title={soundOn ? 'Alerte sonore activée' : 'Alerte sonore coupée'}
            >
              {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
          )}
          {hasInterval && !isEdit && vibrateSupported() && (
            <button
              onClick={() => {
                const next = !vibrateOn;
                setVibrateOn(next);
                if (next) { try { navigator.vibrate([200, 100, 200]); } catch (e) {} }
              }}
              className="rounded-xl px-3 py-2.5 border"
              style={{ borderColor: BORDER, color: vibrateOn ? INK : INK_SOFT, backgroundColor: CARD }}
              title={vibrateOn ? 'Vibration activée' : 'Vibration coupée'}
            >
              <Vibrate size={17} />
            </button>
          )}
          {isEdit && (
            <Btn variant="ghost" onClick={() => setSession(null)} className="text-sm py-2.5">Annuler</Btn>
          )}
          <button
            onClick={cycleZoom}
            className="rounded-xl px-3 py-2.5 border text-xs font-medium"
            style={{ borderColor: BORDER, color: INK_SOFT, backgroundColor: CARD, fontFamily: F_MONO }}
            title="Densité d'affichage : plus d'objectifs à l'écran"
          >
            {(ZOOM_LEVELS.find((z) => z.v === zoom) || ZOOM_LEVELS[0]).l}
          </button>
          {!isEdit && (
            <button
              onClick={togglePause}
              className="rounded-xl px-3 py-2.5 border"
              style={{ borderColor: isPaused ? INK : BORDER, backgroundColor: isPaused ? INK : CARD, color: isPaused ? '#fff' : INK_SOFT }}
              title={isPaused ? 'Reprendre la séance' : 'Mettre en pause'}
            >
              {isPaused ? <Play size={17} /> : <Pause size={17} />}
            </button>
          )}
          {!isEdit && (
            <button
              onClick={() => {
                if (window.confirm('Abandonner cette séance ? Toutes les cotations en cours seront perdues.')) setSession(null);
              }}
              className="rounded-xl px-3 py-2.5 border"
              style={{ borderColor: BORDER, color: INK_SOFT, backgroundColor: CARD }}
              title="Abandonner la séance"
            >
              <X size={17} />
            </button>
          )}
          <Btn variant="outline" onClick={() => onFinish(finalizeSession(session))} className="text-sm py-2.5">
            <Save size={16} /> {isEdit ? 'Valider' : 'Enregistrer'}
          </Btn>
        </div>
      </div>

      {(() => {
        const nb = Object.values(session.hidden || {}).reduce((a, l) => a + l.length, 0);
        return nb > 0 ? (
          <button
            onClick={() => setSession((s0) => ({ ...s0, hidden: {} }))}
            className="w-full rounded-xl border px-3 py-2 mb-4 text-xs flex items-center justify-center gap-1.5"
            style={{ borderColor: BORDER, color: INK_SOFT, backgroundColor: CARD }}
          >
            <Eye size={13} /> {nb} objectif{nb > 1 ? 's' : ''} masqué{nb > 1 ? 's' : ''} — tout réafficher
          </button>
        ) : null;
      })()}

      {isPaused && (
        <div className="rounded-xl px-3 py-2.5 mb-4 flex items-center gap-2 text-sm" style={{ backgroundColor: INK, color: '#fff' }}>
          <PauseCircle size={16} />
          Séance en pause — le chronomètre et les intervalles sont arrêtés.
        </div>
      )}

      {/* Mini-curseur : bascule prioritaires / tous les objectifs.
          Réagit aussi au balayage sur la zone de cotation. */}
      <div className="flex justify-center mb-4">
        <div className="relative flex rounded-full p-1 w-full max-w-xs" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <div
            className="absolute top-1 bottom-1 rounded-full"
            style={{
              left: viewMode === 'priority' ? '0.25rem' : 'calc(50% - 0.125rem)',
              width: 'calc(50% - 0.125rem)',
              backgroundColor: INK,
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
                style={{ fontFamily: F_DISPLAY, color: on ? '#fff' : INK_SOFT, transition: 'color .2s' }}>
                <Icon size={15} /> {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {!isEdit && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {session.studentIds.map((sid) => {
            const st = students.find((x) => x.id === sid);
            if (!st) return null;
            const actif = enRenfo(sid);
            const total = renfoTotal(sid);
            return (
              <button
                key={sid}
                onClick={() => toggleRenfo(sid)}
                className="rounded-xl px-3 py-2 text-sm flex items-center gap-1.5 border"
                style={{
                  fontFamily: F_DISPLAY,
                  borderColor: actif ? '#D69A2D' : BORDER,
                  backgroundColor: actif ? '#D69A2D' : CARD,
                  color: actif ? '#fff' : INK_SOFT,
                }}
                title={actif ? 'Reprendre les cotations' : 'Mettre en renforcement'}
              >
                <span className="font-semibold">{st.initials}</span>
                <Gift size={14} />
                {total > 0 && <span style={{ fontFamily: F_MONO }}>{fmtClock(total)}</span>}
              </button>
            );
          })}
        </div>
      )}

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
                    paused={enRenfo(sid)}
                    onStudentClick={() => { setCurrentId(sid); setViewMode('student'); }}
                    hidden={hiddenFor(sid).includes(oid)}
                    onToggleHidden={() => toggleHidden(sid, oid)}
                    onExpand={() => setExpanded({ sid, oid })}
                    onChange={(p) => updateEntry(sid, oid, p)}
                  />
                );
              };

              /* Sans Balance Program, un flux unique suffit. */
              if (balanceKeys.length === 0) {
                return (
                  <ReorderList
                    items={priorityItems}
                    keyOf={(k) => k}
                    onReorder={reorderPriority}
                    style={gridStyle}
                    itemStyle={gridItemStyle}
                    renderItem={carte}
                  />
                );
              }

              /* Avec Balance Program : il occupe la zone principale, les autres
                 objectifs prioritaires passent sur le côté. Deux Balance ou plus
                 se placent côte à côte dans cette zone. */
              const styleBalance = {
                zoom,
                columnWidth: balanceKeys.length > 1 ? '340px' : '100%',
                columnGap: '0.75rem',
              };
              const styleCote = { zoom, columnWidth: '260px', columnGap: '0.75rem' };

              return (
                <div className="flex flex-col landscape:flex-row gap-3 items-start">
                  <div className="w-full landscape:flex-[3] min-w-0">
                    <ReorderList
                      items={balanceKeys}
                      keyOf={(k) => k}
                      onReorder={reorderPriority}
                      style={styleBalance}
                      itemStyle={gridItemStyle}
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
                        style={styleCote}
                        itemStyle={gridItemStyle}
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
                style={gridStyle}
                itemStyle={gridItemStyle}
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
                      paused={enRenfo(currentId)}
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

        {/* Rail de navigation entre personnes */}
        <div className="shrink-0 flex flex-col gap-2 sticky top-20 self-start">
          {session.studentIds.map((sid) => {
            const st = students.find((s) => s.id === sid);
            if (!st) return null;
            const on = viewMode === 'student' && sid === currentId;
            return (
              <button
                key={sid}
                onClick={() => { setCurrentId(sid); setViewMode('student'); }}
                className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-transform active:scale-95"
                style={{
                  fontFamily: F_DISPLAY,
                  backgroundColor: on ? INK : CARD,
                  color: on ? '#fff' : INK_SOFT,
                  borderColor: on ? INK : BORDER,
                }}
              >
                {st.initials.replace(/\./g, '').slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ObjectiveCard({ obj, entry, now, elapsed, session, crises, studentId, guidances, hidden, paused, onToggleHidden, onExpand, onChange, expandedView, studentLabel, onStudentClick }) {
  /* Double-appui sur l'intitulé : agrandit la fiche. On le détecte à la main,
     l'événement natif de double-clic étant peu fiable au toucher sur iOS. */
  const dernierAppui = useRef(0);
  /* Autorisation ponctuelle de coter pendant un renforcement. Elle retombe
     dès que le renforcement se termine, pour ne pas rester active à l'insu. */
  const [forcer, setForcer] = useState(false);
  useEffect(() => {
    if (!paused) setForcer(false);
  }, [paused]);
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
  const meta = TYPES[obj.type];
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
            style={{ fontFamily: F_DISPLAY, backgroundColor: INK, color: '#fff' }}
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
      {paused && !forcer && (
        <button
          onClick={() => {
            if (window.confirm("Coter malgré le renforcement ?\n\nLe temps de renforcement continue d'être décompté : la cotation sera enregistrée, mais elle porte sur un moment hors activité.")) {
              setForcer(true);
            }
          }}
          className="mt-2 w-full text-xs flex items-center justify-center gap-1.5 rounded-lg px-2 py-2"
          style={{ backgroundColor: '#D69A2D', color: '#fff' }}
        >
          <Gift size={12} /> En renforcement — appuyer pour coter quand même
        </button>
      )}
      {paused && forcer && (
        <div className="mt-2 text-xs flex items-center justify-between gap-2 rounded-lg px-2 py-1.5" style={{ backgroundColor: PAPER, color: INK_SOFT }}>
          <span className="flex items-center gap-1.5"><Gift size={12} /> Cotation autorisée pendant le renforcement</span>
          <button onClick={() => setForcer(false)} style={{ color: INK_SOFT }}><X size={13} /></button>
        </div>
      )}
      <div className="mt-3" style={paused && !forcer ? { opacity: 0.4, pointerEvents: 'none' } : undefined}>
        {obj.type === 'trials' && <TrialsWidget obj={obj} entry={entry} guidances={guidances} now={now} onChange={onChange} />}
        {obj.type === 'probe' && <ProbeWidget obj={obj} entry={entry} guidances={guidances} onChange={onChange} />}
        {obj.type === 'occurrence' && <OccurrenceWidget entry={entry} onChange={onChange} />}
        {obj.type === 'timer' && <TimerWidget obj={obj} entry={entry} now={now} onChange={onChange} />}
        {obj.type === 'interval' && <IntervalWidget obj={obj} entry={entry} elapsed={elapsed} crisisSet={crisisSet} onChange={onChange} />}
        {obj.type === 'chaining' && <ChainingWidget obj={obj} entry={entry} guidances={guidances} onChange={onChange} />}
        {obj.type === 'latency' && <LatencyWidget entry={entry} now={now} onChange={onChange} />}
        {obj.type === 'balance' && <BalanceWidget obj={obj} entry={entry} onChange={onChange} />}
      </div>
    </Card>
  );
}

function ObjectiveHeader({ obj, entry, guidances }) {
  const meta = TYPES[obj.type];
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

/* --- Widgets de cotation --- */
function TrialsWidget({ obj, entry, guidances, now, onChange }) {
  const list = objectiveGuidances(obj, guidances);
  const trials = entry.trials || [];
  const planned = obj.config.trialCount || 0; // 0 = pas de limite
  const done = trials.filter((t) => trialCode(t)).length;
  const unlimited = !planned;

  /* Chronométrage : le temps court à partir de la consigne et se fige dès que
     l'essai est coté. Chaque essai garde ainsi sa propre durée. */
  const withTimer = !!obj.config.withTimer;
  const countdown = withTimer && obj.config.timerMode === 'countdown' && obj.config.timerSeconds > 0;
  const targetMs = (obj.config.timerSeconds || 0) * 1000;
  const enCours = !!entry.running;
  const chrono = enCours ? (entry.pendingMs || 0) + (now - entry.startedAt) : (entry.pendingMs || 0);
  const ecoule = countdown && chrono >= targetMs;
  const sonne = useRef(false);

  useEffect(() => {
    if (!countdown || !enCours || sonne.current) return;
    if (chrono >= targetMs) {
      sonne.current = true;
      alertInterval({ soundOn: true, vibrateOn: true });
      onChange({ running: false, pendingMs: targetMs, startedAt: null });
    }
  });
  useEffect(() => {
    if (!enCours) sonne.current = false;
  }, [enCours]);

  const cells = unlimited ? [...trials.filter((t) => trialCode(t)), null] : trials;

  function record(code) {
    const ms = withTimer ? chrono : null;
    const valeur = withTimer ? { code, ms } : code;
    const reset = withTimer ? { running: false, startedAt: null, pendingMs: 0 } : {};

    if (unlimited) {
      onChange({ trials: [...trials.filter((t) => trialCode(t)), valeur], ...reset });
      return;
    }
    const idx = trials.findIndex((t) => !trialCode(t));
    if (idx === -1) {
      onChange({ trials: [...trials, valeur], ...reset });
      return;
    }
    const next = trials.slice();
    next[idx] = valeur;
    onChange({ trials: next, ...reset });
  }

  function undo() {
    if (!done) return;
    if (unlimited || done > planned) {
      const kept = trials.filter((t) => trialCode(t));
      kept.pop();
      onChange({ trials: unlimited ? kept : [...kept, ...Array(Math.max(0, planned - kept.length)).fill(null)] });
      return;
    }
    const next = trials.slice();
    next[done - 1] = null;
    onChange({ trials: next });
  }

  function toggleChrono() {
    if (enCours) {
      onChange({ running: false, pendingMs: (entry.pendingMs || 0) + (Date.now() - entry.startedAt), startedAt: null });
      return;
    }
    if (countdown && (entry.pendingMs || 0) >= targetMs) {
      sonne.current = false;
      onChange({ running: true, startedAt: Date.now(), pendingMs: 0 });
      return;
    }
    onChange({ running: true, startedAt: Date.now() });
  }

  const cursor = unlimited ? done : trials.findIndex((t) => !trialCode(t));

  return (
    <div>
      {withTimer && (
        <div className="flex items-center gap-2 mb-2.5 rounded-xl px-3 py-2" style={{ backgroundColor: PAPER }}>
          <span className="text-xl font-semibold tabular-nums" style={{ fontFamily: F_MONO, color: ecoule ? TYPES.timer.color : INK }}>
            {fmtClock(countdown ? Math.max(0, targetMs - chrono) : chrono)}
          </span>
          <span className="text-xs" style={{ color: INK_SOFT }}>
            {countdown ? (ecoule ? 'temps écoulé' : `sur ${fmtDuration(targetMs)}`) : 'cet essai'}
          </span>
          <button
            onClick={toggleChrono}
            className="ml-auto rounded-lg px-3 py-2 text-white text-sm flex items-center gap-1.5 active:scale-95 transition-transform"
            style={{ backgroundColor: enCours ? '#A8402F' : TYPES.timer.color, fontFamily: F_DISPLAY }}
          >
            {enCours ? <><Pause size={15} /> Arrêter</> : <><Play size={15} /> {chrono > 0 ? 'Reprendre' : 'Consigne'}</>}
          </button>
          {chrono > 0 && (
            <button onClick={() => { sonne.current = false; onChange({ running: false, startedAt: null, pendingMs: 0 }); }} style={{ color: INK_SOFT }}>
              <RotateCcw size={15} />
            </button>
          )}
        </div>
      )}

      <div className="flex gap-1.5 mb-2.5 overflow-x-auto pb-1">
        {cells.map((t, i) => {
          const code = trialCode(t);
          const g = code ? guidanceByCode(list, code) : null;
          const isNext = !code && (unlimited ? i === cells.length - 1 : i === cursor);
          const ms = trialMs(t);
          return (
            <div key={i} className="shrink-0 text-center">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold border"
                style={{
                  fontFamily: F_MONO,
                  backgroundColor: g ? g.color : CARD,
                  color: g ? '#fff' : INK_SOFT,
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
        {list.map((g) => (
          <button
            key={g.code}
            onClick={() => record(g.code)}
            className="flex-1 min-w-[72px] rounded-xl py-3 text-white active:scale-95 transition-transform"
            style={{ backgroundColor: g.color }}
          >
            <div className="text-sm font-semibold" style={{ fontFamily: F_DISPLAY }}>{g.code}</div>
            <div className="text-[10px] opacity-90 leading-tight break-words" style={{ overflowWrap: 'anywhere' }}>{g.label}</div>
          </button>
        ))}
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

function ProbeWidget({ obj, entry, guidances, onChange }) {
  if (obj && obj.config && obj.config.useGuidance) {
    const list = objectiveGuidances(obj, guidances);
    return (
      <div className="flex flex-wrap gap-1.5">
        {list.map((g) => {
          const on = entry.guidance === g.code;
          return (
            <button
              key={g.code}
              onClick={() => onChange({ guidance: on ? null : g.code, value: on ? null : (isIndependentCode(list, g.code) ? 1 : 0) })}
              className="flex-1 min-w-[72px] rounded-xl py-3 border-2 active:scale-95 transition-transform"
              style={{ borderColor: g.color, backgroundColor: on ? g.color : 'transparent', color: on ? '#fff' : g.color }}
            >
              <div className="text-sm font-semibold" style={{ fontFamily: F_DISPLAY }}>{g.code}</div>
              <div className="text-[10px] opacity-90 leading-tight break-words" style={{ overflowWrap: 'anywhere' }}>{g.label}</div>
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <button onClick={() => onChange({ value: entry.value === 1 ? null : 1 })}
        className="flex-1 rounded-xl py-4 font-semibold border-2 active:scale-95 transition-transform"
        style={{ fontFamily: F_DISPLAY, borderColor: '#0F8B6C', backgroundColor: entry.value === 1 ? '#0F8B6C' : 'transparent', color: entry.value === 1 ? '#fff' : '#0F8B6C' }}>
        1 · Réussi
      </button>
      <button onClick={() => onChange({ value: entry.value === 0 ? null : 0 })}
        className="flex-1 rounded-xl py-4 font-semibold border-2 active:scale-95 transition-transform"
        style={{ fontFamily: F_DISPLAY, borderColor: '#A8402F', backgroundColor: entry.value === 0 ? '#A8402F' : 'transparent', color: entry.value === 0 ? '#fff' : '#A8402F' }}>
        0 · Échoué
      </button>
    </div>
  );
}

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

function TimerWidget({ obj, entry, now, onChange }) {
  const cfg = (obj && obj.config) || {};
  const countdown = cfg.timerMode === 'countdown' && cfg.timerSeconds > 0;
  const targetMs = (cfg.timerSeconds || 0) * 1000;
  const raw = entry.running ? (entry.elapsedMs || 0) + (now - entry.startedAt) : (entry.elapsedMs || 0);
  const fired = useRef(false);

  /* Fin du compte à rebours : on arrête le chronomètre et on signale,
     comme pour un changement d'intervalle. */
  useEffect(() => {
    if (!countdown || !entry.running || fired.current) return;
    if (raw >= targetMs) {
      fired.current = true;
      alertInterval({ soundOn: true, vibrateOn: true });
      onChange({ running: false, elapsedMs: targetMs, startedAt: null });
    }
  });
  useEffect(() => {
    if (!entry.running) fired.current = false;
  }, [entry.running]);

  const finished = countdown && raw >= targetMs;
  const display = countdown ? Math.max(0, targetMs - raw) : raw;

  function toggle() {
    if (entry.running) {
      onChange({ running: false, elapsedMs: (entry.elapsedMs || 0) + (Date.now() - entry.startedAt), startedAt: null });
      return;
    }
    // Relancer après la fin d'un compte à rebours repart de zéro
    if (countdown && (entry.elapsedMs || 0) >= targetMs) {
      fired.current = false;
      onChange({ running: true, startedAt: Date.now(), elapsedMs: 0 });
      return;
    }
    onChange({ running: true, startedAt: Date.now() });
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <div>
          <div className="text-3xl font-semibold tabular-nums leading-none" style={{ fontFamily: F_MONO, color: finished ? TYPES.timer.color : INK }}>
            {fmtClock(display)}
          </div>
          {countdown && (
            <div className="text-xs mt-1" style={{ color: INK_SOFT }}>
              {finished ? 'Temps écoulé' : `sur ${fmtDuration(targetMs)}`}
            </div>
          )}
        </div>
        <button onClick={toggle}
          className="ml-auto rounded-xl px-5 py-3 text-white flex items-center gap-2 active:scale-95 transition-transform"
          style={{ backgroundColor: entry.running ? '#A8402F' : TYPES.timer.color, fontFamily: F_DISPLAY }}>
          {entry.running ? <><Pause size={17} /> Arrêter</> : <><Play size={17} /> {finished ? 'Relancer' : 'Démarrer'}</>}
        </button>
        {((entry.elapsedMs || 0) > 0 || entry.running) && (
          <button onClick={() => { fired.current = false; onChange({ running: false, elapsedMs: 0, startedAt: null }); }} className="p-2" style={{ color: INK_SOFT }}>
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      {countdown && (
        <div className="h-1.5 rounded-full mt-2.5 overflow-hidden" style={{ backgroundColor: PAPER }}>
          <div style={{
            width: `${Math.min(100, (raw / targetMs) * 100)}%`,
            height: '100%',
            backgroundColor: TYPES.timer.color,
            transition: 'width 1s linear',
          }} />
        </div>
      )}

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
                  color: color ? '#fff' : INK_SOFT,
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
              style={{ borderColor: color, backgroundColor: on ? color : 'transparent', color: on ? '#fff' : color, fontFamily: F_DISPLAY, overflowWrap: 'anywhere' }}>
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
                    style={{ borderColor: color, backgroundColor: on ? color : 'transparent', color: on ? '#fff' : color, overflowWrap: 'anywhere' }}>
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

  function setStep(stepId, code) {
    const next = { ...entry.steps };
    if (next[stepId] === code) delete next[stepId];
    else next[stepId] = code;
    onChange({ steps: next });
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
                      style={{ fontFamily: F_DISPLAY, borderColor: on ? g.color : BORDER, backgroundColor: on ? g.color : 'transparent', color: on ? '#fff' : INK_SOFT }}
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
          <button onClick={() => onChange({ steps: {} })} className="text-xs flex items-center gap-1" style={{ color: INK_SOFT }}>
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

  function writeTrials(next) {
    onChange({ trials: next, steps: undefined });
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
    writeTrials(next);
    setActive(next.length - 1);
  }

  function removeTrial() {
    if (trials.length <= 1) { writeTrials([{ steps: {} }]); setActive(0); return; }
    const next = trials.filter((_, i) => i !== idx);
    writeTrials(next);
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
                color: on ? '#fff' : INK_SOFT,
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
                      style={{ fontFamily: F_DISPLAY, borderColor: on ? o.color : BORDER, backgroundColor: on ? o.color : 'transparent', color: on ? '#fff' : INK_SOFT }}
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
                  style={{ borderColor: e.demande ? '#2E6E8E' : BORDER, backgroundColor: e.demande ? '#2E6E8E' : 'transparent', color: e.demande ? '#fff' : INK_SOFT }}
                >
                  <MessageSquare size={12} /> Demande
                </button>
                <button
                  onClick={() => setStep(st.id, { renforce: !e.renforce })}
                  className="flex-1 rounded-lg py-1.5 text-xs border flex items-center justify-center gap-1"
                  style={{ borderColor: e.renforce ? '#D69A2D' : BORDER, backgroundColor: e.renforce ? '#D69A2D' : 'transparent', color: e.renforce ? '#fff' : INK_SOFT }}
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

function LatencyWidget({ entry, now, onChange }) {
  const running = entry.running;
  const live = running ? now - entry.startedAt : 0;

  function toggle() {
    if (running) onChange({ running: false, startedAt: null, latencies: [...entry.latencies, Date.now() - entry.startedAt] });
    else onChange({ running: true, startedAt: Date.now() });
  }

  return (
    <div>
      <button onClick={toggle}
        className="w-full rounded-xl py-4 text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
        style={{ backgroundColor: running ? '#A8402F' : TYPES.latency.color, fontFamily: F_DISPLAY }}>
        {running ? (
          <><Square size={17} /> Réponse — <span style={{ fontFamily: F_MONO }}>{(live / 1000).toFixed(1)} s</span></>
        ) : (
          <><Play size={17} /> Consigne donnée</>
        )}
      </button>

      {entry.latencies.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1.5 mb-1">
            {entry.latencies.map((ms, i) => (
              <button key={i}
                onClick={() => onChange({ latencies: entry.latencies.filter((_, j) => j !== i) })}
                className="rounded-lg px-2.5 py-1.5 text-xs border"
                style={{ fontFamily: F_MONO, borderColor: BORDER, color: INK_SOFT, backgroundColor: CARD }}
                title="Appuyer pour supprimer cette mesure">
                {(ms / 1000).toFixed(1)} s
              </button>
            ))}
          </div>
          <div className="text-xs" style={{ color: INK_SOFT }}>
            Moyenne <span style={{ fontFamily: F_MONO }}>
              {(entry.latencies.reduce((a, b) => a + b, 0) / entry.latencies.length / 1000).toFixed(1)} s
            </span> · appuyez sur une mesure pour la retirer
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== Écran suivi : progression et maîtrise ==================== */
function SuiviScreen({ students, sessions, guidances, onResetTracking, onOuvrirMenu }) {
  const [openId, setOpenId] = useState(students.length ? students[0].id : null);

  /* Le menu s'ouvre par un balayage depuis le bord gauche, geste qui ne
     s'apprend pas tout seul et n'existe pas au clavier. Ce bouton y donne
     accès depuis le même écran, sans ouvrir une seconde porte ailleurs. */
  const boutonMenu = (
    <button
      onClick={onOuvrirMenu}
      className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm shrink-0"
      style={{ borderColor: BORDER, backgroundColor: CARD, color: INK_SOFT }}
    >
      <Menu size={16} /> Menu
    </button>
  );

  if (students.length === 0) {
    return (
      <div>
        <div className="flex items-start justify-between gap-3">
          <SectionTitle>Suivi</SectionTitle>
          {boutonMenu}
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
        {boutonMenu}
      </div>

      <ResumeObjectifs students={students} sessions={sessions} guidances={guidances} />
      <>
      <div className="space-y-3">
        {students.map((s) => {
          const open = openId === s.id;
          return (
            <Card key={s.id}>
              <button className="w-full flex items-center justify-between" onClick={() => setOpenId(open ? null : s.id)}>
                <span className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white" style={{ backgroundColor: INK, fontFamily: F_DISPLAY }}>
                    {s.initials.replace(/\./g, '').slice(0, 3)}
                  </span>
                  <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>{s.initials}</span>
                </span>
                <ChevronRight size={18} style={{ color: INK_SOFT, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
              </button>

              {open && (
                <div className="mt-4 space-y-5">
                  {s.objectives.length === 0 && <Empty>Aucun objectif défini.</Empty>}
                  {s.objectives.map((o) => (
                    <ObjectiveChart key={o.id} obj={o} studentId={s.id} sessions={ordered} guidances={guidances} onReset={() => onResetTracking(s.id, o.id)} />
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
      </>
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
        const ecart = etat.threshold - moyenne;
        if (ecart > 0 && ecart <= RESUME_ECART_MAX) {
          groupes.plateau.push({ ...base, ...etat, moyenne });
        }
      }
    });
  });
  return groupes;
}

function ResumeObjectifs({ students, sessions, guidances }) {
  const [ouvert, setOuvert] = useState(null);
  const g = resumerObjectifs(students, sessions, guidances);

  const blocs = [
    { k: 'acquis', label: 'Acquis', couleur: '#0F8B6C', aide: 'Le critère est atteint.', rendu: (l) => `${l.streak}/${l.needed}` },
    { k: 'bientot', label: 'Bientôt acquis', couleur: '#3F9E7C', aide: 'Une séance de plus au seuil suffit.', rendu: (l) => `${l.streak}/${l.needed} · ${l.valeur} %` },
    { k: 'plateau', label: 'En plateau', couleur: '#D69A2D', aide: 'Proche du seuil depuis plusieurs séances, sans l\'atteindre.', rendu: (l) => `${l.moyenne} % · seuil ${l.threshold} %` },
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
              className="flex-1 min-w-[110px] rounded-xl px-3 py-2.5 border text-left disabled:opacity-50"
              style={{ borderColor: on ? b.couleur : BORDER, backgroundColor: on ? b.couleur + '14' : 'transparent' }}>
              <div className="text-2xl font-semibold" style={{ fontFamily: F_MONO, color: b.couleur }}>{n}</div>
              <div className="text-xs" style={{ color: INK_SOFT }}>{b.label}</div>
            </button>
          );
        })}
      </div>

      {ouvert && (
        <div className="mt-3">
          <p className="text-xs mb-2" style={{ color: INK_SOFT }}>{blocs.find((b) => b.k === ouvert).aide}</p>
          <div className="space-y-1.5">
            {g[ouvert].map((l, i) => (
              <div key={i} className="rounded-xl px-3 py-2.5 flex items-start justify-between gap-2" style={{ backgroundColor: PAPER }}>
                <div className="min-w-0">
                  <div className="text-sm break-words">
                    <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>{l.initials}</span> · {l.objectif}
                  </div>
                  {l.cible && <div className="text-xs" style={{ color: INK_SOFT }}>cible {l.cible}</div>}
                </div>
                <span className="text-xs shrink-0" style={{ fontFamily: F_MONO, color: blocs.find((b) => b.k === ouvert).couleur }}>
                  {blocs.find((b) => b.k === ouvert).rendu(l)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function ObjectiveChart({ obj, studentId, sessions, guidances, onReset }) {
  const meta = TYPES[obj.type];
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
              backgroundColor: mastery.mastered ? '#0F8B6C' : PAPER,
              color: mastery.mastered ? '#fff' : INK_SOFT,
              fontFamily: F_DISPLAY,
            }}
          >
            {mastery.mastered
              ? <><Award size={13} /> Acquis</>
              : `${mastery.streak}/${mastery.needed} ${mastery.unit === 'days' ? 'jours' : 'séances'} à ${mastery.threshold} %`}
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
                  backgroundColor: done ? '#0F8B6C' : active ? INK : PAPER,
                  color: done || active ? '#fff' : INK_SOFT,
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
                <ReferenceLine y={mastery.threshold} stroke="#0F8B6C" strokeDasharray="4 4" strokeWidth={1.5} />
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

/* ==================== Écran 4 : export ==================== */
function ExportScreen({ sessions, crises, students, ateliers, intervenants, guidances, appareil, notify, onEditCrisis, onMarkSent, onExportManager }) {
  const unsentIds = React.useMemo(() => sessions.filter((s) => !s.sentAt).map((s) => s.id), [sessions]);
  // Valeur d'état initiale seulement : React l'ignore aux rendus suivants,
  // donc une sélection ajustée à la main n'est jamais écrasée par un
  // changement ultérieur (nouvelle séance, statut modifié...).
  const [picked, setPicked] = useState(unsentIds);

  /* Deux façons de composer un rapport : en choisissant des séances, ou en
     choisissant des personnes — auquel cas toutes leurs cotations sont reprises,
     quelles que soient les séances. */
  const [mode, setMode] = useState('sessions');
  const [pickedStudents, setPickedStudents] = useState([]);

  const ordered = sessions.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const byStudent = mode === 'students';

  const chosen = byStudent
    ? sessions.filter((s) => (s.studentIds || []).some((sid) => pickedStudents.includes(sid)))
    : sessions.filter((s) => picked.includes(s.id));
  const studentFilter = byStudent ? pickedStudents : null;
  const chosenCrises = crises.filter((c) => {
    if (byStudent) return c.studentId && pickedStudents.includes(c.studentId);
    return !c.sessionId || chosen.some((s) => s.id === c.sessionId);
  });
  const chosenSentCount = byStudent ? 0 : chosen.filter((s) => s.sentAt).length;

  const atelierName = (id) => (ateliers.find((a) => a.id === id) || {}).name || 'Séance libre';
  const sessionLabel = (sess) => (sess.atelierId ? atelierName(sess.atelierId) : sess.mode === 'balance' ? 'Balance Program' : 'Séance libre');

  function makeFile() {
    const wb = buildWorkbook(chosen, chosenCrises, students, ateliers, intervenants, guidances, studentFilter);
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

  function download() {
    if (!confirmIfNeeded()) return;
    const { blob, name } = makeFile();
    downloadBlob(blob, name);
    if (!byStudent) onMarkSent(picked);
    notify('Fichier Excel téléchargé');
  }

  async function shareSelection() {
    if (!confirmIfNeeded()) return;
    const { blob, name } = makeFile();
    await shareReport({ blob, name, title: name, notify });
    if (!byStudent) onMarkSent(picked);
  }

  const canExport = byStudent ? pickedStudents.length > 0 && chosen.length > 0 : picked.length > 0;

  return (
    <div>
      <SectionTitle sub="Sélectionnez les rapports à transmettre aux cadres pédagogiques.">Export</SectionTitle>

      {sessions.length === 0 ? (
        <Empty>Aucune séance enregistrée pour le moment.</Empty>
      ) : (
        <>
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
                  style={{ fontFamily: F_DISPLAY, borderColor: on ? INK : BORDER, backgroundColor: on ? INK : 'transparent', color: on ? '#fff' : INK_SOFT }}>
                  <Icon size={15} /> {m.label}
                </button>
              );
            })}
          </div>

          {byStudent ? (
            <div className="mb-4">
              <div className="text-xs mb-2" style={{ color: INK_SOFT }}>
                Personnes à inclure — toutes leurs cotations sont reprises, quelles que soient les séances
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {students.map((st) => {
                  const on = pickedStudents.includes(st.id);
                  return (
                    <button key={st.id}
                      onClick={() => setPickedStudents((cur) => (on ? cur.filter((x) => x !== st.id) : [...cur, st.id]))}
                      className="rounded-xl px-4 py-2.5 border font-semibold text-sm"
                      style={{ fontFamily: F_DISPLAY, borderColor: on ? INK : BORDER, backgroundColor: on ? INK : 'transparent', color: on ? '#fff' : INK_SOFT }}>
                      {st.initials}
                    </button>
                  );
                })}
              </div>
              {pickedStudents.length > 0 && (
                <div className="text-xs" style={{ color: INK_SOFT }}>
                  <span style={{ fontFamily: F_MONO }}>{chosen.length}</span> séance{chosen.length !== 1 ? 's' : ''} concernée{chosen.length !== 1 ? 's' : ''}
                  {chosenCrises.length > 0 && <> · <span style={{ fontFamily: F_MONO }}>{chosenCrises.length}</span> crise{chosenCrises.length !== 1 ? 's' : ''}</>}
                </div>
              )}
            </div>
          ) : (
          <>
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

          <div className="mb-4">
            <ListeParJour
            items={ordered}
            dateDe={(s) => s.date}
            renderItem={(s) => {
              const on = picked.includes(s.id);
              const sent = !!s.sentAt;
              return (
                <div key={s.id} className="w-full rounded-xl px-3.5 py-3 flex items-center gap-3 border"
                  style={{ borderColor: on ? INK : BORDER, backgroundColor: on ? INK + '0d' : sent ? PAPER : CARD }}>
                  <button className="flex-1 text-left min-w-0" onClick={() => setPicked((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))}>
                    <div className="text-sm font-medium truncate">{sessionLabel(s)}</div>
                    <div className="text-xs" style={{ color: INK_SOFT }}>
                      {timeShort(s.date)} · {s.studentIds.length} personne{s.studentIds.length !== 1 ? 's' : ''}
                    </div>
                  </button>
                  <button
                    onClick={() => onMarkSent([s.id], !sent)}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs flex items-center gap-1 border"
                    style={{
                      borderColor: sent ? '#0F8B6C' : BORDER,
                      backgroundColor: sent ? '#0F8B6C' : 'transparent',
                      color: sent ? '#fff' : INK_SOFT,
                    }}
                    title="Appuyer pour changer le statut manuellement"
                  >
                    {sent ? <Check size={12} /> : null} {sent ? 'Envoyé' : 'Non envoyé'}
                  </button>
                  <button onClick={() => setPicked((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))}
                    className="w-6 h-6 rounded-md border flex items-center justify-center shrink-0" style={{ borderColor: on ? INK : BORDER, backgroundColor: on ? INK : 'transparent' }}>
                    {on && <Check size={14} color="#fff" />}
                  </button>
                </div>
              );
            }}
            />
          </div>
          </>
          )}
        </>
      )}

      {/* Une seule sélection, trois destinations possibles */}
      <Card className="mb-3">
        <div className="text-xs uppercase tracking-wide mb-2" style={{ color: INK_SOFT }}>
          Rapport Excel — à lire, imprimer ou déposer sur le dossier partagé
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={download} disabled={!canExport} className="flex-1">
            <FileSpreadsheet size={17} /> Télécharger
          </Btn>
          <Btn onClick={shareSelection} disabled={!canExport} className="flex-1">
            <Share2 size={17} /> Partager
          </Btn>
        </div>
      </Card>

      <Card>
        <div className="text-xs uppercase tracking-wide mb-2" style={{ color: INK_SOFT }}>
          Fichier pour DatABA Manager
        </div>
        <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
          Le rapport Excel se lit, mais ne contient pas les critères d'acquisition. Ce fichier-ci
          les emporte : c'est lui que le cadre pédagogique charge dans DatABA Manager.
        </p>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={() => onExportManager(chosen, true)} disabled={!canExport} className="flex-1">
            <Lock size={16} /> Chiffré
          </Btn>
          <Btn
            variant="ghost"
            onClick={() => {
              if (window.confirm(
                "Exporter sans chiffrement ?\n\nLe fichier sera lisible par quiconque y a accès. À réserver à un dépôt dans un dossier déjà restreint."
              )) onExportManager(chosen, false);
            }}
            disabled={!canExport}
            className="flex-1"
          >
            <Download size={16} /> Sans chiffrement
          </Btn>
        </div>
      </Card>


      {crises.length > 0 && (
        <div className="mt-6">
          <div className="text-xs uppercase tracking-wide mb-2" style={{ color: INK_SOFT }}>
            Crises et observations — <span style={{ fontFamily: F_MONO }}>{crises.length}</span> au total
          </div>
          <ListeParJour
            items={crises}
            dateDe={(c) => c.date}
            renderItem={(c) => {
              const st = students.find((s) => s.id === c.studentId);
              const ids = c.intervenantIds || (c.intervenantId ? [c.intervenantId] : []);
              const names = ids.map((id) => (intervenants.find((i) => i.id === id) || {}).name).filter(Boolean);
              return (
                <button key={c.id} onClick={() => onEditCrisis(c)} className="w-full text-left rounded-2xl border p-4" style={{ borderColor: BORDER, backgroundColor: PAPER }}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold min-w-0 truncate" style={{ fontFamily: F_DISPLAY }}>{st ? st.initials : 'Personne non renseignée'}</span>
                    <span className="text-xs shrink-0 rounded-md px-1.5 py-0.5"
                      style={{ backgroundColor: c.kind === 'abc' ? '#B07A2E' : CRISIS, color: '#fff' }}>
                      {c.kind === 'abc' ? 'Observation' : 'Crise'}
                    </span>
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
                        style={{ backgroundColor: (CRISIS_INTENSITES.find((x) => x.n === c.intensite) || {}).color, color: '#fff' }}>
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
              );
            }}
          />
        </div>
      )}
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

  useEffect(() => {
    if (!isNew || crisis.kind === 'abc') return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isNew, crisis.kind]);

  const elapsed = isNew ? now - crisis.startedAt : crisis.durationMs || 0;
  const set = (patch) => setCrisis((c) => ({ ...c, ...patch }));
  const selectedIntervenants = crisis.intervenantIds || [];

  const toggleIntervenant = (id) =>
    set({ intervenantIds: selectedIntervenants.includes(id) ? selectedIntervenants.filter((x) => x !== id) : [...selectedIntervenants, id] });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden" style={{ backgroundColor: PAPER }}>
      <div
        className="sticky top-0 px-4 pb-4 text-white"
        style={{ backgroundColor: estObservation ? '#B07A2E' : CRISIS, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
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
                <input
                  type="number" min="0" max="999"
                  value={Math.floor((crisis.durationMs || 0) / 60000)}
                  onChange={(e) => {
                    const min = Math.max(0, Number(e.target.value) || 0);
                    const sec = Math.floor(((crisis.durationMs || 0) % 60000) / 1000);
                    set({ durationMs: (min * 60 + sec) * 1000 });
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
                    set({ durationMs: (min * 60 + sec) * 1000 });
                  }}
                  className="w-16 rounded-xl border px-2 py-2.5 text-sm bg-transparent text-center"
                  style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }}
                />
                <span className="text-xs" style={{ color: INK_SOFT }}>s</span>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="text-xs mb-2" style={{ color: INK_SOFT }}>Personne concernée</div>
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

        <div>
          <div className="text-xs mb-2" style={{ color: INK_SOFT }}>Atelier</div>
          {ateliers.length === 0 ? (
            <div className="text-sm" style={{ color: INK_SOFT }}>Aucun atelier enregistré.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ateliers.map((a) => (
                <Chip key={a.id} label={a.name} color={CRISIS} on={crisis.atelierId === a.id}
                  onClick={() => set({ atelierId: crisis.atelierId === a.id ? null : a.id })} />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs mb-2" style={{ color: INK_SOFT }}>Intervenants présents</div>
          {intervenants.length === 0 ? (
            <div className="text-sm" style={{ color: INK_SOFT }}>Aucun intervenant enregistré.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {intervenants.map((i) => (
                <Chip key={i.id} label={i.name} color={CRISIS} on={selectedIntervenants.includes(i.id)}
                  onClick={() => toggleIntervenant(i.id)} />
              ))}
            </div>
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
          <div className="flex flex-wrap gap-2">
            {CRISIS_FUNCTIONS.map((fn) => {
              const on = crisis.fonction === fn.k;
              return (
                <button key={fn.k} onClick={() => set({ fonction: on ? null : fn.k })}
                  className="rounded-xl px-4 py-2.5 border text-sm"
                  style={{ fontFamily: F_DISPLAY, borderColor: fn.color, backgroundColor: on ? fn.color : 'transparent', color: on ? '#fff' : fn.color }}>
                  {fn.label}
                </button>
              );
            })}
          </div>
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
                return (
                  <button key={i.n} onClick={() => set({ intensite: on ? null : i.n })}
                    className="flex-1 rounded-xl px-2 py-2.5 border text-left"
                    style={{ borderColor: i.color, backgroundColor: on ? i.color : 'transparent', color: on ? '#fff' : i.color }}>
                    <div className="text-sm font-semibold" style={{ fontFamily: F_DISPLAY }}>{i.n} · {i.label}</div>
                    <div className="text-[10px] leading-tight" style={{ opacity: 0.85 }}>{i.aide}</div>
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
          <Btn onClick={() => onSave(crisis)} className="w-full mb-2" style={{ backgroundColor: estObservation ? '#B07A2E' : CRISIS }}>
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
