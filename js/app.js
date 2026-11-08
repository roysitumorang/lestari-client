/**
 * Application shell: session check, sidebar, top bar, branch switcher and hash router.
 * Routes look like  #/products  — the part after "#/" is a page id from the registry.
 */
(function (root) {
  const L = root.Lestari;
  const cfg = root.LESTARI_CONFIG;
  const K = cfg.storageKeys;
  const E = UI.esc;

  const App = {
    user: null,
    current: null,

    async start() {
      if (!Api.store.get(K.token)) { location.replace('index.html'); return; }
      this.applyDisplay(safeJson(Api.store.get(K.theme)) || {});
      this.renderSidebar();
      bindShell();
      try {
        await this.refreshUser();
      } catch (e) {
        if (e.status === 401) return; // api.js redirects
        UI.errorToast(e);
      }
      this.refreshBadge();
      Api.get('/settings/display').then((r) => this.applyDisplay(r.data || {})).catch(() => {});
      window.addEventListener('hashchange', () => this.route());
      this.route();
    },

    async refreshUser() {
      const me = (await Api.get('/auth/me')).data || {};
      this.user = me;
      Api.store.set(K.user, JSON.stringify(me));
      document.querySelector('[data-user-name]').textContent = me.name || me.email || '';
      document.querySelector('[data-user-role]').textContent = (me.branch && me.branch.name ? me.branch.name + ' · ' : '') + (me.role || '');
      document.querySelector('[data-store-name]').textContent = (me.store && me.store.name) || cfg.appName;
      if (me.avatar_url) { const a = document.querySelector('[data-avatar]'); a.src = me.avatar_url; a.hidden = false; }
      this.markPlugins();
      this.loadBranches();
      return me;
    },

    async refreshBadge() {
      try {
        const n = (await Api.get('/notifications/unread-count')).data.count || 0;
        const b = document.querySelector('[data-badge]');
        b.textContent = n > 99 ? '99+' : n;
        b.hidden = !n;
      } catch (_) { /* badge is optional */ }
    },

    async loadBranches() {
      const box = document.querySelector('[data-branches]');
      try {
        const rows = (await Api.get('/branches', { per_page: 100 })).data || [];
        if (rows.length < 2) { box.closest('.dropdown').hidden = true; return; }
        const cur = String(Api.store.get(K.branch) || (this.user.branch && this.user.branch.id) || '');
        box.innerHTML = rows.map((b) => '<li><button class="dropdown-item d-flex justify-content-between' + (String(b.id) === cur ? ' active' : '') + '" data-branch="' + b.id + '">' +
          E(b.name) + (b.is_head_office ? ' <span class="badge text-bg-light border ms-2">Head office</span>' : '') + '</button></li>').join('');
        const current = rows.find((b) => String(b.id) === cur);
        document.querySelector('[data-branch-label]').textContent = current ? current.name : 'Branch';
        box.closest('.dropdown').hidden = false;
      } catch (_) { box.closest('.dropdown').hidden = true; }
    },

    switchBranch(id) {
      Api.store.set(K.branch, String(id));
      UI.clearLookups();
      UI.toast('Switched branch');
      this.refreshUser().then(() => this.route(true)).catch(UI.errorToast);
    },

    applyDisplay(d) {
      const theme = d.color_theme || 'emerald';
      document.documentElement.dataset.appTheme = theme;
      document.documentElement.setAttribute('data-bs-theme', theme === 'charcoal' ? 'dark' : 'light');
      document.documentElement.classList.toggle('hide-breadcrumbs', d.show_breadcrumbs === false);
      Api.store.set(K.theme, JSON.stringify(d));
    },

    markPlugins() {
      const active = new Set((this.user && this.user.active_plugins) || []);
      document.querySelectorAll('[data-nav-plugin]').forEach((a) => {
        a.querySelector('.plugin-tag').hidden = active.has(a.dataset.navPlugin);
      });
    },

    go(id, force) {
      if (location.hash === '#/' + id && force) this.route(true);
      else location.hash = '#/' + id;
    },

    route() {
      const id = (location.hash.replace(/^#\/?/, '').split('?')[0]) || 'dashboard';
      const def = L.getPage(id) || L.getPage('dashboard');
      const main = document.getElementById('main');
      this.current = def.id;
      document.title = def.title + ' · ' + cfg.appName;
      document.querySelectorAll('.nav-link[data-page]').forEach((a) => {
        const on = a.dataset.page === def.id;
        a.classList.toggle('active', on);
        if (on) {
          a.setAttribute('aria-current', 'page');
          let p = a.parentElement.closest('.collapse');
          while (p) { p.classList.add('show'); const t = document.querySelector('[data-bs-target="#' + p.id + '"]'); if (t) t.setAttribute('aria-expanded', 'true'); p = p.parentElement.closest('.collapse'); }
        } else a.removeAttribute('aria-current');
      });
      document.querySelector('[data-breadcrumb]').innerHTML = breadcrumb(def.id);
      const oc = bootstrap.Offcanvas.getInstance(document.getElementById('sidebar'));
      if (oc) oc.hide();
      // dialogs belong to the page that opened them
      document.querySelectorAll('.modal').forEach((m) => { const inst = bootstrap.Modal.getInstance(m); if (inst) inst.hide(); else m.remove(); });

      // plugin gate
      if (def.plugin && this.user && !(this.user.active_plugins || []).includes(def.plugin)) {
        main.innerHTML = CrudPage.pageHeader(def) + '<div class="card"><div class="card-body text-center py-5"><i class="fa-solid fa-lock fa-2x text-muted mb-3"></i>' +
          '<h2 class="h5">This feature needs the ' + E(def.plugin) + ' plugin</h2><p class="text-muted">Subscribe or start a 7-day trial to unlock it.</p>' +
          '<a class="btn btn-primary" href="#/plugins">See plugins</a></div></div>';
        return;
      }
      main.innerHTML = '';
      const view = document.createElement('div');
      view.className = 'view';
      main.appendChild(view);
      try {
        if (def.kind === 'crud') CrudPage.render(view, def);
        else if (def.kind === 'report') ReportPage.render(view, def);
        else if (def.kind === 'settings') SettingsPage.render(view, def);
        else def.render(view, { app: this });
      } catch (e) {
        console.error(e);
        view.innerHTML = UI.emptyState('This page failed to load: ' + e.message, 'fa-bug');
      }
      main.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    },

    renderSidebar() {
      let n = 0;
      const link = (id, depth) => {
        const p = L.getPage(id);
        if (!p) { console.warn('Menu refers to unknown page', id); return ''; }
        return '<li><a class="nav-link depth-' + depth + '" href="#/' + p.id + '" data-page="' + p.id + '"' + (p.plugin ? ' data-nav-plugin="' + p.plugin + '"' : '') + '>' +
          (depth === 0 ? '<i class="' + E(p.icon) + ' fa-fw"></i>' : '') + '<span>' + E(p.title) + '</span>' +
          (p.plugin ? '<span class="plugin-tag" title="Plugin"><i class="fa-solid fa-crown"></i></span>' : '') + '</a></li>';
      };
      const group = (g, depth) => {
        const cid = 'nav-c' + (++n);
        return '<li><button class="nav-link nav-toggle depth-' + depth + ' collapsed" data-bs-toggle="collapse" data-bs-target="#' + cid + '" aria-expanded="false" aria-controls="' + cid + '">' +
          (g.icon ? '<i class="' + E(g.icon) + ' fa-fw"></i>' : '') + '<span>' + E(g.label) + '</span><i class="fa-solid fa-chevron-down chev"></i></button>' +
          '<ul class="collapse list-unstyled" id="' + cid + '">' + g.items.map((it) => (typeof it === 'string' ? link(it, depth + 1) : group(it, depth + 1))).join('') + '</ul></li>';
      };
      document.querySelector('[data-nav]').innerHTML = L.groups.map((g) => {
        if (g.items.length === 1 && typeof g.items[0] === 'string') return link(g.items[0], 0);
        return group(g, 0);
      }).join('');
    },
  };

  function breadcrumb(id) {
    const path = [];
    const walk = (items, trail) => items.some((it) => {
      if (typeof it === 'string') { if (it === id) { path.push(...trail); return true; } return false; }
      return walk(it.items, trail.concat(it.label));
    });
    L.groups.some((g) => walk(g.items, g.items.length > 1 ? [g.label] : []));
    const p = L.getPage(id);
    return '<ol class="breadcrumb mb-0">' + path.map((x) => '<li class="breadcrumb-item">' + E(x) + '</li>').join('') + '<li class="breadcrumb-item active" aria-current="page">' + E(p.title) + '</li></ol>';
  }

  function safeJson(s) { try { return JSON.parse(s); } catch (_) { return null; } }

  function bindShell() {
    document.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-branch]');
      if (b) { App.switchBranch(b.dataset.branch); return; }
      if (ev.target.closest('[data-logout]')) {
        ev.preventDefault();
        try { await Api.post('/auth/logout'); } catch (_) { /* ignore */ }
        Object.values(K).forEach((k) => { if (k !== K.theme) Api.store.set(k, null); });
        location.replace('index.html');
      }
      if (ev.target.closest('[data-change-password]')) {
        ev.preventDefault();
        const prof = L.getPage('profile');
        Actions.run(prof.toolbar.find((a) => a.id === 'password'), null, null);
      }
    });
    const search = document.querySelector('[data-nav-search]');
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      document.querySelectorAll('[data-nav] a.nav-link').forEach((a) => {
        a.parentElement.hidden = !!q && !a.textContent.toLowerCase().includes(q);
      });
      document.querySelectorAll('[data-nav] .collapse').forEach((c) => {
        const any = [...c.querySelectorAll('a.nav-link')].some((a) => !a.parentElement.hidden);
        c.parentElement.hidden = !!q && !any;
        if (q) c.classList.add('show');
      });
    });
    setInterval(() => App.refreshBadge(), 60000);
  }

  root.App = App;
  document.addEventListener('DOMContentLoaded', () => App.start());
})(window);
