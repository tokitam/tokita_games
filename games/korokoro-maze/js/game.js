// ころころ迷路 — ボール物理・壁衝突・穴判定
const MazeGame = (() => {
  const ACCEL     = 0.006;
  const FRICTION  = 0.97;
  const BALL_R    = 0.38;
  const HOLE_R    = 0.45;
  const WALL_BOUNCE = 0.35;
  const MAX_TILT  = 15 * Math.PI / 180;

  let stageData = null;
  let rows = 0, cols = 0;
  let startPos = { x: 0, z: 0 };
  let goalPos  = { x: 0, z: 0 };
  let holes = [];   // { x, z }
  let walls = [];   // { minX, maxX, minZ, maxZ }

  let ball = { x: 0, z: 0, vx: 0, vz: 0 };
  let tiltX = 0, tiltZ = 0; // 傾き（ラジアン）

  let alive = true;
  let falling = false;
  let callbacks = {};

  function loadStage(stage) {
    stageData = stage;
    const grid = stage.grid;
    rows = grid.length;
    cols = grid[0].length;
    walls = [];
    holes = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        const wx = c - cols / 2 + 0.5;
        const wz = r - rows / 2 + 0.5;
        if (cell === 1) {
          walls.push({ minX: wx - 0.5, maxX: wx + 0.5, minZ: wz - 0.5, maxZ: wz + 0.5 });
        } else if (cell === 'S') {
          startPos = { x: wx, z: wz };
        } else if (cell === 'G') {
          goalPos  = { x: wx, z: wz };
        } else if (cell === 'H') {
          holes.push({ x: wx, z: wz });
        }
      }
    }
    resetBall();
  }

  function resetBall() {
    ball.x = startPos.x;
    ball.z = startPos.z;
    ball.vx = 0;
    ball.vz = 0;
    alive = true;
    falling = false;
    tiltX = 0;
    tiltZ = 0;
  }

  function setTilt(tx, tz) {
    tiltX = Math.max(-MAX_TILT, Math.min(MAX_TILT, tx));
    tiltZ = Math.max(-MAX_TILT, Math.min(MAX_TILT, tz));
  }

  function dampTilt() {
    tiltX *= 0.9;
    tiltZ *= 0.9;
  }

  function update(dt) {
    if (!alive || falling) return;

    // 傾きから加速度
    ball.vx += Math.sin(tiltZ) * ACCEL * 60 * dt;
    ball.vz += Math.sin(tiltX) * ACCEL * 60 * dt;
    ball.vx *= Math.pow(FRICTION, 60 * dt);
    ball.vz *= Math.pow(FRICTION, 60 * dt);

    const nextX = ball.x + ball.vx;
    const nextZ = ball.z + ball.vz;

    // 壁衝突
    let resolvedX = nextX, resolvedZ = nextZ;
    let wallHit = false;
    for (const w of walls) {
      const ex = w.minX - BALL_R, EX = w.maxX + BALL_R;
      const ez = w.minZ - BALL_R, EZ = w.maxZ + BALL_R;
      if (resolvedX > ex && resolvedX < EX && resolvedZ > ez && resolvedZ < EZ) {
        // どちらの軸で押し出すか判定
        const overlapFromPrevX = Math.abs(ball.x - resolvedX);
        const overlapFromPrevZ = Math.abs(ball.z - resolvedZ);
        if (overlapFromPrevX < overlapFromPrevZ) {
          resolvedX = ball.x;
          ball.vx *= -WALL_BOUNCE;
        } else {
          resolvedZ = ball.z;
          ball.vz *= -WALL_BOUNCE;
        }
        wallHit = true;
      }
    }

    if (wallHit && Math.abs(ball.vx) + Math.abs(ball.vz) > 0.04) {
      Sound.play('wall');
    }

    ball.x = resolvedX;
    ball.z = resolvedZ;

    // 穴判定
    for (const h of holes) {
      const d = Math.sqrt((ball.x - h.x) ** 2 + (ball.z - h.z) ** 2);
      if (d < HOLE_R) {
        falling = true;
        alive = false;
        Sound.play('fall');
        if (callbacks.onFall) callbacks.onFall();
        return;
      }
    }

    // ゴール判定
    const gd = Math.sqrt((ball.x - goalPos.x) ** 2 + (ball.z - goalPos.z) ** 2);
    if (gd < HOLE_R) {
      alive = false;
      Sound.play('goal');
      if (callbacks.onGoal) callbacks.onGoal();
    }

    if (callbacks.onUpdate) callbacks.onUpdate(ball.x, ball.z, ball.vx, ball.vz);
  }

  function getBall() { return { x: ball.x, z: ball.z }; }
  function isAlive() { return alive; }
  function isFalling() { return falling; }

  function init(stage, cbs) {
    callbacks = cbs;
    loadStage(stage);
  }

  return { init, update, setTilt, dampTilt, resetBall, getBall, isAlive, isFalling };
})();
