/* Level 4 - Moving platforms & timer. Rules:
   Every frame: subtract the frame time from variable TimeLeft.  TimeLeft = 0 -> game over.
   Platforms move back and forth between two points and carry the player.
   Fall into a pit -> back to the last safe ground, 5 seconds penalty. */
(function () {
  'use strict';
  var L = CQLogic;
  var START = 50, PENALTY = 5;
  var state, world, done, result, lastSec, penaltyFlash, ev;

  function reset() {
    state = L.createState({ lives: 1, time: START });
    done = false; result = ''; lastSec = START; penaltyFlash = 0; ev = { fall: 0 };
    world = CQ.createWorld(CQLevels.level4, { state: state, hooks: {
      jump: function () { CQ.audio.jump(); },
      coin: function () { L.collectCoin(state, 10); CQ.audio.coin(); },
      fall: function () {
        state.timeLeft = Math.max(0, state.timeLeft - PENALTY); penaltyFlash = 1; ev.fall = 0.5; CQ.audio.hurt();
      },
      flag: function () {
        if (done) return;
        done = true; result = 'win'; world.frozen = true;
        state.bonus = L.timeBonus(state.timeLeft); L.addScore(state, state.bonus);
        CQ.audio.win();
        CQ.progress.complete('4', L.starRating(state.coins, state.totalCoins, state.timeLeft >= 15 ? 1 : 0, 1));
        document.getElementById('status').textContent = 'Level complete!';
      }
    } });
    state.totalCoins = world.coins.length;
  }

  function timeUp() {
    done = true; result = 'lose'; world.frozen = true; CQ.audio.lose();
    document.getElementById('status').textContent = "Time's up";
  }

  CQ.boot({
    reset: reset,
    ended: function () { return done; },
    update: function (dt, input) {
      world.update(dt, input);
      if (!done) {
        state.timeLeft = L.tickTimer(state.timeLeft, dt);
        var sec = Math.ceil(state.timeLeft);
        if (sec !== lastSec) { lastSec = sec; if (sec <= 10 && sec > 0) CQ.audio.tick(); }
        if (state.timeLeft <= 0) timeUp();
      }
      penaltyFlash = Math.max(0, penaltyFlash - dt); ev.fall = Math.max(0, ev.fall - dt);
      var p = world.player;
      CQ.setEvents({ timer: !done, ride: !!(p.standing && p.standing.moving), fall: ev.fall > 0, timeup: result === 'lose' });
      var pl = world.platforms[0];
      CQ.setLive([['TimeLeft', state.timeLeft.toFixed(1)], ['onMovingPlatform', p.standing && p.standing.moving ? 'true' : 'false'],
                  ['platformX', Math.round(pl.x)]], dt);
    },
    draw: function (ctx) {
      world.draw(ctx);
      var low = state.timeLeft <= 10;
      CQ.text(ctx, L.formatTime(state.timeLeft), CQ.W / 2, 6, { size: 22, align: 'center', color: low ? '#f87171' : '#fff' });
      if (penaltyFlash > 0) {
        ctx.globalAlpha = Math.min(1, penaltyFlash * 2);
        CQ.text(ctx, '-' + PENALTY + 's', CQ.W / 2, 32, { size: 14, align: 'center', color: '#f87171' });
        ctx.globalAlpha = 1;
      }
      CQ.hud.score(ctx, state.score, 10, 8);
      CQ.hud.coins(ctx, state.coins, state.totalCoins, 10, 28);
      if (done && result === 'win')
        CQ.overlay(ctx, 'Made it!', ['Time left: ' + L.formatTime(state.timeLeft) + '  (bonus ' + state.bonus + ')', 'Score: ' + state.score]);
      else if (done) CQ.overlay(ctx, "Time's up!", ['Score: ' + state.score, 'Ride the platforms and do not fall!']);
    }
  });
})();
