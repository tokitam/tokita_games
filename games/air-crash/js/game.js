var Game = (function() {
  var GRAVITY    = 0.07;
  var IMPULSE_X  = 2.4;
  var IMPULSE_Y  = -3.8;
  var FRICTION_X = 0.990;
  var FRICTION_Y = 0.999;
  var MAX_SPEED  = 5.5;
  var BOUNCE     = 0.50;
  var CHAR_SIZE  = 40;
  var MAX_HP     = 5;
  var INVINCIBLE = 20;
  var CLOUD_COUNT = 5;

  var STAGE_CONFIG = [
    { cpuSize: 40, cpuMaxHp: 5,  warp: false, cpuWallDamageRate: 1.0, cpuCollisionResist: 0.8 },
    { cpuSize: 80, cpuMaxHp: 10, warp: false, cpuWallDamageRate: 1.0, cpuCollisionResist: 0.8 },
    { cpuSize: 40, cpuMaxHp: 5,  warp: true,  cpuWallDamageRate: 1.0, cpuCollisionResist: 0.8 },
    { cpuSize: 40, cpuMaxHp: 10, warp: false, cpuWallDamageRate: 0.5, cpuCollisionResist: 0.1 },
  ];

  var W, H;
  var player, cpu;
  var aiTimer;
  var clouds;
  var phase; // 'title' | 'playing' | 'stage_clear' | 'all_clear' | 'result'
  var winner; // 'player' | 'cpu' | 'draw'
  var stage, stageFrames, totalFrames;
  var cpuSz, warpEnabled, cpuWallDamageRate, cpuCollisionResist;
  var warpTimer;

  function makeChar(x, y, maxHp) {
    return { x: x, y: y, vx: 0, vy: 0, hp: maxHp, maxHp: maxHp, hitFlash: 0, invincible: 0 };
  }

  function makeClouds() {
    clouds = [];
    for (var i = 0; i < CLOUD_COUNT; i++) {
      clouds.push({
        x: Math.random() * W,
        y: H * 0.1 + Math.random() * H * 0.5,
        r: 30 + Math.random() * 40,
        spd: 0.3 + Math.random() * 0.4
      });
    }
  }

  function initStage(stageNum) {
    var cfg = STAGE_CONFIG[stageNum - 1];
    cpuSz               = cfg.cpuSize;
    warpEnabled         = cfg.warp;
    cpuWallDamageRate   = cfg.cpuWallDamageRate;
    cpuCollisionResist  = cfg.cpuCollisionResist;

    player = makeChar(W * 0.25 - CHAR_SIZE / 2, H * 0.5, MAX_HP);
    cpu    = makeChar(W * 0.75 - cpuSz / 2,     H * 0.5, cfg.cpuMaxHp);
    player.vx =  1.4; player.vy = -2.2;
    cpu.vx    = -1.4; cpu.vy    = -2.2;
    aiTimer   = 60;
    warpTimer = 120 + Math.floor(Math.random() * 60);
    stageFrames = 0;
    phase  = 'playing';
    winner = null;
  }

  function init(w, h) {
    W = w; H = h;
    stage       = 1;
    totalFrames = 0;
    makeClouds();
    initStage(1);
  }

  function clampSpeed(c) {
    var spd = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
    if (spd > MAX_SPEED) { c.vx = c.vx / spd * MAX_SPEED; c.vy = c.vy / spd * MAX_SPEED; }
  }

  function applyWall(c, cSize, damageRate, onHit) {
    if (c.invincible > 0) { c.invincible--; return; }
    var hit = false;
    if (c.x < 0)             { c.x = 0;           c.vx =  Math.abs(c.vx) * BOUNCE; hit = true; }
    if (c.x + cSize > W)     { c.x = W - cSize;   c.vx = -Math.abs(c.vx) * BOUNCE; hit = true; }
    if (c.y < 0)             { c.y = 0;            c.vy =  Math.abs(c.vy) * BOUNCE; hit = true; }
    if (c.y + cSize > H)     { c.y = H - cSize;   c.vy = -Math.abs(c.vy) * BOUNCE; hit = true; }
    if (hit) {
      if (Math.random() < damageRate) { c.hp--; }
      c.hitFlash = 8; c.invincible = INVINCIBLE;
      if (onHit) onHit();
    }
  }

  function checkCharCollision(a, aSize, b, bSize) {
    var cx_a = a.x + aSize / 2, cy_a = a.y + aSize / 2;
    var cx_b = b.x + bSize / 2, cy_b = b.y + bSize / 2;
    var halfW = (aSize + bSize) / 2;
    var overlapX = halfW - Math.abs(cx_a - cx_b);
    var overlapY = halfW - Math.abs(cy_a - cy_b);
    if (overlapX > 0 && overlapY > 0) {
      if (overlapX < overlapY) {
        var sx = cx_a < cx_b ? -1 : 1;
        a.x += sx * overlapX * aSize / (aSize + bSize);
        b.x -= sx * overlapX * bSize / (aSize + bSize);
        var avx = a.vx, bvx = b.vx;
        a.vx = bvx * 0.8;
        b.vx = avx * cpuCollisionResist;
      } else {
        var sy = cy_a < cy_b ? -1 : 1;
        a.y += sy * overlapY * aSize / (aSize + bSize);
        b.y -= sy * overlapY * bSize / (aSize + bSize);
        var avy = a.vy, bvy = b.vy;
        a.vy = bvy * 0.8;
        b.vy = avy * cpuCollisionResist;
      }
      return true;
    }
    return false;
  }

  function vyTo(fromY, toY) {
    var dy = toY - fromY;
    if (dy < -H * 0.12) return IMPULSE_Y;
    if (dy >  H * 0.12) return -IMPULSE_Y * 0.4;
    return 0;
  }

  function runAI() {
    if (--aiTimer <= 0) {
      aiTimer = 22 + Math.floor(Math.random() * 18);

      var cx   = cpu.x    + cpuSz / 2;
      var cy   = cpu.y    + cpuSz / 2;
      var px   = player.x + CHAR_SIZE / 2;
      var py   = player.y + CHAR_SIZE / 2;
      var dist = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));

      var cpuNearWall = cpu.x < W * 0.15 || cpu.x + cpuSz > W * 0.85 ||
                        cpu.y < H * 0.15 || cpu.y + cpuSz > H * 0.85;
      if (cpuNearWall) {
        cpu.vx += (W / 2 - cx) > 0 ? IMPULSE_X : -IMPULSE_X;
        cpu.vy += vyTo(cy, H / 2);
        return;
      }

      if (dist < Math.max(CHAR_SIZE, cpuSz) * 2.5) {
        cpu.vx += (cx - px) > 0 ? IMPULSE_X : -IMPULSE_X;
        return;
      }

      var playerPinnedLeft  = player.x < W * 0.22;
      var playerPinnedRight = player.x + CHAR_SIZE > W * 0.78;
      var playerPinnedTop   = player.y < H * 0.22;
      var playerPinnedBot   = player.y + CHAR_SIZE > H * 0.78;
      if (playerPinnedLeft || playerPinnedRight || playerPinnedTop || playerPinnedBot) {
        cpu.vx += (px - cx) > 0 ? IMPULSE_X : -IMPULSE_X;
        cpu.vy += vyTo(cy, py);
        return;
      }

      var toLeft  = px;
      var toRight = W - px;
      var toTop   = py;
      var toBot   = H - py;
      var targetX, targetY;
      if (Math.min(toLeft, toRight) < Math.min(toTop, toBot)) {
        targetX = toLeft < toRight ? px + W * 0.28 : px - W * 0.28;
        targetY = H / 2;
      } else {
        targetX = px;
        targetY = toTop < toBot ? py + H * 0.28 : py - H * 0.28;
      }
      cpu.vx += (targetX - cx) > 0 ? IMPULSE_X * 0.75 : -IMPULSE_X * 0.75;
      cpu.vy += vyTo(cy, targetY);
    }
  }

  function updateClouds() {
    clouds.forEach(function(c) {
      c.x += c.spd;
      if (c.x - c.r > W) c.x = -c.r;
    });
  }

  function update(playerImpulse, onWallHit) {
    if (phase !== 'playing') return;

    stageFrames++;

    if (playerImpulse !== 0) {
      player.vx += playerImpulse * IMPULSE_X;
      player.vy += IMPULSE_Y;
    }

    runAI();

    // ワープ（3面）
    if (warpEnabled) {
      if (--warpTimer <= 0) {
        if (cpu.invincible <= 0) {
          cpu.hitFlash = 10;
          cpu.x = W * 0.1 + Math.random() * (W * 0.8 - cpuSz);
          cpu.y = H * 0.1 + Math.random() * (H * 0.8 - cpuSz);
          cpu.vx = (Math.random() - 0.5) * 2;
          cpu.vy = (Math.random() - 0.5) * 2;
          cpu.invincible = INVINCIBLE;
        }
        warpTimer = 120 + Math.floor(Math.random() * 60);
      }
    }

    [player, cpu].forEach(function(c) {
      c.vy += GRAVITY;
      c.vx *= FRICTION_X;
      c.vy *= FRICTION_Y;
      clampSpeed(c);
      c.x += c.vx;
      c.y += c.vy;
      if (c.hitFlash > 0) c.hitFlash--;
    });

    applyWall(player, CHAR_SIZE, 1.0, function() { if (onWallHit) onWallHit('player'); });
    applyWall(cpu,    cpuSz,     cpuWallDamageRate, function() { if (onWallHit) onWallHit('cpu'); });

    if (checkCharCollision(player, CHAR_SIZE, cpu, cpuSz)) {
      if (onWallHit) onWallHit('clash');
    }

    if (player.hp <= 0 && cpu.hp <= 0) {
      winner = 'draw'; phase = 'result';
    } else if (player.hp <= 0) {
      winner = 'cpu'; phase = 'result';
    } else if (cpu.hp <= 0) {
      totalFrames += stageFrames;
      if (stage < 4) {
        phase = 'stage_clear';
      } else {
        winner = 'player'; phase = 'all_clear';
      }
    }

    updateClouds();
  }

  function drawCloud(ctx, c) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.arc(c.x + c.r * 0.7, c.y + c.r * 0.2, c.r * 0.7, 0, Math.PI * 2);
    ctx.arc(c.x - c.r * 0.6, c.y + c.r * 0.2, c.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawChar(ctx, c, size, color) {
    ctx.save();
    if (c.hitFlash > 0 && c.hitFlash % 2 === 1) ctx.fillStyle = '#fff';
    else ctx.fillStyle = color;
    var R = Math.min(8, size * 0.2);
    ctx.beginPath();
    ctx.moveTo(c.x + R, c.y);
    ctx.lineTo(c.x + size - R, c.y);
    ctx.quadraticCurveTo(c.x + size, c.y, c.x + size, c.y + R);
    ctx.lineTo(c.x + size, c.y + size - R);
    ctx.quadraticCurveTo(c.x + size, c.y + size, c.x + size - R, c.y + size);
    ctx.lineTo(c.x + R, c.y + size);
    ctx.quadraticCurveTo(c.x, c.y + size, c.x, c.y + size - R);
    ctx.lineTo(c.x, c.y + R);
    ctx.quadraticCurveTo(c.x, c.y, c.x + R, c.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawHPBar(ctx, x, y, w, hp, maxHp, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x, y, w, 10);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, hp) / maxHp, 10);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, 10);
  }

  function draw(ctx) {
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(1, '#E0F0FF');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    clouds.forEach(function(c) { drawCloud(ctx, c); });

    drawChar(ctx, player, CHAR_SIZE, '#4f8ef7');
    drawChar(ctx, cpu,    cpuSz,     '#f75a5a');

    var barW = Math.min(W * 0.35, 130);
    var barY = 16;
    drawHPBar(ctx, 14, barY, barW, player.hp, player.maxHp, '#4f8ef7');
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('YOU  HP: ' + Math.max(0, player.hp), 14, barY + 24);

    drawHPBar(ctx, W - 14 - barW, barY, barW, cpu.hp, cpu.maxHp, '#f75a5a');
    ctx.textAlign = 'right';
    ctx.fillText('CPU  HP: ' + Math.max(0, cpu.hp), W - 14, barY + 24);

    // ステージ表示
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STAGE ' + stage + ' / 4', W / 2, 30);
  }

  function nextStage() {
    stage++;
    initStage(stage);
  }

  return {
    init: init,
    update: update,
    draw: draw,
    getPhase:        function() { return phase; },
    getWinner:       function() { return winner; },
    getStage:        function() { return stage; },
    getTotalSeconds: function() { return Math.round(totalFrames / 60); },
    nextStage:       nextStage,
    CHAR_SIZE:       CHAR_SIZE,
  };
})();
