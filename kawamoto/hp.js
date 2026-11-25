// ---------- ④ HP・LP管理 ----------
(function () {
  const fmt = (v) => (v == null || v === '' || isNaN(+v) ? '—' : d3.format(',')(Math.round(+v)));
  const ok = (id) => { const d = dash.data(id); return d.status === 'ok' ? d.data : null; };

  // ===== 計算 =====
  dash.calc('hp_kpi', {
    title: 'HPの今月と先月（GA4）',
    description: '月別のGA4の数字から、いちばん新しい月（今月・途中）とその前の月を並べたもの。',
    inputs: ['hp_month'],
    fn: (months) => {
      const rows = (months || []).slice().sort((a, b) => String(a.year_month).localeCompare(String(b.year_month)));
      const cur = rows[rows.length - 1] || {}, prev = rows[rows.length - 2] || {};
      const def = [
        ['pv', 'screen_page_views', 1], ['sessions', 'sessions', 1], ['users', 'totalusers', 1],
        ['cv', 'conversions', 1], ['eng', 'engagement_rate', 100], ['dur', 'average_session_duration', 1],
      ];
      return def.map(([metric, col, k]) => ({
        metric, ym: cur.year_month || '', prev_ym: prev.year_month || '',
        value: cur[col] == null ? null : Math.round(+cur[col] * k * 10) / 10,
        prev: prev[col] == null ? null : Math.round(+prev[col] * k * 10) / 10,
      }));
    },
  });

  dash.calc('hp_req_summary', {
    title: 'HP修正依頼の状態別件数',
    description: '修正依頼リストを状態（未対応・対応中・完了）ごとに数えたもの。',
    inputs: ['hp_requests'],
    fn: (reqs) => ['未対応', '対応中', '完了'].map((status) => ({status, n: (reqs || []).filter((r) => r.status === status).length})),
  });

  dash.calc('lp_stats', {
    title: 'LPごとのPVとLINEクリック（GA4）',
    description: 'LPの設置予定パスごとに、GA4のpage_view数とline_click数を合計したもの（直近90日）。',
    inputs: ['lp_list', 'lp_events'],
    fn: (lps, events) => (lps || []).map((lp) => {
      const ev = (events || []).filter((e) => String(e.page_path || '').replace(/\/$/, '') === lp.path);
      const sum = (name) => ev.filter((e) => e.event_name === name).reduce((s, e) => s + (+e.event_count || 0), 0);
      return {id: lp.id, pv: sum('page_view'), line: sum('line_click')};
    }),
  });

  dash.calc('lp_counts', {
    title: 'LPの本数（状態別）',
    description: 'LP一覧を状態ごとに数えたもの。',
    inputs: ['lp_list'],
    fn: (lps) => {
      const L = lps || [];
      return [
        {k: 'all', n: L.length},
        {k: 'made', n: L.filter((l) => l.status !== '未作成').length},
        {k: 'live', n: L.filter((l) => l.status === '配信中').length},
        {k: 'todo', n: L.filter((l) => l.status === '未作成').length},
      ];
    },
  });

  dash.loader('lp_saiyo_a', {
    description: 'LPのHTMLファイルを、そのままの文字列として読み込みます。',
    fn: ({answer}) => ({data: {html: typeof answer === 'string' ? answer : ''}}),
  });

  // ===== HPダッシュボード =====
  const LABEL = {pv: 'PV', sessions: 'セッション', users: 'ユーザー', cv: 'フォーム送信', eng: 'エンゲージメント率', dur: '平均滞在'};
  const show = (m, v) => (v == null ? '—' : m === 'eng' ? v.toFixed(1) : m === 'dur' ? `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, '0')}` : fmt(v));

  dash.draw('hp-k', (el) => {
    const rows = ok('hp_kpi');
    const r = rows && rows.find((x) => x.metric === el.dataset.m);
    el.textContent = r ? show(r.metric, r.value) : '—';
  });
  dash.draw('hp-kd', (el) => {
    const rows = ok('hp_kpi');
    const r = rows && rows.find((x) => x.metric === el.dataset.m);
    if (!r || r.prev == null) { el.textContent = '—'; return; }
    el.textContent = `先月（${String(r.prev_ym).slice(4)}月）${show(r.metric, r.prev)}`;
  });
  dash.draw('hp-month', (el) => {
    const rows = ok('hp_kpi');
    const ym = rows && rows[0] && rows[0].ym;
    el.textContent = ym ? `${String(ym).slice(0, 4)}年${+String(ym).slice(4)}月（月の途中）` : '—';
  });

  dash.draw('hp-req-status', (el) => {
    const rows = ok('hp_req_summary');
    el.replaceChildren();
    if (!rows) { el.textContent = '—'; return; }
    const cls = {'未対応': 'p-bad', '対応中': 'p-warn', '完了': 'p-ok'};
    rows.forEach((r) => {
      const li = document.createElement('li');
      const a = document.createElement('span'); a.className = `y-pill ${cls[r.status] || ''}`; a.textContent = r.status;
      const b = document.createElement('b'); b.textContent = `${r.n}件`;
      b.dataset.source = 'hp_req_summary'; b.dataset.field = 'n'; b.dataset.where = `status=${encodeURIComponent(r.status)}`;
      li.append(a, b); el.append(li);
    });
  });

  dash.draw('hp-req-recent', (el) => {
    const rows = ok('hp_requests');
    el.replaceChildren();
    if (!rows) { el.textContent = '—'; return; }
    rows.filter((r) => r.status !== '完了').slice().sort((a, b) => String(b.created).localeCompare(String(a.created))).slice(0, 4).forEach((r) => {
      const li = document.createElement('li');
      const t = document.createElement('div'); t.className = 'y-irow';
      const n = document.createElement('span'); n.textContent = r.title;
      const d = document.createElement('span'); d.className = 'y-ival'; d.textContent = `${r.status}・${String(r.created).slice(5).replace('-', '/')}`;
      t.append(n, d); li.append(t); el.append(li);
    });
    if (!el.children.length) { const li = document.createElement('li'); li.textContent = '依頼はまだありません'; el.append(li); }
  });

  // アクセス推移（直近60日）
  dash.draw('hp-trend', (el) => {
    const raw = ok('ga_daily');
    el.replaceChildren();
    if (!raw || !raw.length) { el.textContent = '—'; return; }
    const parse = d3.timeParse('%Y-%m-%d');
    const all = raw.map((r) => ({d: parse(String(r.date).slice(0, 10)), s: +r.sessions || 0, c: +r.conversions || 0})).filter((r) => r.d).sort((a, b) => a.d - b.d);
    const data = all.slice(-60);
    const W = Math.max(300, el.clientWidth || 600), H = 230, m = {t: 10, r: 12, b: 26, l: 40};
    const x = d3.scaleTime().domain(d3.extent(data, (r) => r.d)).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, d3.max(data, (r) => r.s) || 1]).nice().range([H - m.b, m.t]);
    const svg = d3.select(el).append('svg').attr('width', W).attr('height', H);
    svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(Math.min(6, W / 90)).tickFormat(d3.timeFormat('%-m/%-d')).tickSizeOuter(0));
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(W - m.l - m.r))).call((g) => g.selectAll('.tick line').attr('stroke', '#eceef2')).call((g) => g.select('.domain').remove());
    svg.append('path').datum(data).attr('fill', 'rgba(59,130,246,.12)').attr('d', d3.area().x((r) => x(r.d)).y0(y(0)).y1((r) => y(r.s)));
    svg.append('path').datum(data).attr('fill', 'none').attr('stroke', '#3b82f6').attr('stroke-width', 2).attr('d', d3.line().x((r) => x(r.d)).y((r) => y(r.s)));
    const tip = d3.select(el).append('div').attr('class', 'y-tip').style('display', 'none');
    const dot = svg.append('circle').attr('r', 4).attr('fill', '#3b82f6').style('display', 'none');
    const bis = d3.bisector((r) => r.d).center;
    svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', H - m.t - m.b).attr('fill', 'transparent')
      .on('pointermove', (ev) => {
        const [px] = d3.pointer(ev); const r = data[bis(data, x.invert(px))]; if (!r) return;
        dot.style('display', null).attr('cx', x(r.d)).attr('cy', y(r.s));
        tip.style('display', null).style('left', `${Math.min(x(r.d) + 10, W - 150)}px`).style('top', `${y(r.s) - 10}px`)
          .text(`${d3.timeFormat('%-m/%-d')(r.d)}　セッション ${fmt(r.s)}・送信 ${fmt(r.c)}`);
      })
      .on('pointerleave', () => { tip.style('display', 'none'); dot.style('display', 'none'); });
  });

  // 流入経路（今月）
  dash.draw('hp-ch', (el) => {
    const rows = ok('ga_channel');
    el.replaceChildren();
    if (!rows || !rows.length) { el.textContent = '—'; return; }
    const JA = {'Direct': '直接', 'Organic Search': '自然検索', 'Referral': '参照サイト', 'Organic Social': 'SNS', 'Paid Search': '検索広告', 'Paid Social': 'SNS広告', 'Email': 'メール', 'Unassigned': '不明', 'Cross-network': 'クロスネットワーク'};
    const data = rows.slice().sort((a, b) => (+b.sessions || 0) - (+a.sessions || 0)).slice(0, 7);
    const max = d3.max(data, (r) => +r.sessions || 0) || 1;
    data.forEach((r) => {
      const row = document.createElement('div'); row.className = 'y-hrow';
      const n = document.createElement('span'); n.textContent = JA[r.session_default_channel_group] || r.session_default_channel_group;
      const tr = document.createElement('div'); tr.className = 'y-ftrack';
      const i = document.createElement('i'); i.style.width = `${(100 * (+r.sessions || 0)) / max}%`; i.style.background = '#3b82f6'; tr.append(i);
      const v = document.createElement('span'); v.className = 'y-fnum'; v.style.fontSize = '15px'; v.textContent = fmt(r.sessions);
      v.dataset.source = 'ga_channel'; v.dataset.field = 'sessions'; v.dataset.where = `session_default_channel_group=${encodeURIComponent(r.session_default_channel_group)}`;
      row.append(n, tr, v); el.append(row);
    });
  });

  // ページ別
  const PAGE = {'/': 'トップ', '/index.html': 'トップ（index.html）', '/contact.html': 'お問い合わせ', '/thanks.html': '送信完了', '/soukyakukun': '送客くん', '/saiyokun': '採用くん', '/company.html': '会社情報', '/service.html': 'サービス', '/recruit.html': '採用情報', '/yorisoi-fc/': 'YORISOI FC', '/news.html': 'お知らせ', '/column.html': 'コラム一覧'};
  dash.draw('hp-pages-body', (tb) => {
    const rows = ok('hp_pages');
    tb.replaceChildren();
    if (!rows) return;
    rows.slice().sort((a, b) => (+b.screen_page_views || 0) - (+a.screen_page_views || 0)).slice(0, 20).forEach((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = encodeURIComponent(r.page_path);
      const p = document.createElement('td');
      const nm = PAGE[r.page_path] || (String(r.page_path).startsWith('/column/') ? 'コラム記事' : String(r.page_path).startsWith('/lp/') ? 'LP' : '');
      p.textContent = nm ? `${nm}　` : '';
      const code = document.createElement('span'); code.className = 'y-sub'; code.textContent = r.page_path; p.append(code);
      const c = (v) => { const td = document.createElement('td'); td.className = 'n'; td.textContent = fmt(v); return td; };
      tr.append(p, c(r.screen_page_views), c(r.sessions), c(r.conversions)); tb.append(tr);
    });
  });

  // 修正依頼一覧
  dash.draw('hp-req-body', (tb) => {
    const rows = ok('hp_requests');
    tb.replaceChildren();
    if (!rows) return;
    const cls = {'未対応': 'p-bad', '対応中': 'p-warn', '完了': 'p-ok'};
    rows.slice().sort((a, b) => String(b.created).localeCompare(String(a.created))).forEach((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = encodeURIComponent(r.id);
      const td = (t, c) => { const e = document.createElement('td'); if (c) e.className = c; e.textContent = t || ''; return e; };
      const st = document.createElement('td'); const pill = document.createElement('span'); pill.className = `y-pill ${cls[r.status] || ''}`; pill.textContent = r.status; st.append(pill);
      tr.append(td(String(r.created).replace(/-/g, '/')), td(r.title), td(r.detail, 'w'), st, td(r.owner)); tb.append(tr);
    });
  });

  // ===== LP管理 =====
  dash.draw('lp-k', (el) => {
    const rows = ok('lp_counts');
    const r = rows && rows.find((x) => x.k === el.dataset.k);
    el.textContent = r ? fmt(r.n) : '—';
  });

  dash.draw('lp-body', (tb) => {
    const rows = ok('lp_list');
    const st = ok('lp_stats') || [];
    tb.replaceChildren();
    if (!rows) return;
    const cls = {'未作成': 'p-mute', '作成中': 'p-info', '確認待ち': 'p-warn', '配信中': 'p-ok', '停止': 'p-plain'};
    rows.forEach((r) => {
      const s = st.find((x) => x.id === r.id) || {};
      const tr = document.createElement('tr'); tr.dataset.key = encodeURIComponent(r.id);
      const td = (t, c) => { const e = document.createElement('td'); if (c) e.className = c; e.textContent = t == null ? '' : t; return e; };
      const stt = document.createElement('td'); const pill = document.createElement('span'); pill.className = `y-pill ${cls[r.status] || ''}`; pill.textContent = r.status; stt.append(pill);
      const pv = document.createElement('td'); pv.className = 'n';
      const pre = document.createElement('td');
      if (r.preview) { const a = document.createElement('a'); a.href = r.preview; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '開く ↗'; pre.append(a); }
      else pre.textContent = '—';
      tr.append(td(r.axis), td(r.name, 'w'), td(r.persona), stt, td(r.path), td(r.campaign),
        td(r.status === '未作成' ? '—' : fmt(s.pv), 'n'), td(r.status === '未作成' ? '—' : fmt(s.line), 'n'), td(r.updated ? r.updated.replace(/-/g, '/') : '—'), pre);
      tb.append(tr);
    });
  });

  // LPのプレビューと編集（このページには保存されない：編集後のHTMLをコピーして使う）
  dash.draw('lp-editor', {
    mount: (el) => {
      el.replaceChildren();
      const bar = document.createElement('div'); bar.className = 'y-lp-bar';
      const mk = (label, cls) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls || 'y-linkbtn'; b.textContent = label; bar.append(b); return b; };
      const seg = document.createElement('div'); seg.className = 'y-seg'; bar.append(seg);
      const pc = document.createElement('button'); pc.type = 'button'; pc.textContent = '💻 PC'; pc.setAttribute('aria-pressed', 'true');
      const sp = document.createElement('button'); sp.type = 'button'; sp.textContent = '📱 スマホ'; sp.setAttribute('aria-pressed', 'false');
      seg.append(pc, sp);
      const edit = mk('✏️ 編集モード：オフ');
      const copy = mk('📋 編集後のHTMLをコピー');
      const reset = mk('↺ 元に戻す');
      const msg = document.createElement('span'); msg.className = 'y-sub'; bar.append(msg);
      const host = document.createElement('div'); host.className = 'y-lp-frame';
      const out = document.createElement('textarea'); out.className = 'y-lp-out'; out.readOnly = true; out.hidden = true; out.setAttribute('aria-label', '編集後のHTML');
      el.append(bar, host, out);
      const root = host.attachShadow({mode: 'open'});
      const state = {html: null, head: '', tailScripts: '', headScripts: '', editing: false};

      const render = () => {
        root.replaceChildren();
        if (!state.html) { const p = document.createElement('p'); p.textContent = '—'; root.append(p); return; }
        const doc = new DOMParser().parseFromString(state.html, 'text/html');
        const css = [...doc.querySelectorAll('style')].map((s) => s.textContent).join('\n')
          .replace(/:root\s*\{/g, ':host{').replace(/(^|[}\s])html\s*\{[^}]*\}/g, '$1').replace(/(^|[}\s,])body\s*\{/g, '$1.lp-body{')
          .replace(/@media\s*\(max-width:\s*860px\)/g, '@container lpv (max-width:860px)')
          .replace(/position:fixed;left:0;right:0;bottom:0/g, 'position:sticky;left:0;right:0;bottom:0');
        const st = document.createElement('style');
        st.textContent = `${css}\n:host{display:block}\n.lp-body{container:lpv/inline-size;font-family:"Noto Sans JP","Hiragino Sans",sans-serif;color:#0f172a;line-height:1.75;background:#fff}\n.lp-body [contenteditable=true]{outline:1px dashed rgba(26,107,224,.35);outline-offset:2px}\n.lp-body [contenteditable=true]:focus{outline:2px solid #1a6be0;background:rgba(26,107,224,.04)}`;
        const wrap = document.createElement('div'); wrap.className = 'lp-body';
        wrap.addEventListener('click', (e) => { if (state.editing && e.target.closest('a')) e.preventDefault(); });
        // スクリプト・noscript・on属性は取り除いて表示（書き出し時に元へ戻す）
        state.headScripts = [...doc.body.querySelectorAll(':scope > noscript')].map((n) => n.outerHTML).join('\n');
        state.tailScripts = [...doc.body.querySelectorAll('script')].map((n) => n.outerHTML).join('\n');
        doc.body.querySelectorAll('script,noscript,iframe,object,embed').forEach((n) => n.remove());
        doc.body.querySelectorAll('*').forEach((n) => [...n.attributes].forEach((a) => { if (/^on/i.test(a.name)) n.removeAttribute(a.name); }));
        [...doc.body.childNodes].forEach((n) => wrap.append(document.importNode(n, true)));
        state.head = doc.head.outerHTML;
        state.lang = doc.documentElement.getAttribute('lang') || 'ja';
        root.append(st, wrap);
        state.wrap = wrap;
        setEditing(state.editing);
      };
      const TEXT = 'h1,h2,h3,h4,p,li,dt,dd,summary,blockquote,th,td,span.kicker,span.target,.btn,.lead,.cta-note,.foot,.kpi .l,.kpi-note,.res,.win,.price,.badge,.no,.s';
      const setEditing = (on) => {
        state.editing = on;
        edit.textContent = on ? '✏️ 編集モード：オン（文字をクリックして直接編集）' : '✏️ 編集モード：オフ';
        edit.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (!state.wrap) return;
        state.wrap.querySelectorAll(TEXT).forEach((n) => { if (on) n.setAttribute('contenteditable', 'true'); else n.removeAttribute('contenteditable'); });
      };
      const exportHtml = () => {
        if (!state.wrap) return '';
        const c = state.wrap.cloneNode(true);
        c.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'));
        return `<!DOCTYPE html>\n<html lang="${state.lang}">\n${state.head}\n<body>\n${state.headScripts}\n${c.innerHTML.trim()}\n${state.tailScripts}\n</body>\n</html>\n`;
      };
      pc.addEventListener('click', () => { pc.setAttribute('aria-pressed', 'true'); sp.setAttribute('aria-pressed', 'false'); host.style.maxWidth = ''; });
      sp.addEventListener('click', () => { sp.setAttribute('aria-pressed', 'true'); pc.setAttribute('aria-pressed', 'false'); host.style.maxWidth = '400px'; });
      edit.addEventListener('click', () => setEditing(!state.editing));
      reset.addEventListener('click', () => { render(); msg.textContent = '元の内容に戻しました'; out.hidden = true; });
      copy.addEventListener('click', async () => {
        const html = exportHtml();
        out.value = html; out.hidden = false;
        try { await navigator.clipboard.writeText(html); msg.textContent = 'コピーしました（下の枠にも表示しています）'; }
        catch (e) { out.focus(); out.select(); msg.textContent = 'コピーできなかったため、下の枠を全選択してコピーしてください'; }
      });
      return {state, render};
    },
    update: (el, made) => {
      const d = ok('lp_saiyo_a');
      const html = d && d.html;
      if (html && html !== made.state.html) { made.state.html = html; made.render(); }
      if (!html && made.state.html == null) made.render();
    },
  });
})();
