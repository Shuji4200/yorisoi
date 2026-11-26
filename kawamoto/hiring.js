// ---------- 採用目標（CA）：広報マーケのダッシュボードと役員向け定例レポートで共通 ----------
window.YHIRE = {
  asof: '2026/11/26',
  goal: 4, deadline: '2026年12月末', role: 'CA（キャリアアドバイザー）',
  persona: '谷脇さんのような人', channels: ['Wantedly', 'Indeed'],
  months: [
    {month: '11月', target: '12月末までに累計4名（採用活動を開始）'},
    {month: '12月', target: '累計4名の採用決定'}
  ],
  // 採用が決まったらここに1行ずつ足す（例：{date: '2026-12-05', channel: 'Wantedly'}）
  hires: [],
  // 採用の進み具合（記録が始まったら更新）
  funnel: [
    {channel: 'Wantedly', item: 'CA/キャリアコンサルタントの募集', value: '直近30日 PV172・応募1', note: '11/14時点・管理画面'},
    {channel: 'Indeed', item: 'CAの求人', value: '—', note: 'データ未接続'}
  ],
  next: [
    'Wantedlyの「CA/キャリアコンサルタント」募集を、谷脇さんのような人に届く内容（仕事内容・育成・働き方）に書き換える',
    'IndeedにCAの求人を掲載し、応募の窓口をそろえる',
    '応募・面接・内定・採用決定の件数を週ごとに記録する'
  ]
};

(function () {
  const H = window.YHIRE;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const css = `.y-hire{border:1px solid #f6c9c6;background:#fff;border-radius:18px;padding:18px 20px}
.y-hire-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.y-hire-head b{font-size:17px;color:#16181d}.y-hire-head span{font-size:12px;color:#8b909a}
.y-hire-grid{display:grid;grid-template-columns:minmax(220px,1fr) minmax(0,2fr);gap:14px}
.y-hire-goal{background:#fff1f1;border:1px solid #f6c9c6;border-radius:14px;padding:14px 16px}
.y-hire-goal .l{font-size:12px;font-weight:700;color:#b42318}
.y-hire-goal .v[style] b{font-size:26px}.y-hire-goal .v b{font-size:40px;font-weight:800;color:#16181d;font-variant-numeric:tabular-nums}.y-hire-goal .v span{font-size:13px;color:#8b909a;margin-left:6px}
.y-hire-bar{height:8px;border-radius:4px;background:#f1d6d4;margin:10px 0 8px;overflow:hidden}.y-hire-bar i{display:block;height:100%;background:#e5484d}
.y-hire-tags{display:flex;flex-wrap:wrap;gap:6px}.y-hire-tags span{font-size:12px;font-weight:700;border-radius:999px;padding:3px 10px;background:#fff;color:#5b606a;border:1px solid #f0d2d0}
.y-hire table{width:100%;border-collapse:collapse;font-size:13px}.y-hire th{text-align:left;color:#8b909a;font-weight:500;font-size:12px;padding:6px 8px;border-bottom:1px solid #eef0f3}
.y-hire td{padding:7px 8px;border-bottom:1px solid #f3f4f6;vertical-align:top}
.y-hire ol{margin:10px 0 0;padding-left:1.3em;font-size:13px;line-height:1.8;color:#16181d}
.y-hire .note{font-size:12px;color:#8b909a;margin-top:8px;line-height:1.6}
@media (max-width:800px){.y-hire-grid{grid-template-columns:1fr}}`;
  const st = el('style'); st.textContent = css; document.head.append(st);

  const render = (box) => {
    box.replaceChildren(); box.classList.add('y-hire');
    const done = H.hires.length;
    const head = el('div', 'y-hire-head'); head.append(el('b', null, `採用：${H.role} ${H.goal}名（${H.deadline}まで）`), el('span', null, `11月・12月の目標／${H.asof}時点`));
    const goal = el('div', 'y-hire-goal');
    const v = el('div', 'v'); if (!done) v.style.cssText = '--s:1'; v.append(el('b', null, done ? String(done) : '未記録'), el('span', null, `／ 目標 ${H.goal}名`));
    const bar = el('div', 'y-hire-bar'); const fill = el('i'); fill.style.width = Math.min(100, 100 * done / H.goal) + '%'; bar.append(fill);
    const tags = el('div', 'y-hire-tags');
    [`ペルソナ：${H.persona}`, `採用媒体：${H.channels.join('・')}`, done ? `残り${Math.max(0, H.goal - done)}名` : '採用決定はまだ記録なし'].forEach((t) => tags.append(el('span', null, t)));
    goal.append(el('div', 'l', '採用決定（累計）'), v, bar, tags);
    const right = el('div');
    const t1 = el('table'); const h1 = el('tr'); ['月', '目標'].forEach((x) => h1.append(el('th', null, x))); t1.append(h1);
    H.months.forEach((m) => { const tr = el('tr'); tr.append(el('td', null, m.month), el('td', null, m.target)); t1.append(tr); });
    const t2 = el('table'); t2.style.marginTop = '10px'; const h2 = el('tr'); ['媒体', '中身', '数字', '時点'].forEach((x) => h2.append(el('th', null, x))); t2.append(h2);
    H.funnel.forEach((f) => { const tr = el('tr'); tr.append(el('td', null, f.channel), el('td', null, f.item), el('td', null, f.value), el('td', null, f.note)); t2.append(tr); });
    const ol = el('ol'); H.next.forEach((n) => ol.append(el('li', null, n)));
    right.append(t1, t2, el('div', 'note', '次にやること'), ol);
    const grid = el('div', 'y-hire-grid'); grid.append(goal, right);
    box.append(head, grid, el('div', 'note', '採用決定の数は、決まった人を記録した分だけ数えます（いまは記録なし）。Indeedの応募数はまだ取り込めていません。'));
  };
  const go = () => document.querySelectorAll('[data-hire]').forEach(render);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
