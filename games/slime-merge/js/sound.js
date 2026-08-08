var Sound = (function() {
  var ctx = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }

  function beep(freq, type, dur, gain, delay) {
    if (!ctx) return;
    try {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, ctx.currentTime + (delay || 0));
      g.gain.setValueAtTime(gain || 0.18, ctx.currentTime + (delay || 0));
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (delay || 0) + dur);
      o.start(ctx.currentTime + (delay || 0));
      o.stop(ctx.currentTime + (delay || 0) + dur);
    } catch (e) {}
  }

  var SOUNDS = {
    move:    function() { beep(300, 'sine', 0.06, 0.1); },
    merge:   function() { beep(500, 'sine', 0.06, 0.2); beep(650, 'sine', 0.1, 0.2, 0.05); },
    spawn:   function() { beep(440, 'sine', 0.04, 0.08); },
    gameover: function() {
      [350, 280, 210].forEach(function(f, i) { beep(f, 'sawtooth', 0.16, 0.2, i * 0.12); });
    },
    win: function() {
      [523, 659, 784, 1047, 1319].forEach(function(f, i) { beep(f, 'sine', 0.14, 0.22, i * 0.08); });
    }
  };

  return {
    init: init,
    play: function(name) { if (SOUNDS[name]) SOUNDS[name](); }
  };
})();
