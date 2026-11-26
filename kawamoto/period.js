// ---------- 期間の切り替え（月曜はじまりの週・今月・先月） ----------
dash.loader('ga_source_daily', {description: 'Windsor.aiの応答（data配下）を日別・参照元別の行にします。集計中なら完了まで待ちます。', fn: async ({answer, call, args}) => {
  let a = answer;
  for (let i = 0; i < 20 && a && a.status === 'pending'; i++) a = await call('get_data', args, {poll: true});
  if (!a || !Array.isArray(a.data)) throw new Error((a && (a.message || (a.error && (a.error.message || a.error)))) || 'Windsor.aiから行が返りませんでした');
  return a.data.map((r) => ({date: r.date, source: r.source, medium: r.medium, sessions: +r.sessions, conversions: +r.conversions}));
}});

const YD = {
  iso: (d) => d.toISOString().slice(0, 10),
  add: (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); },
  md: (s) => +s.slice(5, 7) + '/' + +s.slice(8, 10)
};

dash.calc('periods', {
  title: '選べる期間', description: '日本時間の今日を基準に、月曜はじまりの週（今週・先週・2週前・3週前）と、商談DBの最初の月から今月までの各月（最大12か月）の開始日・終了日を出します。今月の比較用に「先月の同じ日まで」も作ります。',
  inputs: ['line_friends', 'deals_all'],
  fn: (line_friends, deals_all) => {
    const today = YD.iso(new Date(Date.now() + 9 * 3600e3));
    const dow = new Date(today + 'T00:00:00Z').getUTCDay();
    const mon = YD.add(today, -((dow + 6) % 7));
    const m1 = today.slice(0, 8) + '01';
    const mStart = (s, back) => { let d = s; for (let i = 0; i < back; i++) d = YD.add(d, -1).slice(0, 8) + '01'; return d; };
    const mEnd = (s) => YD.add(new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7), 1)).toISOString().slice(0, 10), -1);
    const wk = (i, id, name) => { const s = YD.add(mon, -7 * i), e = i === 0 ? today : YD.add(s, 6); return {id, name, start: s, end: e, kind: 'week'}; };
    const first = d3.min(deals_all.filter((r) => r.meeting_at), (r) => String(r.meeting_at).slice(0, 7) + '-01') || m1;
    const rows = [wk(0, 'w0', '今週'), wk(1, 'w1', '先週'), wk(2, 'w2', '2週前'), wk(3, 'w3', '3週前')];
    for (let i = 0; i < 12; i++) {
      const s = mStart(m1, i);
      if (i > 1 && s < first) break;
      rows.push({id: 'm' + i, name: i === 0 ? '今月' : i === 1 ? '先月' : (+s.slice(5, 7)) + '月', start: s, end: i === 0 ? today : mEnd(s), kind: 'month', ym: s.slice(0, 7)});
    }
    const pm1 = mStart(m1, 1), dayN = +today.slice(8, 10);
    rows.push({id: 'm1s', name: '先月の同じ日まで', start: pm1, end: YD.add(pm1, Math.min(dayN, +mEnd(pm1).slice(8, 10)) - 1), kind: 'month', ym: pm1.slice(0, 7), hidden: true});
    return rows.map((p) => {
      const full = p.kind === 'month' ? +mEnd(p.start).slice(8, 10) : 7;
      const days = (Date.parse(p.end) - Date.parse(p.start)) / 864e5 + 1;
      const ttl = p.kind === 'month' ? `${p.start.slice(0, 4)}年${+p.start.slice(5, 7)}月` : p.name;
      return {...p, full_days: full, days, title: ttl, label: `${p.kind === 'month' && !p.hidden ? ttl : p.name}（${YD.md(p.start)}〜${YD.md(p.end)}）`, today};
    });
  }
});

const inP = (p, s) => { const d = String(s || '').slice(0, 10); return d && d >= p.start && d <= p.end; };

