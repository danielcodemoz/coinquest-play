/* Level 2 - Collect coins + score. Rules:
   Player touches Coin -> delete Coin, add 10 to variable Score, play sound.
   Number of Coin objects = 0 -> win. */
(function () {
  'use strict';
  var L = CQLogic;
  var state, world, done, flash;

  function reset() {
    state = L.createState({ lives: 1 });
    done = false; flash = 0;
    world = CQ.createWorld(CQLevels.level2, { state: state, hooks: {
      jump: function () { CQ.audio.jump(); },
      coin: function () {
        flash = 0.3; CQ.audio.coin();
        if (L.collectCoin(state, 10)) {
          done = true; world.frozen = true; CQ.audio.win(); CQ.progress.complete('2', 3);
          document.getElementById('status').textContent = 'All coins collected!';
        }
      }
    } });
    state.totalCoins = world.coins.length;
  }

  CQ.boot({
    reset: reset,
    ended: function () { return done; },
    update: function (dt, input) {
      world.update(dt, input);
      flash = Math.max(0, flash - dt);
      var left = state.totalCoins - state.coins;
      CQ.setEvents({ touch: flash > 0, score: flash > 0, win: done });
      CQ.setLive([['Score', state.score], ['coinsLeft', left], ['coinsTaken', state.coins]], dt);
    },
    draw: function (ctx) {
      world.draw(ctx);
      CQ.hud.score(ctx, state.score, 10, 8);
      CQ.hud.coins(ctx, state.coins, state.totalCoins, 10, 28);
      if (done) CQ.overlay(ctx, 'All coins!', ['Final score: ' + state.score, state.coins + ' of ' + state.totalCoins + ' coins']);
    }
  });
})();
