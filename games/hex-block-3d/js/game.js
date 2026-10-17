// Pure game logic — no BabylonJS references
var Game = (function() {
  var LS_KEY    = 'hex-block-3d.hs';
  var MATCH_MIN = 5;
  var COLORS    = ['red', 'blue', 'green', 'yellow', 'purple'];

  var cells;      // Map<key, {q,r,h,color}>
  var nextQueue;  // string[]
  var score;
  var highScore;
  var phase;      // 'title'|'playing'|'gameover'

  function init() {
    cells     = new Map();
    nextQueue = [rndColor(), rndColor(), rndColor()];
    score     = 0;
    highScore = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
    phase     = 'playing';

    // 3 starting blocks
    addCell(0, 0, 0, rndColor());
    addCell(1, 0, 0, rndColor());
    addCell(0, 1, 0, rndColor());
  }

  function rndColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

  function addCell(q, r, h, color) {
    cells.set(HexGrid.key(q, r, h), { q: q, r: r, h: h, color: color });
  }

  // Returns all empty positions adjacent to existing cells (h >= 0)
  function emptyAdjacents() {
    var seen = new Set();
    var result = [];
    cells.forEach(function(cell) {
      HexGrid.neighbors(cell.q, cell.r, cell.h).forEach(function(n) {
        if (n.h < 0) return;
        var k = HexGrid.key(n.q, n.r, n.h);
        if (!seen.has(k) && !cells.has(k)) { seen.add(k); result.push(n); }
      });
    });
    return result;
  }

  // BFS: find all connected same-color cells from (q,r,h). Returns array of keys.
  function findGroup(q, r, h) {
    var startKey = HexGrid.key(q, r, h);
    var cell = cells.get(startKey);
    if (!cell) return [];
    var color   = cell.color;
    var visited = new Set([startKey]);
    var queue   = [{ q: q, r: r, h: h }];
    var result  = [startKey];
    while (queue.length) {
      var cur = queue.shift();
      HexGrid.neighbors(cur.q, cur.r, cur.h).forEach(function(n) {
        var k = HexGrid.key(n.q, n.r, n.h);
        if (!visited.has(k) && cells.has(k) && cells.get(k).color === color) {
          visited.add(k); queue.push(n); result.push(k);
        }
      });
    }
    return result;
  }

  // Place block at (q,r,h) with next color. Returns keys to clear ([] if no match).
  function place(q, r, h) {
    var color = nextQueue.shift();
    nextQueue.push(rndColor());
    addCell(q, r, h, color);
    var group = findGroup(q, r, h);
    if (group.length >= MATCH_MIN) return group;
    return [];
  }

  function clearCells(keys) {
    var bonus = keys.length * 10;
    score += bonus;
    if (score > highScore) { highScore = score; localStorage.setItem(LS_KEY, highScore); }
    keys.forEach(function(k) { cells.delete(k); });
    return bonus;
  }

  // After clearing, check all remaining cells for new matches (chain)
  function findChains() {
    var checked = new Set();
    var toRemove = [];
    cells.forEach(function(cell) {
      var k = HexGrid.key(cell.q, cell.r, cell.h);
      if (checked.has(k)) return;
      var group = findGroup(cell.q, cell.r, cell.h);
      group.forEach(function(gk) { checked.add(gk); });
      if (group.length >= MATCH_MIN) toRemove = toRemove.concat(group);
    });
    return toRemove;
  }

  function isGameOver() { return cells.size > 0 && emptyAdjacents().length === 0; }

  return {
    init:          init,
    place:         place,
    clearCells:    clearCells,
    findChains:    findChains,
    emptyAdjacents: emptyAdjacents,
    isGameOver:    isGameOver,
    cells:         function() { return cells; },
    nextQueue:     function() { return nextQueue; },
    score:         function() { return score; },
    highScore:     function() { return highScore; },
    getPhase:      function() { return phase; },
    setPhase:      function(p) { phase = p; },
    COLORS:        COLORS,
  };
})();
