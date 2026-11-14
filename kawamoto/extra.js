// ---------- 公式LINE ----------
dash.loader('line_friends', {description: 'ファイルの rows を行として読みます。', fn: ({answer}) => ({data: answer.rows, columns: ['date', 'friends', 'reach', 'blocks'], meta: answer.meta})});

dash.calc('line_now', {
  title: '公式LINE：最新の友だち数と今月の増加', description: '最新日の友だち数・ターゲットリーチ・ブロックと、先月末からの増加数（日本時間の今月）。',
  inputs: ['line_friends'],
  fn: (line_friends) => {
    const rows = [...line_friends].sort((a, b) => (a.date < b.date ? -1 : 1));
    const last = rows[rows.length - 1];
    if (!last) return [];
    const m0 = last.date.slice(0, 7) + '-01';
    const base = [...rows].reverse().find((r) => r.date < m0) || rows[0];
    return [{date: last.date, friends: +last.friends, reach: +last.reach, blocks: +last.blocks,
      month_add: last.friends - base.friends, month_reach_add: last.reach - base.reach, month_block_add: last.blocks - base.blocks}];
  }
});
dash.calc('line_daily', {
  title: '公式LINE：日別の友だち数と増加', description: '日ごとの友だち数と、前日からの増加数。',
  inputs: ['line_friends'],
  fn: (line_friends) => {
    const rows = [...line_friends].sort((a, b) => (a.date < b.date ? -1 : 1));
    return rows.map((r, i) => ({date: r.date, friends: +r.friends, reach: +r.reach, blocks: +r.blocks, added: i ? r.friends - rows[i - 1].friends : 0}));
  }
});
dash.calc('line_monthly', {
  title: '公式LINE：月別の増加', description: '月ごとの月末の友だち数と、前月末からの増加（友だち・ターゲットリーチ・ブロック）。最初の月は取得開始日からの増加。',
  inputs: ['line_friends'],
  fn: (line_friends) => {
    const rows = [...line_friends].sort((a, b) => (a.date < b.date ? -1 : 1));
    const months = d3.groups(rows, (r) => r.date.slice(0, 7));
    let prev = rows[0];
    return months.map(([month, v]) => {
      const end = v[v.length - 1];
      const out = {month, friends: end.friends, reach: end.reach, blocks: end.blocks, added: end.friends - prev.friends, reach_added: end.reach - prev.reach, blocks_added: end.blocks - prev.blocks};
      prev = end; return out;
    }).reverse();
  }
});

// ---------- 施策一覧 ----------
dash.calc('activities', {
  title: '施策一覧', description: '施策ログ・PR TIMESの配信・法人向けSNSの公開投稿（日×アカウントでまとめる）・分析レポートを、日付順の1つの一覧にまとめます。PR配信の目的はタイトルに「転職.com」を含むものを転職.com、それ以外を法人リードとしています。',
  inputs: ['measures', 'prtimes', 'sns_posts', 'analyses'],
  fn: (measures, prtimes, sns_posts, analyses) => {
    const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    const out = [];
    for (const m of measures) out.push({key: 'log:' + m.url, date: m.d, kind: '施策ログ', purpose: m.purpose || '', channel: m.channel || '', title: m.name, detail: m.memo || '', url: m.url, owner: m.owner || ''});
    for (const p of prtimes) out.push({key: 'pr:' + p.no, date: String(p.published).slice(0, 10), kind: 'PR配信', purpose: /転職\.com/.test(p.title) ? '転職.com' : '法人リード', channel: 'PR TIMES', title: p.title, detail: 'PR TIMES No.' + p.no, url: p.url, owner: ''});
    const pub = sns_posts.filter((s) => s.state === 'PUBLISHED' && String(s.date).slice(0, 10) <= today);
    for (const [k, v] of d3.groups(pub, (s) => String(s.date).slice(0, 10) + '|' + s.account)) {
      const [date, account] = k.split('|');
      out.push({key: 'sns:' + k, date, kind: 'SNS投稿', purpose: '法人リード', channel: account, title: account + ' に ' + v.length + '件投稿', detail: v.map((s) => s.text).join(' ／ '), url: '', owner: ''});
    }
    for (const a of analyses) out.push({key: 'an:' + a.url, date: a.d, kind: '分析', purpose: a.purpose || '', channel: '', title: a.title, detail: a.conclusion || '', url: a.url, owner: ''});
    return out.filter((r) => r.date).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }
});
dash.calc('activities_month', {
  title: '今月の施策の件数', description: '施策一覧のうち日本時間の今月分を、種類ごとに数えます（SNS投稿は投稿件数）。',
  inputs: ['activities', 'sns_posts'],
  fn: (activities, sns_posts) => {
    const ym = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 7);
    const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    const cur = activities.filter((r) => r.date.slice(0, 7) === ym);
    return [{
      pr: cur.filter((r) => r.kind === 'PR配信').length,
      sns: sns_posts.filter((s) => s.state === 'PUBLISHED' && String(s.date).slice(0, 7) === ym && String(s.date).slice(0, 10) <= today).length,
      log: cur.filter((r) => r.kind === '施策ログ').length,
      analysis: cur.filter((r) => r.kind === '分析').length
    }];
  }
});

