/* Coin Quest Play - tiny engine: fixed 60 Hz loop, keyboard + touch input, WebAudio sounds,
   pixel/vector art drawn in code, storage and page wiring. No external assets. */
(function () {
  'use strict';
  var W = 480, H = 272;
  var CQ = window.CQ = { W: W, H: H };

  // ---------- storage (never throws) ----------
  CQ.store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('cq:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem('cq:' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };
  CQ.progress = {
    all: function () { return CQ.store.get('done', {}); },
    complete: function (id, stars) {
      var d = CQ.progress.all();
      d[id] = Math.max(d[id] || 0, stars || 1);
      CQ.store.set('done', d);
    }
  };

  // ---------- input ----------
  var KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyZ: 'jump', Enter: 'action'
  };
  var kb = { left: {}, right: {}, jump: {}, action: {} };   // action -> {code:true}
  var tc = { left: false, right: false, jump: false, action: false };
  var pressed = { jump: false, action: false };
  function isHeld(a) {
    if (tc[a]) return true;
    for (var k in kb[a]) if (kb[a][k]) return true;
    return false;
  }
  function press(a) { if (a === 'jump' || a === 'action') pressed[a] = true; }
  CQ.input = {
    read: function () {
      return { left: isHeld('left'), right: isHeld('right'), jumpHeld: isHeld('jump') || isHeld('action'),
               jumpPressed: pressed.jump, actionPressed: pressed.action || pressed.jump };
    },
    endFrame: function () { pressed.jump = false; pressed.action = false; },
    clear: function () {
      ['left', 'right', 'jump', 'action'].forEach(function (a) { kb[a] = {}; tc[a] = false; });
    }
  };

  var keyHandlers = {};   // extra keys, e.g. R / M
  CQ.onKey = function (code, fn) { keyHandlers[code] = fn; };

  function wireKeys() {
  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Only the game itself (canvas / page background) gets the game keys.
    // Buttons, sliders and links keep Space/Enter/arrows for keyboard users.
    if (!window.CQLogic.gameKeyAllowed(e.target)) return;
    CQ.audio.unlock();
    var a = KEYMAP[e.code];
    if (a) {
      e.preventDefault();
      if (!kb[a][e.code]) { if (!e.repeat) press(a); }
      kb[a][e.code] = true;
      if (e.code === 'Space') { kb.action.Space = true; if (!e.repeat) press('action'); }
    } else if (keyHandlers[e.code] && !e.repeat) { keyHandlers[e.code](e); }
  });
  window.addEventListener('keyup', function (e) {
    var a = KEYMAP[e.code];
    if (a) { kb[a][e.code] = false; if (e.code === 'Space') kb.action.Space = false; }
  });
  window.addEventListener('blur', function () { CQ.input.clear(); });
  }

  function wireTouch() {
    var btns = document.querySelectorAll('[data-act]');
    Array.prototype.forEach.call(btns, function (b) {
      var a = b.getAttribute('data-act');
      function down(e) {
        e.preventDefault(); CQ.audio.unlock();
        try { b.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
        if (!tc[a]) press(a);
        tc[a] = true; b.classList.add('on');
      }
      function up(e) { e.preventDefault(); tc[a] = false; b.classList.remove('on'); }
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
  }

  // Pointer position on the canvas in game pixels.
  CQ.onTap = function (canvas, fn) {
    canvas.addEventListener('pointerdown', function (e) {
      CQ.audio.unlock();
      var r = canvas.getBoundingClientRect();
      fn((e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height);
    });
  };

  // ---------- audio (WebAudio, everything generated) ----------
  CQ.audio = (function () {
    var ctx = null, master = null, muted = CQ.store.get('muted', false);
    var music = { timer: null, next: 0, step: 0, on: false };
    function ensure() {
      if (!ctx) {
        var C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        try { ctx = new C(); } catch (e) { return null; }
        master = ctx.createGain(); master.gain.value = 0.22; master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      return ctx;
    }
    function tone(f0, dur, o) {
      o = o || {};
      if (muted) return;
      var c = ensure(); if (!c) return;
      var t = c.currentTime + (o.delay || 0);
      var osc = c.createOscillator(), g = c.createGain();
      osc.type = o.type || 'square';
      osc.frequency.setValueAtTime(f0, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
      g.gain.setValueAtTime(o.vol || 0.3, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + dur + 0.03);
    }
    function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }
    var MEL = [72, -1, 76, 79, 76, -1, 79, -1, 74, -1, 77, 81, 77, -1, 81, -1,
               76, -1, 79, 83, 79, -1, 76, -1, 72, -1, 67, -1, 72, -1, -1, -1];
    var BASS = [48, -1, 55, -1, 50, -1, 57, -1, 52, -1, 59, -1, 48, -1, 43, -1,
                48, -1, 55, -1, 50, -1, 57, -1, 52, -1, 59, -1, 48, -1, 43, -1];
    function pump() {
      var c = ensure(); if (!c || !music.on) return;
      var spb = 60 / 140 / 2;
      if (music.next < c.currentTime) music.next = c.currentTime + 0.05;
      while (music.next < c.currentTime + 0.3) {
        var i = music.step % MEL.length, d = music.next - c.currentTime;
        if (!muted) {
          if (MEL[i] > 0) tone(midi(MEL[i]), spb * 0.9, { vol: 0.07, delay: d });
          if (BASS[i] > 0) tone(midi(BASS[i] - 12), spb * 1.8, { vol: 0.12, type: 'triangle', delay: d });
        }
        music.step++; music.next += spb;
      }
    }
    var api = {
      unlock: function () { if (!muted) ensure(); },
      get muted() { return muted; },
      setMuted: function (m) { muted = !!m; CQ.store.set('muted', muted); },
      tone: tone,
      jump: function () { tone(280, 0.14, { to: 640, vol: 0.22 }); },
      land: function () { tone(120, 0.06, { type: 'triangle', to: 70, vol: 0.2 }); },
      coin: function () { tone(988, 0.07, { vol: 0.2 }); tone(1319, 0.18, { delay: 0.07, vol: 0.2 }); },
      stomp: function () { tone(330, 0.12, { to: 90, vol: 0.3 }); },
      hurt: function () { tone(260, 0.35, { type: 'sawtooth', to: 60, vol: 0.25 }); },
      click: function () { tone(660, 0.05, { vol: 0.18 }); },
      tick: function () { tone(880, 0.05, { vol: 0.15 }); },
      win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.22, { delay: i * 0.12, vol: 0.22 }); });
                         tone(1047, 0.5, { delay: 0.5, vol: 0.22 }); },
      lose: function () { [440, 370, 294, 220].forEach(function (f, i) { tone(f, 0.25, { delay: i * 0.18, type: 'triangle', vol: 0.28 }); }); },
      musicStart: function () {
        if (music.on) return;
        music.on = true; music.step = 0; music.next = 0;
        pump(); music.timer = setInterval(pump, 100);
      },
      musicStop: function () { music.on = false; clearInterval(music.timer); music.timer = null; }
    };
    return api;
  })();

  // ---------- art ----------
  var PAL = { H: '#ef4444', S: '#fcd9a8', E: '#1e1b4b', B: '#2563eb', P: '#1e3a8a', W: '#7c2d12' };
  var HEAD = ['...HHHHH....', '..HHHHHHHH..', '..HHHHHHHHH.', '..SSSSSSSS..', '..SSSSESSS..', '..SSSSSSSS..',
              '...BBBBBB...', '.SBBBBBBBS..', '.SBBBBBBBS..', '..BBBBBBBB..'];
  var LEGS = {
    idle: ['..PPPPPPPP..', '..PPP..PPP..', '..PPP..PPP..', '..WWW..WWW..'],
    run1: ['..PPPPPPPP..', '..PPP..PP...', '..PP....PP..', '..WW....WWW.'],
    run2: ['..PPPPPPPP..', '...PP..PPP..', '..PP....PP..', '..WWW...WW..'],
    jump: ['..PPPPPPPP..', '..PPP.PPPP..', '..PP...PP...', '..WW...WW...']
  };
  CQ.heroRows = {};
  Object.keys(LEGS).forEach(function (k) { CQ.heroRows[k] = HEAD.concat(LEGS[k]); });

  CQ.makeSprite = function (rows, pal) {
    var c = document.createElement('canvas');
    c.width = rows[0].length; c.height = rows.length;
    var x = c.getContext('2d');
    for (var r = 0; r < rows.length; r++)
      for (var i = 0; i < rows[r].length; i++) {
        var ch = rows[r][i];
        if (ch !== '.' && pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i, r, 1, 1); }
      }
    return c;
  };
  var hero = {};
  function heroSprite(name) {
    return hero[name] || (hero[name] = CQ.makeSprite(CQ.heroRows[name], PAL));
  }

  function tileCanvas(grass) {
    var c = document.createElement('canvas'); c.width = c.height = 16;
    var x = c.getContext('2d');
    x.fillStyle = '#8a5a2b'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#6d4420';
    [[3, 6], [10, 4], [7, 11], [13, 12], [2, 13]].forEach(function (p) { x.fillRect(p[0], p[1], 2, 2); });
    x.fillStyle = '#a06a35'; x.fillRect(0, 0, 16, 1);
    if (grass) {
      x.fillStyle = '#3fae49'; x.fillRect(0, 0, 16, 5);
      x.fillStyle = '#58c964'; x.fillRect(0, 0, 16, 2);
      x.fillStyle = '#2d8a39'; x.fillRect(0, 5, 16, 1);
      x.fillStyle = '#3fae49'; x.fillRect(2, 5, 2, 3); x.fillRect(9, 5, 2, 2); x.fillRect(13, 5, 2, 3);
    }
    return c;
  }
  var tiles = null;

  CQ.art = {
    hero: function (ctx, p, t) {
      var name = !p.onGround ? 'jump' : Math.abs(p.vx) > 10 ? (Math.floor(t * 10) % 2 ? 'run1' : 'run2') : 'idle';
      var s = heroSprite(name);
      ctx.save();
      var cx = Math.round(p.x + p.w / 2), y = Math.round(p.y);
      ctx.translate(cx, y);
      if (p.facing < 0) ctx.scale(-1, 1);
      ctx.drawImage(s, -6, 0);
      ctx.restore();
    },
    heroIcon: function (ctx, x, y, scale) {
      ctx.drawImage(heroSprite('idle'), x, y, 12 * scale, 14 * scale);
    },
    coin: function (ctx, c, t) {
      var cx = c.x + c.w / 2, cy = c.y + c.h / 2 + Math.sin(t * 4 + c.x * 0.1) * 1.5;
      var w = Math.abs(Math.cos(t * 3 + c.x * 0.05)) * 5 + 1;
      ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.ellipse(cx, cy, w + 1, 7, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.ellipse(cx, cy, w, 6, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.ellipse(cx - w * 0.2, cy - 1, w * 0.4, 3, 0, 0, 6.283); ctx.fill();
    },
    slime: function (ctx, e, t) {
      var sq = e.alive ? 1 + Math.sin(t * 8) * 0.08 : Math.max(0.15, e.squash * 2);
      var w = e.w * (2 - sq) * (e.alive ? 1 : 1.25), h = e.h * (e.alive ? sq : 0.4);
      var cx = e.x + e.w / 2, by = e.y + e.h;
      ctx.fillStyle = '#15803d';
      ctx.beginPath(); ctx.moveTo(cx - w / 2 - 1, by); ctx.quadraticCurveTo(cx - w / 2 - 1, by - h * 2.1, cx, by - h * 2.1);
      ctx.quadraticCurveTo(cx + w / 2 + 1, by - h * 2.1, cx + w / 2 + 1, by); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.beginPath(); ctx.moveTo(cx - w / 2, by); ctx.quadraticCurveTo(cx - w / 2, by - h * 2, cx, by - h * 2);
      ctx.quadraticCurveTo(cx + w / 2, by - h * 2, cx + w / 2, by); ctx.closePath(); ctx.fill();
      if (e.alive) {
        var ex = e.dir * 1.5;
        ctx.fillStyle = '#fff'; ctx.fillRect(cx - 5 + ex, by - h - 3, 4, 5); ctx.fillRect(cx + 1 + ex, by - h - 3, 4, 5);
        ctx.fillStyle = '#1e1b4b'; ctx.fillRect(cx - 4 + ex + e.dir, by - h - 1, 2, 3); ctx.fillRect(cx + 2 + ex + e.dir, by - h - 1, 2, 3);
      }
    },
    flag: function (ctx, f, t) {
      ctx.fillStyle = '#e5e7eb'; ctx.fillRect(f.x + 7, f.y, 2, f.h);
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(f.x + 8, f.y, 3, 0, 6.283); ctx.fill();
      var wv = Math.sin(t * 5) * 2;
      ctx.fillStyle = '#ef4444'; ctx.beginPath();
      ctx.moveTo(f.x + 9, f.y + 3); ctx.lineTo(f.x + 22, f.y + 8 + wv); ctx.lineTo(f.x + 9, f.y + 14); ctx.closePath(); ctx.fill();
    },
    platform: function (ctx, p) {
      ctx.fillStyle = '#7c2d12'; ctx.fillRect(p.x, p.y, p.w, 8);
      ctx.fillStyle = '#c2763a'; ctx.fillRect(p.x, p.y, p.w, 3);
      ctx.fillStyle = '#5b2108';
      for (var x = p.x + 8; x < p.x + p.w; x += 12) ctx.fillRect(x, p.y + 4, 2, 4);
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(p.x + 2, p.y + 3, 2, 2); ctx.fillRect(p.x + p.w - 4, p.y + 3, 2, 2);
    },
    oneWay: function (ctx, p) {
      ctx.fillStyle = '#a16207'; ctx.fillRect(p.x, p.y, p.w, 6);
      ctx.fillStyle = '#facc15'; ctx.fillRect(p.x, p.y, p.w, 2);
      ctx.fillStyle = '#854d0e';
      for (var x = p.x + 4; x < p.x + p.w; x += 16) ctx.fillRect(x, p.y + 3, 8, 1);
    },
    tile: function (ctx, x, y, grass) {
      if (!tiles) tiles = { grass: tileCanvas(true), dirt: tileCanvas(false) };
      ctx.drawImage(grass ? tiles.grass : tiles.dirt, x, y);
    },
    heart: function (ctx, x, y, full) {
      ctx.fillStyle = full ? '#ef4444' : '#475569';
      ctx.beginPath(); ctx.moveTo(x + 6, y + 11);
      ctx.bezierCurveTo(x - 4, y + 4, x + 1, y - 3, x + 6, y + 3);
      ctx.bezierCurveTo(x + 11, y - 3, x + 16, y + 4, x + 6, y + 11); ctx.fill();
      if (full) { ctx.fillStyle = '#fca5a5'; ctx.fillRect(x + 2, y + 2, 2, 2); }
    },
    star: function (ctx, cx, cy, r, full) {
      ctx.fillStyle = full ? '#fbbf24' : '#334155';
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
        ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
      if (full) { ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1; ctx.stroke(); }
    },
    background: function (ctx, camX) {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#38bdf8'); g.addColorStop(1, '#bae6fd');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // sun
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(400, 50, 22, 0, 6.283); ctx.fill();
      // clouds (slow parallax)
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (var i = 0; i < 8; i++) {
        var x = ((i * 190 - camX * 0.2) % (W + 200) + (W + 200)) % (W + 200) - 100, y = 30 + (i * 37) % 70;
        ctx.beginPath(); ctx.arc(x, y, 12, 0, 6.283); ctx.arc(x + 14, y - 6, 15, 0, 6.283);
        ctx.arc(x + 30, y, 12, 0, 6.283); ctx.fill();
      }
      // hills (two parallax layers)
      hill(ctx, camX * 0.35, '#7dd3a8', 170, 36, 0.011, 1.3);
      hill(ctx, camX * 0.6, '#4fb77c', 200, 28, 0.017, 4.1);
    }
  };
  function hill(ctx, off, color, base, amp, freq, ph) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
    for (var x = 0; x <= W; x += 8) ctx.lineTo(x, base + Math.sin((x + off) * freq + ph) * amp);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }

  // ---------- text helpers ----------
  CQ.text = function (ctx, str, x, y, o) {
    o = o || {};
    ctx.font = (o.bold === false ? '' : 'bold ') + (o.size || 12) + 'px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'top';
    ctx.fillStyle = 'rgba(15,23,42,0.85)'; ctx.fillText(str, x + 1, y + 1);
    ctx.fillStyle = o.color || '#fff'; ctx.fillText(str, x, y);
  };
  CQ.panel = function (ctx, x, y, w, h, alpha) {
    ctx.fillStyle = 'rgba(15,23,42,' + (alpha === undefined ? 0.82 : alpha) + ')';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  };
  CQ.overlay = function (ctx, title, lines, hint, color) {
    ctx.fillStyle = 'rgba(15,23,42,0.55)'; ctx.fillRect(0, 0, W, H);
    var h = 70 + lines.length * 18;
    var y = Math.round((H - h) / 2);
    CQ.panel(ctx, 90, y, W - 180, h, 0.92);
    CQ.text(ctx, title, W / 2, y + 14, { size: 24, align: 'center', color: color || '#fbbf24' });
    lines.forEach(function (l, i) { CQ.text(ctx, l, W / 2, y + 48 + i * 18, { size: 13, align: 'center', bold: false }); });
    CQ.text(ctx, hint || 'Tap here, press R or use Restart', W / 2, y + h - 22, { size: 11, align: 'center', color: '#94a3b8', bold: false });
  };

  // ---------- particles ----------
  CQ.burst = function (list, x, y, n, color, speed) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, s = (0.4 + Math.random()) * (speed || 70);
      list.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: 0.45 + Math.random() * 0.2, color: color });
    }
  };
  CQ.stepParticles = function (list, dt) {
    for (var i = list.length - 1; i >= 0; i--) {
      var p = list[i]; p.life -= dt; p.vy += 400 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.life <= 0) list.splice(i, 1);
    }
  };
  CQ.drawParticles = function (ctx, list) {
    list.forEach(function (p) {
      ctx.globalAlpha = Math.min(1, p.life * 3); ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 3);
    });
    ctx.globalAlpha = 1;
  };

  // ---------- "what is happening" panel: events light up, variables show live ----------
  var evState = {};
  CQ.setEvents = function (map) {
    for (var k in map) {
      if (evState[k] === !!map[k]) continue;
      evState[k] = !!map[k];
      var el = document.querySelector('[data-ev="' + k + '"]');
      if (el) el.classList.toggle('fire', evState[k]);
    }
  };
  var liveTimer = 0;
  CQ.setLive = function (pairs, dt) {
    liveTimer -= dt; if (liveTimer > 0) return;
    liveTimer = 0.1;
    var el = document.getElementById('live'); if (!el) return;
    el.innerHTML = pairs.map(function (p) {
      return '<span class="var"><b>' + p[0] + '</b> = ' + p[1] + '</span>';
    }).join('');
  };

  // ---------- boot: wire the page and start the loop ----------
  // game: {reset(), update(dt, input), draw(ctx), ended() -> bool}
  CQ.boot = function (game) {
    var canvas = document.getElementById('game');
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    wireKeys(); wireTouch();
    // A focusable canvas: it receives the game keys. Clicking or tapping it gives it focus.
    function focusGame() { try { canvas.focus({ preventScroll: true }); } catch (x) { /* ignore */ } }
    canvas.addEventListener('pointerdown', focusGame);
    focusGame();

    function restart() {
      CQ.input.clear(); evState = {};
      Array.prototype.forEach.call(document.querySelectorAll('[data-ev]'), function (e) { e.classList.remove('fire'); });
      game.reset(); CQ.audio.click();
      var status = document.getElementById('status'); if (status) status.textContent = 'Game restarted';
    }
    var rb = document.getElementById('restart');
    if (rb) rb.addEventListener('click', function (e) { restart(); if (e.detail > 0) focusGame(); });
    CQ.onKey('KeyR', restart);

    var mb = document.getElementById('mute');
    function paintMute() {
      if (!mb) return;
      mb.textContent = 'Sound: ' + (CQ.audio.muted ? 'Off' : 'On');
      mb.setAttribute('aria-pressed', CQ.audio.muted ? 'true' : 'false');
    }
    function toggleMute() {
      CQ.audio.setMuted(!CQ.audio.muted);
      if (CQ.audio.muted) CQ.audio.musicStop();
      else { CQ.audio.unlock(); CQ.audio.click(); if (game.onUnmute) game.onUnmute(); }
      paintMute(); if (game.onMute) game.onMute();
    }
    CQ.toggleMute = toggleMute;
    if (mb) mb.addEventListener('click', function (e) { toggleMute(); if (e.detail > 0) focusGame(); });
    CQ.onKey('KeyM', toggleMute);
    paintMute();

    CQ.onTap(canvas, function (x, y) {
      if (game.tap) game.tap(x, y); else if (game.ended && game.ended()) restart();
    });
    CQ.restart = restart;

    game.reset();
    var STEP = 1 / 60, acc = 0, last = performance.now();
    document.addEventListener('visibilitychange', function () { last = performance.now(); });
    function frame(now) {
      var d = (now - last) / 1000; last = now;
      if (d > 0.25) d = 0.25;
      acc += d;
      var n = 0;
      while (acc >= STEP && n < 5) {
        game.update(STEP, CQ.input.read()); CQ.input.endFrame();
        acc -= STEP; n++;
      }
      if (n === 5) acc = 0;
      game.draw(ctx);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };
})();
