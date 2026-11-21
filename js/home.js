/* Home page: draws the little icons and shows saved progress (stars) from this browser. */
(function () {
  'use strict';
  var done = CQ.progress.all();

  function icon(id) {
    var c = document.getElementById('ic' + id); if (!c) return;
    var x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.clearRect(0, 0, 48, 48);
    x.fillStyle = '#3fae49'; x.fillRect(0, 38, 48, 4); x.fillStyle = '#8a5a2b'; x.fillRect(0, 42, 48, 6);
    if (id === 1) { CQ.art.heroIcon(x, 6, 12, 2.2); x.fillStyle = '#ef4444'; x.fillRect(34, 8, 2, 30); x.fillRect(36, 8, 8, 6); }
    if (id === 2) { [[6, 24], [18, 12], [30, 24], [18, 28]].forEach(function (p) { CQ.art.coin(x, { x: p[0], y: p[1], w: 12, h: 12 }, 0.2 * p[0]); }); }
    if (id === 3) { CQ.art.slime(x, { x: 6, y: 26, w: 14, h: 12, dir: 1, alive: true, squash: 0 }, 0.3);
                    CQ.art.heart(x, 26, 6, true); CQ.art.heart(x, 26 + 0, 24, false); }
    if (id === 4) { CQ.art.platform(x, { x: 6, y: 30, w: 36 }); x.fillStyle = '#e2e8f0'; x.fillRect(5, 16, 4, 2); x.fillRect(39, 16, 4, 2);
                    x.font = 'bold 12px sans-serif'; x.fillStyle = '#1e1b4b'; x.fillText('0:30', 8, 14); }
    if (id === 5) { CQ.art.star(x, 24, 22, 15, true); }
  }
  for (var i = 1; i <= 5; i++) {
    icon(i);
    var s = done[i] || 0, card = document.getElementById('card' + i), st = document.getElementById('stars' + i);
    if (s && card) { card.classList.add('done'); }
    if (st) {
      var h = '';
      for (var k = 1; k <= 3; k++) h += k <= s ? '&#9733;' : '<span class="off">&#9733;</span>';
      st.innerHTML = s ? h : '';
      st.setAttribute('aria-label', s ? s + ' of 3 stars' : 'Not played yet');
    }
  }

  // overall progress
  var total = 0;
  for (var j = 1; j <= 5; j++) if (done[j]) total++;
  var pt = document.getElementById('prog-text'), pf = document.getElementById('prog-fill'), pb = document.getElementById('prog');
  if (pt) pt.textContent = total + ' of 5 levels done' + (total === 5 ? ' - well played!' : '');
  if (pf) pf.style.width = (total * 20) + '%';
  if (pb) pb.setAttribute('aria-valuenow', total);

  // banner
  var b = document.getElementById('banner');
  if (b) {
    var x = b.getContext('2d'); x.imageSmoothingEnabled = false;
    for (var c = 0; c < 30; c++) { CQ.art.tile(x, c * 16, 64, true); CQ.art.tile(x, c * 16, 80, false); }
    CQ.art.heroIcon(x, 40, 64 - 28, 2);
    [0, 1, 2, 3, 4].forEach(function (n) { CQ.art.coin(x, { x: 120 + n * 28, y: 22 + (n % 2) * 8, w: 12, h: 12 }, 0.3 * n); });
    CQ.art.slime(x, { x: 330, y: 52, w: 14, h: 12, dir: -1, alive: true, squash: 0 }, 0.5);
    CQ.art.flag(x, { x: 430, y: 24, w: 16, h: 40 }, 0.4);
  }
})();
