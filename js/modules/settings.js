/**
 * SETTINGS group: profile, store, online store, link page, QR order, payments, receipt,
 * storage, data reset, plugins, staff, attendance, help access, back-office display.
 */
(function (root) {
  const L = root.Lestari;
  const lk = L.lookups;
  const O = L.options;
  const S = (def) => L.register(Object.assign({ kind: 'settings' }, def));

  // ---------- Profile ----------
  S({
    id: 'profile', title: 'Profile', icon: 'fa-solid fa-user', endpoint: '/account/profile',
    fields: [
      { key: 'avatar_url', label: 'Photo', type: 'image', col: 12 },
      { key: 'name', label: 'Full name', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text' },
      { key: 'email', label: 'Email', type: 'email', readonly: true, help: 'Contact support to change the login email.' },
      { key: 'phone', label: 'Phone (e.g. +628…)', type: 'tel' },
      { key: 'phone_verified', label: 'Phone verified', type: 'switch', readonly: true },
      { key: 'birth_year', label: 'Birth year', type: 'number', min: 1900, max: new Date().getFullYear() },
      { key: 'gender', label: 'Gender', type: 'select', options: O.gender },
      { key: 'address', label: 'Address', type: 'textarea', col: 12 },
      { type: 'heading', label: 'Notifications' },
      { key: 'notifications.app.billing', label: 'App · Billing', type: 'switch', col: 4 },
      { key: 'notifications.app.ppob', label: 'App · PPOB', type: 'switch', col: 4 },
      { key: 'notifications.app.promotions', label: 'App · Promotions', type: 'switch', col: 4 },
      { key: 'notifications.app.newsletter', label: 'App · Newsletter', type: 'switch', col: 4 },
      { key: 'notifications.email.billing', label: 'Email · Billing', type: 'switch', col: 4 },
      { key: 'notifications.email.promotions', label: 'Email · Promotions', type: 'switch', col: 4 },
      { key: 'notifications.email.newsletter', label: 'Email · Newsletter', type: 'switch', col: 4 },
      { key: 'notifications.whatsapp.billing', label: 'WhatsApp · Billing', type: 'switch', col: 4 },
      { key: 'notifications.whatsapp.promotions', label: 'WhatsApp · Promotions', type: 'switch', col: 4 },
      { key: 'notifications.whatsapp.newsletter', label: 'WhatsApp · Newsletter', type: 'switch', col: 4 },
    ],
    requestNote: 'Notification switches are flat dotted keys in the form; the client sends them as a nested object: { "notifications": { "app": { "billing": true, … }, "email": {…}, "whatsapp": {…} } }.',
    toolbar: [
      { id: 'password', label: 'Change password', icon: 'fa-solid fa-key', method: 'PUT', path: '/auth/password', reload: false, success: 'Password changed',
        form: [{ key: 'current_password', label: 'Current password', type: 'password', required: true, col: 12 }, { key: 'new_password', label: 'New password', type: 'password', required: true, col: 12 }, { key: 'new_password_confirmation', label: 'Repeat new password', type: 'password', required: true, col: 12 }] },
      { id: 'pin', label: 'Change PPOB PIN', icon: 'fa-solid fa-hashtag', method: 'PUT', path: '/account/ppob-pin', reload: false, success: 'PIN changed',
        form: [{ key: 'password', label: 'Account password', type: 'password', required: true, col: 12 }, { key: 'new_pin', label: 'New 6-digit PIN', type: 'password', encode: false, required: true, col: 12 }],
        response: { data: { changed: 'boolean' } } },
      { id: 'verify_phone', label: 'Verify phone', icon: 'fa-solid fa-mobile-screen-button', onClick: () => verifyPhone() },
      { id: 'two_factor', label: 'Two-step verification', icon: 'fa-solid fa-shield-halved', onClick: () => twoFactor() },
      { id: 'activity', label: 'Owner activity log', icon: 'fa-solid fa-clock-rotate-left', onClick: () => activityLog('/account/activity-logs', 'Owner activity log') },
      { id: 'deactivate', label: 'Deactivate account', icon: 'fa-solid fa-user-slash', variant: 'danger', method: 'POST', path: '/account/deactivation-requests', success: 'Deactivation requested',
        confirm: 'Request deactivation of this account? Your data stays until support processes the request.', typeToConfirm: 'DEACTIVATE',
        response: { data: { id: 'string (uuid)', status: '"pending"', created_at: 'datetime' } } },
    ],
    endpoints: [
      { method: 'POST', path: '/account/phone-verification', summary: 'Send an OTP to the phone number (SMS or WhatsApp).', body: { phone: 'string', channel: '"sms" | "whatsapp"' }, response: { data: { expires_in: 'integer (seconds)' } } },
      { method: 'POST', path: '/account/phone-verification/confirm', summary: 'Confirm the phone OTP.', body: { phone: 'string', code: 'string (4–6 digits)' }, response: { data: { phone_verified: 'boolean' } } },
      { method: 'POST', path: '/account/two-factor/setup', summary: 'Start authenticator-app setup.', response: { data: { secret: 'string', otpauth_url: 'string', qr_code_svg: 'string' } } },
      { method: 'POST', path: '/account/two-factor/enable', summary: 'Enable 2FA after confirming a code from the app.', body: { code: 'string (6 digits)' }, response: { data: { enabled: 'boolean', recovery_codes: ['string'] } } },
      { method: 'POST', path: '/account/two-factor/disable', summary: 'Turn 2FA off.', body: { password: 'string (base64)' }, response: { data: { enabled: 'boolean' } } },
      { method: 'GET', path: '/account/activity-logs', summary: 'Sign-ins and important changes by the owner.', query: { page: 'integer', per_page: 'integer' }, response: { data: [{ id: 'string (uuid)', created_at: 'datetime', action: 'string', description: 'string', ip_address: 'string', user_agent: 'string' }], meta: '<Pagination>' } },
    ],
    afterSave: (data) => { if (window.App) App.refreshUser(); return data; },
  });

  async function verifyPhone() {
    let phone = '';
    UI.formModal({
      title: 'Verify phone number', submitText: 'Send code',
      fields: [{ key: 'phone', label: 'Phone (+628…)', type: 'tel', required: true, col: 12 }, { key: 'channel', label: 'Send code by', type: 'select', options: [{ value: 'whatsapp', label: 'WhatsApp' }, { value: 'sms', label: 'SMS' }], default: 'whatsapp', col: 12 }],
      onSubmit: async (d) => {
        phone = d.phone;
        await Api.post('/account/phone-verification', d);
        setTimeout(() => UI.formModal({
          title: 'Enter verification code', submitText: 'Verify',
          fields: [{ key: 'code', label: 'Code', type: 'text', required: true, col: 12 }],
          onSubmit: async (c) => { await Api.post('/account/phone-verification/confirm', { phone, code: c.code }); UI.toast('Phone verified'); App.go('profile', true); },
        }), 400);
      },
    });
  }

  async function twoFactor() {
    try {
      const me = App.user || {};
      if (me.two_factor_enabled) {
        UI.formModal({ title: 'Turn off two-step verification', submitText: 'Turn off', fields: [{ key: 'password', label: 'Password', type: 'password', required: true, col: 12 }],
          onSubmit: async (d) => { await Api.post('/account/two-factor/disable', d); UI.toast('Two-step verification turned off'); App.refreshUser(); } });
        return;
      }
      const s = (await Api.post('/account/two-factor/setup')).data;
      const d = UI.modal({
        title: 'Two-step verification',
        body: '<p class="small">Scan this code with Google Authenticator or a similar app, then enter the 6-digit code.</p>' +
          '<div class="text-center mb-3 qr-box">' + (s.qr_code_svg || '') + '</div><p class="small text-center">Or enter key: <code>' + UI.esc(s.secret) + '</code></p>' +
          '<input class="form-control" inputmode="numeric" maxlength="6" placeholder="000000" data-code aria-label="Code">',
        footer: '<button class="btn btn-light" data-bs-dismiss="modal">Cancel</button><button class="btn btn-primary" data-ok>Enable</button>',
      });
      d.el.querySelector('[data-ok]').addEventListener('click', async () => {
        try {
          const r = (await Api.post('/account/two-factor/enable', { code: d.el.querySelector('[data-code]').value })).data;
          d.body.innerHTML = '<div class="alert alert-success">Two-step verification is on. Keep these recovery codes somewhere safe:</div><pre class="bg-body-tertiary p-3 rounded">' + UI.esc((r.recovery_codes || []).join('\n')) + '</pre>';
          d.el.querySelector('[data-ok]').remove();
          App.refreshUser();
        } catch (e) { UI.errorToast(e); }
      });
    } catch (e) { UI.errorToast(e); }
  }

  async function activityLog(path, title) {
    const d = UI.modal({ title, body: UI.spinner(), size: 'lg', footer: '<button class="btn btn-light" data-bs-dismiss="modal">Close</button>' });
    try {
      const rows = (await Api.get(path, { per_page: 100 })).data || [];
      const cols = [{ key: 'created_at', label: 'Time', format: 'datetime' }, { key: 'action', label: 'Action' }, { key: 'description', label: 'Detail' }, { key: 'ip_address', label: 'IP' }];
      d.body.innerHTML = rows.length ? '<div class="table-responsive"><table class="table table-sm"><thead><tr>' + cols.map((c) => '<th>' + c.label + '</th>').join('') + '</tr></thead><tbody>' +
        rows.map((r) => '<tr>' + cols.map((c) => '<td>' + UI.formatValue(c, r) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' : UI.emptyState('No activity');
    } catch (e) { d.body.innerHTML = UI.emptyState(e.message, 'fa-triangle-exclamation'); }
  }
  L.activityLog = activityLog;

  // ---------- Store ----------
  const businessTypes = ['Pharmacy & beauty', 'Workshop & car wash', 'Phone & credit counter', 'Laundry', 'Food & beverage', 'Grocery / minimarket', 'Fashion', 'Building materials', 'Services', 'Other'];
  S({
    id: 'store', title: 'Physical Store', icon: 'fa-solid fa-shop', endpoint: '/settings/store',
    fields: [
      { key: 'logo_url', label: 'Store logo', type: 'image' },
      { key: 'cover_url', label: 'Cover photo', type: 'image' },
      { key: 'name', label: 'Store name', type: 'text', required: true },
      { key: 'owner_name', label: 'Owner name', type: 'text' },
      { key: 'phone', label: 'Store phone', type: 'tel' },
      { key: 'motto', label: 'Tagline', type: 'text' },
      { key: 'business_type', label: 'Business type', type: 'select', options: businessTypes },
      { key: 'business_type_other', label: 'Describe your business', type: 'text', showIf: { key: 'business_type', in: ['Other'] } },
      { key: 'address', label: 'Address', type: 'textarea', col: 12 },
      { key: 'country_code', label: 'Country', type: 'select', default: 'ID', options: [{ value: 'ID', label: 'Indonesia' }, { value: 'MY', label: 'Malaysia' }, { value: 'SG', label: 'Singapore' }, { value: 'TL', label: 'Timor-Leste' }] },
      { key: 'province_id', label: 'Province', type: 'select', lookup: { endpoint: '/regions/provinces', value: 'id', label: 'name' } },
      { key: 'city_id', label: 'City / regency', type: 'select', lookup: { endpoint: '/regions/cities', value: 'id', label: 'name' } },
      { key: 'postal_code', label: 'Postal code', type: 'text' },
      { key: 'latitude', label: 'Latitude', type: 'number', step: '0.000001' },
      { key: 'longitude', label: 'Longitude', type: 'number', step: '0.000001' },
      { type: 'heading', label: 'Accounting' },
      { key: 'stock_valuation_method', label: 'Stock valuation', type: 'select', default: 'average', options: [{ value: 'default', label: 'Last purchase price' }, { value: 'fifo', label: 'FIFO' }, { value: 'lifo', label: 'LIFO' }, { value: 'average', label: 'Weighted average' }], help: 'Changing this recalculates cost of goods for future sales.' },
      { key: 'currency', label: 'Currency', type: 'select', default: 'IDR', options: ['IDR', 'MYR', 'SGD', 'USD', 'AUD', 'EUR'] },
      { key: 'timezone', label: 'Time zone', type: 'select', default: 'Asia/Jakarta', options: ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'] },
    ],
    toolbar: [
      { id: 'qr', label: 'Store QR code', icon: 'fa-solid fa-qrcode', method: 'GET', path: '/settings/store/qr-code', download: 'store-qr.png', reload: false, summary: 'PNG QR code that links to the store page.' },
    ],
    endpoints: [
      { method: 'GET', path: '/regions/provinces', summary: 'Province list for address pickers.', query: { country_code: 'string', q: 'string?' }, response: { data: [{ id: 'string (uuid)', code: 'string (Kemendagri code)', name: 'string' }] } },
      { method: 'GET', path: '/regions/cities', summary: 'City / regency list.', query: { province_id: 'string (uuid)?', q: 'string?' }, response: { data: [{ id: 'string (uuid)', name: 'string', province_id: 'string (uuid)' }] } },
    ],
  });

  S({
    id: 'online-store', title: 'Online Store', icon: 'fa-solid fa-globe', endpoint: '/settings/online-store',
    fields: [
      { key: 'is_enabled', label: 'Online store is open', type: 'switch', col: 12 },
      { key: 'subdomain', label: 'Store address', type: 'text', help: 'Letters, numbers and dashes. Becomes <subdomain>.yourdomain.' },
      { key: 'store_email', label: 'Store email', type: 'email' },
      { key: 'description', label: 'About the store', type: 'textarea', col: 12 },
      { key: 'facebook', label: 'Facebook username', type: 'text', col: 4 },
      { key: 'twitter', label: 'X / Twitter username', type: 'text', col: 4 },
      { key: 'instagram', label: 'Instagram username', type: 'text', col: 4 },
      { key: 'seo_enabled', label: 'Allow search engines', type: 'switch' },
      { key: 'pwa_enabled', label: 'Installable store app (PWA)', type: 'switch' },
      { key: 'use_physical_stock', label: 'Sell from physical-store stock', type: 'switch' },
      { key: 'notify_owner', label: 'Notify owner of new orders', type: 'switch', default: true },
      { key: 'notify_staff_ids', label: 'Also notify staff', type: 'multiselect', lookup: lk.staff, col: 12 },
    ],
  });

  S({
    id: 'link-page', title: 'Link Page', icon: 'fa-solid fa-link', endpoint: '/settings/link-page',
    description: 'A single link (bio link) that lists your catalog, WhatsApp, marketplaces and socials.',
    fields: [
      { key: 'is_enabled', label: 'Link page is live', type: 'switch', col: 12 },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'slogan', label: 'Slogan', type: 'text' },
      { key: 'background_color', label: 'Background color', type: 'color', default: '#0f9d76' },
      { key: 'show_watermark', label: 'Show "powered by" footer', type: 'switch', default: true },
      { key: 'links', label: 'Links', type: 'items', col: 12, fields: [
        { key: 'type', label: 'Type', type: 'select', options: ['catalog', 'whatsapp', 'location', 'tokopedia', 'shopee', 'grabfood', 'gofood', 'shopeefood', 'tiktok', 'instagram', 'facebook', 'twitter', 'youtube', 'custom'] },
        { key: 'label', label: 'Label', type: 'text' }, { key: 'url', label: 'URL', type: 'text' }, { key: 'is_active', label: 'On', type: 'switch' },
      ] },
    ],
    below: async (box) => {
      box.innerHTML = '<div class="card"><div class="card-body"><h2 class="h6">Recent visitors</h2><div data-v>' + UI.spinner() + '</div></div></div>';
      try {
        const rows = (await Api.get('/settings/link-page/visitors', { per_page: 50 })).data || [];
        box.querySelector('[data-v]').innerHTML = rows.length ? '<table class="table table-sm mb-0"><thead><tr><th>#</th><th>IP address</th><th>Time</th></tr></thead><tbody>' +
          rows.map((r, i) => '<tr><td>' + (i + 1) + '</td><td>' + UI.esc(r.ip_address) + '</td><td>' + UI.fmt.datetime(r.visited_at) + '</td></tr>').join('') + '</tbody></table>' : UI.emptyState('No visitors yet');
      } catch (e) { box.querySelector('[data-v]').innerHTML = UI.emptyState(e.message, 'fa-triangle-exclamation'); }
    },
    endpoints: [
      { method: 'GET', path: '/settings/link-page/visitors', summary: 'Visitors of the link page.', query: { page: 'integer', per_page: 'integer' }, response: { data: [{ ip_address: 'string', visited_at: 'datetime', referrer: 'string|null' }], meta: '<Pagination>' } },
      { method: 'GET', path: '/settings/link-page/username-availability', summary: 'Check a link-page username.', query: { username: 'string' }, response: { data: { available: 'boolean' } } },
    ],
  });

  S({
    id: 'qr-order', title: 'QR Order', icon: 'fa-solid fa-qrcode', endpoint: '/settings/qr-order',
    description: 'Customers scan a QR code at the table or kiosk to browse the menu and order.',
    fields: [
      { key: 'is_enabled', label: 'QR ordering is on', type: 'switch', col: 12 },
      { key: 'order_expiry_hours', label: 'QR code valid for', type: 'select', default: 3, options: [{ value: 3, label: '3 hours' }, { value: 6, label: '6 hours' }, { value: 12, label: '12 hours' }, { value: 24, label: '24 hours' }] },
      { key: 'payment_timing', label: 'Customers pay', type: 'select', default: 'pay_later', options: [{ value: 'pay_later', label: 'Later, at the cashier' }, { value: 'pay_now', label: 'Immediately when ordering' }] },
      { key: 'qris_enabled', label: 'Accept QRIS', type: 'switch' },
      { key: 'cashier_payment_enabled', label: 'Allow paying at the cashier', type: 'switch', default: true },
      { key: 'addons_enabled', label: 'Show add-ons / modifiers', type: 'switch' },
      { key: 'menu_layout', label: 'Menu layout', type: 'select', default: 'tabs', options: [{ value: 'tabs', label: 'All menu with tabs' }, { value: 'by_category', label: 'One category at a time' }] },
      { key: 'category_ids', label: 'Categories shown (empty = all)', type: 'multiselect', lookup: lk.categories, col: 12 },
      { key: 'table_ordering_enabled', label: 'Table ordering', type: 'switch' },
      { key: 'kiosk_enabled', label: 'Self-service kiosk', type: 'switch' },
      { key: 'notify_owner', label: 'Notify owner of new orders', type: 'switch', default: true },
      { key: 'notify_staff_ids', label: 'Also notify staff', type: 'multiselect', lookup: lk.staff, col: 12 },
    ],
    toolbar: [{ id: 'menu_book', label: 'Download menu book', icon: 'fa-solid fa-book-open', method: 'GET', path: '/settings/qr-order/menu-book', download: 'menu.pdf', reload: false, summary: 'Printable menu with prices (PDF).' }],
  });

  // ---------- Payment ----------
  L.register({
    kind: 'crud', id: 'payment-methods', title: 'Payment Methods', singular: 'Payment method', icon: 'fa-solid fa-wallet',
    description: 'Methods shown to the cashier, with optional MDR fee per method.',
    endpoint: '/payment-methods', ops: ['list', 'create', 'read', 'update', 'delete'],
    columns: [{ key: 'name', label: 'Name' }, { key: 'type', label: 'Type', format: 'badge' }, { key: 'mdr_type', label: 'MDR type' }, { key: 'mdr_value', label: 'MDR', format: 'number' }, { key: 'is_active', label: 'Active', format: 'boolean' }],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'type', label: 'Type', type: 'select', required: true, options: O.salesPaymentMethods },
      { key: 'code', label: 'Code', type: 'text', help: 'Optional short code used in exports.' },
      { key: 'mdr_type', label: 'MDR fee type', type: 'select', options: O.discountType },
      { key: 'mdr_value', label: 'MDR fee', type: 'number', min: 0 },
      { key: 'charge_fee_to_customer', label: 'Add the fee to the customer\'s bill', type: 'switch' },
      { key: 'edc_card_rates', label: 'EDC card rates', type: 'items', col: 12, showIf: { key: 'type', in: ['debit', 'credit_card'] }, help: 'Different MDR per card brand on the same EDC machine.',
        fields: [{ key: 'card_brand', label: 'Card', type: 'select', options: ['visa', 'mastercard', 'amex', 'jcb', 'unionpay', 'debit', 'flazz', 'other'] }, { key: 'mdr_percent', label: 'MDR %', type: 'percent' }] },
      { key: 'is_active', label: 'Active', type: 'switch', default: true },
    ],
  });

  S({ id: 'default-tax', title: 'Default Tax', icon: 'fa-solid fa-percent', endpoint: '/settings/default-tax',
    fields: [{ key: 'is_enabled', label: 'Apply a default tax to every sale', type: 'switch', col: 12 }, { key: 'rate', label: 'Default tax rate', type: 'percent', min: 0, max: 100 }, { key: 'is_inclusive', label: 'Prices already include tax', type: 'switch' }] });

  S({ id: 'service-charge', title: 'Service Charge', icon: 'fa-solid fa-bell-concierge', endpoint: '/settings/service-charge', plugin: 'business',
    fields: [{ key: 'is_enabled', label: 'Add a service charge', type: 'switch', col: 12 }, { key: 'name', label: 'Label on receipt', type: 'text', default: 'Service charge' }, { key: 'rate', label: 'Rate', type: 'percent', min: 0, max: 100 }, { key: 'apply_before_tax', label: 'Calculate before tax', type: 'switch' }] });

  S({ id: 'rounding', title: 'Rounding', icon: 'fa-solid fa-arrow-down-1-9', endpoint: '/settings/rounding', plugin: 'business',
    fields: [{ key: 'is_enabled', label: 'Round the total', type: 'switch', col: 12 }, { key: 'mode', label: 'Direction', type: 'select', default: 'nearest', options: [{ value: 'nearest', label: 'Nearest' }, { value: 'up', label: 'Up' }, { value: 'down', label: 'Down' }] }, { key: 'multiple', label: 'Round to multiples of', type: 'select', default: 100, options: [50, 100, 500, 1000].map((n) => ({ value: n, label: 'Rp ' + n })) }] });

  S({
    id: 'storage', title: 'Storage', icon: 'fa-solid fa-database', endpoint: '/settings/storage', readOnly: true,
    fields: [{ key: 'plan', label: 'Storage plan', type: 'text' }, { key: 'used_mb', label: 'Used (MB)', type: 'number' }, { key: 'quota_mb', label: 'Quota (MB)', type: 'number' }, { key: 'transaction_count', label: 'Transactions stored', type: 'number' }, { key: 'expires_at', label: 'Extra storage active until', type: 'date' }],
    toolbar: [{ id: 'buy', label: 'Buy more storage', icon: 'fa-solid fa-cart-plus', method: 'POST', path: '/settings/storage/purchases', success: 'Storage purchased',
      form: [{ key: 'package', label: 'Package', type: 'select', required: true, options: [{ value: '1gb_monthly', label: '+1 GB / month' }, { value: '5gb_monthly', label: '+5 GB / month' }, { value: '10gb_monthly', label: '+10 GB / month' }] }, { key: 'payment_method', label: 'Pay with', type: 'select', default: 'coin', options: [{ value: 'coin', label: 'Premium coin balance' }] }],
      response: { data: { quota_mb: 'number', expires_at: 'date', coin_balance: 'number' } } }],
  });

  L.register({
    kind: 'custom', id: 'reset-data', title: 'Reset Data', icon: 'fa-solid fa-trash-arrow-up',
    endpoints: [
      { method: 'POST', path: '/settings/reset-data/otp', summary: 'Send a one-time code to the owner before a reset.', body: { channel: '"email" | "whatsapp"' }, response: { data: { expires_in: 'integer (seconds)', sent_to: 'string (masked)' } } },
      { method: 'POST', path: '/settings/reset-data', summary: 'Permanently delete the selected data.', body: { data_types: ['"images" | "products" | "sales" | "purchases" | "customers" | "suppliers" | "staff" | "taxes" | "discounts" | "categories" | "fees" | "promotions" | "shifts" | "points" | "held_transactions" | "online_orders"'], scope: '"all" | "year" | "month"', year: 'integer?', month: 'integer? (1-12)', otp: 'string' }, response: { data: { job_id: 'string (uuid)', status: '"queued"' } } },
    ],
    render: (container) => {
      const types = [['images', 'Product images'], ['products', 'Products'], ['sales', 'Sales & reports'], ['purchases', 'Purchases'], ['customers', 'Customers'], ['suppliers', 'Suppliers'], ['staff', 'Staff'], ['taxes', 'Taxes'], ['discounts', 'Discounts'], ['categories', 'Categories'], ['fees', 'Fee module'], ['promotions', 'Promotions'], ['shifts', 'Cashier shifts'], ['points', 'Points'], ['held_transactions', 'Held (open) bills'], ['online_orders', 'Online-store orders']];
      container.innerHTML = CrudPage.pageHeader({ title: 'Reset Data', icon: 'fa-solid fa-trash-arrow-up', description: 'Permanently delete store data. This cannot be undone.' }) +
        '<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation me-2"></i>Deleted data cannot be recovered. Download any reports you need first.</div>' +
        '<div class="card"><div class="card-body" data-form></div><div class="card-footer bg-transparent d-flex flex-wrap gap-2 justify-content-end">' +
        '<button class="btn btn-outline-secondary" data-otp><i class="fa-solid fa-paper-plane me-1"></i>Send code</button><button class="btn btn-danger" data-reset><i class="fa-solid fa-trash me-1"></i>Reset now</button></div></div>';
      const thisYear = new Date().getFullYear();
      const form = UI.buildForm(container.querySelector('[data-form]'), [
        { key: 'data_types', label: 'What to delete', type: 'multiselect', required: true, col: 12, options: types.map(([v, l]) => ({ value: v, label: l })) },
        { key: 'scope', label: 'Period', type: 'select', required: true, default: 'all', options: [{ value: 'all', label: 'All time' }, { value: 'year', label: 'One year' }, { value: 'month', label: 'One month' }] },
        { key: 'year', label: 'Year', type: 'select', options: [thisYear, thisYear - 1, thisYear - 2, thisYear - 3].map((y) => ({ value: y, label: String(y) })), showIf: { key: 'scope', in: ['year', 'month'] } },
        { key: 'month', label: 'Month', type: 'select', options: Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(2000, i, 1).toLocaleString('en', { month: 'long' }) })), showIf: { key: 'scope', in: ['month'] } },
        { key: 'otp', label: 'Verification code', type: 'text', required: true, help: 'Press "Send code" to receive it.' },
      ], {});
      container.querySelector('[data-otp]').addEventListener('click', async (ev) => {
        ev.target.disabled = true;
        try { const r = (await Api.post('/settings/reset-data/otp', { channel: 'email' })).data; UI.toast('Code sent to ' + r.sent_to); }
        catch (e) { UI.errorToast(e); } finally { setTimeout(() => { ev.target.disabled = false; }, 30000); }
      });
      container.querySelector('[data-reset]').addEventListener('click', async () => {
        if (!form.validate()) return;
        const data = form.read();
        if (!(await UI.confirm('Delete ' + data.data_types.length + ' kind(s) of data permanently?', { title: 'Reset data', okText: 'Reset', typeToConfirm: 'RESET' }))) return;
        try { await Api.post('/settings/reset-data', data); UI.toast('Reset started. You will be notified when it is done.'); } catch (e) { if (e.fields) form.setErrors(e.fields); UI.errorToast(e); }
      });
    },
  });

  L.register({
    kind: 'custom', id: 'plugins', title: 'Plugins', icon: 'fa-solid fa-puzzle-piece',
    endpoints: [
      { method: 'GET', path: '/plugins', summary: 'Available add-ons and their status for this store.', response: { data: [{ code: '"business" | "ingredients" | "desktop" | "server" | "food_menu" | "attendance"', name: 'string', description: 'string', features: ['string'], price_monthly: 'number', price_yearly: 'number', status: '"inactive" | "trial" | "active" | "expired"', trial_available: 'boolean', expires_at: 'datetime|null' }] } },
      { method: 'POST', path: '/plugins/{code}/subscribe', summary: 'Buy or renew a plugin.', body: { period: '"monthly" | "yearly"', payment_method: '"coin" | "virtual_account" | "qris" | "e_wallet" | "credit_card"' }, response: { data: '<Invoice>' } },
      { method: 'POST', path: '/plugins/{code}/trial', summary: 'Start the 7-day free trial.', response: { data: { code: 'string', status: '"trial"', expires_at: 'datetime' } } },
    ],
    render: (container) => {
      const E = UI.esc;
      container.innerHTML = CrudPage.pageHeader({ title: 'Plugins', icon: 'fa-solid fa-puzzle-piece', description: 'Add-ons that unlock extra back-office features.' }) + '<div class="row g-3" data-list>' + UI.spinner() + '</div>';
      const list = container.querySelector('[data-list]');
      async function load() {
        try {
          const rows = (await Api.get('/plugins')).data || [];
          list.innerHTML = rows.map((p) => '<div class="col-md-6 col-xl-4"><div class="card h-100"><div class="card-body d-flex flex-column">' +
            '<div class="d-flex justify-content-between align-items-start mb-2"><h2 class="h6 mb-0">' + E(p.name) + '</h2><span class="badge ' + (p.status === 'active' ? 'text-bg-success' : p.status === 'trial' ? 'text-bg-info' : 'text-bg-light border') + '">' + E(p.status) + '</span></div>' +
            '<p class="small text-muted">' + E(p.description) + '</p>' +
            '<ul class="small ps-3">' + (p.features || []).map((f) => '<li>' + E(f) + '</li>').join('') + '</ul>' +
            '<div class="mt-auto"><div class="fw-semibold mb-2">' + UI.fmt.money(p.price_monthly) + ' <span class="small text-muted fw-normal">/ month</span></div>' +
            (p.expires_at ? '<div class="small text-muted mb-2">Until ' + UI.fmt.date(p.expires_at) + '</div>' : '') +
            '<div class="d-flex gap-2"><button class="btn btn-primary btn-sm" data-sub="' + E(p.code) + '">' + (p.status === 'active' ? 'Renew' : 'Subscribe') + '</button>' +
            (p.trial_available ? '<button class="btn btn-outline-primary btn-sm" data-trial="' + E(p.code) + '">Try 7 days</button>' : '') + '</div></div>' +
            '</div></div></div>').join('') || '<div class="col-12">' + UI.emptyState('No plugins available') + '</div>';
        } catch (e) { list.innerHTML = '<div class="col-12">' + UI.emptyState(e.message, 'fa-triangle-exclamation') + '</div>'; }
      }
      list.addEventListener('click', async (ev) => {
        const s = ev.target.closest('[data-sub]'); const t = ev.target.closest('[data-trial]');
        if (s) {
          UI.formModal({ title: 'Subscribe', submitText: 'Continue', fields: [
            { key: 'period', label: 'Period', type: 'select', required: true, default: 'monthly', options: [{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }] },
            { key: 'payment_method', label: 'Pay with', type: 'select', required: true, default: 'coin', options: [{ value: 'coin', label: 'Premium coin balance' }].concat(L.paymentChannels) }],
          onSubmit: async (d) => { const r = await Api.post('/plugins/' + s.dataset.sub + '/subscribe', d); if (r.data && r.data.payment_url) window.open(r.data.payment_url, '_blank', 'noopener'); UI.toast('Invoice created'); load(); App.refreshUser(); } });
        } else if (t) {
          t.disabled = true;
          try { await Api.post('/plugins/' + t.dataset.trial + '/trial'); UI.toast('Trial started'); load(); App.refreshUser(); } catch (e) { UI.errorToast(e); t.disabled = false; }
        }
      });
      load();
    },
  });

  S({
    id: 'receipt', title: 'Receipt', icon: 'fa-solid fa-receipt', endpoint: '/settings/receipt',
    fields: [
      { key: 'logo_url', label: 'Receipt logo', type: 'image', col: 12 },
      { key: 'header_note', label: 'Header text', type: 'textarea', col: 6 },
      { key: 'footer_note', label: 'Footer text', type: 'textarea', col: 6 },
      { type: 'heading', label: 'Show on receipt' },
      ...[
        ['show_logo', 'Store logo'], ['auto_print', 'Print automatically after payment'], ['show_receipt_number', 'Receipt number'], ['show_receipt_code', 'Receipt barcode'],
        ['show_sequence_number', 'Daily sequence number'], ['show_unit', 'Unit next to quantity'], ['show_customer_address', 'Customer address'], ['show_total_quantity', 'Total quantity'],
        ['show_signature', 'Signature column'], ['show_price_type', 'Price type'], ['separate_admin_fee', 'Show admin fee separately'], ['show_points', 'Customer points'],
        ['hide_tax_percentage', 'Hide tax percentage'], ['show_feedback_link', 'Feedback link'], ['show_qr_code', 'Store QR code'],
      ].map(([k, l]) => ({ key: k, label: l, type: 'switch', col: 4 })),
    ],
  });

  // ---------- Staff ----------
  const permissionOptions = ['dashboard', 'products', 'stock', 'customers', 'suppliers', 'discounts', 'taxes', 'sales', 'purchases', 'finance', 'reports', 'debts', 'returns', 'settings', 'staff', 'branches', 'ppob', 'online_store', 'void_transaction', 'edit_price', 'give_discount'].map((p) => ({ value: p, label: p.replace(/_/g, ' ') }));
  L.register({
    kind: 'crud', id: 'staff', title: 'Staff', singular: 'Staff member', icon: 'fa-solid fa-users',
    description: 'Accounts for administrators, managers and cashiers. Each staff account is billed per your plan.',
    endpoint: '/staff', ops: ['list', 'create', 'read', 'update', 'delete', 'bulk_delete'],
    columns: [{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'role', label: 'Role', type: 'select', options: O.role }, { key: 'status', label: 'Status', format: 'badge' }, { key: 'last_login_at', label: 'Last sign-in', format: 'datetime' }],
    fields: [
      { key: 'name', label: 'Full name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'password', label: 'Password', type: 'password', help: 'Leave blank when editing to keep the current password.' },
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'role', label: 'Role', type: 'select', options: O.role, required: true, default: 'cashier' },
      { key: 'ppob_pin', label: 'PPOB PIN', type: 'password', encode: false, help: 'Optional. Leave blank to keep.' },
      { key: 'branch_id', label: 'Branch', type: 'select', lookup: lk.branches },
      { key: 'address', label: 'Address', type: 'textarea', col: 12 },
    ],
    rowActions: [
      { id: 'permissions', label: 'Access rights', icon: 'fa-solid fa-user-shield', method: 'PUT', path: '/staff/{id}/permissions', success: 'Access rights saved',
        values: async (r) => (await Api.get('/staff/' + r.id + '/permissions')).data,
        form: [{ key: 'permissions', label: 'Allowed', type: 'multiselect', options: permissionOptions, col: 12 }],
        response: { data: { permissions: ['string'] } } },
      { id: 'resend', label: 'Resend invitation email', icon: 'fa-regular fa-envelope', when: (r) => r.status === 'invited', method: 'POST', path: '/staff/{id}/resend-invitation', confirm: 'Send the confirmation email again?', success: 'Invitation sent', response: { data: { sent: 'boolean' } } },
      { id: 'log', label: 'Activity log', icon: 'fa-solid fa-clock-rotate-left', onClick: (r) => L.activityLog('/staff/' + r.id + '/activity-logs', 'Activity · ' + r.name) },
    ],
    endpoints: [
      { method: 'GET', path: '/staff/{id}/permissions', summary: 'Current access rights.', response: { data: { permissions: ['string'], available: [{ value: 'string', label: 'string' }] } } },
      { method: 'GET', path: '/staff/{id}/activity-logs', summary: 'What a staff member did.', query: { page: 'integer', per_page: 'integer' }, response: { data: [{ id: 'string (uuid)', created_at: 'datetime', action: 'string', description: 'string', ip_address: 'string' }], meta: '<Pagination>' } },
      { method: 'GET', path: '/staff/billing-estimate', summary: 'Extra cost of adding staff accounts.', query: { additional_staff: 'integer' }, response: { data: { monthly_cost: 'number', currency: 'string' } } },
    ],
  });

  L.register({
    kind: 'report', id: 'attendance', title: 'Staff Attendance', icon: 'fa-solid fa-fingerprint', plugin: 'attendance', endpoint: '/staff-attendances', defaultPreset: 'this_month',
    filters: [{ key: 'staff_id', label: 'Staff', type: 'select', lookup: lk.staff }],
    summary: [{ key: 'attendance_count', label: 'Check-ins', format: 'number' }, { key: 'late_count', label: 'Late', format: 'number' }, { key: 'total_hours', label: 'Hours worked', format: 'number' }],
    columns: [{ key: 'date', label: 'Date', format: 'date' }, { key: 'staff_name', label: 'Staff' }, { key: 'clock_in_at', label: 'In', format: 'datetime' }, { key: 'clock_out_at', label: 'Out', format: 'datetime' }, { key: 'hours', label: 'Hours', format: 'number' }, { key: 'status', label: 'Status', format: 'badge' }, { key: 'location', label: 'Location' }],
    detail: { endpoint: '/staff-attendances/{id}', title: 'Attendance', fields: [{ key: 'staff_name', label: 'Staff' }, { key: 'clock_in_at', label: 'In', type: 'datetime' }, { key: 'clock_in_photo_url', label: 'Photo in', type: 'image' }, { key: 'clock_out_at', label: 'Out', type: 'datetime' }, { key: 'clock_out_photo_url', label: 'Photo out', type: 'image' }, { key: 'location', label: 'Location' }, { key: 'note', label: 'Note' }] },
  });

  L.register({
    kind: 'crud', id: 'help-access', title: 'Support Access', singular: 'Support access', icon: 'fa-solid fa-headset',
    description: 'Let our support team sign in to an account for a limited time to help you.',
    endpoint: '/help-access', ops: ['list', 'create', 'read'], titleKey: 'account_email',
    columns: [{ key: 'created_at', label: 'Created', format: 'datetime' }, { key: 'platform', label: 'Platform' }, { key: 'account_email', label: 'Account' }, { key: 'expires_at', label: 'Expires', format: 'datetime' }, { key: 'status', label: 'Status', format: 'badge' }],
    fields: [
      { key: 'platform', label: 'Where', type: 'select', required: true, default: 'web', options: [{ value: 'web', label: 'Website (back office)' }, { value: 'app', label: 'Cashier app' }] },
      { key: 'account_id', label: 'Account', type: 'select', required: true, lookup: { endpoint: '/help-access/accounts', value: 'id', label: 'label' } },
      { key: 'duration_hours', label: 'Duration', type: 'select', required: true, default: 24, options: [{ value: 1, label: '1 hour' }, { value: 6, label: '6 hours' }, { value: 24, label: '24 hours' }, { value: 72, label: '3 days' }] },
      { key: 'description', label: 'What do you need help with?', type: 'textarea', col: 12, required: true },
      { key: 'account_email', label: 'Account', type: 'text', form: false }, { key: 'expires_at', label: 'Expires', type: 'datetime', form: false }, { key: 'status', label: 'Status', type: 'text', form: false },
    ],
    rowActions: [{ id: 'revoke', label: 'Revoke access', icon: 'fa-solid fa-ban', variant: 'danger', when: (r) => r.status === 'active', method: 'POST', path: '/help-access/{id}/revoke', confirm: 'Revoke this support access now?', success: 'Access revoked', response: { data: '<HelpAccess>' } }],
    endpoints: [{ method: 'GET', path: '/help-access/accounts', summary: 'Owner and staff accounts that can be shared with support.', response: { data: [{ id: 'string (uuid)', label: 'string ("Owner (email)" / "Staff (email)")', email: 'string', role: 'string' }] } }],
  });

  S({
    id: 'display', title: 'Back Office Appearance', icon: 'fa-solid fa-palette', endpoint: '/settings/display',
    fields: [
      { key: 'color_theme', label: 'Color theme', type: 'select', default: 'emerald', options: [{ value: 'emerald', label: 'Emerald' }, { value: 'ivory', label: 'White ivory' }, { value: 'charcoal', label: 'Black charcoal' }] },
      { key: 'show_breadcrumbs', label: 'Show breadcrumbs', type: 'switch', default: true },
      { key: 'language', label: 'Language', type: 'select', default: 'en', options: [{ value: 'en', label: 'English' }, { value: 'id', label: 'Bahasa Indonesia' }] },
    ],
    afterSave: (d) => { if (window.App) App.applyDisplay(d); },
  });
})(window);
