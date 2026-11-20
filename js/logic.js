/* Coin Quest Play - pure game-logic helpers (no DOM, no canvas).
   Works in the browser (window.CQLogic) and in Node (require) so it can be tested. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CQLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TILE = 16;
  var EPS = 0.001;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // Move v towards target by at most delta (used for acceleration / friction).
  function approach(v, target, delta) {
    return v < target ? Math.min(v + delta, target) : Math.max(v - delta, target);
  }

  // Axis-aligned box overlap. A tiny epsilon stops boxes that only touch from "colliding".
  function overlaps(a, b, eps) {
    eps = eps === undefined ? EPS : eps;
    return a.x < b.x + b.w - eps && a.x + a.w > b.x + eps &&
           a.y < b.y + b.h - eps && a.y + a.h > b.y + eps;
  }

  // 0 -> 1 -> 0 -> 1 ... as t grows (ping-pong).
  function triangle(t) {
    var m = ((t % 2) + 2) % 2;
    return m <= 1 ? m : 2 - m;
  }

  // Position of a moving platform at a given time.
  // def: {x0,y0,x1,y1,speed (px/s), phase (0..2, optional)}
  function platformPos(def, time) {
    var dx = def.x1 - def.x0, dy = def.y1 - def.y0;
    var len = Math.hypot(dx, dy) || 1;
    var u = triangle((time * def.speed) / len + (def.phase || 0));
    return { x: def.x0 + dx * u, y: def.y0 + dy * u };
  }

  // ---------- Level parsing ----------
  // '#' solid  '-' one-way platform  'o' coin  'e' slime  'P' player start  'F' flag  '.' empty
  function validateLevel(rows) {
    if (!rows || !rows.length) throw new Error('level has no rows');
    var w = rows[0].length, starts = 0;
    rows.forEach(function (r, i) {
      if (r.length !== w) throw new Error('row ' + i + ' has length ' + r.length + ', expected ' + w);
      for (var c = 0; c < r.length; c++) {
        if ('.#-oePF'.indexOf(r[c]) < 0) throw new Error('bad tile "' + r[c] + '" at ' + c + ',' + i);
        if (r[c] === 'P') starts++;
      }
    });
    if (starts !== 1) throw new Error('level needs exactly one P, found ' + starts);
    return true;
  }

  function parseLevel(rows) {
    validateLevel(rows);
    var cols = rows[0].length;
    var lv = { cols: cols, rows: rows.length, width: cols * TILE, height: rows.length * TILE,
               solids: [], oneWays: [], coins: [], enemies: [], start: null, flag: null, grid: rows };
    rows.forEach(function (row, r) {
      var c = 0;
      while (c < cols) {
        var ch = row[c];
        if (ch === '#' || ch === '-') {
          var e = c;
          while (e < cols && row[e] === ch) e++;   // merge a run of tiles into one box
          if (ch === '#') lv.solids.push({ x: c * TILE, y: r * TILE, w: (e - c) * TILE, h: TILE });
          else lv.oneWays.push({ x: c * TILE, y: r * TILE, w: (e - c) * TILE, h: 6, oneWay: true });
          c = e; continue;
        }
        if (ch === 'o') lv.coins.push({ x: c * TILE + 2, y: r * TILE + 2, w: 12, h: 12, taken: false });
        else if (ch === 'e') lv.enemies.push({ x: c * TILE + 1, y: (r + 1) * TILE - 12, w: 14, h: 12,
                                               dir: -1, speed: 28, alive: true, squash: 0, t: 0 });
        else if (ch === 'P') lv.start = { x: c * TILE + 3, y: (r + 1) * TILE - 14 };
        else if (ch === 'F') lv.flag = { x: c * TILE, y: (r + 1) * TILE - 40, w: TILE, h: 40 };
        c++;
      }
    });
    lv.isSolid = function (c, r) {
      return r >= 0 && r < lv.rows && c >= 0 && c < lv.cols && lv.grid[r][c] === '#';
    };
    return lv;
  }

  // ---------- Player physics ----------
  function defaultPhysics() {
    return { gravity: 1500, maxFall: 520, maxSpeed: 130, accel: 900, decel: 1200,
             airAccel: 650, airDecel: 300, jumpSpeed: 440, jumpCut: 200,
             coyote: 0.1, buffer: 0.12 };
  }

  function createPlayer(x, y) {
    return { x: x, y: y, w: 10, h: 14, vx: 0, vy: 0, onGround: false, standing: null,
             coyote: 0, buffer: 0, facing: 1, stun: 0, jumping: false };
  }

  // One fixed physics step. input: {left,right,jumpHeld,jumpPressed}
  // solids: boxes; {oneWay:true} boxes can be jumped through from below.
  // A solid with moving:true and dx/dy carries the player standing on it.
  function stepBody(p, input, solids, dt, phys) {
    phys = phys || defaultPhysics();
    var out = { jumped: false, landed: false, bumped: false };
    var wasGround = p.onGround, i, s;

    if (p.standing && p.standing.moving) { p.x += p.standing.dx; p.y += p.standing.dy; }

    var dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (p.stun > 0) p.stun -= dt;
    else {
      var rate = dir !== 0 ? (p.onGround ? phys.accel : phys.airAccel)
                           : (p.onGround ? phys.decel : phys.airDecel);
      p.vx = approach(p.vx, dir * phys.maxSpeed, rate * dt);
      if (dir) p.facing = dir;
    }

    // Coyote time + jump buffer make jumping feel fair.
    p.coyote = p.onGround ? phys.coyote : p.coyote - dt;
    p.buffer = input.jumpPressed ? phys.buffer : p.buffer - dt;
    if (p.buffer > 0 && p.coyote > 0 && p.stun <= 0) {
      p.vy = -phys.jumpSpeed; p.buffer = 0; p.coyote = 0;
      p.onGround = false; p.standing = null; p.jumping = true; out.jumped = true;
    }
    if (p.jumping && !input.jumpHeld && p.vy < -phys.jumpCut) p.vy = -phys.jumpCut; // short hop

    p.vy = Math.min(p.vy + phys.gravity * dt, phys.maxFall);

    // X axis
    p.x += p.vx * dt;
    for (i = 0; i < solids.length; i++) {
      s = solids[i];
      if (s.oneWay || !overlaps(p, s)) continue;
      if (p.vx > 0 || (p.vx === 0 && p.x + p.w / 2 < s.x + s.w / 2)) p.x = s.x - p.w;
      else p.x = s.x + s.w;
      p.vx = 0;
    }

    // Y axis
    var prevBottom = p.y + p.h;
    p.y += p.vy * dt;
    p.onGround = false; p.standing = null;
    for (i = 0; i < solids.length; i++) {
      s = solids[i];
      if (!overlaps(p, s)) continue;
      if (s.oneWay) {
        if (p.vy >= 0 && prevBottom <= s.y + 1 + Math.max(0, -(s.dy || 0))) {
          p.y = s.y - p.h; p.vy = 0; p.onGround = true; p.standing = s;
        }
      } else if (p.vy >= 0) {
        p.y = s.y - p.h; p.vy = 0; p.onGround = true; p.standing = s;
      } else {
        p.y = s.y + s.h; p.vy = 0; out.bumped = true;
      }
    }
    if (p.onGround) { p.jumping = false; if (!wasGround) out.landed = true; }
    return out;
  }

  // ---------- Enemies ----------
  // Slime patrol: walk, turn at walls and at ledges.
  function stepEnemy(e, solids, dt) {
    e.t += dt;
    var nx = e.x + e.dir * e.speed * dt, i, s;
    var box = { x: nx, y: e.y, w: e.w, h: e.h };
    var blocked = false;
    for (i = 0; i < solids.length; i++) {
      s = solids[i];
      if (!s.oneWay && overlaps(box, s)) { blocked = true; break; }
    }
    var probe = { x: e.dir > 0 ? nx + e.w + 1 : nx - 2, y: e.y + e.h + 1, w: 1, h: 2 };
    var ground = false;
    for (i = 0; i < solids.length; i++) {
      if (overlaps(probe, solids[i])) { ground = true; break; }
    }
    if (blocked || !ground) e.dir = -e.dir; else e.x = nx;
  }

  // Landing on top of an enemy = stomp. Touching from the side = ouch.
  function isStomp(p, e) {
    var depth = p.y + p.h - e.y;
    return p.vy > 0 && depth <= 10;
  }

  // ---------- Game state (score / lives / timer) ----------
  function createState(o) {
    o = o || {};
    var lives = o.lives === undefined ? 3 : o.lives;
    return { score: 0, lives: lives, maxLives: lives, invuln: 0, over: false,
             coins: 0, totalCoins: o.totalCoins || 0,
             timeLeft: o.time === undefined ? null : o.time };
  }
  function addScore(s, n) { s.score += n; return s.score; }
  // Returns true when this was the last coin.
  function collectCoin(s, value) {
    s.coins++; s.score += value === undefined ? 10 : value;
    return s.totalCoins > 0 && s.coins >= s.totalCoins;
  }
  // Returns true if a life was really lost (false while invulnerable or already over).
  function loseLife(s, cooldown) {
    if (s.over || s.invuln > 0) return false;
    s.lives = Math.max(0, s.lives - 1);
    s.invuln = cooldown === undefined ? 1.5 : cooldown;
    if (s.lives === 0) s.over = true;
    return true;
  }
  function tickInvuln(s, dt) { if (s.invuln > 0) s.invuln = Math.max(0, s.invuln - dt); }
  function tickTimer(t, dt) { return Math.max(0, t - dt); }
  function formatTime(sec) {
    var s = Math.max(0, Math.ceil(sec));
    return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
  }
  function timeBonus(sec) { return Math.floor(Math.max(0, sec)) * 5; }
  function starRating(coins, total, lives, maxLives) {
    return 1 + (total > 0 && coins >= total ? 1 : 0) + (lives >= maxLives ? 1 : 0);
  }

  return {
    TILE: TILE, clamp: clamp, approach: approach, overlaps: overlaps, triangle: triangle,
    platformPos: platformPos, validateLevel: validateLevel, parseLevel: parseLevel,
    defaultPhysics: defaultPhysics, createPlayer: createPlayer, stepBody: stepBody,
    stepEnemy: stepEnemy, isStomp: isStomp, createState: createState, addScore: addScore,
    collectCoin: collectCoin, loseLife: loseLife, tickInvuln: tickInvuln,
    tickTimer: tickTimer, formatTime: formatTime, timeBonus: timeBonus, starRating: starRating
  };
});
