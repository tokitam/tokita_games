var Sound = (function() {
  var ctx = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }

  function beep(freq, type, dur, gain, delay) {
    if (!ctx) return;
    try {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, ctx.currentTime + (delay || 0));
      g.gain.setValueAtTime(gain || 0.15, ctx.currentTime + (delay || 0));
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (delay || 0) + dur);
      o.start(ctx.currentTime + (delay || 0));
      o.stop(ctx.currentTime + (delay || 0) + dur);
    } catch(e) {}
  }

  var SOUNDS = {
    jump:     function() { beep(440, 'sine', 0.1, 0.12); beep(600, 'sine', 0.08, 0.1, 0.06); },
    shuriken: function() { beep(800, 'square', 0.05, 0.08); beep(600, 'square', 0.04, 0.06, 0.04); },
    kill:     function() { beep(660, 'sine', 0.08, 0.15); beep(880, 'sine', 0.1, 0.18, 0.06); },
    score:    function() { beep(880, 'sine', 0.06, 0.12); },
    gameover: function() {
      [300, 240, 180].forEach(function(f, i) { beep(f, 'sawtooth', 0.2, 0.18, i * 0.13); });
    }
  };

  return {
    init: init,
    play: function(name) { if (SOUNDS[name]) SOUNDS[name](); }
  };
})();
