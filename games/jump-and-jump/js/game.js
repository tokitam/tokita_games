// ジャンプとジャンプ — キャラクター物理・足場生成・スコア

const JumpGame = (() => {
  // 難易度定義
  const DIFFICULTIES = {
    'ちょうかんたん': { gravity: 0.010, baseSpacing: 2.0, maxSpacing: 2.6, platHalf: 1.05, moveStart: 80,  cloudStart: 150, moveSpeed: 0.008, color: '#64B5F6', label: 'ちょうかんたん' },
    'かんたん':       { gravity: 0.011, baseSpacing: 2.1, maxSpacing: 2.9, platHalf: 0.95, moveStart: 60,  cloudStart: 120, moveSpeed: 0.010, color: '#81C784', label: 'かんたん' },
    'ふつう':         { gravity: 0.012, baseSpacing: 2.2, maxSpacing: 3.2, platHalf: 0.85, moveStart: 50,  cloudStart: 100, moveSpeed: 0.012, color: '#FFD54F', label: 'ふつう' },
    'むずい':         { gravity: 0.014, baseSpacing: 2.4, maxSpacing: 3.5, platHalf: 0.70, moveStart: 30,  cloudStart: 60,  moveSpeed: 0.016, color: '#EF5350', label: 'むずい' },
  };

  // 物理定数（難易度で上書き）
  const JUMP_VY    = 0.32;
  const SPRING_VY  = JUMP_VY * 2.2;
  const MOVE_VX    = 0.09;
  const WRAP_X     = 4.0;
  const LAND_THR   = 0.15;
  const AHEAD_COUNT = 15;

  // 難易度パラメータ（実行時に設定）
  let GRAVITY     = 0.012;
  let PLAT_HALF   = 0.85;
  let BASE_SPACING = 2.2;
  let MAX_SPACING  = 3.2;
  let MOVE_START   = 50;
  let CLOUD_START  = 100;
  let MOVE_SPEED   = 0.012;

  // キャラクター状態
  const char = { x: 0, y: 0, vy: JUMP_VY };

  // 足場プール（dispose しないでプール再利用）
  let platforms = [];     // { x, y, z, type, mesh, used }
  let score = 0;
  let highestY = 0;
  let alive = true;
  let inputDir = 0;       // -1, 0, 1
  let callbacks = {};
  let nextPlatY = 0;

  // 足場の種類抽選テーブル
  function pickType(height) {
    const r = Math.random();
    if (r < 0.08) return 'spring';
    if (height >= CLOUD_START && r < 0.22) return 'cloud';
    if (height >= MOVE_START  && r < 0.4)  return 'moving';
    return 'normal';
  }

  function spacing(height) {
    const t = Math.min(1, height / 300);
    return BASE_SPACING + (MAX_SPACING - BASE_SPACING) * t;
  }

  function init(cbs, diff) {
    callbacks = cbs;
    if (diff) {
      GRAVITY      = diff.gravity;
      PLAT_HALF    = diff.platHalf;
      BASE_SPACING = diff.baseSpacing;
      MAX_SPACING  = diff.maxSpacing;
      MOVE_START   = diff.moveStart;
      CLOUD_START  = diff.cloudStart;
      MOVE_SPEED   = diff.moveSpeed;
    }
    score = 0;
    highestY = 0;
    alive = true;
    inputDir = 0;
    nextPlatY = 0;
    char.x = 0; char.y = 0; char.vy = JUMP_VY;
    platforms = [];
    // 初期足場
    for (let i = 0; i < AHEAD_COUNT; i++) addPlatform();
    if (callbacks.onScoreUpdate) callbacks.onScoreUpdate(0);
  }

  function addPlatform() {
    const y = nextPlatY;
    const type = nextPlatY === 0 ? 'normal' : pickType(y);
    const zOff = (Math.random() - 0.5) * 1.2;
    const xRange = Math.min(3.5, 2 + y * 0.01);
    const x = (Math.random() - 0.5) * xRange * 2;
    nextPlatY += spacing(y);

    const p = { x, y, z: zOff, type, mesh: null, used: false, moveDir: 1, moveSpeed: MOVE_SPEED };
    platforms.push(p);
    if (callbacks.onPlatformCreate) callbacks.onPlatformCreate(p);
    return p;
  }

  function update(dt, camY) {
    if (!alive) return;

    // 左右移動
    char.x += inputDir * MOVE_VX;
    if (char.x > WRAP_X)  char.x -= WRAP_X * 2;
    if (char.x < -WRAP_X) char.x += WRAP_X * 2;

    // 重力
    char.vy -= GRAVITY;
    char.y  += char.vy;

    // 足場移動
    platforms.forEach(p => {
      if (p.type === 'moving') {
        p.x += p.moveDir * p.moveSpeed;
        if (p.x > 3.5 || p.x < -3.5) p.moveDir *= -1;
        if (p.mesh) p.mesh.position.x = p.x;
      }
    });

    // 着地判定（下降中のみ）
    if (char.vy < 0) {
      for (const p of platforms) {
        if (p.used) continue;
        const dy = char.y - p.y;
        if (dy >= 0 && dy < LAND_THR) {
          // X距離判定（Z方向は奥行き演出のみで判定不使用）
          const dx = Math.abs(char.x - p.x);
          if (dx < PLAT_HALF) {
            land(p);
            break;
          }
        }
      }
    }

    // スコア（高さ）
    if (char.y > highestY) {
      highestY = char.y;
      score = Math.floor(highestY);
      if (callbacks.onScoreUpdate) callbacks.onScoreUpdate(score);
    }

    // 背景色更新
    if (callbacks.onHeightUpdate) callbacks.onHeightUpdate(highestY);

    // カメラ下端で死亡判定
    if (char.y < camY - 2) {
      alive = false;
      Sound.play('gameover');
      if (callbacks.onDie) callbacks.onDie(score);
      return;
    }

    // 足場の先行生成
    const topY = platforms.length > 0 ? platforms[platforms.length - 1].y : 0;
    while (topY < char.y + 15) {
      addPlatform();
    }

    // 遠ざかった足場の回収
    for (let i = platforms.length - 1; i >= 0; i--) {
      if (platforms[i].y < camY - 6) {
        const p = platforms.splice(i, 1)[0];
        if (callbacks.onPlatformRemove) callbacks.onPlatformRemove(p);
      }
    }

    if (callbacks.onCharUpdate) callbacks.onCharUpdate(char.x, char.y);
  }

  function land(p) {
    if (p.type === 'spring') {
      char.vy = SPRING_VY;
      Sound.play('spring');
      if (callbacks.onSpring) callbacks.onSpring(p);
    } else {
      char.vy = JUMP_VY;
      Sound.play('jump');
    }

    if (p.type === 'cloud') {
      p.used = true;
      Sound.play('cloud_pop');
      if (callbacks.onCloudPop) callbacks.onCloudPop(p);
    }
  }

  function setInput(dir) { inputDir = dir; }
  function getChar() { return char; }
  function isAlive() { return alive; }
  function getScore() { return score; }

  return { init, update, setInput, getChar, isAlive, getScore, DIFFICULTIES };
})();
