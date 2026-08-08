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
    flip:  function() { beep(440, 'sine', 0.07, 0.12); },
    match: function() { beep(660, 'sine', 0.1, 0.2); beep(880, 'sine', 0.12, 0.2, 0.08); },
    miss:  function() { beep(200, 'square', 0.1, 0.15); },
    clear: function() {
      [523, 659, 784, 1047].forEach(function(f, i) { beep(f, 'sine', 0.15, 0.22, i * 0.08); });
    }
  };

  return {
    init: init,
    play: function(name) { if (SOUNDS[name]) SOUNDS[name](); }
  };
})();
