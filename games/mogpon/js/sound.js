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
      g.gain.setValueAtTime(gain || 0.2, ctx.currentTime + (delay || 0));
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (delay || 0) + dur);
      o.start(ctx.currentTime + (delay || 0));
      o.stop(ctx.currentTime + (delay || 0) + dur);
    } catch (e) {}
  }

  var SOUNDS = {
    hit:     function() { beep(600, 'square', 0.06, 0.25); },
    hitRare: function() { beep(900, 'sine', 0.08, 0.25); beep(1100, 'sine', 0.06, 0.2, 0.05); },
    hitBad:  function() { beep(180, 'sawtooth', 0.12, 0.25); },
    escape:  function() { beep(350, 'sine', 0.04, 0.08); },
    tick:    function() { beep(880, 'sine', 0.05, 0.15); },
    end:     function() {
      [300, 240, 180].forEach(function(f, i) { beep(f, 'sawtooth', 0.18, 0.2, i * 0.1); });
    }
  };

  return {
    init: init,
    play: function(name) { if (SOUNDS[name]) SOUNDS[name](); }
  };
})();
