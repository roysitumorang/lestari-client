/**
 * Minimal dependency-free SVG charts (line and bar) with hover tooltips.
 * Colors come from CSS variables so they follow the light/dark theme.
 */
(function (root) {
  const NS = 'http://www.w3.org/2000/svg';

  function niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }

  function compact(n) {
    const a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (a >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(Math.round(n * 100) / 100);
  }

  /**
   * render(container, { labels:[], series:[{ name, values:[] }], type:'line'|'bar', format:(v)=>string })
   */
  function render(container, opt) {
    const W = 760, H = 260, L = 48, R = 12, T = 12, B = 32;
    const labels = opt.labels || [];
    const series = opt.series || [];
    const all = series.flatMap((s) => s.values.map(Number));
    const max = niceMax(Math.max(0, ...all));
    const min = Math.min(0, ...all);
    const span = max - min || 1;
    const iw = W - L - R, ih = H - T - B;
    const n = Math.max(labels.length, 1);
    const x = (i) => L + (opt.type === 'bar' ? (i + 0.5) * iw / n : (n === 1 ? iw / 2 : i * iw / (n - 1)));
    const y = (v) => T + ih - ((v - min) / span) * ih;
    const fmt = opt.format || compact;

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('class', 'chart-svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', opt.title || 'Chart');
    let html = '';
    for (let k = 0; k <= 4; k++) {
      const v = min + span * k / 4;
      html += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="chart-grid"/>';
      html += '<text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end" class="chart-axis">' + compact(v) + '</text>';
    }
    const step = Math.ceil(n / 12);
    labels.forEach((lb, i) => {
      if (i % step) return;
      html += '<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle" class="chart-axis">' + UI.esc(lb) + '</text>';
    });
    series.forEach((s, si) => {
      const cls = 'chart-s' + (si % 4);
      if (opt.type === 'bar') {
        const bw = Math.max(2, (iw / n) * 0.7 / series.length);
        s.values.forEach((v, i) => {
          const bx = x(i) - (bw * series.length) / 2 + si * bw;
          const top = y(Math.max(0, v)), bot = y(Math.min(0, v));
          html += '<rect x="' + bx + '" y="' + top + '" width="' + bw + '" height="' + Math.max(0, bot - top) + '" rx="2" class="' + cls + '-fill" data-i="' + i + '"/>';
        });
      } else {
        const d = s.values.map((v, i) => (i ? 'L' : 'M') + x(i) + ' ' + y(Number(v))).join(' ');
        html += '<path d="' + d + '" class="' + cls + '-line" fill="none"/>';
        s.values.forEach((v, i) => { html += '<circle cx="' + x(i) + '" cy="' + y(Number(v)) + '" r="3" class="' + cls + '-dot"/>'; });
      }
    });
    labels.forEach((_, i) => {
      const w = iw / n;
      html += '<rect x="' + (opt.type === 'bar' ? x(i) - w / 2 : x(i) - w / 2) + '" y="' + T + '" width="' + w + '" height="' + ih + '" fill="transparent" data-hover="' + i + '"/>';
    });
    svg.innerHTML = html;

    const wrap = document.createElement('div');
    wrap.className = 'chart-wrap';
    const tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.hidden = true;
    wrap.appendChild(svg);
    wrap.appendChild(tip);
    svg.addEventListener('mousemove', (ev) => {
      const t = ev.target.closest('[data-hover]');
      if (!t) { tip.hidden = true; return; }
      const i = Number(t.dataset.hover);
      tip.innerHTML = '<strong>' + UI.esc(labels[i]) + '</strong>' + series.map((s, si) =>
        '<div><span class="dot chart-s' + (si % 4) + '-bg"></span>' + UI.esc(s.name) + ': ' + fmt(s.values[i]) + '</div>').join('');
      const r = wrap.getBoundingClientRect();
      tip.style.left = Math.min(ev.clientX - r.left + 12, r.width - 180) + 'px';
      tip.style.top = (ev.clientY - r.top + 12) + 'px';
      tip.hidden = false;
    });
    svg.addEventListener('mouseleave', () => { tip.hidden = true; });

    container.innerHTML = '';
    if (!labels.length) { container.innerHTML = UI.emptyState('No data for this period', 'fa-chart-line'); return; }
    if (series.length > 1) {
      const legend = document.createElement('div');
      legend.className = 'chart-legend';
      legend.innerHTML = series.map((s, si) => '<span><span class="dot chart-s' + (si % 4) + '-bg"></span>' + UI.esc(s.name) + '</span>').join('');
      container.appendChild(legend);
    }
    container.appendChild(wrap);
  }

  root.Charts = { render, compact };
})(window);
