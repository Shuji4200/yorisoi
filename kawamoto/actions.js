// ---------- ネクストアクション（チャネル別・ルールで自動生成） ----------
dash.calc('next_actions', {
  title: 'ネクストアクション（チャネル別）',
  description: '各チャネルの実データ（事実）を決まったルールに当てはめ、次にやることの候補を出します。事実欄は実データ、アクション欄はルールによる提案です。優先度は「高＝今月の着座・成約に直結」「中＝来月以降のリードに効く」「低＝計測・整備」。',
  inputs: ['this_month', 'followups', 'deals_all', 'ga_month', 'ga_source', 'sc_queries', 'sns_posts', 'sns_utm', 'pr_ga', 'line_now', 'wantedly_summary', 'wantedly_candidates', 'wantedly_projects'],
  fn: (this_month, followups, deals_all, ga_month, ga_source, sc_queries, sns_posts, sns_utm, pr_ga, line_now, wantedly_summary, wantedly_candidates, wantedly_projects) => {
    const now = new Date(Date.now() + 9 * 3600e3);
    const ym = now.toISOString().slice(0, 7), today = now.toISOString().slice(0, 10);
    const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
    const daysLeft = Math.max(1, daysInMonth - now.getUTCDate() + 1);
    const t = this_month[0] || {}, g = ga_month[0] || {}, l = line_now[0] || {}, ws = wantedly_summary[0] || {};
    const P = {高: 3, 中: 2, 低: 1};
    const out = [];
    const add = (channel, tab, pri, fact, action) => out.push({key: channel + ':' + out.length, channel, tab, priority: pri, score: P[pri], fact, action});
    const law = deals_all.filter((r) => r.kind === '法人' && r.meeting_at && r.meeting_at.slice(0, 7) === ym);
    const byCh = (c) => law.filter((r) => r.channel === c).length;

    // ② 商談
    const seatGap = Math.max(0, 40 - (t.seated || 0));
    if (seatGap > 0) {
      const future = law.filter((r) => r.status === '設定済' && r.meeting_at.slice(0, 10) >= today).length;
      add('商談', 'deals', '高', `今月の着座 ${t.seated || 0}件（目標40・残り${seatGap}件）／今日以降の設定済 ${future}件`,
        `残り${daysLeft}日で1日あたり約${Math.ceil(Math.max(0, seatGap - future) / daysLeft * 10) / 10}件の新規商談設定が必要。前日リマインドで設定済${future}件の着座を確実にする`);
    }
    const wGap = Math.max(0, 8 - (t.won25 || 0));
    const since60 = new Date(Date.now() + 9 * 3600e3 - 60 * 86400e3).toISOString().slice(0, 10);
    const proposing = deals_all.filter((r) => r.kind === '法人' && r.status === '提案中' && r.meeting_at && r.meeting_at.slice(0, 10) >= since60).length;
    if (wGap > 0) add('商談', 'deals', '高', `送客くん・採用くんの成約 ${t.won25 || 0}件（目標8・残り${wGap}件）／直近60日の提案中 ${proposing}件`,
      `提案中${proposing}件に「10件テスト」など小さく始められる案を添えてクロージング日程を確定する`);
    const stale = followups.filter((r) => r.status === '設定済').length, fol = followups.length - stale;
    if (followups.length) add('商談', 'follow', '高', `要フォロー ${followups.length}件（うち商談日を過ぎて設定済のまま ${stale}件）`,
      `設定済のまま${stale}件は着座／失注を更新、着座・提案中${fol}件は追客ルール（3・7・14日）どおり連絡`);
    const noAware = law.filter((r) => r.meeting_at.slice(0, 10) <= today && !r.awareness).length;
    if (noAware) add('商談', 'deals', '低', `今月の商談で認知経路が未記入 ${noAware}件`, '商談時に「何で知ったか」を聞いて記入（流入経路別の効果を正しく見るため）');

    // ① HP
    const formCv = +(g.cv || 0), meet = law.length;
    add('HP', 'traffic', '中', `今月のフォーム送信 ${formCv}件・セッション ${g.sessions || 0}／HP経由の法人商談 ${byCh('HP')}件`,
      'フォームに「法人／求職者／営業」の区分を追加し、法人の送信だけをGA4で計測する（営業の送信が多く、CV数で効果を判断できないため）');
    const lp = d3.sum(ga_source.filter((r) => /^\(direct\)$/.test(r.source)), (r) => +r.sessions);
    if (lp) add('HP', 'traffic', '低', `今月の直接流入 ${lp}セッション（参照元が分からない流入）`, 'SNS・LINE・資料内のリンクをUTM付き短縮URLに統一し、直接流入に紛れる分を減らす');

    // ③ 検索
    const law_q = /送客|採用代行|採用くん|集客|RPO|人材紹介/;
    const opp = sc_queries.filter((q) => q.kind === '一般' && q.impressions >= 10 && q.position > 3 && q.position <= 30)
      .sort((a, b) => (law_q.test(b.query) - law_q.test(a.query)) || b.impressions - a.impressions);
    const oppLaw = opp.filter((q) => law_q.test(q.query));
    if (oppLaw.length) add('検索', 'seo', '中', '法人向けの一般キーワード：' + oppLaw.slice(0, 3).map((q) => `「${q.query}」表示${q.impressions}回・${q.position}位`).join('／'),
      `「${oppLaw[0].query}」を狙った法人向けページ（サービスLPの見出し・FAQ・事例）を強化し、10位以内を目指す`);
    const oppJob = opp.filter((q) => !law_q.test(q.query));
    if (oppJob.length) add('検索', 'seo', '低', '求職者向けキーワード：' + oppJob.slice(0, 2).map((q) => `「${q.query}」表示${q.impressions}回・${q.position}位`).join('／'),
      '転職.com側のコラムで扱う（法人リードには直接効かないため優先度低）');

    // ① SNS
    const acc = d3.rollups(sns_posts.filter((p) => p.state === 'PUBLISHED' && String(p.date).slice(0, 7) === ym), (v) => v.length, (p) => p.account);
    const utm = new Map(sns_utm.map((r) => [r.source, r]));
    const map = {'X 河本': 'x_kawamoto', 'X 竹原代表': 'x_takehara', 'Threads yorisoi_hr.jp': 'threads_yorisoi', 'Threads bamboo_pegasasu': 'threads_bamboo', 'LinkedIn 河本': null};
    const weak = [];
    for (const [a, n] of acc) {
      const key = map[a]; const u = key ? utm.get(key) : null;
      if (key === null) add('SNS', 'sns', '低', `${a}：今月の公開 ${n}件／プロフィールUTMなし`, 'LinkedInのプロフィール・注目リンクにUTM（utm_source=linkedin_kawamoto, campaign=profile）を設定して流入を計測する');
      else if (!u || !u.cv) weak.push(`${a}（公開${n}件・流入${u ? u.sessions : 0}）`);
      else add('SNS', 'sns', '低', `${a}：今月の公開 ${n}件・プロフィール経由 ${u.sessions}セッション・送信${u.cv}件`, '反応の良い型（数字入りの事例・比較）を週の投稿に増やす');
    }
    if (weak.length) add('SNS', 'sns', '中', 'プロフィール経由のフォーム送信が0件：' + weak.join('／'), '各アカウント週2本は「事例＋公式LINEで集客相談」のCTA投稿にし、固定ポストをサービス紹介に差し替える');
    const q = sns_posts.filter((p) => p.state === 'QUEUE').length, dr = sns_posts.filter((p) => p.state === 'DRAFT').length;
    if (dr) add('SNS', 'sns', '低', `Postizの下書き ${dr}件・予約 ${q}件`, '下書きを確認して予約に回す（Postizの登録は下書き→確認後に予約のルール）');
    const snsDeals = byCh('X') + byCh('Threads');
    add('SNS', 'sns', '中', `今月のX・Threads経由の法人商談 ${snsDeals}件`, 'X経由は成約率が高い（過去分析：着座38件中成約21件）。成約事例の共通点を投稿・DMの型に反映する');

    // ① PR TIMES
    const hiNoVisit = pr_ga.filter((p) => +p.pv >= 500 && !+p.sessions).sort((a, b) => b.pv - a.pv);
    if (hiNoVisit.length) add('PR TIMES', 'pr', '中', `PV500以上なのに今月HP流入0の記事 ${hiNoVisit.length}本（例：No.${hiNoVisit[0].no}「${String(hiNoVisit[0].title).slice(0, 24)}…」${hiNoVisit[0].pv}PV）`,
      '調査系リリースの本文末に、採用くん・送客くんのページへのUTM付きリンクと「公式LINEで相談」の導線を必ず入れる');
    const thisMonth = pr_ga.filter((p) => String(p.published).slice(0, 7) === ym).length;
    add('PR TIMES', 'pr', '中', `今月の配信 ${thisMonth}本`, '配信後3日以内に同じ内容をX・LinkedIn・noteに展開し、記事URLをSNSから回す');

    // ① 公式LINE
    if (l.date) {
      const ratio = l.month_add > 0 ? Math.round(100 * (l.month_block_add || 0) / l.month_add) : null;
      add('公式LINE', 'line', '中', `友だち ${l.friends}人・今月+${l.month_add}人・ブロック+${l.month_block_add}（${l.date}時点）／LINE経由の法人商談 ${byCh('LINE')}件`,
        ratio != null && ratio >= 30 ? `ブロック率が高め（増加の${ratio}%）。一斉配信を減らし、友だち追加直後のあいさつで「集客相談」の予約導線を案内する` : 'あいさつメッセージに「集客相談」のリッチメニュー・予約導線を置き、SNS・PRから「LINEで相談」に誘導する');
    }

    // ③ Wantedly
    const un = wantedly_candidates.filter((c) => String(c.status).startsWith('未対応'));
    if (un.length) add('Wantedly', 'wantedly', '中', `未対応の候補者 ${un.length}人（最も古い応募から${d3.max(un, (c) => +c.days)}日）`, '3日以内を目安に一次返信し、対応中へ移す');
    const noApply = wantedly_projects.filter((p) => +p.pv >= 90 && !+p.applies && p.short !== '会社訪問リクエスト');
    if (noApply.length) add('Wantedly', 'wantedly', '低', `PV90以上で応募0の募集：${noApply.map((p) => `${p.short}（${p.pv}PV）`).join('・')}`, '募集タイトルと冒頭に仕事内容・育成の具体例を足し、ストーリーから募集へリンクする');

    return out.sort((a, b) => b.score - a.score);
  }
});

