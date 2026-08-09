// 状態機械: ready → casting → waiting → biting → catching | escaped → ready
const GameState = (() => {
  let state = 'ready';
  let score = 0;
  let timeLeft = 60;
  let timerInterval = null;
  let onTick = null;
  let onEnd = null;

  function getState() { return state; }
  function setState(s) { state = s; }
  function getScore() { return score; }
  function addScore(n) {
    score += n;
    document.getElementById('score').textContent = score;
  }

  function init(callbacks) {
    state = 'ready';
    score = 0;
    timeLeft = 60;
    document.getElementById('score').textContent = '0';
    document.getElementById('timer').textContent = '60';
    document.getElementById('timer').classList.remove('urgent');
    onTick = callbacks.onTick;
    onEnd = callbacks.onEnd;
    const best = parseInt(localStorage.getItem('fishing-friends.highscore') || '0');
    document.getElementById('best').textContent = best;
  }

  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      document.getElementById('timer').textContent = timeLeft;
      if (timeLeft <= 10) {
        document.getElementById('timer').classList.add('urgent');
        Sound.play('tick');
      }
      if (onTick) onTick(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        Sound.play('timeup');
        if (onEnd) onEnd(score);
      }
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
  }

  function isOver() { return timeLeft <= 0; }

  return { getState, setState, getScore, addScore, init, startTimer, stopTimer, isOver };
})();
