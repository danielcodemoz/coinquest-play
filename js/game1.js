/* Level 1 - Move & jump. Rules (the "events"):
   Key Left/Right pressed -> move; Jump key pressed + on floor -> jump; touch the flag -> win. */
(function () {
  'use strict';
  var L = CQLogic, phys = L.defaultPhysics();
  var state, world, done, jumps, jumpFlash;

  function reset() {
    state = L.createState({ lives: 1 });
    done = false; jumps = 0; jumpFlash = 0;
    world = CQ.createWorld(CQLevels.level1, { state: state, phys: phys, hooks: {
      jump: function () { jumps++; jumpFlash = 0.25; CQ.audio.jump(); },
      land: function () { CQ.audio.land(); },
      flag: function () {
        if (done) return;
        done = true; world.frozen = true; CQ.audio.win(); CQ.progress.complete('1', 3);
        document.getElementById('status').textContent = 'Level complete!';
      }
    } });
  }

  // Sliders = the Platformer character behavior properties in GDevelop.
  var ctl = { jump: 'jumpSpeed', grav: 'gravity', speed: 'maxSpeed' };
  var defaults = L.defaultPhysics();
  function bindSliders() {
    Object.keys(ctl).forEach(function (id) {
      var el = document.getElementById('sl-' + id), out = document.getElementById('out-' + id);
      if (!el) return;
      el.value = phys[ctl[id]]; out.textContent = el.value;
      el.addEventListener('input', function () { phys[ctl[id]] = +el.value; out.textContent = el.value; });
    });
    var rs = document.getElementById('reset-values');
    if (rs) rs.addEventListener('click', function () {
      Object.keys(ctl).forEach(function (id) {
        phys[ctl[id]] = defaults[ctl[id]];
        document.getElementById('sl-' + id).value = defaults[ctl[id]];
        document.getElementById('out-' + id).textContent = defaults[ctl[id]];
      });
      rs.blur();
    });
  }

  CQ.boot({
    reset: reset,
    ended: function () { return done; },
    update: function (dt, input) {
      world.update(dt, input);
      jumpFlash = Math.max(0, jumpFlash - dt);
      var p = world.player;
      CQ.setEvents({ left: input.left, right: input.right, jump: jumpFlash > 0, air: !p.onGround, flag: done });
      CQ.setLive([['speedX', Math.round(p.vx)], ['speedY', Math.round(p.vy)],
                  ['onFloor', p.onGround ? 'true' : 'false'], ['jumps', jumps]], dt);
    },
    draw: function (ctx) {
      world.draw(ctx);
      CQ.text(ctx, 'Reach the flag!', 10, 8, { size: 13 });
      if (done) CQ.overlay(ctx, 'Level complete!', ['You moved and jumped to the flag.', 'Jumps used: ' + jumps]);
    }
  });
  bindSliders();
})();
