/**
 * Generic settings page driven by a `kind: 'settings'` definition.
 *
 * def = { id, title, icon, description, endpoint: '/settings/receipt', fields: [...],
 *         method?: 'PUT', toolbar?: [action], info?: 'html shown above the form',
 *         below?: (container, data) => void   // optional extra section under the form }
 */
(function (root) {
  function render(container, def) {
    const tools = (def.toolbar || []).map((a) => Actions.button(a)).join('');
    container.innerHTML = CrudPage.pageHeader(def, tools) +
      (def.info ? '<div class="alert alert-info small">' + def.info + '</div>' : '') +
      '<div class="card"><div class="card-body" data-form>' + UI.spinner() + '</div>' +
      (def.readOnly ? '' : '<div class="card-footer bg-transparent text-end"><button class="btn btn-primary" data-save disabled><i class="fa-solid fa-floppy-disk me-1"></i>Save changes</button></div>') +
      '</div><div data-below class="mt-3"></div>';

    let form = null;
    let data = {};
    const ctx = { reload: load, def, query: () => ({}) };

    async function load() {
      const box = container.querySelector('[data-form]');
      try {
        const res = await Api.get(def.endpoint);
        data = res.data || {};
        // dotted keys ("notifications.app.billing") read from nested objects
        const values = Object.assign({}, data);
        def.fields.forEach((f) => { if (f.key && f.key.includes('.')) values[f.key] = UI.get(data, f.key); });
        form = UI.buildForm(box, def.fields.map((f) => def.readOnly ? Object.assign({}, f, { readonly: true }) : f), values);
        const save = container.querySelector('[data-save]');
        if (save) save.disabled = false;
        if (def.below) def.below(container.querySelector('[data-below]'), data, ctx);
      } catch (e) {
        box.innerHTML = UI.emptyState(e.message, 'fa-triangle-exclamation');
      }
    }

    container.addEventListener('click', async (ev) => {
      const t = ev.target.closest('button');
      if (!t || !container.contains(t)) return;
      if (t.hasAttribute('data-save')) {
        if (!form.validate()) return;
        t.disabled = true;
        try {
          const res = await Api.request(def.method || 'PUT', def.endpoint, { body: nest(form.read()) });
          data = res.data || data;
          UI.toast(def.savedText || 'Settings saved');
          if (def.afterSave) def.afterSave(data);
        } catch (e) {
          if (e.fields) form.setErrors(e.fields);
          UI.errorToast(e);
        } finally { t.disabled = false; }
      } else if (t.dataset.action) {
        try { await Actions.run(def.toolbar.find((x) => x.id === t.dataset.action), data, ctx); } catch (e) { UI.errorToast(e); }
      }
    });

    load();
  }

  /** { "a.b": 1, c: 2 } → { a: { b: 1 }, c: 2 } */
  function nest(flat) {
    const out = {};
    Object.entries(flat).forEach(([k, v]) => {
      const parts = k.split('.');
      let o = out;
      parts.slice(0, -1).forEach((p) => { o = o[p] = o[p] || {}; });
      o[parts[parts.length - 1]] = v;
    });
    return out;
  }

  root.SettingsPage = { render, nest };
})(window);
