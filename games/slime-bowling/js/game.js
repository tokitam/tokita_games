const Game = (() => {
  // state: 'aiming' | 'rolling' | 'judging' | 'result'
  let state = 'aiming';
  let frames = [];      // 各フレーム [1投目, 2投目]
  let frameIdx = 0;
  let throwIdx = 0;

  function init() {
    frames = Array.from({ length: 5 }, () => [null, null]);
    frameIdx = 0;
    throwIdx = 0;
    state = 'aiming';
    refreshTable();
  }

  function getState() { return state; }
  function setState(s) { state = s; }
  function getCurrentFrame() { return frameIdx; }
  function getCurrentThrow() { return throwIdx; }
  function getFrames() { return frames; }

  function recordThrow(knocked) {
    frames[frameIdx][throwIdx] = knocked;
    refreshTable();
  }

  // 次の投 / フレームへ進め、遷移先を返す
  function advance() {
    const f1 = frames[frameIdx][0];
    if (throwIdx === 0) {
      if (f1 === 10) {
        frameIdx++;
        throwIdx = 0;
        return frameIdx >= 5 ? 'result' : 'next-frame';
      }
      throwIdx = 1;
      return 'next-throw';
    } else {
      frameIdx++;
      throwIdx = 0;
      return frameIdx >= 5 ? 'result' : 'next-frame';
    }
  }

  function calcTotal() {
    let total = 0;
    for (let i = 0; i < 5; i++) {
      const f1 = frames[i][0] || 0;
      const f2 = frames[i][1] || 0;
      let bonus = 0;
      if (f1 === 10) bonus = 5;
      else if (f1 + f2 === 10) bonus = 3;
      total += f1 + f2 + bonus;
    }
    return total;
  }

  function refreshTable() {
    for (let i = 0; i < 5; i++) {
      const f1 = frames[i][0];
      const f2 = frames[i][1];
      const el1 = document.getElementById(`frame-${i}-1`);
      const el2 = document.getElementById(`frame-${i}-2`);
      if (el1) el1.textContent = f1 === null ? '-' : f1 === 10 ? '★' : f1;
      if (el2) {
        if (f2 === null) {
          el2.textContent = '-';
        } else if (f1 !== null && f1 + f2 === 10) {
          el2.textContent = '/';
        } else {
          el2.textContent = f2;
        }
      }
    }
  }

  return { init, getState, setState, getCurrentFrame, getCurrentThrow, getFrames, recordThrow, advance, calcTotal };
})();
