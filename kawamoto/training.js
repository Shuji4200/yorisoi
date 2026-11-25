// ---------- ⑥ 社内教育・育成（林さんの育成・引き継ぎ） ----------
dash.loader('training_plan', {description: 'ファイル（Notionの採用・育成計画から作成）をそのまま読みます。', fn: ({answer}) => ({data: [answer]})});

dash.calc('trainee_ramp', {
  title: '林さんの立ち上がり（月別の目標と実績）', description: '育成計画の立ち上がり目標（担当チャネル経由の法人商談・転職.comのLINE登録）と、商談DBで担当が「林」の法人商談数（商談日の月）を並べます。LINE登録の実績は未接続です。',
  inputs: ['training_plan', 'deals_all'],
  fn: (training_plan, deals_all) => {
    const t = training_plan[0] || {};
    const mine = deals_all.filter((r) => r.kind === '法人' && /林/.test(String(r.owner || '')) && r.meeting_at);
    const ym = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 7);
    return (t.ramp || []).map((m) => {
      const started = m.month <= ym;
      const v = mine.filter((r) => r.meeting_at.slice(0, 7) === m.month);
      return {...m, current: m.month === ym, started, deals_actual: started ? v.length : null, seated_actual: started ? d3.sum(v, (r) => r.seated) : null, line_actual: null};
    });
  }
});

const TR = {
  plan: () => { const d = dash.data('training_plan'); return d.status === 'ok' && d.data ? d.data[0] : null; },
  el: (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; },
  table: (el, cols, rows) => {
    const t = TR.el('table', 'y-table'); const hr = TR.el('tr');
    cols.forEach(([h]) => hr.append(TR.el('th', null, h)));
    const th = TR.el('thead'); th.append(hr); t.append(th);
    const tb = TR.el('tbody');
    rows.forEach((r) => { const tr = TR.el('tr', r._cls || ''); cols.forEach(([, f, n]) => { const td = TR.el('td', n ? 'n' : null); const v = typeof f === 'function' ? f(r) : r[f]; if (v instanceof Node) td.append(v); else td.textContent = v == null || v === '' ? '—' : v; tr.append(td); }); tb.append(tr); });
    t.append(tb); const w = TR.el('div', 'y-tablewrap'); w.append(t); el.append(w);
  }
};

dash.draw('t-status', (el) => {
  const p = TR.plan(); el.replaceChildren(); if (!p) return;
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const start = p.start_month + '-01';
  const items = [];
  if (today < start) {
    const days = Math.round((Date.parse(start) - Date.parse(today)) / 864e5);
    items.push(['入社予定', '12月', '', p.start_note, 'navy'], ['入社まで', days, '日', '12/1を起点にした目安', 'purple']);
  } else {
    const day = Math.round((Date.parse(today) - Date.parse(start)) / 864e5) + 1;
    items.push(['入社から', day, '日目', day <= 30 ? '30日プログラム中' : '2ヶ月目以降（実装と成長）', 'navy']);
  }
  items.push(['研修プログラム', 30, '日', 'Week1研修→Week2実務→Week3計画→Week4独り立ち', 'green'], ['評価ゲート', 3, 'つ', 'Day5・Day15・Day30', 'orange'], ['定常目標（4ヶ月目）', 12, '件／月', '担当チャネル経由の法人商談・LINE登録 月60名', 'teal']);
  items.forEach(([l, v, u, s, tone]) => {
    const c = TR.el('div', 'y-pk t-' + tone); c.append(TR.el('div', 'y-pk-l', l));
    const n = TR.el('div', 'y-pk-v'); n.append(TR.el('b', null, typeof v === 'number' ? Y.fmt(v) : v), TR.el('span', null, u)); c.append(n, TR.el('div', 'y-sub', s));
    el.append(c);
  });
});

dash.draw('t-program', (el) => {
  const p = TR.plan(); el.replaceChildren(); if (!p) return;
  (p.phases || []).forEach((ph) => {
    const c = TR.el('div', 'y-card y-t-phase');
    const top = TR.el('div', 'y-t-ptop'); top.append(TR.el('b', null, ph.name), TR.el('span', 'y-pill', ph.days));
    if (ph.gate) top.append(TR.el('span', 'y-pill p-info', ph.gate));
    c.append(top, TR.el('div', 'y-t-pc', ph.content), TR.el('div', 'y-sub', '成果物：' + ph.output));
    el.append(c);
  });
});

dash.draw('t-gates', (el) => { const p = TR.plan(); el.replaceChildren(); if (!p) return; TR.table(el, [['ゲート', 'gate'], ['時期', 'when'], ['合格基準', 'criteria'], ['未達のとき', 'fallback']], p.gates || []); });

dash.draw('t-ramp', (el) => {
  const d = dash.data('trainee_ramp'); el.replaceChildren(); if (d.status !== 'ok' || !d.data) return;
  const rows = d.data.map((r) => ({...r, _cls: r.current ? 'y-r-sel' : ''}));
  const act = (a, t) => (r) => { if (r[a] == null) return r.started ? '未接続' : '入社後に計測'; const s = TR.el('span', r[a] >= r[t] ? 'y-ok' : 'y-warn', Y.fmt(r[a]) + '件'); return s; };
  TR.table(el, [
    ['月', (r) => `${+r.month.slice(5)}月（${r.label}）`], ['立ち上がり', (r) => (r.rate > 100 ? '挑戦水準' : r.rate + '%'), true],
    ['法人商談の目標', (r) => r.deals + '件', true], ['実績（担当＝林）', act('deals_actual', 'deals'), true],
    ['LINE登録の目標', (r) => r.line + '名', true], ['実績', (r) => (r.started ? '未接続' : '入社後に計測'), true],
    ['到達点', 'goal']
  ], rows);
});

dash.draw('t-months', (el) => { const p = TR.plan(); el.replaceChildren(); if (!p) return; TR.table(el, [['月', (r) => `${+r.month.slice(5)}月（${r.label}）`], ['勉強会のテーマ', 'study'], ['追加で任せる業務', 'tasks']], p.ramp || []); });
dash.draw('t-routine', (el) => { const p = TR.plan(); el.replaceChildren(); if (!p) return; TR.table(el, [['いつ', 'when'], ['場', 'what'], ['誰が', 'who'], ['内容', 'detail']], p.routine || []); });
dash.draw('t-kpi', (el) => { const p = TR.plan(); el.replaceChildren(); if (!p) return; TR.table(el, [['行動KPI', 'item'], ['週の目標', 'target']], p.weekly_kpi || []); });
dash.draw('t-handover', (el) => { const p = TR.plan(); el.replaceChildren(); if (!p) return; TR.table(el, [['領域', 'area'], ['林さんに任せること', 'new'], ['河本が持つこと', 'kawamoto']], p.handover || []); });
dash.draw('t-links', (el) => {
  const p = TR.plan(); el.replaceChildren(); if (!p) return;
  (p.links || []).forEach((l) => { const a = TR.el('a', 'y-btn', l.name); a.href = l.url; a.target = '_blank'; a.rel = 'noopener'; el.append(a); });
});
