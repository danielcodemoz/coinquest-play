/* Coin Quest Play - shared platformer world: level, player, coins, slimes, moving platforms,
   camera and drawing. Each game page decides the RULES through hooks (the "events"). */
(function () {
  'use strict';
  var L = window.CQLogic, W = CQ.W;

  // def: {rows, platforms}; opts: {state, phys, hooks:{jump,land,coin,stomp,hurt,fall,flag}}
  CQ.createWorld = function (def, opts) {
    opts = opts || {};
    var lv = L.parseLevel(def.rows);
    var world = {
      lv: lv, state: opts.state || null, hooks: opts.hooks || {}, phys: opts.phys || L.defaultPhysics(),
      player: L.createPlayer(lv.start.x, lv.start.y), coins: lv.coins, enemies: lv.enemies,
      platforms: (def.platforms || []).map(function (d) {
        return { def: d, x: d.x0, y: d.y0, w: d.w || 48, h: 8, oneWay: true, moving: true, dx: 0, dy: 0 };
      }),
      particles: [], time: 0, frozen: false, won: false, cam: { x: 0 },
      lastSafe: { x: lv.start.x, y: lv.start.y }
    };
    var solids = lv.solids.concat(lv.oneWays, world.platforms);
    var staticSolids = lv.solids.concat(lv.oneWays);
    var p = world.player, hooks = world.hooks;

    world.respawn = function () {
      p.x = world.lastSafe.x; p.y = world.lastSafe.y; p.vx = p.vy = 0; p.standing = null; p.stun = 0;
    };

    function snapCamera() {
      world.cam.x = L.clamp(p.x + p.w / 2 - W / 2, 0, Math.max(0, lv.width - W));
    }
    snapCamera();

    world.update = function (dt, input) {
      world.time += dt;
      CQ.stepParticles(world.particles, dt);
      if (world.frozen) return;
      var st = world.state, i;
      if (st) L.tickInvuln(st, dt);

      world.platforms.forEach(function (pl) {
        var pos = L.platformPos(pl.def, world.time);
        pl.dx = pos.x - pl.x; pl.dy = pos.y - pl.y; pl.x = pos.x; pl.y = pos.y;
      });

      var out = L.stepBody(p, input, solids, dt, world.phys);
      if (p.x < 0) { p.x = 0; p.vx = 0; }
      if (p.x > lv.width - p.w) { p.x = lv.width - p.w; p.vx = 0; }
      if (out.jumped) {
        CQ.burst(world.particles, p.x + 5, p.y + 14, 5, '#e2e8f0', 40);
        if (hooks.jump) hooks.jump();
      }
      if (out.landed) {
        CQ.burst(world.particles, p.x + 5, p.y + 14, 4, '#e2e8f0', 40);
        if (hooks.land) hooks.land();
      }
      if (p.onGround && p.standing && !p.standing.moving) { world.lastSafe.x = p.x; world.lastSafe.y = p.y; }

      for (i = 0; i < world.coins.length; i++) {
        var c = world.coins[i];
        if (!c.taken && L.overlaps(p, c, 0)) {
          c.taken = true;
          CQ.burst(world.particles, c.x + 6, c.y + 6, 8, '#fde047', 80);
          if (hooks.coin) hooks.coin(c);
        }
      }

      for (i = 0; i < world.enemies.length; i++) {
        var e = world.enemies[i];
        if (!e.alive) { e.squash = Math.max(0, e.squash - dt); continue; }
        L.stepEnemy(e, staticSolids, dt);
        if (!L.overlaps(p, e, 0)) continue;
        if (L.isStomp(p, e)) {
          e.alive = false; e.squash = 0.35;
          p.vy = input.jumpHeld ? -380 : -280; p.jumping = true;
          CQ.burst(world.particles, e.x + 7, e.y + 8, 10, '#4ade80', 90);
          if (hooks.stomp) hooks.stomp(e);
        } else if (!st || st.invuln <= 0) {
          var hurt = hooks.hurt ? hooks.hurt(e) : true;
          if (hurt !== false) {
            p.vx = (p.x + p.w / 2 < e.x + e.w / 2 ? -1 : 1) * 150; p.vy = -250; p.stun = 0.25;
            p.onGround = false; p.standing = null; p.jumping = false;
            CQ.burst(world.particles, p.x + 5, p.y + 7, 8, '#f87171', 90);
          }
        }
      }

      if (lv.flag && !world.won && L.overlaps(p, lv.flag, 0)) { world.won = true; if (hooks.flag) hooks.flag(); }

      if (p.y > lv.height + 40) {
        if (hooks.fall) hooks.fall();
        world.respawn();
      }

      var target = L.clamp(p.x + p.w / 2 - W / 2 + p.facing * 24, 0, Math.max(0, lv.width - W));
      world.cam.x += (target - world.cam.x) * (1 - Math.pow(0.0005, dt));
    };

    world.draw = function (ctx) {
      var cx = Math.round(world.cam.x), t = world.time, st = world.state, i;
      CQ.art.background(ctx, cx);
      ctx.save(); ctx.translate(-cx, 0);
      var c0 = Math.max(0, Math.floor(cx / 16)), c1 = Math.min(lv.cols - 1, Math.ceil((cx + W) / 16));
      for (var r = 0; r < lv.rows; r++)
        for (var c = c0; c <= c1; c++)
          if (lv.isSolid(c, r)) CQ.art.tile(ctx, c * 16, r * 16, !lv.isSolid(c, r - 1));
      lv.oneWays.forEach(function (o) { if (o.x + o.w > cx && o.x < cx + W) CQ.art.oneWay(ctx, o); });
      world.platforms.forEach(function (o) { CQ.art.platform(ctx, { x: Math.round(o.x), y: Math.round(o.y), w: o.w }); });
      if (lv.flag) CQ.art.flag(ctx, lv.flag, t);
      for (i = 0; i < world.coins.length; i++) if (!world.coins[i].taken) CQ.art.coin(ctx, world.coins[i], t);
      for (i = 0; i < world.enemies.length; i++) {
        var e = world.enemies[i];
        if (e.alive || e.squash > 0) CQ.art.slime(ctx, e, t);
      }
      var blink = st && !world.frozen && st.invuln > 0 && Math.floor(t * 14) % 2 === 0;
      if (!blink) CQ.art.hero(ctx, world.player, t);
      CQ.drawParticles(ctx, world.particles);
      ctx.restore();
    };
    return world;
  };

  // HUD pieces shared by the games
  CQ.hud = {
    hearts: function (ctx, lives, max, x, y) {
      for (var i = 0; i < max; i++) CQ.art.heart(ctx, x + i * 17, y, i < lives);
    },
    coins: function (ctx, got, total, x, y) {
      CQ.art.coin(ctx, { x: x, y: y, w: 12, h: 12 }, 0);
      CQ.text(ctx, got + (total ? ' / ' + total : ''), x + 16, y - 1, { size: 13 });
    },
    score: function (ctx, score, x, y, align) {
      CQ.text(ctx, 'Score ' + score, x, y, { size: 14, align: align || 'left', color: '#fde047' });
    }
  };
})();
