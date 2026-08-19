/* Persistance des données de la tablette. Zone jusqu'ici sans aucun test, et
   c'est là qu'une journée de cotation pouvait disparaître : `setItem` lève
   QuotaExceededError passé ~5 Mo — un plafond PARTAGÉ avec DatABA Manager,
   publié sous la même adresse —, l'ancienne couche rendait `false`, et cinq
   des six effets de sauvegarde ignoraient ce `false`. La séance s'affichait,
   la journée se déroulait, et la tablette rouvrait sans rien.

   Seconde moitié du même défaut : `loadData` traitait toute lecture ratée
   comme une tablette vide, puis les effets réécrivaient cet état vide
   par-dessus des données encore intactes.

   Fonctions extraites de src/App.jsx, pas recopiées (voir test_suivi.mjs).
   `ouvrirBase` est le seul point remplacé : les tests lui donnent une fausse
   base IndexedDB pour pouvoir provoquer un quota, une lecture en panne ou une
   écriture lente. Le chiffrement est remplacé par un équivalent de même
   comportement — laisser passer un enregistrement en clair, lever sur une
   mauvaise clé — parce que c'est ce comportement-là que la couche lit, pas
   AES lui-même. */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let ok = 0, ko = 0;
const t = (n, a, e) => {
  const p = JSON.stringify(a) === JSON.stringify(e);
  console.log(`${p ? 'OK  ' : 'ECHEC'} ${n}` + (p ? '' : ` → ${JSON.stringify(a)} au lieu de ${JSON.stringify(e)}`));
  p ? ok++ : ko++;
};

const ici = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(ici, '..', 'src', 'App.jsx'), 'utf8');

function extraire(nom) {
  const lignes = source.split('\n');
  const debut = lignes.findIndex((l) => l.startsWith(`function ${nom}(`)
    || l.startsWith(`async function ${nom}(`) || l.startsWith(`const ${nom} =`));
  if (debut < 0) throw new Error(`Déclaration introuvable dans src/App.jsx : ${nom}`);
  for (let i = debut; i < lignes.length; i++) {
    if (i > debut && /^(\}|\];|\);)/.test(lignes[i])) {
      return lignes.slice(debut, i + 1).join('\n');
    }
  }
  throw new Error(`Fin de déclaration introuvable : ${nom}`);
}

const code = [
  'const { window, ouvrirBase, encryptValue, decryptValue } = ctx;',
  'let dataKey = ctx.dataKey === undefined ? null : ctx.dataKey;',
  "const PREFIXE = 'aba:';",
  "const IDB_TABLE = 'bloc';",
  extraire('lireIDB'),
  extraire('ecrireIDB'),
  extraire('supprimerIDB'),
  extraire('viderIDB'),
  extraire('estQuota'),
  extraire('ecrireBrut'),
  'let signalerEcriture = () => {};',
  extraire('rapporter'),
  'let chaineEcriture = Promise.resolve();',
  extraire('enFile'),
  extraire('store'),
  extraire('lireJSON'),
  'return { store, lireJSON, estQuota };',
].join('\n');
// eslint-disable-next-line no-new-func
const fabrique = new Function('ctx', code);

/* --- Faux stockage local ---
   `quota` en nombre de caractères, `amnesique` pour la fenêtre de navigation
   privée qui accepte l'écriture et ne rend rien. */
function faireLocalStorage({ quota = Infinity, amnesique = false, initial = {} } = {}) {
  const m = new Map(Object.entries(initial));
  return {
    get length() { return m.size; },
    key(i) { return Array.from(m.keys())[i] ?? null; },
    getItem(k) { return m.has(k) ? m.get(k) : null; },
    setItem(k, v) {
      if (String(v).length > quota) {
        const e = new Error('quota');
        e.name = 'QuotaExceededError';
        throw e;
      }
      if (!amnesique) m.set(k, String(v));
    },
    removeItem(k) { m.delete(k); },
    _contenu: m,
  };
}

