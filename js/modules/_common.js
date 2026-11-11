/**
 * Shared option lists, lookups and core (non-page) endpoints.
 */
(function (root) {
  const L = root.Lestari;
  const T = (s, v) => (root.I18n ? root.I18n.t(s, v) : s);

  L.lookups = {
    categories: { endpoint: '/categories', value: 'id', label: 'name' },
    products: { endpoint: '/products', value: 'id', label: 'name' },
    customers: { endpoint: '/customers', value: 'id', label: 'name' },
    customerTypes: { endpoint: '/customer-types', value: 'id', label: 'name' },
    suppliers: { endpoint: '/suppliers', value: 'id', label: 'name' },
    staff: { endpoint: '/staff', value: 'id', label: 'name' },
    branches: { endpoint: '/branches', value: 'id', label: 'name' },
    cashDrawers: { endpoint: '/cash-drawers', value: 'id', label: 'name' },
    paymentMethods: { endpoint: '/payment-methods', value: 'id', label: 'name' },
    promotions: { endpoint: '/promotions', value: 'id', label: 'name' },
  };

  L.options = {
    discountType: [{ value: 'percent', label: 'Percent (%)' }, { value: 'amount', label: 'Amount (Rp)' }],
    itemType: [{ value: 'product', label: 'Product' }, { value: 'service', label: 'Service' }],
    paymentType: [{ value: 'cash', label: 'Paid in full' }, { value: 'credit', label: 'Credit (pay later)' }],
    role: [{ value: 'administrator', label: 'Administrator' }, { value: 'manager', label: 'Manager' }, { value: 'cashier', label: 'Cashier' }],
    actorRole: [{ value: 'owner', label: 'Owner' }, { value: 'administrator', label: 'Administrator' }, { value: 'manager', label: 'Manager' }, { value: 'cashier', label: 'Cashier' }],
    gender: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }],
    weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((d) => ({ value: d, label: d[0].toUpperCase() + d.slice(1) })),
    priceType: [{ value: 'single', label: 'Single price' }, { value: 'wholesale', label: 'Wholesale tiers' }, { value: 'customer_type', label: 'Per customer type' }],
    unitBase: [{ value: 'kg', label: 'Kilogram (kg)' }, { value: 'ons', label: 'Ons' }, { value: 'g', label: 'Gram (g)' }, { value: 'l', label: 'Liter (L)' }, { value: 'ml', label: 'Milliliter (ml)' }, { value: 'pcs', label: 'Piece (pcs)' }],
    salesPaymentMethods: [{ value: 'cash', label: 'Cash' }, { value: 'debit', label: 'Debit card' }, { value: 'credit_card', label: 'Credit card' }, { value: 'qris', label: 'QRIS' }, { value: 'e_wallet', label: 'E-wallet' }, { value: 'bank_transfer', label: 'Bank transfer' }, { value: 'other', label: 'Other' }],
  };

  // ---- Core endpoints used outside individual pages (documented in ENDPOINTS.md) ----
  L.sharedEndpoint({
    group: 'Authentication', method: 'POST', path: '/auth/login', auth: false,
    summary: 'Sign in as the owner or a staff member. When two-step verification is on and `otp` is missing, responds 401 with `data.code` = `two_factor_required`.',
    body: { email: 'string', password: 'string (base64)', remember_me: 'boolean', otp: 'string? (6 digits, only when 2FA is enabled)' },
    response: { data: { access_token: 'string', refresh_token: 'string', token_type: '"Bearer"', expires_in: 'integer (seconds)', user: '<User>' } },
  });
  L.sharedEndpoint({
    group: 'Authentication', method: 'POST', path: '/auth/refresh', auth: false,
    summary: 'Exchange a refresh token for a new access token.',
    body: { refresh_token: 'string' },
    response: { data: { access_token: 'string', refresh_token: 'string', expires_in: 'integer' } },
  });
  L.sharedEndpoint({ group: 'Authentication', method: 'POST', path: '/auth/logout', summary: 'Revoke the current tokens.', response: '204 No Content' });
  L.sharedEndpoint({
    group: 'Authentication', method: 'GET', path: '/auth/me', summary: 'Current user, store and active branch; also drives menu permissions.',
    response: { data: { id: 'string (uuid)', name: 'string', email: 'string', role: '"owner" | "administrator" | "manager" | "cashier"', avatar_url: 'string|null', permissions: ['string'], store: { id: 'string (uuid)', name: 'string', logo_url: 'string|null', plan: 'string', plan_expires_at: 'datetime|null' }, branch: { id: 'string (uuid)', name: 'string', is_head_office: 'boolean' }, active_plugins: ['string'] } },
  });
  L.sharedEndpoint({
    group: 'Authentication', method: 'PUT', path: '/auth/password', summary: 'Change the signed-in user\'s password.',
    body: { current_password: 'string (base64)', new_password: 'string (base64; min 8 characters decoded)', new_password_confirmation: 'string (base64)' },
    response: { data: { changed: 'boolean' } },
  });
  L.sharedEndpoint({
    group: 'Files', method: 'POST', path: '/uploads', contentType: 'multipart/form-data', summary: 'Upload an image or document; returns a URL to store in image fields.',
    body: { file: 'binary', purpose: 'string (field name, e.g. "image_url", "logo_url")' },
    response: { data: { id: 'string', url: 'string', mime_type: 'string', size: 'integer (bytes)' } },
  });
  L.sharedEndpoint({
    group: 'Notifications', method: 'GET', path: '/notifications/unread-count', summary: 'Badge count shown in the top bar.',
    response: { data: { count: 'integer' } },
  });
})(window);
