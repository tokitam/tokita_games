var Game = (function() {
  var SIZE = 4;
  var HS_KEY = 'slime-merge.highscore';

  var SLIME_NAMES = {
    2: 'ちびスライム', 4: 'ちびスライム', 8: 'スライム', 16: 'スライム',
    32: 'でかスライム', 64: 'でかスライム', 128: 'ぬりかべ', 256: 'ぬりかべ',
    512: 'ジェリー', 1024: 'スーパー', 2048: 'キング👑', 4096: 'ゴッド', 8192: 'オメガ'
  };

  var state;

  function createEmpty() {
    var b = [];
    for (var r = 0; r < SIZE; r++) { b.push([]); for (var c = 0; c < SIZE; c++) b[r].push(0); }
    return b;
  }

  function emptyPositions() {
    var pos = [];
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        if (state.board[r][c] === 0) pos.push([r, c]);
    return pos;
  }

  function spawnTile() {
    var pos = emptyPositions();
    if (!pos.length) return false;
    var p = pos[Math.floor(Math.random() * pos.length)];
    state.board[p[0]][p[1]] = Math.random() < 0.9 ? 2 : 4;
    state.spawned = p;
    return true;
  }

  function slideRow(row) {
    // Remove zeros
    var arr = row.filter(function(v) { return v !== 0; });
    var merged = new Array(arr.length).fill(false);
    var score = 0;
    var mergeOccurred = false;

    for (var i = 0; i < arr.length - 1; i++) {
      if (!merged[i] && arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        score += arr[i];
        arr.splice(i + 1, 1);
        merged.splice(i + 1, 1);
        merged[i] = true;
        mergeOccurred = true;
      }
    }

    // Pad with zeros
    while (arr.length < SIZE) arr.push(0);
    return { arr: arr, score: score, merged: mergeOccurred };
  }

  function transpose(board) {
    var t = createEmpty();
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        t[c][r] = board[r][c];
    return t;
  }

  function reverseRows(board) {
    return board.map(function(row) { return row.slice().reverse(); });
  }

  function move(dir) {
    var b = state.board.map(function(r) { return r.slice(); });
    var totalScore = 0;
    var anyMerge = false;
    var changed = false;

    // Normalize to "slide left" by rotating the board
    if (dir === 'right') b = reverseRows(b);
    if (dir === 'up')    b = transpose(b);
    if (dir === 'down')  b = reverseRows(transpose(b));

    var newBoard = b.map(function(row) {
      var res = slideRow(row);
      totalScore += res.score;
      if (res.merged) anyMerge = true;
      return res.arr;
    });

    // Check if board changed
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        if (newBoard[r][c] !== b[r][c]) changed = true;

    if (!changed) return false;

    // Rotate back
    if (dir === 'right') newBoard = reverseRows(newBoard);
    if (dir === 'up')    newBoard = transpose(newBoard);
    if (dir === 'down')  newBoard = transpose(reverseRows(newBoard));

    state.board = newBoard;
    state.score += totalScore;
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem(HS_KEY, state.best);
    }
    state.spawned = null;
    state.mergeOccurred = anyMerge;
    return true;
  }

  function canMove() {
    if (emptyPositions().length > 0) return true;
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var v = state.board[r][c];
        if (r < SIZE - 1 && state.board[r + 1][c] === v) return true;
        if (c < SIZE - 1 && state.board[r][c + 1] === v) return true;
      }
    }
    return false;
  }

  function hasWon() {
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        if (state.board[r][c] >= 2048) return true;
    return false;
  }

  function init() {
    state = {
      board: createEmpty(),
      score: 0,
      best: parseInt(localStorage.getItem(HS_KEY) || '0', 10),
      over: false,
      won: false,
      wonShown: false,
      spawned: null,
      mergeOccurred: false
    };
    spawnTile();
    spawnTile();
    return state;
  }

  function applyMove(dir) {
    if (state.over) return 'over';
    var moved = move(dir);
    if (!moved) return 'no-change';

    if (state.mergeOccurred) Sound.play('merge');
    else Sound.play('move');

    spawnTile();
    Sound.play('spawn');

    if (!state.wonShown && hasWon()) {
      state.won = true;
      state.wonShown = true;
      Sound.play('win');
      return 'win';
    }
    if (!canMove()) {
      state.over = true;
      Sound.play('gameover');
      return 'gameover';
    }
    return 'moved';
  }

  return {
    init: init,
    applyMove: applyMove,
    getState: function() { return state; },
    getSlimeName: function(v) { return SLIME_NAMES[v] || '？'; },
    getBest: function() { return parseInt(localStorage.getItem(HS_KEY) || '0', 10); }
  };
})();
