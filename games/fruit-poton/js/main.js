(function() {
  var canvas, ctx, W, H, DPR;
  var guideX = null;
  var raf;

  function el(id) { return document.getElementById(id); }

  function showScreen(name) {
    ['title', 'game'].forEach(function(s) {
      el('screen-' + s).classList.toggle('active', s === name);
    });
  }

  function resize() {
    var wrap = el('field-wrap');
    var header = document.querySelector('.game-header');
    var headerH = header ? header.offsetHeight + 16 : 60;
    var maxW = Math.min(window.innerWidth - 16, 400);
    var maxH = window.innerHeight - headerH - 16;
    W = Math.min(maxW, Math.floor(maxH * 0.6));
    H = Math.floor(W / 0.6);
    if (H > maxH) { H = maxH; W = Math.floor(H * 0.6); }

    DPR = window.devicePixelRatio || 1;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);
  }

  function startGame() {
    Sound.init();
    cancelAnimationFrame(raf);
    el('overlay-gameover').classList.add('hidden');
    resize();
    var state = Game.start(W, H);
    updateHeader(state);
    loop();
  }

  function updateHeader(state) {
    el('score').textContent = state.score;
    el('best').textContent  = state.best;
    var nf = getFruitById(state.nextFruitId);
    el('next-fruit').textContent = nf ? nf.emoji : '?';
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    Game.update();
    var state = Game.getState();
    draw(state);
    updateHeader(state);

    if (state.gameOver) {
      cancelAnimationFrame(raf);
      setTimeout(function() {
        el('go-score').textContent = state.score;
        el('go-best').textContent  = state.best;
        el('overlay-gameover').classList.remove('hidden');
      }, 600);
    }
  }

  // ---- Drawing ----
  function draw(state) {
    ctx.clearRect(0, 0, W, H);

    // Field background
    ctx.fillStyle = '#FFF3E0';
    ctx.fillRect(0, 0, W, H);

    // Danger line
    var dl = Game.getDangerLine();
    var inDanger = state.dangerTimer > 0;
    ctx.strokeStyle = inDanger
      ? 'rgba(220,0,0,' + (0.5 + 0.5 * Math.sin(state.dangerTimer * 0.3)) + ')'
      : 'rgba(200,100,100,0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(0, dl); ctx.lineTo(W, dl); ctx.stroke();
    ctx.setLineDash([]);

    // DANGER text
    if (inDanger) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(state.dangerTimer * 0.3);
      ctx.fillStyle = '#c62828';
      ctx.font = 'bold ' + Math.floor(W * 0.06) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ DANGER', W/2, dl - 6);
      ctx.restore();
    }

    // Merge effects
    state.effects.forEach(function(ef) {
      ctx.save();
      ctx.globalAlpha = ef.alpha;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, ef.r, 0, Math.PI*2);
      ctx.strokeStyle = '#FFD600';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    });

    // Fruits
    state.bodies.forEach(function(entry) {
      var fruit = getFruitById(entry.fruitId);
      if (!fruit) return;
      var pos = entry.body.position;
      var angle = entry.body.angle;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(angle);
      ctx.font = Math.floor(fruit.radius * 1.5) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fruit.emoji, 0, 0);
      ctx.restore();
    });

    // Drop guide
    if (guideX !== null && !state.gameOver) {
      var nf = getFruitById(state.nextFruitId);
      if (nf) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(guideX, 0); ctx.lineTo(guideX, H); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = Math.floor(nf.radius * 1.5) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nf.emoji, guideX, nf.radius + 4);
        ctx.restore();
      }
    }

    // Walls (decorative)
    ctx.fillStyle = 'rgba(180,120,60,0.25)';
    ctx.fillRect(0, 0, 6, H);
    ctx.fillRect(W-6, 0, 6, H);
    ctx.fillRect(0, H-8, W, 8);
  }

  // ---- Input ----
  function getFieldX(clientX) {
    var rect = canvas.getBoundingClientRect();
    return Math.max(0, Math.min(W, clientX - rect.left));
  }

  function initInput() {
    canvas.addEventListener('mousemove', function(e) { guideX = getFieldX(e.clientX); });
    canvas.addEventListener('mouseleave', function() { guideX = null; });
    canvas.addEventListener('click', function(e) {
      var x = getFieldX(e.clientX);
      var nextId = Game.drop(x);
    });

    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      guideX = getFieldX(e.touches[0].clientX);
    }, { passive: false });
    canvas.addEventListener('touchmove', function(e) {
      e.preventDefault();
      guideX = getFieldX(e.touches[0].clientX);
    }, { passive: false });
    canvas.addEventListener('touchend', function(e) {
      e.preventDefault();
      if (e.changedTouches.length > 0) {
        var x = getFieldX(e.changedTouches[0].clientX);
        Game.drop(x);
      }
      guideX = null;
    }, { passive: false });
  }

  function init() {
    canvas = el('canvas');
    ctx = canvas.getContext('2d');

    el('title-best').textContent = Game.getBest();
    el('btn-start').addEventListener('click', function() {
      showScreen('game');
      startGame();
    });
    el('btn-retry').addEventListener('click', function() {
      startGame();
    });
    el('btn-title-go').addEventListener('click', function() {
      el('overlay-gameover').classList.add('hidden');
      cancelAnimationFrame(raf);
      showScreen('title');
      el('title-best').textContent = Game.getBest();
    });

    initInput();
    window.addEventListener('resize', function() {
      if (el('screen-game').classList.contains('active')) {
        startGame();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