dash.calc('pstats', {
  title: '期間別の数字', description: '選べる期間ごとに、商談DB（商談日／成約日）・GA4（日別）・サーチコンソール（日別）・Postiz（投稿日）・PR TIMES（配信日）・公式LINE（日別の累計の差）を集計します。目標は月40件・週10件（着座・商談設定）、月8件・週2件（送客くん・採用くんの成約）。',
  inputs: ['periods', 'deals_all', 'ga_daily', 'sc_daily', 'sns_posts', 'prtimes', 'line_friends', 'ga_source_daily', 'report_extra'],
  fn: (periods, deals_all, ga_daily, sc_daily, sns_posts, prtimes, line_friends, ga_source_daily, report_extra) => {
    const law = deals_all.filter((r) => r.kind === '法人');
    const lf = [...line_friends].sort((a, b) => (a.date < b.date ? -1 : 1));
    const at = (d) => { let v = null; for (const r of lf) { if (r.date <= d) v = r; else break; } return v; };
    const gaFrom = d3.min(ga_daily, (r) => r.date), scFrom = d3.min(sc_daily, (r) => r.date), srcFrom = d3.min(ga_source_daily, (r) => r.date);
    const has = (from, p) => !!from && p.end >= from;
    return periods.map((p) => {
      const m = law.filter((r) => inP(p, r.meeting_at));
      // 商談設定は定例レポートと同じく、期間内に日程がある商談（今日より後の予定も含む）。先月同日比較用の行だけは同じ日まで
      const pFull = p.hidden ? p : {...p, end: YD.add(p.start, p.full_days - 1)};
      const mAll = law.filter((r) => inP(pFull, r.meeting_at));
      const ex = (report_extra || []).find((x) => x.period === p.id) || {};
      const won = law.filter((r) => r.status === '成約' && inP(p, r.closed_at));
      const g = ga_daily.filter((r) => inP(p, r.date)), s = sc_daily.filter((r) => inP(p, r.date));
      const src = ga_source_daily.filter((r) => inP(p, r.date));
      const e = at(p.end), b = at(YD.add(p.start, -1)) || lf[0];
      const tm = p.kind === 'month' ? 40 : 10, tw = p.kind === 'month' ? 8 : 2;
      const cur = p.end === p.today;
      return {
        period: p.id, label: p.label, kind: p.kind, start: p.start, end: p.end,
        meetings: mAll.length, seated: d3.sum(m, (r) => r.seated), lost: m.filter((r) => r.status === '失注').length,
        won: won.length, won25: d3.sum(won, (r) => r.won25),
        target_seated: tm, target_won: tw, pace_seated: cur ? Math.round(tm * p.days / p.full_days) : tm,
        ga_from: gaFrom, ga_partial: !!gaFrom && p.start < gaFrom && p.end >= gaFrom, sc_from: scFrom,
        sessions: has(gaFrom, p) ? d3.sum(g, (r) => r.sessions) : null, cv: has(gaFrom, p) ? d3.sum(g, (r) => r.conversions) : null,
        clicks: has(scFrom, p) ? d3.sum(s, (r) => r.clicks) : null, impressions: has(scFrom, p) ? d3.sum(s, (r) => r.impressions) : null,
        sns_pub: sns_posts.filter((x) => x.state === 'PUBLISHED' && inP(p, x.date)).length,
        sns_sessions: has(srcFrom, p) ? d3.sum(src.filter((r) => r.medium === 'social'), (r) => r.sessions) : null,
        sns_cv: has(srcFrom, p) ? d3.sum(src.filter((r) => r.medium === 'social'), (r) => r.conversions) : null,
        pr: prtimes.filter((x) => inP(p, x.published)).length,
        pr_pv: d3.sum(prtimes.filter((x) => inP(p, x.published)), (x) => +x.pv || 0),
        pr_sessions: has(srcFrom, p) ? d3.sum(src.filter((r) => String(r.source).startsWith('prtimes')), (r) => r.sessions) : null,
        pr_cv: has(srcFrom, p) ? d3.sum(src.filter((r) => String(r.source).startsWith('prtimes')), (r) => r.conversions) : null,
        days: p.days, full_days: p.full_days, current: cur && p.kind === 'month' && !p.hidden, ym: p.ym || null, title: p.title,
        line_add: e && b ? e.friends - b.friends : null, line_reach_add: e && b ? e.reach - b.reach : null, line_block_add: e && b ? e.blocks - b.blocks : null,
        line_total: e ? e.friends : null, line_until: e ? e.date : null, ...ex
      };
    });
  }
});

