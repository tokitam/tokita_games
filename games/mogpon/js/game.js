var Game = (function() {
  var TOTAL_TIME = 30;
  var HOLE_COUNT = 9;

  // Phase config: [elapsed seconds, visible duration ms, max simultaneous]
  var PHASES = [
    { from: 0,  visDur: 1200, maxActive: 1 },
    { from: 10, visDur: 900,  maxActive: 2 },
    { from: 20, visDur: 700,  maxActive: 3 }
  ];

  var CHAR_TYPES = [
    { key: 'normal', emoji: '🐹', chance: 0.70, points: 1 },
    { key: 'rare',   emoji: '✨🐹', chance: 0.20, points: 3, durBonus: -500 },
    { key: 'skull',  emoji: '💀', chance: 0.10, points: -1 }
  ];

  var state;
  var onTick, onEnd;

  function getPhase() {
    var elapsed = TOTAL_TIME - state.timeLeft;
    var phase = PHASES[0];
    PHASES.forEach(function(p) { if (elapsed >= p.from) phase = p; });
    return phase;
  }

  function randomCharType() {
    var r = Math.random();
    var cum = 0;
    for (var i = 0; i < CHAR_TYPES.length; i++) {
      cum += CHAR_TYPES[i].chance;
      if (r < cum) return CHAR_TYPES[i];
    }
    return CHAR_TYPES[0];
  }

  function activeCount() {
    return state.holes.filter(function(h) { return h.active; }).length;
  }

  function scheduleNext() {
    if (!state.running) return;
    var phase = getPhase();
    var delay = phase.visDur * (0.4 + Math.random() * 0.3);
    setTimeout(function() {
      if (!state.running) return;
      phase = getPhase();
      if (activeCount() >= phase.maxActive) { scheduleNext(); return; }

      // pick inactive hole
      var inactive = state.holes
        .map(function(h, i) { return { h: h, i: i }; })
        .filter(function(x) { return !x.h.active; });
      if (!inactive.length) { scheduleNext(); return; }

      var slot = inactive[Math.floor(Math.random() * inactive.length)];
      var charType = randomCharType();
      var visDur = phase.visDur + (charType.durBonus || 0);
      activateHole(slot.i, charType, visDur);
    }, delay);
  }

  function activateHole(idx, charType, visDur) {
    var hole = state.holes[idx];
    hole.active = true;
    hole.type = charType;
    hole.hiding = false;
    if (state.onShow) state.onShow(idx, charType);

    hole.timer = setTimeout(function() {
      if (!hole.active) return;
      hideHole(idx, false);
    }, visDur);
  }

  function hideHole(idx, wasHit) {
    var hole = state.holes[idx];
    if (!hole.active && !hole.hiding) return;
    clearTimeout(hole.timer);
    hole.timer = null;
    if (!wasHit) Sound.play('escape');
    hole.hiding = true;
    hole.active = false;
    if (state.onHide) state.onHide(idx, wasHit);

    // schedule next after hide animation
    setTimeout(function() {
      hole.hiding = false;
      if (state.running) scheduleNext();
    }, 220);
  }

  function hit(idx) {
    var hole = state.holes[idx];
    if (!hole.active || hole.hiding) return null;
    var charType = hole.type;
    var pts = charType.points;
    state.score = Math.max(0, state.score + pts);
    if (pts > 0)      Sound.play(charType.key === 'rare' ? 'hitRare' : 'hit');
    else              Sound.play('hitBad');
    hideHole(idx, true);
    return { points: pts, charType: charType };
  }

  function init(callbacks) {
    state = {
      score: 0,
      timeLeft: TOTAL_TIME,
      running: false,
      holes: [],
      timerId: null,
      onShow: callbacks.onShow,
      onHide: callbacks.onHide,
      onTick: callbacks.onTick,
      onEnd:  callbacks.onEnd
    };
    for (var i = 0; i < HOLE_COUNT; i++) {
      state.holes.push({ active: false, type: null, timer: null, hiding: false });
    }
    return state;
  }

  function start() {
    state.running = true;
    // start a few initial moles
    scheduleNext();
    scheduleNext();

    state.timerId = setInterval(function() {
      state.timeLeft--;
      if (state.onTick) state.onTick(state.timeLeft);
      if (state.timeLeft <= 0) stop();
    }, 1000);
  }

  function stop() {
    state.running = false;
    clearInterval(state.timerId);
    // clear all hole timers
    state.holes.forEach(function(h, i) {
      clearTimeout(h.timer);
      h.timer = null;
      h.active = false;
      h.hiding = false;
    });
    Sound.play('end');
    if (state.onEnd) state.onEnd(state.score);
  }

  return {
    init: init,
    start: start,
    hit: hit,
    getState: function() { return state; }
  };
})();
