/* style-load.js - loads the PvPHQ style files only when that style is chosen (Settings > Window > Launcher style). Runs while the page is parsed. */
(function () {
  const pv = window.dexter && window.dexter.uiStyle === 'pvphq', s = document.currentScript, what = s && s.dataset.load;
  if (!pv) return;
  if (what === 'css') document.write('<link rel="stylesheet" href="pvphq.css">');
  else if (what) document.write('<script src="' + what + '"><\/script>');
})();
