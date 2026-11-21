/* Coin Quest Play - shared page UI: light/dark theme toggle and the Controls card.
   Theme: follows the system (prefers-color-scheme) until the student picks one; the choice is remembered. */
(function () {
  'use strict';
  var KEY = 'cq-theme', root = document.documentElement;
  var SUN = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>';
  var MOON = '<svg class="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>';
  var KBD = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>';
  var TOUCH = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11V5a2 2 0 0 1 4 0v6m0-1.5a2 2 0 0 1 4 0V13m-4-3.5V11m4 0a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-1.5a6 6 0 0 1-5-2.7L4 14.5a1.8 1.8 0 0 1 3-2L9 15"/></svg>';

  function stored() { try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : null; } catch (e) { return null; } }
  function system() { return window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; }
  function current() { return root.getAttribute('data-theme') || stored() || system(); }

  function paint(btn, theme) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#eef2f7' : '#0f172a');
    if (!btn) return;
    var toLight = theme === 'dark';
    btn.innerHTML = (toLight ? SUN : MOON) + '<span>' + (toLight ? 'Light' : 'Dark') + '</span>';
    btn.setAttribute('aria-label', 'Switch to ' + (toLight ? 'light' : 'dark') + ' theme');
    btn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
  }
  function apply(theme) { root.setAttribute('data-theme', theme); paint(document.getElementById('theme'), theme); }

  function initTheme() {
    var btn = document.getElementById('theme');
    apply(current());
    if (btn) btn.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, next); } catch (e) { /* ignore */ }
      apply(next); btn.blur();
    });
    if (window.matchMedia) {   // follow the system only while the student has not chosen
      var mq = matchMedia('(prefers-color-scheme: light)');
      var onChange = function () { if (!stored()) apply(system()); };
      if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
    }
  }

  function controlsCard(host) {
    var note = host.getAttribute('data-note') || '';
    var start = host.getAttribute('data-start') === 'true';
    var compact = host.getAttribute('data-variant') === 'compact';
    host.innerHTML =
      '<section class="controls-card' + (compact ? ' compact' : '') + '" aria-label="Controls">' +
      '<h2>Controls</h2><div class="cc-cols">' +
      '<div class="cc-col"><h3>' + KBD + ' Keyboard</h3><ul class="cc-list">' +
      '<li><span class="keys"><kbd aria-label="Left arrow">&larr;</kbd><kbd aria-label="Right arrow">&rarr;</kbd></span><span class="sep">or</span><span class="keys"><kbd>A</kbd><kbd>D</kbd></span><span class="what">Move</span></li>' +
      '<li><kbd class="wide">Space</kbd><span class="sep">or</span><span class="keys"><kbd aria-label="Up arrow">&uarr;</kbd><kbd>W</kbd></span><span class="what">Jump <em>(hold = higher)</em></span></li>' +
      (start ? '<li><kbd>Enter</kbd><span class="what">Start / play again</span></li>' : '') +
      '<li><kbd>R</kbd><span class="what">Restart</span><kbd>M</kbd><span class="what">Sound</span></li>' +
      '</ul></div>' +
      '<div class="cc-col"><h3>' + TOUCH + ' Touch</h3><ul class="cc-list">' +
      '<li><span class="tkey" aria-hidden="true">&larr;</span><span class="tkey" aria-hidden="true">&rarr;</span><span class="what">Move</span></li>' +
      '<li><span class="tkey jump" aria-hidden="true">JUMP</span><span class="what">Jump <em>(hold = higher)</em></span></li>' +
      '<li><span class="what">Tap the game screen to ' + (start ? 'press Start' : 'restart when a level ends') + '.</span></li>' +
      '</ul></div></div>' +
      (note ? '<p class="cc-note">' + note + '</p>' : '') +
      '</section>';
  }

  initTheme();
  Array.prototype.forEach.call(document.querySelectorAll('[data-controls]'), controlsCard);
})();
