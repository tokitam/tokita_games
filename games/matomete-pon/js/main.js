(function () {
  var canvas = document.getElementById('canvas');
  var canvasWrap = document.getElementById('canvas-wrap');

  var titleBestEl = document.getElementById('title-best');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var clearScoreEl = document.getElementById('clear-score');
  var clearBestEl = document.getElementById('clear-best');
  var goScoreEl = document.getElementById('go-score');
  var goBestEl = document.getElementById('go-best');

  var animating = false;

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.remove('active');
    });
    document.getElementById('screen-' + id).classList.add('active');
  }

  function updateHUD() {
    scoreEl.textContent = Game.getScore().toLocaleString();
    bestEl.textContent = Game.getBest().toLocaleString();
  }

  function onTap(px, py) {
    if (animating) return;
    var cell = Renderer.pixelToCell(px, py);
    if (!cell) return;
    var group = Game.findGroup(cell.row, cell.col);
    if (group.length < 2) return;

    Renderer.setHighlight([]);
    animating = true;

    Renderer.startRemove(group, function () {
      Game.removeGroup(group);
      updateHUD();
      Renderer.draw();
      animating = false;

      if (Game.isClear()) {
        Game.addClearBonus();
        updateHUD();
        setTimeout(showClear, 300);
      } else if (Game.isGameOver()) {
        setTimeout(showGameOver, 300);
      }
    });
  }

  function onHover(px, py) {
    if (animating) return;
    if (px < 0) {
      Renderer.setHighlight([]);
      Renderer.draw();
      return;
    }
    var cell = Renderer.pixelToCell(px, py);
    var group = cell ? Game.findGroup(cell.row, cell.col) : [];
    Renderer.setHighlight(group.length >= 2 ? group : []);
    Renderer.draw();
  }

  function showClear() {
    clearScoreEl.textContent = Game.getScore().toLocaleString();
    clearBestEl.textContent = Game.getBest().toLocaleString();
    showScreen('clear');
  }

  function showGameOver() {
    goScoreEl.textContent = Game.getScore().toLocaleString();
    goBestEl.textContent = Game.getBest().toLocaleString();
    showScreen('gameover');
  }

  function startGame() {
    Game.init();
    animating = false;
    showScreen('game');
    updateHUD();
    Renderer.resize(canvasWrap);
    Renderer.draw();
  }

  function shareToX() {
    var text = '「まとめてポン！」プレイしました！\nスコア：' + Game.getScore().toLocaleString() + '点🎉\n' +
               window.location.href + '\n#まとめてポン #トキタゲームズ';
    window.open('https://x.com/intent/tweet?text=' + encodeURIComponent(text), '_blank');
  }

  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-share').addEventListener('click', shareToX);
  document.getElementById('btn-clear-retry').addEventListener('click', startGame);
  document.getElementById('btn-clear-title').addEventListener('click', function () {
    titleBestEl.textContent = Game.getBest().toLocaleString();
    showScreen('title');
  });
  document.getElementById('btn-go-retry').addEventListener('click', startGame);
  document.getElementById('btn-go-title').addEventListener('click', function () {
    titleBestEl.textContent = Game.getBest().toLocaleString();
    showScreen('title');
  });

  window.addEventListener('resize', function () {
    if (document.getElementById('screen-game').classList.contains('active')) {
      Renderer.resize(canvasWrap);
      Renderer.draw();
    }
  });

  Renderer.init(canvas);
  Input.init(canvas, onTap, onHover);
  titleBestEl.textContent = Game.getBest().toLocaleString();
})();
