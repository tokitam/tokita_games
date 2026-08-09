(function() {
  var canvas, ctx, W, H, DPR;
  var raf;
  var lastTime = 0;
  var currentLevel = 1;
  var canvasRect;

  // Item display config
  var ITEM_INFO = {
    multi: { emoji: '🔴', label: 'ボール増殖' },
    wide:  { emoji: '🟢', label: 'パドル拡大' },
    slow:  { emoji: '🔵', label: 'スロー' },
    life:  { emoji: '⭐', label: 'ライフ+1' }
  };

  function el(id) { return document.getElementById(id); }

  function showScreen(name) {
    ['title', 'game', 'gameover'].forEach(function(s) {
      el('screen-' + s).classList.toggle('active', s === name);
    });
  }

  function resize() {
    DPR = window.devicePixelRatio || 1;
    var hud = document.querySelector('.game-hud');
    var hudH = hud ? hud.offsetHeight : 40;
    var effH = 20;
    var maxW = Math.min(window.innerWidth, 480);
    var maxH = window.innerHeight - hudH - effH - 8;
    W = Math.min(maxW, Math.floor(maxH * 0.65));
    H = Math.floor(W / 0.65);
    if (H > maxH) { H = maxH; W = Math.floor(H * 0.65); }

    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);
    canvasRect = canvas.getBoundingClientRect();
  }

  function startGame(level) {
    Sound.init();
    cancelAnimationFrame(raf);
    currentLevel = level || 1;
    el('overlay-pause').classList.add('hidden');
    el('overlay-stage').classList.add('hidden');

    resize();
    var state = Game.init(W, H, currentLevel);
    updateHud(state);
    showScreen('game');

    lastTime = 0;
    raf = requestAnimationFrame(loop);
  }

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    var dt = lastTime ? Math.min(ts - lastTime, 50) : 16;
    lastTime = ts;

    Game.update(dt);
    var state = Game.getState();

    draw();
    updateHud(state);
    updateEffectsBar(state);

    if (state.cleared) {
      cancelAnimationFrame(raf);
      el('overlay-stage').classList.remove('hidden');
      el('stage-msg').textContent = '🎉 ステージ ' + currentLevel + ' クリア！';
      // Save best
      var best = Game.getBest();
      if (state.score > best) localStorage.setItem('colorful-crash.highscore', state.score);
      setTimeout(function() {
        el('overlay-stage').classList.add('hidden');
        startGame(currentLevel + 1);
      }, 1800);
    } else if (state.over) {
      cancelAnimationFrame(raf);
      setTimeout(function() {
        el('go-score').textContent = state.score;
        el('go-best').textContent  = Game.getBest();
        el('go-level').textContent = state.level;
        showScreen('gameover');
      }, 400);
    }
  }

  // ---- HUD ----
  function updateHud(state) {
    el('hud-score').textContent = state.score;
    el('hud-level').textContent = state.level;
    var hearts = '';
    for (var i = 0; i < state.lives; i++) hearts += '❤️';
    for (var j = state.lives; j < 3; j++) hearts += '🖤';
    el('hud-lives').textContent = hearts;
  }

  function updateEffectsBar(state) {
    var bar = el('effects-bar');
    bar.innerHTML = '';
    ['wide', 'slow'].forEach(function(k) {
      if (state.effects[k] > 0) {
        var info = ITEM_INFO[k];
        var tag = document.createElement('span');
        tag.className = 'effect-tag ' + k;
        tag.textContent = info.emoji + ' ' + Math.ceil(state.effects[k]/1000) + 's';
        bar.appendChild(tag);
      }
    });
  }

  // ---- Drawing ----
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    drawBlocks();
    drawItems();
    drawParticles();
    drawBalls();
    drawPaddle();
  }

  function drawBlocks() {
    Game.getBlocks().forEach(function(b) {
      // Dim based on hp damage
      var alpha = 0.5 + 0.5 * (b.hp / b.maxHp);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = b.color;
      roundRect(ctx, b.x, b.y, b.w, b.h, 5);
      ctx.fill();

      // Shine
      ctx.globalAlpha = 0.25 * alpha;
      ctx.fillStyle = '#fff';
      roundRect(ctx, b.x + 2, b.y + 2, b.w - 4, 4, 2);
      ctx.fill();

      ctx.globalAlpha = 1;

      // Hard block indicator (cracks)
      if (b.maxHp >= 2 && b.hp < b.maxHp) {
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(b.x + b.w*0.3, b.y + 2);
        ctx.lineTo(b.x + b.w*0.6, b.y + b.h - 2);
        ctx.stroke();
      }
    });
  }

  function drawBalls() {
    Game.getBalls().forEach(function(ball) {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, Game.BALL_R, 0, Math.PI*2);
      var grad = ctx.createRadialGradient(ball.x-2, ball.y-2, 1, ball.x, ball.y, Game.BALL_R);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(1, '#FFD740');
      ctx.fillStyle = grad;
      ctx.fill();
    });
  }

  function drawPaddle() {
    var state = Game.getState();
    var px = state.paddle.x - state.paddle.w/2;
    var py = H - Game.PADDLE_H - 16;
    var grad = ctx.createLinearGradient(px, py, px, py + Game.PADDLE_H);
    grad.addColorStop(0, state.effects.wide > 0 ? '#69F0AE' : '#64B5F6');
    grad.addColorStop(1, state.effects.wide > 0 ? '#00C853' : '#1565C0');
    ctx.fillStyle = grad;
    roundRect(ctx, px, py, state.paddle.w, Game.PADDLE_H, 6);
    ctx.fill();
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    roundRect(ctx, px + 4, py + 2, state.paddle.w - 8, 4, 3);
    ctx.fill();
  }

  function drawItems() {
    Game.getItems().forEach(function(item) {
      item.blink = (item.blink || 0) + 1;
      if (item.blink % 6 < 3) ctx.globalAlpha = 0.6;
      var info = ITEM_INFO[item.type];
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(info.emoji, item.x, item.y);
      ctx.globalAlpha = 1;
    });
  }

  function drawParticles() {
    Game.getParticles().forEach(function(p) {
      ctx.globalAlpha = p.life / 26;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  // ---- Input ----
  function initInput() {
    // Paddle movement
    canvas.addEventListener('mousemove', function(e) {
      canvasRect = canvas.getBoundingClientRect();
      Game.movePaddle(e.clientX, canvasRect);
    });
    canvas.addEventListener('touchmove', function(e) {
      e.preventDefault();
      canvasRect = canvas.getBoundingClientRect();
      Game.movePaddle(e.touches[0].clientX, canvasRect);
    }, { passive: false });

    // Pause on tap (non-paddle area)
    canvas.addEventListener('click', function(e) {
      var state = Game.getState();
      if (state.over || state.cleared) return;
      var rect = canvas.getBoundingClientRect();
      var y = e.clientY - rect.top;
      if (y < H * 0.7) Game.togglePause(); // tap upper area to pause
      if (state.paused) {
        el('overlay-pause').classList.remove('hidden');
      } else {
        el('overlay-pause').classList.add('hidden');
      }
    });
    canvas.addEventListener('touchend', function(e) {
      var state = Game.getState();
      if (state.over || state.cleared) return;
      var rect = canvas.getBoundingClientRect();
      var y = e.changedTouches[0].clientY - rect.top;
      if (y < H * 0.7) {
        Game.togglePause();
        el('overlay-pause').classList.toggle('hidden', !Game.getState().paused);
      }
    });

    // Keyboard
    document.addEventListener('keydown', function(e) {
      if (e.key === 'p' || e.key === 'P') {
        Game.togglePause();
        el('overlay-pause').classList.toggle('hidden', !Game.getState().paused);
      }
    });
  }

  // ---- Navigation ----
  function init() {
    canvas = el('canvas');
    ctx = canvas.getContext('2d');

    el('title-hs').textContent = Game.getBest();
    el('btn-start').addEventListener('click', function() { startGame(1); });
    el('btn-retry').addEventListener('click', function() { startGame(1); });
    el('btn-title').addEventListener('click', function() {
      cancelAnimationFrame(raf);
      el('title-hs').textContent = Game.getBest();
      showScreen('title');
    });

    initInput();
    window.addEventListener('resize', function() {
      if (el('screen-game').classList.contains('active')) {
        canvasRect = canvas.getBoundingClientRect();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
