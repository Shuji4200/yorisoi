// ---------- ホーム ----------
dash.draw('today', (el) => {
  el.textContent = d3.utcFormat('%Y/%m/%d')(Y.jstNow());
});
const tm = (f, fmt) => (el) => { const d = dash.data('this_month'); Y.setText(el, d.status, d.status === 'ok' ? (fmt || Y.fmt)(d.data[0][f]) : ''); };
dash.draw('k-seated', tm('seated'));
dash.draw('k-pace', tm('seated_pace'));
dash.draw('k-won25b', tm('won25'));
dash.draw('c-seated', tm('seated'));
dash.draw('c-seated-gap', tm('seated_gap'));
dash.draw('c-won25', tm('won25'));
dash.draw('c-won25-gap', tm('won25_gap'));
dash.draw('c-meet', tm('meetings'));
dash.draw('c-meet-prev', tm('prev_meetings'));

dash.draw('c-won', tm('won'));
dash.draw('c-lost', tm('lost'));
dash.draw('c-prop', tm('proposing'));
const scm = (f) => (el) => { const d = dash.data('sc_month'); Y.setText(el, d.status, d.status === 'ok' ? Y.fmt(d.data[0][f]) : ''); };
dash.draw('c-scclick', scm('clicks')); dash.draw('c-scimp', scm('impressions')); dash.draw('c-scprev', scm('prev_clicks'));
dash.draw('seo-c', scm('clicks')); dash.draw('seo-i', scm('impressions'));
['lg4', 'lg5'].forEach((n, i) => dash.draw(n, (el) => { el.style.background = dash.colors[i]; }));
dash.draw('sc-body', (tb) => Y.table(tb, 'sc_queries', [{f: 'query'}, {f: 'kind', pill: 1}, {f: 'clicks', num: 1, cls: 'n'}, {f: 'impressions', num: 1, cls: 'n'}, {f: 'position', cls: 'n'}], {key: 'query'}));
dash.draw('scchart', (el) => {
  const d = dash.data('sc_daily');
  el.replaceChildren();
  if (d.status !== 'ok') { const s = document.createElement('div'); s.className = 'y-sub'; s.textContent = d.status === 'error' ? '読み込めませんでした' : '読み込み中…'; el.append(s); return; }
  const rows = d.data.map((r) => ({t: new Date(r.date + 'T00:00:00Z'), i: +r.impressions, c: +r.clicks, date: r.date})).sort((a, b) => a.t - b.t);
  const W = el.clientWidth || 320, H = 240, m = {t: 10, r: 30, b: 24, l: 34};
  const x = d3.scaleUtc().domain(d3.extent(rows, (r) => r.t)).range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain([0, d3.max(rows, (r) => r.i) || 1]).nice().range([H - m.b, m.t]);
  const y2 = d3.scaleLinear().domain([0, d3.max(rows, (r) => r.c) || 1]).nice().range([H - m.b, m.t]);
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', '日別の検索表示回数とクリック数');
  svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(W < 500 ? 4 : 8).tickFormat(d3.utcFormat('%m/%d')).tickSizeOuter(0));
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSizeOuter(0));
  svg.append('g').attr('transform', `translate(${W - m.r},0)`).call(d3.axisRight(y2).ticks(4).tickSizeOuter(0));
  svg.append('path').datum(rows).attr('fill', 'none').style('stroke', dash.colors[0]).attr('stroke-width', 2).attr('d', d3.line().x((r) => x(r.t)).y((r) => y(r.i)));
  svg.append('path').datum(rows).attr('fill', 'none').style('stroke', dash.colors[1]).attr('stroke-width', 2).attr('d', d3.line().x((r) => x(r.t)).y((r) => y2(r.c)));
  const tip = document.createElement('div'); tip.className = 'y-tip'; tip.hidden = true; el.append(tip);
  const ln = svg.append('line').attr('y1', m.t).attr('y2', H - m.b).style('stroke', 'var(--cds-chart-grid)').attr('visibility', 'hidden');
  svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', H - m.t - m.b).attr('fill', 'transparent')
    .on('pointermove', (ev) => {
      const [px] = d3.pointer(ev); const i = d3.bisector((r) => r.t).center(rows, x.invert(px)); const r = rows[i]; if (!r) return;
      ln.attr('x1', x(r.t)).attr('x2', x(r.t)).attr('visibility', 'visible');
      tip.hidden = false; tip.textContent = `${r.date.slice(5).replace('-', '/')}　表示 ${r.i}／クリック ${r.c}`;
      const b = el.getBoundingClientRect(); let lx = ev.clientX - b.left + 10; if (lx > b.width - 180) lx = Math.max(0, b.width - 190);
      tip.style.left = lx + 'px'; tip.style.top = '4px';
    }).on('pointerleave', () => { tip.hidden = true; ln.attr('visibility', 'hidden'); });
});

