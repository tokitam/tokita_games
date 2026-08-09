var Chart = (function() {
  var PERFECT_MS = 50;
  var GOOD_MS    = 120;
  var APPROACH_TIME = 1.5; // seconds notes travel before hitting line
  var HS_PREFIX = 'ponpon-beat.hs.';

  var notes, songData, synth;
  var state;

  function load(data) {
    songData = data;
    notes = data.notes.map(function(n) {
      return { time: n.time, lane: n.lane, judged: false, el: null };
    });
  }

  function getBest(songId) {
    return parseInt(localStorage.getItem(HS_PREFIX + songId) || '0', 10);
  }

  function start() {
    synth = Sound.createSynth(songData.notes, songData.bpm);
    if (synth) synth.start(0);

    state = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      perfect: 0,
      good: 0,
      miss: 0,
      finished: false,
      elapsed: 0
    };
    return state;
  }

  function stop() {
    if (synth) synth.stop();
  }

  function getCurrentTime() {
    if (!synth) return 0;
    return synth.currentTime();
  }

  function update(laneH) {
    if (state.finished) return;

    var t = getCurrentTime();
    state.elapsed = t;

    // Auto-miss notes that have passed
    notes.forEach(function(n) {
      if (!n.judged && t > n.time + GOOD_MS / 1000) {
        n.judged = true;
        _applyJudge('miss', n.lane);
      }
    });

    // Check if song ended
    var allJudged = notes.every(function(n) { return n.judged; });
    if (t >= songData.duration && allJudged) {
      state.finished = true;
      stop();

      var best = getBest(songData.id);
      if (state.score > best) {
        localStorage.setItem(HS_PREFIX + songData.id, state.score);
      }
    }
  }

  function tap(lane) {
    Sound.tap();
    var t = getCurrentTime();
    var best = null;
    var bestDiff = Infinity;

    notes.forEach(function(n) {
      if (n.judged || n.lane !== lane) return;
      var diff = Math.abs(t - n.time) * 1000; // ms
      if (diff < bestDiff) { bestDiff = diff; best = n; }
    });

    if (!best || bestDiff > GOOD_MS) {
      return null; // no note in range
    }

    best.judged = true;
    var judge = bestDiff <= PERFECT_MS ? 'perfect' : 'good';
    _applyJudge(judge, lane);
    return judge;
  }

  function _applyJudge(judge, lane) {
    if (judge === 'miss') {
      state.combo = 0;
      state.miss++;
    } else {
      var pts = judge === 'perfect' ? 300 : 100;
      var mult = state.combo >= 30 ? 2 : state.combo >= 10 ? 1.5 : 1;
      state.score += Math.floor(pts * mult);
      state.combo++;
      if (state.combo > state.maxCombo) state.maxCombo = state.combo;
      if (judge === 'perfect') state.perfect++;
      else state.good++;
    }
  }

  function getNotePositions(laneH) {
    var t = getCurrentTime();
    var judgeY = laneH - 64; // pixels from top (bottom area is 64px tap zone)
    var result = [];

    notes.forEach(function(n) {
      if (n.judged) return;
      var diff = n.time - t; // seconds until note hits line
      if (diff > APPROACH_TIME + 0.2 || diff < -0.15) return;

      // progress: 0 = at top, 1 = at judge line
      var progress = 1 - (diff / APPROACH_TIME);
      var y = progress * judgeY;

      result.push({ lane: n.lane, y: y });
    });
    return result;
  }

  function getAccuracy() {
    var total = state.perfect + state.good + state.miss;
    if (!total) return 100;
    return Math.round((state.perfect * 100 + state.good * 50) / (total * 100) * 100 * 10) / 10;
  }

  function isFullCombo() {
    return state.miss === 0 && (state.perfect + state.good) > 0;
  }

  return {
    load: load,
    start: start,
    stop: stop,
    update: update,
    tap: tap,
    getNotePositions: getNotePositions,
    getCurrentTime: getCurrentTime,
    getState: function() { return state; },
    getSongData: function() { return songData; },
    getAccuracy: getAccuracy,
    isFullCombo: isFullCombo,
    getBest: getBest,
    APPROACH_TIME: APPROACH_TIME
  };
})();