dash.calc('pfunnel', {
  title: 'ファネル（期間別）', description: '期間ごとに、フォーム送信（GA4）→商談設定→着座（商談日で数える）→成約→送客くん・採用くん（成約日で数える）を並べ、前段からの移行率を出します。',
  inputs: ['pstats'],
  fn: (pstats) => pstats.flatMap((r) => {
    const steps = [['フォーム送信', r.cv], ['商談設定', r.meetings], ['着座', r.seated], ['成約', r.won], ['送客くん・採用くん', r.won25]];
    return steps.map(([step, value], i) => ({period: r.period, step, value, rate: i && steps[i - 1][1] ? Math.round(1000 * value / steps[i - 1][1]) / 10 : null}));
  })
});

dash.calc('sns_acc_period', {
  title: 'アカウント別の投稿数（期間別）', description: '法人向けアカウントの投稿を、期間ごと・状態（公開済・予約・下書き）ごとに数えます。',
  inputs: ['periods', 'sns_posts'],
  fn: (periods, sns_posts) => periods.flatMap((p) => d3.rollups(sns_posts.filter((x) => inP(p, x.date)), (v) => ({
    published: v.filter((x) => x.state === 'PUBLISHED').length, queued: v.filter((x) => x.state === 'QUEUE').length, drafts: v.filter((x) => x.state === 'DRAFT').length
  }), (x) => x.account).map(([account, v]) => ({period: p.id, key: p.id + ':' + account, account, ...v})))
});

dash.calc('deals_sorted', {
  title: '商談一覧（新しい順）', description: '商談DBの全行を商談日の新しい順に並べます（期間で絞り込んで表示）。',
  inputs: ['deals_all'],
  fn: (deals_all) => deals_all.filter((r) => r.meeting_at).map((r) => ({...r, seated: r.seated ? '済' : ''})).sort((a, b) => (a.meeting_at < b.meeting_at ? 1 : -1))
});

// ---- 選択中の期間（既定は今月） ----
window.Y_period = window.Y_period || 'm0';
window.YInP = (s) => { const d = dash.data('periods'); if (d.status !== 'ok' || !d.data) return true; const p = d.data.find((x) => x.id === window.Y_period); return !p || inP(p, s); };
const YP = () => { const d = dash.data('pstats'); return d.status === 'ok' && d.data ? d.data.find((r) => r.period === window.Y_period) : null; };
const P_DRAWS = ['p-seg', 'p-label', 'p-lede', 'p-seated', 'p-seated-sub', 'p-bar-seated', 'p-won25', 'p-won25-sub', 'p-bar-won25', 'p-meet', 'p-meet-sub', 'p-bar-meet',
  'chstrip', 'funnel', 'f-summary', 'deals-body', 'deal-count', 'sns-body', 'sns-acc-body', 'p-sns', 'p-pr', 'p-line', 'p-seo', 'p-ga', 'p-deals'];
window.YSetPeriod = (id) => { window.Y_period = id; P_DRAWS.forEach((n) => dash.draw(n)); };

dash.draw('p-seg', (el) => {
  const d = dash.data('periods');
  el.replaceChildren();
  if (d.status !== 'ok' || !d.data) return;
  d.data.filter((p) => ['w0', 'w1', 'w2', 'w3', 'm0', 'm1'].includes(p.id)).forEach((p) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = p.name;
    b.title = p.label; b.setAttribute('aria-pressed', p.id === window.Y_period ? 'true' : 'false');
    b.addEventListener('click', () => window.YSetPeriod(p.id));
    el.append(b);
  });
});
dash.draw('p-label', (el) => { const r = YP(); el.textContent = r ? r.label : ''; });