dash.draw('k-verdict', (el) => {
  const d = dash.data('this_month');
  if (d.status !== 'ok') { el.textContent = ''; return; }
  const r = d.data[0];
  el.textContent = r.seated >= r.seated_pace ? '着座はペースどおりに進んでいます。' : '着座は今日時点のペース目安を下回っています。';
  el.className = r.seated >= r.seated_pace ? 'y-ok' : 'y-warn';
});
const bar = (f, target) => (el) => {
  const d = dash.data('this_month');
  const v = d.status === 'ok' ? d.data[0][f] : 0;
  el.style.width = Math.min(100, 100 * v / target) + '%';
};
dash.draw('bar-seated', bar('seated', 40));
dash.draw('bar-won25', bar('won25', 8));
dash.draw('bar-meet', bar('meetings', 40));
const gm = (f) => (el) => { const d = dash.data('ga_month'); Y.setText(el, d.status, d.status === 'ok' ? Y.fmt(d.data[0][f]) : ''); };
dash.draw('c-cv', gm('cv'));
dash.draw('c-sess', gm('sessions'));
['lg0', 'lg1', 'lg2', 'lg3'].forEach((n, i) => dash.draw(n, (el) => { el.style.background = dash.colors[i % 2]; }));

dash.draw('funnel', (el) => {
  const all = window.Y_funnel === 'all';
  const src = all ? 'funnel_all' : 'pfunnel';
  const d0 = dash.data(src);
  const d = d0.status === 'ok' && d0.data && !all ? {status: 'ok', data: d0.data.filter((r) => r.period === window.Y_period)} : d0;
  const fcol = ['#9aa0aa', '#3b82f6', '#8b5cf6', '#f59e0b', '#22a06b'];
  el.replaceChildren();
  if (d.status !== 'ok' || !d.data) { const s = document.createElement('div'); s.className = 'y-sub'; s.style.gridColumn = '1/-1'; s.textContent = d.status === 'error' ? '読み込めませんでした' : '読み込み中…'; el.append(s); return; }
  const max = d3.max(d.data, (r) => r.value) || 1;
  d.data.forEach((r, i) => {
    const lab = document.createElement('div'); lab.textContent = r.step;
    const tr = document.createElement('div'); tr.className = 'y-ftrack';
    const fill = document.createElement('i'); fill.style.width = (100 * r.value / max) + '%'; fill.style.background = fcol[i % fcol.length]; tr.append(fill);
    const num = document.createElement('div'); num.className = 'y-fnum'; num.textContent = Y.fmt(r.value);
    num.dataset.source = src; num.dataset.field = 'value'; if (all) num.dataset.row = String(i); else num.dataset.where = 'period=' + r.period + '&step=' + encodeURIComponent(r.step);
    const rate = document.createElement('div'); rate.className = 'y-frate'; rate.textContent = r.rate == null ? (i ? '—' : '') : r.rate + '%';
    if (r.rate != null) { rate.dataset.source = src; rate.dataset.field = 'rate'; if (all) rate.dataset.row = String(i); else rate.dataset.where = 'period=' + r.period + '&step=' + encodeURIComponent(r.step); }
    el.append(lab, tr, num, rate);
  });
});

dash.draw('todo-count', (el) => { const d = dash.data('followups'); el.textContent = d.status === 'ok' ? d.data.length + '件' : ''; });
dash.draw('todo', (el) => {
  const d = dash.data('followups');
  el.replaceChildren();
  if (d.status !== 'ok' || !d.data) { const li = document.createElement('li'); li.className = 'y-empty'; li.textContent = d.status === 'error' ? '読み込めませんでした' : '読み込み中…'; el.append(li); return; }
  if (!d.data.length) { const li = document.createElement('li'); li.className = 'y-empty'; li.textContent = 'フォームが必要な商談はありません 🎉'; el.append(li); return; }
  d.data.slice(0, 8).forEach((r) => {
    const li = document.createElement('li');
    const a = document.createElement('span'); const link = document.createElement('a'); link.href = r.url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = r.company || '（会社名なし）'; link.style.color = 'inherit';
    a.append(link, document.createTextNode('　' + r.todo));
    const b = document.createElement('span'); b.textContent = r.status + '・' + r.days + '日前・' + (r.owner || '担当未設定');
    li.append(a, b); el.append(li);
  });
  if (d.data.length > 8) { const li = document.createElement('li'); li.className = 'y-sub'; li.textContent = 'ほか ' + (d.data.length - 8) + '件は「要フォロー」タブへ'; el.append(li); }
});

