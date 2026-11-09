/**
 * Dual language: English (source text) and Bahasa Indonesia.
 *
 *   I18n.t('Save')                         → 'Simpan' when the language is "id"
 *   I18n.t('Page {page} of {pages}', {…})  → placeholders are filled after translating
 *
 * English strings are the dictionary keys (js/i18n/id.js); a missing entry falls back to English.
 * Page definitions are translated once when they are registered (see core/registry.js), so changing
 * the language reloads the page. The choice is kept in localStorage and in the account's display
 * settings (/settings/display → language), and every API request sends Accept-Language.
 */
(function (root) {
  const KEY = 'lestari.lang';
  const LANGS = { en: 'English', id: 'Bahasa Indonesia' };

  function stored() {
    try { return root.localStorage.getItem(KEY); } catch (_) { return null; }
  }
  function detect() {
    const nav = (root.navigator && (root.navigator.language || '')) || '';
    return nav.toLowerCase().startsWith('id') ? 'id' : 'en';
  }

  let lang = stored() || detect();
  if (!LANGS[lang]) lang = 'en';

  function dict() {
    return lang === 'id' ? (root.LESTARI_I18N_ID || {}) : null;
  }

  function t(s, vars) {
    if (s == null) return s;
    const d = dict();
    const hit = d && Object.prototype.hasOwnProperty.call(d, s);
    // development aid: set window.LESTARI_I18N_MISS = (s) => … to log strings without a translation
    if (d && !hit && typeof root.LESTARI_I18N_MISS === 'function') root.LESTARI_I18N_MISS(s);
    let out = hit ? d[s] : s;
    if (vars) out = String(out).replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : vars[k]));
    return out;
  }

  /** Keys of page definitions whose string values are user-facing text. */
  const TEXT_KEYS = new Set(['title', 'label', 'description', 'singular', 'placeholder', 'help', 'confirm', 'success',
    'searchPlaceholder', 'info', 'submitText', 'createLabel', 'emptyText', 'savedText', 'search']);
  /** Sub-objects that hold API data or documentation, not UI text. */
  const SKIP = new Set(['lookup', 'endpoints', 'request', 'response', 'body', 'query', 'showIf', 'default', 'values']);

  /** Translate a page definition (or menu group) in place. No-op in English. */
  function translateDef(def) {
    if (lang === 'en' || !def) return def;
    const walk = (o, parent) => {
      if (Array.isArray(o)) { o.forEach((x) => walk(x, parent)); return; }
      if (!o || typeof o !== 'object') return;
      Object.keys(o).forEach((k) => {
        const v = o[k];
        if (SKIP.has(k) || typeof v === 'function') return;
        if (typeof v === 'string') {
          // a chart's `label` names the data column of the x axis, not text
          if (TEXT_KEYS.has(k) && !(k === 'label' && parent === 'chart')) o[k] = t(v);
        } else if (k === 'options' && Array.isArray(v)) {
          o[k] = v.map((x) => (typeof x === 'object' && x !== null ? Object.assign({}, x, { label: t(x.label) }) : { value: x, label: t(String(x)) }));
        } else if (k === 'series' && Array.isArray(v)) {
          v.forEach((s) => { if (s && typeof s.name === 'string') s.name = t(s.name); });
        } else if (typeof v === 'object') {
          walk(v, k);
        }
      });
    };
    walk(def, '');
    return def;
  }

  /** Translate static markup: data-i18n (text), data-i18n-placeholder, data-i18n-aria-label, data-i18n-title. */
  function applyDom(scope) {
    const rootEl = scope || root.document;
    if (!rootEl || !rootEl.querySelectorAll) return;
    rootEl.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n') || el.textContent.trim()); });
    ['placeholder', 'aria-label', 'title'].forEach((attr) => {
      rootEl.querySelectorAll('[data-i18n-' + attr + ']').forEach((el) => el.setAttribute(attr, t(el.getAttribute('data-i18n-' + attr))));
    });
    if (root.document && root.document.documentElement) root.document.documentElement.lang = lang;
  }

  /** Switch language. With {reload:false} the caller is responsible for re-rendering. */
  function setLang(l, opts) {
    if (!LANGS[l] || l === lang) return false;
    try { root.localStorage.setItem(KEY, l); } catch (_) { /* private mode */ }
    lang = l;
    if (!opts || opts.reload !== false) root.location.reload();
    return true;
  }

  /** A small EN | ID switcher (buttons with data-lang). */
  function switcherHtml(extraClass) {
    return '<div class="btn-group btn-group-sm ' + (extraClass || '') + '" role="group" aria-label="' + t('Language') + '">' +
      Object.keys(LANGS).map((k) => '<button type="button" class="btn ' + (k === lang ? 'btn-primary' : 'btn-outline-secondary') + '" data-lang="' + k + '" title="' + LANGS[k] + '">' + k.toUpperCase() + '</button>').join('') +
      '</div>';
  }

  root.I18n = {
    t, translateDef, applyDom, setLang, switcherHtml, LANGS,
    get lang() { return lang; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
