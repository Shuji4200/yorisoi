// ---------- 月別レポート・今月の進捗 ----------
window.Y_month = window.Y_month || 'm0';
const RMd = (x) => (+x.slice(5, 7)) + '/' + (+x.slice(8, 10));
const RM = {
  rows: () => { const d = dash.data('pstats'); return d.status === 'ok' && d.data ? d.data : null; },
  months: () => { const r = RM.rows(); return r ? r.filter((x) => x.kind === 'month' && x.period !== 'm1s') : []; },
  cur: () => RM.months().find((x) => x.period === window.Y_month) || null,
  // 比べる相手：今月は「先月の同じ日まで」、過去の月は前の月
  prev: (r) => {
    const all = RM.rows() || [];
    if (r.current) return all.find((x) => x.period === 'm1s') || null;
    return all.find((x) => x.period === 'm' + (+r.period.slice(1) + 1)) || null;
  },
  f: (v) => (v == null ? '—' : Y.fmt(v)),
  pct: (a, b) => (b ? Math.round(100 * a / b) : null)
};
const R_DRAWS = ['r-months', 'r-title', 'r-lede', 'r-progress', 'r-cards', 'r-trend'];
window.YSetMonth = (id) => { window.Y_month = id; R_DRAWS.forEach((n) => dash.draw(n)); };

dash.draw('r-months', (el) => {
  el.replaceChildren();
  const ms = RM.months(); if (!ms.length) return;
  d3.groups(ms, (m) => m.start.slice(0, 4)).forEach(([y, list]) => {
    const yl = document.createElement('span'); yl.className = 'y-r-year'; yl.textContent = y + '年';
    el.append(yl);
    list.forEach((m) => {
      const b = document.createElement('button'); b.type = 'button';
      b.textContent = (+m.start.slice(5, 7)) + '月' + (m.current ? '（今月）' : '');
      b.setAttribute('aria-pressed', m.period === window.Y_month ? 'true' : 'false');
      b.addEventListener('click', () => window.YSetMonth(m.period));
      el.append(b);
    });
  });
});

dash.draw('r-title', (el) => { const r = RM.cur(); el.textContent = r ? `${r.title}のサマリー` : '月別レポート'; });

dash.draw('r-lede', (el) => {
  const r = RM.cur(); el.replaceChildren(); if (!r) return;
  const p = RM.prev(r);
  const t = document.createElement('span');
  t.textContent = r.current
    ? `${RMd(r.start)}〜${RMd(r.end)}の途中経過（${r.days}/${r.full_days}日）。前月比は「先月の同じ日まで」と比べています。`
    : `${RMd(r.start)}〜${RMd(r.end)}の月間実績。前月比は${p ? p.title : '前の月'}と比べています。`;
  el.append(t);
  if (r.sessions == null || r.ga_partial) {
    const n = document.createElement('span'); n.className = 'y-warn';
    n.textContent = r.ga_from ? ` GA4は${RMd(r.ga_from)}からのデータのため、この月のHP・SNS・PR TIMESの流入は${r.sessions == null ? '出せません' : '一部の日だけです'}。` : '';
    el.append(n);
  }
});

