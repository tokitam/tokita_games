(function() {
  var canvas  = document.getElementById('gameCanvas');
  var ctx     = canvas.getContext('2d');
  var overlay = document.getElementById('overlay');
  var ovTitle = document.getElementById('ov-title');
  var ovResult= document.getElementById('ov-result');
  var resEmoji= document.getElementById('res-emoji');
  var resTitle= document.getElementById('res-title');
  var resSub  = document.getElementById('res-sub');
  var touchL  = document.getElementById('touch-left');
  var touchR  = document.getElementById('touch-right');

  var W, H;
  var running  = false;
  var impulse  = 0; // -1 | 0 | 1 per frame
  var isTouchDevice = false;

  // ---- resize ----
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // ---- keyboard ----
  window.addEventListener('keydown', function(e) {
    if (!running) return;
    Sound.init();
    if (e.key === 'a' || e.key === 'A') impulse = -1;
    if (e.key === 'd' || e.key === 'D') impulse =  1;
  });

  // ---- touch ----
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

  // ---- start / result buttons ----
  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-retry').addEventListener('click', startGame);
  // tap on canvas also fires if overlay visible
  overlay.addEventListener('click', function() {
    if (Game.getPhase() === 'title') startGame();
  });

  function startGame() {
    Sound.init();
    Game.init(W, H);
    running = true;
    overlay.classList.add('hidden');
    ovResult.classList.add('hidden');
    ovTitle.classList.remove('hidden');
    requestAnimationFrame(loop);
  }

  // ---- game loop ----
  function loop() {
    if (!running) return;

    Game.update(impulse, function(who) {
      if (who === 'player' || who === 'cpu') Sound.play('wallhit');
      if (who === 'clash') Sound.play('clash');
    });
    impulse = 0;

    Game.draw(ctx);

    if (Game.getPhase() === 'result') {
      running = false;
      showResult();
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
    ovResult.classList.remove('hidden');
    overlay.classList.remove('hidden');
  }
})();
