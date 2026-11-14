// ---------- 計算 ----------
dash.calc('this_month', {
  title: '今月のKPI（法人）', description: '商談DBの月別集計から、日本時間の今月と先月を取り出し、目標との差とペース目安を出します。目標：着座40件・25万円以上契約8件。',
  inputs: ['deals_month'],
  fn: (deals_month) => {
    const now = new Date(Date.now() + 9 * 3600e3);
    const ym = now.toISOString().slice(0, 7);
    const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
    const days = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
    const r = deals_month.find((x) => x.month === ym) || {};
    const p = deals_month.find((x) => x.month === prev) || {};
    const n = (v) => +(v || 0);
    return [{
      month: ym, meetings: n(r.meetings), seated: n(r.seated), won: n(r.won), won25: n(r.won25),
      lost: n(r.lost), proposing: n(r.proposing), prev_meetings: n(p.meetings),
      seated_gap: Math.max(0, 40 - n(r.seated)), won25_gap: Math.max(0, 8 - n(r.won25)),
      seated_pace: Math.round(40 * now.getUTCDate() / days)
    }];
  }
});

dash.calc('ga_month', {
  title: 'HPのセッションとフォーム送信（今月）', description: 'GA4の日別データのうち、日本時間の今月分を合計します。',
  inputs: ['ga_daily'],
  fn: (ga_daily) => {
    const ym = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 7);
    const rows = ga_daily.filter((r) => String(r.date).slice(0, 7) === ym);
    return [{month: ym, sessions: d3.sum(rows, (r) => +r.sessions), cv: d3.sum(rows, (r) => +r.conversions)}];
  }
});

dash.calc('funnel', {
  title: 'ファネル（今月）', description: 'GA4のフォーム送信と、商談DBの商談設定・着座・成約・25万円以上契約を並べ、前段からの移行率を出します。',
  inputs: ['ga_month', 'this_month'],
  fn: (ga_month, this_month) => {
    const g = ga_month[0] || {}; const t = this_month[0] || {};
    const steps = [
      {step: 'フォーム送信', value: +(g.cv || 0)},
      {step: '商談設定', value: +(t.meetings || 0)},
      {step: '着座', value: +(t.seated || 0)},
      {step: '成約', value: +(t.won || 0)},
      {step: '25万円以上', value: +(t.won25 || 0)}
    ];
    return steps.map((s, i) => ({...s, rate: i && steps[i - 1].value ? Math.round(1000 * s.value / steps[i - 1].value) / 10 : null}));
  }
});

dash.calc('followups', {
  title: '要フォローの商談', description: '着座・提案中で商談から3日以上たった行と、商談日を過ぎて「設定済」のままの法人の行。追客ルール（3・7・14日）に照らして「やること」を付けます。',
  inputs: ['deals_recent'],
  fn: (deals_recent) => {
    const now = Date.now() + 9 * 3600e3;
    const out = [];
    for (const r of deals_recent) {
      if (r.kind !== '法人' || !r.meeting_at) continue;
      const t = Date.parse(r.meeting_at.replace(' ', 'T') + ':00Z');
      const days = Math.floor((now - t) / 86400e3);
      let todo = null;
      if (r.status === '設定済' && days >= 1) todo = '結果を更新（着座／失注など）';
      else if ((r.status === '着座' || r.status === '提案中') && days >= 3) {
        todo = days >= 14 ? '14日後フォロー（判断を確認）' : days >= 7 ? '7日後フォロー' : '3日後フォロー（資料・日程）';
      }
      if (todo) out.push({url: r.url, company: r.company, status: r.status, meeting_at: r.meeting_at, days, todo, owner: r.owner, next_due: r.next_due});
    }
    return out.sort((a, b) => a.days - b.days);
  }
});

dash.calc('pr_ga', {
  title: 'PR TIMES記事 × 今月のHP流入', description: 'PR TIMES記事一覧に、GA4の utm_source=prtimes の今月のセッション・送信を utm_campaign（p＋記事番号）で結び付けます。',
  inputs: ['prtimes', 'ga_source'],
  fn: (prtimes, ga_source) => {
    const m = new Map();
    for (const g of ga_source) if (g.source === 'prtimes') {
      const k = g.campaign; const o = m.get(k) || {s: 0, c: 0}; o.s += +g.sessions; o.c += +g.conversions; m.set(k, o);
    }
    return prtimes.map((p) => ({no: p.no, published: p.published, title: p.title, url: p.url, pv: p.pv, uu: p.uu, reprints: p.reprints, sessions: (m.get(p.campaign) || {}).s || 0, cv: (m.get(p.campaign) || {}).c || 0}));
  }
});

