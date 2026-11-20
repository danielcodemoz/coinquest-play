/* Coin Quest Play - level data. Levels are built from tiny helpers, then turned into text rows:
   '#' solid  '-' one-way platform  'o' coin  'e' slime  'P' start  'F' flag  '.' empty
   Floor top is at row 15 (y = 240). A jump reaches ~4 tiles high; the levels keep steps <= 3. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CQLevels = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var ROWS = 17;

  function build(cols, fn) {
    var g = [];
    for (var r = 0; r < ROWS; r++) { g.push([]); for (var c = 0; c < cols; c++) g[r].push('.'); }
    var api = {
      put: function (c, r, ch) { g[r][c] = ch; },
      rect: function (c, r, w, h, ch) {
        for (var y = r; y < r + (h || 1); y++) for (var x = c; x < c + w; x++) g[y][x] = ch || '#';
      },
      ground: function (c0, c1) { api.rect(c0, 15, c1 - c0 + 1, 2, '#'); },
      coins: function (c0, c1, r) { for (var c = c0; c <= c1; c++) g[r][c] = 'o'; }
    };
    fn(api);
    return g.map(function (row) { return row.join(''); });
  }

  // 1 - Move & jump (one screen, no coins, just the flag)
  var level1 = { rows: build(30, function (b) {
    b.ground(0, 29);
    b.put(1, 14, 'P');
    b.rect(3, 14, 2, 1);
    b.rect(8, 13, 2, 2);
    b.rect(11, 12, 5, 1, '-');
    b.rect(18, 9, 4, 1, '-');
    b.rect(24, 6, 5, 1);
    b.put(26, 5, 'F');
  }) };

  // 2 - Coins & score
  var level2 = { rows: build(48, function (b) {
    b.ground(0, 47);
    b.put(1, 14, 'P');
    b.coins(3, 5, 14);
    b.rect(8, 12, 4, 1, '-');   b.coins(8, 11, 11);
    b.rect(15, 10, 4, 1, '-');  b.coins(15, 18, 9);
    b.rect(22, 13, 2, 2);       b.coins(22, 23, 12);
    b.rect(27, 11, 4, 1, '-');  b.coins(27, 30, 10);
    b.rect(34, 9, 4, 1, '-');   b.coins(34, 37, 8);
    b.rect(41, 12, 4, 1, '-');  b.coins(41, 44, 11);
    b.coins(46, 46, 14);
  }) };

  // 3 - Enemies & lives
  var level3 = { rows: build(60, function (b) {
    b.ground(0, 23); b.ground(27, 43); b.ground(47, 59);
    b.put(1, 14, 'P');
    b.put(10, 14, 'e'); b.put(18, 14, 'e'); b.put(32, 14, 'e');
    b.coins(5, 7, 12); b.rect(5, 13, 3, 1, '-');
    b.rect(36, 12, 6, 1);  b.put(38, 11, 'e'); b.coins(36, 41, 10);
    b.coins(24, 26, 11);
    b.put(52, 14, 'e'); b.coins(49, 51, 13);
    b.put(57, 14, 'F');
  }) };

  // 4 - Moving platforms & timer (bottomless pits, ride the platforms)
  var level4 = {
    rows: build(64, function (b) {
      b.ground(0, 8); b.put(1, 14, 'P');
      b.rect(22, 13, 4, 4);           // island 1
      b.rect(33, 7, 4, 1);            // island 2 (high)
      b.rect(47, 9, 4, 1);            // island 3
      b.ground(54, 63);
      b.put(60, 14, 'F');
      b.coins(23, 24, 12); b.coins(34, 35, 6); b.coins(48, 49, 8);
      b.coins(12, 14, 12); b.coins(27, 29, 9); b.coins(40, 44, 6); b.coins(57, 58, 14);
    }),
    platforms: [
      { x0: 160, y0: 224, x1: 288, y1: 224, w: 48, speed: 50 },
      { x0: 440, y0: 208, x1: 440, y1: 112, w: 48, speed: 40 },
      { x0: 600, y0: 128, x1: 700, y1: 128, w: 48, speed: 45 },
      { x0: 830, y0: 144, x1: 830, y1: 224, w: 48, speed: 40 }
    ]
  };

  // 5 - Everything together
  var level5 = {
    rows: build(70, function (b) {
      b.ground(0, 20); b.ground(35, 51); b.ground(55, 69);
      b.put(1, 14, 'P');
      b.put(12, 14, 'e'); b.rect(14, 12, 4, 1, '-'); b.coins(14, 17, 11);
      b.coins(5, 7, 14);
      b.coins(23, 32, 11);
      b.put(40, 14, 'e'); b.coins(37, 39, 13);
      b.rect(44, 12, 4, 1);  b.put(45, 11, 'e'); b.coins(44, 47, 10);
      b.coins(52, 54, 11);
      b.put(59, 14, 'e'); b.put(63, 14, 'e'); b.coins(60, 62, 13);
      b.put(67, 14, 'F');
    }),
    platforms: [{ x0: 330, y0: 224, x1: 520, y1: 224, w: 48, speed: 55 }]
  };

  return { level1: level1, level2: level2, level3: level3, level4: level4, level5: level5 };
});
