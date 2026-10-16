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
      var t = ctx.currentTime + (delay||0);
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(gain||0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.start(t); o.stop(t + dur);
    } catch(e) {}
  }
  var SOUNDS = {
    correct: function() { beep(880, 'sine', 0.08, 0.2); beep(1320, 'sine', 0.12, 0.2, 0.08); },
    wrong:   function() { beep(180, 'square', 0.12, 0.15); },
    clear:   function() {
      [523, 659, 784, 1047].forEach(function(f,i){ beep(f,'triangle',0.25,0.2,i*0.12); });
    }
  };
  return {
    init: init,
    play: function(name) { if (SOUNDS[name]) SOUNDS[name](); }
  };
})();
