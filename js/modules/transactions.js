/**
 * TRANSACTIONS group (sales, purchases, cash in/out) plus debts and returns.
 */
(function (root) {
  const L = root.Lestari;
  const lk = L.lookups;
  const O = L.options;

  const saleLineFields = [
    { key: 'product_name', label: 'Item' }, { key: 'variant_name', label: 'Variant' }, { key: 'quantity', label: 'Qty', format: 'number' },
    { key: 'unit_price', label: 'Price', format: 'money' }, { key: 'discount_amount', label: 'Discount', format: 'money' }, { key: 'subtotal', label: 'Subtotal', format: 'money' },
  ];

  const saleDetail = [
    { key: 'receipt_number', label: 'Receipt number' }, { key: 'created_at', label: 'Date', type: 'datetime' },
    { key: 'cashier_name', label: 'Cashier' }, { key: 'customer.name', label: 'Customer' },
    { key: 'payment_method', label: 'Payment method' }, { key: 'payment_type', label: 'Payment type', type: 'select', options: O.paymentType },
    { key: 'items', label: 'Items', type: 'items', fields: saleLineFields },
    { key: 'subtotal', label: 'Subtotal', type: 'money' }, { key: 'discount_total', label: 'Discount', type: 'money' },
    { key: 'tax_total', label: 'Tax', type: 'money' }, { key: 'service_charge', label: 'Service charge', type: 'money' },
    { key: 'fee_total', label: 'Fees', type: 'money' }, { key: 'rounding', label: 'Rounding', type: 'money' },
    { key: 'grand_total', label: 'Total', type: 'money' }, { key: 'paid_amount', label: 'Paid', type: 'money' },
    { key: 'change_amount', label: 'Change', type: 'money' }, { key: 'profit', label: 'Profit', type: 'money' },
    { key: 'label', label: 'Label / table' }, { key: 'note', label: 'Note' }, { key: 'status', label: 'Status' },
  ];
  L.saleDetailFields = saleDetail;

  L.register({
    kind: 'crud', id: 'sales', title: 'Sales', singular: 'Sale', icon: 'fa-solid fa-receipt',
    description: 'Sales recorded by the cashier app. Open a sale to see its receipt.',
    endpoint: '/sales', ops: ['list', 'read', 'delete', 'export'], readOnly: true, titleKey: 'receipt_number',
    searchPlaceholder: 'Search receipt number or customer',
    defaultSort: 'created_at', defaultOrder: 'desc',
    filters: [
      { key: 'start_date', label: 'From', type: 'date' }, { key: 'end_date', label: 'To', type: 'date' },
      { key: 'payment_method', label: 'Payment method', type: 'select', options: O.salesPaymentMethods },
      { key: 'payment_type', label: 'Payment type', type: 'select', options: O.paymentType },
      { key: 'cashier_id', label: 'Cashier', type: 'select', lookup: lk.staff },
    ],
    columns: [
      { key: 'created_at', label: 'Date', format: 'datetime' }, { key: 'receipt_number', label: 'Receipt' }, { key: 'customer.name', label: 'Customer' },
      { key: 'cashier_name', label: 'Cashier' }, { key: 'payment_method', label: 'Method' }, { key: 'payment_type', label: 'Type', type: 'select', options: O.paymentType },
      { key: 'grand_total', label: 'Total', format: 'money' }, { key: 'status', label: 'Status', format: 'badge' },
    ],
    fields: saleDetail,
    detailFields: saleDetail,
    rowActions: [
      { id: 'receipt', label: 'Download receipt', icon: 'fa-solid fa-print', method: 'GET', path: '/sales/{id}/receipt', download: 'receipt.pdf', reload: false, summary: 'Receipt as PDF (uses Receipt settings).' },
      { id: 'delivery_note', label: 'Delivery note', icon: 'fa-solid fa-file-pdf', method: 'GET', path: '/sales/{id}/delivery-note', download: 'delivery-note.pdf', reload: false, summary: 'Delivery note (surat jalan) PDF.' },
    ],
  });

  L.register({
    kind: 'crud', id: 'purchases', title: 'Purchases', singular: 'Purchase', icon: 'fa-solid fa-cart-flatbed',
    description: 'Stock bought from suppliers. Saving a purchase adds stock and, for credit purchases, a payable.',
    endpoint: '/purchases', ops: ['list', 'create', 'read', 'update', 'delete', 'export'], titleKey: 'receipt_number',
    defaultSort: 'purchase_date', defaultOrder: 'desc',
    searchPlaceholder: 'Search purchase number or supplier',
    filters: [
      { key: 'start_date', label: 'From', type: 'date' }, { key: 'end_date', label: 'To', type: 'date' },
      { key: 'supplier_id', label: 'Supplier', type: 'select', lookup: lk.suppliers },
      { key: 'payment_type', label: 'Payment type', type: 'select', options: O.paymentType },
    ],
    columns: [
      { key: 'purchase_date', label: 'Date', format: 'date' }, { key: 'receipt_number', label: 'Number' }, { key: 'supplier.name', label: 'Supplier' },
      { key: 'payment_type', label: 'Payment', type: 'select', options: O.paymentType }, { key: 'grand_total', label: 'Total', format: 'money' },
      { key: 'paid_amount', label: 'Paid', format: 'money' }, { key: 'status', label: 'Status', format: 'badge' },
    ],
    fields: [
      { key: 'supplier_id', label: 'Supplier', type: 'select', lookup: lk.suppliers },
      { key: 'purchase_date', label: 'Date', type: 'date', required: true },
      { key: 'invoice_number', label: 'Supplier invoice no.', type: 'text' },
      { key: 'payment_type', label: 'Payment type', type: 'select', options: O.paymentType, required: true, default: 'cash' },
      { key: 'payment_method', label: 'Payment method', type: 'select', options: O.salesPaymentMethods, default: 'cash' },
      { key: 'due_date', label: 'Due date', type: 'date', showIf: { key: 'payment_type', in: ['credit'] } },
      { key: 'paid_amount', label: 'Amount paid now', type: 'money', min: 0, showIf: { key: 'payment_type', in: ['credit'] } },
      { key: 'items', label: 'Items', type: 'items', col: 12,
        fields: [{ key: 'product_id', label: 'Product', type: 'select', lookup: lk.products }, { key: 'quantity', label: 'Qty', type: 'number' }, { key: 'unit', label: 'Unit', type: 'text' }, { key: 'unit_cost', label: 'Unit cost', type: 'money' }, { key: 'discount_amount', label: 'Discount', type: 'money' }] },
      { key: 'discount_total', label: 'Invoice discount', type: 'money', min: 0 },
      { key: 'tax_total', label: 'Tax', type: 'money', min: 0 },
      { key: 'fee_total', label: 'Other fees', type: 'money', min: 0 },
      { key: 'grand_total', label: 'Total', type: 'money', form: false },
      { key: 'note', label: 'Note', type: 'textarea', col: 12 },
    ],
    rowActions: [
      { id: 'return', label: 'Return items', icon: 'fa-solid fa-arrow-rotate-left', method: 'POST', path: '/purchases/{id}/returns', success: 'Return recorded',
        form: [{ key: 'items', label: 'Items to return', type: 'items', col: 12, fields: [{ key: 'product_id', label: 'Product', type: 'select', lookup: lk.products }, { key: 'quantity', label: 'Qty', type: 'number' }] }, { key: 'refund_method', label: 'Refund as', type: 'select', options: [{ value: 'cash', label: 'Cash' }, { value: 'reduce_payable', label: 'Reduce debt' }] }, { key: 'reason', label: 'Reason', type: 'textarea', col: 12 }],
        summary: 'Return items to the supplier; creates a purchase return.', response: { data: '<PurchaseReturn>' } },
    ],
  });

  L.register({
    kind: 'crud', id: 'finance', title: 'Cash In & Out', singular: 'Entry', icon: 'fa-solid fa-money-bill-transfer',
    description: 'Income and expenses outside sales and purchases (rent, salaries, capital injections…).',
    endpoint: '/finance-entries', ops: ['list', 'create', 'read', 'update', 'delete', 'export'], titleKey: 'description',
    defaultSort: 'entry_date', defaultOrder: 'desc',
    tabs: { key: 'type', options: [{ value: '', label: 'All' }, { value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }] },
    filters: [{ key: 'start_date', label: 'From', type: 'date' }, { key: 'end_date', label: 'To', type: 'date' }],
    fields: [
      { key: 'entry_date', label: 'Date', type: 'date', required: true },
      { key: 'type', label: 'Type', type: 'select', required: true, options: [{ value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }] },
      { key: 'category', label: 'Category', type: 'text', placeholder: 'Rent, salary, capital…', required: true },
      { key: 'amount', label: 'Amount', type: 'money', required: true, min: 0 },
      { key: 'payment_method', label: 'Paid with', type: 'select', options: O.salesPaymentMethods },
      { key: 'cash_drawer_id', label: 'Cash drawer', type: 'select', lookup: lk.cashDrawers, list: false },
      { key: 'description', label: 'Description', type: 'textarea', col: 12 },
      { key: 'attachment_url', label: 'Receipt photo', type: 'image', col: 12, list: false },
    ],
  });

  // ---- Debts ----
  function debtPage(id, title, endpoint, partyKey, partyLabel, icon) {
    L.register({
      kind: 'crud', id, title, singular: title.replace(/s$/, ''), icon,
      endpoint, ops: ['list', 'read', 'export'], readOnly: true, titleKey: 'reference_number',
      tabs: { key: 'status', default: 'unpaid', options: [{ value: 'unpaid', label: 'Unpaid' }, { value: 'paid', label: 'Paid' }, { value: '', label: 'All' }] },
      searchPlaceholder: 'Search ' + partyLabel.toLowerCase() + ' or reference',
      filters: [{ key: partyKey + '_id', label: partyLabel, type: 'select', lookup: lk[partyKey + 's'] }, { key: 'overdue', label: 'Due', type: 'select', options: [{ value: 'true', label: 'Overdue only' }] }],
      columns: [
        { key: 'transaction_date', label: 'Date', format: 'date' }, { key: 'reference_number', label: 'Reference' }, { key: partyKey + '.name', label: partyLabel },
        { key: 'total_amount', label: 'Total', format: 'money' }, { key: 'paid_amount', label: 'Paid', format: 'money' }, { key: 'remaining_amount', label: 'Remaining', format: 'money' },
        { key: 'due_date', label: 'Due', format: 'date' }, { key: 'status', label: 'Status', format: 'badge' },
      ],
      fields: [
        { key: 'reference_number', label: 'Reference' }, { key: partyKey + '.name', label: partyLabel }, { key: 'transaction_date', label: 'Date', type: 'date' },
        { key: 'due_date', label: 'Due date', type: 'date' }, { key: 'total_amount', label: 'Total', type: 'money' }, { key: 'paid_amount', label: 'Paid', type: 'money' },
        { key: 'remaining_amount', label: 'Remaining', type: 'money' }, { key: 'status', label: 'Status' },
        { key: 'payments', label: 'Payment history', type: 'items', fields: [{ key: 'payment_date', label: 'Date', format: 'date' }, { key: 'amount', label: 'Amount', format: 'money' }, { key: 'payment_method', label: 'Method' }, { key: 'note', label: 'Note' }] },
      ],
      rowActions: [
        { id: 'pay', label: 'Record payment', icon: 'fa-solid fa-money-bill-wave', when: (r) => r.status !== 'paid', method: 'POST', path: endpoint + '/{id}/payments', success: 'Payment recorded',
          values: (r) => ({ amount: r.remaining_amount, payment_date: UI.isoDate(new Date()), payment_method: 'cash' }),
          form: [{ key: 'payment_date', label: 'Date', type: 'date', required: true }, { key: 'amount', label: 'Amount', type: 'money', required: true, min: 1 }, { key: 'payment_method', label: 'Method', type: 'select', options: O.salesPaymentMethods, required: true }, { key: 'note', label: 'Note', type: 'textarea', col: 12 }],
          summary: 'Pay part or all of the outstanding amount.', response: { data: { id: 'integer', paid_amount: 'number', remaining_amount: 'number', status: '"unpaid" | "paid"', payment: { id: 'integer', payment_date: 'date', amount: 'number', payment_method: 'string', note: 'string|null' } } } },
      ],
    });
  }
  debtPage('payables', 'Payables', '/payables', 'supplier', 'Supplier', 'fa-solid fa-file-invoice');
  debtPage('receivables', 'Receivables', '/receivables', 'customer', 'Customer', 'fa-solid fa-hand-holding-hand');

  // ---- Returns ----
  L.register({
    kind: 'crud', id: 'sales-returns', title: 'Sales Returns', singular: 'Sales return', icon: 'fa-solid fa-rotate-left',
    endpoint: '/sales-returns', ops: ['list', 'read', 'export'], readOnly: true, titleKey: 'return_number', defaultSort: 'created_at', defaultOrder: 'desc',
    searchPlaceholder: 'Search receipt number',
    filters: [{ key: 'start_date', label: 'From', type: 'date' }, { key: 'end_date', label: 'To', type: 'date' }],
    columns: [{ key: 'created_at', label: 'Date', format: 'datetime' }, { key: 'return_number', label: 'Return no.' }, { key: 'receipt_number', label: 'Original receipt' }, { key: 'customer.name', label: 'Customer' }, { key: 'item_count', label: 'Items', format: 'number' }, { key: 'refund_amount', label: 'Refund', format: 'money' }, { key: 'cashier_name', label: 'By' }],
    fields: [
      { key: 'return_number', label: 'Return number' }, { key: 'receipt_number', label: 'Original receipt' }, { key: 'created_at', label: 'Date', type: 'datetime' },
      { key: 'customer.name', label: 'Customer' }, { key: 'refund_method', label: 'Refund method' }, { key: 'refund_amount', label: 'Refund', type: 'money' }, { key: 'reason', label: 'Reason' },
      { key: 'items', label: 'Items', type: 'items', fields: [{ key: 'product_name', label: 'Item' }, { key: 'quantity', label: 'Qty', format: 'number' }, { key: 'unit_price', label: 'Price', format: 'money' }, { key: 'subtotal', label: 'Subtotal', format: 'money' }] },
    ],
  });
  L.register({
    kind: 'crud', id: 'purchase-returns', title: 'Purchase Returns', singular: 'Purchase return', icon: 'fa-solid fa-truck-arrow-right',
    endpoint: '/purchase-returns', ops: ['list', 'read', 'export'], readOnly: true, titleKey: 'return_number', defaultSort: 'created_at', defaultOrder: 'desc',
    searchPlaceholder: 'Search purchase number',
    filters: [{ key: 'start_date', label: 'From', type: 'date' }, { key: 'end_date', label: 'To', type: 'date' }],
    columns: [{ key: 'created_at', label: 'Date', format: 'datetime' }, { key: 'return_number', label: 'Return no.' }, { key: 'purchase_number', label: 'Purchase' }, { key: 'supplier.name', label: 'Supplier' }, { key: 'item_count', label: 'Items', format: 'number' }, { key: 'refund_amount', label: 'Refund', format: 'money' }],
    fields: [
      { key: 'return_number', label: 'Return number' }, { key: 'purchase_number', label: 'Purchase' }, { key: 'created_at', label: 'Date', type: 'datetime' },
      { key: 'supplier.name', label: 'Supplier' }, { key: 'refund_method', label: 'Refund method' }, { key: 'refund_amount', label: 'Refund', type: 'money' }, { key: 'reason', label: 'Reason' },
      { key: 'items', label: 'Items', type: 'items', fields: [{ key: 'product_name', label: 'Item' }, { key: 'quantity', label: 'Qty', format: 'number' }, { key: 'unit_cost', label: 'Cost', format: 'money' }, { key: 'subtotal', label: 'Subtotal', format: 'money' }] },
    ],
  });
})(window);