// 今月の進捗（今月を選んだとき）／達成状況（過去の月）
dash.draw('r-progress', (el) => {
  const r = RM.cur(); el.replaceChildren(); if (!r) return;
  const left = Math.max(0, r.full_days - r.days);
  const items = [['着座', r.seated, r.target_seated], ['送客くん・採用くんの成約', r.won25, r.target_won], ['商談設定', r.meetings, r.target_seated]];
  const head = document.createElement('div'); head.className = 'y-r-ph';
  const h = document.createElement('b'); h.textContent = r.current ? '今月の進捗' : '目標の達成状況';
  head.append(h);
  if (r.current) {
    const dbar = document.createElement('div'); dbar.className = 'y-r-days';
    const s = document.createElement('span'); s.textContent = `経過 ${r.days}日／${r.full_days}日（残り${left}日）`;
    const bar = document.createElement('div'); bar.className = 'y-bar'; const i = document.createElement('i'); i.style.width = (100 * r.days / r.full_days) + '%'; bar.append(i);
    dbar.append(s, bar); head.append(dbar);
  }
  el.append(head);
  const grid = document.createElement('div'); grid.className = 'y-r-pgrid';
  items.forEach(([name, v, tgt], k) => {
    const c = document.createElement('div'); c.className = 'y-r-pc';
    const l = document.createElement('div'); l.className = 'y-pk-l'; l.textContent = name + (k === 2 ? '（目安）' : '');
    const big = document.createElement('div'); big.className = 'y-pk-v';
    const b = document.createElement('b'); b.textContent = RM.f(v);
    const u = document.createElement('span'); u.textContent = `／ 目標 ${tgt}件`;
    big.append(b, u);
    const rate = RM.pct(v, tgt);
    const bar = document.createElement('div'); bar.className = 'y-bar'; const fill = document.createElement('i'); fill.style.width = Math.min(100, rate || 0) + '%'; bar.append(fill);
    if (r.current) { const mk = document.createElement('em'); mk.style.left = (100 * r.days / r.full_days) + '%'; mk.title = '今日時点の目安'; bar.append(mk); }
    const rows = [];
    if (r.current) {
      const pace = Math.round(tgt * r.days / r.full_days);
      const fc = r.days ? Math.round(v / r.days * r.full_days) : 0;
      const need = left ? Math.ceil(Math.max(0, tgt - v) / left * 10) / 10 : Math.max(0, tgt - v);
      rows.push([`達成率 ${rate}%`, rate >= 100 ? 'ok' : (v >= pace ? 'ok' : 'warn')],
        [`今日時点の目安 ${pace}件`, v >= pace ? 'ok' : 'warn'],
        [`このペースの着地 ${fc}件`, fc >= tgt ? 'ok' : 'warn'],
        [v >= tgt ? '目標達成' : `残り${tgt - v}件・1日あたり ${need}件`, v >= tgt ? 'ok' : 'plain']);
    } else {
      rows.push([`達成率 ${rate}%`, rate >= 100 ? 'ok' : 'warn'], [v >= tgt ? '目標達成' : `目標まであと${tgt - v}件`, v >= tgt ? 'ok' : 'plain']);
    }
    const tags = document.createElement('div'); tags.className = 'y-r-tags';
    rows.forEach(([txt, tone]) => { const t = document.createElement('span'); t.className = 'y-r-tag t-' + tone; t.textContent = txt; tags.append(t); });
    c.append(l, big, bar, tags); grid.append(c);
  });
  el.append(grid);
});