const naList = (el) => {
  const d = dash.data('next_actions');
  el.replaceChildren();
  if (d.status !== 'ok' || !d.data) { const s = document.createElement('div'); s.className = 'y-sub'; s.textContent = d.status === 'error' ? '読み込めませんでした' : '読み込み中…'; el.append(s); return; }
  const ch = el.dataset.ch;
  let rows = ch ? d.data.filter((r) => r.channel === ch) : d.data;
  if (el.dataset.limit) rows = rows.slice(0, +el.dataset.limit);
  if (!rows.length) { const s = document.createElement('div'); s.className = 'y-empty'; s.textContent = 'いまのところ提案はありません'; el.append(s); return; }
  rows.forEach((r) => {
    const li = document.createElement('li'); li.className = 'y-na';
    const top = document.createElement('div'); top.className = 'y-na-top';
    const p = document.createElement('span'); p.className = 'y-na-pri y-na-' + r.score; p.textContent = r.priority;
    const c = document.createElement('span'); c.className = 'y-pill'; c.textContent = r.channel;
    const a = document.createElement('b'); a.textContent = r.action;
    top.append(p, c, a);
    const f = document.createElement('div'); f.className = 'y-sub'; f.textContent = '事実：' + r.fact;
    li.append(top, f);
    if (r.tab && !ch) { li.classList.add('y-go'); li.tabIndex = 0; li.addEventListener('click', () => window.YGo && window.YGo(r.tab)); }
    el.append(li);
  });
};
dash.draw('na-home', naList);
dash.draw('na-all', naList);
['HP', 'SNS', 'PR TIMES', '公式LINE', '商談', '検索', 'Wantedly'].forEach((c, i) => dash.draw('na-' + i, naList));
dash.draw('nb-na', (el) => { const d = dash.data('next_actions'); el.textContent = d.status === 'ok' && d.data ? d.data.filter((r) => r.priority === '高').length : ''; });
