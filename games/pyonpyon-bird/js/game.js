(function() {
  var HS_KEY = 'pyonpyon-bird.highscore';
  var GRAVITY = 0.20;
  var FLAP_VY = -5.2;
  var PIPE_WIDTH = 60;
  var BASE_SPEED = 1.6;
  var BASE_GAP = 220;
  var MIN_GAP = 175;
  var PIPE_INTERVAL = 130; // frames

  var canvas, ctx, W, H, DPR;
  var status, bird, pipes, score, best, frame, speed, gapSize;
  var deadTimer;
  var bgX = 0;

  // Cloud positions (fixed relative, scroll independently)
  var clouds = [];

  function el(id) { return document.getElementById(id); }

  function init() {
    canvas = el('canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    best = parseInt(localStorage.getItem(HS_KEY) || '0', 10);

    canvas.addEventListener('click', onTap);
    canvas.addEventListener('touchstart', function(e) { e.preventDefault(); onTap(); }, { passive: false });
    el('btn-retry').addEventListener('click', function() { hideOverlay(); startGame(); });
    el('btn-title').addEventListener('click', function() { hideOverlay(); status = 'waiting'; });

    clouds = [
      { x: 0.1, y: 0.12, w: 0.18 },
      { x: 0.4, y: 0.07, w: 0.14 },
      { x: 0.7, y: 0.15, w: 0.20 },
      { x: 0.9, y: 0.08, w: 0.12 }
    ];

    status = 'waiting';
    requestAnimationFrame(loop);
  }

  function resize() {
    DPR = window.devicePixelRatio || 1;
    var maxW = Math.min(window.innerWidth, 420);
    var maxH = window.innerHeight;
    W = Math.min(maxW, Math.floor(maxH * 0.67));
    H = Math.floor(W * 1.5);
    if (H > maxH) { H = maxH; W = Math.floor(H * 0.67); }
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);
  }

  function startGame() {
    Sound.init();
    score = 0;
    frame = 0;
    speed = BASE_SPEED;
    gapSize = BASE_GAP;
    deadTimer = 0;
    bird = { x: W * 0.25, y: H * 0.45, vy: 0, rotation: 0 };
    pipes = [];
    status = 'playing';
  }

  function onTap() {
    if (status === 'waiting') {
      startGame();
      bird.vy = FLAP_VY;
      Sound.play('flap');
    } else if (status === 'playing') {
      bird.vy = FLAP_VY;
      Sound.play('flap');
    }
  }

  function hideOverlay() {
    el('overlay-gameover').classList.add('hidden');
  }

  function loop() {
    requestAnimationFrame(loop);
    update();
    draw();
  }

  function update() {
    bgX = (bgX - 0.5) % W;

    if (status !== 'playing') {
      if (status === 'dead') {
        bird.vy += GRAVITY;
        bird.y += bird.vy;
        bird.rotation += 0.12;
        deadTimer--;
        if (deadTimer <= 0) {
          if (score > best) {
            best = score;
            localStorage.setItem(HS_KEY, best);
          }
          el('go-score').textContent = score;
          el('go-best').textContent  = best;
          el('overlay-gameover').classList.remove('hidden');
          status = 'over';
        }
      }
      return;
    }

    frame++;

    // Difficulty scaling
    if (frame % 1200 === 0) speed = Math.min(speed + 0.3, 3.8);
    if (frame % 2400 === 0) gapSize = Math.max(gapSize - 3, MIN_GAP);

    // Bird physics
    bird.vy += GRAVITY;
    bird.y  += bird.vy;
    bird.rotation = Math.max(-0.5, Math.min(1.2, bird.vy * 0.08));

    // Spawn pipes
    if (frame % PIPE_INTERVAL === 0) {
      var minY = H * 0.2;
      var maxY = H * 0.75 - gapSize;
      var gapY = minY + Math.random() * (maxY - minY);
      pipes.push({ x: W + PIPE_WIDTH, gapY: gapY, gap: gapSize, scored: false });
    }

    // Move pipes
    for (var i = pipes.length - 1; i >= 0; i--) {
      pipes[i].x -= speed;
      if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < bird.x) {
        pipes[i].scored = true;
        score++;
        Sound.play('score');
      }
      if (pipes[i].x < -PIPE_WIDTH - 10) pipes.splice(i, 1);
    }

    // Collision (bird radius -4px for feel)
    var bR = getBirdRadius() - 4;
    if (bird.y - bR < 0 || bird.y + bR > H) { die(); return; }
    for (var j = 0; j < pipes.length; j++) {
      var p = pipes[j];
      if (bird.x + bR > p.x && bird.x - bR < p.x + PIPE_WIDTH) {
        if (bird.y - bR < p.gapY || bird.y + bR > p.gapY + p.gap) { die(); return; }
      }
    }
  }

  function getBirdRadius() { return Math.min(W, H) * 0.055; }

  function die() {
    Sound.play('gameover');
    status = 'dead';
    deadTimer = 40;
  }

  // ---- Drawing ----

  function drawBg() {
    // Sky gradient
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#64B5F6');
    grad.addColorStop(1, '#B3E5FC');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Ground
    ctx.fillStyle = '#8BC34A';
    ctx.fillRect(0, H - 32, W, 32);
    ctx.fillStyle = '#558B2F';
    ctx.fillRect(0, H - 16, W, 16);

    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    clouds.forEach(function(c) {
      var cx = ((c.x * W + bgX * 0.3) % (W + 80)) - 40;
      var cy = c.y * H;
      var cw = c.w * W;
      drawCloud(cx, cy, cw);
    });
  }

  function drawCloud(x, y, w) {
    var h = w * 0.4;
    ctx.beginPath();
    ctx.ellipse(x,         y,       w * 0.5, h * 0.6, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w*0.25, y - h*0.2, w * 0.35, h * 0.55, 0, 0, Math.PI * 2);
    ctx.ellipse(x - w*0.25, y + h*0.1, w * 0.28, h * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPipes() {
    pipes.forEach(function(p) {
      // Top pipe
      drawPipe(p.x, 0, PIPE_WIDTH, p.gapY, true);
      // Bottom pipe
      drawPipe(p.x, p.gapY + p.gap, PIPE_WIDTH, H - (p.gapY + p.gap) - 32, false);
    });
  }

  function drawPipe(x, y, w, h, isTop) {
    var capH = 20, capW = w + 10, capX = x - 5;

    var grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#66BB6A');
    grad.addColorStop(0.5, '#81C784');
    grad.addColorStop(1, '#388E3C');
    ctx.fillStyle = grad;

    if (isTop) {
      roundRect(ctx, x, y, w, h - capH, 0);
      ctx.fill();
      roundRect(ctx, capX, h - capH, capW, capH, [0, 0, 6, 6]);
      ctx.fill();
    } else {
      roundRect(ctx, capX, y, capW, capH, [6, 6, 0, 0]);
      ctx.fill();
      roundRect(ctx, x, y + capH, w, h - capH, 0);
      ctx.fill();
    }

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    if (isTop) {
      ctx.fillRect(x + 4, y, 8, h - capH);
    } else {
      ctx.fillRect(x + 4, y + capH, 8, h - capH);
    }
  }

  function roundRect(c, x, y, w, h, r) {
    if (typeof r === 'number') r = [r,r,r,r];
    c.beginPath();
    c.moveTo(x + r[0], y);
    c.lineTo(x + w - r[1], y);
    c.quadraticCurveTo(x + w, y, x + w, y + r[1]);
    c.lineTo(x + w, y + h - r[2]);
    c.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
    c.lineTo(x + r[3], y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r[3]);
    c.lineTo(x, y + r[0]);
    c.quadraticCurveTo(x, y, x + r[0], y);
    c.closePath();
  }

  function drawBird() {
    var r = getBirdRadius();
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    // Body
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD54F';
    ctx.fill();
    ctx.strokeStyle = '#F9A825';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eye
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.2, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.42, -r * 0.18, r * 0.13, 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.fill();

    // Beak
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.05);
    ctx.lineTo(r * 1.2, r * 0.08);
    ctx.lineTo(r * 0.7, r * 0.22);
    ctx.closePath();
    ctx.fillStyle = '#FF8F00';
    ctx.fill();

    // Wing (flap based on vy)
    var wingY = bird.vy < -2 ? -r * 0.45 : r * 0.1;
    ctx.beginPath();
    ctx.ellipse(-r * 0.2, wingY, r * 0.5, r * 0.25, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFB300';
    ctx.fill();

    ctx.restore();
  }

  function drawScore() {
    if (status !== 'playing' && status !== 'dead') return;
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + Math.floor(W * 0.1) + 'px sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillText(score, W/2 + 2, H * 0.1 + 2);
    ctx.fillStyle = '#fff';
    ctx.fillText(score, W/2, H * 0.1);
  }

  function drawTitle() {
    // Panel
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, W*0.1, H*0.25, W*0.8, H*0.38, 20);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    roundRect(ctx, W*0.12, H*0.27, W*0.76, H*0.34, 16);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#F57C00';
    ctx.font = 'bold ' + Math.floor(W * 0.11) + 'px sans-serif';
    ctx.fillText('ぴょんぴょん', W/2, H * 0.35);
    ctx.fillText('バード 🐥', W/2, H * 0.44);

    ctx.font = Math.floor(W * 0.065) + 'px sans-serif';
    ctx.fillStyle = '#555';
    ctx.fillText('ベスト: ' + best, W/2, H * 0.53);

    ctx.font = 'bold ' + Math.floor(W * 0.065) + 'px sans-serif';
    ctx.fillStyle = '#E53935';
    var pulse = 0.9 + 0.1 * Math.sin(frame * 0.1);
    ctx.save();
    ctx.scale(pulse, pulse);
    ctx.fillText('タップでスタート！', W / (2 * pulse), (H * 0.63) / pulse);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBg();
    drawPipes();
    drawBird();
    drawScore();
    if (status === 'waiting') drawTitle();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
