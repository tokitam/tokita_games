const Sound = (() => {
  let ctx = null;
  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function osc(type, freq, endFreq, vol, dur, delay) {
    const c = ac(), t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur + 0.01);
  }

  return {
    play(type, count) {
      if (type === 'shoot') {
        osc('sine', 800, 400, 0.1, 0.08);
      } else if (type === 'pop') {
        const base = 600 + (count || 0) * 60;
        osc('sine', base, base * 1.4, 0.18, 0.12);
        if (count > 3) osc('sine', base * 1.25, base * 1.7, 0.12, 0.12, 0.05);
      } else if (type === 'fall') {
        osc('sine', 400, 150, 0.14, 0.2);
      } else if (type === 'miss') {
        osc('square', 200, 100, 0.08, 0.1);
      } else if (type === 'gameover') {
        [300, 250, 200, 150].forEach((f, i) => osc('sawtooth', f, f * 0.6, 0.18, 0.3, i * 0.22));
      } else if (type === 'clear') {
        [523, 659, 784, 1047, 1319].forEach((f, i) => osc('sine', f, f * 1.05, 0.18, 0.22, i * 0.1));
      }
    }
  };
})();
