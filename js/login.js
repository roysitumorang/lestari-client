/** Sign-in page (index.html). Kept out of the HTML so a strict Content-Security-Policy can forbid inline scripts. */
(function () {
  const K = LESTARI_CONFIG.storageKeys;
  if (Api.store.get(K.token)) { location.replace('app.html'); return; }
  const T = I18n.t;
  I18n.applyDom();
  document.title = T('Sign in') + ' · Lestari Back Office';
  const sw = document.querySelector('[data-lang-switch]');
  sw.innerHTML = I18n.switcherHtml();
  sw.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]');
    if (!b) return;
    try { sessionStorage.setItem('lestari.lang.chosen', '1'); } catch (_) { /* ignore */ }
    I18n.setLang(b.dataset.lang);
  });
  document.querySelector('[data-api]').textContent = LESTARI_CONFIG.apiBaseUrl;
  const form = document.querySelector('[data-login]');
  const err = document.querySelector('[data-error]');
  const otpBox = document.querySelector('[data-otp-box]');
  document.querySelector('[data-toggle-pw]').addEventListener('click', (e) => {
    const i = document.getElementById('password');
    i.type = i.type === 'password' ? 'text' : 'password';
    e.currentTarget.innerHTML = '<i class="fa-regular fa-eye' + (i.type === 'text' ? '-slash' : '') + '"></i>';
  });
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    err.hidden = true;
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.querySelector('[data-label]').textContent = T('Signing in…');
    const body = { email: form.email.value.trim(), password: Api.encodePassword(form.password.value), remember_me: form.remember_me.checked };
    if (!otpBox.hidden) body.otp = form.otp.value.trim();
    try {
      const r = (await Api.post('/auth/login', body)).data;
      Api.store.set(K.token, r.access_token);
      Api.store.set(K.refreshToken, r.refresh_token);
      Api.store.set(K.user, JSON.stringify(r.user || {}));
      // a language picked on this page becomes the account's language; otherwise the account's setting applies
      let chosen = false;
      try { chosen = sessionStorage.getItem('lestari.lang.chosen') === '1'; } catch (_) { /* ignore */ }
      if (chosen) {
        try { await Api.put('/settings/display', { language: I18n.lang }); } catch (_) { /* staff may not edit settings */ }
      }
      location.replace('app.html');
    } catch (e) {
      if (e.code === 'two_factor_required') { otpBox.hidden = false; form.otp.focus(); err.textContent = T('Enter the code from your authenticator app.'); }
      else err.textContent = e.message;
      err.hidden = false;
    } finally {
      btn.disabled = false;
      btn.querySelector('[data-label]').textContent = T('Sign in');
    }
  });
})();
