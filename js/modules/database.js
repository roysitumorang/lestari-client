/**
 * DATABASE group: products, stock, categories, customers, suppliers, discounts, taxes,
 * fees, cash drawers, promotions, points, commissions, stock opname.
 */
(function (root) {
  const L = root.Lestari;
  const lk = L.lookups;
  const O = L.options;

  L.register({
    kind: 'crud', id: 'products', title: 'Products & Services', singular: 'Product', icon: 'fa-solid fa-boxes-stacked',
    description: 'Items you sell, with prices, stock, units, variants and wholesale tiers.',
    endpoint: '/products',
    ops: ['list', 'create', 'read', 'update', 'delete', 'bulk_delete', 'import', 'export'],
    importModes: [{ value: 'create', label: 'Add new products' }, { value: 'update', label: 'Update existing products (matched by SKU)' }, { value: 'product_types', label: 'Product types (units, variants, wholesale)' }],
    searchPlaceholder: 'Search name, SKU or barcode',
    filters: [
      { key: 'category_id', label: 'Category', type: 'select', lookup: lk.categories },
      { key: 'item_type', label: 'Type', type: 'select', options: O.itemType },
      { key: 'stock_status', label: 'Stock', type: 'select', options: [{ value: 'in_stock', label: 'In stock' }, { value: 'low', label: 'Low stock' }, { value: 'out', label: 'Out of stock' }] },
    ],
    columns: [
      { key: 'image_url', label: '', type: 'image', sortable: false },
      { key: 'name', label: 'Name' },
      { key: 'sku', label: 'SKU' },
      { key: 'category.name', label: 'Category' },
      { key: 'selling_price', label: 'Selling price', format: 'money' },
      { key: 'purchase_price', label: 'Cost', format: 'money' },
      { key: 'stock', label: 'Stock', format: 'number' },
      { key: 'updated_at', label: 'Updated', format: 'datetime' },
    ],
    fields: [
      { type: 'heading', label: 'Basic information' },
      { key: 'image_url', label: 'Photo', type: 'image', col: 12 },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'item_type', label: 'Type', type: 'select', options: O.itemType, default: 'product', required: true },
      { key: 'sku', label: 'SKU / code', type: 'text', help: 'Leave blank to generate one automatically.' },
      { key: 'barcode', label: 'Barcode', type: 'text' },
      { key: 'category_id', label: 'Category', type: 'select', lookup: lk.categories },
      { key: 'unit', label: 'Unit', type: 'text', placeholder: 'pcs, box, kg…' },
      { type: 'heading', label: 'Pricing' },
      { key: 'selling_price', label: 'Selling price', type: 'money', required: true, min: 0 },
      { key: 'purchase_price', label: 'Purchase price (cost)', type: 'money', min: 0 },
      { key: 'price_type', label: 'Price type', type: 'select', options: O.priceType, default: 'single' },
      { key: 'tax_id', label: 'Tax', type: 'select', lookup: { endpoint: '/taxes', value: 'id', label: 'name' } },
      { key: 'discount_type', label: 'Discount type', type: 'select', options: O.discountType },
      { key: 'discount_value', label: 'Discount value', type: 'number', min: 0 },
      { key: 'wholesale_prices', label: 'Wholesale tiers', type: 'items', showIf: { key: 'price_type', in: ['wholesale'] },
        fields: [{ key: 'min_quantity', label: 'Min. qty', type: 'number' }, { key: 'price', label: 'Price', type: 'money' }] },
      { key: 'customer_type_prices', label: 'Price per customer type', type: 'items', showIf: { key: 'price_type', in: ['customer_type'] },
        fields: [{ key: 'customer_type_id', label: 'Customer type', type: 'select', lookup: lk.customerTypes }, { key: 'price', label: 'Price', type: 'money' }] },
      { type: 'heading', label: 'Stock' },
      { key: 'track_stock', label: 'Track stock', type: 'switch', default: true, list: false },
      { key: 'stock', label: 'Current stock', type: 'number', help: 'Only used when creating; adjust later from Stock Management.' },
      { key: 'minimum_stock', label: 'Low-stock alert at', type: 'number', min: 0 },
      { key: 'shelf_location', label: 'Shelf location', type: 'text' },
      { key: 'weight_grams', label: 'Weight (grams)', type: 'number', min: 0 },
      { key: 'track_imei', label: 'Track IMEI / serial numbers', type: 'switch', list: false },
      { key: 'units', label: 'Multiple units', type: 'items', help: 'E.g. sell by box of 12 and by piece.',
        fields: [{ key: 'name', label: 'Unit', type: 'text' }, { key: 'conversion', label: 'Qty of base unit', type: 'number' }, { key: 'selling_price', label: 'Price', type: 'money' }, { key: 'barcode', label: 'Barcode', type: 'text' }] },
      { key: 'variants', label: 'Variants', type: 'items',
        fields: [{ key: 'name', label: 'Variant', type: 'text' }, { key: 'sku', label: 'SKU', type: 'text' }, { key: 'selling_price', label: 'Price', type: 'money' }, { key: 'purchase_price', label: 'Cost', type: 'money' }, { key: 'stock', label: 'Stock', type: 'number' }] },
      { key: 'ingredients', label: 'Recipe / raw materials', type: 'items', help: 'Stock of these products is reduced when this item is sold.',
        fields: [{ key: 'product_id', label: 'Raw material', type: 'select', lookup: lk.products }, { key: 'quantity', label: 'Qty', type: 'number' }, { key: 'unit', label: 'Unit', type: 'select', options: O.unitBase }] },
      { type: 'heading', label: 'Loyalty & online store' },
      { key: 'points_earned', label: 'Points earned per purchase', type: 'number', min: 0 },
      { key: 'points_to_redeem', label: 'Points needed to redeem', type: 'number', min: 0 },
      { key: 'show_in_online_store', label: 'Show in online store', type: 'switch', default: true },
      { key: 'description', label: 'Notes', type: 'textarea', col: 12 },
      { key: 'online_description', label: 'Online store description', type: 'textarea', col: 12 },
    ],
    toolbar: [
      { id: 'barcodes', label: 'Export barcodes', icon: 'fa-solid fa-barcode', method: 'GET', path: '/products/barcodes', download: 'barcodes.pdf',
        summary: 'Printable barcode / QR sheet (PDF).',
        form: [
          { key: 'product_ids', label: 'Products (empty = all)', type: 'multiselect', lookup: lk.products, col: 12 },
          { key: 'symbology', label: 'Barcode type', type: 'select', options: [{ value: 'code128', label: 'Code 128' }, { value: 'ean13', label: 'EAN-13' }, { value: 'ean8', label: 'EAN-8' }, { value: 'qr', label: 'QR code' }], default: 'code128' },
          { key: 'copies', label: 'Copies per product', type: 'number', default: 1, min: 1 },
          { key: 'paper_size', label: 'Paper', type: 'select', options: ['a4', 'label_33x15', 'label_50x25'], default: 'a4' },
          { key: 'show_price', label: 'Print price', type: 'switch', default: true },
        ] },
      { id: 'labels', label: 'Export label maker', icon: 'fa-solid fa-tags', method: 'GET', path: '/products/labels', download: 'labels.xlsx',
        summary: 'Spreadsheet for label-printer software (name, SKU, price, barcode).',
        form: [{ key: 'product_ids', label: 'Products (empty = all)', type: 'multiselect', lookup: lk.products, col: 12 }] },
    ],
    rowActions: [
      { id: 'duplicate', label: 'Duplicate', icon: 'fa-regular fa-copy', method: 'POST', path: '/products/{id}/duplicate', success: 'Product duplicated', summary: 'Copy a product (new SKU is generated).', response: { data: '<Product>' } },
    ],
    endpoints: [
      { method: 'GET', path: '/products/generate-sku', summary: 'Suggest the next free SKU.', query: { category_id: 'string (uuid)?' }, response: { data: { sku: 'string' } } },
      { method: 'GET', path: '/products/check-sku', summary: 'Check whether a SKU is already used.', query: { sku: 'string', exclude_id: 'string (uuid)?' }, response: { data: { available: 'boolean' } } },
    ],
  });

  L.register({
    kind: 'crud', id: 'stock', title: 'Stock Management', singular: 'Stock', icon: 'fa-solid fa-warehouse',
    description: 'Current stock of every tracked product. Adjust counts and view movement history.',
    endpoint: '/inventory/stocks', idKey: 'product_id', titleKey: 'name',
    ops: ['list', 'import', 'export'],
    searchPlaceholder: 'Search product',
    filters: [{ key: 'category_id', label: 'Category', type: 'select', lookup: lk.categories }, { key: 'stock_status', label: 'Stock', type: 'select', options: [{ value: 'low', label: 'Low stock' }, { value: 'out', label: 'Out of stock' }] }],
    columns: [
      { key: 'image_url', label: '', type: 'image', sortable: false },
      { key: 'name', label: 'Product' }, { key: 'sku', label: 'SKU' }, { key: 'category_name', label: 'Category' },
      { key: 'stock', label: 'Stock', format: 'number' }, { key: 'unit', label: 'Unit' },
      { key: 'minimum_stock', label: 'Min.', format: 'number' }, { key: 'stock_value', label: 'Stock value', format: 'money' },
    ],
    fields: [
      { key: 'product_id', label: 'Product ID', type: 'text', readonly: true }, { key: 'name', label: 'Product', type: 'text' }, { key: 'sku', label: 'SKU', type: 'text' },
      { key: 'stock', label: 'Stock', type: 'number' }, { key: 'unit', label: 'Unit', type: 'text' }, { key: 'minimum_stock', label: 'Minimum', type: 'number' },
      { key: 'stock_value', label: 'Stock value', type: 'money' }, { key: 'updated_at', label: 'Updated', type: 'datetime' },
    ],
    toolbar: [
      { id: 'recalculate', label: 'Recalculate stock', icon: 'fa-solid fa-rotate', method: 'POST', path: '/inventory/stocks/recalculate',
        confirm: 'Rebuild stock levels from the transaction history? This can take a while for large catalogs.', success: 'Stock recalculation started',
        summary: 'Rebuild stock from history ("Fix stock data"). Runs as a background job.', response: { data: { job_id: 'string (uuid)', status: '"queued"' } } },
    ],
    rowActions: [
      { id: 'adjust', label: 'Adjust stock', icon: 'fa-solid fa-sliders', method: 'POST', path: '/inventory/stocks/{product_id}/adjustments', success: 'Stock updated',
        values: (row) => ({ quantity: row.stock }),
        form: [
          { key: 'mode', label: 'Adjustment', type: 'select', required: true, default: 'set', options: [{ value: 'set', label: 'Set to exact amount' }, { value: 'add', label: 'Add' }, { value: 'subtract', label: 'Subtract' }] },
          { key: 'quantity', label: 'Quantity', type: 'number', required: true },
          { key: 'unit_cost', label: 'Unit cost (for added stock)', type: 'money', showIf: { key: 'mode', in: ['add'] } },
          { key: 'reason', label: 'Reason', type: 'select', options: ['correction', 'damaged', 'expired', 'lost', 'received', 'other'] },
          { key: 'note', label: 'Note', type: 'textarea', col: 12 },
        ],
        summary: 'Adjust stock of one product.', response: { data: '<StockLevel>' } },
      { id: 'history', label: 'Movement history', icon: 'fa-solid fa-clock-rotate-left', onClick: async (row) => {
        const d = UI.modal({ title: 'Stock history · ' + row.name, body: UI.spinner(), size: 'lg', footer: '<button class="btn btn-light" data-bs-dismiss="modal">Close</button>' });
        try {
          const r = await Api.get('/inventory/stocks/' + row.product_id + '/movements', { per_page: 100 });
          const cols = [{ key: 'created_at', label: 'Date', format: 'datetime' }, { key: 'type', label: 'Type' }, { key: 'reference', label: 'Reference' }, { key: 'quantity_change', label: 'Change', format: 'number' }, { key: 'stock_after', label: 'Stock after', format: 'number' }, { key: 'actor_name', label: 'By' }];
          d.body.innerHTML = (r.data || []).length ? '<div class="table-responsive"><table class="table table-sm"><thead><tr>' + cols.map((c) => '<th>' + c.label + '</th>').join('') + '</tr></thead><tbody>' +
            r.data.map((x) => '<tr>' + cols.map((c) => '<td>' + UI.formatValue(c, x) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' : UI.emptyState('No movements yet');
        } catch (e) { d.body.innerHTML = UI.emptyState(e.message, 'fa-triangle-exclamation'); }
      } },
    ],
    endpoints: [
      { method: 'GET', path: '/inventory/stocks/{product_id}/movements', summary: 'Stock movement log for one product.', query: { page: 'integer', per_page: 'integer', start_date: 'date?', end_date: 'date?' },
        response: { data: [{ id: 'string (uuid)', created_at: 'datetime', type: '"sale" | "purchase" | "adjustment" | "opname" | "transfer_in" | "transfer_out" | "return"', reference: 'string', quantity_change: 'number', stock_after: 'number', actor_name: 'string' }], meta: '<Pagination>' } },
    ],
  });

  L.register({
    kind: 'crud', id: 'categories', title: 'Categories', singular: 'Category', icon: 'fa-solid fa-folder-tree',
    endpoint: '/categories', ops: ['list', 'create', 'read', 'update', 'delete', 'bulk_delete'],
    searchPlaceholder: 'Search category',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'color', label: 'Color', type: 'color', default: '#0f9d76' },
      { key: 'sort_order', label: 'Sort order', type: 'number' },
      { key: 'product_count', label: 'Products', type: 'number', form: false },
      { key: 'description', label: 'Description', type: 'textarea', col: 12 },
    ],
  });

  const customerFields = [
    { key: 'name', label: 'Full name', type: 'text', required: true },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'code', label: 'Customer code', type: 'text', help: 'Used for barcode/QR lookup at the cashier.' },
    { key: 'customer_type_id', label: 'Customer type', type: 'select', lookup: lk.customerTypes },
    { key: 'birth_date', label: 'Birth date', type: 'date', list: false },
    { key: 'points', label: 'Points', type: 'number', form: false },
    { key: 'receivable_balance', label: 'Outstanding credit', type: 'money', form: false },
    { key: 'address', label: 'Address', type: 'textarea', col: 12 },
    { key: 'note', label: 'Note', type: 'textarea', col: 12, list: false },
  ];
  L.register({
    kind: 'crud', id: 'customers', title: 'Customers', singular: 'Customer', icon: 'fa-solid fa-user-group',
    endpoint: '/customers', ops: ['list', 'create', 'read', 'update', 'delete', 'bulk_delete', 'import', 'export'],
    searchPlaceholder: 'Search name, phone, email or code',
    filters: [{ key: 'customer_type_id', label: 'Customer type', type: 'select', lookup: lk.customerTypes }],
    columns: [
      { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'address', label: 'Address' },
      { key: 'points', label: 'Points', format: 'number' }, { key: 'code', label: 'Code' }, { key: 'customer_type.name', label: 'Customer type' },
    ],
    fields: customerFields,
    toolbar: [
      { id: 'qr', label: 'Export QR codes', icon: 'fa-solid fa-qrcode', method: 'GET', path: '/customers/qr-codes', download: 'customer-qr-codes.pdf',
        summary: 'Printable QR card for each customer code.',
        form: [{ key: 'customer_ids', label: 'Customers (empty = all)', type: 'multiselect', lookup: lk.customers, col: 12 }, { key: 'layout', label: 'Layout', type: 'select', options: ['a4_grid', 'card'], default: 'a4_grid' }] },
      { id: 'import_points', label: 'Import points', icon: 'fa-solid fa-coins', method: 'POST', path: '/customers/points/import', upload: true, success: 'Points imported',
        summary: 'Bulk set/add points from a spreadsheet (columns: code, points).',
        form: [{ key: 'file', label: 'Spreadsheet (.xlsx)', type: 'file', accept: '.xlsx,.csv', required: true, col: 12 }, { key: 'mode', label: 'Mode', type: 'select', options: [{ value: 'add', label: 'Add to current points' }, { value: 'set', label: 'Replace current points' }], default: 'add' }],
        response: { data: { updated: 'integer', failed: 'integer', errors: [{ row: 'integer', message: 'string' }] } } },
    ],
    rowActions: [
      { id: 'points', label: 'Adjust points', icon: 'fa-solid fa-coins', method: 'POST', path: '/customers/{id}/points', success: 'Points updated',
        form: [{ key: 'mode', label: 'Mode', type: 'select', required: true, default: 'add', options: [{ value: 'add', label: 'Add' }, { value: 'subtract', label: 'Subtract' }] }, { key: 'points', label: 'Points', type: 'number', required: true, min: 1 }, { key: 'note', label: 'Note', type: 'textarea', col: 12 }],
        summary: 'Manually add or subtract loyalty points.', response: { data: { points: 'integer' } } },
      { id: 'point_history', label: 'Point history', icon: 'fa-solid fa-clock-rotate-left', onClick: async (row) => {
        const d = UI.modal({ title: 'Point history · ' + row.name, body: UI.spinner(), size: 'lg', footer: '<button class="btn btn-light" data-bs-dismiss="modal">Close</button>' });
        try {
          const r = await Api.get('/customers/' + row.id + '/point-history', { per_page: 100 });
          const cols = [{ key: 'created_at', label: 'Date', format: 'datetime' }, { key: 'type', label: 'Type' }, { key: 'points', label: 'Points', format: 'number' }, { key: 'balance_after', label: 'Balance', format: 'number' }, { key: 'reference', label: 'Reference' }, { key: 'note', label: 'Note' }];
          d.body.innerHTML = (r.data || []).length ? '<table class="table table-sm"><thead><tr>' + cols.map((c) => '<th>' + c.label + '</th>').join('') + '</tr></thead><tbody>' + r.data.map((x) => '<tr>' + cols.map((c) => '<td>' + UI.formatValue(c, x) + '</td>').join('') + '</tr>').join('') + '</tbody></table>' : UI.emptyState('No point history');
        } catch (e) { d.body.innerHTML = UI.emptyState(e.message, 'fa-triangle-exclamation'); }
      } },
    ],
    endpoints: [
      { method: 'GET', path: '/customers/{id}/point-history', summary: 'Point ledger for one customer.', query: { page: 'integer', per_page: 'integer' },
        response: { data: [{ id: 'string (uuid)', created_at: 'datetime', type: '"earned" | "redeemed" | "adjusted" | "expired"', points: 'integer', balance_after: 'integer', reference: 'string|null', note: 'string|null' }], meta: '<Pagination>' } },
    ],
  });

  L.register({
    kind: 'crud', id: 'customer-types', title: 'Customer Types', singular: 'Customer type', icon: 'fa-solid fa-id-badge', plugin: 'business',
    description: 'Group customers (e.g. Member, Reseller) to give them special prices or discounts.',
    endpoint: '/customer-types', ops: ['list', 'create', 'read', 'update', 'delete'],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'discount_type', label: 'Automatic discount type', type: 'select', options: O.discountType },
      { key: 'discount_value', label: 'Discount value', type: 'number', min: 0 },
      { key: 'point_multiplier', label: 'Point multiplier', type: 'number', default: 1, step: '0.1', min: 0 },
      { key: 'customer_count', label: 'Customers', type: 'number', form: false },
      { key: 'description', label: 'Description', type: 'textarea', col: 12 },
    ],
  });

  L.register({
    kind: 'crud', id: 'suppliers', title: 'Suppliers', singular: 'Supplier', icon: 'fa-solid fa-truck-field',
    endpoint: '/suppliers', ops: ['list', 'create', 'read', 'update', 'delete', 'bulk_delete', 'import', 'export'],
    searchPlaceholder: 'Search supplier',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'contact_person', label: 'Contact person', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'code', label: 'Supplier code', type: 'text' },
      { key: 'payable_balance', label: 'Outstanding debt', type: 'money', form: false },
      { key: 'address', label: 'Address', type: 'textarea', col: 12 },
    ],
  });

  L.register({
    kind: 'crud', id: 'discounts', title: 'Discounts', singular: 'Discount', icon: 'fa-solid fa-percent',
    endpoint: '/discounts', ops: ['list', 'create', 'read', 'update', 'delete', 'bulk_delete'],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'type', label: 'Discount type', type: 'select', options: O.discountType, required: true, default: 'percent' },
      { key: 'value', label: 'Value', type: 'number', required: true, min: 0 },
      { key: 'is_active', label: 'Active', type: 'switch', default: true },
    ],
  });

  L.register({
    kind: 'crud', id: 'taxes', title: 'Taxes', singular: 'Tax', icon: 'fa-solid fa-file-invoice-dollar',
    endpoint: '/taxes', ops: ['list', 'create', 'read', 'update', 'delete', 'bulk_delete'],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'rate', label: 'Rate', type: 'percent', required: true, min: 0, max: 100 },
      { key: 'is_inclusive', label: 'Price already includes this tax', type: 'switch' },
      { key: 'is_active', label: 'Active', type: 'switch', default: true },
    ],
  });

  L.register({
    kind: 'crud', id: 'fees', title: 'Fee Module', singular: 'Fee', icon: 'fa-solid fa-hand-holding-dollar',
    description: 'Extra charges the cashier can add to a sale or purchase (packaging, delivery, etc.).',
    endpoint: '/fees', ops: ['list', 'create', 'read', 'update', 'delete'],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'amount_type', label: 'Type', type: 'select', options: O.discountType, default: 'amount', required: true },
      { key: 'amount', label: 'Amount', type: 'number', required: true, min: 0 },
      { key: 'applies_to', label: 'Applies to', type: 'select', options: [{ value: 'sale', label: 'Sales' }, { value: 'purchase', label: 'Purchases' }, { value: 'both', label: 'Both' }], default: 'sale' },
    ],
  });

  L.register({
    kind: 'crud', id: 'cash-drawers', title: 'Cash Drawers', singular: 'Cash drawer', icon: 'fa-solid fa-cash-register',
    endpoint: '/cash-drawers', ops: ['list', 'create', 'read', 'update', 'delete'],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'is_active', label: 'Active', type: 'switch', default: true },
      { key: 'current_shift_status', label: 'Shift', type: 'text', form: false },
    ],
  });

  L.register({
    kind: 'crud', id: 'promotions', title: 'Promotions', singular: 'Promotion', icon: 'fa-solid fa-bullhorn', plugin: 'business',
    description: 'Time-limited deals applied automatically at checkout.',
    endpoint: '/promotions', ops: ['list', 'create', 'read', 'update', 'delete'],
    tabs: { key: 'status', options: [{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'ended', label: 'Ended' }] },
    columns: [{ key: 'name', label: 'Name' }, { key: 'type', label: 'Type', type: 'select', options: [{ value: 'product_discount', label: 'Product discount' }, { value: 'buy_x_get_y', label: 'Buy X get Y' }, { value: 'minimum_purchase', label: 'Minimum purchase' }] }, { key: 'start_date', label: 'Starts', format: 'date' }, { key: 'end_date', label: 'Ends', format: 'date' }, { key: 'is_active', label: 'Active', format: 'boolean' }],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'type', label: 'Promotion type', type: 'select', required: true, default: 'product_discount', options: [{ value: 'product_discount', label: 'Product discount' }, { value: 'buy_x_get_y', label: 'Buy X get Y' }, { value: 'minimum_purchase', label: 'Minimum purchase discount' }] },
      { key: 'start_date', label: 'Start date', type: 'date', required: true },
      { key: 'end_date', label: 'End date', type: 'date', required: true },
      { key: 'start_time', label: 'Daily start time', type: 'time' },
      { key: 'end_time', label: 'Daily end time', type: 'time' },
      { key: 'days', label: 'Active days', type: 'multiselect', options: O.weekdays },
      { key: 'customer_type_ids', label: 'Only for customer types', type: 'multiselect', lookup: lk.customerTypes },
      { key: 'discount_type', label: 'Discount type', type: 'select', options: O.discountType, showIf: { key: 'type', in: ['product_discount', 'minimum_purchase'] } },
      { key: 'discount_value', label: 'Discount value', type: 'number', min: 0, showIf: { key: 'type', in: ['product_discount', 'minimum_purchase'] } },
      { key: 'minimum_purchase', label: 'Minimum purchase', type: 'money', showIf: { key: 'type', in: ['minimum_purchase'] } },
      { key: 'buy_quantity', label: 'Buy quantity (X)', type: 'number', showIf: { key: 'type', in: ['buy_x_get_y'] } },
      { key: 'get_quantity', label: 'Free quantity (Y)', type: 'number', showIf: { key: 'type', in: ['buy_x_get_y'] } },
      { key: 'products', label: 'Products', type: 'items', showIf: { key: 'type', in: ['product_discount', 'buy_x_get_y'] },
        fields: [{ key: 'product_id', label: 'Product', type: 'select', lookup: lk.products }, { key: 'free_product_id', label: 'Free product (Buy X get Y)', type: 'select', lookup: lk.products }] },
      { key: 'is_active', label: 'Active', type: 'switch', default: true },
      { key: 'description', label: 'Description', type: 'textarea', col: 12 },
    ],
  });

  L.register({
    kind: 'settings', id: 'points', title: 'Loyalty Points', icon: 'fa-solid fa-star', plugin: 'business',
    description: 'How customers earn and redeem points.', endpoint: '/settings/points',
    fields: [
      { key: 'is_enabled', label: 'Enable loyalty points', type: 'switch', col: 12 },
      { key: 'earn_spend_amount', label: 'For every purchase of', type: 'money', min: 0 },
      { key: 'earn_points', label: 'Customer earns (points)', type: 'number', min: 0 },
      { key: 'redeem_point_value', label: 'Value of 1 point when redeemed', type: 'money', min: 0 },
      { key: 'minimum_redeem_points', label: 'Minimum points to redeem', type: 'number', min: 0 },
      { key: 'expiry_days', label: 'Points expire after (days, 0 = never)', type: 'number', min: 0 },
      { key: 'earn_on_credit_sales', label: 'Earn points on unpaid (credit) sales', type: 'switch' },
    ],
  });

  L.register({
    kind: 'crud', id: 'commissions', title: 'Staff Commissions', singular: 'Commission rule', icon: 'fa-solid fa-sack-dollar', plugin: 'business',
    endpoint: '/commissions', ops: ['list', 'create', 'read', 'update', 'delete'],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'basis', label: 'Calculated per', type: 'select', required: true, default: 'product', options: [{ value: 'product', label: 'Product sold' }, { value: 'transaction', label: 'Transaction' }] },
      { key: 'type', label: 'Commission type', type: 'select', options: O.discountType, required: true, default: 'percent' },
      { key: 'value', label: 'Value', type: 'number', required: true, min: 0 },
      { key: 'staff_ids', label: 'Staff', type: 'multiselect', lookup: lk.staff },
      { key: 'product_ids', label: 'Products (empty = all)', type: 'multiselect', lookup: lk.products, showIf: { key: 'basis', in: ['product'] } },
      { key: 'is_active', label: 'Active', type: 'switch', default: true },
    ],
  });

  L.register({
    kind: 'crud', id: 'stock-opnames', title: 'Stock Opname', singular: 'Stock opname', icon: 'fa-solid fa-clipboard-check',
    description: 'Physical stock counts. Approving an opname sets stock to the counted quantity.',
    endpoint: '/stock-opnames', ops: ['list', 'create', 'read', 'delete', 'bulk_delete', 'import'],
    titleKey: 'code',
    columns: [{ key: 'code', label: 'Number' }, { key: 'opname_date', label: 'Date', format: 'date' }, { key: 'performed_by_name', label: 'Counted by' }, { key: 'item_count', label: 'Items', format: 'number' }, { key: 'difference_value', label: 'Difference value', format: 'money' }, { key: 'status', label: 'Status', format: 'badge' }],
    fields: [
      { key: 'opname_date', label: 'Date', type: 'date', required: true },
      { key: 'performed_by_name', label: 'Counted by', type: 'text', required: true },
      { key: 'performed_by_role', label: 'Role', type: 'select', options: O.actorRole, required: true },
      { key: 'items', label: 'Counted items', type: 'items', col: 12,
        fields: [{ key: 'product_id', label: 'Product', type: 'select', lookup: lk.products }, { key: 'physical_stock', label: 'Counted qty', type: 'number' }, { key: 'note', label: 'Note', type: 'text' }] },
      { key: 'note', label: 'Note', type: 'textarea', col: 12 },
    ],
    detailFields: [
      { key: 'code', label: 'Number' }, { key: 'opname_date', label: 'Date', type: 'date' }, { key: 'performed_by_name', label: 'Counted by' }, { key: 'status', label: 'Status' },
      { key: 'items', label: 'Items', type: 'items', fields: [{ key: 'product_name', label: 'Product' }, { key: 'system_stock', label: 'System', format: 'number' }, { key: 'physical_stock', label: 'Counted', format: 'number' }, { key: 'difference', label: 'Difference', format: 'number' }, { key: 'note', label: 'Note' }] },
      { key: 'note', label: 'Note' },
    ],
    rowActions: [
      { id: 'approve', label: 'Approve & apply', icon: 'fa-solid fa-check', when: (r) => r.status === 'pending', method: 'POST', path: '/stock-opnames/{id}/approve', confirm: 'Apply counted quantities to stock?', success: 'Stock opname applied', response: { data: '<StockOpname>' } },
      { id: 'reject', label: 'Reject', icon: 'fa-solid fa-xmark', variant: 'danger', when: (r) => r.status === 'pending', method: 'POST', path: '/stock-opnames/{id}/reject', form: [{ key: 'reason', label: 'Reason', type: 'textarea', col: 12 }], success: 'Stock opname rejected', response: { data: '<StockOpname>' } },
      { id: 'download', label: 'Download', icon: 'fa-solid fa-file-arrow-down', method: 'GET', path: '/stock-opnames/{id}/export', download: 'stock-opname.xlsx', reload: false },
    ],
  });
})(window);
