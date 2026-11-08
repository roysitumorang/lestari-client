/**
 * UI helpers: formatting, escaping, toasts, confirm dialogs and a schema-driven form builder.
 *
 * Field schema (shared by forms, tables and the ENDPOINTS.md generator):
 *   key        attribute name in the API payload (snake_case English)
 *   label      text shown to the user
 *   type       text | textarea | number | money | percent | email | tel | password | date | datetime |
 *              time | select | multiselect | switch | color | image | file | items | lookup
 *   required   boolean
 *   options    ['a','b'] or [{ value, label }]           (select / multiselect)
 *   lookup     { endpoint, value: 'id', label: 'name' }  (select options loaded from the API)
 *   fields     sub-fields for type 'items' (array of objects edited as a table)
 *   col        bootstrap column width (1-12, default 6)
 *   showIf     { key, in: [...] } show only when another field matches
 *   form:false hide from the form; list:false hide from the table
 *   readonly, placeholder, help, min, max, step, default, accept
 */
(function (root) {
  const cfg = root.LESTARI_CONFIG;
  const nf = new Intl.NumberFormat(cfg.locale, { maximumFractionDigits: 2 });
  const cf = new Intl.NumberFormat(cfg.locale, { style: 'currency', currency: cfg.currency, maximumFractionDigits: 0 });

  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

  function get(obj, path) {
    return String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }

  const fmt = {
    money: (v) => (v == null || v === '' ? '-' : cf.format(Number(v))),
    number: (v) => (v == null || v === '' ? '-' : nf.format(Number(v))),
    percent: (v) => (v == null || v === '' ? '-' : nf.format(Number(v)) + '%'),
    date: (v) => (v ? new Date(v).toLocaleDateString(cfg.locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '-'),
    datetime: (v) => (v ? new Date(v).toLocaleString(cfg.locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'),
    time: (v) => v || '-',
    boolean: (v) => (v ? '<span class="badge text-bg-success">Yes</span>' : '<span class="badge text-bg-secondary">No</span>'),
    switch: (v) => fmt.boolean(v),
    badge: (v) => (v ? '<span class="badge text-bg-light border">' + esc(v) + '</span>' : '-'),
    image: (v) => (v ? '<img src="' + esc(v) + '" alt="" class="thumb">' : '<span class="thumb thumb-empty"><i class="fa-regular fa-image"></i></span>'),
    list: (v) => (Array.isArray(v) ? esc(v.map((x) => (typeof x === 'object' ? x.name || x.label || x.id : x)).join(', ')) : '-'),
    text: (v) => (v == null || v === '' ? '-' : esc(v)),
  };

  function formatValue(col, row) {
    const v = get(row, col.key);
    if (typeof col.render === 'function') return col.render(v, row);
    const f = col.format || ({ money: 'money', number: 'number', percent: 'percent', date: 'date', datetime: 'datetime', switch: 'boolean', image: 'image', multiselect: 'list' })[col.type] || 'text';
    if (col.type === 'select' && col.options) {
      const o = normOptions(col.options).find((x) => String(x.value) === String(v));
      return o ? esc(o.label) : fmt.text(v);
    }
    return (fmt[f] || fmt.text)(v);
  }

  function normOptions(options) {
    return (options || []).map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  }

  /* ---------- toasts ---------- */
  function toast(message, variant) {
    let box = document.getElementById('toast-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toast-box';
      box.className = 'toast-container position-fixed top-0 end-0 p-3';
      document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = 'toast align-items-center border-0 text-bg-' + (variant || 'success');
    el.setAttribute('role', 'status');
    el.innerHTML = '<div class="d-flex"><div class="toast-body">' + esc(message) + '</div>' +
      '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>';
    box.appendChild(el);
    const t = new bootstrap.Toast(el, { delay: 3500 });
    el.addEventListener('hidden.bs.toast', () => el.remove());
    t.show();
  }

  function errorToast(e) {
    toast(e && e.message ? e.message : 'Something went wrong', 'danger');
  }

  /* ---------- generic modal ---------- */
  function modal({ title, body, size, footer, onShown }) {
    const el = document.createElement('div');
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML =
      '<div class="modal-dialog modal-dialog-scrollable ' + (size ? 'modal-' + size : '') + '">' +
      '<div class="modal-content">' +
      '<div class="modal-header"><h5 class="modal-title">' + esc(title) + '</h5>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
      '<div class="modal-body"></div>' +
      (footer === false ? '' : '<div class="modal-footer"></div>') +
      '</div></div>';
    const bodyEl = el.querySelector('.modal-body');
    if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
    if (footer && footer !== false) el.querySelector('.modal-footer').innerHTML = footer;
    document.body.appendChild(el);
    const m = new bootstrap.Modal(el);
    el.addEventListener('hidden.bs.modal', () => { m.dispose(); el.remove(); });
    if (onShown) el.addEventListener('shown.bs.modal', () => onShown(el));
    m.show();
    return { el, modal: m, body: bodyEl, close: () => m.hide() };
  }

  function confirmDialog(message, { title = 'Confirm', okText = 'Yes', variant = 'danger', typeToConfirm } = {}) {
    return new Promise((resolve) => {
      let done = false;
      const extra = typeToConfirm
        ? '<label class="form-label mt-3 small">Type <code>' + esc(typeToConfirm) + '</code> to continue</label><input class="form-control" data-confirm-input>'
        : '';
      const d = modal({
        title,
        body: '<p class="mb-0">' + esc(message) + '</p>' + extra,
        footer: '<button class="btn btn-light" data-bs-dismiss="modal">Cancel</button>' +
          '<button class="btn btn-' + variant + '" data-ok ' + (typeToConfirm ? 'disabled' : '') + '>' + esc(okText) + '</button>',
      });
      const ok = d.el.querySelector('[data-ok]');
      const inp = d.el.querySelector('[data-confirm-input]');
      if (inp) inp.addEventListener('input', () => { ok.disabled = inp.value.trim().toLowerCase() !== typeToConfirm.toLowerCase(); });
      ok.addEventListener('click', () => { done = true; resolve(true); d.close(); });
      d.el.addEventListener('hidden.bs.modal', () => { if (!done) resolve(false); });
    });
  }

  /* ---------- lookups ---------- */
  const lookupCache = new Map();
  async function loadLookup(lk) {
    const key = lk.endpoint + JSON.stringify(lk.query || {});
    if (!lookupCache.has(key)) {
      lookupCache.set(key, Api.get(lk.endpoint, Object.assign({ per_page: 1000 }, lk.query || {}))
        .then((r) => (r.data || []).map((x) => ({ value: get(x, lk.value || 'id'), label: get(x, lk.label || 'name') })))
        .catch((e) => { lookupCache.delete(key); throw e; }));
    }
    return lookupCache.get(key);
  }
  function clearLookups() { lookupCache.clear(); }

  /* ---------- form builder ---------- */
  let uid = 0;
  function fieldHtml(f, value) {
    const id = 'f' + (++uid);
    const req = f.required ? ' required' : '';
    const ro = f.readonly ? ' readonly' : '';
    const ph = f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '';
    const v = value === undefined ? f.default : value;
    const label = '<label class="form-label" for="' + id + '">' + esc(f.label) + (f.required ? ' <span class="text-danger">*</span>' : '') + '</label>';
    const help = f.help ? '<div class="form-text">' + esc(f.help) + '</div>' : '';
    const num = ' step="' + (f.step || 'any') + '"' + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '');
    let input;
    switch (f.type) {
      case 'textarea':
        input = '<textarea class="form-control" id="' + id + '" name="' + f.key + '" rows="' + (f.rows || 3) + '"' + req + ro + ph + '>' + esc(v) + '</textarea>';
        break;
      case 'money':
        input = '<div class="input-group"><span class="input-group-text">Rp</span><input type="number" class="form-control" id="' + id + '" name="' + f.key + '" value="' + esc(v) + '"' + num + req + ro + ph + '></div>';
        break;
      case 'percent':
        input = '<div class="input-group"><input type="number" class="form-control" id="' + id + '" name="' + f.key + '" value="' + esc(v) + '"' + num + req + ro + ph + '><span class="input-group-text">%</span></div>';
        break;
      case 'select':
      case 'lookup': {
        const opts = normOptions(f.options).map((o) => '<option value="' + esc(o.value) + '"' + (String(o.value) === String(v) ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('');
        input = '<select class="form-select" id="' + id + '" name="' + f.key + '"' + req + (f.readonly ? ' disabled' : '') + (f.lookup ? ' data-lookup="1" data-value="' + esc(v == null ? '' : v) + '"' : '') + '>' +
          '<option value="">' + esc(f.placeholder || '— Select —') + '</option>' + opts + '</select>';
        break;
      }
      case 'multiselect': {
        const sel = Array.isArray(v) ? v.map(String) : [];
        const opts = normOptions(f.options).map((o) => '<option value="' + esc(o.value) + '"' + (sel.includes(String(o.value)) ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('');
        input = '<select multiple class="form-select" size="5" id="' + id + '" name="' + f.key + '"' + req + (f.lookup ? ' data-lookup="1" data-value="' + esc(JSON.stringify(sel)) + '"' : '') + '>' + opts + '</select>' +
          '<div class="form-text">Hold Ctrl / Cmd to pick several.</div>';
        break;
      }
      case 'switch':
        return '<div class="col-md-' + (f.col || 6) + ' field" data-key="' + f.key + '"><div class="form-check form-switch mt-md-4">' +
          '<input class="form-check-input" type="checkbox" role="switch" id="' + id + '" name="' + f.key + '"' + (v ? ' checked' : '') + (f.readonly ? ' disabled' : '') + '>' +
          '<label class="form-check-label" for="' + id + '">' + esc(f.label) + '</label></div>' + help + '</div>';
      case 'image':
        input = '<div class="d-flex align-items-center gap-3"><img class="thumb-lg" data-preview src="' + esc(v || '') + '" alt="" ' + (v ? '' : 'hidden') + '>' +
          '<div class="flex-grow-1"><input type="file" accept="' + esc(f.accept || 'image/*') + '" class="form-control" id="' + id + '" data-upload="' + f.key + '">' +
          '<input type="hidden" name="' + f.key + '" value="' + esc(v || '') + '"></div></div>';
        break;
      case 'file':
        input = '<input type="file" class="form-control" id="' + id + '" name="' + f.key + '" accept="' + esc(f.accept || '') + '"' + req + '>';
        break;
      case 'items':
        return '<div class="col-12 field" data-key="' + f.key + '">' + label + itemsTable(f, Array.isArray(v) ? v : []) + help + '</div>';
      default: {
        const t = ({ datetime: 'datetime-local', number: 'number' })[f.type] || f.type || 'text';
        let val = v;
        if (f.type === 'datetime' && v) val = String(v).slice(0, 16);
        if (f.type === 'date' && v) val = String(v).slice(0, 10);
        input = '<input type="' + t + '" class="form-control' + (t === 'color' ? ' form-control-color' : '') + '" id="' + id + '" name="' + f.key + '" value="' + esc(val) + '"' + (t === 'number' ? num : '') + req + ro + ph + (f.type === 'password' ? ' autocomplete="new-password"' : '') + '>';
      }
    }
    return '<div class="col-md-' + (f.col || 6) + ' field" data-key="' + f.key + '">' + label + input + help + '<div class="invalid-feedback"></div></div>';
  }

  function itemsTable(f, rows) {
    const head = f.fields.map((s) => '<th>' + esc(s.label) + '</th>').join('') + '<th style="width:1%"></th>';
    const body = rows.map((r) => itemRow(f, r)).join('');
    return '<div class="table-responsive border rounded"><table class="table table-sm align-middle mb-0 items-table" data-items="' + f.key + '">' +
      '<thead class="table-light"><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<button type="button" class="btn btn-sm btn-outline-primary mt-2" data-add-item="' + f.key + '"><i class="fa-solid fa-plus me-1"></i>Add row</button>';
  }

  function itemRow(f, r) {
    r = r || {};
    return '<tr>' + f.fields.map((s) => {
      const v = r[s.key] === undefined ? s.default : r[s.key];
      let inp;
      if (s.type === 'select' || s.type === 'lookup') {
        inp = '<select class="form-select form-select-sm" data-sub="' + s.key + '"' + (s.lookup ? ' data-lookup="1" data-value="' + esc(v == null ? '' : v) + '"' : '') + '><option value=""></option>' +
          normOptions(s.options).map((o) => '<option value="' + esc(o.value) + '"' + (String(o.value) === String(v) ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') + '</select>';
      } else if (s.type === 'switch') {
        inp = '<input type="checkbox" class="form-check-input" data-sub="' + s.key + '"' + (v ? ' checked' : '') + '>';
      } else {
        const t = ['number', 'money', 'percent'].includes(s.type) ? 'number' : (s.type === 'date' ? 'date' : 'text');
        inp = '<input type="' + t + '" step="any" class="form-control form-control-sm" data-sub="' + s.key + '" value="' + esc(v) + '">';
      }
      return '<td>' + inp + '</td>';
    }).join('') + '<td><button type="button" class="btn btn-sm btn-link text-danger" data-del-item aria-label="Remove row"><i class="fa-solid fa-trash"></i></button></td></tr>';
  }

  function visible(f, values) {
    if (!f.showIf) return true;
    const cur = values[f.showIf.key];
    return f.showIf.in.map(String).includes(String(cur));
  }

  /** Render a form into `container`. Returns { read(), setErrors(), el }. */
  function buildForm(container, fields, values) {
    values = values || {};
    const formFields = fields.filter((f) => f.form !== false);
    const el = document.createElement('form');
    el.className = 'row g-3';
    el.noValidate = true;
    el.innerHTML = formFields.map((f) => {
      if (f.type === 'heading') return '<div class="col-12"><h6 class="form-section">' + esc(f.label) + '</h6></div>';
      return fieldHtml(f, values[f.key]);
    }).join('');
    container.innerHTML = '';
    container.appendChild(el);

    // lookups (top level and inside items)
    const fieldByKey = Object.fromEntries(formFields.map((f) => [f.key, f]));
    const fillSelect = async (sel, lk) => {
      try {
        const opts = await loadLookup(lk);
        const cur = sel.dataset.value || '';
        const multi = sel.multiple;
        const curArr = multi ? JSON.parse(cur || '[]').map(String) : [];
        sel.innerHTML = (multi ? '' : '<option value=""></option>') + opts.map((o) =>
          '<option value="' + esc(o.value) + '"' + ((multi ? curArr.includes(String(o.value)) : String(o.value) === cur) ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('');
      } catch (e) { sel.innerHTML = '<option value="">(could not load options)</option>'; }
    };
    const wireLookups = (scope) => {
      scope.querySelectorAll('select[data-lookup]').forEach((sel) => {
        const key = sel.name || sel.dataset.sub;
        let f = fieldByKey[key];
        if (!f) {
          const items = sel.closest('[data-items]');
          const parent = items && fieldByKey[items.dataset.items];
          f = parent && parent.fields.find((s) => s.key === key);
        }
        if (f && f.lookup) fillSelect(sel, f.lookup);
      });
    };
    wireLookups(el);

    // items add/remove
    el.addEventListener('click', (ev) => {
      const add = ev.target.closest('[data-add-item]');
      if (add) {
        const f = fieldByKey[add.dataset.addItem];
        const tbody = el.querySelector('[data-items="' + f.key + '"] tbody');
        tbody.insertAdjacentHTML('beforeend', itemRow(f, {}));
        wireLookups(tbody.lastElementChild);
      }
      const del = ev.target.closest('[data-del-item]');
      if (del) del.closest('tr').remove();
    });

    // image uploads → POST /uploads, store returned URL in hidden input
    el.querySelectorAll('[data-upload]').forEach((inp) => {
      inp.addEventListener('change', async () => {
        if (!inp.files[0]) return;
        const fd = new FormData();
        fd.append('file', inp.files[0]);
        fd.append('purpose', inp.dataset.upload);
        try {
          const r = await Api.upload('/uploads', fd);
          el.querySelector('input[name="' + inp.dataset.upload + '"]').value = r.data.url;
          const img = inp.closest('.field').querySelector('[data-preview]');
          img.src = r.data.url; img.hidden = false;
        } catch (e) { errorToast(e); }
      });
    });

    // conditional visibility
    const refresh = () => {
      const cur = read(true);
      formFields.forEach((f) => {
        if (!f.showIf) return;
        const box = el.querySelector('.field[data-key="' + f.key + '"]');
        if (box) box.hidden = !visible(f, cur);
      });
    };
    el.addEventListener('change', refresh);
    refresh();

    function read(raw) {
      const out = {};
      formFields.forEach((f) => {
        if (f.type === 'heading') return;
        const box = el.querySelector('.field[data-key="' + f.key + '"]');
        if (!box) return;
        if (!raw && box.hidden) return;
        if (f.type === 'items') {
          out[f.key] = [...box.querySelectorAll('tbody tr')].map((tr) => {
            const o = {};
            f.fields.forEach((s) => {
              const i = tr.querySelector('[data-sub="' + s.key + '"]');
              o[s.key] = castValue(s, s.type === 'switch' ? i.checked : i.value);
            });
            return o;
          });
          return;
        }
        if (f.type === 'file') { out[f.key] = box.querySelector('input[type=file]').files[0] || null; return; }
        const inp = box.querySelector('[name="' + f.key + '"]');
        if (!inp) return;
        if (f.type === 'switch') out[f.key] = inp.checked;
        else if (f.type === 'multiselect') out[f.key] = [...inp.selectedOptions].map((o) => castScalar(o.value));
        else out[f.key] = castValue(f, inp.value);
      });
      return out;
    }

    function setErrors(errs) {
      el.querySelectorAll('.is-invalid').forEach((x) => x.classList.remove('is-invalid'));
      Object.entries(errs || {}).forEach(([k, msgs]) => {
        const box = el.querySelector('.field[data-key="' + k + '"]');
        if (!box) return;
        const inp = box.querySelector('.form-control, .form-select');
        if (inp) inp.classList.add('is-invalid');
        const fb = box.querySelector('.invalid-feedback');
        if (fb) fb.textContent = [].concat(msgs).join(' ');
      });
    }

    function validate() {
      let ok = true;
      const errs = {};
      const cur = read();
      formFields.forEach((f) => {
        if (!f.required || f.type === 'heading') return;
        const v = cur[f.key];
        if (v === undefined) return; // hidden
        if (v === null || v === '' || (Array.isArray(v) && !v.length)) { errs[f.key] = ['Required']; ok = false; }
      });
      setErrors(errs);
      return ok;
    }

    return { el, read: () => read(false), setErrors, validate };
  }

  function castScalar(v) { return /^-?\d+$/.test(v) ? Number(v) : v; }
  function castValue(f, v) {
    if (['number', 'money', 'percent'].includes(f.type)) return v === '' ? null : Number(v);
    if (f.type === 'switch') return !!v;
    if ((f.type === 'select' || f.type === 'lookup') && f.lookup) return v === '' ? null : castScalar(v);
    if (f.type === 'datetime' && v) return new Date(v).toISOString();
    return v === '' ? null : v;
  }

  /** Modal with a form. `onSubmit(data)` should return a promise; API field errors are shown inline. */
  function formModal({ title, fields, values, size, submitText, onSubmit }) {
    const d = modal({
      title,
      size: size || (fields.length > 8 || fields.some((f) => f.type === 'items') ? 'lg' : null),
      body: '',
      footer: '<button class="btn btn-light" data-bs-dismiss="modal">Cancel</button>' +
        '<button class="btn btn-primary" data-submit><i class="fa-solid fa-floppy-disk me-1"></i>' + esc(submitText || 'Save') + '</button>',
    });
    const form = buildForm(d.body, fields, values);
    const btn = d.el.querySelector('[data-submit]');
    const submit = async (ev) => {
      if (ev) ev.preventDefault();
      if (!form.validate()) return;
      btn.disabled = true;
      try {
        await onSubmit(form.read());
        d.close();
      } catch (e) {
        if (e.fields && Object.keys(e.fields).length) form.setErrors(e.fields);
        errorToast(e);
      } finally { btn.disabled = false; }
    };
    btn.addEventListener('click', submit);
    form.el.addEventListener('submit', submit);
    return d;
  }

  /** Read-only key/value view used by "detail" actions. */
  function detailView(fields, row) {
    return '<dl class="row mb-0 detail-list">' + fields.filter((f) => f.type !== 'heading' && f.type !== 'password').map((f) => {
      let val;
      if (f.type === 'items') {
        const rows = get(row, f.key) || [];
        val = '<div class="table-responsive"><table class="table table-sm mb-0"><thead><tr>' + f.fields.map((s) => '<th>' + esc(s.label) + '</th>').join('') + '</tr></thead><tbody>' +
          (rows.length ? rows.map((r) => '<tr>' + f.fields.map((s) => '<td>' + formatValue(s, r) + '</td>').join('') + '</tr>').join('') : '<tr><td colspan="' + f.fields.length + '" class="text-muted">No rows</td></tr>') +
          '</tbody></table></div>';
        return '<dt class="col-12">' + esc(f.label) + '</dt><dd class="col-12">' + val + '</dd>';
      }
      val = formatValue(f, row);
      return '<dt class="col-sm-4">' + esc(f.label) + '</dt><dd class="col-sm-8">' + val + '</dd>';
    }).join('') + '</dl>';
  }

  function emptyState(text, icon) {
    return '<div class="empty-state"><i class="fa-solid ' + (icon || 'fa-inbox') + '"></i><p>' + esc(text) + '</p></div>';
  }

  function spinner() { return '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading…</span></div></div>'; }

  root.UI = {
    esc, fmt, get, isoDate, formatValue, normOptions,
    toast, errorToast, modal, confirm: confirmDialog,
    buildForm, formModal, detailView, emptyState, spinner,
    loadLookup, clearLookups,
  };
})(window);
