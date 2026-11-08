/**
 * Generic CRUD page driven by a `kind: 'crud'` definition.
 *
 * def = {
 *   id, title, icon, description, endpoint: '/products', fields: [...],
 *   columns?: [...],                 // defaults to fields with list !== false
 *   ops?: ['list','create','read','update','delete','bulk_delete','import','export'],
 *   filters?: [fields],              // extra query params shown above the table
 *   tabs?: { key, options:[{value,label}] },
 *   searchPlaceholder?, idKey?, titleKey?,
 *   rowActions?: [action], toolbar?: [action],
 *   defaultSort?: 'name', readOnly?: bool
 * }
 */
(function (root) {
  const DEFAULT_OPS = ['list', 'create', 'read', 'update', 'delete'];

  function listColumns(def) {
    if (def.columns) return def.columns;
    return def.fields.filter((f) => f.list !== false && !['textarea', 'items', 'password', 'heading', 'file'].includes(f.type)).slice(0, 8);
  }

  function render(container, def) {
    const ops = def.ops || DEFAULT_OPS;
    const has = (op) => ops.includes(op);
    const idKey = def.idKey || 'id';
    const cols = listColumns(def);
    const state = { page: 1, per_page: LESTARI_CONFIG.defaultPageSize, q: '', sort: def.defaultSort || '', order: def.defaultOrder || 'asc', filters: {}, tab: def.tabs ? def.tabs.default || '' : '', selected: new Set(), rows: [] };
    const E = UI.esc;

    const toolbar = [];
    if (has('create')) toolbar.push('<button class="btn btn-primary" data-op="create"><i class="fa-solid fa-plus me-1"></i>' + E(def.createLabel || 'Add ' + (def.singular || def.title)) + '</button>');
    (def.toolbar || []).forEach((a) => toolbar.push(Actions.button(a)));
    if (has('import')) toolbar.push('<button class="btn btn-outline-secondary" data-op="import"><i class="fa-solid fa-file-import me-1"></i>Import</button>');
    if (has('export')) toolbar.push('<button class="btn btn-outline-secondary" data-op="export"><i class="fa-solid fa-file-export me-1"></i>Export</button>');
    if (has('bulk_delete')) toolbar.push('<button class="btn btn-outline-danger" data-op="bulk_delete" hidden><i class="fa-solid fa-trash me-1"></i>Delete selected (<span data-count>0</span>)</button>');

    const tabs = def.tabs ? '<ul class="nav nav-pills nav-pills-sm mb-3 flex-nowrap overflow-auto" data-tabs>' +
      def.tabs.options.map((o) => '<li class="nav-item"><button class="nav-link text-nowrap' + (String(o.value) === String(state.tab) ? ' active' : '') + '" data-tab="' + E(o.value) + '">' + E(o.label) + '</button></li>').join('') + '</ul>' : '';

    container.innerHTML =
      pageHeader(def, toolbar.join('')) +
      '<div class="card"><div class="card-body">' + tabs +
      '<div class="row g-2 align-items-end mb-3">' +
      '<div class="col-md-4"><div class="input-group"><span class="input-group-text"><i class="fa-solid fa-magnifying-glass"></i></span>' +
      '<input type="search" class="form-control" data-search placeholder="' + E(def.searchPlaceholder || 'Search') + '" aria-label="Search"></div></div>' +
      '<div class="col-md-8"><div class="row g-2" data-filters></div></div></div>' +
      '<div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead><tr>' +
      (has('bulk_delete') ? '<th style="width:1%"><input type="checkbox" class="form-check-input" data-check-all aria-label="Select all"></th>' : '') +
      cols.map((c) => '<th' + (c.sortable === false ? '' : ' class="sortable" data-sort="' + E(c.key) + '"') + '>' + E(c.label) + '</th>').join('') +
      '<th class="text-end">Actions</th></tr></thead><tbody data-body></tbody></table></div>' +
      '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3" data-pager></div>' +
      '</div></div>';

    // filters
    if (def.filters && def.filters.length) {
      const fbox = container.querySelector('[data-filters]');
      const form = UI.buildForm(fbox, def.filters.map((f) => Object.assign({ col: 4 }, f, { required: false })), {});
      form.el.classList.replace('g-3', 'g-2');
      form.el.addEventListener('change', () => { state.filters = form.read(); state.page = 1; load(); });
    }

    const body = container.querySelector('[data-body]');
    const pager = container.querySelector('[data-pager]');
    const bulkBtn = container.querySelector('[data-op="bulk_delete"]');

    function query() {
      const q = Object.assign({ page: state.page, per_page: state.per_page }, state.filters);
      if (state.q) q.q = state.q;
      if (state.sort) { q.sort = state.sort; q.order = state.order; }
      if (def.tabs && state.tab !== '') q[def.tabs.key] = state.tab;
      return q;
    }

    async function load() {
      body.innerHTML = '<tr><td colspan="' + (cols.length + 2) + '">' + UI.spinner() + '</td></tr>';
      try {
        const res = await Api.get(def.endpoint, query());
        state.rows = res.data || [];
        drawRows();
        drawPager(res.meta || { page: 1, per_page: state.rows.length, total: state.rows.length, total_pages: 1 });
      } catch (e) {
        body.innerHTML = '<tr><td colspan="' + (cols.length + 2) + '">' + UI.emptyState(e.message, 'fa-triangle-exclamation') + '</td></tr>';
        pager.innerHTML = '';
      }
    }

    function drawRows() {
      state.selected.clear();
      updateBulk();
      if (!state.rows.length) {
        body.innerHTML = '<tr><td colspan="' + (cols.length + 2) + '">' + UI.emptyState('No ' + def.title.toLowerCase() + ' yet') + '</td></tr>';
        return;
      }
      body.innerHTML = state.rows.map((r, i) => {
        const acts = [];
        if (has('read')) acts.push('<button class="btn btn-sm btn-light" data-row-op="view" data-i="' + i + '" title="Details" aria-label="Details"><i class="fa-regular fa-eye"></i></button>');
        if (has('update') && !def.readOnly) acts.push('<button class="btn btn-sm btn-light" data-row-op="edit" data-i="' + i + '" title="Edit" aria-label="Edit"><i class="fa-regular fa-pen-to-square"></i></button>');
        const extra = (def.rowActions || []).filter((a) => !a.when || a.when(r));
        if (extra.length) {
          acts.push('<div class="btn-group"><button class="btn btn-sm btn-light dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false" aria-label="More actions"><i class="fa-solid fa-ellipsis"></i></button><ul class="dropdown-menu dropdown-menu-end">' +
            extra.map((a) => '<li><button class="dropdown-item' + (a.variant === 'danger' ? ' text-danger' : '') + '" data-row-action="' + E(a.id) + '" data-i="' + i + '">' + (a.icon ? '<i class="' + E(a.icon) + ' me-2"></i>' : '') + E(a.label) + '</button></li>').join('') + '</ul></div>');
        }
        if (has('delete') && !def.readOnly) acts.push('<button class="btn btn-sm btn-light text-danger" data-row-op="delete" data-i="' + i + '" title="Delete" aria-label="Delete"><i class="fa-regular fa-trash-can"></i></button>');
        return '<tr>' +
          (has('bulk_delete') ? '<td><input type="checkbox" class="form-check-input" data-check="' + i + '" aria-label="Select row"></td>' : '') +
          cols.map((c) => '<td>' + UI.formatValue(c, r) + '</td>').join('') +
          '<td class="text-end text-nowrap">' + acts.join(' ') + '</td></tr>';
      }).join('');
    }

    function drawPager(m) {
      const from = m.total ? (m.page - 1) * m.per_page + 1 : 0;
      const to = Math.min(m.page * m.per_page, m.total);
      const pages = m.total_pages || 1;
      const btn = (p, label, dis, act) => '<li class="page-item' + (dis ? ' disabled' : '') + (act ? ' active' : '') + '"><button class="page-link" data-page="' + p + '">' + label + '</button></li>';
      let items = btn(m.page - 1, '<i class="fa-solid fa-chevron-left"></i>', m.page <= 1);
      const s = Math.max(1, m.page - 2), e = Math.min(pages, s + 4);
      for (let p = s; p <= e; p++) items += btn(p, p, false, p === m.page);
      items += btn(m.page + 1, '<i class="fa-solid fa-chevron-right"></i>', m.page >= pages);
      pager.innerHTML = '<div class="text-muted small">Showing ' + from + '–' + to + ' of ' + UI.fmt.number(m.total) + '</div>' +
        '<div class="d-flex align-items-center gap-2"><select class="form-select form-select-sm w-auto" data-per-page aria-label="Rows per page">' +
        [10, 25, 50, 100].map((n) => '<option' + (n === state.per_page ? ' selected' : '') + '>' + n + '</option>').join('') +
        '</select><ul class="pagination pagination-sm mb-0">' + items + '</ul></div>';
    }

    function updateBulk() {
      if (!bulkBtn) return;
      bulkBtn.hidden = state.selected.size === 0;
      bulkBtn.querySelector('[data-count]').textContent = state.selected.size;
      const all = container.querySelector('[data-check-all]');
      if (all) all.checked = state.selected.size > 0 && state.selected.size === state.rows.length;
    }

    const ctx = { reload: load, def, query };

    function openForm(row) {
      UI.formModal({
        title: (row ? 'Edit ' : 'Add ') + (def.singular || def.title),
        fields: def.fields,
        values: row || {},
        onSubmit: async (data) => {
          if (row) await Api.put(def.endpoint + '/' + encodeURIComponent(row[idKey]), data);
          else await Api.post(def.endpoint, data);
          UI.toast((def.singular || def.title) + (row ? ' updated' : ' created'));
          UI.clearLookups();
          load();
        },
      });
    }

    async function fetchOne(row) {
      if (!has('read')) return row;
      const res = await Api.get(def.endpoint + '/' + encodeURIComponent(row[idKey]));
      return res.data;
    }

    container.addEventListener('click', async (ev) => {
      const t = ev.target.closest('button, [data-check], [data-check-all], th.sortable');
      if (!t || !container.contains(t)) return;
      try {
        if (t.dataset.op === 'create') openForm(null);
        else if (t.dataset.op === 'export') await Api.download(def.endpoint + '/export', Object.assign(query(), { format: 'xlsx' }), def.id + '.xlsx');
        else if (t.dataset.op === 'import') importDialog(def, load);
        else if (t.dataset.op === 'bulk_delete') {
          const ids = [...state.selected].map((i) => state.rows[i][idKey]);
          if (await UI.confirm('Delete ' + ids.length + ' selected item(s)? This cannot be undone.', { okText: 'Delete' })) {
            await Api.post(def.endpoint + '/bulk-delete', { ids });
            UI.toast(ids.length + ' item(s) deleted');
            load();
          }
        } else if (t.dataset.rowOp) {
          const row = state.rows[Number(t.dataset.i)];
          if (t.dataset.rowOp === 'edit') openForm(await fetchOne(row));
          else if (t.dataset.rowOp === 'view') {
            const full = await fetchOne(row);
            const html = def.detail ? def.detail(full) : UI.detailView(def.detailFields || def.fields, full);
            UI.modal({ title: def.singular || def.title, body: html, size: 'lg', footer: '<button class="btn btn-light" data-bs-dismiss="modal">Close</button>' });
          } else if (t.dataset.rowOp === 'delete') {
            const name = UI.get(row, def.titleKey || 'name') || ('#' + row[idKey]);
            if (await UI.confirm('Delete "' + name + '"? This cannot be undone.', { okText: 'Delete' })) {
              await Api.del(def.endpoint + '/' + encodeURIComponent(row[idKey]));
              UI.toast('Deleted');
              load();
            }
          }
        } else if (t.dataset.rowAction) {
          const a = def.rowActions.find((x) => x.id === t.dataset.rowAction);
          await Actions.run(a, state.rows[Number(t.dataset.i)], ctx);
        } else if (t.dataset.action) {
          const a = def.toolbar.find((x) => x.id === t.dataset.action);
          await Actions.run(a, null, ctx);
        } else if (t.dataset.page) {
          const p = Number(t.dataset.page);
          if (p >= 1) { state.page = p; load(); }
        } else if (t.dataset.tab !== undefined) {
          container.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b === t));
          state.tab = t.dataset.tab; state.page = 1; load();
        } else if (t.matches('th.sortable')) {
          const k = t.dataset.sort;
          state.order = state.sort === k && state.order === 'asc' ? 'desc' : 'asc';
          state.sort = k;
          container.querySelectorAll('th.sortable').forEach((th) => th.removeAttribute('aria-sort'));
          t.setAttribute('aria-sort', state.order === 'asc' ? 'ascending' : 'descending');
          load();
        }
      } catch (e) { UI.errorToast(e); }
    });

    container.addEventListener('change', (ev) => {
      if (ev.target.matches('[data-check]')) {
        const i = Number(ev.target.dataset.check);
        ev.target.checked ? state.selected.add(i) : state.selected.delete(i);
        updateBulk();
      } else if (ev.target.matches('[data-check-all]')) {
        state.selected = new Set(ev.target.checked ? state.rows.map((_, i) => i) : []);
        container.querySelectorAll('[data-check]').forEach((c) => { c.checked = ev.target.checked; });
        updateBulk();
      } else if (ev.target.matches('[data-per-page]')) {
        state.per_page = Number(ev.target.value); state.page = 1; load();
      }
    });

    let timer;
    container.querySelector('[data-search]').addEventListener('input', (ev) => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.q = ev.target.value.trim(); state.page = 1; load(); }, 350);
    });

    load();
  }

  function importDialog(def, reload) {
    const d = UI.modal({
      title: 'Import ' + def.title,
      body: '<p class="small text-muted">Upload an .xlsx or .csv file that follows the template.</p>' +
        '<button type="button" class="btn btn-sm btn-outline-primary mb-3" data-template><i class="fa-solid fa-download me-1"></i>Download template</button>' +
        (def.importModes ? '<div class="mb-3"><label class="form-label">Mode</label><select class="form-select" data-mode>' + def.importModes.map((m) => '<option value="' + UI.esc(m.value) + '">' + UI.esc(m.label) + '</option>').join('') + '</select></div>' : '') +
        '<input type="file" class="form-control" accept=".xlsx,.xls,.csv" data-file aria-label="File to import"><div data-result class="mt-3"></div>',
      footer: '<button class="btn btn-light" data-bs-dismiss="modal">Close</button><button class="btn btn-primary" data-go><i class="fa-solid fa-upload me-1"></i>Upload</button>',
    });
    d.el.querySelector('[data-template]').addEventListener('click', () => Api.download(def.endpoint + '/import-template', {}, def.id + '-template.xlsx').catch(UI.errorToast));
    d.el.querySelector('[data-go]').addEventListener('click', async (ev) => {
      const file = d.el.querySelector('[data-file]').files[0];
      if (!file) { UI.toast('Choose a file first', 'warning'); return; }
      const fd = new FormData();
      fd.append('file', file);
      const mode = d.el.querySelector('[data-mode]');
      if (mode) fd.append('mode', mode.value);
      ev.target.disabled = true;
      try {
        const r = (await Api.upload(def.endpoint + '/import', fd)).data || {};
        d.el.querySelector('[data-result]').innerHTML = '<div class="alert alert-' + (r.failed ? 'warning' : 'success') + ' mb-0">Created ' + (r.created || 0) + ', updated ' + (r.updated || 0) + ', failed ' + (r.failed || 0) + '.' +
          ((r.errors || []).length ? '<ul class="mb-0 mt-2 small">' + r.errors.slice(0, 20).map((x) => '<li>Row ' + x.row + ': ' + UI.esc(x.message) + '</li>').join('') + '</ul>' : '') + '</div>';
        reload();
      } catch (e) { UI.errorToast(e); } finally { ev.target.disabled = false; }
    });
  }

  function pageHeader(def, toolbarHtml) {
    return '<div class="page-head d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">' +
      '<div><h1 class="h4 mb-1">' + (def.icon ? '<i class="' + UI.esc(def.icon) + ' me-2 text-primary"></i>' : '') + UI.esc(def.title) + '</h1>' +
      (def.description ? '<p class="text-muted mb-0 small">' + UI.esc(def.description) + '</p>' : '') + '</div>' +
      '<div class="d-flex flex-wrap gap-2">' + (toolbarHtml || '') + '</div></div>';
  }

  root.CrudPage = { render, pageHeader, listColumns, DEFAULT_OPS };
})(window);
