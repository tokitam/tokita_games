var Game = (function() {
  var DIFFICULTY = {
    easy:   { cols: 3, rows: 4, pairs: 6 },
    normal: { cols: 4, rows: 4, pairs: 8 },
    hard:   { cols: 6, rows: 6, pairs: 18 }
  };

  var EMOJIS = [
    '🐶','🐱','🐰','🐸','🐻','🐼',
    '🐯','🐨','🦊','🐮','🐷','🦁',
    '🐭','🦝','🦉','🐔','🦚','🦜'
  ];

  var state;

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function init(diff) {
    var cfg = DIFFICULTY[diff];
    var emojiSet = EMOJIS.slice(0, cfg.pairs);
    var deck = shuffle(emojiSet.concat(emojiSet));

    state = {
      diff: diff,
      cfg: cfg,
      cards: deck.map(function(emoji, idx) {
        return { id: idx, emoji: emoji, flipped: false, matched: false, el: null };
      }),
      flipped: [],
      moves: 0,
      matched: 0,
      locked: false,
      startTime: null,
      elapsed: 0,
      timerId: null,
      onUpdate: null,
      onClear: null
    };
    return state;
  }

  function start(callbacks) {
    state.onUpdate = callbacks.onUpdate;
    state.onClear  = callbacks.onClear;
    state.startTime = Date.now();
    state.timerId = setInterval(function() {
      state.elapsed = Math.floor((Date.now() - state.startTime) / 1000);
      if (state.onUpdate) state.onUpdate();
    }, 500);
  }

  function flipCard(id, callback) {
    if (state.locked) return;
    var card = state.cards[id];
    if (!card || card.flipped || card.matched) return;
    if (state.flipped.length === 1 && state.flipped[0].id === id) return;

    card.flipped = true;
    Sound.play('flip');
    if (state.onUpdate) state.onUpdate();

    state.flipped.push(card);
    if (state.flipped.length < 2) return;

    // Two cards flipped — evaluate
    state.moves++;
    state.locked = true;
    var a = state.flipped[0], b = state.flipped[1];

    if (a.emoji === b.emoji) {
      // Match
      setTimeout(function() {
        a.matched = true; b.matched = true;
        state.matched++;
        state.flipped = [];
        state.locked = false;
        Sound.play('match');
        if (callback) callback(true, [a.id, b.id]);
        if (state.onUpdate) state.onUpdate();
        if (state.matched === state.cfg.pairs) {
          clearInterval(state.timerId);
          state.elapsed = Math.floor((Date.now() - state.startTime) / 1000);
          Sound.play('clear');
          setTimeout(function() {
            if (state.onClear) state.onClear(state.moves, state.elapsed);
          }, 400);
        }
      }, 250);
    } else {
      // Mismatch
      Sound.play('miss');
      if (callback) callback(false, [a.id, b.id]);
      setTimeout(function() {
        a.flipped = false; b.flipped = false;
        state.flipped = [];
        state.locked = false;
        if (state.onUpdate) state.onUpdate();
      }, 1000);
    }
  }

  function getStars(diff, moves) {
    var pairs = DIFFICULTY[diff].pairs;
    var extra = moves - pairs;
    if (extra <= 2) return 3;
    if (extra <= 6) return 2;
    return 1;
  }

  function formatTime(sec) {
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }

  return {
    DIFFICULTY: DIFFICULTY,
    init: init,
    start: start,
    flipCard: flipCard,
    getState: function() { return state; },
    getStars: getStars,
    formatTime: formatTime
  };
})();
