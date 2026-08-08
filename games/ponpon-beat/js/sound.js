var Sound = (function() {
  var ctx = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }

  function getCtx() { return ctx; }

  function beep(freq, type, dur, gain, delay) {
    if (!ctx) return;
    try {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = type || 'sine';
      var t = ctx.currentTime + (delay || 0);
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(gain || 0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.start(t); o.stop(t + dur);
    } catch(e) {}
  }

  function tap() { beep(660, 'sine', 0.05, 0.2); }

  // Generate a simple "song" using AudioContext oscillators + scheduled beeps
  // Returns { start(offset), stop(), currentTime() }
  function createSynth(notes, bpm) {
    if (!ctx) return null;
    var beat = 60 / bpm;
    var sources = [];
    var startTime = null;

    function start(offset) {
      startTime = ctx.currentTime - (offset || 0);
      // Schedule all notes
      notes.forEach(function(n) {
        var t = startTime + n.time;
        if (t < ctx.currentTime) return;
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        var freqs = [523, 659, 784]; // C5, E5, G5 for 3 lanes
        o.frequency.value = freqs[n.lane] || 523;
        o.type = 'square';
        g.gain.setValueAtTime(0.06, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        o.start(t); o.stop(t + 0.1);
        sources.push(o);
      });
    }

    function stop() {
      sources.forEach(function(o) { try { o.stop(); } catch(e) {} });
      sources = [];
    }

    function currentTime() {
      if (startTime === null) return 0;
      return ctx.currentTime - startTime;
    }

    return { start: start, stop: stop, currentTime: currentTime };
  }

  return { init: init, tap: tap, createSynth: createSynth, getCtx: getCtx };
})();
