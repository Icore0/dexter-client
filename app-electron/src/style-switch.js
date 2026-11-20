/* style-switch.js - the Launcher style switch in Settings. Changing it restarts the launcher so the window itself (glass or flat) is rebuilt. */
(function () {
  const seg = document.getElementById('uiStyle'); if (!seg) return;
  const cur = window.dexter?.uiStyle === 'pvphq' ? 'pvphq' : 'glass';
  seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.s === cur));
  seg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.dataset.s === cur) return; seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); window.dexter?.setUiStyle?.(b.dataset.s); });
})();
