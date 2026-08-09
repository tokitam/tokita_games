(function() {
  var rafId = null;
  var gameCanvas, nextCanvas;

  function el(id) { return document.getElementById(id); }

  function showScreen(name) {
    ['title', 'game', 'gameover'].forEach(function(s) {
      el('screen-' + s).classList.toggle('active', s === name);
    });
  }

  function updateHUD(state) {
    el('score').textContent = state.score;
    el('level').textContent = state.level;
    el('lines').textContent = state.lines;
  }

  function loop(timestamp) {
    var state = Game.getState();
    Game.tick(timestamp);
    updateHUD(state);
    Renderer.render(state);
    Renderer.renderNext(state.next);

    if (state.gameOver) {
      endGame(state);
      return;
    }
    rafId = requestAnimationFrame(loop);
  }

  function startGame() {
    Sound.init();
    cancelAnimationFrame(rafId);
    var state = Game.init();
    state.running = true;
    el('overlay-pause').classList.add('hidden');
    showScreen('game');
    Renderer.resize();
    rafId = requestAnimationFrame(loop);
  }

  function endGame(state) {
    Sound.play('gameover');
    var hs = parseInt(localStorage.getItem('poipoi-block.highscore') || '0', 10);
    if (state.score > hs) {
      hs = state.score;
      localStorage.setItem('poipoi-block.highscore', hs);
    }
    el('result-score').textContent     = state.score;
    el('result-level').textContent     = state.level;
    el('result-lines').textContent     = state.lines;
    el('result-highscore').textContent = hs;
    showScreen('gameover');
  }

  function togglePause() {
    var state = Game.getState();
    if (!state || state.gameOver) return;
    if (state.paused) {
      Game.resume();
      el('overlay-pause').classList.add('hidden');
      rafId = requestAnimationFrame(loop);
    } else {
      Game.pause();
      cancelAnimationFrame(rafId);
      el('overlay-pause').classList.remove('hidden');
    }
  }

  function updateMuteBtn() {
    el('btn-mute').textContent = Sound.isMuted() ? '🔇' : '🔊';
  }

  function init() {
    Sound.loadState();

    gameCanvas = el('canvas-game');
    nextCanvas = el('canvas-next');
    Renderer.init(gameCanvas, nextCanvas, Game.COLS, Game.ROWS);

    // Title highscore
    el('title-highscore').textContent = localStorage.getItem('poipoi-block.highscore') || '0';
    updateMuteBtn();

    // Touch on game canvas
    Input.initTouch(gameCanvas);
    Input.initKeyboard();

    Input.on('left',     function() { var s = Game.getState(); if (!s || s.paused || s.gameOver) return; if (Game.moveLeft())  Sound.play('move'); });
    Input.on('right',    function() { var s = Game.getState(); if (!s || s.paused || s.gameOver) return; if (Game.moveRight()) Sound.play('move'); });
    Input.on('rotate',   function() { var s = Game.getState(); if (!s || s.paused || s.gameOver) return; if (Game.rotate())    Sound.play('rotate'); });
    Input.on('softDrop', function() { var s = Game.getState(); if (!s || s.paused || s.gameOver) return; Game.softDrop(); });
    Input.on('hardDrop', function() { var s = Game.getState(); if (!s || s.paused || s.gameOver) return; Game.hardDrop(); });
    Input.on('pause', togglePause);

    el('btn-start').addEventListener('click', startGame);
    el('btn-retry').addEventListener('click', function() { startGame(); });
    el('btn-title').addEventListener('click', function() {
      cancelAnimationFrame(rafId);
      el('title-highscore').textContent = localStorage.getItem('poipoi-block.highscore') || '0';
      showScreen('title');
    });
    el('btn-pause').addEventListener('click', togglePause);
    el('btn-resume').addEventListener('click', togglePause);
    el('btn-mute').addEventListener('click', function() {
      Sound.toggleMute();
      updateMuteBtn();
    });

    window.addEventListener('resize', function() {
      Renderer.resize();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
