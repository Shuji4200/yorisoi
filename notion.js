// ---------- Notion（ビューで取得：SQLの利用上限を使わない） ----------
const notionPages = async ({answer, call, args}) => {
  let page = typeof answer === 'string' ? JSON.parse(answer) : answer;
  const out = [];
  for (let i = 0; i < 10; i++) {
    if (!page || page.error) throw new Error((page && (page.error.message || page.error)) || 'Notionから行が返りませんでした');
    out.push(...(page.results || []));
    if (!page.has_more || !page.next_cursor) return {rows: out, truncated: false};
    page = await call('notion-query-data-sources', {data: {...args.data, start_cursor: page.next_cursor}});
  }
  return {rows: out, truncated: true};
};
dash.loader('deals_all', {description: '商談DBのビュー（一覧）を全ページ読み、ダッシュボードで使う列だけの行にします。日時は日本時間に直し、契約金額は「25万円以上の成約か」の判定（won25）にだけ使って列には残しません。先方担当者などの個人情報の列も残しません。', fn: async (ctx) => {
  const {rows, truncated} = await notionPages(ctx);
  const jst = (s) => { if (!s) return null; if (s.length <= 10) return s; const d = new Date(new Date(s).getTime() + 9 * 3600e3); return d.toISOString().slice(0, 16).replace('T', ' '); };
  const data = rows.map((r) => ({
    url: r.url, company: r['会社名'] || '', status: r['ステータス'] || '', kind: r['問い合わせ区分'] || '',
    meeting_at: jst(r['date:商談日:start']), channel: r['流入経路'] || '', awareness: r['認知経路'] || '',
    services: r['検討サービス'] || '', contracted: r['サービス種別'] || '', owner: r['担当'] || '',
    seated: r['着座'] === '__YES__' ? 1 : 0, lost_reason: r['失注理由'] || '', next_action: r['次回アクション'] || '',
    next_due: r['date:次回期限:start'] ? String(r['date:次回期限:start']).slice(0, 10) : '',
    won25: r['ステータス'] === '成約' && +(r['契約金額'] || 0) >= 250000 && ['採用くん', '送客くん'].includes(r['サービス種別']) ? 1 : 0
  }));
  return {data, columns: ['url', 'company', 'status', 'kind', 'meeting_at', 'channel', 'awareness', 'services', 'contracted', 'owner', 'seated', 'lost_reason', 'next_action', 'next_due', 'won25'], truncated};
}});
dash.loader('measures', {description: '施策ログのビューを全ページ読み、表示する列の行にします。', fn: async (ctx) => {
  const {rows, truncated} = await notionPages(ctx);
  const data = rows.map((r) => ({url: r.url, d: r['date:実施日:start'] ? String(r['date:実施日:start']).slice(0, 10) : '', name: r['施策名'] || '', purpose: r['目的'] || '', channel: r['チャネル'] || '', campaign: r['キャンペーンID'] || '', owner: r['担当'] || '', memo: r['内容・結果メモ'] || ''}))
    .sort((a, b) => (a.d < b.d ? 1 : -1));
  return {data, columns: ['url', 'd', 'name', 'purpose', 'channel', 'campaign', 'owner', 'memo'], truncated};
}});
dash.loader('analyses', {description: '分析レポートのビューを全ページ読み、表示する列の行にします。', fn: async (ctx) => {
  const {rows, truncated} = await notionPages(ctx);
  const data = rows.map((r) => ({url: r.url, d: r['date:分析日:start'] ? String(r['date:分析日:start']).slice(0, 10) : '', title: r['タイトル'] || '', purpose: r['目的'] || '', status: r['ステータス'] || '', conclusion: r['結論'] || '', next: r['次のアクション'] || ''}))
    .sort((a, b) => (a.d < b.d ? 1 : -1));
  return {data, columns: ['url', 'd', 'title', 'purpose', 'status', 'conclusion', 'next'], truncated};
}});
dash.loader('weekly_reports', {description: '週次定例レポートのビューを全ページ読み、件数の列だけの行にします。', fn: async (ctx) => {
  const {rows, truncated} = await notionPages(ctx);
  const d10 = (s) => (s ? String(s).slice(0, 10) : '');
  const data = rows.map((r) => ({url: r.url, d: d10(r['date:定例日:start']), title: r['タイトル'] || '', period: d10(r['date:対象期間:start']) + (r['date:対象期間:end'] ? '〜' + d10(r['date:対象期間:end']) : ''), meetings: r['商談設定数'] ?? null, seated: r['着座数'] ?? null, seated_month: r['今月の着座累計'] ?? null, won: r['成約件数'] ?? null, status: r['ステータス'] || ''}))
    .sort((a, b) => (a.d < b.d ? 1 : -1));
  return {data, columns: ['url', 'd', 'title', 'period', 'meetings', 'seated', 'seated_month', 'won', 'status'], truncated};
}});

