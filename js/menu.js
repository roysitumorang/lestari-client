/**
 * Sidebar structure. Items are page ids from the modules; nested { label, items } make sub-groups.
 */
(function (root) {
  const G = root.Lestari.group;

  G({ label: 'Reward Missions', icon: 'fa-solid fa-list-check', items: ['missions'] });
  G({ label: 'Billing', icon: 'fa-solid fa-credit-card', items: ['billing'] });
  G({ label: 'Dashboard', icon: 'fa-solid fa-gauge-high', items: ['dashboard'] });
  G({ label: 'Database', icon: 'fa-solid fa-database', items: [
    'products', 'stock', 'categories',
    { label: 'Customers & Suppliers', items: ['customers', 'customer-types', 'suppliers'] },
    { label: 'Discounts, Taxes & Fees', items: ['discounts', 'taxes', 'fees', 'cash-drawers'] },
    { label: 'Marketing', items: ['promotions', 'points', 'commissions'] },
    'stock-opnames',
  ] });
  G({ label: 'Transactions', icon: 'fa-solid fa-cart-shopping', items: ['sales', 'purchases', 'finance'] });
  G({ label: 'Reports', icon: 'fa-solid fa-chart-pie', items: [
    'report-profit-loss', 'report-cash-flow',
    { label: 'Sales', items: ['report-daily-sales', 'report-sales-transactions', 'report-sales-by-product', 'report-sales-by-category'] },
    { label: 'Purchases', items: ['report-daily-purchases', 'report-purchase-transactions'] },
    { label: 'Points', items: ['report-customer-points', 'report-point-redemptions', 'report-point-earnings'] },
    { label: 'Debts', items: ['payables', 'receivables'] },
    'report-capital',
    { label: 'Returns', items: ['sales-returns', 'purchase-returns'] },
    'report-shifts',
    { label: 'Fees', items: ['report-fees-sales', 'report-fees-purchases', 'report-mdr'] },
    'report-taxes', 'report-ppob', 'report-visitors',
    { label: 'Promotions', items: ['report-promotion-transactions', 'report-promotion-products'] },
    'report-store-ratings',
  ] });
  G({ label: 'Branches', icon: 'fa-solid fa-sitemap', items: [
    'branch-billing', 'branch-dashboard', 'branch-products', 'stock-transfers',
    { label: 'Transfer Reports', items: ['report-transfers', 'report-transfer-confirmations'] },
    'branches',
  ] });
  G({ label: 'Settings', icon: 'fa-solid fa-gear', items: [
    'profile',
    { label: 'Store', items: ['store', 'online-store', 'link-page', 'qr-order'] },
    { label: 'Payment', items: ['payment-methods', 'default-tax', 'service-charge', 'rounding'] },
    'storage', 'reset-data', 'plugins', 'receipt',
    { label: 'Staff', items: ['staff', 'attendance'] },
    'help-access', 'display',
  ] });
  G({ label: 'E-Catalog', icon: 'fa-solid fa-store', items: ['catalog-orders', 'catalog-shipping', 'catalog-accounts'] });
  G({ label: 'PPOB', icon: 'fa-solid fa-mobile-screen', items: ['ppob-deposits', 'ppob-prepaid', 'ppob-postpaid'] });
  G({ label: 'Referral Program', icon: 'fa-solid fa-user-plus', items: ['referral'] });
  G({ label: 'Integrations', icon: 'fa-solid fa-plug', items: ['integrations'] });
  G({ label: 'Business Loans', icon: 'fa-solid fa-hand-holding-dollar', items: ['loans'] });
  G({ label: 'Notifications', icon: 'fa-regular fa-bell', items: ['notifications'] });
})(window);
