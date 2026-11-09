/**
 * Declarative actions shared by CRUD, report and settings pages.
 *
 * Action definition:
 *   { id, label, icon, variant,
 *     method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'GET',
 *     path: '/staff/{id}/resend-invitation',  // {field} placeholders are filled from the row
 *     form: [fields],                          // ask for input first (sent as JSON body)
 *     upload: true,                            // form contains a file → multipart
 *     confirm: 'Text',  typeToConfirm: 'RESET',
 *     download: 'name.xlsx',                   // GET as file download
 *     when: (row) => boolean,
 *     success: 'Toast text', reload: true,
 *     summary, request, response               // documentation hints for ENDPOINTS.md
 *     onClick: (row, ctx) => {}                // fully custom handler instead of the above
 *   }
 */
(function (root) {
  const T = (s, v) => (root.I18n ? root.I18n.t(s, v) : s);
  function fillPath(path, row) {
    return path.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(UI.get(row || {}, k)));
  }

  async function run(action, row, ctx) {
    if (action.onClick) return action.onClick(row, ctx);
    const path = fillPath(action.path, row);
    const exec = async (body) => {
      if (action.download) {
        // useFilters: send the page's current filters (e.g. report date range) along with the form values
        await Api.download(path, Object.assign({}, action.useFilters && ctx && ctx.query ? ctx.query() : {}, body || {}), action.download);
        return;
      }
      let res;
      if (action.upload) {
        const fd = new FormData();
        Object.entries(body || {}).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, v instanceof File ? v : (typeof v === 'object' ? JSON.stringify(v) : v)); });
        res = await Api.upload(path, fd);
      } else {
        res = await Api.request(action.method || 'POST', path, body === undefined ? {} : { body });
      }
      UI.toast(action.success || T('Done'));
      if (action.after) action.after(res, row, ctx);
      if (action.reload !== false && ctx && ctx.reload) ctx.reload();
      return res;
    };

    if (action.form) {
      const values = typeof action.values === 'function' ? await action.values(row) : (action.values || {});
      UI.formModal({
        title: action.title || action.label,
        fields: action.form,
        values,
        submitText: action.submitText || action.label,
        onSubmit: exec,
      });
      return;
    }
    if (action.confirm) {
      const ok = await UI.confirm(action.confirm, { title: action.label, okText: action.label, variant: action.variant || 'primary', typeToConfirm: action.typeToConfirm });
      if (!ok) return;
    }
    const body = action.useFilters && !action.download && ctx && ctx.query
      ? Object.assign({}, ctx.query(), action.body || {})
      : action.body;
    try { await exec(body); } catch (e) { UI.errorToast(e); }
  }

  function button(action, extraClass) {
    return '<button type="button" class="btn ' + (extraClass || 'btn-outline-secondary') + '" data-action="' + UI.esc(action.id) + '">' +
      (action.icon ? '<i class="' + UI.esc(action.icon) + ' me-1"></i>' : '') + UI.esc(action.label) + '</button>';
  }

  root.Actions = { run, button, fillPath };
})(window);
