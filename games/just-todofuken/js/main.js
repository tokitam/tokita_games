(function() {
  var BEST_KEY   = 'just-todofuken.besttime';
  var NUM_Q      = 5;
  var NUM_WRONG  = 8;
  var CORRECT_MS = 700;
  var WRONG_MS   = 500;

  var state = {};
  var timerInterval = null;

  function el(id) { return document.getElementById(id); }

  function showScreen(name) {
    ['title', 'game', 'result'].forEach(function(s) {
      el('screen-' + s).classList.toggle('active', s === name);
    });
  }

  // ---- Best time ----
  function getBest() {
    var v = parseFloat(localStorage.getItem(BEST_KEY));
    return isNaN(v) ? null : v;
  }
  function saveBest(sec) {
    var best = getBest();
    if (best === null || sec < best) {
      localStorage.setItem(BEST_KEY, sec.toFixed(2));
      return true;
    }
    return false;
  }
  function fmt(sec) { return sec.toFixed(2); }

  // ---- Data validation (dev only) ----
  function validateData() {
    var names = PREFECTURES.map(function(p) { return p.name; });
    PREFECTURES.forEach(function(p) {
      if (p.wrongs.length < NUM_WRONG) console.warn('[just-todofuken] wrongs too few:', p.name);
      var seen = {};
      p.wrongs.forEach(function(w) {
        if (seen[w]) console.warn('[just-todofuken] duplicate wrong:', p.name, w);
        seen[w] = true;
        if (names.indexOf(w) >= 0) console.warn('[just-todofuken] wrong equals a real name:', p.name, w);
      });
    });
  }

  // ---- Question generation ----
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function pickQuestions() {
    return shuffle(PREFECTURES).slice(0, NUM_Q);
  }

  // 正解 1 件 + 別々の都道府県の誤表記を 1 件ずつ 8 件（いろいろな県名が混ざる）
  function buildQuestion(pref) {
    var others = shuffle(PREFECTURES.filter(function(p) { return p.name !== pref.name; })).slice(0, NUM_WRONG);
    var wrongs = others.map(function(p) {
      return p.wrongs[Math.floor(Math.random() * p.wrongs.length)];
    });
    return { answer: pref.name, choices: shuffle([pref.name].concat(wrongs)) };
  }

  function renderChoices(q) {
    var grid = el('choice-grid');
    grid.innerHTML = '';
    q.choices.forEach(function(text) {
      var btn = document.createElement('button');
      btn.className = 'choice';
      btn.textContent = text;
      btn.setAttribute('data-text', text);
      btn.addEventListener('click', function() { onChoiceTap(btn); });
      grid.appendChild(btn);
    });
  }

  // ---- Timer ----
  function startTimer() {
    state.startAt = performance.now();
    state.elapsed = 0;
    tickTimer();
    timerInterval = setInterval(tickTimer, 50);
  }
  function tickTimer() {
    state.elapsed = (performance.now() - state.startAt) / 1000;
    el('hud-time').textContent = state.elapsed.toFixed(1);
  }
  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    state.elapsed = (performance.now() - state.startAt) / 1000;
  }

  // ---- Overlay ----
  function showOverlay(text, cls, ms) {
    var ov = el('overlay');
    ov.textContent = text;
    ov.className = 'overlay show ' + cls;
    setTimeout(function() { ov.className = 'overlay'; }, ms);
  }

  // ---- Game flow ----
  function showQuestion() {
    state.current = buildQuestion(state.questions[state.index]);
    el('hud-q').textContent = state.index + 1;
    renderChoices(state.current);
    state.locked = false;
  }

  function onChoiceTap(btn) {
    if (state.locked || btn.disabled) return;
    var text = btn.getAttribute('data-text');
    if (text === state.current.answer) onCorrect(btn);
    else onWrong(btn);
  }

  function onCorrect(btn) {
    state.locked = true;
    Sound.play('correct');
    btn.classList.add('correct');
    showOverlay('正解！', 'ok', CORRECT_MS);
    var last = state.index === NUM_Q - 1;
    if (last) stopTimer();
    setTimeout(function() {
      if (last) finish();
      else { state.index++; showQuestion(); }
    }, CORRECT_MS);
  }

  function onWrong(btn) {
    state.locked = true;
    Sound.play('wrong');
    btn.classList.add('wrong');
    showOverlay('不正解…', 'ng', WRONG_MS);
    setTimeout(function() {
      btn.classList.remove('wrong');
      btn.classList.add('disabled');
      btn.disabled = true;
      state.locked = false;
    }, WRONG_MS);
  }

  function finish() {
    Sound.play('clear');
    var sec = state.elapsed;
    state.lastTime = sec;
    var isNew = saveBest(sec);
    el('result-time').textContent = fmt(sec);
    el('result-best').textContent = fmt(getBest());
    el('result-new').classList.toggle('show', isNew);
    showScreen('result');
  }

  function startGame() {
    Sound.init();
    state = {
      questions: pickQuestions(),
      index: 0,
      locked: false,
      elapsed: 0
    };
    showScreen('game');
    showQuestion();
    startTimer();
  }

  function shareToX() {
    var url = window.location.href.replace(/\/index\.html$/, '/');
    var text = 'Just都道府県 全問正解！' + fmt(state.lastTime) + '秒でした！\n' + url + '\n#Just都道府県';
    window.open('https://x.com/intent/tweet?text=' + encodeURIComponent(text), '_blank');
  }

  function updateTitleBest() {
    var best = getBest();
    el('title-best').textContent = best === null ? '--' : fmt(best) + '秒';
  }

  function toTitle() {
    stopTimer();
    updateTitleBest();
    showScreen('title');
  }

  // ---- Init ----
  validateData();
  updateTitleBest();
  el('btn-start').addEventListener('click', startGame);
  el('btn-retry').addEventListener('click', startGame);
  el('btn-title').addEventListener('click', toTitle);
  el('btn-share').addEventListener('click', shareToX);
})();
