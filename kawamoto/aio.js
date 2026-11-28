// ---------- AIO（AI検索・AIアシスタント経由）の数字：両方のダッシュボードで共通 ----------
window.YAIO = {
  asof: '2026/11/28',
  // GA4（参照元がchatgpt.com・gemini等、またはメディアがai-assistant）
  months: [
    {month: '9月（15日〜）', sessions: 14, cv: 2, detail: 'ChatGPT 12・Gemini 2'},
    {month: '10月', sessions: 18, cv: 2, detail: 'ChatGPT 18'},
    {month: '11月（1〜26日）', sessions: 29, cv: 7, detail: 'ChatGPT 29'}
  ],
  metrics: [
    {name: 'AI経由の訪問数・CV数', how: 'GA4（AIアシスタントの流入）', status: 'ok', value: '11月 29訪問・CV 7件'},
    {name: 'AIによる概要・AIモードでの表示回数', how: 'サーチコンソール', status: 'todo', value: 'APIでは取り出せない（0件）。画面で月1回確認して記録'},
    {name: 'Copilotでの引用回数', how: 'Bing Webmaster Tools', status: 'todo', value: '未接続（サイト登録とAIパフォーマンスの確認が必要）'},
    {name: 'AIでの言及率（20問中◯問）', how: '定点観測シート', status: 'todo', value: '未作成（質問20個を決めて月1回観測）'},
    {name: '「AIで知った」問い合わせ・商談数', how: 'フォーム・商談DB', status: 'todo', value: '記録なし（認知経路に「AI」を追加して聞く）'}
  ]
};

(function () {
  const A = window.YAIO;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const st = el('style');
  st.textContent = `.y-aio{border:1px solid #d9d4fb;background:#fff;border-radius:18px;padding:18px 20px}
.y-aio-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.y-aio-head b{font-size:17px;color:#16181d}.y-aio-head span{font-size:12px;color:#8b909a}
.y-aio-grid{display:grid;grid-template-columns:minmax(220px,1fr) minmax(0,2fr);gap:14px}
.y-aio-kpi{background:#f7f5ff;border:1px solid #e3ddfd;border-radius:14px;padding:14px 16px}
.y-aio-kpi .l{font-size:12px;font-weight:700;color:#5b3fd1}
.y-aio-kpi .v b{font-size:40px;font-weight:800;color:#16181d;font-variant-numeric:tabular-nums}.y-aio-kpi .v span{font-size:13px;color:#8b909a;margin-left:6px}
.y-aio-kpi .s{font-size:13px;color:#3a3f48;margin-top:4px}
.y-aio-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.y-aio-tags span{font-size:12px;font-weight:700;border-radius:999px;padding:3px 10px;background:#fff;color:#5b3fd1;border:1px solid #e3ddfd}
.y-aio table{width:100%;border-collapse:collapse;font-size:13px}.y-aio th{text-align:left;color:#8b909a;font-weight:500;font-size:12px;padding:6px 8px;border-bottom:1px solid #eef0f3}
.y-aio td{padding:7px 8px;border-bottom:1px solid #f3f4f6;vertical-align:top}.y-aio td.n{text-align:right;font-variant-numeric:tabular-nums}
.y-aio .ok{color:#167a4f;font-weight:700}.y-aio .todo{color:#a15c07;font-weight:700}
.y-aio .note{font-size:12px;color:#8b909a;margin-top:8px;line-height:1.6}
@media (max-width:800px){.y-aio-grid{grid-template-columns:1fr}}`;
  document.head.append(st);

  const render = (box) => {
    box.replaceChildren(); box.classList.add('y-aio');
    const cur = A.months[A.months.length - 1], prev = A.months[A.months.length - 2];
    const head = el('div', 'y-aio-head'); head.append(el('b', null, 'AIO：AI検索・AIアシスタント経由の数字'), el('span', null, `${A.asof}時点`));
    const kpi = el('div', 'y-aio-kpi');
    const v = el('div', 'v'); v.append(el('b', null, String(cur.sessions)), el('span', null, '訪問'));
    const rate = cur.sessions ? Math.round(1000 * cur.cv / cur.sessions) / 10 : 0;
    const tags = el('div', 'y-aio-tags');
    [`CV ${cur.cv}件（CV率 ${rate}%）`, prev ? `前月 ${prev.sessions}訪問・CV ${prev.cv}件` : '', cur.detail].filter(Boolean).forEach((t) => tags.append(el('span', null, t)));
    kpi.append(el('div', 'l', `AI経由の訪問（${cur.month}）`), v, tags);
    const right = el('div');
    const t1 = el('table'); const h1 = el('tr'); ['月', 'AI経由の訪問', 'CV', '内訳'].forEach((x) => h1.append(el('th', null, x))); t1.append(h1);
    A.months.forEach((m) => { const tr = el('tr'); tr.append(el('td', null, m.month), el('td', 'n', m.sessions), el('td', 'n', m.cv), el('td', null, m.detail)); t1.append(tr); });
    const t2 = el('table'); t2.style.marginTop = '10px'; const h2 = el('tr'); ['毎月見る数字', '取り方', '状態'].forEach((x) => h2.append(el('th', null, x))); t2.append(h2);
    A.metrics.forEach((m) => { const tr = el('tr'); const s = el('td'); s.append(el('span', m.status, m.status === 'ok' ? '計測中 ' : '準備中 '), document.createTextNode(m.value)); tr.append(el('td', null, m.name), el('td', null, m.how), s); t2.append(tr); });
    right.append(t1, t2);
    const grid = el('div', 'y-aio-grid'); grid.append(kpi, right);
    box.append(head, grid, el('div', 'note', 'AI経由＝GA4で参照元がChatGPT・Gemini・Perplexity・Copilot・Claudeなどの訪問。CVはHPフォーム送信（営業・求職者を含む）。11月は26日までのデータです。'));
  };
  const go = () => document.querySelectorAll('[data-aio]').forEach(render);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
