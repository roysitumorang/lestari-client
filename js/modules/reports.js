/**
 * REPORTS group. Every report is GET /reports/<name>?start_date&end_date&… and
 * GET /reports/<name>/export?…&format=xlsx for the download.
 */
(function (root) {
  const L = root.Lestari;
  const lk = L.lookups;
  const O = L.options;
  const R = (def) => L.register(Object.assign({ kind: 'report' }, def));

  R({
    id: 'report-profit-loss', title: 'Profit & Loss', icon: 'fa-solid fa-scale-balanced', endpoint: '/reports/profit-loss', defaultPreset: 'this_month',
    filters: [{ key: 'include_unpaid', label: 'Count credit sales before they are paid', type: 'switch', col: 12 }],
    summary: [
      { key: 'gross_sales', label: 'Sales', format: 'money', icon: 'fa-solid fa-cart-shopping' },
      { key: 'cost_of_goods_sold', label: 'Cost of goods sold', format: 'money', icon: 'fa-solid fa-boxes-stacked' },
      { key: 'other_income', label: 'Other income', format: 'money', icon: 'fa-solid fa-arrow-trend-up' },
      { key: 'net_profit', label: 'Net profit', format: 'money', icon: 'fa-solid fa-sack-dollar' },
    ],
    chart: { title: 'Daily profit', type: 'bar', label: 'date', source: 'data', format: 'money', series: [{ key: 'gross_profit', name: 'Gross profit' }, { key: 'net_profit', name: 'Net profit' }] },
    columns: [
      { key: 'date', label: 'Date', format: 'date' }, { key: 'gross_sales', label: 'Sales', format: 'money' }, { key: 'discounts', label: 'Discounts', format: 'money' },
      { key: 'cost_of_goods_sold', label: 'COGS', format: 'money' }, { key: 'gross_profit', label: 'Gross profit', format: 'money' }, { key: 'other_income', label: 'Other income', format: 'money' },
      { key: 'mdr_fees', label: 'MDR fees', format: 'money' }, { key: 'commissions', label: 'Commissions', format: 'money' }, { key: 'other_expenses', label: 'Expenses', format: 'money' }, { key: 'net_profit', label: 'Net profit', format: 'money' },
    ],
    paginated: false,
    responseNote: 'summary also contains: discounts, gross_profit, mdr_fees, commissions, other_expenses, purchase_total. `totals` holds column sums.',
  });

  R({
    id: 'report-cash-flow', title: 'Cash Flow', icon: 'fa-solid fa-money-bill-trend-up', endpoint: '/reports/cash-flow', defaultPreset: 'this_month',
    filters: [{ key: 'type', label: 'Type', type: 'select', options: [{ value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }] }],
    summary: [{ key: 'total_income', label: 'Income', format: 'money', icon: 'fa-solid fa-arrow-down' }, { key: 'total_expense', label: 'Expense', format: 'money', icon: 'fa-solid fa-arrow-up' }, { key: 'net_cash_flow', label: 'Net', format: 'money', icon: 'fa-solid fa-equals' }],
    columns: [{ key: 'date', label: 'Date', format: 'datetime' }, { key: 'type', label: 'Type', format: 'badge' }, { key: 'source', label: 'Source' }, { key: 'category', label: 'Category' }, { key: 'description', label: 'Description' }, { key: 'amount', label: 'Amount', format: 'money' }],
  });

  R({
    id: 'report-daily-sales', title: 'Daily Sales', icon: 'fa-solid fa-calendar-day', endpoint: '/reports/daily-sales', defaultPreset: 'this_month',
    description: 'One row per day. Open a day to see its receipts.',
    summary: [{ key: 'transaction_count', label: 'Transactions', format: 'number', icon: 'fa-solid fa-receipt' }, { key: 'net_sales', label: 'Net sales', format: 'money', icon: 'fa-solid fa-coins' }, { key: 'profit', label: 'Profit', format: 'money', icon: 'fa-solid fa-sack-dollar' }],
    columns: [{ key: 'date', label: 'Date', format: 'date' }, { key: 'transaction_count', label: 'Transactions', format: 'number' }, { key: 'gross_sales', label: 'Gross', format: 'money' }, { key: 'discounts', label: 'Discounts', format: 'money' }, { key: 'taxes', label: 'Tax', format: 'money' }, { key: 'net_sales', label: 'Net', format: 'money' }, { key: 'profit', label: 'Profit', format: 'money' }],
    detail: { endpoint: '/reports/daily-sales/{date}', title: 'Receipts of the day', render: (d) => receiptsTable(d && d.sales) },
    paginated: false,
    toolbar: [{ id: 'resync', label: 'Rebuild report', icon: 'fa-solid fa-rotate', method: 'POST', path: '/reports/daily-sales/rebuild', useFilters: true, confirm: 'Rebuild daily totals for the selected period from the raw transactions?', success: 'Rebuild started', summary: 'Recalculate cached daily totals ("Sinkronisasi").', request: { start_date: 'date', end_date: 'date' }, response: { data: { job_id: 'string (uuid)' } } }],
  });

  function receiptsTable(rows) {
    if (!rows || !rows.length) return UI.emptyState('No receipts');
    const cols = [{ key: 'created_at', label: 'Time', format: 'datetime' }, { key: 'receipt_number', label: 'Receipt' }, { key: 'cashier_name', label: 'Cashier' }, { key: 'payment_method', label: 'Method' }, { key: 'grand_total', label: 'Total', format: 'money' }];
    return '<div class="table-responsive"><table class="table table-sm"><thead><tr>' + cols.map((c) => '<th>' + c.label + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map((r) => '<tr>' + cols.map((c) => '<td>' + UI.formatValue(c, r) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }

  R({
    id: 'report-sales-transactions', title: 'Sales Transactions', icon: 'fa-solid fa-list-check', endpoint: '/reports/sales-transactions',
    search: 'Search receipt number',
    filters: [
      { key: 'payment_method', label: 'Payment method', type: 'select', options: O.salesPaymentMethods },
      { key: 'payment_type', label: 'Payment type', type: 'select', options: O.paymentType },
      { key: 'cashier_id', label: 'Cashier', type: 'select', lookup: lk.staff },
    ],
    summary: [{ key: 'transaction_count', label: 'Transactions', format: 'number', icon: 'fa-solid fa-receipt' }, { key: 'grand_total', label: 'Total billed', format: 'money', icon: 'fa-solid fa-coins' }, { key: 'profit', label: 'Profit', format: 'money', icon: 'fa-solid fa-sack-dollar' }],
    columns: [
      { key: 'created_at', label: 'Date', format: 'datetime' }, { key: 'receipt_number', label: 'Receipt' }, { key: 'cashier_name', label: 'Cashier' }, { key: 'payment_method', label: 'Method' },
      { key: 'payment_type', label: 'Type' }, { key: 'profit', label: 'Profit', format: 'money' }, { key: 'grand_total', label: 'Total', format: 'money' }, { key: 'paid_amount', label: 'Paid', format: 'money' },
      { key: 'service_charge', label: 'Service', format: 'money' }, { key: 'rounding', label: 'Rounding', format: 'money' }, { key: 'label', label: 'Label' }, { key: 'customer_type', label: 'Customer type' },
    ],
    detail: { endpoint: '/sales/{id}', title: 'Sale', fields: L.saleDetailFields },
  });

  R({
    id: 'report-sales-by-product', title: 'Sales by Product', icon: 'fa-solid fa-box', endpoint: '/reports/sales-by-product', search: 'Search product',
    filters: [{ key: 'category_id', label: 'Category', type: 'select', lookup: lk.categories }],
    summary: [{ key: 'quantity_sold', label: 'Units sold', format: 'number' }, { key: 'net_sales', label: 'Net sales', format: 'money' }, { key: 'profit', label: 'Profit', format: 'money' }],
    columns: [{ key: 'product_name', label: 'Product' }, { key: 'sku', label: 'SKU' }, { key: 'category_name', label: 'Category' }, { key: 'quantity_sold', label: 'Qty', format: 'number' }, { key: 'gross_sales', label: 'Gross', format: 'money' }, { key: 'discounts', label: 'Discounts', format: 'money' }, { key: 'net_sales', label: 'Net', format: 'money' }, { key: 'cost_of_goods_sold', label: 'COGS', format: 'money' }, { key: 'profit', label: 'Profit', format: 'money' }],
    detail: { endpoint: '/reports/sales-by-product/{product_id}', title: 'Sales of this product', render: (d) => receiptsTable(d && d.sales) },
  });

  R({
    id: 'report-sales-by-category', title: 'Sales by Category', icon: 'fa-solid fa-folder-open', endpoint: '/reports/sales-by-category', search: 'Search category',
    summary: [{ key: 'quantity_sold', label: 'Units sold', format: 'number' }, { key: 'net_sales', label: 'Net sales', format: 'money' }, { key: 'profit', label: 'Profit', format: 'money' }],
    chart: { title: 'Net sales by category', type: 'bar', label: 'category_name', source: 'data', format: 'money', series: [{ key: 'net_sales', name: 'Net sales' }] },
    columns: [{ key: 'category_name', label: 'Category' }, { key: 'product_count', label: 'Products', format: 'number' }, { key: 'quantity_sold', label: 'Qty', format: 'number' }, { key: 'gross_sales', label: 'Gross', format: 'money' }, { key: 'net_sales', label: 'Net', format: 'money' }, { key: 'profit', label: 'Profit', format: 'money' }],
    paginated: false,
  });

  R({
    id: 'report-daily-purchases', title: 'Daily Purchases', icon: 'fa-solid fa-calendar-week', endpoint: '/reports/daily-purchases', defaultPreset: 'this_month', search: 'Search purchase number',
    summary: [{ key: 'purchase_count', label: 'Purchases', format: 'number' }, { key: 'grand_total', label: 'Total', format: 'money' }],
    columns: [{ key: 'date', label: 'Date', format: 'date' }, { key: 'purchase_count', label: 'Purchases', format: 'number' }, { key: 'item_quantity', label: 'Items', format: 'number' }, { key: 'grand_total', label: 'Total', format: 'money' }, { key: 'paid_amount', label: 'Paid', format: 'money' }],
    paginated: false,
  });

  R({
    id: 'report-purchase-transactions', title: 'Purchase Transactions', icon: 'fa-solid fa-list-ul', endpoint: '/reports/purchase-transactions', search: 'Search purchase number',
    filters: [{ key: 'payment_type', label: 'Payment type', type: 'select', options: O.paymentType }, { key: 'staff_id', label: 'Recorded by', type: 'select', lookup: lk.staff }, { key: 'supplier_id', label: 'Supplier', type: 'select', lookup: lk.suppliers }],
    summary: [{ key: 'purchase_count', label: 'Purchases', format: 'number' }, { key: 'grand_total', label: 'Total', format: 'money' }],
    columns: [{ key: 'purchase_date', label: 'Date', format: 'date' }, { key: 'receipt_number', label: 'Number' }, { key: 'supplier_name', label: 'Supplier' }, { key: 'staff_name', label: 'Recorded by' }, { key: 'payment_type', label: 'Payment' }, { key: 'grand_total', label: 'Total', format: 'money' }, { key: 'paid_amount', label: 'Paid', format: 'money' }],
    detail: { endpoint: '/purchases/{id}', title: 'Purchase', fields: [{ key: 'receipt_number', label: 'Number' }, { key: 'purchase_date', label: 'Date', type: 'date' }, { key: 'supplier.name', label: 'Supplier' }, { key: 'items', label: 'Items', type: 'items', fields: [{ key: 'product_name', label: 'Item' }, { key: 'quantity', label: 'Qty', format: 'number' }, { key: 'unit_cost', label: 'Cost', format: 'money' }, { key: 'subtotal', label: 'Subtotal', format: 'money' }] }, { key: 'grand_total', label: 'Total', type: 'money' }] },
  });

  // ---- Points ----
  R({
    id: 'report-customer-points', title: 'Points by Customer', icon: 'fa-solid fa-user-tag', endpoint: '/reports/customer-points', search: 'Search customer',
    filters: [{ key: 'customer_id', label: 'Customer', type: 'select', lookup: lk.customers }],
    summary: [{ key: 'points_redeemed', label: 'Points redeemed', format: 'number' }, { key: 'points_earned', label: 'Points earned', format: 'number' }, { key: 'transaction_count', label: 'Transactions', format: 'number' }],
    columns: [{ key: 'customer_name', label: 'Customer' }, { key: 'customer_code', label: 'Code' }, { key: 'points_earned', label: 'Earned', format: 'number' }, { key: 'points_redeemed', label: 'Redeemed', format: 'number' }, { key: 'transaction_count', label: 'Transactions', format: 'number' }, { key: 'points_balance', label: 'Balance', format: 'number' }],
    detail: { endpoint: '/reports/customer-points/{customer_id}', title: 'Point transactions', render: (d) => receiptsTable(d && d.sales) },
  });
  R({
    id: 'report-point-redemptions', title: 'Point Redemptions', icon: 'fa-solid fa-gift', endpoint: '/reports/point-redemptions', search: 'Search product',
    summary: [{ key: 'points_redeemed', label: 'Points redeemed', format: 'number' }, { key: 'quantity', label: 'Quantity', format: 'number' }, { key: 'profit', label: 'Profit', format: 'money' }],
    columns: [{ key: 'product_name', label: 'Product' }, { key: 'quantity', label: 'Qty', format: 'number' }, { key: 'transaction_count', label: 'Transactions', format: 'number' }, { key: 'points_redeemed', label: 'Points', format: 'number' }, { key: 'profit', label: 'Profit', format: 'money' }],
    detail: { endpoint: '/reports/point-redemptions/{product_id}', title: 'Redemptions', render: (d) => receiptsTable(d && d.sales) },
  });
  R({
    id: 'report-point-earnings', title: 'Point-Earning Sales', icon: 'fa-solid fa-coins', endpoint: '/reports/point-earnings', search: 'Search product',
    summary: [{ key: 'points_earned', label: 'Points earned', format: 'number' }, { key: 'quantity', label: 'Quantity', format: 'number' }, { key: 'profit', label: 'Profit', format: 'money' }],
    columns: [{ key: 'product_name', label: 'Product' }, { key: 'quantity', label: 'Qty', format: 'number' }, { key: 'transaction_count', label: 'Transactions', format: 'number' }, { key: 'points_earned', label: 'Points', format: 'number' }, { key: 'profit', label: 'Profit', format: 'money' }],
    detail: { endpoint: '/reports/point-earnings/{product_id}', title: 'Sales', render: (d) => receiptsTable(d && d.sales) },
  });

  R({
    id: 'report-capital', title: 'Inventory Capital', icon: 'fa-solid fa-vault', endpoint: '/reports/capital', dateRange: false, search: 'Search product',
    description: 'Value of stock on hand at cost.',
    filters: [{ key: 'category_id', label: 'Category', type: 'select', lookup: lk.categories }],
    summary: [{ key: 'total_capital', label: 'Total capital in stock', format: 'money', icon: 'fa-solid fa-vault' }, { key: 'total_stock', label: 'Units in stock', format: 'number' }],
    columns: [{ key: 'product_name', label: 'Product' }, { key: 'sku', label: 'SKU' }, { key: 'category_name', label: 'Category' }, { key: 'stock', label: 'Stock', format: 'number' }, { key: 'unit_cost', label: 'Unit cost', format: 'money' }, { key: 'capital_value', label: 'Capital', format: 'money' }],
  });

  R({
    id: 'report-shifts', title: 'Shifts', icon: 'fa-solid fa-user-clock', endpoint: '/reports/shifts',
    filters: [{ key: 'cash_drawer_id', label: 'Cash drawer', type: 'select', lookup: lk.cashDrawers }, { key: 'cashier_id', label: 'Cashier', type: 'select', lookup: lk.staff }],
    columns: [{ key: 'opened_at', label: 'Opened', format: 'datetime' }, { key: 'closed_at', label: 'Closed', format: 'datetime' }, { key: 'cash_drawer_name', label: 'Drawer' }, { key: 'cashier_name', label: 'Cashier' }, { key: 'opening_cash', label: 'Opening', format: 'money' }, { key: 'expected_cash', label: 'Expected', format: 'money' }, { key: 'actual_cash', label: 'Counted', format: 'money' }, { key: 'difference', label: 'Difference', format: 'money' }],
    detail: { endpoint: '/reports/shifts/{id}', title: 'Shift detail', fields: [
      { key: 'cash_drawer_name', label: 'Cash drawer' }, { key: 'cashier_name', label: 'Cashier' }, { key: 'opened_at', label: 'Opened', type: 'datetime' }, { key: 'closed_at', label: 'Closed', type: 'datetime' },
      { key: 'opening_cash', label: 'Opening cash', type: 'money' }, { key: 'cash_sales', label: 'Cash sales', type: 'money' }, { key: 'cash_in', label: 'Cash in', type: 'money' }, { key: 'cash_out', label: 'Cash out', type: 'money' },
      { key: 'expected_cash', label: 'Expected cash', type: 'money' }, { key: 'actual_cash', label: 'Counted cash', type: 'money' }, { key: 'difference', label: 'Difference', type: 'money' },
      { key: 'payments', label: 'Sales by payment method', type: 'items', fields: [{ key: 'payment_method', label: 'Method' }, { key: 'transaction_count', label: 'Transactions', format: 'number' }, { key: 'amount', label: 'Amount', format: 'money' }] },
    ] },
    rowActions: [{ id: 'shift_pdf', label: 'Download shift report', icon: 'fa-solid fa-file-pdf', method: 'GET', path: '/reports/shifts/{id}/export', download: 'shift.pdf', reload: false }],
  });

  const feeCols = [{ key: 'created_at', label: 'Date', format: 'datetime' }, { key: 'receipt_number', label: 'Receipt' }, { key: 'cashier_name', label: 'Cashier' }, { key: 'fee_name', label: 'Fee' }, { key: 'amount', label: 'Amount', format: 'money' }];
  R({ id: 'report-fees-sales', title: 'Fees on Sales', icon: 'fa-solid fa-receipt', endpoint: '/reports/fees/sales', search: 'Search receipt',
    filters: [{ key: 'cashier_id', label: 'Cashier', type: 'select', lookup: lk.staff }, { key: 'payment_method', label: 'Payment method', type: 'select', options: O.salesPaymentMethods }],
    summary: [{ key: 'total_amount', label: 'Total fees', format: 'money' }, { key: 'transaction_count', label: 'Transactions', format: 'number' }], columns: feeCols });
  R({ id: 'report-fees-purchases', title: 'Fees on Purchases', icon: 'fa-solid fa-cart-flatbed', endpoint: '/reports/fees/purchases', search: 'Search purchase',
    filters: [{ key: 'staff_id', label: 'Recorded by', type: 'select', lookup: lk.staff }],
    summary: [{ key: 'total_amount', label: 'Total fees', format: 'money' }, { key: 'transaction_count', label: 'Transactions', format: 'number' }], columns: feeCols });
  R({ id: 'report-mdr', title: 'MDR Fees', icon: 'fa-solid fa-credit-card', endpoint: '/reports/fees/mdr', search: 'Search receipt',
    description: 'Merchant discount rate charged by card / e-wallet providers.',
    filters: [{ key: 'cashier_id', label: 'Cashier', type: 'select', lookup: lk.staff }, { key: 'payment_method', label: 'Payment method', type: 'select', options: O.salesPaymentMethods }],
    summary: [{ key: 'total_amount', label: 'Total MDR', format: 'money' }, { key: 'transaction_count', label: 'Transactions', format: 'number' }],
    columns: [{ key: 'created_at', label: 'Date', format: 'datetime' }, { key: 'receipt_number', label: 'Receipt' }, { key: 'cashier_name', label: 'Cashier' }, { key: 'payment_method', label: 'Method' }, { key: 'transaction_amount', label: 'Sale', format: 'money' }, { key: 'mdr_rate', label: 'Rate', format: 'percent' }, { key: 'amount', label: 'MDR', format: 'money' }] });

  R({
    id: 'report-taxes', title: 'Taxes', icon: 'fa-solid fa-landmark', endpoint: '/reports/taxes',
    summary: [{ key: 'taxable_amount', label: 'Taxable sales', format: 'money' }, { key: 'tax_amount', label: 'Tax collected', format: 'money' }],
    columns: [{ key: 'date', label: 'Date', format: 'date' }, { key: 'tax_name', label: 'Tax' }, { key: 'rate', label: 'Rate', format: 'percent' }, { key: 'transaction_count', label: 'Transactions', format: 'number' }, { key: 'taxable_amount', label: 'Taxable', format: 'money' }, { key: 'tax_amount', label: 'Tax', format: 'money' }],
  });

  R({
    id: 'report-ppob', title: 'PPOB Sales', icon: 'fa-solid fa-mobile-screen', endpoint: '/reports/ppob', search: 'Search reference ID',
    filters: [{ key: 'cashier_id', label: 'Cashier', type: 'select', lookup: lk.staff }, { key: 'status', label: 'Status', type: 'select', options: ['success', 'pending', 'failed'] }],
    summary: [{ key: 'transaction_count', label: 'Transactions', format: 'number' }, { key: 'selling_total', label: 'Sales', format: 'money' }, { key: 'profit', label: 'Profit', format: 'money' }],
    columns: [{ key: 'created_at', label: 'Date', format: 'datetime' }, { key: 'reference_id', label: 'Reference' }, { key: 'product_name', label: 'Product' }, { key: 'customer_number', label: 'Customer no.' }, { key: 'base_price', label: 'Cost', format: 'money' }, { key: 'selling_price', label: 'Price', format: 'money' }, { key: 'profit', label: 'Profit', format: 'money' }, { key: 'cashier_name', label: 'Cashier' }, { key: 'status', label: 'Status', format: 'badge' }],
  });

  R({
    id: 'report-visitors', title: 'Visitors', icon: 'fa-solid fa-people-group', endpoint: '/reports/visitors', defaultPreset: 'last_7_days',
    description: 'Customer visits (transactions) grouped by time.',
    groupBy: { key: 'group_by', label: 'Group by', options: [{ value: 'hour', label: 'Hour' }, { value: 'weekday', label: 'Day of week' }, { value: 'date', label: 'Date' }, { value: 'month', label: 'Month' }] },
    summary: [{ key: 'visitor_count', label: 'Visitors', format: 'number' }, { key: 'average_per_period', label: 'Average', format: 'number' }],
    chart: { title: 'Visitors', type: 'bar', label: 'period', source: 'data', series: [{ key: 'visitor_count', name: 'Visitors' }] },
    columns: [{ key: 'period', label: 'Period' }, { key: 'visitor_count', label: 'Visitors', format: 'number' }, { key: 'net_sales', label: 'Sales', format: 'money' }],
    paginated: false,
  });

  R({
    id: 'report-promotion-transactions', title: 'Promotion Transactions', icon: 'fa-solid fa-bullhorn', endpoint: '/reports/promotions/transactions', search: 'Search promotion',
    summary: [{ key: 'transaction_count', label: 'Transactions', format: 'number' }, { key: 'discount_total', label: 'Discount given', format: 'money' }, { key: 'net_sales', label: 'Revenue', format: 'money' }, { key: 'profit', label: 'Profit', format: 'money' }],
    columns: [{ key: 'promotion_name', label: 'Promotion' }, { key: 'transaction_count', label: 'Transactions', format: 'number' }, { key: 'discount_total', label: 'Discount', format: 'money' }, { key: 'net_sales', label: 'Revenue', format: 'money' }, { key: 'profit', label: 'Profit', format: 'money' }],
    detail: { endpoint: '/reports/promotions/transactions/{promotion_id}', title: 'Transactions', render: (d) => receiptsTable(d && d.sales) },
  });
  R({
    id: 'report-promotion-products', title: 'Promotion Product Sales', icon: 'fa-solid fa-tags', endpoint: '/reports/promotions/products', search: 'Search product',
    filters: [{ key: 'promotion_id', label: 'Promotion', type: 'select', lookup: lk.promotions }],
    summary: [{ key: 'transaction_count', label: 'Transactions', format: 'number' }, { key: 'profit', label: 'Profit', format: 'money' }, { key: 'net_sales', label: 'Revenue', format: 'money' }],
    columns: [{ key: 'product_name', label: 'Product' }, { key: 'promotion_name', label: 'Promotion' }, { key: 'quantity', label: 'Qty', format: 'number' }, { key: 'discount_total', label: 'Discount', format: 'money' }, { key: 'net_sales', label: 'Revenue', format: 'money' }, { key: 'profit', label: 'Profit', format: 'money' }],
    detail: { endpoint: '/reports/promotions/products/{product_id}', title: 'Sales', render: (d) => receiptsTable(d && d.sales) },
  });

  R({
    id: 'report-store-ratings', title: 'Store Ratings', icon: 'fa-solid fa-star-half-stroke', endpoint: '/reports/store-ratings', defaultPreset: 'last_30_days',
    filters: [{ key: 'rating', label: 'Stars', type: 'select', options: [5, 4, 3, 2, 1].map((n) => ({ value: n, label: n + ' ★' })) }],
    summary: [{ key: 'average_rating', label: 'Average rating', format: 'number', icon: 'fa-solid fa-star' }, { key: 'review_count', label: 'Reviews', format: 'number', icon: 'fa-regular fa-comment' }],
    columns: [{ key: 'created_at', label: 'Date', format: 'datetime' }, { key: 'customer_name', label: 'Customer' }, { key: 'rating', label: 'Rating', render: (v) => '<span class="text-warning">' + '★'.repeat(Number(v) || 0) + '</span><span class="text-body-tertiary">' + '★'.repeat(5 - (Number(v) || 0)) + '</span>' }, { key: 'comment', label: 'Comment' }, { key: 'receipt_number', label: 'Receipt' }],
    detail: { endpoint: '/reports/store-ratings/{id}', title: 'Review', fields: [{ key: 'customer_name', label: 'Customer' }, { key: 'rating', label: 'Rating', format: 'number' }, { key: 'comment', label: 'Comment' }, { key: 'tags', label: 'Tags', type: 'multiselect' }, { key: 'receipt_number', label: 'Receipt' }, { key: 'created_at', label: 'Date', type: 'datetime' }] },
    responseNote: 'summary also includes rating_breakdown: { "1": integer, …, "5": integer }.',
  });
})(window);
