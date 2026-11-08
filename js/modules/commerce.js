/**
 * E-CATALOG (online orders), PPOB, referral, integrations, loans and notifications.
 */
(function (root) {
  const L = root.Lestari;
  const lk = L.lookups;

  // ---------- E-catalog ----------
  const orderStatuses = [
    { value: '', label: 'All' }, { value: 'unpaid', label: 'Unpaid' }, { value: 'awaiting_confirmation', label: 'Awaiting confirmation' },
    { value: 'payment_rejected', label: 'Payment rejected' }, { value: 'processing', label: 'Processing' }, { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' }, { value: 'completed', label: 'Completed' }, { value: 'returned', label: 'Returned' }, { value: 'cancelled', label: 'Cancelled' },
  ];
  const statusAction = (id, label, icon, to, when, extra) => Object.assign({
    id, label, icon, when, method: 'PATCH', path: '/catalog/orders/{id}/status', success: 'Order updated', body: { status: to },
    summary: 'Move the order to "' + to + '".', request: { status: '"' + to + '"' }, response: { data: '<CatalogOrder>' },
  }, extra || {});

  L.register({
    kind: 'crud', id: 'catalog-orders', title: 'Online Orders', singular: 'Order', icon: 'fa-solid fa-bag-shopping',
    endpoint: '/catalog/orders', ops: ['list', 'read', 'export'], readOnly: true, titleKey: 'order_number', defaultSort: 'created_at', defaultOrder: 'desc',
    tabs: { key: 'status', options: orderStatuses },
    searchPlaceholder: 'Search name or order number',
    filters: [
      { key: 'payment_method', label: 'Payment', type: 'select', options: [{ value: 'bank_transfer', label: 'Bank transfer / e-wallet' }, { value: 'direct', label: 'Pay on pickup / COD' }] },
      { key: 'sort_by', label: 'Sort by', type: 'select', options: [{ value: 'latest', label: 'Newest' }, { value: 'grand_total', label: 'Order value' }] },
    ],
    columns: [{ key: 'created_at', label: 'Date', format: 'datetime' }, { key: 'order_number', label: 'Order' }, { key: 'customer_name', label: 'Customer' }, { key: 'shipping_method', label: 'Delivery' }, { key: 'payment_method', label: 'Payment' }, { key: 'grand_total', label: 'Total', format: 'money' }, { key: 'status', label: 'Status', format: 'badge' }],
    fields: [
      { key: 'order_number', label: 'Order number' }, { key: 'created_at', label: 'Date', type: 'datetime' }, { key: 'status', label: 'Status' },
      { key: 'customer_name', label: 'Customer' }, { key: 'customer_phone', label: 'Phone' }, { key: 'shipping_address', label: 'Ship to' },
      { key: 'shipping_method', label: 'Delivery' }, { key: 'courier', label: 'Courier' }, { key: 'tracking_number', label: 'Tracking number' },
      { key: 'payment_method', label: 'Payment' }, { key: 'payment_proof_url', label: 'Payment proof', type: 'image' },
      { key: 'items', label: 'Items', type: 'items', fields: [{ key: 'product_name', label: 'Item' }, { key: 'quantity', label: 'Qty', format: 'number' }, { key: 'unit_price', label: 'Price', format: 'money' }, { key: 'subtotal', label: 'Subtotal', format: 'money' }] },
      { key: 'subtotal', label: 'Subtotal', type: 'money' }, { key: 'shipping_fee', label: 'Shipping', type: 'money' }, { key: 'grand_total', label: 'Total', type: 'money' }, { key: 'customer_note', label: 'Customer note' },
    ],
    rowActions: [
      statusAction('confirm_payment', 'Confirm payment', 'fa-solid fa-circle-check', 'processing', (r) => r.status === 'awaiting_confirmation'),
      statusAction('reject_payment', 'Reject payment', 'fa-solid fa-circle-xmark', 'payment_rejected', (r) => r.status === 'awaiting_confirmation', { form: [{ key: 'reason', label: 'Reason shown to the customer', type: 'textarea', required: true, col: 12 }], after: undefined, request: { status: '"payment_rejected"', reason: 'string' } }),
      statusAction('ship', 'Mark as shipped', 'fa-solid fa-truck', 'shipped', (r) => r.status === 'processing', { form: [{ key: 'courier', label: 'Courier', type: 'text' }, { key: 'tracking_number', label: 'Tracking number', type: 'text' }], request: { status: '"shipped"', courier: 'string?', tracking_number: 'string?' } }),
      statusAction('deliver', 'Mark as delivered', 'fa-solid fa-box-open', 'delivered', (r) => r.status === 'shipped'),
      statusAction('complete', 'Complete', 'fa-solid fa-flag-checkered', 'completed', (r) => ['delivered', 'processing'].includes(r.status)),
      statusAction('cancel', 'Cancel order', 'fa-solid fa-ban', 'cancelled', (r) => ['unpaid', 'awaiting_confirmation', 'processing'].includes(r.status), { variant: 'danger', form: [{ key: 'reason', label: 'Reason', type: 'textarea', required: true, col: 12 }], request: { status: '"cancelled"', reason: 'string' } }),
      { id: 'invoice', label: 'Download invoice', icon: 'fa-solid fa-file-pdf', method: 'GET', path: '/catalog/orders/{id}/invoice', download: 'order.pdf', reload: false },
    ],
  });
  // form-based status actions must merge the fixed status into the submitted body
  L.getPage('catalog-orders').rowActions.forEach((a) => {
    if (a.form && a.body) {
      const fixed = a.body;
      a.values = () => ({});
      a.onClick = (row, ctx) => UI.formModal({
        title: a.label, fields: a.form, submitText: a.label,
        onSubmit: async (d) => { await Api.patch(Actions.fillPath(a.path, row), Object.assign({}, d, fixed)); UI.toast(a.success); ctx.reload(); },
      });
    }
  });

  L.register({
    kind: 'settings', id: 'catalog-shipping', title: 'Shipping & Payment', icon: 'fa-solid fa-truck-fast', endpoint: '/settings/catalog',
    description: 'How online-store customers pay and receive their orders.',
    fields: [
      { type: 'heading', label: 'Payment' },
      { key: 'bank_transfer_enabled', label: 'Bank transfer & e-wallet', type: 'switch' },
      { key: 'direct_payment_enabled', label: 'Pay directly (on pickup / COD)', type: 'switch' },
      { type: 'heading', label: 'Delivery' },
      { key: 'takeaway_enabled', label: 'Pick up at store', type: 'switch' },
      { key: 'cod_enabled', label: 'Cash on delivery', type: 'switch' },
      { key: 'courier_enabled', label: 'Courier services', type: 'switch' },
      { key: 'couriers', label: 'Couriers', type: 'multiselect', col: 12, showIf: { key: 'courier_enabled', in: ['true'] },
        options: ['anteraja', 'tiki', 'esl', 'jnt', 'jne', 'lion', 'ncs', 'pahala', 'pos', 'rpx', 'sicepat', 'wahana'].map((c) => ({ value: c, label: c.toUpperCase() })) },
      { key: 'own_courier_enabled', label: 'Own delivery staff', type: 'switch' },
      { key: 'own_courier_mode', label: 'Own delivery fee by', type: 'select', options: [{ value: 'city', label: 'City' }, { value: 'radius', label: 'Distance' }], showIf: { key: 'own_courier_enabled', in: ['true'] } },
      { key: 'own_courier_city_rates', label: 'Fee per city', type: 'items', col: 12, showIf: { key: 'own_courier_mode', in: ['city'] },
        fields: [{ key: 'city_id', label: 'City', type: 'select', lookup: { endpoint: '/regions/cities', value: 'id', label: 'name' } }, { key: 'fee', label: 'Fee', type: 'money' }] },
      { key: 'own_courier_radius_rates', label: 'Fee per distance', type: 'items', col: 12, showIf: { key: 'own_courier_mode', in: ['radius'] },
        fields: [{ key: 'min_km', label: 'From km', type: 'number' }, { key: 'max_km', label: 'To km', type: 'number' }, { key: 'fee', label: 'Fee', type: 'money' }] },
    ],
  });

  L.register({
    kind: 'crud', id: 'catalog-accounts', title: 'Payout Accounts', singular: 'Account', icon: 'fa-solid fa-building-columns',
    description: 'Bank, e-wallet and QRIS accounts shown to online customers for transfers.',
    endpoint: '/catalog/payment-accounts', ops: ['list', 'create', 'read', 'update', 'delete'], titleKey: 'provider',
    columns: [{ key: 'type', label: 'Type', format: 'badge' }, { key: 'provider', label: 'Bank / e-wallet' }, { key: 'account_name', label: 'Account name' }, { key: 'account_number', label: 'Number' }, { key: 'is_active', label: 'Active', format: 'boolean' }],
    fields: [
      { key: 'type', label: 'Type', type: 'select', required: true, default: 'bank', options: [{ value: 'bank', label: 'Bank account' }, { value: 'e_wallet', label: 'E-wallet' }, { value: 'qris', label: 'QRIS' }] },
      { key: 'provider', label: 'Bank / e-wallet name', type: 'text', required: true, placeholder: 'BCA, Mandiri, GoPay, OVO…' },
      { key: 'account_name', label: 'Account holder', type: 'text', required: true },
      { key: 'account_number', label: 'Account / phone number', type: 'text', showIf: { key: 'type', in: ['bank', 'e_wallet'] } },
      { key: 'qris_image_url', label: 'QRIS image', type: 'image', col: 12, showIf: { key: 'type', in: ['qris'] } },
      { key: 'is_active', label: 'Active', type: 'switch', default: true },
    ],
  });

  // ---------- PPOB ----------
  L.register({
    kind: 'report', id: 'ppob-deposits', title: 'PPOB Deposit', icon: 'fa-solid fa-piggy-bank', endpoint: '/ppob/deposits', defaultPreset: 'last_30_days',
    description: 'Prepaid balance used to sell phone credit, data, electricity tokens and bill payments. Minimum top-up Rp100.000, maximum balance Rp2.000.000.',
    search: 'Search history',
    summary: [{ key: 'balance', label: 'Current balance', format: 'money', icon: 'fa-solid fa-wallet' }, { key: 'transaction_total', label: 'All PPOB transactions', format: 'money', icon: 'fa-solid fa-receipt' }],
    columns: [{ key: 'created_at', label: 'Date', format: 'datetime' }, { key: 'reference_id', label: 'Reference' }, { key: 'type', label: 'Type', format: 'badge' }, { key: 'payment_method', label: 'Method' }, { key: 'amount', label: 'Amount', format: 'money' }, { key: 'balance_after', label: 'Balance after', format: 'money' }, { key: 'status', label: 'Status', format: 'badge' }],
    export: false,
    toolbar: [{ id: 'topup', label: 'Top up balance', icon: 'fa-solid fa-plus', method: 'POST', path: '/ppob/deposits', success: 'Top-up created',
      form: [
        { key: 'amount', label: 'Amount', type: 'select', required: true, default: 100000, options: [100000, 200000, 250000, 300000, 500000, 1000000].map((n) => ({ value: n, label: UI.fmt.money(n) })) },
        { key: 'payment_method', label: 'Pay with', type: 'select', required: true, options: L.paymentChannels },
        { key: 'voucher_code', label: 'Voucher (optional)', type: 'text' },
      ],
      after: (res) => { const u = res && res.data && res.data.payment_url; if (u) window.open(u, '_blank', 'noopener'); },
      response: { data: { id: 'integer', reference_id: 'string', amount: 'number', admin_fee: 'number', status: '"pending"', payment_url: 'string|null', payment_instructions: 'string|null', expires_at: 'datetime' } } }],
    rowActions: [
      { id: 'proof', label: 'Upload transfer proof', icon: 'fa-solid fa-upload', when: (r) => r.status === 'pending' && r.payment_method === 'manual_transfer', method: 'POST', path: '/ppob/deposits/{id}/payment-proof', upload: true, success: 'Proof uploaded',
        form: [{ key: 'file', label: 'Transfer receipt', type: 'file', accept: 'image/*,.pdf', required: true, col: 12 }], response: { data: '<PpobDeposit>' } },
      { id: 'cancel', label: 'Cancel', icon: 'fa-solid fa-ban', when: (r) => r.status === 'pending', method: 'POST', path: '/ppob/deposits/{id}/cancel', confirm: 'Cancel this top-up?', success: 'Top-up cancelled', response: { data: '<PpobDeposit>' } },
    ],
  });

  const ppobPrice = (id, title, endpoint, extra) => L.register({
    kind: 'crud', id, title, singular: 'Price', icon: 'fa-solid fa-tag', endpoint, ops: ['list', 'update', 'import', 'export'], titleKey: 'product_name',
    searchPlaceholder: 'Search product name',
    filters: [{ key: 'category', label: 'Category', type: 'select', options: extra.categories }],
    columns: extra.columns,
    fields: extra.fields,
  });
  ppobPrice('ppob-prepaid', 'PPOB Prepaid Prices', '/ppob/prices/prepaid', {
    categories: ['pulsa', 'data', 'pln_token', 'e_money', 'game_voucher', 'streaming'].map((c) => ({ value: c, label: c.replace(/_/g, ' ') })),
    columns: [{ key: 'category', label: 'Category', format: 'badge' }, { key: 'provider', label: 'Provider' }, { key: 'product_name', label: 'Product' }, { key: 'base_price', label: 'Cost', format: 'money' }, { key: 'selling_price', label: 'Your price', format: 'money' }, { key: 'is_active', label: 'On sale', format: 'boolean' }],
    fields: [{ key: 'product_name', label: 'Product', type: 'text', readonly: true, col: 12 }, { key: 'base_price', label: 'Cost', type: 'money', readonly: true }, { key: 'selling_price', label: 'Your selling price', type: 'money', required: true, min: 0 }, { key: 'is_active', label: 'On sale', type: 'switch', default: true }],
  });
  ppobPrice('ppob-postpaid', 'PPOB Postpaid Fees', '/ppob/prices/postpaid', {
    categories: ['pln_postpaid', 'pdam', 'bpjs', 'telkom', 'gas_postpaid', 'multifinance', 'internet_tv'].map((c) => ({ value: c, label: c.replace(/_/g, ' ') })),
    columns: [{ key: 'category', label: 'Category', format: 'badge' }, { key: 'product_name', label: 'Biller' }, { key: 'base_admin_fee', label: 'Base admin fee', format: 'money' }, { key: 'admin_fee', label: 'Your admin fee', format: 'money' }, { key: 'is_active', label: 'On sale', format: 'boolean' }],
    fields: [{ key: 'product_name', label: 'Biller', type: 'text', readonly: true, col: 12 }, { key: 'base_admin_fee', label: 'Base admin fee', type: 'money', readonly: true }, { key: 'admin_fee', label: 'Your admin fee', type: 'money', required: true, min: 0 }, { key: 'is_active', label: 'On sale', type: 'switch', default: true }],
  });

  // ---------- Referral ----------
  L.register({
    kind: 'settings', id: 'referral', title: 'Referral Program', icon: 'fa-solid fa-user-plus', endpoint: '/referrals', readOnly: true,
    description: 'Invite other businesses and earn rewards when they subscribe.',
    fields: [{ key: 'code', label: 'Your referral code', type: 'text' }, { key: 'share_url', label: 'Share link', type: 'text' }, { key: 'referred_count', label: 'Businesses referred', type: 'number' }, { key: 'reward_balance', label: 'Reward balance', type: 'money' }],
    toolbar: [
      { id: 'create', label: 'Create referral code', icon: 'fa-solid fa-wand-magic-sparkles', when: (d) => !d.code, method: 'POST', path: '/referrals/code', success: 'Referral code created',
        form: [{ key: 'code', label: 'Preferred code (optional)', type: 'text', col: 12 }], response: { data: { code: 'string', share_url: 'string' } } },
      { id: 'withdraw', label: 'Move rewards to coins', icon: 'fa-solid fa-coins', method: 'POST', path: '/referrals/rewards/transfer-to-coin', confirm: 'Move your whole reward balance to premium coins?', success: 'Rewards moved to coins',
        response: { data: { transferred: 'number', coin_balance: 'number', reward_balance: 'number' } } },
    ],
    below: (box, data) => {
      const rows = data.referred_businesses || [];
      box.innerHTML = '<div class="card"><div class="card-body"><h2 class="h6">Referred businesses</h2>' + (rows.length ? '<table class="table table-sm mb-0"><thead><tr><th>Store</th><th>Joined</th><th>Status</th><th class="text-end">Reward</th></tr></thead><tbody>' +
        rows.map((r) => '<tr><td>' + UI.esc(r.store_name) + '</td><td>' + UI.fmt.date(r.joined_at) + '</td><td>' + UI.fmt.badge(r.status) + '</td><td class="text-end">' + UI.fmt.money(r.reward_amount) + '</td></tr>').join('') + '</tbody></table>' : UI.emptyState('No referrals yet', 'fa-user-plus')) + '</div></div>';
    },
    responseNote: 'data also includes referred_businesses: [{ store_name, joined_at, status, reward_amount }].',
  });

  // ---------- Integrations ----------
  L.register({
    kind: 'custom', id: 'integrations', title: 'Integrations', icon: 'fa-solid fa-plug',
    endpoints: [
      { method: 'GET', path: '/integrations', summary: 'Connectable services (payments, accounting…).', response: { data: [{ code: 'string (e.g. "dana", "jurnal")', name: 'string', description: 'string', logo_url: 'string', status: '"inactive" | "pending" | "active"', terms_url: 'string|null', connected_at: 'datetime|null' }] } },
      { method: 'POST', path: '/integrations/{code}/activate', summary: 'Connect a service (after accepting its terms).', body: { accept_terms: 'boolean', settings: 'object (service-specific, optional)' }, response: { data: { code: 'string', status: '"pending" | "active"', redirect_url: 'string|null' } } },
      { method: 'POST', path: '/integrations/{code}/deactivate', summary: 'Disconnect a service.', response: { data: { code: 'string', status: '"inactive"' } } },
    ],
    render: (container) => cardList(container, {
      title: 'Integrations', icon: 'fa-solid fa-plug', description: 'Connect payment providers and accounting software.', endpoint: '/integrations',
      card: (i) => '<div class="d-flex align-items-center gap-3 mb-2">' + (i.logo_url ? '<img src="' + UI.esc(i.logo_url) + '" alt="" class="thumb">' : '') + '<h2 class="h6 mb-0">' + UI.esc(i.name) + '</h2><span class="badge text-bg-light border ms-auto">' + UI.esc(i.status) + '</span></div>' +
        '<p class="small text-muted">' + UI.esc(i.description) + '</p>' +
        '<div class="mt-auto">' + (i.status === 'inactive' ? '<button class="btn btn-sm btn-primary" data-on="' + UI.esc(i.code) + '">Connect</button>' : '<button class="btn btn-sm btn-outline-danger" data-off="' + UI.esc(i.code) + '">Disconnect</button>') +
        (i.terms_url ? ' <a class="btn btn-sm btn-link" target="_blank" rel="noopener" href="' + UI.esc(i.terms_url) + '">Terms</a>' : '') + '</div>',
      onClick: async (ev, reload) => {
        const on = ev.target.closest('[data-on]'); const off = ev.target.closest('[data-off]');
        if (on && await UI.confirm('I have read and accept the terms of service of this integration.', { title: 'Connect', okText: 'Accept & connect', variant: 'primary' })) {
          const r = await Api.post('/integrations/' + on.dataset.on + '/activate', { accept_terms: true });
          if (r.data && r.data.redirect_url) window.open(r.data.redirect_url, '_blank', 'noopener');
          UI.toast('Integration requested'); reload();
        } else if (off && await UI.confirm('Disconnect this integration?', { okText: 'Disconnect' })) {
          await Api.post('/integrations/' + off.dataset.off + '/deactivate'); UI.toast('Disconnected'); reload();
        }
      },
    }),
  });

  // ---------- Loans ----------
  L.register({
    kind: 'custom', id: 'loans', title: 'Business Loans', icon: 'fa-solid fa-hand-holding-dollar',
    endpoints: [
      { method: 'GET', path: '/loans/providers', summary: 'Lending partners and their terms.', response: { data: [{ code: 'string', name: 'string', description: 'string', logo_url: 'string', min_amount: 'number', max_amount: 'number', tenors_months: ['integer'], interest_info: 'string', info_url: 'string|null' }] } },
      { method: 'GET', path: '/loans/applications', summary: 'Your loan applications.', response: { data: [{ id: 'integer', provider_code: 'string', amount: 'number', tenor_months: 'integer', status: '"submitted" | "in_review" | "approved" | "rejected" | "disbursed"', created_at: 'datetime' }] } },
      { method: 'POST', path: '/loans/applications', summary: 'Apply for a loan (store data is shared with the partner).', body: { provider_code: 'string', amount: 'number', tenor_months: 'integer', purpose: 'string', consent: 'boolean' }, response: { data: { id: 'integer', status: '"submitted"', redirect_url: 'string|null' } } },
    ],
    render: (container) => cardList(container, {
      title: 'Business Loans', icon: 'fa-solid fa-hand-holding-dollar', description: 'Working-capital loans from our lending partners, based on your sales history.', endpoint: '/loans/providers',
      card: (p) => '<div class="d-flex align-items-center gap-3 mb-2">' + (p.logo_url ? '<img src="' + UI.esc(p.logo_url) + '" alt="" class="thumb">' : '') + '<h2 class="h6 mb-0">' + UI.esc(p.name) + '</h2></div>' +
        '<p class="small text-muted">' + UI.esc(p.description) + '</p><p class="small mb-2">' + UI.fmt.money(p.min_amount) + ' – ' + UI.fmt.money(p.max_amount) + '<br>' + UI.esc(p.interest_info || '') + '</p>' +
        '<div class="mt-auto"><button class="btn btn-sm btn-primary" data-apply="' + UI.esc(p.code) + '">Apply</button>' + (p.info_url ? ' <a class="btn btn-sm btn-link" target="_blank" rel="noopener" href="' + UI.esc(p.info_url) + '">Details</a>' : '') + '</div>',
      onClick: (ev, reload, rows) => {
        const b = ev.target.closest('[data-apply]');
        if (!b) return;
        const p = rows.find((x) => x.code === b.dataset.apply);
        UI.formModal({
          title: 'Apply · ' + p.name, submitText: 'Submit application',
          fields: [
            { key: 'amount', label: 'Amount', type: 'money', required: true, min: p.min_amount, max: p.max_amount },
            { key: 'tenor_months', label: 'Tenor', type: 'select', required: true, options: (p.tenors_months || []).map((t) => ({ value: t, label: t + ' months' })) },
            { key: 'purpose', label: 'What is the loan for?', type: 'textarea', required: true, col: 12 },
            { key: 'consent', label: 'I agree to share my store and sales data with this partner', type: 'switch', required: true, col: 12 },
          ],
          onSubmit: async (d) => {
            if (!d.consent) throw new Api.ApiError(422, { error: { message: 'Please give consent to continue', fields: { consent: ['Required'] } } });
            const r = await Api.post('/loans/applications', Object.assign({ provider_code: p.code }, d));
            if (r.data && r.data.redirect_url) window.open(r.data.redirect_url, '_blank', 'noopener');
            UI.toast('Application submitted');
          },
        });
      },
    }),
  });

  /** Shared card-grid renderer for integrations and loans. */
  function cardList(container, o) {
    container.innerHTML = CrudPage.pageHeader(o) + '<div class="row g-3" data-list>' + UI.spinner() + '</div>';
    const list = container.querySelector('[data-list]');
    let rows = [];
    async function load() {
      try {
        rows = (await Api.get(o.endpoint)).data || [];
        list.innerHTML = rows.length ? rows.map((r) => '<div class="col-md-6 col-xl-4"><div class="card h-100"><div class="card-body d-flex flex-column">' + o.card(r) + '</div></div></div>').join('') : '<div class="col-12">' + UI.emptyState('Nothing available yet') + '</div>';
      } catch (e) { list.innerHTML = '<div class="col-12">' + UI.emptyState(e.message, 'fa-triangle-exclamation') + '</div>'; }
    }
    list.addEventListener('click', async (ev) => { try { await o.onClick(ev, load, rows); } catch (e) { UI.errorToast(e); } });
    load();
  }

  // ---------- Notifications ----------
  L.register({
    kind: 'crud', id: 'notifications', title: 'Notifications', singular: 'Notification', icon: 'fa-regular fa-bell',
    endpoint: '/notifications', ops: ['list', 'read'], readOnly: true, titleKey: 'title', defaultSort: 'created_at', defaultOrder: 'desc',
    tabs: { key: 'source', options: [{ value: '', label: 'All' }, { value: 'back_office', label: 'Back office' }, { value: 'online_store', label: 'Online store' }] },
    filters: [{ key: 'start_date', label: 'From', type: 'date' }, { key: 'end_date', label: 'To', type: 'date' }],
    columns: [{ key: 'created_at', label: 'Time', format: 'datetime' }, { key: 'title', label: 'Title' }, { key: 'message', label: 'Message' }, { key: 'read_at', label: 'Read', render: (v) => (v ? '<i class="fa-solid fa-check text-success" aria-label="Read"></i>' : '<span class="badge text-bg-primary">New</span>') }],
    fields: [{ key: 'title', label: 'Title' }, { key: 'message', label: 'Message' }, { key: 'created_at', label: 'Time', type: 'datetime' }, { key: 'source', label: 'Source' }, { key: 'link_route', label: 'Related page' }, { key: 'attachment_url', label: 'Attachment', type: 'image' }],
    toolbar: [{ id: 'read_all', label: 'Mark all as read', icon: 'fa-solid fa-check-double', method: 'POST', path: '/notifications/read-all', success: 'All marked as read', after: () => App.refreshBadge(), response: { data: { updated: 'integer' } } }],
    rowActions: [
      { id: 'read', label: 'Mark as read', icon: 'fa-solid fa-check', when: (r) => !r.read_at, method: 'POST', path: '/notifications/{id}/read', success: 'Marked as read', after: () => App.refreshBadge(), response: { data: '<Notification>' } },
      { id: 'open', label: 'Open related page', icon: 'fa-solid fa-arrow-up-right-from-square', when: (r) => r.link_route, onClick: (r) => { location.hash = '#/' + r.link_route; } },
    ],
  });
})(window);
