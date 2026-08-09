const BubbleGame = (() => {
  const STAGE_COUNTS = [60, 90, 120];
  const INIT_HP      = 20;
  const BULLET_SPD   = 0.28;
  const BUBBLE_RADIUS = 8;
  const HIT_DIST     = 1.0;

  let stage    = 0;
  let hp       = INIT_HP;
  let score    = 0;
  let nextColor = '';
  let bullet    = null; // {x,y,z, dx,dy,dz, color, mesh}
  let state     = 'idle';

  const cb = {
    onSpawnBubble:   null, // (cellId, color)
    onRemoveBubble:  null, // (cellId)
    onSpawnBullet:   null, // (color)
    onRemoveBullet:  null, // ()
    onMoveBullet:    null, // (x,y,z)
    onSnap:          null, // (cellId, color)
    onPop:           null, // (cellIds, isPopped) — isPopped=true for color-match, false for fall
    onHpChange:      null, // (hp, maxHp)
    onScoreChange:   null, // (score)
    onStageComplete: null, // (stage, score)
    onGameClear:     null, // (score)
    onGameOver:      null, // (score)
    onNextColor:     null, // (color)
  };

  function buildStage() {
    const n = STAGE_COUNTS[stage];
    BubbleGrid.build(n);
    const colors = BubbleGrid.getColors();
    BubbleGrid.getCells().forEach(c => {
      const color = colors[Math.floor(Math.random() * colors.length)];
      c.bubble = color;
      if (cb.onSpawnBubble) cb.onSpawnBubble(c.id, color);
    });
    nextColor = BubbleGrid.randomColor();
    if (cb.onNextColor) cb.onNextColor(nextColor);
    if (cb.onScoreChange) cb.onScoreChange(score);
    if (cb.onHpChange) cb.onHpChange(hp, INIT_HP);
  }

  function startGame() {
    stage = 0;
    hp    = INIT_HP;
    score = 0;
    state = 'playing';
    buildStage();
  }

  function nextStage() {
    stage++;
    if (stage >= STAGE_COUNTS.length) {
      state = 'clear';
      if (cb.onGameClear) cb.onGameClear(score);
      return;
    }
    buildStage();
  }

  function shoot(dirX, dirY, dirZ) {
    if (state !== 'playing' || bullet) return;
    const len = Math.sqrt(dirX*dirX + dirY*dirY + dirZ*dirZ);
    bullet = {
      x: 0, y: 0, z: 0,
      dx: dirX/len * BULLET_SPD,
      dy: dirY/len * BULLET_SPD,
      dz: dirZ/len * BULLET_SPD,
      color: nextColor,
    };
    Sound.play('shoot');
    if (cb.onSpawnBullet) cb.onSpawnBullet(nextColor);
    nextColor = BubbleGrid.randomColor();
    if (cb.onNextColor) cb.onNextColor(nextColor);
  }

  function tick() {
    if (state !== 'playing' || !bullet) return;

    bullet.x += bullet.dx;
    bullet.y += bullet.dy;
    bullet.z += bullet.dz;

    if (cb.onMoveBullet) cb.onMoveBullet(bullet.x, bullet.y, bullet.z);

    // Check if out of sphere (no hit)
    const r = Math.sqrt(bullet.x**2 + bullet.y**2 + bullet.z**2);
    if (r > BUBBLE_RADIUS + 2) {
      // Missed entirely — no penalty
      if (cb.onRemoveBullet) cb.onRemoveBullet();
      bullet = null;
      return;
    }

    // Check collision with bubbles
    const cells  = BubbleGrid.getCells();
    let hitCell  = null;
    let minD     = Infinity;
    for (const c of cells) {
      if (c.bubble === null) continue;
      const dx = c.position.x - bullet.x;
      const dy = c.position.y - bullet.y;
      const dz = c.position.z - bullet.z;
      const d  = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (d < HIT_DIST && d < minD) { minD = d; hitCell = c; }
    }

    if (hitCell) {
      // Find snap cell
      const snap = BubbleGrid.findAdjacentEmpty(hitCell.id, bullet.x, bullet.y, bullet.z)
                || BubbleGrid.findSnapCell(bullet.x, bullet.y, bullet.z);

      if (cb.onRemoveBullet) cb.onRemoveBullet();
      bullet = null;

      if (!snap) return;

      snap.bubble = hitCell.bubble === 'same' ? nextColor : bullet ? bullet.color : hitCell.bubble; // fallback
      // Actually store the shot color
      snap.bubble = (function() {
        // bullet was consumed already, use saved ref via closure trick
        return hitCell.bubble; // placeholder — we use shot color below
      })();

      // We need to use the color we shot — store it before clearing
      // Re-implement: save color before setting bullet to null
      // The color is already consumed. We need to rethink...
      // Actually we saved it: bullet was set null above, but the color was bullet.color
      // Let's store it separately.
      return; // handled below via _pendingSnap
    }
  }

  // Cleaner implementation — redo shoot/tick to track color properly
  let _shotColor = '';

  function shootClean(dirX, dirY, dirZ) {
    if (state !== 'playing' || bullet) return;
    const len = Math.sqrt(dirX*dirX + dirY*dirY + dirZ*dirZ);
    _shotColor = nextColor;
    bullet = {
      x: 0, y: 0, z: 0,
      dx: dirX/len * BULLET_SPD,
      dy: dirY/len * BULLET_SPD,
      dz: dirZ/len * BULLET_SPD,
    };
    Sound.play('shoot');
    if (cb.onSpawnBullet) cb.onSpawnBullet(_shotColor);
    nextColor = BubbleGrid.randomColor();
    if (cb.onNextColor) cb.onNextColor(nextColor);
  }

  function tickClean() {
    if (state !== 'playing' || !bullet) return;

    bullet.x += bullet.dx;
    bullet.y += bullet.dy;
    bullet.z += bullet.dz;

    if (cb.onMoveBullet) cb.onMoveBullet(bullet.x, bullet.y, bullet.z);

    const r = Math.sqrt(bullet.x**2 + bullet.y**2 + bullet.z**2);
    if (r > BUBBLE_RADIUS + 1.5) {
      if (cb.onRemoveBullet) cb.onRemoveBullet();
      bullet = null;
      return;
    }

    const cells = BubbleGrid.getCells();
    let hitCell = null, minD = Infinity;
    for (const c of cells) {
      if (c.bubble === null) continue;
      const dx = c.position.x - bullet.x;
      const dy = c.position.y - bullet.y;
      const dz = c.position.z - bullet.z;
      const d  = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (d < HIT_DIST && d < minD) { minD = d; hitCell = c; }
    }

    if (!hitCell) return;

    const snap = BubbleGrid.findAdjacentEmpty(hitCell.id, bullet.x, bullet.y, bullet.z)
              || BubbleGrid.findSnapCell(bullet.x, bullet.y, bullet.z);

    if (cb.onRemoveBullet) cb.onRemoveBullet();
    bullet = null;

    if (!snap) return;

    snap.bubble = _shotColor;
    if (cb.onSnap) cb.onSnap(snap.id, _shotColor);

    const { popped, fallen } = BubbleGrid.tryPop(snap.id);

    if (popped.length > 0) {
      score += popped.length * 10;
      if (popped.length >= 6) score += 50;
      Sound.play('pop', popped.length);
      popped.forEach(id => { if (cb.onRemoveBubble) cb.onRemoveBubble(id, true); });
    } else {
      // Didn't pop — consume hp
      hp = Math.max(0, hp - 1);
      Sound.play('miss');
      if (cb.onHpChange) cb.onHpChange(hp, INIT_HP);
      if (hp <= 0) {
        state = 'gameover';
        if (cb.onGameOver) cb.onGameOver(score);
        return;
      }
    }

    if (fallen.length > 0) {
      score += fallen.length * 20;
      Sound.play('fall');
      fallen.forEach(id => { if (cb.onRemoveBubble) cb.onRemoveBubble(id, false); });
    }

    if (popped.length > 0 || fallen.length > 0) {
      if (cb.onScoreChange) cb.onScoreChange(score);
    }

    if (BubbleGrid.remainingCount() === 0) {
      state = 'stageclear';
      if (cb.onStageComplete) cb.onStageComplete(stage + 1, score);
    }
  }

  return {
    startGame, nextStage, shoot: shootClean, tick: tickClean,
    getStage: () => stage + 1,
    getHp:    () => hp,
    getScore: () => score,
    getState: () => state,
    cb,
  };
})();
