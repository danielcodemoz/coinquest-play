/* Level 3 - Enemies & lives. Rules:
   Player collides with Slime AND player is falling -> delete Slime, add 50 to Score.
   Player collides with Slime (otherwise) -> subtract 1 from Lives, invincible for 1.5 s.
   Lives = 0 -> game over.  Fall into a pit -> lose a life. */
(function () {
  'use strict';
  var L = CQLogic;
  var state, world, done, result, ev;

  function lose() {
    if (!state.over) return;
    done = true; result = 'lose'; world.frozen = true; CQ.audio.lose();
    document.getElementById('status').textContent = 'Game over';
  }

  function reset() {
    state = L.createState({ lives: 3 });
    done = false; result = ''; ev = { stomp: 0, hurt: 0, coin: 0 };
    world = CQ.createWorld(CQLevels.level3, { state: state, hooks: {
      jump: function () { CQ.audio.jump(); },
      coin: function () { L.collectCoin(state, 10); ev.coin = 0.3; CQ.audio.coin(); },
      stomp: function () { L.addScore(state, 50); ev.stomp = 0.4; CQ.audio.stomp(); },
      hurt: function () {
        var lost = L.loseLife(state, 1.5);
        if (lost) { ev.hurt = 0.4; CQ.audio.hurt(); lose(); }
        return lost;
      },
      fall: function () {
        if (L.loseLife(state, 1.5)) { ev.hurt = 0.4; CQ.audio.hurt(); lose(); }
      },
      flag: function () {
        if (done) return;
        done = true; result = 'win'; world.frozen = true; CQ.audio.win();
        CQ.progress.complete('3', L.starRating(state.coins, state.totalCoins, state.lives, state.maxLives));
        document.getElementById('status').textContent = 'Level complete!';
      }
    } });
    state.totalCoins = world.coins.length;
  }

  CQ.boot({
    reset: reset,
    ended: function () { return done; },
    update: function (dt, input) {
      world.update(dt, input);
      ev.stomp = Math.max(0, ev.stomp - dt); ev.hurt = Math.max(0, ev.hurt - dt); ev.coin = Math.max(0, ev.coin - dt);
      CQ.setEvents({ stomp: ev.stomp > 0, hurt: ev.hurt > 0, invuln: state.invuln > 0, gameover: result === 'lose' });
      CQ.setLive([['Lives', state.lives], ['Score', state.score], ['invincible', state.invuln.toFixed(1) + 's']], dt);
    },
    draw: function (ctx) {
      world.draw(ctx);
      CQ.hud.hearts(ctx, state.lives, state.maxLives, 10, 9);
      CQ.hud.score(ctx, state.score, 10, 28);
      CQ.hud.coins(ctx, state.coins, state.totalCoins, 10, 48);
      if (done && result === 'win') {
        var stars = L.starRating(state.coins, state.totalCoins, state.lives, state.maxLives);
        CQ.overlay(ctx, 'Level complete!', ['Score: ' + state.score, '', ''], null);
        for (var i = 0; i < 3; i++) CQ.art.star(ctx, 210 + i * 30, 150, 12, i < stars);
      } else if (done) CQ.overlay(ctx, 'Game over', ['Score: ' + state.score, 'Stomp the slimes from above!']);
    }
  });
})();
