(function() {
  var HS_KEY = 'mogpon.highscore';

  function el(id) { return document.getElementById(id); }

  function showScreen(name) {
    ['title', 'game', 'result'].forEach(function(s) {
      el('screen-' + s).classList.toggle('active', s === name);
    });
  }

  function getHighscore() { return parseInt(localStorage.getItem(HS_KEY) || '0', 10); }
  function saveHighscore(s) { if (s > getHighscore()) localStorage.setItem(HS_KEY, s); }

  // ---- Build grid ----
  var holeEls = [];

  function buildGrid() {
    var grid = el('grid');
    grid.innerHTML = '';
    holeEls = [];
    for (var i = 0; i < 9; i++) {
      (function(idx) {
        var hole = document.createElement('div');
        hole.className = 'hole';
        hole.innerHTML = '<div class="hole-inner"></div><div class="mog"></div>';
        hole.addEventListener('click', function() { onHoleClick(idx); });
        hole.addEventListener('touchend', function(e) { e.preventDefault(); onHoleClick(idx); }, { passive: false });
        grid.appendChild(hole);
        holeEls.push(hole);
      })(i);
    }
  }

  function onHoleClick(idx) {
    var result = Game.hit(idx);
    if (!result) return;
    showHitEffect(holeEls[idx], result.points);
  }

  function showHitEffect(holeEl, points) {
    var ef = document.createElement('div');
    ef.className = 'hit-effect';
    ef.textContent = points > 0 ? '+' + points : points;
    ef.style.color = points >= 3 ? '#ffd700' : points > 0 ? '#fff' : '#ff4444';
    holeEl.appendChild(ef);
    setTimeout(function() { if (ef.parentNode) ef.parentNode.removeChild(ef); }, 650);
  }

  // ---- Game events ----
  function onShow(idx, charType) {
    var hole = holeEls[idx];
    hole.querySelector('.mog').textContent = charType.emoji;
    hole.classList.remove('hiding');
    hole.classList.add('active');
    if (charType.key === 'rare') {
      hole.style.boxShadow = 'inset 0 6px 16px rgba(0,0,0,0.4), 0 0 16px 4px rgba(255,215,0,0.7)';
    } else {
      hole.style.boxShadow = '';
    }
  }

  function onHide(idx) {
    var hole = holeEls[idx];
    hole.classList.remove('active');
    hole.classList.add('hiding');
    hole.style.boxShadow = '';
    setTimeout(function() { hole.classList.remove('hiding'); }, 230);
  }

  function onTick(timeLeft) {
    el('timer').textContent = timeLeft;
    el('score').textContent = Game.getState().score;
    var timerBox = document.querySelector('.timer-box');
    timerBox.classList.toggle('urgent', timeLeft <= 3);
    if (timeLeft <= 3 && timeLeft > 0) Sound.play('tick');
  }

  var lastScore = 0;

  function onEnd(score) {
    lastScore = score;
    saveHighscore(score);
    var hs = getHighscore();
    el('result-score').textContent = score;
    el('result-highscore').textContent = hs;
    el('result-emoji').textContent = score >= 20 ? '🏆' : score >= 10 ? '🎉' : '😅';
    setTimeout(function() { showScreen('result'); }, 400);
  }

  function shareToX() {
    var url = window.location.href.replace(/\/index\.html$/, '/');
    var text = 'モグポン！をプレイしました！\nスコア：' + lastScore + '点🐹\n' + url + '\n#モグポン #トキタゲームズ';
    window.open('https://x.com/intent/tweet?text=' + encodeURIComponent(text), '_blank');
  }

  // ---- Start game ----
  function startGame() {
    Sound.init();
    buildGrid();
    el('score').textContent = '0';
    el('timer').textContent = '30';
    el('game-highscore').textContent = getHighscore();
    document.querySelector('.timer-box').classList.remove('urgent');
    showScreen('game');

    Game.init({ onShow: onShow, onHide: onHide, onTick: onTick, onEnd: onEnd });
    // small delay so the screen transition is visible
    setTimeout(function() { Game.start(); }, 300);
  }

  // ---- Init ----
  function init() {
    el('title-highscore').textContent = getHighscore();
    el('btn-start').addEventListener('click', startGame);
    el('btn-share').addEventListener('click', shareToX);
    el('btn-retry').addEventListener('click', startGame);
    el('btn-title').addEventListener('click', function() {
      el('title-highscore').textContent = getHighscore();
      showScreen('title');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
