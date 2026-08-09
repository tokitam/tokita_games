const OkatGame = (() => {
  const TOTAL_TOYS = 15;
  const TIME_LIMIT = 60;
  const COMBO_WINDOW = 5000; // ms
  const SCORE_MATCH   = 10;
  const SCORE_NOMATCH = 3;
  const COMBO_MULT    = 1.5;

  let score      = 0;
  let stored     = 0;
  let timeLeft   = TIME_LIMIT;
  let lastStoreTime = 0;
  let comboCount = 0;
  let timer      = null;
  let state      = 'idle';

  const cb = {
    onScore:    null,
    onTimer:    null,
    onStored:   null,
    onCombo:    null,
    onClear:    null,
    onGameOver: null,
  };

  // box bounds: {minX, maxX, minY, maxY, minZ, maxZ, color}
  const boxes = [];

  function addBox(b) { boxes.push(b); }
  function clearBoxes() { boxes.length = 0; }

  function start() {
    score = 0; stored = 0; timeLeft = TIME_LIMIT;
    lastStoreTime = 0; comboCount = 0;
    state = 'playing';
    if (cb.onScore)  cb.onScore(0);
    if (cb.onStored) cb.onStored(0, TOTAL_TOYS);
    if (cb.onTimer)  cb.onTimer(TIME_LIMIT);

    clearInterval(timer);
    timer = setInterval(() => {
      if (state !== 'playing') return;
      timeLeft--;
      if (cb.onTimer) cb.onTimer(timeLeft);
      if (timeLeft <= 0) {
        end(false);
      }
    }, 1000);
  }

  function end(cleared) {
    clearInterval(timer);
    state = cleared ? 'clear' : 'gameover';
    if (cleared) {
      score += timeLeft * 5;
      if (cb.onScore) cb.onScore(score);
      Sound.play('clear');
      if (cb.onClear) cb.onClear(score, timeLeft);
    } else {
      Sound.play('gameover');
      if (cb.onGameOver) cb.onGameOver(score);
    }
  }

  // Called when a toy comes to rest inside a box area
  function tryStore(toyColor, cx, cy, cz) {
    for (const b of boxes) {
      if (cx >= b.minX && cx <= b.maxX &&
          cy >= b.minY && cy <= b.maxY &&
          cz >= b.minZ && cz <= b.maxZ) {

        const isMatch = toyColor === b.color;
        const now  = Date.now();
        const inWindow = (now - lastStoreTime) < COMBO_WINDOW;
        comboCount = inWindow ? comboCount + 1 : 1;
        lastStoreTime = now;

        let pts = isMatch ? SCORE_MATCH : SCORE_NOMATCH;
        if (comboCount >= 2) pts = Math.round(pts * COMBO_MULT);

        score  += pts;
        stored += 1;

        if (cb.onScore)  cb.onScore(score);
        if (cb.onStored) cb.onStored(stored, TOTAL_TOYS);
        if (comboCount >= 2 && cb.onCombo) cb.onCombo(comboCount, pts);

        Sound.play(isMatch ? 'storeGood' : 'store');
        if (comboCount >= 2) Sound.play('combo');

        if (stored >= TOTAL_TOYS) {
          end(true);
        }
        return { pts, isMatch, box: b };
      }
    }
    return null;
  }

  return {
    start, tryStore, addBox, clearBoxes,
    getState: () => state,
    getScore: () => score,
    getStored: () => stored,
    getTimeLeft: () => timeLeft,
    cb,
  };
})();
