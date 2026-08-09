const StackGame = (() => {
  const INIT_SIZE   = 3.0;
  const PERFECT_THR = 0.05;
  const SPEED_BASE  = 1.0;
  const SPEED_STEP  = 0.10;
  const SPEED_MAX   = 2.5;

  let score = 0;
  let level = 0;
  let blocks = [];      // { x, z, w, d, y, color }
  let perfectStreak = 0;
  let axis = 'x';      // current moving axis
  let currentW = INIT_SIZE;
  let currentD = INIT_SIZE;
  let onPlace = null;
  let onPerfect = null;
  let onGameOver = null;
  let onScoreUpdate = null;

  function hue(lv) { return (lv * 8) % 360; }
  function color(lv) { return `hsl(${hue(lv)},70%,55%)`; }

  function speed() {
    return Math.min(SPEED_BASE + Math.floor(level / 10) * SPEED_STEP, SPEED_MAX);
  }

  function topBlock() { return blocks[blocks.length - 1]; }

  function init() {
    score = 0;
    level = 0;
    perfectStreak = 0;
    axis = 'x';
    currentW = INIT_SIZE;
    currentD = INIT_SIZE;
    blocks = [{
      x: 0, z: 0,
      w: INIT_SIZE, d: INIT_SIZE,
      y: 0,
      color: color(0)
    }];
    if (onScoreUpdate) onScoreUpdate(score);
    return topBlock();
  }

  // Called when player taps. pos is current position of the moving block (x or z).
  // Returns: { placed: block | null, fallen: block | null, perfect: bool, gameOver: bool }
  function place(movingPos) {
    const prev = topBlock();
    const newY  = prev.y + 0.5;

    let overlap, newX, newZ, newW, newD;

    if (axis === 'x') {
      const prevMin = prev.x - prev.w / 2;
      const prevMax = prev.x + prev.w / 2;
      const curMin  = movingPos - currentW / 2;
      const curMax  = movingPos + currentW / 2;

      const oMin = Math.max(prevMin, curMin);
      const oMax = Math.min(prevMax, curMax);
      overlap = oMax - oMin;

      if (overlap <= 0) {
        if (onGameOver) onGameOver(score);
        return { gameOver: true };
      }

      const gap = Math.abs(movingPos - prev.x);
      const perfect = gap < currentW * PERFECT_THR;

      if (perfect) {
        newX = prev.x;
        newW = currentW;
        perfectStreak++;
        if (perfectStreak >= 3) {
          newW = Math.min(INIT_SIZE, currentW + 0.25);
          perfectStreak = 0;
        }
      } else {
        newX = (oMin + oMax) / 2;
        newW = overlap;
        perfectStreak = 0;
      }
      newZ = prev.z;
      newD = currentD;
      currentW = newW;

      const fallenW = Math.abs(currentW - overlap) > 0.01 ? (perfect ? 0 : Math.max(curMax - prevMax, 0) > 0
        ? { x: prevMax + (curMax - prevMax) / 2, z: prev.z, w: curMax - prevMax, d: currentD, y: newY, color: color(level) }
        : { x: curMin + (prevMin - curMin) / 2, z: prev.z, w: prevMin - curMin, d: currentD, y: newY, color: color(level) }
      ) : null;

      score++;
      level = score;
      axis = 'z';

      const placed = { x: newX, z: newZ, w: newW, d: newD, y: newY, color: color(level) };
      blocks.push(placed);
      if (onScoreUpdate) onScoreUpdate(score);
      if (perfect && onPerfect) onPerfect();
      if (onPlace) onPlace(placed, fallenW, perfect);
      return { placed, fallen: fallenW, perfect, gameOver: false };

    } else {
      const prevMin = prev.z - prev.d / 2;
      const prevMax = prev.z + prev.d / 2;
      const curMin  = movingPos - currentD / 2;
      const curMax  = movingPos + currentD / 2;

      const oMin = Math.max(prevMin, curMin);
      const oMax = Math.min(prevMax, curMax);
      overlap = oMax - oMin;

      if (overlap <= 0) {
        if (onGameOver) onGameOver(score);
        return { gameOver: true };
      }

      const gap = Math.abs(movingPos - prev.z);
      const perfect = gap < currentD * PERFECT_THR;

      if (perfect) {
        newZ = prev.z;
        newD = currentD;
        perfectStreak++;
        if (perfectStreak >= 3) {
          newD = Math.min(INIT_SIZE, currentD + 0.25);
          perfectStreak = 0;
        }
      } else {
        newZ = (oMin + oMax) / 2;
        newD = overlap;
        perfectStreak = 0;
      }
      newX = prev.x;
      newW = currentW;
      currentD = newD;

      const fallenD = perfect ? null : (curMax > prevMax
        ? { x: prev.x, z: prevMax + (curMax - prevMax) / 2, w: currentW, d: curMax - prevMax, y: newY, color: color(level) }
        : { x: prev.x, z: curMin + (prevMin - curMin) / 2, w: currentW, d: prevMin - curMin, y: newY, color: color(level) }
      );

      score++;
      level = score;
      axis = 'x';

      const placed = { x: newX, z: newZ, w: newW, d: newD, y: newY, color: color(level) };
      blocks.push(placed);
      if (onScoreUpdate) onScoreUpdate(score);
      if (perfect && onPerfect) onPerfect();
      if (onPlace) onPlace(placed, fallenD, perfect);
      return { placed, fallen: fallenD, perfect, gameOver: false };
    }
  }

  function getAxis()        { return axis; }
  function getSpeed()       { return speed(); }
  function getLevel()       { return level; }
  function getScore()       { return score; }
  function getTopBlock()    { return topBlock(); }
  function getCurrentW()    { return currentW; }
  function getCurrentD()    { return currentD; }
  function getBlocks()      { return blocks; }

  return {
    init, place,
    getAxis, getSpeed, getLevel, getScore,
    getTopBlock, getCurrentW, getCurrentD, getBlocks,
    set onPlace(fn)       { onPlace = fn; },
    set onPerfect(fn)     { onPerfect = fn; },
    set onGameOver(fn)    { onGameOver = fn; },
    set onScoreUpdate(fn) { onScoreUpdate = fn; },
  };
})();