dash.draw('weekchart', (el) => {
  const d = dash.data('deals_week');
  el.replaceChildren();
  if (d.status !== 'ok') { const s = document.createElement('div'); s.className = 'y-sub'; s.textContent = d.status === 'error' ? '読み込めませんでした' : '読み込み中…'; el.append(s); return; }
  const rows = d.data.slice(-10).map((r) => ({week: r.week, meetings: +r.meetings, seated: +r.seated}));
  const W = el.clientWidth || 320, H = 230, m = {t: 10, r: 8, b: 26, l: 26};
  const x0 = d3.scaleBand().domain(rows.map((r) => r.week)).range([m.l, W - m.r]).padding(0.25);
  const x1 = d3.scaleBand().domain(['meetings', 'seated']).range([0, x0.bandwidth()]).padding(0.1);
  const y = d3.scaleLinear().domain([0, Math.max(12, d3.max(rows, (r) => r.meetings))]).nice().range([H - m.b, m.t]);
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', '週ごとの商談設定と着座の件数');
  svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x0).tickFormat((w) => w.slice(5).replace('-', '/')).tickSizeOuter(0))
    .selectAll('text').attr('display', (_, i) => (W < 480 && i % 2 ? 'none' : null));
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSizeOuter(0));
  svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(10)).attr('y2', y(10)).style('stroke', 'var(--cds-chart-reference)').attr('stroke-dasharray', '4 3');
  const tip = document.createElement('div'); tip.className = 'y-tip'; tip.hidden = true; el.append(tip);
  const g = svg.append('g').selectAll('g').data(rows).join('g').attr('transform', (r) => `translate(${x0(r.week)},0)`);
  g.selectAll('rect').data((r) => ['meetings', 'seated'].map((k) => ({k, v: r[k], r}))).join('rect')
    .attr('x', (o) => x1(o.k)).attr('width', x1.bandwidth()).attr('y', (o) => y(o.v)).attr('height', (o) => y(0) - y(o.v)).attr('rx', 2)
    .style('fill', (o) => (o.k === 'meetings' ? dash.colors[0] : dash.colors[1]))
    .on('pointerenter pointermove', (ev, o) => {
      tip.hidden = false; tip.textContent = `${o.r.week.slice(5).replace('-', '/')}〜の週　商談設定 ${o.r.meetings}件／着座 ${o.r.seated}件`;
      const b = el.getBoundingClientRect(); let lx = ev.clientX - b.left + 10; if (lx > b.width - 200) lx = Math.max(0, b.width - 210);
      tip.style.left = lx + 'px'; tip.style.top = Math.max(0, ev.clientY - b.top - 34) + 'px';
    }).on('pointerleave', () => { tip.hidden = true; });
});

dash.draw('channels', (el) => {
  const d = dash.data('deals_channel');
  el.replaceChildren();
  if (d.status !== 'ok') { const s = document.createElement('div'); s.className = 'y-sub'; s.textContent = d.status === 'error' ? '読み込めませんでした' : '読み込み中…'; el.append(s); return; }
  const ym = Y.ym();
  const rows = d.data.filter((r) => r.month === ym).sort((a, b) => b.meetings - a.meetings);
  if (!rows.length) { const s = document.createElement('div'); s.className = 'y-empty'; s.textContent = '今月の商談はまだありません'; el.append(s); return; }
  const max = d3.max(rows, (r) => +r.meetings) || 1;
  rows.forEach((r) => {
    const row = document.createElement('div'); row.className = 'y-hrow';
    const lab = document.createElement('div'); lab.textContent = r.channel || '未記入';
    const tr = document.createElement('div'); tr.className = 'y-ftrack';
    const f = document.createElement('i'); f.style.width = (100 * r.meetings / max) + '%'; f.style.background = dash.colors[0]; tr.append(f);
    const n = document.createElement('div'); n.className = 'y-sub';
    const a = document.createElement('b'); a.textContent = r.meetings; a.dataset.source = 'deals_channel'; a.dataset.field = 'meetings';
    a.dataset.where = 'month=' + encodeURIComponent(r.month) + '&channel=' + encodeURIComponent(r.channel ?? '');
    n.append(a, document.createTextNode('件・着座' + r.seated));
    row.append(lab, tr, n); el.append(row);
  });
});