/* --- Fausse base IndexedDB ---
   Reproduit le point qui compte : un dépassement de quota laisse la requête
   `put` réussir, puis avorte la transaction. Un code qui écouterait
   `req.onsuccess` au lieu de `tx.oncomplete` annoncerait donc une écriture
   qui n'a jamais eu lieu. */
function faireBase({ quota = Infinity, lectureCasse = false, delai = () => 0 } = {}) {
  const contenu = new Map();
  const db = {
    contenu,
    transaction() {
      const tx = { onerror: null, oncomplete: null, onabort: null, error: null };
      tx.objectStore = () => ({
        put(valeur, cle) {
          const req = { onsuccess: null, onerror: null };
          setTimeout(() => {
            if (req.onsuccess) req.onsuccess();
            if (String(valeur).length > quota) {
              tx.error = Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
              if (tx.onabort) tx.onabort();
              return;
            }
            contenu.set(cle, String(valeur));
            if (tx.oncomplete) tx.oncomplete();
          }, delai(valeur));
          return req;
        },
        get(cle) {
          const req = { onsuccess: null, onerror: null };
          setTimeout(() => {
            if (lectureCasse) {
              req.error = new Error('lecture en panne');
              if (req.onerror) req.onerror();
              return;
            }
            req.result = contenu.has(cle) ? contenu.get(cle) : undefined;
            if (req.onsuccess) req.onsuccess();
          }, 0);
          return req;
        },
        delete(cle) {
          const req = {};
          setTimeout(() => { contenu.delete(cle); if (tx.oncomplete) tx.oncomplete(); }, 0);
          return req;
        },
        clear() {
          const req = {};
          setTimeout(() => { contenu.clear(); if (tx.oncomplete) tx.oncomplete(); }, 0);
          return req;
        },
      });
      return tx;
    },
  };
  return db;
}

/* Chiffrement de substitution, de même comportement observable que
   encryptValue/decryptValue : un enregistrement en clair traverse sans
   broncher, une mauvaise clé lève. */
const encryptValue = async (texte, cle) => JSON.stringify({ __enc: 1, data: `${cle}:${texte}` });
const decryptValue = async (brut, cle) => {
  let env = null;
  try { env = JSON.parse(brut); } catch (e) { return brut; }
  if (!env || env.__enc !== 1) return brut;
  const p = String(env.data);
  if (!p.startsWith(`${cle}:`)) throw new Error('mauvaise clé');
  return p.slice(cle.length + 1);
};

const monter = ({ base = faireBase(), ls = faireLocalStorage(), dataKey = null } = {}) => ({
  ...fabrique({ window: { localStorage: ls }, ouvrirBase: async () => base, encryptValue, decryptValue, dataKey }),
  base, ls,
});

const CRISES = JSON.stringify([{ id: 'c1', date: '2026-03-02' }]);

/* ---------- 1. Le cas nominal, et la fin de localStorage ---------- */
{
  const { store, base, ls } = monter({ ls: faireLocalStorage({ initial: { 'aba:crises': 'ancien' } }) });
  const r = await store.set('aba:crises', CRISES);
  t('une écriture réussie annonce IndexedDB', [r.ok, r.ou], [true, 'indexeddb']);
  t('la valeur est bien dans IndexedDB', JSON.parse(base.contenu.get('aba:crises')).length, 1);
  t('le doublon localStorage est retiré', ls.getItem('aba:crises'), null);
}

/* ---------- 2. Migration depuis l'ancien emplacement ---------- */
{
  const ls = faireLocalStorage({ initial: { 'aba:crises': CRISES } });
  const { store, base } = monter({ ls });
  const lu = await store.lire('aba:crises');
  t('une valeur restée en localStorage est lue', [lu.etat, lu.ou], ['ok', 'localstorage']);
  await store.set('aba:crises', lu.valeur);
  t('la première écriture la déplace dans IndexedDB', base.contenu.has('aba:crises'), true);
  t('et libère la place en localStorage', ls.getItem('aba:crises'), null);
}