// ---------- 描画 ----------
const ySet = (src, f) => (el) => { const d = dash.data(src); Y.setText(el, d.status, d.status === 'ok' && d.data && d.data[0] ? Y.fmt(d.data[0][f]) : ''); };
const ySigned = (src, f) => (el) => { const d = dash.data(src); const v = d.status === 'ok' && d.data && d.data[0] ? d.data[0][f] : null; Y.setText(el, d.status, v == null ? '' : (v > 0 ? '+' : '') + Y.fmt(v)); };
dash.draw('l-friends', ySet('line_now', 'friends'));
dash.draw('l-add', ySigned('line_now', 'month_add'));
dash.draw('l-reach', ySet('line_now', 'reach'));
dash.draw('l-blocks', ySet('line_now', 'blocks'));
dash.draw('l-date', (el) => { const d = dash.data('line_now'); el.textContent = d.status === 'ok' && d.data && d.data[0] ? d.data[0].date.replace(/-/g, '/') : ''; });
dash.draw('lt-friends', ySet('line_now', 'friends'));
dash.draw('lt-add', ySigned('line_now', 'month_add'));
dash.draw('lt-reach', ySigned('line_now', 'month_reach_add'));
dash.draw('lt-block', ySigned('line_now', 'month_block_add'));
['lg6', 'lg7'].forEach((n, i) => dash.draw(n, (el) => { el.style.background = dash.colors[i]; }));
dash.draw('line-month-body', (tb) => Y.table(tb, 'line_monthly', [{f: 'month'}, {f: 'friends', num: 1, cls: 'n'}, {f: 'added', num: 1, cls: 'n'}, {f: 'reach', num: 1, cls: 'n'}, {f: 'reach_added', num: 1, cls: 'n'}, {f: 'blocks_added', num: 1, cls: 'n'}], {key: 'month'}));