dash.calc('deals_month', {
  title: '商談：月別（法人）', description: '商談DBの法人の行を、商談日（日本時間）の月ごとに数えます：商談設定・着座・成約・25万円以上契約・失注・提案中。',
  inputs: ['deals_all'],
  fn: (deals_all) => d3.rollups(deals_all.filter((r) => r.kind === '法人' && r.meeting_at), (v) => ({
    meetings: v.length, seated: d3.sum(v, (r) => r.seated), won: v.filter((r) => r.status === '成約').length, won25: d3.sum(v, (r) => r.won25),
    lost: v.filter((r) => r.status === '失注').length, proposing: v.filter((r) => r.status === '提案中').length
  }), (r) => r.meeting_at.slice(0, 7)).map(([month, v]) => ({month, ...v})).sort((a, b) => (a.month < b.month ? -1 : 1))
});
dash.calc('deals_week', {
  title: '商談：週別（法人・木曜はじまり）', description: '商談DBの法人の行を、商談日（日本時間）の木曜はじまりの週ごとに数えます（直近12週）。',
  inputs: ['deals_all'],
  fn: (deals_all) => {
    const wk = (s) => { const d = new Date(s.slice(0, 10) + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 3) % 7)); return d.toISOString().slice(0, 10); };
    const since = new Date(Date.now() + 9 * 3600e3 - 84 * 86400e3).toISOString().slice(0, 10);
    return d3.rollups(deals_all.filter((r) => r.kind === '法人' && r.meeting_at && r.meeting_at.slice(0, 10) >= since), (v) => ({
      meetings: v.length, seated: d3.sum(v, (r) => r.seated), won: v.filter((r) => r.status === '成約').length
    }), (r) => wk(r.meeting_at)).map(([week, v]) => ({week, ...v})).sort((a, b) => (a.week < b.week ? -1 : 1));
  }
});
dash.calc('deals_channel', {
  title: '商談：流入経路別（法人）', description: '商談DBの法人の行を、商談月（日本時間）×流入経路ごとに数えます。',
  inputs: ['deals_all'],
  fn: (deals_all) => d3.rollups(deals_all.filter((r) => r.kind === '法人' && r.meeting_at), (v) => ({
    meetings: v.length, seated: d3.sum(v, (r) => r.seated), won: v.filter((r) => r.status === '成約').length
  }), (r) => r.meeting_at.slice(0, 7), (r) => r.channel || '未記入')
    .flatMap(([month, chs]) => chs.map(([channel, v]) => ({month, channel, ...v})))
});
dash.calc('deals_recent', {
  title: '商談一覧（直近45日〜）', description: '商談DBのうち、商談日（日本時間）が45日前以降の行を新しい順に並べます。',
  inputs: ['deals_all'],
  fn: (deals_all) => {
    const since = new Date(Date.now() + 9 * 3600e3 - 45 * 86400e3).toISOString().slice(0, 10);
    return deals_all.filter((r) => r.meeting_at && r.meeting_at.slice(0, 10) >= since)
      .map((r) => ({...r, seated: r.seated ? '済' : ''}))
      .sort((a, b) => (a.meeting_at < b.meeting_at ? 1 : -1));
  }
});
