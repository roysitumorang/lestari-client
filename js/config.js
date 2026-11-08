/**
 * Lestari client runtime configuration.
 * Change apiBaseUrl to point at your Lestari backend.
 */
window.LESTARI_CONFIG = {
  appName: 'Lestari Back Office',
  apiBaseUrl: 'http://localhost:8080/api/v1',
  currency: 'IDR',
  locale: 'id-ID',
  defaultPageSize: 25,
  storageKeys: {
    token: 'lestari.token',
    refreshToken: 'lestari.refresh_token',
    user: 'lestari.user',
    branch: 'lestari.branch_id',
    theme: 'lestari.theme',
  },
};
