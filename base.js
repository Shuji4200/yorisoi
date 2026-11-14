// ---------- 定数（目標） ----------
window.YT = {SEATED: 40, WON25: 8, MEET_WEEK: 10};
window.Y = {
  jstNow: () => new Date(Date.now() + 9 * 3600e3),
  ym: () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 7),
  num: (v) => (v == null || v === '' ? 0 : +v),
  fmt: (v) => (v == null || v === '' || isNaN(+v) ? '—' : d3.format(',')(+v)),
  setText(el, st, v) {
    el.classList.toggle('dash-skeleton', st === 'loading');
    el.textContent = st === 'ok' ? v : st === 'loading' ? '' : '—';
  },
  // 汎用の表描画
  table(tbody, src, cols, opt = {}) {
    const d = dash.data(src);
    tbody.replaceChildren();
    if (d.status !== 'ok') {
      const tr = document.createElement('tr'); const td = document.createElement('td');
      td.colSpan = cols.length; td.className = 'y-sub';
      td.textContent = d.status === 'loading' ? '読み込み中…' : d.status === 'error' ? '読み込めませんでした' : '—';
      tr.append(td); tbody.append(tr); return;
    }
    let rows = d.data || [];
    if (opt.filter) rows = rows.filter(opt.filter);
    if (!rows.length) {
      const tr = document.createElement('tr'); const td = document.createElement('td');
      td.colSpan = cols.length; td.className = 'y-sub'; td.textContent = '該当なし';
      tr.append(td); tbody.append(tr); return;
    }
    for (const r of rows) {
      const tr = document.createElement('tr');
      if (opt.key) tr.dataset.key = encodeURIComponent(String(r[opt.key] ?? ''));
      for (const c of cols) {
        const td = document.createElement('td');
        const v = r[c.f];
        if (c.cls) td.className = c.cls;
        if (c.link && r[c.link]) {
          const a = document.createElement('a'); a.href = r[c.link]; a.target = '_blank'; a.rel = 'noopener';
          a.textContent = v ?? '（無題）'; td.append(a);
        } else if (c.pill) {
          if (v) { const s = document.createElement('span'); s.className = 'y-pill'; s.textContent = v; td.append(s); }
        } else if (c.list) {
          let arr = []; try { arr = JSON.parse(v || '[]'); } catch (e) { arr = v ? [v] : []; }
          td.textContent = arr.join('・');
        } else if (c.num) td.textContent = Y.fmt(v);
        else td.textContent = v ?? '';
        tr.append(td);
      }
      tbody.append(tr);
    }
  }
};
