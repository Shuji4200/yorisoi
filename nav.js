// ---------- ナビ ----------
(function () {
  const go = (id) => {
    document.querySelectorAll('section[data-page]').forEach((s) => { s.hidden = s.id !== id; });
    document.querySelectorAll('.y-nav button[data-tab]').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === id ? 'page' : 'false'));
    dash.setLink(id);
  };
  document.querySelectorAll('.y-nav button[data-tab]').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
  const h = (location.hash || '').slice(1);
  if (h && document.getElementById(h) && document.getElementById(h).hasAttribute('data-page')) go(h);
})();
