(function() {
  var HS_KEY = 'iro-touch.highscore';
  var GAME_TIME = 20;
  var LOCK_MS   = 200;

  var COLORS = [
    { name: 'あか',     hex: '#FF4444' },
    { name: 'あお',     hex: '#4488FF' },
    { name: 'みどり',   hex: '#44BB66' },
    { name: 'きいろ',   hex: '#FFCC00' },
    { name: 'むらさき', hex: '#AA44CC' },
    { name: 'オレンジ', hex: '#FF8800' }
  ];

  var state = {};
  var timerInterval = null;

  function el(id) { return document.getElementById(id); }

  function showScreen(name) {
    ['title', 'game', 'gameover'].forEach(function(s) {
      el('screen-' + s).classList.toggle('active', s === name);
    });
  }

  function getBest() { return parseInt(localStorage.getItem(HS_KEY) || '0', 10); }
  function saveBest(score) {
    if (score > getBest()) localStorage.setItem(HS_KEY, score);
  }

  // ---- Question generation ----
  function randInt(max) { return Math.floor(Math.random() * max); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = randInt(i + 1);
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function generateQuestion() {
    // Text: which color NAME to show
    var textIdx = randInt(COLORS.length);
    // FontColor: must differ from textIdx
    var fontIdx;
    do { fontIdx = randInt(COLORS.length); } while (fontIdx === textIdx);

    // 4 choices: include fontColor, pick 3 more distinct ones
    var others = [];
    for (var i = 0; i < COLORS.length; i++) {
      if (i !== fontIdx) others.push(i);
    }
    others = shuffle(others).slice(0, 3);
    var choiceIdxs = shuffle([fontIdx].concat(others));

    state.currentAnswer = COLORS[fontIdx].hex;
    state.choices = choiceIdxs.map(function(i) { return COLORS[i]; });

    // Update question display
    var qt = el('question-text');
    qt.textContent = COLORS[textIdx].name;
    qt.style.color = COLORS[fontIdx].hex;
    // Restart pop-in animation
    qt.style.animation = 'none';
    void qt.offsetWidth;
    qt.style.animation = '';

    // Render panels
    var panels = el('color-panels');
    panels.innerHTML = '';
    state.choices.forEach(function(c, i) {
      var btn = document.createElement('button');
      btn.className = 'color-panel';
      btn.style.background = c.hex;
      btn.dataset.hex = c.hex;
      btn.addEventListener('touchstart', function(e) { e.preventDefault(); onPanelTap(btn, c.hex); }, { passive: false });
      btn.addEventListener('click', function() { onPanelTap(btn, c.hex); });
      panels.appendChild(btn);
    });
  }

  function onPanelTap(btn, hex) {
    if (state.locked || state.timeLeft <= 0) return;
    state.locked = true;

    if (hex === state.currentAnswer) {
      // Correct
      Sound.play('correct');
      state.score++;
      el('hud-score').textContent = state.score;
      btn.classList.add('correct-flash');
      setTimeout(function() {
        btn.classList.remove('correct-flash');
        state.locked = false;
        generateQuestion();
      }, LOCK_MS);
    } else {
      // Wrong
      Sound.play('wrong');
      btn.classList.add('wrong-shake');
      setTimeout(function() {
        btn.classList.remove('wrong-shake');
        state.locked = false;
      }, LOCK_MS);
    }
  }

  // ---- Timer ----
  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(function() {
      state.timeLeft--;
      updateTimerUI();
      if (state.timeLeft <= 0) {
        clearInterval(timerInterval);
        endGame();
      }
    }, 1000);
  }

  function updateTimerUI() {
    el('time-left').textContent = state.timeLeft;
    var pct = (state.timeLeft / GAME_TIME) * 100;
    var bar = el('timer-bar');
    bar.style.width = pct + '%';
    if (state.timeLeft <= 5) {
      bar.classList.add('danger');
    } else {
      bar.classList.remove('danger');
    }
  }

  // ---- Game lifecycle ----
  function startGame() {
    Sound.init();
    clearInterval(timerInterval);

    state = {
      score: 0,
      timeLeft: GAME_TIME,
      locked: false,
      currentAnswer: null,
      choices: []
    };

    el('hud-score').textContent = '0';
    el('timer-bar').style.width = '100%';
    el('timer-bar').classList.remove('danger');

    showScreen('game');
    generateQuestion();
    startTimer();
  }

  function endGame() {
    state.locked = true;
    Sound.play('gameover');
    saveBest(state.score);

    el('go-score').textContent = state.score;
    el('go-best').textContent  = getBest();

    setTimeout(function() { showScreen('gameover'); }, 300);
  }

  // ---- Init ----
  function init() {
    el('title-hs').textContent = getBest();

    el('btn-start').addEventListener('click', startGame);
    el('btn-retry').addEventListener('click', startGame);
    el('btn-title').addEventListener('click', function() {
      clearInterval(timerInterval);
      el('title-hs').textContent = getBest();
      showScreen('title');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
