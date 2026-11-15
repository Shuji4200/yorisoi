// ---------- 見やすさ：チャネル別の今月サマリー・リンクボタン ----------
dash.calc('channel_summary', {
  title: 'チャネル別の今月サマリー',
  description: 'HP・SNS・PR TIMES・公式LINE・検索・Wantedlyの代表的な数字を1つずつと、そのチャネルのネクストアクション件数を並べます（各数字の元は、各タブのデータと同じ）。',
  inputs: ['ga_month', 'sns_posts', 'sns_utm', 'pr_ga', 'pr_admin_total', 'line_now', 'sc_month', 'wantedly_summary', 'next_actions'],
  fn: (ga_month, sns_posts, sns_utm, pr_ga, pr_admin_total, line_now, sc_month, wantedly_summary, next_actions) => {
    const ym = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 7);
    const g = ga_month[0] || {}, l = line_now[0] || {}, sc = sc_month[0] || {}, ws = wantedly_summary[0] || {}, pa = pr_admin_total[0] || {};
    const na = (c) => next_actions.filter((r) => r.channel === c).length;
    const hi = (c) => next_actions.filter((r) => r.channel === c && r.priority === '高').length;
    const pub = sns_posts.filter((p) => p.state === 'PUBLISHED' && String(p.date).slice(0, 7) === ym).length;
    const prof = d3.sum(sns_utm, (r) => +r.sessions);
    const prMonth = pr_ga.filter((p) => String(p.published).slice(0, 7) === ym).length;
    return [
      {ch: 'HP', tab: 'traffic', icon: '📈', label: 'フォーム送信', value: +(g.cv || 0), unit: '件', sub: `セッション ${d3.format(',')(g.sessions || 0)}`},
      {ch: 'SNS', tab: 'sns', icon: '💬', label: '公開投稿', value: pub, unit: '件', sub: `SNS経由の流入 ${prof} セッション`},
      {ch: 'PR TIMES', tab: 'pr', icon: '📰', label: '今月の配信', value: prMonth, unit: '本', sub: `記事PV ${d3.format(',')(pa.pv || 0)}（9/1〜）`},
      {ch: '公式LINE', tab: 'line', icon: '💚', label: '友だち', value: +(l.friends || 0), unit: '人', sub: `今月 ${l.month_add >= 0 ? '+' : ''}${l.month_add ?? '—'}人`},
      {ch: '検索', tab: 'seo', icon: '🔍', label: '検索クリック', value: +(sc.clicks || 0), unit: '回', sub: `表示 ${d3.format(',')(sc.impressions || 0)}回`},
      {ch: 'Wantedly', tab: 'wantedly', icon: '💼', label: '応募（30日）', value: +(ws.applies || 0), unit: '件', sub: `未対応 ${ws.unhandled ?? '—'}人`}
    ].map((r) => ({...r, actions: na(r.ch), high: hi(r.ch)}));
  }
});

dash.draw('chstrip', (el) => {
  const d = dash.data('channel_summary');
  el.replaceChildren();
  if (d.status !== 'ok' || !d.data) { const s = document.createElement('div'); s.className = 'y-sub'; s.textContent = d.status === 'error' ? '読み込めませんでした' : '読み込み中…'; el.append(s); return; }
  d.data.forEach((r) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'y-ch';
    b.addEventListener('click', () => window.YGo && window.YGo(r.tab));
    const head = document.createElement('div'); head.className = 'y-ch-head';
    const name = document.createElement('span'); name.textContent = r.icon + ' ' + r.ch;
    head.append(name);
    if (r.actions) { const t = document.createElement('span'); t.className = 'y-ch-tag' + (r.high ? ' hot' : ''); t.textContent = '提案 ' + r.actions; head.append(t); }
    const lab = document.createElement('div'); lab.className = 'y-ch-label'; lab.textContent = r.label;
    const v = document.createElement('div'); v.className = 'y-ch-val';
    const n = document.createElement('b'); n.textContent = Y.fmt(r.value);
    n.dataset.source = 'channel_summary'; n.dataset.field = 'value'; n.dataset.where = 'ch=' + encodeURIComponent(r.ch);
    const u = document.createElement('span'); u.textContent = r.unit;
    v.append(n, u);
    const sub = document.createElement('div'); sub.className = 'y-sub'; sub.textContent = r.sub;
    b.append(head, lab, v, sub);
    el.append(b);
  });
});

// 「すべて見る」などのタブ移動ボタン（data-go）
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); window.YGo && window.YGo(b.dataset.go); }));