/* ---------- 3. IndexedDB indisponible : repli assumé ---------- */
{
  const { store } = fabrique({ window: { localStorage: faireLocalStorage() }, ouvrirBase: async () => null, encryptValue, decryptValue });
  const r = await store.set('aba:crises', CRISES);
  t('sans IndexedDB, le repli localStorage est annoncé', [r.ok, r.ou], [true, 'localstorage']);
}

/* ---------- 4. Le bug d'origine : les deux stockages pleins ----------
   C'est le cas qui passait pour un succès. Il doit maintenant revenir en
   échec explicite, avec sa cause. */
{
  const { store } = monter({ base: faireBase({ quota: 10 }), ls: faireLocalStorage({ quota: 10 }) });
  const r = await store.set('aba:crises', CRISES);
  t('un quota atteint des deux côtés est un échec, pas un silence', [r.ok, r.raison], [false, 'quota']);
}
{
  /* IndexedDB plein mais localStorage assez large : l'écriture doit passer,
     et surtout ne pas être annoncée réussie côté IndexedDB — c'est la
     transaction avortée qui le dit, pas la requête. */
  const { store, base } = monter({ base: faireBase({ quota: 10 }) });
  const r = await store.set('aba:crises', CRISES);
  t('IndexedDB plein bascule sur localStorage', [r.ok, r.ou], [true, 'localstorage']);
  t("et rien n'a été écrit dans IndexedDB", base.contenu.has('aba:crises'), false);
}

/* ---------- 5. Le stockage qui accepte et ne conserve rien ---------- */
{
  const { store } = fabrique({ window: { localStorage: faireLocalStorage({ amnesique: true }) }, ouvrirBase: async () => null, encryptValue, decryptValue });
  const r = await store.set('aba:crises', CRISES);
  t('une écriture acceptée puis relue vide est un échec', [r.ok, r.raison], [false, 'relecture']);
}

/* ---------- 6. Tout échec d'écriture remonte à l'affichage ----------
   Le résultat ne se déduit plus d'un booléen que l'appelant peut ignorer :
   il est aussi poussé vers l'écran. */
{
  const { store } = monter({ base: faireBase({ quota: 10 }), ls: faireLocalStorage({ quota: 10 }) });
  const vus = [];
  store.surEcriture((r) => vus.push(r));
  await store.set('aba:crises', CRISES);
  await store.setRaw('aba:security', '{}');
  t('chaque écriture est signalée', vus.length, 2);
  t("et l'échec porte sa cause", [vus[0].ok, vus[0].raison, vus[0].cle], [false, 'quota', 'aba:crises']);
}

/* ---------- 7. Une lecture ratée ne doit pas passer pour une tablette vide ---------- */
{
  const { store } = monter({ base: faireBase({ lectureCasse: true }) });
  const lu = await store.lire('aba:crises');
  t('une lecture en panne se signale illisible', [lu.etat, lu.raison], ['illisible', 'lecture']);
}
{
  /* IndexedDB en panne mais la valeur encore en localStorage : la panne ne
     doit pas masquer une valeur parfaitement lisible. Il n'y a jamais deux
     copies, donc chercher plus loin ne peut pas rendre une version périmée. */
  const { store } = monter({
    base: faireBase({ lectureCasse: true }),
    ls: faireLocalStorage({ initial: { 'aba:crises': CRISES } }),
  });
  const lu = await store.lire('aba:crises');
  t("une panne IndexedDB n'empêche pas de lire l'ancien emplacement", [lu.etat, lu.ou], ['ok', 'localstorage']);
}
{
  const { store, base } = monter({ dataKey: 'CODE-1234' });
  base.contenu.set('aba:crises', JSON.stringify({ __enc: 1, data: 'AUTRE-CODE:[]' }));
  const lu = await store.lire('aba:crises');
  t('une valeur chiffrée avec une autre clé se signale illisible', [lu.etat, lu.raison], ['illisible', 'dechiffrement']);
  t('et ne rend aucune donnée', lu.valeur, null);
}
{
  const { base, lireJSON } = monter();
  base.contenu.set('aba:crises', '{ ceci n est pas du JSON');
  const lu = await lireJSON('aba:crises');
  t('un contenu corrompu se signale illisible', [lu.etat, lu.raison], ['illisible', 'json']);
  t('et ne rend aucune donnée', lu.valeur, null);
}
{
  const { store, lireJSON } = monter();
  const lu = await store.lire('aba:crises');
  t('une tablette réellement vierge se dit vide', [lu.etat, lu.ou], ['vide', null]);
  t('et sa lecture JSON aussi', (await lireJSON('aba:crises')).etat, 'vide');
}

