(function() {
  var HS_PREFIX = 'pair-animals.highscore.';
  var currentDiff = 'normal';

  function el(id) { return document.getElementById(id); }

  function showScreen(name) {
    ['title', 'game', 'clear'].forEach(function(s) {
      el('screen-' + s).classList.toggle('active', s === name);
    });
  }

  function getBest(diff) { return parseInt(localStorage.getItem(HS_PREFIX + diff) || '0', 10); }
  function saveBest(diff, moves) {
    var cur = getBest(diff);
    if (cur === 0 || moves < cur) localStorage.setItem(HS_PREFIX + diff, moves);
  }
  function bestLabel(diff) {
    var b = getBest(diff);
    return b ? b + '手' : '--';
  }

  function updateTitle() {
    ['easy', 'normal', 'hard'].forEach(function(d) {
      el('hs-' + d).textContent = 'ベスト: ' + bestLabel(d);
    });
  }

  // ---- Build grid ----
  function buildGrid(state) {
    var grid = el('card-grid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = 'repeat(' + state.cfg.cols + ', 1fr)';

    state.cards.forEach(function(card) {
      var div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = '<div class="card-back">？</div><div class="card-face">' + card.emoji + '</div>';
      div.addEventListener('click', function() { onCardClick(card.id); });
      div.addEventListener('touchend', function(e) { e.preventDefault(); onCardClick(card.id); }, { passive: false });
      card.el = div;
      grid.appendChild(div);
    });
  }

  function onCardClick(id) {
    Game.flipCard(id, function(matched, ids) {
      ids.forEach(function(cid) {
        var card = Game.getState().cards[cid];
        if (!card.el) return;
        if (matched) {
          card.el.classList.add('pop');
          setTimeout(function() { card.el.classList.remove('pop'); }, 280);
        } else {
          card.el.classList.add('shake');
          setTimeout(function() { card.el.classList.remove('shake'); }, 350);
        }
      });
    });
  }

  function updateGameUI() {
    var state = Game.getState();
    el('moves').textContent = state.moves;
    el('pairs-left').textContent = state.cfg.pairs - state.matched;
    el('elapsed').textContent = Game.formatTime(state.elapsed);

    // Sync card DOM states
    state.cards.forEach(function(card) {
      if (!card.el) return;
      card.el.classList.toggle('flipped', card.flipped || card.matched);
      card.el.classList.toggle('matched', card.matched);
    });
  }

  function onClear(moves, elapsed) {
    var diff = currentDiff;
    saveBest(diff, moves);
    var best = getBest(diff);
    var stars = Game.getStars(diff, moves);
    el('stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    el('clear-moves').textContent = moves + '手';
    el('clear-time').textContent = Game.formatTime(elapsed);
    el('clear-best').textContent = best ? best + '手' : '--';
    updateTitle();
    showScreen('clear');
  }

  function startGame(diff) {
    Sound.init();
    currentDiff = diff;
    var state = Game.init(diff);
    buildGrid(state);
    el('pairs-left').textContent = state.cfg.pairs;
    el('moves').textContent = '0';
    el('elapsed').textContent = '0:00';
    showScreen('game');
    Game.start({ onUpdate: updateGameUI, onClear: onClear });
  }

  function init() {
    updateTitle();

    document.querySelectorAll('.btn-diff').forEach(function(btn) {
      btn.addEventListener('click', function() { startGame(btn.dataset.diff); });
    });

    el('btn-retry').addEventListener('click', function() { startGame(currentDiff); });
    el('btn-title').addEventListener('click', function() {
      updateTitle();
      showScreen('title');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
