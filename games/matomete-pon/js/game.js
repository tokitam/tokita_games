var Game = (function () {
  var ROWS = 12;
  var COLS = 10;
  var NUM_COLORS = 5;
  var HS_KEY = 'matomete-pon.highscore';
  var CLEAR_BONUS = 1000;

  var board, score, best;

  function createBoard() {
    var b = [];
    for (var r = 0; r < ROWS; r++) {
      b.push([]);
      for (var c = 0; c < COLS; c++) {
        b[r].push(Math.floor(Math.random() * NUM_COLORS) + 1);
      }
    }
    return b;
  }

  function findGroup(row, col) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return [];
    var color = board[row][col];
    if (color === 0) return [];

    var cells = [];
    var stack = [[row, col]];
    var seen = {};
    seen[row + ',' + col] = true;

    while (stack.length > 0) {
      var pos = stack.pop();
      var r = pos[0], c = pos[1];
      cells.push({ row: r, col: c });
      var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (var i = 0; i < dirs.length; i++) {
        var nr = r + dirs[i][0], nc = c + dirs[i][1];
        var key = nr + ',' + nc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !seen[key] && board[nr][nc] === color) {
          seen[key] = true;
          stack.push([nr, nc]);
        }
      }
    }
    return cells;
  }

  function applyGravity() {
    for (var c = 0; c < COLS; c++) {
      var col = [];
      for (var r = 0; r < ROWS; r++) {
        if (board[r][c] !== 0) col.push(board[r][c]);
      }
      var r2 = ROWS - 1;
      for (var i = col.length - 1; i >= 0; i--) {
        board[r2][c] = col[i];
        r2--;
      }
      while (r2 >= 0) {
        board[r2][c] = 0;
        r2--;
      }
    }
  }

  function removeGroup(cells) {
    for (var i = 0; i < cells.length; i++) {
      board[cells[i].row][cells[i].col] = 0;
    }
    applyGravity();
    var n = cells.length;
    var gained = (n - 1) * (n - 1) * 10;
    score += gained;
    if (score > best) {
      best = score;
      localStorage.setItem(HS_KEY, best);
    }
    return gained;
  }

  function addClearBonus() {
    score += CLEAR_BONUS;
    if (score > best) {
      best = score;
      localStorage.setItem(HS_KEY, best);
    }
  }

  function isGameOver() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (board[r][c] === 0) continue;
        if (findGroup(r, c).length >= 2) return false;
      }
    }
    return true;
  }

  function isClear() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (board[r][c] !== 0) return false;
      }
    }
    return true;
  }

  function init() {
    board = createBoard();
    score = 0;
    best = parseInt(localStorage.getItem(HS_KEY) || '0', 10);
  }

  return {
    ROWS: ROWS,
    COLS: COLS,
    init: init,
    getBoard: function () { return board; },
    getScore: function () { return score; },
    getBest: function () { return best; },
    findGroup: findGroup,
    removeGroup: removeGroup,
    addClearBonus: addClearBonus,
    isGameOver: isGameOver,
    isClear: isClear
  };
})();
