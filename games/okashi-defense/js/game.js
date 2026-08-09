const Game = (() => {
  const PREP_FRAMES   = 600; // 10s at 60fps
  const MAX_ENEMIES   = 30;
  const MAX_BULLETS   = 40;
  const BULLET_SPEED  = 0.18;
  const INIT_SUGAR    = 200;
  const INIT_LIFE     = 10;
  const TOTAL_WAVES   = 10;

  let state = 'idle'; // idle | prep | running | paused
  let wave  = 0;
  let life  = INIT_LIFE;
  let sugar = INIT_SUGAR;
  let score = 0;
  let kills = 0;
  let prepTimer = 0;

  const enemies  = [];
  const bullets  = [];
  const towers   = [];

  // Spawn queue: [{type, delay, timer}]
  const spawnQueue = [];

  // Waypoints in world space (set by main.js)
  let waypoints = [];

  // Callbacks set by main.js
  let cb = {
    onSpawnEnemy:  null,
    onSpawnBullet: null,
    onRemoveMesh:  null,
    onHitEnemy:    null,
    onExplode:     null,
    onLifeChange:  null,
    onSugarChange: null,
    onScoreChange: null,
    onKillsChange: null,
    onWaveDone:    null,
    onClear:       null,
    onGameOver:    null,
  };

  function setWaypoints(wps) { waypoints = wps; }

  function gridToId(col, row) { return col + '_' + row; }

  // ---------- Sugar / Life ----------
  function getSugar() { return sugar; }
  function getLife()  { return life;  }
  function getScore() { return score; }
  function getKills() { return kills; }
  function getWave()  { return wave;  }
  function getState() { return state; }
  function getTowers(){ return towers; }
  function getEnemies(){ return enemies; }

  function addSugar(n) {
    sugar += n;
    if (cb.onSugarChange) cb.onSugarChange(sugar);
  }
  function spendSugar(n) {
    sugar -= n;
    if (cb.onSugarChange) cb.onSugarChange(sugar);
  }

  // ---------- Tower placement ----------
  function canAfford(typeId, level) {
    const def = TOWERS[typeId];
    if (level === 0) return sugar >= def.cost;
    return sugar >= Math.floor(def.cost * def.upgradeCostMul);
  }

  function placeTower(typeId, col, row) {
    const def  = TOWERS[typeId];
    const cost = def.cost;
    if (sugar < cost) return null;
    spendSugar(cost);
    Sound.play('place');
    const t = { id: typeId, col, row, level: 0, cdTimer: 0 };
    towers.push(t);
    return t;
  }

  function upgradeTower(tower) {
    if (tower.level >= 2) return false;
    const def  = TOWERS[tower.id];
    const cost = Math.floor(def.cost * def.upgradeCostMul);
    if (sugar < cost) return false;
    spendSugar(cost);
    tower.level++;
    Sound.play('place');
    return true;
  }

  function sellTower(tower) {
    const def  = TOWERS[tower.id];
    const refund = Math.floor(def.cost * 0.5);
    addSugar(refund);
    const idx = towers.indexOf(tower);
    if (idx !== -1) towers.splice(idx, 1);
    return refund;
  }

  // ---------- Wave spawning ----------
  function startWave(waveIdx) {
    wave = waveIdx + 1;
    state = 'running';
    spawnQueue.length = 0;

    const waveDef = WAVES[waveIdx];
    let delay = 0;
    waveDef.forEach(group => {
      for (let i = 0; i < group.count; i++) {
        spawnQueue.push({ type: group.type, delay });
        delay += group.interval;
      }
    });
    spawnQueue.sort((a, b) => a.delay - b.delay);
    spawnQueue.forEach(e => { e.timer = e.delay; });
    if (cb.onScoreChange) cb.onScoreChange(score);
  }

  function startPrep() {
    state   = 'prep';
    prepTimer = PREP_FRAMES;
    if (cb.onWaveDone) cb.onWaveDone(wave, prepTimer);
  }

  // ---------- Enemy logic ----------
  function spawnEnemy(type) {
    if (enemies.length >= MAX_ENEMIES) return;
    const def = ENEMIES[type];
    const e = {
      type,
      hp: def.hp, maxHp: def.hp,
      spd: def.spd,
      slowTimer: 0, slowFactor: 1,
      t: 0,
      wpIdx: 0,
      mesh: null,
      hpBar: null,
      alive: true,
    };
    enemies.push(e);
    if (cb.onSpawnEnemy) cb.onSpawnEnemy(e);
  }

  function enemyPos(e) {
    if (waypoints.length < 2) return { x: 0, y: 0, z: 0 };
    const wps = waypoints;
    let remaining = e.t;
    let i = 0;
    while (i < wps.length - 1) {
      const dx = wps[i+1].x - wps[i].x;
      const dz = wps[i+1].z - wps[i].z;
      const seg = Math.sqrt(dx*dx + dz*dz);
      if (remaining <= seg) {
        const f = remaining / seg;
        return { x: wps[i].x + dx*f, y: 0.25, z: wps[i].z + dz*f };
      }
      remaining -= seg;
      i++;
    }
    return { x: wps[wps.length-1].x, y: 0.25, z: wps[wps.length-1].z };
  }

  function totalPathLength() {
    let len = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const dx = waypoints[i+1].x - waypoints[i].x;
      const dz = waypoints[i+1].z - waypoints[i].z;
      len += Math.sqrt(dx*dx + dz*dz);
    }
    return len;
  }

  function moveEnemies() {
    const pathLen = totalPathLength();
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e.alive) { enemies.splice(i, 1); continue; }

      const sf = e.slowTimer > 0 ? (1 - e.slowFactor) : 1;
      e.t += e.spd * sf;
      if (e.slowTimer > 0) e.slowTimer--;

      if (e.t >= pathLen) {
        // reached goal
        e.alive = false;
        if (e.mesh) { if (cb.onRemoveMesh) cb.onRemoveMesh(e.mesh, e.hpBar); e.mesh = null; }
        life = Math.max(0, life - 1);
        if (cb.onLifeChange) cb.onLifeChange(life);
        if (life <= 0) {
          state = 'gameover';
          if (cb.onGameOver) cb.onGameOver(score);
        }
        enemies.splice(i, 1);
        continue;
      }

      const pos = enemyPos(e);
      if (e.mesh) {
        e.mesh.position.x = pos.x;
        e.mesh.position.z = pos.z;
        if (e.hpBar) { e.hpBar.position.x = pos.x; e.hpBar.position.z = pos.z; }
      }
    }
  }

  // ---------- Tower shooting ----------
  function worldPos(tower) {
    if (!waypoints.length) return { x: 0, z: 0 };
    // World coords set by main.js stored on tower
    return { x: tower.wx || 0, z: tower.wz || 0 };
  }

  function dist2D(ax, az, bx, bz) {
    return Math.sqrt((ax-bx)**2 + (az-bz)**2);
  }

  function bestTarget(tower) {
    const def   = TOWERS[tower.id];
    const stats = def.stats[tower.level];
    const { x: tx, z: tz } = worldPos(tower);
    let best = null, bestT = -1;
    for (const e of enemies) {
      if (!e.alive) continue;
      const pos = enemyPos(e);
      if (dist2D(tx, tz, pos.x, pos.z) <= stats.range && e.t > bestT) {
        best = e; bestT = e.t;
      }
    }
    return best;
  }

  function fireTower(tower) {
    if (bullets.length >= MAX_BULLETS) return;
    const def   = TOWERS[tower.id];
    const stats = def.stats[tower.level];
    const target = bestTarget(tower);
    if (!target) return;

    Sound.play('shoot');
    const { x: tx, z: tz } = worldPos(tower);
    const pos = enemyPos(target);
    const b = {
      x: tx, z: tz, y: 0.6,
      dmg: stats.dmg,
      aoe: stats.aoe || 0,
      target,
      alive: true,
      mesh: null,
    };
    bullets.push(b);
    if (cb.onSpawnBullet) cb.onSpawnBullet(b, def.color);
  }

  function updateTowers() {
    for (const t of towers) {
      const def   = TOWERS[t.id];
      const stats = def.stats[t.level];

      // Lollipop: apply slow aura
      if (t.id === 'lollipop') {
        const { x: tx, z: tz } = worldPos(t);
        for (const e of enemies) {
          const pos = enemyPos(e);
          if (dist2D(tx, tz, pos.x, pos.z) <= stats.range) {
            e.slowTimer  = 10;
            e.slowFactor = stats.slow || 0.4;
          }
        }
        continue;
      }

      t.cdTimer = (t.cdTimer || 0) + 1;
      if (t.cdTimer >= stats.cd) {
        t.cdTimer = 0;
        fireTower(t);
      }
    }
  }

  function moveBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (!b.alive || !b.target || !b.target.alive) {
        if (b.mesh && cb.onRemoveMesh) cb.onRemoveMesh(b.mesh);
        b.mesh = null;
        bullets.splice(i, 1);
        continue;
      }

      const pos = enemyPos(b.target);
      const dx  = pos.x - b.x;
      const dz  = pos.z - b.z;
      const d   = Math.sqrt(dx*dx + dz*dz);

      if (d < BULLET_SPEED) {
        // Hit
        b.alive = false;
        if (b.mesh && cb.onRemoveMesh) cb.onRemoveMesh(b.mesh);
        b.mesh = null;

        if (b.aoe > 0) {
          Sound.play('explode');
          if (cb.onExplode) cb.onExplode(pos.x, pos.z);
          for (const e of enemies) {
            const ep = enemyPos(e);
            if (dist2D(pos.x, pos.z, ep.x, ep.z) <= b.aoe) {
              damageEnemy(e, b.dmg);
            }
          }
        } else {
          Sound.play('hit');
          damageEnemy(b.target, b.dmg);
        }
        bullets.splice(i, 1);
        continue;
      }

      // Move bullet
      const nx = b.x + (dx/d) * BULLET_SPEED;
      const nz = b.z + (dz/d) * BULLET_SPEED;
      b.x = nx; b.z = nz;
      if (b.mesh) { b.mesh.position.x = nx; b.mesh.position.z = nz; }
    }
  }

  function damageEnemy(e, dmg) {
    if (!e.alive) return;
    e.hp -= dmg;
    if (cb.onHitEnemy) cb.onHitEnemy(e);
    if (e.hp <= 0) {
      e.alive = false;
      Sound.play('die');
      const def = ENEMIES[e.type];
      addSugar(def.reward);
      score += def.score;
      kills++;
      if (cb.onScoreChange)  cb.onScoreChange(score);
      if (cb.onKillsChange)  cb.onKillsChange(kills);
      if (e.mesh && cb.onRemoveMesh) cb.onRemoveMesh(e.mesh, e.hpBar);
      e.mesh = null;
    }
  }

  // ---------- Main tick ----------
  function tick() {
    if (state === 'prep') {
      prepTimer--;
      if (prepTimer <= 0 && wave < TOTAL_WAVES) {
        startWave(wave); // wave is already incremented; next is wave (0-indexed = wave)
      }
      return;
    }
    if (state !== 'running') return;

    // Process spawn queue
    for (let i = spawnQueue.length - 1; i >= 0; i--) {
      spawnQueue[i].timer--;
      if (spawnQueue[i].timer <= 0) {
        spawnEnemy(spawnQueue[i].type);
        spawnQueue.splice(i, 1);
      }
    }

    updateTowers();
    moveEnemies();
    moveBullets();

    // Wave complete?
    if (spawnQueue.length === 0 && enemies.length === 0) {
      if (wave >= TOTAL_WAVES) {
        state = 'clear';
        score += life * 50;
        if (cb.onScoreChange) cb.onScoreChange(score);
        if (cb.onClear) cb.onClear(score);
      } else {
        startPrep();
      }
    }
  }

  function startGame() {
    // Reset
    state = 'prep';
    wave  = 0;
    life  = INIT_LIFE;
    sugar = INIT_SUGAR;
    score = 0;
    kills = 0;
    enemies.length = 0;
    bullets.length = 0;
    towers.length  = 0;
    spawnQueue.length = 0;
    prepTimer = 1; // immediately trigger first wave
    if (cb.onLifeChange)  cb.onLifeChange(life);
    if (cb.onSugarChange) cb.onSugarChange(sugar);
    if (cb.onScoreChange) cb.onScoreChange(score);
    if (cb.onKillsChange) cb.onKillsChange(kills);
  }

  function skipPrep() {
    if (state !== 'prep') return;
    prepTimer = 0;
  }

  return {
    init: setWaypoints,
    startGame, tick, skipPrep,
    placeTower, upgradeTower, sellTower, canAfford,
    getSugar, getLife, getScore, getKills, getWave, getState,
    getTowers, getEnemies,
    cb,
    gridToId,
  };
})();
