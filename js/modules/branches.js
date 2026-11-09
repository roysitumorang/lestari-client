/**
 * BRANCHES group: multi-outlet management from the head office.
 */
(function (root) {
  const L = root.Lestari;
  const T = (s, v) => (root.I18n ? root.I18n.t(s, v) : s);
  const lk = L.lookups;

  L.register({
    kind: 'crud', id: 'branch-billing', title: 'Branch Billing', singular: 'Branch subscription', icon: 'fa-solid fa-file-invoice-dollar',
    description: 'Renew the subscription of several branches in one payment.',
    endpoint: '/billing/branches', ops: ['list'], idKey: 'branch_id', titleKey: 'branch_name',
    columns: [{ key: 'branch_name', label: 'Branch' }, { key: 'plan', label: 'Plan', format: 'badge' }, { key: 'expires_at', label: 'Active until', format: 'date' }, { key: 'status', label: 'Status', format: 'badge' }, { key: 'renewal_price', label: 'Renewal price', format: 'money' }],
    fields: [],
    toolbar: [{
      id: 'pay', label: 'Pay for branches', icon: 'fa-solid fa-credit-card', method: 'POST', path: '/billing/branch-renewals', success: 'Invoice created',
      form: [
        { key: 'branch_ids', label: 'Branches', type: 'multiselect', lookup: lk.branches, required: true, col: 12 },
        { key: 'period', label: 'Period', type: 'select', required: true, default: 'monthly', options: [{ value: 'monthly', label: '1 month' }, { value: 'quarterly', label: '3 months' }, { value: 'yearly', label: '12 months' }] },
        { key: 'payment_method', label: 'Pay with', type: 'select', required: true, default: 'coin', options: [{ value: 'coin', label: 'Premium coin balance' }, { value: 'virtual_account', label: 'Virtual account' }, { value: 'qris', label: 'QRIS' }, { value: 'e_wallet', label: 'E-wallet' }, { value: 'credit_card', label: 'Credit card' }, { value: 'manual_transfer', label: 'Manual bank transfer' }] },
        { key: 'promo_code', label: 'Promo code', type: 'text' },
      ],
      after: (res) => { const u = res && res.data && res.data.payment_url; if (u) window.open(u, '_blank', 'noopener'); },
      summary: 'Create one invoice renewing several branches.',
      response: { data: { invoice_id: 'string (uuid)', invoice_number: 'string', amount: 'number', admin_fee: 'number', status: '"pending" | "paid"', payment_url: 'string|null', payment_instructions: 'string|null', expires_at: 'datetime' } },
    }],
  });

  L.register({
    kind: 'report', id: 'branch-dashboard', title: 'Branch Dashboard', icon: 'fa-solid fa-chart-column', endpoint: '/reports/branches', defaultPreset: 'this_month',
    description: 'Sales performance of every branch side by side.',
    summary: [{ key: 'transaction_count', label: 'Transactions', format: 'number', icon: 'fa-solid fa-receipt' }, { key: 'revenue', label: 'Revenue', format: 'money', icon: 'fa-solid fa-coins' }, { key: 'profit', label: 'Profit', format: 'money', icon: 'fa-solid fa-sack-dollar' }],
    chart: { title: 'Revenue per branch', type: 'bar', label: 'branch_name', source: 'data', format: 'money', series: [{ key: 'revenue', name: 'Revenue' }, { key: 'profit', name: 'Profit' }] },
    columns: [{ key: 'branch_name', label: 'Branch' }, { key: 'transaction_count', label: 'Transactions', format: 'number' }, { key: 'revenue', label: 'Revenue', format: 'money' }, { key: 'profit', label: 'Profit', format: 'money' }, { key: 'average_basket', label: 'Avg. basket', format: 'money' }],
    paginated: false,
  });

  L.register({
    kind: 'crud', id: 'branch-products', title: 'Branch Products', singular: 'Branch product', icon: 'fa-solid fa-boxes-packing', plugin: 'business',
    description: 'Per-branch price and stock of head-office products.',
    endpoint: '/branch-products', ops: ['list', 'update', 'export'],
    searchPlaceholder: 'Search product',
    filters: [{ key: 'branch_id', label: 'Branch', type: 'select', lookup: lk.branches }, { key: 'category_id', label: 'Category', type: 'select', lookup: lk.categories }],
    columns: [{ key: 'branch_name', label: 'Branch' }, { key: 'product_name', label: 'Product' }, { key: 'sku', label: 'SKU' }, { key: 'stock', label: 'Stock', format: 'number' }, { key: 'selling_price', label: 'Price', format: 'money' }, { key: 'is_available', label: 'Available', format: 'boolean' }],
    fields: [
      { key: 'selling_price', label: 'Selling price in this branch', type: 'money', required: true },
      { key: 'purchase_price', label: 'Cost in this branch', type: 'money' },
      { key: 'is_available', label: 'Available in this branch', type: 'switch', default: true },
    ],
    toolbar: [{
      id: 'copy_prices', label: 'Copy head-office prices', icon: 'fa-solid fa-copy', method: 'POST', path: '/branch-products/sync-prices', success: 'Prices copied',
      form: [{ key: 'branch_ids', label: 'Branches', type: 'multiselect', lookup: lk.branches, required: true, col: 12 }, { key: 'product_ids', label: 'Products (empty = all)', type: 'multiselect', lookup: lk.products, col: 12 }],
      summary: 'Overwrite branch prices with head-office prices.', response: { data: { updated: 'integer' } },
    }],
  });

  L.register({
    kind: 'crud', id: 'stock-transfers', title: 'Stock Transfers', singular: 'Stock transfer', icon: 'fa-solid fa-right-left',
    description: 'Send stock between head office and branches.',
    endpoint: '/stock-transfers', ops: ['list', 'create', 'read', 'delete'], titleKey: 'transfer_number', defaultSort: 'transfer_date', defaultOrder: 'desc',
    searchPlaceholder: 'Search transfer number',
    filters: [{ key: 'direction', label: 'Direction', type: 'select', options: [{ value: 'out', label: 'Outgoing' }, { value: 'in', label: 'Incoming' }] }],
    columns: [{ key: 'transfer_date', label: 'Date', format: 'date' }, { key: 'transfer_number', label: 'Number' }, { key: 'from_branch.name', label: 'From' }, { key: 'to_branch.name', label: 'To' }, { key: 'total_quantity', label: 'Qty', format: 'number' }, { key: 'status', label: 'Status', format: 'badge' }],
    fields: [
      { key: 'to_branch_id', label: 'Send to', type: 'select', lookup: lk.branches, required: true },
      { key: 'transfer_date', label: 'Date', type: 'date', required: true },
      { key: 'requires_confirmation', label: 'Receiver must confirm', type: 'switch', default: false, help: 'Stock arrives only after the receiving branch accepts.' },
      { key: 'items', label: 'Items', type: 'items', col: 12, fields: [{ key: 'product_id', label: 'Product', type: 'select', lookup: lk.products }, { key: 'quantity', label: 'Qty', type: 'number' }, { key: 'note', label: 'Note', type: 'text' }] },
      { key: 'note', label: 'Note', type: 'textarea', col: 12 },
    ],
    detailFields: [
      { key: 'transfer_number', label: 'Number' }, { key: 'transfer_date', label: 'Date', type: 'date' }, { key: 'from_branch.name', label: 'From' }, { key: 'to_branch.name', label: 'To' }, { key: 'status', label: 'Status' },
      { key: 'items', label: 'Items', type: 'items', fields: [{ key: 'product_name', label: 'Product' }, { key: 'quantity', label: 'Qty', format: 'number' }, { key: 'received_quantity', label: 'Received', format: 'number' }, { key: 'note', label: 'Note' }] },
      { key: 'note', label: 'Note' },
    ],
    rowActions: [{ id: 'print', label: 'Print transfer note', icon: 'fa-solid fa-print', method: 'GET', path: '/stock-transfers/{id}/print', download: 'transfer.pdf', reload: false }],
  });

  const transferCols = [
    { key: 'transfer_date', label: 'Date', format: 'date' }, { key: 'transfer_number', label: 'Number' }, { key: 'direction', label: 'Type', format: 'badge' },
    { key: 'from_branch_name', label: 'From' }, { key: 'to_branch_name', label: 'To' }, { key: 'item_count', label: 'Items', format: 'number' }, { key: 'total_quantity', label: 'Qty', format: 'number' }, { key: 'status', label: 'Status', format: 'badge' },
  ];
  const transferFilters = [
    { key: 'direction', label: 'Type', type: 'select', options: [{ value: 'out', label: 'Outgoing' }, { value: 'in', label: 'Incoming' }] },
    { key: 'role', label: 'Position', type: 'select', options: [{ value: 'head_office', label: 'Head office' }, { value: 'branch', label: 'Branch' }] },
  ];
  L.register({
    kind: 'report', id: 'report-transfers', title: 'Transfer Report', icon: 'fa-solid fa-truck-ramp-box', endpoint: '/reports/stock-transfers', search: 'Search transfer number',
    filters: transferFilters, columns: transferCols,
    detail: { endpoint: '/stock-transfers/{id}', title: 'Transfer', fields: [{ key: 'transfer_number', label: 'Number' }, { key: 'status', label: 'Status' }, { key: 'items', label: 'Items', type: 'items', fields: [{ key: 'product_name', label: 'Product' }, { key: 'quantity', label: 'Qty', format: 'number' }, { key: 'received_quantity', label: 'Received', format: 'number' }] }] },
  });
  L.register({
    kind: 'report', id: 'report-transfer-confirmations', title: 'Transfers Awaiting Confirmation', icon: 'fa-solid fa-clipboard-question', plugin: 'business',
    endpoint: '/reports/stock-transfers/confirmations', search: 'Search transfer number',
    filters: transferFilters.concat([{ key: 'status', label: 'Status', type: 'select', options: [{ value: 'pending', label: 'Pending' }, { value: 'accepted', label: 'Accepted' }, { value: 'rejected', label: 'Rejected' }] }]),
    columns: transferCols,
    rowActions: [
      { id: 'accept', label: 'Accept', icon: 'fa-solid fa-check', when: (r) => r.status === 'pending' && r.direction === 'in', method: 'POST', path: '/stock-transfers/{id}/accept', success: 'Transfer accepted',
        form: [{ key: 'items', label: 'Received quantities (leave empty to accept all)', type: 'items', col: 12, fields: [{ key: 'product_id', label: 'Product', type: 'select', lookup: lk.products }, { key: 'received_quantity', label: 'Received', type: 'number' }] }, { key: 'note', label: 'Note', type: 'textarea', col: 12 }],
        response: { data: '<StockTransfer>' } },
      { id: 'reject', label: 'Reject', icon: 'fa-solid fa-xmark', when: (r) => r.status === 'pending' && r.direction === 'in', method: 'POST', path: '/stock-transfers/{id}/reject', success: 'Transfer rejected',
        form: [{ key: 'reason', label: 'Reason', type: 'textarea', required: true, col: 12 }], response: { data: '<StockTransfer>' } },
    ],
  });

  L.register({
    kind: 'crud', id: 'branches', title: 'Branches', singular: 'Branch', icon: 'fa-solid fa-store',
    description: 'Outlets managed from this head-office account.',
    endpoint: '/branches', ops: ['list', 'create', 'read', 'update', 'delete'],
    columns: [{ key: 'name', label: 'Name' }, { key: 'code', label: 'Code' }, { key: 'phone', label: 'Phone' }, { key: 'address', label: 'Address' }, { key: 'is_head_office', label: 'Head office', format: 'boolean' }, { key: 'subscription_expires_at', label: 'Active until', format: 'date' }],
    fields: [
      { key: 'name', label: 'Branch name', type: 'text', required: true },
      { key: 'code', label: 'Branch code', type: 'text' },
      { key: 'manager_name', label: 'Manager', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'email', label: 'Login email for the branch', type: 'email', required: true },
      { key: 'password', label: 'Password', type: 'password', help: 'Leave blank when editing to keep the current password.', list: false },
      { key: 'address', label: 'Address', type: 'textarea', col: 12 },
    ],
    rowActions: [
      { id: 'copy_products', label: 'Copy products from head office', icon: 'fa-solid fa-copy', when: (r) => !r.is_head_office, method: 'POST', path: '/branches/{id}/copy-products', success: 'Copy started',
        form: [{ key: 'category_ids', label: 'Categories (empty = all)', type: 'multiselect', lookup: lk.categories, col: 12 }, { key: 'include_stock', label: 'Copy stock quantities too', type: 'switch' }],
        summary: 'Clone the head-office catalog into a branch.', response: { data: { job_id: 'string (uuid)', status: '"queued"' } } },
      { id: 'switch', label: 'Open this branch', icon: 'fa-solid fa-arrow-right-to-bracket', onClick: (row) => { App.switchBranch(row.id); } },
    ],
  });
})(window);
