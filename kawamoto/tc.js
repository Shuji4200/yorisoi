// ---------- 転職.com SNS ----------
(function () {
  const fmt = (v) => (v == null || v === '' || isNaN(+v) ? '—' : d3.format(',')(Math.round(+v)));
  const ok = (id) => { const d = dash.data(id); return d.status === 'ok' ? d.data : null; };
  const COLOR = {YouTube: '#e5484d', TikTok: '#16181d', Instagram: '#d6409f', Threads: '#5b606a', X: '#3b82f6'};
  const td = (t, c) => { const e = document.createElement('td'); if (c) e.className = c; e.textContent = t == null ? '' : t; return e; };
  const dotCell = (name) => { const p = document.createElement('td'); const dot = document.createElement('span'); dot.style.cssText = `display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px;background:${COLOR[name] || '#999'}`; p.append(dot, document.createTextNode(name)); return p; };

  dash.draw('tc-acc', (tb) => {
    const rows = ok('tc_accounts'); tb.replaceChildren(); if (!rows) return;
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      tr.append(dotCell(r.platform), td(r.handle), td(fmt(r.followers), 'n'), td(fmt(r.posts), 'n'), td(fmt(r.total), 'n'), td(r.total_label));
      tb.append(tr);
    });
  });

  dash.draw('tc-cmp', (el) => {
    const rows = ok('tc_compare'); el.replaceChildren(); if (!rows) { el.textContent = '—'; return; }
    const max = d3.max(rows, (r) => +r.median) || 1;
    const x = d3.scaleLog().domain([1, max]).range([4, 100]).clamp(true);
    rows.forEach((r) => {
      const row = document.createElement('div'); row.className = 'y-hrow'; row.style.gridTemplateColumns = '100px 1fr 150px';
      const n = document.createElement('span'); n.textContent = r.platform; n.style.fontWeight = '700';
      const tr = document.createElement('div'); tr.className = 'y-ftrack';
      const i = document.createElement('i'); i.style.width = `${x(Math.max(1, +r.median))}%`; i.style.background = COLOR[r.platform] || '#999'; tr.append(i);
      const v = document.createElement('span'); v.className = 'y-fnum'; v.style.fontSize = '16px';
      const b = document.createElement('b'); b.textContent = fmt(r.median);
      v.append(b, document.createTextNode(` ${r.unit || ''}`));
      row.append(n, tr, v); el.append(row);
    });
  });

  dash.draw('tc-trend', (tb) => {
    const rows = ok('tc_trend'); tb.replaceChildren(); if (!rows) return;
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      tr.append(td(r.platform), td(r.period), td(fmt(r.n), 'n'), td(r.median == null ? '—' : fmt(r.median), 'n'), td(r.note, 'w'));
      tb.append(tr);
    });
  });

  // 週ごとの記録（数値DB tc_weekly）
  dash.loader('tc_weekly', {
    description: 'スプレッドシートの1行目を見出しにして、2行目以降を行にします。',
    fn: ({answer}) => {
      const a = typeof answer === 'string' ? JSON.parse(answer) : answer;
      const vals = (a && (a.values || (a.content && a.content.values))) || [];
      const keys = ['date', 'week', 'platform', 'account', 'followers', 'posts', 'total', 'total_label', 'posts7', 'views7', 'median7', 'method', 'memo'];
      const num = new Set(['followers', 'posts', 'total', 'posts7', 'views7', 'median7']);
      return vals.slice(1).filter((r) => r[0] && r[2]).map((r) => {
        const o = {}; keys.forEach((k, i) => { const v = r[i]; o[k] = num.has(k) ? (v === '' || v == null || isNaN(+String(v).replace(/,/g, '')) ? null : +String(v).replace(/,/g, '')) : (v == null ? '' : String(v)); });
        o.key = `${o.date}|${o.platform}`; return o;
      });
    }
  });

  dash.calc('tc_wow', {
    title: '転職.com SNS 前回からの伸び', description: '媒体ごとに最新の記録と1つ前の記録を比べたもの。',
    inputs: ['tc_weekly'],
    fn: (rows) => ['YouTube', 'TikTok', 'Instagram', 'Threads', 'X'].map((platform) => {
      const xs = (rows || []).filter((r) => r.platform === platform).sort((a, b) => String(a.date).localeCompare(String(b.date)));
      const cur = xs[xs.length - 1], prev = xs[xs.length - 2];
      if (!cur) return null;
      const d = (k) => (prev && cur[k] != null && prev[k] != null ? cur[k] - prev[k] : null);
      return {platform, date: cur.date, prev_date: prev ? prev.date : '', followers: cur.followers, followers_diff: d('followers'), total_diff: d('total'), total_label: cur.total_label, posts7: cur.posts7, views7: cur.views7, median7: cur.median7};
    }).filter(Boolean)
  });

  const sign = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${fmt(v)}`);
  dash.draw('tc-wow', (tb) => {
    const rows = ok('tc_wow'); tb.replaceChildren(); if (!rows) return;
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      const fd = td(sign(r.followers_diff), 'n'); if (r.followers_diff > 0) fd.style.color = '#167a4f'; if (r.followers_diff < 0) fd.style.color = '#c0392b';
      tr.append(dotCell(r.platform), td(r.date), td(fmt(r.followers), 'n'), fd, td(sign(r.total_diff), 'n'), td(r.total_label), td(fmt(r.posts7), 'n'), td(fmt(r.views7), 'n'), td(fmt(r.median7), 'n'));
      tb.append(tr);
    });
  });
  dash.draw('tc-wow-note', (el) => {
    const rows = ok('tc_wow');
    const first = rows && rows.find((r) => r.prev_date);
    el.textContent = !rows ? '—' : first ? `前回（${first.prev_date}）からの差` : '記録は1回目のみ。次の記録から前回比が出ます';
  });
  dash.draw('tc-hist', (tb) => {
    const rows = ok('tc_weekly'); tb.replaceChildren(); if (!rows) return;
    rows.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).forEach((r) => {
      const tr = document.createElement('tr');
      tr.append(td(r.date), td(r.platform), td(fmt(r.followers), 'n'), td(fmt(r.posts), 'n'), td(fmt(r.total), 'n'), td(fmt(r.posts7), 'n'), td(fmt(r.views7), 'n'), td(r.memo, 'w'));
      tb.append(tr);
    });
  });

  dash.draw('tc-top', (tb) => {
    const rows = ok('tc_top'); tb.replaceChildren(); if (!rows) return;
    rows.forEach((r) => { const tr = document.createElement('tr'); tr.append(td(r.rank, 'n'), td(r.title, 'w'), td(fmt(r.views), 'n')); tb.append(tr); });
  });
})();
