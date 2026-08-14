var Game = (function() {
  var GRAVITY    = 0.09;   // 低重力でふわっと
  var IMPULSE_X  = 3.5;
  var IMPULSE_Y  = -5.8;   // 大きめの上向き加速
  var FRICTION_X = 0.988;  // 水平方向をほぼ維持してグライド感
  var FRICTION_Y = 0.999;
  var MAX_SPEED  = 8.5;
  var BOUNCE     = 0.55;
  var CHAR_SIZE  = 40;
  var MAX_HP     = 5;
  var INVINCIBLE = 20;
  var CLOUD_COUNT = 5;

  var W, H;
  var player, cpu;
  var aiTimer;
  var clouds;
  var phase; // 'title' | 'playing' | 'result'
  var winner; // 'player' | 'cpu'

  function makeChar(x, y) {
    return { x: x, y: y, vx: 0, vy: 0, hp: MAX_HP, maxHp: MAX_HP, hitFlash: 0, invincible: 0 };
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

  function init(w, h) {
    W = w; H = h;
    player = makeChar(W * 0.25 - CHAR_SIZE / 2, H * 0.5);
    cpu    = makeChar(W * 0.75 - CHAR_SIZE / 2, H * 0.5);
    aiTimer = 60;
    makeClouds();
    phase  = 'playing';
    winner = null;
  }

  function clampSpeed(c) {
    var spd = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
    if (spd > MAX_SPEED) { c.vx = c.vx / spd * MAX_SPEED; c.vy = c.vy / spd * MAX_SPEED; }
  }

  function applyWall(c, onHit) {
    if (c.invincible > 0) { c.invincible--; return; }
    var hit = false;
    if (c.x < 0)              { c.x = 0;              c.vx =  Math.abs(c.vx) * BOUNCE; hit = true; }
    if (c.x + CHAR_SIZE > W)  { c.x = W - CHAR_SIZE;  c.vx = -Math.abs(c.vx) * BOUNCE; hit = true; }
    if (c.y < 0)              { c.y = 0;               c.vy =  Math.abs(c.vy) * BOUNCE; hit = true; }
    if (c.y + CHAR_SIZE > H)  { c.y = H - CHAR_SIZE;  c.vy = -Math.abs(c.vy) * BOUNCE; hit = true; }
    if (hit) { c.hp--; c.hitFlash = 8; c.invincible = INVINCIBLE; if (onHit) onHit(); }
  }

  function checkCharCollision(a, b) {
    var overlapX = CHAR_SIZE - Math.abs(a.x - b.x);
    var overlapY = CHAR_SIZE - Math.abs(a.y - b.y);
    if (overlapX > 0 && overlapY > 0) {
      if (overlapX < overlapY) {
        var sx = a.x < b.x ? -1 : 1;
        a.x += sx * overlapX / 2; b.x -= sx * overlapX / 2;
        var avx = a.vx, bvx = b.vx;
        a.vx = bvx * 0.8; b.vx = avx * 0.8;
      } else {
        var sy = a.y < b.y ? -1 : 1;
        a.y += sy * overlapY / 2; b.y -= sy * overlapY / 2;
        var avy = a.vy, bvy = b.vy;
        a.vy = bvy * 0.8; b.vy = avy * 0.8;
      }
      return true;
    }
    return false;
  }

  function runAI() {
    if (--aiTimer <= 0) {
      aiTimer = 22 + Math.floor(Math.random() * 18);

      var cx  = cpu.x    + CHAR_SIZE / 2;
      var cy  = cpu.y    + CHAR_SIZE / 2;
      var px  = player.x + CHAR_SIZE / 2;
      var py  = player.y + CHAR_SIZE / 2;
      var dist = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));

      // 1. 自分が壁際 → 中央へ逃げる（最優先）
      var cpuNearWall = cpu.x < W * 0.15 || cpu.x + CHAR_SIZE > W * 0.85 ||
                        cpu.y < H * 0.15 || cpu.y + CHAR_SIZE > H * 0.85;
      if (cpuNearWall) {
        cpu.vx += (W / 2 - cx) > 0 ? IMPULSE_X : -IMPULSE_X;
        cpu.vy += IMPULSE_Y;
        return;
      }

      // 2. プレイヤーに近すぎる → 横にかわして衝突回避
      if (dist < CHAR_SIZE * 2.5) {
        // プレイヤーと反対方向に飛ぶ
        cpu.vx += (cx - px) > 0 ? IMPULSE_X : -IMPULSE_X;
        cpu.vy += IMPULSE_Y;
        return;
      }

      // 3. プレイヤーが壁際にいる → 突撃して押し込む
      var playerPinnedLeft  = player.x < W * 0.22;
      var playerPinnedRight = player.x + CHAR_SIZE > W * 0.78;
      var playerPinnedTop   = player.y < H * 0.22;
      var playerPinnedBot   = player.y + CHAR_SIZE > H * 0.78;
      if (playerPinnedLeft || playerPinnedRight || playerPinnedTop || playerPinnedBot) {
        cpu.vx += (px - cx) > 0 ? IMPULSE_X : -IMPULSE_X;
        cpu.vy += IMPULSE_Y;
        return;
      }

      // 4. それ以外 → プレイヤーの背後（壁側）に回り込んでポジション取り
      // プレイヤーから最も近い壁方向の反対側に陣取る
      var toLeft   = px;
      var toRight  = W - px;
      var toTop    = py;
      var toBot    = H - py;
      var minH = Math.min(toLeft, toRight);
      var minV = Math.min(toTop, toBot);
      var targetX, targetY;
      if (minH < minV) {
        // 左右壁の方が近い → その逆側に回る
        targetX = toLeft < toRight ? px + W * 0.28 : px - W * 0.28;
        targetY = py;
      } else {
        // 上下壁の方が近い → その逆側に回る
        targetX = px;
        targetY = toTop < toBot ? py + H * 0.28 : py - H * 0.28;
      }
      cpu.vx += (targetX - cx) > 0 ? IMPULSE_X * 0.75 : -IMPULSE_X * 0.75;
      cpu.vy += IMPULSE_Y * 0.85;
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

    // player input
    if (playerImpulse !== 0) {
      player.vx += playerImpulse * IMPULSE_X;
      player.vy += IMPULSE_Y;
    }

    // AI
    runAI();

    // physics
    [player, cpu].forEach(function(c) {
      c.vy += GRAVITY;
      c.vx *= FRICTION_X;
      c.vy *= FRICTION_Y;
      clampSpeed(c);
      c.x += c.vx;
      c.y += c.vy;
      if (c.hitFlash > 0) c.hitFlash--;
    });

    // wall collision
    applyWall(player, function() { if (onWallHit) onWallHit('player'); });
    applyWall(cpu,    function() { if (onWallHit) onWallHit('cpu'); });

    // char vs char
    if (checkCharCollision(player, cpu)) { if (onWallHit) onWallHit('clash'); }

    // check death
    if (player.hp <= 0 && cpu.hp <= 0) { winner = 'draw'; phase = 'result'; }
    else if (player.hp <= 0) { winner = 'cpu';    phase = 'result'; }
    else if (cpu.hp <= 0)    { winner = 'player'; phase = 'result'; }

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

  function drawChar(ctx, c, color) {
    ctx.save();
    if (c.hitFlash > 0 && c.hitFlash % 2 === 1) ctx.fillStyle = '#fff';
    else ctx.fillStyle = color;
    var R = 8;
    ctx.beginPath();
    ctx.moveTo(c.x + R, c.y);
    ctx.lineTo(c.x + CHAR_SIZE - R, c.y);
    ctx.quadraticCurveTo(c.x + CHAR_SIZE, c.y, c.x + CHAR_SIZE, c.y + R);
    ctx.lineTo(c.x + CHAR_SIZE, c.y + CHAR_SIZE - R);
    ctx.quadraticCurveTo(c.x + CHAR_SIZE, c.y + CHAR_SIZE, c.x + CHAR_SIZE - R, c.y + CHAR_SIZE);
    ctx.lineTo(c.x + R, c.y + CHAR_SIZE);
    ctx.quadraticCurveTo(c.x, c.y + CHAR_SIZE, c.x, c.y + CHAR_SIZE - R);
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
    ctx.fillRect(x, y, w * (hp / maxHp), 10);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, 10);
  }

  function draw(ctx) {
    // background gradient
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(1, '#E0F0FF');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // clouds
    clouds.forEach(function(c) { drawCloud(ctx, c); });

    // chars
    drawChar(ctx, player, '#4f8ef7');
    drawChar(ctx, cpu,    '#f75a5a');

    // HP bars
    var barW = Math.min(W * 0.35, 130);
    var barY = 16;
    drawHPBar(ctx, 14, barY, barW, player.hp, player.maxHp, '#4f8ef7');
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('YOU  HP: ' + player.hp, 14, barY + 24);

    drawHPBar(ctx, W - 14 - barW, barY, barW, cpu.hp, cpu.maxHp, '#f75a5a');
    ctx.textAlign = 'right';
    ctx.fillText('CPU  HP: ' + cpu.hp, W - 14, barY + 24);
  }

  return {
    init: init,
    update: update,
    draw: draw,
    getPhase: function() { return phase; },
    getWinner: function() { return winner; },
    CHAR_SIZE: CHAR_SIZE,
  };
})();
