// Tiny test for the pure game-logic helpers. Run: node test/logic.test.js  (or: npm test)
'use strict';
const assert = require('assert');
const L = require('../js/logic.js');
const V = require('../js/levels.js');
let n = 0;
function t(name, fn) { fn(); n++; console.log('ok  ' + name); }

t('clamp / approach', () => {
  assert.strictEqual(L.clamp(5, 0, 3), 3); assert.strictEqual(L.clamp(-1, 0, 3), 0);
  assert.strictEqual(L.approach(0, 10, 4), 4); assert.strictEqual(L.approach(8, 10, 4), 10);
  assert.strictEqual(L.approach(0, -10, 4), -4);
});

t('overlaps: touching boxes do not collide', () => {
  assert.ok(L.overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }));
  assert.ok(!L.overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }));
});

t('platformPos ping-pongs between two points', () => {
  const d = { x0: 0, y0: 0, x1: 100, y1: 0, speed: 50 };
  assert.strictEqual(L.platformPos(d, 0).x, 0);
  assert.strictEqual(L.platformPos(d, 1).x, 50);
  assert.strictEqual(L.platformPos(d, 2).x, 100);
  assert.strictEqual(L.platformPos(d, 3).x, 50);
  assert.strictEqual(L.platformPos(d, 4).x, 0);
});

t('score, coins and win detection', () => {
  const s = L.createState({ lives: 3, totalCoins: 2 });
  assert.strictEqual(L.collectCoin(s, 10), false);
  assert.strictEqual(L.collectCoin(s, 10), true);
  assert.strictEqual(s.score, 20); assert.strictEqual(s.coins, 2);
  L.addScore(s, 50); assert.strictEqual(s.score, 70);
});

t('loseLife: invincibility stops repeated hits, game over at 0', () => {
  const s = L.createState({ lives: 2 });
  assert.strictEqual(L.loseLife(s, 1.5), true); assert.strictEqual(s.lives, 1);
  assert.strictEqual(L.loseLife(s, 1.5), false); assert.strictEqual(s.lives, 1);
  L.tickInvuln(s, 2); assert.strictEqual(s.invuln, 0);
  assert.strictEqual(L.loseLife(s, 1.5), true);
  assert.strictEqual(s.lives, 0); assert.ok(s.over);
  assert.strictEqual(L.loseLife(s, 1.5), false);
});

t('timer, formatTime, bonus, stars', () => {
  assert.strictEqual(L.tickTimer(1, 0.4), 0.6);
  assert.strictEqual(L.tickTimer(0.1, 1), 0);
  assert.strictEqual(L.formatTime(65), '1:05'); assert.strictEqual(L.formatTime(59.2), '1:00');
  assert.strictEqual(L.formatTime(0), '0:00'); assert.strictEqual(L.formatTime(-3), '0:00');
  assert.strictEqual(L.timeBonus(12.9), 60);
  assert.strictEqual(L.starRating(5, 5, 3, 3), 3); assert.strictEqual(L.starRating(2, 5, 1, 3), 1);
  assert.strictEqual(L.starRating(5, 5, 1, 3), 2);
});

t('isStomp: only when falling onto the top', () => {
  const e = { x: 0, y: 100, w: 14, h: 12 };
  assert.ok(L.isStomp({ x: 0, y: 88, w: 10, h: 14, vy: 200 }, e));   // falling onto it
  assert.ok(!L.isStomp({ x: 0, y: 98, w: 10, h: 14, vy: 0 }, e));    // walking into it
  assert.ok(!L.isStomp({ x: 0, y: 88, w: 10, h: 14, vy: -100 }, e)); // rising
});

t('parseLevel: merges tiles and finds objects', () => {
  const lv = L.parseLevel(['....', '.o.F', 'P#e-', '####']);
  assert.strictEqual(lv.coins.length, 1); assert.strictEqual(lv.enemies.length, 1);
  assert.ok(lv.flag); assert.deepStrictEqual(lv.start, { x: 3, y: 2 * 16 + 16 - 14 });
  assert.strictEqual(lv.solids.length, 2);          // '#' in row 2 and the merged run in row 3
  assert.strictEqual(lv.solids[1].w, 64);
  assert.strictEqual(lv.oneWays.length, 1);
  assert.throws(() => L.parseLevel(['P..', '..']), /row 1/);
  assert.throws(() => L.parseLevel(['...']), /exactly one P/);
  assert.throws(() => L.parseLevel(['P?']), /bad tile/);
});

