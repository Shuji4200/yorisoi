// 静的スナップショット用の小さなランタイム（claude.ai版のダッシュボードと同じ描画コードを動かす）
(function () {
  const SNAP = Date.parse(window.YSNAP.at);
  Date.now = () => SNAP; // 「今月」「今日」をスナップショット時点に固定
  const calcs = {}, draws = {}, cache = {};
  const made = new WeakMap();
  const run = (name, el) => { try { const d = draws[name]; if (typeof d === 'function') d(el); else { if (!made.has(el)) made.set(el, d.mount(el)); d.update(el, made.get(el)); } } catch (e) { console.error('draw', name, e); } };
  window.dash = {
    colors: ['#3b6fd8', '#e8833a', '#22a06b', '#8b5cf6'],
    loader() {},
    calc(name, spec) { calcs[name] = spec; },
    data(name) {
      if (cache[name]) return cache[name];
      let v;
      if (window.YSNAP.data[name]) v = {status: 'ok', data: window.YSNAP.data[name]};
      else if (calcs[name]) {
        const ins = calcs[name].inputs.map((i) => dash.data(i));
        if (ins.some((x) => x.status !== 'ok')) v = {status: 'error'};
        else { try { v = {status: 'ok', data: calcs[name].fn(...ins.map((x) => x.data))}; } catch (e) { console.error('calc', name, e); v = {status: 'error'}; } }
      } else v = {status: 'error'};
      return (cache[name] = v);
    },
    draw(name, fn) {
      if (fn) { draws[name] = fn; return; }
      if (draws[name]) document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => run(name, el));
    },
    drawAll(root) {
      (root || document).querySelectorAll('[data-draw]').forEach((el) => { const n = el.dataset.draw; if (draws[n]) run(n, el); });
    },
    setLink(id) {
      try { history.replaceState(null, '', '#' + id); } catch (e) {}
      const s = document.getElementById(id); if (s) dash.drawAll(s);
      window.scrollTo(0, 0);
    }
  };
})();