/* ---------- 8. Écritures rapprochées : l'ordre d'appel fait foi ----------
   Deux cotations enchaînées lancent deux écritures ; sans file, la plus
   lente valide après la plus récente et remet l'état précédent. */
{
  const lent = (v) => (String(v).includes('lent') ? 30 : 0);
  const { store, base } = monter({ base: faireBase({ delai: lent }) });
  const p1 = store.set('aba:crises', '"lent"');
  const p2 = store.set('aba:crises', '"rapide"');
  await Promise.all([p1, p2]);
  t('la dernière écriture appelée est celle qui reste', base.contenu.get('aba:crises'), '"rapide"');
}

/* ---------- 9. Supprimer efface, et n'écrit pas une chaîne vide ----------
   L'ancienne couche remplaçait la valeur par '' : la clé restait lue comme
   présente, avec un contenu vide. */
{
  const { store, base, ls } = monter({ ls: faireLocalStorage({ initial: { 'aba:stabilite': 'x' } }) });
  base.contenu.set('aba:stabilite', 'x');
  await store.supprimer('aba:stabilite');
  t('la clé part des deux magasins', [base.contenu.has('aba:stabilite'), ls.getItem('aba:stabilite')], [false, null]);
  const lu = await store.lire('aba:stabilite');
  t('et se relit comme absente, pas comme vide', lu.etat, 'vide');
}

/* ---------- 10. L'effacement reste borné à DatABA ----------
   Les deux applications partagent la même origine : un effacement global
   emporterait les données consolidées de Manager. */
{
  const ls = faireLocalStorage({
    initial: {
      'aba:crises': 'x', 'aba:security': 'y', 'aba:theme': 'dark',
      'aba-cadre:data': 'DONNEES DE MANAGER', autre: 'z',
    },
  });
  const { store, base } = monter({ ls });
  base.contenu.set('aba:crises', 'x');
  await store.clearAll();
  t('IndexedDB est vidé', base.contenu.size, 0);
  t('les clés aba: sont parties', Array.from(ls._contenu.keys()).filter((k) => k.startsWith('aba:')), []);
  t('les données de Manager sont intactes', ls.getItem('aba-cadre:data'), 'DONNEES DE MANAGER');
  t('et le reste du stockage aussi', ls.getItem('autre'), 'z');
}

/* ---------- 11. Reconnaissance du quota selon les navigateurs ---------- */
{
  const { estQuota } = monter();
  t('QuotaExceededError reconnu', estQuota({ name: 'QuotaExceededError' }), true);
  t('code 22 reconnu (anciens WebKit)', estQuota({ code: 22 }), true);
  t('code 1014 reconnu (Firefox)', estQuota({ code: 1014 }), true);
  t('une panne quelconque ne passe pas pour un quota', estQuota(new Error('boom')), false);
}

console.log(`\n${ok} réussi(s), ${ko} échec(s)`);
process.exit(ko ? 1 : 0);
