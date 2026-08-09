var Stage = (function() {
  var HS_PREFIX = 'doko-chigau.clear.';

  var currentStage = null;
  var state = null;
  var stageList = [];

  function loadList() {
    return fetch('stages/index.json').then(function(r) { return r.json(); });
  }

  function loadStage(info) {
    return fetch(info.file).then(function(r) { return r.json(); }).then(function(data) {
      stageList.forEach(function(s) { if (s.id === data.id) data.listInfo = s; });
      return data;
    });
  }

  function startStage(data) {
    currentStage = data;
    state = {
      found:     [],
      total:     data.differences.length,
      hints:     2,
      startTime: Date.now(),
      elapsed:   0,
      finished:  false
    };
    return state;
  }

  function checkTap(normX, normY, minR) {
    // normX, normY: 0.0~1.0 in viewBox space
    var vw = currentStage.viewBox.w;
    var vh = currentStage.viewBox.h;
    var svgX = normX * vw;
    var svgY = normY * vh;

    for (var i = 0; i < currentStage.differences.length; i++) {
      if (state.found.indexOf(i) !== -1) continue;
      var d = currentStage.differences[i];
      var dx = svgX - d.x;
      var dy = svgY - d.y;
      var r  = (minR !== undefined) ? Math.max(d.r, minR) : d.r;
      if (Math.sqrt(dx*dx + dy*dy) <= r) {
        state.found.push(i);
        if (state.found.length === state.total) {
          state.elapsed = Math.round((Date.now() - state.startTime) / 1000);
          state.finished = true;
          _saveBest(currentStage.id, state.elapsed);
        }
        return i;
      }
    }
    return -1;
  }

  function useHint() {
    if (state.hints <= 0) return -1;
    for (var i = 0; i < currentStage.differences.length; i++) {
      if (state.found.indexOf(i) === -1) {
        state.hints--;
        return i;
      }
    }
    return -1;
  }

  function _saveBest(id, time) {
    var key = HS_PREFIX + id;
    var prev = parseInt(localStorage.getItem(key) || '0', 10);
    if (!prev || time < prev) localStorage.setItem(key, time);
  }

  function getBest(id) {
    var v = parseInt(localStorage.getItem(HS_PREFIX + id) || '0', 10);
    return v || null;
  }

  function getDiff(index) { return currentStage ? currentStage.differences[index] : null; }
  function getViewBox()    { return currentStage ? currentStage.viewBox : null; }
  function getState()      { return state; }
  function getStage()      { return currentStage; }
  function setList(list)   { stageList = list; }

  return {
    loadList: loadList,
    loadStage: loadStage,
    startStage: startStage,
    checkTap: checkTap,
    useHint: useHint,
    getBest: getBest,
    getDiff: getDiff,
    getViewBox: getViewBox,
    getState: getState,
    getStage: getStage,
    setList: setList
  };
})();
