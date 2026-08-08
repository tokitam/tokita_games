(function() {
  var raf;
  var laneArea, laneH, currentSongIndex;
  var noteEls = []; // pool of reusable note divs

  function el(id) { return document.getElementById(id); }

  function showScreen(name) {
    ['title', 'game', 'result'].forEach(function(s) {
      el('screen-' + s).classList.toggle('active', s === name);
    });
  }

  // ---- Title ----
  function buildSongList(songs) {
    var list = el('song-list');
    list.innerHTML = '';
    songs.forEach(function(song, i) {
      var card = document.createElement('div');
      card.className = 'song-card';
      var best = Chart.getBest(song.id);
      card.innerHTML =
        '<div>' +
          '<div class="song-card-name">' + song.title + '</div>' +
          '<div class="song-card-info">' + song.artist + '  BPM:' + song.bpm + '</div>' +
        '</div>' +
        '<div class="song-card-hs">ベスト: ' + best + '</div>';
      card.addEventListener('click', function() { selectSong(i, songs); });
      list.appendChild(card);
    });
  }

  function selectSong(index, songs) {
    currentSongIndex = index;
    fetch(songs[index].file)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        Chart.load(data);
        startGame();
      })
      .catch(function() {
        alert('譜面の読み込みに失敗しました。サーバー経由で開いてください。');
      });
  }

  // ---- Game ----
  function startGame() {
    Sound.init();
    cancelAnimationFrame(raf);
    clearNoteEls();

    laneArea = el('lane-area');
    laneH = laneArea.offsetHeight;

    var state = Chart.start();
    updateHud(state);
    showScreen('game');
    loop();
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    Chart.update(laneH);
    var state = Chart.getState();

    updateHud(state);
    renderNotes();

    if (state.finished) {
      cancelAnimationFrame(raf);
      setTimeout(showResult, 400);
    }
  }

  function updateHud(state) {
    el('hud-score').textContent = state.score;
    el('hud-combo').textContent = state.combo;
  }

  // ---- Notes rendering ----
  function clearNoteEls() {
    noteEls.forEach(function(n) { if (n.parentNode) n.parentNode.removeChild(n); });
    noteEls = [];
  }

  function renderNotes() {
    // Remove all note elements first (simple approach)
    var existing = laneArea.querySelectorAll('.note');
    existing.forEach(function(n) { n.remove(); });

    var positions = Chart.getNotePositions(laneH);
    positions.forEach(function(pos) {
      var laneEl = document.getElementById('lane-' + pos.lane);
      if (!laneEl) return;
      var noteEl = document.createElement('div');
      noteEl.className = 'note note-' + pos.lane;
      noteEl.style.top = pos.y + 'px';
      laneEl.appendChild(noteEl);
    });
  }

  // ---- Judge display ----
  var judgeTimeout;
  function showJudge(judge) {
    var jt = el('judge-text');
    jt.className = '';
    jt.textContent = judge === 'perfect' ? 'Perfect!' : judge === 'good' ? 'Good' : 'Miss';
    void jt.offsetWidth; // reflow
    jt.className = 'show-' + judge;
    clearTimeout(judgeTimeout);
    judgeTimeout = setTimeout(function() { jt.className = ''; }, 500);
  }

  function flashCombo() {
    var c = el('hud-combo');
    c.classList.remove('bounce');
    void c.offsetWidth;
    c.classList.add('bounce');
  }

  // ---- Input ----
  function initInput() {
    [0, 1, 2].forEach(function(lane) {
      var btn = el('lbtn-' + lane);
      function handleTap(e) {
        e.preventDefault();
        var judge = Chart.tap(lane);
        if (judge) {
          showJudge(judge);
          if (judge !== 'miss') flashCombo();
        }
        btn.classList.add('pressed');
        setTimeout(function() { btn.classList.remove('pressed'); }, 100);
      }
      btn.addEventListener('touchstart', handleTap, { passive: false });
      btn.addEventListener('mousedown', handleTap);
    });

    el('btn-back').addEventListener('click', function() {
      Chart.stop();
      cancelAnimationFrame(raf);
      clearNoteEls();
      loadTitle();
    });
  }

  // ---- Result ----
  function showResult() {
    var state = Chart.getState();
    var songData = Chart.getSongData();
    var best = Chart.getBest(songData.id);
    var acc = Chart.getAccuracy();
    var fc = Chart.isFullCombo();

    el('result-title').textContent = songData.title;
    el('result-score').textContent = state.score;
    el('result-best').textContent  = best;
    el('rb-perfect').textContent   = state.perfect;
    el('rb-good').textContent      = state.good;
    el('rb-miss').textContent      = state.miss;
    el('rb-acc').textContent       = acc + '%';
    el('result-fc').classList.toggle('hidden', !fc);

    showScreen('result');
  }

  el('btn-retry-result').addEventListener('click', function() {
    // Reload the same chart
    var songData = Chart.getSongData();
    Chart.load(songData);
    startGame();
  });
  el('btn-title-result') && el('btn-title-result').addEventListener('click', function() {
    loadTitle();
  });

  // ---- Init ----
  function loadTitle() {
    showScreen('title');
    fetch('songs/index.json')
      .then(function(r) { return r.json(); })
      .then(function(songs) {
        buildSongList(songs);
      })
      .catch(function() {
        // Fallback: hardcode the song list if fetch fails (file:// mode)
        var fallback = [
          { id: 'sample', title: 'ポンポンビート', artist: 'ビートくん', bpm: 128, file: 'songs/sample.json' },
          { id: 'fast',   title: 'ハイパービート', artist: 'ビートくん', bpm: 160, file: 'songs/fast.json' }
        ];
        buildSongList(fallback);
      });
  }

  document.addEventListener('DOMContentLoaded', function() {
    initInput();
    loadTitle();
  });
})();
