// ぽんぽんクッキング ゲームロジック
const CookingGame = (() => {
  const MAX_ITEMS = 4;     // フライパン最大4個
  const MAX_FALLING = 8;  // 同時落下最大8個
  const PAN_HALF_W = 1.8; // フライパン半幅

  let score = 0;
  let timeLeft = 60;
  let timerIv = null;
  let panItems = [];          // フライパン内の食材キー配列
  let fallingItems = [];      // 落下中の食材オブジェクト配列
  let currentOrder = null;
  let nextOrder = null;
  let consecutiveComplete = 0;
  let fever = false;
  let feverTimeLeft = 0;
  let feverIv = null;
  let panX = 0;
  let spawnIv = null;
  let callbacks = {};
  let isStirring = false;

  const SPAWN_INTERVAL_NORMAL = 1200;
  const SPAWN_INTERVAL_FEVER  = 700;

  function init(cbs) {
    callbacks = cbs;
    score = 0;
    timeLeft = 60;
    panItems = [];
    fallingItems = [];
    consecutiveComplete = 0;
    fever = false;
    feverTimeLeft = 0;
    panX = 0;
    isStirring = false;
    currentOrder = randomRecipe(null);
    nextOrder    = randomRecipe(currentOrder);
    updateUI();
    startTimer();
    startSpawner();
  }

  function startTimer() {
    clearInterval(timerIv);
    timerIv = setInterval(() => {
      timeLeft--;
      document.getElementById('timer').textContent = timeLeft;
      if (timeLeft <= 10) {
        document.getElementById('timer').classList.add('urgent');
        Sound.play('tick');
      }
      if (timeLeft <= 0) {
        clearInterval(timerIv);
        stop();
      }
    }, 1000);
  }

  function startSpawner() {
    clearInterval(spawnIv);
    const interval = fever ? SPAWN_INTERVAL_FEVER : SPAWN_INTERVAL_NORMAL;
    spawnIv = setInterval(spawnItem, interval);
  }

  function stop() {
    clearInterval(timerIv);
    clearInterval(spawnIv);
    clearInterval(feverIv);
    if (callbacks.onEnd) callbacks.onEnd(score);
  }

  function spawnItem() {
    if (fallingItems.length >= MAX_FALLING) return;
    const key = randomIngredient(fever);
    const item = {
      key,
      def: Ingredients[key],
      x: (Math.random() - 0.5) * 6,
      y: 5,
      vy: 0
    };
    fallingItems.push(item);
    if (callbacks.onSpawn) callbacks.onSpawn(item);
  }

  function update(dt) {
    const gravity = 0.008 + (fever ? 0.003 : 0);
    for (let i = fallingItems.length - 1; i >= 0; i--) {
      const fi = fallingItems[i];
      fi.vy += gravity;
      fi.y -= fi.vy;

      // フライパン高さに到達
      if (fi.y <= -1.5) {
        const hit = Math.abs(fi.x - panX) < PAN_HALF_W;
        if (hit) {
          catchItem(fi);
        }
        if (callbacks.onItemDrop) callbacks.onItemDrop(fi, hit);
        fallingItems.splice(i, 1);
      }
    }
    if (callbacks.onUpdate) callbacks.onUpdate(fallingItems, panX);
  }

  function catchItem(fi) {
    if (fi.def.bad) {
      panItems = [];
      score = Math.max(0, score - 10);
      document.getElementById('score').textContent = score;
      Sound.play('fail');
      if (callbacks.onFail) callbacks.onFail('邪魔！-10点', fi);
      return;
    }
    if (panItems.length >= MAX_ITEMS) return;
    Sound.play('catch');
    panItems.push(fi.key);
    updatePanUI();
    if (callbacks.onCatch) callbacks.onCatch(fi, panItems.slice());
  }

  function stir() {
    if (isStirring) return;
    const match = findMatchingRecipe(panItems, currentOrder);
    if (!match) {
      if (callbacks.onStirNoMatch) callbacks.onStirNoMatch();
      return;
    }
    isStirring = true;
    setTimeout(() => {
      const pts = match.score * (fever ? 2 : 1);
      score += pts;
      document.getElementById('score').textContent = score;
      panItems = [];
      updatePanUI();
      consecutiveComplete++;
      Sound.play('complete');
      if (callbacks.onComplete) callbacks.onComplete(match, pts, consecutiveComplete);
      if (consecutiveComplete >= 3 && !fever) {
        startFever();
      }
      currentOrder = nextOrder;
      nextOrder = randomRecipe(currentOrder);
      updateOrderUI();
      isStirring = false;
    }, 1000);
  }

  function throwItem() {
    if (panItems.length === 0) return;
    const removed = panItems.pop();
    Sound.play('throw');
    updatePanUI();
    if (callbacks.onThrow) callbacks.onThrow(removed);
  }

  function startFever() {
    fever = true;
    feverTimeLeft = 10;
    clearInterval(feverIv);
    clearInterval(spawnIv);
    startSpawner();
    Sound.play('fever');
    if (callbacks.onFeverStart) callbacks.onFeverStart();
    feverIv = setInterval(() => {
      feverTimeLeft--;
      if (callbacks.onFeverTick) callbacks.onFeverTick(feverTimeLeft / 10);
      if (feverTimeLeft <= 0) {
        fever = false;
        consecutiveComplete = 0;
        clearInterval(feverIv);
        clearInterval(spawnIv);
        startSpawner();
        if (callbacks.onFeverEnd) callbacks.onFeverEnd();
      }
    }, 1000);
  }

  function setPanX(x) { panX = x; }
  function getPanX() { return panX; }
  function isOver() { return timeLeft <= 0; }

  function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('timer').textContent = timeLeft;
    updateOrderUI();
    updatePanUI();
  }

  function updateOrderUI() {
    if (!currentOrder) return;
    document.getElementById('order-name').textContent = currentOrder.emoji + ' ' + currentOrder.name;
    document.getElementById('order-items').textContent = currentOrder.materials.map(k => Ingredients[k].emoji).join(' ');
    document.getElementById('order-score').textContent = '+' + currentOrder.score;
    if (nextOrder) {
      document.getElementById('next-name').textContent = nextOrder.emoji + ' ' + nextOrder.name;
      document.getElementById('next-items').textContent = nextOrder.materials.map(k => Ingredients[k].emoji).join(' ');
    }
  }

  function updatePanUI() {
    document.getElementById('pan-items').textContent = panItems.map(k => Ingredients[k].emoji).join(' ');
  }

  return { init, update, stir, throwItem, setPanX, getPanX, isOver };
})();
