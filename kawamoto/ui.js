// ---------- ファネル（全期間）・切り替え・メニューの件数 ----------
dash.calc('funnel_all', {
  title: 'ファネル（全期間）', description: '商談DBの法人の全行（商談日あり）を、商談設定→着座→成約→25万円以上の契約で数えます。',
  inputs: ['deals_all'],
  fn: (deals_all) => {
    const v = deals_all.filter((r) => r.kind === '法人' && r.meeting_at);
    const steps = [
      {step: '商談設定', value: v.length},
      {step: '着座', value: d3.sum(v, (r) => r.seated)},
      {step: '成約', value: v.filter((r) => r.status === '成約').length},
      {step: '送客くん・採用くん', value: d3.sum(v, (r) => r.won25)}
    ];
    return steps.map((s, i) => ({...s, rate: i && steps[i - 1].value ? Math.round(1000 * s.value / steps[i - 1].value) / 10 : null}));
  }
});
document.querySelectorAll('[data-fseg]').forEach((btn) => {
  btn.addEventListener('click', () => {
    window.Y_funnel = btn.dataset.fseg;
    document.querySelectorAll('[data-fseg]').forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
    dash.draw('funnel'); dash.draw('f-summary');
  });
});
dash.draw('f-summary', (el) => {
  const src = window.Y_funnel === 'all' ? 'funnel_all' : 'funnel';
  const d = dash.data(src);
  if (d.status !== 'ok' || !d.data) { el.textContent = ''; return; }
  const seat = d.data.find((r) => r.step === '着座'), won = d.data.find((r) => r.step === '成約');
  const rate = seat && seat.value ? Math.round(1000 * won.value / seat.value) / 10 : null;
  el.textContent = '着座→成約率 ' + (rate == null ? '—' : rate) + '%（' + (won ? won.value : 0) + '/' + (seat ? seat.value : 0) + '）';
});
dash.draw('nb-deals', (el) => { const d = dash.data('this_month'); el.textContent = d.status === 'ok' && d.data && d.data[0] ? d.data[0].meetings : ''; });
dash.draw('nb-follow', (el) => { const d = dash.data('followups'); el.textContent = d.status === 'ok' && d.data ? d.data.length : ''; });