// サマリーカード（前月比つき）
const rDelta = (v, p, unit) => {
  const s = document.createElement('span'); s.className = 'y-r-delta';
  if (v == null || p == null) { s.classList.add('t-plain'); s.textContent = '前月比 —'; return s; }
  const d = v - p;
  s.classList.add(d > 0 ? 't-up' : d < 0 ? 't-down' : 't-plain');
  s.textContent = `${d > 0 ? '▲' : d < 0 ? '▼' : '±'}${Y.fmt(Math.abs(d))}${unit || ''}`;
  return s;
};
dash.draw('r-cards', (el) => {
  const r = RM.cur(); el.replaceChildren(); if (!r) return;
  const p = RM.prev(r) || {};
  const cards = [
    ['商談', '着座', 'seated', '件', `商談設定 ${RM.f(r.meetings)}件・失注 ${RM.f(r.lost)}件`, 'navy'],
    ['商談', '送客くん・採用くんの成約', 'won25', '件', `全成約 ${RM.f(r.won)}件（成約日で数える）`, 'green'],
    ['商談', '商談設定', 'meetings', '件', '商談日がこの月の法人商談', 'navy'],
    ['HP', 'フォーム送信', 'cv', '件', 'GA4キーイベント（営業・求職者も含む）', 'blue'],
    ['HP', 'HPセッション', 'sessions', '', 'yorisoi-hr.com 全体', 'blue'],
    ['検索', '検索クリック', 'clicks', '回', `表示 ${RM.f(r.impressions)}回`, 'teal'],
    ['SNS', 'SNS経由の流入', 'sns_sessions', 'セッション', `公開投稿 ${RM.f(r.sns_pub)}件・送信 ${RM.f(r.sns_cv)}件`, 'purple'],
    ['PR TIMES', 'PR TIMES経由の流入', 'pr_sessions', 'セッション', `配信 ${RM.f(r.pr)}本・送信 ${RM.f(r.pr_cv)}件`, 'orange'],
    ['公式LINE', '友だち増加', 'line_add', '人', r.line_until ? `ブロック +${RM.f(r.line_block_add)}・${(+r.line_until.slice(5, 7)) + '/' + (+r.line_until.slice(8, 10))}までのデータ` : 'データなし', 'green']
  ];
  cards.forEach(([ch, name, f, unit, sub, tone]) => {
    const c = document.createElement('div'); c.className = 'y-pk t-' + tone;
    const l = document.createElement('div'); l.className = 'y-pk-l'; l.textContent = `${ch}｜${name}`;
    const n = document.createElement('div'); n.className = 'y-pk-v';
    const b = document.createElement('b'); b.textContent = RM.f(r[f]);
    const u = document.createElement('span'); u.textContent = unit;
    n.append(b, u);
    const dl = document.createElement('div'); dl.className = 'y-r-dl';
    dl.append(rDelta(r[f], p[f], unit === 'セッション' ? '' : unit));
    const pv = document.createElement('span'); pv.className = 'y-sub'; pv.textContent = p.title ? `${r.current ? '先月同日' : '前月'} ${RM.f(p[f])}` : '';
    dl.append(pv);
    const s = document.createElement('div'); s.className = 'y-sub'; s.textContent = sub;
    c.append(l, n, dl, s); el.append(c);
  });
});

// 月別の推移（表）
dash.draw('r-trend', (el) => {
  const ms = RM.months(); el.replaceChildren(); if (!ms.length) return;
  const cols = [['月', null], ['商談設定', 'meetings'], ['着座', 'seated'], ['着座の達成率', 'rate'], ['送客くん・採用くん', 'won25'], ['全成約', 'won'], ['フォーム送信', 'cv'], ['HPセッション', 'sessions'], ['検索クリック', 'clicks'], ['SNS流入', 'sns_sessions'], ['PR配信', 'pr'], ['PR流入', 'pr_sessions'], ['LINE友だち増加', 'line_add']];
  const t = document.createElement('table'); t.className = 'y-table';
  const th = document.createElement('thead'); const hr = document.createElement('tr');
  cols.forEach(([c]) => { const x = document.createElement('th'); x.textContent = c; hr.append(x); });
  th.append(hr); t.append(th);
  const tb = document.createElement('tbody');
  ms.forEach((r) => {
    const tr = document.createElement('tr'); tr.className = 'y-go' + (r.period === window.Y_month ? ' y-r-sel' : '');
    tr.addEventListener('click', () => window.YSetMonth(r.period));
    cols.forEach(([c, f]) => {
      const td = document.createElement('td');
      if (!f) { td.textContent = r.title + (r.current ? `（${r.days}日目）` : ''); }
      else if (f === 'rate') { const v = RM.pct(r.seated, r.target_seated); td.className = 'n'; td.textContent = v == null ? '—' : v + '%'; if (v != null) td.classList.add(v >= 100 ? 'y-ok' : 'y-warn'); }
      else { td.className = 'n'; td.textContent = RM.f(r[f]); }
      tr.append(td);
    });
    tb.append(tr);
  });
  t.append(tb);
  const w = document.createElement('div'); w.className = 'y-tablewrap'; w.append(t);
  el.append(w);
});
