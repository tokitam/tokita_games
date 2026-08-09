// コマ物理 + CPU AI + 状態機械
// 状態: 'countdown' → 'launch' → 'battle' → 'roundEnd' → 'matchEnd'
const Battle = (() => {
  const ARENA_R = 5.5;    // 土俵半径
  const KOMA_R = 0.55;    // コマ衝突半径
  const FRICTION = 0.988; // 速度減衰
  const SPIN_DECAY = 0.992;
  const GRAVITY_CENTER = 0.0015; // 中心引力

  let state = 'idle';
  let playerScore = 0;
  let cpuScore = 0;
  let round = 0; // 1-indexed

  const player = { x: 0, z: -3, vx: 0, vz: 0, spin: 100 };
  const cpu    = { x: 0, z:  3, vx: 0, vz: 0, spin: 100 };

  let cooldown = 0;
  let cpuTimer = 0;
  let cpuInterval = 0;
  let callbacks = {};
  let slowTime = 0;
  let roundTimer = 0;
  const ROUND_TIME = 30;

  function getState() { return state; }
  function setState(s) { state = s; }
  function getPlayer() { return player; }
  function getCpu()    { return cpu; }
  function getScores() { return { player: playerScore, cpu: cpuScore }; }
  function getCooldown() { return cooldown; }
  function getRound() { return round; }

  function init(cbs) {
    callbacks = cbs;
    playerScore = 0;
    cpuScore = 0;
    round = 0;
    startRound();
  }

  function startRound() {
    round++;
    state = 'countdown';
    roundTimer = ROUND_TIME;
    Object.assign(player, { x: 0, z: -3, vx: 0, vz: 0, spin: 100 });
    Object.assign(cpu,    { x: 0, z:  3, vx: 0, vz: 0, spin: 80 + round * 5 });
    cooldown = 0;
    slowTime = 0;
    cpuTimer = 0;
    cpuInterval = Math.max(1.5, 3.5 - round * 0.3);
    if (callbacks.onRoundStart) callbacks.onRoundStart(round);
    doCountdown();
  }

  function doCountdown() {
    let count = 3;
    if (callbacks.onCountdown) callbacks.onCountdown(count);
    Sound.play('countdown');
    const iv = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(iv);
        state = 'launch';
        if (callbacks.onCountdown) callbacks.onCountdown(0); // GO!
        Sound.play('go');
        setTimeout(() => {
          if (state === 'launch') {
            state = 'battle';
            if (callbacks.onBattle) callbacks.onBattle();
          }
        }, 800);
      } else {
        if (callbacks.onCountdown) callbacks.onCountdown(count);
        Sound.play('countdown');
      }
    }, 800);
  }

  // dt: 秒
  function update(dt) {
    if (state !== 'battle') return;
    if (slowTime > 0) {
      dt *= 0.3;
      slowTime -= dt;
    }

    roundTimer -= dt;
    if (roundTimer <= 0) {
      // タイムアップ: スピン残量で判定
      const winner = player.spin >= cpu.spin ? 'player' : 'cpu';
      endRound(winner, 'timeout');
      return;
    }

    // 物理更新
    stepPhysics(player, dt);
    stepPhysics(cpu, dt);

    // 衝突
    collide(dt);

    // クールタイム
    if (cooldown > 0) {
      cooldown = Math.max(0, cooldown - dt);
      if (callbacks.onCooldown) callbacks.onCooldown(cooldown / 1.0);
    }

    // CPU AI
    cpuTimer -= dt;
    if (cpuTimer <= 0) {
      cpuTimer = cpuInterval * (0.7 + Math.random() * 0.6);
      cpuAct();
    }

    // スピンアウト判定
    if (player.spin <= 0) { endRound('cpu', 'spinout'); return; }
    if (cpu.spin <= 0)    { endRound('player', 'spinout'); return; }

    // ノックアウト判定
    const pr = Math.sqrt(player.x * player.x + player.z * player.z);
    const cr = Math.sqrt(cpu.x * cpu.x + cpu.z * cpu.z);
    if (pr > ARENA_R) { endRound('cpu', 'knockout'); return; }
    if (cr > ARENA_R) { endRound('player', 'knockout'); return; }

    if (callbacks.onUpdate) callbacks.onUpdate(player, cpu, cooldown, roundTimer);
  }

  function stepPhysics(k, dt) {
    // 中心引力
    const dist = Math.sqrt(k.x * k.x + k.z * k.z);
    if (dist > 0.01) {
      k.vx -= (k.x / dist) * GRAVITY_CENTER;
      k.vz -= (k.z / dist) * GRAVITY_CENTER;
    }
    k.vx *= FRICTION;
    k.vz *= FRICTION;
    k.x += k.vx;
    k.z += k.vz;
    k.spin = Math.max(0, k.spin * SPIN_DECAY);
  }

  function collide(dt) {
    const dx = cpu.x - player.x;
    const dz = cpu.z - player.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < KOMA_R * 2 && dist > 0.001) {
      Sound.play('clash');

      const nx = dx / dist;
      const nz = dz / dist;
      const relV = (player.vx - cpu.vx) * nx + (player.vz - cpu.vz) * nz;

      // 弾性衝突
      const impulse = relV;
      player.vx -= impulse * nx;
      player.vz -= impulse * nz;
      cpu.vx    += impulse * nx;
      cpu.vz    += impulse * nz;

      // スピンを削る
      const dmg = Math.min(15, Math.abs(relV) * 20);
      player.spin = Math.max(0, player.spin - dmg * (100 / (cpu.spin + 10)));
      cpu.spin    = Math.max(0, cpu.spin    - dmg * (100 / (player.spin + 10)));

      // 重なり解消
      const overlap = KOMA_R * 2 - dist;
      player.x -= nx * overlap * 0.5;
      player.z -= nz * overlap * 0.5;
      cpu.x    += nx * overlap * 0.5;
      cpu.z    += nz * overlap * 0.5;

      if (callbacks.onClash) callbacks.onClash();
    }
  }

  function cpuAct() {
    const dx = player.x - cpu.x;
    const dz = player.z - cpu.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    const spd = (0.06 + round * 0.01) * (0.8 + Math.random() * 0.4);
    cpu.vx = (dx / dist) * spd;
    cpu.vz = (dz / dist) * spd;
  }

  function playerInput(vx, vz, spinBoost) {
    if (state === 'launch') {
      player.spin = Math.min(100, 60 + spinBoost * 40);
      player.vx = vx;
      player.vz = vz;
      state = 'battle';
      if (callbacks.onBattle) callbacks.onBattle();
      return;
    }
    if (state !== 'battle' || cooldown > 0) return;
    player.vx += vx;
    player.vz += vz;
    cooldown = 1.0;
    if (callbacks.onCooldown) callbacks.onCooldown(1);
  }

  function endRound(winner, reason) {
    if (state === 'roundEnd' || state === 'matchEnd') return;
    state = 'roundEnd';

    if (reason === 'knockout') {
      slowTime = 1.0;
      Sound.play('knockout');
    } else {
      Sound.play('spinout');
    }

    if (winner === 'player') playerScore++;
    else cpuScore++;

    if (callbacks.onRoundEnd) callbacks.onRoundEnd(winner, reason, playerScore, cpuScore);

    if (playerScore >= 3 || cpuScore >= 3) {
      setTimeout(() => {
        state = 'matchEnd';
        if (callbacks.onMatchEnd) callbacks.onMatchEnd(playerScore >= 3 ? 'player' : 'cpu');
        Sound.play(playerScore >= 3 ? 'win' : 'spinout');
      }, 2200);
    } else {
      setTimeout(startRound, 2500);
    }
  }

  return { getState, setState, getPlayer, getCpu, getScores, getCooldown, getRound, init, update, playerInput };
})();
