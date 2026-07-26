import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import {
  Plus, X, Play, Pause, Square, Check, ChevronRight, Hash,
  Timer as TimerIcon, ListChecks, LayoutGrid, CheckCircle2, RotateCcw, Save,
  Mail, Users, Layers, AlertTriangle, Trash2, FileSpreadsheet,
  Volume2, VolumeX, TrendingUp, Upload, Download, Award, UserCog, Sun, Pencil,
  ListOrdered, Gauge, Copy, StickyNote, Star, SlidersHorizontal, EyeOff, Eye, Target, PauseCircle,
} from 'lucide-react';

/* ==================== Design tokens ==================== */
const INK = '#20291F';
const INK_SOFT = '#5B6B5E';
const PAPER = '#EFF2EC';
const CARD = '#FBFCFA';
const BORDER = '#DBE3D8';
const CRISIS = '#B3261E';

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
@media (prefers-reduced-motion: reduce) {
  @keyframes abaInFromRight { from { opacity: 1; } to { opacity: 1; } }
  @keyframes abaInFromLeft  { from { opacity: 1; } to { opacity: 1; } }
}`;
      document.head.appendChild(style);
    }
  }, []);
}

/* ==================== Constantes métier ==================== */
/* Guidances par défaut. La liste est modifiable dans l'écran Administratif :
   le drapeau "independent" désigne ce qui compte comme réussite autonome
   dans les pourcentages et les critères de maîtrise. */
const DEFAULT_GUIDANCE = [
  { code: 'I', label: 'Indépendant', color: '#0F8B6C', independent: true },
  { code: 'GP', label: 'Guidance partielle', color: '#D69A2D', independent: false },
  { code: 'GT', label: 'Guidance totale', color: '#A8402F', independent: false },
];
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
  chaining: { label: 'Analyse de tâche', short: 'Chaînage', icon: ListOrdered, color: '#2E8B7A' },
  latency: { label: 'Latence', short: 'Latence', icon: Gauge, color: '#B07A2E' },
};

/* Ce que mesure réellement un relevé par intervalle : à préciser pour que les données soient comparables */
const INTERVAL_MODES = [
  { k: 'momentane', label: 'Échantillonnage momentané', hint: 'On note ce qui se passe à l’instant précis du top' },
  { k: 'partiel', label: 'Intervalle partiel', hint: 'Noté si le comportement survient au moins une fois' },
  { k: 'total', label: 'Intervalle total', hint: 'Noté seulement si le comportement dure tout l’intervalle' },
];
const INTERVAL_MODE_SHORT = { momentane: 'momentané', partiel: 'partiel', total: 'total' };

const DEFAULT_CHAIN_STEPS = [
  { id: 'st1', name: 'Étape 1' },
  { id: 'st2', name: 'Étape 2' },
  { id: 'st3', name: 'Étape 3' },
];

const DEFAULT_INTERVAL_LEVELS = [
  { id: 'lv1', name: 'Engagé' },
  { id: 'lv2', name: 'Passif' },
  { id: 'lv3', name: 'Opposition' },
];
const LEVEL_COLORS = ['#0F8B6C', '#7A9A3A', '#D69A2D', '#C36A2E', '#A8402F', '#2E6E8E', '#7A6A9A', '#6B5178'];

/* Types dont le score est un pourcentage : seuls ceux-là admettent un critère de maîtrise */
const PERCENT_TYPES = ['trials', 'probe', 'interval', 'chaining'];
const DEFAULT_MASTERY = { threshold: 80, sessions: 3, unit: 'sessions' };

/* ==================== Stockage ====================
   Dans Claude, window.storage est disponible. Une fois l'application hébergée
   ailleurs (PWA, APK, iOS), il n'existe plus : on bascule sur localStorage.
   Les données restent dans tous les cas sur l'appareil. */
const store = {
  async get(key) {
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
  async set(key, value) {
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

function alertInterval(soundOn) {
  if (soundOn) beep();
  try {
    if (navigator.vibrate) navigator.vibrate([130, 70, 130]);
  } catch (e) {}
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
  if (obj.type === 'trials') return { trials: Array(obj.config.trialCount).fill(null) };
  if (obj.type === 'probe') return { value: null };
  if (obj.type === 'occurrence') return { count: 0 };
  if (obj.type === 'timer') return { elapsedMs: 0, running: false, startedAt: null };
  if (obj.type === 'interval') return { marks: {}, segments: [] };
  if (obj.type === 'chaining') return { steps: {} };
  if (obj.type === 'latency') return { latencies: [], running: false, startedAt: null };
  return {};
}

/* Une cotation peut dater d'avant un changement de type d'objectif : on vérifie qu'elle correspond */
function entryMatches(obj, entry) {
  if (!entry) return false;
  if (obj.type === 'trials') return Array.isArray(entry.trials);
  if (obj.type === 'probe') return entry.value === 0 || entry.value === 1 || entry.value === null;
  if (obj.type === 'occurrence') return typeof entry.count === 'number';
  if (obj.type === 'timer') return typeof entry.elapsedMs === 'number';
  if (obj.type === 'interval') return !!entry.marks;
  if (obj.type === 'chaining') return !!entry.steps;
  if (obj.type === 'latency') return Array.isArray(entry.latencies);
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
  return { ...session, data, endedAt: session.isEdit ? session.endedAt || stamp : stamp };
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

function intervalTotals(obj, entry) {
  const step = obj.config.intervalMinutes || 5;
  const totals = {};
  Object.values(entry.marks || {}).forEach((lid) => {
    if (lid) totals[lid] = (totals[lid] || 0) + step;
  });
  (entry.segments || []).forEach((s) => {
    const d = segmentMinutes(s);
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

/* Résumé texte d'une cotation, utilisé à l'écran et dans l'export */
function summarize(obj, entry, guidances) {
  if (!entryMatches(obj, entry)) return { result: '—', detail: '' };
  if (obj.type === 'trials') {
    const done = entry.trials.filter(Boolean);
    const indep = done.filter((c) => isIndependentCode(guidances, c)).length;
    const pct = done.length ? Math.round((indep / done.length) * 100) : 0;
    return {
      result: done.length ? `${indep}/${done.length} indépendant (${pct} %)` : 'Non coté',
      detail: entry.trials.map((c, i) => (c ? `E${i + 1}:${c}` : '')).filter(Boolean).join(' '),
    };
  }
  if (obj.type === 'probe') {
    return { result: entry.value === 1 ? 'Réussi (1)' : entry.value === 0 ? 'Échoué (0)' : 'Non coté', detail: '' };
  }
  if (obj.type === 'occurrence') {
    return { result: `${entry.count} occurrence${entry.count !== 1 ? 's' : ''}`, detail: '' };
  }
  if (obj.type === 'timer') {
    return { result: entry.elapsedMs ? fmtDuration(entry.elapsedMs) : 'Non démarré', detail: `${Math.round(entry.elapsedMs / 1000)} s` };
  }
  if (obj.type === 'interval') {
    const levels = obj.config.levels || [];
    const { totals, total } = intervalTotals(obj, entry);
    if (!total) return { result: 'Non coté', detail: '' };
    const mode = INTERVAL_MODE_SHORT[obj.config.intervalMode] || '';
    const named = levels.filter((l) => totals[l.id]).map((l) => ({ name: l.name, min: totals[l.id] }));
    const top = named.slice().sort((a, b) => b.min - a.min)[0];
    const manual = (entry.segments || []).filter((s) => segmentMinutes(s) > 0).length;
    return {
      result: `${total} min cotées · dominant : ${top ? top.name : '—'}`,
      detail: `${named.map((c) => `${c.name}: ${c.min} min (${Math.round((c.min / total) * 100)} %)`).join(' | ')}${mode ? ` (${mode})` : ''}${manual ? ` [${manual} période${manual > 1 ? 's' : ''} saisie${manual > 1 ? 's' : ''} à la main]` : ''}`,
    };
  }
  if (obj.type === 'chaining') {
    const steps = obj.config.steps || [];
    const coded = steps.filter((s) => entry.steps[s.id]);
    if (!coded.length) return { result: 'Non coté', detail: '' };
    const indep = coded.filter((s) => isIndependentCode(guidances, entry.steps[s.id])).length;
    const pct = Math.round((indep / coded.length) * 100);
    return {
      result: `${indep}/${coded.length} étapes indépendantes (${pct} %)`,
      detail: steps.map((s, i) => (entry.steps[s.id] ? `${i + 1}.${s.name}:${entry.steps[s.id]}` : '')).filter(Boolean).join(' | '),
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
  if (obj.type === 'trials') {
    const done = entry.trials.filter(Boolean);
    if (!done.length) return null;
    return { value: Math.round((done.filter((c) => isIndependentCode(guidances, c)).length / done.length) * 100), percent: true, unit: '%' };
  }
  if (obj.type === 'probe') {
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
    return { value: Math.round((coded.filter((s) => isIndependentCode(guidances, entry.steps[s.id])).length / coded.length) * 100), percent: true, unit: '%' };
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
   Renvoie la liste des élèves mise à jour et les cibles franchies. */
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
function buildWorkbook(sessions, crises, students, ateliers, intervenants = [], guidances) {
  const studentName = (id) => (students.find((s) => s.id === id) || {}).initials || '?';
  const atelierName = (id) => (ateliers.find((a) => a.id === id) || {}).name || '—';
  const intervenantName = (id) => (intervenants.find((i) => i.id === id) || {}).name || '—';

  const rows = [['Date', 'Heure', 'Atelier', 'Intervenant', 'Élève', 'Objectif', 'Cible', 'Type de cotation', 'Résultat', 'Score', 'Détail']];
  sessions.forEach((s) => {
    const d = new Date(s.date);
    (s.studentIds || []).forEach((sid) => {
      const objIds = (s.selectedObjectives && s.selectedObjectives[sid]) || [];
      objIds.forEach((oid) => {
        const obj = (s.objectiveSnapshot || {})[oid];
        if (!obj) return;
        const entry = ((s.data || {})[sid] || {})[oid];
        const { result, detail } = summarize(obj, entry, guidances);
        const score = objectiveScore(obj, entry, guidances);
        let fullDetail = detail;
        if (obj.type === 'interval') {
          const set = crisisIntervals(s, crises, obj.config.intervalMinutes, sid);
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

  const crisisRows = [['Date', 'Heure', 'Élève', 'Atelier', 'Intervenants présents', 'Durée', 'Antécédent', 'Comportement', 'Conséquence', 'Commentaire']];
  crises.forEach((c) => {
    const ids = c.intervenantIds || (c.intervenantId ? [c.intervenantId] : []);
    crisisRows.push([
      new Date(c.date).toLocaleDateString('fr-FR'),
      timeShort(c.date),
      c.studentId ? studentName(c.studentId) : '—',
      c.atelierId ? atelierName(c.atelierId) : '—',
      ids.map(intervenantName).join(', ') || '—',
      fmtDuration(c.durationMs),
      c.antecedent || '',
      c.comportement || '',
      c.consequence || '',
      c.commentaire || '',
    ]);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(crisisRows);
  ws2['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 18 }, { wch: 24 }, { wch: 12 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Crises');

  const noteRows = [['Date', 'Heure', 'Atelier', 'Élève', 'Note']];
  sessions.forEach((s) => {
    Object.entries(s.notes || {}).forEach(([sid, note]) => {
      if (!note || !note.trim()) return;
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

  return wb;
}

function workbookBlob(wb) {
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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

/* Envoi d'un rapport : partage natif avec pièce jointe si disponible
   (cas Android), sinon téléchargement + ouverture du mail pré-rempli. */
async function shareReport({ blob, name, subject, body, notify }) {
  try {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: subject, text: body });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  downloadBlob(blob, name);
  const a = document.createElement('a');
  a.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (notify) notify('Fichier téléchargé — joignez-le au mail');
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

function Empty({ children }) {
  return (
    <div className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm" style={{ borderColor: BORDER, color: INK_SOFT }}>
      {children}
    </div>
  );
}

/* ==================== Navigation par balayage ====================
   Ordre des onglets, utilisé pour savoir vers quel écran glisser. */
const TAB_ORDER = ['admin', 'students', 'session', 'suivi', 'export'];

/* Un balayage ne doit pas voler le geste à une zone qui défile déjà
   horizontalement (grille d'essais, grille d'intervalles), à un champ de
   saisie, ni à un graphique. */
function ownsHorizontalGesture(target) {
  let n = target;
  while (n && n !== document.body) {
    if (n.dataset && n.dataset.noSwipe !== undefined) return true;
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

function useSwipeTabs(ref, tab, setTab) {
  const [dir, setDir] = useState(0);
  const gesture = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const index = () => TAB_ORDER.indexOf(tab);

    function start(e) {
      if (e.touches.length !== 1 || ownsHorizontalGesture(e.target)) {
        gesture.current = null;
        return;
      }
      const t = e.touches[0];
      gesture.current = { x: t.clientX, y: t.clientY, axis: null, time: Date.now() };
    }

    function move(e) {
      const g = gesture.current;
      if (!g || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - g.x;
      const dy = t.clientY - g.y;
      if (!g.axis) {
        if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return;
        g.axis = Math.abs(dx) > Math.abs(dy) + 6 ? 'x' : 'y';
      }
      if (g.axis !== 'x') return;
      // Empêche le défilement horizontal parasite pendant un balayage reconnu
      if (e.cancelable) e.preventDefault();
      g.dx = dx;
    }

    function end() {
      const g = gesture.current;
      gesture.current = null;
      if (!g || g.axis !== 'x') return;
      const dx = g.dx || 0;
      const w = el.clientWidth || 1;
      const speed = Math.abs(dx) / Math.max(1, Date.now() - g.time);
      if (Math.abs(dx) < Math.max(60, w * 0.18) && speed < 0.5) return;
      const next = index() + (dx < 0 ? 1 : -1);
      if (next < 0 || next >= TAB_ORDER.length) return;
      setDir(dx < 0 ? 1 : -1);
      setTab(TAB_ORDER[next]);
    }

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end, { passive: true });
    el.addEventListener('touchcancel', end, { passive: true });
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, [ref, tab, setTab]);

  return dir;
}

/* ==================== Application ==================== */
export default function App() {
  useFonts();
  const [tab, setTab] = useState('admin');
  const [loaded, setLoaded] = useState(false);

  const [students, setStudents] = useState([]);
  const [ateliers, setAteliers] = useState([]);
  const [intervenants, setIntervenants] = useState([]);
  const [guidances, setGuidances] = useState(DEFAULT_GUIDANCE);
  const [sessions, setSessions] = useState([]);
  const [crises, setCrises] = useState([]);

  const [activeSession, setActiveSession] = useState(null);
  const [crisis, setCrisis] = useState(null);
  const [toast, setToast] = useState(null);
  const contentRef = useRef(null);
  const dir = useSwipeTabs(contentRef, tab, setTab);

  /* --- chargement --- */
  useEffect(() => {
    (async () => {
      const config = await store.get('aba:config');
      if (config) {
        try {
          const d = JSON.parse(config);
          setStudents(d.students || []);
          setAteliers(d.ateliers || []);
          setIntervenants(d.intervenants || []);
          if (Array.isArray(d.guidances) && d.guidances.length) setGuidances(d.guidances);
        } catch (e) {}
      }
      const sess = await store.get('aba:sessions');
      if (sess) { try { setSessions(JSON.parse(sess)); } catch (e) {} }
      const cri = await store.get('aba:crises');
      if (cri) { try { setCrises(JSON.parse(cri)); } catch (e) {} }
      const act = await store.get('aba:active');
      if (act) { try { setActiveSession(JSON.parse(act)); } catch (e) {} }
      setLoaded(true);
    })();
  }, []);

  /* --- sauvegardes --- */
  useEffect(() => {
    if (!loaded) return;
    store.set('aba:config', JSON.stringify({ students, ateliers, intervenants, guidances }));
  }, [students, ateliers, intervenants, guidances, loaded]);
  useEffect(() => {
    if (!loaded) return;
    store.set('aba:sessions', JSON.stringify(sessions));
  }, [sessions, loaded]);
  useEffect(() => {
    if (!loaded) return;
    store.set('aba:crises', JSON.stringify(crises));
  }, [crises, loaded]);
  useEffect(() => {
    if (!loaded) return;
    store.set('aba:active', JSON.stringify(activeSession));
  }, [activeSession, loaded]);

  function notify(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  /* --- administratif --- */
  const addStudent = (initials) => setStudents((s) => [...s, { id: uid(), initials, objectives: [] }]);
  const removeStudent = (id) => setStudents((s) => s.filter((x) => x.id !== id));
  const renameStudent = (id, initials) => setStudents((s) => s.map((x) => (x.id === id ? { ...x, initials } : x)));
  const addAtelier = (name) => setAteliers((a) => [...a, { id: uid(), name }]);
  const removeAtelier = (id) => setAteliers((a) => a.filter((x) => x.id !== id));
  const renameAtelier = (id, name) => setAteliers((a) => a.map((x) => (x.id === id ? { ...x, name } : x)));
  const setAtelierGroup = (id, studentIds) => setAteliers((a) => a.map((x) => (x.id === id ? { ...x, usualStudentIds: studentIds } : x)));
  const addIntervenant = (name) => setIntervenants((l) => [...l, { id: uid(), name }]);
  const removeIntervenant = (id) => setIntervenants((l) => l.filter((x) => x.id !== id));
  const renameIntervenant = (id, name) => setIntervenants((l) => l.map((x) => (x.id === id ? { ...x, name } : x)));
  const addGuidance = (g) => setGuidances((l) => [...l, g]);
  const removeGuidance = (code) => setGuidances((l) => (l.length > 1 ? l.filter((x) => x.code !== code) : l));
  const toggleIndependent = (code) => setGuidances((l) => l.map((x) => (x.code === code ? { ...x, independent: !x.independent } : x)));

  /* --- sauvegarde / restauration --- */
  function exportBackup() {
    const payload = { format: 'aba-backup', version: 2, exportedAt: new Date().toISOString(), students, ateliers, intervenants, guidances, sessions, crises };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `sauvegarde-aba-${new Date().toISOString().slice(0, 10)}.json`);
    notify('Sauvegarde exportée');
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
      if (!d || !Array.isArray(d.students)) {
        notify('Ce fichier n’est pas une sauvegarde valide');
        return;
      }
      const ok = window.confirm(
        `Restaurer cette sauvegarde ?\n\n${(d.students || []).length} élève(s), ${(d.sessions || []).length} séance(s).\n\nToutes les données actuelles de cette tablette seront remplacées.`
      );
      if (!ok) return;
      setStudents(d.students || []);
      setAteliers(d.ateliers || []);
      setIntervenants(d.intervenants || []);
      if (Array.isArray(d.guidances) && d.guidances.length) setGuidances(d.guidances);
      setSessions(d.sessions || []);
      setCrises(d.crises || []);
      notify('Sauvegarde restaurée');
    };
    reader.readAsText(file);
  }

  const addObjective = (studentId, objective) =>
    setStudents((s) => s.map((st) => (st.id === studentId ? { ...st, objectives: [...st.objectives, objective] } : st)));
  const removeObjective = (studentId, objId) =>
    setStudents((s) => s.map((st) => (st.id === studentId ? { ...st, objectives: st.objectives.filter((o) => o.id !== objId) } : st)));
  const updateObjective = (studentId, objId, next) =>
    setStudents((s) => s.map((st) => (st.id === studentId ? { ...st, objectives: st.objectives.map((o) => (o.id === objId ? { ...next, id: objId } : o)) } : st)));
  const duplicateObjective = (objective, targetIds) => {
    setStudents((s) => s.map((st) => (targetIds.includes(st.id) ? { ...st, objectives: [...st.objectives, { ...objective, id: uid() }] } : st)));
    notify(`Objectif copié vers ${targetIds.length} élève${targetIds.length !== 1 ? 's' : ''}`);
  };
  const toggleFavorite = (studentId, objId) =>
    setStudents((s) => s.map((st) => (st.id === studentId ? { ...st, objectives: st.objectives.map((o) => (o.id === objId ? { ...o, favorite: !o.favorite } : o)) } : st)));

  /* --- reprise d'une séance enregistrée pour correction --- */
  const editSession = (s) => setActiveSession({ ...s, isEdit: true });
  const mailSession = (s) => {
    const wb = buildWorkbook([s], crises.filter((c) => c.sessionId === s.id), students, ateliers, intervenants, guidances);
    const a = ateliers.find((x) => x.id === s.atelierId);
    const jour = new Date(s.date).toLocaleDateString('fr-FR');
    shareReport({
      blob: workbookBlob(wb),
      name: `seance-${new Date(s.date).toISOString().slice(0, 10)}.xlsx`,
      subject: `Rapport ABA du ${jour}${a ? ` — ${a.name}` : ''}`,
      body: `Bonjour,\n\nVeuillez trouver le relevé de cotations de la séance du ${jour}${a ? ` (${a.name})` : ''}, ${s.studentIds.length} élève(s).\n\nCordialement,`,
      notify,
    });
  };

  const deleteSession = (id) => {
    setSessions((list) => list.filter((s) => s.id !== id));
    notify('Séance supprimée');
  };

  /* --- crise --- */
  const openCrisis = () =>
    setCrisis({
      id: uid(),
      date: new Date().toISOString(),
      startedAt: Date.now(),
      isNew: true,
      sessionId: (activeSession && activeSession.id) || null,
      studentId: null,
      atelierId: (activeSession && activeSession.atelierId) || null,
      intervenantIds: activeSession && activeSession.intervenantId ? [activeSession.intervenantId] : [],
      commentaire: '',
      antecedent: '',
      comportement: '',
      consequence: '',
    });

  const editCrisis = (c) =>
    setCrisis({
      ...c,
      isNew: false,
      atelierId: c.atelierId || null,
      intervenantIds: c.intervenantIds || (c.intervenantId ? [c.intervenantId] : []),
      commentaire: c.commentaire || '',
    });

  const saveCrisis = (c) => {
    const { isNew, ...rest } = c;
    if (isNew) {
      setCrises((list) => [{ ...rest, durationMs: Date.now() - c.startedAt }, ...list]);
      notify('Crise enregistrée');
    } else {
      setCrises((list) => list.map((x) => (x.id === rest.id ? { ...x, ...rest } : x)));
      notify('Crise modifiée');
    }
    setCrisis(null);
  };

  const deleteCrisis = (id) => {
    setCrises((list) => list.filter((x) => x.id !== id));
    setCrisis(null);
    notify('Crise supprimée');
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAPER, color: INK_SOFT, fontFamily: F_BODY }}>
        Chargement…
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK, fontFamily: F_BODY }}>
      {/* Navigation */}
      <div
        className="sticky top-0 z-20 px-4 pb-2"
        style={{ background: PAPER, borderBottom: `1px solid ${BORDER}`, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <div className="max-w-4xl mx-auto flex gap-1">
          {[
            { k: 'admin', label: 'Administratif', icon: Layers },
            { k: 'students', label: 'Élèves', icon: Users },
            { k: 'session', label: 'Session', icon: Play },
            { k: 'suivi', label: 'Suivi', icon: TrendingUp },
            { k: 'export', label: 'Export', icon: Mail },
          ].map((t) => {
            const Icon = t.icon;
            const on = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5"
                style={{
                  fontFamily: F_DISPLAY,
                  backgroundColor: on ? INK : 'transparent',
                  color: on ? '#fff' : INK_SOFT,
                }}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div ref={contentRef} className="max-w-4xl mx-auto px-4 pt-5 pb-28">
        <div
          key={tab}
          style={{
            animation: dir === 0 ? 'none' : `${dir > 0 ? 'abaInFromRight' : 'abaInFromLeft'} .18s ease-out`,
          }}
        >
        {tab === 'admin' && (
          <AdminScreen
            students={students} ateliers={ateliers} intervenants={intervenants} guidances={guidances}
            addStudent={addStudent} removeStudent={removeStudent} renameStudent={renameStudent}
            addAtelier={addAtelier} removeAtelier={removeAtelier} renameAtelier={renameAtelier}
            addIntervenant={addIntervenant} removeIntervenant={removeIntervenant} renameIntervenant={renameIntervenant}
            onAddGuidance={addGuidance} onRemoveGuidance={removeGuidance} onToggleIndependent={toggleIndependent}
            onExportBackup={exportBackup} onImportBackup={importBackup}
          />
        )}
        {tab === 'students' && (
          <StudentsScreen students={students} addObjective={addObjective} removeObjective={removeObjective} updateObjective={updateObjective} duplicateObjective={duplicateObjective} toggleFavorite={toggleFavorite} />
        )}
        {tab === 'session' && (
          <SessionScreen
            students={students} ateliers={ateliers} intervenants={intervenants}
            sessions={sessions} crises={crises} guidances={guidances} onEditSession={editSession} onDeleteSession={deleteSession}
            onSetAtelierGroup={setAtelierGroup} onMailSession={mailSession} notify={notify}
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
        {tab === 'suivi' && <SuiviScreen students={students} sessions={sessions} guidances={guidances} />}
        {tab === 'export' && (
          <ExportScreen sessions={sessions} crises={crises} students={students} ateliers={ateliers} intervenants={intervenants} guidances={guidances} notify={notify} onEditCrisis={editCrisis} />
        )}
        </div>
      </div>

      {/* Bouton de crise, présent sur tous les écrans */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 px-4 pt-6"
        style={{ background: `linear-gradient(to top, ${PAPER} 55%, transparent)`, paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        <div className="max-w-4xl mx-auto">
          <button
            onClick={openCrisis}
            className="w-full rounded-2xl py-4 text-white font-semibold flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-transform"
            style={{ backgroundColor: CRISIS, fontFamily: F_DISPLAY, letterSpacing: '0.02em' }}
          >
            <AlertTriangle size={19} /> CRISE
          </button>
        </div>
      </div>

      {crisis && (
        <CrisisOverlay
          crisis={crisis} setCrisis={setCrisis}
          students={students} ateliers={ateliers} intervenants={intervenants}
          onSave={saveCrisis} onDelete={deleteCrisis}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-xl text-sm text-white shadow-lg" style={{ backgroundColor: INK }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ==================== Écran 1 : administratif ==================== */
function AdminScreen({ students, ateliers, intervenants, guidances, addStudent, removeStudent, renameStudent, addAtelier, removeAtelier, renameAtelier, addIntervenant, removeIntervenant, renameIntervenant, onAddGuidance, onRemoveGuidance, onToggleIndependent, onExportBackup, onImportBackup }) {
  const [initials, setInitials] = useState('');
  const [atelier, setAtelier] = useState('');
  const [intervenant, setIntervenant] = useState('');
  const [addingGuidance, setAddingGuidance] = useState(false);
  const [gCode, setGCode] = useState('');
  const [gLabel, setGLabel] = useState('');
  const [gColor, setGColor] = useState(GUIDANCE_PALETTE[0]);
  const [gIndep, setGIndep] = useState(false);
  const fileRef = useRef(null);

  return (
    <div>
      <SectionTitle sub="Les élèves sont identifiés par leurs initiales uniquement.">Administratif</SectionTitle>

      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} style={{ color: INK_SOFT }} />
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>Élèves</span>
          <span className="text-sm ml-auto" style={{ color: INK_SOFT, fontFamily: F_MONO }}>{students.length}</span>
        </div>
        <div className="flex gap-2 mb-3">
          <Field value={initials} onChange={setInitials} placeholder="Initiales (ex. J.D.)" onEnter={() => { if (initials.trim()) { addStudent(initials.trim()); setInitials(''); } }} />
          <Btn onClick={() => { if (initials.trim()) { addStudent(initials.trim()); setInitials(''); } }} className="px-4 shrink-0"><Plus size={18} /></Btn>
        </div>
        {students.length === 0 ? (
          <Empty>Ajoutez un premier élève pour commencer.</Empty>
        ) : (
          <div className="space-y-1.5">
            {students.map((s) => (
              <EditableRow
                key={s.id}
                label={s.initials}
                onRename={(v) => renameStudent(s.id, v)}
                onRemove={() => removeStudent(s.id)}
              />
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers size={16} style={{ color: INK_SOFT }} />
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>Ateliers</span>
          <span className="text-sm ml-auto" style={{ color: INK_SOFT, fontFamily: F_MONO }}>{ateliers.length}</span>
        </div>
        <div className="flex gap-2 mb-3">
          <Field value={atelier} onChange={setAtelier} placeholder="Nom de l'atelier (ex. Groupe habiletés sociales)" onEnter={() => { if (atelier.trim()) { addAtelier(atelier.trim()); setAtelier(''); } }} />
          <Btn onClick={() => { if (atelier.trim()) { addAtelier(atelier.trim()); setAtelier(''); } }} className="px-4 shrink-0"><Plus size={18} /></Btn>
        </div>
        {ateliers.length === 0 ? (
          <Empty>Aucun atelier créé.</Empty>
        ) : (
          <div className="space-y-1.5">
            {ateliers.map((a) => (
              <EditableRow key={a.id} label={a.name} onRename={(v) => renameAtelier(a.id, v)} onRemove={() => removeAtelier(a.id)} />
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <UserCog size={16} style={{ color: INK_SOFT }} />
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>Intervenants</span>
          <span className="text-sm ml-auto" style={{ color: INK_SOFT, fontFamily: F_MONO }}>{intervenants.length}</span>
        </div>
        <div className="flex gap-2 mb-3">
          <Field value={intervenant} onChange={setIntervenant} placeholder="Nom de l'intervenant" onEnter={() => { if (intervenant.trim()) { addIntervenant(intervenant.trim()); setIntervenant(''); } }} />
          <Btn onClick={() => { if (intervenant.trim()) { addIntervenant(intervenant.trim()); setIntervenant(''); } }} className="px-4 shrink-0"><Plus size={18} /></Btn>
        </div>
        {intervenants.length === 0 ? (
          <Empty>Ajoutez les professionnels qui cotent, pour la traçabilité des relevés.</Empty>
        ) : (
          <div className="space-y-1.5">
            {intervenants.map((i) => (
              <EditableRow key={i.id} label={i.name} onRename={(v) => renameIntervenant(i.id, v)} onRemove={() => removeIntervenant(i.id)} />
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal size={16} style={{ color: INK_SOFT }} />
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>Guidances</span>
          <span className="text-sm ml-auto" style={{ color: INK_SOFT, fontFamily: F_MONO }}>{guidances.length}</span>
        </div>
        <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
          Utilisées pour les cotations essai par essai et par analyse de tâche. Les guidances marquées d'une étoile
          comptent comme réussite autonome dans les pourcentages et les critères de maîtrise.
        </p>
        <div className="space-y-1.5 mb-3">
          {guidances.map((g) => (
            <div key={g.code} className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: PAPER }}>
              <span className="w-9 h-7 rounded-md flex items-center justify-center text-xs font-semibold text-white shrink-0"
                style={{ backgroundColor: g.color, fontFamily: F_DISPLAY }}>
                {g.code}
              </span>
              <span className="text-sm flex-1 min-w-0 truncate">{g.label}</span>
              <button onClick={() => onToggleIndependent(g.code)} title="Compte comme indépendant"
                style={{ color: g.independent ? '#D69A2D' : INK_SOFT }}>
                <Star size={15} fill={g.independent ? '#D69A2D' : 'none'} />
              </button>
              <button onClick={() => onRemoveGuidance(g.code)} style={{ color: INK_SOFT }} title="Supprimer">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
        {addingGuidance ? (
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
                  onAddGuidance({ code, label: gLabel.trim(), color: gColor, independent: gIndep });
                  setGCode(''); setGLabel(''); setGIndep(false); setAddingGuidance(false);
                }}
                disabled={!gCode.trim() || !gLabel.trim() || guidances.some((x) => x.code === gCode.trim())}
                className="flex-1 text-sm py-2.5"
              >
                Ajouter
              </Btn>
              <Btn variant="ghost" onClick={() => setAddingGuidance(false)} className="text-sm py-2.5">Annuler</Btn>
            </div>
            {guidances.some((x) => x.code === gCode.trim()) && gCode.trim() && (
              <div className="text-xs" style={{ color: CRISIS }}>Ce code existe déjà.</div>
            )}
          </div>
        ) : (
          <Btn variant="ghost" onClick={() => setAddingGuidance(true)} className="w-full text-sm">
            <Plus size={16} /> Ajouter une guidance
          </Btn>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-2">
          <Save size={16} style={{ color: INK_SOFT }} />
          <span className="font-semibold" style={{ fontFamily: F_DISPLAY }}>Sauvegarde</span>
        </div>
        <p className="text-xs mb-3" style={{ color: INK_SOFT }}>
          Les données ne vivent que sur cette tablette. Exportez régulièrement une sauvegarde : c'est le seul moyen de récupérer l'historique après un effacement ou un changement d'appareil.
        </p>
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
        <div className="flex gap-2">
          <Btn variant="outline" onClick={onExportBackup} className="flex-1 text-sm"><Download size={16} /> Exporter</Btn>
          <Btn variant="ghost" onClick={() => fileRef.current && fileRef.current.click()} className="flex-1 text-sm"><Upload size={16} /> Restaurer</Btn>
        </div>
      </Card>
    </div>
  );
}

/* ==================== Écran 2 : élèves et objectifs ==================== */
function StudentsScreen({ students, addObjective, removeObjective, updateObjective, duplicateObjective, toggleFavorite }) {
  const [openId, setOpenId] = useState(null);
  const [editingObj, setEditingObj] = useState(null);
  const [copyingObj, setCopyingObj] = useState(null);
  const [copyTargets, setCopyTargets] = useState([]);

  if (students.length === 0) {
    return (
      <div>
        <SectionTitle>Élèves</SectionTitle>
        <Empty>Ajoutez d'abord des élèves dans l'écran Administratif.</Empty>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle sub="Définissez les objectifs de chaque élève et le mode de cotation associé.">Élèves</SectionTitle>
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
                  <span className="block text-xs" style={{ color: INK_SOFT }}>{s.objectives.length} objectif{s.objectives.length !== 1 ? 's' : ''}</span>
                </span>
              </span>
              <ChevronRight size={18} style={{ color: INK_SOFT, transform: openId === s.id ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
            </button>

            {openId === s.id && (
              <div className="mt-4">
                <div className="space-y-1.5 mb-3">
                  {s.objectives.map((o) => {
                    const meta = TYPES[o.type];
                    const Icon = meta.icon;
                    if (editingObj === o.id) {
                      return (
                        <ObjectiveForm
                          key={o.id}
                          initial={o}
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
                            {currentTarget(o) && (
                              <div className="text-xs mt-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5" style={{ backgroundColor: CARD, color: INK }}>
                                <Target size={11} /> cible en cours : {currentTarget(o).name}
                              </div>
                            )}
                              <div className="text-xs" style={{ color: INK_SOFT }}>
                                {meta.short}
                                {o.type === 'trials' && ` · ${o.config.trialCount} essais`}
                                {o.type === 'interval' && ` · toutes les ${o.config.intervalMinutes} min · ${INTERVAL_MODE_SHORT[o.config.intervalMode] || 'momentané'} · ${(o.config.levels || []).length} niveaux`}
                                {o.type === 'chaining' && ` · ${(o.config.steps || []).length} étapes`}
                                {o.config.mastery && ` · acquis à ${o.config.mastery.threshold} % sur ${o.config.mastery.sessions} ${o.config.mastery.unit === 'days' ? 'jours' : 'séances'}`}
                                {objectiveTargets(o).length > 0 && ` · ${(o.masteredTargetIds || []).length}/${objectiveTargets(o).length} cibles acquises`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => toggleFavorite(s.id, o.id)} style={{ color: o.favorite ? '#D69A2D' : INK_SOFT }} title="Objectif prioritaire">
                              <Star size={15} fill={o.favorite ? '#D69A2D' : 'none'} />
                            </button>
                            <button onClick={() => { setCopyingObj(copyingObj === o.id ? null : o.id); setCopyTargets([]); }} style={{ color: INK_SOFT }} title="Copier vers d'autres élèves"><Copy size={15} /></button>
                            <button onClick={() => setEditingObj(o.id)} style={{ color: INK_SOFT }} title="Modifier"><Pencil size={15} /></button>
                            <button onClick={() => removeObjective(s.id, o.id)} style={{ color: INK_SOFT }} title="Supprimer"><Trash2 size={15} /></button>
                          </div>
                        </div>

                        {copyingObj === o.id && (
                          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                            <div className="text-xs mb-2" style={{ color: INK_SOFT }}>Copier cet objectif vers</div>
                            {students.filter((x) => x.id !== s.id).length === 0 ? (
                              <div className="text-xs" style={{ color: INK_SOFT }}>Aucun autre élève enregistré.</div>
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
                <ObjectiveEditor onAdd={(o) => addObjective(s.id, o)} />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function ObjectiveEditor({ onAdd }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Btn variant="ghost" onClick={() => setOpen(true)} className="w-full text-sm">
        <Plus size={16} /> Ajouter un objectif
      </Btn>
    );
  }
  return <ObjectiveForm onSubmit={(o) => { onAdd(o); setOpen(false); }} onCancel={() => setOpen(false)} />;
}

function ObjectiveForm({ initial, onSubmit, onCancel }) {
  const init = initial || {};
  const initConfig = init.config || {};
  const [name, setName] = useState(init.name || '');
  const [type, setType] = useState(init.type || 'trials');
  const [trialCount, setTrialCount] = useState(initConfig.trialCount || 10);
  const [intervalMinutes, setIntervalMinutes] = useState(initConfig.intervalMinutes || 5);
  const [intervalMode, setIntervalMode] = useState(initConfig.intervalMode || 'momentane');
  const [steps, setSteps] = useState(initConfig.steps || DEFAULT_CHAIN_STEPS);
  const [newStep, setNewStep] = useState('');
  const [targets, setTargets] = useState(initConfig.targets || []);
  const [newTarget, setNewTarget] = useState('');
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
    if (type === 'trials') config.trialCount = trialCount;
    if (type === 'interval') {
      config.intervalMinutes = intervalMinutes;
      config.intervalMode = intervalMode;
      config.levels = levels;
      config.targetLevelId = levels.some((l) => l.id === targetLevelId) ? targetLevelId : levels[0].id;
    }
    if (type === 'chaining') config.steps = steps;
    if (PERCENT_TYPES.includes(type)) {
      config.mastery = { threshold, sessions: masterySessions, unit: masteryUnit };
      if (targets.length) config.targets = targets;
    }
    onSubmit({
      id: init.id || uid(),
      name: name.trim(),
      type,
      config,
      favorite: !!init.favorite,
      currentTargetId: init.currentTargetId || null,
      masteredTargetIds: init.masteredTargetIds || [],
    });
  }

  return (
    <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: BORDER }}>
      <Field autoFocus value={name} onChange={setName} placeholder="Intitulé de l'objectif" />

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
          <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Nombre d'essais : <span style={{ fontFamily: F_MONO }}>{trialCount}</span></div>
          <div className="flex gap-1.5 flex-wrap">
            {[3, 5, 8, 10].map((n) => (
              <button key={n} onClick={() => setTrialCount(n)} className="rounded-lg px-3.5 py-2 text-sm border"
                style={{ borderColor: trialCount === n ? INK : BORDER, backgroundColor: trialCount === n ? INK : 'transparent', color: trialCount === n ? '#fff' : INK_SOFT, fontFamily: F_MONO }}>
                {n}
              </button>
            ))}
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
            <div className="flex gap-1.5">
              {[1, 5, 10].map((n) => (
                <button key={n} onClick={() => setIntervalMinutes(n)} className="flex-1 rounded-lg py-2.5 text-sm border"
                  style={{ borderColor: intervalMinutes === n ? INK : BORDER, backgroundColor: intervalMinutes === n ? INK : 'transparent', color: intervalMinutes === n ? '#fff' : INK_SOFT }}>
                  {n} min
                </button>
              ))}
            </div>
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

      {type === 'chaining' && (
        <div>
          <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Étapes de la séquence, dans l'ordre</div>
          <div className="space-y-1.5 mb-2">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ backgroundColor: PAPER }}>
                <span className="text-xs w-5 shrink-0" style={{ fontFamily: F_MONO, color: INK_SOFT }}>{i + 1}</span>
                <span className="text-sm flex-1">{s.name}</span>
                <button onClick={() => setSteps((ls) => (i > 0 ? [...ls.slice(0, i - 1), ls[i], ls[i - 1], ...ls.slice(i + 1)] : ls))} style={{ color: INK_SOFT }} title="Monter">↑</button>
                <button onClick={() => setSteps((ls) => ls.filter((x) => x.id !== s.id))} style={{ color: INK_SOFT }}><X size={14} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Field value={newStep} onChange={setNewStep} placeholder="Nom de l'étape" onEnter={() => { if (newStep.trim()) { setSteps((ls) => [...ls, { id: uid(), name: newStep.trim() }]); setNewStep(''); } }} />
            <Btn variant="ghost" onClick={() => { if (newStep.trim()) { setSteps((ls) => [...ls, { id: uid(), name: newStep.trim() }]); setNewStep(''); } }} className="px-4 shrink-0"><Plus size={16} /></Btn>
          </div>
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
              type="number" min="1" max="100" value={threshold}
              onChange={(e) => setThreshold(Math.min(100, Math.max(1, Number(e.target.value) || 0)))}
              className="w-16 rounded-lg border px-2 py-2 text-sm bg-transparent text-center"
              style={{ borderColor: BORDER, fontFamily: F_MONO, color: INK }}
            />
            <span className="text-sm">% sur</span>
            <input
              type="number" min="1" max="60" value={masterySessions}
              onChange={(e) => setMasterySessions(Math.min(60, Math.max(1, Number(e.target.value) || 0)))}
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
        <Btn onClick={submit} disabled={!name.trim() || (type === 'interval' && levels.length === 0) || (type === 'chaining' && steps.length === 0)} className="flex-1 text-sm">
          {initial ? 'Enregistrer les modifications' : "Ajouter l'objectif"}
        </Btn>
        <Btn variant="ghost" onClick={onCancel} className="text-sm">Annuler</Btn>
      </div>
    </div>
  );
}

/* ==================== Écran 3 : session ==================== */
function SessionScreen({ students, ateliers, intervenants, sessions, crises, guidances, onEditSession, onDeleteSession, onMailSession, onSetAtelierGroup, notify, activeSession, setActiveSession, onFinish }) {
  if (activeSession) {
    return <SessionRunning session={activeSession} setSession={setActiveSession} students={students} ateliers={ateliers} intervenants={intervenants} crises={crises} guidances={guidances} onFinish={onFinish} />;
  }
  return (
    <SessionSetup
      students={students} ateliers={ateliers} intervenants={intervenants} sessions={sessions}
      onEditSession={onEditSession} onDeleteSession={onDeleteSession} onMailSession={onMailSession}
      onSetAtelierGroup={onSetAtelierGroup} notify={notify}
      onStart={setActiveSession}
    />
  );
}

function SessionSetup({ students, ateliers, intervenants, sessions, onEditSession, onDeleteSession, onMailSession, onSetAtelierGroup, notify, onStart }) {
  const [atelierId, setAtelierId] = useState(null);
  const [intervenantId, setIntervenantId] = useState(null);
  const [studentIds, setStudentIds] = useState([]);
  const [selected, setSelected] = useState({});
  const [autoApplied, setAutoApplied] = useState(false);

  const applyGroup = (ids) => {
    setStudentIds(ids);
    setSelected(() => {
      const next = {};
      ids.forEach((id) => {
        const st = students.find((s) => s.id === id);
        next[id] = st ? st.objectives.map((o) => o.id) : [];
      });
      return next;
    });
    setAutoApplied(true);
  };

  const pickAtelier = (id) => {
    const next = atelierId === id ? null : id;
    setAtelierId(next);
    if (next) {
      const a = ateliers.find((x) => x.id === next);
      const usual = a && a.usualStudentIds ? a.usualStudentIds.filter((sid) => students.some((s) => s.id === sid)) : [];
      if (usual.length && (studentIds.length === 0 || autoApplied)) applyGroup(usual);
    }
  };

  const toggleStudent = (id) => {
    setAutoApplied(false);
    setStudentIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    setSelected((sel) => {
      if (sel[id]) { const n = { ...sel }; delete n[id]; return n; }
      const st = students.find((s) => s.id === id);
      return { ...sel, [id]: st ? st.objectives.map((o) => o.id) : [] };
    });
  };
  const toggleObjective = (sid, oid) =>
    setSelected((sel) => {
      const cur = sel[sid] || [];
      return { ...sel, [sid]: cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid] };
    });

  const currentAtelier = ateliers.find((a) => a.id === atelierId);
  const sameAsUsual =
    currentAtelier && currentAtelier.usualStudentIds &&
    currentAtelier.usualStudentIds.length === studentIds.length &&
    currentAtelier.usualStudentIds.every((id) => studentIds.includes(id));

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
        snapshot[oid] = { ...obj, activeTargetName: cible ? cible.name : null };
        data[sid][oid] = { ...emptyEntry(obj), targetId: cible ? cible.id : null };
      });
    });
    onStart({
      id: uid(),
      date: new Date().toISOString(),
      startedAt: Date.now(),
      atelierId,
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
        <Empty>Créez au moins un élève dans l'écran Administratif.</Empty>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle sub="Choisissez l'atelier, les élèves présents et les objectifs travaillés.">Nouvelle session</SectionTitle>

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
                    Groupe habituel : {a.usualStudentIds.length} élève{a.usualStudentIds.length !== 1 ? 's' : ''}
                  </span>
                )}
              </span>
              {atelierId === a.id && <Check size={16} className="shrink-0" />}
            </button>
          ))}
        </div>
      </Card>

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
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: INK_SOFT }}>Élèves présents</span>
          {atelierId && studentIds.length > 0 && !sameAsUsual && (
            <button
              onClick={() => { onSetAtelierGroup(atelierId, studentIds); notify('Groupe habituel mémorisé pour cet atelier'); }}
              className="text-xs flex items-center gap-1"
              style={{ color: INK_SOFT }}
            >
              <Star size={12} /> Mémoriser ce groupe
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

      {studentIds.map((sid) => {
        const st = students.find((s) => s.id === sid);
        if (!st) return null;
        return (
          <Card key={sid} className="mb-3">
            <div className="font-semibold mb-2" style={{ fontFamily: F_DISPLAY }}>{st.initials}</div>
            {st.objectives.length === 0 ? (
              <div className="text-sm" style={{ color: INK_SOFT }}>Aucun objectif défini pour cet élève.</div>
            ) : (
              <div className="space-y-1.5">
                {st.objectives.map((o) => {
                  const on = (selected[sid] || []).includes(o.id);
                  const meta = TYPES[o.type];
                  const Icon = meta.icon;
                  return (
                    <button key={o.id} onClick={() => toggleObjective(sid, o.id)} className="w-full rounded-xl px-3 py-2.5 flex items-center gap-2 text-left border text-sm"
                      style={{ borderColor: on ? meta.color : BORDER, backgroundColor: on ? meta.color + '14' : 'transparent' }}>
                      <Icon size={15} style={{ color: meta.color }} />
                      <span className="flex-1">{o.name}</span>
                      {on && <Check size={15} style={{ color: meta.color }} />}
                    </button>
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
            Séances enregistrées — appuyez pour corriger
          </div>
          <div className="space-y-1.5">
            {sessions.slice(0, 15).map((s) => {
              const a = ateliers.find((x) => x.id === s.atelierId);
              return (
                <div key={s.id} className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: BORDER, backgroundColor: CARD }}>
                  <button className="flex-1 text-left" onClick={() => onEditSession(s)}>
                    <div className="text-sm font-medium">{a ? a.name : 'Séance libre'}</div>
                    <div className="text-xs" style={{ color: INK_SOFT }}>
                      {new Date(s.date).toLocaleDateString('fr-FR')} {timeShort(s.date)} · {s.studentIds.length} élève{s.studentIds.length !== 1 ? 's' : ''}
                    </div>
                  </button>
                  <button
                    onClick={() => onMailSession(s)}
                    style={{ color: INK_SOFT }}
                    title="Envoyer ce rapport par mail"
                  >
                    <Mail size={16} />
                  </button>
                  <button
                    onClick={() => { if (window.confirm('Supprimer définitivement cette séance ?')) onDeleteSession(s.id); }}
                    style={{ color: INK_SOFT }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionRunning({ session, setSession, students, ateliers, intervenants, crises, guidances, onFinish }) {
  const isEdit = !!session.isEdit;
  const [currentId, setCurrentId] = useState(session.studentIds[0]);
  const [viewMode, setViewMode] = useState('priority');
  const cotationRef = useRef(null);

  /* Balayage horizontal sur la zone de cotation : bascule entre les deux vues.
     La zone porte data-no-swipe, donc le balayage de page ne s'y déclenche pas. */
  useEffect(() => {
    const el = cotationRef.current;
    if (!el) return undefined;
    let g = null;
    const start = (e) => {
      if (e.touches.length !== 1 || ownsHorizontalGesture(e.target)) { g = null; return; }
      g = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null };
    };
    const move = (e) => {
      if (!g || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - g.x;
      const dy = e.touches[0].clientY - g.y;
      if (!g.axis) {
        if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return;
        g.axis = Math.abs(dx) > Math.abs(dy) + 6 ? 'x' : 'y';
      }
      if (g.axis !== 'x') return;
      if (e.cancelable) e.preventDefault();
      g.dx = dx;
    };
    const end = () => {
      if (!g || g.axis !== 'x' || Math.abs(g.dx || 0) < 60) { g = null; return; }
      setViewMode((g.dx || 0) < 0 ? 'student' : 'priority');
      g = null;
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end, { passive: true });
    el.addEventListener('touchcancel', end, { passive: true });
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, []);
  const [now, setNow] = useState(Date.now());
  const [soundOn, setSoundOn] = useState(true);
  const [wakeOk, setWakeOk] = useState(false);
  const stepsRef = useRef({});

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
      if (o && o.type === 'interval') stepSet.add(o.config.intervalMinutes);
    });
    let fire = false;
    stepSet.forEach((min) => {
      const idx = Math.floor((now - session.startedAt) / (min * 60000)) + 1;
      const prev = stepsRef.current[min];
      if (prev !== undefined && idx > prev) fire = true;
      stepsRef.current[min] = idx;
    });
    if (fire) alertInterval(soundOn);
  }, [now]);

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
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate" style={{ fontFamily: F_DISPLAY }}>{atelier ? atelier.name : 'Séance libre'}</h1>
          <p className="text-sm" style={{ color: INK_SOFT }}>
            {isEdit ? <>Correction · {new Date(session.date).toLocaleDateString('fr-FR')} {timeShort(session.date)}</> : <span style={{ fontFamily: F_MONO }}>{fmtClock(elapsed)}</span>}
            {intervenant && <> · {intervenant.name}</>}
            {!isEdit && wakeOk && <> · <Sun size={12} className="inline" /> écran maintenu</>}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
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
          {isEdit && (
            <Btn variant="ghost" onClick={() => setSession(null)} className="text-sm py-2.5">Annuler</Btn>
          )}
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
            { k: 'student', label: 'Par élève', icon: Users },
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

      <div className="flex gap-3" data-no-swipe ref={cotationRef}>
        {/* Contenu : tous les prioritaires, ou l'élève courant */}
        <div className="flex-1 min-w-0">
          {viewMode === 'priority' ? (
            <div className="space-y-5">
              {session.studentIds.map((sid) => {
                const st = students.find((s) => s.id === sid);
                if (!st) return null;
                const ids = (session.selectedObjectives[sid] || []).filter((oid) => {
                  const o = session.objectiveSnapshot[oid];
                  return o && o.favorite;
                });
                return (
                  <div key={sid}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold" style={{ fontFamily: F_DISPLAY }}>{st.initials}</span>
                      <button
                        onClick={() => { setCurrentId(sid); setViewMode('student'); }}
                        className="text-xs flex items-center gap-1 rounded-lg px-2.5 py-1.5 border"
                        style={{ borderColor: BORDER, color: INK_SOFT, backgroundColor: CARD }}
                      >
                        Tous ses objectifs <ChevronRight size={13} />
                      </button>
                    </div>
                    {ids.length === 0 ? (
                      <div className="rounded-xl border border-dashed px-3 py-4 text-center text-xs" style={{ borderColor: BORDER, color: INK_SOFT }}>
                        Aucun objectif prioritaire pour cet élève.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {ids.map((oid) => (
                          <ObjectiveCard
                            key={oid}
                            obj={session.objectiveSnapshot[oid]}
                            entry={session.data[sid][oid]}
                            now={now} elapsed={elapsed}
                            session={session} crises={crises} studentId={sid} guidances={guidances}
                            hidden={hiddenFor(sid).includes(oid)}
                            onToggleHidden={() => toggleHidden(sid, oid)}
                            onChange={(p) => updateEntry(sid, oid, p)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <div className="mb-3">
                <span className="text-2xl font-semibold" style={{ fontFamily: F_DISPLAY }}>{student ? student.initials : ''}</span>
              </div>
              <div className="space-y-3">
                {objIds.map((oid) => {
                  const obj = session.objectiveSnapshot[oid];
                  if (!obj) return null;
                  return (
                    <ObjectiveCard
                      key={oid}
                      obj={obj}
                      entry={session.data[currentId][oid]}
                      now={now} elapsed={elapsed}
                      session={session} crises={crises} studentId={currentId} guidances={guidances}
                      hidden={hiddenFor(currentId).includes(oid)}
                      onToggleHidden={() => toggleHidden(currentId, oid)}
                      onChange={(p) => updateEntry(currentId, oid, p)}
                    />
                  );
                })}

                <Card>
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
            </div>
          )}
        </div>

        {/* Rail de navigation entre élèves */}
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

function ObjectiveCard({ obj, entry, now, elapsed, session, crises, studentId, guidances, hidden, onToggleHidden, onChange }) {
  if (!obj) return null;
  const crisisSet =
    obj.type === 'interval' ? crisisIntervals(session, crises, obj.config.intervalMinutes, studentId) : null;
  const meta = TYPES[obj.type];
  const Icon = meta.icon;

  if (hidden) {
    return (
      <button
        onClick={onToggleHidden}
        className="w-full rounded-2xl border px-3 py-2.5 flex items-center gap-2 text-left"
        style={{ borderColor: BORDER, backgroundColor: CARD }}
      >
        <Icon size={14} style={{ color: meta.color }} className="shrink-0" />
        <span className="text-sm flex-1 min-w-0 truncate" style={{ color: INK_SOFT }}>{obj.name}</span>
        <Eye size={15} style={{ color: INK_SOFT }} />
      </button>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <ObjectiveHeader obj={obj} entry={entry} guidances={guidances} />
        </div>
        {onToggleHidden && (
          <button onClick={onToggleHidden} style={{ color: INK_SOFT }} title="Masquer cet objectif" className="shrink-0">
            <EyeOff size={15} />
          </button>
        )}
      </div>
      <div className="mt-3">
        {obj.type === 'trials' && <TrialsWidget obj={obj} entry={entry} guidances={guidances} onChange={onChange} />}
        {obj.type === 'probe' && <ProbeWidget entry={entry} onChange={onChange} />}
        {obj.type === 'occurrence' && <OccurrenceWidget entry={entry} onChange={onChange} />}
        {obj.type === 'timer' && <TimerWidget entry={entry} now={now} onChange={onChange} />}
        {obj.type === 'interval' && <IntervalWidget obj={obj} entry={entry} elapsed={elapsed} crisisSet={crisisSet} onChange={onChange} />}
        {obj.type === 'chaining' && <ChainingWidget obj={obj} entry={entry} guidances={guidances} onChange={onChange} />}
        {obj.type === 'latency' && <LatencyWidget entry={entry} now={now} onChange={onChange} />}
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
          <div className="font-medium leading-snug">{obj.name}</div>
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
function TrialsWidget({ obj, entry, guidances, onChange }) {
  const list = guidances && guidances.length ? guidances : DEFAULT_GUIDANCE;
  const trials = entry.trials;
  const cursor = trials.findIndex((t) => t === null);
  const active = cursor === -1 ? trials.length - 1 : cursor;

  function record(code) {
    const idx = trials.findIndex((t) => t === null);
    if (idx === -1) return;
    const next = trials.slice();
    next[idx] = code;
    onChange({ trials: next });
  }
  function undo() {
    const done = trials.filter(Boolean).length;
    if (!done) return;
    const next = trials.slice();
    next[done - 1] = null;
    onChange({ trials: next });
  }
  function setAt(i, code) {
    const next = trials.slice();
    next[i] = next[i] === code ? null : code;
    onChange({ trials: next });
  }

  return (
    <div>
      <div className="flex gap-1.5 mb-2.5 overflow-x-auto pb-1">
        {trials.map((t, i) => {
          const g = t ? guidanceByCode(list, t) : null;
          return (
            <div
              key={i}
              className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-xs font-semibold border"
              style={{
                fontFamily: F_MONO,
                backgroundColor: g ? g.color : CARD,
                color: g ? '#fff' : INK_SOFT,
                borderColor: g ? g.color : BORDER,
                boxShadow: i === active && !t ? `0 0 0 2px ${TYPES.trials.color}66` : 'none',
              }}
            >
              {t || i + 1}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {list.map((g) => (
          <button
            key={g.code}
            onClick={() => record(g.code)}
            disabled={cursor === -1}
            className="flex-1 min-w-[72px] rounded-xl py-3 text-white active:scale-95 transition-transform disabled:opacity-30"
            style={{ backgroundColor: g.color }}
          >
            <div className="text-sm font-semibold" style={{ fontFamily: F_DISPLAY }}>{g.code}</div>
            <div className="text-[10px] opacity-90 leading-tight">{g.label}</div>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs" style={{ color: INK_SOFT }}>
          {cursor === -1 ? 'Tous les essais sont cotés' : `Essai ${cursor + 1} sur ${trials.length}`}
        </span>
        {trials.some(Boolean) && (
          <button onClick={undo} className="text-xs flex items-center gap-1" style={{ color: INK_SOFT }}>
            <RotateCcw size={12} /> annuler
          </button>
        )}
      </div>
    </div>
  );
}

function ProbeWidget({ entry, onChange }) {
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

function TimerWidget({ entry, now, onChange }) {
  const display = entry.running ? entry.elapsedMs + (now - entry.startedAt) : entry.elapsedMs;
  function toggle() {
    if (entry.running) onChange({ running: false, elapsedMs: entry.elapsedMs + (Date.now() - entry.startedAt), startedAt: null });
    else onChange({ running: true, startedAt: Date.now() });
  }
  return (
    <div className="flex items-center gap-3">
      <div className="text-3xl font-semibold tabular-nums" style={{ fontFamily: F_MONO }}>{fmtClock(display)}</div>
      <button onClick={toggle}
        className="ml-auto rounded-xl px-5 py-3 text-white flex items-center gap-2 active:scale-95 transition-transform"
        style={{ backgroundColor: entry.running ? '#A8402F' : TYPES.timer.color, fontFamily: F_DISPLAY }}>
        {entry.running ? <><Pause size={17} /> Arrêter</> : <><Play size={17} /> Démarrer</>}
      </button>
      {(entry.elapsedMs > 0 || entry.running) && (
        <button onClick={() => onChange({ running: false, elapsedMs: 0, startedAt: null })} className="p-2" style={{ color: INK_SOFT }}>
          <RotateCcw size={16} />
        </button>
      )}
    </div>
  );
}

function IntervalWidget({ obj, entry, elapsed, crisisSet, onChange }) {
  const stepMs = (obj.config.intervalMinutes || 5) * 60000;
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
              className="rounded-xl py-3 px-3 text-sm border-2 text-left active:scale-95 transition-transform"
              style={{ borderColor: color, backgroundColor: on ? color : 'transparent', color: on ? '#fff' : color, fontFamily: F_DISPLAY }}>
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
                    className="rounded-lg px-3 py-2 text-xs border"
                    style={{ borderColor: color, backgroundColor: on ? color : 'transparent', color: on ? '#fff' : color }}>
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
  const list = guidances && guidances.length ? guidances : DEFAULT_GUIDANCE;
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
      <div className="space-y-1.5">
        {steps.map((s, i) => {
          const current = entry.steps[s.id];
          return (
            <div key={s.id} className="flex items-center gap-2">
              <span className="text-xs w-5 shrink-0" style={{ fontFamily: F_MONO, color: INK_SOFT }}>{i + 1}</span>
              <span className="text-sm flex-1 min-w-0 truncate">{s.name}</span>
              <div className="flex gap-1 shrink-0">
                {list.map((g) => {
                  const on = current === g.code;
                  return (
                    <button key={g.code} onClick={() => setStep(s.id, g.code)}
                      className="w-11 h-9 rounded-lg text-xs font-semibold border active:scale-95 transition-transform"
                      style={{ fontFamily: F_DISPLAY, borderColor: on ? g.color : BORDER, backgroundColor: on ? g.color : 'transparent', color: on ? '#fff' : INK_SOFT }}>
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
function SuiviScreen({ students, sessions, guidances }) {
  const [openId, setOpenId] = useState(students.length ? students[0].id : null);

  if (students.length === 0) {
    return (
      <div>
        <SectionTitle>Suivi</SectionTitle>
        <Empty>Ajoutez des élèves et enregistrez des séances pour voir les courbes.</Empty>
      </div>
    );
  }

  const ordered = sessions.slice().sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div>
      <SectionTitle sub="Évolution de chaque objectif au fil des séances enregistrées.">Suivi</SectionTitle>
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
                    <ObjectiveChart key={o.id} obj={o} studentId={s.id} sessions={ordered} guidances={guidances} />
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

function ObjectiveChart({ obj, studentId, sessions, guidances }) {
  const meta = TYPES[obj.type];
  const Icon = meta.icon;

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
              {points.length} séance{points.length !== 1 ? 's' : ''}
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
              <Line type="monotone" dataKey="value" stroke={meta.color} strokeWidth={2.5} dot={{ r: 3.5, fill: meta.color }} activeDot={{ r: 5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ==================== Écran 4 : export ==================== */
function ExportScreen({ sessions, crises, students, ateliers, intervenants, guidances, notify, onEditCrisis }) {
  const [mode, setMode] = useState('jour');
  const [picked, setPicked] = useState([]);

  const today = new Date().toDateString();
  const todaySessions = sessions.filter((s) => new Date(s.date).toDateString() === today);
  const todayCrises = crises.filter((c) => new Date(c.date).toDateString() === today);

  const chosen = mode === 'global' ? sessions : sessions.filter((s) => picked.includes(s.id));
  const chosenCrises = mode === 'global' ? crises : todayCrises;

  const atelierName = (id) => (ateliers.find((a) => a.id === id) || {}).name || 'Séance libre';

  function makeFile() {
    const wb = buildWorkbook(chosen, chosenCrises, students, ateliers, intervenants, guidances);
    const blob = workbookBlob(wb);
    const name = mode === 'global'
      ? `rapport-global-${new Date().toISOString().slice(0, 10)}.xlsx`
      : `rapport-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return { blob, name };
  }

  function download() {
    const { blob, name } = makeFile();
    downloadBlob(blob, name);
    notify('Fichier Excel téléchargé');
  }

  async function sendMail() {
    const { blob, name } = makeFile();
    const subject = mode === 'global' ? 'Rapport global ABA' : `Rapport ABA du ${new Date().toLocaleDateString('fr-FR')}`;
    const lines = chosen.map((s) => `- ${new Date(s.date).toLocaleDateString('fr-FR')} ${timeShort(s.date)} · ${atelierName(s.atelierId)} · ${s.studentIds.length} élève(s)`);
    const body = `Bonjour,\n\nVeuillez trouver le relevé de cotations ABA.\n\n${lines.join('\n')}\n\nCrises consignées : ${chosenCrises.length}\n\nLe fichier Excel détaillé est joint (à ajouter depuis vos téléchargements si la pièce jointe n'apparaît pas).\n\nCordialement,`;

    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: subject, text: body });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    downloadBlob(blob, name);
    const a = document.createElement('a');
    a.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    notify('Fichier téléchargé — joignez-le au mail');
  }

  const canExport = mode === 'global' ? sessions.length > 0 : picked.length > 0;

  return (
    <div>
      <SectionTitle sub="Rapports du jour ou historique complet, à transmettre aux cadres pédagogiques.">Export</SectionTitle>

      <div className="flex gap-1.5 mb-4">
        {[{ k: 'jour', l: 'Rapports du jour' }, { k: 'global', l: 'Rapport global' }].map((m) => (
          <button key={m.k} onClick={() => setMode(m.k)} className="flex-1 rounded-xl py-3 text-sm font-medium border"
            style={{ fontFamily: F_DISPLAY, borderColor: mode === m.k ? INK : BORDER, backgroundColor: mode === m.k ? INK : 'transparent', color: mode === m.k ? '#fff' : INK_SOFT }}>
            {m.l}
          </button>
        ))}
      </div>

      {mode === 'jour' ? (
        todaySessions.length === 0 ? (
          <Empty>Aucune séance enregistrée aujourd'hui.</Empty>
        ) : (
          <div className="space-y-1.5 mb-4">
            {todaySessions.map((s) => {
              const on = picked.includes(s.id);
              return (
                <button key={s.id} onClick={() => setPicked((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))}
                  className="w-full rounded-xl px-3.5 py-3 flex items-center justify-between border text-left"
                  style={{ borderColor: on ? INK : BORDER, backgroundColor: on ? INK + '0d' : CARD }}>
                  <div>
                    <div className="text-sm font-medium">{atelierName(s.atelierId)}</div>
                    <div className="text-xs" style={{ color: INK_SOFT }}>{timeShort(s.date)} · {s.studentIds.length} élève{s.studentIds.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="w-6 h-6 rounded-md border flex items-center justify-center" style={{ borderColor: on ? INK : BORDER, backgroundColor: on ? INK : 'transparent' }}>
                    {on && <Check size={14} color="#fff" />}
                  </div>
                </button>
              );
            })}
          </div>
        )
      ) : (
        <Card className="mb-4">
          <div className="text-sm" style={{ color: INK_SOFT }}>
            <span style={{ fontFamily: F_MONO, color: INK }}>{sessions.length}</span> séance{sessions.length !== 1 ? 's' : ''} ·{' '}
            <span style={{ fontFamily: F_MONO, color: INK }}>{crises.length}</span> crise{crises.length !== 1 ? 's' : ''} consignée{crises.length !== 1 ? 's' : ''}
          </div>
        </Card>
      )}

      <div className="flex gap-2">
        <Btn variant="outline" onClick={download} disabled={!canExport} className="flex-1">
          <FileSpreadsheet size={17} /> Télécharger
        </Btn>
        <Btn onClick={sendMail} disabled={!canExport} className="flex-1">
          <Mail size={17} /> Envoyer par mail
        </Btn>
      </div>

      {crises.length > 0 && (
        <div className="mt-6">
          <div className="text-xs uppercase tracking-wide mb-2" style={{ color: INK_SOFT }}>
            Crises consignées — appuyez pour modifier
          </div>
          <div className="space-y-1.5">
            {crises.slice(0, 20).map((c) => {
              const st = students.find((s) => s.id === c.studentId);
              const ids = c.intervenantIds || (c.intervenantId ? [c.intervenantId] : []);
              const names = ids.map((id) => (intervenants.find((i) => i.id === id) || {}).name).filter(Boolean);
              return (
                <button key={c.id} onClick={() => onEditCrisis(c)} className="w-full text-left rounded-2xl border p-4" style={{ borderColor: BORDER, backgroundColor: CARD }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold" style={{ fontFamily: F_DISPLAY }}>{st ? st.initials : 'Élève non renseigné'}</span>
                    <span className="text-xs" style={{ color: INK_SOFT, fontFamily: F_MONO }}>{fmtDuration(c.durationMs)}</span>
                  </div>
                  <div className="text-xs" style={{ color: INK_SOFT }}>
                    {new Date(c.date).toLocaleDateString('fr-FR')} {timeShort(c.date)}
                    {c.atelierId && <> · {atelierName(c.atelierId)}</>}
                    {names.length > 0 && <> · {names.join(', ')}</>}
                  </div>
                  <div className="text-xs mt-1" style={{ color: INK_SOFT }}>
                    {c.comportement || 'comportement non renseigné'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== Module crise ABC ==================== */
function CrisisOverlay({ crisis, setCrisis, students, ateliers, intervenants, onSave, onDelete }) {
  const isNew = !!crisis.isNew;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isNew) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isNew]);

  const elapsed = isNew ? now - crisis.startedAt : crisis.durationMs || 0;
  const set = (patch) => setCrisis((c) => ({ ...c, ...patch }));
  const selectedIntervenants = crisis.intervenantIds || [];

  const toggleIntervenant = (id) =>
    set({ intervenantIds: selectedIntervenants.includes(id) ? selectedIntervenants.filter((x) => x !== id) : [...selectedIntervenants, id] });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: PAPER }}>
      <div
        className="sticky top-0 px-4 pb-4 text-white"
        style={{ backgroundColor: CRISIS, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle size={20} className="shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold leading-tight" style={{ fontFamily: F_DISPLAY }}>
                {isNew ? 'Crise en cours' : 'Modifier la crise'}
              </div>
              <div className="text-xs opacity-90 truncate">
                {isNew ? 'Grille ABC' : `${new Date(crisis.date).toLocaleDateString('fr-FR')} à ${timeShort(crisis.date)}`}
              </div>
            </div>
          </div>
          <div className="text-3xl font-semibold tabular-nums shrink-0" style={{ fontFamily: F_MONO }}>{fmtClock(elapsed)}</div>
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
          <div className="text-xs mb-2" style={{ color: INK_SOFT }}>Élève concerné</div>
          {students.length === 0 ? (
            <div className="text-sm" style={{ color: INK_SOFT }}>Aucun élève enregistré.</div>
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
          { k: 'antecedent', label: 'A — Antécédent', hint: 'Ce qui se passait juste avant' },
          { k: 'comportement', label: 'B — Comportement', hint: 'Ce qui a été observé, de façon factuelle' },
          { k: 'consequence', label: 'C — Conséquence', hint: "Ce qui a suivi, réaction de l'environnement" },
          { k: 'commentaire', label: 'Commentaire', hint: 'Contexte, hypothèses, suites à donner' },
        ].map((f) => (
          <div key={f.k}>
            <div className="text-sm font-medium mb-1" style={{ fontFamily: F_DISPLAY }}>{f.label}</div>
            <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>{f.hint}</div>
            <textarea
              value={crisis[f.k] || ''}
              onChange={(e) => set({ [f.k]: e.target.value })}
              rows={3}
              className="w-full rounded-xl border px-3 py-2.5 text-base bg-transparent"
              style={{ borderColor: BORDER, fontFamily: F_BODY, color: INK }}
            />
          </div>
        ))}

        <div className="flex gap-2 pt-1">
          <Btn onClick={() => onSave(crisis)} className="flex-1" style={{ backgroundColor: CRISIS }}>
            {isNew ? <><Square size={16} /> Terminer et enregistrer</> : <><Save size={16} /> Enregistrer les modifications</>}
          </Btn>
          <Btn variant="ghost" onClick={() => setCrisis(null)}>{isNew ? 'Abandonner' : 'Annuler'}</Btn>
        </div>

        {!isNew && (
          <button
            onClick={() => {
              if (window.confirm('Supprimer définitivement cette crise ?')) onDelete(crisis.id);
            }}
            className="w-full text-sm flex items-center justify-center gap-1.5 py-2"
            style={{ color: INK_SOFT }}
          >
            <Trash2 size={14} /> Supprimer cette crise
          </button>
        )}
      </div>
    </div>
  );
}
