// ---------- Wantedly ----------
const wPart = (key, cols) => ({description: 'Wantedlyファイルの「' + key + '」部分を行として読みます。', fn: ({answer}) => ({data: answer[key], columns: cols, meta: answer.meta})});
dash.loader('wantedly_summary', wPart('summary', ['period', 'job_pv', 'applies', 'scouts', 'messages', 'rank', 'rank_total', 'unhandled', 'in_progress', 'done', 'story_drafts']));
dash.loader('wantedly_projects', wPart('projects', ['id', 'short', 'title', 'status', 'edited', 'pv', 'cheer', 'applies']));
dash.loader('wantedly_stories', wPart('stories', ['id', 'title', 'author', 'date', 'pv', 'likes']));
dash.loader('wantedly_candidates', wPart('candidates', ['id', 'name', 'age', 'job', 'post', 'applied', 'days', 'status', 'note']));

dash.calc('wantedly_story_total', {
  title: 'Wantedlyストーリーの合計', description: '公開中のストーリーの本数・PV合計・いいね合計。',
  inputs: ['wantedly_stories'],
  fn: (wantedly_stories) => [{count: wantedly_stories.length, pv: d3.sum(wantedly_stories, (s) => +s.pv), likes: d3.sum(wantedly_stories, (s) => +s.likes)}]
});

const wSet = (src, f) => (el) => { const d = dash.data(src); Y.setText(el, d.status, d.status === 'ok' && d.data && d.data[0] ? Y.fmt(d.data[0][f]) : ''); };
dash.draw('w-pv', wSet('wantedly_summary', 'job_pv'));
dash.draw('w-applies', wSet('wantedly_summary', 'applies'));
dash.draw('w-scouts', wSet('wantedly_summary', 'scouts'));
dash.draw('w-rank', wSet('wantedly_summary', 'rank'));
dash.draw('w-rank-total', wSet('wantedly_summary', 'rank_total'));
dash.draw('w-unhandled', wSet('wantedly_summary', 'unhandled'));
dash.draw('w-progress', wSet('wantedly_summary', 'in_progress'));
dash.draw('w-st-count', wSet('wantedly_story_total', 'count'));
dash.draw('w-st-pv', wSet('wantedly_story_total', 'pv'));
dash.calc('pr_admin_total', {
  title: 'PR TIMES管理画面の合計（9/1〜11/14）', description: 'PR TIMESのリリース別レポートのPV・訪問者・転載サイト数を合計します。',
  inputs: ['prtimes'],
  fn: (prtimes) => [{releases: prtimes.length, pv: d3.sum(prtimes, (p) => +p.pv || 0), uu: d3.sum(prtimes, (p) => +p.uu || 0), reprints: d3.sum(prtimes, (p) => +p.reprints || 0)}]
});
dash.draw('pr-pv', wSet('pr_admin_total', 'pv'));
dash.draw('pr-rep', wSet('pr_admin_total', 'reprints'));
dash.draw('nb-wantedly', (el) => { const d = dash.data('wantedly_summary'); el.textContent = d.status === 'ok' && d.data && d.data[0] ? d.data[0].unhandled : ''; });

const candFilter = (r) => !window.Y_candStatus || String(r.status).startsWith(window.Y_candStatus);
dash.draw('cand-status', (sel) => {
  sel.replaceChildren(...['', '未対応', '対応中'].map((o) => new Option(o || '状態：すべて', o)));
  sel.value = window.Y_candStatus || '';
  sel.onchange = () => { window.Y_candStatus = sel.value; dash.draw('cand-body'); };
});
dash.draw('cand-body', (tb) => Y.table(tb, 'wantedly_candidates', [{f: 'applied', cls: 'n'}, {f: 'name'}, {f: 'age', num: 1, cls: 'n'}, {f: 'job'}, {f: 'post'}, {f: 'status', pill: 1}, {f: 'note'}], {key: 'id', filter: candFilter}));
dash.draw('wproj-body', (tb) => Y.table(tb, 'wantedly_projects', [{f: 'short'}, {f: 'title', cls: 'w'}, {f: 'status', pill: 1}, {f: 'edited', cls: 'n'}, {f: 'pv', num: 1, cls: 'n'}, {f: 'cheer', num: 1, cls: 'n'}, {f: 'applies', num: 1, cls: 'n'}], {key: 'id'}));
dash.draw('wstory-body', (tb) => Y.table(tb, 'wantedly_stories', [{f: 'date', cls: 'n'}, {f: 'title', cls: 'w'}, {f: 'author'}, {f: 'pv', num: 1, cls: 'n'}, {f: 'likes', num: 1, cls: 'n'}], {key: 'id'}));
