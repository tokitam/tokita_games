var Game = (function() {
  var COLS = 10;
  var ROWS = 20;
  var SCORE_TABLE = [0, 100, 300, 500, 800];
  var FLASH_DURATION = 180; // ms

  var state;

  function createField() {
    var f = [];
    for (var r = 0; r < ROWS; r++) f.push(new Array(COLS).fill(0));
    return f;
  }

  function isValid(piece, field) {
    var cells = TETROMINOES[piece.type].cells[piece.rotation];
    for (var i = 0; i < cells.length; i++) {
      var r = piece.y + cells[i][0];
      var c = piece.x + cells[i][1];
      if (c < 0 || c >= COLS || r >= ROWS) return false;
      if (r >= 0 && field[r][c] !== 0) return false;
    }
    return true;
  }

  function getSpawnX(type, rotation) {
    var cells = TETROMINOES[type].cells[rotation];
    var maxC = 0;
    cells.forEach(function(cell) { if (cell[1] > maxC) maxC = cell[1]; });
    return Math.floor((COLS - maxC - 1) / 2);
  }

  function spawnPiece() {
    var type = state.next;
    state.next = randomType();
    state.current = { type: type, rotation: 0, x: getSpawnX(type, 0), y: 0 };
    if (!isValid(state.current, state.field)) {
      state.gameOver = true;
      state.running = false;
    }
  }

  function lock() {
    var p = state.current;
    var cells = TETROMINOES[p.type].cells[p.rotation];
    var id = TETROMINOES[p.type].id;
    cells.forEach(function(c) {
      if (p.y + c[0] >= 0) state.field[p.y + c[0]][p.x + c[1]] = id;
    });

    var cleared = [];
    for (var r = 0; r < ROWS; r++) {
      if (state.field[r].every(function(v) { return v !== 0; })) cleared.push(r);
    }
    if (cleared.length > 0) {
      Sound.play('clear');
      state.clearFlash = { rows: cleared, timer: 0 };
    } else {
      Sound.play('drop');
      spawnPiece();
    }
  }

  function applyLineClear() {
    var rows = state.clearFlash.rows;
    var n = rows.length;
    // Remove rows from bottom to top to keep indices stable
    rows.slice().sort(function(a, b) { return b - a; }).forEach(function(r) {
      state.field.splice(r, 1);
      state.field.unshift(new Array(COLS).fill(0));
    });
    state.score += SCORE_TABLE[n] * state.level;
    state.lines += n;
    var newLevel = Math.floor(state.lines / 10) + 1;
    if (newLevel > state.level) {
      state.level = newLevel;
      state.dropInterval = Math.max(100, Math.round(1000 * Math.pow(0.8, state.level - 1)));
      Sound.play('levelup');
    }
    state.clearFlash = null;
    spawnPiece();
  }

  function ghostY() {
    var y = state.current.y;
    while (isValid({ type: state.current.type, rotation: state.current.rotation, x: state.current.x, y: y + 1 }, state.field)) {
      y++;
    }
    return y;
  }

  // ---- Public actions ----

  function moveLeft() {
    var p = { type: state.current.type, rotation: state.current.rotation, x: state.current.x - 1, y: state.current.y };
    if (isValid(p, state.field)) { state.current.x--; return true; }
    return false;
  }

  function moveRight() {
    var p = { type: state.current.type, rotation: state.current.rotation, x: state.current.x + 1, y: state.current.y };
    if (isValid(p, state.field)) { state.current.x++; return true; }
    return false;
  }

  function rotate() {
    var newRot = (state.current.rotation + 1) % 4;
    var kicks = [0, -1, 1, -2, 2];
    for (var i = 0; i < kicks.length; i++) {
      var p = { type: state.current.type, rotation: newRot, x: state.current.x + kicks[i], y: state.current.y };
      if (isValid(p, state.field)) {
        state.current.rotation = newRot;
        state.current.x += kicks[i];
        return true;
      }
    }
    return false;
  }

  function softDrop() {
    var p = { type: state.current.type, rotation: state.current.rotation, x: state.current.x, y: state.current.y + 1 };
    if (isValid(p, state.field)) { state.current.y++; state.dropTimer = 0; return true; }
    return false;
  }

  function hardDrop() {
    state.current.y = ghostY();
    lock();
  }

  function tick(timestamp) {
    if (!state.running || state.paused || state.gameOver) return;
    if (state.lastTime === null) { state.lastTime = timestamp; return; }

    var delta = Math.min(timestamp - state.lastTime, 150);
    state.lastTime = timestamp;

    if (state.clearFlash) {
      state.clearFlash.timer += delta;
      if (state.clearFlash.timer >= FLASH_DURATION) applyLineClear();
      return;
    }

    state.dropTimer += delta;
    if (state.dropTimer >= state.dropInterval) {
      state.dropTimer -= state.dropInterval;
      var p = { type: state.current.type, rotation: state.current.rotation, x: state.current.x, y: state.current.y + 1 };
      if (isValid(p, state.field)) {
        state.current.y++;
      } else {
        lock();
      }
    }
  }

  function init() {
    _bag = []; // reset randomizer bag
    state = {
      field: createField(),
      current: null,
      next: randomType(),
      score: 0,
      level: 1,
      lines: 0,
      running: false,
      paused: false,
      gameOver: false,
      dropTimer: 0,
      dropInterval: 1000,
      lastTime: null,
      clearFlash: null
    };
    spawnPiece();
    return state;
  }

  return {
    COLS: COLS,
    ROWS: ROWS,
    init: init,
    getState: function() { return state; },
    ghostY: ghostY,
    moveLeft: moveLeft,
    moveRight: moveRight,
    rotate: rotate,
    softDrop: softDrop,
    hardDrop: hardDrop,
    tick: tick,
    pause: function() { state.paused = true; },
    resume: function() { state.paused = false; state.lastTime = null; }
  };
})();
