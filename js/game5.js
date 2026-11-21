/* Level 5 - Menu, sounds, win screen. Three "scenes" in one page:
   Menu -> (Start) -> Play -> (flag) -> Win   |   (no lives / no time) -> Game over.
   Scene = a variable that decides what to update and draw.  Sounds are made with WebAudio. */
(function () {
  'use strict';
  var L = CQLogic;
  var START = 90;
  var scene, state, world, result, lock, ev, tms = 0;
  var BTN = {
    start: { x: 170, y: 150, w: 140, h: 34 },
    sound: { x: 170, y: 194, w: 140, h: 28 },
    again: { x: 106, y: 186, w: 124, h: 32 },
    menu: { x: 250, y: 186, w: 124, h: 32 }
  };

  function inside(b, x, y) { return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }

  function toMenu() {
    scene = 'menu'; lock = 0.3; ev = { go: 0 };
    CQ.audio.musicStop();
    world = null;
  }
  function startPlay() {
    state = L.createState({ lives: 3, time: START });
    result = ''; lock = 0.3; ev = { go: 0 };
    world = CQ.createWorld(CQLevels.level5, { state: state, hooks: {
      jump: function () { CQ.audio.jump(); },
      land: function () { CQ.audio.land(); },
      coin: function () { L.collectCoin(state, 10); CQ.audio.coin(); },
      stomp: function () { L.addScore(state, 50); CQ.audio.stomp(); },
      hurt: function () {
        var lost = L.loseLife(state, 1.5);
        if (lost) { CQ.audio.hurt(); if (state.over) finish('lose'); }
        return lost;
      },
      fall: function () {
        if (L.loseLife(state, 1.5)) { CQ.audio.hurt(); if (state.over) finish('lose'); }
        state.timeLeft = Math.max(0, state.timeLeft - 3);
      },
      flag: function () { if (scene !== 'play') return; state.bonus = L.timeBonus(state.timeLeft); L.addScore(state, state.bonus); finish('win'); }
    } });
    state.totalCoins = world.coins.length;
    scene = 'play'; ev.go = 0.6;
    CQ.audio.click(); CQ.audio.musicStart();
  }
  function finish(r) {
    result = r; scene = r; lock = 0.5; world.frozen = true; CQ.audio.musicStop();
    if (r === 'win') {
      state.stars = L.starRating(state.coins, state.totalCoins, state.lives, state.maxLives);
      CQ.progress.complete('5', state.stars); CQ.audio.win();
      document.getElementById('status').textContent = 'You win!';
    } else { CQ.audio.lose(); document.getElementById('status').textContent = 'Game over'; }
  }

  function button(ctx, b, label, hot) {
    ctx.fillStyle = hot ? '#fbbf24' : 'rgba(15,23,42,0.85)'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    CQ.text(ctx, label, b.x + b.w / 2, b.y + b.h / 2 - 8, { size: 15, align: 'center', color: hot ? '#1e1b4b' : '#fff' });
  }

  function drawMenu(ctx) {
    CQ.art.background(ctx, tms * 30);
    ctx.fillStyle = '#3fae49'; ctx.fillRect(0, 232, CQ.W, 40);
    ctx.fillStyle = '#58c964'; ctx.fillRect(0, 232, CQ.W, 4);
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(0, 244, CQ.W, 28);
    var by = Math.sin(tms * 4) * 4;
    for (var i = 0; i < 5; i++) CQ.art.coin(ctx, { x: 150 + i * 40, y: 118 + Math.sin(tms * 3 + i) * 5, w: 12, h: 12 }, tms);
    CQ.art.hero(ctx, { x: 90, y: 218 + by * 0 - Math.abs(Math.sin(tms * 3)) * 18, w: 10, h: 14, vx: 0, onGround: true, facing: 1 }, tms);
    CQ.art.slime(ctx, { x: 370, y: 220, w: 14, h: 12, dir: -1, alive: true, squash: 0 }, tms);
    CQ.text(ctx, 'COIN QUEST', CQ.W / 2, 40 + by, { size: 44, align: 'center', color: '#fde047' });
    CQ.text(ctx, 'Final level: everything together', CQ.W / 2, 94, { size: 14, align: 'center' });
    button(ctx, BTN.start, 'START', true);
    button(ctx, BTN.sound, 'Sound: ' + (CQ.audio.muted ? 'Off' : 'On'), false);
    CQ.text(ctx, 'Enter / Space / tap Jump to start', CQ.W / 2, 228 - 2, { size: 11, align: 'center', bold: false });
  }

  function drawEnd(ctx, win) {
    ctx.fillStyle = 'rgba(15,23,42,0.55)'; ctx.fillRect(0, 0, CQ.W, CQ.H);
    CQ.panel(ctx, 90, 56, 300, 176, 0.94);
    CQ.text(ctx, win ? 'You win!' : 'Game over', CQ.W / 2, 66, { size: 28, align: 'center', color: win ? '#fbbf24' : '#f87171' });
    CQ.text(ctx, 'Score: ' + state.score, CQ.W / 2, 104, { size: 16, align: 'center', color: '#fde047' });
    if (win) {
      for (var i = 0; i < 3; i++) CQ.art.star(ctx, 210 + i * 30, 142, 12, i < state.stars);
      CQ.text(ctx, 'Coins ' + state.coins + '/' + state.totalCoins + '   Time left ' + L.formatTime(state.timeLeft), CQ.W / 2, 160, { size: 12, align: 'center', bold: false });
    } else CQ.text(ctx, state.timeLeft <= 0 ? "Time's up!" : 'Out of lives!', CQ.W / 2, 134, { size: 14, align: 'center' });
    button(ctx, BTN.again, 'Play again', true);
    button(ctx, BTN.menu, 'Menu', false);
  }

  CQ.boot({
    reset: toMenu,
    ended: function () { return false; },
    onUnmute: function () { if (scene === 'play') CQ.audio.musicStart(); },
    tap: function (x, y) {
      if (lock > 0) return;
      if (scene === 'menu') {
        if (inside(BTN.sound, x, y)) CQ.toggleMute(); else startPlay();
      } else if (scene === 'win' || scene === 'lose') {
        if (inside(BTN.menu, x, y)) toMenu(); else startPlay();
      }
    },
    update: function (dt, input) {
      tms += dt; lock = Math.max(0, lock - dt); ev.go = Math.max(0, ev.go - dt);
      if (scene === 'menu') {
        if (lock <= 0 && input.actionPressed) startPlay();
      } else if (scene === 'play') {
        world.update(dt, input);
        state.timeLeft = L.tickTimer(state.timeLeft, dt);
        if (state.timeLeft <= 0 && scene === 'play') finish('lose');
      } else if (world) {
        world.update(dt, input);
        if (lock <= 0 && input.actionPressed) startPlay();
      }
      CQ.setEvents({ menu: scene === 'menu', play: scene === 'play', win: scene === 'win', lose: scene === 'lose' });
      CQ.setLive([['scene', '"' + scene + '"'], ['Score', state ? state.score : 0],
                  ['Lives', state && scene !== 'menu' ? state.lives : '-'],
                  ['TimeLeft', state && scene !== 'menu' ? L.formatTime(state.timeLeft) : '-']], dt);
    },
    draw: function (ctx) {
      if (scene === 'menu') { drawMenu(ctx); return; }
      world.draw(ctx);
      CQ.hud.hearts(ctx, state.lives, state.maxLives, 10, 9);
      CQ.hud.score(ctx, state.score, 10, 28);
      CQ.hud.coins(ctx, state.coins, state.totalCoins, 10, 48);
      CQ.text(ctx, L.formatTime(state.timeLeft), CQ.W / 2, 6, { size: 22, align: 'center', color: state.timeLeft <= 10 ? '#f87171' : '#fff' });
      if (ev.go > 0) CQ.text(ctx, 'GO!', CQ.W / 2, 90, { size: 40, align: 'center', color: '#fde047' });
      if (scene === 'win') drawEnd(ctx, true);
      else if (scene === 'lose') drawEnd(ctx, false);
    }
  });
})();
