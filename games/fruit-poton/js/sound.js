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
      o.frequency.setValueAtTime(freq, ctx.currentTime + (delay||0));
      g.gain.setValueAtTime(gain||0.18, ctx.currentTime + (delay||0));
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (delay||0) + dur);
      o.start(ctx.currentTime + (delay||0));
      o.stop(ctx.currentTime + (delay||0) + dur);
    } catch(e) {}
  }

  var SOUNDS = {
    drop:    function() { beep(200, 'sine', 0.1, 0.15); },
    merge:   function(tier) {
      var f = 300 + tier * 60;
      beep(f, 'sine', 0.08, 0.2); beep(f*1.25, 'sine', 0.12, 0.2, 0.07);
    },
    danger:  function() { beep(880, 'square', 0.05, 0.1); },
    gameover:function() {
      [400, 300, 200].forEach(function(f,i){ beep(f,'sawtooth',0.2,0.22,i*0.14); });
    },
    star:    function() {
      [523,659,784,1047,1319,1568].forEach(function(f,i){ beep(f,'sine',0.15,0.25,i*0.07); });
    }
  };

  return {
    init: init,
    play: function(name, arg) { if (SOUNDS[name]) SOUNDS[name](arg); }
  };
})();
