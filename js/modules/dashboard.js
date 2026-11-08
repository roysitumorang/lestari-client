/**
 * DASHBOARD, missions and billing (top of the sidebar).
 */
(function (root) {
  const L = root.Lestari;

  L.register({
    kind: 'custom', id: 'dashboard', title: 'Dashboard', icon: 'fa-solid fa-gauge-high',
    endpoints: [{
      method: 'GET', path: '/dashboard', summary: 'Today-at-a-glance numbers and hourly charts.',
      query: { date: 'date (YYYY-MM-DD, default today)', include_unpaid_revenue: 'boolean (count credit sales in revenue)', include_unpaid_profit: 'boolean (count credit sales in profit)' },
      response: { data: {
        date: 'date',
        summary: { transaction_count: 'integer', revenue: 'number', profit: 'number', average_basket: 'number', compared_to_previous: { transaction_count: 'number (percent)', revenue: 'number (percent)', profit: 'number (percent)' } },
        hourly: [{ hour: 'string ("00:00"…"23:00")', transaction_count: 'integer', revenue: 'number', profit: 'number' }],
        top_products: [{ product_id: 'integer', name: 'string', quantity: 'number', revenue: 'number' }],
        low_stock: [{ product_id: 'integer', name: 'string', stock: 'number', minimum_stock: 'number' }],
        alerts: [{ type: '"store_location" | "subscription" | "storage" | "info"', message: 'string', action_label: 'string|null', action_route: 'string|null' }],
      } },
    }],
    render: async (container) => {
      const E = UI.esc;
      const today = UI.isoDate(new Date());
      container.innerHTML =
        '<div class="page-head d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">' +
        '<div><h1 class="h4 mb-1"><i class="fa-solid fa-gauge-high me-2 text-primary"></i>Dashboard</h1><p class="text-muted small mb-0">How the store is doing on the selected day.</p></div>' +
        '<div class="d-flex flex-wrap align-items-center gap-3">' +
        '<input type="date" class="form-control w-auto" data-date value="' + today + '" aria-label="Day">' +
        '<div class="form-check form-switch mb-0"><input class="form-check-input" type="checkbox" id="dRev" data-rev><label class="form-check-label small" for="dRev">Include unpaid revenue</label></div>' +
        '<div class="form-check form-switch mb-0"><input class="form-check-input" type="checkbox" id="dProf" data-prof><label class="form-check-label small" for="dProf">Include unpaid profit</label></div>' +
        '</div></div>' +
        '<div data-alerts></div>' +
        '<div class="row g-3 mb-3" data-stats></div>' +
        '<div class="row g-3">' +
        '<div class="col-12"><div class="card"><div class="card-body"><h2 class="h6">Transactions</h2><div data-chart="transaction_count"></div></div></div></div>' +
        '<div class="col-lg-6"><div class="card h-100"><div class="card-body"><h2 class="h6">Revenue</h2><div data-chart="revenue"></div></div></div></div>' +
        '<div class="col-lg-6"><div class="card h-100"><div class="card-body"><h2 class="h6">Profit</h2><div data-chart="profit"></div></div></div></div>' +
        '<div class="col-lg-6"><div class="card h-100"><div class="card-body"><h2 class="h6">Top products</h2><div data-top></div></div></div></div>' +
        '<div class="col-lg-6"><div class="card h-100"><div class="card-body"><h2 class="h6">Low stock</h2><div data-low></div></div></div></div>' +
        '</div>';

      const stat = (label, value, icon, delta) => '<div class="col-md-4"><div class="card stat-card h-100"><div class="card-body d-flex justify-content-between">' +
        '<div><div class="stat-label">' + E(label) + '</div><div class="stat-value">' + value + '</div>' +
        (delta != null ? '<div class="small ' + (delta >= 0 ? 'text-success' : 'text-danger') + '"><i class="fa-solid fa-arrow-' + (delta >= 0 ? 'up' : 'down') + '"></i> ' + UI.fmt.number(Math.abs(delta)) + '% vs previous day</div>' : '') +
        '</div><div class="stat-icon"><i class="' + icon + '"></i></div></div></div></div>';

      async function load() {
        const q = { date: container.querySelector('[data-date]').value, include_unpaid_revenue: container.querySelector('[data-rev]').checked, include_unpaid_profit: container.querySelector('[data-prof]').checked };
        container.querySelector('[data-stats]').innerHTML = '<div class="col-12">' + UI.spinner() + '</div>';
        try {
          const d = (await Api.get('/dashboard', q)).data || {};
          const s = d.summary || {};
          const cmp = s.compared_to_previous || {};
          container.querySelector('[data-stats]').innerHTML =
            stat('Transactions', UI.fmt.number(s.transaction_count || 0), 'fa-solid fa-cart-shopping', cmp.transaction_count) +
            stat('Revenue', UI.fmt.money(s.revenue || 0), 'fa-solid fa-coins', cmp.revenue) +
            stat('Profit', UI.fmt.money(s.profit || 0), 'fa-solid fa-sack-dollar', cmp.profit);
          container.querySelector('[data-alerts]').innerHTML = (d.alerts || []).map((a) => '<div class="alert alert-warning d-flex justify-content-between align-items-center py-2"><span>' + E(a.message) + '</span>' +
            (a.action_route ? '<a class="btn btn-sm btn-warning" href="#/' + E(a.action_route) + '">' + E(a.action_label || 'Open') + '</a>' : '') + '</div>').join('');
          const hourly = d.hourly || [];
          ['transaction_count', 'revenue', 'profit'].forEach((k) => {
            Charts.render(container.querySelector('[data-chart="' + k + '"]'), {
              type: 'line', labels: hourly.map((h) => h.hour),
              series: [{ name: k === 'transaction_count' ? 'Transactions' : k[0].toUpperCase() + k.slice(1), values: hourly.map((h) => Number(h[k] || 0)) }],
              format: k === 'transaction_count' ? UI.fmt.number : UI.fmt.money,
            });
          });
          const top = d.top_products || [];
          container.querySelector('[data-top]').innerHTML = top.length ? '<table class="table table-sm mb-0"><thead><tr><th>Product</th><th class="text-end">Qty</th><th class="text-end">Revenue</th></tr></thead><tbody>' +
            top.map((p) => '<tr><td>' + E(p.name) + '</td><td class="text-end">' + UI.fmt.number(p.quantity) + '</td><td class="text-end">' + UI.fmt.money(p.revenue) + '</td></tr>').join('') + '</tbody></table>' : UI.emptyState('No sales yet');
          const low = d.low_stock || [];
          container.querySelector('[data-low]').innerHTML = low.length ? '<table class="table table-sm mb-0"><thead><tr><th>Product</th><th class="text-end">Stock</th><th class="text-end">Minimum</th></tr></thead><tbody>' +
            low.map((p) => '<tr><td>' + E(p.name) + '</td><td class="text-end text-danger fw-semibold">' + UI.fmt.number(p.stock) + '</td><td class="text-end">' + UI.fmt.number(p.minimum_stock) + '</td></tr>').join('') + '</tbody></table>' : UI.emptyState('All stock levels are fine', 'fa-circle-check');
        } catch (e) {
          container.querySelector('[data-stats]').innerHTML = '<div class="col-12">' + UI.emptyState(e.message, 'fa-triangle-exclamation') + '</div>';
        }
      }
      container.addEventListener('change', (ev) => { if (ev.target.matches('[data-date],[data-rev],[data-prof]')) load(); });
      load();
    },
  });

  L.register({
    kind: 'custom', id: 'missions', title: 'Reward Missions', icon: 'fa-solid fa-list-check',
    endpoints: [
      { method: 'GET', path: '/missions', summary: 'Gamified tasks with progress and rewards.',
        response: { data: [{ id: 'integer', title: 'string', description: 'string', reward_type: '"coin" | "plugin_trial" | "voucher"', reward_amount: 'number', progress: 'integer', target: 'integer', status: '"in_progress" | "completed" | "claimed" | "expired"', expires_at: 'datetime|null', action_route: 'string|null' }] } },
      { method: 'POST', path: '/missions/{id}/claim', summary: 'Claim the reward of a completed mission.', response: { data: { id: 'integer', status: '"claimed"', reward_type: 'string', reward_amount: 'number' } } },
    ],
    render: async (container) => {
      const E = UI.esc;
      container.innerHTML = CrudPage.pageHeader({ title: 'Reward Missions', icon: 'fa-solid fa-list-check', description: 'Complete tasks to earn premium coins and trials.' }) + '<div class="row g-3" data-list>' + UI.spinner() + '</div>';
      const list = container.querySelector('[data-list]');
      async function load() {
        try {
          const rows = (await Api.get('/missions')).data || [];
          list.innerHTML = rows.length ? rows.map((m) => {
            const pct = Math.min(100, Math.round((m.progress / (m.target || 1)) * 100));
            return '<div class="col-md-6 col-xl-4"><div class="card h-100"><div class="card-body d-flex flex-column">' +
              '<div class="d-flex justify-content-between mb-2"><h2 class="h6 mb-0">' + E(m.title) + '</h2><span class="badge text-bg-light border">' + E(m.status.replace(/_/g, ' ')) + '</span></div>' +
              '<p class="small text-muted">' + E(m.description) + '</p>' +
              '<div class="progress mb-2" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:' + pct + '%"></div></div>' +
              '<div class="small mb-3">' + m.progress + ' / ' + m.target + ' · Reward: <strong>' + UI.fmt.number(m.reward_amount) + ' ' + E(m.reward_type.replace(/_/g, ' ')) + '</strong></div>' +
              '<div class="mt-auto">' + (m.status === 'completed' ? '<button class="btn btn-primary btn-sm" data-claim="' + m.id + '">Claim reward</button>'
                : (m.action_route && m.status === 'in_progress' ? '<a class="btn btn-outline-primary btn-sm" href="#/' + E(m.action_route) + '">Go</a>' : '')) + '</div>' +
              '</div></div></div>';
          }).join('') : '<div class="col-12">' + UI.emptyState('No missions right now', 'fa-flag-checkered') + '</div>';
        } catch (e) { list.innerHTML = '<div class="col-12">' + UI.emptyState(e.message, 'fa-triangle-exclamation') + '</div>'; }
      }
      list.addEventListener('click', async (ev) => {
        const b = ev.target.closest('[data-claim]');
        if (!b) return;
        b.disabled = true;
        try { await Api.post('/missions/' + b.dataset.claim + '/claim'); UI.toast('Reward claimed'); load(); } catch (e) { UI.errorToast(e); b.disabled = false; }
      });
      load();
    },
  });

  const payMethods = [{ value: 'virtual_account', label: 'Virtual account' }, { value: 'qris', label: 'QRIS' }, { value: 'e_wallet', label: 'E-wallet' }, { value: 'credit_card', label: 'Credit card' }, { value: 'convenience_store', label: 'Convenience store' }, { value: 'manual_transfer', label: 'Manual bank transfer' }];
  L.paymentChannels = payMethods;
  const openPayment = (res) => { const u = res && res.data && res.data.payment_url; if (u) window.open(u, '_blank', 'noopener'); };

  L.register({
    kind: 'report', id: 'billing', title: 'Billing & Subscription', icon: 'fa-solid fa-credit-card', endpoint: '/billing/invoices', defaultPreset: 'this_year',
    description: 'Your plan, premium coin balance and invoices.',
    filters: [{ key: 'status', label: 'Status', type: 'select', options: ['pending', 'paid', 'expired', 'cancelled'] }],
    summary: [
      { key: 'plan_name', label: 'Current plan', icon: 'fa-solid fa-crown' },
      { key: 'plan_expires_at', label: 'Active until', format: 'date', icon: 'fa-regular fa-calendar' },
      { key: 'coin_balance', label: 'Premium coin balance', format: 'money', icon: 'fa-solid fa-coins' },
    ],
    columns: [{ key: 'created_at', label: 'Date', format: 'datetime' }, { key: 'invoice_number', label: 'Invoice' }, { key: 'description', label: 'For' }, { key: 'payment_method', label: 'Method' }, { key: 'amount', label: 'Amount', format: 'money' }, { key: 'status', label: 'Status', format: 'badge' }],
    export: false,
    toolbar: [
      { id: 'subscribe', label: 'Renew / upgrade plan', icon: 'fa-solid fa-crown', method: 'POST', path: '/billing/subscriptions', success: 'Invoice created', after: openPayment,
        form: [
          { key: 'plan', label: 'Plan', type: 'select', required: true, options: [{ value: 'pro_monthly', label: 'Pro · monthly' }, { value: 'pro_quarterly', label: 'Pro · 3 months' }, { value: 'pro_yearly', label: 'Pro · yearly' }] },
          { key: 'payment_method', label: 'Pay with', type: 'select', required: true, options: [{ value: 'coin', label: 'Premium coin balance' }].concat(payMethods) },
          { key: 'promo_code', label: 'Promo code', type: 'text' },
        ],
        summary: 'Buy or renew the store subscription.', response: { data: '<Invoice>' } },
      { id: 'topup', label: 'Top up coins', icon: 'fa-solid fa-coins', method: 'POST', path: '/billing/coin-top-ups', success: 'Top-up created', after: openPayment,
        form: [{ key: 'amount', label: 'Amount', type: 'money', required: true, min: 10000 }, { key: 'payment_method', label: 'Pay with', type: 'select', required: true, options: payMethods }, { key: 'promo_code', label: 'Promo code', type: 'text' }],
        summary: 'Buy premium coins.', response: { data: '<Invoice>' } },
      { id: 'voucher', label: 'Redeem voucher', icon: 'fa-solid fa-ticket', method: 'POST', path: '/billing/vouchers/redeem', success: 'Voucher redeemed',
        form: [{ key: 'code', label: 'Voucher or token code', type: 'text', required: true, col: 12 }],
        response: { data: { code: 'string', reward_type: '"coin" | "subscription_days" | "plugin"', reward_amount: 'number', coin_balance: 'number' } } },
    ],
    rowActions: [
      { id: 'pay', label: 'Pay now', icon: 'fa-solid fa-arrow-up-right-from-square', when: (r) => r.status === 'pending' && r.payment_url, onClick: (r) => window.open(r.payment_url, '_blank', 'noopener') },
      { id: 'proof', label: 'Upload transfer proof', icon: 'fa-solid fa-upload', when: (r) => r.status === 'pending' && r.payment_method === 'manual_transfer', method: 'POST', path: '/billing/invoices/{id}/payment-proof', upload: true, success: 'Proof uploaded',
        form: [{ key: 'file', label: 'Transfer receipt (image/PDF)', type: 'file', accept: 'image/*,.pdf', required: true, col: 12 }, { key: 'sender_account_name', label: 'Sender account name', type: 'text' }],
        response: { data: '<Invoice>' } },
      { id: 'cancel', label: 'Cancel', icon: 'fa-solid fa-ban', when: (r) => r.status === 'pending', method: 'POST', path: '/billing/invoices/{id}/cancel', confirm: 'Cancel this invoice?', success: 'Invoice cancelled', response: { data: '<Invoice>' } },
      { id: 'pdf', label: 'Download invoice', icon: 'fa-solid fa-file-pdf', when: (r) => r.status === 'paid', method: 'GET', path: '/billing/invoices/{id}/pdf', download: 'invoice.pdf', reload: false },
    ],
    responseNote: 'Each row also has payment_url (string|null) and payment_instructions (string|null).',
  });
})(window);
