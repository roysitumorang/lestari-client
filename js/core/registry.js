/**
 * Central registry. Feature modules call Lestari.register(...) to declare a page.
 * The same declarations drive the UI (js/components/*) and the ENDPOINTS.md generator
 * (tools/generate-endpoints.js), so the code and the API documentation never drift.
 *
 * Page kinds:
 *   crud     – list/search/paginate + create/edit/delete (+ bulk, import, export)
 *   report   – date range + filters + summary cards + table + export
 *   settings – one form loaded with GET and saved with PUT
 *   custom   – hand-written render(container, ctx)
 *
 * Any kind may declare `endpoints: [...]` for extra calls it makes, so they are documented too.
 */
(function (root) {
  const pages = new Map();
  const groups = [];
  const sharedEndpoints = [];

  const Lestari = root.Lestari || {};

  Lestari.register = function register(def) {
    if (!def || !def.id) throw new Error('Page definition needs an id');
    if (pages.has(def.id)) throw new Error('Duplicate page id: ' + def.id);
    def.kind = def.kind || 'custom';
    pages.set(def.id, def);
    return def;
  };

  /** Declare a sidebar group (order of calls = order in the menu). */
  Lestari.group = function group(def) {
    groups.push(def);
    return def;
  };

  /** Endpoints used by core code (auth, branch switcher, lookups) rather than one page. */
  Lestari.sharedEndpoint = function sharedEndpoint(def) {
    sharedEndpoints.push(def);
    return def;
  };

  Lestari.pages = pages;
  Lestari.groups = groups;
  Lestari.sharedEndpoints = sharedEndpoints;
  Lestari.getPage = (id) => pages.get(id);

  root.Lestari = Lestari;
})(typeof window !== 'undefined' ? window : globalThis);
