# lestari-client

Back-office web client for the **Lestari** point-of-sale backend, built with plain HTML, vanilla JavaScript, Bootstrap 5 and Font Awesome 7 (both from the jsDelivr CDN, latest 5.x / 7.x). No build step, no framework.

It covers the full back office: dashboard, products and stock, customers and suppliers, discounts/taxes/fees, marketing (promotions, points, commissions), stock opname, sales/purchases/cash, debts and returns, 26 reports, multi-branch management, store/online-store/QR-order/receipt/payment settings, staff and access, e-catalog orders, PPOB, billing, plugins, referral, integrations and loans — 80 screens in total.

The API contract the backend must implement is in **[ENDPOINTS.md](ENDPOINTS.md)** (332 endpoints, English `snake_case` attributes).

## Run it

1. Point the client at your backend in `js/config.js`:
   ```js
   apiBaseUrl: 'https://api.example.com/api/v1',
   ```
2. Serve the folder with any static web server, e.g. `npx serve .` or `python3 -m http.server 5500`, and open `index.html`.
3. The backend must allow CORS from the client's origin (headers `Authorization`, `Content-Type`, `X-Branch-Id`; expose `Content-Disposition`).

### Deploy with nginx

[`deploy/nginx/lestari.conf`](deploy/nginx/lestari.conf) serves the client and reverse-proxies the backend on one
HTTPS host, so no CORS setup is needed:

| Path | Goes to |
|---|---|
| `/`, `/app.html`, `/js/…` | this folder (e.g. `/var/www/lestari-client`) |
| `/api/…` | lestari-backend on `127.0.0.1:8080` |
| `/uploads/…` | uploaded files (via the backend, or straight from its `UPLOAD_DIR`) |

```bash
sudo cp -r index.html app.html js css img /var/www/lestari-client/
sudo cp deploy/nginx/lestari.conf /etc/nginx/conf.d/
sudo cp deploy/nginx/snippets/lestari-proxy.conf /etc/nginx/snippets/
# edit server_name + certificate paths, set apiBaseUrl: '/api/v1' in /var/www/lestari-client/js/config.js
sudo nginx -t && sudo systemctl reload nginx
```

Run the backend with `PUBLIC_URL=https://<your host>` so upload links point at the same host. The example also
redirects HTTP to HTTPS, sends HSTS and a Content-Security-Policy (only `cdn.jsdelivr.net` is allowed besides the
site itself), gzips text, makes browsers revalidate files on every load (they have no content hashes), hides
`tools/` and dotfiles, and rate-limits `POST /api/v1/auth/login` per IP. If the API lives on another host instead,
drop the `/api/` and `/uploads/` locations, set `apiBaseUrl` to that host, add it to `connect-src` in the CSP and
set the backend's `CORS_ORIGINS` to the client's origin.

### Try it without a backend

```bash
node tools/mock-server.js
```

Opens a static server on `http://localhost:5500/` and a fake API on `http://localhost:8080/api/v1` that answers every documented endpoint with sample data. Sign in with any email and password.

## How it is organised

```
index.html              sign-in page
app.html                application shell (sidebar, top bar, router outlet)
css/app.css             theme on top of Bootstrap (emerald / ivory / charcoal-dark)
js/config.js            API base URL and client settings
js/core/
  registry.js           Lestari.register(...) — every screen is declared here
  api.js                fetch wrapper: bearer token, refresh, X-Branch-Id, error envelope, downloads
  ui.js                 formatting, toasts, dialogs, schema-driven form builder
  charts.js             dependency-free SVG line/bar charts
js/components/
  crud.js               list + search + filters + tabs + pagination + create/edit/delete/bulk/import/export
  report.js             date range + filters + summary cards + chart + table + export + row detail
  settings.js           GET → form → PUT pages
  actions.js            declarative row/toolbar actions (forms, confirms, uploads, downloads)
js/modules/*.js         the features, grouped like the sidebar
js/menu.js              sidebar structure
js/app.js               session, sidebar, branch switcher, notifications badge, hash router
tools/generate-endpoints.js   builds ENDPOINTS.md from the modules (+ --check)
tools/mock-server.js          fake API generated from the same definitions
```

Each screen is a declaration, for example:

```js
Lestari.register({
  kind: 'crud', id: 'taxes', title: 'Taxes', endpoint: '/taxes',
  ops: ['list', 'create', 'read', 'update', 'delete', 'bulk_delete'],
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'rate', label: 'Rate', type: 'percent', required: true },
  ],
});
```

The same declaration renders the screen **and** produces its section of ENDPOINTS.md, so the code and the API documentation cannot drift apart.

## Adding or changing a feature

1. Edit or add a definition in `js/modules/` (and `js/menu.js` for a new screen).
2. Regenerate and verify the docs:
   ```bash
   node tools/generate-endpoints.js --check
   ```
   `--check` fails if any API path called anywhere in `js/` or `index.html` is not documented, or if a screen is missing from the menu.

## Conventions

- Routes are `app.html#/<page-id>`.
- Session tokens live in `localStorage` (`lestari.token`, `lestari.refresh_token`); the selected branch in `lestari.branch_id`.
- Screens that need a paid plugin carry `plugin: 'business'` (etc.); they show an upgrade prompt unless `GET /auth/me` lists the plugin in `active_plugins`.
- All money is shown in the store currency via `Intl.NumberFormat` (`id-ID`, IDR by default; change in `js/config.js`).
