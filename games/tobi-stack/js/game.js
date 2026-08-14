(function() {
  // ---- Constants ----
  var GAME_TIME  = 90;
  var MAX_MISSES = 3;
  var BLOCK_UNIT = 50; // px per score "stage"

  var SHAPES = [
    { name: 'square', w: 60, h: 60,  color: '#ff6b6b' },
    { name: 'wide',   w: 120, h: 40, color: '#ffd93d' },
    { name: 'tall',   w: 40, h: 100, color: '#6bcb77' },
    { name: 'big',    w: 90, h: 65,  color: '#4d96ff' },
    { name: 'plank',  w: 150, h: 28, color: '#c77dff' },
    { name: 'brick',  w: 80, h: 45,  color: '#ff922b' },
  ];

  // ---- State ----
  var canvas, ctx, W, H, DPR;
  var engine, world, runner;
  var status; // 'title' | 'playing' | 'result'
  var stackBodies;    // { body, color, w, h }
  var activeBlock;    // { x, y, angle, shape }
  var nextShapeIdx;
  var missCount, timeLeft, score, lastTime;
  var frame = 0;
  var spawning = false; // true while waiting to spawn next block
  var swipeStartX = 0, swipeStartY = 0;

  function el(id) { return document.getElementById(id); }
  function getBest() { return parseInt(localStorage.getItem('tobi-stack.hs') || '0', 10); }
  function saveBest(v) { localStorage.setItem('tobi-stack.hs', v); }

  // ---- Init ----
  function init() {
    canvas = el('canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    window.addEventListener('keydown', function(e) {
      if (status === 'title' && (e.code === 'Space' || e.code === 'Enter')) {
        startGame(); return;
      }
      if (status !== 'playing') return;
      if (e.code === 'ArrowLeft')  { e.preventDefault(); moveBlock(-1); }
      if (e.code === 'ArrowRight') { e.preventDefault(); moveBlock(1); }
      if (e.code === 'KeyZ' || e.code === 'KeyX') { e.preventDefault(); rotateBlock(); }
      if (e.code === 'Space' || e.code === 'ArrowDown') { e.preventDefault(); placeBlock(); }
    });

    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      var t = e.touches[0];
      swipeStartX = t.clientX;
      swipeStartY = t.clientY;
      if (status === 'title') { Sound.init(); startGame(); return; }
      Sound.init();
    }, { passive: false });

    canvas.addEventListener('touchend', function(e) {
      e.preventDefault();
      if (status !== 'playing') return;
      var t = e.changedTouches[0];
      var dx = t.clientX - swipeStartX;
      var dy = t.clientY - swipeStartY;
      if (Math.abs(dy) > 40 && dy > 0) { placeBlock(); return; }
      if (Math.abs(dx) > 30) { moveBlock(dx > 0 ? 1 : -1); return; }
      rotateBlock();
    }, { passive: false });

    el('btn-retry').addEventListener('click', function() { hideOverlay(); startGame(); });
    el('btn-title').addEventListener('click', function() { hideOverlay(); status = 'title'; });

    status = 'title';
    requestAnimationFrame(loop);
  }

  function resize() {
    DPR = window.devicePixelRatio || 1;
    var maxW = Math.min(window.innerWidth, 400);
    var maxH = window.innerHeight;
    W = Math.min(maxW, Math.floor(maxH * 0.62));
    H = Math.floor(W / 0.62);
    if (H > maxH) { H = maxH; W = Math.floor(H * 0.62); }
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);
  }

  // ---- Start ----
  function startGame() {
    if (runner) Matter.Runner.stop(runner);
    if (engine) Matter.Engine.clear(engine);

    engine = Matter.Engine.create({ gravity: { y: 2.2 }, enableSleeping: true });
    world  = engine.world;
    runner = Matter.Runner.create();

    // Floor (static, wide enough to catch anything)
    var floorOpts = { isStatic: true, friction: 0.85, restitution: 0.06, label: 'floor' };
    Matter.World.add(world, Matter.Bodies.rectangle(W / 2, H + 22, W * 4, 44, floorOpts));
    // No side walls — blocks can fall off sides

    // Detect blocks that fall off screen
    Matter.Events.on(engine, 'afterUpdate', function() {
      if (status !== 'playing') return;
      for (var i = stackBodies.length - 1; i >= 0; i--) {
        var b = stackBodies[i].body;
        if (b.position.y > H + 160 || b.position.x < -120 || b.position.x > W + 120) {
          Matter.World.remove(world, b);
          stackBodies.splice(i, 1);
          missCount++;
          Sound.play('miss');
          if (missCount >= MAX_MISSES) { endGame('gameover'); return; }
        }
      }
    });

    Matter.Runner.run(runner, engine);

    stackBodies   = [];
    missCount     = 0;
    timeLeft      = GAME_TIME;
    score         = 0;
    frame         = 0;
    spawning      = false;
    lastTime      = performance.now();
    nextShapeIdx  = Math.floor(Math.random() * SHAPES.length);
    spawnBlock();
    status = 'playing';
  }

  // ---- Block management ----
  function spawnBlock() {
    spawning = false;
    var idx  = nextShapeIdx;
    nextShapeIdx = Math.floor(Math.random() * SHAPES.length);
    var shape = SHAPES[idx];
    activeBlock = { x: W / 2, y: shape.h / 2 + 20, angle: 0, shape: shape };
  }

  function activeHalfW() {
    if (!activeBlock) return 0;
    var norm = ((Math.round(activeBlock.angle / (Math.PI / 2)) % 2) + 2) % 2;
    return norm === 1 ? activeBlock.shape.h / 2 : activeBlock.shape.w / 2;
  }

  function moveBlock(dir) {
    if (!activeBlock) return;
    var hw = activeHalfW();
    activeBlock.x = Math.max(hw + 4, Math.min(W - hw - 4, activeBlock.x + dir * 20));
    Sound.play('move');
  }

  function rotateBlock() {
    if (!activeBlock) return;
    activeBlock.angle += Math.PI / 2;
    // Clamp position after rotation
    var hw = activeHalfW();
    activeBlock.x = Math.max(hw + 4, Math.min(W - hw - 4, activeBlock.x));
    Sound.play('rotate');
  }

  function placeBlock() {
    if (!activeBlock || spawning) return;
    var s = activeBlock.shape;
    var body = Matter.Bodies.rectangle(
      activeBlock.x, activeBlock.y, s.w, s.h,
      { friction: 0.75, restitution: 0.06, frictionAir: 0.01, density: 0.003, label: 'block' }
    );
    Matter.Body.setAngle(body, activeBlock.angle);
    Matter.Body.setVelocity(body, { x: 0, y: 7 });
    Matter.World.add(world, body);
    stackBodies.push({ body: body, color: s.color, w: s.w, h: s.h });
    Sound.play('place');
    activeBlock = null;
    spawning = true;
    setTimeout(function() { if (status === 'playing') spawnBlock(); }, 1100);
  }

  // ---- Score ----
  function calcScore() {
    if (stackBodies.length === 0) return 0;
    var minY = H;
    stackBodies.forEach(function(e) { minY = Math.min(minY, e.body.position.y); });
    return Math.max(0, Math.floor((H - minY) / BLOCK_UNIT));
  }

  // ---- End ----
  function endGame(reason) {
    if (status !== 'playing') return;
    status = 'result';
    Matter.Runner.stop(runner);
    score = calcScore();
    var best = getBest();
    if (score > best) { best = score; saveBest(score); }
    el('go-score').textContent = score + ' 段';
    el('go-best').textContent  = best + ' 段';
    if (reason === 'timeup') {
      el('result-emoji').textContent  = '🏆';
      el('result-title').textContent  = 'タイムアップ！';
      Sound.play('timeup');
    } else {
      el('result-emoji').textContent  = '💥';
      el('result-title').textContent  = 'ゲームオーバー！';
      Sound.play('gameover');
    }
    el('overlay-result').classList.remove('hidden');
  }

  function hideOverlay() { el('overlay-result').classList.add('hidden'); }

  // ---- Game Loop ----
  function loop(now) {
    requestAnimationFrame(loop);
    if (status === 'playing') {
      var dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; endGame('timeup'); }
      score = calcScore();
    }
    frame++;
    draw();
  }

  // ---- Drawing ----
  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBg();
    if (status === 'title') { drawTitle(); return; }

    // Floor strip
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(0, H, W, 44);
    ctx.fillStyle = '#c9a84c';
    ctx.fillRect(0, H - 5, W, 5);

    // Stack bodies
    stackBodies.forEach(drawBody);

    // Active block
    if (activeBlock) drawActiveBlock();

    // Waiting indicator (spawning)
    if (spawning) {
      var pulse = 0.4 + 0.4 * Math.sin(frame * 0.2);
      ctx.globalAlpha = pulse;
      ctx.textAlign = 'center';
      ctx.font = 'bold ' + Math.floor(W * 0.04) + 'px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('次のブロックを準備中…', W / 2, H * 0.1);
      ctx.globalAlpha = 1;
    }

    drawHUD();
  }

  function drawBg() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0f1726');
    g.addColorStop(1, '#1e2d4a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    var step = BLOCK_UNIT;
    for (var y = H % step; y < H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (var x = 0; x < W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
  }

  function drawBody(b) {
    var pos = b.body.position;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(b.body.angle);
    ctx.fillStyle = b.color;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
    // Highlight sheen
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * 0.35);
    ctx.restore();
  }

  function drawActiveBlock() {
    var ab = activeBlock, s = ab.shape;
    ctx.save();
    ctx.translate(ab.x, ab.y);
    ctx.rotate(ab.angle);

    // Ghost fill
    ctx.fillStyle = s.color;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
    ctx.globalAlpha = 1;

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-s.w / 2, -s.h / 2, s.w, s.h);

    // Sheen
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h * 0.35);

    // Drop guide (vertical line going down)
    ctx.rotate(-ab.angle); // unrotate so guide is always vertical
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, s.h / 2 + 4);
    ctx.lineTo(0, H - ab.y + s.h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  function drawHUD() {
    if (status !== 'playing') return;
    var fs = Math.max(13, Math.floor(W * 0.04));

    // Timer
    ctx.font = 'bold ' + (fs + 2) + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = timeLeft <= 10 ? '#ff4444' : '#fff';
    ctx.fillText('⏱ ' + Math.ceil(timeLeft), 10, 28);

    // Score
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFD54F';
    ctx.fillText('🏗 ' + score + '段', W - 10, 28);

    // Miss hearts (bottom center)
    var hearts = '';
    for (var h = 0; h < MAX_MISSES; h++) {
      hearts += (h < MAX_MISSES - missCount) ? '❤️' : '🖤';
    }
    ctx.textAlign = 'center';
    ctx.font = fs + 'px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(hearts, W / 2, H - 8);

    // Next block preview
    var ns = SHAPES[nextShapeIdx];
    var nw = Math.min(ns.w * 0.45, 55);
    var nh = ns.h / ns.w * nw;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = Math.floor(W * 0.03) + 'px sans-serif';
    ctx.fillText('NEXT', 10, H - 30);
    ctx.fillStyle = ns.color;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.fillRect(54, H - 30 - nh / 2 - 4, nw, nh);
    ctx.strokeRect(54, H - 30 - nh / 2 - 4, nw, nh);
  }

  // ---- Title ----
  function drawTitle() {
    var pw = W * 0.84, ph = H * 0.8;
    var px = (W - pw) / 2, py = (H - ph) / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(px + 4, py + 4, pw, ph, 20); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundRect(px, py, pw, ph, 20); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    roundRect(px, py, pw, ph, 20); ctx.stroke();

    ctx.textAlign = 'center';

    var ts = Math.floor(W * 0.11);
    ctx.font = 'bold ' + ts + 'px sans-serif';
    ctx.fillStyle = '#FFD54F';
    ctx.shadowColor = '#ff8c00';
    ctx.shadowBlur = 12;
    ctx.fillText('TOBI STACK', W / 2, py + ph * 0.19);
    ctx.shadowBlur = 0;

    ctx.font = Math.floor(W * 0.057) + 'px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText('📦 箱積み職人', W / 2, py + ph * 0.31);

    ctx.font = Math.floor(W * 0.045) + 'px sans-serif';
    ctx.fillStyle = '#FFD54F';
    ctx.fillText('ベスト: ' + getBest() + ' 段', W / 2, py + ph * 0.43);

    var cs = Math.floor(W * 0.034);
    ctx.font = cs + 'px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('【操作方法】', W / 2, py + ph * 0.54);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('← → / 左右スワイプ → 移動', W / 2, py + ph * 0.62);
    ctx.fillText('Z / X / タップ → 回転', W / 2, py + ph * 0.70);
    ctx.fillText('スペース / 下スワイプ → 落とす', W / 2, py + ph * 0.78);

    var pulse = 0.65 + 0.35 * Math.sin(frame * 0.05);
    ctx.globalAlpha = pulse;
    ctx.font = 'bold ' + Math.floor(W * 0.05) + 'px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('タップしてスタート！', W / 2, py + ph * 0.91);
    ctx.globalAlpha = 1;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