dash.draw('linechart', (el) => {
  const d = dash.data('line_daily');
  el.replaceChildren();
  if (d.status !== 'ok' || !d.data || !d.data.length) { const s = document.createElement('div'); s.className = 'y-sub'; s.textContent = d.status === 'error' ? '読み込めませんでした' : '読み込み中…'; el.append(s); return; }
  const rows = d.data.map((r) => ({...r, t: new Date(r.date + 'T00:00:00Z')}));
  const W = el.clientWidth || 320, H = 240, m = {t: 10, r: 30, b: 24, l: 40};
  const x = d3.scaleUtc().domain(d3.extent(rows, (r) => r.t)).range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain(d3.extent(rows, (r) => r.friends)).nice().range([H - m.b, m.t]);
  const y2 = d3.scaleLinear().domain([Math.min(0, d3.min(rows, (r) => r.added)), Math.max(3, d3.max(rows, (r) => r.added))]).nice().range([H - m.b, m.t]);
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', '公式LINEの友だち数の推移と日ごとの増加');
  svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(W < 500 ? 4 : 8).tickFormat(d3.utcFormat('%m/%d')).tickSizeOuter(0));
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(',')).tickSizeOuter(0));
  svg.append('g').attr('transform', `translate(${W - m.r},0)`).call(d3.axisRight(y2).ticks(4).tickSizeOuter(0));
  const bw = Math.max(1, (W - m.l - m.r) / rows.length - 1);
  svg.append('g').selectAll('rect').data(rows).join('rect').attr('x', (r) => x(r.t) - bw / 2).attr('width', bw)
    .attr('y', (r) => y2(Math.max(0, r.added))).attr('height', (r) => Math.abs(y2(r.added) - y2(0))).style('fill', dash.colors[1]).attr('opacity', 0.7);
  svg.append('path').datum(rows).attr('fill', 'none').style('stroke', dash.colors[0]).attr('stroke-width', 2).attr('d', d3.line().x((r) => x(r.t)).y((r) => y(r.friends)));
  const tip = document.createElement('div'); tip.className = 'y-tip'; tip.hidden = true; el.append(tip);
  svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', Math.max(0, W - m.l - m.r)).attr('height', H - m.t - m.b).attr('fill', 'transparent')
    .on('pointermove', (ev) => {
      const [px] = d3.pointer(ev); const r = rows[d3.bisector((q) => q.t).center(rows, x.invert(px))]; if (!r) return;
      tip.hidden = false; tip.textContent = `${r.date.slice(5).replace('-', '/')}　友だち ${d3.format(',')(r.friends)}（${r.added >= 0 ? '+' : ''}${r.added}）`;
      const b = el.getBoundingClientRect(); let lx = ev.clientX - b.left + 10; if (lx > b.width - 200) lx = Math.max(0, b.width - 210);
      tip.style.left = lx + 'px'; tip.style.top = '4px';
    }).on('pointerleave', () => { tip.hidden = true; });
});

// 施策一覧
const actFilter = (r) => (!window.Y_actPurpose || r.purpose === window.Y_actPurpose) && (!window.Y_actKind || r.kind === window.Y_actKind);
dash.draw('act-purpose', (sel) => {
  const opts = ['', '法人リード', '広報・ブランディング', '転職.com', '全体'];
  sel.replaceChildren(...opts.map((o) => new Option(o || '目的：すべて', o)));
  sel.value = window.Y_actPurpose || '';
  sel.onchange = () => { window.Y_actPurpose = sel.value; dash.draw('act-body'); dash.draw('act-count'); };
});
dash.draw('act-kind', (sel) => {
  const opts = ['', '施策ログ', 'PR配信', 'SNS投稿', '分析'];
  sel.replaceChildren(...opts.map((o) => new Option(o || '種類：すべて', o)));
  sel.value = window.Y_actKind || '';
  sel.onchange = () => { window.Y_actKind = sel.value; dash.draw('act-body'); dash.draw('act-count'); };
});
dash.draw('act-count', (el) => { const d = dash.data('activities'); el.textContent = d.status === 'ok' && d.data ? d.data.filter(actFilter).length + '件' : ''; });
dash.draw('act-body', (tb) => Y.table(tb, 'activities', [{f: 'date', cls: 'n'}, {f: 'kind', pill: 1}, {f: 'purpose'}, {f: 'channel'}, {f: 'title', link: 'url'}, {f: 'detail', cls: 'w'}], {key: 'key', filter: actFilter}));
dash.draw('act-recent', (tb) => Y.table(tb, 'activities', [{f: 'date', cls: 'n'}, {f: 'kind', pill: 1}, {f: 'purpose'}, {f: 'title', link: 'url'}], {key: 'key', filter: (() => { let n = 0; return () => n++ < 8; })()}));
['am-pr:pr', 'am-sns:sns', 'am-log:log', 'am-an:analysis'].forEach((s) => { const [n, f] = s.split(':'); dash.draw(n, ySet('activities_month', f)); });
