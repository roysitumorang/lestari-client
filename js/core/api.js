/**
 * Thin fetch wrapper for the Lestari backend.
 *  - Sends `Authorization: Bearer <token>` and `X-Branch-Id` (when a branch is selected).
 *  - Expects the JSON envelope documented in ENDPOINTS.md: { data, meta?, summary? } or { error }.
 *  - On 401 it tries one refresh, then sends the user back to the login page.
 *  - Passwords are sent base64-encoded (UTF-8 bytes, standard alphabet): see `encodePassword`.
 */
(function (root) {
  const cfg = root.LESTARI_CONFIG;
  const K = cfg.storageKeys;

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
    set(key, val) { try { val == null ? localStorage.removeItem(key) : localStorage.setItem(key, val); } catch (_) { /* ignore */ } },
  };

  class ApiError extends Error {
    constructor(status, payload) {
      const err = (payload && payload.error) || {};
      super(err.message || ('Request failed (' + status + ')'));
      this.status = status;
      this.code = err.code || 'http_' + status;
      this.fields = err.fields || {};
    }
  }

  /** Base64-encode a password (UTF-8 safe) the way the backend expects it. Empty stays empty. */
  function encodePassword(value) {
    if (value == null || value === '') return value;
    const bytes = new TextEncoder().encode(String(value));
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin);
  }

  function buildUrl(path, query) {
    const url = new URL(cfg.apiBaseUrl.replace(/\/$/, '') + path);
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return;
        if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(k + '[]', x));
        else url.searchParams.set(k, v);
      });
    }
    return url.toString();
  }

  function headers(extra) {
    const h = Object.assign({ Accept: 'application/json' }, extra || {});
    const token = store.get(K.token);
    const branch = store.get(K.branch);
    if (token) h.Authorization = 'Bearer ' + token;
    if (branch) h['X-Branch-Id'] = branch;
    return h;
  }

  let refreshing = null;
  async function tryRefresh() {
    const rt = store.get(K.refreshToken);
    if (!rt) return false;
    if (!refreshing) {
      refreshing = fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      }).then(async (r) => {
        if (!r.ok) return false;
        const j = await r.json();
        store.set(K.token, j.data.access_token);
        store.set(K.refreshToken, j.data.refresh_token);
        return true;
      }).catch(() => false).finally(() => { setTimeout(() => { refreshing = null; }, 0); });
    }
    return refreshing;
  }

  function goLogin() {
    store.set(K.token, null);
    store.set(K.refreshToken, null);
    if (!/index\.html$|\/$/.test(location.pathname)) location.href = 'index.html';
  }

  async function request(method, path, opts) {
    opts = opts || {};
    const init = { method, headers: headers() };
    if (opts.form instanceof FormData) {
      init.body = opts.form; // browser sets multipart boundary
    } else if (opts.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    let res;
    try {
      res = await fetch(buildUrl(path, opts.query), init);
    } catch (e) {
      throw new ApiError(0, { error: { code: 'network_error', message: 'Cannot reach the server at ' + cfg.apiBaseUrl } });
    }
    if (res.status === 401 && !opts._retried && path !== '/auth/login') {
      if (await tryRefresh()) return request(method, path, Object.assign({}, opts, { _retried: true }));
      goLogin();
      throw new ApiError(401, { error: { code: 'unauthenticated', message: 'Session expired, please sign in again.' } });
    }
    if (opts.blob) {
      if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
      return { blob: await res.blob(), filename: filenameFrom(res) };
    }
    if (res.status === 204) return { data: null };
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, payload);
    return payload || { data: null };
  }

  function filenameFrom(res) {
    const cd = res.headers.get('Content-Disposition') || '';
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
    return m ? decodeURIComponent(m[1]) : 'export';
  }

  async function download(path, query, fallbackName) {
    const { blob, filename } = await request('GET', path, { query, blob: true });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename === 'export' ? (fallbackName || 'export.xlsx') : filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  root.Api = {
    ApiError,
    store,
    get: (p, query) => request('GET', p, { query }),
    post: (p, body) => request('POST', p, { body }),
    put: (p, body) => request('PUT', p, { body }),
    patch: (p, body) => request('PATCH', p, { body }),
    del: (p, body) => request('DELETE', p, { body }),
    upload: (p, form) => request('POST', p, { form }),
    download,
    request,
    goLogin,
    encodePassword,
  };
})(window);
