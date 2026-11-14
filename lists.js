// ---------- 一覧 ----------
dash.draw('deal-status', (sel) => {
  const opts = ['', '設定済', '着座', '提案中', '成約', '失注'];
  sel.replaceChildren(...opts.map((o) => new Option(o || 'ステータス：すべて', o)));
  sel.value = window.Y_dealStatus || '';
  sel.onchange = () => { window.Y_dealStatus = sel.value; dash.draw('deals-body'); dash.draw('deal-count'); };
});
dash.draw('deal-kind', (sel) => {
  const opts = ['', '法人', '営業・その他', '求職者'];
  sel.replaceChildren(...opts.map((o) => new Option(o || '区分：すべて', o)));
  sel.value = window.Y_dealKind || '';
  sel.onchange = () => { window.Y_dealKind = sel.value; dash.draw('deals-body'); dash.draw('deal-count'); };
});
const dealFilter = (r) => (!window.Y_dealStatus || r.status === window.Y_dealStatus) && (!window.Y_dealKind || r.kind === window.Y_dealKind);
dash.draw('deal-count', (el) => { const d = dash.data('deals_recent'); el.textContent = d.status === 'ok' ? d.data.filter(dealFilter).length + '件' : ''; });
dash.draw('deals-body', (tb) => Y.table(tb, 'deals_recent', [
  {f: 'meeting_at', cls: 'n'}, {f: 'company', link: 'url'}, {f: 'status', pill: 1}, {f: 'kind'}, {f: 'channel'}, {f: 'services', list: 1}, {f: 'owner'}, {f: 'lost_reason'}, {f: 'next_action', cls: 'w'}
], {key: 'url', filter: dealFilter}));
dash.draw('follow-body', (tb) => Y.table(tb, 'followups', [
  {f: 'meeting_at', cls: 'n'}, {f: 'company', link: 'url'}, {f: 'status', pill: 1}, {f: 'days', num: 1, cls: 'n'}, {f: 'todo'}, {f: 'owner'}, {f: 'next_due'}
], {key: 'url'}));
dash.draw('measures-body', (tb) => Y.table(tb, 'measures', [
  {f: 'd', cls: 'n'}, {f: 'name', link: 'url'}, {f: 'purpose', pill: 1}, {f: 'channel'}, {f: 'campaign'}, {f: 'owner'}, {f: 'memo', cls: 'w'}
], {key: 'url'}));
dash.draw('pr-total', (el) => { const d = dash.data('pr_ga'); Y.setText(el, d.status, d.status === 'ok' ? d.data.length : ''); });
dash.draw('pr-s', (el) => { const d = dash.data('pr_total'); Y.setText(el, d.status, d.status === 'ok' ? Y.fmt(d.data[0].sessions) : ''); });
dash.draw('pr-c', (el) => { const d = dash.data('pr_total'); Y.setText(el, d.status, d.status === 'ok' ? Y.fmt(d.data[0].cv) : ''); });
dash.draw('pr-body', (tb) => Y.table(tb, 'pr_ga', [
  {f: 'published', cls: 'n'}, {f: 'no', cls: 'n'}, {f: 'title', link: 'url', cls: 'w'}, {f: 'pv', num: 1, cls: 'n'}, {f: 'uu', num: 1, cls: 'n'}, {f: 'reprints', num: 1, cls: 'n'}, {f: 'sessions', num: 1, cls: 'n'}, {f: 'cv', num: 1, cls: 'n'}
], {key: 'no'}));
const ss = (f) => (el) => { const d = dash.data('sns_summary'); Y.setText(el, d.status, d.status === 'ok' ? d.data[0][f] : ''); };
dash.draw('sns-pub', ss('published')); dash.draw('sns-q', ss('queued')); dash.draw('sns-d', ss('drafts'));
dash.draw('sns-acc-body', (tb) => Y.table(tb, 'sns_accounts', [{f: 'account'}, {f: 'published', num: 1, cls: 'n'}, {f: 'queued', num: 1, cls: 'n'}, {f: 'drafts', num: 1, cls: 'n'}], {key: 'account'}));
dash.draw('sns-utm-body', (tb) => Y.table(tb, 'sns_utm', [{f: 'source'}, {f: 'sessions', num: 1, cls: 'n'}, {f: 'cv', num: 1, cls: 'n'}], {key: 'source'}));
dash.draw('sns-body', (tb) => Y.table(tb, 'sns_posts', [{f: 'date', cls: 'n'}, {f: 'account'}, {f: 'state', pill: 1}, {f: 'text', cls: 'w'}], {key: 'id'}));
dash.draw('ga-ch-body', (tb) => Y.table(tb, 'ga_channel', [{f: 'session_default_channel_group'}, {f: 'sessions', num: 1, cls: 'n'}, {f: 'conversions', num: 1, cls: 'n'}], {key: 'session_default_channel_group'}));
dash.draw('analysis-body', (tb) => Y.table(tb, 'analyses', [
  {f: 'd', cls: 'n'}, {f: 'title', link: 'url'}, {f: 'purpose', pill: 1}, {f: 'status'}, {f: 'conclusion', cls: 'w'}, {f: 'next', cls: 'w'}
], {key: 'url'}));
dash.draw('weekly-body', (tb) => Y.table(tb, 'weekly_reports', [
  {f: 'd', cls: 'n'}, {f: 'title', link: 'url'}, {f: 'period'}, {f: 'meetings', num: 1, cls: 'n'}, {f: 'seated', num: 1, cls: 'n'}, {f: 'seated_month', num: 1, cls: 'n'}, {f: 'won', num: 1, cls: 'n'}, {f: 'status'}
], {key: 'url'}));

