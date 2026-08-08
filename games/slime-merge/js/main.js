(function() {
  var SIZE = 4;
  var locked = false;
  var tileEls = []; // [row][col]

  function el(id) { return document.getElementById(id); }

  function showScreen(name) {
    ['title', 'game'].forEach(function(s) {
      el('screen-' + s).classList.toggle('active', s === name);
    });
  }

  // ---- Board sizing ----
  function getBoardSize() {
    var padding = 8 * 2;
    var gap = 8;
    var cells = SIZE;
    var maxW = Math.min(window.innerWidth - 24, 420) - padding;
    var header = document.querySelector('.game-header');
    var headerH = header ? header.offsetHeight : 60;
    var maxH = window.innerHeight - headerH - 24 - padding;
    var side = Math.floor(Math.min(maxW, maxH));
    var cellSize = Math.floor((side - gap * (cells - 1)) / cells);
    return { side: side, cellSize: cellSize };
  }

  function resizeBoard() {
    var s = getBoardSize();
    var board = el('board');
    board.style.width  = s.side + 'px';
    board.style.height = s.side + 'px';
    var cells = board.querySelectorAll('.cell');
    cells.forEach(function(c) {
      c.style.width  = s.cellSize + 'px';
      c.style.height = s.cellSize + 'px';
    });
    // Rebuild tiles at new size
    renderBoard(Game.getState());
  }

  // ---- Tile rendering ----
  function makeTile(val, row, col) {
    var s = getBoardSize();
    var tile = document.createElement('div');
    tile.className = 'tile';
    tile.dataset.val = Math.min(val, 8192);
    tile.style.width  = s.cellSize + 'px';
    tile.style.height = s.cellSize + 'px';
    var fontSize = Math.max(12, Math.floor(s.cellSize * 0.28));
    if (val >= 1000) fontSize = Math.max(10, Math.floor(s.cellSize * 0.22));
    tile.style.fontSize = fontSize + 'px';
    tile.innerHTML = val + '<div class="tile-name">' + Game.getSlimeName(val) + '</div>';
    return tile;
  }

  function renderBoard(state) {
    var tilesEl = el('tiles');
    tilesEl.innerHTML = '';
    tileEls = [];

    for (var r = 0; r < SIZE; r++) {
      tileEls.push([]);
      for (var c = 0; c < SIZE; c++) {
        var val = state.board[r][c];
        if (val === 0) {
          tilesEl.appendChild(document.createElement('div'));
          tileEls[r].push(null);
        } else {
          var tile = makeTile(val, r, c);
          if (state.spawned && state.spawned[0] === r && state.spawned[1] === c) {
            tile.classList.add('new');
          }
          tilesEl.appendChild(tile);
          tileEls[r].push(tile);
        }
      }
    }

    el('score').textContent = state.score;
    el('best').textContent  = state.best;
  }

  function applyMoveAndRender(dir) {
    if (locked) return;
    locked = true;
    var result = Game.applyMove(dir);
    var state = Game.getState();

    if (result === 'no-change') { locked = false; return; }
    if (result === 'over' && !state.over) { locked = false; return; }

    renderBoard(state);

    setTimeout(function() {
      locked = false;
      if (result === 'gameover') {
        el('go-score').textContent = state.score;
        el('go-best').textContent  = state.best;
        el('overlay-gameover').classList.remove('hidden');
      } else if (result === 'win') {
        el('overlay-win').classList.remove('hidden');
      }
    }, 120);
  }

  // ---- Touch ----
  var touchStart = null;
  function initTouch() {
    var wrap = document.querySelector('.board-wrap');
    wrap.addEventListener('touchstart', function(e) {
      e.preventDefault();
      var t = e.touches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    }, { passive: false });
    wrap.addEventListener('touchend', function(e) {
      e.preventDefault();
      if (!touchStart) return;
      var t = e.changedTouches[0];
      var dx = t.clientX - touchStart.x;
      var dy = t.clientY - touchStart.y;
      touchStart = null;
      var MIN = 30;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > MIN) {
        applyMoveAndRender(dx > 0 ? 'right' : 'left');
      } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > MIN) {
        applyMoveAndRender(dy > 0 ? 'down' : 'up');
      }
    }, { passive: false });
  }

  function initKeyboard() {
    document.addEventListener('keydown', function(e) {
      var map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
      if (map[e.code]) { e.preventDefault(); applyMoveAndRender(map[e.code]); }
    });
  }

  // ---- Game start / reset ----
  function startGame() {
    Sound.init();
    locked = false;
    el('overlay-gameover').classList.add('hidden');
    el('overlay-win').classList.add('hidden');
    var state = Game.init();
    showScreen('game');
    resizeBoard();
    renderBoard(state);
  }

  function init() {
    el('title-best').textContent = Game.getBest();

    el('btn-start').addEventListener('click', startGame);
    el('btn-reset').addEventListener('click', startGame);
    el('btn-retry').addEventListener('click', startGame);
    el('btn-retry-win').addEventListener('click', startGame);
    el('btn-continue').addEventListener('click', function() {
      el('overlay-win').classList.add('hidden');
    });
    el('btn-title').addEventListener('click', function() {
      el('title-best').textContent = Game.getBest();
      showScreen('title');
    });

    initTouch();
    initKeyboard();
    window.addEventListener('resize', function() {
      if (el('screen-game').classList.contains('active')) resizeBoard();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
