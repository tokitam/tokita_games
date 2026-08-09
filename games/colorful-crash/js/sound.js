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
      g.gain.setValueAtTime(gain||0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.start(t); o.stop(t + dur);
    } catch(e) {}
  }
  var SOUNDS = {
    block:    function() { beep(660, 'sine', 0.05, 0.18); },
    paddle:   function() { beep(220, 'sine', 0.06, 0.18); },
    item:     function() { beep(880, 'sine', 0.08, 0.2); beep(1100, 'sine', 0.1, 0.2, 0.07); },
    life:     function() { [200,150,100].forEach(function(f,i){ beep(f,'sawtooth',0.18,0.2,i*0.12); }); },
    clear:    function() { [523,659,784,1047,1319].forEach(function(f,i){ beep(f,'sine',0.14,0.22,i*0.08); }); },
    gameover: function() { [350,280,210].forEach(function(f,i){ beep(f,'sawtooth',0.2,0.22,i*0.14); }); }
  };
  return {
    init: init,
    play: function(name) { if (SOUNDS[name]) SOUNDS[name](); }
  };
})();
