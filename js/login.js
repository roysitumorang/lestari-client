/** Sign-in page (index.html). Kept out of the HTML so a strict Content-Security-Policy can forbid inline scripts. */
(function () {
  const K = LESTARI_CONFIG.storageKeys;
  if (Api.store.get(K.token)) { location.replace('app.html'); return; }
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
    btn.querySelector('[data-label]').textContent = 'Signing in…';
    const body = { email: form.email.value.trim(), password: Api.encodePassword(form.password.value), remember_me: form.remember_me.checked };
    if (!otpBox.hidden) body.otp = form.otp.value.trim();
    try {
      const r = (await Api.post('/auth/login', body)).data;
      Api.store.set(K.token, r.access_token);
      Api.store.set(K.refreshToken, r.refresh_token);
      Api.store.set(K.user, JSON.stringify(r.user || {}));
      location.replace('app.html');
    } catch (e) {
      if (e.code === 'two_factor_required') { otpBox.hidden = false; form.otp.focus(); err.textContent = 'Enter the code from your authenticator app.'; }
      else err.textContent = e.message;
      err.hidden = false;
    } finally {
      btn.disabled = false;
      btn.querySelector('[data-label]').textContent = 'Sign in';
    }
  });
})();
