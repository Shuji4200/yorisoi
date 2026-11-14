// ---------- 施策マップ（施策マスター × 各データ） ----------
dash.loader('initiatives', {description: 'ファイルの rows を行として読みます。', fn: ({answer}) => ({data: answer.rows, columns: ['no', 'axis', 'name', 'metric', 'tab'], meta: answer.meta})});

dash.calc('initiative_map', {
  title: '施策マップ（施策ごとの今月の数字）', description: '施策マスターの24施策それぞれに、今月（日本時間）の代表的な数字を1つ付けます。SNSは「プロフィールUTM経由のHP流入（GA4）」と「Postizの公開投稿数」、PR TIMESは流入とリリース本数、商談はNotion商談DB。データがない施策は「未計測」。',
  inputs: ['initiatives', 'ga_month', 'ga_source', 'sns_posts', 'line_now', 'pr_total', 'activities_month', 'this_month', 'deals_all', 'deals_recent', 'sc_month', 'analyses', 'weekly_reports', 'measures', 'wantedly_summary', 'pr_admin_total'],
  fn: (initiatives, ga_month, ga_source, sns_posts, line_now, pr_total, activities_month, this_month, deals_all, deals_recent, sc_month, analyses, weekly_reports, measures, wantedly_summary, pr_admin_total) => {
    const ws = wantedly_summary[0] || {}, pa = pr_admin_total[0] || {};
    const now = new Date(Date.now() + 9 * 3600e3);
    const ym = now.toISOString().slice(0, 7);
    const today = now.toISOString().slice(0, 10);
    const sess = (re) => d3.sum(ga_source.filter((r) => re.test(String(r.source))), (r) => +r.sessions);
    const posts = (re) => sns_posts.filter((p) => re.test(p.account) && p.state === 'PUBLISHED' && String(p.date).slice(0, 7) === ym && String(p.date).slice(0, 10) <= today).length;
    const g = ga_month[0] || {}, t = this_month[0] || {}, l = line_now[0] || {}, pt = pr_total[0] || {}, am = activities_month[0] || {}, sc = sc_month[0] || {};
    const mine = deals_all.filter((r) => r.kind === '法人' && r.meeting_at && r.meeting_at.slice(0, 7) === ym);
    const wk = [...weekly_reports].sort((a, b) => (a.d < b.d ? 1 : -1))[0];
    const utmRows = ga_source.filter((r) => /social|referral|press_release|article/.test(r.medium) && r.campaign && !/^\(/.test(r.campaign));
    const M = {
      form_cv: () => [g.cv, '件', 'HPフォーム送信（GA4・営業/求職者含む）'],
      line: () => [l.friends, '人', '友だち数・今月' + (l.month_add >= 0 ? '+' : '') + (l.month_add ?? '—') + '人'],
      x_kawamoto: () => [sess(/^x_kawamoto$/), 'セッション', 'プロフUTM経由・今月の投稿 ' + posts(/^X 河本$/) + '件'],
      x_takehara: () => [sess(/^x_takehara$/), 'セッション', 'プロフUTM経由・今月の投稿 ' + posts(/^X 竹原/) + '件'],
      x_article: () => [null, '', 'X記事の閲覧数は未接続'],
      threads: () => [sess(/^threads/), 'セッション', 'プロフUTM経由・今月の投稿 ' + posts(/^Threads/) + '件'],
      linkedin: () => [posts(/^LinkedIn/), '件', '今月の投稿（流入UTMは未設定）'],
      prtimes: () => [pt.sessions, 'セッション', 'PR TIMES経由・今月のリリース ' + (am.pr ?? 0) + '本・送信 ' + (pt.cv ?? 0) + '件・記事PV ' + Y.fmt(pa.pv) + '（9/1〜）'],
      x_official: () => [sess(/^x_(yorisoi|horikoshi)$/), 'セッション', 'プロフUTM経由（公式X・堀越）'],
      deals_record: () => [t.seated, '件', '着座（目標40）・商談設定 ' + (t.meetings ?? 0) + '件'],
      owner_split: () => [mine.length, '件', '河本 ' + mine.filter((r) => r.owner === '河本').length + '件・竹原 ' + mine.filter((r) => r.owner === '竹原').length + '件'],
      crm: () => [deals_recent.filter((r) => r.kind === '法人' && r.meeting_at && r.meeting_at.slice(0, 10) <= today && !r.awareness).length, '件', '認知経路が未記入の商談（直近45日）'],
      contracts: () => [t.won25, '件', '送客くん・採用くんの成約（目標8）・全成約 ' + (t.won ?? 0) + '件'],
      note: () => [sess(/note/), 'セッション', 'note経由のHP流入'],
      wantedly: () => [ws.applies, '件', '応募（直近30日）・募集PV ' + Y.fmt(ws.job_pv) + '・未対応 ' + (ws.unhandled ?? '—') + '人・HP流入 ' + sess(/wantedly/)],
      hp_blog: () => [sc.clicks, 'クリック', 'Google検索・表示 ' + (sc.impressions ?? 0) + '回'],
      tenshoku: () => [null, '', '転職.com系アカウントのデータ未接続'],
      analysis: () => [analyses.filter((a) => String(a.d).slice(0, 7) === ym).length, '件', '今月の分析レポート'],
      utm: () => [d3.sum(utmRows, (r) => +r.sessions), 'セッション', 'UTM付きの流入・' + new Set(utmRows.map((r) => r.source)).size + '種類の参照元'],
      postiz: () => [am.sns, '件', '今月の公開投稿（法人向けアカウント）'],
      weekly: () => [weekly_reports.filter((w) => String(w.d).slice(0, 7) === ym).length, '回', wk ? '最新 ' + wk.d + '（' + wk.status + '）' : '—'],
      measure_log: () => [measures.length, '件', '施策ログの記録数（累計）'],
      handover: () => [null, '', '12月から。進捗の数字はまだありません'],
      roas: () => [null, '', '広告費・売上データ未接続']
    };
    return initiatives.map((i) => {
      const [value, unit, sub] = (M[i.metric] || (() => [null, '', '']))();
      const v = value == null || isNaN(+value) ? null : +value;
      return {no: i.no, axis: i.axis, name: i.name, value: v, unit, sub, status: v == null ? '未計測' : '計測中', tab: i.metric === 'wantedly' ? 'wantedly' : i.tab};
    });
  }
});

dash.calc('initiative_axes', {
  title: '軸ごとの施策数', description: '施策マスターを軸ごとに数え、そのうち数字が取れている施策の数を出します。',
  inputs: ['initiative_map'],
  fn: (initiative_map) => d3.groups(initiative_map, (r) => r.axis).map(([axis, v]) => ({axis, count: v.length, measured: v.filter((r) => r.status === '計測中').length}))
});

dash.draw('imap', (el) => {
  const d = dash.data('initiative_map');
  el.replaceChildren();
  if (d.status !== 'ok' || !d.data) { const s = document.createElement('div'); s.className = 'y-sub'; s.textContent = d.status === 'error' ? '読み込めませんでした' : '読み込み中…'; el.append(s); return; }
  for (const [axis, items] of d3.groups(d.data, (r) => r.axis)) {
    const card = document.createElement('div'); card.className = 'y-card y-axis';
    const h = document.createElement('h3');
    const measured = items.filter((r) => r.status === '計測中').length;
    h.textContent = axis + '　' + items.length + '施策（数字あり ' + measured + '）';
    card.append(h);
    const ul = document.createElement('ul'); ul.className = 'y-ilist';
    items.forEach((r) => {
      const li = document.createElement('li');
      if (r.tab) { li.classList.add('y-go'); li.tabIndex = 0; li.addEventListener('click', () => window.YGo && window.YGo(r.tab)); li.addEventListener('keydown', (e) => { if (e.key === 'Enter') window.YGo && window.YGo(r.tab); }); }
      const top = document.createElement('div'); top.className = 'y-irow';
      const name = document.createElement('span'); name.className = 'y-iname'; name.textContent = r.name;
      const val = document.createElement('span'); val.className = 'y-ival';
      if (r.value == null) { const p = document.createElement('span'); p.className = 'y-pill'; p.textContent = '未計測'; val.append(p); }
      else {
        const b = document.createElement('b'); b.textContent = Y.fmt(r.value);
        b.dataset.source = 'initiative_map'; b.dataset.field = 'value'; b.dataset.where = 'no=' + r.no;
        val.append(b, document.createTextNode(' ' + r.unit));
      }
      top.append(name, val);
      const sub = document.createElement('div'); sub.className = 'y-sub'; sub.textContent = r.sub;
      li.append(top, sub); ul.append(li);
    });
    card.append(ul); el.append(card);
  }
});
