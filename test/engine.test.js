// Browser-free tests for the engine's keyboard handling and for the game outcome rules.
// The real scripts are run in a tiny fake browser (vm) - no extra libraries needed.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
let n = 0;
function t(name, fn) { fn(); n++; console.log('ok  ' + name); }

const noop = () => {};
const ctxProxy = new Proxy({}, { get: () => noop, set: () => true });

function makeBrowser(files) {
  const handlers = {}, store = {}, els = {};
  const canvas = { tagName: 'CANVAS', getContext: () => ctxProxy, addEventListener: noop, focus: noop,
                   getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 272 }) };
  const sb = {
    console, Math, JSON, Object, Array, String, Number, Date, Error, Set, Proxy,
    setInterval: () => 0, clearInterval: noop, setTimeout: () => 0, requestAnimationFrame: () => 0,
    performance: { now: () => 0 },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } },
    document: {
      getElementById: id => (id === 'game' ? canvas : id === 'status' ? (els.status = els.status || { textContent: '' }) : null),
      querySelectorAll: () => [], querySelector: () => null, addEventListener: noop,
      createElement: () => ({ getContext: () => ctxProxy, width: 0, height: 0 })
    }
  };
  sb.window = sb; sb.addEventListener = (type, fn) => { (handlers[type] = handlers[type] || []).push(fn); };
  vm.createContext(sb);
  files.forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sb, { filename: f }));
  const key = (type, code, target) => {
    let prevented = false;
    (handlers[type] || []).forEach(h => h({ code, target, repeat: false, ctrlKey: false, metaKey: false, altKey: false,
                                            preventDefault() { prevented = true; } }));
    return prevented;
  };
  return { sb, store, els, key, CQ: sb.CQ };
}

const ENGINE = ['js/logic.js', 'js/levels.js', 'js/engine.js'];

t('gameKeyAllowed: form controls keep their keys, canvas and page do not', () => {
  const L = require('../js/logic.js');
  ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A', 'button'].forEach(tag =>
    assert.strictEqual(L.gameKeyAllowed({ tagName: tag }), false, tag));
  assert.strictEqual(L.gameKeyAllowed({ tagName: 'DIV', isContentEditable: true }), false);
  ['CANVAS', 'BODY', 'DIV'].forEach(tag => assert.strictEqual(L.gameKeyAllowed({ tagName: tag }), true, tag));
  assert.strictEqual(L.gameKeyAllowed(null), true);
});

t('keys on Restart / Sound / slider are NOT captured; keys on the game are', () => {
  const b = makeBrowser(ENGINE);
  let resets = 0;
  b.CQ.boot({ reset: () => { resets++; }, update: noop, draw: noop, ended: () => false });
  const base = resets;                                    // boot calls reset() once
  ['ArrowRight', 'ArrowLeft', 'Space', 'Enter', 'ArrowUp'].forEach(code => {
    ['BUTTON', 'INPUT'].forEach(tag => {
      assert.strictEqual(b.key('keydown', code, { tagName: tag }), false, code + ' on ' + tag + ' must not be prevented');
    });
  });
  let inp = b.CQ.input.read();
  assert.ok(!inp.left && !inp.right && !inp.jumpHeld && !inp.jumpPressed && !inp.actionPressed, 'no input from controls');
  b.key('keydown', 'KeyR', { tagName: 'BUTTON' });
  assert.strictEqual(resets, base, 'R on a button must not restart');

  // same keys on the canvas drive the game and are prevented (no page scroll)
  assert.strictEqual(b.key('keydown', 'ArrowRight', { tagName: 'CANVAS' }), true);
  assert.strictEqual(b.key('keydown', 'Space', { tagName: 'CANVAS' }), true);
  inp = b.CQ.input.read();
  assert.ok(inp.right && inp.jumpHeld && inp.jumpPressed);
  b.key('keyup', 'ArrowRight', { tagName: 'CANVAS' }); b.key('keyup', 'Space', { tagName: 'CANVAS' });
  assert.ok(!b.CQ.input.read().right);
  b.key('keydown', 'KeyR', { tagName: 'BODY' });
  assert.strictEqual(resets, base + 1, 'R on the page restarts');
});

// ---- one outcome only: last life lost in the same frame as the flag ----
const ROWS = ['..............', '..............', '..P..Fe.......', '##############'];
// player (10x14) at x=90 overlaps the flag (x 80-96) AND the slime (x ~97-111) at the same time
function outcome(gameFile, lives, prepare) {
  const b = makeBrowser(ENGINE.concat(['js/world.js']));
  const CQ = b.CQ; let game = null, world = null;
  CQ.boot = g => { game = g; };
  const create = CQ.createWorld;
  CQ.createWorld = (d, o) => { world = create(d, o); return world; };
  b.sb.CQLevels.level3 = { rows: ROWS }; b.sb.CQLevels.level5 = { rows: ROWS };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', gameFile), 'utf8'), b.sb, { filename: gameFile });
  game.reset();
  if (prepare) prepare(game);
  world.state.lives = lives;
  world.player.x = 90; world.player.y = 34;
  const idle = { left: false, right: false, jumpHeld: false, jumpPressed: false, actionPressed: false };
  for (let i = 0; i < 5; i++) game.update(1 / 60, idle);
  return { status: b.els.status.textContent, done: b.store['cq:done'], world, game };
}
function startFromMenu(game) {                            // level 5 begins on the menu scene
  const idle = { left: false, right: false, jumpHeld: false, jumpPressed: false, actionPressed: false };
  for (let i = 0; i < 40; i++) game.update(1 / 60, idle);
  game.update(1 / 60, Object.assign({}, idle, { actionPressed: true }));
}

['js/game3.js', 'js/game5.js'].forEach(file => {
  const prep = file.endsWith('5.js') ? startFromMenu : null;
  t(file + ': last life + flag in the same frame -> game over only', () => {
    const r = outcome(file, 1, prep);
    assert.strictEqual(r.status, 'Game over');
    assert.strictEqual(r.done, undefined, 'no level completion saved');
    assert.ok(!r.world.won, 'flag must not count');
    assert.ok(r.world.frozen);
  });
  t(file + ': with lives left, hurt + flag in the same frame still wins', () => {
    const r = outcome(file, 3, prep);
    assert.strictEqual(r.status, file.endsWith('5.js') ? 'You win!' : 'Level complete!');
    assert.ok(r.done, 'completion saved');
  });
});

console.log('\n' + n + ' engine tests passed');
