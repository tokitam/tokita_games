var Game = (function() {
  var HS_KEY = 'colorful-crash.highscore';

  // Layout constants (set on init)
  var W, H;
  var BLOCK_ROWS = 5, BLOCK_COLS = 8;
  var BLOCK_MARGIN = 4;
  var BLOCK_TOP_OFFSET; // px from top of canvas
  var BLOCK_W, BLOCK_H;

  var PADDLE_H = 14;
  var BALL_R   = 7;
  var MAX_BALL_SPEED = 11;
  var BASE_BALL_SPEED = 5.5;

  var state, balls, blocks, items, particles, effects;

  // ---- Init ----
  function init(w, h, level) {
    W = w; H = h;
    BLOCK_TOP_OFFSET = Math.floor(H * 0.06);
    BLOCK_W = Math.floor((W - BLOCK_MARGIN * (BLOCK_COLS + 1)) / BLOCK_COLS);
    BLOCK_H = Math.floor(BLOCK_W * 0.4);

    var lvData = Levels.build(level);
    var speedMult = lvData.ballSpeedMult;

    state = {
      score: 0,
      level: level,
      lives: 3,
      paused: false,
      over: false,
      cleared: false,
      paddle: { x: W/2, w: Math.floor(W * 0.22), h: PADDLE_H },
      effects: { wide: 0, slow: 0 } // ms remaining
    };

    var angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    var spd = BASE_BALL_SPEED * speedMult;
    balls = [{ x: W/2, y: H - 80, vx: spd * Math.cos(angle), vy: spd * Math.sin(angle) }];

    // Build blocks
    blocks = [];
    lvData.blocks.forEach(function(b) {
      blocks.push({
        x: BLOCK_MARGIN + b.col * (BLOCK_W + BLOCK_MARGIN),
        y: BLOCK_TOP_OFFSET + b.row * (BLOCK_H + BLOCK_MARGIN),
        w: BLOCK_W, h: BLOCK_H,
        hp: b.hp, maxHp: b.maxHp,
        color: b.color
      });
    });

    items = [];
    particles = [];
    effects = {};

    return state;
  }

  // ---- Update ----
  function update(dt) {
    if (state.paused || state.over || state.cleared) return;

    // Update item timers
    ['wide', 'slow'].forEach(function(k) {
      if (state.effects[k] > 0) {
        state.effects[k] -= dt;
        if (state.effects[k] <= 0) {
          state.effects[k] = 0;
          if (k === 'wide') state.paddle.w = Math.floor(W * 0.22);
        }
      }
    });

    // Update particles
    for (var pi = particles.length - 1; pi >= 0; pi--) {
      var p = particles[pi];
      p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life--;
      if (p.life <= 0) particles.splice(pi, 1);
    }

    var slowMult = state.effects.slow > 0 ? 0.55 : 1;

    // Update falling items
    for (var ii = items.length - 1; ii >= 0; ii--) {
      var item = items[ii];
      item.y += 2.5;
      // Check paddle catch
      var pw = state.paddle.w;
      var px = state.paddle.x - pw/2;
      var py = H - PADDLE_H - 16;
      if (item.y + 10 > py && item.y < py + PADDLE_H &&
          item.x > px && item.x < px + pw) {
        applyItem(item.type);
        Sound.play('item');
        items.splice(ii, 1);
        continue;
      }
      if (item.y > H + 20) items.splice(ii, 1);
    }

    // Update balls
    var allLost = true;
    for (var bi = balls.length - 1; bi >= 0; bi--) {
      var ball = balls[bi];
      var spd = slowMult;
      ball.x += ball.vx * spd;
      ball.y += ball.vy * spd;

      // Wall bounce
      if (ball.x - BALL_R < 0)  { ball.x = BALL_R;      ball.vx = Math.abs(ball.vx); }
      if (ball.x + BALL_R > W)  { ball.x = W - BALL_R;  ball.vx = -Math.abs(ball.vx); }
      if (ball.y - BALL_R < 0)  { ball.y = BALL_R;      ball.vy = Math.abs(ball.vy); }

      // Ball lost
      if (ball.y > H + 20) {
        balls.splice(bi, 1);
        continue;
      }
      allLost = false;

      // Paddle collision
      var padW = state.paddle.w;
      var padX = state.paddle.x - padW/2;
      var padY = H - PADDLE_H - 16;
      if (ball.vy > 0 &&
          ball.y + BALL_R > padY && ball.y - BALL_R < padY + PADDLE_H &&
          ball.x > padX && ball.x < padX + padW) {
        // Angle based on hit position
        var rel = (ball.x - state.paddle.x) / (padW / 2); // -1 to 1
        var angle = rel * (Math.PI / 3); // max 60 degrees
        var speed = Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy);
        speed = Math.min(MAX_BALL_SPEED, speed);
        ball.vx = speed * Math.sin(angle);
        ball.vy = -Math.abs(speed * Math.cos(angle));
        ball.y = padY - BALL_R;
        Sound.play('paddle');
      }

      // Block collisions (AABB)
      for (var bki = blocks.length - 1; bki >= 0; bki--) {
        var blk = blocks[bki];
        if (ball.x + BALL_R > blk.x && ball.x - BALL_R < blk.x + blk.w &&
            ball.y + BALL_R > blk.y && ball.y - BALL_R < blk.y + blk.h) {
          // Determine bounce axis
          var overlapL = (ball.x + BALL_R) - blk.x;
          var overlapR = (blk.x + blk.w) - (ball.x - BALL_R);
          var overlapT = (ball.y + BALL_R) - blk.y;
          var overlapB = (blk.y + blk.h) - (ball.y - BALL_R);
          var minH = Math.min(overlapL, overlapR);
          var minV = Math.min(overlapT, overlapB);
          if (minH < minV) ball.vx = -ball.vx;
          else              ball.vy = -ball.vy;

          blk.hp--;
          Sound.play('block');
          state.score += 10 * state.level;

          if (blk.hp <= 0) {
            // Drop item?
            var rand = Math.random();
            if (rand < 0.15)      dropItem('multi', blk.x + blk.w/2, blk.y);
            else if (rand < 0.35) dropItem('wide',  blk.x + blk.w/2, blk.y);
            else if (rand < 0.50) dropItem('slow',  blk.x + blk.w/2, blk.y);
            else if (rand < 0.55) dropItem('life',  blk.x + blk.w/2, blk.y);
            // Particles
            spawnParticles(blk.x + blk.w/2, blk.y + blk.h/2, blk.color);
            blocks.splice(bki, 1);
          }
          break; // one block per frame per ball
        }
      }
    }

    // All balls lost → life -1
    if (balls.length === 0) {
      state.lives--;
      Sound.play('life');
      if (state.lives <= 0) {
        state.over = true;
        Sound.play('gameover');
      } else {
        // Respawn ball
        var angle2 = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        var spd2 = BASE_BALL_SPEED * Levels.build(state.level).ballSpeedMult;
        balls.push({ x: W/2, y: H - 80, vx: spd2 * Math.cos(angle2), vy: spd2 * Math.sin(angle2) });
      }
    }

    // All blocks cleared
    if (blocks.length === 0) {
      state.cleared = true;
      Sound.play('clear');
      var best = getBest();
      if (state.score > best) localStorage.setItem(HS_KEY, state.score);
    }
  }

  function dropItem(type, x, y) {
    items.push({ x: x, y: y, type: type, blink: 0 });
  }

  function applyItem(type) {
    if (type === 'multi') {
      var toAdd = [];
      balls.forEach(function(b) {
        toAdd.push({ x: b.x, y: b.y, vx: b.vx * 0.7 + 1.5, vy: b.vy });
        toAdd.push({ x: b.x, y: b.y, vx: b.vx * 0.7 - 1.5, vy: b.vy });
      });
      toAdd.forEach(function(b) { balls.push(b); });
    } else if (type === 'wide') {
      state.paddle.w = Math.floor(W * 0.33);
      state.effects.wide = 15000;
    } else if (type === 'slow') {
      state.effects.slow = 10000;
    } else if (type === 'life') {
      state.lives = Math.min(5, state.lives + 1);
    }
  }

  function spawnParticles(x, y, color) {
    for (var i = 0; i < 7; i++) {
      var angle = (Math.PI * 2 / 7) * i;
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * (1.5 + Math.random() * 2),
        vy: Math.sin(angle) * (1.5 + Math.random() * 2),
        life: 18 + Math.floor(Math.random() * 8),
        color: color,
        r: 3 + Math.random() * 3
      });
    }
  }

  function movePaddle(clientX, canvasRect) {
    if (state.paused || state.over || state.cleared) return;
    var x = clientX - canvasRect.left;
    var half = state.paddle.w / 2;
    state.paddle.x = Math.max(half, Math.min(W - half, x));
  }

  function togglePause() {
    if (state.over || state.cleared) return;
    state.paused = !state.paused;
  }

  function getBest() { return parseInt(localStorage.getItem(HS_KEY) || '0', 10); }

  return {
    init: init,
    update: update,
    movePaddle: movePaddle,
    togglePause: togglePause,
    getBalls:     function() { return balls; },
    getBlocks:    function() { return blocks; },
    getItems:     function() { return items; },
    getParticles: function() { return particles; },
    getState:     function() { return state; },
    getBest:      getBest,
    BALL_R:       BALL_R,
    PADDLE_H:     PADDLE_H,
    BLOCK_TOP_OFFSET: function() { return BLOCK_TOP_OFFSET; }
  };
})();
