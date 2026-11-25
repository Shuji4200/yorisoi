// ---------- 見やすさ：チャネル別の今月サマリー・リンクボタン ----------
dash.calc('channel_summary', {
  title: 'チャネル別サマリー（期間別）',
  description: '期間ごとに、HP・SNS・PR TIMES・公式LINE・検索・Wantedlyの代表的な数字を1つずつと、そのチャネルのネクストアクション件数を並べます。Wantedlyは管理画面の直近30日の値で、期間では変わりません。',
  inputs: ['pstats', 'wantedly_summary', 'next_actions'],
  fn: (pstats, wantedly_summary, next_actions) => {
    const ws = wantedly_summary[0] || {};
    const na = (c) => next_actions.filter((r) => r.channel === c).length;
    const hi = (c) => next_actions.filter((r) => r.channel === c && r.priority === '高').length;
    const f = (v) => d3.format(',')(v || 0);
    return pstats.flatMap((r) => [
      {ch: 'HP', tab: 'traffic', icon: '📈', label: 'フォーム送信', value: r.cv, unit: '件', sub: `セッション ${f(r.sessions)}`},
      {ch: 'SNS', tab: 'sns', icon: '💬', label: '公開投稿', value: r.sns_pub, unit: '件', sub: `SNS経由の流入 ${f(r.sns_sessions)}`},
      {ch: 'PR TIMES', tab: 'pr', icon: '📰', label: '配信本数', value: r.pr, unit: '本', sub: `PR TIMES経由の流入 ${f(r.pr_sessions)}`},
      {ch: '公式LINE', tab: 'line', icon: '💚', label: '友だち増加', value: r.line_add, unit: '人', sub: `合計 ${f(r.line_total)}人・ブロック ${r.line_block_add >= 0 ? '+' : ''}${r.line_block_add ?? '—'}`},
      {ch: '検索', tab: 'seo', icon: '🔍', label: '検索クリック', value: r.clicks, unit: '回', sub: `表示 ${f(r.impressions)}回`},
      {ch: 'Wantedly', tab: 'wantedly', icon: '💼', label: '応募（直近30日）', value: +(ws.applies || 0), unit: '件', sub: `未対応 ${ws.unhandled ?? '—'}人`}
    ].map((x) => ({...x, period: r.period, key: r.period + ':' + x.ch, actions: na(x.ch), high: hi(x.ch)})));
  }
});

dash.draw('chstrip', (el) => {
  const d = dash.data('channel_summary');
  el.replaceChildren();
  if (d.status !== 'ok' || !d.data) { const s = document.createElement('div'); s.className = 'y-sub'; s.textContent = d.status === 'error' ? '読み込めませんでした' : '読み込み中…'; el.append(s); return; }
  d.data.filter((r) => r.period === window.Y_period).forEach((r) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'y-ch c-' + r.tab;
    b.addEventListener('click', () => window.YGo && window.YGo(r.tab));
    const head = document.createElement('div'); head.className = 'y-ch-head';
    const name = document.createElement('span'); name.textContent = r.icon + ' ' + r.ch;
    head.append(name);
    if (r.actions) { const t = document.createElement('span'); t.className = 'y-ch-tag' + (r.high ? ' hot' : ''); t.textContent = '提案 ' + r.actions; head.append(t); }
    const lab = document.createElement('div'); lab.className = 'y-ch-label'; lab.textContent = r.label;
    const v = document.createElement('div'); v.className = 'y-ch-val';
    const n = document.createElement('b'); n.textContent = Y.fmt(r.value);
    n.dataset.source = 'channel_summary'; n.dataset.field = 'value'; n.dataset.where = 'period=' + r.period + '&ch=' + encodeURIComponent(r.ch);
    const u = document.createElement('span'); u.textContent = r.unit;
    v.append(n, u);
    const sub = document.createElement('div'); sub.className = 'y-sub'; sub.textContent = r.sub;
    b.append(head, lab, v, sub);
    el.append(b);
  });
});

// 「すべて見る」などのタブ移動ボタン（data-go）
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); window.YGo && window.YGo(b.dataset.go); }));
