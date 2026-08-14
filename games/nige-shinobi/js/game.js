(function() {
  // ---- Constants ----
  var GROUND_H = 64;          // ground strip height
  var PLAYER_W = 36;
  var PLAYER_H = 48;
  var SHURIKEN_COOLDOWN = 30; // frames (0.5s @ 60fps)
  var INIT_SPEED = 4;         // px/frame (~240px/s at 60fps)
  var MAX_SPEED  = 10;
  var SPEED_STEP = 0.015;     // per frame speed increase

  // ---- State ----
  var canvas, ctx, W, H, DPR;
  var status; // 'title' | 'playing' | 'dead' | 'over'
  var player, obstacles, enemies, shurikens, particles;
  var speed, score, distance, frame, deadTimer;
  var shurikenCooldown, swipeStartX;
  var bgX = 0, bgX2 = 0;
  var keys = {};

  function el(id) { return document.getElementById(id); }
  function getBest() { return parseInt(localStorage.getItem('nige-shinobi.hs') || '0', 10); }
  function saveBest(v) { localStorage.setItem('nige-shinobi.hs', v); }

  // ---- Init ----
  function init() {
    canvas = el('canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    // Keyboard
    window.addEventListener('keydown', function(e) {
      keys[e.code] = true;
      if (status === 'playing') {
        if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); doJump(); }
        if (e.code === 'KeyZ' || e.code === 'KeyX')     { e.preventDefault(); doShuriken(); }
      } else if (status === 'title') {
        if (e.code === 'Space' || e.code === 'Enter') startGame();
      }
    });
    window.addEventListener('keyup', function(e) { keys[e.code] = false; });

    // Touch
    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      var t = e.touches[0];
      swipeStartX = t.clientX;
      if (status === 'title') { Sound.init(); startGame(); return; }
      if (status === 'playing') { Sound.init(); doJump(); }
    }, { passive: false });
    canvas.addEventListener('touchend', function(e) {
      e.preventDefault();
      if (status !== 'playing') return;
      var t = e.changedTouches[0];
      if (swipeStartX - t.clientX > 40) doShuriken(); // swipe left
    }, { passive: false });

    // Overlay buttons
    el('btn-retry').addEventListener('click', function() { hideOverlay(); startGame(); });
    el('btn-title').addEventListener('click', function() { hideOverlay(); status = 'title'; });

    status = 'title';
    requestAnimationFrame(loop);
  }

  function resize() {
    DPR = window.devicePixelRatio || 1;
    var maxW = Math.min(window.innerWidth, 480);
    var maxH = window.innerHeight;
    W = Math.min(maxW, Math.floor(maxH * 1.6));
    H = Math.floor(W / 1.6);
    if (H > maxH) { H = maxH; W = Math.floor(H * 1.6); }
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);
  }

  function startGame() {
    Sound.init();
    var groundY = H - GROUND_H;
    player = {
      x: W * 0.18,
      y: groundY - PLAYER_H,
      vy: 0,
      onGround: true,
      runFrame: 0,
      dead: false
    };
    obstacles   = [];
    enemies     = [];
    shurikens   = [];
    particles   = [];
    speed       = INIT_SPEED;
    score       = 0;
    distance    = 0;
    frame       = 0;
    deadTimer   = 0;
    shurikenCooldown = 0;
    status = 'playing';
  }

  // ---- Actions ----
  function doJump() {
    if (!player.onGround) return;
    player.vy = -H * 0.028;
    player.onGround = false;
    Sound.play('jump');
  }

  function doShuriken() {
    if (shurikenCooldown > 0) return;
    shurikens.push({ x: player.x + PLAYER_W, y: player.y + PLAYER_H * 0.3, vx: speed + 8 });
    shurikenCooldown = SHURIKEN_COOLDOWN;
    Sound.play('shuriken');
  }

  // ---- Game Loop ----
  function loop() {
    requestAnimationFrame(loop);
    update();
    draw();
  }

  function update() {
    bgX  = ((bgX  - speed * 0.3) % W + W) % W;
    bgX2 = ((bgX2 - speed * 0.15) % W + W) % W;

    if (status === 'dead') {
      player.vy += 0.5;
      player.y  += player.vy;
      player.x  -= 1;
      deadTimer--;
      if (deadTimer <= 0) {
        var best = getBest();
        if (score > best) { best = score; saveBest(best); }
        el('go-score').textContent = score;
        el('go-best').textContent  = best;
        el('overlay-gameover').classList.remove('hidden');
        status = 'over';
      }
      updateParticles();
      return;
    }

    if (status !== 'playing') return;

    frame++;
    speed = Math.min(MAX_SPEED, INIT_SPEED + frame * SPEED_STEP);
    distance += speed / 60;
    score = Math.floor(distance);
    if (shurikenCooldown > 0) shurikenCooldown--;

    // Player physics
    var gravity = H * 0.0012;
    var groundY = H - GROUND_H - PLAYER_H;
    player.vy += gravity;
    player.y  += player.vy;
    if (player.y >= groundY) {
      player.y = groundY;
      player.vy = 0;
      player.onGround = true;
    }
    player.runFrame++;

    // Spawn obstacles: rocks (ground) and birds (aerial)
    var spawnInterval = Math.max(60, 110 - Math.floor(frame / 200));
    if (frame % spawnInterval === 0) {
      if (Math.random() < 0.6) {
        // rock on ground
        var rh = 20 + Math.random() * 24;
        obstacles.push({ x: W + 20, y: H - GROUND_H - rh, w: 28 + Math.random() * 16, h: rh, type: 'rock' });
      } else {
        // bird in air (at jump height area)
        var by = (H - GROUND_H - PLAYER_H) - (H * 0.12 + Math.random() * H * 0.12);
        obstacles.push({ x: W + 20, y: by, w: 32, h: 20, type: 'bird', flapT: 0 });
      }
    }

    // Spawn enemies
    var enemyInterval = Math.max(200, 350 - Math.floor(frame / 120));
    if (frame % enemyInterval === 0) {
      enemies.push({ x: W + 20, y: H - GROUND_H - 44, w: 32, h: 44, type: 'samurai', walkFrame: 0 });
    }

    // Move obstacles
    for (var i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].x -= speed;
      if (obstacles[i].type === 'bird') obstacles[i].flapT += 0.15;
      if (obstacles[i].x < -60) obstacles.splice(i, 1);
    }

    // Move enemies
    for (var j = enemies.length - 1; j >= 0; j--) {
      enemies[j].x -= speed * 1.4;
      enemies[j].walkFrame++;
      if (enemies[j].x < -60) { enemies.splice(j, 1); continue; }
    }

    // Move shurikens & check enemy hits
    for (var s = shurikens.length - 1; s >= 0; s--) {
      shurikens[s].x += shurikens[s].vx;
      shurikens[s].rot = (shurikens[s].rot || 0) + 0.3;
      var hit = false;
      for (var e = enemies.length - 1; e >= 0; e--) {
        if (rectsOverlap(shurikens[s].x - 6, shurikens[s].y - 6, 12, 12,
                         enemies[e].x, enemies[e].y, enemies[e].w, enemies[e].h)) {
          spawnParticles(enemies[e].x + enemies[e].w / 2, enemies[e].y + enemies[e].h / 2, '#FF6B35');
          enemies.splice(e, 1);
          score += 10;
          Sound.play('kill');
          hit = true;
          break;
        }
      }
      if (hit || shurikens[s].x > W + 40) { shurikens.splice(s, 1); continue; }
    }

    // Collision with obstacles and enemies
    var pr = 4; // hitbox shrink
    var px = player.x + pr, py = player.y + pr, pw = PLAYER_W - pr*2, ph = PLAYER_H - pr*2;

    for (var oi = 0; oi < obstacles.length; oi++) {
      var o = obstacles[oi];
      if (rectsOverlap(px, py, pw, ph, o.x, o.y, o.w, o.h)) { die(); return; }
    }
    for (var ei = 0; ei < enemies.length; ei++) {
      var en = enemies[ei];
      if (rectsOverlap(px, py, pw, ph, en.x, en.y, en.w, en.h)) { die(); return; }
    }

    updateParticles();
  }

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function die() {
    Sound.play('gameover');
    spawnParticles(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, '#fff');
    status = 'dead';
    deadTimer = 50;
    player.dead = true;
  }

  // ---- Particles ----
  function spawnParticles(x, y, color) {
    for (var i = 0; i < 10; i++) {
      var angle = Math.random() * Math.PI * 2;
      var spd = 1 + Math.random() * 4;
      particles.push({ x: x, y: y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 2,
                        life: 1, color: color });
    }
  }

  function updateParticles() {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.04;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // ---- Drawing ----
  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBg();
    if (status === 'title') { drawTitle(); return; }
    drawObstacles();
    drawEnemies();
    drawShurikens();
    drawParticles();
    drawPlayer();
    drawHUD();
  }

  function drawBg() {
    // Sky gradient
    var sky = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
    sky.addColorStop(0, '#0d1b2a');
    sky.addColorStop(1, '#1b3a5c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H - GROUND_H);

    // Distant mountains (parallax layer 2)
    ctx.fillStyle = '#162840';
    for (var m = 0; m < 4; m++) {
      var mx = ((m * W / 3 + bgX2 * 0.5) % (W + 100)) - 50;
      drawMountain(mx, H - GROUND_H, 120 + m * 30, 90 + m * 20);
    }

    // Near mountains (parallax layer 1)
    ctx.fillStyle = '#1e3a5a';
    for (var n = 0; n < 5; n++) {
      var nx = ((n * W / 4 + bgX * 0.6) % (W + 80)) - 40;
      drawMountain(nx, H - GROUND_H, 80 + n * 20, 60 + n * 15);
    }

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (var st = 0; st < 20; st++) {
      var sx = ((st * 97 + bgX2 * 0.08) % W);
      var sy = (st * 53) % (H * 0.5);
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // Ground
    var groundGrad = ctx.createLinearGradient(0, H - GROUND_H, 0, H);
    groundGrad.addColorStop(0, '#4a3728');
    groundGrad.addColorStop(0.3, '#3d2e20');
    groundGrad.addColorStop(1, '#2a1f15');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, H - GROUND_H, W, GROUND_H);

    // Ground line decoration
    ctx.fillStyle = '#5a4535';
    ctx.fillRect(0, H - GROUND_H, W, 4);

    // Ground stripes (scrolling)
    ctx.fillStyle = 'rgba(90,70,50,0.4)';
    for (var gs = 0; gs < 12; gs++) {
      var gx = ((gs * 60 + bgX) % (W + 60)) - 60;
      ctx.fillRect(gx, H - GROUND_H + 8, 30, 3);
    }
  }

  function drawMountain(x, baseY, w, h) {
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + w / 2, baseY - h);
    ctx.lineTo(x + w, baseY);
    ctx.closePath();
    ctx.fill();
  }

  function drawPlayer() {
    var x = player.x, y = player.y;
    var run = Math.floor(player.runFrame / 5) % 4;
    ctx.save();
    if (player.dead) {
      ctx.globalAlpha = 0.5;
      ctx.translate(x + PLAYER_W / 2, y + PLAYER_H / 2);
      ctx.rotate(0.5);
      ctx.translate(-(PLAYER_W / 2), -(PLAYER_H / 2));
      x = 0; y = 0;
    }
    // Body (ninja dark)
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x + 8, y + 16, 20, 24);

    // Head with mask
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(x + 18, y + 11, 11, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (white slits)
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 12, y + 8, 5, 3);
    ctx.fillRect(x + 19, y + 8, 5, 3);

    // Scarf (red)
    ctx.fillStyle = '#e63946';
    ctx.fillRect(x + 6, y + 18, 24, 5);

    // Legs (running animation)
    var legOffsets = [[0,0],[4,8],[8,0],[4,-4]];
    var lo = legOffsets[run];
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 10, y + 40 + lo[0], 8, 10);
    ctx.fillRect(x + 20, y + 40 + lo[1], 8, 10);

    // Arms
    var armY = player.onGround ? [y + 22, y + 24] : [y + 18, y + 20];
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 2, armY[0], 8, 5);
    ctx.fillRect(x + 26, armY[1], 8, 5);

    ctx.restore();
  }

  function drawObstacles() {
    obstacles.forEach(function(o) {
      if (o.type === 'rock') {
        // Rock
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.ellipse(o.x + o.w / 2, o.y + o.h, o.w / 2, o.h * 0.7, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.beginPath();
        ctx.ellipse(o.x + o.w * 0.4, o.y + o.h * 0.4, o.w * 0.25, o.h * 0.2, -0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Bird / crow
        var bx = o.x + o.w / 2, by = o.y + o.h / 2;
        var flap = Math.sin(o.flapT) * 6;
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.ellipse(bx, by, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // wings
        ctx.beginPath();
        ctx.moveTo(bx - 4, by); ctx.quadraticCurveTo(bx - 18, by - flap, bx - 14, by + 4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + 4, by); ctx.quadraticCurveTo(bx + 18, by - flap, bx + 14, by + 4);
        ctx.fill();
        // beak
        ctx.fillStyle = '#F9A825';
        ctx.beginPath();
        ctx.moveTo(bx + 14, by - 2); ctx.lineTo(bx + 22, by); ctx.lineTo(bx + 14, by + 2);
        ctx.fill();
      }
    });
  }

  function drawEnemies() {
    enemies.forEach(function(en) {
      var ex = en.x, ey = en.y;
      var run = Math.floor(en.walkFrame / 6) % 4;
      // samurai body
      ctx.fillStyle = '#8B0000';
      ctx.fillRect(ex + 6, ey + 14, 20, 22);
      // head
      ctx.fillStyle = '#c8a882';
      ctx.beginPath();
      ctx.arc(ex + 16, ey + 9, 9, 0, Math.PI * 2);
      ctx.fill();
      // helmet
      ctx.fillStyle = '#333';
      ctx.fillRect(ex + 7, ey + 1, 18, 10);
      ctx.beginPath();
      ctx.arc(ex + 16, ey + 6, 9, Math.PI, 0);
      ctx.fill();
      // sword
      ctx.fillStyle = '#ccc';
      ctx.fillRect(ex - 6, ey + 10, 14, 3);
      ctx.fillStyle = '#8B0000';
      ctx.fillRect(ex + 6, ey + 10, 5, 3);
      // legs
      var lo2 = [[0,6],[4,2],[6,0],[2,4]][run];
      ctx.fillStyle = '#444';
      ctx.fillRect(ex + 8, ey + 36 + lo2[0], 7, 9);
      ctx.fillRect(ex + 17, ey + 36 + lo2[1], 7, 9);
    });
  }

  function drawShurikens() {
    shurikens.forEach(function(s) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot || 0);
      ctx.fillStyle = '#ccc';
      for (var b = 0; b < 4; b++) {
        ctx.save();
        ctx.rotate(b * Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -8); ctx.lineTo(4, 0); ctx.lineTo(0, 8); ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#aaa';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawParticles() {
    particles.forEach(function(p) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    if (status !== 'playing' && status !== 'dead') return;
    var fs = Math.max(14, Math.floor(W * 0.038));
    ctx.font = 'bold ' + fs + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillText('スコア: ' + score, 14, 28);
    ctx.fillStyle = '#fff';
    ctx.fillText('スコア: ' + score, 12, 26);

    // Shuriken cooldown indicator
    if (shurikenCooldown > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = Math.floor(W * 0.03) + 'px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('手裏剣 ⏳', W - 12, 26);
    } else {
      ctx.fillStyle = '#FFD54F';
      ctx.font = Math.floor(W * 0.03) + 'px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('手裏剣 ✦', W - 12, 26);
    }
  }

  function drawTitle() {
    var pw = W * 0.82, ph = H * 0.72;
    var px = (W - pw) / 2, py = (H - ph) / 2 - H * 0.04;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(px + 4, py + 4, pw, ph, 20);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundRect(px, py, pw, ph, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    roundRect(px, py, pw, ph, 20);
    ctx.stroke();

    // Title
    var titleSize = Math.floor(W * 0.13);
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + titleSize + 'px sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillText('逃げ忍！', W / 2 + 3, py + ph * 0.2 + 3);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#e63946';
    ctx.shadowBlur = 12;
    ctx.fillText('逃げ忍！', W / 2, py + ph * 0.2);
    ctx.shadowBlur = 0;

    ctx.font = Math.floor(W * 0.07) + 'px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('🥷 忍者ランナー', W / 2, py + ph * 0.35);

    // Best score
    ctx.font = Math.floor(W * 0.05) + 'px sans-serif';
    ctx.fillStyle = '#FFD54F';
    ctx.fillText('ベスト: ' + getBest() + ' m', W / 2, py + ph * 0.49);

    // Controls
    var ctrlSize = Math.floor(W * 0.038);
    ctx.font = ctrlSize + 'px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('【操作方法】', W / 2, py + ph * 0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('スペース / タップ → ジャンプ', W / 2, py + ph * 0.69);
    ctx.fillText('Z / X / 左スワイプ → 手裏剣', W / 2, py + ph * 0.78);

    // Start prompt
    var pulse = 0.6 + 0.4 * Math.sin(frame * 0.06);
    ctx.globalAlpha = pulse;
    ctx.font = 'bold ' + Math.floor(W * 0.055) + 'px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('タップしてスタート！', W / 2, py + ph * 0.91);
    ctx.globalAlpha = 1;

    frame++;
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

  function hideOverlay() {
    el('overlay-gameover').classList.add('hidden');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