t('all game levels are valid and playable', () => {
  Object.keys(V).forEach(k => {
    const lv = L.parseLevel(V[k].rows);
    assert.strictEqual(lv.rows, 17, k + ' must be 17 rows');
    assert.ok(lv.flag || lv.coins.length > 0, k + ' needs a goal');
  });
  assert.ok(L.parseLevel(V.level2.rows).coins.length > 0);
  assert.ok(L.parseLevel(V.level3.rows).enemies.length > 0);
  assert.ok(V.level4.platforms.length > 0);
});

function drop(p, floor) {
  // fall onto a floor and settle
  const solids = [floor];
  for (let i = 0; i < 120; i++) L.stepBody(p, {}, solids, 1 / 60);
}
const floor = { x: -100, y: 200, w: 1000, h: 16 };
const idle = { left: false, right: false, jumpHeld: false, jumpPressed: false };

t('physics: player lands and stands on the floor', () => {
  const p = L.createPlayer(10, 100); drop(p, floor);
  assert.ok(p.onGround); assert.strictEqual(Math.round(p.y + p.h), 200);
});

t('physics: held jump reaches ~4 tiles, a tap is a short hop', () => {
  const run = hold => {
    const p = L.createPlayer(10, 100); drop(p, floor);
    const base = p.y; let top = p.y;
    for (let i = 0; i < 90; i++) {
      L.stepBody(p, { jumpPressed: i === 0, jumpHeld: hold || i === 0 }, [floor], 1 / 60);
      top = Math.min(top, p.y);
    }
    return base - top;
  };
  const full = run(true), tap = run(false);
  assert.ok(full > 58 && full < 70, 'full jump ' + full);
  assert.ok(tap < full * 0.5, 'tap ' + tap);
});

t('physics: runs, stops at walls, no jump in mid-air after coyote time', () => {
  const wall = { x: 60, y: 100, w: 16, h: 100 };
  const p = L.createPlayer(10, 100); drop(p, floor);
  for (let i = 0; i < 120; i++) L.stepBody(p, { right: true }, [floor, wall], 1 / 60);
  assert.ok(p.x + p.w <= 60.01, 'x ' + p.x);
  const q = L.createPlayer(300, 0);                        // falling in mid-air
  for (let i = 0; i < 20; i++) L.stepBody(q, idle, [floor], 1 / 60);
  const vyBefore = q.vy;
  const out = L.stepBody(q, { jumpPressed: true, jumpHeld: true }, [floor], 1 / 60);
  assert.ok(!out.jumped && q.vy > vyBefore - 1);
});

t('physics: one-way platform (jump up through it, land on top) and moving carry', () => {
  const pl = { x: 0, y: 150, w: 100, h: 6, oneWay: true, moving: true, dx: 0, dy: 0 };
  const p = L.createPlayer(20, 100);
  for (let i = 0; i < 60; i++) L.stepBody(p, idle, [floor, pl], 1 / 60);
  assert.ok(p.onGround && Math.round(p.y + p.h) === 150, 'landed on platform ' + p.y);
  pl.dx = 2; pl.dy = 0; const x0 = p.x;
  L.stepBody(p, idle, [floor, pl], 1 / 60);
  assert.ok(Math.abs(p.x - (x0 + 2)) < 0.01, 'carried');
  // from below it must not block
  const q = L.createPlayer(20, 170);
  q.vy = -400;
  L.stepBody(q, { jumpHeld: true }, [pl], 1 / 60);
  assert.ok(q.vy < 0);
});

t('slime patrols and turns at a wall and at a ledge', () => {
  const ground = { x: 0, y: 112, w: 100, h: 16 };
  const e = { x: 40, y: 100, w: 14, h: 12, dir: 1, speed: 28, t: 0 };
  let turned = 0, last = e.dir;
  for (let i = 0; i < 60 * 12; i++) { L.stepEnemy(e, [ground], 1 / 60); if (e.dir !== last) { turned++; last = e.dir; } }
  assert.ok(turned >= 2, 'turned ' + turned);
  assert.ok(e.x >= 0 && e.x + e.w <= 100.5, 'stays on ground ' + e.x);
});

t('hero sprites are well formed', () => {
  // engine.js needs a browser, so rebuild the row lists the same way a quick sanity check can.
  const src = require('fs').readFileSync(__dirname + '/../js/engine.js', 'utf8');
  const rows = [...src.matchAll(/'([.HSEBPW]{12})'/g)].map(m => m[1]);
  assert.strictEqual(rows.length, 26, 'found ' + rows.length + ' valid 12-wide rows (10 head/body + 4x4 legs)');
});

console.log('\n' + n + ' tests passed');
