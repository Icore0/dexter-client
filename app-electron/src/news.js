/* news.js - V2 News: one big featured story, a "Latest" list beside it, then an even grid of story cards.
   Same data (NEWS in extras.js) and the same reader (click a story, data-n). */
(function () {
  const ICON = { Update: 'download', Event: 'events', Cosmetics: 'cape', Community: 'friends', Performance: 'fire', Tips: 'star' };
  const th = n => n.art ? `background-image:url(${n.art})` : '';
  function drawNews2() {
    const cats = ['All', ...new Set(NEWS.map(n => n.cat))];
    newsCat = 'All'; $('#newsCats').innerHTML = '';
    const list = NEWS.filter(n => newsCat === 'All' || n.cat === newsCat), stories = list.filter(n => !n.quote), quotes = list.filter(n => n.quote);
    const f = stories[0], latest = stories.slice(1, 5), more = stories.slice(5);
    const meta = n => `${esc(n.date)}${n.read ? ' · ' + n.read + ' min read' : ''}`;
    const card = n => `<article class="nx-card" data-n="${NEWS.indexOf(n)}"><div class="nx-img" style="${th(n)}"><span class="nx-cat"><i data-i="${ICON[n.cat] || 'news'}"></i>${esc(n.cat)}</span></div><div class="nx-tx"><b>${esc(n.title)}</b><p>${esc(n.sum)}</p><div class="nx-meta">${meta(n)}<i data-i="right"></i></div></div></article>`;
    $('#newsBody').innerHTML = !f ? '<div class="nx-empty">No stories here yet.</div>' : `
      <div class="nx-top">
        <article class="nx-feature" data-n="${NEWS.indexOf(f)}" style="${th(f)}"><div class="nx-fx"><span class="nx-cat"><i data-i="${ICON[f.cat] || 'news'}"></i>${esc(f.cat)}</span><h2>${esc(f.title)}</h2><p>${esc(f.sum)}</p><div class="nx-row"><span class="nx-meta">${meta(f)}</span><button class="btn solid sm">Read story<i data-i="right"></i></button></div></div></article>
        <aside class="nx-side"><h4>Latest</h4>${latest.map(n => `<div class="nx-late" data-n="${NEWS.indexOf(n)}"><div class="nx-th" style="${th(n)}"></div><div class="t"><small>${esc(n.cat)} · ${esc(n.date)}</small><b>${esc(n.title)}</b></div></div>`).join('') || '<p class="muted">Nothing else yet.</p>'}</aside>
      </div>
      ${more.length || quotes.length ? `<h3 class="nx-h">More stories</h3><div class="nx-grid">${more.map(card).join('')}${quotes.map(q => `<div class="nx-card nx-quote"><i data-i="heart"></i><p>${esc(q.quote)}</p><small>${esc(q.date)}</small></div>`).join('')}</div>` : ''}
      <p class="nx-note">Sample stories. Real news will come from the Dexter team.</p>`;
    icons($('#newsBody'));
  }
  window.drawNews = drawNews2; PAGE_LOAD.news = drawNews2;
  $('#newsCats').addEventListener('click', e => { const b = e.target.closest('[data-nc]'); if (b) { newsCat = b.dataset.nc; drawNews2(); } });
})();
