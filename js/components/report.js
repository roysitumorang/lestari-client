/**
 * Generic report page driven by a `kind: 'report'` definition.
 *
 * def = {
 *   id, title, icon, description, endpoint: '/reports/sales',
 *   dateRange?: true (default) | false,
 *   filters?: [fields],
 *   summary?: [{ key, label, format, icon }],    // read from response.summary
 *   columns: [{ key, label, format }],           // rows in response.data
 *   chart?: { type:'line'|'bar', label:'hour', series:[{ key, name }], source:'chart'|'data' },
 *   paginated?: true, export?: true, search?: 'placeholder',
 *   detail?: { endpoint:'/reports/sales/{id}', fields:[...] , idKey:'id' },
 *   toolbar?: [action], rowActions?: [action], groupBy?: { key, options }
 * }
 */
(function (root) {
  const PRESETS = [
    ['today', 'Today'], ['yesterday', 'Yesterday'], ['last_7_days', 'Last 7 days'], ['last_30_days', 'Last 30 days'],
    ['this_month', 'This month'], ['last_month', 'Last month'], ['this_year', 'This year'], ['custom', 'Custom'],
  ];

  function presetRange(p) {
    const d = new Date(); const s = new Date(d); const e = new Date(d);
    switch (p) {
      case 'yesterday': s.setDate(d.getDate() - 1); e.setDate(d.getDate() - 1); break;
      case 'last_7_days': s.setDate(d.getDate() - 6); break;
      case 'last_30_days': s.setDate(d.getDate() - 29); break;
      case 'this_month': s.setDate(1); break;
      case 'last_month': s.setMonth(d.getMonth() - 1, 1); e.setDate(0); break;
      case 'this_year': s.setMonth(0, 1); break;
      default: break;
    }
    return [UI.isoDate(s), UI.isoDate(e)];
  }

  function render(container, def) {
    const E = UI.esc;
    const useDates = def.dateRange !== false;
    const paginated = def.paginated !== false;
    const [s0, e0] = presetRange(def.defaultPreset || 'today');
    const state = { start_date: s0, end_date: e0, page: 1, per_page: 50, q: '', filters: {}, group: def.groupBy ? def.groupBy.options[0].value : '', rows: [] };

    const tools = [];
    (def.toolbar || []).forEach((a) => tools.push(Actions.button(a)));
    if (def.export !== false) tools.push('<button class="btn btn-outline-secondary" data-export><i class="fa-solid fa-file-arrow-down me-1"></i>Download report</button>');

    container.innerHTML = CrudPage.pageHeader(def, tools.join('')) +
      '<div class="card mb-3"><div class="card-body"><div class="row g-2 align-items-end">' +
      (useDates ? '<div class="col-sm-6 col-lg-3"><label class="form-label small">Period</label><select class="form-select" data-preset>' +
        PRESETS.map(([v, l]) => '<option value="' + v + '"' + (v === (def.defaultPreset || 'today') ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>' +
        '<div class="col-6 col-lg-2"><label class="form-label small">From</label><input type="date" class="form-control" data-start value="' + s0 + '"></div>' +
        '<div class="col-6 col-lg-2"><label class="form-label small">To</label><input type="date" class="form-control" data-end value="' + e0 + '"></div>' : '') +
      (def.groupBy ? '<div class="col-sm-6 col-lg-2"><label class="form-label small">' + E(def.groupBy.label || 'Group by') + '</label><select class="form-select" data-group>' +
        def.groupBy.options.map((o) => '<option value="' + E(o.value) + '">' + E(o.label) + '</option>').join('') + '</select></div>' : '') +
      '<div class="col" data-filters></div>' +
      '<div class="col-auto"><button class="btn btn-primary" data-apply><i class="fa-solid fa-filter me-1"></i>Apply</button></div>' +
      '</div></div></div>' +
      (def.summary ? '<div class="row g-3 mb-3" data-summary></div>' : '') +
      (def.chart ? '<div class="card mb-3"><div class="card-body"><h2 class="h6 mb-3">' + E(def.chart.title || 'Chart') + '</h2><div data-chart></div></div></div>' : '') +
      '<div class="card"><div class="card-body">' +
      (def.search ? '<div class="mb-3" style="max-width:360px"><input type="search" class="form-control" data-search placeholder="' + E(def.search) + '" aria-label="Search"></div>' : '') +
      '<div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead><tr>' +
      def.columns.map((c) => '<th class="' + (['money', 'number', 'percent'].includes(c.format) ? 'text-end' : '') + '">' + E(c.label) + '</th>').join('') +
      (def.detail || def.rowActions ? '<th></th>' : '') + '</tr></thead><tbody data-body></tbody><tfoot data-foot></tfoot></table></div>' +
      '<div class="d-flex justify-content-between align-items-center mt-3" data-pager></div></div></div>';

    let filterForm = null;
    if (def.filters && def.filters.length) {
      const box = container.querySelector('[data-filters]');
      box.innerHTML = '<div></div>';
      filterForm = UI.buildForm(box.firstChild, def.filters.map((f) => Object.assign({ col: Math.max(3, Math.floor(12 / def.filters.length)) }, f, { required: false })), {});
      filterForm.el.classList.replace('g-3', 'g-2');
      filterForm.el.querySelectorAll('.form-label').forEach((l) => l.classList.add('small'));
    }

    const body = container.querySelector('[data-body]');
    const foot = container.querySelector('[data-foot]');
    const pager = container.querySelector('[data-pager]');

    function query(includePage) {
      const q = Object.assign({}, state.filters);
      if (useDates) { q.start_date = state.start_date; q.end_date = state.end_date; }
      if (def.groupBy) q[def.groupBy.key] = state.group;
      if (state.q) q.q = state.q;
      if (includePage !== false && paginated) { q.page = state.page; q.per_page = state.per_page; }
      return q;
    }

    async function load() {
      const span = def.columns.length + 1;
      body.innerHTML = '<tr><td colspan="' + span + '">' + UI.spinner() + '</td></tr>';
      foot.innerHTML = '';
      try {
        const res = await Api.get(def.endpoint, query());
        state.rows = res.data || [];
        drawSummary(res.summary || {});
        drawChart(res);
        body.innerHTML = state.rows.length ? state.rows.map((r, i) => '<tr>' + def.columns.map((c) =>
          '<td class="' + (['money', 'number', 'percent'].includes(c.format) ? 'text-end' : '') + '">' + UI.formatValue(c, r) + '</td>').join('') +
          (def.detail || def.rowActions ? '<td class="text-end text-nowrap">' +
            (def.detail ? '<button class="btn btn-sm btn-light" data-detail="' + i + '" aria-label="Details"><i class="fa-regular fa-eye"></i></button> ' : '') +
            (def.rowActions || []).filter((a) => !a.when || a.when(r)).map((a) => '<button class="btn btn-sm btn-light" data-row-action="' + E(a.id) + '" data-i="' + i + '" title="' + E(a.label) + '" aria-label="' + E(a.label) + '"><i class="' + E(a.icon || 'fa-solid fa-bolt') + '"></i></button>').join(' ') +
            '</td>' : '') + '</tr>').join('')
          : '<tr><td colspan="' + span + '">' + UI.emptyState('No data for this period', 'fa-file-circle-question') + '</td></tr>';
        if (res.totals) {
          foot.innerHTML = '<tr class="table-light fw-semibold">' + def.columns.map((c, i) =>
            '<td class="' + (['money', 'number', 'percent'].includes(c.format) ? 'text-end' : '') + '">' + (res.totals[c.key] !== undefined ? UI.formatValue(c, res.totals) : (i === 0 ? 'Total' : '')) + '</td>').join('') + (def.detail || def.rowActions ? '<td></td>' : '') + '</tr>';
        }
        const m = res.meta;
        if (paginated && m && m.total_pages > 1) {
          pager.innerHTML = '<div class="small text-muted">Page ' + m.page + ' of ' + m.total_pages + ' · ' + UI.fmt.number(m.total) + ' rows</div>' +
            '<div class="btn-group"><button class="btn btn-sm btn-outline-secondary" data-page="' + (m.page - 1) + '"' + (m.page <= 1 ? ' disabled' : '') + '>Previous</button>' +
            '<button class="btn btn-sm btn-outline-secondary" data-page="' + (m.page + 1) + '"' + (m.page >= m.total_pages ? ' disabled' : '') + '>Next</button></div>';
        } else pager.innerHTML = '';
      } catch (e) {
        body.innerHTML = '<tr><td colspan="' + span + '">' + UI.emptyState(e.message, 'fa-triangle-exclamation') + '</td></tr>';
      }
    }

    function drawSummary(sum) {
      const box = container.querySelector('[data-summary]');
      if (!box) return;
      box.innerHTML = def.summary.map((s) => '<div class="col-sm-6 col-xl-' + Math.max(2, Math.floor(12 / Math.min(def.summary.length, 4))) + '"><div class="card stat-card h-100"><div class="card-body d-flex justify-content-between">' +
        '<div><div class="stat-label">' + E(s.label) + '</div><div class="stat-value">' + UI.formatValue(s, sum) + '</div></div>' +
        '<div class="stat-icon"><i class="' + E(s.icon || 'fa-solid fa-chart-simple') + '"></i></div></div></div></div>').join('');
    }

    function drawChart(res) {
      if (!def.chart) return;
      const src = def.chart.source === 'data' ? res.data : (res.chart || []);
      Charts.render(container.querySelector('[data-chart]'), {
        type: def.chart.type || 'line',
        labels: (src || []).map((r) => r[def.chart.label]),
        series: def.chart.series.map((s) => ({ name: s.name, values: (src || []).map((r) => Number(r[s.key] || 0)) })),
        format: def.chart.format === 'money' ? UI.fmt.money : UI.fmt.number,
      });
    }

    const ctx = { reload: load, def, query: () => query(false) };

    container.addEventListener('click', async (ev) => {
      const t = ev.target.closest('button');
      if (!t || !container.contains(t)) return;
      try {
        if (t.hasAttribute('data-apply')) {
          if (filterForm) state.filters = filterForm.read();
          state.page = 1; load();
        } else if (t.hasAttribute('data-export')) {
          await Api.download(def.endpoint + '/export', Object.assign(query(false), { format: 'xlsx' }), def.id + '.xlsx');
        } else if (t.dataset.page) {
          state.page = Number(t.dataset.page); load();
        } else if (t.dataset.detail) {
          const row = state.rows[Number(t.dataset.detail)];
          const path = Actions.fillPath(def.detail.endpoint, row);
          const d = UI.modal({ title: def.detail.title || 'Details', body: UI.spinner(), size: 'lg', footer: '<button class="btn btn-light" data-bs-dismiss="modal">Close</button>' });
          try {
            const res = await Api.get(path);
            d.body.innerHTML = def.detail.render ? def.detail.render(res.data) : UI.detailView(def.detail.fields, res.data);
          } catch (e) { d.body.innerHTML = UI.emptyState(e.message, 'fa-triangle-exclamation'); }
        } else if (t.dataset.rowAction) {
          const a = def.rowActions.find((x) => x.id === t.dataset.rowAction);
          await Actions.run(a, state.rows[Number(t.dataset.i)], ctx);
        } else if (t.dataset.action) {
          await Actions.run(def.toolbar.find((x) => x.id === t.dataset.action), null, ctx);
        }
      } catch (e) { UI.errorToast(e); }
    });

    container.addEventListener('change', (ev) => {
      if (ev.target.matches('[data-preset]')) {
        if (ev.target.value !== 'custom') {
          const [s, e] = presetRange(ev.target.value);
          container.querySelector('[data-start]').value = s;
          container.querySelector('[data-end]').value = e;
          state.start_date = s; state.end_date = e; state.page = 1; load();
        }
      } else if (ev.target.matches('[data-start],[data-end]')) {
        container.querySelector('[data-preset]').value = 'custom';
        state.start_date = container.querySelector('[data-start]').value;
        state.end_date = container.querySelector('[data-end]').value;
      } else if (ev.target.matches('[data-group]')) {
        state.group = ev.target.value; state.page = 1; load();
      }
    });

    const search = container.querySelector('[data-search]');
    if (search) {
      let timer;
      search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { state.q = search.value.trim(); state.page = 1; load(); }, 350); });
    }

    load();
  }

  root.ReportPage = { render, presetRange };
})(window);
