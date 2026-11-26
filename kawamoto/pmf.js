// ---------- 問い合わせ・PMF ----------
(function () {

  dash.calc('inq_month', {
    title: '月別の問い合わせ（フォーム送信・有効・大手）',
    description: '月ごとに、GA4のフォーム送信（キーイベント）と、HPフォーム通知メールを分類した有効な問い合わせ・大手・上場系の件数を並べます。GA4は9/15から計測、Gmailの通知は10/23から。',
    inputs: ['hp_month', 'pmf_months'],
    fn: (hp_month, pmf_months) => [...pmf_months].sort((a, b) => (a.month < b.month ? -1 : 1)).map((m) => {
      const g = hp_month.find((r) => String(r.year_month) === m.month.replace('-', ''));
      return {month: m.month, label: m.label, ga_form: g ? +g.conversions : null, mail_form: m.form_src === 'Gmail' ? m.form : null,
        valid: m.valid, valid_rate: m.valid != null && m.form ? Math.round(100 * m.valid / m.form) : null, soukyaku: m.soukyaku, shinsotsu: m.shinsotsu, saiyo: m.saiyo, fc: m.fc, check: m.check, big: m.big, note: m.note};
    })
  });

  dash.calc('pmf_deals', {
    title: 'PMFの判定に使う商談の数字（法人・全期間）',
    description: '商談DBの法人の行から、商談設定・着座・成約・着座→成約率・サービス別の成約・2回以上成約した会社の数を出します。',
    inputs: ['deals_all'],
    fn: (deals_all) => {
      const law = deals_all.filter((r) => r.kind === '法人' && r.meeting_at);
      const won = law.filter((r) => r.status === '成約');
      const seated = d3.sum(law, (r) => r.seated);
      const repeat = d3.rollups(won, (v) => v.length, (r) => r.company).filter(([, n]) => n > 1).length;
      return [{meetings: law.length, seated, won: won.length, rate: seated ? Math.round(1000 * won.length / seated) / 10 : null,
        won_saiyo: won.filter((r) => r.contracted === '採用くん').length, won_soukyaku: won.filter((r) => r.contracted === '送客くん').length,
        won_fc: won.filter((r) => /FC/.test(String(r.contracted))).length, repeat}];
    }
  });

  const ok = (id) => { const d = dash.data(id); return d.status === 'ok' ? d.data : null; };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const n = (v, u) => (v == null ? '—' : Y.fmt(v) + (u || ''));

  // 今月のカード
  const cur = () => { const r = ok('inq_month'); return r ? r.find((x) => x.month === '2026-11') : null; };
  dash.draw('pmf-k', (b) => {
    const r = cur(); const f = b.dataset.f;
    b.textContent = r && r[f] != null ? Y.fmt(r[f]) : '—';
  });

  dash.draw('pmf-month-body', (tb) => {
    const rows = ok('inq_month'); tb.replaceChildren(); if (!rows) return;
    rows.forEach((r) => {
      const tr = el('tr'); tr.dataset.key = encodeURIComponent(r.month);
      const c = (f) => { const td = el('td', 'n', n(r[f], r[f] == null ? '' : '件')); return td; };
      tr.append(el('td', null, r.label), c('ga_form'), c('mail_form'), c('valid'), c('soukyaku'), c('shinsotsu'), c('saiyo'), c('fc'), c('big'), el('td', 'w', r.note));
      tb.append(tr);
    });
  });
  const simple = (src, key, cols) => (tb) => {
    const rows = ok(src) && [...ok(src)].sort((a, b) => (+a.ord) - (+b.ord)); tb.replaceChildren(); if (!rows) return;
    rows.forEach((r) => { const tr = el('tr'); tr.dataset.key = encodeURIComponent(r[key]); cols.forEach(([f, c]) => tr.append(el('td', c, r[f]))); tb.append(tr); });
  };
  dash.draw('pmf-big-body', simple('pmf_big', 'company', [['date', 'n'], ['company'], ['service'], ['basis', 'w'], ['status']]));
  dash.draw('pmf-new-body', simple('pmf_new', 'company', [['date', 'n'], ['company'], ['service'], ['memo', 'w']]));

  // 商談の数字
  dash.draw('pmf-d', (b) => { const r = ok('pmf_deals'); const f = b.dataset.f; b.textContent = r && r[0] && r[0][f] != null ? Y.fmt(r[0][f]) : '—'; });

  // 6段階のはしご（法人事業全体は PMF＝4 にいる）
  const NOW = 4;
  dash.draw('pmf-ladder', (box) => {
    const rows = ok('pmf_stages') && [...ok('pmf_stages')].sort((a, b) => a.no - b.no); box.replaceChildren(); if (!rows) { box.textContent = '—'; return; }
    rows.forEach((s) => {
      const c = el('div', 'y-pmf-step' + (s.no < NOW ? ' done' : s.no === NOW ? ' now' : s.no === NOW + 1 ? ' goal' : ''));
      if (s.no === NOW) c.append(el('span', 'y-pmf-flag', 'いまここ'));
      if (s.no === NOW + 1) c.append(el('span', 'y-pmf-flag g', '次のゴール'));
      c.append(el('b', null, s.code), el('small', null, s.name), el('p', null, s.goal), el('div', 'y-sub', '指標：' + s.metric));
      box.append(c);
    });
  });

  dash.draw('pmf-svc', (box) => {
    const rows = ok('pmf_services') && [...ok('pmf_services')].sort((a, b) => (+a.ord) - (+b.ord)); box.replaceChildren(); if (!rows) { box.textContent = '—'; return; }
    rows.forEach((x) => {
      const c = el('div', 'y-card y-pmf-card');
      const h = el('h3'); h.append(el('span', null, x.service), el('span', 'y-pill p-info', x.stage)); c.append(h);
      const dots = el('div', 'y-pmf-dots');
      for (let i = 1; i <= 6; i++) dots.append(el('i', i < x.stage_no ? 'on' : i === x.stage_no ? 'half' : ''));
      c.append(dots);
      const dl = el('dl');
      [['事実', x.fact], ['足りない', x.gap], ['次の一手', x.action], ['次の段階', x.next]].forEach(([k, v]) => dl.append(el('dt', null, k), el('dd', null, v)));
      c.append(dl); box.append(c);
    });
  });

  dash.draw('pmf-next', (ul) => {
    const rows = ok('pmf_next') && [...ok('pmf_next')].sort((a, b) => a.no - b.no); ul.replaceChildren(); if (!rows) return;
    rows.forEach((x) => {
      const li = el('li', 'y-na');
      const top = el('div', 'y-na-top'); top.append(el('span', 'y-na-pri y-na-' + (x.pri === '高' ? 3 : 2), x.pri), el('b', null, x.no + '. ' + x.title));
      li.append(top, el('div', 'y-sub', 'なぜ：' + x.why), el('div', 'y-sub', 'やり方：' + x.how));
      ul.append(li);
    });
  });
  dash.draw('nb-pmf', (b) => { const r = cur(); b.textContent = r && r.big != null ? '大手' + r.big : ''; });
})();