dash.draw('gachart', (el) => {
  const d = dash.data('ga_daily');
  el.replaceChildren();
  if (d.status !== 'ok') { const s = document.createElement('div'); s.className = 'y-sub'; s.textContent = d.status === 'error' ? '読み込めませんでした' : '読み込み中…'; el.append(s); return; }
  const rows = d.data.map((r) => ({t: new Date(r.date + 'T00:00:00Z'), s: +r.sessions, c: +r.conversions, date: r.date})).sort((a, b) => a.t - b.t);
  const W = el.clientWidth || 320, H = 240, m = {t: 10, r: 30, b: 24, l: 32};
  const x = d3.scaleUtc().domain(d3.extent(rows, (r) => r.t)).range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain([0, d3.max(rows, (r) => r.s) || 1]).nice().range([H - m.b, m.t]);
  const y2 = d3.scaleLinear().domain([0, Math.max(5, d3.max(rows, (r) => r.c))]).nice().range([H - m.b, m.t]);
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', '日別のセッション数とフォーム送信数');
  svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(W < 500 ? 4 : 8).tickFormat(d3.utcFormat('%m/%d')).tickSizeOuter(0));
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSizeOuter(0));
  svg.append('g').attr('transform', `translate(${W - m.r},0)`).call(d3.axisRight(y2).ticks(4).tickSizeOuter(0));
  svg.append('path').datum(rows).attr('fill', 'none').style('stroke', dash.colors[0]).attr('stroke-width', 2).attr('d', d3.line().x((r) => x(r.t)).y((r) => y(r.s)));
  svg.append('path').datum(rows).attr('fill', 'none').style('stroke', dash.colors[1]).attr('stroke-width', 2).attr('d', d3.line().x((r) => x(r.t)).y((r) => y2(r.c)));
  const tip = document.createElement('div'); tip.className = 'y-tip'; tip.hidden = true; el.append(tip);
  const dot = svg.append('line').attr('y1', m.t).attr('y2', H - m.b).style('stroke', 'var(--cds-chart-grid)').attr('visibility', 'hidden');
  svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', H - m.t - m.b).attr('fill', 'transparent')
    .on('pointermove', (ev) => {
      const [px] = d3.pointer(ev); const t = x.invert(px); const i = d3.bisector((r) => r.t).center(rows, t); const r = rows[i]; if (!r) return;
      dot.attr('x1', x(r.t)).attr('x2', x(r.t)).attr('visibility', 'visible');
      tip.hidden = false; tip.textContent = `${r.date.slice(5).replace('-', '/')}　セッション ${r.s}／送信 ${r.c}`;
      const b = el.getBoundingClientRect(); let lx = ev.clientX - b.left + 10; if (lx > b.width - 180) lx = Math.max(0, b.width - 190);
      tip.style.left = lx + 'px'; tip.style.top = '4px';
    }).on('pointerleave', () => { tip.hidden = true; dot.attr('visibility', 'hidden'); });
});