const pNum = (f, fmt) => (el) => {
  const d = dash.data('pstats'); const r = YP();
  Y.setText(el, d.status, r ? (fmt ? fmt(r[f]) : Y.fmt(r[f])) : '');
};
const pBar = (f, t) => (el) => { const r = YP(); el.style.width = r ? Math.min(100, 100 * r[f] / r[t]) + '%' : '0'; };
dash.draw('p-seated', pNum('seated'));
dash.draw('p-won25', pNum('won25'));
dash.draw('p-meet', pNum('meetings'));
dash.draw('p-bar-seated', pBar('seated', 'target_seated'));
dash.draw('p-bar-won25', pBar('won25', 'target_won'));
dash.draw('p-bar-meet', pBar('meetings', 'target_seated'));
dash.draw('p-seated-sub', (el) => { const r = YP(); el.textContent = r ? `目標 ${r.target_seated}件 ・ 残り ${Math.max(0, r.target_seated - r.seated)}件` + (r.pace_seated < r.target_seated ? ` ・ 今日時点の目安 ${r.pace_seated}件` : '') : ''; });
dash.draw('p-won25-sub', (el) => { const r = YP(); el.textContent = r ? `目標 ${r.target_won}件 ・ 残り ${Math.max(0, r.target_won - r.won25)}件 ・ 全成約 ${r.won}件` : ''; });
dash.draw('p-meet-sub', (el) => { const r = YP(); el.textContent = r ? `目安 ${r.target_seated}件 ・ 失注 ${r.lost}件` : ''; });
dash.draw('p-lede', (el) => {
  const r = YP(); if (!r) { el.textContent = ''; return; }
  const ok = r.seated >= r.pace_seated;
  el.replaceChildren();
  const t = document.createElement('span'); t.textContent = `${r.label}：着座 ${r.seated}件（目標${r.target_seated}件）、送客くん・採用くんの成約 ${r.won25}件（目標${r.target_won}件）。`;
  const v = document.createElement('span'); v.className = ok ? 'y-ok' : 'y-warn'; v.textContent = ok ? '着座はペースどおりです。' : '着座は目安を下回っています。';
  el.append(t, v);
});

// 各タブの「期間の数字」行
const pRow = (items) => (el) => {
  const r = YP(); el.replaceChildren(); if (!r) return;
  items(r).forEach(([label, v, unit, sub, tone]) => {
    const c = document.createElement('div'); c.className = 'y-pk' + (tone ? ' t-' + tone : '');
    const l = document.createElement('div'); l.className = 'y-pk-l'; l.textContent = label;
    const n = document.createElement('div'); n.className = 'y-pk-v';
    const b = document.createElement('b'); b.textContent = v == null ? '—' : (typeof v === 'number' ? Y.fmt(v) : v);
    const u = document.createElement('span'); u.textContent = unit || '';
    n.append(b, u); c.append(l, n);
    if (sub) { const s = document.createElement('div'); s.className = 'y-sub'; s.textContent = sub; c.append(s); }
    el.append(c);
  });
};
const sg = (v) => (v == null ? null : (v > 0 ? '+' : '') + Y.fmt(v));
dash.draw('p-ga', pRow((r) => [['フォーム送信', r.cv, '件', 'GA4キーイベント', 'blue'], ['セッション', r.sessions, '', '', 'blue']]));
dash.draw('p-sns', pRow((r) => [['公開投稿', r.sns_pub, '件', '法人向けアカウント', 'purple'], ['SNS経由の流入', r.sns_sessions, 'セッション', 'GA4・medium=social', 'purple'], ['SNS経由の送信', r.sns_cv, '件', '', 'purple']]));
dash.draw('p-pr', pRow((r) => [['配信本数', r.pr, '本', '配信日が期間内', 'orange'], ['その記事のPV', r.pr_pv, '', '9/1〜の累計', 'orange'], ['PR TIMES経由の流入', r.pr_sessions, 'セッション', 'GA4', 'orange'], ['PR TIMES経由の送信', r.pr_cv, '件', '', 'orange']]));
dash.draw('p-line', pRow((r) => [['友だち増加', sg(r.line_add), '人', r.line_until ? `${YD.md(r.line_until)}までのデータ` : '', 'green'], ['ターゲットリーチ増加', sg(r.line_reach_add), '人', '配信できる人数', 'green'], ['ブロック増加', sg(r.line_block_add), '人', '', 'gray'], ['合計（参考）', r.line_total, '人', '', 'gray']]));
dash.draw('p-seo', pRow((r) => [['検索クリック', r.clicks, '回', '2〜3日遅れて反映', 'teal'], ['検索表示', r.impressions, '回', '', 'teal']]));
dash.draw('p-deals', pRow((r) => [['商談設定', r.meetings, '件', '商談日が期間内', 'navy'], ['着座', r.seated, '件', '', 'navy'], ['成約', r.won, '件', '成約日が期間内', 'green'], ['送客くん・採用くん', r.won25, '件', '', 'green'], ['失注', r.lost, '件', '', 'gray']]));
