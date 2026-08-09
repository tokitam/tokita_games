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
    play(type) {
      if (type === 'store')       { osc('sine', 523, 659, 0.18, 0.15); }
      if (type === 'storeGood')   { osc('sine', 784, 1047, 0.22, 0.15); osc('sine', 1047, 1319, 0.16, 0.15, 0.1); }
      if (type === 'combo')       {
        [523, 659, 784].forEach((f, i) => osc('sine', f, f*1.15, 0.18, 0.14, i * 0.08));
      }
      if (type === 'bounce')      { osc('square', 300, 100, 0.08, 0.1); }
      if (type === 'grab')        { osc('sine', 400, 500, 0.1, 0.06); }
      if (type === 'clear')       {
        [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => osc('sine', f, f*1.08, 0.18, 0.2, i * 0.09));
      }
      if (type === 'gameover')    {
        [330, 277, 220, 165].forEach((f, i) => osc('sawtooth', f, f * 0.7, 0.2, 0.3, i * 0.2));
      }
    }
  };
})();