dash.calc('pr_total', {
  title: 'PR TIMES経由の流入（今月）', description: 'GA4で参照元がprtimes／prtimes.jpのセッションと送信の合計。',
  inputs: ['ga_source'],
  fn: (ga_source) => {
    const r = ga_source.filter((g) => String(g.source).startsWith('prtimes'));
    return [{sessions: d3.sum(r, (g) => +g.sessions), cv: d3.sum(r, (g) => +g.conversions)}];
  }
});

dash.calc('sns_utm', {
  title: 'SNSプロフィールUTM別の流入（今月）', description: 'GA4で medium=social のセッションと送信を utm_source ごとに合計。',
  inputs: ['ga_source'],
  fn: (ga_source) => {
    const g = d3.rollups(ga_source.filter((r) => r.medium === 'social'), (v) => ({sessions: d3.sum(v, (r) => +r.sessions), cv: d3.sum(v, (r) => +r.conversions)}), (r) => r.source);
    return g.map(([source, v]) => ({source, ...v})).sort((a, b) => b.sessions - a.sessions);
  }
});

dash.calc('sns_posts', {
  title: 'YORISOI法人向けアカウントの投稿', description: 'Postizの投稿から、YORISOIの法人向けアカウント（X 河本・竹原代表、Threads yorisoi_hr.jp・bamboo_pegasasu、LinkedIn 河本、名前にYORISOIを含むもの）だけを残します。',
  inputs: ['postiz'],
  fn: (postiz) => {
    const map = {
      '河本｜YORISOI｜「渋谷を代表するHRカンパニー」へ。': 'X 河本',
      '竹原 甲斐斗｜株式会社YORISOI 代表取締役': 'X 竹原代表',
      'yorisoi_hr.jp': 'Threads yorisoi_hr.jp',
      'bamboo_pegasasu': 'Threads bamboo_pegasasu',
      '修司 河本': 'LinkedIn 河本'
    };
    return postiz
      .filter((p) => map[p.account_raw] || (/YORISOI|yorisoi/.test(p.account_raw) && !/pointaxis/.test(p.account_raw)))
      .map((p) => ({...p, account: map[p.account_raw] || p.account_raw}))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }
});

dash.calc('sns_accounts', {
  title: 'アカウント別の投稿数', description: '法人向けアカウントの投稿を状態（公開済・予約・下書き）ごとに数えます。',
  inputs: ['sns_posts'],
  fn: (sns_posts) => d3.rollups(sns_posts, (v) => ({
    published: v.filter((p) => p.state === 'PUBLISHED').length,
    queued: v.filter((p) => p.state === 'QUEUE').length,
    drafts: v.filter((p) => p.state === 'DRAFT').length
  }), (p) => p.account).map(([account, v]) => ({account, ...v})).sort((a, b) => b.published - a.published)
});

dash.calc('sns_summary', {
  title: 'SNS投稿の合計', description: '法人向けアカウントの投稿の状態別合計。',
  inputs: ['sns_posts'],
  fn: (sns_posts) => [{
    published: sns_posts.filter((p) => p.state === 'PUBLISHED').length,
    queued: sns_posts.filter((p) => p.state === 'QUEUE').length,
    drafts: sns_posts.filter((p) => p.state === 'DRAFT').length
  }]
});


