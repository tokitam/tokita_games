(function() {
  var canvas     = document.getElementById('gameCanvas');
  var ctx        = canvas.getContext('2d');
  var overlay    = document.getElementById('overlay');
  var ovTitle    = document.getElementById('ov-title');
  var ovResult   = document.getElementById('ov-result');
  var ovStageClear = document.getElementById('ov-stage-clear');
  var ovAllClear = document.getElementById('ov-all-clear');
  var resEmoji   = document.getElementById('res-emoji');
  var resTitle   = document.getElementById('res-title');
  var resSub     = document.getElementById('res-sub');
  var scTitle    = document.getElementById('sc-title');
  var acTime     = document.getElementById('ac-time');
  var touchL     = document.getElementById('touch-left');
  var touchR     = document.getElementById('touch-right');

  var W, H;
  var running  = false;
  var impulse  = 0;
  var isTouchDevice = false;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('keydown', function(e) {
    if (!running) return;
    Sound.init();
    if (e.key === 'a' || e.key === 'A') impulse = -1;
    if (e.key === 'd' || e.key === 'D') impulse =  1;
  });

  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    isTouchDevice = true;
    touchL.classList.add('visible');
    touchR.classList.add('visible');
    if (!running) return;
    Sound.init();
    var t = e.changedTouches[0];
    impulse = t.clientX < W / 2 ? -1 : 1;
  }, { passive: false });

  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-retry').addEventListener('click', startGame);
  document.getElementById('btn-retry-all').addEventListener('click', startGame);
  document.getElementById('btn-next-stage').addEventListener('click', function() {
    Sound.init();
    Game.nextStage();
    running = true;
    ovStageClear.classList.add('hidden');
    overlay.classList.add('hidden');
    requestAnimationFrame(loop);
  });

  overlay.addEventListener('click', function() {
    if (Game.getPhase() === 'title') startGame();
  });

  function startGame() {
    Sound.init();
    Game.init(W, H);
    running = true;
    overlay.classList.add('hidden');
    ovResult.classList.add('hidden');
    ovStageClear.classList.add('hidden');
    ovAllClear.classList.add('hidden');
    ovTitle.classList.remove('hidden');
    requestAnimationFrame(loop);
  }

  function loop() {
    if (!running) return;

    Game.update(impulse, function(who) {
      if (who === 'player' || who === 'cpu') Sound.play('wallhit');
      if (who === 'clash') Sound.play('clash');
    });
    impulse = 0;

    Game.draw(ctx);

    var ph = Game.getPhase();
    if (ph === 'result') {
      running = false;
      showResult();
      return;
    }
    if (ph === 'stage_clear') {
      running = false;
      showStageClear();
      return;
    }
    if (ph === 'all_clear') {
      running = false;
      showAllClear();
      return;
    }
    requestAnimationFrame(loop);
  }

  function showResult() {
    var winner = Game.getWinner();
    if (winner === 'player') {
      resEmoji.textContent = '🏆';
      resTitle.textContent = 'YOU WIN!';
      resSub.textContent   = 'CPUを壁にぶつけた！';
      Sound.play('win');
    } else if (winner === 'cpu') {
      resEmoji.textContent = '💀';
      resTitle.textContent = 'YOU LOSE...';
      resSub.textContent   = '壁にぶつかりすぎた…';
      Sound.play('lose');
    } else {
      resEmoji.textContent = '🤝';
      resTitle.textContent = 'DRAW!';
      resSub.textContent   = 'お互い同時にやられた！';
      Sound.play('lose');
    }
    ovTitle.classList.add('hidden');
    ovStageClear.classList.add('hidden');
    ovAllClear.classList.add('hidden');
    ovResult.classList.remove('hidden');
    overlay.classList.remove('hidden');
  }

  function showStageClear() {
    var st = Game.getStage();
    scTitle.textContent = 'STAGE ' + st + ' クリア！';
    Sound.play('win');
    ovTitle.classList.add('hidden');
    ovResult.classList.add('hidden');
    ovAllClear.classList.add('hidden');
    ovStageClear.classList.remove('hidden');
    overlay.classList.remove('hidden');
  }

  function showAllClear() {
    var secs = Game.getTotalSeconds();
    acTime.textContent = '総合タイム ' + secs + ' 秒';
    Sound.play('win');
    var text = encodeURIComponent('エアクラッシュをクリア！総合タイム ' + secs + ' 秒 #エアクラッシュ');
    var url  = encodeURIComponent('https://tokitam.github.io/tokita_games/games/air-crash/');
    document.getElementById('btn-x-share').href =
      'https://twitter.com/intent/tweet?text=' + text + '&url=' + url;
    ovTitle.classList.add('hidden');
    ovResult.classList.add('hidden');
    ovStageClear.classList.add('hidden');
    ovAllClear.classList.remove('hidden');
    overlay.classList.remove('hidden');
  }
})();