dash.calc('sc_month', {
  title: '検索のクリック・表示（今月・先月）', description: 'サーチコンソールの日別データを、日本時間の今月と先月で合計します。',
  inputs: ['sc_daily'],
  fn: (sc_daily) => {
    const now = new Date(Date.now() + 9 * 3600e3);
    const ym = now.toISOString().slice(0, 7);
    const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
    const cur = sc_daily.filter((r) => String(r.date).slice(0, 7) === ym);
    const p = sc_daily.filter((r) => String(r.date).slice(0, 7) === prev);
    return [{month: ym, clicks: d3.sum(cur, (r) => +r.clicks), impressions: d3.sum(cur, (r) => +r.impressions), prev_clicks: d3.sum(p, (r) => +r.clicks)}];
  }
});
dash.loader('sc_daily', {description: 'Windsor.aiの応答（data配下）を行にします。集計中なら完了まで待ちます。', fn: async ({answer, call, args}) => {
  let a = answer;
  for (let i = 0; i < 20 && a && a.status === 'pending'; i++) a = await call('get_data', args, {poll: true});
  if (!a || !Array.isArray(a.data)) throw new Error((a && (a.message || a.error)) || 'Windsor.aiから行が返りませんでした');
  return a.data.map((r) => ({date: r.date, clicks: +r.clicks, impressions: +r.impressions}));
}});
dash.loader('sc_queries', {description: 'Windsor.aiの応答（data配下）を行にし、社名・サービス名を含む語を「指名」、それ以外を「一般」と分類します。', fn: async ({answer, call, args}) => {
  let a = answer;
  for (let i = 0; i < 20 && a && a.status === 'pending'; i++) a = await call('get_data', args, {poll: true});
  if (!a || !Array.isArray(a.data)) throw new Error((a && (a.message || a.error)) || 'Windsor.aiから行が返りませんでした');
  const brand = /yorisoi|よりそい|ヨリソイ|寄り添い|yorisou|採用くん|送客くん|竹原|転職ドットコム/i;
  return a.data.map((r) => ({query: r.query, kind: brand.test(r.query) ? '指名' : '一般', clicks: +r.clicks, impressions: +r.impressions, position: Math.round(+r.position * 10) / 10}))
    .sort((x, y) => y.clicks - x.clicks || y.impressions - x.impressions);
}});

// ---------- ローダー ----------
dash.loader('ga_daily', {description: 'Windsor.aiの応答（data配下）を行にします。集計中なら完了まで待ちます。', fn: async ({answer, call, args}) => {
  let a = answer;
  for (let i = 0; i < 20 && a && a.status === 'pending'; i++) a = await call('get_data', args, {poll: true});
  if (!a || !Array.isArray(a.data)) throw new Error((a && (a.message || a.error)) || 'Windsor.aiから行が返りませんでした');
  return a.data.map((r) => ({date: r.date, sessions: +r.sessions, users: +r.totalusers, conversions: +r.conversions}));
}});
dash.loader('ga_channel', {description: 'Windsor.aiの応答（data配下）を行にします。集計中なら完了まで待ちます。', fn: async ({answer, call, args}) => {
  let a = answer;
  for (let i = 0; i < 20 && a && a.status === 'pending'; i++) a = await call('get_data', args, {poll: true});
  if (!a || !Array.isArray(a.data)) throw new Error((a && (a.message || a.error)) || 'Windsor.aiから行が返りませんでした');
  return a.data.map((r) => ({session_default_channel_group: r.session_default_channel_group, sessions: +r.sessions, conversions: +r.conversions}));
}});
dash.loader('ga_source', {description: 'Windsor.aiの応答（data配下）を行にします。集計中なら完了まで待ちます。', fn: async ({answer, call, args}) => {
  let a = answer;
  for (let i = 0; i < 20 && a && a.status === 'pending'; i++) a = await call('get_data', args, {poll: true});
  if (!a || !Array.isArray(a.data)) throw new Error((a && (a.message || a.error)) || 'Windsor.aiから行が返りませんでした');
  return a.data.map((r) => ({source: r.source, medium: r.medium, campaign: r.campaign, sessions: +r.sessions, conversions: +r.conversions}));
}});
dash.loader('postiz', {description: 'Postizの投稿一覧（output.posts）を、日時・アカウント・媒体・状態・冒頭の行にします。', fn: ({answer}) => {
  const a = typeof answer === 'string' ? JSON.parse(answer) : answer;
  const posts = (a && a.output && a.output.posts) || (a && a.posts) || [];
  const strip = (h) => String(h || '').replace(/<\/p>|<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  return posts.map((p) => ({
    id: p.id, date: String(p.publishDate || '').replace('T', ' ').slice(0, 16), account_raw: p.integrationName, platform: p.platform,
    state: p.state, text: strip(p.content).split('\n').find((s) => s.trim()) || ''
  }));
}});
dash.loader('prtimes', {description: 'ファイルの rows を行として読みます。', fn: ({answer}) => ({data: answer.rows, columns: ['no', 'campaign', 'published', 'title', 'url', 'pv', 'uu', 'reprints', 'referrers'], meta: answer.meta})});
